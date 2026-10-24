import { Landmark3D } from '../hand/types';
import { OneEuroFilter } from '@/core/filters';

export interface HandSteeringInput {
  leftWrist?: Landmark3D;
  rightWrist?: Landmark3D;
  singleHandWrist?: Landmark3D;
  singleHandMcp?: Landmark3D;
  leftFist?: boolean;
  rightFist?: boolean;
  handDistance?: number;
  isTracking: boolean;
  timestamp: number;
}

export class SteeringEngine {
  private filter = new OneEuroFilter(60, { minCutoff: 1.0, beta: 0.006 });
  private neutralAngle = 0;
  private calibrationStartTime: number | null = null;
  private calibrationSamples: number[] = [];
  private lastHandsDetectedTime = performance.now();
  private deadzoneDeg = 4.0;
  private maxSteerDeg = 42.0;

  getCalibrationProgress(): number {
    if (this.calibrationStartTime === null) return 1.0;
    const elapsed = performance.now() - this.calibrationStartTime;
    return Math.min(1.0, elapsed / 2000);
  }

  startCalibration(): void {
    this.calibrationStartTime = performance.now();
    this.calibrationSamples = [];
  }

  process(
    input: HandSteeringInput,
    keyboardSteering = 0,
    keyboardThrottle = 0,
    keyboardBrake = 0
  ) {
    const now = input.timestamp;

    const hasDualHands = Boolean(input.isTracking && input.leftWrist && input.rightWrist);
    const hasSingleHand = Boolean(
      input.isTracking && input.singleHandWrist && input.singleHandMcp
    );

    if (hasDualHands || hasSingleHand) {
      this.lastHandsDetectedTime = now;
    }

    const handsLostDuration = now - this.lastHandsDetectedTime;
    const handsLost = !hasDualHands && !hasSingleHand && handsLostDuration > 500;

    // Check keyboard input
    const hasKeyboardInput =
      Math.abs(keyboardSteering) > 0.01 || keyboardThrottle > 0.01 || keyboardBrake > 0.01;

    // Direct Keyboard Override or Hands Lost
    if (hasKeyboardInput || handsLost) {
      const targetKbSteer = keyboardSteering * this.maxSteerDeg;
      const smoothedKeyboard = this.filter.filter(targetKbSteer, now);
      return {
        steeringAngle: Math.round(smoothedKeyboard * 10) / 10,
        throttle: keyboardThrottle,
        brake: keyboardBrake,
        handsLost: handsLost || (!hasDualHands && !hasSingleHand),
        controlSource: 'KEYBOARD' as const,
      };
    }

    let rawDeg = 0;
    let throttle = 0.55; // default cruising throttle
    let brake = 0;

    // Dual-Hand Steering Wheel Matrix
    if (hasDualHands && input.leftWrist && input.rightWrist) {
      const lw = input.leftWrist;
      const rw = input.rightWrist;

      // In camera view: user turns wheel right -> right hand drops (higher Y), left hand rises (lower Y)
      const dx = rw.x - lw.x;
      const dy = rw.y - lw.y;

      const rawRad = Math.atan2(dy, dx);
      rawDeg = (rawRad * 180) / Math.PI;

      // Average elevation for throttle control
      const avgY = (lw.y + rw.y) / 2;
      if (avgY < 0.4) {
        throttle = 1.0;
      } else if (avgY < 0.6) {
        throttle = 0.65;
      } else {
        throttle = 0.35;
      }

      if (input.leftFist || input.rightFist) {
        brake = 0.85;
        throttle = 0;
      }
    } else if (hasSingleHand && input.singleHandWrist && input.singleHandMcp) {
      // Single-Hand Tilt Steering Matrix
      const wrist = input.singleHandWrist;
      const mcp = input.singleHandMcp;
      const dx = mcp.x - wrist.x;
      const dy = wrist.y - mcp.y; // Upward vector

      const tiltRad = Math.atan2(dx, dy);
      rawDeg = (tiltRad * 180) / Math.PI;

      if (input.leftFist || input.rightFist) {
        brake = 0.85;
        throttle = 0;
      }
    }

    // Calibration offset handling
    if (this.calibrationStartTime !== null) {
      this.calibrationSamples.push(rawDeg);
      if (now - this.calibrationStartTime >= 2000) {
        this.neutralAngle =
          this.calibrationSamples.reduce((a, b) => a + b, 0) /
          (this.calibrationSamples.length || 1);
        this.calibrationStartTime = null;
      }
    }

    let delta = rawDeg - this.neutralAngle;

    // Dead zone (+/- 4 degrees)
    if (Math.abs(delta) < this.deadzoneDeg) {
      delta = 0;
    } else {
      delta = Math.sign(delta) * (Math.abs(delta) - this.deadzoneDeg);
    }

    const norm = Math.min(1.0, Math.abs(delta) / this.maxSteerDeg);
    const curvedNorm = Math.pow(norm, 1.35);
    const targetDeg = Math.sign(delta) * curvedNorm * this.maxSteerDeg;

    const smoothedDeg = this.filter.filter(targetDeg, now);

    return {
      steeringAngle: Math.round(smoothedDeg * 10) / 10,
      throttle,
      brake,
      handsLost: false,
      controlSource: 'GESTURE' as const,
    };
  }

  reset(): void {
    this.filter.reset();
    this.calibrationStartTime = null;
    this.calibrationSamples = [];
    this.neutralAngle = 0;
  }
}
