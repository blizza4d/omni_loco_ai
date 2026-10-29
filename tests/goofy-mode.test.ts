import { describe, it, expect, beforeEach } from 'vitest';
import { GoofyPoseClassifier } from '../modules/pose/goofy-pose-classifier';
import { GoofyPoseStateMachine } from '../modules/pose/goofy-state-machine';
import { GoofyAudioEngine } from '../modules/pose/goofy-audio-engine';
import { GoofyParticleEmitter } from '../modules/pose/goofy-visual-fx';
import { PoseLandmark } from '../modules/pose/types';
import { GoofyPoseType } from '../modules/pose/goofy-types';

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

    it('correctly classifies DOUBLE_BICEPS_FLEX with 90 deg elbows and wrists up', () => {
      const skeleton = createBaseSkeleton();
      // Shoulders out, elbows bent 90°, wrists up
      skeleton[13] = { x: 0.26, y: 0.30, z: 0, visibility: 0.99 }; // Left Elbow out
      skeleton[15] = { x: 0.28, y: 0.18, z: 0, visibility: 0.99 }; // Left Wrist up
      skeleton[14] = { x: 0.74, y: 0.30, z: 0, visibility: 0.99 }; // Right Elbow out
      skeleton[16] = { x: 0.72, y: 0.18, z: 0, visibility: 0.99 }; // Right Wrist up

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('DOUBLE_BICEPS_FLEX');
      expect(res.confidence).toBeGreaterThan(0.75);
    });

    it('correctly classifies SQUAT_STANCE with deep knee bend and lowered hips', () => {
      const skeleton = createBaseSkeleton();
      // Lower hips and flex knees
      skeleton[23] = { x: 0.41, y: 0.72, z: 0, visibility: 0.99 }; // Left Hip
      skeleton[24] = { x: 0.59, y: 0.72, z: 0, visibility: 0.99 }; // Right Hip
      skeleton[25] = { x: 0.35, y: 0.82, z: 0.1, visibility: 0.99 }; // Left Knee flexed
      skeleton[26] = { x: 0.65, y: 0.82, z: 0.1, visibility: 0.99 }; // Right Knee flexed
      skeleton[27] = { x: 0.38, y: 0.95, z: 0, visibility: 0.99 }; // Left Ankle
      skeleton[28] = { x: 0.62, y: 0.95, z: 0, visibility: 0.99 }; // Right Ankle

      const res = classifier.classify(skeleton);
      expect(res.pose).toBe('SQUAT_STANCE');
      expect(res.confidence).toBeGreaterThan(0.75);
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
  });

  describe('GoofyAudioEngine & Pose Sound Mappings', () => {
    it('initializes with default pose sound mappings for all 10 poses', () => {
      const engine = new GoofyAudioEngine();
      const mappings = engine.getMappings();

      expect(Object.keys(mappings)).toHaveLength(10);
      expect(mappings.T_POSE.soundId).toBe('INCEPTION_BRAAAM');
      expect(mappings.HANDS_RAISED.soundId).toBe('AIR_HORN');
      expect(mappings.DOUBLE_BICEPS_FLEX.soundId).toBe('ANIME_POWER_UP');
      expect(mappings.SQUAT_STANCE.soundId).toBe('CARTOON_BOING');
      expect(mappings.DAB.soundId).toBe('RECORD_SCRATCH');
      expect(mappings.ZEN_PRAYER.soundId).toBe('SINGING_BOWL');
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
});
