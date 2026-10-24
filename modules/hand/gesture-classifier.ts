import { Landmark3D, RecognizedGesture, GestureType } from './types';

interface VelocityPoint {
  x: number;
  y: number;
  time: number;
}

export class HandGestureClassifier {
  private lastPinchState = false;
  private velocityHistory: VelocityPoint[] = [];
  private lastSwipeTime = 0;
  private swipeCooldownMs = 400;

  // Euclidean distance between two 3D points
  private dist3D(a: Landmark3D, b: Landmark3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // 2D distance for screen-plane heuristics
  private dist2D(a: Landmark3D, b: Landmark3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  classify(landmarks: Landmark3D[], timestamp: number): RecognizedGesture[] {
    if (!landmarks || landmarks.length < 21) {
      return [{ name: 'none', confidence: 1.0, label: 'NO HAND' }];
    }

    const wrist = landmarks[0]!;
    const thumbTip = landmarks[4]!;
    const thumbIP = landmarks[3]!;
    const indexTip = landmarks[8]!;
    const indexPIP = landmarks[6]!;
    const indexMCP = landmarks[5]!;
    const middleTip = landmarks[12]!;
    const middlePIP = landmarks[10]!;
    const middleMCP = landmarks[9]!;
    const ringTip = landmarks[16]!;
    const ringPIP = landmarks[14]!;
    const ringMCP = landmarks[13]!;
    const pinkyTip = landmarks[20]!;
    const pinkyPIP = landmarks[18]!;
    const pinkyMCP = landmarks[17]!;

    // Palm scale normalization reference (wrist to middle MCP)
    const palmScale = Math.max(0.01, this.dist3D(wrist, middleMCP));

    // Finger extended checks
    const indexExtended = this.dist3D(wrist, indexTip) > this.dist3D(wrist, indexPIP) * 1.15;
    const middleExtended = this.dist3D(wrist, middleTip) > this.dist3D(wrist, middlePIP) * 1.15;
    const ringExtended = this.dist3D(wrist, ringTip) > this.dist3D(wrist, ringPIP) * 1.15;
    const pinkyExtended = this.dist3D(wrist, pinkyTip) > this.dist3D(wrist, pinkyPIP) * 1.15;

    // Finger curled checks
    const indexCurled = this.dist3D(wrist, indexTip) < this.dist3D(wrist, indexPIP) * 1.05;
    const middleCurled = this.dist3D(wrist, middleTip) < this.dist3D(wrist, middlePIP) * 1.05;
    const ringCurled = this.dist3D(wrist, ringTip) < this.dist3D(wrist, ringPIP) * 1.05;
    const pinkyCurled = this.dist3D(wrist, pinkyTip) < this.dist3D(wrist, pinkyPIP) * 1.05;

    const gestures: RecognizedGesture[] = [];

    // 1. PINCH DETECTION WITH HYSTERESIS
    const pinchRawDist = this.dist3D(thumbTip, indexTip);
    const normalizedPinchDist = pinchRawDist / palmScale;

    let isPinching = this.lastPinchState;
    if (this.lastPinchState) {
      if (normalizedPinchDist > 0.48) {
        isPinching = false;
      }
    } else {
      if (normalizedPinchDist < 0.32) {
        isPinching = true;
      }
    }
    this.lastPinchState = isPinching;

    if (isPinching) {
      const confidence = Math.min(1.0, Math.max(0.5, 1.0 - (normalizedPinchDist - 0.1) * 2));
      gestures.push({
        name: 'pinch',
        confidence: Math.round(confidence * 100) / 100,
        label: 'PINCH / CLICK',
      });
    }

    // 2. CLOSED FIST
    if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
      const avgCurl =
        (this.dist3D(wrist, indexTip) +
          this.dist3D(wrist, middleTip) +
          this.dist3D(wrist, ringTip) +
          this.dist3D(wrist, pinkyTip)) /
        (4 * palmScale);
      const conf = Math.min(1.0, Math.max(0.6, 1.2 - avgCurl));
      gestures.push({
        name: 'closed_fist',
        confidence: Math.round(conf * 100) / 100,
        label: 'CLOSED FIST',
      });
    }

    // 3. OPEN PALM
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      gestures.push({
        name: 'open_palm',
        confidence: 0.95,
        label: 'OPEN PALM',
      });
    }

    // 4. POINTING
    if (indexExtended && middleCurled && ringCurled && pinkyCurled && !isPinching) {
      gestures.push({
        name: 'pointing',
        confidence: 0.92,
        label: 'POINTING',
      });
    }

    // 5. THUMBS UP
    // Thumb points upward (y is smaller), and 4 fingers curled
    const thumbUpward = thumbTip.y < thumbIP.y - 0.04;
    if (thumbUpward && indexCurled && middleCurled && ringCurled && pinkyCurled) {
      gestures.push({
        name: 'thumbs_up',
        confidence: 0.94,
        label: 'THUMBS UP',
      });
    }

    // 6. PEACE SIGN
    if (indexExtended && middleExtended && ringCurled && pinkyCurled && !isPinching) {
      const tipsDist = this.dist2D(indexTip, middleTip) / palmScale;
      if (tipsDist > 0.25) {
        gestures.push({
          name: 'peace_sign',
          confidence: 0.91,
          label: 'PEACE SIGN',
        });
      }
    }

    // 7. TWO-FINGER SCROLL
    if (indexExtended && middleExtended && ringCurled && pinkyCurled) {
      const tipsDist = this.dist2D(indexTip, middleTip) / palmScale;
      if (tipsDist <= 0.25) {
        gestures.push({
          name: 'two_finger_scroll',
          confidence: 0.88,
          label: 'TWO-FINGER SCROLL',
        });
      }
    }

    // 8. SWIPE VELOCITY DETECTION
    this.velocityHistory.push({ x: wrist.x, y: wrist.y, time: timestamp });
    // Keep last 250ms
    const windowStart = timestamp - 250;
    this.velocityHistory = this.velocityHistory.filter((p) => p.time >= windowStart);

    if (
      this.velocityHistory.length >= 3 &&
      timestamp - this.lastSwipeTime > this.swipeCooldownMs
    ) {
      const oldest = this.velocityHistory[0]!;
      const newest = this.velocityHistory[this.velocityHistory.length - 1]!;
      const dt = (newest.time - oldest.time) / 1000;
      if (dt > 0.08) {
        const vx = (newest.x - oldest.x) / dt;
        const vy = (newest.y - oldest.y) / dt;
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed > 1.2) {
          this.lastSwipeTime = timestamp;
          if (Math.abs(vx) > Math.abs(vy)) {
            if (vx > 0) {
              gestures.push({ name: 'swipe_right', confidence: 0.9, label: 'SWIPE RIGHT' });
            } else {
              gestures.push({ name: 'swipe_left', confidence: 0.9, label: 'SWIPE LEFT' });
            }
          } else {
            if (vy > 0) {
              gestures.push({ name: 'swipe_down', confidence: 0.9, label: 'SWIPE DOWN' });
            } else {
              gestures.push({ name: 'swipe_up', confidence: 0.9, label: 'SWIPE UP' });
            }
          }
        }
      }
    }

    if (gestures.length === 0) {
      gestures.push({ name: 'none', confidence: 0.5, label: 'TRACKING' });
    }

    return gestures;
  }

  isPinching(): boolean {
    return this.lastPinchState;
  }

  reset(): void {
    this.lastPinchState = false;
    this.velocityHistory = [];
    this.lastSwipeTime = 0;
  }
}
