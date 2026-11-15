import { describe, it, expect, beforeEach } from 'vitest';
import {
  GoofyFaceClassifier,
  GoofyFaceStateMachine,
  FaceLandmarkPoint,
  FaceBlendshapeInput,
} from '../modules/pose/goofy-face-classifier';
import {
  GoofyMultimodalEngine,
} from '../modules/pose/goofy-multimodal-engine';
import {
  DEFAULT_GOOFY_CONFIG,
  GOOFY_FACE_METADATA,
  GOOFY_MULTIMODAL_COMBO_DEFINITIONS,
  GoofyFaceExpressionType,
} from '../modules/pose/goofy-types';
import {
  getMemeById,
  getDefaultMemeForAction,
} from '../modules/pose/goofy-meme-library';

// Helper to generate mock 478 face landmarks
function createMockFaceLandmarks(modifications?: Partial<Record<number, { x: number; y: number; z?: number }>>): FaceLandmarkPoint[] {
  const landmarks: FaceLandmarkPoint[] = [];
  for (let i = 0; i < 478; i++) {
    // Default neutral face oval geometry
    landmarks.push({
      x: 0.5 + Math.cos((i / 478) * Math.PI * 2) * 0.15,
      y: 0.5 + Math.sin((i / 478) * Math.PI * 2) * 0.20,
      z: 0,
    });
  }

  // Key reference points
  landmarks[33] = { x: 0.40, y: 0.40 }; // Left eye outer
  landmarks[133] = { x: 0.46, y: 0.40 }; // Left eye inner
  landmarks[160] = { x: 0.43, y: 0.38 }; // Left eye top
  landmarks[144] = { x: 0.43, y: 0.42 }; // Left eye bottom
  landmarks[158] = { x: 0.44, y: 0.38 };
  landmarks[153] = { x: 0.44, y: 0.42 };

  landmarks[362] = { x: 0.54, y: 0.40 }; // Right eye inner
  landmarks[263] = { x: 0.60, y: 0.40 }; // Right eye outer
  landmarks[385] = { x: 0.57, y: 0.38 }; // Right eye top
  landmarks[380] = { x: 0.57, y: 0.42 }; // Right eye bottom
  landmarks[387] = { x: 0.56, y: 0.38 };
  landmarks[373] = { x: 0.56, y: 0.42 };

  // Lips
  landmarks[13] = { x: 0.50, y: 0.65 }; // Upper lip
  landmarks[14] = { x: 0.50, y: 0.69 }; // Lower lip
  landmarks[61] = { x: 0.44, y: 0.67 }; // Left corner
  landmarks[291] = { x: 0.56, y: 0.67 }; // Right corner

  if (modifications) {
    for (const [idxStr, val] of Object.entries(modifications)) {
      const idx = parseInt(idxStr, 10);
      landmarks[idx] = { ...landmarks[idx]!, ...val };
    }
  }

  return landmarks;
}

