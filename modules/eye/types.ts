export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type EyeTrackingState = 'TRACKING' | 'BLINKING' | 'OCCLUDED' | 'NOT_DETECTED';

export interface SingleEyeTelemetry {
  anatomicalSide: 'LEFT' | 'RIGHT'; // Anatomical side (OS = Left, OD = Right)
  medicalAbbr: 'OS' | 'OD'; // OS = Oculus Sinister, OD = Oculus Dexter
  state: EyeTrackingState;
  irisDetected: boolean;
  pupilDiameterMm: number;
  apertureMm: number;
  ear: number; // Eye Aspect Ratio
  irisCenter: Point3D | null;
  irisSpanPx: number;
  gazeVector: Point3D | null;
  confidence: number;
}

export interface PupilMetrics {
  leftPupilDiameterMm: number;
  rightPupilDiameterMm: number;
  meanPupilDiameterMm: number;
  anisocoriaMm: number; // Difference between left & right pupil
  pupilDilationRatio: number; // Normalized 0-1
  saccadicVelocityDegSec: number;
  blinkFrequencyPerMin: number;
  cognitiveLoadIndex: number; // 0-100 Cognitive arousal / mental workload
  pupillaryUnrestIndex: number; // PUI metric for fatigue
  isFixating: boolean;
  eyeOpeningRatioLeft: number;
  eyeOpeningRatioRight: number;
}

export interface BilateralMetrics extends PupilMetrics {
  leftEye: SingleEyeTelemetry;
  rightEye: SingleEyeTelemetry;
  bothEyesTracked: boolean;
  overallStatus: 'BILATERAL_LOCKED' | 'UNILATERAL_LEFT' | 'UNILATERAL_RIGHT' | 'OCCLUDED' | 'SEARCHING';
}

export interface OcularGazeVector {
  leftOrigin: Point3D;
  leftDirection: Point3D;
  rightOrigin: Point3D;
  rightDirection: Point3D;
  combinedConvergenceDistM: number;
}

export interface SaccadeRecord {
  timestamp: number;
  velocityDegSec: number;
  amplitudeDeg: number;
  durationMs: number;
  directionRad: number;
}

export interface EyeTrackingConfig {
  showIrisContours: boolean;
  showGazeVectors: boolean;
  showPupilWaveform: boolean;
  smoothingBeta: number;
  canonicalIrisDiameterMm: number; // Reference standard is 11.7mm
  isMirrored: boolean;
  aimMode: 'GAZE_VECTOR' | 'MANUAL_RETICLE';
  manualTarget: Point2D;
}

export const CANONICAL_IRIS_MM = 11.7;
