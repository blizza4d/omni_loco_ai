import { describe, it, expect, beforeEach } from 'vitest';
import { GoofyPoseClassifier } from '../modules/pose/goofy-pose-classifier';
import { GoofyPoseStateMachine } from '../modules/pose/goofy-state-machine';
import { GoofyAudioEngine } from '../modules/pose/goofy-audio-engine';
import { GoofyParticleEmitter, GoofyVisualFXEngine } from '../modules/pose/goofy-visual-fx';
import {
  GoofyHandClassifier,
  GoofyHandStateMachine,
  GoofyDualHandStateMachine,
  detectDualHandCombo,
} from '../modules/pose/goofy-hand-classifier';
import { GoofyEventEngine } from '../modules/pose/goofy-event-engine';
import {
  DEFAULT_MEME_LIBRARY,
  ORIGINAL_VECTOR_MEMES,
  REAL_MEDIA_MEMES,
  getDefaultMemeForAction,
  getMemeById,
  filterMemesByCategory,
  searchMemes,
  getRandomMemeForAction,
  getRareMeme,
  getPresetById,
} from '../modules/pose/goofy-meme-library';
import { SemanticMemeMatcher } from '../modules/pose/goofy-semantic-matcher';
import { Landmark3D } from '../modules/hand/types';
import { PoseLandmark } from '../modules/pose/types';
import {
  GoofyPoseType,
  GoofyHandGestureType,
  GoofyDualHandComboId,
  GOOFY_DUAL_COMBO_DEFINITIONS,
  DEFAULT_GOOFY_CONFIG,
  DEFAULT_SOUND_LIBRARY,
  BUILTIN_MEME_PRESETS,
  GOOFY_ACTION_RECOMMENDED_MEMES,
  SEMANTIC_MEME_CATEGORIES,
  MemeCategory,
  MemePresetId,
} from '../modules/pose/goofy-types';

/**
 * Helper to build a canonical base skeleton with 33 landmarks
 */
function createBaseSkeleton(): PoseLandmark[] {
  const landmarks: PoseLandmark[] = [];
  const cx = 0.5;

  // 0: Nose
  landmarks.push({ x: cx, y: 0.20, z: 0, visibility: 0.99 });
  // 1-10: Face
  for (let i = 1; i <= 10; i++) {
    landmarks.push({ x: cx + (i % 2 === 0 ? 0.03 : -0.03), y: 0.18, z: 0, visibility: 0.95 });
  }
  // 11: Left Shoulder, 12: Right Shoulder
  landmarks[11] = { x: cx - 0.12, y: 0.30, z: 0, visibility: 0.99 };
  landmarks[12] = { x: cx + 0.12, y: 0.30, z: 0, visibility: 0.99 };
  // 13: Left Elbow, 14: Right Elbow
  landmarks[13] = { x: cx - 0.16, y: 0.44, z: 0, visibility: 0.99 };
  landmarks[14] = { x: cx + 0.16, y: 0.44, z: 0, visibility: 0.99 };
  // 15: Left Wrist, 16: Right Wrist
  landmarks[15] = { x: cx - 0.18, y: 0.58, z: 0, visibility: 0.99 };
  landmarks[16] = { x: cx + 0.18, y: 0.58, z: 0, visibility: 0.99 };
  // 17-22: Hands
  for (let i = 17; i <= 22; i++) {
    landmarks[i] = { x: cx + (i % 2 === 0 ? 0.19 : -0.19), y: 0.60, z: 0, visibility: 0.95 };
  }
  // 23: Left Hip, 24: Right Hip
  landmarks[23] = { x: cx - 0.09, y: 0.60, z: 0, visibility: 0.99 };
  landmarks[24] = { x: cx + 0.09, y: 0.60, z: 0, visibility: 0.99 };
  // 25: Left Knee, 26: Right Knee
  landmarks[25] = { x: cx - 0.10, y: 0.78, z: 0, visibility: 0.99 };
  landmarks[26] = { x: cx + 0.10, y: 0.78, z: 0, visibility: 0.99 };
  // 27: Left Ankle, 28: Right Ankle
  landmarks[27] = { x: cx - 0.10, y: 0.95, z: 0, visibility: 0.99 };
  landmarks[28] = { x: cx + 0.10, y: 0.95, z: 0, visibility: 0.99 };
  // 29-32: Feet
  for (let i = 29; i <= 32; i++) {
    landmarks[i] = { x: cx + (i % 2 === 0 ? 0.11 : -0.11), y: 0.98, z: 0, visibility: 0.95 };
  }
  return landmarks;
}

/**
 * Helper to build a canonical 21-point hand landmark array with all fingers extended
 */
function createBaseHandLandmarks(): Landmark3D[] {
  const lm: Landmark3D[] = [];
  const wx = 0.5;
  const wy = 0.7;

  // 0: Wrist
  lm.push({ x: wx, y: wy, z: 0 });

  // 1-4: Thumb (CMC, MCP, IP, TIP) - extended diagonally
  lm.push({ x: wx - 0.04, y: wy - 0.05, z: 0 });
  lm.push({ x: wx - 0.08, y: wy - 0.09, z: 0 });
  lm.push({ x: wx - 0.12, y: wy - 0.13, z: 0 });
  lm.push({ x: wx - 0.15, y: wy - 0.16, z: 0 });

  // 5-8: Index (MCP, PIP, DIP, TIP) - extended straight up
  lm.push({ x: wx - 0.04, y: wy - 0.12, z: 0 });
  lm.push({ x: wx - 0.05, y: wy - 0.18, z: 0 });
  lm.push({ x: wx - 0.05, y: wy - 0.22, z: 0 });
  lm.push({ x: wx - 0.05, y: wy - 0.28, z: 0 });

  // 9-12: Middle (MCP, PIP, DIP, TIP) - extended straight up
  lm.push({ x: wx, y: wy - 0.13, z: 0 });
  lm.push({ x: wx, y: wy - 0.19, z: 0 });
  lm.push({ x: wx, y: wy - 0.25, z: 0 });
  lm.push({ x: wx, y: wy - 0.31, z: 0 });

  // 13-16: Ring (MCP, PIP, DIP, TIP) - extended straight up
  lm.push({ x: wx + 0.04, y: wy - 0.12, z: 0 });
  lm.push({ x: wx + 0.04, y: wy - 0.18, z: 0 });
  lm.push({ x: wx + 0.04, y: wy - 0.23, z: 0 });
  lm.push({ x: wx + 0.04, y: wy - 0.29, z: 0 });

  // 17-20: Pinky (MCP, PIP, DIP, TIP) - extended straight up
  lm.push({ x: wx + 0.07, y: wy - 0.10, z: 0 });
  lm.push({ x: wx + 0.08, y: wy - 0.15, z: 0 });
  lm.push({ x: wx + 0.08, y: wy - 0.20, z: 0 });
  lm.push({ x: wx + 0.09, y: wy - 0.25, z: 0 });

  return lm;
}

function curlFinger(lm: Landmark3D[], mcpIdx: number, pipIdx: number, dipIdx: number, tipIdx: number) {
  const mcp = lm[mcpIdx]!;
  // Pull tip closer to wrist than PIP
  lm[dipIdx] = { x: mcp.x, y: mcp.y - 0.03, z: 0.02 };
  lm[tipIdx] = { x: mcp.x, y: mcp.y - 0.01, z: 0.04 };
}

