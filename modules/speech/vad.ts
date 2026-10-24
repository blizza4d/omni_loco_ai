export class VoiceActivityDetector {
  private isSpeaking = false;
  private speechStartTime = 0;
  private pauseStartTime = 0;
  private totalSpeakingDuration = 0;
  private pauseCount = 0;
  private pauseDurations: number[] = [];
  private longestPauseSec = 0;

  // Syllable-rate WPM estimator
  private energyEnvelopeHistory: number[] = [];
  private syllablePeaksCount = 0;
  private sessionStartTime = 0;

  constructor() {
    this.sessionStartTime = performance.now();
  }

  process(rms: number, zcr: number, now: number): {
    isSpeaking: boolean;
    speakingRatio: number;
    pauseCount: number;
    longestSilenceSec: number;
    estimatedWpm: number;
  } {
    // VAD decision: energy threshold + reasonable ZCR for speech
    const speechDetected = rms > 0.04 && zcr < 0.45;

    if (speechDetected && !this.isSpeaking) {
      this.isSpeaking = true;
      this.speechStartTime = now;
      if (this.pauseStartTime > 0) {
        const pauseSec = (now - this.pauseStartTime) / 1000;
        if (pauseSec > 0.3) {
          this.pauseCount++;
          this.pauseDurations.push(pauseSec);
          if (pauseSec > this.longestPauseSec) {
            this.longestPauseSec = Math.round(pauseSec * 10) / 10;
          }
        }
      }
    } else if (!speechDetected && this.isSpeaking) {
      this.isSpeaking = false;
      this.pauseStartTime = now;
      this.totalSpeakingDuration += now - this.speechStartTime;
    }

    // Syllable envelope peak tracking
    this.energyEnvelopeHistory.push(rms);
    if (this.energyEnvelopeHistory.length > 30) {
      this.energyEnvelopeHistory.shift();
    }
    // Detect local energy peak (syllable kernel)
    if (this.energyEnvelopeHistory.length >= 3) {
      const p = this.energyEnvelopeHistory;
      const mid = p[p.length - 2]!;
      if (mid > 0.08 && mid > p[p.length - 3]! && mid > p[p.length - 1]!) {
        this.syllablePeaksCount++;
      }
    }

    const totalElapsedSec = Math.max(1, (now - this.sessionStartTime) / 1000);
    const activeSpeakingSec =
      (this.totalSpeakingDuration + (this.isSpeaking ? now - this.speechStartTime : 0)) / 1000;
    const speakingRatio = Math.min(1.0, Math.round((activeSpeakingSec / totalElapsedSec) * 100) / 100);

    // Syllables per minute -> ~1.5 syllables per word
    const minutes = totalElapsedSec / 60;
    const rawWpm = Math.round((this.syllablePeaksCount / 1.5) / minutes);
    const estimatedWpm = Math.min(260, Math.max(0, rawWpm));

    return {
      isSpeaking: this.isSpeaking,
      speakingRatio,
      pauseCount: this.pauseCount,
      longestSilenceSec: this.longestPauseSec,
      estimatedWpm,
    };
  }

  reset(): void {
    this.isSpeaking = false;
    this.speechStartTime = 0;
    this.pauseStartTime = 0;
    this.totalSpeakingDuration = 0;
    this.pauseCount = 0;
    this.pauseDurations = [];
    this.longestPauseSec = 0;
    this.energyEnvelopeHistory = [];
    this.syllablePeaksCount = 0;
    this.sessionStartTime = performance.now();
  }
}
