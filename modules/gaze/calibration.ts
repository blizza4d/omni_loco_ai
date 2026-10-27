import { GazeFeatures, CalibrationTarget, CalibrationResult } from './types';

export const DEFAULT_9_TARGETS: CalibrationTarget[] = [
  { id: 0, normX: 0.1, normY: 0.1, status: 'pending', sampleCount: 0 },
  { id: 1, normX: 0.5, normY: 0.1, status: 'pending', sampleCount: 0 },
  { id: 2, normX: 0.9, normY: 0.1, status: 'pending', sampleCount: 0 },
  { id: 3, normX: 0.1, normY: 0.5, status: 'pending', sampleCount: 0 },
  { id: 4, normX: 0.5, normY: 0.5, status: 'pending', sampleCount: 0 },
  { id: 5, normX: 0.9, normY: 0.5, status: 'pending', sampleCount: 0 },
  { id: 6, normX: 0.1, normY: 0.9, status: 'pending', sampleCount: 0 },
  { id: 7, normX: 0.5, normY: 0.9, status: 'pending', sampleCount: 0 },
  { id: 8, normX: 0.9, normY: 0.9, status: 'pending', sampleCount: 0 },
];

/**
 * Extract normalized iris and facial geometry features from MediaPipe landmarks
 * @param landmarks MediaPipe 478 face landmarks
 * @param isMirrored Whether the camera feed is displayed mirrored (selfie mode)
 */
export function extractGazeFeatures(
  landmarks: { x: number; y: number; z?: number }[] | null,
  isMirrored = true
): GazeFeatures | null {
  if (!landmarks || landmarks.length < 478) {
    return null;
  }

  // 1. Right Eye (OD): outer 33, inner 133, upper 159, lower 145, iris center 468
  const rOuter = landmarks[33];
  const rInner = landmarks[133];
  const rUpper = landmarks[159];
  const rLower = landmarks[145];
  const rIris = landmarks[468];

  // 2. Left Eye (OS): inner 362, outer 263, upper 386, lower 374, iris center 473
  const lInner = landmarks[362];
  const lOuter = landmarks[263];
  const lUpper = landmarks[386];
  const lLower = landmarks[374];
  const lIris = landmarks[473];

  // 3. Head Pose Anchors: nose tip 1, left cheek 205, right cheek 425, chin 152
  const nose = landmarks[1];
  const lCheek = landmarks[205];
  const rCheek = landmarks[425];
  const chin = landmarks[152];

  if (!rOuter || !rInner || !rUpper || !rLower || !rIris ||
      !lInner || !lOuter || !lUpper || !lLower || !lIris ||
      !nose || !lCheek || !rCheek || !chin) {
    return null;
  }

  // Right eye horizontal & vertical spans (OD)
  const rSpanX = Math.max(0.005, Math.abs(rInner.x - rOuter.x));
  const rSpanY = Math.max(0.005, Math.abs(rLower.y - rUpper.y));

  // Left eye horizontal & vertical spans (OS)
  const lSpanX = Math.max(0.005, Math.abs(lOuter.x - lInner.x));
  const lSpanY = Math.max(0.005, Math.abs(lLower.y - lUpper.y));

  // Normalized pupil position inside each eye socket [0 to 1]
  let rawRightRatioX = (rIris.x - Math.min(rOuter.x, rInner.x)) / rSpanX;
  let rawRightRatioY = (rIris.y - Math.min(rUpper.y, rLower.y)) / rSpanY;

  let rawLeftRatioX = (lIris.x - Math.min(lInner.x, lOuter.x)) / lSpanX;
  let rawLeftRatioY = (lIris.y - Math.min(lUpper.y, lLower.y)) / lSpanY;

  // When camera is mirrored (selfie view), looking right corresponds to smaller X in raw sensor,
  // so invert horizontal ratios so higher ratio consistently means looking screen-right.
  if (isMirrored) {
    rawRightRatioX = 1.0 - rawRightRatioX;
    rawLeftRatioX = 1.0 - rawLeftRatioX;
  }

  // Head Pose (Yaw and Pitch approximation from facial anchors)
  const midCheekX = (lCheek.x + rCheek.x) / 2;
  const midCheekY = (lCheek.y + rCheek.y) / 2;
  const cheekSpan = Math.max(0.01, Math.abs(rCheek.x - lCheek.x));
  const faceHeight = Math.max(0.01, Math.abs(chin.y - midCheekY));

  let headYaw = ((nose.x - midCheekX) / cheekSpan) * 90;
  const headPitch = ((midCheekY - nose.y) / faceHeight) * 80;

  if (isMirrored) {
    headYaw = -headYaw;
  }

  // Inter-ocular centroid
  const eyeMidX = isMirrored ? 1.0 - (rIris.x + lIris.x) / 2 : (rIris.x + lIris.x) / 2;
  const eyeMidY = (rIris.y + lIris.y) / 2;

  return {
    leftRatioX: Math.max(0, Math.min(1, rawLeftRatioX)),
    leftRatioY: Math.max(0, Math.min(1, rawLeftRatioY)),
    rightRatioX: Math.max(0, Math.min(1, rawRightRatioX)),
    rightRatioY: Math.max(0, Math.min(1, rawRightRatioY)),
    headYaw: Math.max(-50, Math.min(50, headYaw)),
    headPitch: Math.max(-40, Math.min(40, headPitch)),
    eyeMidX,
    eyeMidY,
    isTracking: true,
    confidence: 0.95,
  };
}

