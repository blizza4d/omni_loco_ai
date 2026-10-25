'use client';

export interface Achievement {
  id: string;
  title: string;
  codename: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  category: 'SECRET' | 'VISION' | 'SYSTEM' | 'SIMULATION' | 'AUDIO';
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'THE_OVERRIDE',
    title: 'THE OVERRIDE',
    codename: 'KONAMI_APEX_BYPASS',
    description: 'Entered the classic Konami code sequence to breach neural security protocols.',
    icon: '⚡',
    unlockedAt: null,
    category: 'SECRET',
  },
  {
    id: 'HEAT_SIGNATURE',
    title: 'HEAT SIGNATURE',
    codename: 'HOMELANDER_BEAM_ACTIVE',
    description: 'Activated Heat Vision // Apex Override laser ocular emitter.',
    icon: '🔥',
    unlockedAt: null,
    category: 'VISION',
  },
  {
    id: 'GHOST_IN_MACHINE',
    title: 'GHOST IN THE MACHINE',
    codename: 'TERMINAL_SESSION_ROOT',
    description: 'Discovered and executed commands in the classified laboratory terminal.',
    icon: '💻',
    unlockedAt: null,
    category: 'SECRET',
  },
  {
    id: 'SPECIMEN_EXAMINED',
    title: 'SPECIMEN EXAMINED',
    codename: 'CLASSIFIED_HUMAN_LOG',
    description: 'Clicked the laboratory insignia 5 times to reveal classified subject diagnostics.',
    icon: '🧪',
    unlockedAt: null,
    category: 'SYSTEM',
  },
  {
    id: 'FINGER_WIZARD',
    title: 'FINGER WIZARD',
    codename: 'TACTICAL_GESTURE_BURST',
    description: 'Triggered high-energy geometric particle burst with a verified hand gesture.',
    icon: '🖐️',
    unlockedAt: null,
    category: 'VISION',
  },
  {
    id: 'NEON_PILOT',
    title: 'NEON PILOT',
    codename: 'AFTERBURNER_ENGAGED',
    description: 'Engaged the cyberpunk Neon Afterburner speed-trail matrix in the driving simulator.',
    icon: '🏎️',
    unlockedAt: null,
    category: 'SIMULATION',
  },
  {
    id: 'ALIEN_SIGNALS',
    title: 'ALIEN TRANSMISSION',
    codename: 'DEEP_SPACE_DSP',
    description: 'Switched acoustic spectrogram into deep space phosphor alien transmission mode.',
    icon: '📡',
    unlockedAt: null,
    category: 'AUDIO',
  },
  {
    id: 'LAB_RAT',
    title: 'LAB RAT',
    codename: 'MULTIMODAL_EXPLORER',
    description: 'Explored multiple independent neural experiment sandboxes across Omni Loco.',
    icon: '🐀',
    unlockedAt: null,
    category: 'SYSTEM',
  },
  {
    id: 'DOUBLE_TAKE',
    title: 'DOUBLE TAKE',
    codename: 'OCULAR_TWIN_BLINK',
    description: 'Triggered secret ocular interaction sequence using verified iris landmarks.',
    icon: '👁️',
    unlockedAt: null,
    category: 'VISION',
  },
];

const STORAGE_KEY = 'omni-achievements-v1';

type AchievementListener = (achievement: Achievement) => void;
const listeners = new Set<AchievementListener>();

export function getAchievements(): Achievement[] {
  if (typeof window === 'undefined') return INITIAL_ACHIEVEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ACHIEVEMENTS;
    const stored = JSON.parse(raw) as Record<string, string>;
    return INITIAL_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlockedAt: stored[a.id] || null,
    }));
  } catch {
    return INITIAL_ACHIEVEMENTS;
  }
}

export function isAchievementUnlocked(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw);
    return !!stored[id];
  } catch {
    return false;
  }
}

export function unlockAchievement(id: string): Achievement | null {
  if (typeof window === 'undefined') return null;
  const current = getAchievements();
  const target = current.find((a) => a.id === id);
  if (!target || target.unlockedAt) return null; // already unlocked or invalid

  const now = new Date().toLocaleTimeString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored: Record<string, string> = raw ? JSON.parse(raw) : {};
    stored[id] = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const updated: Achievement = { ...target, unlockedAt: now };
    listeners.forEach((fn) => fn(updated));
    return updated;
  } catch {
    return null;
  }
}

export function subscribeToAchievements(fn: AchievementListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function resetAchievements(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function trackVisitedModule(moduleId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = 'omni-visited-modules-v1';
    const raw = localStorage.getItem(key);
    const visited: string[] = raw ? JSON.parse(raw) : [];
    if (!visited.includes(moduleId)) {
      visited.push(moduleId);
      localStorage.setItem(key, JSON.stringify(visited));
      if (visited.length >= 6) {
        unlockAchievement('LAB_RAT');
      }
    }
  } catch {
    // ignore
  }
}
