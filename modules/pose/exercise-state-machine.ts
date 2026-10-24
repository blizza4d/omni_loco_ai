import { ExerciseType, JointAngles, ExerciseRepStats, PoseLandmark } from './types';

export class ExerciseStateMachine {
  private repCount = 0;
  private stage: 'up' | 'down' | 'neutral' = 'neutral';
  private repStartTime = 0;
  private lastRepDuration = 0;
  private minAngleObserved = 180;
  private maxAngleObserved = 0;

  constructor(private exercise: ExerciseType = 'squat') {}

  setExercise(exercise: ExerciseType): void {
    this.exercise = exercise;
    this.reset();
  }

  process(angles: JointAngles, landmarks: PoseLandmark[], now: number): ExerciseRepStats {
    const faults: string[] = [];
    let rom = 0;

    switch (this.exercise) {
      case 'squat': {
        const avgKnee = (angles.leftKnee + angles.rightKnee) / 2;
        // Squat ROM: 170 deg is standing (0% ROM), 90 deg is parallel (100% ROM)
        rom = Math.min(100, Math.max(0, ((170 - avgKnee) / 80) * 100));

        // Form faults: Knees caving in
        if (landmarks.length >= 33) {
          const lk = landmarks[25]!;
          const rk = landmarks[26]!;
          const la = landmarks[27]!;
          const ra = landmarks[28]!;
          const kneeDist = Math.abs(rk.x - lk.x);
          const ankleDist = Math.abs(ra.x - la.x);
          if (kneeDist < ankleDist * 0.75 && avgKnee < 130) {
            faults.push('FAULT: KNEES CAVING INWARD');
          }
        }

        // Trunk forward lean fault
        if (angles.trunkInclination > 40 && avgKnee < 120) {
          faults.push('FAULT: EXCESSIVE FORWARD TRUNK LEAN');
        }

        // Hysteresis Rep Counting
        if (avgKnee > 155) {
          if (this.stage === 'down') {
            this.repCount++;
            this.lastRepDuration = (now - this.repStartTime) / 1000;
          }
          this.stage = 'up';
        } else if (avgKnee < 100 && this.stage === 'up') {
          this.stage = 'down';
          this.repStartTime = now;
        }
        break;
      }

      case 'push_up': {
        const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
        rom = Math.min(100, Math.max(0, ((160 - avgElbow) / 75) * 100));

        // Form fault: hips sagging (trunk angle)
        if (angles.trunkInclination > 25) {
          faults.push('FAULT: HIPS SAGGING / ARCHED BACK');
        }

        if (avgElbow > 150) {
          if (this.stage === 'down') {
            this.repCount++;
            this.lastRepDuration = (now - this.repStartTime) / 1000;
          }
          this.stage = 'up';
        } else if (avgElbow < 95 && this.stage === 'up') {
          this.stage = 'down';
          this.repStartTime = now;
        }
        break;
      }

      case 'bicep_curl': {
        const elbow = angles.leftElbow;
        rom = Math.min(100, Math.max(0, ((155 - elbow) / 110) * 100));

        if (angles.leftShoulder > 35) {
          faults.push('FAULT: ELBOW DRIFTING FORWARD');
        }

        if (elbow > 145) {
          if (this.stage === 'down') {
            this.repCount++;
            this.lastRepDuration = (now - this.repStartTime) / 1000;
          }
          this.stage = 'up';
        } else if (elbow < 55 && this.stage === 'up') {
          this.stage = 'down';
          this.repStartTime = now;
        }
        break;
      }

      case 'shoulder_press': {
        const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
        rom = Math.min(100, Math.max(0, ((avgElbow - 70) / 95) * 100));

        if (Math.abs(angles.leftElbow - angles.rightElbow) > 25) {
          faults.push('FAULT: ASYMMETRIC PRESS ELEVATION');
        }

        if (avgElbow < 85) {
          if (this.stage === 'up') {
            this.repCount++;
            this.lastRepDuration = (now - this.repStartTime) / 1000;
          }
          this.stage = 'down';
        } else if (avgElbow > 155 && this.stage === 'down') {
          this.stage = 'up';
          this.repStartTime = now;
        }
        break;
      }

      case 'lunge': {
        const activeKnee = Math.min(angles.leftKnee, angles.rightKnee);
        rom = Math.min(100, Math.max(0, ((160 - activeKnee) / 70) * 100));

        if (activeKnee < 80) {
          faults.push('FAULT: EXCESSIVE FORWARD KNEE TRANSLATION');
        }

        if (activeKnee > 150) {
          if (this.stage === 'down') {
            this.repCount++;
            this.lastRepDuration = (now - this.repStartTime) / 1000;
          }
          this.stage = 'up';
        } else if (activeKnee < 95 && this.stage === 'up') {
          this.stage = 'down';
          this.repStartTime = now;
        }
        break;
      }

      case 'posture_check': {
        this.stage = 'neutral';
        rom = 100;

        if (angles.forwardHeadAngle > 22) {
          faults.push('ALERT: FORWARD HEAD POSTURE (>22°)');
        }
        if (angles.shoulderTiltAngle > 6) {
          faults.push('ALERT: ASYMMETRIC SHOULDER TILT (>6°)');
        }
        if (angles.trunkInclination > 18) {
          faults.push('ALERT: SLUMPED TRUNK POSTURE');
        }
        break;
      }
    }

    return {
      exercise: this.exercise,
      repCount: this.repCount,
      stage: this.stage,
      romPercentage: Math.round(rom),
      tempoSeconds: Math.round(this.lastRepDuration * 10) / 10,
      activeFaults: faults,
    };
  }

  reset(): void {
    this.repCount = 0;
    this.stage = 'neutral';
    this.repStartTime = 0;
    this.lastRepDuration = 0;
  }
}
