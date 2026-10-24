import { PoseLandmark, ExerciseType } from './types';

export function generateSyntheticPose(timeMs: number, exercise: ExerciseType = 'squat'): PoseLandmark[] {
  const t = timeMs / 1000;
  // Repetition cycle: 3.0 seconds per rep
  const cycle = (t % 3.0) / 3.0; // 0 to 1
  const phase = Math.sin(cycle * Math.PI * 2); // -1 to 1

  const landmarks: PoseLandmark[] = [];
  const centerX = 0.5;

  let hipY = 0.55;
  let kneeY = 0.72;
  let ankleY = 0.90;
  let elbowY = 0.42;
  let wristY = 0.52;

  if (exercise === 'squat') {
    // Squat: hips and knees dip down
    const squatDepth = Math.max(0, -phase) * 0.12;
    hipY += squatDepth;
    kneeY += squatDepth * 0.5;
  } else if (exercise === 'bicep_curl') {
    // Curl: wrists elevate towards shoulders
    const curlElev = Math.max(0, -phase) * 0.22;
    wristY -= curlElev;
  } else if (exercise === 'shoulder_press') {
    // Press: elbows and wrists extend upwards
    const pressElev = Math.max(0, phase) * 0.28;
    elbowY -= pressElev * 0.5;
    wristY -= pressElev;
  }

  // 0: Nose
  landmarks.push({ x: centerX, y: 0.20, z: 0, visibility: 0.99 });
  // 1-10: Face anchors
  for (let i = 1; i <= 10; i++) {
    landmarks.push({ x: centerX + (i % 2 === 0 ? 0.03 : -0.03), y: 0.18, z: 0, visibility: 0.95 });
  }

  // 11: Left Shoulder, 12: Right Shoulder
  landmarks[11] = { x: centerX - 0.12, y: 0.30, z: 0, visibility: 0.99 };
  landmarks[12] = { x: centerX + 0.12, y: 0.30, z: 0, visibility: 0.99 };

  // 13: Left Elbow, 14: Right Elbow
  landmarks[13] = { x: centerX - 0.16, y: elbowY, z: -0.02, visibility: 0.99 };
  landmarks[14] = { x: centerX + 0.16, y: elbowY, z: -0.02, visibility: 0.99 };

  // 15: Left Wrist, 16: Right Wrist
  landmarks[15] = { x: centerX - 0.18, y: wristY, z: -0.04, visibility: 0.99 };
  landmarks[16] = { x: centerX + 0.18, y: wristY, z: -0.04, visibility: 0.99 };

  // 17-22: Hands
  for (let i = 17; i <= 22; i++) {
    landmarks[i] = { x: centerX + (i % 2 === 0 ? 0.19 : -0.19), y: wristY + 0.03, z: -0.05, visibility: 0.9 };
  }

  // 23: Left Hip, 24: Right Hip
  landmarks[23] = { x: centerX - 0.09, y: hipY, z: 0, visibility: 0.99 };
  landmarks[24] = { x: centerX + 0.09, y: hipY, z: 0, visibility: 0.99 };

  // 25: Left Knee, 26: Right Knee
  landmarks[25] = { x: centerX - 0.10, y: kneeY, z: 0.05, visibility: 0.99 };
  landmarks[26] = { x: centerX + 0.10, y: kneeY, z: 0.05, visibility: 0.99 };

  // 27: Left Ankle, 28: Right Ankle
  landmarks[27] = { x: centerX - 0.10, y: ankleY, z: 0, visibility: 0.99 };
  landmarks[28] = { x: centerX + 0.10, y: ankleY, z: 0, visibility: 0.99 };

  // 29-32: Feet
  for (let i = 29; i <= 32; i++) {
    landmarks[i] = { x: centerX + (i % 2 === 0 ? 0.12 : -0.12), y: ankleY + 0.04, z: -0.05, visibility: 0.95 };
  }

  return landmarks;
}
