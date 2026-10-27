import { describe, it, expect, beforeEach } from 'vitest';
import {
  GazeCalibrationEngine,
  extractGazeFeatures,
  DEFAULT_9_TARGETS,
} from '../modules/gaze/calibration';
import {
  GazeCursorController,
  GazeCursorState,
} from '../modules/gaze/gaze-cursor-controller';
import { GazeFeatures, DEFAULT_GAZE_CURSOR_CONFIG } from '../modules/gaze/types';
import { generateSyntheticEyeLandmarks } from '../modules/eye/synthetic-eye';

// Mock browser localStorage
const storage = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;

describe('Calibrated Gaze Cursor & Calibration Engine', () => {
  beforeEach(() => {
    storage.clear();
  });

  describe('Feature Extraction from Facial Landmarks', () => {
    it('extracts valid normalized gaze features from facial landmarks', () => {
      const landmarks = generateSyntheticEyeLandmarks(1000);
      const features = extractGazeFeatures(landmarks, true);

      expect(features).not.toBeNull();
      expect(features!.isTracking).toBe(true);
      expect(features!.leftRatioX).toBeGreaterThanOrEqual(0);
      expect(features!.leftRatioX).toBeLessThanOrEqual(1);
      expect(features!.rightRatioX).toBeGreaterThanOrEqual(0);
      expect(features!.rightRatioX).toBeLessThanOrEqual(1);
      expect(features!.headYaw).toBeDefined();
      expect(features!.headPitch).toBeDefined();
    });

    it('correctly inverts horizontal pupil ratio when mirrored view is enabled', () => {
      const landmarks = generateSyntheticEyeLandmarks(1000);

      const unmirrored = extractGazeFeatures(landmarks, false);
      const mirrored = extractGazeFeatures(landmarks, true);

      expect(unmirrored).not.toBeNull();
      expect(mirrored).not.toBeNull();
      // Mirroring inverts horizontal ratio so looking user-right corresponds to screen-right
      expect(Math.abs(mirrored!.leftRatioX - (1 - unmirrored!.leftRatioX))).toBeLessThan(0.01);
    });

    it('returns null when landmarks are missing or insufficient', () => {
      expect(extractGazeFeatures(null, true)).toBeNull();
      expect(extractGazeFeatures([], true)).toBeNull();
      expect(extractGazeFeatures(new Array(200).fill({ x: 0, y: 0 }), true)).toBeNull();
    });
  });

  describe('Gaze Calibration Engine (9-Point Ridge Regression)', () => {
    it('initializes with 9 default calibration targets across the viewport', () => {
      const engine = new GazeCalibrationEngine();
      const targets = engine.getTargets();

      expect(targets).toHaveLength(9);
      expect(targets[0]!.normX).toBe(0.1);
      expect(targets[0]!.normY).toBe(0.1);
      expect(targets[4]!.normX).toBe(0.5);
      expect(targets[4]!.normY).toBe(0.5);
      expect(targets[8]!.normX).toBe(0.9);
      expect(targets[8]!.normY).toBe(0.9);
    });

    it('predicts anatomically plausible coordinates using prior when uncalibrated', () => {
      const engine = new GazeCalibrationEngine();
      expect(engine.isReady()).toBe(false);

      const features: GazeFeatures = {
        leftRatioX: 0.5,
        leftRatioY: 0.5,
        rightRatioX: 0.5,
        rightRatioY: 0.5,
        headYaw: 0,
        headPitch: 0,
        eyeMidX: 0.5,
        eyeMidY: 0.5,
        isTracking: true,
        confidence: 0.95,
      };

      const pred = engine.predictGaze(features, 1920, 1080);
      // Center gaze should map close to center of screen (960, 540)
      expect(pred.x).toBeGreaterThan(800);
      expect(pred.x).toBeLessThan(1120);
      expect(pred.y).toBeGreaterThan(450);
      expect(pred.y).toBeLessThan(650);
    });

    it('collects samples and fits 9-point polynomial ridge regression model', () => {
      const engine = new GazeCalibrationEngine();
      engine.startCalibration();

      let now = 1000;
      let completed = false;

      // Simulate 9-point calibration sequence
      for (let targetIdx = 0; targetIdx < 9; targetIdx++) {
        const target = DEFAULT_9_TARGETS[targetIdx]!;

        // First 300ms is settling time (ignored)
        now += 250;

        // Collect steady samples past settling time (220ms settling + 22 samples * 20ms)
        for (let s = 0; s < 40; s++) {
          now += 20;
          const features: GazeFeatures = {
            leftRatioX: target.normX * 0.8 + 0.1,
            leftRatioY: target.normY * 0.8 + 0.1,
            rightRatioX: target.normX * 0.8 + 0.1,
            rightRatioY: target.normY * 0.8 + 0.1,
            headYaw: (target.normX - 0.5) * 15,
            headPitch: (0.5 - target.normY) * 10,
            eyeMidX: 0.5,
            eyeMidY: 0.5,
            isTracking: true,
            confidence: 0.95,
          };

          const prevIndex = engine.getActiveTargetIndex();
          const isDone = engine.addSample(features, now);
          if (isDone) {
            completed = true;
            break;
          }
          if (engine.getActiveTargetIndex() !== prevIndex) {
            break; // Target completed, advance to next in outer loop
          }
        }
      }

      expect(completed).toBe(true);
      expect(engine.isReady()).toBe(true);

      const accuracy = engine.getAccuracy();
      expect(accuracy.errorPx).toBeGreaterThan(0);
      expect(accuracy.errorPx).toBeLessThan(100);
      expect(accuracy.r2Score).toBeGreaterThan(0.7);

      // Verify prediction on new test features
      const testFeatures: GazeFeatures = {
        leftRatioX: 0.9 * 0.8 + 0.1,
        leftRatioY: 0.1 * 0.8 + 0.1,
        rightRatioX: 0.9 * 0.8 + 0.1,
        rightRatioY: 0.1 * 0.8 + 0.1,
        headYaw: 6,
        headPitch: 4,
        eyeMidX: 0.5,
        eyeMidY: 0.5,
        isTracking: true,
        confidence: 0.95,
      };

      const testPred = engine.predictGaze(testFeatures, 1920, 1080);
      // Looking at top-right should produce high X and low Y
      expect(testPred.x).toBeGreaterThan(1200);
      expect(testPred.y).toBeLessThan(400);
    });

    it('persists and restores calibration parameters to localStorage', () => {
      const engine1 = new GazeCalibrationEngine();
      engine1.startCalibration();

      let now = 1000;
      for (let targetIdx = 0; targetIdx < 9; targetIdx++) {
        const target = DEFAULT_9_TARGETS[targetIdx]!;
        now += 250;
        for (let s = 0; s < 40; s++) {
          now += 20;
          const prevIndex = engine1.getActiveTargetIndex();
          const isDone = engine1.addSample(
            {
              leftRatioX: target.normX,
              leftRatioY: target.normY,
              rightRatioX: target.normX,
              rightRatioY: target.normY,
              headYaw: 0,
              headPitch: 0,
              eyeMidX: 0.5,
              eyeMidY: 0.5,
              isTracking: true,
              confidence: 0.95,
            },
            now
          );
          if (isDone || engine1.getActiveTargetIndex() !== prevIndex) {
            break;
          }
        }
      }

      expect(engine1.isReady()).toBe(true);
      expect(storage.has('omni-gaze-calib-v2')).toBe(true);

      // Instantiate a new engine; should load persisted calibration
      const engine2 = new GazeCalibrationEngine();
      expect(engine2.isReady()).toBe(true);
      expect(engine2.getAccuracy().errorPx).toBe(engine1.getAccuracy().errorPx);
    });
  });

  describe('Gaze Cursor Controller & Adaptive Filtering', () => {
    it('initializes with default viewport configuration', () => {
      const controller = new GazeCursorController();
      const config = controller.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.dwellEnabled).toBe(false);
      expect(config.minCutoff).toBe(1.0);
      expect(config.smoothingBeta).toBe(0.05);
    });

    it('smooths steady fixation and maintains viewport boundary clamping', () => {
      const controller = new GazeCursorController();
      const engine = new GazeCalibrationEngine();

      const steadyFeatures: GazeFeatures = {
        leftRatioX: 0.5,
        leftRatioY: 0.5,
        rightRatioX: 0.5,
        rightRatioY: 0.5,
        headYaw: 0,
        headPitch: 0,
        eyeMidX: 0.5,
        eyeMidY: 0.5,
        isTracking: true,
        confidence: 0.95,
      };

      let state: GazeCursorState | null = null;
      for (let i = 0; i < 30; i++) {
        state = controller.process(steadyFeatures, engine, 1920, 1080, 1000 + i * 16.6);
      }

      expect(state).not.toBeNull();
      expect(state!.isTracking).toBe(true);
      expect(state!.x).toBeGreaterThan(0);
      expect(state!.x).toBeLessThan(1920);
      expect(state!.y).toBeGreaterThan(0);
      expect(state!.y).toBeLessThan(1080);
      expect(state!.isFixating).toBe(true);
    });

    it('accumulates motion trail history with alpha decay', () => {
      const controller = new GazeCursorController({ showTrail: true, trailLength: 8 });
      const engine = new GazeCalibrationEngine();

      const features: GazeFeatures = {
        leftRatioX: 0.5,
        leftRatioY: 0.5,
        rightRatioX: 0.5,
        rightRatioY: 0.5,
        headYaw: 0,
        headPitch: 0,
        eyeMidX: 0.5,
        eyeMidY: 0.5,
        isTracking: true,
        confidence: 0.95,
      };

      let state: GazeCursorState | null = null;
      for (let i = 0; i < 15; i++) {
        state = controller.process(features, engine, 1920, 1080, 1000 + i * 16.6);
      }

      expect(state!.trail.length).toBeGreaterThan(0);
      expect(state!.trail.length).toBeLessThanOrEqual(8);
      // Older trail elements have lower alpha
      expect(state!.trail[0]!.alpha).toBeLessThan(state!.trail[state!.trail.length - 1]!.alpha);
    });

    it('gracefully handles tracking loss without leaping or crashing', () => {
      const controller = new GazeCursorController();
      const engine = new GazeCalibrationEngine();

      // Tracking active
      controller.process(
        {
          leftRatioX: 0.5,
          leftRatioY: 0.5,
          rightRatioX: 0.5,
          rightRatioY: 0.5,
          headYaw: 0,
          headPitch: 0,
          eyeMidX: 0.5,
          eyeMidY: 0.5,
          isTracking: true,
          confidence: 0.95,
        },
        engine,
        1920,
        1080,
        1000
      );

      // Tracking lost (null features)
      const lostState = controller.process(null, engine, 1920, 1080, 1016);
      expect(lostState.isTracking).toBe(false);
      expect(lostState.dwellProgress).toBe(0);
    });
  });
});
