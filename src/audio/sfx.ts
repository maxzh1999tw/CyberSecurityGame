// 用瀏覽器內建的聲音合成產生音效（不需要任何音檔）
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = false
let lastHover = 0

try {
  muted = localStorage.getItem('csg-muted') === '1'
} catch {
  /* 沒有儲存空間也沒關係 */
}

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.55
      master.connect(ctx.destination)
      const len = ctx.sampleRate * 1.5
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

interface ToneOpt {
  f: number
  to?: number
  dur: number
  type?: OscillatorType
  vol?: number
  at?: number
  attack?: number
}

function tone(o: ToneOpt) {
  if (muted) return
  const c = ac()
  if (!c || !master) return
  const t0 = c.currentTime + (o.at ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.f, t0)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + o.dur)
  const v = o.vol ?? 0.2
  const a = o.attack ?? 0.006
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(v, t0 + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + o.dur + 0.05)
}

interface NoiseOpt {
  dur: number
  vol?: number
  at?: number
  from?: number
  to?: number
  q?: number
  type?: BiquadFilterType
}

function noise(o: NoiseOpt) {
  if (muted) return
  const c = ac()
  if (!c || !master || !noiseBuf) return
  const t0 = c.currentTime + (o.at ?? 0)
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = o.type ?? 'bandpass'
  f.Q.value = o.q ?? 1.2
  f.frequency.setValueAtTime(o.from ?? 1200, t0)
  if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur)
  const g = c.createGain()
  const v = o.vol ?? 0.2
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(v, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur)
  src.connect(f).connect(g).connect(master)
  src.start(t0, Math.random() * 0.5)
  src.stop(t0 + o.dur + 0.05)
}

