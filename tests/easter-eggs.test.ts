import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup browser globals for Node test environment
const mockStorage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, val: string) => mockStorage.set(key, val),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

(globalThis as unknown as { window: unknown }).window = globalThis;
(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage;

import {
  getAchievements,
  unlockAchievement,
  isAchievementUnlocked,
  resetAchievements,
  trackVisitedModule,
  subscribeToAchievements,
  INITIAL_ACHIEVEMENTS,
} from '../modules/easter-eggs/achievements';
import {
  HeatVisionRenderer,
  DEFAULT_HEAT_VISION_CONFIG,
  HeatVisionConfig,
} from '../modules/easter-eggs/heat-vision-renderer';
import { HeatVisionAudioSynthesizer } from '../modules/easter-eggs/heat-vision-audio';

describe('Omni Loco Easter Eggs & Classified Discoveries', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('Achievement Engine', () => {
    it('initializes with all classified achievements locked', () => {
      const list = getAchievements();
      expect(list.length).toBe(INITIAL_ACHIEVEMENTS.length);
      expect(list.length).toBeGreaterThanOrEqual(9);
      for (const ach of list) {
        expect(ach.unlockedAt).toBeNull();
      }
    });

    it('unlocks an achievement and persists to localStorage', () => {
      const unlocked = unlockAchievement('THE_OVERRIDE');
      expect(unlocked).not.toBeNull();
      expect(unlocked?.id).toBe('THE_OVERRIDE');
      expect(unlocked?.unlockedAt).toBeDefined();

      expect(isAchievementUnlocked('THE_OVERRIDE')).toBe(true);

      const list = getAchievements();
      const target = list.find((a) => a.id === 'THE_OVERRIDE');
      expect(target?.unlockedAt).not.toBeNull();
    });

    it('returns null and does not duplicate if already unlocked', () => {
      const first = unlockAchievement('HEAT_SIGNATURE');
      expect(first).not.toBeNull();

      const second = unlockAchievement('HEAT_SIGNATURE');
      expect(second).toBeNull();
    });

    it('notifies subscribers upon achievement unlock', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToAchievements(listener);

      unlockAchievement('FINGER_WIZARD');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'FINGER_WIZARD', title: 'FINGER WIZARD' })
      );

      unsubscribe();
      unlockAchievement('NEON_PILOT');
      expect(listener).toHaveBeenCalledTimes(1); // not called again after unsubscribe
    });

    it('wipes achievements upon resetAchievements call', () => {
      unlockAchievement('THE_OVERRIDE');
      unlockAchievement('HEAT_SIGNATURE');
      expect(isAchievementUnlocked('THE_OVERRIDE')).toBe(true);

      resetAchievements();
      expect(isAchievementUnlocked('THE_OVERRIDE')).toBe(false);
      expect(isAchievementUnlocked('HEAT_SIGNATURE')).toBe(false);
    });

    it('unlocks LAB_RAT after visiting 6 unique modules', () => {
      expect(isAchievementUnlocked('LAB_RAT')).toBe(false);

      trackVisitedModule('/gaze');
      trackVisitedModule('/drive');
      trackVisitedModule('/hand');
      trackVisitedModule('/speech');
      trackVisitedModule('/face');
      expect(isAchievementUnlocked('LAB_RAT')).toBe(false);

      trackVisitedModule('/waste');
      expect(isAchievementUnlocked('LAB_RAT')).toBe(true);
    });
  });

  describe('Heat Vision Renderer', () => {
    it('has standard default config matching specifications', () => {
      expect(DEFAULT_HEAT_VISION_CONFIG.colorScheme).toBe('CRIMSON');
      expect(DEFAULT_HEAT_VISION_CONFIG.enabled).toBe(false);
      expect(DEFAULT_HEAT_VISION_CONFIG.intensity).toBeGreaterThanOrEqual(1.0);
      expect(DEFAULT_HEAT_VISION_CONFIG.sparksEnabled).toBe(true);
      expect(DEFAULT_HEAT_VISION_CONFIG.soundEnabled).toBe(false); // opt-in
    });

    it('gracefully skips rendering when disabled', () => {
      const renderer = new HeatVisionRenderer();
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      renderer.render(
        mockCtx,
        640,
        480,
        { x: 300, y: 200 },
        { x: 340, y: 200 },
        { x: 320, y: 300 },
        { ...DEFAULT_HEAT_VISION_CONFIG, enabled: false },
        1000
      );

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('executes 2D canvas draw routines when enabled', () => {
      const renderer = new HeatVisionRenderer();
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        createRadialGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn(),
        }),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn(),
        }),
      } as unknown as CanvasRenderingContext2D;

      const activeConfig: HeatVisionConfig = {
        ...DEFAULT_HEAT_VISION_CONFIG,
        enabled: true,
        intensity: 1.5,
      };

      renderer.render(
        mockCtx,
        640,
        480,
        { x: 300, y: 200 },
        { x: 340, y: 200 },
        { x: 320, y: 300 },
        activeConfig,
        1500
      );

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('Heat Vision Audio Synthesizer', () => {
    it('is muted by default to honor user comfort', () => {
      const synth = new HeatVisionAudioSynthesizer();
      expect(synth.getIsMuted()).toBe(true);

      synth.setMuted(false);
      expect(synth.getIsMuted()).toBe(false);

      synth.dispose();
    });
  });
});
