export interface IrisFeatures {
  leftRatioX: number;  // 0 to 1
  leftRatioY: number;  // 0 to 1
  rightRatioX: number; // 0 to 1
  rightRatioY: number; // 0 to 1
  headYaw: number;
  headPitch: number;
}

export interface CalibrationTarget {
  id: number;
  normX: number; // 0.1 to 0.9
  normY: number;
  status: 'pending' | 'capturing' | 'done';
}

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