export const sfx = {
  isMuted: () => muted,
  setMuted(m: boolean) {
    muted = m
    try {
      localStorage.setItem('csg-muted', m ? '1' : '0')
    } catch {
      /* 略過 */
    }
  },
  unlock() {
    ac()
  },
  click() {
    tone({ f: 620, to: 880, dur: 0.07, type: 'triangle', vol: 0.16 })
  },
  hover() {
    const now = performance.now()
    if (now - lastHover < 60) return
    lastHover = now
    tone({ f: 1100, dur: 0.035, type: 'sine', vol: 0.05 })
  },
  draw() {
    noise({ dur: 0.16, vol: 0.12, from: 500, to: 3200, q: 0.8 })
    tone({ f: 300, to: 520, dur: 0.1, type: 'triangle', vol: 0.06 })
  },
  pick() {
    tone({ f: 420, to: 760, dur: 0.09, type: 'triangle', vol: 0.14 })
  },
  cancel() {
    tone({ f: 520, to: 280, dur: 0.12, type: 'triangle', vol: 0.12 })
  },
  deny() {
    tone({ f: 170, dur: 0.14, type: 'square', vol: 0.09 })
    tone({ f: 140, dur: 0.16, type: 'square', vol: 0.09, at: 0.09 })
  },
  drop() {
    noise({ dur: 0.18, vol: 0.18, from: 2400, to: 500, q: 0.9 })
    tone({ f: 190, to: 70, dur: 0.18, type: 'sine', vol: 0.3 })
  },
  reveal() {
    tone({ f: 880, dur: 0.12, type: 'sine', vol: 0.12 })
    tone({ f: 1320, dur: 0.18, type: 'sine', vol: 0.1, at: 0.07 })
    tone({ f: 1760, dur: 0.22, type: 'sine', vol: 0.07, at: 0.14 })
  },
  success() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.16, type: 'triangle', vol: 0.15, at: i * 0.07 }))
  },
  fail() {
    tone({ f: 220, to: 110, dur: 0.28, type: 'sawtooth', vol: 0.12 })
    noise({ dur: 0.22, vol: 0.08, from: 400, to: 150 })
  },
  capture() {
    // 駭入：數位亂碼 + 低頻
    for (let i = 0; i < 6; i++) tone({ f: 300 + Math.random() * 1400, dur: 0.05, type: 'square', vol: 0.07, at: i * 0.04 })
    tone({ f: 110, to: 55, dur: 0.5, type: 'sawtooth', vol: 0.16, at: 0.1 })
    ;[392, 523, 659, 784].forEach((f, i) => tone({ f, dur: 0.2, type: 'triangle', vol: 0.12, at: 0.28 + i * 0.07 }))
  },
  paralyze() {
    noise({ dur: 0.5, vol: 0.18, from: 5000, to: 600, q: 4, type: 'bandpass' })
    tone({ f: 900, to: 200, dur: 0.45, type: 'sine', vol: 0.12 })
  },
  patch() {
    tone({ f: 240, to: 160, dur: 0.12, type: 'square', vol: 0.12 })
    noise({ dur: 0.1, vol: 0.14, from: 3000, to: 1800, q: 3 })
    tone({ f: 660, dur: 0.2, type: 'triangle', vol: 0.1, at: 0.1 })
  },
  recapture() {
    tone({ f: 600, to: 120, dur: 0.5, type: 'sawtooth', vol: 0.16 })
    noise({ dur: 0.4, vol: 0.15, from: 2000, to: 200 })
  },
  /** 牌被拉到場中央：能量聚集 */
  charge() {
    tone({ f: 180, to: 520, dur: 0.38, type: 'sawtooth', vol: 0.07, attack: 0.1 })
    tone({ f: 360, to: 1040, dur: 0.38, type: 'sine', vol: 0.07, attack: 0.1 })
    noise({ dur: 0.34, vol: 0.07, from: 400, to: 3600, q: 1.5 })
  },
  /** 牌射向目標 */
  launch() {
    noise({ dur: 0.26, vol: 0.2, from: 5200, to: 700, q: 0.8 })
    tone({ f: 760, to: 160, dur: 0.24, type: 'triangle', vol: 0.1 })
  },
  /** 賭一把失敗：牌被擋下撞碎 */
  shatter() {
    noise({ dur: 0.1, vol: 0.28, from: 6000, to: 3000, q: 0.7, type: 'highpass' })
    for (let i = 0; i < 7; i++) tone({ f: 1800 + Math.random() * 2600, dur: 0.07, type: 'triangle', vol: 0.07, at: 0.02 + i * 0.03 })
    tone({ f: 150, to: 50, dur: 0.3, type: 'sine', vol: 0.3 })
  },
  /** 賭一把失敗：牌燒成灰 */
  burn() {
    noise({ dur: 0.9, vol: 0.2, from: 900, to: 260, q: 0.6, type: 'lowpass' })
    for (let i = 0; i < 9; i++) noise({ dur: 0.05, vol: 0.12, from: 2800 + Math.random() * 2400, q: 4, at: 0.05 + i * 0.08 })
    tone({ f: 130, to: 60, dur: 0.6, type: 'sawtooth', vol: 0.1 })
  },
  /** 病毒感染節點 */
  infect() {
    for (let i = 0; i < 9; i++) tone({ f: 200 + Math.random() * 1600, dur: 0.045, type: 'square', vol: 0.06, at: i * 0.05 })
    tone({ f: 90, to: 45, dur: 0.7, type: 'sawtooth', vol: 0.14 })
    noise({ dur: 0.5, vol: 0.1, from: 1200, to: 300, q: 2 })
  },
  /** 病毒回報：封包傳回來 */
  virusPing() {
    tone({ f: 300, to: 900, dur: 0.18, type: 'square', vol: 0.07 })
    tone({ f: 900, to: 1500, dur: 0.12, type: 'square', vol: 0.06, at: 0.2 })
  },
  noiseUp(n: number) {
    for (let i = 0; i < Math.min(n, 5); i++) tone({ f: 660 + i * 70, dur: 0.07, type: 'square', vol: 0.08, at: i * 0.075 })
  },
  coolDown() {
    tone({ f: 700, to: 420, dur: 0.3, type: 'sine', vol: 0.12 })
  },
  event() {
    tone({ f: 98, dur: 1.1, type: 'sine', vol: 0.3, attack: 0.02 })
    tone({ f: 147, dur: 0.9, type: 'sine', vol: 0.16, at: 0.05 })
    noise({ dur: 0.5, vol: 0.1, from: 300, to: 1800, q: 1 })
  },
  banner() {
    tone({ f: 330, to: 440, dur: 0.25, type: 'triangle', vol: 0.12 })
    noise({ dur: 0.3, vol: 0.1, from: 800, to: 4000, q: 0.7 })
  },
  endTurn() {
    tone({ f: 784, dur: 0.18, type: 'triangle', vol: 0.15 })
    tone({ f: 587, dur: 0.3, type: 'triangle', vol: 0.15, at: 0.12 })
  },
  yourTurn() {
    tone({ f: 587, dur: 0.14, type: 'triangle', vol: 0.15 })
    tone({ f: 784, dur: 0.24, type: 'triangle', vol: 0.15, at: 0.1 })
  },
  win() {
    ;[523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.24, type: 'triangle', vol: 0.18, at: i * 0.12 }))
  },
  lose() {
    ;[440, 349, 294, 220].forEach((f, i) => tone({ f, to: f * 0.8, dur: 0.5, type: 'sawtooth', vol: 0.14, at: i * 0.22 }))
  },
}
