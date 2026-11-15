import {
  GoofyFaceExpressionType,
  FaceClassificationResult,
  FaceRecognitionState,
  FaceStateMachineResult,
  GOOFY_FACE_METADATA,
} from './goofy-types';

export interface FaceLandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface FaceBlendshapeInput {
  categoryName: string;
  score: number;
}

export interface FaceClassifierSensitivityConfig {
  activationMultiplier: number;
  releaseMultiplier: number;
  minHoldMs: number;
}

export const FACE_SENSITIVITY_PROFILES: Record<
  'HIGH' | 'MEDIUM' | 'RELAXED',
  FaceClassifierSensitivityConfig
> = {
  HIGH: {
    activationMultiplier: 0.88,
    releaseMultiplier: 0.85,
    minHoldMs: 120,
  },
  MEDIUM: {
    activationMultiplier: 1.0,
    releaseMultiplier: 1.0,
    minHoldMs: 160,
  },
  RELAXED: {
    activationMultiplier: 1.15,
    releaseMultiplier: 1.15,
    minHoldMs: 220,
  },
};

export class GoofyFaceClassifier {
  private sensitivity: 'HIGH' | 'MEDIUM' | 'RELAXED' = 'HIGH';

  constructor(sensitivity: 'HIGH' | 'MEDIUM' | 'RELAXED' = 'HIGH') {
    this.sensitivity = sensitivity;
  }

  setSensitivity(sensitivity: 'HIGH' | 'MEDIUM' | 'RELAXED'): void {
    this.sensitivity = sensitivity;
  }

  /**
   * Euclidean 2D distance between two landmarks
   */
  private dist2D(a: FaceLandmarkPoint, b: FaceLandmarkPoint): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate Eye Aspect Ratio (EAR) from 6 canonical eyelid points
   */
  public calculateEAR(landmarks: FaceLandmarkPoint[], indices: number[]): number {
    if (landmarks.length < 468 || indices.length < 6) return 0.3;
    const p1 = landmarks[indices[0]!]!;
    const p2 = landmarks[indices[1]!]!;
    const p3 = landmarks[indices[2]!]!;
    const p4 = landmarks[indices[3]!]!;
    const p5 = landmarks[indices[4]!]!;
    const p6 = landmarks[indices[5]!]!;

    const vertical1 = this.dist2D(p2, p6);
    const vertical2 = this.dist2D(p3, p5);
    const horizontal = this.dist2D(p1, p4);

    if (horizontal < 0.001) return 0.3;
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  /**
   * Calculate Mouth Aspect Ratio (MAR)
   * Outer lips: top (13), bottom (14), left corner (61), right corner (291)
   */
  public calculateMAR(landmarks: FaceLandmarkPoint[]): number {
    if (landmarks.length < 468) return 0.2;
    const topLip = landmarks[13] || landmarks[0];
    const bottomLip = landmarks[14] || landmarks[17];
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];

    if (!topLip || !bottomLip || !leftCorner || !rightCorner) return 0.2;
    const vertical = this.dist2D(topLip, bottomLip);
    const horizontal = Math.max(0.001, this.dist2D(leftCorner, rightCorner));
    return vertical / horizontal;
  }

