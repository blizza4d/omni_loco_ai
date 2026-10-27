export interface GazeFeatures {
  leftRatioX: number;  // 0 to 1 (pupil position relative to eye corners)
  leftRatioY: number;  // 0 to 1 (pupil position relative to eyelids)
  rightRatioX: number; // 0 to 1
  rightRatioY: number; // 0 to 1
  headYaw: number;     // in degrees (-45 to +45)
  headPitch: number;   // in degrees (-30 to +30)
  eyeMidX: number;     // 0 to 1 normalized face center in video frame
  eyeMidY: number;     // 0 to 1 normalized face center in video frame
  isTracking: boolean; // whether landmarks were detected
  confidence: number;  // 0 to 1
}

// Backwards compatibility alias
export type IrisFeatures = GazeFeatures;

export interface CalibrationTarget {
  id: number;
  normX: number; // 0.1 to 0.9 across screen width
  normY: number; // 0.1 to 0.9 across screen height
  status: 'pending' | 'capturing' | 'done';
  sampleCount?: number;
}

export interface CalibrationResult {
  weightsX: number[];
  weightsY: number[];
  meanErrorPx: number;
  meanErrorDeg: number;
  r2Score: number;
  sampleCount: number;
  calibratedAt: string;
}

export interface GazeCursorConfig {
  enabled: boolean;
  visible: boolean;
  smoothingBeta: number;      // OneEuroFilter beta (speed coefficient)
  minCutoff: number;          // OneEuroFilter minCutoff (Hz)
  showTrail: boolean;
  trailLength: number;
  dwellEnabled: boolean;
  dwellDurationMs: number;
  dwellRadiusPx: number;
  colorScheme: 'CRIMSON' | 'SAGE' | 'CYAN';
}

export const DEFAULT_GAZE_CURSOR_CONFIG: GazeCursorConfig = {
  enabled: false,
  visible: true,
  smoothingBeta: 0.05,
  minCutoff: 1.0,
  showTrail: true,
  trailLength: 10,
  dwellEnabled: false,
  dwellDurationMs: 1100,
  dwellRadiusPx: 45,
  colorScheme: 'CRIMSON',
};

export interface GazeSample {
  x: number; // screen pixel X
  y: number; // screen pixel Y
  timestamp: number;
}

export interface Fixation {
  id: number;
  x: number;
  y: number;
  startTime: number;
  durationMs: number;
}

export interface AreaOfInterest {
  id: string;
  name: string;
  x: number;      // 0 to 1
  y: number;      // 0 to 1
  width: number;  // 0 to 1
  height: number; // 0 to 1
  timeToFirstFixationMs: number | null;
  totalDwellMs: number;
}

export interface GazeAnalyticsSummary {
  totalFixations: number;
  avgFixationDurationMs: number;
  calibrationErrorPx: number;
  aois: AreaOfInterest[];
}