describe('Omni Loco AI — Goofy Model V8 Multimodal Face & Hand Recognition Engine', () => {
  let faceClassifier: GoofyFaceClassifier;
  let faceStateMachine: GoofyFaceStateMachine;
  let multimodalEngine: GoofyMultimodalEngine;

  beforeEach(() => {
    faceClassifier = new GoofyFaceClassifier('HIGH');
    faceStateMachine = new GoofyFaceStateMachine({ minHoldMs: 150, cooldownMs: 600 });
    multimodalEngine = new GoofyMultimodalEngine({
      ...DEFAULT_GOOFY_CONFIG,
      operatingMode: 'MULTIMODAL',
      multimodalWindowMs: 800,
      cooldownMs: 600,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. FACE CLASSIFIER EVALUATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 2 — GoofyFaceClassifier (Observable Facial Expression Features)', () => {
    it('returns NO FACE when landmarks are missing or insufficient', () => {
      const emptyRes = faceClassifier.classify([], []);
      expect(emptyRes.expression).toBeNull();
      expect(emptyRes.label).toBe('NO FACE');
      expect(emptyRes.rejectionReason).toBe('MISSING_OR_INSUFFICIENT_LANDMARKS');

      const nullRes = faceClassifier.classify(null, null);
      expect(nullRes.expression).toBeNull();
      expect(nullRes.rejectionReason).toBe('MISSING_OR_INSUFFICIENT_LANDMARKS');
    });

    it('correctly classifies FACE_SMILE from bilateral mouth corners elevation', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'mouthSmileLeft', score: 0.55 },
        { categoryName: 'mouthSmileRight', score: 0.55 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_SMILE');
      expect(res.label).toBe('SMILE');
      expect(res.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('correctly classifies FACE_BIG_SMILE from high-intensity smile and mouth opening', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'mouthSmileLeft', score: 0.88 },
        { categoryName: 'mouthSmileRight', score: 0.88 },
        { categoryName: 'jawOpen', score: 0.35 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_BIG_SMILE');
      expect(res.label).toBe('BIG SMILE');
    });

    it('correctly classifies FACE_JAW_OPEN from visible mouth dropped opening', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'jawOpen', score: 0.65 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_JAW_OPEN');
      expect(res.label).toBe('JAW DROP');
    });

    it('correctly classifies FACE_EYEBROWS_RAISED from inner and outer brow elevations', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'browInnerUp', score: 0.72 },
        { categoryName: 'browOuterUpLeft', score: 0.60 },
        { categoryName: 'browOuterUpRight', score: 0.60 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_EYEBROWS_RAISED');
      expect(res.label).toBe('RAISED BROWS');
    });

    it('correctly classifies FACE_EYES_WIDE from wide eyelid apertures', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'eyeWideLeft', score: 0.60 },
        { categoryName: 'eyeWideRight', score: 0.60 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_EYES_WIDE');
      expect(res.label).toBe('WIDE EYES');
    });

    it('correctly classifies FACE_BLINK when eyelids are closed', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'eyeBlinkLeft', score: 0.85 },
        { categoryName: 'eyeBlinkRight', score: 0.85 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_BLINK');
      expect(res.label).toBe('BLINK / WINK');
    });

    it('correctly classifies FACE_FROWN_PATTERN from downward mouth angle and brow furrow', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'mouthFrownLeft', score: 0.62 },
        { categoryName: 'mouthFrownRight', score: 0.62 },
        { categoryName: 'browDownLeft', score: 0.50 },
        { categoryName: 'browDownRight', score: 0.50 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_FROWN_PATTERN');
      expect(res.label).toBe('FROWN / DISPLEASURE');
    });

    it('correctly classifies FACE_LIP_PUCKER when mouth is puckered', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'mouthPucker', score: 0.75 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_LIP_PUCKER');
      expect(res.label).toBe('LIP PUCKER / KISS');
    });

    it('correctly classifies compound FACE_SURPRISE from jaw open + raised brows or wide eyes', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'jawOpen', score: 0.55 },
        { categoryName: 'browInnerUp', score: 0.50 },
        { categoryName: 'eyeWideLeft', score: 0.40 },
        { categoryName: 'eyeWideRight', score: 0.40 },
      ];
      const res = faceClassifier.classify(landmarks, blendshapes);
      expect(res.expression).toBe('FACE_SURPRISE');
      expect(res.label).toBe('SURPRISE / MIND BLOWN');
    });

    it('correctly calculates EAR and MAR geometric facial ratios', () => {
      const landmarks = createMockFaceLandmarks();
      const ear = faceClassifier.calculateEAR(landmarks, [33, 160, 158, 133, 153, 144]);
      expect(ear).toBeGreaterThan(0.1);
      expect(ear).toBeLessThan(1.5);

      const mar = faceClassifier.calculateMAR(landmarks);
      expect(mar).toBeGreaterThan(0.05);
      expect(mar).toBeLessThan(2.0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. FACE STATE MACHINE EVALUATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 2C — GoofyFaceStateMachine (Stability, Hysteresis & Deduplication)', () => {
    it('does not trigger on single-frame noise before minHoldMs', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'mouthSmileLeft', score: 0.6 },
        { categoryName: 'mouthSmileRight', score: 0.6 },
      ];
      const result = faceClassifier.classify(landmarks, blendshapes);

      const t0 = 1000;
      const sm0 = faceStateMachine.update(result, t0);
      expect(sm0.triggered).toBe(false);
      expect(sm0.state).toBe('EXPRESSION_RECOGNIZED');
      expect(sm0.rejectionReason).toMatch(/HOLD_TIME_INSUFFICIENT|TEMPORAL_VALIDATION/);
    });

    it('triggers once hold duration threshold (minHoldMs) is satisfied', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'mouthSmileLeft', score: 0.6 },
        { categoryName: 'mouthSmileRight', score: 0.6 },
      ];
      const result = faceClassifier.classify(landmarks, blendshapes);

      const t0 = 1000;
      faceStateMachine.update(result, t0);

      const t1 = t0 + 160; // Meets 150ms hold requirement
      const sm1 = faceStateMachine.update(result, t1);
      expect(sm1.triggered).toBe(true);
      expect(sm1.expression).toBe('FACE_SMILE');
      expect(sm1.state).toBe('EXPRESSION_TRIGGERED');
      expect(sm1.rejectionReason).toBeNull();
    });

    it('prevents repeated triggering while expression is continuously held (held-pose deduplication)', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'mouthSmileLeft', score: 0.6 },
        { categoryName: 'mouthSmileRight', score: 0.6 },
      ];
      const result = faceClassifier.classify(landmarks, blendshapes);

      const t0 = 1000;
      faceStateMachine.update(result, t0);

      // Trigger point
      const t1 = t0 + 160;
      const sm1 = faceStateMachine.update(result, t1);
      expect(sm1.triggered).toBe(true);

      // Still holding at t2
      const t2 = t1 + 300;
      const sm2 = faceStateMachine.update(result, t2);
      expect(sm2.triggered).toBe(false);
      expect(sm2.state).toBe('EXPRESSION_TRIGGERED');
      expect(sm2.rejectionReason).toBe('HELD_EXPRESSION_ALREADY_TRIGGERED');

      // Still holding after cooldown window at t3
      const t3 = t1 + 800;
      const sm3 = faceStateMachine.update(result, t3);
      expect(sm3.triggered).toBe(false);
      expect(sm3.rejectionReason).toBe('HELD_EXPRESSION_ALREADY_TRIGGERED');
    });

    it('recovers cleanly when face tracking is lost and recovers', () => {
      const landmarks = createMockFaceLandmarks();
      const blendshapes: FaceBlendshapeInput[] = [
        { categoryName: 'mouthSmileLeft', score: 0.6 },
        { categoryName: 'mouthSmileRight', score: 0.6 },
      ];
      const result = faceClassifier.classify(landmarks, blendshapes);

      // 1. Active detection
      faceStateMachine.update(result, 1000);
      faceStateMachine.update(result, 1160);

      // 2. Tracking lost for 3 frames
      faceStateMachine.update(null, 1200);
      faceStateMachine.update(null, 1230);
      const smLost = faceStateMachine.update(null, 1260);
      expect(smLost.state).toBe('TRACKING_LOST');
      expect(smLost.expression).toBeNull();

      // 3. Face re-enters: starts fresh recognition cycle
      const smReentry = faceStateMachine.update(result, 1300);
      expect(smReentry.state).toBe('EXPRESSION_RECOGNIZED');
      expect(smReentry.triggered).toBe(false);

      const smRetrigger = faceStateMachine.update(result, 1470);
      expect(smRetrigger.triggered).toBe(true);
      expect(smRetrigger.expression).toBe('FACE_SMILE');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. MULTIMODAL EVENT FUSION ENGINE EVALUATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 4 — GoofyMultimodalEngine (Face + Hand Cross-Modal Fusion)', () => {
    it('fuses SMILE + THUMBS_UP into POSITIVE_APPROVAL within the fusion window', () => {
      const t0 = 1000;
      // 1. Smile validated
      const faceEvt = multimodalEngine.onFaceExpressionValidated('FACE_SMILE', 0.92, t0);
      expect(faceEvt?.modality).toBe('FACE');

      // 2. Thumbs up arrives 250ms later (well within 800ms window)
      const t1 = t0 + 250;
      const combinedEvt = multimodalEngine.onHandGestureValidated('THUMBS_UP', 0.95, t1, 'Right');

      expect(combinedEvt).not.toBeNull();
      expect(combinedEvt?.modality).toBe('MULTIMODAL');
      expect(combinedEvt?.comboId).toBe('POSITIVE_APPROVAL');
      expect(combinedEvt?.label).toBe('POSITIVE APPROVAL');
      expect(combinedEvt?.validity).toBe('VALID');
      expect(combinedEvt?.memeId).toBe('REAL_MEME_GIGACHAD');
      expect(combinedEvt?.soundId).toBe('CHAD_GONG');
    });

    it('fuses JAW_OPEN + OPEN_PALM into DRAMATIC_SURPRISE or SHOCKED_REACTION', () => {
      const t0 = 2000;
      multimodalEngine.onFaceExpressionValidated('FACE_JAW_OPEN', 0.94, t0);

      const t1 = t0 + 180;
      const comboEvt = multimodalEngine.onHandGestureValidated('OPEN_PALM', 0.91, t1, 'Left');

      expect(comboEvt?.modality).toBe('MULTIMODAL');
      expect(comboEvt?.comboId).toBe('SHOCKED_REACTION');
      expect(comboEvt?.validity).toBe('VALID');
      expect(comboEvt?.memeId).toBe('REAL_MEME_SURPRISED_PIKACHU');
    });

    it('fuses BROWS_RAISED + POINTING into SUSPICIOUS_ACCUSATION', () => {
      const t0 = 3000;
      multimodalEngine.onFaceExpressionValidated('FACE_EYEBROWS_RAISED', 0.88, t0);

      const t1 = t0 + 300;
      const comboEvt = multimodalEngine.onHandGestureValidated('POINTING', 0.90, t1, 'Right');

      expect(comboEvt?.modality).toBe('MULTIMODAL');
      expect(comboEvt?.comboId).toBe('SUSPICIOUS_ACCUSATION');
      expect(comboEvt?.memeId).toBe('REAL_MEME_THE_ROCK_EYEBROW');
      expect(comboEvt?.soundId).toBe('DRAMATIC_SUSPENSE');
    });

    it('fuses FROWN + THUMBS_DOWN into DISAPPOINTMENT_REACTION', () => {
      const t0 = 4000;
      multimodalEngine.onFaceExpressionValidated('FACE_FROWN_PATTERN', 0.87, t0);

      const t1 = t0 + 200;
      const comboEvt = multimodalEngine.onHandGestureValidated('THUMBS_DOWN', 0.93, t1, 'Left');

      expect(comboEvt?.modality).toBe('MULTIMODAL');
      expect(comboEvt?.comboId).toBe('DISAPPOINTMENT_REACTION');
      expect(comboEvt?.memeId).toBe('REAL_MEME_EMOTIONAL_DAMAGE');
      expect(comboEvt?.soundId).toBe('SAD_TROMBONE');
    });

    it('fuses BIG_SMILE + ROCK_SIGN into MAXIMUM_AURA', () => {
      const t0 = 5000;
      multimodalEngine.onFaceExpressionValidated('FACE_BIG_SMILE', 0.96, t0);

      const t1 = t0 + 150;
      const comboEvt = multimodalEngine.onHandGestureValidated('ROCK_SIGN', 0.94, t1, 'Right');

      expect(comboEvt?.modality).toBe('MULTIMODAL');
      expect(comboEvt?.comboId).toBe('MAXIMUM_AURA');
      expect(comboEvt?.memeId).toBe('REAL_MEME_ULTRA_INSTINCT_SHAGGY');
      expect(comboEvt?.soundId).toBe('ANIME_POWER_UP');
    });

    it('allows Face-only events when hand is absent or outside fusion window', () => {
      const t0 = 6000;
      const faceEvt = multimodalEngine.onFaceExpressionValidated('FACE_SMILE', 0.91, t0);

      expect(faceEvt).not.toBeNull();
      expect(faceEvt?.modality).toBe('FACE');
      expect(faceEvt?.source).toBe('FACE');
      expect(faceEvt?.faceExpression).toBe('FACE_SMILE');
      expect(faceEvt?.validity).toBe('VALID');
    });

    it('allows Hand-only events when face is absent or outside fusion window', () => {
      const t0 = 7000;
      const handEvt = multimodalEngine.onHandGestureValidated('PEACE_SIGN', 0.95, t0, 'Right');

      expect(handEvt).not.toBeNull();
      expect(handEvt?.modality).toBe('HAND');
      expect(handEvt?.source).toBe('HAND');
      expect(handEvt?.handGesture).toBe('PEACE_SIGN');
      expect(handEvt?.validity).toBe('VALID');
    });

    it('rejects hand events when operating mode is FACE_ONLY', () => {
      multimodalEngine.setOperatingMode('FACE_ONLY');
      const handEvt = multimodalEngine.onHandGestureValidated('THUMBS_UP', 0.95, 8000, 'Right');

      expect(handEvt?.validity).toBe('REJECTED');
      expect(handEvt?.rejectionReason).toContain('MODALITY_DISABLED');
    });

    it('rejects face events when operating mode is HAND_ONLY', () => {
      multimodalEngine.setOperatingMode('HAND_ONLY');
      const faceEvt = multimodalEngine.onFaceExpressionValidated('FACE_SMILE', 0.95, 9000);

      expect(faceEvt?.validity).toBe('REJECTED');
      expect(faceEvt?.rejectionReason).toContain('MODALITY_DISABLED');
    });

    it('enforces anti-repeat cooldown on consecutive identical triggers', () => {
      const t0 = 10000;
      const evt1 = multimodalEngine.onFaceExpressionValidated('FACE_JAW_OPEN', 0.9, t0);
      expect(evt1?.validity).toBe('VALID');

      // Immediate consecutive attempt at t0 + 100ms
      const evt2 = multimodalEngine.onFaceExpressionValidated('FACE_JAW_OPEN', 0.9, t0 + 100);
      expect(evt2?.validity).toBe('REJECTED');
      expect(evt2?.rejectionReason).toBe('COOLDOWN_ACTIVE');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. MEME MATCHING AND METADATA INTEGRATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 5 — Intelligent Meme System & Registry Validation', () => {
    it('verifies all 10 observable face expression patterns have metadata', () => {
      const expressions: GoofyFaceExpressionType[] = [
        'FACE_SMILE',
        'FACE_BIG_SMILE',
        'FACE_JAW_OPEN',
        'FACE_EYEBROWS_RAISED',
        'FACE_EYES_WIDE',
        'FACE_BLINK',
        'FACE_FROWN_PATTERN',
        'FACE_LIP_PUCKER',
        'FACE_CHEEK_RAISE',
        'FACE_SURPRISE',
      ];

      for (const expr of expressions) {
        const meta = GOOFY_FACE_METADATA[expr];
        expect(meta).toBeDefined();
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.defaultCaption.length).toBeGreaterThan(0);
        expect(meta.blendshapes.length).toBeGreaterThan(0);
      }
    });

    it('verifies all 12 multimodal combo definitions have valid memes and captions', () => {
      const comboKeys = Object.keys(GOOFY_MULTIMODAL_COMBO_DEFINITIONS);
      expect(comboKeys.length).toBeGreaterThanOrEqual(12);

      for (const key of comboKeys) {
        const def = GOOFY_MULTIMODAL_COMBO_DEFINITIONS[key as keyof typeof GOOFY_MULTIMODAL_COMBO_DEFINITIONS];
        expect(def.id).toBe(key);
        expect(def.label.length).toBeGreaterThan(0);
        expect(def.defaultCaption.length).toBeGreaterThan(0);
        expect(def.defaultMemeId.length).toBeGreaterThan(0);

        // Meme must resolve to an authentic asset in library
        const meme = getMemeById(def.defaultMemeId);
        expect(meme).toBeDefined();
        expect(meme?.dataUrl).toBeDefined();
      }
    });

    it('retrieves default memes for all V8 actions with zero random fallbacks', () => {
      const actions = [
        'POSITIVE_APPROVAL',
        'SHOCKED_REACTION',
        'VICTORY_REACTION',
        'SUSPICIOUS_ACCUSATION',
        'DRAMATIC_SURPRISE',
        'DISAPPOINTMENT_REACTION',
        'CELEBRATION',
        'MAXIMUM_AURA',
        'RAGE_ANGER',
        'BLANK_DISBELIEF',
        'CHEF_KISS',
        'CHEEK_HEART',
        'FACE_SMILE',
        'FACE_JAW_OPEN',
        'FACE_EYEBROWS_RAISED',
        'THUMBS_UP',
        'PEACE_SIGN',
      ];

      for (const act of actions) {
        const meme = getDefaultMemeForAction(act);
        expect(meme).toBeDefined();
        expect(meme.id).toBeDefined();
        expect(meme.title).toBeDefined();
      }
    });
  });
});
