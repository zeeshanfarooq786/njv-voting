import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api, clearAuth, friendlyError, getRole, getToken, getUser, prefetchBallot, readBallot, readPhotoCache, setAuth, writeBallot, writePhotoCache } from './api'
import Crest, { BrandMark } from './Crest'
import logo from './assets/logo.png'
import crown from './assets/crown.png'
import {
  IconBallot,
  IconChart,
  IconCheck,
  IconClock,
  IconCog,
  IconExit,
  IconEye,
  IconMail,
  IconPlay,
  IconPrinter,
  IconRefresh,
  IconShield,
  IconTrophy,
  IconUser,
  IconUsers,
} from './Icons'
import AmbientField, { Confetti, RippleLayer, spawnRipple } from './Particles'
import { cardIn, fadeUp, letter } from './motion'
import { sounds } from './sounds'
import { ALL_POSTS, ELECTION_CATEGORIES, categoryForPost, orderedPositions } from './positions'

const TITLE = 'NJV KARACHI'
const DOMAIN = 'njv.edu.pk'

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function photoSrc(url) {
  if (!url) return null
  const value = String(url)
  if (value.startsWith('data:image')) return value
  if (value.includes('script.google.com')) return null
  const driveId = value.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || value.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]
  if (driveId && (value.includes('drive.google') || value.includes('googleusercontent'))) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`
  }
  try {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      const parsed = new URL(value)
      if (parsed.pathname.startsWith('/storage/')) return parsed.pathname
    }
  } catch {
    return value
  }
  return value
}

function validSchoolEmail(value) {
  return /^[a-z0-9._%+-]+@njv\.edu\.pk$/i.test(String(value || '').trim())
}

/**
 * Positions are stored with an em dash ("President — Grade XII").
 * The database keeps that exact value; only the displayed text is softened.
 */
function prettyText(value) {
  return String(value ?? '')
    .replace(/\s*[—–]\s*/g, ' · ')
    .trim()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function openPrintWindow(html) {
  const w = window.open('', '_blank')
  if (!w) {
    window.alert('Please allow pop-ups for this site to print the report.')
    return
  }

  try {
    w.opener = null
  } catch {
    /* ignore */
  }

  w.document.open()
  w.document.write(html)
  w.document.close()

  const fire = () => {
    try {
      w.focus()
      w.print()
    } catch {
      /* user can print manually */
    }
  }
  if (w.document.readyState === 'complete') setTimeout(fire, 300)
  else w.addEventListener('load', () => setTimeout(fire, 300))
}

function logoSrc() {
  try {
    return new URL(logo, window.location.href).href
  } catch {
    return logo
  }
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

function photoRejectReason(file) {
  if (!file) return 'No file selected.'
  if (!IMAGE_TYPES.includes(file.type)) return 'Only JPG, PNG or WEBP images are allowed.'
  if (file.size > MAX_PHOTO_BYTES) return 'Image must be 2MB or smaller.'
  return ''
}

const TV_ENTRANCES = [
  {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 260, damping: 14 },
  },
  {
    initial: { y: 80, rotate: 12, opacity: 0 },
    animate: { y: [80, -18, 0], rotate: [12, -6, 0], opacity: 1 },
    transition: { duration: 0.7, ease: 'easeOut' },
  },
  {
    initial: { x: -140, rotateY: 90, opacity: 0 },
    animate: { x: 0, rotateY: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 180, damping: 16 },
  },
  {
    initial: { y: -90, scale: 0.4, opacity: 0 },
    animate: { y: [-90, 16, 0], scale: [0.4, 1.08, 1], opacity: 1 },
    transition: { duration: 0.65 },
  },
  {
    initial: { scale: 1.6, opacity: 0, filter: 'blur(12px)' },
    animate: { scale: 1, opacity: 1, filter: 'blur(0px)' },
    transition: { duration: 0.55 },
  },
  {
    initial: { rotate: -25, y: 40, opacity: 0 },
    animate: { rotate: [-25, 8, -4, 0], y: 0, opacity: 1 },
    transition: { duration: 0.8 },
  },
]

function PresentationShow({ board, onExit }) {
  const ended = !!board.winners_declared
  const [musicOn, setMusicOn] = useState(true)

  useEffect(() => {
    if (!musicOn) {
      sounds.stopPresentationBed()
      return undefined
    }
    sounds.unlock()
    sounds.startPresentationBed()
    return () => sounds.stopPresentationBed()
  }, [musicOn])
  const posts = useMemo(() => {
    const people = board.candidates || []
    const fromOrder = orderedPositions(people.map((c) => c.position)).filter((p) =>
      people.some((c) => c.position === p),
    )
    const extra = [...new Set(people.map((c) => c.position).filter((p) => p && !fromOrder.includes(p)))]
    return [...fromOrder, ...extra]
  }, [board.candidates])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (posts.length < 2) return undefined
    const t = setInterval(() => setIndex((i) => (i + 1) % posts.length), 8000)
    return () => clearInterval(t)
  }, [posts.length])

  const post = posts[index] || posts[0] || ''
  const field = (board.candidates || []).filter((c) => c.position === post)
  const ranked = [...field].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
  const winner = ranked[0] && (ranked[0].vote_count || 0) > 0 ? ranked[0] : null
  const nominees = ended ? (winner ? [winner] : []) : field
  const cat = categoryForPost(post)?.title || 'Student Council'
  const max = Math.max(...field.map((c) => c.vote_count), 1)
  const entrance = TV_ENTRANCES[index % TV_ENTRANCES.length]

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden px-4 py-4 sm:px-8 sm:py-6">
      {ended && winner && (
        <>
          <Confetti key={`hall-confetti-${index}`} show />
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={`${index}-spark-${i}`}
              className="success-sparkle pointer-events-none"
              style={{
                left: `${18 + ((i * 37) % 64)}%`,
                top: `${12 + ((i * 23) % 70)}%`,
                width: 10 + (i % 5) * 2,
                height: 10 + (i % 5) * 2,
                animationDelay: `${(i % 8) * 0.12}s`,
              }}
            />
          ))}
        </>
      )}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <BrandMark size={72} subtitle={ended ? 'The winners' : 'Live hall'} />
          <HandwrittenTitle text="NJV Government School Student Council Election 2026" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMusicOn((on) => !on)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0A3B65]/70 px-2.5 py-1 text-[11px] sm:px-3 sm:text-xs"
          >
            {musicOn ? 'Mute music' : 'Play music'}
          </button>
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0A3B65]/70 px-2.5 py-1 text-[11px] sm:px-3 sm:text-xs"
          >
            <IconExit size={12} />
            <span className="hidden sm:inline">Exit TV mode</span>
          </button>
        </div>
      </div>
      <div style={{ perspective: 1400 }} className="flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={post}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ rotateY: 88, opacity: 0, scale: 0.92 }}
          animate={{ rotateY: 0, opacity: 1, scale: 1 }}
          exit={{ rotateY: -88, opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: 'center', backfaceVisibility: 'hidden' }}
        >
          <p className="truncate text-[10px] font-medium tracking-[0.18em] text-[#FFC72C] uppercase sm:text-xs">{cat}</p>
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white sm:mb-4 sm:text-base">
            <IconUser size={16} className="shrink-0 text-[#FFC72C]" />
            <span className="truncate">{prettyText(post)}</span>
          </p>
          <div
            className="grid min-h-0 flex-1 content-center items-stretch justify-items-stretch gap-3 overflow-hidden"
            style={{
              gridTemplateColumns:
                ended || nominees.length <= 1
                  ? 'minmax(0, min(560px, 100%))'
                  : nominees.length <= 4
                    ? 'repeat(2, minmax(0, 1fr))'
                    : 'repeat(3, minmax(0, 1fr))',
              justifyContent: 'center',
            }}
          >
            {ended && !winner && (
              <p className="rounded-2xl border border-white/15 bg-[#0A3B65]/55 px-6 py-8 text-center text-white/70">
                No votes were cast for this post.
              </p>
            )}
            {nominees.map((c, i) => {
              const lead = !ended && nominees.every((o) => o.vote_count <= c.vote_count) && c.vote_count > 0
              const pack = !ended && nominees.length > 1
              const photo = ended ? 132 : nominees.length <= 2 ? 88 : nominees.length <= 4 ? 64 : 52
              return (
                <motion.div
                  key={`${post}-${c.id}-${index}`}
                  initial={entrance.initial}
                  animate={entrance.animate}
                  transition={{ ...entrance.transition, delay: 0.08 * i }}
                  className={`relative flex min-h-0 w-full min-w-0 items-center rounded-3xl border ${
                    pack ? 'gap-3 px-3 py-3' : 'gap-5 px-5 py-4'
                  } ${ended || lead ? 'border-[#FFC72C] bg-white/10' : 'border-white/15 bg-[#0A3B65]/55'}`}
                >
                  {ended ? (
                    <span className="leading-badge absolute right-4 top-4 z-10">Elected</span>
                  ) : lead ? (
                    <span className="leading-badge absolute right-3 top-3 z-10">Leading</span>
                  ) : null}
                  <div className="relative shrink-0">
                    {ended && (
                      <img
                        src={crown}
                        alt=""
                        className="pointer-events-none absolute -top-8 left-1/2 z-10 w-16 -translate-x-1/2 drop-shadow-[0_4px_12px_rgba(255,199,44,0.75)] sm:w-20"
                      />
                    )}
                    <Avatar candidate={c} size={photo} />
                  </div>
                  <div className={`min-w-0 flex-1 ${ended ? 'pr-2' : 'pr-16'}`}>
                    <p className={`hall-name truncate text-white ${pack ? 'text-base sm:text-lg' : ''}`}>{c.name}</p>
                    <p className={`mt-1 font-semibold tabular-nums leading-none text-[#FFC72C] ${pack ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl'}`}>{c.vote_count}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">votes</p>
                    <div className={`overflow-hidden rounded-full bg-white/10 ${pack ? 'mt-2 h-1.5' : 'mt-3 h-2.5'}`}>
                      <div
                        className="h-full rounded-full bg-[#FFC72C]"
                        style={{ width: `${Math.max(8, (c.vote_count / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  )
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [screen, setScreen] = useState(() => {
    const role = getRole()
    if (getToken() && role === 'admin') return 'admin'
    if (getToken() && role === 'teacher') return 'station'
    return 'login'
  })
  const [loginMode, setLoginMode] = useState('teacher')
  const [user, setUser] = useState(getUser())
  const [session, setSession] = useState(null)
  const [voteResult, setVoteResult] = useState(null)
  const [ripples, setRipples] = useState([])
  const [adminSeed, setAdminSeed] = useState(null)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    const wake = () => sounds.unlock()
    window.addEventListener('pointerdown', wake, { once: true })
    window.addEventListener('keydown', wake, { once: true })
    return () => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])

  useEffect(() => {
    if (!booting) return
    sounds.playIntro()
    const t = setTimeout(() => setBooting(false), 3800)
    return () => clearTimeout(t)
  }, [booting])

  function forceLogout(mode = loginMode) {
    const role = getRole()
    if (role === 'admin' || role === 'teacher') api.logout(role).catch(() => {})
    clearAuth()
    setAdminSeed(null)
    setUser(null)
    setSession(null)
    setVoteResult(null)
    setLoginMode(mode === 'admin' ? 'admin' : 'teacher')
    setScreen('login')
  }

  useEffect(() => {
    const role = getRole()
    const token = getToken()
    if (!token || (role !== 'admin' && role !== 'teacher')) return undefined

    let cancelled = false
    api.me(role).catch((err) => {
      if (cancelled) return
      if (err?.status === 401 || /unauthenticated/i.test(String(err?.message || ''))) {
        forceLogout(role)
      }
    })

    const onUnauth = () => forceLogout(getRole() || loginMode)
    window.addEventListener('njv:unauthenticated', onUnauth)
    return () => {
      cancelled = true
      window.removeEventListener('njv:unauthenticated', onUnauth)
    }
  }, [])

  return (
    <div className="mesh-bg relative min-h-screen overflow-hidden">
      <AmbientField />
      <RippleLayer ripples={ripples} />
      {!online && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[80] p-3 text-center">
          <p className="inline-block rounded-full bg-rose-600 px-4 py-2 text-sm text-white">
            No internet. Votes save on this device and sync once you reconnect.
          </p>
        </div>
      )}
      <AnimatePresence mode="wait">
        {booting ? (
          <Splash key="splash" />
        ) : screen === 'login' ? (
          <Login
            key="login"
            mode={loginMode}
            setMode={setLoginMode}
            onSuccess={(payload) => {
              setAuth(payload)
              setUser(payload.user)
              prefetchBallot(payload.candidates || payload.results?.candidates || []).catch(() => {})
              if (payload.user.role === 'admin') {
                setAdminSeed(hydrateResults(payload.results) || hydrateResults(readCachedResults()) || emptyBoard())
                setScreen('admin')
              } else {
                setScreen('station')
              }
            }}
          />
        ) : screen === 'station' ? (
          <TeacherStation
            key="station"
            user={user}
            onLogout={() => {
              api.logout('teacher').catch(() => {})
              clearAuth()
              setUser(null)
              setScreen('login')
              setLoginMode('teacher')
            }}
            onRipple={(e) => spawnRipple(setRipples, e)}
            onSession={(s) => {
              setSession(s)
              setScreen('vote')
            }}
          />
        ) : screen === 'vote' ? (
          <VoteGrid
            key="vote"
            session={session}
            onCancel={() => {
              if (session?.session_token) api.endSession(session.session_token).catch(() => {})
              setSession(null)
              setScreen('station')
            }}
            onRipple={(e) => spawnRipple(setRipples, e)}
            onCast={(result) => {
              setVoteResult(result)
              setScreen('confirm')
            }}
          />
        ) : screen === 'confirm' ? (
          <Confirm
            key="confirm"
            result={voteResult}
            onDone={() => {
              api.logout('teacher').catch(() => {})
              clearAuth()
              setUser(null)
              setSession(null)
              setVoteResult(null)
              setLoginMode('teacher')
              setScreen('login')
            }}
          />
        ) : (
          <AdminBoard
            key="admin"
            user={user}
            initialResults={adminSeed}
            onLogout={() => {
              api.logout('admin').catch(() => {})
              clearAuth()
              setAdminSeed(null)
              sessionStorage.removeItem('njv_results')
              setUser(null)
              setScreen('login')
              setLoginMode('admin')
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Splash() {
  return (
    <motion.div
      className="relative z-10 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0.6, transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
    >
      <motion.div
        className="splash-glow absolute rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,199,44,0.28), transparent 70%)' }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 1 }}
        transition={{ duration: 1.4 }}
      />
      <motion.div
        className="splash-crest"
        initial={{ scale: 0.55, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9 }}
      >
        <Crest size={196} glow />
      </motion.div>
      <div className="splash-title mt-6 flex max-w-full justify-center sm:mt-8" style={{ perspective: 600 }}>
        {TITLE.split('').map((ch, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={letter}
            initial="hidden"
            animate="show"
            className="font-display glow-text tracking-[0.08em] text-[#FFC72C] sm:tracking-[0.12em]"
          >
            {ch === ' ' ? '\u00A0' : ch}
          </motion.span>
        ))}
      </div>
      <motion.p
        className="mt-4 text-center font-serif text-[10px] tracking-[0.28em] text-white/80 sm:text-sm sm:tracking-[0.55em]"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        STUDENT ELECTIONS 2026
      </motion.p>
      <motion.div
        className="mt-8 h-[2px] w-40 max-w-[70vw] bg-gradient-to-r from-transparent via-[#FFC72C] to-transparent sm:mt-10 sm:w-48"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 2.1, duration: 0.7 }}
      />
    </motion.div>
  )
}

function HandwrittenTitle({ text }) {
  const [cycle, setCycle] = useState(0)
  const letters = text.length

  useEffect(() => {
    const writeMs = letters * 35 + 400
    const holdMs = 4200
    const t = setTimeout(() => setCycle((n) => n + 1), writeMs + holdMs)
    return () => clearTimeout(t)
  }, [cycle, letters])

  return (
    <p className="handwrite-title mb-5 max-w-3xl text-[15px] leading-snug text-[#FFC72C] sm:text-lg md:text-xl">
      {text.split('').map((ch, i) => (
        <motion.span
          key={`${cycle}-${i}`}
          initial={{ opacity: 0, y: 8, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.035 * i, duration: 0.2, type: 'spring', stiffness: 420, damping: 18 }}
          className="inline-block"
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </p>
  )
}

function WaitOverlay({ show, title = 'Please wait', hint = 'Just a moment' }) {
  if (!show) return null
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#1A5C8C]/55 px-6 text-center backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="wait-ring absolute inset-0 rounded-full border-2 border-[#FFC72C]/20 border-t-[#FFC72C]" />
        <span className="wait-ring-slow absolute inset-2 rounded-full border border-dashed border-white/25" />
        <Crest size={72} glow />
      </div>
      <p className="mt-8 font-display text-3xl tracking-[0.2em] text-[#FFC72C] uppercase">{title}</p>
      <p className="mt-3 max-w-sm text-sm text-white/80">{hint}</p>
      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-[#FFC72C]"
            animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function Login({ mode, setMode, onSuccess }) {
  const [email, setEmail] = useState(mode === 'admin' ? `admin@${DOMAIN}` : `teacher@${DOMAIN}`)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setEmail(mode === 'admin' ? `admin@${DOMAIN}` : `teacher@${DOMAIN}`)
    setPassword('')
    setError('')
  }, [mode])

  async function submit(e) {
    e.preventDefault()
    sounds.unlock()
    sounds.tap()
    setBusy(true)
    setError('')
    try {
      const fn = mode === 'admin' ? api.adminLogin : api.teacherLogin
      const data = await fn(email, password)
      sounds.loginSuccess()
      onSuccess(data)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="relative z-10 flex min-h-screen items-center justify-center p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <WaitOverlay show={busy} title="Signing you in" hint="Just a moment" />
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <div className="mb-6">
          <BrandMark size={64} />
        </div>
        <div className="mb-6 grid grid-cols-2 rounded-full bg-[#0A3B65]/70 p-1">
          {['teacher', 'admin'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full py-2 text-sm font-semibold uppercase tracking-widest ${
                mode === m ? 'bg-[#FFC72C] text-[#0A3B65]' : 'text-white/85'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="label-caps mb-1 block text-xs">
            Email
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A3B65]/50 px-4 py-3 text-base outline-none focus:border-[#FFC72C]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="label-caps mb-1 block text-xs">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A3B65]/50 px-4 py-3 text-base outline-none focus:border-[#FFC72C]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            disabled={busy}
            className="btn-gold w-full rounded-xl py-3 font-semibold tracking-widest uppercase"
          >
            {busy ? 'Signing in…' : `Enter as ${mode}`}
          </button>
        </form>
      </div>
    </motion.div>
  )
}

function TeacherStation({ user, onLogout, onSession, onRipple }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function start(e) {
    e.preventDefault()
    onRipple?.(e)
    sounds.tap()
    setError('')
    const trimmed = email.trim().toLowerCase()
    if (!validSchoolEmail(trimmed)) {
      setError(`Use a valid school email, like ahmed.001@${DOMAIN}`)
      return
    }
    setBusy(true)
    try {
      onSession(await api.startSession(trimmed))
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="page-shell relative z-10 flex min-h-screen flex-col justify-center px-6 py-8 md:px-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <WaitOverlay show={busy} title="Getting the ballot ready" hint="Just a moment" />
      <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <BrandMark size={88} subtitle="Rise. Choose. Lead." />
        <button onClick={onLogout} className="rounded-full border border-white/20 px-4 py-2 text-sm">
          Logout
        </button>
      </div>
      <HandwrittenTitle text="NJV Government School Student Council Election 2026" />
      <p className="mb-4 text-sm text-secondary">{user?.name}</p>
      <form onSubmit={start} className="glass rounded-3xl p-8">
        <p className="mb-4 flex items-center gap-2 text-sm text-secondary">
          <IconMail size={15} className="text-[#FFC72C]" />
          One student. One voice. Enter your school email and choose your council.
        </p>
        <input
          className="w-full rounded-2xl border border-white/10 bg-[#0A3B65]/50 px-5 py-4 text-xl outline-none focus:border-[#FFC72C]"
          placeholder={`ahmed.001@${DOMAIN}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        {error && <p className="mt-3 text-rose-300">{error}</p>}
        <button
          disabled={busy}
          className="btn-gold mt-6 w-full rounded-2xl py-4 text-lg font-bold uppercase tracking-widest"
        >
          {busy ? 'Getting ready…' : 'Begin voting'}
        </button>
      </form>
      </div>
    </motion.div>
  )
}

function withCachedPhotos(candidates = []) {
  const cache = readPhotoCache()
  return candidates.map((c) => ({
    ...c,
    photo_url: c.photo_url || cache[c.id] || cache[`name:${c.name}`] || null,
  }))
}

function emptyBoard() {
  return {
    election_title: 'NJV Student Council Election 2026-27',
    voting_open: true,
    winners_declared: false,
    eligible_students: 450,
    total_votes: 0,
    turnout_percent: 0,
    leader_id: null,
    candidates: withCachedPhotos(readBallot()),
  }
}

function hydrateResults(data) {
  if (!data) return null
  return { ...data, candidates: withCachedPhotos(data.candidates || []) }
}

function FancyCheck({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
        checked ? 'border-[#FFC72C] bg-[#FFC72C]/15 text-white' : 'border-white/15 bg-white/5 text-white/80'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
          checked ? 'border-[#FFC72C] bg-[#FFC72C] text-[#0A3B65]' : 'border-white/30 bg-transparent text-transparent'
        }`}
      >
        <IconCheck size={14} />
      </span>
      {label}
    </button>
  )
}

function VoteGrid({ session, onCancel, onCast, onRipple }) {
  const [data, setData] = useState(() => {
    if (!session?.candidates) return null
    return {
      election_title: session.election_title,
      student_email: session.student_email,
      expires_at: session.expires_at,
      candidates: withCachedPhotos(session.candidates),
    }
  })
  const [picked, setPicked] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState(session.session_token || '')
  const [step, setStep] = useState(0)
  const [confirmIndependent, setConfirmIndependent] = useState(false)
  const [confirmReviewed, setConfirmReviewed] = useState(false)

  useEffect(() => {
    let live = true
    if (session.ready) {
      session.ready
        .then((d) => {
          if (!live) return
          setToken(d.session_token)
          writeBallot(d.candidates || [])
          setData((cur) => ({
            election_title: d.election_title || cur?.election_title,
            student_email: d.student_email,
            expires_at: d.expires_at,
            candidates: withCachedPhotos(d.candidates || cur?.candidates || []),
          }))
        })
        .catch((err) => live && setError(friendlyError(err)))
    }
    async function loadPhotos(list) {
      const missing = (list || []).filter((c) => !photoSrc(c.photo_url))
      const cache = readPhotoCache()
      for (const c of missing) {
        try {
          const shot = await api.candidatePhoto(session.session_token || '', c.id)
          if (!live || !shot.photo_url) continue
          cache[c.id] = shot.photo_url
          writePhotoCache(cache)
          setData((cur) => {
            if (!cur) return cur
            return {
              ...cur,
              candidates: cur.candidates.map((row) =>
                row.id === c.id ? { ...row, photo_url: shot.photo_url } : row,
              ),
            }
          })
        } catch {
          /* keep initials */
        }
      }
    }
    if (data?.candidates) loadPhotos(data.candidates)
    return () => {
      live = false
    }
  }, [session])

  async function submit(e) {
    const ids = positions.map((p) => picked[p]).filter(Boolean)
    if (ids.length !== positions.length || busy || !confirmIndependent || !confirmReviewed) {
      setError('Review every post and confirm both declarations before submitting.')
      return
    }
    onRipple?.(e)
    setError('')
    const names = (data?.candidates || []).filter((c) => ids.includes(c.id)).map((c) => c.name)
    sounds.confirm()
    onCast({
      candidate_ids: ids,
      candidate_name: names.join(', '),
      pending: (async () => {
        let tok = token || session.session_token
        if (!tok && session.ready) {
          const d = await session.ready
          tok = d.session_token
        }
        if (!tok) throw new Error('The ballot is not ready yet. Try again.')
        return api.vote(tok, ids)
      })(),
    })
  }

  const grouped = useMemo(() => {
    const map = {}
    for (const c of data?.candidates || []) {
      ;(map[c.position] ||= []).push(c)
    }
    return map
  }, [data])

  const positions = orderedPositions(Object.keys(grouped))
  const selectedCount = positions.filter((p) => picked[p]).length
  const complete = positions.length > 0 && selectedCount === positions.length
  const pickedList = (data?.candidates || []).filter((c) => Object.values(picked).includes(c.id))
  const reviewing = positions.length > 0 && step >= positions.length
  const currentPost = positions[Math.min(step, Math.max(positions.length - 1, 0))]
  const currentCat = categoryForPost(currentPost)
  const currentList = grouped[currentPost] || []
  const canNext = reviewing ? confirmIndependent && confirmReviewed && complete : Boolean(picked[currentPost])

  return (
    <motion.div
      className="relative z-10 flex h-screen flex-col px-4 py-4 sm:px-5 sm:py-5 md:px-8"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ clipPath: 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="page-shell flex min-h-0 flex-1 flex-col">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <BrandMark size={80} />
            <HandwrittenTitle text="NJV Government School Student Council Election 2026" />
            <p className="mt-1 text-xs text-white/55">{session.student_email}</p>
          </div>
          <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm">
            <IconExit size={14} />
            Cancel
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-6 pb-24">
          <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto pr-1">
            {reviewing ? (
              <div className="max-w-3xl">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-[0.2em] text-[#FFC72C] uppercase">
                  <IconBallot size={14} />
                  Review
                </p>
                <h2 className="mb-4 text-xl font-medium text-white">Your ballot</h2>
                <div className="space-y-2">
                  {positions.map((position) => {
                    const c = (data?.candidates || []).find((row) => row.id === picked[position])
                    return (
                      <div key={position} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0A3B65]/45 px-3 py-2">
                        {c ? <Avatar candidate={c} size={40} /> : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-[#FFC72C]">{prettyText(position)}</p>
                          <p className="truncate text-sm font-medium text-white">{c?.name || 'Not selected'}</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-white/20 px-3 py-1 text-xs"
                          onClick={() => setStep(positions.indexOf(position))}
                        >
                          Change
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-5 space-y-2">
                  <FancyCheck
                    checked={confirmIndependent}
                    onChange={setConfirmIndependent}
                    label="I voted independently"
                  />
                  <FancyCheck
                    checked={confirmReviewed}
                    onChange={setConfirmReviewed}
                    label="I reviewed my choices"
                  />
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-1 text-[11px] font-medium tracking-[0.2em] text-[#FFC72C] uppercase">
                  {currentCat?.title || 'Ballot'}
                </p>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-xl font-medium text-white">
                    <IconUser size={20} className="text-[#FFC72C]" />
                    {prettyText(currentPost)}
                  </h2>
                  <p className="flex items-center gap-1 text-[11px] text-white/45">
                    <IconClock size={13} />
                    {positions.length ? step + 1 : 0}/{positions.length}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {currentList.map((c, i) => {
                    const active = picked[currentPost] === c.id
                    return (
                      <motion.button
                        key={c.id}
                        custom={i}
                        variants={cardIn}
                        initial="hidden"
                        animate="show"
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          onRipple?.(e)
                          setPicked((cur) => ({ ...cur, [currentPost]: c.id }))
                          sounds.select()
                        }}
                        className={`vote-card relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                          active ? 'is-active border-[#FFC72C] bg-white/10' : 'border-white/10 bg-[#0A3B65]/45'
                        }`}
                      >
                        <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.color_tag || '#FFC72C' }} />
                        <div className="flex items-center gap-4">
                          <Avatar candidate={c} size={72} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-semibold text-white">{c.name}</p>
                            <p className="text-xs font-semibold text-secondary">{prettyText(c.position)}</p>
                          </div>
                          <motion.span
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                              active ? 'border-[#FFC72C] bg-[#FFC72C] text-[#0A3B65]' : 'border-white/25 text-white/40'
                            }`}
                            animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                            transition={{ duration: 0.35 }}
                          >
                            {active ? '✓' : ''}
                          </motion.span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-5 z-20 px-5 md:px-8"
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="page-shell pointer-events-auto">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-full border border-[#FFC72C]/30 bg-[#0A3B65]/85 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <button
              type="button"
              disabled={step <= 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-full border border-white/20 px-4 py-2 text-sm disabled:opacity-30"
            >
              Previous
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {reviewing ? 'Review and confirm' : currentPost || 'Ballot'}
              </p>
              <p className="truncate text-xs text-secondary">
                {reviewing ? `${selectedCount}/${positions.length} posts selected` : `Post ${positions.length ? step + 1 : 0} of ${positions.length}`}
              </p>
            </div>
            {error && <p className="hidden text-xs text-rose-300 sm:block">{error}</p>}
            {reviewing ? (
              <motion.button
                disabled={!canNext || busy}
                onClick={submit}
                whileHover={canNext && !busy ? { scale: 1.04 } : undefined}
                whileTap={canNext && !busy ? { scale: 0.96 } : undefined}
                className={`btn-gold rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider disabled:opacity-40 ${canNext && !busy ? 'vote-submit' : ''}`}
              >
                {busy ? 'Recording…' : 'Cast vote'}
              </motion.button>
            ) : (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => {
                  sounds.select()
                  setStep((s) => s + 1)
                }}
                className="btn-gold rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider disabled:opacity-40"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function leadersByPosition(candidates = []) {
  const map = {}
  for (const c of candidates) {
    const current = map[c.position]
    if (!current || c.vote_count > current.vote_count) {
      map[c.position] = c
    }
  }
  const ids = {}
  for (const [position, c] of Object.entries(map)) {
    if ((c.vote_count || 0) > 0) ids[position] = c.id
  }
  return ids
}

function Avatar({ candidate, size = 64, showMissing = false }) {
  const src = photoSrc(candidate.photo_url)
  const missing = !src
  return (
    <div
      className="avatar relative"
      style={{ '--avatar-size': `${size}px`, width: size, height: size, minWidth: size, minHeight: size }}
    >
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full text-2xl"
        style={{
          background: missing ? 'rgba(244, 63, 94, 0.12)' : `${candidate.color_tag || '#0A3B65'}33`,
          border: missing ? '2px dashed rgba(251, 113, 133, 0.7)' : `2px solid ${candidate.color_tag || '#FFC72C'}`,
          color: missing ? '#fda4af' : candidate.color_tag || '#FFC72C',
        }}
      >
        {src ? (
          <img src={src} alt={candidate.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-center text-[10px] font-semibold leading-tight tracking-wide uppercase">
            {showMissing ? 'No photo' : initials(candidate.name)}
          </span>
        )}
      </div>
    </div>
  )
}

function Confirm({ result, onDone }) {
  const [left, setLeft] = useState(3)
  const [fail, setFail] = useState('')
  const sparks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: 18 + Math.random() * 64,
        top: 12 + Math.random() * 70,
        delay: Math.random() * 1.2,
        size: 6 + Math.random() * 8,
      })),
    []
  )

  useEffect(() => {
    let t
    let d
    const startClock = () => {
      sounds.fanfare()
      t = setInterval(() => setLeft((n) => n - 1), 1000)
      d = setTimeout(onDone, 3000)
    }
    startClock()
    result?.pending?.catch((err) => setFail(friendlyError(err) || 'Vote failed'))
    return () => {
      clearInterval(t)
      clearTimeout(d)
    }
  }, [onDone])

  const words = ['Vote', 'cast', 'successfully']

  return (
    <motion.div
      className="relative z-20 flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-white"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      <Confetti show />
      {sparks.map((s) => (
        <span
          key={s.id}
          className="success-sparkle pointer-events-none"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
        />
      ))}
      <div
        className="pointer-events-none absolute h-[560px] w-[560px] opacity-35"
        style={{
          background: 'repeating-conic-gradient(from 0deg, #FFC72C 0deg 7deg, transparent 7deg 20deg)',
          animation: 'rays 14s linear infinite',
          maskImage: 'radial-gradient(circle, black 18%, transparent 68%)',
        }}
      />
      {[0, 0.18, 0.36].map((delay) => (
        <span
          key={delay}
          className="success-burst pointer-events-none h-40 w-40"
          style={{ animation: `burst-ring 1.4s ease-out ${delay}s both` }}
        />
      ))}

      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
      >
        <motion.div
          className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-[#FFC72C]/15 shadow-[0_0_80px_rgba(255,199,44,0.45)]"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.svg width="92" height="92" viewBox="0 0 120 120" initial={{ scale: 0.2, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#FFC72C" strokeWidth="5" />
            <motion.path
              d="M34 62 L52 80 L88 42"
              fill="none"
              stroke="#FFCB31"
              strokeWidth="9"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.55, delay: 0.25 }}
            />
          </motion.svg>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {words.map((word, i) => (
            <motion.span
              key={word}
              className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-5xl"
              initial={{ y: 40, opacity: 0, filter: 'blur(8px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.35 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}
            </motion.span>
          ))}
        </div>
        {fail && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-rose-300">{fail}</p>
            <button type="button" onClick={onDone} className="rounded-full border border-white/20 px-4 py-2 text-sm">
              Back to station
            </button>
          </div>
        )}

        <motion.div
          className="mt-5 rounded-full border-2 border-[#FFC72C] px-5 py-1.5 text-xs font-bold tracking-[0.28em] text-[#FFC72C] uppercase"
          initial={{ scale: 1.8, rotate: -16, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.85, type: 'spring', stiffness: 320, damping: 14 }}
        >
          Official record
        </motion.div>

        <motion.p
          className="mt-4 text-base text-white/85"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {result?.candidate_name ? `Recorded for ${result.candidate_name}` : 'Your vote has been sealed.'}
        </motion.p>

        <motion.div
          className="mt-8 flex items-center gap-3 text-sm text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.15 }}
        >
          <svg width="44" height="44">
            <circle cx="22" cy="22" r="17" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <motion.circle
              cx="22"
              cy="22"
              r="17"
              fill="none"
              stroke="#FFC72C"
              strokeWidth="3"
              strokeDasharray={107}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 107 }}
              transition={{ duration: 6, ease: 'linear' }}
              style={{ rotate: '-90deg', transformOrigin: 'center' }}
            />
            <text x="22" y="26" textAnchor="middle" fill="#fff" fontSize="12">{Math.max(left, 0)}</text>
          </svg>
          Returning to station
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function readCachedResults() {
  try {
    return JSON.parse(sessionStorage.getItem('njv_results') || 'null')
  } catch {
    return null
  }
}

