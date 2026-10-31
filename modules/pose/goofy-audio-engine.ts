import {
  GoofyPoseType,
  GoofySoundId,
  GoofyModeConfig,
  SoundDefinition,
  DEFAULT_GOOFY_CONFIG,
  DEFAULT_SOUND_LIBRARY,
} from './goofy-types';

export class GoofyAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeCustomAudio: HTMLAudioElement | null = null;
  private isUnlocked = false;
  private config: GoofyModeConfig = JSON.parse(JSON.stringify(DEFAULT_GOOFY_CONFIG));

  constructor() {
    // Lazily initialize Web Audio Context on first interaction
  }

  getConfig(): GoofyModeConfig {
    return this.config;
  }

  updateConfig(partial: Partial<GoofyModeConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getMappings() {
    return this.config.mappings;
  }

  getSoundLibrary(): SoundDefinition[] {
    return DEFAULT_SOUND_LIBRARY;
  }

  setMapping(pose: GoofyPoseType, soundId: GoofySoundId): void {
    if (this.config.mappings[pose]) {
      this.config.mappings[pose].soundId = soundId;
    }
  }

  getVolume(): number {
    return this.config.volume;
  }

  setVolume(vol: number): void {
    this.config.volume = Math.max(0, Math.min(1.0, vol));
  }

  isMuted(): boolean {
    return this.config.isMuted;
  }

  setMuted(muted: boolean): void {
    this.config.isMuted = muted;
  }

  isRandomSoundEnabled(): boolean {
    return this.config.randomSoundMode;
  }

  setRandomSoundEnabled(enabled: boolean): void {
    this.config.randomSoundMode = enabled;
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.connect(this.audioCtx.destination);
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  unlock(): boolean {
    const ctx = this.initContext();
    if (ctx && ctx.state === 'running') {
      this.isUnlocked = true;
      return true;
    }
    return false;
  }

  isAudioUnlocked(): boolean {
    return this.isUnlocked && this.audioCtx?.state === 'running';
  }

  stopAll(): void {
    if (this.activeCustomAudio) {
      this.activeCustomAudio.pause();
      this.activeCustomAudio.currentTime = 0;
      this.activeCustomAudio = null;
    }

    if (this.masterGain && this.audioCtx) {
      // Rapid fade out
      this.masterGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    }
  }

  /**
   * Main sound trigger: maps pose to sound, plays it with volume & mute guards
   */
  playSoundForPose(
    pose: GoofyPoseType,
    config?: GoofyModeConfig
  ): { soundId: GoofySoundId; soundName: string } | null {
    const cfg = config || this.config;
    if (cfg.isMuted || cfg.volume <= 0) return null;

    const mapping = cfg.mappings[pose];
    if (!mapping || !mapping.enabled) return null;

    let targetSoundId = mapping.soundId;

    // Handle Random Sound Mode
    if (cfg.randomSoundMode) {
      const enabledSounds: GoofySoundId[] = DEFAULT_SOUND_LIBRARY.map((s) => s.id);
      targetSoundId = enabledSounds[Math.floor(Math.random() * enabledSounds.length)] || targetSoundId;
    }

    // Custom user uploaded audio
    if (targetSoundId === 'CUSTOM_USER_AUDIO' && mapping.customAudioUrl) {
      this.playCustomAudio(mapping.customAudioUrl, cfg.volume);
      return {
        soundId: 'CUSTOM_USER_AUDIO',
        soundName: mapping.customAudioName || 'Custom Audio File',
      };
    }

    // Preset synthesized sound
    this.playSynthesizedSound(targetSoundId, cfg.volume);
    const soundDef = DEFAULT_SOUND_LIBRARY.find((s) => s.id === targetSoundId);

    return {
      soundId: targetSoundId,
      soundName: soundDef?.name || targetSoundId,
    };
  }

  /**
   * Preview or play a sound directly on demand
   */
  playSound(soundId: GoofySoundId, volume = 0.8): void {
    this.preview(soundId, undefined, volume);
  }

  /**
   * Preview a sound on demand (e.g. from the Sound Library editor)
   */
  preview(soundId: GoofySoundId, customUrl?: string, volume = 0.8): void {
    if (soundId === 'CUSTOM_USER_AUDIO' && customUrl) {
      this.playCustomAudio(customUrl, volume);
    } else {
      this.playSynthesizedSound(soundId, volume);
    }
  }

  private playCustomAudio(dataUrl: string, volume: number): void {
    try {
      this.stopAll();
      const audio = new Audio(dataUrl);
      audio.volume = Math.max(0, Math.min(1.0, volume));
      audio.play().catch((err) => console.warn('[GoofyAudio] Autoplay blocked:', err));
      this.activeCustomAudio = audio;
    } catch (err) {
      console.error('[GoofyAudio] Failed to play custom audio:', err);
    }
  }

  /**
   * High-quality real-time synthesis of meme sound effects
   */
  private playSynthesizedSound(soundId: GoofySoundId, volume: number): void {
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const vol = Math.max(0.01, Math.min(1.0, volume));

    // Reset gain to user volume
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(vol, now);

    switch (soundId) {
      case 'AIR_HORN':
        this.synthAirHorn(ctx, now);
        break;
      case 'INCEPTION_BRAAAM':
        this.synthInceptionBraam(ctx, now);
        break;
      case 'ANIME_POWER_UP':
        this.synthAnimePowerUp(ctx, now);
        break;
      case 'CARTOON_BOING':
        this.synthCartoonBoing(ctx, now);
        break;
      case 'RECORD_SCRATCH':
        this.synthRecordScratch(ctx, now);
        break;
      case 'BRASS_FANFARE':
        this.synthBrassFanfare(ctx, now);
        break;
      case 'SAD_TROMBONE':
        this.synthSadTrombone(ctx, now);
        break;
      case 'DISCO_SLAP':
        this.synthDiscoSlap(ctx, now);
        break;
      case 'SINGING_BOWL':
        this.synthSingingBowl(ctx, now);
        break;
      case 'CARTOON_SQUEAK':
        this.synthCartoonSqueak(ctx, now);
        break;
      case 'CROWD_CHEER':
        this.synthCrowdCheer(ctx, now);
        break;
      case 'CONFIDENT_ENTRANCE':
        this.synthConfidentEntrance(ctx, now);
        break;
      case 'DRAMATIC_SUSPENSE':
        this.synthDramaticSuspense(ctx, now);
        break;
      case 'CARTOON_IMPACT':
        this.synthCartoonImpact(ctx, now);
        break;
      case 'CARTOON_JUMP':
        this.synthCartoonJump(ctx, now);
        break;
      case 'CARTOON_CLAP':
        this.synthCartoonClap(ctx, now);
        break;
      default:
        this.synthAirHorn(ctx, now);
    }
  }

  // 11. CROWD CHEERING (Stadium applause & cheers)
  private synthCrowdCheer(ctx: AudioContext, now: number): void {
    const duration = 1.6;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Modulated noise simulating clapping density
      const mod = Math.sin((i / ctx.sampleRate) * 15 * Math.PI) * 0.3 + 0.7;
      data[i] = (Math.random() * 2 - 1) * mod;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.15);
    gain.gain.setValueAtTime(0.4, now + duration - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(now);

    // Harmonic crowd whistle / cheer tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(520, now + duration);
    oscGain.gain.setValueAtTime(0.01, now);
    oscGain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + duration);
  }

  // 12. CONFIDENT ENTRANCE (Punchy kick + bright swagger fanfare)
  private synthConfidentEntrance(ctx: AudioContext, now: number): void {
    // Punchy sub-kick
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(130, now);
    kick.frequency.exponentialRampToValueAtTime(38, now + 0.25);
    kickGain.gain.setValueAtTime(0.8, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    kick.connect(kickGain);
    kickGain.connect(this.masterGain!);
    kick.start(now);
    kick.stop(now + 0.28);

    // Staccato royal fanfare chord
    const notes = [233.08, 293.66, 349.23, 466.16]; // Bb Major chord
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + 0.08);

      gain.gain.setValueAtTime(0, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + 0.08);
      osc.stop(now + 1.2);
    });
  }

  // 13. DRAMATIC SUSPENSE (Sinister low drone + dissonant sting)
  private synthDramaticSuspense(ctx: AudioContext, now: number): void {
    const duration = 1.5;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, now); // Low A1
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(58.27, now); // Dissonant Bb1 clash

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + 0.6);
    filter.frequency.exponentialRampToValueAtTime(180, now + duration);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  // 14. CARTOON IMPACT (Heavy comic thud)
  private synthCartoonImpact(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.45);

    // Wobble bounce
    const bounce = ctx.createOscillator();
    const bounceGain = ctx.createGain();
    bounce.type = 'triangle';
    bounce.frequency.setValueAtTime(220, now + 0.1);
    bounce.frequency.linearRampToValueAtTime(110, now + 0.45);
    bounceGain.gain.setValueAtTime(0.3, now + 0.1);
    bounceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    bounce.connect(bounceGain);
    bounceGain.connect(this.masterGain!);
    bounce.start(now + 0.1);
    bounce.stop(now + 0.5);
  }

  // 15. CARTOON JUMP (Rapid ascending pitch launch)
  private synthCartoonJump(ctx: AudioContext, now: number): void {
    const duration = 0.6;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
    osc.frequency.linearRampToValueAtTime(540, now + duration);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + duration);
  }

  // 16. CARTOON CLAP (Dual-transient acoustic hand slap)
  private synthCartoonClap(ctx: AudioContext, now: number): void {
    // Two rapid micro-transients
    [0, 0.018].forEach((offset) => {
      const t = now + offset;
      const bufferSize = Math.floor(ctx.sampleRate * 0.18);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.setValueAtTime(3.2, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      noise.start(t);
    });
  }

  // 1. MLG AIR HORN (Three rapid, detuned sawtooth bursts)
  private synthAirHorn(ctx: AudioContext, now: number): void {
    const bursts = [0, 0.16, 0.32];
    const baseFreqs = [466.16, 468.2, 700.0, 932.3]; // Bb4 detuned stack

    bursts.forEach((startOffset) => {
      const t = now + startOffset;
      const duration = 0.14;

      const burstGain = ctx.createGain();
      burstGain.gain.setValueAtTime(0, t);
      burstGain.gain.linearRampToValueAtTime(0.4, t + 0.015);
      burstGain.gain.setValueAtTime(0.38, t + duration - 0.02);
      burstGain.gain.linearRampToValueAtTime(0, t + duration);
      burstGain.connect(this.masterGain!);

      baseFreqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.connect(burstGain);
        osc.start(t);
        osc.stop(t + duration);
      });
    });
  }

  // 2. INCEPTION BRAAAM (Sub-bass sawtooth brass stinger)
  private synthInceptionBraam(ctx: AudioContext, now: number): void {
    const duration = 1.8;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(140, now + duration);
    filter.Q.setValueAtTime(4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.7, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    filter.connect(gain);
    gain.connect(this.masterGain!);

    // Stacked detuned brass saws (A1 = 55Hz)
    [-3, 0, 4].forEach((detune) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, now);
      osc.detune.setValueAtTime(detune * 8, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // 3. ANIME POWER UP (Ascending arpeggiated chime with shimmer)
  private synthAnimePowerUp(ctx: AudioContext, now: number): void {
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.35);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // 4. CARTOON BOING (Upward spring pitch slide)
  private synthCartoonBoing(ctx: AudioContext, now: number): void {
    const duration = 0.8;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
    osc.frequency.linearRampToValueAtTime(440, now + duration);

    // Vibrato
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(18, now);
    lfoGain.gain.setValueAtTime(35, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + duration);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration);
  }

  // 5. RECORD SCRATCH (Modulated noise burst)
  private synthRecordScratch(ctx: AudioContext, now: number): void {
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.35);
    filter.Q.setValueAtTime(8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
  }

  // 6. BRASS FANFARE (Majestic victorious chord)
  private synthBrassFanfare(ctx: AudioContext, now: number): void {
    const arpeggio = [
      { f: 261.63, t: 0, d: 0.15 },
      { f: 329.63, t: 0.15, d: 0.15 },
      { f: 392.0, t: 0.3, d: 0.18 },
      { f: 523.25, t: 0.48, d: 0.75 },
    ];

    arpeggio.forEach(({ f, t, d }) => {
      const start = now + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + d);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + d);
    });
  }

  // 7. SAD TROMBONE (Wah-wah-wah-waaaah)
  private synthSadTrombone(ctx: AudioContext, now: number): void {
    const notes = [
      { f: 293.66, t: 0, d: 0.35 },    // D4
      { f: 277.18, t: 0.38, d: 0.35 }, // C#4
      { f: 261.63, t: 0.76, d: 0.35 }, // C4
      { f: 246.94, t: 1.14, d: 0.75 }, // B3 (slide down)
    ];

    notes.forEach(({ f, t, d }, idx) => {
      const start = now + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, start);
      if (idx === 3) {
        // Downward slide on final note
        osc.frequency.linearRampToValueAtTime(200, start + d);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, start);
      filter.frequency.linearRampToValueAtTime(900, start + 0.1);
      filter.frequency.linearRampToValueAtTime(350, start + d);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + d);
    });
  }

  // 8. DISCO SLAP (Resonant funk bass pluck)
  private synthDiscoSlap(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(82.4, now); // E2

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.3);
    filter.Q.setValueAtTime(6, now);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // 9. ZEN SINGING BOWL (Sinusoidal gong with lingering overtones)
  private synthSingingBowl(ctx: AudioContext, now: number): void {
    const freqs = [320, 642, 968, 1285];
    const duration = 2.2;

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const amp = 0.3 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // 10. CARTOON SQUEAK (Quick chirp)
  private synthCartoonSqueak(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2600, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.3);
  }
}
