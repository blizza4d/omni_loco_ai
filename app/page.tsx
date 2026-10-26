'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  ModuleDefinition,
} from '@/core/modules/registry';
import { isModelCached, prefetchModel, clearAllLocalCache, REGISTERED_MODELS } from '@/core/cache';
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
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [cacheDrawerOpen, setCacheDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ModuleCategory>('ALL');
  const [spatialCursorActive, setSpatialCursorActive] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (onboardingOpen || cacheDrawerOpen) return;

      if (e.key === '/') {
        // Only trigger if not already typing in search input
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'INPUT') return;
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (commandPaletteOpen) {
        if (e.key === 'Escape') setCommandPaletteOpen(false);
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
          router.push(selected.route);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, onboardingOpen, cacheDrawerOpen, commandPaletteOpen, filteredModules, router]);

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
    await clearAllLocalCache();
    setCachedMap({});
    setCacheDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setSearchQuery('');
    setFocusedIndex(0);
  };

  return (
    <div className="min-h-screen flex flex-col font-mono text-charcoal-soft">
      <GlobalNav
        gestureNavEnabled={spatialCursorActive}
        onToggleGestureNav={setSpatialCursorActive}
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
                LAB DRAFTING STATION // WORKSPACE 01
              </span>
              <StampBadge label="HARDWARE ISOLATED" variant="sage" />
              <StampBadge label={`${MODULE_REGISTRY.length} SANDBOXES`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase leading-snug">
              MULTIMODAL NEURAL EXPERIMENT MODULES
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1.5 leading-relaxed">
              {MODULE_REGISTRY.length} sandboxed on-device sensory engines. Zero frames, audio buffers, or biometric vectors are transmitted over any network. Public neural weights are cached locally for zero-latency execution.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCacheDrawerOpen(true)}
              className="gap-1.5"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>STORAGE CACHE</span>
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
                  <Link
                    href={module.route}
                    className="h-full flex flex-col flex-1 focus:outline-none group"
                    tabIndex={0}
                  >
                    <DeskCard
                      figure={module.figure}
                      title={module.title}
                      highlight={isFocused}
                      className="h-full flex flex-col justify-between cursor-pointer group"
                      headerAction={
                        <div className="flex items-center gap-1">
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
                      {/* Schematic Icon & Visual Preview Box (Uniform min-height) */}
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

                      {/* Description & Feature Pills (Flex-1 stretches uniformly) */}
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

                      {/* Footer Strip (Anchored consistently at bottom baseline across entire row) */}
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
                    </DeskCard>
                  </Link>
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
                /
              </kbd>{' '}
              COMMAND PALETTE
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold text-[10px]">
                ?
              </kbd>{' '}
              SHORTCUTS
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold text-[10px]">
                ESC
              </kbd>{' '}
              HUB
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-ink-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-sage-green" />
            <span className="font-bold text-charcoal-soft">ALL LOCAL COMPUTE READY</span>
          </div>
        </div>
      </main>

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

      {/* Tactical Fuzzy Command Palette (Triggered with '/') */}
      {commandPaletteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tactical Command Palette"
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-charcoal-soft/60 backdrop-blur-[2px]"
        >
          <div className="relative w-full max-w-xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-4 font-mono space-y-3">
            <div className="flex items-center gap-2 border-2 border-charcoal-soft px-3 py-2 bg-paper-cream">
              <Search className="w-4 h-4 text-charcoal-soft shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="TYPE A MODULE NAME OR COMMAND..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent font-mono text-xs uppercase font-bold tracking-technical focus:outline-none text-charcoal-soft"
              />
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-dark text-[9px]">
                ESC
              </kbd>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 text-xs">
              {filteredModules.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    router.push(m.route);
                  }}
                  className="w-full text-left p-2.5 border border-transparent hover:border-charcoal-soft hover:bg-paper-dark rounded-tactile flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-[10px] text-ink-muted">
                      {m.figure}
                    </span>
                    <span className="font-bold text-charcoal-soft uppercase">{m.title}</span>
                  </div>
                  <span className="text-[10px] text-ink-muted">&rarr; ENTER</span>
                </button>
              ))}

              {filteredModules.length === 0 && (
                <div className="p-4 text-center text-ink-muted text-xs">
                  NO MATCHING MODULES FOUND
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
