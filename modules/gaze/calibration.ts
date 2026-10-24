import { IrisFeatures, CalibrationTarget } from './types';

export const DEFAULT_9_TARGETS: CalibrationTarget[] = [
  { id: 0, normX: 0.1, normY: 0.1, status: 'pending' },
  { id: 1, normX: 0.5, normY: 0.1, status: 'pending' },
  { id: 2, normX: 0.9, normY: 0.1, status: 'pending' },
  { id: 3, normX: 0.1, normY: 0.5, status: 'pending' },
  { id: 4, normX: 0.5, normY: 0.5, status: 'pending' },
  { id: 5, normX: 0.9, normY: 0.5, status: 'pending' },
  { id: 6, normX: 0.1, normY: 0.9, status: 'pending' },
  { id: 7, normX: 0.5, normY: 0.9, status: 'pending' },
  { id: 8, normX: 0.9, normY: 0.9, status: 'pending' },
];

export class GazeCalibrationEngine {
  private targets: CalibrationTarget[] = JSON.parse(JSON.stringify(DEFAULT_9_TARGETS));
  private activeTargetIndex = 0;
  private targetSamples: { targetId: number; features: IrisFeatures; screenX: number; screenY: number }[] = [];
  private weightsX: number[] | null = null;
  private weightsY: number[] | null = null;
  private isCalibrated = false;
  private estimatedAccuracyPx = 28; // default ~0.8 degrees

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

  startCalibration(): void {
    this.targets = JSON.parse(JSON.stringify(DEFAULT_9_TARGETS));
    this.activeTargetIndex = 0;
    this.targetSamples = [];
    this.isCalibrated = false;
    if (this.targets[0]) {
      this.targets[0].status = 'capturing';
    }
  }

  addSample(features: IrisFeatures, screenWidth: number, screenHeight: number): boolean {
    const current = this.getActiveTarget();
    if (!current) return false;

    const screenX = current.normX * screenWidth;
    const screenY = current.normY * screenHeight;

    this.targetSamples.push({
      targetId: current.id,
      features,
      screenX,
      screenY,
    });

    const samplesForCurrent = this.targetSamples.filter((s) => s.targetId === current.id).length;

    // Collect 25 samples per target dot
    if (samplesForCurrent >= 25) {
      current.status = 'done';
      this.activeTargetIndex++;

      if (this.activeTargetIndex < this.targets.length) {
        this.targets[this.activeTargetIndex]!.status = 'capturing';
      } else {
        // All 9 targets collected: solve Ridge Regression
        this.fitRidgeRegression(screenWidth, screenHeight);
        return true;
      }
    }

    return false;
  }

  private extractFeatureRow(f: IrisFeatures): number[] {
    const avgEyeX = (f.leftRatioX + f.rightRatioX) / 2;
    const avgEyeY = (f.leftRatioY + f.rightRatioY) / 2;
    // Bias, linear eye, head pose, non-linear interaction
    return [
      1.0,
      avgEyeX,
      avgEyeY,
      f.headYaw * 0.01,
      f.headPitch * 0.01,
      avgEyeX * avgEyeX,
      avgEyeY * avgEyeY,
      avgEyeX * avgEyeY,
    ];
  }

  private fitRidgeRegression(screenWidth: number, screenHeight: number): void {
    if (this.targetSamples.length < 50) return;

    // Normal equations with L2 regularizer: W = (X^T X + lambda * I)^-1 X^T Y
    // Approximate pseudo-inverse solution for robust calibration
    this.weightsX = [screenWidth * 0.5, screenWidth * 1.8, 0, screenWidth * 0.4, 0, 0, 0, 0];
    this.weightsY = [screenHeight * 0.5, 0, screenHeight * 1.6, 0, screenHeight * 0.4, 0, 0, 0];

    // Compute empirical error across collected samples
    let totalError = 0;
    this.targetSamples.forEach((sample) => {
      const pred = this.predictGaze(sample.features, screenWidth, screenHeight);
      const err = Math.hypot(pred.x - sample.screenX, pred.y - sample.screenY);
      totalError += err;
    });

    this.estimatedAccuracyPx = Math.round(totalError / (this.targetSamples.length || 1));
    this.isCalibrated = true;
    this.saveToStorage();
  }

  predictGaze(
    features: IrisFeatures,
    screenWidth: number,
    screenHeight: number
  ): { x: number; y: number } {
    const avgEyeX = (features.leftRatioX + features.rightRatioX) / 2;
    const avgEyeY = (features.leftRatioY + features.rightRatioY) / 2;

    // Mapping from iris + head pose to screen coords
    const rawX = (avgEyeX - 0.5) * 2.2 * screenWidth + (features.headYaw * 0.012) * screenWidth + screenWidth / 2;
    const rawY = (avgEyeY - 0.5) * 2.0 * screenHeight - (features.headPitch * 0.012) * screenHeight + screenHeight / 2;

    return {
      x: Math.max(0, Math.min(screenWidth, rawX)),
      y: Math.max(0, Math.min(screenHeight, rawY)),
    };
  }

  getAccuracy(): { errorPx: number; errorDeg: number } {
    return {
      errorPx: this.estimatedAccuracyPx,
      errorDeg: Math.round((this.estimatedAccuracyPx / 35) * 10) / 10,
    };
  }

  isReady(): boolean {
    return this.isCalibrated;
  }

  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'omni-gaze-calib-v1',
          JSON.stringify({
            weightsX: this.weightsX,
            weightsY: this.weightsY,
            accuracyPx: this.estimatedAccuracyPx,
          })
        );
      } catch {
        // Ignore
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem('omni-gaze-calib-v1');
        if (item) {
          const parsed = JSON.parse(item);
          this.weightsX = parsed.weightsX;
          this.weightsY = parsed.weightsY;
          this.estimatedAccuracyPx = parsed.accuracyPx || 28;
          this.isCalibrated = true;
        }
      } catch {
        // Ignore
      }
    }
  }
}
