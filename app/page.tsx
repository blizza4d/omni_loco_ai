'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { StampBadge } from '@/components/ui/StampBadge';
import { Button } from '@/components/ui/Button';
import { SpatialCursorOverlay } from '@/components/ui/SpatialCursorOverlay';
import {
  MODULE_REGISTRY,
  getCategorySummaries,
  ModuleCategory,
} from '@/core/modules/registry';
import { isModelCached, prefetchModel, clearModelAssetCache, REGISTERED_MODELS } from '@/core/cache';
import { useWorkspaceStore, WorkspaceType } from '@/core/store/workspace-store';
import { useSystemStore } from '@/core/store';
import {
  HardDrive,
  HelpCircle,
  Trash,
  Search,
  Sparkles,
  Shield,
  Layers,
  X,
  Filter,
  Activity,
  Pin,
  Compass,
  ChevronRight,
  Database,
} from 'lucide-react';

// Dynamic imports for heavy modals to minimize initial client payload
const CommandPalette = dynamic(
  () => import('@/components/ui/CommandPalette').then((m) => m.CommandPalette),
  { ssr: false }
);
const PerformanceCentreModal = dynamic(
  () => import('@/components/ui/PerformanceCentreModal').then((m) => m.PerformanceCentreModal),
  { ssr: false }
);
const KeyboardShortcutsModal = dynamic(
  () => import('@/components/ui/KeyboardShortcutsModal').then((m) => m.KeyboardShortcutsModal),
  { ssr: false }
);
const ModelVaultModal = dynamic(
  () => import('@/components/ui/ModelVaultModal').then((m) => m.ModelVaultModal),
  { ssr: false }
);

