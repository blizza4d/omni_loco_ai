import { Landmark3D } from '../hand/types';
import {
  GoofyHandGestureType,
  GoofyDualHandComboId,
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
  private smoothedLandmarks: Map<'Left' | 'Right', Landmark3D[]> = new Map();
  private smoothingAlpha = 0.68;

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
   * Exponential moving average jitter-smoothing filter per hand
   */
  private applySmoothing(raw: Landmark3D[], handedness: 'Left' | 'Right'): Landmark3D[] {
    const prev = this.smoothedLandmarks.get(handedness);
    if (!prev || prev.length !== raw.length) {
      const cloned = raw.map((l) => ({ ...l }));
      this.smoothedLandmarks.set(handedness, cloned);
      return cloned;
    }

    // Teleportation / new hand check
    const wristJump = this.dist2D(raw[0]!, prev[0]!);
    if (wristJump > 0.35) {
      const cloned = raw.map((l) => ({ ...l }));
      this.smoothedLandmarks.set(handedness, cloned);
      return cloned;
    }

    const smoothed = raw.map((curr, idx) => {
      const p = prev[idx]!;
      const a = this.smoothingAlpha;
      return {
        x: a * curr.x + (1 - a) * p.x,
        y: a * curr.y + (1 - a) * p.y,
        z: curr.z !== undefined && p.z !== undefined ? a * curr.z + (1 - a) * p.z : curr.z,
      };
    });

    this.smoothedLandmarks.set(handedness, smoothed);
    return smoothed;
  }

  /**
   * Classify 21 3D hand landmarks into one of the 12 supported Goofy hand gestures
   */
  classify(
    rawLandmarks: Landmark3D[],
    handedness: 'Left' | 'Right' = 'Right',
    timestamp = performance.now(),
    isMirrored = false
  ): HandClassificationResult {
    if (!rawLandmarks || rawLandmarks.length < 21) {
      this.smoothedLandmarks.delete(handedness);
      return {
        gesture: null,
        handedness,
        confidence: 0,
        label: 'NO HAND DETECTED',
        comicCaption: 'SHOW YOUR HAND TO TRIGGER MEMES!',
        fingerCount: 0,
      };
    }

    const landmarks = this.applySmoothing(rawLandmarks, handedness);

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
        const rawVx = (newest.x - oldest.x) / dt;
        const vx = isMirrored ? -rawVx : rawVx;
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

    // Count total extended fingers (0 to 5)
    const fingerCount = (thumbExtended ? 1 : 0) + extendedFourCount;

    // ─────────────────────────────────────────────────────────────
    // GESTURE 9 & 10: FIVE FINGERS vs OPEN PALM
    // Resolves overlapping classification:
    // FIVE FINGERS: radially spread wide in counting gesture (span > 2.2 * palmScale)
    // OPEN PALM: flat stop palm facing camera (span <= 2.2 * palmScale)
    // ─────────────────────────────────────────────────────────────
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
      const spread = this.dist3D(thumbTip, pinkyTip);
      const normalizedSpread = spread / palmScale;

      if (normalizedSpread > 2.2) {
        candidates.push({
          gesture: 'FIVE_FINGERS',
          score: 0.96,
        });
        candidates.push({
          gesture: 'OPEN_PALM',
          score: 0.90,
        });
      } else {
        candidates.push({
          gesture: 'OPEN_PALM',
          score: 0.96,
        });
        candidates.push({
          gesture: 'FIVE_FINGERS',
          score: 0.90,
        });
      }
    } else if (extendedFourCount === 4) {
      candidates.push({
        gesture: 'OPEN_PALM',
        score: 0.91,
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
        fingerCount,
        isDynamic: top.isDynamic,
      };
    }

    return {
      gesture: null,
      handedness,
      confidence: 0,
      label: 'HAND TRACKED',
      comicCaption: 'HOLD A RECOGNISABLE GESTURE TO TRIGGER MEMES',
      fingerCount,
    };
  }

  reset(): void {
    this.lastPinchState = false;
    this.velocityHistory = [];
    this.lastSwipeTime = 0;
    this.smoothedLandmarks.clear();
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
  private lastTriggeredGesture: GoofyHandGestureType | null = null;
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

    // Adaptive cooldown: redundant triggers of the SAME gesture use the full cooldownMs (750ms).
    // An intentional transition to a distinct secondary gesture uses an adaptive secondary cooldown (350ms)
    // so deliberate secondary gestures are not dropped while rapid redundant inputs are throttled.
    const isDistinctSecondary =
      this.lastTriggeredGesture !== null && gesture !== this.lastTriggeredGesture;
    const requiredCooldown = isDistinctSecondary
      ? Math.min(350, this.cooldownMs * 0.5)
      : this.cooldownMs;

    // Dynamic Fast-Path (Swipes)
    if (isDynamic) {
      if (timestamp - this.lastTriggerTime >= requiredCooldown) {
        this.lastTriggerTime = timestamp;
        this.lastTriggeredGesture = gesture;
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

      // Single-trigger guarantee: fire only once while held, respecting adaptive cooldown
      if (!this.hasTriggeredCurrentGesture) {
        if (timestamp - this.lastTriggerTime >= requiredCooldown) {
          this.hasTriggeredCurrentGesture = true;
          this.lastTriggerTime = timestamp;
          this.lastTriggeredGesture = gesture;
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
    this.lastTriggeredGesture = null;
    this.hasTriggeredCurrentGesture = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DUAL-HAND COMBINATIONS ENGINE
// Detects simultaneous multi-hand gestures and provides hold-time gating
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects whether left and right hand gestures form a recognized dual-hand combo
 */
export function detectDualHandCombo(
  leftGesture: GoofyHandGestureType | null,
  rightGesture: GoofyHandGestureType | null
): { combo: GoofyDualHandComboId | null; confidence: number } {
  if (!leftGesture || !rightGesture) return { combo: null, confidence: 0 };

  // 1. PERFECT_TEN: Both hands showing FIVE_FINGERS (all 10 digits)
  if (leftGesture === 'FIVE_FINGERS' && rightGesture === 'FIVE_FINGERS') {
    return { combo: 'PERFECT_TEN', confidence: 0.99 };
  }

  // 2. DOUBLE_THREE: Both hands showing THREE_FINGERS (3 + 3 = 6000 MW energy)
  if (leftGesture === 'THREE_FINGERS' && rightGesture === 'THREE_FINGERS') {
    return { combo: 'DOUBLE_THREE', confidence: 0.98 };
  }

  // 3. SECRET_YOU_ARE_BREATHTAKING: Both hands pointing directly forward (dual finger guns)
  if (leftGesture === 'POINTING' && rightGesture === 'POINTING') {
    return { combo: 'SECRET_YOU_ARE_BREATHTAKING', confidence: 0.98 };
  }

  // 4. SECRET_HEART_HANDS: Both hands in pinch formation forming a heart
  if (leftGesture === 'PINCH' && rightGesture === 'PINCH') {
    return { combo: 'SECRET_HEART_HANDS', confidence: 0.98 };
  }

  // 5. SECRET_MATRIX_DODGE: One hand open palm (bullet stop) and other hand pointing (laser trigger)
  if (
    (leftGesture === 'OPEN_PALM' && rightGesture === 'POINTING') ||
    (leftGesture === 'POINTING' && rightGesture === 'OPEN_PALM')
  ) {
    return { combo: 'SECRET_MATRIX_DODGE', confidence: 0.97 };
  }

  // 6. ROCK_PAPER_SCISSORS: Split dual duel between two hands
  const isRock = (g: GoofyHandGestureType) => g === 'CLOSED_FIST';
  const isPaper = (g: GoofyHandGestureType) => g === 'OPEN_PALM' || g === 'FIVE_FINGERS';
  const isScissors = (g: GoofyHandGestureType) => g === 'PEACE_SIGN';

  if (
    (isRock(leftGesture) && isPaper(rightGesture)) ||
    (isPaper(leftGesture) && isRock(rightGesture)) ||
    (isRock(leftGesture) && isScissors(rightGesture)) ||
    (isScissors(leftGesture) && isRock(rightGesture)) ||
    (isPaper(leftGesture) && isScissors(rightGesture)) ||
    (isScissors(leftGesture) && isPaper(rightGesture))
  ) {
    return { combo: 'ROCK_PAPER_SCISSORS', confidence: 0.96 };
  }

  // 7. DOUBLE_THUMBS_UP (Both Thumbs Up)
  if (leftGesture === 'THUMBS_UP' && rightGesture === 'THUMBS_UP') {
    return { combo: 'DOUBLE_THUMBS_UP', confidence: 0.98 };
  }

  // 8. DOUBLE_PEACE (Double V-Sign)
  if (leftGesture === 'PEACE_SIGN' && rightGesture === 'PEACE_SIGN') {
    return { combo: 'DOUBLE_PEACE', confidence: 0.96 };
  }

  // 9. BOTH_HANDS_FIST (Double Brofist)
  if (leftGesture === 'CLOSED_FIST' && rightGesture === 'CLOSED_FIST') {
    return { combo: 'BOTH_HANDS_FIST', confidence: 0.96 };
  }

  // 10. THUMBS_UP_AND_DOWN (Contradictory Mixed Signals)
  if (
    (leftGesture === 'THUMBS_UP' && rightGesture === 'THUMBS_DOWN') ||
    (leftGesture === 'THUMBS_DOWN' && rightGesture === 'THUMBS_UP')
  ) {
    return { combo: 'THUMBS_UP_AND_DOWN', confidence: 0.95 };
  }

  // 11. BOTH_HANDS_OPEN (Both Hands Open / Five Fingers fallback)
  const isOpen = (g: GoofyHandGestureType) => g === 'OPEN_PALM' || g === 'FIVE_FINGERS';
  if (isOpen(leftGesture) && isOpen(rightGesture)) {
    return { combo: 'BOTH_HANDS_OPEN', confidence: 0.95 };
  }

  return { combo: null, confidence: 0 };
}

export class GoofyDualHandStateMachine {
  private activeCombo: GoofyDualHandComboId | null = null;
  private candidateCombo: GoofyDualHandComboId | null = null;
  private candidateStartTime = 0;
  private lastTriggerTime = 0;
  private lastTriggeredCombo: GoofyDualHandComboId | null = null;
  private hasTriggeredCurrentCombo = false;

  private minHoldMs: number;
  private cooldownMs: number;

  constructor(options: HandStateMachineOptions = {}) {
    this.minHoldMs = options.minHoldMs ?? 180;
    this.cooldownMs = options.cooldownMs ?? 800;
  }

  updateConfig(options: HandStateMachineOptions): void {
    if (options.minHoldMs !== undefined) this.minHoldMs = options.minHoldMs;
    if (options.cooldownMs !== undefined) this.cooldownMs = options.cooldownMs;
  }

  process(
    leftOrResult: GoofyHandGestureType | { combo: GoofyDualHandComboId | null; confidence?: number } | null,
    rightOrTimestamp?: GoofyHandGestureType | number | null,
    timestampParam?: number
  ): {
    status: 'IDLE' | 'CANDIDATE' | 'TRIGGERED' | 'COOLDOWN';
    triggered: boolean;
    combo: GoofyDualHandComboId | null;
    activeCombo: GoofyDualHandComboId | null;
  } {
    let combo: GoofyDualHandComboId | null = null;
    let timestamp = performance.now();

    if (leftOrResult && typeof leftOrResult === 'object' && 'combo' in leftOrResult) {
      combo = leftOrResult.combo;
      if (typeof rightOrTimestamp === 'number') {
        timestamp = rightOrTimestamp;
      }
    } else {
      combo = detectDualHandCombo(
        leftOrResult as GoofyHandGestureType | null,
        rightOrTimestamp as GoofyHandGestureType | null
      ).combo;
      if (typeof timestampParam === 'number') {
        timestamp = timestampParam;
      }
    }

    if (!combo) {
      this.activeCombo = null;
      this.candidateCombo = null;
      this.candidateStartTime = 0;
      this.hasTriggeredCurrentCombo = false;
      return { status: 'IDLE', triggered: false, combo: null, activeCombo: null };
    }

    if (combo !== this.candidateCombo) {
      this.candidateCombo = combo;
      this.candidateStartTime = timestamp;
      this.hasTriggeredCurrentCombo = false;
      return { status: 'CANDIDATE', triggered: false, combo, activeCombo: this.activeCombo };
    }

    // Adaptive cooldown: redundant triggers of the SAME combo use the full cooldownMs.
    // Transition to a distinct secondary combo uses an adaptive secondary cooldown (380ms).
    const isDistinctSecondary =
      this.lastTriggeredCombo !== null && combo !== this.lastTriggeredCombo;
    const requiredCooldown = isDistinctSecondary
      ? Math.min(380, this.cooldownMs * 0.5)
      : this.cooldownMs;

    const heldDuration = timestamp - this.candidateStartTime;
    if (heldDuration >= this.minHoldMs) {
      this.activeCombo = combo;

      if (!this.hasTriggeredCurrentCombo) {
        if (timestamp - this.lastTriggerTime >= requiredCooldown) {
          this.hasTriggeredCurrentCombo = true;
          this.lastTriggerTime = timestamp;
          this.lastTriggeredCombo = combo;
          return { status: 'TRIGGERED', triggered: true, combo, activeCombo: combo };
        }
        return { status: 'COOLDOWN', triggered: false, combo, activeCombo: combo };
      }
      return { status: 'COOLDOWN', triggered: false, combo, activeCombo: combo };
    }

    return { status: 'CANDIDATE', triggered: false, combo, activeCombo: this.activeCombo };
  }

  reset(): void {
    this.activeCombo = null;
    this.candidateCombo = null;
    this.candidateStartTime = 0;
    this.lastTriggerTime = 0;
    this.lastTriggeredCombo = null;
    this.hasTriggeredCurrentCombo = false;
  }
}
