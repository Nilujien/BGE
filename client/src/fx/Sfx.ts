export class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;

    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);

    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  shoot() {
    this.tone(680, 240, 0.07, 'square', 0.035);
  }

  hit() {
    this.tone(240, 90, 0.08, 'sawtooth', 0.05);
  }

  kill() {
    this.tone(420, 55, 0.22, 'triangle', 0.08);
  }

  pickup() {
    this.tone(900, 1400, 0.06, 'sine', 0.045);
  }

  levelUp() {
    this.tone(523, 523, 0.09, 'sine', 0.07);
    this.tone(659, 659, 0.09, 'sine', 0.07, 0.09);
    this.tone(784, 784, 0.09, 'sine', 0.07, 0.18);
    this.tone(1046, 1046, 0.16, 'sine', 0.08, 0.27);
  }

  hurt() {
    this.tone(170, 60, 0.16, 'sawtooth', 0.09);
  }

  dash() {
    this.tone(280, 720, 0.11, 'sine', 0.045);
  }

  death() {
    this.tone(220, 35, 0.55, 'sawtooth', 0.11);
  }
}
