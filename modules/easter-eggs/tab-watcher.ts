'use client';

import {
  unlockAchievement,
  getAchievements,
  resetAchievements,
} from './achievements';

let initialized = false;

export function initTabWatcherAndConsoleEasterEgg(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  // 1. Tab-away title switcher
  let originalTitle = document.title || 'Omni Loco AI // Apex Multimodal Lab';

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      originalTitle = document.title;
      document.title = '[SYSTEM PAUSED] // OMNI LOCO AI';
    } else {
      document.title = originalTitle;
    }
  });

  // 2. DevTools Console ASCII Greeting
  const asciiBanner = `
  ___  __  __ _  _ ___   _     ___   ___ ___ 
 / _ \\|  \\/  | \\| |_ _| | |   / _ \\ / __/ _ \\
| (_) | |\\/| | .\` || |  | |__| (_) | (_| (_) |
 \\___/|_|  |_|_|\\_|___| |_____\\___/ \\___\\___/ 
 ═════════════════════════════════════════════
  OMNI LOCO ON-DEVICE MULTIMODAL INTELLIGENCE
  Zero Cloud Telemetry // Pure Client Pipeline
 ═════════════════════════════════════════════
`;

  try {
    console.log(
      `%c${asciiBanner}`,
      'font-family: monospace; font-weight: bold; color: #22c55e; background: #000; padding: 6px; border-radius: 4px;'
    );
    console.log(
      '%c[CLASSIFIED ACCESS] Inquisitive engineer detected. Secret console API activated: window.OmniLoco',
      'font-family: monospace; font-size: 11px; color: #f59e0b;'
    );

    // Expose safe, helpful debug helper on window for easter-egg lovers
    (window as unknown as { OmniLoco: unknown }).OmniLoco = {
      status: () => {
        console.table({
          runtime: 'Client Browser WebAssembly / WebGPU',
          modelsLoaded: '100% On-Device',
          privacy: '100% Airgap Confirmed',
        });
      },
      achievements: () => {
        console.table(getAchievements());
      },
      unlock: (id: string) => {
        const res = unlockAchievement(id);
        console.log(res ? `Unlocked ${res.title}` : `Achievement ${id} already unlocked or invalid`);
      },
      reset: () => {
        resetAchievements();
        console.log('Classified achievements wiped.');
      },
    };
  } catch {
    // console access restricted or node environment
  }
}
