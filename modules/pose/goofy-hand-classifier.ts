import { Landmark3D } from '../hand/types';
import {
  GoofyHandGestureType,
  HandClassificationResult,
  GOOFY_HAND_METADATA,
} from './goofy-types';

interface VelocityPoint {
  x: number;
  y: number;
  time: number;
}

export class GoofyHandClassifier {
  private lastPinchState = false;
  private velocityHistory: VelocityPoint[] = [];
  private lastSwipeTime = 0;
  private swipeCooldownMs = 450;

  private dist3D(a: Landmark3D, b: Landmark3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private dist2D(a: Landmark3D, b: Landmark3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Classify 21 3D hand landmarks into one of the 12 supported Goofy hand gestures
   */
  classify(
    landmarks: Landmark3D[],
    handedness: 'Left' | 'Right' = 'Right',
    timestamp = performance.now()
  ): HandClassificationResult {
    if (!landmarks || landmarks.length < 21) {
      return {
        gesture: null,
        handedness,
        confidence: 0,
        label: 'NO HAND DETECTED',
        comicCaption: 'SHOW YOUR HAND TO TRIGGER MEMES!',
      };
    }

    const wrist = landmarks[0]!;
    const thumbCMC = landmarks[1]!;
    const thumbMCP = landmarks[2]!;
    const thumbIP = landmarks[3]!;
    const thumbTip = landmarks[4]!;

    const indexMCP = landmarks[5]!;
    const indexPIP = landmarks[6]!;
    const indexTip = landmarks[8]!;

    const middleMCP = landmarks[9]!;
    const middlePIP = landmarks[10]!;
    const middleTip = landmarks[12]!;

    const ringMCP = landmarks[13]!;
    const ringPIP = landmarks[14]!;
    const ringTip = landmarks[16]!;

    const pinkyMCP = landmarks[17]!;
    const pinkyPIP = landmarks[18]!;
    const pinkyTip = landmarks[20]!;

    // Invariant Palm Scale Normalization (wrist to middle MCP)
    const palmScale = Math.max(0.01, this.dist3D(wrist, middleMCP));

    // Finger Extended Heuristics (tip distance to wrist > PIP distance to wrist * 1.15)
    const indexExtended = this.dist3D(wrist, indexTip) > this.dist3D(wrist, indexPIP) * 1.14;
    const middleExtended = this.dist3D(wrist, middleTip) > this.dist3D(wrist, middlePIP) * 1.14;
    const ringExtended = this.dist3D(wrist, ringTip) > this.dist3D(wrist, ringPIP) * 1.14;
    const pinkyExtended = this.dist3D(wrist, pinkyTip) > this.dist3D(wrist, pinkyPIP) * 1.14;

    // Finger Curled Heuristics
    const indexCurled = this.dist3D(wrist, indexTip) < this.dist3D(wrist, indexPIP) * 1.05;
    const middleCurled = this.dist3D(wrist, middleTip) < this.dist3D(wrist, middlePIP) * 1.05;
    const ringCurled = this.dist3D(wrist, ringTip) < this.dist3D(wrist, ringPIP) * 1.05;
    const pinkyCurled = this.dist3D(wrist, pinkyTip) < this.dist3D(wrist, pinkyPIP) * 1.05;

    // Thumb State
    const thumbTipToPinky = this.dist3D(thumbTip, pinkyMCP) / palmScale;
    const thumbExtended = thumbTipToPinky > 0.85 && this.dist3D(thumbTip, thumbMCP) / palmScale > 0.45;
    const thumbTucked = thumbTipToPinky < 0.65;

    // Count extended non-thumb fingers
    const extendedFourCount =
      (indexExtended ? 1 : 0) +
      (middleExtended ? 1 : 0) +
      (ringExtended ? 1 : 0) +
      (pinkyExtended ? 1 : 0);

    const candidates: { gesture: GoofyHandGestureType; score: number; isDynamic?: boolean }[] = [];

    // ─────────────────────────────────────────────────────────────
    // DYNAMIC GESTURES: SWIPE LEFT & SWIPE RIGHT
    // Temporal velocity buffer over past 250ms
    // ─────────────────────────────────────────────────────────────
    this.velocityHistory.push({ x: wrist.x, y: wrist.y, time: timestamp });
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

        if (speed > 1.15 && Math.abs(vx) > Math.abs(vy) * 1.35) {
          this.lastSwipeTime = timestamp;
          if (vx > 0) {
            candidates.push({ gesture: 'SWIPE_RIGHT', score: 0.94, isDynamic: true });
          } else {
            candidates.push({ gesture: 'SWIPE_LEFT', score: 0.94, isDynamic: true });
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 1: PINCH
    // Distance between thumb tip and index tip with hysteresis
    // ─────────────────────────────────────────────────────────────
    const pinchRawDist = this.dist3D(thumbTip, indexTip);
    const normalizedPinchDist = pinchRawDist / palmScale;
    let isPinching = this.lastPinchState;
    if (this.lastPinchState) {
      if (normalizedPinchDist > 0.45) isPinching = false;
    } else {
      if (normalizedPinchDist < 0.32) isPinching = true;
    }
    this.lastPinchState = isPinching;

    if (isPinching) {
      candidates.push({
        gesture: 'PINCH',
        score: Math.min(0.98, Math.max(0.75, 1.0 - (normalizedPinchDist - 0.1) * 2)),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 2: THUMBS UP
    // 4 fingers curled, thumb extended vertically upward (y smaller than IP)
    // ─────────────────────────────────────────────────────────────
    const thumbPointingUp = thumbTip.y < thumbIP.y - 0.035 && thumbTip.y < indexMCP.y;
    if (thumbPointingUp && indexCurled && middleCurled && ringCurled && pinkyCurled) {
      candidates.push({
        gesture: 'THUMBS_UP',
        score: 0.96,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 3: THUMBS DOWN
    // 4 fingers curled, thumb extended vertically downward (y larger than IP)
    // ─────────────────────────────────────────────────────────────
    const thumbPointingDown = thumbTip.y > thumbIP.y + 0.035 && thumbTip.y > wrist.y;
    if (thumbPointingDown && indexCurled && middleCurled && ringCurled && pinkyCurled) {
      candidates.push({
        gesture: 'THUMBS_DOWN',
        score: 0.95,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 4: CLOSED FIST
    // All 4 fingers curled and thumb tucked/curled
    // ─────────────────────────────────────────────────────────────
    if (indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbPointingUp && !thumbPointingDown) {
      candidates.push({
        gesture: 'CLOSED_FIST',
        score: 0.94,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 5: POINTING
    // Index finger extended, other 3 fingers curled, non-pinch
    // ─────────────────────────────────────────────────────────────
    if (indexExtended && middleCurled && ringCurled && pinkyCurled && !isPinching) {
      candidates.push({
        gesture: 'POINTING',
        score: 0.93,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 6: PEACE SIGN (V-SIGN)
    // Index and middle fingers extended in a V-shape, ring & pinky curled
    // ─────────────────────────────────────────────────────────────
    if (indexExtended && middleExtended && ringCurled && pinkyCurled && !isPinching) {
      const tipsDist = this.dist2D(indexTip, middleTip) / palmScale;
      if (tipsDist > 0.22) {
        candidates.push({
          gesture: 'PEACE_SIGN',
          score: 0.93,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 7: THREE FINGERS
    // Index, middle, and ring extended, pinky curled
    // ─────────────────────────────────────────────────────────────
    if (indexExtended && middleExtended && ringExtended && pinkyCurled && !isPinching) {
      candidates.push({
        gesture: 'THREE_FINGERS',
        score: 0.92,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 8: FOUR FINGERS
    // All 4 non-thumb fingers extended, thumb tucked
    // ─────────────────────────────────────────────────────────────
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbTucked) {
      candidates.push({
        gesture: 'FOUR_FINGERS',
        score: 0.92,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GESTURE 9 & 10: FIVE FINGERS / OPEN PALM
    // All 5 fingers extended and spread outward
    // ─────────────────────────────────────────────────────────────
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
      candidates.push({
        gesture: 'FIVE_FINGERS',
        score: 0.95,
      });
      candidates.push({
        gesture: 'OPEN_PALM',
        score: 0.94,
      });
    } else if (extendedFourCount === 4) {
      candidates.push({
        gesture: 'OPEN_PALM',
        score: 0.88,
      });
    }

    // Sort by priority (dynamic actions take precedence)
    candidates.sort((a, b) => {
      if (a.isDynamic && !b.isDynamic) return -1;
      if (!a.isDynamic && b.isDynamic) return 1;
      return b.score - a.score;
    });

    const top = candidates[0];
    if (top) {
      const meta = GOOFY_HAND_METADATA[top.gesture];
      return {
        gesture: top.gesture,
        handedness,
        confidence: Math.round(top.score * 100) / 100,
        label: meta ? meta.label : top.gesture,
        comicCaption: meta ? meta.defaultCaption : 'GESTURE DETECTED',
        isDynamic: top.isDynamic,
      };
    }

    return {
      gesture: null,
      handedness,
      confidence: 0,
      label: 'HAND TRACKED',
      comicCaption: 'HOLD A RECOGNISABLE GESTURE TO TRIGGER MEMES',
    };
  }

  reset(): void {
    this.lastPinchState = false;
    this.velocityHistory = [];
    this.lastSwipeTime = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HAND GESTURE TEMPORAL STATE MACHINE
// Enforces hold-time validation, dynamic fast-path, and single-trigger guarantees
// ─────────────────────────────────────────────────────────────────────────────

export interface HandStateMachineOptions {
  minHoldMs?: number;
  cooldownMs?: number;
}

export class GoofyHandStateMachine {
  private activeGesture: GoofyHandGestureType | null = null;
  private candidateGesture: GoofyHandGestureType | null = null;
  private candidateStartTime = 0;
  private lastTriggerTime = 0;
  private hasTriggeredCurrentGesture = false;

  private minHoldMs: number;
  private cooldownMs: number;

  constructor(options: HandStateMachineOptions = {}) {
    this.minHoldMs = options.minHoldMs ?? 160;
    this.cooldownMs = options.cooldownMs ?? 750;
  }

  updateConfig(options: HandStateMachineOptions): void {
    if (options.minHoldMs !== undefined) this.minHoldMs = options.minHoldMs;
    if (options.cooldownMs !== undefined) this.cooldownMs = options.cooldownMs;
  }

  process(
    classification: HandClassificationResult,
    timestamp = performance.now()
  ): {
    triggered: boolean;
    gesture: GoofyHandGestureType | null;
    handedness: 'Left' | 'Right';
  } {
    const { gesture, handedness, isDynamic } = classification;

    // Tracking Lost / No Gesture
    if (!gesture) {
      this.activeGesture = null;
      this.candidateGesture = null;
      this.candidateStartTime = 0;
      this.hasTriggeredCurrentGesture = false;
      return { triggered: false, gesture: null, handedness };
    }

    // Dynamic Fast-Path (Swipes)
    if (isDynamic) {
      if (timestamp - this.lastTriggerTime >= this.cooldownMs) {
        this.lastTriggerTime = timestamp;
        this.activeGesture = gesture;
        return { triggered: true, gesture, handedness };
      }
      return { triggered: false, gesture, handedness };
    }

    // Static Gesture: Candidate evaluation
    if (gesture !== this.candidateGesture) {
      this.candidateGesture = gesture;
      this.candidateStartTime = timestamp;
      this.hasTriggeredCurrentGesture = false;
      return { triggered: false, gesture, handedness };
    }

    // Check hold duration
    const heldDuration = timestamp - this.candidateStartTime;
    if (heldDuration >= this.minHoldMs) {
      this.activeGesture = gesture;

      // Single-trigger guarantee: fire only once while held, respecting cooldown
      if (!this.hasTriggeredCurrentGesture) {
        if (timestamp - this.lastTriggerTime >= this.cooldownMs) {
          this.hasTriggeredCurrentGesture = true;
          this.lastTriggerTime = timestamp;
          return { triggered: true, gesture, handedness };
        }
      }
    }

    return { triggered: false, gesture, handedness };
  }

  reset(): void {
    this.activeGesture = null;
    this.candidateGesture = null;
    this.candidateStartTime = 0;
    this.lastTriggerTime = 0;
    this.hasTriggeredCurrentGesture = false;
  }
}
