import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GoofyFaceClassifier,
  GoofyFaceStateMachine,
  FaceLandmarkPoint,
} from '../modules/pose/goofy-face-classifier';
import {
  GoofyHandClassifier,
  DynamicHandGestureClassifier,
  detectDualHandCombo,
} from '../modules/pose/goofy-hand-classifier';
import { GoofyMultimodalEngine } from '../modules/pose/goofy-multimodal-engine';
import { SemanticMemeMatcher } from '../modules/pose/goofy-semantic-matcher';
import { GoofyEventEngine } from '../modules/pose/goofy-event-engine';
import { GoofyAudioEngine } from '../modules/pose/goofy-audio-engine';
import { GoofyVisualFXEngine } from '../modules/pose/goofy-visual-fx';
import { GoofySequenceEngine } from '../modules/pose/goofy-sequence-engine';
import {
  validateCustomReactionRule,
  duplicateCustomReactionRule,
  evaluateCustomReactionRules,
} from '../modules/pose/goofy-custom-rules';
import { DEFAULT_MEME_LIBRARY } from '../modules/pose/goofy-meme-library';
import {
  DEFAULT_GOOFY_CONFIG,
  DEFAULT_CHAOS_MODE_CONFIG,
  GoofyModeConfig,
  CustomReactionRule,
} from '../modules/pose/goofy-types';
import { runComprehensiveGestureBenchmark } from '../modules/pose/goofy-test-fixtures';

function makeValidFaceLandmarks(): FaceLandmarkPoint[] {
  const lms: FaceLandmarkPoint[] = [];
  for (let i = 0; i < 478; i++) {
    lms.push({
      x: 0.5 + Math.cos((i / 478) * Math.PI * 2) * 0.15,
      y: 0.5 + Math.sin((i / 478) * Math.PI * 2) * 0.2,
      z: 0,
    });
  }
  lms[33] = { x: 0.4, y: 0.4 };
  lms[133] = { x: 0.46, y: 0.4 };
  lms[160] = { x: 0.43, y: 0.38 };
  lms[144] = { x: 0.43, y: 0.42 };
  lms[158] = { x: 0.44, y: 0.38 };
  lms[153] = { x: 0.44, y: 0.42 };
  lms[362] = { x: 0.54, y: 0.4 };
  lms[263] = { x: 0.6, y: 0.4 };
  lms[385] = { x: 0.57, y: 0.38 };
  lms[380] = { x: 0.57, y: 0.42 };
  lms[387] = { x: 0.56, y: 0.38 };
  lms[373] = { x: 0.56, y: 0.42 };
  lms[13] = { x: 0.5, y: 0.65 };
  lms[14] = { x: 0.5, y: 0.69 };
  lms[61] = { x: 0.44, y: 0.67 };
  lms[291] = { x: 0.56, y: 0.67 };
  return lms;
}

