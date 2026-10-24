export interface PointPrompt {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  label: 1 | 0; // 1 = positive foreground, 0 = negative background
}

export interface BoxPrompt {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface MaskConfig {
  opacity: number;        // 0.1 to 1.0
  colorHex: string;       // e.g. #00E599
  showBoundary: boolean;  // stroke outline
  invertMask: boolean;    // invert selection
}

export interface SegmentationResult {
  maskWidth: number;
  maskHeight: number;
  maskData: Uint8Array;   // 1 byte per pixel: 0 (background) or 255 (foreground)
  areaPercentage: number;
  confidenceScore: number;
  inferenceDurationMs: number;
}

export const TELEMETRY_COLORS = [
  { name: 'NEON GREEN', hex: '#00E599' },
  { name: 'ELECTRIC CYAN', hex: '#06B6D4' },
  { name: 'RACING RED', hex: '#FF3B30' },
  { name: 'APEX AMBER', hex: '#F59E0B' },
  { name: 'ROYAL VIOLET', hex: '#8B5CF6' },
];
