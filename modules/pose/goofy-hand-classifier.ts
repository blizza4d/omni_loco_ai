import { Landmark3D } from '../hand/types';
import {
  GoofyHandGestureType,
  GoofyDualHandComboId,
  HandClassificationResult,
  HandRecognitionState,
  HandStateMachineResult,
  GOOFY_HAND_METADATA,
} from './goofy-types';

interface VelocityPoint {
  x: number;
  y: number;
  time: number;
}

interface FingerEvalResult {
  isExtended: boolean;
  isCurled: boolean;
  extensionRatio: number;
}

export class GoofyHandClassifier {
  // Separate per-hand tracking state to prevent dual-hand contamination
  private lastPinchStates: Map<'Left' | 'Right', boolean> = new Map();
  private velocityHistories: Map<'Left' | 'Right', VelocityPoint[]> = new Map();
  private lastSwipeTimes: Map<'Left' | 'Right', number> = new Map();
  private smoothedLandmarks: Map<'Left' | 'Right', Landmark3D[]> = new Map();

  private swipeCooldownMs = 600;
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
   * Anatomical finger state evaluation using proximal phalanx normalization
   * and joint collinearity (scale-invariant and orientation-invariant).
   */
  private evaluateFinger(
    mcp: Landmark3D,
    pip: Landmark3D,
    dip: Landmark3D,
    tip: Landmark3D,
    wrist: Landmark3D
  ): FingerEvalResult {
    const proxLen = Math.max(0.001, this.dist3D(mcp, pip));
    const mcpToTip = this.dist3D(mcp, tip);
    const wristToTip = this.dist3D(wrist, tip);
    const wristToPip = this.dist3D(wrist, pip);

    // Directional collinearity dot product
    const v1 = {
      x: (pip.x - mcp.x) / proxLen,
      y: (pip.y - mcp.y) / proxLen,
      z: ((pip.z || 0) - (mcp.z || 0)) / proxLen,
    };
    const dPipTip = Math.max(0.001, this.dist3D(pip, tip));
    const v2 = {
      x: (tip.x - pip.x) / dPipTip,
      y: (tip.y - pip.y) / dPipTip,
      z: ((tip.z || 0) - (pip.z || 0)) / dPipTip,
    };
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

    const extensionRatio = mcpToTip / proxLen;

    // Full straight extension
    const isExtended =
      extensionRatio > 1.62 &&
      wristToTip > wristToPip * 1.04 &&
      dot > 0.40;

    // Curled tightly into palm
    const isCurled =
      (extensionRatio < 1.25 || dot < 0.15) &&
      mcpToTip < proxLen * 1.35;

    return {
      isExtended,
      isCurled: !isExtended && isCurled,
      extensionRatio,
    };
  }

