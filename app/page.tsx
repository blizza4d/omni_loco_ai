'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { StampBadge } from '@/components/ui/StampBadge';
import { Button } from '@/components/ui/Button';
import { isModelCached, prefetchModel, clearAllLocalCache, REGISTERED_MODELS } from '@/core/cache';
import {
  Hand,
  Smile,
  Activity,
  Car,
  Mic,
  Trash2,
  Eye,
  CheckCircle,
  HelpCircle,
  HardDrive,
  Trash,
  Search,
  Sparkles,
  Shield,
  Layers,
  Scan,
  Scissors,
  SplitSquareVertical,
} from 'lucide-react';

interface ModuleConfig {
  id: string;
  figure: string;
  route: string;
  title: string;
  description: string;
  category: 'VISION' | 'SIMULATION' | 'AUDIO' | 'CLASSIFICATION';
  icon: React.ComponentType<{ className?: string }>;
  permissions: ('CAM' | 'MIC')[];
  modelUrl: string;
  modelSize: string;
  badge: string;
  accent: string;
}

const MODULES: ModuleConfig[] = [
  {
    id: 'hand',
    figure: 'FIG. 01',
    route: '/hand',
    title: 'HAND GESTURE RECOGNITION',
    description: '21 3D landmarks, dual-hand tracking, pinch/swipe gesture engine & spatial mouse-free UI.',
    category: 'VISION',
    icon: Hand,
    permissions: ['CAM'],
    modelUrl: '/models/hand_landmarker.task',
    modelSize: '7.8 MB',
    badge: 'WEBGPU / WASM',
    accent: 'sage',
  },
  {
    id: 'face',
    figure: 'FIG. 02',
    route: '/face',
    title: 'BIOMETRIC FACE MESH',
    description: '478 dense facial landmarks, 52 ARKit blendshapes, PERCLOS drowsiness & 3D head pose gizmo.',
    category: 'VISION',
    icon: Smile,
    permissions: ['CAM'],
    modelUrl: '/models/face_landmarker.task',
    modelSize: '3.7 MB',
    badge: 'WEBGPU / WASM',
    accent: 'sage',
  },
  {
    id: 'pose',
    figure: 'FIG. 03',
    route: '/pose',
    title: 'KINEMATIC POSE ESTIMATION',
    description: '33 full-body world landmarks, 3D joint angle trigonometry, rep-counting state machine & ergonomics.',
    category: 'VISION',
    icon: Activity,
    permissions: ['CAM'],
    modelUrl: '/models/pose_landmarker_full.task',
    modelSize: '9.4 MB',
    badge: 'WEBGPU / WASM',
    accent: 'sage',
  },
  {
    id: 'drive',
    figure: 'FIG. 04',
    route: '/drive',
    title: 'GESTURE-STEERED SIMULATOR',
    description: 'Procedural WebGL endless road, two-hand steering matrix with deadzone & bicycle physics model.',
    category: 'SIMULATION',
    icon: Car,
    permissions: ['CAM'],
    modelUrl: '/models/hand_landmarker.task',
    modelSize: '7.8 MB',
    badge: 'THREE.JS 3D',
    accent: 'charcoal',
  },
  {
    id: 'speech',
    figure: 'FIG. 05',
    route: '/speech',
    title: 'ACOUSTIC & SPEECH ANALYTICS',
    description: 'AudioWorklet DSP, real-time WPM pacing, voice activity detection, pitch contour & flaw audit.',
    category: 'AUDIO',
    icon: Mic,
    permissions: ['MIC'],
    modelUrl: '/wasm/acoustic_dsp.wasm',
    modelSize: '1.8 MB',
    badge: 'AUDIO WORKLET',
    accent: 'brick',
  },
  {
    id: 'waste',
    figure: 'FIG. 06',
    route: '/waste',
    title: 'SMART WASTE SEGREGATOR',
    description: '10-class visual segregation with MediaPipe / TF.js WebGPU, temporal voting & municipal recycling tips.',
    category: 'CLASSIFICATION',
    icon: Trash2,
    permissions: ['CAM'],
    modelUrl: '/models/classifier.tflite',
    modelSize: '18.5 MB',
    badge: 'MEDIAPIPE GPU',
    accent: 'sage',
  },
  {
    id: 'gaze',
    figure: 'FIG. 07',
    route: '/gaze',
    title: 'GAZE-TRACKING HEATMAP',
    description: 'Real-time iris tracking, 9-point ridge regression calibration, I-DT fixation parser & cumulative dwell heatmap.',
    category: 'VISION',
    icon: Eye,
    permissions: ['CAM'],
    modelUrl: '/models/face_landmarker.task',
    modelSize: '3.7 MB',
    badge: 'IRIS TELEMETRY',
    accent: 'charcoal',
  },
  {
    id: 'objects',
    figure: 'FIG. 08',
    route: '/objects',
    title: 'ADVANCED OBJECT INTELLIGENCE',
    description: 'YOLO multi-object detection, spatial IoU bounding box tracking, confidence thresholds & COCO-80 filtering.',
    category: 'VISION',
    icon: Scan,
    permissions: ['CAM'],
    modelUrl: '/wasm/ort-wasm-simd-threaded.wasm',
    modelSize: '14.2 MB',
    badge: 'ONNX WEBGPU / WASM',
    accent: 'sage',
  },
  {
    id: 'segment',
    figure: 'FIG. 09',
    route: '/segment',
    title: 'PROMPTABLE SEGMENTATION LAB',
    description: 'Point-and-click promptable segmentation decoder, geodesic mask extraction, boundary contours & PNG cutout export.',
    category: 'CLASSIFICATION',
    icon: Scissors,
    permissions: ['CAM'],
    modelUrl: '/wasm/ort-wasm-simd-threaded.wasm',
    modelSize: '12.5 MB',
    badge: 'FEATURE MASK DECODER',
    accent: 'brick',
  },
  {
    id: 'depth',
    figure: 'FIG. 10',
    route: '/depth',
    title: 'MONOCULAR DEPTH ESTIMATION',
    description: 'Relative depth geometry, side-by-side & split-screen scrubber, Turbo/Inferno/Viridis palettes & 3D surface normal probe.',
    category: 'VISION',
    icon: SplitSquareVertical,
    permissions: ['CAM'],
    modelUrl: '/wasm/ort-wasm-simd-threaded.wasm',
    modelSize: '9.6 MB',
    badge: 'SCENE GEOMETRY',
    accent: 'charcoal',
  },
  {
    id: 'fingers',
    figure: 'FIG. 11',
    route: '/fingers',
    title: 'FINGER COUNTING & GESTURE OUTPUT',
    description: 'Real-time open/folded finger detection (0-5 per hand, 0-10 combined), hysteresis voting stabilization, action triggers & TTS.',
    category: 'VISION',
    icon: Hand,
    permissions: ['CAM'],
    modelUrl: '/models/hand_landmarker.task',
    modelSize: '7.8 MB',
    badge: 'WEBGPU / KINEMATICS',
    accent: 'sage',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [cacheDrawerOpen, setCacheDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | 'VISION' | 'SIMULATION' | 'AUDIO' | 'CLASSIFICATION'
  >('ALL');
  const [spatialCursorActive, setSpatialCursorActive] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Check onboarding on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('omni-onboarding-v1');
      if (!completed) {
        setOnboardingOpen(true);
      }
    }
  }, []);

  // Check cached state for all modules
  useEffect(() => {
    async function checkAllCached() {
      const status: Record<string, boolean> = {};
      for (const m of MODULES) {
        status[m.id] = await isModelCached(m.modelUrl);
      }
      setCachedMap(status);
    }
    checkAllCached();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (onboardingOpen || cacheDrawerOpen) return;

      if (e.key === '/') {
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
        setFocusedIndex((prev) => (prev + 1) % MODULES.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + MODULES.length) % MODULES.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = MODULES[focusedIndex];
        if (selected) {
          router.push(selected.route);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, onboardingOpen, cacheDrawerOpen, commandPaletteOpen, router]);

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

  const filteredModules = MODULES.filter((m) => {
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.figure.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col font-mono">
      <GlobalNav
        gestureNavEnabled={spatialCursorActive}
        onToggleGestureNav={setSpatialCursorActive}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Desk Header Strip with Stamped Labels */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                LAB DRAFTING STATION // WORKSPACE 01
              </span>
              <StampBadge label="HARDWARE ISOLATED" variant="sage" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              MULTIMODAL NEURAL EXPERIMENT MODULES
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Eleven sandboxed on-device sensory engines. Zero frames, audio buffers, or biometric vectors are transmitted over any network. Select a module below to activate optical or acoustic pipelines.
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

        {/* Category Filters & Telemetry Summary Ticker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-charcoal-soft/20 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `ALL (${MODULES.length})` },
              { id: 'VISION', label: `VISION & KINEMATICS (${MODULES.filter((m) => m.category === 'VISION').length})` },
              { id: 'SIMULATION', label: `SPATIAL SIM (${MODULES.filter((m) => m.category === 'SIMULATION').length})` },
              { id: 'AUDIO', label: `ACOUSTIC DSP (${MODULES.filter((m) => m.category === 'AUDIO').length})` },
              { id: 'CLASSIFICATION', label: `CLASSIFICATION & LABS (${MODULES.filter((m) => m.category === 'CLASSIFICATION').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-tactile border transition-all ${
                  selectedCategory === tab.id
                    ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                    : 'border-charcoal-soft/40 text-ink-muted hover:border-charcoal-soft hover:text-charcoal-soft bg-paper-cream-dark/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-ink-muted shrink-0">
            <span className="w-2 h-2 rounded-full bg-sage-green animate-pulse" />
            <span className="font-bold text-charcoal-soft">11 SANDBOXES ISOLATED</span>
            <span>// 100% CLIENT-SIDE</span>
          </div>
        </div>

        {/* First-Run Onboarding 3-Step Card Sequence */}
        {onboardingOpen && (
          <div className="relative border-2 border-brick-red bg-paper-dark p-5 rounded-tactile shadow-tactile-brick transition-all">
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

        {/* 7-Card Index Grid */}
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
                className={`transition-transform duration-150 ${
                  isFocused ? '-translate-y-1' : ''
                }`}
              >
                <Link
                  href={module.route}
                  className="block focus:outline-none"
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
                    {/* Schematic Icon & Visual Preview */}
                    <div className="my-3 p-4 border border-charcoal-soft bg-paper-dark/60 rounded-[2px] flex items-center justify-between group-hover:bg-paper-dark transition-colors">
                      <div className="space-y-1">
                        <StampBadge label={module.badge} variant="charcoal" />
                        <span className="block text-[10px] text-ink-muted">
                          EST. SIZE: {module.modelSize}
                        </span>
                      </div>
                      <div className="w-12 h-12 border-2 border-charcoal-soft bg-paper-cream rounded-tactile flex items-center justify-center shadow-tactile-sm group-hover:scale-105 transition-transform">
                        <Icon className="w-6 h-6 text-charcoal-soft" />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-ink-muted leading-relaxed mb-4 flex-1">
                      {module.description}
                    </p>

                    {/* Footer Strip */}
                    <div className="pt-2 border-t border-charcoal-soft/20 flex items-center justify-between text-[11px]">
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

        {/* Keyboard Instrument Guidance Footer Strip */}
        <div className="p-3 border-2 border-charcoal-soft bg-paper-dark rounded-tactile flex flex-wrap items-center justify-between gap-3 text-xs text-charcoal-soft">
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold">
                &larr; &rarr; &uarr; &darr;
              </kbd>{' '}
              GRID SELECT
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold">
                ENTER
              </kbd>{' '}
              LOAD MODULE
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold">
                /
              </kbd>{' '}
              COMMAND PALETTE
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold">
                ESC
              </kbd>{' '}
              RETURN TO HUB
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-ink-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-sage-green" />
            <span>ALL LOCAL COMPUTE READY</span>
          </div>
        </div>
      </main>

      {/* Cache Storage Management Drawer */}
      {cacheDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-soft/50 backdrop-blur-[2px]">
          <div className="relative w-full max-w-lg bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-charcoal-soft" />
                <h3 className="font-bold text-sm uppercase tracking-technical">
                  LOCAL MODEL CACHE MANAGER
                </h3>
              </div>
              <button
                onClick={() => setCacheDrawerOpen(false)}
                className="p-1 border border-charcoal-soft rounded-[2px] hover:bg-paper-dark"
              >
                &times;
              </button>
            </div>

            <p className="text-[11px] text-ink-muted leading-relaxed">
              Neural network weight files and WASM kernels are saved directly into the browser's Cache Storage API and IndexedDB so Omni Loco runs fully air-gapped without re-downloading.
            </p>

            <div className="border border-charcoal-soft bg-paper-dark rounded-[2px] divide-y divide-charcoal-soft/20">
              {REGISTERED_MODELS.map((item) => {
                const cached = cachedMap[item.module];
                return (
                  <div key={item.id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-charcoal-soft">{item.name}</span>
                      <span className="text-[10px] text-ink-muted">{item.url}</span>
                    </div>
                    <div className="flex items-center gap-2">
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

      {/* Fuzzy Command Palette (Triggered with '/') */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-charcoal-soft/60 backdrop-blur-[2px]">
          <div className="relative w-full max-w-xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-4 font-mono space-y-3">
            <div className="flex items-center gap-2 border-2 border-charcoal-soft px-3 py-2 bg-paper-cream">
              <Search className="w-4 h-4 text-charcoal-soft" />
              <input
                type="text"
                autoFocus
                placeholder="TYPE A MODULE NAME OR COMMAND..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent font-mono text-xs uppercase font-bold tracking-technical focus:outline-none"
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
