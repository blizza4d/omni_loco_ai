'use client';

/**
 * Procedural Web Audio API Laser Synthesizer
 * Zero external audio assets, zero cloud network requests.
 * Generates sci-fi plasma drone and charging power-up sweep entirely via Web Audio oscillators.
 */
export class HeatVisionAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private oscSub: OscillatorNode | null = null;
  private oscHum: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private isMuted = true; // Opt-in by default to respect user comfort

  constructor() {
    // Lazily initialized on first user interaction
  }

  private initContext(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return true;
    } catch {
      return false;
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.isPlaying) {
      this.stop();
    }
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  start(): void {
    if (this.isMuted) return;
    if (this.isPlaying) return;
    if (!this.initContext() || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Master gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.25);
      this.masterGain.connect(this.ctx.destination);

      // Low-pass resonance filter for menacing laser drone
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(120, now);
      this.filter.frequency.exponentialRampToValueAtTime(520, now + 0.35);
      this.filter.Q.setValueAtTime(4.5, now);
      this.filter.connect(this.masterGain);

      // Sub-bass heavy oscillator (55 Hz base)
      this.oscSub = this.ctx.createOscillator();
      this.oscSub.type = 'sawtooth';
      this.oscSub.frequency.setValueAtTime(45, now);
      this.oscSub.frequency.exponentialRampToValueAtTime(70, now + 0.3);
      this.oscSub.connect(this.filter);
      this.oscSub.start(now);

      // Secondary frequency harmonic buzz (110 Hz base)
      this.oscHum = this.ctx.createOscillator();
      this.oscHum.type = 'triangle';
      this.oscHum.frequency.setValueAtTime(90, now);
      this.oscHum.frequency.exponentialRampToValueAtTime(140, now + 0.3);
      this.oscHum.connect(this.filter);
      this.oscHum.start(now);

      this.isPlaying = true;
    } catch {
      // AudioContext policy blocked or unavailable
    }
  }

  /**
   * Modulate laser pitch slightly with eye motion and intensity
   */
  updateIntensity(intensity: number): void {
    if (!this.isPlaying || !this.ctx || !this.filter || !this.oscSub) return;
    try {
      const targetFreq = 450 + intensity * 250;
      this.filter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
      this.oscSub.frequency.setTargetAtTime(65 + intensity * 20, this.ctx.currentTime, 0.05);
    } catch {
      // ignore
    }
  }

  stop(): void {
    if (!this.isPlaying || !this.ctx || !this.masterGain) {
      this.isPlaying = false;
      return;
    }

    try {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      const sub = this.oscSub;
      const hum = this.oscHum;

      setTimeout(() => {
        try {
          sub?.stop();
          sub?.disconnect();
          hum?.stop();
          hum?.disconnect();
        } catch {
          // ignore
        }
      }, 150);

      this.oscSub = null;
      this.oscHum = null;
      this.isPlaying = false;
    } catch {
      this.isPlaying = false;
    }
  }

  dispose(): void {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch {
        // ignore
      }
    }
    this.ctx = null;
  }
}
