import { GestureFXConfig, FXPreset, FXColorPalette, GestureFXType } from './types';

export const FX_PRESET_PALETTES: Record<FXPreset, FXColorPalette> = {
  CYBER_NEON: {
    primary: '#00f3ff',
    secondary: '#22c55e',
    accent: '#ec4899',
    glow: 'rgba(0, 243, 255, 0.45)',
  },
  SOLAR_FLARE: {
    primary: '#f59e0b',
    secondary: '#f97316',
    accent: '#dc2626',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
  QUANTUM_VOID: {
    primary: '#a855f7',
    secondary: '#6366f1',
    accent: '#06b6d4',
    glow: 'rgba(168, 85, 247, 0.45)',
  },
  RETRO_PHOSPHOR: {
    primary: '#39ff14',
    secondary: '#10b981',
    accent: '#fbbf24',
    glow: 'rgba(57, 255, 20, 0.45)',
  },
};

export const DEFAULT_FX_CONFIG: GestureFXConfig = {
  enabled: true,
  intensity: 1.0,
  particleCountMultiplier: 1.0,
  audioEnabled: false, // Default off to respect browser autoplay & mute preference
  glowEnabled: true,
  preset: 'CYBER_NEON',
  mappings: {
    open_palm: 'HOLOGRAM_BURST',
    closed_fist: 'POWER_CHARGE',
    pointing: 'SPATIAL_RAY',
    peace_sign: 'DUAL_BEACON',
    thumbs_up: 'STATUS_PULSE',
    pinch: 'GRAVITY_LOCK',
    swipe_left: 'AFTERIMAGE_TRAIL',
    swipe_right: 'AFTERIMAGE_TRAIL',
    swipe_up: 'AFTERIMAGE_TRAIL',
    swipe_down: 'AFTERIMAGE_TRAIL',
    finger_count: 'DIGIT_PROTOCOL',
    none: 'NONE',
  },
};

const STORAGE_KEY = 'omni-gesture-fx-config-v1';

export function loadFXConfig(): GestureFXConfig {
  if (typeof window === 'undefined') return DEFAULT_FX_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FX_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FX_CONFIG,
      ...parsed,
      mappings: {
        ...DEFAULT_FX_CONFIG.mappings,
        ...(parsed.mappings || {}),
      },
    };
  } catch {
    return DEFAULT_FX_CONFIG;
  }
}

export function saveFXConfig(config: GestureFXConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save Gesture FX configuration:', err);
  }
}

export function resetFXConfig(): GestureFXConfig {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return { ...DEFAULT_FX_CONFIG };
}
