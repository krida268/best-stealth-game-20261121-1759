// Lentera Malam — every sound is made, never loaded.
// A small WebAudio synth plays soft footsteps, a chime for fireflies,
// a low sting when a guard spots Rara, and a short tune when a level
// clears. Nothing is fetched; the game stays silent until the player
// first presses a key or clicks, as browsers require.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastStep = 0;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  tone(freq, dur, type, gain, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  footstep(sneaking, now) {
    if (!this.ctx || this.muted) return;
    if (now - this.lastStep < (sneaking ? 0.42 : 0.3)) return;
    this.lastStep = now;
    this.tone(sneaking ? 140 : 190, 0.05, 'sine', sneaking ? 0.02 : 0.045);
  }

  firefly() {
    this.tone(880, 0.12, 'sine', 0.06);
    this.tone(1318, 0.18, 'sine', 0.05, 0.07);
  }

  lantern() {
    this.tone(523, 0.16, 'triangle', 0.07);
    this.tone(659, 0.16, 'triangle', 0.07, 0.09);
    this.tone(784, 0.3, 'triangle', 0.07, 0.18);
  }

  alert() {
    this.tone(196, 0.22, 'sawtooth', 0.05);
    this.tone(147, 0.3, 'sawtooth', 0.05, 0.12);
  }

  caught() {
    this.tone(110, 0.4, 'square', 0.05);
    this.tone(82, 0.5, 'square', 0.05, 0.15);
  }

  clear() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.06, i * 0.11));
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.06, i * 0.13));
  }
}
