import { describe, it, expect } from 'vitest';
import { extractGazeFeatures, GazeCalibrationEngine, DEFAULT_9_TARGETS } from '../modules/gaze/calibration';
import { GazeFeatures } from '../modules/gaze/types';
import { generateSyntheticEyeLandmarks } from '../modules/eye/synthetic-eye';
import {
  computeObjectFitBounds,
  mapNormalizedToDisplay,
  mapDisplayToNormalized,
  syncCanvasWithDPR,
} from '../core/camera/coordinates';

/**
 * Helper to rotate a 2D landmark set around a center point
 */
function rotateLandmarks(
  landmarks: { x: number; y: number; z?: number }[],
  angleDeg: number,
  cx = 0.5,
  cy = 0.5
) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return landmarks.map((pt) => {
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
      z: pt.z,
    };
  });
}

describe('Precision Eye Tracking & Calibration Architecture', () => {
  describe('Iris Centroid Sub-Pixel Averaging & Jitter Attenuation', () => {
    it('reduces centroid jitter when contour landmark points undergo independent noise', () => {
      const baseLandmarks = generateSyntheticEyeLandmarks(1000);

      // MediaPipe Right Iris indices: 468 (center), 469, 470, 471, 472
      const irisIndices = [468, 469, 470, 471, 472];
      const singleCenterPt = baseLandmarks[468]!;

      // Inject simulated random sub-pixel detection jitter into one contour landmark
      const jitteredLandmarks = baseLandmarks.map((pt, idx) => {
        if (idx === 469) {
          return { ...pt, x: pt.x + 0.008, y: pt.y + 0.006 };
        }
        return { ...pt };
      });

      // Compute 5-point average
      const centroidAvg = {
        x: irisIndices.reduce((acc, i) => acc + jitteredLandmarks[i]!.x, 0) / 5,
        y: irisIndices.reduce((acc, i) => acc + jitteredLandmarks[i]!.y, 0) / 5,
      };

      const rawDist = Math.hypot(jitteredLandmarks[469]!.x - baseLandmarks[469]!.x, jitteredLandmarks[469]!.y - baseLandmarks[469]!.y);
      const centroidShift = Math.hypot(centroidAvg.x - singleCenterPt.x, centroidAvg.y - singleCenterPt.y);

      // Centroid shift must be damped to ~1/5th of the isolated point noise
      expect(centroidShift).toBeLessThan(rawDist * 0.35);
    });
  });

  describe('Head-Tilt/Roll-Invariant Eye-Axis Vector Projection', () => {
    it('maintains consistent gaze ratio across in-plane head tilts (roll)', () => {
      const unrotatedLandmarks = generateSyntheticEyeLandmarks(1000);
      const unrotatedFeatures = extractGazeFeatures(unrotatedLandmarks, false);
      expect(unrotatedFeatures).not.toBeNull();

      // Rotate entire face landmark array in-plane by 18 degrees (typical natural head roll)
      const rotatedLandmarks = rotateLandmarks(unrotatedLandmarks, 18, 0.5, 0.5);
      const rotatedFeatures = extractGazeFeatures(rotatedLandmarks, false);
      expect(rotatedFeatures).not.toBeNull();

      // The head roll angle should be detected ~18 deg
      expect(Math.abs(rotatedFeatures!.headRoll! - 18)).toBeLessThan(3.0);

      // Crucial test: Vector-projected horizontal pupil ratios must remain invariant
      // despite the 18 degree in-plane facial tilt!
      const deltaLeftX = Math.abs(rotatedFeatures!.leftRatioX - unrotatedFeatures!.leftRatioX);
      const deltaRightX = Math.abs(rotatedFeatures!.rightRatioX - unrotatedFeatures!.rightRatioX);

      expect(deltaLeftX).toBeLessThan(0.04);
      expect(deltaRightX).toBeLessThan(0.04);
    });
  });

  describe('Unilateral Eye Degradation & Recovery', () => {
    it('detects OPTIMAL tracking quality when both eyes are healthy and tracked', () => {
      const landmarks = generateSyntheticEyeLandmarks(1000);
      const features = extractGazeFeatures(landmarks, true);

      expect(features).not.toBeNull();
      expect(features!.isBilateral).toBe(true);
      expect(features!.trackingQuality).toBe('OPTIMAL');
      expect(features!.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('gracefully handles unilateral right eye occlusion by substituting healthy left eye', () => {
      const landmarks = generateSyntheticEyeLandmarks(1000);

      // Simulate right eye occlusion: collapse right eyelid span (blink / covered)
      landmarks[159] = { ...landmarks[33]!, y: landmarks[33]!.y }; // Upper lid collapsed
      landmarks[145] = { ...landmarks[33]!, y: landmarks[33]!.y }; // Lower lid collapsed

      const features = extractGazeFeatures(landmarks, true);
      expect(features).not.toBeNull();
      expect(features!.isTracking).toBe(true);
      expect(features!.isBilateral).toBe(false);
      expect(features!.trackingQuality).toBe('DEGRADED_UNILATERAL');

      // Right eye ratios must be substituted with valid left eye values, never NaN or out of bounds
      expect(features!.rightRatioX).toBe(features!.leftRatioX);
      expect(features!.rightRatioY).toBe(features!.leftRatioY);
      expect(features!.confidence).toBeLessThan(0.95);
      expect(features!.confidence).toBeGreaterThan(0.6);
    });

    it('gracefully handles unilateral left eye occlusion by substituting healthy right eye', () => {
      const landmarks = generateSyntheticEyeLandmarks(1000);

      // Simulate left eye occlusion: collapse left eyelid span
      landmarks[386] = { ...landmarks[263]!, y: landmarks[263]!.y };
      landmarks[374] = { ...landmarks[263]!, y: landmarks[263]!.y };

      const features = extractGazeFeatures(landmarks, true);
      expect(features).not.toBeNull();
      expect(features!.isTracking).toBe(true);
      expect(features!.isBilateral).toBe(false);
      expect(features!.trackingQuality).toBe('DEGRADED_UNILATERAL');

      expect(features!.leftRatioX).toBe(features!.rightRatioX);
      expect(features!.leftRatioY).toBe(features!.rightRatioY);
    });

    it('reports OCCLUDED when both eyes are closed / obscured', () => {
      const landmarks = generateSyntheticEyeLandmarks(1000);

      // Collapse both eyes
      landmarks[159] = { ...landmarks[33]!, y: landmarks[33]!.y };
      landmarks[145] = { ...landmarks[33]!, y: landmarks[33]!.y };
      landmarks[386] = { ...landmarks[263]!, y: landmarks[263]!.y };
      landmarks[374] = { ...landmarks[263]!, y: landmarks[263]!.y };

      const features = extractGazeFeatures(landmarks, true);
      expect(features).not.toBeNull();
      expect(features!.isTracking).toBe(false);
      expect(features!.trackingQuality).toBe('OCCLUDED');
    });
  });

  describe('Gaze Calibration Engine with Interaction Terms', () => {
    it('fits polynomial Ridge Regression with head interaction terms achieving high R2', () => {
      const engine = new GazeCalibrationEngine();
      engine.startCalibration();

      let now = 2000;
      let completed = false;

      for (let i = 0; i < 9; i++) {
        const target = DEFAULT_9_TARGETS[i]!;
        now += 250; // settling time

        for (let s = 0; s < 45; s++) {
          now += 20;
          const features: GazeFeatures = {
            leftRatioX: target.normX * 0.75 + 0.12,
            leftRatioY: target.normY * 0.75 + 0.12,
            rightRatioX: target.normX * 0.75 + 0.12,
            rightRatioY: target.normY * 0.75 + 0.12,
            headYaw: (target.normX - 0.5) * 16,
            headPitch: (0.5 - target.normY) * 12,
            eyeMidX: 0.5,
            eyeMidY: 0.5,
            isTracking: true,
            confidence: 0.96,
            isBilateral: true,
            trackingQuality: 'OPTIMAL',
          };

          const prevIndex = engine.getActiveTargetIndex();
          const isDone = engine.addSample(features, now);
          if (isDone) {
            completed = true;
            break;
          }
          if (engine.getActiveTargetIndex() !== prevIndex) {
            break;
          }
        }
      }

      expect(completed).toBe(true);
      expect(engine.isReady()).toBe(true);

      const acc = engine.getAccuracy();
      expect(acc.errorPx).toBeLessThan(75);
      expect(acc.r2Score).toBeGreaterThan(0.75);

      // Verify prediction
      const pred = engine.predictGaze(
        {
          leftRatioX: 0.85,
          leftRatioY: 0.85,
          rightRatioX: 0.85,
          rightRatioY: 0.85,
          headYaw: 8,
          headPitch: -6,
          eyeMidX: 0.5,
          eyeMidY: 0.5,
          isTracking: true,
          confidence: 0.95,
        },
        1920,
        1080
      );

      // Bottom-right gaze should map to bottom-right coordinates
      expect(pred.x).toBeGreaterThan(1200);
      expect(pred.y).toBeGreaterThan(600);
    });
  });

  describe('Camera Coordinate Transformations (core/camera/coordinates.ts)', () => {
    it('computes correct object-fit contain letterboxing/pillarboxing', () => {
      // 16:9 video (1920x1080) in 4:3 container (800x600) -> letterboxed (black bars top & bottom)
      const bounds = computeObjectFitBounds(800, 600, 1920, 1080, 'contain');

      expect(bounds.renderWidth).toBe(800);
      expect(bounds.renderHeight).toBeCloseTo(450, 0); // 800 * (1080/1920) = 450
      expect(bounds.renderX).toBe(0);
      expect(bounds.renderY).toBeCloseTo(75, 0); // (600 - 450) / 2 = 75
    });

    it('computes correct object-fit cover cropping offsets', () => {
      // 16:9 video (1920x1080) in 4:3 container (800x600) -> horizontal sides cropped
      const bounds = computeObjectFitBounds(800, 600, 1920, 1080, 'cover');

      expect(bounds.renderHeight).toBe(600);
      // scale = 600 / 1080 = 0.5555... width = 1920 * (600/1080) = 1066.67
      expect(bounds.renderWidth).toBeCloseTo(1066.67, 0);
      expect(bounds.renderX).toBeLessThan(0); // cropped left & right
      expect(bounds.renderY).toBe(0);
    });

    it('performs accurate round-trip between normalized and display coordinates', () => {
      const bounds = computeObjectFitBounds(1000, 600, 1280, 720, 'contain');

      // Test normalized point (0.6, 0.4)
      const normPoint = { x: 0.6, y: 0.4 };
      const displayPoint = mapNormalizedToDisplay(normPoint.x, normPoint.y, bounds, false);

      const recoveredNorm = mapDisplayToNormalized(displayPoint.x, displayPoint.y, bounds, false);

      expect(recoveredNorm.normX).toBeCloseTo(normPoint.x, 3);
      expect(recoveredNorm.normY).toBeCloseTo(normPoint.y, 3);
    });

    it('handles camera mirroring in normalized-to-display mapping', () => {
      const bounds = {
        renderWidth: 1000,
        renderHeight: 600,
        renderX: 0,
        renderY: 0,
        scaleX: 1,
        scaleY: 1,
        cropOffsetX: 0,
        cropOffsetY: 0,
      };
      const displayMirrored = mapNormalizedToDisplay(0.2, 0.5, bounds, true);
      const displayUnmirrored = mapNormalizedToDisplay(0.2, 0.5, bounds, false);

      // When mirrored, normX = 0.2 maps to 80% across the container (800px)
      expect(displayMirrored.x).toBe(800);
      expect(displayUnmirrored.x).toBe(200);
    });

    it('syncCanvasWithDPR updates buffer dimensions according to devicePixelRatio', () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        style: {} as Record<string, string>,
        getContext: () => ({ scale: () => {} }),
      };

      syncCanvasWithDPR(mockCanvas as unknown as HTMLCanvasElement, 800, 500, 2);

      expect(mockCanvas.width).toBe(1600);
      expect(mockCanvas.height).toBe(1000);
    });
  });
});