  /**
   * Classifies observable facial expression features from landmarks and ARKit blendshapes.
   */
  classify(
    landmarks: FaceLandmarkPoint[] | null | undefined,
    blendshapes: FaceBlendshapeInput[] | null | undefined
  ): FaceClassificationResult {
    if (!landmarks || landmarks.length < 468) {
      return {
        expression: null,
        confidence: 0,
        label: 'NO FACE',
        comicCaption: 'NO FACE DETECTED',
        rawScores: {},
        rejectionReason: 'MISSING_OR_INSUFFICIENT_LANDMARKS',
      };
    }

    // Convert blendshapes array to fast score lookup map
    const bMap: Record<string, number> = {};
    if (blendshapes && Array.isArray(blendshapes)) {
      for (let i = 0; i < blendshapes.length; i++) {
        const item = blendshapes[i];
        if (item && item.categoryName) {
          bMap[item.categoryName] = item.score;
        }
      }
    }

    // Key blendshape measurements
    const smileLeft = bMap['mouthSmileLeft'] || 0;
    const smileRight = bMap['mouthSmileRight'] || 0;
    const smileAvg = (smileLeft + smileRight) / 2;

    const jawOpen = bMap['jawOpen'] || 0;
    const mouthOpen = bMap['mouthFunnel'] || 0;

    const browInnerUp = bMap['browInnerUp'] || 0;
    const browOuterUpLeft = bMap['browOuterUpLeft'] || 0;
    const browOuterUpRight = bMap['browOuterUpRight'] || 0;
    const browUpAvg = Math.max(browInnerUp, (browOuterUpLeft + browOuterUpRight) / 2);

    const eyeWideLeft = bMap['eyeWideLeft'] || 0;
    const eyeWideRight = bMap['eyeWideRight'] || 0;
    const eyeWideAvg = (eyeWideLeft + eyeWideRight) / 2;

    const eyeBlinkLeft = bMap['eyeBlinkLeft'] || 0;
    const eyeBlinkRight = bMap['eyeBlinkRight'] || 0;
    const blinkAvg = (eyeBlinkLeft + eyeBlinkRight) / 2;

    const mouthFrownLeft = bMap['mouthFrownLeft'] || 0;
    const mouthFrownRight = bMap['mouthFrownRight'] || 0;
    const browDownLeft = bMap['browDownLeft'] || 0;
    const browDownRight = bMap['browDownRight'] || 0;
    const frownScore = Math.max(
      (mouthFrownLeft + mouthFrownRight) / 2,
      ((mouthFrownLeft + mouthFrownRight) / 2 + (browDownLeft + browDownRight) / 2) / 1.6
    );

    const mouthPucker = bMap['mouthPucker'] || 0;
    const cheekSquintLeft = bMap['cheekSquintLeft'] || 0;
    const cheekSquintRight = bMap['cheekSquintRight'] || 0;
    const cheekRaiseAvg = (cheekSquintLeft + cheekSquintRight) / 2;

    // Geometric checks from landmark coordinates
    const earLeft = this.calculateEAR(landmarks, [33, 160, 158, 133, 153, 144]);
    const earRight = this.calculateEAR(landmarks, [362, 385, 387, 263, 373, 380]);
    const earAvg = (earLeft + earRight) / 2;
    const mar = this.calculateMAR(landmarks);

    const profile = FACE_SENSITIVITY_PROFILES[this.sensitivity];
    const actMult = profile.activationMultiplier;

    // Base activation thresholds
    const T_BIG_SMILE = 0.72 * actMult;
    const T_SMILE = 0.36 * actMult;
    const T_SURPRISE_JAW = 0.35 * actMult;
    const T_JAW_OPEN = 0.38 * actMult;
    const T_BROWS_RAISED = 0.38 * actMult;
    const T_EYES_WIDE = 0.28 * actMult;
    const T_BLINK = 0.48 * actMult;
    const T_FROWN = 0.32 * actMult;
    const T_PUCKER = 0.38 * actMult;
    const T_CHEEK_RAISE = 0.36 * actMult;

    const hasBlendshapes = blendshapes && Array.isArray(blendshapes) && blendshapes.length > 0;
    const scores: { expression: GoofyFaceExpressionType; score: number }[] = [];

    // 1. Surprise pattern: compound expression (jaw open + raised brows or wide eyes)
    const surpriseScore = Math.min(
      1,
      (jawOpen + Math.max(browUpAvg, eyeWideAvg)) * 0.75
    );
    if (hasBlendshapes) {
      if (jawOpen >= T_SURPRISE_JAW && (browUpAvg >= 0.26 || eyeWideAvg >= 0.22)) {
        scores.push({ expression: 'FACE_SURPRISE', score: surpriseScore });
      }
    } else if (mar > 0.55 && earAvg > 0.38) {
      scores.push({ expression: 'FACE_SURPRISE', score: Math.min(1, mar) });
    }

    // 2. Big Smile vs Normal Smile
    if (smileAvg >= T_BIG_SMILE || (smileAvg >= 0.50 && jawOpen > 0.25)) {
      scores.push({
        expression: 'FACE_BIG_SMILE',
        score: Math.min(1, smileAvg * 0.8 + jawOpen * 0.2),
      });
    } else if (smileAvg >= T_SMILE) {
      scores.push({ expression: 'FACE_SMILE', score: smileAvg });
    }

    // 3. Jaw Open
    if (hasBlendshapes) {
      if (jawOpen >= T_JAW_OPEN) {
        scores.push({ expression: 'FACE_JAW_OPEN', score: jawOpen });
      }
    } else if (mar >= 0.55) {
      scores.push({ expression: 'FACE_JAW_OPEN', score: mar });
    }

    // 4. Eyebrows Raised
    if (browUpAvg >= T_BROWS_RAISED) {
      scores.push({ expression: 'FACE_EYEBROWS_RAISED', score: browUpAvg });
    }

    // 5. Eyes Wide
    if (hasBlendshapes) {
      if (eyeWideAvg >= T_EYES_WIDE) {
        scores.push({ expression: 'FACE_EYES_WIDE', score: eyeWideAvg });
      }
    } else if (earAvg > 0.42) {
      scores.push({ expression: 'FACE_EYES_WIDE', score: Math.min(1, (earAvg - 0.35) * 4) });
    }

    // 6. Blink / Wink (both eyes closed or one eye wink)
    if (hasBlendshapes) {
      if (blinkAvg >= T_BLINK || eyeBlinkLeft > 0.65 || eyeBlinkRight > 0.65) {
        const bScore = Math.max(blinkAvg, eyeBlinkLeft, eyeBlinkRight);
        scores.push({ expression: 'FACE_BLINK', score: Math.min(1, bScore) });
      }
    } else if (earAvg < 0.18) {
      scores.push({ expression: 'FACE_BLINK', score: 0.9 });
    }

    // 7. Frown / Disapproval pattern
    if (frownScore >= T_FROWN) {
      scores.push({ expression: 'FACE_FROWN_PATTERN', score: frownScore });
    }

    // 8. Lip Pucker / Kiss
    if (mouthPucker >= T_PUCKER) {
      scores.push({ expression: 'FACE_LIP_PUCKER', score: mouthPucker });
    }

    // 9. Cheek Raise
    if (cheekRaiseAvg >= T_CHEEK_RAISE && smileAvg < 0.35) {
      scores.push({ expression: 'FACE_CHEEK_RAISE', score: cheekRaiseAvg });
    }

    const rawScores: Record<string, number> = {
      smileAvg,
      jawOpen,
      browUpAvg,
      eyeWideAvg,
      blinkAvg,
      frownScore,
      mouthPucker,
      cheekRaiseAvg,
      surpriseScore,
      earAvg,
      mar,
    };

    if (scores.length === 0) {
      return {
        expression: null,
        confidence: 0,
        label: 'NEUTRAL',
        comicCaption: 'NEUTRAL EXPRESSION',
        rawScores,
        blendshapeFeatures: bMap,
        metrics: {
          earLeft,
          earRight,
          earAvg,
          mouthAspectRatio: mar,
          browInnerUp,
          jawOpen,
          smileAvg,
        },
      };
    }

    // Sort by confidence score descending
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0]!;
    const meta = GOOFY_FACE_METADATA[best.expression];

