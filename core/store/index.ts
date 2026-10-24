import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SystemState {
  activeBackend: 'webgpu' | 'webgl' | 'wasm' | 'unsupported';
  fps: number;
  p50Ms: number;
  p95Ms: number;
  perfHudVisible: boolean;
  workerQueueDepth: number;
  activeModule: string;
  activeModel: string;
  modelLoadTimeMs: number | null;
  trackingStatus: 'TRACKING_ACTIVE' | 'STANDBY' | 'SEARCHING' | 'LOST' | 'INITIALIZING';
  streamStatus: 'STREAMING' | 'STANDBY' | 'PAUSED' | 'DISCONNECTED';
  warningMessage: string | null;
  hudExpanded: boolean;
  setActiveBackend: (backend: 'webgpu' | 'webgl' | 'wasm' | 'unsupported') => void;
  setPerfStats: (stats: {
    fps?: number;
    p50Ms?: number;
    p95Ms?: number;
    workerQueueDepth?: number;
    activeModule?: string;
    activeModel?: string;
    modelLoadTimeMs?: number | null;
    trackingStatus?: 'TRACKING_ACTIVE' | 'STANDBY' | 'SEARCHING' | 'LOST' | 'INITIALIZING';
    streamStatus?: 'STREAMING' | 'STANDBY' | 'PAUSED' | 'DISCONNECTED';
    warningMessage?: string | null;
  }) => void;
  togglePerfHud: () => void;
  setPerfHudVisible: (visible: boolean) => void;
  toggleHudExpanded: () => void;
  setHudExpanded: (expanded: boolean) => void;
}

export interface SettingsState {
  theme: 'dark' | 'light';
  smoothingType: 'one-euro' | 'ema' | 'kalman' | 'none';
  isMirrored: boolean;
  syntheticMode: boolean;
  soundEnabled: boolean;
  gpuDelegatePreferred: boolean;
  pinchSensitivity: number;
  shortcutsModalOpen: boolean;
  diagnosticsDrawerOpen: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setSmoothingType: (type: 'one-euro' | 'ema' | 'kalman' | 'none') => void;
  setIsMirrored: (mirrored: boolean) => void;
  setSyntheticMode: (synthetic: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setGpuDelegatePreferred: (preferred: boolean) => void;
  setPinchSensitivity: (val: number) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  toggleShortcutsModal: () => void;
  setDiagnosticsDrawerOpen: (open: boolean) => void;
  toggleDiagnosticsDrawer: () => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  activeBackend: 'webgpu',
  fps: 0,
  p50Ms: 0,
  p95Ms: 0,
  perfHudVisible: false,
  workerQueueDepth: 0,
  activeModule: 'STANDBY',
  activeModel: 'NONE',
  modelLoadTimeMs: null,
  trackingStatus: 'STANDBY',
  streamStatus: 'STANDBY',
  warningMessage: null,
  hudExpanded: true,
  setActiveBackend: (activeBackend) => set({ activeBackend }),
  setPerfStats: (stats) => set((prev) => ({ ...prev, ...stats })),
  togglePerfHud: () => set((state) => ({ perfHudVisible: !state.perfHudVisible })),
  setPerfHudVisible: (perfHudVisible) => set({ perfHudVisible }),
  toggleHudExpanded: () => set((state) => ({ hudExpanded: !state.hudExpanded })),
  setHudExpanded: (hudExpanded) => set({ hudExpanded }),
}));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      smoothingType: 'one-euro',
      isMirrored: true,
      syntheticMode: false,
      soundEnabled: true,
      gpuDelegatePreferred: true,
      pinchSensitivity: 0.05,
      shortcutsModalOpen: false,
      diagnosticsDrawerOpen: false,

      setTheme: (theme) => {
        if (typeof window !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        if (typeof window !== 'undefined') {
          document.documentElement.setAttribute('data-theme', next);
          if (next === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        set({ theme: next });
      },

      setSmoothingType: (smoothingType) => set({ smoothingType }),
      setIsMirrored: (isMirrored) => set({ isMirrored }),
      setSyntheticMode: (syntheticMode) => set({ syntheticMode }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setGpuDelegatePreferred: (gpuDelegatePreferred) => set({ gpuDelegatePreferred }),
      setPinchSensitivity: (pinchSensitivity) => set({ pinchSensitivity }),
      setShortcutsModalOpen: (shortcutsModalOpen) => set({ shortcutsModalOpen }),
      toggleShortcutsModal: () => set((s) => ({ shortcutsModalOpen: !s.shortcutsModalOpen })),
      setDiagnosticsDrawerOpen: (diagnosticsDrawerOpen) => set({ diagnosticsDrawerOpen }),
      toggleDiagnosticsDrawer: () => set((s) => ({ diagnosticsDrawerOpen: !s.diagnosticsDrawerOpen })),
    }),
    {
      name: 'omni-loco-settings-v2',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (null as any))),
      partialize: (state) => ({
        theme: state.theme,
        smoothingType: state.smoothingType,
        isMirrored: state.isMirrored,
        soundEnabled: state.soundEnabled,
        gpuDelegatePreferred: state.gpuDelegatePreferred,
        pinchSensitivity: state.pinchSensitivity,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          document.documentElement.setAttribute('data-theme', state.theme);
          if (state.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
    }
  )
);
