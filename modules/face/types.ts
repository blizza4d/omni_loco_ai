export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

export interface HeadPose {
  yaw: number;   // degrees: negative = left, positive = right
  pitch: number; // degrees: negative = down, positive = up
  roll: number;  // degrees: negative = tilt left, positive = tilt right
}

export interface FaceMetrics {
  earLeft: number;
  earRight: number;
  earAvg: number;
  blinksPerMinute: number;
  avgBlinkDurationMs: number;
  isDrowsy: boolean;
  perclos: number; // 0 to 1 percentage of eye closure over time
  headPose: HeadPose;
  headOrientation: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
  isMouthOpen: boolean;
  isTalking: boolean;
  activeExpressions: { name: string; score: number }[];
}

export interface FaceMeshLayers {
  tesselation: boolean;
  contours: boolean;
  eyes: boolean;
  irises: boolean;
  lips: boolean;
  headPoseGizmo: boolean;
}

// 52 ARKit Blendshape Canonical Names
export const BLENDSHAPE_NAMES = [
  '_neutral',
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
  'jawForward', 'jawLeft', 'jawOpen', 'jawRight',
  'mouthClose', 'mouthDimpleLeft', 'mouthDimpleRight', 'mouthFrownLeft', 'mouthFrownRight',
  'mouthFunnel', 'mouthLeft', 'mouthLowerDownLeft', 'mouthLowerDownRight',
  'mouthPressLeft', 'mouthPressRight', 'mouthPucker', 'mouthRight',
  'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower', 'mouthShrugUpper',
  'mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft', 'mouthStretchRight',
  'mouthUpperUpLeft', 'mouthUpperUpRight',
  'noseSneerLeft', 'noseSneerRight',
  'tongueOut',
];

// Key Landmark Indices
export const FACIAL_KEYPOINTS = {
  // Eye corners for EAR
  leftEye: [33, 160, 158, 133, 153, 144],
  rightEye: [362, 385, 387, 263, 373, 380],
  // Irises
  leftIris: [468, 469, 470, 471, 472],
  rightIris: [473, 474, 475, 476, 477],
  // Lips
  outerLips: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95],
  // Nose tip
  noseTip: 1,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
};
