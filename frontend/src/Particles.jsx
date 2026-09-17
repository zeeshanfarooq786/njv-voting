import Particles from '@tsparticles/react'

const particleOptions = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: { value: 72, density: { enable: true, width: 1200, height: 800 } },
    color: { value: ['#FFC72C', '#FFCB31', '#FEBD25'] },
    opacity: { value: { min: 0.12, max: 0.45 } },
    size: { value: { min: 1, max: 2.6 } },
    links: {
      enable: true,
      color: '#FFC72C',
      opacity: 0.12,
      distance: 130,
      width: 0.6,
    },
    move: {
      enable: true,
      speed: 0.55,
      direction: 'none',
      outModes: { default: 'bounce' },
    },
  },
  interactivity: {
    detectsOn: 'canvas',
    events: {
      onHover: { enable: false, mode: 'repulse' },
      onClick: { enable: false },
    },
    modes: {
      repulse: { distance: 110, duration: 0.35, speed: 0.6, factor: 2 },
    },
  },
}

export default function AmbientField() {
  return (
    <Particles
      id="tsparticles"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: '100%', height: '100%' }}
      options={particleOptions}
    />
  )
}

export function WinnerBurst() {
  const shards = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * 360
    const dist = 70 + (i % 5) * 18
    const rad = (angle * Math.PI) / 180
    return {
      id: i,
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist,
      rot: angle,
      delay: (i % 7) * 0.04,
      color: i % 3 === 0 ? '#FFC72C' : i % 3 === 1 ? '#FFFFFF' : '#FEBD25',
      w: 5 + (i % 3) * 2,
      h: 10 + (i % 4) * 3,
    }
  })

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      <span className="winner-glow" />
      {shards.map((s) => (
        <span
          key={s.id}
          className="winner-shard"
          style={{
            width: s.w,
            height: s.h,
            background: s.color,
            animationDelay: `${s.delay}s`,
            '--dx': `${s.x}px`,
            '--dy': `${s.y}px`,
            '--rot': `${s.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}

export function Confetti({ show }) {
  if (!show) return null
  const bits = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    dur: 1.4 + Math.random() * 1.2,
    color: i % 3 === 0 ? '#FFC72C' : i % 3 === 1 ? '#0A3B65' : '#FFFFFF',
    rot: Math.random() * 360,
  }))
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {bits.map((b) => (
        <span
          key={b.id}
          style={{
            position: 'absolute',
            left: `${b.left}%`,
            top: '-8px',
            width: 8,
            height: 14,
            background: b.color,
            transform: `rotate(${b.rot}deg)`,
            animation: `fall ${b.dur}s ease-in ${b.delay}s forwards`,
          }}
        />
      ))}
      <style>{`@keyframes fall { to { transform: translateY(110vh) rotate(540deg); opacity: 0.2; } }`}</style>
    </div>
  )
}

export function RippleLayer({ ripples }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[5]">
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: 28,
            height: 28,
            marginLeft: -14,
            marginTop: -14,
            borderRadius: '999px',
            border: '2px solid rgba(255,199,44,0.85)',
            boxShadow: '0 0 22px rgba(255,199,44,0.45)',
            animation: 'ripple-expand 0.85s ease-out forwards',
          }}
        />
      ))}
    </div>
  )
}

let rippleId = 0
export function spawnRipple(setRipples, event) {
  const x = event?.clientX ?? window.innerWidth / 2
  const y = event?.clientY ?? window.innerHeight / 2
  const id = ++rippleId
  setRipples((prev) => [...prev, { id, x, y }])
  setTimeout(() => {
    setRipples((prev) => prev.filter((r) => r.id !== id))
  }, 900)
}
