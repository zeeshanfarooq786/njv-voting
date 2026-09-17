let introPlayed = false

function ctx() {
  if (!ctx.audio) {
    ctx.audio = new (window.AudioContext || window.webkitAudioContext)()
  }
  return ctx.audio
}

function note(freq, start, duration, volume = 0.28, type = 'sine') {
  const ac = ctx()
  const t = ac.currentTime + start
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const filter = ac.createBiquadFilter()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(2200, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

function chord(freqs, start, duration, volume = 0.2) {
  freqs.forEach((f, i) => {
    note(f, start, duration, volume * (i ? 0.7 : 1), i % 2 ? 'triangle' : 'sine')
  })
}

export const sounds = {
  unlock() {
    try {
      const ac = ctx()
      if (ac.state === 'suspended') ac.resume()
    } catch {}
  },
  tap() {
    note(660, 0, 0.12, 0.32, 'sine')
    note(880, 0.02, 0.1, 0.18, 'triangle')
  },
  select() {
    note(523, 0, 0.16, 0.34, 'sine')
    note(784, 0.05, 0.22, 0.3, 'triangle')
    note(1046, 0.1, 0.18, 0.16, 'sine')
  },
  tick() {
    note(988, 0, 0.1, 0.22, 'sine')
  },
  playIntro() {
    if (introPlayed) return
    introPlayed = true
    const audio = new Audio('/intro.wav')
    audio.volume = 0.9
    audio.play().catch(() => {
      introPlayed = false
    })
  },
  introSwell() {},
  loginSuccess() {
    note(392, 0, 0.22, 0.32)
    note(523, 0.12, 0.24, 0.34)
    note(659, 0.24, 0.28, 0.3)
    chord([523, 659, 784, 1046], 0.38, 0.9, 0.28)
  },
  leaderSting() {
    chord([392, 494, 587], 0, 0.4, 0.3)
    chord([523, 659, 784], 0.18, 0.7, 0.32)
  },
  confirm() {
    note(523, 0, 0.18, 0.34)
    note(659, 0.1, 0.2, 0.32)
    note(784, 0.2, 0.28, 0.34)
    chord([523, 659, 784, 1046], 0.32, 1.1, 0.3)
  },
  fanfare() {
    chord([262, 330, 392], 0, 0.35, 0.3)
    chord([330, 392, 523], 0.22, 0.4, 0.32)
    chord([392, 523, 659, 784], 0.48, 1.1, 0.34)
  },
  startPresentationBed() {
    stopPresentationBed()
    try {
      const ac = ctx()
      if (ac.state === 'suspended') ac.resume()
      presentationBed = startVictoryBed(ac)
    } catch {}
  },
  stopPresentationBed() {
    stopPresentationBed()
  },
}

let presentationBed = null

function stopPresentationBed() {
  if (!presentationBed) return
  try {
    presentationBed.stop()
  } catch {}
  presentationBed = null
}

/**
 * Original looping bed for TV mode: a marching 4/4 pulse, brass-like
 * fifths, and a climbing victory motif. Not a copy of any recorded song.
 */
function startVictoryBed(ac) {
  const master = ac.createGain()
  master.gain.value = 0.0001
  master.connect(ac.destination)
  master.gain.exponentialRampToValueAtTime(0.22, ac.currentTime + 0.6)

  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2400
  filter.Q.value = 0.7
  filter.connect(master)

  const voices = []
  const now = ac.currentTime

  function tone(freq, type, dest, vol) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.value = vol
    osc.connect(g)
    g.connect(dest)
    osc.start(now)
    voices.push({ osc, g })
    return osc
  }

  // Drone + fifth — the "josh" undercurrent
  tone(98, 'sawtooth', filter, 0.08)
  tone(147, 'sawtooth', filter, 0.05)
  tone(196, 'triangle', filter, 0.07)
  tone(294, 'triangle', filter, 0.04)

  const motif = [392, 440, 494, 523, 587, 659, 784, 659]
  const lead = ac.createOscillator()
  const leadGain = ac.createGain()
  lead.type = 'square'
  lead.frequency.value = motif[0]
  leadGain.gain.value = 0.045
  lead.connect(leadGain)
  leadGain.connect(filter)
  lead.start(now)
  voices.push({ osc: lead, g: leadGain })

  let step = 0
  const beatMs = 280
  const timer = setInterval(() => {
    const t = ac.currentTime
    const f = motif[step % motif.length]
    try {
      lead.frequency.setValueAtTime(f, t)
      leadGain.gain.cancelScheduledValues(t)
      leadGain.gain.setValueAtTime(0.01, t)
      leadGain.gain.exponentialRampToValueAtTime(0.055, t + 0.03)
      leadGain.gain.exponentialRampToValueAtTime(0.018, t + 0.22)
    } catch {}

    // Kick on 1 and 3, snare-ish click on 2 and 4
    const kick = ac.createOscillator()
    const kg = ac.createGain()
    kick.type = 'sine'
    kick.frequency.setValueAtTime(step % 2 === 0 ? 90 : 180, t)
    kick.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    kg.gain.setValueAtTime(step % 2 === 0 ? 0.18 : 0.08, t)
    kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    kick.connect(kg)
    kg.connect(master)
    kick.start(t)
    kick.stop(t + 0.16)

    step += 1
  }, beatMs)

  return {
    stop() {
      clearInterval(timer)
      const t = ac.currentTime
      try {
        master.gain.cancelScheduledValues(t)
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t)
        master.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      } catch {}
      setTimeout(() => {
        voices.forEach(({ osc }) => {
          try {
            osc.stop()
          } catch {}
        })
        try {
          master.disconnect()
        } catch {}
      }, 400)
    },
  }
}
