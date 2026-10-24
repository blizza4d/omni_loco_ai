import { FlawMarker, FlawType } from './types';

export class SpeechFlawAnalyzer {
  private pitchWindow: number[] = [];
  private wpmWindow: number[] = [];
  private flaws: FlawMarker[] = [];
  private lastFlawTime = 0;

  process(
    pitchHz: number,
    wpm: number,
    isSpeaking: boolean,
    nowSec: number
  ): FlawMarker[] {
    if (isSpeaking && pitchHz > 70) {
      this.pitchWindow.push(pitchHz);
      if (this.pitchWindow.length > 50) this.pitchWindow.shift();
    }

    if (wpm > 0) {
      this.wpmWindow.push(wpm);
      if (this.wpmWindow.length > 30) this.wpmWindow.shift();
    }

    // Cooldown between flaw alerts (at least 3 seconds)
    if (nowSec - this.lastFlawTime < 3.0) {
      return [...this.flaws];
    }

    // 1. Rushed Cadence Fault (WPM > 185)
    if (wpm > 185) {
      this.addFlaw('RUSHED', nowSec, 'RUSHED PACING', `Cadence reached ${wpm} WPM (target: 120-150 WPM)`);
      return [...this.flaws];
    }

    // 2. Monotone Delivery (Pitch std dev < 10 Hz over at least 30 voiced frames)
    if (this.pitchWindow.length >= 30) {
      const mean = this.pitchWindow.reduce((a, b) => a + b, 0) / this.pitchWindow.length;
      const variance =
        this.pitchWindow.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / this.pitchWindow.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 9.5) {
        this.addFlaw('MONOTONE', nowSec, 'MONOTONE DELIVERY', `Pitch variance dropped to ±${stdDev.toFixed(1)}Hz`);
        return [...this.flaws];
      }
    }

    return [...this.flaws];
  }

  private addFlaw(type: FlawType, timeSec: number, label: string, detail: string) {
    this.lastFlawTime = timeSec;
    this.flaws.push({
      id: `flaw-${Date.now()}`,
      type,
      timestampSec: Math.round(timeSec * 10) / 10,
      label,
      detail,
    });
  }

  generateSuggestions(avgWpm: number, speakingRatio: number, pitchVariance: number): string[] {
    const suggestions: string[] = [];

    if (avgWpm > 160) {
      suggestions.push('Pacing was rushed (above 160 WPM). Practice introducing 1.5-second pauses after major statements.');
    } else if (avgWpm < 110) {
      suggestions.push('Cadence was cautious (below 110 WPM). Aim to maintain conversational momentum between sentences.');
    } else {
      suggestions.push('Pacing was well balanced in the ideal conversational window (120-150 WPM).');
    }

    if (pitchVariance < 16) {
      suggestions.push('Vocal delivery tended towards monotone. Elevate your pitch by a minor third on punchline keywords.');
    } else {
      suggestions.push('Dynamic pitch inflection observed; vocal variety successfully maintained listener attention.');
    }

    if (speakingRatio < 0.5) {
      suggestions.push('Extended silences accounted for over 50% of the take. Structure thoughts beforehand to compress hesitation.');
    } else {
      suggestions.push('Speech-to-silence ratio was optimal, providing sufficient breathing room without stalled dead air.');
    }

    return suggestions.slice(0, 3);
  }

  getFlaws(): FlawMarker[] {
    return this.flaws;
  }

  reset(): void {
    this.pitchWindow = [];
    this.wpmWindow = [];
    this.flaws = [];
    this.lastFlawTime = 0;
  }
}