function AdminBoard({ user, onLogout, initialResults }) {
  const [results, setResults] = useState(() => hydrateResults(initialResults || readCachedResults()) || emptyBoard())
  const [events, setEvents] = useState([])
  const [present, setPresent] = useState(false)
  const [closeMenu, setCloseMenu] = useState(false)
  const [leaderFlash, setLeaderFlash] = useState(null)
  const [loadError, setLoadError] = useState('')
  const afterId = useRef(0)
  const lastLeader = useRef(null)
  const busy = useRef(false)
  const photoCache = useRef({})
  const wantPhotos = useRef(true)

  async function pullResults() {
    const data = await api.results({
      include_photos: false,
      after_id: afterId.current,
    })
    wantPhotos.current = false
    if (!Array.isArray(data.candidates)) {
      throw new Error('Sheets did not return candidates. Run setup() then Deploy → New version.')
    }
    const cache = readPhotoCache()
    data.candidates = data.candidates.map((c) => {
      if (c.photo_url) {
        photoCache.current[c.id] = c.photo_url
        cache[c.id] = c.photo_url
        cache[`name:${c.name}`] = c.photo_url
      }
      return {
        ...c,
        photo_url: c.photo_url || photoCache.current[c.id] || cache[c.id] || cache[`name:${c.name}`] || null,
      }
    })
    writePhotoCache(cache)
    if (lastLeader.current && data.leader_id && lastLeader.current !== data.leader_id) {
      const leader = data.candidates.find((c) => c.id === data.leader_id)
      setLeaderFlash(leader)
      sounds.leaderSting()
      setTimeout(() => setLeaderFlash(null), 2800)
    }
    lastLeader.current = data.leader_id
    if (data.events?.length) {
      afterId.current = data.events[data.events.length - 1].id
      setEvents((prev) => [...data.events, ...prev].slice(0, 40))
      sounds.tick()
    }
    setResults((prev) => {
      const pending = (prev?.candidates || []).filter(
        (c) => String(c.id).startsWith('tmp-') && !data.candidates.some((x) => x.name === c.name),
      )
      return { ...data, candidates: withCachedPhotos([...data.candidates, ...pending]) }
    })
    setLoadError('')
    data.candidates
      .filter((c) => !c.photo_url)
      .forEach((c) => {
        api
          .candidatePhoto('', c.id)
          .then((shot) => {
            if (!shot?.photo_url) return
            const next = readPhotoCache()
            next[c.id] = shot.photo_url
            next[`name:${c.name}`] = shot.photo_url
            writePhotoCache(next)
            setResults((r) =>
              r
                ? {
                    ...r,
                    candidates: r.candidates.map((row) =>
                      row.id === c.id || row.name === c.name ? { ...row, photo_url: shot.photo_url } : row,
                    ),
                  }
                : r,
            )
          })
          .catch(() => {})
      })
    try {
      sessionStorage.setItem(
        'njv_results',
        JSON.stringify({
          ...data,
          candidates: data.candidates.map((c) => ({ ...c, photo_url: null })),
        }),
      )
    } catch {
      /* ignore quota */
    }
  }

  function refreshAll() {
    wantPhotos.current = true
    return pullResults()
  }

  useEffect(() => {
    let live = true
    async function tick() {
      if (busy.current) return
      busy.current = true
      try {
        await pullResults()
      } catch (err) {
        if (live) setLoadError(friendlyError(err))
      } finally {
        busy.current = false
      }
    }
    tick()
    const t = setInterval(tick, present ? 4000 : 10000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [present])

  const board = results || emptyBoard()
  const max = Math.max(...board.candidates.map((c) => c.vote_count), 1)
  const total = board.total_votes || 1
  const missingPhotos = board.candidates.filter((c) => !c.photo_url).length
  const positionLeaders = leadersByPosition(board.candidates)

  return (
    <motion.div
      className="relative z-10 flex h-screen flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <Confetti show={!!leaderFlash} />
      <AnimatePresence>
        {leaderFlash && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#FFC72C]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mx-3 flex max-w-[94vw] items-center gap-3 rounded-full bg-[#FFC72C] px-4 py-3 font-display text-lg tracking-wide text-[#0A3B65] shadow-[0_0_80px_#FFC72C] sm:gap-5 sm:px-8 sm:py-4 sm:text-3xl sm:tracking-widest md:text-5xl"
              initial={{ y: -80, scale: 0.6 }}
              animate={{ y: 0, scale: 1.05 }}
            >
              <Avatar candidate={leaderFlash} size={56} />
              <IconTrophy size={24} className="shrink-0" />
              <span className="truncate">NEW LEADER · {leaderFlash.name}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!present && (
        <header className="page-shell flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <BrandMark size={48} subtitle="Live Results" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              open={board.voting_open}
              declared={board.winners_declared}
              onChange={(open) => {
                if (!open) {
                  setCloseMenu(true)
                  return
                }
                setResults((r) => ({ ...r, voting_open: true, winners_declared: false }))
                api.toggleVoting(true).catch(() => setResults((r) => ({ ...r, voting_open: false })))
              }}
            />
            <button
              onClick={() => setPresent(true)}
              className="btn-gold inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"
            >
              <IconPlay size={14} />
              Presentation
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm"
            >
              <IconExit size={14} />
              Logout
            </button>
          </div>
        </header>
      )}

      {closeMenu && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0A3B65]/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-[#FFC72C]/40 bg-[#0A3B65] p-6 shadow-[0_0_80px_rgba(255,199,44,0.25)]">
            <p className="font-display text-2xl tracking-wide text-[#FFC72C]">Close the hall?</p>
            <p className="mt-2 text-sm text-white/75">
              Choose how to stop the live count. You can pause quietly, or crown the winners on the projector.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-left"
                onClick={() => {
                  setCloseMenu(false)
                  setResults((r) => ({ ...r, voting_open: false, winners_declared: false }))
                  api.toggleVoting(false).catch(() => setResults((r) => ({ ...r, voting_open: true })))
                }}
              >
                <p className="text-sm font-semibold text-white">Pause voting</p>
                <p className="mt-1 text-xs text-white/60">Booths stop. The hall still shows every candidate.</p>
              </button>
              <button
                type="button"
                className="rounded-2xl border border-[#FFC72C]/50 bg-[#FFC72C]/15 px-4 py-4 text-left"
                onClick={() => {
                  setCloseMenu(false)
                  setResults((r) => ({ ...r, voting_open: false, winners_declared: true }))
                  api.declareWinners().catch(() => setResults((r) => ({ ...r, voting_open: true, winners_declared: false })))
                }}
              >
                <p className="text-sm font-semibold text-[#FFC72C]">Declare winners</p>
                <p className="mt-1 text-xs text-white/60">Booths stop. The hall shows only crowned winners.</p>
              </button>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-full border border-white/15 py-2 text-sm text-white/70"
              onClick={() => setCloseMenu(false)}
            >
              Keep voting open
            </button>
          </div>
        </div>
      )}

      {present ? (
        <div className="min-h-0 flex-1">
          <PresentationShow board={board} onExit={() => setPresent(false)} />
        </div>
      ) : (
      <div className="page-shell grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 pb-16 sm:px-6 grid-cols-1 lg:overflow-hidden lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <div className="no-scrollbar overflow-visible lg:overflow-y-auto">
          <div className="mb-4 flex flex-wrap gap-6 text-xl">
            <Stat label="Votes" value={board.total_votes} icon={IconBallot} />
            <Stat label="Turnout" value={`${board.turnout_percent}%`} icon={IconChart} />
            <Stat label="Eligible" value={board.eligible_students} icon={IconUsers} />
          </div>
          {missingPhotos > 0 && (
            <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {missingPhotos} candidate{missingPhotos === 1 ? '' : 's'} still missing a photo. Upload one before the election goes live.
            </p>
          )}
          <div className="space-y-8">
            {[
              ...ELECTION_CATEGORIES.map((cat) => ({
                ...cat,
                people: board.candidates.filter((c) => cat.posts.includes(c.position)),
              })),
              {
                id: 'other',
                title: 'Other posts',
                people: board.candidates.filter((c) => !ALL_POSTS.includes(c.position)),
              },
            ]
              .filter((cat) => cat.people.length)
              .map((cat) => (
                <div key={cat.id}>
                  <h2 className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-[#FFC72C] uppercase">{cat.title}</h2>
                  <div className="space-y-2">
            {cat.people.map((c) => {
              const pct = Math.round((c.vote_count / total) * 100)
              const width = Math.max(6, (c.vote_count / max) * 100)
              const overallLead = board.leader_id === c.id
              const positionLead = positionLeaders[c.position] === c.id
              const leading = overallLead || positionLead
              return (
                <div
                  key={c.id}
                  className={`relative overflow-hidden rounded-xl border px-3 py-2 ${
                    leading ? 'border-[#FFC72C] bg-white/5 shadow-[0_0_24px_rgba(255,199,44,0.25)]' : 'border-white/10 bg-[#0A3B65]/40'
                  }`}
                >
                  <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: c.color_tag || '#FFC72C' }} />
                  <div className="mb-1 flex items-center gap-3">
                    <Ring pct={pct} color={c.color_tag}>
                      <Avatar candidate={c} size={36} showMissing />
                    </Ring>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-white">{c.name}</p>
                        <p className="text-lg font-semibold tabular-nums text-white">{c.vote_count}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-secondary">{c.position}</p>
                        {positionLead && (
                          <span className="leading-badge">
                            <IconTrophy size={11} />
                            Leading
                          </span>
                        )}
                        {!c.photo_url && <span className="no-photo-badge">No photo</span>}
                      </div>
                    </div>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="liquid-fill shimmer absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${width}%`, '--bar': c.color_tag }}
                    />
                  </div>
                </div>
              )
            })}
                  </div>
                </div>
              ))}
          </div>
        </div>
        {!present && (
          <AdminSide
            results={board}
            onRefresh={refreshAll}
            onLocalCandidate={(c) => {
              const cache = readPhotoCache()
              if (c.photo_url) {
                cache[c.id] = c.photo_url
                cache[`name:${c.name}`] = c.photo_url
                writePhotoCache(cache)
              }
              setResults((r) => ({
                ...(r || emptyBoard()),
                candidates: [c, ...((r || emptyBoard()).candidates || []).filter((x) => x.id !== c.id && x.name !== c.name)],
              }))
            }}
          />
        )}
      </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-30 overflow-hidden border-t border-[#FFC72C]/30 bg-[#0A3B65]/85 py-2">
        <div className="flex whitespace-nowrap" style={{ animation: 'ticker 28s linear infinite' }}>
          {[...events, ...events].map((ev, i) => (
            <span key={`${ev.id}-${i}`} className="mx-8 text-sm">
              <span className="text-[#FFC72C]">LIVE</span> Vote cast for {ev.candidate_name} · Total: {ev.new_count}
              {ev.lead_changed ? ' · LEAD CHANGE' : ''}
            </span>
          ))}
          {events.length === 0 && <span className="mx-8 text-secondary">Awaiting first vote… NJV Student Council Election 2026</span>}
        </div>
      </div>
    </motion.div>
  )
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="label-caps flex items-center gap-1.5 text-[11px]">
        {Icon ? <Icon size={12} /> : null}
        {label}
      </p>
      <p className="text-white">{value}</p>
    </div>
  )
}

function Ring({ pct, color, children }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: 68, height: 68 }}>
      <svg className="absolute inset-0" width="68" height="68">
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="34"
          cy="34"
          r={r}
          fill="none"
          stroke={color || '#FFC72C'}
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

function Toggle({ open, declared, onChange }) {
  const label = open ? 'Voting OPEN' : declared ? 'Winners declared' : 'Voting paused'
  return (
    <button
      onClick={() => onChange(!open)}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${open ? 'bg-[#FFC72C] text-[#0A3B65]' : 'bg-rose-800 text-white'}`}
    >
      {label}
    </button>
  )
}

function StaffPanel({ onNote }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')

  const [passId, setPassId] = useState(null)
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')

  const input =
    'w-full rounded-xl border border-white/15 bg-[#0A3B65]/80 px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[#FFC72C]'

  async function reload() {
    try {
      const data = await api.teachers()
      setList(data.teachers || [])
      setError('')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function add(e) {
    e.preventDefault()
    const address = email.trim().toLowerCase()

    if (!validSchoolEmail(address)) {
      setError(`Staff email must be a valid @${DOMAIN} address, like sadia.khan@${DOMAIN}`)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await api.storeTeacher({ name: name.trim(), email: address, password })
      setName('')
      setEmail('')
      setPassword('')
      await reload()
      onNote?.('Staff added')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  function startEdit(person) {
    setPassId(null)
    setEditId(person.id)
    setEditName(person.name)
    setEditEmail(person.email)
    setError('')
  }

  async function saveEdit(id) {
    const address = editEmail.trim().toLowerCase()

    if (!editName.trim()) {
      setError('Name cannot be empty.')
      return
    }
    if (!validSchoolEmail(address)) {
      setError(`Staff email must be a valid @${DOMAIN} address.`)
      return
    }

    setBusy(true)
    setError('')
    try {
      await api.updateTeacher(id, { name: editName.trim(), email: address })
      setEditId(null)
      await reload()
      onNote?.('Staff updated')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  function startPass(person) {
    setEditId(null)
    setPassId(person.id)
    setPass1('')
    setPass2('')
    setError('')
  }

  async function savePass(id) {
    if (pass1.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (pass1 !== pass2) {
      setError('The two passwords do not match.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await api.updateTeacherPassword(id, { password: pass1, password_confirmation: pass2 })
      setPassId(null)
      setPass1('')
      setPass2('')
      await reload()
      onNote?.('Password changed')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(person) {
    if (!window.confirm(`Delete ${person.name}'s account? This cannot be undone.`)) return

    setBusy(true)
    setError('')
    try {
      await api.destroyTeacher(person.id)
      await reload()
      onNote?.('Staff removed')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="admin-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">Add staff</p>
          <span className="rounded-full bg-[#FFC72C]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FFC72C]">
            @{DOMAIN} only
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="label-caps text-[10px]">Full name</span>
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sadia Khan"
              required
            />
          </label>
          <label className="block">
            <span className="label-caps text-[10px]">School email</span>
            <input
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`sadia.khan@${DOMAIN}`}
              inputMode="email"
              autoComplete="off"
              required
            />
          </label>
          <label className="block">
            <span className="label-caps text-[10px]">Password</span>
            <input
              className={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
          </label>
        </div>

        <button disabled={busy} className="btn-gold w-full rounded-lg py-2 text-sm font-semibold">
          Add staff
        </button>
      </form>

      <div className="admin-card space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <IconUsers size={14} className="text-[#FFC72C]" />
            Staff ({list.length})
          </p>
          <button type="button" className="ghost-btn" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>
        )}

        {loading && <p className="text-xs text-white/60">Loading staff…</p>}

        {!loading && list.length === 0 && (
          <p className="text-xs text-white/60">No staff yet. Add the first account above.</p>
        )}

        <div className="space-y-2">
          {list.map((person) => {
            const editing = editId === person.id
            const changing = passId === person.id

            return (
              <div key={person.id} className="rounded-xl border border-white/10 bg-[#0A3B65]/45 p-3">
                {editing ? (
                  <div className="space-y-2">
                    <input
                      className={input}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Full name"
                    />
                    <input
                      className={input}
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder={`name@${DOMAIN}`}
                      inputMode="email"
                    />
                    <p className="text-[11px] text-white/50">Must be an @{DOMAIN} address.</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveEdit(person.id)}
                        className="btn-gold rounded-full px-3 py-1 text-xs font-semibold"
                      >
                        Save changes
                      </button>
                      <button type="button" disabled={busy} onClick={() => setEditId(null)} className="ghost-btn">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FFC72C]/40 bg-[#FFC72C]/15 text-[11px] font-bold text-[#FFC72C]">
                        {initials(person.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{person.name}</p>
                        <p className="truncate text-xs text-white/60">{person.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          person.votes_count > 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {person.votes_count > 0
                          ? `${person.votes_count} vote${person.votes_count === 1 ? '' : 's'}`
                          : 'No votes'}
                      </span>
                      <button type="button" className="ghost-btn" onClick={() => startEdit(person)}>
                        Edit
                      </button>
                      <button type="button" className="ghost-btn" onClick={() => startPass(person)}>
                        Password
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        disabled={busy || !person.can_delete}
                        title={
                          person.can_delete
                            ? `Delete ${person.name}`
                            : 'This account is recorded on votes; deleting it would erase them from the results'
                        }
                        onClick={() => remove(person)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {changing && (
                  <div className="mt-3 space-y-2 rounded-xl border border-[#FFC72C]/25 bg-[#0A3B65]/60 p-3">
                    <p className="text-xs font-semibold text-white">New password for {person.name}</p>
                    <input
                      className={input}
                      type="password"
                      value={pass1}
                      onChange={(e) => setPass1(e.target.value)}
                      placeholder="New password"
                      autoComplete="new-password"
                    />
                    <input
                      className={input}
                      type="password"
                      value={pass2}
                      onChange={(e) => setPass2(e.target.value)}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                    />
                    <p className="text-[11px] text-white/50">
                      At least 8 characters. Changing it signs them out everywhere.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => savePass(person.id)}
                        className="btn-gold rounded-full px-3 py-1 text-xs font-semibold"
                      >
                        Change password
                      </button>
                      <button type="button" disabled={busy} onClick={() => setPassId(null)} className="ghost-btn">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AdminSide({ results, onRefresh, onLocalCandidate }) {
  const [tab, setTab] = useState('ballot')
  const [name, setName] = useState('')
  const [position, setPosition] = useState(ALL_POSTS[0])
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [eligible, setEligible] = useState(results.eligible_students ?? 0)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [votes, setVotes] = useState([])

  useEffect(() => {
    setEligible(results.eligible_students ?? 0)
  }, [results.eligible_students])

  useEffect(() => {
    if (tab !== 'votes') return
    api.votes().then((d) => setVotes(d.votes || [])).catch(() => setVotes([]))
  }, [tab])

  function printVotes() {
    const rows = votes
      .map(
        (v) =>
          `<tr><td>${escapeHtml(v.student_email)}</td><td>${escapeHtml(prettyText(v.position))}</td><td>${escapeHtml(v.candidate_name)}</td><td>${escapeHtml(v.teacher_name)}</td><td>${escapeHtml(v.voted_at ? new Date(v.voted_at).toLocaleString() : '')}</td></tr>`,
      )
      .join('')
    const html = `<!DOCTYPE html><html><head><title>NJV Vote Report</title>
      <base href="${window.location.origin}/">
      <style>
        body{font-family:Georgia,serif;color:#0A3B65;padding:24px}
        img{height:72px}
        h1{margin:8px 0 4px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #c5d4e0;padding:6px 8px;text-align:left}
        th{background:#0A3B65;color:#FFC72C}
        @media print{button{display:none}}
      </style></head><body>
      <div style="display:flex;align-items:center;gap:16px">
        <img src="${logoSrc()}" alt="NJV"/>
        <div><h1>NJV Govt. Higher Secondary School</h1>
        <p>Student Council Election · who voted for whom</p></div>
      </div>
      <table><thead><tr><th>Student email</th><th>Post</th><th>Candidate</th><th>Booth teacher</th><th>Time</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">No votes yet</td></tr>'}</tbody></table>
      </body></html>`
    openPrintWindow(html)
  }

  function printWinners() {
    const people = results.candidates || []
    const cats = [
      ...ELECTION_CATEGORIES.map((cat) => ({
        title: cat.title,
        posts: cat.posts.filter((p) => people.some((c) => c.position === p)),
      })),
      {
        title: 'Other posts',
        posts: [...new Set(people.map((c) => c.position).filter((p) => p && !ALL_POSTS.includes(p)))],
      },
    ].filter((cat) => cat.posts.length)

    // Winners first: one short roll-call per council so the result can be read
    // at a glance. The candidate-by-candidate breakdown follows underneath.
    let winners = ''
    let details = ''

    for (const cat of cats) {
      const winnerRows = cat.posts
        .map((post) => {
          const list = people.filter((c) => c.position === post).sort((a, b) => b.vote_count - a.vote_count)
          const win = list[0]
          const count = win ? Number(win.vote_count) || 0 : 0

          return `<tr>
            <td class="role">${escapeHtml(prettyText(post))}</td>
            <td>${count > 0 ? escapeHtml(win.name) : '<span class="none">No votes cast</span>'}</td>
            <td class="num">${count > 0 ? count : '&mdash;'}</td>
          </tr>`
        })
        .join('')

      winners += `<article class="card">
        <h3 class="cat">${escapeHtml(cat.title)}</h3>
        <table class="winners">
          <thead><tr><th>Designation</th><th>Winner</th><th class="num">Votes</th></tr></thead>
          <tbody>${winnerRows}</tbody>
        </table>
      </article>`

      details += `<h2>${escapeHtml(cat.title)}</h2>`
      for (const post of cat.posts) {
        const list = people.filter((c) => c.position === post).sort((a, b) => b.vote_count - a.vote_count)
        const win = list[0]
        const rows = list
          .map(
            (c, i) =>
              `<tr class="${i === 0 ? 'gold' : ''}"><td>${i + 1}</td><td>${escapeHtml(c.name)}</td><td>${Number(c.vote_count) || 0}</td><td>${i === 0 ? 'WINNER' : ''}</td></tr>`,
          )
          .join('')
        details += `<article><h3>${escapeHtml(prettyText(post))}</h3>
          <p class="win">${win ? `${escapeHtml(win.name)} · ${Number(win.vote_count) || 0} vote${win.vote_count === 1 ? '' : 's'}` : 'No votes'}</p>
          <table><thead><tr><th>#</th><th>Candidate</th><th>Votes</th><th></th></tr></thead><tbody>${rows}</tbody></table></article>`
      }
    }

    const html = `<!DOCTYPE html><html><head><title>NJV Election Results</title>
      <base href="${window.location.origin}/">
      <style>
        body{font-family:Georgia,serif;color:#0A3B65;padding:28px;max-width:820px;margin:0 auto}
        img{height:72px}
        h1{margin:8px 0 4px;font-size:22px}
        h2{margin:28px 0 8px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#0A3B65;border-bottom:2px solid #FFC72C;padding-bottom:6px}
        h3{margin:16px 0 4px;font-size:16px}
        .win{margin:0 0 8px;font-weight:700;color:#0A3B65}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px}
        th,td{border:1px solid #c5d4e0;padding:7px 8px;text-align:left}
        th{background:#0A3B65;color:#FFC72C}
        tr.gold td{background:#FFF4CC;font-weight:700}
        .card{margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}
        h3.cat{margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#0A3B65;background:#FFF4CC;border-left:4px solid #FFC72C;padding:6px 10px}
        table.winners{margin-bottom:0;font-size:14px}
        table.winners th{font-size:11px;letter-spacing:.1em;text-transform:uppercase}
        table.winners td.role{font-weight:700;width:42%}
        table.winners td.num,table.winners th.num{text-align:center;width:68px}
        table.winners tbody tr:nth-child(even) td{background:#F7FAFD}
        .none{color:#7a8fa3;font-style:italic;font-weight:400}
        .lede{margin:0 0 18px;font-size:13px;color:#3f5f7d}
        .full{break-before:page;page-break-before:always}
        @media print{button{display:none}}
      </style></head><body>
      <div style="display:flex;align-items:center;gap:16px">
        <img src="${logoSrc()}" alt="NJV"/>
        <div><h1>NJV Govt. Higher Secondary School</h1>
        <p>Student Council Election · official results</p></div>
      </div>
      <h2 style="margin-top:24px">Winners</h2>
      <p class="lede">Designation, elected candidate and votes received. The full candidate breakdown follows from the next page.</p>
      ${winners || '<p>No candidates.</p>'}
      <h2 class="full">Full results</h2>
      ${details || '<p>No candidates.</p>'}
      </body></html>`
    openPrintWindow(html)
  }

  function note(text) {
    setMsg(text)
  }

  function onPhoto(file) {
    const reject = photoRejectReason(file)
    if (reject) {
      note(reject)
      return
    }
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result || ''))
    reader.readAsDataURL(file)
    setMsg('')
  }

  async function addCandidate(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const form = new FormData()
      form.append('name', name)
      form.append('position', position)
      if (photo) form.append('photo', photo)
      const local = {
        id: `tmp-${Date.now()}`,
        name,
        position,
        photo_url: preview || null,
        vote_count: 0,
        color_tag: '#FFC72C',
        is_active: true,
      }
      onLocalCandidate?.(local)
      api.storeCandidate(form).catch((err) => note(friendlyError(err)))
      setName('')
      setPhoto(null)
      setPreview('')
      note('Candidate added')
    } catch (err) {
      note(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function saveEligible(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.updateSettings({ eligible_students: Number(eligible) })
      note('Eligible students updated')
      onRefresh()
    } catch (err) {
      note(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function uploadExistingPhoto(candidateId, file) {
    if (!file) return
    const reject = photoRejectReason(file)
    if (reject) {
      note(reject)
      return
    }
    const current = results.candidates.find((x) => x.id === candidateId)
    const reader = new FileReader()
    reader.onload = () => {
      const photo_url = String(reader.result || '')
      if (current) onLocalCandidate?.({ ...current, photo_url })
    }
    reader.readAsDataURL(file)
    setBusy(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      await api.updateCandidate(candidateId, form)
      note('Photo uploaded')
    } catch (err) {
      note(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  function startEdit(c) {
    setEditingId(c.id)
    setEditName(c.name)
    setEditPosition(c.position)
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editingId) return
    setBusy(true)
    try {
      await api.renameCandidate(editingId, { name: editName, position: editPosition })
      setEditingId(null)
      note('Candidate updated')
      onRefresh()
    } catch (err) {
      note(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function removeCandidate(c) {
    const ok = window.confirm(`Delete ${c.name} from the ballot? This also removes their votes.`)
    if (!ok) return
    setBusy(true)
    try {
      await api.destroyCandidate(c.id)
      if (editingId === c.id) setEditingId(null)
      note(`${c.name} removed`)
      onRefresh()
    } catch (err) {
      note(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="no-scrollbar relative flex min-h-0 flex-col overflow-y-auto pr-1">
      <WaitOverlay show={busy} title="Saving" hint="Just a moment" />
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-[#FFC72C]">
        <IconCog size={14} />
        ADMIN CONTROLS
      </p>
      <div className="admin-tabs mb-4">
        {[
          ['ballot', 'Ballot', IconBallot],
          ['votes', 'Votes', IconUsers],
          ['settings', 'Settings', IconCog],
          ['staff', 'Staff', IconShield],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            className={`admin-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
            title={label}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {msg && <p className="mb-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{msg}</p>}

      {tab === 'ballot' && (
        <div className="space-y-4">
          <div className="admin-card space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Candidates</p>
              <p className="text-xs text-muted">{results.candidates.length} on ballot</p>
            </div>
            {results.candidates.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                {editingId === c.id ? (
                  <form onSubmit={saveEdit} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar candidate={c} size={40} showMissing />
                      <div className="min-w-0 flex-1 space-y-2">
                        <input className="w-full rounded-lg bg-[#0A3B65]/80 px-3 py-2 text-sm text-white" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                        <select className="w-full rounded-lg bg-[#0A3B65]/80 px-3 py-2 text-sm text-white" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} required>
                          {ELECTION_CATEGORIES.map((cat) => (
                            <optgroup key={cat.id} label={cat.title}>
                              {cat.posts.map((post) => (
                                <option key={post} value={post}>{prettyText(post)}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={busy} className="btn-gold rounded-full px-3 py-1 text-xs font-semibold">Save</button>
                      <button type="button" className="ghost-btn" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="relative cursor-pointer">
                      <Avatar candidate={c} size={40} showMissing />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => uploadExistingPhoto(c.id, e.target.files?.[0])}
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                      <p className="text-xs text-secondary">{prettyText(c.position)} · {c.vote_count} votes</p>
                      {!c.photo_url && <span className="no-photo-badge mt-1">No photo</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button className="ghost-btn" onClick={() => startEdit(c)}>Rename</button>
                      <button className="danger-btn" disabled={busy} onClick={() => removeCandidate(c)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={addCandidate} className="admin-card space-y-3">
            <p className="text-sm font-semibold text-white">Add candidate</p>
            <input className="w-full rounded-lg bg-[#0A3B65]/80 px-3 py-2 text-white" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <select
              className="w-full rounded-lg bg-[#0A3B65]/80 px-3 py-2 text-white"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            >
              {ELECTION_CATEGORIES.map((cat) => (
                <optgroup key={cat.id} label={cat.title}>
                  {cat.posts.map((post) => (
                    <option key={post} value={post}>{prettyText(post)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <label
              className={`photo-drop ${preview ? 'filled' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                onPhoto(e.dataTransfer.files?.[0])
              }}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-rose-300/70 text-[10px] font-bold tracking-wide text-rose-200 uppercase">
                    Photo missing
                  </span>
                  <span className="text-sm font-semibold text-white">Drop a candidate photo</span>
                </>
              )}
              <span className="text-xs text-muted">jpg / png / webp · max 2MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </label>
            <button disabled={busy} className="w-full rounded-lg bg-white/15 py-2 text-sm font-semibold text-white">
              Save candidate
            </button>
          </form>
        </div>
      )}

      {tab === 'votes' && (
        <div className="admin-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <IconEye size={15} className="text-[#FFC72C]" />
              Who voted for whom
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={printWinners}
                className="btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              >
                <IconTrophy size={13} />
                Print winners
              </button>
              <button type="button" onClick={printVotes} className="ghost-btn inline-flex items-center gap-1.5">
                <IconPrinter size={13} />
                Print ballots
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[#FFC72C]">
                  <th className="py-1">Student</th>
                  <th>Post</th>
                  <th>Candidate</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((v) => (
                  <tr key={v.id} className="border-t border-white/10 text-white">
                    <td className="py-1 pr-2">{v.student_email}</td>
                    <td className="pr-2">{prettyText(v.position)}</td>
                    <td>{v.candidate_name}</td>
                  </tr>
                ))}
                {votes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-secondary">
                      No votes yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form onSubmit={saveEligible} className="admin-card space-y-3">
          <p className="text-sm font-semibold text-white">Election settings</p>
          <label className="label-caps block text-[10px]">Total eligible students</label>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg bg-[#0A3B65]/80 px-3 py-2 text-white"
            value={eligible}
            onChange={(e) => setEligible(e.target.value)}
          />
          <button disabled={busy} className="btn-gold w-full rounded-lg py-2 text-sm font-semibold">
            Save eligible count
          </button>
        </form>
      )}

      {tab === 'staff' && <StaffPanel onNote={note} />}
    </div>
  )
}
