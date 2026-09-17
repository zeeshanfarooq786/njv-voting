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
      const audio = new Audio('/song.mp3')
      audio.loop = true
      audio.volume = 0.72
      audio.play().catch(() => {})
      presentationBed = audio
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
    presentationBed.pause()
    presentationBed.src = ''
  } catch {}
  presentationBed = null
}