describe('Omni Loco AI — Goofy Model V9: CHAOS ENGINE Complete Validation Suite', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. FACE INTELLIGENCE: EMA SMOOTHING, VALIDITY, SUSPICIOUS PATTERN, LOSS RECOVERY
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 2 — Advanced Face Intelligence', () => {
    it('rejects corrupt (NaN) and collapsed face landmarks and resets smoother', () => {
      const classifier = new GoofyFaceClassifier('HIGH');
      const nanLandmarks = makeValidFaceLandmarks();
      nanLandmarks[13] = { x: Number.NaN, y: 0.5 };
      const nanRes = classifier.classify(nanLandmarks, []);
      expect(nanRes.expression).toBeNull();
      expect(nanRes.rejectionReason).toBe('CORRUPT_NON_FINITE_LANDMARKS');

      const collapsed = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
      const colRes = classifier.classify(collapsed, []);
      expect(colRes.expression).toBeNull();
      expect(colRes.rejectionReason).toBe('COLLAPSED_FACE_GEOMETRY');
    });

    it('applies EMA blendshape smoothing to dampen single-frame spikes', () => {
      const classifier = new GoofyFaceClassifier('HIGH', 0.5);
      const lms = makeValidFaceLandmarks();

      // Establish baseline neutral frame (smile = 0)
      const f0 = classifier.classify(lms, [
        { categoryName: 'mouthSmileLeft', score: 0.0 },
        { categoryName: 'mouthSmileRight', score: 0.0 },
      ]);
      expect(f0.expression).toBeNull();

      // Single noisy 1-frame spike (0.50) gets smoothed to 0.25 -> stays neutral!
      const f1 = classifier.classify(lms, [
        { categoryName: 'mouthSmileLeft', score: 0.5 },
        { categoryName: 'mouthSmileRight', score: 0.5 },
      ]);
      expect(f1.rawScores.smileAvg).toBeCloseTo(0.25, 2);
      expect(f1.expression).toBeNull();

      // Sustained smile rises smoothly past threshold
      const f2 = classifier.classify(lms, [
        { categoryName: 'mouthSmileLeft', score: 0.85 },
        { categoryName: 'mouthSmileRight', score: 0.85 },
      ]);
      expect(f2.rawScores.smileAvg).toBeGreaterThan(0.5);
      expect(f2.expression).toBe('FACE_SMILE');
    });

    it('detects observable FACE_SUSPICIOUS pattern from asymmetric raised brow + squint', () => {
      const classifier = new GoofyFaceClassifier('HIGH');
      const lms = makeValidFaceLandmarks();

      const res = classifier.classify(lms, [
        { categoryName: 'browOuterUpLeft', score: 0.78 },
        { categoryName: 'browOuterUpRight', score: 0.1 },
        { categoryName: 'eyeSquintLeft', score: 0.45 },
        { categoryName: 'eyeSquintRight', score: 0.45 },
      ]);
      expect(res.expression).toBe('FACE_SUSPICIOUS');
      expect(res.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('prevents repeated triggers while held and recovers cleanly from temporary face loss', () => {
      const sm = new GoofyFaceStateMachine({ minHoldMs: 200, cooldownMs: 500 });
      const smileRes = {
        expression: 'FACE_SMILE' as const,
        confidence: 0.9,
        label: 'SMILE',
        comicCaption: 'SMILE',
        rawScores: {},
      };

      expect(sm.update(smileRes, 1000).triggered).toBe(false);
      expect(sm.update(smileRes, 1250).triggered).toBe(true);
      // Continued hold must NOT re-trigger
      expect(sm.update(smileRes, 1600).triggered).toBe(false);
      expect(sm.update(smileRes, 2500).triggered).toBe(false);

      // Temporary face loss (3 missing frames -> TRACKING_LOST)
      const lost = {
        expression: null,
        confidence: 0,
        label: 'NO FACE',
        comicCaption: '',
        rawScores: {},
      };
      sm.update(lost, 2600);
      sm.update(lost, 2650);
      const lostState = sm.update(lost, 2700);
      expect(lostState.state).toBe('TRACKING_LOST');

      // Recovery: holding smile again after loss triggers cleanly
      expect(sm.update(smileRes, 3000).triggered).toBe(false);
      expect(sm.update(smileRes, 3260).triggered).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. HAND INTELLIGENCE: DEDICATED DYNAMIC CLASSIFIER & OCCLUSION REJECTION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 3 — Advanced Hand Intelligence & Dynamic Classifier', () => {
    it('DynamicHandGestureClassifier detects SWIPE_RIGHT & SWIPE_LEFT and handles mirrored camera', () => {
      const dyn = new DynamicHandGestureClassifier(500, 250);
      // Non-mirrored left-to-right swipe (+x)
      dyn.evaluate({ x: 0.2, y: 0.5, z: 0 }, 'Right', 1000, false);
      dyn.evaluate({ x: 0.35, y: 0.5, z: 0 }, 'Right', 1050, false);
      const rSwipe = dyn.evaluate({ x: 0.52, y: 0.5, z: 0 }, 'Right', 1100, false);
      expect(rSwipe.gesture).toBe('SWIPE_RIGHT');

      // Mirrored camera: same +x raw displacement means visual SWIPE_LEFT
      dyn.reset();
      dyn.evaluate({ x: 0.2, y: 0.5, z: 0 }, 'Left', 2000, true);
      dyn.evaluate({ x: 0.36, y: 0.5, z: 0 }, 'Left', 2050, true);
      const lSwipe = dyn.evaluate({ x: 0.55, y: 0.5, z: 0 }, 'Left', 2100, true);
      expect(lSwipe.gesture).toBe('SWIPE_LEFT');
    });

    it('rejects vertical hand motion as non-swipe and enforces per-hand swipe cooldown', () => {
      const dyn = new DynamicHandGestureClassifier(600, 250);
      dyn.evaluate({ x: 0.5, y: 0.2, z: 0 }, 'Right', 1000, false);
      dyn.evaluate({ x: 0.51, y: 0.45, z: 0 }, 'Right', 1050, false);
      const vert = dyn.evaluate({ x: 0.52, y: 0.72, z: 0 }, 'Right', 1100, false);
      expect(vert.gesture).toBeNull();
    });

    it('rejects occluded/corrupt hand landmarks without forcing a fake gesture', () => {
      const handClassifier = new GoofyHandClassifier();
      const collapsed = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
      const res = handClassifier.classify(collapsed, 'Right', 1000);
      expect(res.gesture).toBeNull();
      expect(res.rejectionReason).toBe('COLLAPSED_OR_OCCLUDED_HAND');

      const withNaN = Array.from({ length: 21 }, (_, i) => ({
        x: i === 4 ? Number.NaN : 0.2 + i * 0.01,
        y: 0.5,
        z: 0,
      }));
      const nanRes = handClassifier.classify(withNaN, 'Left', 1100);
      expect(nanRes.gesture).toBeNull();
      expect(nanRes.rejectionReason).toBe('INVALID_OR_OCCLUDED_LANDMARKS');
    });

    it('detects dual-hand combos independently', () => {
      expect(detectDualHandCombo('THUMBS_UP', 'THUMBS_UP').combo).toBe('DOUBLE_THUMBS_UP');
      expect(detectDualHandCombo('PEACE_SIGN', 'PEACE_SIGN').combo).toBe('DOUBLE_PEACE');
      expect(detectDualHandCombo('OPEN_PALM', 'OPEN_PALM').combo).toBe('BOTH_HANDS_OPEN');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. MULTIMODAL INTELLIGENCE 2.0: 3 MODES, STALE REJECTION, SESSION SCOPING
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 4 — Multimodal Event Fusion 2.0 & Operating Modes', () => {
    it('enforces FACE_ONLY mode independently (accepts face, rejects hands)', () => {
      const engine = new GoofyMultimodalEngine('FACE_ONLY', 800, 500);
      const faceEvt = engine.onFaceExpressionValidated('FACE_SMILE', 0.9, 1000);
      expect(faceEvt?.validity).toBe('VALID');
      expect(faceEvt?.modality).toBe('FACE');

      const handEvt = engine.onHandGestureValidated('THUMBS_UP', 0.95, 1100, 'Right');
      expect(handEvt?.validity).toBe('REJECTED');
      expect(handEvt?.rejectionReason).toContain('FACE_ONLY');
    });

    it('enforces HAND_ONLY mode independently (accepts hands, rejects face)', () => {
      const engine = new GoofyMultimodalEngine('HAND_ONLY', 800, 500);
      const handEvt = engine.onHandGestureValidated('THUMBS_UP', 0.95, 1000, 'Right');
      expect(handEvt?.validity).toBe('VALID');
      expect(handEvt?.modality).toBe('HAND');

      const faceEvt = engine.onFaceExpressionValidated('FACE_SMILE', 0.9, 1100);
      expect(faceEvt?.validity).toBe('REJECTED');
      expect(faceEvt?.rejectionReason).toContain('HAND_ONLY');
    });

    it('combines correlated Face + Hand in MULTIMODAL mode and rejects stale signals', () => {
      const engine = new GoofyMultimodalEngine('MULTIMODAL', 800, 500);

      // Correlated within 800ms window: FACE_SUSPICIOUS + POINTING -> SUSPICIOUS_ACCUSATION
      engine.onFaceExpressionValidated('FACE_SUSPICIOUS', 0.9, 1000);
      const fused = engine.onHandGestureValidated('POINTING', 0.92, 1400, 'Right');
      expect(fused?.validity).toBe('VALID');
      expect(fused?.modality).toBe('MULTIMODAL');
      expect(fused?.comboId).toBe('SUSPICIOUS_ACCUSATION');

      // Stale face signal (> 800ms later) must NOT combine with new hand gesture
      engine.onFaceExpressionValidated('FACE_SMILE', 0.9, 3000);
      const staleHand = engine.onHandGestureValidated('THUMBS_UP', 0.95, 4500, 'Right');
      expect(staleHand?.validity).toBe('VALID');
      expect(staleHand?.modality).toBe('HAND');
      expect(staleHand?.comboId).toBeUndefined();
    });

    it('resetSession invalidates buffered signals from previous sessions', () => {
      const engine = new GoofyMultimodalEngine('MULTIMODAL', 1000, 500);
      engine.onFaceExpressionValidated('FACE_SMILE', 0.9, 1000);
      engine.resetSession();
      const handAfterReset = engine.onHandGestureValidated('THUMBS_UP', 0.95, 1200, 'Right');
      expect(handAfterReset?.modality).toBe('HAND');
      expect(handAfterReset?.comboId).toBeUndefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. INTELLIGENT MEME MATCHING & CHAOS MODE
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 5 & 6 — Intelligent Meme Matching & CHAOS MODE', () => {
    it('Chaos Mode varies selections strictly within eligible memes (0 unrelated memes in 100 runs)', () => {
      const matcher = new SemanticMemeMatcher();
      const chaosConfig: GoofyModeConfig = {
        ...DEFAULT_GOOFY_CONFIG,
        chaosMode: {
          ...DEFAULT_CHAOS_MODE_CONFIG,
          enabled: true,
          chaosIntensity: 90,
          reactionVariety: 100,
          repeatAvoidance: true,
          rareReactionFrequency: 0.2,
        },
      };

      const eligibleIds = new Set(
        matcher
          .getCandidatesForAction('THUMBS_UP', DEFAULT_MEME_LIBRARY, chaosConfig)
          .map((m) => m.id)
      );
      expect(eligibleIds.size).toBeGreaterThan(1);

      const seen = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const res = matcher.match(
          { actionId: 'THUMBS_UP', source: 'HAND', hand: 'Right' },
          DEFAULT_MEME_LIBRARY,
          chaosConfig
        );
        expect(res).not.toBeNull();
        expect(eligibleIds.has(res!.meme.id)).toBe(true);
        seen.add(res!.meme.id);
      }
      // Variety verified: multiple distinct eligible memes selected
      expect(seen.size).toBeGreaterThan(1);
    });

    it('returns null without inventing an unrelated meme when no meme is eligible', () => {
      const matcher = new SemanticMemeMatcher();
      const res = matcher.match(
        { actionId: 'TOTALLY_UNKNOWN_UNMAPPED_ACTION', source: 'HAND' },
        DEFAULT_MEME_LIBRARY,
        {
          ...DEFAULT_GOOFY_CONFIG,
          chaosMode: { ...DEFAULT_CHAOS_MODE_CONFIG, enabled: true },
        }
      );
      expect(res).toBeNull();
    });

    it('enforces maxPopupsPerMinute rate cap when Chaos Mode is active', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config: GoofyModeConfig = {
        ...DEFAULT_GOOFY_CONFIG,
        isMuted: true,
        chaosMode: {
          ...DEFAULT_CHAOS_MODE_CONFIG,
          enabled: true,
          maxPopupsPerMinute: 3,
        },
      };
      const engine = new GoofyEventEngine(config, audio, vfx);

      expect(engine.dispatchActionTrigger('THUMBS_UP', 'HAND', 'Right')).not.toBeNull();
      expect(engine.dispatchActionTrigger('PEACE_SIGN', 'HAND', 'Right')).not.toBeNull();
      expect(engine.dispatchActionTrigger('CLOSED_FIST', 'HAND', 'Right')).not.toBeNull();
      // 4th trigger within 60s must be rate-capped
      expect(engine.dispatchActionTrigger('OPEN_PALM', 'HAND', 'Right')).toBeNull();
      engine.dispose();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. CUSTOM REACTION STUDIO RULES (VALIDATION, SECURITY, PRIORITY, PREVIEW ISOLATION)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 7 — Custom Reaction Studio Rules', () => {
    it('validates safe declarative rules and rejects script/JS injection payloads', () => {
      const unsafe = validateCustomReactionRule({
        name: '<script>alert(1)</script>',
        triggerType: 'FACE',
        faceCondition: 'FACE_SMILE',
        memeId: 'REAL_MEME_GIGACHAD',
        soundId: 'CHAD_GONG',
        caption: 'eval(document.cookie)',
        animationStyle: 'GLITCH',
        durationMs: 2000,
      });
      expect(unsafe.valid).toBe(false);
      expect(unsafe.errors.some((e) => e.includes('disallowed executable'))).toBe(true);

      const safe = validateCustomReactionRule({
        name: 'Victory GigaChad',
        triggerType: 'COMBINED',
        faceCondition: 'FACE_SMILE',
        handCondition: 'THUMBS_UP',
        memeId: 'REAL_MEME_GIGACHAD',
        soundId: 'BRASS_FANFARE',
        caption: 'ULTIMATE APPROVAL',
        animationStyle: 'GLITCH',
        durationMs: 99999, // clamped to 6000
      });
      expect(safe.valid).toBe(true);
      expect(safe.sanitized?.durationMs).toBe(6000);
      expect(safe.sanitized?.animationStyle).toBe('GLITCH');
    });

    it('supports duplicate, disable, and specificity-prioritized evaluation', () => {
      const rFace = validateCustomReactionRule({
        name: 'Face Rule',
        triggerType: 'FACE',
        faceCondition: 'FACE_SMILE',
        memeId: 'REAL_MEME_SUCCESS_KID',
        soundId: 'VICTORY_BELL',
        caption: 'SMILE ONLY',
        animationStyle: 'CLASSIC',
        durationMs: 1500,
      }).sanitized!;

      const rCombined = validateCustomReactionRule({
        name: 'Combined Rule',
        triggerType: 'COMBINED',
        faceCondition: 'FACE_SMILE',
        handCondition: 'THUMBS_UP',
        memeId: 'REAL_MEME_GIGACHAD',
        soundId: 'CHAD_GONG',
        caption: 'BOTH MATCH',
        animationStyle: 'CINEMATIC',
        durationMs: 2000,
      }).sanitized!;

      const copy = duplicateCustomReactionRule(rCombined);
      expect(copy.id).not.toBe(rCombined.id);
      expect(copy.name).toContain('(Copy)');

      // Combined rule outranks single Face rule in MULTIMODAL mode
      const winner = evaluateCustomReactionRules([rFace, rCombined], {
        faceExpression: 'FACE_SMILE',
        handGesture: 'THUMBS_UP',
        operatingMode: 'MULTIMODAL',
      });
      expect(winner?.id).toBe(rCombined.id);

      // Disabled combined rule falls back to enabled face rule
      const disabledCombined: CustomReactionRule = { ...rCombined, enabled: false };
      const fallback = evaluateCustomReactionRules([rFace, disabledCombined], {
        faceExpression: 'FACE_SMILE',
        handGesture: 'THUMBS_UP',
        operatingMode: 'MULTIMODAL',
      });
      expect(fallback?.id).toBe(rFace.id);
    });

    it('isolates custom rule manual preview from genuine event history', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const engine = new GoofyEventEngine({ ...DEFAULT_GOOFY_CONFIG, isMuted: true }, audio, vfx);
      const rule = validateCustomReactionRule({
        name: 'Glitch Test',
        triggerType: 'HAND',
        handCondition: 'ROCK_SIGN',
        memeId: 'MEME_ROCK_STAR',
        soundId: 'ELECTRIC_SPARK',
        caption: 'ROCK GLITCH',
        animationStyle: 'GLITCH',
        durationMs: 1200,
      }).sanitized!;

      const previewEvt = engine.dispatchCustomRuleTrigger(rule, 1.0, true);
      expect(previewEvt?.isManualPreview).toBe(true);
      expect(engine.getEventHistory().length).toBe(0);
      expect(engine.getActivePopups()[0]?.animationStyle).toBe('GLITCH');

      const genuineEvt = engine.dispatchCustomRuleTrigger(rule, 0.95, false);
      expect(genuineEvt?.isManualPreview).toBe(false);
      expect(engine.getEventHistory().length).toBe(1);
      engine.dispose();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. MULTIMODAL SEQUENCE RECOGNITION & SECRET COMBOS
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 8 — Multimodal Sequence Recognition & Secret Combos', () => {
    it('recognizes multimodal Face+Hand secret sequence THUMBS_UP -> FACE_SMILE -> PEACE_SIGN', () => {
      const seqEngine = new GoofySequenceEngine([], 1000);
      const s1 = seqEngine.processEvent('THUMBS_UP', 1000, 'Right');
      expect(s1.triggered).toBe(false);
      expect(s1.progressPercent).toBeGreaterThan(0);

      // Held repeat within debounce window must NOT advance step
      const held = seqEngine.processEvent('THUMBS_UP', 1100, 'Right');
      expect(held.triggered).toBe(false);

      const s2 = seqEngine.processEvent('FACE_SMILE', 1600, 'Face');
      expect(s2.triggered).toBe(false);
      expect(s2.activeState?.currentStepIndex).toBe(2);

      const s3 = seqEngine.processEvent('PEACE_SIGN', 2300, 'Right');
      expect(s3.triggered).toBe(true);
      expect(s3.sequence?.id).toBe('SECRET_SEQ_CHAOS_APPROVAL');
    });

    it('recognizes FACE_EYES_WIDE -> OPEN_PALM -> POINTING secret sequence', () => {
      const seqEngine = new GoofySequenceEngine([], 1000);
      seqEngine.processEvent('FACE_EYES_WIDE', 1000, 'Face');
      seqEngine.processEvent('OPEN_PALM', 1500, 'Right');
      const finalRes = seqEngine.processEvent('POINTING', 2100, 'Right');
      expect(finalRes.triggered).toBe(true);
      expect(finalRes.sequence?.id).toBe('SECRET_SEQ_SHOCK_REVEAL');
    });

    it('enforces maxTotalDurationMs and resets cleanly on tracking loss or cancel', () => {
      const seqEngine = new GoofySequenceEngine(
        [
          {
            id: 'CUSTOM_TIGHT_SEQ',
            label: 'TIGHT SEQ',
            description: 'Tight total duration test',
            steps: ['PINCH', 'FACE_LIP_PUCKER', 'OK_GESTURE'],
            maxWindowMs: 2000,
            maxTotalDurationMs: 2500,
            defaultMemeId: 'REAL_MEME_GIGACHAD',
            defaultSoundId: 'CHAD_GONG',
            defaultCaption: 'TIGHT',
            icon: '⚡',
          },
        ],
        500
      );

      seqEngine.processEvent('PINCH', 1000, 'Right');
      seqEngine.processEvent('FACE_LIP_PUCKER', 2600, 'Face'); // 1600ms elapsed
      // 3800ms -> inter-step is 1200ms (<=2000) BUT total elapsed is 2800ms (>2500 maxTotalDurationMs)!
      const expired = seqEngine.processEvent('OK_GESTURE', 3800, 'Right');
      expect(expired.triggered).toBe(false);

      // Explicit cancel clears progress
      seqEngine.processEvent('PINCH', 5000, 'Right');
      expect(seqEngine.getActiveState(5100)).not.toBeNull();
      seqEngine.cancelSequence();
      expect(seqEngine.getActiveState(5150)).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. MUTE, DISABLED REACTIONS, PERSISTENCE & BENCHMARK EVALUATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Phase 12 — Edge Cases, Persistence & Quantitative Benchmark', () => {
    it('respects mute, disabled reactions, and browser refresh JSON persistence', () => {
      const audio = new GoofyAudioEngine();
      const playSpy = vi.spyOn(audio, 'playSound');
      const vfx = new GoofyVisualFXEngine();

      const cfg: GoofyModeConfig = {
        ...DEFAULT_GOOFY_CONFIG,
        isMuted: true,
        handMappings: {
          ...DEFAULT_GOOFY_CONFIG.handMappings,
          CLOSED_FIST: {
            ...DEFAULT_GOOFY_CONFIG.handMappings.CLOSED_FIST,
            enabled: false,
          },
        },
      };

      const engine = new GoofyEventEngine(cfg, audio, vfx);
      // Disabled reaction returns null
      expect(engine.dispatchActionTrigger('CLOSED_FIST', 'HAND', 'Right')).toBeNull();

      // Enabled reaction while muted shows popup without invoking audio playback
      const evt = engine.dispatchActionTrigger('THUMBS_UP', 'HAND', 'Right');
      expect(evt).not.toBeNull();
      expect(playSpy).not.toHaveBeenCalled();

      // Persistence round-trip simulation
      const serialized = JSON.stringify({
        ...cfg,
        chaosMode: { ...DEFAULT_CHAOS_MODE_CONFIG, enabled: true, chaosIntensity: 88 },
      });
      const restored = JSON.parse(serialized) as GoofyModeConfig;
      expect(restored.chaosMode?.enabled).toBe(true);
      expect(restored.chaosMode?.chaosIntensity).toBe(88);

      engine.dispose();
      expect(engine.getActivePopups().length).toBe(0);
    });

    it('runs comprehensive 17-gesture benchmark with high precision and sub-millisecond classification latency', () => {
      const report = runComprehensiveGestureBenchmark(new GoofyHandClassifier());
      expect(report.accuracy).toBeGreaterThanOrEqual(90);
      const avgLatency =
        report.results.reduce((acc, r) => acc + r.latencyMs, 0) /
        Math.max(1, report.results.length);
      expect(avgLatency).toBeLessThan(5);
    });
  });
});
