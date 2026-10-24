export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type ExerciseType =
  | 'squat'
  | 'push_up'
  | 'bicep_curl'
  | 'shoulder_press'
  | 'lunge'
  | 'posture_check';

export interface JointAngles {
  leftElbow: number;
  rightElbow: number;
  leftShoulder: number;
  rightShoulder: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  trunkInclination: number;
  forwardHeadAngle: number;
  shoulderTiltAngle: number;
}

export interface ExerciseRepStats {
  exercise: ExerciseType;
  repCount: number;
  stage: 'up' | 'down' | 'neutral';
  romPercentage: number;
  tempoSeconds: number;
  activeFaults: string[];
}

export const POSE_CONNECTIONS: [number, number][] = [
  // Torso
  [11, 12], [12, 24], [24, 23], [23, 11],
  // Left arm
  [11, 13], [13, 15],
  // Right arm
  [12, 14], [14, 16],
  // Left leg
  [23, 25], [25, 27], [27, 29], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [30, 32],
  // Head / Spine
  [0, 11], [0, 12],
];

export const POSE_LANDMARK_NAMES = [
  'NOSE',
  'LEFT_EYE_INNER', 'LEFT_EYE', 'LEFT_EYE_OUTER',
  'RIGHT_EYE_INNER', 'RIGHT_EYE', 'RIGHT_EYE_OUTER',
  'LEFT_EAR', 'RIGHT_EAR',
  'MOUTH_LEFT', 'MOUTH_RIGHT',
  'LEFT_SHOULDER', 'RIGHT_SHOULDER',
  'LEFT_ELBOW', 'RIGHT_ELBOW',
  'LEFT_WRIST', 'RIGHT_WRIST',
  'LEFT_PINKY', 'RIGHT_PINKY',
  'LEFT_INDEX', 'RIGHT_INDEX',
  'LEFT_THUMB', 'RIGHT_THUMB',
  'LEFT_HIP', 'RIGHT_HIP',
  'LEFT_KNEE', 'RIGHT_KNEE',
  'LEFT_ANKLE', 'RIGHT_ANKLE',
  'LEFT_HEEL', 'RIGHT_HEEL',
  'LEFT_FOOT_INDEX', 'RIGHT_FOOT_INDEX',
];