  /**
   * Classify 21 3D hand landmarks into one of the supported Goofy hand gestures.
   * If hand posture is ambiguous or unrecognised, returns gesture: null (UNKNOWN).
   */
  classify(
    rawLandmarks: Landmark3D[],
    handedness: 'Left' | 'Right' = 'Right',
    timestamp = performance.now(),
    isMirrored = false
  ): HandClassificationResult {
    if (!rawLandmarks || rawLandmarks.length < 21) {
      this.smoothedLandmarks.delete(handedness);
      this.velocityHistories.delete(handedness);
      this.lastPinchStates.delete(handedness);
      return {
        gesture: null,
        handedness,
        confidence: 0,
        label: 'NO HAND DETECTED',
        comicCaption: 'SHOW YOUR HAND TO TRIGGER MEMES!',
        fingerCount: 0,
        rejectionReason: 'NO_LANDMARKS',
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
    const indexDIP = landmarks[7]!;
    const indexTip = landmarks[8]!;

    const middleMCP = landmarks[9]!;
    const middlePIP = landmarks[10]!;
    const middleDIP = landmarks[11]!;
    const middleTip = landmarks[12]!;

    const ringMCP = landmarks[13]!;
    const ringPIP = landmarks[14]!;
    const ringDIP = landmarks[15]!;
    const ringTip = landmarks[16]!;

    const pinkyMCP = landmarks[17]!;
    const pinkyPIP = landmarks[18]!;
    const pinkyDIP = landmarks[19]!;
    const pinkyTip = landmarks[20]!;

    // Invariant Palm Scale Normalization (wrist to middle MCP)
    const palmScale = Math.max(0.01, this.dist3D(wrist, middleMCP));

    // Evaluate non-thumb fingers with invariant bone ratios
    const indexState = this.evaluateFinger(indexMCP, indexPIP, indexDIP, indexTip, wrist);
    const middleState = this.evaluateFinger(middleMCP, middlePIP, middleDIP, middleTip, wrist);
    const ringState = this.evaluateFinger(ringMCP, ringPIP, ringDIP, ringTip, wrist);
    const pinkyState = this.evaluateFinger(pinkyMCP, pinkyPIP, pinkyDIP, pinkyTip, wrist);

    // Thumb State Evaluation
    const thumbProxLen = Math.max(0.001, this.dist3D(thumbMCP, thumbIP));
    const thumbMcpToTip = this.dist3D(thumbMCP, thumbTip);
    const thumbToPinky = this.dist3D(thumbTip, pinkyMCP) / palmScale;
    const thumbToIndex = this.dist3D(thumbTip, indexMCP) / palmScale;

    const thumbExtended =
      thumbMcpToTip > thumbProxLen * 1.30 &&
      (thumbToPinky > 0.70 || thumbToIndex > 0.45);

    const thumbTucked =
      thumbToPinky < 0.65 ||
      (thumbToIndex < 0.35 && thumbMcpToTip < thumbProxLen * 1.30);

    // Thumb Vertical Direction in screen space (y is inverted: smaller y is UP)
    const thumbPointingUp =
      thumbTip.y < thumbIP.y - 0.035 &&
      thumbTip.y < thumbMCP.y - 0.035;

    const thumbPointingDown =
      thumbTip.y > thumbIP.y + 0.035 &&
      thumbTip.y > thumbMCP.y + 0.035;

    // Count extended non-thumb fingers
    const extendedFourCount =
      (indexState.isExtended ? 1 : 0) +
      (middleState.isExtended ? 1 : 0) +
      (ringState.isExtended ? 1 : 0) +
      (pinkyState.isExtended ? 1 : 0);

    const curledFourCount =
      (indexState.isCurled ? 1 : 0) +
      (middleState.isCurled ? 1 : 0) +
      (ringState.isCurled ? 1 : 0) +
      (pinkyState.isCurled ? 1 : 0);

    const fingerCount = (thumbExtended ? 1 : 0) + extendedFourCount;

    // ─────────────────────────────────────────────────────────────
    // PINCH HYSTERESIS (Per-Hand Tracking)
    // ─────────────────────────────────────────────────────────────
    const pinchRawDist = this.dist3D(thumbTip, indexTip);
    const normalizedPinchDist = pinchRawDist / palmScale;
    let isPinching = this.lastPinchStates.get(handedness) || false;

    if (isPinching) {
      if (normalizedPinchDist > 0.38) isPinching = false;
    } else {
      if (normalizedPinchDist < 0.28) isPinching = true;
    }

    // Crucial Disambiguation: A complete 4-finger clenched fist cannot be a pinch!
    const indexTipToMCP = this.dist3D(indexTip, indexMCP) / palmScale;
    if (curledFourCount === 4 && indexTipToMCP < 0.35) {
      isPinching = false;
    }
    this.lastPinchStates.set(handedness, isPinching);

    const candidates: { gesture: GoofyHandGestureType; score: number; isDynamic?: boolean }[] = [];

    // ─────────────────────────────────────────────────────────────
    // DYNAMIC GESTURES: SWIPE LEFT & SWIPE RIGHT (Strict Per-Hand History)
    // ─────────────────────────────────────────────────────────────
    let vHistory = this.velocityHistories.get(handedness) || [];
    vHistory.push({ x: wrist.x, y: wrist.y, time: timestamp });
    const windowStart = timestamp - 250;
    vHistory = vHistory.filter((p) => p.time >= windowStart);
    this.velocityHistories.set(handedness, vHistory);

    const lastSwipe = this.lastSwipeTimes.get(handedness) || 0;
    if (vHistory.length >= 3 && timestamp - lastSwipe > this.swipeCooldownMs) {
      const oldest = vHistory[0]!;
      const newest = vHistory[vHistory.length - 1]!;
      const dt = (newest.time - oldest.time) / 1000;

      if (dt >= 0.08) {
        const rawDx = newest.x - oldest.x;
        const dx = isMirrored ? -rawDx : rawDx;
        const dy = newest.y - oldest.y;
        const vx = dx / dt;
        const vy = dy / dt;
        const speed = Math.sqrt(vx * vx + vy * vy);

        // Require deliberate lateral displacement (>= 15% screen width) and velocity dominance
        if (Math.abs(dx) >= 0.15 && speed >= 1.20 && Math.abs(vx) > Math.abs(vy) * 1.8) {
          this.lastSwipeTimes.set(handedness, timestamp);
          if (vx > 0) {
            candidates.push({ gesture: 'SWIPE_RIGHT', score: 0.95, isDynamic: true });
          } else {
            candidates.push({ gesture: 'SWIPE_LEFT', score: 0.95, isDynamic: true });
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC GESTURES EVALUATION (Strict Mutual Exclusivity)
    // ─────────────────────────────────────────────────────────────

    // 1. PINCH
    // Index and thumb form pinch loop, index not curled into palm, and other fingers not all in fist
    if (isPinching && curledFourCount < 4 && indexTipToMCP > 0.35) {
      candidates.push({
        gesture: 'PINCH',
        score: Math.min(0.98, Math.max(0.80, 1.0 - (normalizedPinchDist - 0.1) * 2)),
      });
    }

    // 2. THUMBS UP
    // All 4 non-thumb fingers are curled, thumb extended vertically upward
    else if (curledFourCount === 4 && thumbPointingUp && !thumbPointingDown) {
      candidates.push({
        gesture: 'THUMBS_UP',
        score: 0.96,
      });
    }

    // 3. THUMBS DOWN
    // All 4 non-thumb fingers are curled, thumb extended vertically downward
    else if (curledFourCount === 4 && thumbPointingDown && !thumbPointingUp) {
      candidates.push({
        gesture: 'THUMBS_DOWN',
        score: 0.96,
      });
    }

    // 4. CLOSED FIST
    // All 4 non-thumb fingers are curled tightly into palm, thumb not pointing up or down
    else if (curledFourCount === 4 && !thumbPointingUp && !thumbPointingDown && !isPinching) {
      candidates.push({
        gesture: 'CLOSED_FIST',
        score: 0.95,
      });
    }

    // 5. POINTING
    // Index extended, middle, ring, pinky curled, not pinching
    else if (
      indexState.isExtended &&
      middleState.isCurled &&
      ringState.isCurled &&
      pinkyState.isCurled &&
      !isPinching
    ) {
      candidates.push({
        gesture: 'POINTING',
        score: 0.94,
      });
    }

    // 6. PEACE SIGN
    // Index and middle extended in a distinct V, ring and pinky curled
    else if (
      indexState.isExtended &&
      middleState.isExtended &&
      ringState.isCurled &&
      pinkyState.isCurled &&
      !isPinching
    ) {
      const tipsDist = this.dist2D(indexTip, middleTip) / palmScale;
      if (tipsDist > 0.18) {
        candidates.push({
          gesture: 'PEACE_SIGN',
          score: 0.94,
        });
      }
    }

    // 7. THREE FINGERS
    // Index, middle, and ring extended, pinky curled, not pinching
    else if (
      indexState.isExtended &&
      middleState.isExtended &&
      ringState.isExtended &&
      pinkyState.isCurled &&
      !isPinching
    ) {
      candidates.push({
        gesture: 'THREE_FINGERS',
        score: 0.93,
      });
    }

    // 8. FOUR FINGERS
    // All 4 non-thumb fingers extended, thumb tucked
    else if (extendedFourCount === 4 && thumbTucked) {
      candidates.push({
        gesture: 'FOUR_FINGERS',
        score: 0.93,
      });
    }

    // 9 & 10. FIVE FINGERS vs OPEN PALM
    else if (extendedFourCount === 4) {
      const spread = this.dist3D(thumbTip, pinkyTip) / palmScale;
      if (thumbExtended && spread > 2.15) {
        // Radially spread wide in counting fan
        candidates.push({
          gesture: 'FIVE_FINGERS',
          score: 0.96,
        });
      } else {
        // Flat stop palm facing camera
        candidates.push({
          gesture: 'OPEN_PALM',
          score: 0.94,
        });
      }
    }

    // Sort by priority (dynamic actions take precedence only if genuine lateral movement detected)
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
        fingerStates: {
          thumb: thumbExtended,
          index: indexState.isExtended,
          middle: middleState.isExtended,
          ring: ringState.isExtended,
          pinky: pinkyState.isExtended,
        },
      };
    }

    // STRICT UNKNOWN STATE: Ambiguous or unclassified hand posture
    return {
      gesture: null,
      handedness,
      confidence: 0,
      label: 'UNKNOWN GESTURE',
      comicCaption: 'HOLD A RECOGNISABLE GESTURE TO TRIGGER MEMES',
      fingerCount,
      rejectionReason: 'AMBIGUOUS_GESTURE',
      fingerStates: {
        thumb: thumbExtended,
        index: indexState.isExtended,
        middle: middleState.isExtended,
        ring: ringState.isExtended,
        pinky: pinkyState.isExtended,
      },
    };
  }

  reset(): void {
    this.lastPinchStates.clear();
    this.velocityHistories.clear();
    this.lastSwipeTimes.clear();
    this.smoothedLandmarks.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HAND GESTURE TEMPORAL STATE MACHINE (Strict Validation & Release Protocol)
// ─────────────────────────────────────────────────────────────────────────────

export interface HandStateMachineOptions {
  minHoldMs?: number;
  cooldownMs?: number;
  releaseThresholdMs?: number;
}

export class GoofyHandStateMachine {
  private activeGesture: GoofyHandGestureType | null = null;
  private candidateGesture: GoofyHandGestureType | null = null;
  private candidateStartTime = 0;
  private lastTriggerTime = 0;
  private lastTriggeredGesture: GoofyHandGestureType | null = null;
  private hasTriggeredCurrentGesture = false;

  // Release detection
  private nullGestureStartTime = 0;
  private releaseThresholdMs: number;

  // Sliding consensus voting window (N = 6 frames / ~150ms)
  private rollingWindow: { gesture: GoofyHandGestureType | null; time: number }[] = [];
  private votingWindowMs = 150;
  private consensusThreshold = 0.60;

  private minHoldMs: number;
  private cooldownMs: number;

  constructor(options: HandStateMachineOptions = {}) {
    this.minHoldMs = options.minHoldMs ?? 200;
    this.cooldownMs = options.cooldownMs ?? 750;
    this.releaseThresholdMs = options.releaseThresholdMs ?? 140;
  }

  updateConfig(options: HandStateMachineOptions): void {
    if (options.minHoldMs !== undefined) this.minHoldMs = options.minHoldMs;
    if (options.cooldownMs !== undefined) this.cooldownMs = options.cooldownMs;
    if (options.releaseThresholdMs !== undefined) this.releaseThresholdMs = options.releaseThresholdMs;
  }

  process(
    classification: HandClassificationResult,
    timestamp = performance.now()
  ): HandStateMachineResult {
    const { gesture: rawGesture, handedness, isDynamic, confidence } = classification;

    // 1. Maintain sliding consensus voting window
    if (this.rollingWindow.length > 0 && timestamp < this.rollingWindow[this.rollingWindow.length - 1]!.time) {
      this.rollingWindow = this.rollingWindow.filter((w) => w.time <= timestamp);
    }
    this.rollingWindow.push({ gesture: rawGesture, time: timestamp });
    const cutoff = timestamp - this.votingWindowMs;
    this.rollingWindow = this.rollingWindow.filter((w) => w.time >= cutoff);

    // Dynamic Swipes Fast-Path (verified lateral travel from classifier)
    if (isDynamic && rawGesture) {
      if (timestamp - this.lastTriggerTime >= this.cooldownMs) {
        this.lastTriggerTime = timestamp;
        this.lastTriggeredGesture = rawGesture;
        this.activeGesture = rawGesture;
        this.hasTriggeredCurrentGesture = true;
        return {
          triggered: true,
          gesture: rawGesture,
          rawGesture,
          stabilizedGesture: rawGesture,
          handedness,
          state: 'TRIGGERED',
          holdDurationMs: 0,
          confidence,
          rejectionReason: null,
        };
      }
      return {
        triggered: false,
        gesture: rawGesture,
        rawGesture,
        stabilizedGesture: rawGesture,
        handedness,
        state: 'COOLDOWN',
        holdDurationMs: 0,
        confidence,
        rejectionReason: 'COOLDOWN_ACTIVE',
      };
    }

    // 2. Compute majority consensus gesture in rolling window
    const counts = new Map<GoofyHandGestureType, number>();
    for (const item of this.rollingWindow) {
      if (item.gesture) {
        counts.set(item.gesture, (counts.get(item.gesture) || 0) + 1);
      }
    }

    let stabilizedGesture: GoofyHandGestureType | null = null;
    let highestCount = 0;
    counts.forEach((count, g) => {
      if (count > highestCount) {
        highestCount = count;
        stabilizedGesture = g;
      }
    });

    // Require at least consensusThreshold agreement in window
    const consensusRatio = this.rollingWindow.length > 0 ? highestCount / this.rollingWindow.length : 0;
    if (consensusRatio < this.consensusThreshold) {
      stabilizedGesture = null;
    }

    // 3. Handle Absence / Unknown Release
    if (!stabilizedGesture) {
      this.candidateGesture = null;
      this.candidateStartTime = 0;
      if (this.nullGestureStartTime === 0) {
        this.nullGestureStartTime = timestamp;
      }
      if (timestamp - this.nullGestureStartTime >= this.releaseThresholdMs) {
        // Clean release detected: allow re-triggering of next gesture
        this.hasTriggeredCurrentGesture = false;
        this.activeGesture = null;
      }

      return {
        triggered: false,
        gesture: null,
        rawGesture,
        stabilizedGesture: null,
        handedness,
        state: rawGesture === null ? 'NO_HANDS' : 'SEARCHING',
        holdDurationMs: 0,
        confidence: 0,
        rejectionReason: rawGesture === null ? 'NO_HANDS_DETECTED' : 'AMBIGUOUS_GESTURE',
      };
    }

    // Stabilized gesture exists: check if releasing previous trigger
    if (this.nullGestureStartTime > 0 && timestamp - this.nullGestureStartTime >= this.releaseThresholdMs) {
      this.hasTriggeredCurrentGesture = false;
      this.activeGesture = null;
    }
    this.nullGestureStartTime = 0;

    // 4. Candidate Tracking & Hold-Time Accumulation
    if (stabilizedGesture !== this.candidateGesture) {
      this.candidateGesture = stabilizedGesture;
      this.candidateStartTime = timestamp;
      this.hasTriggeredCurrentGesture = false;

      return {
        triggered: false,
        gesture: stabilizedGesture,
        rawGesture,
        stabilizedGesture,
        handedness,
        state: 'CANDIDATE',
        holdDurationMs: 0,
        confidence,
        rejectionReason: 'HOLDING_FOR_CONFIRMATION',
      };
    }

    const holdDurationMs = timestamp - this.candidateStartTime;

    // 5. Check if held long enough to achieve CONFIRMED status
    if (holdDurationMs < this.minHoldMs) {
      return {
        triggered: false,
        gesture: stabilizedGesture,
        rawGesture,
        stabilizedGesture,
        handedness,
        state: 'CANDIDATE',
        holdDurationMs,
        confidence,
        rejectionReason: `HOLDING_FOR_CONFIRMATION_${Math.round(holdDurationMs)}/${this.minHoldMs}`,
      };
    }

    // Confirmed stable hold achieved!
    this.activeGesture = stabilizedGesture;

    // 6. Single-Trigger Guarantee: Fire only once per continuous hold
    if (this.hasTriggeredCurrentGesture) {
      return {
        triggered: false,
        gesture: stabilizedGesture,
        rawGesture,
        stabilizedGesture,
        handedness,
        state: 'TRIGGERED',
        holdDurationMs,
        confidence,
        rejectionReason: 'WAITING_FOR_RELEASE',
      };
    }

    // 7. Check Cooldown
    const isDistinctSecondary =
      this.lastTriggeredGesture !== null && stabilizedGesture !== this.lastTriggeredGesture;
    const requiredCooldown = isDistinctSecondary
      ? Math.min(350, this.cooldownMs * 0.5)
      : this.cooldownMs;

    if (timestamp - this.lastTriggerTime < requiredCooldown) {
      return {
        triggered: false,
        gesture: stabilizedGesture,
        rawGesture,
        stabilizedGesture,
        handedness,
        state: 'COOLDOWN',
        holdDurationMs,
        confidence,
        rejectionReason: 'COOLDOWN_ACTIVE',
      };
    }

    // Genuine confirmed recognition event!
    this.hasTriggeredCurrentGesture = true;
    this.lastTriggerTime = timestamp;
    this.lastTriggeredGesture = stabilizedGesture;

    return {
      triggered: true,
      gesture: stabilizedGesture,
      rawGesture,
      stabilizedGesture,
      handedness,
      state: 'CONFIRMED',
      holdDurationMs,
      confidence,
      rejectionReason: null,
    };
  }

  reset(): void {
    this.activeGesture = null;
    this.candidateGesture = null;
    this.candidateStartTime = 0;
    this.lastTriggerTime = 0;
    this.lastTriggeredGesture = null;
    this.hasTriggeredCurrentGesture = false;
    this.nullGestureStartTime = 0;
    this.rollingWindow = [];
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
  private nullComboStartTime = 0;

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
      this.candidateCombo = null;
      this.candidateStartTime = 0;
      if (this.nullComboStartTime === 0) {
        this.nullComboStartTime = timestamp;
      }
      if (timestamp - this.nullComboStartTime >= 140) {
        this.activeCombo = null;
        this.hasTriggeredCurrentCombo = false;
      }
      return { status: 'IDLE', triggered: false, combo: null, activeCombo: null };
    }

    if (this.nullComboStartTime > 0 && timestamp - this.nullComboStartTime >= 140) {
      this.activeCombo = null;
      this.hasTriggeredCurrentCombo = false;
    }
    this.nullComboStartTime = 0;

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
