import {
  Point3D,
  PupilMetrics,
  BilateralMetrics,
  SingleEyeTelemetry,
  EyeTrackingState,
  CANONICAL_IRIS_MM,
  SaccadeRecord,
} from './types';
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

  process(landmarks: Point3D[], now: number): BilateralMetrics {
    const dt = Math.max(0.001, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;

    if (!landmarks || landmarks.length < 478) {
      return this.generateIdleMetrics();
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ANATOMICAL RIGHT EYE (OD - Oculus Dexter)
    // MediaPipe Landmarks:
    // Outer canthus: 33, Inner canthus: 133
    // Upper lid: 159, Lower lid: 145
    // Iris Center: 468, Iris Ring: 469 (left), 470 (top), 471 (right), 472 (bottom)
    // ─────────────────────────────────────────────────────────────
    const rOuter = landmarks[33];
    const rInner = landmarks[133];
    const rUpper = landmarks[159];
    const rLower = landmarks[145];
    const rIrisCenter = landmarks[468];
    const rIrisLeft = landmarks[469];
    const rIrisRight = landmarks[471];

    let rightEyeState: EyeTrackingState = 'NOT_DETECTED';
    let rightEyeSpanPx = 0;
    let rightEar = 0;
    let rightAperturePx = 0;
    let smoothRightMm = this.basePupilDiameterMm;
    let rightConfidence = 0;

    const rExists = !!(rOuter && rInner && rUpper && rLower && rIrisCenter);
    if (rExists) {
      const hSpan = this.dist2D(rOuter, rInner);
      rightAperturePx = this.dist2D(rUpper, rLower);
      rightEar = hSpan > 0.005 ? rightAperturePx / (2.0 * hSpan) : 0;

      // Occlusion check: if eye width is too small (e.g. side profile or covered)
      if (hSpan < 0.018 || rIrisCenter.x < 0 || rIrisCenter.x > 1 || rIrisCenter.y < 0 || rIrisCenter.y > 1) {
        rightEyeState = 'OCCLUDED';
        rightConfidence = 0.1;
      } else if (rightEar < 0.16) {
        rightEyeState = 'BLINKING';
        rightConfidence = 0.8;
      } else {
        rightEyeState = 'TRACKING';
        rightEyeSpanPx = this.dist2D(rIrisLeft || rIrisCenter, rIrisRight || rIrisCenter);
        const pupilDilationRatio = Math.max(0.2, Math.min(0.65, (rightAperturePx / Math.max(0.01, rightEyeSpanPx)) * 0.22));
        const rawMm = Math.max(2.0, Math.min(7.5, CANONICAL_IRIS_MM * pupilDilationRatio));
        smoothRightMm = this.filterRight.filter(rawMm, now);
        rightConfidence = Math.min(0.99, 0.8 + rightEar * 0.4);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ANATOMICAL LEFT EYE (OS - Oculus Sinister)
    // MediaPipe Landmarks:
    // Inner canthus: 362, Outer canthus: 263
    // Upper lid: 386, Lower lid: 374
    // Iris Center: 473, Iris Ring: 474 (left), 475 (top), 476 (right), 477 (bottom)
    // ─────────────────────────────────────────────────────────────
    const lInner = landmarks[362];
    const lOuter = landmarks[263];
    const lUpper = landmarks[386];
    const lLower = landmarks[374];
    const lIrisCenter = landmarks[473];
    const lIrisLeft = landmarks[474];
    const lIrisRight = landmarks[476];

    let leftEyeState: EyeTrackingState = 'NOT_DETECTED';
    let leftEyeSpanPx = 0;
    let leftEar = 0;
    let leftAperturePx = 0;
    let smoothLeftMm = this.basePupilDiameterMm;
    let leftConfidence = 0;

    const lExists = !!(lInner && lOuter && lUpper && lLower && lIrisCenter);
    if (lExists) {
      const hSpan = this.dist2D(lOuter, lInner);
      leftAperturePx = this.dist2D(lUpper, lLower);
      leftEar = hSpan > 0.005 ? leftAperturePx / (2.0 * hSpan) : 0;

      // Occlusion check
      if (hSpan < 0.018 || lIrisCenter.x < 0 || lIrisCenter.x > 1 || lIrisCenter.y < 0 || lIrisCenter.y > 1) {
        leftEyeState = 'OCCLUDED';
        leftConfidence = 0.1;
      } else if (leftEar < 0.16) {
        leftEyeState = 'BLINKING';
        leftConfidence = 0.8;
      } else {
        leftEyeState = 'TRACKING';
        leftEyeSpanPx = this.dist2D(lIrisLeft || lIrisCenter, lIrisRight || lIrisCenter);
        const pupilDilationRatio = Math.max(0.2, Math.min(0.65, (leftAperturePx / Math.max(0.01, leftEyeSpanPx)) * 0.22));
        const rawMm = Math.max(2.0, Math.min(7.5, CANONICAL_IRIS_MM * pupilDilationRatio));
        smoothLeftMm = this.filterLeft.filter(rawMm, now);
        leftConfidence = Math.min(0.99, 0.8 + leftEar * 0.4);
      }
    }

    // Blink detection (both eyes closed)
    const isBlinking = leftEyeState === 'BLINKING' && rightEyeState === 'BLINKING';
    if (isBlinking) {
      if (
        this.blinkTimestamps.length === 0 ||
        now - this.blinkTimestamps[this.blinkTimestamps.length - 1]! > 300
      ) {
        this.blinkTimestamps.push(now);
      }
    }

    const cutoffBlinks = now - 60000;
    this.blinkTimestamps = this.blinkTimestamps.filter((t) => t >= cutoffBlinks);
    const blinksPerMin = this.blinkTimestamps.length;

    // Pupil mean and anisocoria (only when both are tracking or blinking)
    const meanMm = (smoothLeftMm + smoothRightMm) / 2;
    const anisocoria = Math.abs(smoothLeftMm - smoothRightMm);

    // Save into history buffer for waveforms & PUI
    this.pupilHistory.push({ time: now, left: smoothLeftMm, right: smoothRightMm });
    if (this.pupilHistory.length > 180) {
      this.pupilHistory.shift();
    }

    // Saccadic Velocity Calculation
    let saccadeVelocity = 0;
    if (this.lastIrisLeft && this.lastIrisRight && lIrisCenter && rIrisCenter) {
      const dPosLeft = this.dist2D(lIrisCenter, this.lastIrisLeft);
      const dPosRight = this.dist2D(rIrisCenter, this.lastIrisRight);
      const meanDPos = (dPosLeft + dPosRight) / 2;

      const degDisplacement = meanDPos * 52;
      saccadeVelocity = degDisplacement / dt;

      if (saccadeVelocity > 80) {
        this.saccadeHistory.push({
          timestamp: now,
          velocityDegSec: Math.round(saccadeVelocity),
          amplitudeDeg: Math.round(degDisplacement * 10) / 10,
          durationMs: Math.round(dt * 1000),
          directionRad: Math.atan2(
            lIrisCenter.y - this.lastIrisLeft.y,
            lIrisCenter.x - this.lastIrisLeft.x
          ),
        });
        if (this.saccadeHistory.length > 50) this.saccadeHistory.shift();
      }
    }

    if (lIrisCenter) this.lastIrisLeft = { x: lIrisCenter.x, y: lIrisCenter.y };
    if (rIrisCenter) this.lastIrisRight = { x: rIrisCenter.x, y: rIrisCenter.y };

    // Pupillary Unrest Index (PUI)
    let pui = 0;
    for (let i = 1; i < this.pupilHistory.length; i++) {
      const diffL = Math.abs(this.pupilHistory[i]!.left - this.pupilHistory[i - 1]!.left);
      pui += diffL;
    }
    const puiMetric = Math.min(10.0, (pui / (this.pupilHistory.length || 1)) * 12);

    // Cognitive Workload Estimate
    const dilationRatio = Math.max(0, Math.min(1.0, (meanMm - 2.5) / 5.0));
    const cognitiveIndex = Math.round(dilationRatio * 65 + Math.min(35, blinksPerMin * 1.5));

    // Overall Status
    let overallStatus: BilateralMetrics['overallStatus'] = 'SEARCHING';
    if (leftEyeState === 'TRACKING' && rightEyeState === 'TRACKING') {
      overallStatus = 'BILATERAL_LOCKED';
    } else if (leftEyeState === 'TRACKING') {
      overallStatus = 'UNILATERAL_LEFT';
    } else if (rightEyeState === 'TRACKING') {
      overallStatus = 'UNILATERAL_RIGHT';
    } else if (leftEyeState === 'OCCLUDED' || rightEyeState === 'OCCLUDED') {
      overallStatus = 'OCCLUDED';
    }

    const leftEyeTelemetry: SingleEyeTelemetry = {
      anatomicalSide: 'LEFT',
      medicalAbbr: 'OS',
      state: leftEyeState,
      irisDetected: leftEyeState === 'TRACKING',
      pupilDiameterMm: Math.round(smoothLeftMm * 100) / 100,
      apertureMm: Math.round(leftAperturePx * 100) / 100,
      ear: Math.round(leftEar * 100) / 100,
      irisCenter: leftEyeState !== 'OCCLUDED' && lIrisCenter ? lIrisCenter : null,
      irisSpanPx: Math.round(leftEyeSpanPx * 10) / 10,
      gazeVector: lIrisCenter && lInner && lOuter ? {
        x: (lIrisCenter.x - (lInner.x + lOuter.x) / 2) * 4.5,
        y: (lIrisCenter.y - (lInner.y + lOuter.y) / 2) * 4.5,
        z: lIrisCenter.z || 0,
      } : null,
      confidence: Math.round(leftConfidence * 100) / 100,
    };

    const rightEyeTelemetry: SingleEyeTelemetry = {
      anatomicalSide: 'RIGHT',
      medicalAbbr: 'OD',
      state: rightEyeState,
      irisDetected: rightEyeState === 'TRACKING',
      pupilDiameterMm: Math.round(smoothRightMm * 100) / 100,
      apertureMm: Math.round(rightAperturePx * 100) / 100,
      ear: Math.round(rightEar * 100) / 100,
      irisCenter: rightEyeState !== 'OCCLUDED' && rIrisCenter ? rIrisCenter : null,
      irisSpanPx: Math.round(rightEyeSpanPx * 10) / 10,
      gazeVector: rIrisCenter && rOuter && rInner ? {
        x: (rIrisCenter.x - (rOuter.x + rInner.x) / 2) * 4.5,
        y: (rIrisCenter.y - (rOuter.y + rInner.y) / 2) * 4.5,
        z: rIrisCenter.z || 0,
      } : null,
      confidence: Math.round(rightConfidence * 100) / 100,
    };

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
      eyeOpeningRatioLeft: Math.round((leftAperturePx / Math.max(0.001, leftEyeSpanPx)) * 100) / 100,
      eyeOpeningRatioRight: Math.round((rightAperturePx / Math.max(0.001, rightEyeSpanPx)) * 100) / 100,
      leftEye: leftEyeTelemetry,
      rightEye: rightEyeTelemetry,
      bothEyesTracked: overallStatus === 'BILATERAL_LOCKED',
      overallStatus,
    };
  }

  getPupilHistory() {
    return this.pupilHistory;
  }

  getRecentSaccades() {
    return this.saccadeHistory;
  }

  generateIdleMetrics(): BilateralMetrics {
    const leftIdle: SingleEyeTelemetry = {
      anatomicalSide: 'LEFT',
      medicalAbbr: 'OS',
      state: 'NOT_DETECTED',
      irisDetected: false,
      pupilDiameterMm: 3.5,
      apertureMm: 3.5,
      ear: 0.3,
      irisCenter: null,
      irisSpanPx: 12,
      gazeVector: null,
      confidence: 0,
    };

    const rightIdle: SingleEyeTelemetry = {
      anatomicalSide: 'RIGHT',
      medicalAbbr: 'OD',
      state: 'NOT_DETECTED',
      irisDetected: false,
      pupilDiameterMm: 3.5,
      apertureMm: 3.5,
      ear: 0.3,
      irisCenter: null,
      irisSpanPx: 12,
      gazeVector: null,
      confidence: 0,
    };

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
      leftEye: leftIdle,
      rightEye: rightIdle,
      bothEyesTracked: false,
      overallStatus: 'SEARCHING',
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
