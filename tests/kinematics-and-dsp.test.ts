import { describe, it, expect } from 'vitest';
import { OneEuroFilter, EMAFilter, KalmanFilter1D } from '../core/filters';
import { PoseKinematics } from '../modules/pose/kinematics';
import { FaceMetricsAnalyzer } from '../modules/face/blendshapes';
import { SteeringEngine } from '../modules/drive/steering-engine';
import { IDTFixationParser } from '../modules/gaze/idt-parser';
import { AcousticDSP } from '../modules/speech/pitch-detector';

describe('Omni Loco AI — Core Kinematics & DSP Mathematical Engines', () => {
  // 1. One Euro Filter
  describe('One Euro Filter', () => {
    it('should smooth jittery signal while preserving rapid transitions', () => {
      const filter = new OneEuroFilter(60, { minCutoff: 1.0, beta: 0.007 });
      const f1 = filter.filter(10, 0);
      expect(f1).toBe(10);

      // Low velocity jitter
      const f2 = filter.filter(10.2, 16.6);
      expect(f2).toBeLessThan(10.2);
      expect(f2).toBeGreaterThan(10.0);

      // Rapid transition
      const f3 = filter.filter(50, 33.3);
      expect(f3).toBeGreaterThan(15);
      const f4 = filter.filter(50, 50.0);
      expect(f4).toBeGreaterThan(25);
    });
  });

  // 2. Exponential Moving Average
  describe('EMA Filter', () => {
    it('should compute weighted moving average correctly', () => {
      const ema = new EMAFilter(0.5);
      expect(ema.filter(100)).toBe(100);
      expect(ema.filter(50)).toBe(75); // 0.5 * 50 + 0.5 * 100
      expect(ema.filter(50)).toBe(62.5);
    });
  });

  // 3. Kalman Filter 1D
  describe('Kalman Filter 1D', () => {
    it('should recursively reduce measurement noise', () => {
      const kf = new KalmanFilter1D(0.01, 0.1, 0);
      const v1 = kf.filter(10);
      expect(v1).toBe(10);
      const v2 = kf.filter(12);
      expect(v2).toBeLessThan(12);
      expect(v2).toBeGreaterThan(10);
    });
  });

  // 4. 3D Joint Angle Calculation
  describe('Pose Kinematics 3D Vector Angle Calculation', () => {
    it('should compute exact 90-degree angle for perpendicular rays', () => {
      const kinematics = new PoseKinematics();
      // Right triangle: A=(0, 1, 0), B=(0, 0, 0), C=(1, 0, 0)
      const a = { x: 0, y: 1, z: 0, visibility: 0.99 };
      const b = { x: 0, y: 0, z: 0, visibility: 0.99 };
      const c = { x: 1, y: 0, z: 0, visibility: 0.99 };

      const angle = kinematics.computeAngle3D(a, b, c);
      expect(Math.round(angle)).toBe(90);
    });

    it('should compute 180-degree straight line angle', () => {
      const kinematics = new PoseKinematics();
      const a = { x: -1, y: 0, z: 0, visibility: 0.99 };
      const b = { x: 0, y: 0, z: 0, visibility: 0.99 };
      const c = { x: 1, y: 0, z: 0, visibility: 0.99 };

      const angle = kinematics.computeAngle3D(a, b, c);
      expect(Math.round(angle)).toBe(180);
    });
  });

  // 5. Eye Aspect Ratio (EAR)
  describe('Eye Aspect Ratio (EAR) Blink Detection', () => {
    it('should compute high EAR for open eye and low EAR for closed eye', () => {
      const analyzer = new FaceMetricsAnalyzer();
      // Dummy 478 landmarks array
      const openEyeLandmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
      const eyeIndices = [33, 160, 158, 133, 153, 144];

      // Open eye coordinates
      openEyeLandmarks[33] = { x: 0.1, y: 0.5, z: 0 };
      openEyeLandmarks[160] = { x: 0.15, y: 0.45, z: 0 };
      openEyeLandmarks[158] = { x: 0.25, y: 0.45, z: 0 };
      openEyeLandmarks[133] = { x: 0.3, y: 0.5, z: 0 };
      openEyeLandmarks[153] = { x: 0.25, y: 0.55, z: 0 };
      openEyeLandmarks[144] = { x: 0.15, y: 0.55, z: 0 };

      const openEAR = analyzer.calculateEAR(openEyeLandmarks, eyeIndices);
      expect(openEAR).toBeGreaterThan(0.25);

      // Closed eye coordinates (vertical height near zero)
      openEyeLandmarks[160] = { x: 0.15, y: 0.501, z: 0 };
      openEyeLandmarks[158] = { x: 0.25, y: 0.501, z: 0 };
      openEyeLandmarks[153] = { x: 0.25, y: 0.499, z: 0 };
      openEyeLandmarks[144] = { x: 0.15, y: 0.499, z: 0 };

      const closedEAR = analyzer.calculateEAR(openEyeLandmarks, eyeIndices);
      expect(closedEAR).toBeLessThan(0.15);
    });
  });

  // 6. Steering Engine Deadzone & Response Curve
  describe('Steering Engine Dual-Hand Response', () => {
    it('should ignore subtle angular fluctuations within the deadzone (+/-4 deg)', () => {
      const engine = new SteeringEngine();
      // Left hand at (0.3, 0.5), Right hand at (0.7, 0.5) -> 0 degrees
      const res1 = engine.process({
        leftWrist: { x: 0.3, y: 0.5, z: 0 },
        rightWrist: { x: 0.7, y: 0.5, z: 0 },
        isTracking: true,
        timestamp: 1000,
      });
      expect(Math.abs(res1.steeringAngle)).toBeLessThan(1.0);

      // Subtle tilt within 4 degrees
      const res2 = engine.process({
        leftWrist: { x: 0.3, y: 0.5, z: 0 },
        rightWrist: { x: 0.7, y: 0.515, z: 0 },
        isTracking: true,
        timestamp: 1016,
      });
      expect(Math.abs(res2.steeringAngle)).toBeLessThan(2.0);
    });

    it('should transition to keyboard backup when hands are lost over 500ms', () => {
      const engine = new SteeringEngine();
      // Hands lost for 600ms
      const res = engine.process(
        { isTracking: false, timestamp: 2000 },
        0.5, // keyboard steering right
        1.0, // throttle
        0
      );
      expect(res.handsLost).toBe(true);
      expect(res.controlSource).toBe('KEYBOARD');
      expect(res.steeringAngle).toBeGreaterThan(10);
    });
  });

  // 7. I-DT Gaze Fixation Clustering
  describe('I-DT Gaze Fixation Parser', () => {
    it('should cluster dwelling gaze points into a single numbered fixation', () => {
      const parser = new IDTFixationParser();
      // Stream 15 samples around (300, 200) over 250ms
      for (let i = 0; i < 15; i++) {
        parser.processSample(300 + (i % 3), 200 + (i % 2), i * 20);
      }
      const fixations = parser.getFixations();
      expect(fixations.length).toBeGreaterThanOrEqual(1);
      expect(fixations[0]!.x).toBeCloseTo(300, -1);
      expect(fixations[0]!.y).toBeCloseTo(200, -1);
    });
  });

  // 8. Acoustic Feature Extraction (RMS & ZCR)
  describe('Acoustic DSP Analytics', () => {
    it('should calculate RMS loudness and dBFS accurately', () => {
      // Sine wave buffer at 1.0 peak
      const buffer = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        buffer[i] = Math.sin((i / 1024) * Math.PI * 8);
      }
      const { rms, dbFs } = AcousticDSP.computeLoudness(buffer);
      expect(rms).toBeGreaterThan(0.5);
      expect(dbFs).toBeGreaterThan(-10);
      expect(dbFs).toBeLessThanOrEqual(0);
    });

    it('should extract zero crossing rate for alternating signal', () => {
      const buffer = new Float32Array([1, -1, 1, -1, 1, -1, 1, -1]);
      const zcr = AcousticDSP.computeZCR(buffer);
      expect(zcr).toBeGreaterThan(0.7);
    });
  });
});