    return {
      expression: best.expression,
      confidence: Math.round(best.score * 100) / 100,
      label: meta.label,
      comicCaption: meta.defaultCaption,
      rawScores,
      blendshapeFeatures: bMap,
      metrics: {
        earLeft,
        earRight,
        earAvg,
        mouthAspectRatio: mar,
        browInnerUp,
        jawOpen,
        smileAvg,
      },
    };
  }
}

/**
 * GoofyFaceStateMachine provides robust hysteresis, hold-time validation,
 * held-expression deduplication (prevents re-triggering while held),
 * transition detection, and tracking loss recovery.
 */
export class GoofyFaceStateMachine {
  private state: FaceRecognitionState = 'NO_FACE';
  private candidateExpression: GoofyFaceExpressionType | null = null;
  private candidateStartTime = 0;
  private stabilizedExpression: GoofyFaceExpressionType | null = null;
  private lastTriggerTime = 0;
  private hasTriggeredCurrent = false;
  private cooldownUntil = 0;
  private consecutiveMissingFrames = 0;

  private minHoldMs: number;
  private cooldownMs: number;
  private sensitivity: 'HIGH' | 'MEDIUM' | 'RELAXED';

  constructor(options?: {
    minHoldMs?: number;
    cooldownMs?: number;
    sensitivity?: 'HIGH' | 'MEDIUM' | 'RELAXED';
  }) {
    this.sensitivity = options?.sensitivity || 'HIGH';
    this.minHoldMs = options?.minHoldMs ?? FACE_SENSITIVITY_PROFILES[this.sensitivity].minHoldMs;
    this.cooldownMs = options?.cooldownMs ?? 600;
  }

  setSensitivity(sensitivity: 'HIGH' | 'MEDIUM' | 'RELAXED'): void {
    this.sensitivity = sensitivity;
    this.minHoldMs = FACE_SENSITIVITY_PROFILES[sensitivity].minHoldMs;
  }

  setCooldown(ms: number): void {
    this.cooldownMs = ms;
  }

  updateConfig(config: { minHoldMs?: number; cooldownMs?: number }): void {
    if (config.minHoldMs !== undefined) this.minHoldMs = config.minHoldMs;
    if (config.cooldownMs !== undefined) this.cooldownMs = config.cooldownMs;
  }

  reset(): void {
    this.state = 'NO_FACE';
    this.candidateExpression = null;
    this.candidateStartTime = 0;
    this.stabilizedExpression = null;
    this.hasTriggeredCurrent = false;
    this.cooldownUntil = 0;
    this.consecutiveMissingFrames = 0;
  }

  getState(): FaceRecognitionState {
    return this.state;
  }

