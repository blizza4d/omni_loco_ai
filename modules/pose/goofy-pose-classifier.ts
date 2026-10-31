import { PoseLandmark } from './types';
import {
  GoofyPoseType,
  PoseClassificationResult,
  GOOFY_POSE_METADATA,
} from './goofy-types';

interface PoseHistoryFrame {
  timestamp: number;
  midHipY: number;
  midAnkleY: number;
  wristDist: number;
  torsoHeight: number;
  shoulderWidth: number;
}

export class GoofyPoseClassifier {
  private history: PoseHistoryFrame[] = [];
  private lastClapTriggerTime = 0;
  private lastJumpTriggerTime = 0;

  /**
   * Euclidean distance between two 3D landmarks
   */
  private dist3D(a: PoseLandmark, b: PoseLandmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Computes angle at vertex B formed by rays BA and BC in 3D
   */
  private computeAngle3D(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const baX = a.x - b.x;
    const baY = a.y - b.y;
    const baZ = (a.z || 0) - (b.z || 0);

    const bcX = c.x - b.x;
    const bcY = c.y - b.y;
    const bcZ = (c.z || 0) - (b.z || 0);

    const dot = baX * bcX + baY * bcY + baZ * bcZ;
    const magBA = Math.sqrt(baX * baX + baY * baY + baZ * baZ);
    const magBC = Math.sqrt(bcX * bcX + bcY * bcY + bcZ * bcZ);

    if (magBA < 0.0001 || magBC < 0.0001) return 180;

    const cosine = Math.max(-1.0, Math.min(1.0, dot / (magBA * magBC)));
    return (Math.acos(cosine) * 180) / Math.PI;
  }

  /**
   * Evaluates input 33 MediaPipe pose landmarks and classifies the active human pose or action
   * @param landmarks 33 MediaPipe pose landmarks
   * @param now Current timestamp in milliseconds (defaults to performance.now())
   */
  classify(landmarks: PoseLandmark[] | null, now = typeof performance !== 'undefined' ? performance.now() : Date.now()): PoseClassificationResult {
    if (!landmarks || landmarks.length < 33) {
      return {
        pose: null,
        confidence: 0,
        label: 'NO HUMAN DETECTED',
        comicCaption: 'STEP INTO THE FRAME TO ACTIVATE GOOFY ENGINE',
        jointMetrics: {},
      };
    }

    // Key anatomical landmarks
    const nose = landmarks[0]!;
    const ls = landmarks[11]!; // Left Shoulder
    const rs = landmarks[12]!; // Right Shoulder
    const le = landmarks[13]!; // Left Elbow
    const re = landmarks[14]!; // Right Elbow
    const lw = landmarks[15]!; // Left Wrist
    const rw = landmarks[16]!; // Right Wrist
    const lh = landmarks[23]!; // Left Hip
    const rh = landmarks[24]!; // Right Hip
    const lk = landmarks[25]!; // Left Knee
    const rk = landmarks[26]!; // Right Knee
    const la = landmarks[27]!; // Left Ankle
    const ra = landmarks[28]!; // Right Ankle

    // Visibility guard: upper body must be reliably tracked
    const upperBodyVisible =
      (ls.visibility ?? 1) > 0.4 &&
      (rs.visibility ?? 1) > 0.4 &&
      (le.visibility ?? 1) > 0.4 &&
      (re.visibility ?? 1) > 0.4 &&
      (lw.visibility ?? 1) > 0.35 &&
      (rw.visibility ?? 1) > 0.35;

    if (!upperBodyVisible) {
      return {
        pose: null,
        confidence: 0,
        label: 'PARTIAL VISIBILITY',
        comicCaption: 'ENSURE SHOULDERS AND ARMS ARE CLEARLY VISIBLE',
        jointMetrics: {},
      };
    }

    // Torso scale references
    const midShoulder = {
      x: (ls.x + rs.x) / 2,
      y: (ls.y + rs.y) / 2,
      z: ((ls.z || 0) + (rs.z || 0)) / 2,
    };
    const midHip = {
      x: (lh.x + rh.x) / 2,
      y: (lh.y + rh.y) / 2,
      z: ((lh.z || 0) + (rh.z || 0)) / 2,
    };

    const torsoHeight = Math.max(0.12, this.dist3D(midShoulder, midHip));
    const shoulderWidth = Math.max(0.08, this.dist3D(ls, rs));
    const currentWristDist = this.dist3D(lw, rw);
    const midAnkleY = (la && ra) ? (la.y + ra.y) / 2 : 1.0;

    // Record into rolling history (up to 1.2s / 40 frames)
    this.history.push({
      timestamp: now,
      midHipY: midHip.y,
      midAnkleY,
      wristDist: currentWristDist,
      torsoHeight,
      shoulderWidth,
    });
    if (this.history.length > 40) {
      this.history.shift();
    }
    const cutoff = now - 1200;
    this.history = this.history.filter((h) => h.timestamp >= cutoff);

    // Core joint angles
    const leftElbow = this.computeAngle3D(ls, le, lw);
    const rightElbow = this.computeAngle3D(rs, re, rw);
    const leftShoulder = this.computeAngle3D(lh, ls, le);
    const rightShoulder = this.computeAngle3D(rh, rs, re);
    const leftKnee = this.computeAngle3D(lh, lk, la);
    const rightKnee = this.computeAngle3D(rh, rk, ra);

    const jointMetrics = {
      armElevationLeft: Math.round(leftShoulder),
      armElevationRight: Math.round(rightShoulder),
      elbowAngleLeft: Math.round(leftElbow),
      elbowAngleRight: Math.round(rightElbow),
      kneeAngleLeft: Math.round(leftKnee),
      kneeAngleRight: Math.round(rightKnee),
      wristDistance: Math.round(currentWristDist * 100) / 100,
    };

    const candidates: { pose: GoofyPoseType; score: number; isDynamic?: boolean }[] = [];

    // ─────────────────────────────────────────────────────────────
    // DYNAMIC ACTION 1: CLAP
    // Temporal sequence: hands were separated, rapidly approached, and met
    // ─────────────────────────────────────────────────────────────
    if (now - this.lastClapTriggerTime > 600 && this.history.length >= 3) {
      // Find maximum wrist separation in past 120ms - 450ms
      const pastFrames = this.history.filter((h) => now - h.timestamp >= 100 && now - h.timestamp <= 450);
      const maxPastDist = pastFrames.length > 0 ? Math.max(...pastFrames.map((f) => f.wristDist)) : 0;

      const handsTogetherNow = currentWristDist < Math.min(shoulderWidth * 0.32, torsoHeight * 0.22);
      const handsWereApart = maxPastDist > shoulderWidth * 0.45;
      const handsInFrontOfTorso =
        lw.y > midShoulder.y && lw.y < midHip.y + torsoHeight * 0.1 &&
        rw.y > midShoulder.y && rw.y < midHip.y + torsoHeight * 0.1;

      if (handsTogetherNow && handsWereApart && handsInFrontOfTorso) {
        this.lastClapTriggerTime = now;
        candidates.push({
          pose: 'CLAP',
          score: 0.95,
          isDynamic: true,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // DYNAMIC ACTION 2: JUMP
    // Temporal sequence: pre-jump ground baseline, rapid upward displacement, apex
    // ─────────────────────────────────────────────────────────────
    const lowerBodyVisible = (lk.visibility ?? 0) > 0.4 && (rk.visibility ?? 0) > 0.4;
    if (lowerBodyVisible && now - this.lastJumpTriggerTime > 750 && this.history.length >= 4) {
      // Baseline hip Y in past 300ms - 900ms (larger Y = lower on screen / ground level)
      const pastGroundFrames = this.history.filter((h) => now - h.timestamp >= 250 && now - h.timestamp <= 800);
      if (pastGroundFrames.length > 0) {
        const baselineHipY = Math.max(...pastGroundFrames.map((f) => f.midHipY));
        // Upward displacement: midHip.y significantly smaller than baseline
        const upwardDisplacement = baselineHipY - midHip.y;

        // Takeoff velocity check
        const recentFrame = pastGroundFrames[pastGroundFrames.length - 1]!;
        const dtSec = Math.max(0.016, (now - recentFrame.timestamp) / 1000);
        const verticalVelocity = (recentFrame.midHipY - midHip.y) / dtSec; // positive = upward

        if (upwardDisplacement > torsoHeight * 0.12 && verticalVelocity > torsoHeight * 0.35) {
          this.lastJumpTriggerTime = now;
          candidates.push({
            pose: 'JUMP',
            score: 0.94,
            isDynamic: true,
          });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 1: T-POSE
    // Outstretched horizontal arms, level wrists, wide spread
    // ─────────────────────────────────────────────────────────────
    const tShoulders = leftShoulder >= 70 && leftShoulder <= 125 && rightShoulder >= 70 && rightShoulder <= 125;
    const tElbows = leftElbow >= 138 && rightElbow >= 138;
    const tLevelWrists =
      Math.abs(lw.y - ls.y) < torsoHeight * 0.28 && Math.abs(rw.y - rs.y) < torsoHeight * 0.28;
    const tWristSpread = currentWristDist > shoulderWidth * 2.0;

    if (tShoulders && tElbows && tLevelWrists && tWristSpread) {
      const spreadScore = Math.min(1.0, currentWristDist / (shoulderWidth * 2.5));
      const straightness = ((leftElbow - 138) / 42 + (rightElbow - 138) / 42) / 2;
      candidates.push({
        pose: 'T_POSE',
        score: Math.min(0.99, 0.75 + spreadScore * 0.15 + straightness * 0.1),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 2: HANDS RAISED (VICTORY / TOUCHDOWN)
    // Both wrists high above shoulders & head, arms reaching up
    // ─────────────────────────────────────────────────────────────
    const wristsAboveHead = lw.y < ls.y - torsoHeight * 0.22 && rw.y < rs.y - torsoHeight * 0.22;
    const armsHigh = leftShoulder > 120 && rightShoulder > 120;
    const elbowsExtended = leftElbow > 110 && rightElbow > 110;
    const wristsSeparated = currentWristDist > shoulderWidth * 0.55;

    if (wristsAboveHead && armsHigh && elbowsExtended && wristsSeparated) {
      const elevation = Math.min(1.0, ((ls.y - lw.y) / torsoHeight + (rs.y - rw.y) / torsoHeight) / 1.5);
      candidates.push({
        pose: 'HANDS_RAISED',
        score: Math.min(0.98, 0.78 + elevation * 0.2),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 3: ARMS CROSSED
    // Forearms folded across the chest, wrists cross the torso midline
    // ─────────────────────────────────────────────────────────────
    const wristsCrossed =
      (lw.x > ls.x + 0.02 || this.dist3D(lw, re) < torsoHeight * 0.45) &&
      (rw.x < rs.x - 0.02 || this.dist3D(rw, le) < torsoHeight * 0.45);
    const wristsAtChest =
      lw.y > midShoulder.y && lw.y < midHip.y &&
      rw.y > midShoulder.y && rw.y < midHip.y &&
      Math.abs(lw.y - rw.y) < torsoHeight * 0.25;
    const elbowsBentArmsCrossed = leftElbow >= 45 && leftElbow <= 125 && rightElbow >= 45 && rightElbow <= 125;
    const notPrayer = currentWristDist > torsoHeight * 0.12; // Prayer has palms together

    if (wristsCrossed && wristsAtChest && elbowsBentArmsCrossed && notPrayer) {
      candidates.push({
        pose: 'ARMS_CROSSED',
        score: 0.93,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 4: HANDS ON HIPS (SUPERHERO)
    // Wrists near respective hips, elbows flared outward
    // ─────────────────────────────────────────────────────────────
    const lwNearHip = this.dist3D(lw, lh) < torsoHeight * 0.38;
    const rwNearHip = this.dist3D(rw, rh) < torsoHeight * 0.38;
    const elbowsFlared = this.dist3D(le, re) > shoulderWidth * 1.35;
    const elbowsBent = leftElbow >= 55 && leftElbow <= 130 && rightElbow >= 55 && rightElbow <= 130;

    if (lwNearHip && rwNearHip && elbowsFlared && elbowsBent) {
      candidates.push({
        pose: 'HANDS_ON_HIPS',
        score: 0.92,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 5: SQUAT (SQUAT_STANCE)
    // Knees flexed past 135°, hips lowered relative to knees
    // ─────────────────────────────────────────────────────────────
    if (lowerBodyVisible) {
      const squatKnees = leftKnee < 135 && rightKnee < 135;
      const hipsLowered = midHip.y > midShoulder.y + torsoHeight * 0.6;
      if (squatKnees && hipsLowered) {
        const depth = Math.min(1.0, (135 - (leftKnee + rightKnee) / 2) / 45);
        candidates.push({
          pose: 'SQUAT',
          score: Math.min(0.96, 0.78 + depth * 0.18),
        });
        candidates.push({
          pose: 'SQUAT_STANCE',
          score: Math.min(0.96, 0.78 + depth * 0.18),
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 6: FLEX POSE (DOUBLE_BICEPS_FLEX)
    // Shoulders up (~90°), elbows bent (~45°-112°), wrists higher than elbows
    // ─────────────────────────────────────────────────────────────
    const flexShoulders = leftShoulder >= 60 && leftShoulder <= 130 && rightShoulder >= 60 && rightShoulder <= 130;
    const flexElbows = leftElbow >= 40 && leftElbow <= 112 && rightElbow >= 40 && rightElbow <= 112;
    const flexWristsUp = lw.y < le.y + torsoHeight * 0.08 && rw.y < re.y + torsoHeight * 0.08;

    if (flexShoulders && flexElbows && flexWristsUp) {
      const bicepCloseness = Math.min(1.0, 1.2 - Math.abs(leftElbow - 80) / 60);
      candidates.push({
        pose: 'FLEX_POSE',
        score: Math.min(0.97, 0.8 + bicepCloseness * 0.17),
      });
      candidates.push({
        pose: 'DOUBLE_BICEPS_FLEX',
        score: Math.min(0.97, 0.8 + bicepCloseness * 0.17),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 7: THE DAB
    // One arm extended straight diagonally up, other bent across chest
    // ─────────────────────────────────────────────────────────────
    const leftDab =
      leftElbow > 130 &&
      lw.y < ls.y &&
      rightElbow < 110 &&
      this.dist3D(rw, ls) < torsoHeight * 0.55;

    const rightDab =
      rightElbow > 130 &&
      rw.y < rs.y &&
      leftElbow < 110 &&
      this.dist3D(lw, rs) < torsoHeight * 0.55;

    if (leftDab || rightDab) {
      candidates.push({
        pose: 'DAB',
        score: 0.94,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 8: DISCO FEVER
    // One arm pointing straight high up, other pointing down across hip
    // ─────────────────────────────────────────────────────────────
    const leftHighRightLow =
      lw.y < midShoulder.y - torsoHeight * 0.35 &&
      leftElbow > 130 &&
      rw.y > midHip.y - torsoHeight * 0.1;

    const rightHighLeftLow =
      rw.y < midShoulder.y - torsoHeight * 0.35 &&
      rightElbow > 130 &&
      lw.y > midHip.y - torsoHeight * 0.1;

    if (leftHighRightLow || rightHighLeftLow) {
      candidates.push({
        pose: 'DISCO_FEVER',
        score: 0.91,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 9: ZEN PRAYER
    // Wrists touching at mid-chest sternum, elbows flared
    // ─────────────────────────────────────────────────────────────
    const wristsTogether = currentWristDist < torsoHeight * 0.22;
    const wristsAtSternum =
      lw.y > midShoulder.y + torsoHeight * 0.05 && lw.y < midHip.y &&
      rw.y > midShoulder.y + torsoHeight * 0.05 && rw.y < midHip.y;
    const elbowsApart = leftElbow >= 45 && leftElbow <= 120 && rightElbow >= 45 && rightElbow <= 120;

    if (wristsTogether && wristsAtSternum && elbowsApart) {
      candidates.push({
        pose: 'ZEN_PRAYER',
        score: 0.93,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 10: THE THINKER
    // One wrist right under chin/jaw
    // ─────────────────────────────────────────────────────────────
    const lwAtChin = this.dist3D(lw, nose) < torsoHeight * 0.25 && leftElbow < 100;
    const rwAtChin = this.dist3D(rw, nose) < torsoHeight * 0.25 && rightElbow < 100;

    if ((lwAtChin || rwAtChin) && !wristsTogether) {
      candidates.push({
        pose: 'THE_THINKER',
        score: 0.89,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STATIC POSE 11: ZOMBIE WALK
    // Both arms straight forward at shoulder height, wrists close
    // ─────────────────────────────────────────────────────────────
    const zombieElbows = leftElbow > 145 && rightElbow > 145;
    const zombieShoulders = leftShoulder >= 65 && leftShoulder <= 115 && rightShoulder >= 65 && rightShoulder <= 115;
    const zombieWristsTogether = currentWristDist < shoulderWidth * 1.35;
    const zombieNotTPose = currentWristDist < shoulderWidth * 1.8;

    if (zombieElbows && zombieShoulders && zombieWristsTogether && zombieNotTPose) {
      candidates.push({
        pose: 'ZOMBIE_WALK',
        score: 0.88,
      });
    }

    // Sort by priority: Dynamic actions take precedence if triggered, else highest confidence
    candidates.sort((a, b) => {
      if (a.isDynamic && !b.isDynamic) return -1;
      if (!a.isDynamic && b.isDynamic) return 1;
      return b.score - a.score;
    });

    const top = candidates[0];

    if (top) {
      const meta = GOOFY_POSE_METADATA[top.pose];
      return {
        pose: top.pose,
        confidence: Math.round(top.score * 100) / 100,
        label: meta.label,
        comicCaption: meta.defaultCaption,
        isDynamicAction: Boolean(top.isDynamic),
        actionCategory: top.isDynamic ? 'DYNAMIC_ACTION' : 'STATIC_POSE',
        jointMetrics,
      };
    }

    return {
      pose: null,
      confidence: 0,
      label: 'NEUTRAL STANCE',
      comicCaption: 'STRIKE A HEROIC POSE OR PERFORM A JUMP / CLAP!',
      jointMetrics,
    };
  }
}