describe('Goofy Mode // Human Sound Effect Generator', () => {
  let classifier: GoofyPoseClassifier;
  let stateMachine: GoofyPoseStateMachine;

  beforeEach(() => {
    classifier = new GoofyPoseClassifier();
    stateMachine = new GoofyPoseStateMachine({ minHoldMs: 200, cooldownMs: 600 });
  });

  describe('GoofyPoseClassifier: Geometric Classification', () => {
    it('returns NO HUMAN DETECTED when landmarks are null or insufficient', () => {
      const resNull = classifier.classify(null);
      expect(resNull.pose).toBeNull();
      expect(resNull.label).toBe('NO HUMAN DETECTED');

      const resEmpty = classifier.classify([]);
      expect(resEmpty.pose).toBeNull();
      expect(resEmpty.label).toBe('NO HUMAN DETECTED');
    });

    it('returns PARTIAL VISIBILITY when upper body key landmarks are obscured', () => {
      const skeleton = createBaseSkeleton();
      skeleton[11]!.visibility = 0.1; // Low shoulder visibility
      const res = classifier.classify(skeleton);
      expect(res.pose).toBeNull();
      expect(res.label).toBe('PARTIAL VISIBILITY');
    });

    it('correctly classifies T-POSE with outstretched horizontal arms', () => {
      const skeleton = createBaseSkeleton();
      // Level horizontal arms
      skeleton[13] = { x: 0.25, y: 0.30, z: 0, visibility: 0.99 }; // Left Elbow
      skeleton[15] = { x: 0.05, y: 0.30, z: 0, visibility: 0.99 }; // Left Wrist
      skeleton[14] = { x: 0.75, y: 0.30, z: 0, visibility: 0.99 }; // Right Elbow
      skeleton[16] = { x: 0.95, y: 0.30, z: 0, visibility: 0.99 }; // Right Wrist

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('T_POSE');
      expect(res.confidence).toBeGreaterThan(0.7);
    });

    it('correctly classifies HANDS_RAISED with arms reaching overhead', () => {
      const skeleton = createBaseSkeleton();
      // Wrists high above shoulders
      skeleton[13] = { x: 0.36, y: 0.16, z: 0, visibility: 0.99 };
      skeleton[15] = { x: 0.34, y: 0.04, z: 0, visibility: 0.99 };
      skeleton[14] = { x: 0.64, y: 0.16, z: 0, visibility: 0.99 };
      skeleton[16] = { x: 0.66, y: 0.04, z: 0, visibility: 0.99 };

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('HANDS_RAISED');
      expect(res.confidence).toBeGreaterThan(0.75);
    });

    it('correctly classifies DOUBLE_BICEPS_FLEX / FLEX_POSE with 90 deg elbows and wrists up', () => {
      const skeleton = createBaseSkeleton();
      // Shoulders out, elbows bent 90°, wrists up
      skeleton[13] = { x: 0.26, y: 0.30, z: 0, visibility: 0.99 }; // Left Elbow out
      skeleton[15] = { x: 0.28, y: 0.18, z: 0, visibility: 0.99 }; // Left Wrist up
      skeleton[14] = { x: 0.74, y: 0.30, z: 0, visibility: 0.99 }; // Right Elbow out
      skeleton[16] = { x: 0.72, y: 0.18, z: 0, visibility: 0.99 }; // Right Wrist up

      const res = classifier.classify(skeleton);
      expect(['DOUBLE_BICEPS_FLEX', 'FLEX_POSE']).toContain(res.pose);
      expect(res.confidence).toBeGreaterThan(0.75);
    });

    it('correctly classifies SQUAT / SQUAT_STANCE with deep knee bend and lowered hips', () => {
      const skeleton = createBaseSkeleton();
      // Lower hips and flex knees
      skeleton[23] = { x: 0.41, y: 0.72, z: 0, visibility: 0.99 }; // Left Hip
      skeleton[24] = { x: 0.59, y: 0.72, z: 0, visibility: 0.99 }; // Right Hip
      skeleton[25] = { x: 0.35, y: 0.82, z: 0.1, visibility: 0.99 }; // Left Knee flexed
      skeleton[26] = { x: 0.65, y: 0.82, z: 0.1, visibility: 0.99 }; // Right Knee flexed
      skeleton[27] = { x: 0.38, y: 0.95, z: 0, visibility: 0.99 }; // Left Ankle
      skeleton[28] = { x: 0.62, y: 0.95, z: 0, visibility: 0.99 }; // Right Ankle

      const res = classifier.classify(skeleton);
      expect(['SQUAT', 'SQUAT_STANCE']).toContain(res.pose);
      expect(res.confidence).toBeGreaterThan(0.75);
    });

    it('rejects SQUAT when lower body is not visible (seated user), setting visibilityState to UPPER_BODY_ONLY', () => {
      const skeleton = createBaseSkeleton();
      // Lower hips and flex knees as if sitting at a desk
      skeleton[23] = { x: 0.41, y: 0.72, z: 0, visibility: 0.99 };
      skeleton[24] = { x: 0.59, y: 0.72, z: 0, visibility: 0.99 };
      skeleton[25] = { x: 0.35, y: 0.82, z: 0.1, visibility: 0.99 };
      skeleton[26] = { x: 0.65, y: 0.82, z: 0.1, visibility: 0.99 };
      // Ankles cropped / out of frame
      skeleton[27] = { x: 0.38, y: 1.15, z: 0, visibility: 0.1 };
      skeleton[28] = { x: 0.62, y: 1.15, z: 0, visibility: 0.1 };

      const res = classifier.classify(skeleton);
      expect(res.pose).toBeNull();
      expect(res.visibilityState).toBe('UPPER_BODY_ONLY');
      expect(res.visibilityWarning).toContain('FULL BODY & LEGS REQUIRED FOR SQUAT');
    });

    it('permits upper body poses (T_POSE) even when user lower body is UPPER_BODY_ONLY', () => {
      const skeleton = createBaseSkeleton();
      // Cut off ankles
      skeleton[27] = { x: 0.38, y: 1.15, z: 0, visibility: 0.1 };
      skeleton[28] = { x: 0.62, y: 1.15, z: 0, visibility: 0.1 };
      // Horizontal T-Pose arms
      skeleton[13] = { x: 0.18, y: 0.30, z: 0, visibility: 0.99 };
      skeleton[14] = { x: 0.82, y: 0.30, z: 0, visibility: 0.99 };
      skeleton[15] = { x: 0.04, y: 0.30, z: 0, visibility: 0.99 };
      skeleton[16] = { x: 0.96, y: 0.30, z: 0, visibility: 0.99 };

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('T_POSE');
      expect(res.visibilityState).toBe('UPPER_BODY_ONLY');
    });

    it('returns PARTIAL VISIBILITY when upper body landmarks are occluded', () => {
      const skeleton = createBaseSkeleton();
      skeleton[11] = { x: 0.38, y: 0.30, z: 0, visibility: 0.1 };
      skeleton[12] = { x: 0.62, y: 0.30, z: 0, visibility: 0.1 };

      const res = classifier.classify(skeleton);
      expect(res.pose).toBeNull();
      expect(res.visibilityState).toBe('PARTIAL');
      expect(res.label).toBe('PARTIAL VISIBILITY');
    });

    it('correctly classifies HANDS_ON_HIPS (Superhero stance)', () => {
      const skeleton = createBaseSkeleton();
      // Hands resting right on hips, elbows flared wide
      skeleton[13] = { x: 0.22, y: 0.45, z: 0, visibility: 0.99 }; // Left elbow flared
      skeleton[14] = { x: 0.78, y: 0.45, z: 0, visibility: 0.99 }; // Right elbow flared
      skeleton[15] = { x: 0.40, y: 0.60, z: 0, visibility: 0.99 }; // Left wrist at hip
      skeleton[16] = { x: 0.60, y: 0.60, z: 0, visibility: 0.99 }; // Right wrist at hip

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('HANDS_ON_HIPS');
      expect(res.confidence).toBeGreaterThan(0.8);
    });

    it('correctly classifies THE_DAB', () => {
      const skeleton = createBaseSkeleton();
      // Left arm straight diagonal up-left, right elbow bent across face near left shoulder
      skeleton[13] = { x: 0.25, y: 0.18, z: 0, visibility: 0.99 }; // Left Elbow
      skeleton[15] = { x: 0.12, y: 0.08, z: 0, visibility: 0.99 }; // Left Wrist diagonal up
      skeleton[14] = { x: 0.52, y: 0.38, z: 0, visibility: 0.99 }; // Right Elbow bent
      skeleton[16] = { x: 0.40, y: 0.28, z: 0, visibility: 0.99 }; // Right Wrist at left shoulder

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('DAB');
      expect(res.confidence).toBeGreaterThan(0.8);
    });

    it('correctly classifies ZEN_PRAYER with wrists touching at sternum', () => {
      const skeleton = createBaseSkeleton();
      // Wrists together at mid-chest
      skeleton[13] = { x: 0.32, y: 0.44, z: 0, visibility: 0.99 }; // Left Elbow
      skeleton[14] = { x: 0.68, y: 0.44, z: 0, visibility: 0.99 }; // Right Elbow
      skeleton[15] = { x: 0.49, y: 0.40, z: 0, visibility: 0.99 }; // Left Wrist
      skeleton[16] = { x: 0.51, y: 0.40, z: 0, visibility: 0.99 }; // Right Wrist touching

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('ZEN_PRAYER');
      expect(res.confidence).toBeGreaterThan(0.8);
    });

    it('correctly classifies ARMS_CROSSED with folded forearms across chest', () => {
      const skeleton = createBaseSkeleton();
      // Forearms crossed across chest midline
      skeleton[13] = { x: 0.32, y: 0.45, z: 0, visibility: 0.99 }; // Left Elbow bent
      skeleton[14] = { x: 0.68, y: 0.45, z: 0, visibility: 0.99 }; // Right Elbow bent
      skeleton[15] = { x: 0.58, y: 0.42, z: 0, visibility: 0.99 }; // Left Wrist crosses to right chest
      skeleton[16] = { x: 0.42, y: 0.42, z: 0, visibility: 0.99 }; // Right Wrist crosses to left chest

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('ARMS_CROSSED');
      expect(res.confidence).toBeGreaterThan(0.8);
      expect(res.isDynamicAction).toBe(false);
    });

    it('correctly classifies CLAP dynamic temporal sequence over sliding window', () => {
      const classifierInst = new GoofyPoseClassifier();
      const frame1 = createBaseSkeleton();
      // Frame 1 at t=1000: hands far apart
      frame1[15] = { x: 0.28, y: 0.42, z: 0, visibility: 0.99 };
      frame1[16] = { x: 0.72, y: 0.42, z: 0, visibility: 0.99 };
      classifierInst.classify(frame1, 1000);

      // Frame 2 at t=1150: hands rapidly approaching
      const frame2 = createBaseSkeleton();
      frame2[15] = { x: 0.40, y: 0.42, z: 0, visibility: 0.99 };
      frame2[16] = { x: 0.60, y: 0.42, z: 0, visibility: 0.99 };
      classifierInst.classify(frame2, 1150);

      // Frame 3 at t=1250: hands impact together in front of chest
      const frame3 = createBaseSkeleton();
      frame3[15] = { x: 0.485, y: 0.42, z: 0, visibility: 0.99 };
      frame3[16] = { x: 0.515, y: 0.42, z: 0, visibility: 0.99 };
      const res = classifierInst.classify(frame3, 1250);

      expect(res.pose).toBe('CLAP');
      expect(res.isDynamicAction).toBe(true);
      expect(res.actionCategory).toBe('DYNAMIC_ACTION');
      expect(res.confidence).toBeGreaterThan(0.9);
    });

    it('correctly classifies JUMP dynamic temporal sequence with upward displacement and velocity', () => {
      const classifierInst = new GoofyPoseClassifier();

      // Frames 1 to 3: Ground baseline (hip at y=0.60)
      for (let t = 1000; t <= 1200; t += 100) {
        const groundFrame = createBaseSkeleton();
        classifierInst.classify(groundFrame, t);
      }

      // Frame 4 at t=1350: Airborne apex (hip raised to y=0.48, delta > 0.12 torsoHeight)
      const airFrame = createBaseSkeleton();
      airFrame[23] = { x: 0.41, y: 0.48, z: 0, visibility: 0.99 }; // Left Hip raised
      airFrame[24] = { x: 0.59, y: 0.48, z: 0, visibility: 0.99 }; // Right Hip raised
      airFrame[25] = { x: 0.40, y: 0.62, z: 0, visibility: 0.99 }; // Left Knee raised
      airFrame[26] = { x: 0.60, y: 0.62, z: 0, visibility: 0.99 }; // Right Knee raised
      airFrame[27] = { x: 0.40, y: 0.76, z: 0, visibility: 0.99 }; // Left Ankle
      airFrame[28] = { x: 0.60, y: 0.76, z: 0, visibility: 0.99 }; // Right Ankle

      const res = classifierInst.classify(airFrame, 1350);
      expect(res.pose).toBe('JUMP');
      expect(res.isDynamicAction).toBe(true);
      expect(res.actionCategory).toBe('DYNAMIC_ACTION');
      expect(res.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('GoofyPoseStateMachine: State Transitions and Trigger Mechanics', () => {
    it('initializes in NO_POSE state', () => {
      expect(stateMachine.getStatus()).toBe('NO_POSE');
      expect(stateMachine.getCurrentPose()).toBeNull();
      expect(stateMachine.getHoldProgress()).toBe(0);
    });

    it('transitions to CANDIDATE when a pose is first presented', () => {
      const now = 1000;
      const result = stateMachine.process(
        {
          pose: 'T_POSE',
          confidence: 0.9,
          label: 'T-POSE // DOMINANCE',
          comicCaption: 'ASSERTING SYSTEM DOMINANCE',
          jointMetrics: {},
        },
        now
      );

      expect(result.status).toBe('CANDIDATE');
      expect(result.activePose).toBe('T_POSE');
      expect(result.triggerEvent).toBeNull();
      expect(result.holdProgress).toBe(0);
    });

    it('accumulates hold progress and fires POSE_TRIGGERED only after minHoldMs', () => {
      let now = 1000;
      const classification = {
        pose: 'T_POSE' as GoofyPoseType,
        confidence: 0.9,
        label: 'T-POSE // DOMINANCE',
        comicCaption: 'ASSERTING SYSTEM DOMINANCE',
        jointMetrics: {},
      };

      // Initial frame at 1000ms
      stateMachine.process(classification, now);

      // Frame at 100ms: halfway (minHoldMs is 200ms)
      now += 100;
      const halfRes = stateMachine.process(classification, now);
      expect(halfRes.status).toBe('CANDIDATE');
      expect(halfRes.holdProgress).toBeCloseTo(0.5, 1);
      expect(halfRes.triggerEvent).toBeNull();

      // Frame at 210ms: threshold reached!
      now += 110;
      const trigRes = stateMachine.process(classification, now);
      expect(trigRes.status).toBe('POSE_TRIGGERED');
      expect(trigRes.holdProgress).toBe(1.0);
      expect(trigRes.triggerEvent).not.toBeNull();
      expect(trigRes.triggerEvent!.pose).toBe('T_POSE');
    });

    it('enforces single-trigger guarantee: holding pose does NOT re-trigger audio repeatedly', () => {
      let now = 1000;
      const classification = {
        pose: 'HANDS_RAISED' as GoofyPoseType,
        confidence: 0.92,
        label: 'VICTORY TOUCHDOWN',
        comicCaption: 'GLORIOUS WIN',
        jointMetrics: {},
      };

      // Complete hold
      stateMachine.process(classification, now);
      now += 250;
      const trigger = stateMachine.process(classification, now);
      expect(trigger.triggerEvent).not.toBeNull();

      // Subsequent 10 frames while still holding pose
      for (let i = 0; i < 10; i++) {
        now += 50;
        const holdRes = stateMachine.process(classification, now);
        expect(holdRes.status).toBe('POSE_TRIGGERED');
        expect(holdRes.triggerEvent).toBeNull(); // No re-trigger while holding!
      }
    });

    it('transitions to POSE_RELEASED when user drops pose to neutral stance', () => {
      let now = 1000;
      const classification = {
        pose: 'DAB' as GoofyPoseType,
        confidence: 0.9,
        label: 'THE DAB',
        comicCaption: 'INSTANT 2016 NOSTALGIA',
        jointMetrics: {},
      };

      // Hold and trigger
      stateMachine.process(classification, now);
      now += 250;
      stateMachine.process(classification, now);

      // User relaxes arms to neutral stance
      now += 100;
      const releaseRes = stateMachine.process(
        {
          pose: null,
          confidence: 0,
          label: 'NEUTRAL STANCE',
          comicCaption: 'READY FOR ACTION',
          jointMetrics: {},
        },
        now
      );

      expect(releaseRes.status).toBe('POSE_RELEASED');
      expect(releaseRes.activePose).toBeNull();
    });

    it('respects cooldown before allowing another pose to trigger', () => {
      let now = 1000;
      const poseA = {
        pose: 'T_POSE' as GoofyPoseType,
        confidence: 0.9,
        label: 'T-POSE',
        comicCaption: 'T-POSE',
        jointMetrics: {},
      };

      // Trigger Pose A at 1250ms
      stateMachine.process(poseA, now);
      now += 250;
      const firstTrigger = stateMachine.process(poseA, now);
      expect(firstTrigger.triggerEvent).not.toBeNull();

      // Immediately release
      now += 50;
      stateMachine.process({ pose: null, confidence: 0, label: 'NEUTRAL STANCE', comicCaption: '', jointMetrics: {} }, now);

      // Try switching to Pose B within cooldown (cooldown is 600ms, elapsed since trigger is only 150ms)
      const poseB = {
        pose: 'DOUBLE_BICEPS_FLEX' as GoofyPoseType,
        confidence: 0.95,
        label: 'FLEX',
        comicCaption: 'FLEX',
        jointMetrics: {},
      };

      now += 100; // now = 1400 (elapsed: 150ms < 600ms)
      stateMachine.process(poseB, now);
      now += 250; // now = 1650 (hold complete, but cooldown elapsed = 400ms < 600ms)
      const gatedRes = stateMachine.process(poseB, now);

      expect(gatedRes.status).toBe('STABLE_RECOGNIZED');
      expect(gatedRes.triggerEvent).toBeNull(); // Cooldown blocked trigger!

      // Advance past cooldown (now = 1900ms, elapsed 650ms > 600ms)
      now += 250;
      const allowedRes = stateMachine.process(poseB, now);
      expect(allowedRes.status).toBe('POSE_TRIGGERED');
      expect(allowedRes.triggerEvent).not.toBeNull();
      expect(allowedRes.triggerEvent!.pose).toBe('DOUBLE_BICEPS_FLEX');
    });

    it('triggers dynamic actions immediately on sequence completion without requiring minHoldMs hold time', () => {
      const now = 2000;
      const dynamicClap = {
        pose: 'CLAP' as GoofyPoseType,
        confidence: 0.95,
        label: 'COMIC CLAP // APPLAUSE',
        comicCaption: 'CLAP!',
        isDynamicAction: true,
        actionCategory: 'DYNAMIC_ACTION' as const,
        jointMetrics: {},
      };

      // Dynamic action triggers immediately on frame 1 without waiting for hold progress!
      const res = stateMachine.process(dynamicClap, now);
      expect(res.status).toBe('POSE_TRIGGERED');
      expect(res.triggerEvent).not.toBeNull();
      expect(res.triggerEvent!.pose).toBe('CLAP');
    });
  });

  describe('GoofyAudioEngine & Pose Sound Mappings', () => {
    it('initializes with default pose sound mappings for all core actions', () => {
      const engine = new GoofyAudioEngine();
      const mappings = engine.getMappings();

      expect(Object.keys(mappings).length).toBeGreaterThanOrEqual(8);
      expect(mappings.T_POSE.soundId).toBe('INCEPTION_BRAAAM');
      expect(mappings.HANDS_RAISED.soundId).toBe('CROWD_CHEER');
      expect(mappings.HANDS_ON_HIPS.soundId).toBe('CONFIDENT_ENTRANCE');
      expect(mappings.ARMS_CROSSED.soundId).toBe('DRAMATIC_SUSPENSE');
      expect(mappings.SQUAT.soundId).toBe('CARTOON_IMPACT');
      expect(mappings.JUMP.soundId).toBe('CARTOON_JUMP');
      expect(mappings.FLEX_POSE.soundId).toBe('ANIME_POWER_UP');
      expect(mappings.CLAP.soundId).toBe('CARTOON_CLAP');
    });

    it('allows updating sound mappings for specific poses', () => {
      const engine = new GoofyAudioEngine();
      engine.setMapping('T_POSE', 'SAD_TROMBONE');
      expect(engine.getMappings().T_POSE.soundId).toBe('SAD_TROMBONE');
    });

    it('supports random sound mode toggling', () => {
      const engine = new GoofyAudioEngine();
      expect(engine.isRandomSoundEnabled()).toBe(false);
      engine.setRandomSoundEnabled(true);
      expect(engine.isRandomSoundEnabled()).toBe(true);
    });

    it('adjusts volume and mute states cleanly', () => {
      const engine = new GoofyAudioEngine();
      engine.setVolume(0.42);
      expect(engine.getVolume()).toBe(0.42);

      engine.setMuted(true);
      expect(engine.isMuted()).toBe(true);
      engine.setMuted(false);
      expect(engine.isMuted()).toBe(false);
    });

    it('successfully triggers synthesized sounds for all sound definitions without errors', () => {
      const engine = new GoofyAudioEngine();
      const library = engine.getSoundLibrary();
      expect(library.length).toBeGreaterThanOrEqual(22);

      // Verify all 22 sounds (including new V2 sounds) can be previewed/triggered without throwing
      for (const sound of library) {
        expect(() => engine.playSound(sound.id)).not.toThrow();
      }
    });
  });

  describe('Goofy Visual FX: Comic Particle Emitter', () => {
    it('spawns particles on trigger and decays over time', () => {
      const emitter = new GoofyParticleEmitter();
      expect(emitter.getParticles()).toHaveLength(0);

      // Burst 30 comic particles
      emitter.burst(500, 400, '#FFE600', 30);
      expect(emitter.getParticles().length).toBe(30);

      // Step physics forward by 0.5s
      emitter.update(0.5);
      const remaining = emitter.getParticles();
      expect(remaining.length).toBeGreaterThan(0);
      expect(remaining[0]!.life).toBeGreaterThan(0);

      // Advance 2 full seconds: all particles should expire
      emitter.update(2.0);
      expect(emitter.getParticles()).toHaveLength(0);
    });
  });

  describe('GoofyHandClassifier: 12 Target Hand Gestures', () => {
    let handClassifier: GoofyHandClassifier;

    beforeEach(() => {
      handClassifier = new GoofyHandClassifier();
    });

    it('returns NO HAND DETECTED when landmarks are null or fewer than 21', () => {
      const resNull = handClassifier.classify(null as any);
      expect(resNull.gesture).toBeNull();
      expect(resNull.label).toBe('NO HAND DETECTED');

      const resShort = handClassifier.classify([]);
      expect(resShort.gesture).toBeNull();
    });

    it('correctly classifies OPEN_PALM / FIVE_FINGERS when all fingers are extended', () => {
      const hand = createBaseHandLandmarks();
      const res = handClassifier.classify(hand, 'Right');
      expect(['OPEN_PALM', 'FIVE_FINGERS']).toContain(res.gesture);
      expect(res.confidence).toBeGreaterThan(0.85);
    });

    it('correctly classifies CLOSED_FIST when all fingers and thumb are curled', () => {
      const hand = createBaseHandLandmarks();
      curlFinger(hand, 5, 6, 7, 8); // index
      curlFinger(hand, 9, 10, 11, 12); // middle
      curlFinger(hand, 13, 14, 15, 16); // ring
      curlFinger(hand, 17, 18, 19, 20); // pinky
      // Thumb curled across palm
      hand[4] = { x: 0.51, y: 0.63, z: 0 };

      const res = handClassifier.classify(hand, 'Right');
      expect(res.gesture).toBe('CLOSED_FIST');
      expect(res.confidence).toBeGreaterThan(0.9);
    });

    it('correctly classifies THUMBS_UP when fingers are curled and thumb points upward', () => {
      const hand = createBaseHandLandmarks();
      curlFinger(hand, 5, 6, 7, 8);
      curlFinger(hand, 9, 10, 11, 12);
      curlFinger(hand, 13, 14, 15, 16);
      curlFinger(hand, 17, 18, 19, 20);
      // Thumb pointing up: y smaller than IP and indexMCP
      hand[3] = { x: 0.44, y: 0.52, z: 0 };
      hand[4] = { x: 0.44, y: 0.45, z: 0 };

      const res = handClassifier.classify(hand, 'Right');
      expect(res.gesture).toBe('THUMBS_UP');
      expect(res.confidence).toBeGreaterThan(0.9);
    });

    it('correctly classifies THUMBS_DOWN when fingers are curled and thumb points downward', () => {
      const hand = createBaseHandLandmarks();
      curlFinger(hand, 5, 6, 7, 8);
      curlFinger(hand, 9, 10, 11, 12);
      curlFinger(hand, 13, 14, 15, 16);
      curlFinger(hand, 17, 18, 19, 20);
      // Thumb pointing down: y larger than IP and wrist (wrist.y = 0.70)
      hand[3] = { x: 0.44, y: 0.72, z: 0 };
      hand[4] = { x: 0.44, y: 0.78, z: 0 };

      const res = handClassifier.classify(hand, 'Right');
      expect(res.gesture).toBe('THUMBS_DOWN');
      expect(res.confidence).toBeGreaterThan(0.9);
    });

    it('correctly classifies POINTING when index is extended and others are curled', () => {
      const hand = createBaseHandLandmarks();
      curlFinger(hand, 9, 10, 11, 12);
      curlFinger(hand, 13, 14, 15, 16);
      curlFinger(hand, 17, 18, 19, 20);
      hand[4] = { x: 0.52, y: 0.62, z: 0 }; // thumb curled

      const res = handClassifier.classify(hand, 'Right');
      expect(res.gesture).toBe('POINTING');
      expect(res.confidence).toBeGreaterThan(0.9);
    });

    it('correctly classifies PEACE_SIGN when index and middle are spread in V-shape', () => {
      const hand = createBaseHandLandmarks();
      hand[8] = { x: 0.42, y: 0.42, z: 0 }; // index tip left
      hand[12] = { x: 0.58, y: 0.42, z: 0 }; // middle tip right
      curlFinger(hand, 13, 14, 15, 16);
      curlFinger(hand, 17, 18, 19, 20);
      hand[4] = { x: 0.52, y: 0.62, z: 0 };

      const res = handClassifier.classify(hand, 'Right');
      expect(res.gesture).toBe('PEACE_SIGN');
      expect(res.confidence).toBeGreaterThan(0.9);
    });

    it('correctly classifies PINCH when thumb tip and index tip are in close proximity', () => {
      const hand = createBaseHandLandmarks();
      hand[4] = { x: 0.46, y: 0.50, z: 0 };
      hand[8] = { x: 0.47, y: 0.50, z: 0 };

      const res = handClassifier.classify(hand, 'Right');
      expect(res.gesture).toBe('PINCH');
      expect(res.confidence).toBeGreaterThan(0.85);
    });

    it('correctly classifies THREE_FINGERS when index, middle, and ring are extended', () => {
      const hand = createBaseHandLandmarks();
      curlFinger(hand, 17, 18, 19, 20); // pinky curled
      hand[4] = { x: 0.52, y: 0.62, z: 0 }; // thumb curled

      const res = handClassifier.classify(hand, 'Right');
      expect(res.gesture).toBe('THREE_FINGERS');
    });

    it('correctly classifies FOUR_FINGERS when all 4 non-thumb fingers are extended and thumb is tucked', () => {
      const hand = createBaseHandLandmarks();
      hand[4] = { x: 0.52, y: 0.62, z: 0 }; // thumb tucked

      const res = handClassifier.classify(hand, 'Right');
      expect(res.gesture).toBe('FOUR_FINGERS');
    });

    it('correctly classifies dynamic SWIPE_LEFT and SWIPE_RIGHT on rapid horizontal movement', () => {
      const t0 = 1000;
      const hand1 = createBaseHandLandmarks();
      hand1[0] = { x: 0.30, y: 0.50, z: 0 };
      handClassifier.classify(hand1, 'Right', t0);

      const hand2 = createBaseHandLandmarks();
      hand2[0] = { x: 0.45, y: 0.50, z: 0 };
      handClassifier.classify(hand2, 'Right', t0 + 50);

      const hand3 = createBaseHandLandmarks();
      hand3[0] = { x: 0.65, y: 0.50, z: 0 };
      const resRight = handClassifier.classify(hand3, 'Right', t0 + 100);

      expect(resRight.gesture).toBe('SWIPE_RIGHT');
      expect(resRight.isDynamic).toBe(true);
    });
  });

  describe('GoofyHandStateMachine: Single-Trigger & Temporal Gating', () => {
    it('enforces minHoldMs and emits single trigger on sustained static gesture', () => {
      const sm = new GoofyHandStateMachine({ minHoldMs: 200, cooldownMs: 500 });
      const classification = {
        gesture: 'THUMBS_UP' as GoofyHandGestureType,
        handedness: 'Right' as const,
        confidence: 0.95,
        label: 'THUMBS UP',
        comicCaption: 'CHAD ENERGY DETECTED!',
      };

      // Frame 1: Candidate onset
      const r1 = sm.process(classification, 1000);
      expect(r1.triggered).toBe(false);

      // Frame 2: 100ms held (still < minHoldMs)
      const r2 = sm.process(classification, 1100);
      expect(r2.triggered).toBe(false);

      // Frame 3: 250ms held (>= minHoldMs) -> Fires single trigger!
      const r3 = sm.process(classification, 1250);
      expect(r3.triggered).toBe(true);
      expect(r3.gesture).toBe('THUMBS_UP');

      // Frame 4: 400ms held (sustained hold) -> Must NOT trigger again!
      const r4 = sm.process(classification, 1400);
      expect(r4.triggered).toBe(false);
    });

    it('fast-paths dynamic swipes immediately respecting cooldown', () => {
      const sm = new GoofyHandStateMachine({ minHoldMs: 200, cooldownMs: 500 });
      const classification = {
        gesture: 'SWIPE_RIGHT' as GoofyHandGestureType,
        handedness: 'Right' as const,
        confidence: 0.95,
        label: 'SWIPE RIGHT',
        comicCaption: 'WHOOSH!',
        isDynamic: true,
      };

      // Dynamic action triggers immediately without hold
      const r1 = sm.process(classification, 1000);
      expect(r1.triggered).toBe(true);

      // Follow-up within cooldown is gated
      const r2 = sm.process(classification, 1200);
      expect(r2.triggered).toBe(false);

      // After cooldown expires, can trigger again
      const r3 = sm.process(classification, 1600);
      expect(r3.triggered).toBe(true);
    });
  });

  describe('GoofyEventEngine: Multimodal Arbitration & Meme Pop-up Lifecycle', () => {
    it('ALLOW_BOTH policy allows both body and hand events and bounds active popups', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config = { ...DEFAULT_GOOFY_CONFIG, simultaneousPolicy: 'ALLOW_BOTH' as const };
      const engine = new GoofyEventEngine(config, audio, vfx);

      const e1 = engine.dispatchActionTrigger('T_POSE', 'BODY');
      expect(e1).not.toBeNull();
      expect(engine.getActivePopups().length).toBe(1);

      const e2 = engine.dispatchActionTrigger('THUMBS_UP', 'HAND', 'Right');
      expect(e2).not.toBeNull();
      expect(engine.getActivePopups().length).toBe(2);
    });

    it('HAND_PRIORITY policy suppresses body events while hand popup is active', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config = { ...DEFAULT_GOOFY_CONFIG, simultaneousPolicy: 'HAND_PRIORITY' as const };
      const engine = new GoofyEventEngine(config, audio, vfx);

      // Hand event triggers first
      engine.dispatchActionTrigger('THUMBS_UP', 'HAND', 'Right');
      expect(engine.getActivePopups().length).toBe(1);

      // Body event is suppressed
      const bodyResult = engine.dispatchActionTrigger('T_POSE', 'BODY');
      expect(bodyResult).toBeNull();
      expect(engine.getActivePopups().length).toBe(1);
    });

    it('BODY_PRIORITY policy suppresses hand events while body popup is active', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config = { ...DEFAULT_GOOFY_CONFIG, simultaneousPolicy: 'BODY_PRIORITY' as const };
      const engine = new GoofyEventEngine(config, audio, vfx);

      // Body event triggers first
      engine.dispatchActionTrigger('T_POSE', 'BODY');
      expect(engine.getActivePopups().length).toBe(1);

      // Hand event is suppressed
      const handResult = engine.dispatchActionTrigger('THUMBS_UP', 'HAND', 'Right');
      expect(handResult).toBeNull();
      expect(engine.getActivePopups().length).toBe(1);
    });

    it('REPLACE_OLDEST policy clears existing popups on new trigger', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config = { ...DEFAULT_GOOFY_CONFIG, simultaneousPolicy: 'REPLACE_OLDEST' as const };
      const engine = new GoofyEventEngine(config, audio, vfx);

      engine.dispatchActionTrigger('T_POSE', 'BODY');
      expect(engine.getActivePopups().length).toBe(1);
      const firstId = engine.getActivePopups()[0]!.id;

      engine.dispatchActionTrigger('POINTING', 'HAND');
      expect(engine.getActivePopups().length).toBe(1);
      expect(engine.getActivePopups()[0]!.id).not.toBe(firstId);
      expect(engine.getActivePopups()[0]!.actionId).toBe('POINTING');
    });

    it('RIGHT_PRIORITY policy favors Right hand over Left hand', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config = { ...DEFAULT_GOOFY_CONFIG, simultaneousPolicy: 'RIGHT_PRIORITY' as const };
      const engine = new GoofyEventEngine(config, audio, vfx);

      // Right hand triggers first
      engine.dispatchActionTrigger('THUMBS_UP', 'HAND', 'Right');
      expect(engine.getActivePopups().length).toBe(1);
      expect(engine.getActivePopups()[0]!.hand).toBe('Right');

      // Left hand is suppressed
      const leftRes = engine.dispatchActionTrigger('POINTING', 'HAND', 'Left');
      expect(leftRes).toBeNull();
      expect(engine.getActivePopups().length).toBe(1);
    });

    it('LEFT_PRIORITY policy favors Left hand over Right hand', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config = { ...DEFAULT_GOOFY_CONFIG, simultaneousPolicy: 'LEFT_PRIORITY' as const };
      const engine = new GoofyEventEngine(config, audio, vfx);

      // Left hand triggers first
      engine.dispatchActionTrigger('POINTING', 'HAND', 'Left');
      expect(engine.getActivePopups().length).toBe(1);
      expect(engine.getActivePopups()[0]!.hand).toBe('Left');

      // Right hand is suppressed
      const rightRes = engine.dispatchActionTrigger('THUMBS_UP', 'HAND', 'Right');
      expect(rightRes).toBeNull();
      expect(engine.getActivePopups().length).toBe(1);
    });

    it('previewAction dispatches test popup and sound', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const engine = new GoofyEventEngine(DEFAULT_GOOFY_CONFIG, audio, vfx);

      const previewPopup = engine.previewAction('PINCH', 'HAND');
      expect(previewPopup).not.toBeNull();
      expect(previewPopup!.isManualPreview).toBe(true);
      expect(previewPopup!.caption).toContain('[PREVIEW]');
      expect(engine.getActivePopups().length).toBe(1);
    });
  });

  describe('GoofyMemeLibrary: Real Media Assets, Original Vectors & Semantic Matching (V3 Real Meme Engine)', () => {
    it('contains 42 authentic real media memes locally served with valid mediaTypes and categories', () => {
      expect(REAL_MEDIA_MEMES.length).toBe(42);

      const realIdSet = new Set<string>();
      let gifCount = 0;
      let imgCount = 0;

      for (const meme of REAL_MEDIA_MEMES) {
        expect(meme.id).toBeTruthy();
        expect(realIdSet.has(meme.id)).toBe(false);
        realIdSet.add(meme.id);

        expect(meme.title).toBeTruthy();
        expect(meme.caption).toBeTruthy();
        expect(meme.category).toBeTruthy();
        expect(meme.sourceType).toBe('REAL_MEDIA');
        expect(meme.dataUrl).toMatch(/^\/memes\//);

        if (meme.mediaType === 'gif') gifCount++;
        if (meme.mediaType === 'image') imgCount++;

        expect(['image', 'gif']).toContain(meme.mediaType);
        expect(meme.soundId).toBeDefined();
      }

      expect(gifCount).toBe(12);
      expect(imgCount).toBe(30);
    });

    it('contains 68 original vector SVG memes with valid data URLs and stable IDs', () => {
      expect(ORIGINAL_VECTOR_MEMES.length).toBe(68);

      const idSet = new Set<string>();
      for (const meme of ORIGINAL_VECTOR_MEMES) {
        expect(meme.id).toBeTruthy();
        expect(idSet.has(meme.id)).toBe(false);
        idSet.add(meme.id);

        expect(meme.title).toBeTruthy();
        expect(meme.caption).toBeTruthy();
        expect(meme.category).toBeTruthy();
        expect(meme.dataUrl).toMatch(/^data:image\/svg\+xml;utf8,/);
        const decodedSvg = decodeURIComponent(meme.dataUrl);
        expect(decodedSvg).toContain('<svg');
        expect(decodedSvg).toContain('</svg>');
      }
    });

    it('DEFAULT_MEME_LIBRARY combines real media (42) and vector memes (68) for 110 total presets', () => {
      expect(DEFAULT_MEME_LIBRARY.length).toBe(110);
      expect(DEFAULT_MEME_LIBRARY.slice(0, 42)).toEqual(REAL_MEDIA_MEMES);
    });

    it('returns appropriate real media default memes for hand gestures', () => {
      const thumbsUpMeme = getDefaultMemeForAction('THUMBS_UP');
      expect(thumbsUpMeme.id).toBe('REAL_MEME_GIGACHAD');

      const openPalmMeme = getDefaultMemeForAction('OPEN_PALM');
      expect(openPalmMeme.id).toBe('REAL_MEME_CONFUSED_TRAVOLTA_GIF');

      const pointingMeme = getDefaultMemeForAction('POINTING');
      expect(pointingMeme.id).toBe('REAL_MEME_SPIDERMAN_POINTING');

      const pinchMeme = getDefaultMemeForAction('PINCH');
      expect(pinchMeme.id).toBe('REAL_MEME_THE_ROCK_EYEBROW_GIF');

      const fistMeme = getDefaultMemeForAction('CLOSED_FIST');
      expect(fistMeme.id).toBe('REAL_MEME_ARTHURS_FIST');
    });

    it('validates all 10 semantic reaction categories in SEMANTIC_MEME_CATEGORIES', () => {
      expect(SEMANTIC_MEME_CATEGORIES.length).toBe(10);
      const categoryIds = SEMANTIC_MEME_CATEGORIES.map((c) => c.id);

      expect(categoryIds).toContain('APPROVAL_CONFIDENCE');
      expect(categoryIds).toContain('DISAPPROVAL_REJECTION');
      expect(categoryIds).toContain('ANGER_AGGRESSION');
      expect(categoryIds).toContain('SURPRISE_SHOCK');
      expect(categoryIds).toContain('CONFUSION');
      expect(categoryIds).toContain('VICTORY_CELEBRATION');
      expect(categoryIds).toContain('SUSPICION_JUDGEMENT');
      expect(categoryIds).toContain('FAILURE_DISAPPOINTMENT');
      expect(categoryIds).toContain('CHAOS_UNEXPECTED');
      expect(categoryIds).toContain('HAND_GESTURE_REACTION');
    });

    it('SemanticMemeMatcher matches gestures to appropriate memes and applies anti-repetition memory', () => {
      const matcher = new SemanticMemeMatcher();
      const config = { ...DEFAULT_GOOFY_CONFIG, smartMatchingEnabled: true };

      // First match for THUMBS_UP
      const match1 = matcher.match(
        { actionId: 'THUMBS_UP', source: 'HAND', hand: 'Right' },
        DEFAULT_MEME_LIBRARY,
        config
      );
      expect(match1).not.toBeNull();
      expect(match1!.meme).toBeDefined();

      // Second match immediately after: anti-repetition penalty prevents identical pick if candidates exist
      const match2 = matcher.match(
        { actionId: 'THUMBS_UP', source: 'HAND', hand: 'Right' },
        DEFAULT_MEME_LIBRARY,
        config
      );
      expect(match2).not.toBeNull();

      // Third test: filter by GIFs only
      const gifConfig = { ...config, mediaTypeFilter: 'GIFS_ONLY' as const };
      const gifMatch = matcher.match(
        { actionId: 'FIVE_FINGERS', source: 'HAND', hand: 'Right' },
        DEFAULT_MEME_LIBRARY,
        gifConfig
      );
      expect(gifMatch).not.toBeNull();
      expect(gifMatch!.meme.mediaType).toBe('gif');
    });

    it('filters memes accurately across all requested reaction categories', () => {
      const categories: MemeCategory[] = [
        'CONFUSION',
        'SHOCK',
        'CONFIDENCE',
        'FAILURE',
        'SUSPICIOUS',
        'CELEBRATION',
        'SPECIAL',
      ];

      for (const cat of categories) {
        const filtered = filterMemesByCategory(cat);
        expect(filtered.length).toBeGreaterThanOrEqual(6);
        for (const m of filtered) {
          expect(m.category).toBe(cat);
        }
      }
    });

    it('performs keyword search across title, caption, category, and description', () => {
      const brainResults = searchMemes('brain');
      expect(brainResults.length).toBeGreaterThan(0);
      expect(brainResults.some((m) => m.title.toLowerCase().includes('brain'))).toBe(true);

      const auraResults = searchMemes('AURA');
      expect(auraResults.length).toBeGreaterThan(0);
      expect(auraResults.some((m) => m.id === 'MEME_MAXIMUM_AURA')).toBe(true);

      const emptyQuery = searchMemes('   ');
      expect(emptyQuery.length).toBe(DEFAULT_MEME_LIBRARY.length);
    });

    it('getRandomMemeForAction applies anti-repetition memory and selects valid memes', () => {
      const firstPick = getRandomMemeForAction('T_POSE');
      expect(firstPick).toBeDefined();

      // Consecutive pick with excludeMemeId MUST avoid repeating the same meme
      const secondPick = getRandomMemeForAction('T_POSE', firstPick.id);
      expect(secondPick).toBeDefined();
      expect(secondPick.id).not.toBe(firstPick.id);
    });

    it('getRareMeme returns high-rarity reactions (RARE or LEGENDARY)', () => {
      const rare = getRareMeme();
      expect(rare).toBeDefined();
      expect(['RARE', 'LEGENDARY']).toContain(rare.rarity);
    });

    it('BUILTIN_MEME_PRESETS contains 7 curated presets all mapping to valid meme IDs', () => {
      expect(BUILTIN_MEME_PRESETS.length).toBe(7);
      const presetIds: MemePresetId[] = [
        'DEFAULT',
        'CHAOS_MODE',
        'CLEAN_COMEDY',
        'ULTRA_DRAMA',
        'MAXIMUM_AURA',
        'FAILURE_COMPILATION',
        'UNHINGED_MODE',
      ];

      for (const pid of presetIds) {
        const preset = getPresetById(pid);
        expect(preset).toBeDefined();
        expect(preset!.name).toBeTruthy();
        expect(preset!.actionMemeMappings).toBeDefined();

        // Check that every mapped meme ID in preset exists in DEFAULT_MEME_LIBRARY
        for (const [, memeId] of Object.entries(preset!.actionMemeMappings)) {
          if (memeId) {
            const found = getMemeById(memeId);
            expect(found).toBeDefined();
          }
        }
      }
    });

    it('GOOFY_ACTION_RECOMMENDED_MEMES provides valid recommendations for all 20 actions', () => {
      const bodyActions: GoofyPoseType[] = [
        'T_POSE',
        'HANDS_RAISED',
        'HANDS_ON_HIPS',
        'ARMS_CROSSED',
        'SQUAT',
        'JUMP',
        'FLEX_POSE',
        'CLAP',
      ];

      const handGestures: GoofyHandGestureType[] = [
        'OPEN_PALM',
        'CLOSED_FIST',
        'THUMBS_UP',
        'THUMBS_DOWN',
        'PEACE_SIGN',
        'POINTING',
        'PINCH',
        'THREE_FINGERS',
        'FOUR_FINGERS',
        'FIVE_FINGERS',
        'SWIPE_LEFT',
        'SWIPE_RIGHT',
      ];

      for (const action of [...bodyActions, ...handGestures]) {
        const recs = GOOFY_ACTION_RECOMMENDED_MEMES[action];
        expect(recs).toBeDefined();
        expect(recs!.length).toBeGreaterThanOrEqual(2);

        // Every recommended meme ID must exist
        for (const memeId of recs!) {
          const meme = getMemeById(memeId);
          expect(meme).toBeDefined();
        }
      }
    });

    it('GoofyEventEngine respects randomMemeMode and tracks recent meme IDs', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config = {
        ...DEFAULT_GOOFY_CONFIG,
        randomMemeMode: true,
      };
      const engine = new GoofyEventEngine(config, audio, vfx);

      const evt1 = engine.dispatchActionTrigger('T_POSE', 'BODY');
      expect(evt1).not.toBeNull();
      expect(engine.getRecentMemeIds().length).toBe(1);

      const evt2 = engine.dispatchActionTrigger('T_POSE', 'BODY');
      expect(evt2).not.toBeNull();
      expect(engine.getRecentMemeIds().length).toBe(2);
      // Anti-repetition check
      expect(evt2!.memeId).not.toBe(evt1!.memeId);
    });
  });

  describe('Goofy Model V3 Hand-Only Architecture & Dual-Hand Combos', () => {
    it('detectDualHandCombo detects all 11 specified dual-hand combinations correctly', () => {
      // 1. DOUBLE_THUMBS_UP
      const doubleThumbs = detectDualHandCombo('THUMBS_UP', 'THUMBS_UP');
      expect(doubleThumbs.combo).toBe('DOUBLE_THUMBS_UP');
      expect(doubleThumbs.confidence).toBeGreaterThanOrEqual(0.9);

      // 2. BOTH_HANDS_OPEN
      const openBoth = detectDualHandCombo('OPEN_PALM', 'OPEN_PALM');
      expect(openBoth.combo).toBe('BOTH_HANDS_OPEN');

      const openAndFive = detectDualHandCombo('OPEN_PALM', 'FIVE_FINGERS');
      expect(openAndFive.combo).toBe('BOTH_HANDS_OPEN');

      // 3. BOTH_HANDS_FIST
      const doubleFist = detectDualHandCombo('CLOSED_FIST', 'CLOSED_FIST');
      expect(doubleFist.combo).toBe('BOTH_HANDS_FIST');

      // 4. DOUBLE_PEACE
      const doublePeace = detectDualHandCombo('PEACE_SIGN', 'PEACE_SIGN');
      expect(doublePeace.combo).toBe('DOUBLE_PEACE');

      // 5. THUMBS_UP_AND_DOWN (both symmetric orientations)
      const upDown1 = detectDualHandCombo('THUMBS_UP', 'THUMBS_DOWN');
      expect(upDown1.combo).toBe('THUMBS_UP_AND_DOWN');

      const upDown2 = detectDualHandCombo('THUMBS_DOWN', 'THUMBS_UP');
      expect(upDown2.combo).toBe('THUMBS_UP_AND_DOWN');

      // 6. PERFECT_TEN (All 10 fingers extended)
      const perfectTen = detectDualHandCombo('FIVE_FINGERS', 'FIVE_FINGERS');
      expect(perfectTen.combo).toBe('PERFECT_TEN');
      expect(perfectTen.confidence).toBeGreaterThanOrEqual(0.95);

      // 7. DOUBLE_THREE (Three + Three = 6 energy)
      const doubleThree = detectDualHandCombo('THREE_FINGERS', 'THREE_FINGERS');
      expect(doubleThree.combo).toBe('DOUBLE_THREE');

      // 8. ROCK_PAPER_SCISSORS (Dual Duel Clash)
      const rps1 = detectDualHandCombo('CLOSED_FIST', 'PEACE_SIGN');
      expect(rps1.combo).toBe('ROCK_PAPER_SCISSORS');

      const rps2 = detectDualHandCombo('OPEN_PALM', 'CLOSED_FIST');
      expect(rps2.combo).toBe('ROCK_PAPER_SCISSORS');

      // 9. SECRET_YOU_ARE_BREATHTAKING (Keanu dual finger guns)
      const breathtaking = detectDualHandCombo('POINTING', 'POINTING');
      expect(breathtaking.combo).toBe('SECRET_YOU_ARE_BREATHTAKING');

      // 10. SECRET_HEART_HANDS (Dual pinch heart gesture)
      const heartHands = detectDualHandCombo('PINCH', 'PINCH');
      expect(heartHands.combo).toBe('SECRET_HEART_HANDS');

      // 11. SECRET_MATRIX_DODGE (Open Palm + Pointing bullet-time trigger)
      const matrixDodge1 = detectDualHandCombo('OPEN_PALM', 'POINTING');
      expect(matrixDodge1.combo).toBe('SECRET_MATRIX_DODGE');

      const matrixDodge2 = detectDualHandCombo('POINTING', 'OPEN_PALM');
      expect(matrixDodge2.combo).toBe('SECRET_MATRIX_DODGE');
    });

    it('GoofyDualHandStateMachine enforces temporal gating and cooldown', () => {
      const sm = new GoofyDualHandStateMachine({
        minHoldMs: 180,
        cooldownMs: 500,
      });

      const comboResult = { combo: 'DOUBLE_THUMBS_UP' as const, confidence: 0.95 };

      // Frame 1: Candidate onset (0ms)
      const r1 = sm.process(comboResult, 1000);
      expect(r1.status).toBe('CANDIDATE');
      expect(r1.triggered).toBe(false);

      // Frame 2: Mid-hold (100ms)
      const r2 = sm.process(comboResult, 1100);
      expect(r2.status).toBe('CANDIDATE');
      expect(r2.triggered).toBe(false);

      // Frame 3: Hold complete (200ms >= 180ms) -> Triggers!
      const r3 = sm.process(comboResult, 1200);
      expect(r3.status).toBe('TRIGGERED');
      expect(r3.triggered).toBe(true);
      expect(r3.combo).toBe('DOUBLE_THUMBS_UP');

      // Frame 4: Next frame enters COOLDOWN
      const r4 = sm.process(comboResult, 1220);
      expect(r4.status).toBe('COOLDOWN');
      expect(r4.triggered).toBe(false);

      // Frame 5: Before cooldown ends (300ms < 500ms cooldown)
      const r5 = sm.process(comboResult, 1500);
      expect(r5.status).toBe('COOLDOWN');
      expect(r5.triggered).toBe(false);

      // Frame 6: Drop combo (user lowers hands)
      sm.process(null, 1600);

      // Frame 7: After cooldown expires (1200 + 500 = 1700ms), new combo begins
      const r6 = sm.process(comboResult, 1750);
      expect(r6.status).toBe('CANDIDATE');
    });

    it('provides unambiguous geometric separation between OPEN_PALM and FIVE_FINGERS', () => {
      const classifier = new GoofyHandClassifier();

      // Create base flat palm landmarks
      const makePalm = (spreadFactor: number): Landmark3D[] => {
        const lms: Landmark3D[] = [];
        // 0: Wrist
        lms.push({ x: 0.5, y: 0.8, z: 0 });
        // Palm base points (1, 5, 9, 13, 17)
        lms[1] = { x: 0.45, y: 0.7, z: 0 };
        lms[2] = { x: 0.40, y: 0.65, z: 0 };
        lms[3] = { x: 0.35, y: 0.60, z: 0 };
        // Thumb tip: close for flat palm (spreadFactor=1), spread far out for five fingers (spreadFactor=2)
        lms[4] = { x: spreadFactor > 1.2 ? 0.20 : 0.38, y: 0.55, z: 0 };

        // Index (5-8)
        lms[5] = { x: 0.46, y: 0.65, z: 0 };
        lms[6] = { x: 0.45, y: 0.55, z: 0 };
        lms[7] = { x: 0.45, y: 0.45, z: 0 };
        lms[8] = { x: spreadFactor > 1.2 ? 0.40 : 0.45, y: 0.35, z: 0 }; // Index tip

        // Middle (9-12)
        lms[9] = { x: 0.50, y: 0.65, z: 0 };
        lms[10] = { x: 0.50, y: 0.55, z: 0 };
        lms[11] = { x: 0.50, y: 0.45, z: 0 };
        lms[12] = { x: 0.50, y: 0.33, z: 0 }; // Middle tip

        // Ring (13-16)
        lms[13] = { x: 0.54, y: 0.65, z: 0 };
        lms[14] = { x: 0.55, y: 0.55, z: 0 };
        lms[15] = { x: 0.55, y: 0.45, z: 0 };
        lms[16] = { x: spreadFactor > 1.2 ? 0.60 : 0.55, y: 0.36, z: 0 }; // Ring tip

        // Pinky (17-20)
        lms[17] = { x: 0.58, y: 0.68, z: 0 };
        lms[18] = { x: 0.60, y: 0.60, z: 0 };
        lms[19] = { x: 0.61, y: 0.52, z: 0 };
        lms[20] = { x: spreadFactor > 1.2 ? 0.70 : 0.58, y: 0.42, z: 0 }; // Pinky tip

        return lms;
      };

      const flatPalm = makePalm(1.0);
      const resFlat = classifier.classify(flatPalm, 'Right', 1000);
      expect(resFlat.fingerCount).toBe(5);
      expect(resFlat.gesture).toBe('OPEN_PALM');

      const wideSpreadPalm = makePalm(2.0);
      const resWide = classifier.classify(wideSpreadPalm, 'Right', 1000);
      expect(resWide.fingerCount).toBe(5);
      expect(resWide.gesture).toBe('FIVE_FINGERS');
    });

    it('GoofyEventEngine dispatches dual-hand triggers with correct source and metadata', () => {
      const audio = new GoofyAudioEngine();
      const vfx = new GoofyVisualFXEngine();
      const config = { ...DEFAULT_GOOFY_CONFIG, smartMatchingEnabled: false };
      const engine = new GoofyEventEngine(config, audio, vfx);

      const evt = engine.dispatchDualHandTrigger('DOUBLE_THUMBS_UP', 0.98);
      expect(evt).not.toBeNull();
      expect(evt!.source).toBe('DUAL_HAND');
      expect(evt!.actionId).toBe('DOUBLE_THUMBS_UP');
      expect(evt!.actionLabel).toBe('DOUBLE THUMBS UP');
      expect(evt!.memeId).toBe('MEME_MAXIMUM_AURA');
      expect(evt!.soundName).toBe('Triumphant Chad Gong');
    });

    it('verifies all 11 dual-hand combos have default metadata, memes, and sounds', () => {
      const combos: GoofyDualHandComboId[] = [
        'DOUBLE_THUMBS_UP',
        'BOTH_HANDS_OPEN',
        'BOTH_HANDS_FIST',
        'DOUBLE_PEACE',
        'THUMBS_UP_AND_DOWN',
        'PERFECT_TEN',
        'DOUBLE_THREE',
        'ROCK_PAPER_SCISSORS',
        'SECRET_HEART_HANDS',
        'SECRET_MATRIX_DODGE',
        'SECRET_YOU_ARE_BREATHTAKING',
      ];

      expect(combos.length).toBe(11);

      for (const cid of combos) {
        const def = GOOFY_DUAL_COMBO_DEFINITIONS[cid];
        expect(def).toBeDefined();
        expect(def.label).toBeTruthy();
        expect(def.icon).toBeTruthy();
        expect(def.defaultCaption).toBeTruthy();

        // Default meme exists
        const meme = getMemeById(def.defaultMemeId);
        expect(meme).toBeDefined();

        // Default sound exists
        const sound = DEFAULT_SOUND_LIBRARY.find((s) => s.id === def.defaultSoundId);
        expect(sound).toBeDefined();
      }
    });

    it('smooths high-frequency landmark jitter via exponential moving average', () => {
      const classifier = new GoofyHandClassifier();
      const baseHand = createBaseHandLandmarks();

      // First frame
      const r1 = classifier.classify(baseHand, 'Right', 1000);
      expect(r1.gesture).not.toBeNull();

      // Frame with jitter injected into index tip
      const jitteredHand = createBaseHandLandmarks();
      jitteredHand[8] = { x: baseHand[8]!.x + 0.008, y: baseHand[8]!.y - 0.008, z: 0 };
      const r2 = classifier.classify(jitteredHand, 'Right', 1016);
      expect(r2.gesture).toBe(r1.gesture);
    });

    it('correctly reverses horizontal swipe direction when isMirrored is true', () => {
      const classifier = new GoofyHandClassifier();
      const t0 = 1000;

      // Physical hand moves from x = 0.3 to x = 0.65 (positive physical velocity)
      const hand1 = createBaseHandLandmarks();
      hand1[0] = { x: 0.30, y: 0.50, z: 0 };
      classifier.classify(hand1, 'Right', t0, true);

      const hand2 = createBaseHandLandmarks();
      hand2[0] = { x: 0.45, y: 0.50, z: 0 };
      classifier.classify(hand2, 'Right', t0 + 50, true);

      const hand3 = createBaseHandLandmarks();
      hand3[0] = { x: 0.65, y: 0.50, z: 0 };
      // In mirrored mode, moving to right side of sensor corresponds to left swipe on screen
      const resMirrored = classifier.classify(hand3, 'Right', t0 + 100, true);
      expect(resMirrored.gesture).toBe('SWIPE_LEFT');
      expect(resMirrored.isDynamic).toBe(true);
    });
  });
});