  update(
    result: FaceClassificationResult | null,
    now: number
  ): FaceStateMachineResult {
    // 1. Missing or tracking loss detection
    if (!result || result.expression === null && result.label === 'NO FACE') {
      this.consecutiveMissingFrames++;
      if (this.consecutiveMissingFrames >= 3) {
        this.reset();
        this.state = 'TRACKING_LOST';
      }
      return {
        triggered: false,
        expression: null,
        rawExpression: null,
        stabilizedExpression: null,
        state: this.state,
        holdDurationMs: 0,
        confidence: 0,
        rejectionReason: 'FACE_TRACKING_LOST',
      };
    }

    this.consecutiveMissingFrames = 0;
    const rawExpression = result.expression;
    const confidence = result.confidence;

    // 2. Neutral expression / No pattern active
    if (!rawExpression) {
      // Release held expression with hysteresis
      if (this.stabilizedExpression !== null) {
        this.stabilizedExpression = null;
        this.hasTriggeredCurrent = false;
      }
      this.candidateExpression = null;
      this.candidateStartTime = 0;
      this.state = 'FACE_DETECTED';

      return {
        triggered: false,
        expression: null,
        rawExpression: null,
        stabilizedExpression: null,
        state: 'FACE_DETECTED',
        holdDurationMs: 0,
        confidence: 0,
        rejectionReason: null,
      };
    }

    // 3. Held expression deduplication (if already triggered this continuous hold)
    if (this.hasTriggeredCurrent && rawExpression === this.stabilizedExpression) {
      this.state = 'EXPRESSION_TRIGGERED';
      return {
        triggered: false,
        expression: rawExpression,
        rawExpression,
        stabilizedExpression: rawExpression,
        state: 'EXPRESSION_TRIGGERED',
        holdDurationMs: now - this.candidateStartTime,
        confidence,
        rejectionReason: 'HELD_EXPRESSION_ALREADY_TRIGGERED',
      };
    }

    // In cooldown period for a different gesture or re-trigger?
    if (now < this.cooldownUntil) {
      this.state = 'COOLDOWN';
      return {
        triggered: false,
        expression: this.stabilizedExpression,
        rawExpression,
        stabilizedExpression: this.stabilizedExpression,
        state: 'COOLDOWN',
        holdDurationMs: now - this.candidateStartTime,
        confidence,
        rejectionReason: 'COOLDOWN_ACTIVE',
      };
    }

    // 4. Candidate expression handling
    if (this.candidateExpression !== rawExpression) {
      // Transitioning to a new expression
      this.candidateExpression = rawExpression;
      this.candidateStartTime = now;
      this.hasTriggeredCurrent = false;
      this.state = 'EXPRESSION_RECOGNIZED';

      return {
        triggered: false,
        expression: null,
        rawExpression,
        stabilizedExpression: this.stabilizedExpression,
        state: 'EXPRESSION_RECOGNIZED',
        holdDurationMs: 0,
        confidence,
        rejectionReason: 'TEMPORAL_VALIDATION_IN_PROGRESS',
      };
    }

    // Expression is currently being held
    const holdDurationMs = now - this.candidateStartTime;

    // Check if temporal stability duration threshold is met
    if (holdDurationMs >= this.minHoldMs) {
      this.stabilizedExpression = rawExpression;

      // Prevent repeated triggers while continuously held
      if (!this.hasTriggeredCurrent) {
        this.hasTriggeredCurrent = true;
        this.lastTriggerTime = now;
        this.cooldownUntil = now + this.cooldownMs;
        this.state = 'EXPRESSION_TRIGGERED';

        return {
          triggered: true,
          expression: rawExpression,
          rawExpression,
          stabilizedExpression: rawExpression,
          state: 'EXPRESSION_TRIGGERED',
          holdDurationMs,
          confidence,
          rejectionReason: null,
        };
      }

      // Already triggered for this continuous hold: keep state but do NOT re-trigger
      this.state = 'EXPRESSION_TRIGGERED';
      return {
        triggered: false,
        expression: rawExpression,
        rawExpression,
        stabilizedExpression: rawExpression,
        state: 'EXPRESSION_TRIGGERED',
        holdDurationMs,
        confidence,
        rejectionReason: 'HELD_EXPRESSION_ALREADY_TRIGGERED',
      };
    }

    // Not held long enough yet
    this.state = 'EXPRESSION_RECOGNIZED';
    return {
      triggered: false,
      expression: null,
      rawExpression,
      stabilizedExpression: this.stabilizedExpression,
      state: 'EXPRESSION_RECOGNIZED',
      holdDurationMs,
      confidence,
      rejectionReason: `HOLD_TIME_INSUFFICIENT (${holdDurationMs}ms < ${this.minHoldMs}ms)`,
    };
  }
}
