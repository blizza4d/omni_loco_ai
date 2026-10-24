export type DepthPalette = 'TURBO' | 'INFERNO' | 'VIRIDIS' | 'GRAYSCALE';

export interface DepthConfig {
  palette: DepthPalette;
  nearClip: number;      // 0.0 to 0.5
  farClip: number;       // 0.5 to 1.0
  invertDepth: boolean;
  viewMode: 'SPLIT_SCRUBBER' | 'SIDE_BY_SIDE' | 'DEPTH_ONLY';
}

export interface DepthProbePoint {
  x: number;
  y: number;
  depthRatio: number;    // 0 (far) to 1 (near)
  zone: 'FOREGROUND' | 'MIDGROUND' | 'BACKGROUND';
  normal: { nx: number; ny: number; nz: number };
}

export interface DepthEstimationResult {
  width: number;
  height: number;
  depthBuffer: Float32Array; // 0.0 (infinite background) to 1.0 (nearest foreground)
  minDepth: number;
  maxDepth: number;
  meanDepth: number;
  inferenceDurationMs: number;
}