export default function DashboardPage() {
  const router = useRouter();
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [cacheDrawerOpen, setCacheDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [perfCentreOpen, setPerfCentreOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ModuleCategory>('ALL');
  const [spatialCursorActive, setSpatialCursorActive] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Workspace and Pinned Modules store
  const {
    activeWorkspace,
    setWorkspace,
    pinnedModuleIds,
    togglePinModule,
    recordModuleVisit,
  } = useWorkspaceStore();

  const { activeBackend } = useSystemStore();

  // Category counts calculated directly from single authoritative registry
  const categorySummaries = getCategorySummaries();

  // Check onboarding on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('omni-onboarding-v1');
      if (!completed) {
        setOnboardingOpen(true);
      }
    }
  }, []);

  // Check cached state for all registered modules
  useEffect(() => {
    async function checkAllCached() {
      const status: Record<string, boolean> = {};
      for (const m of MODULE_REGISTRY) {
        status[m.id] = await isModelCached(m.modelUrl);
      }
      setCachedMap(status);
    }
    checkAllCached();
  }, []);

  // Filter modules by category and search
  const filteredModules = MODULE_REGISTRY.filter((m) => {
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory;

    const matchesSearch =
      m.title.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      m.figure.toLowerCase().includes(query) ||
      m.features.some((f) => f.toLowerCase().includes(query)) ||
      m.badge.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  // Keep focusedIndex bounded within filtered range
  useEffect(() => {
    if (focusedIndex >= filteredModules.length && filteredModules.length > 0) {
      setFocusedIndex(0);
    }
  }, [filteredModules.length, focusedIndex]);

  // Global Keyboard Navigation & Hotkeys (Ctrl+K, Cmd+K, /, Arrows, Enter)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (onboardingOpen || cacheDrawerOpen) return;

      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Ctrl+K or Cmd+K opens Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (commandPaletteOpen || perfCentreOpen || vaultOpen) {
        if (e.key === 'Escape') {
          setCommandPaletteOpen(false);
          setPerfCentreOpen(false);
          setVaultOpen(false);
        }
        return;
      }

      // If user is actively typing in a search box, do not trigger single-key or navigation hotkeys
      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setVaultOpen((prev) => !prev);
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (filteredModules.length > 0 ? (prev + 1) % filteredModules.length : 0));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) =>
          filteredModules.length > 0 ? (prev - 1 + filteredModules.length) % filteredModules.length : 0
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredModules[focusedIndex];
        if (selected) {
          recordModuleVisit(selected.id);
          router.push(selected.route);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusedIndex,
    onboardingOpen,
    cacheDrawerOpen,
    commandPaletteOpen,
    perfCentreOpen,
    vaultOpen,
    filteredModules,
    router,
    recordModuleVisit,
  ]);

  // Handle prefetching on card hover or focus
  const handlePrefetch = (modelUrl: string, id: string) => {
    if (cachedMap[id]) return;
    prefetchModel(modelUrl).then((cached) => {
      if (cached) {
        setCachedMap((prev) => ({ ...prev, [id]: true }));
      }
    });
  };

  const completeOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omni-onboarding-v1', 'true');
    }
    setOnboardingOpen(false);
  };

  const handleClearCache = async () => {
    await clearModelAssetCache();
    setCachedMap({});
    setCacheDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setSearchQuery('');
    setFocusedIndex(0);
  };

  // Find pinned modules from registry
  const pinnedModules = MODULE_REGISTRY.filter((m) => pinnedModuleIds.includes(m.id));

  return (
    <div className="min-h-screen flex flex-col font-mono text-charcoal-soft">
      <GlobalNav
        gestureNavEnabled={spatialCursorActive}
        onToggleGestureNav={setSpatialCursorActive}
        onTogglePerfHud={() => setPerfCentreOpen(true)}
      />

      {/* Real Spatial Hand-Gesture Cursor Overlay */}
      <SpatialCursorOverlay
        isActive={spatialCursorActive}
        onClose={() => setSpatialCursorActive(false)}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Desk Header Strip with Stamped Labels */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                WORKSPACE // {activeWorkspace.toUpperCase()}
              </span>
              <StampBadge label="OMNI 2.0 APEX" variant="sage" />
              <StampBadge label="100% ON-DEVICE" variant="charcoal" />
              <StampBadge label={`${MODULE_REGISTRY.length + 3} RIGS ACTIVE`} variant="brick" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase leading-snug">
              MULTIMODAL NEURAL EXPERIMENT PLATFORM
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1.5 leading-relaxed">
              Unified on-device sensory platform. MediaPipe, ONNX Runtime Web, and Web Audio DSP executing with single-stream hardware coordination. Zero network latency, zero biometric transmission.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="gap-1.5"
            >
              <kbd className="px-1 py-0.2 bg-paper-dark border border-charcoal-soft/40 rounded text-[9px]">
                Ctrl+K
              </kbd>
              <span>PALETTE</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPerfCentreOpen(true)}
              className="gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-brick-red" />
              <span>DIAGNOSTICS</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCacheDrawerOpen(true)}
              className="gap-1.5"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>STORAGE</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOnboardingStep(1);
                setOnboardingOpen(true);
              }}
              className="gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>PRIMER</span>
            </Button>
          </div>
        </div>

        {/* Workspace Quick Switcher Strip */}
        <div className="flex items-center justify-between gap-3 border-b border-charcoal-soft/20 pb-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <Compass className="w-3.5 h-3.5 text-ink-muted" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              ACTIVE WORKSPACE:
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(
              [
                'Default',
                'Vision Research',
                'Robotics & Control',
                'Creative Labs',
                'Laboratory Studio',
              ] as WorkspaceType[]
            ).map((ws) => (
              <button
                key={ws}
                onClick={() => setWorkspace(ws)}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border transition-all ${
                  activeWorkspace === ws
                    ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                    : 'border-charcoal-soft/30 text-ink-muted hover:border-charcoal-soft hover:text-charcoal-soft bg-paper-dark'
                }`}
              >
                {ws}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[10px] text-ink-muted shrink-0">
            <span className="w-2 h-2 rounded-full bg-sage-green animate-pulse" />
            <span className="font-bold text-charcoal-soft uppercase">
              ACCEL: {activeBackend.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Intelligent Quick Launch & Pinned Modules Strip */}
        {pinnedModules.length > 0 && (
          <div className="p-3.5 border-2 border-charcoal-soft bg-paper-dark rounded-tactile shadow-tactile-sm space-y-2.5">
            <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1.5">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-brick-red" />
                <span className="font-bold text-xs uppercase tracking-technical text-charcoal-soft">
                  PINNED WORKSPACE LAUNCHPAD
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-paper-cream border border-charcoal-soft rounded text-ink-muted">
                  {pinnedModules.length} PINNED
                </span>
              </div>
              <span className="text-[10px] text-ink-muted hidden sm:inline">
                Click pin icon on any card to adjust launchpad
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {pinnedModules.map((m) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={m.id}
                    href={m.route}
                    onClick={() => recordModuleVisit(m.id)}
                    className="p-2.5 border border-charcoal-soft/60 hover:border-charcoal-soft bg-paper-cream hover:bg-paper-cream-dark/60 rounded flex items-center justify-between transition-all group shadow-tactile-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 border border-charcoal-soft/40 bg-paper-dark rounded flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-charcoal-soft group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block truncate text-charcoal-soft">
                          {m.shortTitle}
                        </span>
                        <span className="text-[9px] text-ink-muted block truncate">{m.figure}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-charcoal-soft group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Filters, Search Box & Telemetry Ticker */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-charcoal-soft/20 pb-3">
          {/* Horizontally Scrollable Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categorySummaries.map((tab) => {
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedCategory(tab.id);
                    setFocusedIndex(0);
                  }}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-tactile border transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                      : 'border-charcoal-soft/40 text-ink-muted hover:border-charcoal-soft hover:text-charcoal-soft bg-paper-cream-dark/40'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          {/* Quick Search Input */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="FILTER MODULES... [/]"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                className="w-48 sm:w-60 bg-paper-dark border border-charcoal-soft/60 focus:border-charcoal-soft px-8 py-1 text-[11px] font-mono uppercase tracking-wider text-charcoal-soft placeholder:text-ink-muted/70 rounded-tactile focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 p-0.5 text-ink-muted hover:text-charcoal-soft"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[10px] text-ink-muted shrink-0">
              <span className="w-2 h-2 rounded-full bg-sage-green animate-pulse" />
              <span className="font-bold text-charcoal-soft">{MODULE_REGISTRY.length} SANDBOXES ISOLATED</span>
            </div>
          </div>
        </div>

        {/* First-Run Onboarding 3-Step Card Sequence */}
        {onboardingOpen && (
          <div
            role="region"
            aria-label="Engineer Onboarding Primer"
            className="relative border-2 border-brick-red bg-paper-dark p-5 rounded-tactile shadow-tactile-brick transition-all"
          >
            <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <StampBadge label={`STEP 0${onboardingStep} OF 03`} variant="brick" />
                <span className="text-xs font-bold uppercase tracking-technical text-charcoal-soft">
                  ENGINEER ONBOARDING PRIMER
                </span>
              </div>
              <button
                onClick={completeOnboarding}
                className="text-xs text-ink-muted hover:text-charcoal-soft underline"
              >
                Skip Primer
              </button>
            </div>

            {onboardingStep === 1 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm uppercase text-charcoal-soft flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brick-red" />
                  PRINCIPLE 1: ZERO-CLOUD PRIVACY ARCHITECTURE
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Every computer vision, speech DSP, and kinematic model runs strictly inside your local browser via WebAssembly (WASM SIMD) and WebGPU. Camera feeds and microphone audio streams are strictly kept inside ephemeral Web Worker memory.
                </p>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm uppercase text-charcoal-soft flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sage-green" />
                  PRINCIPLE 2: STRICT MODULE ISOLATION & RESOURCE CLEANUP
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Each module is an isolated sandbox. Entering a module loads its model into a dedicated Web Worker. Leaving terminates the worker, stops all MediaStream tracks, frees GPU buffers, and completely releases your camera/mic hardware.
                </p>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm uppercase text-charcoal-soft flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-charcoal-soft" />
                  PRINCIPLE 3: HARDWARE ACCELERATION & ZERO MAIN-THREAD LATENCY
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  The main UI thread stays at a crisp 60 FPS while heavy matrix inference runs at 30+ FPS in workers. For the best experience, use a modern browser supporting WebGPU and hardware video decoding.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-charcoal-soft/20">
              <div className="flex gap-1.5">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`inline-block w-2.5 h-2.5 border border-charcoal-soft rounded-full ${
                      step === onboardingStep ? 'bg-brick-red' : 'bg-paper-cream'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {onboardingStep > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOnboardingStep((s) => s - 1)}
                  >
                    PREVIOUS
                  </Button>
                )}
                {onboardingStep < 3 ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setOnboardingStep((s) => s + 1)}
                  >
                    NEXT STEP
                  </Button>
                ) : (
                  <Button variant="brick" size="sm" onClick={completeOnboarding}>
                    ACKNOWLEDGE & START
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 12-Module Consistent Grid */}
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredModules.map((module, idx) => {
              const Icon = module.icon;
              const isCached = cachedMap[module.id];
              const isFocused = focusedIndex === idx;
              const isPinned = pinnedModuleIds.includes(module.id);

              return (
                <div
                  key={module.id}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  onMouseEnter={() => {
                    setFocusedIndex(idx);
                    handlePrefetch(module.modelUrl, module.id);
                  }}
                  onFocus={() => {
                    setFocusedIndex(idx);
                    handlePrefetch(module.modelUrl, module.id);
                  }}
                  className={`h-full flex flex-col transition-transform duration-150 will-change-transform ${
                    isFocused ? '-translate-y-1' : ''
                  }`}
                >
                  <DeskCard
                    figure={module.figure}
                    title={module.title}
                    highlight={isFocused}
                    className="h-full flex flex-col justify-between group"
                    headerAction={
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePinModule(module.id);
                          }}
                          className={`p-1 rounded border transition-colors ${
                            isPinned
                              ? 'border-brick-red bg-brick-red text-white'
                              : 'border-charcoal-soft/30 hover:border-charcoal-soft text-ink-muted'
                          }`}
                          title={isPinned ? 'Unpin module' : 'Pin module to workspace launchpad'}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        {module.permissions.map((p) => (
                          <span
                            key={p}
                            className="font-mono text-[9px] font-bold px-1.5 py-0.5 border border-charcoal-soft bg-paper-dark text-charcoal-soft"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    }
                  >
                    <Link
                      href={module.route}
                      onClick={() => recordModuleVisit(module.id)}
                      className="flex-1 flex flex-col justify-between focus:outline-none cursor-pointer"
                      tabIndex={0}
                    >
                      {/* Schematic Icon & Visual Preview Box */}
                      <div className="my-3 p-3.5 border border-charcoal-soft bg-paper-dark/60 rounded-[2px] flex items-center justify-between min-h-[72px] group-hover:bg-paper-dark transition-colors">
                        <div className="space-y-1 pr-2">
                          <StampBadge label={module.badge} variant="charcoal" />
                          <span className="block text-[10px] text-ink-muted">
                            EST. SIZE: {module.modelSize}
                          </span>
                        </div>
                        <div className="w-11 h-11 shrink-0 border-2 border-charcoal-soft bg-paper-cream rounded-tactile flex items-center justify-center shadow-tactile-sm group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5 text-charcoal-soft" />
                        </div>
                      </div>

                      {/* Description & Feature Pills */}
                      <div className="flex-1 flex flex-col justify-between mb-4">
                        <p className="text-xs text-ink-muted leading-relaxed">
                          {module.description}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {module.features.map((feat) => (
                            <span
                              key={feat}
                              className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-paper-dark/80 text-ink-muted border border-charcoal-soft/30 rounded-[2px]"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Strip */}
                      <div className="pt-2.5 mt-auto border-t border-charcoal-soft/20 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full border border-charcoal-soft ${
                              isCached ? 'bg-sage-green' : 'bg-paper-cream'
                            }`}
                          />
                          <span className="text-[10px] text-ink-muted">
                            {isCached ? 'LOCAL CACHE READY' : 'CLICK TO INITIALIZE'}
                          </span>
                        </div>

                        <span className="font-bold uppercase tracking-technical text-charcoal-soft group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          LAUNCH &rarr;
                        </span>
                      </div>
                    </Link>
                  </DeskCard>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Search / Filter State */
          <div className="p-12 border-2 border-dashed border-charcoal-soft/40 bg-paper-dark/40 rounded-tactile text-center space-y-3 font-mono">
            <Filter className="w-8 h-8 text-ink-muted mx-auto opacity-60" />
            <h3 className="font-bold text-sm uppercase tracking-technical text-charcoal-soft">
              NO MODULES MATCH SPECIFIED CRITERIA
            </h3>
            <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
              No sandboxed neural module matches category &apos;{selectedCategory}&apos;
              {searchQuery ? ` with search term "${searchQuery}"` : ''}.
            </p>
            <div className="pt-2">
              <Button variant="default" size="sm" onClick={handleResetFilters}>
                RESET ALL FILTERS
              </Button>
            </div>
          </div>
        )}

        {/* Experimental Suites & Labs Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-technical text-charcoal-soft">
                SPECIALIZED AI MODELS & EXPERIMENTAL WORKSPACES
              </span>
              <StampBadge label="CHAOS ENGINE V9" variant="brick" />
            </div>
            <span className="text-[11px] font-mono text-ink-muted">MODEL RECOGNITION PIPELINES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* GOOFY MODEL CARD */}
            <div className="md:col-span-2">
              <DeskCard
                figure="EXP. 04"
                title="GOOFY MODEL V9 CHAOS ENGINE"
                highlight={false}
                className="h-full flex flex-col justify-between"
                headerAction={
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 border border-charcoal-soft bg-paper-dark text-charcoal-soft">
                      CAM
                    </span>
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 border border-emerald-600 bg-emerald-500/10 text-emerald-600">
                      HANDS + FACE
                    </span>
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 border border-amber-600 bg-amber-500/10 text-amber-600">
                      AUDIO SYNTH
                    </span>
                  </div>
                }
              >
                <div className="my-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                    MULTIMODAL FACE + HAND RECOGNITION &amp; MEME CHAOS ENGINE
                  </span>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Multimodal Face and Hand perception with 17 static gestures, dynamic motion tracking, 15 dual combos, Custom Gesture Studio, gesture sequences, custom reaction rules, and 110+ visual meme reactions.
                  </p>
                </div>

                <div className="my-2 p-2.5 border border-charcoal-soft bg-paper-dark/60 rounded-[2px] flex items-center justify-between">
                  <div className="space-y-1">
                    <StampBadge label="MULTIMODAL V9 / WEBGPU" variant="charcoal" />
                    <span className="block text-[10px] text-ink-muted">MODELS: hand_landmarker &bull; face_landmarker</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-sage-green animate-pulse" />
                    <span className="font-mono text-[10px] font-bold text-sage-green">ENGINE READY</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {[
                    'Thumbs Up',
                    'Peace Sign',
                    'Rock Sign',
                    'OK Gesture',
                    'Face Reactions',
                    'Dynamic Swipes',
                    'Chaos Combos',
                    'Custom Studio',
                  ].map((action) => (
                    <span
                      key={action}
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-paper-dark/80 text-ink-muted border border-charcoal-soft/30 rounded-[2px]"
                    >
                      {action}
                    </span>
                  ))}
                </div>

                <div className="pt-3 mt-3 border-t border-charcoal-soft/20 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-ink-muted">
                    17 GESTURES &bull; DYNAMIC MOTION &bull; CUSTOM STUDIO &bull; 110+ MEMES
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/laboratory"
                      className="inline-flex items-center justify-center font-mono uppercase font-bold text-xs tracking-technical border-2 border-charcoal-soft rounded-tactile px-2.5 py-1 text-[11px] bg-transparent text-charcoal-soft shadow-tactile hover:bg-paper-dark h-7 transition-colors"
                    >
                      EDIT IN LAB
                    </Link>
                    <Link
                      href="/goofy"
                      className="inline-flex items-center justify-center font-mono uppercase font-bold text-xs tracking-technical border-2 border-charcoal-soft rounded-tactile px-2.5 py-1 text-[11px] bg-amber-600 hover:bg-amber-700 text-white shadow-tactile h-7 transition-colors"
                    >
                      LAUNCH GOOFY WORKSPACE &rarr;
                    </Link>
                  </div>
                </div>
              </DeskCard>
            </div>

            {/* LABORATORY & FORGE COMPANION RIGS */}
            <div className="flex flex-col gap-4">
              <DeskCard figure="EXP. 01-03" title="LABORATORY BENCH" highlight={false} className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold block mb-1">
                    CUSTOM GESTURE & MODEL RIG
                  </span>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    Collect training samples, train custom KNN / centroid prototypes, tune action thresholds, and export model snapshots.
                  </p>
                </div>
                <div className="pt-2 border-t border-charcoal-soft/20 mt-2">
                  <Link
                    href="/laboratory"
                    className="w-full inline-flex items-center justify-center font-mono uppercase font-bold text-xs tracking-technical border-2 border-charcoal-soft rounded-tactile px-2.5 py-1 text-[11px] bg-transparent text-charcoal-soft shadow-tactile hover:bg-paper-dark h-7 transition-colors"
                  >
                    ENTER LABORATORY &rarr;
                  </Link>
                </div>
              </DeskCard>

              <DeskCard figure="EXP. 05" title="PROTOCOL FORGE" highlight={false} className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-brick-red font-bold block mb-1">
                    MULTIMODAL CROSS-TRIGGER BUS
                  </span>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    Automate reactive workflows wiring pose actions to sound synthesizers, laser eyes, and steering telemetry.
                  </p>
                </div>
                <div className="pt-2 border-t border-charcoal-soft/20 mt-2">
                  <Link
                    href="/forge"
                    className="w-full inline-flex items-center justify-center font-mono uppercase font-bold text-xs tracking-technical border-2 border-charcoal-soft rounded-tactile px-2.5 py-1 text-[11px] bg-transparent text-charcoal-soft shadow-tactile hover:bg-paper-dark h-7 transition-colors"
                  >
                    OPEN PROTOCOL FORGE &rarr;
                  </Link>
                </div>
              </DeskCard>
            </div>
          </div>
        </div>

        {/* Keyboard Instrument Guidance Footer Strip */}
        <div className="p-3 border-2 border-charcoal-soft bg-paper-dark rounded-tactile flex flex-wrap items-center justify-between gap-3 text-xs text-charcoal-soft">
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold text-[10px]">
                &larr; &rarr; &uarr; &darr;
              </kbd>{' '}
              GRID SELECT
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold text-[10px]">
                ENTER
              </kbd>{' '}
              LOAD MODULE
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold text-[10px]">
                Ctrl+K
              </kbd>{' '}
              COMMAND PALETTE
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold text-[10px]">
                M
              </kbd>{' '}
              MODEL VAULT
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold text-[10px]">
                H
              </kbd>{' '}
              DIAGNOSTICS HUD
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold text-[10px]">
                ?
              </kbd>{' '}
              SHORTCUTS
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-ink-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-sage-green" />
            <span className="font-bold text-charcoal-soft">ALL LOCAL COMPUTE READY</span>
          </div>
        </div>
      </main>

      {/* Global Command Palette (Triggered with Ctrl+K, Cmd+K, or '/') */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenPerfCentre={() => setPerfCentreOpen(true)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenModelVault={() => setVaultOpen(true)}
      />

      {/* Central Model Vault Modal */}
      <ModelVaultModal
        isOpen={vaultOpen}
        onClose={() => setVaultOpen(false)}
      />

      {/* Performance & Hardware Diagnostics Centre Modal */}
      <PerformanceCentreModal
        isOpen={perfCentreOpen}
        onClose={() => setPerfCentreOpen(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Cache Storage Management Drawer */}
      {cacheDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Local Model Cache Manager"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-soft/50 backdrop-blur-[2px]"
        >
          <div className="relative w-full max-w-lg bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-charcoal-soft" />
                <h3 className="font-bold text-sm uppercase tracking-technical text-charcoal-soft">
                  LOCAL MODEL CACHE MANAGER
                </h3>
              </div>
              <button
                onClick={() => setCacheDrawerOpen(false)}
                className="p-1 border border-charcoal-soft rounded-[2px] hover:bg-paper-dark"
                aria-label="Close Cache Drawer"
              >
                &times;
              </button>
            </div>

            <p className="text-[11px] text-ink-muted leading-relaxed">
              Neural network weight files and WASM kernels are saved directly into the browser&apos;s Cache Storage API and IndexedDB so Omni Loco runs fully air-gapped without re-downloading.
            </p>

            <div className="border border-charcoal-soft bg-paper-dark rounded-[2px] divide-y divide-charcoal-soft/20 max-h-72 overflow-y-auto">
              {REGISTERED_MODELS.map((item) => {
                const cached = cachedMap[item.module];
                return (
                  <div key={item.id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-charcoal-soft">{item.name}</span>
                      <span className="text-[10px] text-ink-muted">{item.url}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-ink-muted">
                        ~{(item.sizeEstimateBytes / (1024 * 1024)).toFixed(1)} MB
                      </span>
                      <StampBadge
                        label={cached ? 'CACHED' : 'UNLOADED'}
                        variant={cached ? 'sage' : 'ink'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                variant="brick"
                size="sm"
                onClick={handleClearCache}
                className="gap-1.5"
              >
                <Trash className="w-3.5 h-3.5" />
                PURGE ALL LOCAL STORAGE
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setCacheDrawerOpen(false)}
              >
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
