import { describe, it, expect } from 'vitest';
import { SteeringEngine } from '../modules/drive/steering-engine';
import { VehiclePhysics } from '../modules/drive/physics';
import { PupillometryAnalyzer } from '../modules/eye/pupillometry';
import { generateSyntheticEyeLandmarks } from '../modules/eye/synthetic-eye';

describe('Gesture-Steered Simulator Engine', () => {
  it('correctly calculates dual-hand steering angles', () => {
    const engine = new SteeringEngine();

    // Neutral straight hands
    const neutral = engine.process(
      {
        leftWrist: { x: 0.3, y: 0.5, z: 0 },
        rightWrist: { x: 0.7, y: 0.5, z: 0 },
        isTracking: true,
        timestamp: 1000,
      },
      0,
      0,
      0
    );
    expect(neutral.controlSource).toBe('GESTURE');
    expect(Math.abs(neutral.steeringAngle)).toBeLessThan(3.0);

    // Turning Right (right hand lowers to Y=0.65, left hand stays at Y=0.45)
    const turnRight = engine.process(
      {
        leftWrist: { x: 0.3, y: 0.45, z: 0 },
        rightWrist: { x: 0.7, y: 0.65, z: 0 },
        isTracking: true,
        timestamp: 1050,
      },
      0,
      0,
      0
    );
    expect(turnRight.steeringAngle).toBeGreaterThan(5.0);

    // Turning Left (new engine instance to verify counter-clockwise geometry)
    const engineLeft = new SteeringEngine();
    const turnLeft = engineLeft.process(
      {
        leftWrist: { x: 0.3, y: 0.65, z: 0 },
        rightWrist: { x: 0.7, y: 0.45, z: 0 },
        isTracking: true,
        timestamp: 1000,
      },
      0,
      0,
      0
    );
    expect(turnLeft.steeringAngle).toBeLessThan(-5.0);
  });

  it('handles single-hand tilt steering fallback', () => {
    const engine = new SteeringEngine();

    // Single hand tilted right
    const singleRight = engine.process(
      {
        singleHandWrist: { x: 0.5, y: 0.7, z: 0 },
        singleHandMcp: { x: 0.6, y: 0.5, z: 0 },
        isTracking: true,
        timestamp: 2000,
      },
      0,
      0,
      0
    );
    expect(singleRight.controlSource).toBe('GESTURE');
    expect(singleRight.steeringAngle).toBeGreaterThan(3.0);
  });

  it('allows keyboard inputs to instantly override gesture steering', () => {
    const engine = new SteeringEngine();

    const kbOverride = engine.process(
      {
        leftWrist: { x: 0.3, y: 0.5, z: 0 },
        rightWrist: { x: 0.7, y: 0.5, z: 0 },
        isTracking: true,
        timestamp: 3000,
      },
      1.0, // Full right keyboard steer
      1.0, // Full throttle
      0
    );
    expect(kbOverride.controlSource).toBe('KEYBOARD');
    expect(kbOverride.throttle).toBe(1.0);
    expect(kbOverride.steeringAngle).toBeGreaterThan(10.0);
  });

  it('simulates vehicle physics acceleration and lane deviation', () => {
    const physics = new VehiclePhysics();

    const initial = physics.update(0, 1.0, 0, 0, 1 / 60);
    expect(initial.speed).toBeGreaterThanOrEqual(0);

    let state = initial;
    for (let i = 0; i < 60; i++) {
      state = physics.update(0, 1.0, 0, 0, 1 / 60);
    }
    expect(state.speed).toBeGreaterThan(5);
    expect(state.distanceMeters).toBeGreaterThan(0);
  });
});

describe('8th Module: Ocular Pupillometry & Eye Tracker', () => {
  it('extracts realistic sub-millimeter pupil diameter from synthetic landmarks', () => {
    const analyzer = new PupillometryAnalyzer();
    const lms = generateSyntheticEyeLandmarks(1000);

    const metrics = analyzer.process(lms, 1000);
    expect(metrics.leftPupilDiameterMm).toBeGreaterThan(2.0);
    expect(metrics.leftPupilDiameterMm).toBeLessThan(8.0);
    expect(metrics.rightPupilDiameterMm).toBeGreaterThan(2.0);
    expect(metrics.rightPupilDiameterMm).toBeLessThan(8.0);
    expect(metrics.meanPupilDiameterMm).toBeGreaterThan(2.0);
    expect(metrics.anisocoriaMm).toBeLessThan(1.0);
  });

  it('computes saccadic velocity and records saccadic events', () => {
    const analyzer = new PupillometryAnalyzer();

    const lms1 = generateSyntheticEyeLandmarks(1000);
    analyzer.process(lms1, 1000);

    const lms2 = generateSyntheticEyeLandmarks(1030);
    const metrics2 = analyzer.process(lms2, 1030);

    expect(metrics2.saccadicVelocityDegSec).toBeGreaterThanOrEqual(0);
    expect(analyzer.getPupilHistory().length).toBeGreaterThan(0);
  });

  it('correctly tracks bilateral eyes independently and handles unilateral occlusion', () => {
    const analyzer = new PupillometryAnalyzer();
    const lms = generateSyntheticEyeLandmarks(1000);

    // Initial bilateral tracking
    const metricsNormal = analyzer.process(lms, 1000);
    expect(metricsNormal.leftEye.state).toBe('TRACKING');
    expect(metricsNormal.rightEye.state).toBe('TRACKING');
    expect(metricsNormal.leftEye.medicalAbbr).toBe('OS');
    expect(metricsNormal.rightEye.medicalAbbr).toBe('OD');
    expect(metricsNormal.overallStatus).toBe('BILATERAL_LOCKED');

    // Simulate unilateral right eye occlusion (covering OD landmarks 33 & 133 or placing off-screen)
    const lmsRightOccluded = [...lms];
    lmsRightOccluded[468] = { x: -1, y: -1, z: 0 }; // Right iris out of bounds
    lmsRightOccluded[33] = { x: 0, y: 0, z: 0 };
    lmsRightOccluded[133] = { x: 0.005, y: 0, z: 0 }; // hSpan < 0.018

    const metricsOccluded = analyzer.process(lmsRightOccluded, 1033);
    expect(metricsOccluded.rightEye.state).toBe('OCCLUDED');
    expect(metricsOccluded.leftEye.state).toBe('TRACKING');
    expect(metricsOccluded.overallStatus).toBe('UNILATERAL_LEFT');
  });

  it('detects bilateral blink state when both eye aspect ratios drop', () => {
    const analyzer = new PupillometryAnalyzer();
    const lms = generateSyntheticEyeLandmarks(1000);

    // Close both eyelids (upper and lower canthus almost touching)
    const lmsBlink = [...lms];
    // Right eye eyelids close
    lmsBlink[159] = { x: 0.41, y: 0.45, z: 0 };
    lmsBlink[145] = { x: 0.41, y: 0.452, z: 0 };
    // Left eye eyelids close
    lmsBlink[386] = { x: 0.59, y: 0.45, z: 0 };
    lmsBlink[374] = { x: 0.59, y: 0.452, z: 0 };

    const metricsBlink = analyzer.process(lmsBlink, 1033);
    expect(metricsBlink.leftEye.state).toBe('BLINKING');
    expect(metricsBlink.rightEye.state).toBe('BLINKING');
  });
});
