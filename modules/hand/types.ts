export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export type GestureType =
  | 'open_palm'
  | 'closed_fist'
  | 'pointing'
  | 'pinch'
  | 'pinch_and_drag'
  | 'two_finger_scroll'
  | 'swipe_left'
  | 'swipe_right'
  | 'swipe_up'
  | 'swipe_down'
  | 'thumbs_up'
  | 'peace_sign'
  | 'none';

export interface RecognizedGesture {
  name: GestureType;
  confidence: number;
  label: string;
}

export interface HandTrackingResult {
  handedness: 'Left' | 'Right';
  landmarks: Landmark3D[];
  worldLandmarks?: Landmark3D[];
  gestures: RecognizedGesture[];
  cursor?: {
    x: number; // 0 to 1 in viewport
    y: number;
    rawX: number;
    rawY: number;
    isPinching: boolean;
    dwellProgress: number; // 0 to 1
  };
}

export interface SpatialRegionConfig {
  minX: number; // default 0.2
  maxX: number; // default 0.8
  minY: number; // default 0.2
  maxY: number; // default 0.8
}

// MediaPipe Hand Connection Pairs
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];

export const JOINT_NAMES = [
  'WRIST',
  'THUMB_CMC', 'THUMB_MCP', 'THUMB_IP', 'THUMB_TIP',
  'INDEX_MCP', 'INDEX_PIP', 'INDEX_DIP', 'INDEX_TIP',
  'MIDDLE_MCP', 'MIDDLE_PIP', 'MIDDLE_DIP', 'MIDDLE_TIP',
  'RING_MCP', 'RING_PIP', 'RING_DIP', 'RING_TIP',
  'PINKY_MCP', 'PINKY_PIP', 'PINKY_DIP', 'PINKY_TIP',
];
