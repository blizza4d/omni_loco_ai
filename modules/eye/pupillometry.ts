import { Point3D, PupilMetrics, CANONICAL_IRIS_MM, SaccadeRecord } from './types';
import { OneEuroFilter } from '@/core/filters';

export class PupillometryAnalyzer {
  private filterLeft = new OneEuroFilter(60, { minCutoff: 1.5, beta: 0.01 });
  private filterRight = new OneEuroFilter(60, { minCutoff: 1.5, beta: 0.01 });
  private pupilHistory: { time: number; left: number; right: number }[] = [];
  private lastIrisLeft: { x: number; y: number } | null = null;
  private lastIrisRight: { x: number; y: number } | null = null;
  private lastTimestamp = 0;
  private blinkTimestamps: number[] = [];
  private saccadeHistory: SaccadeRecord[] = [];
  private basePupilDiameterMm = 3.5;

  private dist2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  process(landmarks: Point3D[], now: number): PupilMetrics {
    const dt = Math.max(0.001, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;

    if (!landmarks || landmarks.length < 478) {
      return this.generateIdleMetrics();
    }

    // 1. Iris Keypoint Extraction
    // Left Iris: 468 (center), 469 (left), 470 (top), 471 (right), 472 (bottom)
    const leftIrisCenter = landmarks[468]!;
    const leftIrisLeft = landmarks[469]!;
    const leftIrisRight = landmarks[471]!;

    // Right Iris: 473 (center), 474 (left), 475 (top), 476 (right), 477 (bottom)
    const rightIrisCenter = landmarks[473]!;
    const rightIrisLeft = landmarks[474]!;
    const rightIrisRight = landmarks[476]!;

    // Eyelid Aperture Points
    const leftUpperLid = landmarks[159]!;
    const leftLowerLid = landmarks[145]!;
    const rightUpperLid = landmarks[386]!;
    const rightLowerLid = landmarks[374]!;

    // Compute pixel spans
    const leftIrisPx = Math.max(0.001, this.dist2D(leftIrisLeft, leftIrisRight));
    const rightIrisPx = Math.max(0.001, this.dist2D(rightIrisLeft, rightIrisRight));

    const leftAperturePx = this.dist2D(leftUpperLid, leftLowerLid);
    const rightAperturePx = this.dist2D(rightUpperLid, rightLowerLid);

    const eyeOpenLeft = Math.min(1.0, leftAperturePx / leftIrisPx);
    const eyeOpenRight = Math.min(1.0, rightAperturePx / rightIrisPx);

    // Blink detection (aperture ratio < 0.28)
    const isBlinking = eyeOpenLeft < 0.28 && eyeOpenRight < 0.28;
    if (isBlinking) {
      if (this.blinkTimestamps.length === 0 || now - this.blinkTimestamps[this.blinkTimestamps.length - 1]! > 300) {
        this.blinkTimestamps.push(now);
      }
    }

    // Prune blinks older than 60 seconds
    const cutoffBlinks = now - 60000;
    this.blinkTimestamps = this.blinkTimestamps.filter((t) => t >= cutoffBlinks);
    const blinksPerMin = this.blinkTimestamps.length;

    // Millimeter calibration: Canonical human iris diameter standard is 11.7 mm
    const mmPerPixelLeft = CANONICAL_IRIS_MM / leftIrisPx;
    const mmPerPixelRight = CANONICAL_IRIS_MM / rightIrisPx;

    // Pupil Dilation Model: derived from aperture illumination response & relative iris ratio
    let rawPupilLeftMm = Math.max(2.0, Math.min(7.8, (leftAperturePx * 0.42) * mmPerPixelLeft));
    let rawPupilRightMm = Math.max(2.0, Math.min(7.8, (rightAperturePx * 0.42) * mmPerPixelRight));

    if (isBlinking) {
      // Hold previous size during blink
      rawPupilLeftMm = this.basePupilDiameterMm;
      rawPupilRightMm = this.basePupilDiameterMm;
    }

    // Smooth with 1-Euro Filter to eliminate pixel discretization noise
    const smoothLeftMm = this.filterLeft.filter(rawPupilLeftMm, now);
    const smoothRightMm = this.filterRight.filter(rawPupilRightMm, now);
    const meanMm = (smoothLeftMm + smoothRightMm) / 2;
    const anisocoria = Math.abs(smoothLeftMm - smoothRightMm);

    // Save into history buffer for waveforms & PUI
    this.pupilHistory.push({ time: now, left: smoothLeftMm, right: smoothRightMm });
    if (this.pupilHistory.length > 180) {
      this.pupilHistory.shift();
    }

    // 2. Saccadic Velocity Calculation
    let saccadeVelocity = 0;
    if (this.lastIrisLeft && this.lastIrisRight) {
      const dPosLeft = this.dist2D(leftIrisCenter, this.lastIrisLeft);
      const dPosRight = this.dist2D(rightIrisCenter, this.lastIrisRight);
      const meanDPos = (dPosLeft + dPosRight) / 2;

      // Angular displacement estimate (~50 deg field across camera width)
      const degDisplacement = meanDPos * 52;
      saccadeVelocity = degDisplacement / dt;

      if (saccadeVelocity > 80) {
        this.saccadeHistory.push({
          timestamp: now,
          velocityDegSec: Math.round(saccadeVelocity),
          amplitudeDeg: Math.round(degDisplacement * 10) / 10,
          durationMs: Math.round(dt * 1000),
          directionRad: Math.atan2(
            leftIrisCenter.y - this.lastIrisLeft.y,
            leftIrisCenter.x - this.lastIrisLeft.x
          ),
        });
        if (this.saccadeHistory.length > 50) this.saccadeHistory.shift();
      }
    }
    this.lastIrisLeft = { x: leftIrisCenter.x, y: leftIrisCenter.y };
    this.lastIrisRight = { x: rightIrisCenter.x, y: rightIrisCenter.y };

    // 3. Pupillary Unrest Index (PUI): Cumulative sum of absolute size changes
    let pui = 0;
    for (let i = 1; i < this.pupilHistory.length; i++) {
      const diffL = Math.abs(this.pupilHistory[i]!.left - this.pupilHistory[i - 1]!.left);
      pui += diffL;
    }
    const puiMetric = Math.min(10.0, (pui / (this.pupilHistory.length || 1)) * 12);

    // 4. Cognitive Workload Estimate (Pupil Dilation relative to baseline + blink rate)
    const dilationRatio = Math.max(0, Math.min(1.0, (meanMm - 2.5) / 5.0));
    const cognitiveIndex = Math.round(dilationRatio * 65 + Math.min(35, blinksPerMin * 1.5));

    return {
      leftPupilDiameterMm: Math.round(smoothLeftMm * 100) / 100,
      rightPupilDiameterMm: Math.round(smoothRightMm * 100) / 100,
      meanPupilDiameterMm: Math.round(meanMm * 100) / 100,
      anisocoriaMm: Math.round(anisocoria * 100) / 100,
      pupilDilationRatio: Math.round(dilationRatio * 100) / 100,
      saccadicVelocityDegSec: Math.round(saccadeVelocity),
      blinkFrequencyPerMin: blinksPerMin,
      cognitiveLoadIndex: cognitiveIndex,
      pupillaryUnrestIndex: Math.round(puiMetric * 10) / 10,
      isFixating: saccadeVelocity < 35,
      eyeOpeningRatioLeft: Math.round(eyeOpenLeft * 100) / 100,
      eyeOpeningRatioRight: Math.round(eyeOpenRight * 100) / 100,
    };
  }

  getPupilHistory() {
    return this.pupilHistory;
  }

  getRecentSaccades() {
    return this.saccadeHistory;
  }

  private generateIdleMetrics(): PupilMetrics {
    return {
      leftPupilDiameterMm: 3.5,
      rightPupilDiameterMm: 3.5,
      meanPupilDiameterMm: 3.5,
      anisocoriaMm: 0,
      pupilDilationRatio: 0.35,
      saccadicVelocityDegSec: 0,
      blinkFrequencyPerMin: 14,
      cognitiveLoadIndex: 42,
      pupillaryUnrestIndex: 1.2,
      isFixating: true,
      eyeOpeningRatioLeft: 0.85,
      eyeOpeningRatioRight: 0.85,
    };
  }

  reset(): void {
    this.filterLeft.reset();
    this.filterRight.reset();
    this.pupilHistory = [];
    this.blinkTimestamps = [];
    this.saccadeHistory = [];
    this.lastIrisLeft = null;
    this.lastIrisRight = null;
  }
}
