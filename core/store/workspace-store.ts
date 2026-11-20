/**
 * OMNI LOCO AI 2.0 — WORKSPACE & PREFERENCES STORE
 * Manages active workspace contexts, pinned modules, recent visits, and custom experiment collections.
 * Persists locally with full zero-cloud privacy.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WorkspaceType =
  | 'Default'
  | 'Vision Research'
  | 'Robotics & Control'
  | 'Creative Labs'
  | 'Laboratory Studio';

export interface WorkspaceState {
  activeWorkspace: WorkspaceType;
  pinnedModuleIds: string[];
  recentModuleIds: string[];
  favouriteModelIds: string[];
  recentSessionIds: string[];

  setWorkspace: (workspace: WorkspaceType) => void;
  togglePinModule: (moduleId: string) => void;
  isPinned: (moduleId: string) => boolean;
  recordModuleVisit: (moduleId: string) => void;
  toggleFavouriteModel: (modelId: string) => void;
  resetWorkspaceDefaults: () => void;
}

const DEFAULT_PINNED = ['hand', 'goofy', 'laboratory', 'forge', 'drive'];

const memoryStorage = (() => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
  };
})();

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeWorkspace: 'Default',
      pinnedModuleIds: DEFAULT_PINNED,
      recentModuleIds: ['hand', 'goofy'],
      favouriteModelIds: ['hand_landmarker', 'face_landmarker'],
      recentSessionIds: [],

      setWorkspace: (activeWorkspace) => set({ activeWorkspace }),

      togglePinModule: (moduleId) => {
        const current = get().pinnedModuleIds;
        if (current.includes(moduleId)) {
          set({ pinnedModuleIds: current.filter((id) => id !== moduleId) });
        } else {
          set({ pinnedModuleIds: [...current, moduleId] });
        }
      },

      isPinned: (moduleId) => get().pinnedModuleIds.includes(moduleId),

      recordModuleVisit: (moduleId) => {
        const current = get().recentModuleIds.filter((id) => id !== moduleId);
        set({ recentModuleIds: [moduleId, ...current].slice(0, 8) });
      },

      toggleFavouriteModel: (modelId) => {
        const current = get().favouriteModelIds;
        if (current.includes(modelId)) {
          set({ favouriteModelIds: current.filter((id) => id !== modelId) });
        } else {
          set({ favouriteModelIds: [...current, modelId] });
        }
      },

      resetWorkspaceDefaults: () => {
        set({
          activeWorkspace: 'Default',
          pinnedModuleIds: DEFAULT_PINNED,
          recentModuleIds: [],
          favouriteModelIds: ['hand_landmarker', 'face_landmarker'],
        });
      },
    }),
    {
      name: 'omni-loco-workspace-v2',
      storage: createJSONStorage(() => (typeof window !== 'undefined' && window.localStorage ? window.localStorage : memoryStorage)),
    }
  )
);
