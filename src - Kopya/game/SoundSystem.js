class SoundSystem {
  constructor() {
    this._ctx = null
    this._enabled = true
    this._volume = 0.35
  }

  _getCtx() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)() } catch (_) {}
    }
    return this._ctx
  }

  _play(freq, type, dur, vol, delay = 0) {
    if (!this._enabled) return
    const ctx = this._getCtx()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = type; osc.frequency.value = freq
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(vol * this._volume, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.start(t); osc.stop(t + dur + 0.01)
    } catch (_) {}
  }

  resume() { try { this._getCtx()?.resume() } catch (_) {} }
  eatFood() { this._play(520 + Math.random()*80, 'sine', 0.07, 0.25) }
  eatPlayer() {
    this._play(220, 'sawtooth', 0.15, 0.8)
    this._play(350, 'sine', 0.2, 0.6, 0.06)
    this._play(180, 'sine', 0.3, 0.4, 0.12)
  }
  death() {
    this._play(220, 'sawtooth', 0.5, 1)
    this._play(160, 'sawtooth', 0.5, 0.8, 0.18)
    this._play(100, 'sine', 0.6, 0.6, 0.36)
  }
  split() { this._play(640, 'sine', 0.09, 0.4) }
  skill() { this._play(880, 'triangle', 0.18, 0.6) }
  virusEat() {
    this._play(160, 'sawtooth', 0.3, 0.9)
    this._play(240, 'square', 0.25, 0.7, 0.1)
  }
  levelUp() { [523,659,784,1047].forEach((f,i) => this._play(f,'sine',0.22,0.7,i*0.12)) }
}

export const soundSystem = new SoundSystem()
