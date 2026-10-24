export interface AcousticFeatures {
  rms: number;             // 0.0 to 1.0
  dbFs: number;            // -60 dB to 0 dB
  pitchHz: number;         // 75 to 500 Hz (0 if unvoiced)
  spectralCentroid: number;// Hz (timbre brightness)
  zeroCrossingRate: number;// 0.0 to 1.0
  isVoiced: boolean;
}

export type FlawType = 'FILLER_WORD' | 'RUSHED' | 'MONOTONE' | 'ABRUPT_STOP';

export interface FlawMarker {
  id: string;
  type: FlawType;
  timestampSec: number;
  label: string;
  detail: string;
}

export interface SpeechSessionReport {
  id: string;
  createdAt: string;
  durationSec: number;
  avgWpm: number;
  speakingRatio: number;     // 0.0 to 1.0
  pauseCount: number;
  longestSilenceSec: number;
  pitchVariance: number;     // Hz std dev
  fillerWordsCount: number;
  flaws: FlawMarker[];
  suggestions: string[];
  wpmTimeSeries: { timeSec: number; wpm: number }[];
}
