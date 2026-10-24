export interface BoundingBox {
  x: number;      // normalized 0-1
  y: number;      // normalized 0-1
  width: number;  // normalized 0-1
  height: number; // normalized 0-1
}

export interface DetectedObject {
  id: string;
  trackId?: number;
  classId: number;
  label: string;
  category: 'PERSON' | 'VEHICLE' | 'ELECTRONICS' | 'INDOOR' | 'FOOD' | 'ANIMAL' | 'ACCESSORY';
  confidence: number;
  box: BoundingBox;
  color: string;
}

export interface ObjectTrack {
  trackId: number;
  classId: number;
  label: string;
  color: string;
  currentBox: BoundingBox;
  history: { x: number; y: number; time: number }[];
  age: number;
  missingFrames: number;
  velocity: { vx: number; vy: number };
}

export interface DetectionConfig {
  confidenceThreshold: number;
  iouThreshold: number;
  maxDetections: number;
  filterClass: string | null;
  enableTracking: boolean;
  showLabels: boolean;
  showTrajectories: boolean;
  inferenceResolution: 640 | 320;
}

export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

export const CLASS_COLORS: Record<string, string> = {
  person: '#00E599',     // Neon Green
  laptop: '#06B6D4',     // Cyan
  'cell phone': '#3B82F6', // Blue
  bottle: '#F59E0B',     // Amber
  cup: '#F97316',        // Orange
  chair: '#8B5CF6',      // Purple
  book: '#EC4899',       // Pink
  car: '#EF4444',        // Red
  keyboard: '#10B981',   // Emerald
  mouse: '#6366F1',      // Indigo
  tv: '#14B8A6',         // Teal
  backpack: '#EAB308',   // Yellow
  default: '#00E599',
};
