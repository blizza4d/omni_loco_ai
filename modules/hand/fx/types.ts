export type GestureFXType =
  | 'HOLOGRAM_BURST'
  | 'POWER_CHARGE'
  | 'SPATIAL_RAY'
  | 'DUAL_BEACON'
  | 'STATUS_PULSE'
  | 'GRAVITY_LOCK'
  | 'AFTERIMAGE_TRAIL'
  | 'DIGIT_PROTOCOL'
  | 'NONE';

export type FXPreset = 'CYBER_NEON' | 'SOLAR_FLARE' | 'QUANTUM_VOID' | 'RETRO_PHOSPHOR';

export interface FXColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

export interface GestureFXConfig {
  enabled: boolean;
  intensity: number; // 0.5 to 2.0
  particleCountMultiplier: number; // 0.5 to 2.0
  audioEnabled: boolean;
  glowEnabled: boolean;
  preset: FXPreset;
  mappings: Record<string, GestureFXType>;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
  shape: 'circle' | 'square' | 'line' | 'ring';
  trail?: { x: number; y: number }[];
}

export interface ActiveChargeEffect {
  hand: 'Left' | 'Right';
  x: number;
  y: number;
  charge: number; // 0.0 to 1.0
  radius: number;
  rotation: number;
}

export interface ActiveRayEffect {
  hand: 'Left' | 'Right';
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  angle: number;
  intensity: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}
