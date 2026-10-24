import { PoseLandmark, JointAngles } from './types';
import { EMAFilter } from '@/core/filters';

export class PoseKinematics {
  private filters: Record<keyof JointAngles, EMAFilter> = {
    leftElbow: new EMAFilter(0.25),
    rightElbow: new EMAFilter(0.25),
    leftShoulder: new EMAFilter(0.25),
    rightShoulder: new EMAFilter(0.25),
    leftHip: new EMAFilter(0.25),
    rightHip: new EMAFilter(0.25),
    leftKnee: new EMAFilter(0.25),
    rightKnee: new EMAFilter(0.25),
    trunkInclination: new EMAFilter(0.25),
    forwardHeadAngle: new EMAFilter(0.25),
    shoulderTiltAngle: new EMAFilter(0.25),
  };

  /**
   * Computes angle at vertex B formed by rays BA and BC in 3D
   */
  computeAngle3D(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    if (
      (a.visibility !== undefined && a.visibility < 0.45) ||
      (b.visibility !== undefined && b.visibility < 0.45) ||
      (c.visibility !== undefined && c.visibility < 0.45)
    ) {
      return 180; // Default when joint is obscured
    }

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

  calculateJointAngles(landmarks: PoseLandmark[]): JointAngles {
    if (landmarks.length < 33) {
      return {
        leftElbow: 180,
        rightElbow: 180,
        leftShoulder: 180,
        rightShoulder: 180,
        leftHip: 180,
        rightHip: 180,
        leftKnee: 180,
        rightKnee: 180,
        trunkInclination: 0,
        forwardHeadAngle: 0,
        shoulderTiltAngle: 0,
      };
    }

    const ls = landmarks[11]!; // left shoulder
    const rs = landmarks[12]!; // right shoulder
    const le = landmarks[13]!; // left elbow
    const re = landmarks[14]!; // right elbow
    const lw = landmarks[15]!; // left wrist
    const rw = landmarks[16]!; // right wrist
    const lh = landmarks[23]!; // left hip
    const rh = landmarks[24]!; // right hip
    const lk = landmarks[25]!; // left knee
    const rk = landmarks[26]!; // right knee
    const la = landmarks[27]!; // left ankle
    const ra = landmarks[28]!; // right ankle
    const nose = landmarks[0]!;
    const lear = landmarks[7]!;

    // 1. Elbows
    const rawLeftElbow = this.computeAngle3D(ls, le, lw);
    const rawRightElbow = this.computeAngle3D(rs, re, rw);

    // 2. Shoulders
    const rawLeftShoulder = this.computeAngle3D(lh, ls, le);
    const rawRightShoulder = this.computeAngle3D(rh, rs, re);

    // 3. Hips
    const rawLeftHip = this.computeAngle3D(ls, lh, lk);
    const rawRightHip = this.computeAngle3D(rs, rh, rk);

    // 4. Knees
    const rawLeftKnee = this.computeAngle3D(lh, lk, la);
    const rawRightKnee = this.computeAngle3D(rh, rk, ra);

    // 5. Trunk Inclination (Angle of mid-hip to mid-shoulder vector relative to vertical)
    const midHipX = (lh.x + rh.x) / 2;
    const midHipY = (lh.y + rh.y) / 2;
    const midShoulderX = (ls.x + rs.x) / 2;
    const midShoulderY = (ls.y + rs.y) / 2;
    const dxTorso = midShoulderX - midHipX;
    const dyTorso = midShoulderY - midHipY; // pointing up/down in screen
    const rawTrunk = Math.abs((Math.atan2(dxTorso, -dyTorso) * 180) / Math.PI);

    // 6. Forward Head Angle (ear relative to vertical at shoulder)
    const dxHead = lear.x - ls.x;
    const dyHead = ls.y - lear.y;
    const rawForwardHead = Math.max(0, (Math.atan2(Math.abs(dxHead), dyHead) * 180) / Math.PI);

    // 7. Shoulder Tilt Angle
    const dShoulderY = rs.y - ls.y;
    const dShoulderX = rs.x - ls.x;
    const rawShoulderTilt = Math.abs((Math.atan2(dShoulderY, dShoulderX) * 180) / Math.PI);

    return {
      leftElbow: Math.round(this.filters.leftElbow.filter(rawLeftElbow)),
      rightElbow: Math.round(this.filters.rightElbow.filter(rawRightElbow)),
      leftShoulder: Math.round(this.filters.leftShoulder.filter(rawLeftShoulder)),
      rightShoulder: Math.round(this.filters.rightShoulder.filter(rawRightShoulder)),
      leftHip: Math.round(this.filters.leftHip.filter(rawLeftHip)),
      rightHip: Math.round(this.filters.rightHip.filter(rawRightHip)),
      leftKnee: Math.round(this.filters.leftKnee.filter(rawLeftKnee)),
      rightKnee: Math.round(this.filters.rightKnee.filter(rawRightKnee)),
      trunkInclination: Math.round(this.filters.trunkInclination.filter(rawTrunk)),
      forwardHeadAngle: Math.round(this.filters.forwardHeadAngle.filter(rawForwardHead)),
      shoulderTiltAngle: Math.round(this.filters.shoulderTiltAngle.filter(rawShoulderTilt)),
    };
  }

  reset(): void {
    Object.values(this.filters).forEach((f) => f.reset());
  }
}