/**
 * Solve linear system A * x = b via Gaussian elimination with partial pivoting
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Augmented matrix
  const M: number[][] = A.map((row, i) => [...row, b[i]!]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    let maxVal = Math.abs(M[i]![i]!);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k]![i]!) > maxVal) {
        maxVal = Math.abs(M[k]![i]!);
        maxRow = k;
      }
    }

    // Swap rows
    const tmp = M[i]!;
    M[i] = M[maxRow]!;
    M[maxRow] = tmp;

    // Small epsilon fallback to avoid singular division
    if (Math.abs(M[i]![i]!) < 1e-12) {
      M[i]![i] = 1e-12;
    }

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = M[k]![i]! / M[i]![i]!;
      for (let j = i; j <= n; j++) {
        M[k]![j] -= factor * M[i]![j]!;
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i]![n]!;
    for (let j = i + 1; j < n; j++) {
      sum -= M[i]![j]! * x[j]!;
    }
    x[i] = sum / M[i]![i]!;
  }
  return x;
}

export class GazeCalibrationEngine {
  private targets: CalibrationTarget[] = JSON.parse(JSON.stringify(DEFAULT_9_TARGETS));
  private activeTargetIndex = 0;
  private targetStartTime = 0;
  private targetSamples: {
    targetId: number;
    features: GazeFeatures;
    normX: number;
    normY: number;
  }[] = [];

  private weightsX: number[] | null = null;
  private weightsY: number[] | null = null;
  private isCalibrated = false;
  private estimatedAccuracyPx = 32;
  private estimatedAccuracyDeg = 0.9;
  private r2Score = 0;
  private lastResult: CalibrationResult | null = null;

  constructor() {
    this.loadFromStorage();
  }

  getTargets(): CalibrationTarget[] {
    return this.targets;
  }

  getActiveTarget(): CalibrationTarget | null {
    if (this.activeTargetIndex >= this.targets.length) return null;
    return this.targets[this.activeTargetIndex] || null;
  }

  getActiveTargetIndex(): number {
    return this.activeTargetIndex;
  }

  startCalibration(): void {
    this.targets = JSON.parse(JSON.stringify(DEFAULT_9_TARGETS));
    this.activeTargetIndex = 0;
    this.targetStartTime = 0;
    this.targetSamples = [];
    this.isCalibrated = false;
    if (this.targets[0]) {
      this.targets[0].status = 'capturing';
      this.targets[0].sampleCount = 0;
    }
  }

  cancelCalibration(): void {
    this.targets = JSON.parse(JSON.stringify(DEFAULT_9_TARGETS));
    this.activeTargetIndex = 0;
    this.targetSamples = [];
    this.loadFromStorage();
  }

  resetCalibration(): void {
    this.weightsX = null;
    this.weightsY = null;
    this.isCalibrated = false;
    this.estimatedAccuracyPx = 35;
    this.estimatedAccuracyDeg = 1.0;
    this.r2Score = 0;
    this.lastResult = null;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('omni-gaze-calib-v2');
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Feed a new live sample during active calibration.
   * Returns true when all 9 targets have been completed and Ridge Regression is solved.
   */
  addSample(features: GazeFeatures, now: number): boolean {
    const current = this.getActiveTarget();
    if (!current) return false;

    // Initialize target start time on first sample for target
    if (this.targetStartTime === 0) {
      this.targetStartTime = now;
      return false;
    }

    // Discard samples during initial 220ms settling time after target appearance
    if (now - this.targetStartTime < 220) {
      return false;
    }

    // Only collect if face and eye tracking are stable
    if (!features.isTracking) {
      return false;
    }

    this.targetSamples.push({
      targetId: current.id,
      features,
      normX: current.normX,
      normY: current.normY,
    });

    const samplesForCurrent = this.targetSamples.filter((s) => s.targetId === current.id);
    current.sampleCount = samplesForCurrent.length;

    // Collect 22 steady samples per target dot
    if (samplesForCurrent.length >= 22) {
      current.status = 'done';
      this.activeTargetIndex++;
      this.targetStartTime = now;

      if (this.activeTargetIndex < this.targets.length) {
        this.targets[this.activeTargetIndex]!.status = 'capturing';
        this.targets[this.activeTargetIndex]!.sampleCount = 0;
      } else {
        // All 9 targets collected: solve multi-variate Ridge Regression
        this.fitRidgeRegression();
        return true;
      }
    }

    return false;
  }

  /**
   * Horizontal and Vertical Feature Extraction
   */
  private extractFeaturesX(f: GazeFeatures): number[] {
    const u = (f.leftRatioX + f.rightRatioX) / 2;
    const y = f.headYaw / 45;
    const cx = f.eyeMidX - 0.5;
    return [1.0, u, y, cx, u * u];
  }

  private extractFeaturesY(f: GazeFeatures): number[] {
    const v = (f.leftRatioY + f.rightRatioY) / 2;
    const p = f.headPitch / 30;
    const cy = f.eyeMidY - 0.5;
    return [1.0, v, p, cy, v * v];
  }

  /**
   * Solve Closed-Form Ridge Regression: W = (X^T * X + lambda * I)^-1 * X^T * Y
   */
  private fitRidgeRegression(): void {
    if (this.targetSamples.length < 50) return;

    const N = this.targetSamples.length;
    const lambda = 0.001; // L2 regularizer

    // 1. Build X feature matrices and Y target vectors
    const Dx = 5;
    const Dy = 5;

    const Xx: number[][] = [];
    const Xy: number[][] = [];
    const Yx: number[] = [];
    const Yy: number[] = [];

    for (const sample of this.targetSamples) {
      Xx.push(this.extractFeaturesX(sample.features));
      Xy.push(this.extractFeaturesY(sample.features));
      Yx.push(sample.normX);
      Yy.push(sample.normY);
    }

    // 2. Solve for Weights X: (Xx^T * Xx + lambda * I) * Wx = Xx^T * Yx
    const XtXx: number[][] = Array.from({ length: Dx }, () => new Array(Dx).fill(0));
    for (let i = 0; i < Dx; i++) {
      for (let j = 0; j < Dx; j++) {
        let sum = 0;
        for (let k = 0; k < N; k++) sum += Xx[k]![i]! * Xx[k]![j]!;
        XtXx[i]![j] = sum;
      }
      XtXx[i]![i]! += lambda;
    }

    const XtYx = new Array(Dx).fill(0);
    for (let i = 0; i < Dx; i++) {
      let sum = 0;
      for (let k = 0; k < N; k++) sum += Xx[k]![i]! * Yx[k]!;
      XtYx[i] = sum;
    }
    this.weightsX = solveLinearSystem(XtXx, XtYx);

    // 3. Solve for Weights Y: (Xy^T * Xy + lambda * I) * Wy = Xy^T * Yy
    const XtXy: number[][] = Array.from({ length: Dy }, () => new Array(Dy).fill(0));
    for (let i = 0; i < Dy; i++) {
      for (let j = 0; j < Dy; j++) {
        let sum = 0;
        for (let k = 0; k < N; k++) sum += Xy[k]![i]! * Xy[k]![j]!;
        XtXy[i]![j] = sum;
      }
      XtXy[i]![i]! += lambda;
    }

    const XtYy = new Array(Dy).fill(0);
    for (let i = 0; i < Dy; i++) {
      let sum = 0;
      for (let k = 0; k < N; k++) sum += Xy[k]![i]! * Yy[k]!;
      XtYy[i] = sum;
    }
    this.weightsY = solveLinearSystem(XtXy, XtYy);

    // 4. Evaluate Empirical Root Mean Square Error (RMSE) and R^2 score
    let sse = 0;
    let sst = 0;
    const meanNormX = Yx.reduce((a, b) => a + b, 0) / N;
    const meanNormY = Yy.reduce((a, b) => a + b, 0) / N;

    for (let k = 0; k < N; k++) {
      const predNormX = this.predictRawNorm(Xx[k]!, this.weightsX);
      const predNormY = this.predictRawNorm(Xy[k]!, this.weightsY);

      const errX = (predNormX - Yx[k]!) * 1920;
      const errY = (predNormY - Yy[k]!) * 1080;
      sse += errX * errX + errY * errY;

      const diffX = (Yx[k]! - meanNormX) * 1920;
      const diffY = (Yy[k]! - meanNormY) * 1080;
      sst += diffX * diffX + diffY * diffY;
    }

    const rmsePx = Math.round(Math.sqrt(sse / N));
    this.estimatedAccuracyPx = Math.max(12, rmsePx);
    this.estimatedAccuracyDeg = Math.round((this.estimatedAccuracyPx / 36) * 10) / 10;
    this.r2Score = Math.max(0, Math.min(0.99, sst > 0 ? 1 - sse / sst : 0.9));

    this.isCalibrated = true;
    this.lastResult = {
      weightsX: this.weightsX,
      weightsY: this.weightsY,
      meanErrorPx: this.estimatedAccuracyPx,
      meanErrorDeg: this.estimatedAccuracyDeg,
      r2Score: this.r2Score,
      sampleCount: N,
      calibratedAt: new Date().toISOString(),
    };

    this.saveToStorage();
  }

  private predictRawNorm(featuresRow: number[], weights: number[]): number {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += (featuresRow[i] || 0) * (weights[i] || 0);
    }
    return sum;
  }

  /**
   * Predict real viewport screen coordinates (X, Y) from live eye features.
   * If uncalibrated, falls back gracefully to anatomical prior estimation.
   */
  predictGaze(
    features: GazeFeatures,
    screenWidth: number,
    screenHeight: number
  ): { x: number; y: number; normX: number; normY: number } {
    let normX: number;
    let normY: number;

    if (this.isCalibrated && this.weightsX && this.weightsY) {
      const rowX = this.extractFeaturesX(features);
      const rowY = this.extractFeaturesY(features);
      normX = this.predictRawNorm(rowX, this.weightsX);
      normY = this.predictRawNorm(rowY, this.weightsY);
    } else {
      // Anatomical Geometry Prior fallback (when uncalibrated)
      const avgEyeX = (features.leftRatioX + features.rightRatioX) / 2;
      const avgEyeY = (features.leftRatioY + features.rightRatioY) / 2;

      normX = 0.5 + (avgEyeX - 0.5) * 1.8 + (features.headYaw / 45) * 0.25;
      normY = 0.5 + (avgEyeY - 0.5) * 2.1 - (features.headPitch / 30) * 0.25;
    }

    // Constrain strictly within normalized boundaries [0, 1]
    const clampedNormX = Math.max(0.01, Math.min(0.99, normX));
    const clampedNormY = Math.max(0.01, Math.min(0.99, normY));

    return {
      x: Math.round(clampedNormX * screenWidth),
      y: Math.round(clampedNormY * screenHeight),
      normX: clampedNormX,
      normY: clampedNormY,
    };
  }

  getAccuracy(): { errorPx: number; errorDeg: number; r2Score: number } {
    return {
      errorPx: this.estimatedAccuracyPx,
      errorDeg: this.estimatedAccuracyDeg,
      r2Score: this.r2Score,
    };
  }

  getLastResult(): CalibrationResult | null {
    return this.lastResult;
  }

  isReady(): boolean {
    return this.isCalibrated;
  }

  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined' && this.lastResult) {
      try {
        localStorage.setItem('omni-gaze-calib-v2', JSON.stringify(this.lastResult));
      } catch {
        // Ignore
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem('omni-gaze-calib-v2');
        if (item) {
          const parsed: CalibrationResult = JSON.parse(item);
          if (parsed.weightsX && parsed.weightsY && parsed.weightsX.length === 5) {
            this.weightsX = parsed.weightsX;
            this.weightsY = parsed.weightsY;
            this.estimatedAccuracyPx = parsed.meanErrorPx || 32;
            this.estimatedAccuracyDeg = parsed.meanErrorDeg || 0.9;
            this.r2Score = parsed.r2Score || 0.88;
            this.isCalibrated = true;
            this.lastResult = parsed;
          }
        }
      } catch {
        // Ignore
      }
    }
  }
}
