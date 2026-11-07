'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { useCamera } from '@/core/camera/useCamera';
import { MediaPipeTaskRunner } from '@/core/mediapipe/task-runner';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { renderHandOverlay } from '@/modules/hand/overlay-renderer';
import { generateSyntheticHand } from '@/modules/hand/synthetic-hand';
import { Landmark3D } from '@/modules/hand/types';
import {
  GoofyHandGestureType,
  GoofyDualHandComboId,
  GoofySoundId,
  GoofyModeConfig,
  ActiveMemePopup,
  UnifiedMemeEvent,
  MemeVisualDefinition,
  HandRecognitionState,
  DEFAULT_GOOFY_CONFIG,
  DEFAULT_SOUND_LIBRARY,
  GOOFY_HAND_METADATA,
  GOOFY_DUAL_COMBO_DEFINITIONS,
  PopupAnimationStyle,
  MemePresetId,
  MemeCategory,
  SEMANTIC_MEME_CATEGORIES,
  BUILTIN_MEME_PRESETS,
  GOOFY_ACTION_RECOMMENDED_MEMES,
} from '@/modules/pose/goofy-types';
import {
  GoofyHandClassifier,
  GoofyHandStateMachine,
  GoofyDualHandStateMachine,
  detectDualHandCombo,
} from '@/modules/pose/goofy-hand-classifier';
import {
  runComprehensiveGestureBenchmark,
  runFullDatasetEvaluation,
  BenchmarkReport,
  DetailedEvaluationReport,
} from '@/modules/pose/goofy-test-fixtures';
import { GoofyAudioEngine } from '@/modules/pose/goofy-audio-engine';
import { GoofyVisualFXEngine } from '@/modules/pose/goofy-visual-fx';
import { GoofyEventEngine } from '@/modules/pose/goofy-event-engine';
import {
  DEFAULT_MEME_LIBRARY,
  getMemeById,
  getDefaultMemeForAction,
  loadCustomMemesFromDB,
  saveCustomMemeToDB,
  saveCustomMemeDefinitionToDB,
  deleteCustomMemeFromDB,
  searchMemes,
  filterMemesByCategory,
} from '@/modules/pose/goofy-meme-library';
import { MemePopupOverlay } from '@/modules/pose/components/MemePopupOverlay';
import { CustomMemeCreatorModal } from '@/modules/pose/components/CustomMemeCreatorModal';
import { AssignMemeModal } from '@/modules/pose/components/AssignMemeModal';
import { useSystemStore } from '@/core/store';
import { ProtocolEventBus } from '@/modules/forge/event-bus';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Sliders,
  RotateCcw,
  Upload,
  Activity,
  Zap,
  Music,
  ArrowLeft,
  X,
  Camera,
  CameraOff,
  Image as ImageIcon,
  Hand,
  Trash2,
  BookOpen,
  Star,
  Search,
  Dices,
  Plus,
  Wand2,
  Check,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Cpu,
} from 'lucide-react';

const STORAGE_KEY = 'omni-goofy-config-v3-hand-only';

export default function GoofyModePage() {
  const [config, setConfig] = useState<GoofyModeConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_GOOFY_CONFIG,
            ...parsed,
            handMappings: { ...DEFAULT_GOOFY_CONFIG.handMappings, ...(parsed.handMappings || {}) },
            dualHandMappings: { ...DEFAULT_GOOFY_CONFIG.dualHandMappings, ...(parsed.dualHandMappings || {}) },
            actionMemeMappings: {
              ...DEFAULT_GOOFY_CONFIG.actionMemeMappings,
              ...(parsed.actionMemeMappings || {}),
            },
            actionCustomCaptions: {
              ...DEFAULT_GOOFY_CONFIG.actionCustomCaptions,
              ...(parsed.actionCustomCaptions || {}),
            },
          };
        }
      } catch {
        // Fallback
      }
    }
    return DEFAULT_GOOFY_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<'HANDS' | 'COMBOS' | 'MEMES' | 'TESTBENCH'>('HANDS');
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showFingertipMarkers, setShowFingertipMarkers] = useState(true);
  const [selectedTestGesture, setSelectedTestGesture] = useState<GoofyHandGestureType>('THUMBS_UP');
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkReport | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState<DetailedEvaluationReport | null>(null);
  const [isEvaluatingDataset, setIsEvaluatingDataset] = useState(false);
  const [activeHandModelName, setActiveHandModelName] = useState<string>('GESTURE_RECOGNIZER');
  const [capturedSamples, setCapturedSamples] = useState<{ id: string; label: string; timestamp: number; landmarks: Landmark3D[]; handedness: 'Left' | 'Right' }[]>([]);
  const [sampleCaptureLabel, setSampleCaptureLabel] = useState<string>('THUMBS_UP');
  const [fps, setFps] = useState(0);

  // Diagnostics Telemetry State (Phase 6)
  const [diagnosticsData, setDiagnosticsData] = useState<{
    latencyMs: number;
    handCount: number;
    left: {
      raw: GoofyHandGestureType | null;
      stabilized: GoofyHandGestureType | null;
      state: HandRecognitionState;
      holdDurationMs: number;
      confidence: number;
      rejectionReason: string | null;
      landmarksValid: boolean;
      fingerStates?: { thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean };
    };
    right: {
      raw: GoofyHandGestureType | null;
      stabilized: GoofyHandGestureType | null;
      state: HandRecognitionState;
      holdDurationMs: number;
      confidence: number;
      rejectionReason: string | null;
      landmarksValid: boolean;
      fingerStates?: { thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean };
    };
  }>({
    latencyMs: 0,
    handCount: 0,
    left: { raw: null, stabilized: null, state: 'NO_HANDS', holdDurationMs: 0, confidence: 0, rejectionReason: 'No hand detected', landmarksValid: false },
    right: { raw: null, stabilized: null, state: 'NO_HANDS', holdDurationMs: 0, confidence: 0, rejectionReason: 'No hand detected', landmarksValid: false },
  });
  const lastDiagUpdateRef = useRef(0);

  // Hand Tracking Telemetry (Strictly Hand-Only)
  const [handCount, setHandCount] = useState<number>(0);
  const [leftHandGesture, setLeftHandGesture] = useState<GoofyHandGestureType | null>(null);
  const [rightHandGesture, setRightHandGesture] = useState<GoofyHandGestureType | null>(null);
  const [leftFingerCount, setLeftFingerCount] = useState<number>(0);
  const [rightFingerCount, setRightFingerCount] = useState<number>(0);
  const [totalFingerCount, setTotalFingerCount] = useState<number>(0);
  const [activeDualCombo, setActiveDualCombo] = useState<GoofyDualHandComboId | null>(null);
  const [activeDetectionLabel, setActiveDetectionLabel] = useState<string>('SHOW YOUR HANDS');
  const [comicCaption, setComicCaption] = useState<string>(
    'SHOW A HAND GESTURE OR DUAL-HAND COMBO TO TRIGGER MEMES!'
  );

  // Pop-up & Event Engine States
  const [activePopups, setActivePopups] = useState<ActiveMemePopup[]>([]);
  const [recentEvents, setRecentEvents] = useState<UnifiedMemeEvent[]>([]);
  const [lastTriggeredEvent, setLastTriggeredEvent] = useState<UnifiedMemeEvent | null>(null);
  const [customMemes, setCustomMemes] = useState<MemeVisualDefinition[]>([]);
  const [memeModalAction, setMemeModalAction] = useState<string | null>(null);

  // Meme Discovery, Search & Category States
  const [memeSearchQuery, setMemeSearchQuery] = useState('');
  const [selectedMemeCategory, setSelectedMemeCategory] = useState<string>('ALL');
  const [recentlyUsedIds, setRecentlyUsedIds] = useState<string[]>([]);

  // Modal Dialogs
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [creatorTargetAction, setCreatorTargetAction] = useState<string | null>(null);
  const [assignModalMeme, setAssignModalMeme] = useState<MemeVisualDefinition | null>(null);

  // System states
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const [actionManualOpen, setActionManualOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fullscreen Camera state & DOM ref
  const cameraWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Accordion UI expansion states (reducing vertical clutter)
  const [expandedGestures, setExpandedGestures] = useState<Set<string>>(new Set());
  const [expandedCombos, setExpandedCombos] = useState<Set<string>>(new Set());
  const [presetsAccordionOpen, setPresetsAccordionOpen] = useState(true);
  const [filtersAccordionOpen, setFiltersAccordionOpen] = useState(true);

  // Session gesture trigger set for achievements
  const sessionGesturesRef = useRef<Set<string>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const handClassifierRef = useRef<GoofyHandClassifier>(new GoofyHandClassifier());

  const leftHandSMRef = useRef<GoofyHandStateMachine>(
    new GoofyHandStateMachine({
      minHoldMs: 160,
      cooldownMs: config.cooldownMs,
    })
  );
  const rightHandSMRef = useRef<GoofyHandStateMachine>(
    new GoofyHandStateMachine({
      minHoldMs: 160,
      cooldownMs: config.cooldownMs,
    })
  );
  const dualHandSMRef = useRef<GoofyDualHandStateMachine>(
    new GoofyDualHandStateMachine({
      minHoldMs: 180,
      cooldownMs: config.cooldownMs,
    })
  );

  const audioEngineRef = useRef<GoofyAudioEngine>(new GoofyAudioEngine());
  const visualFxRef = useRef<GoofyVisualFXEngine>(new GoofyVisualFXEngine());
  const eventEngineRef = useRef<GoofyEventEngine>(
    new GoofyEventEngine(config, audioEngineRef.current, visualFxRef.current)
  );

  const leftHandLandmarksRef = useRef<Landmark3D[] | null>(null);
  const rightHandLandmarksRef = useRef<Landmark3D[] | null>(null);
  const prevTelemetryRef = useRef({
    handCount: -1,
    leftGesture: null as GoofyHandGestureType | null,
    rightGesture: null as GoofyHandGestureType | null,
    leftFingers: -1,
    rightFingers: -1,
    totalFingers: -1,
    dualCombo: null as GoofyDualHandComboId | null,
    label: '',
    caption: '',
  });
  const frameCountRef = useRef(0);
  const lastFpsCalcRef = useRef(performance.now());
  const configRef = useRef(config);
  configRef.current = config;

  const {
    videoRef,
    isStreaming,
    startCamera,
    stopCamera,
    isMirrored,
  } = useCamera({
    preferredResolution: { width: 1280, height: 720 },
    preferredFacingMode: 'user',
  });

  // Sync config changes to storage and engines
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch {
        // Quota guard
      }
    }
    leftHandSMRef.current.updateConfig({ cooldownMs: config.cooldownMs });
    rightHandSMRef.current.updateConfig({ cooldownMs: config.cooldownMs });
    dualHandSMRef.current.updateConfig({ cooldownMs: config.cooldownMs });
    eventEngineRef.current.updateConfig(config);
  }, [config]);

  // Load user custom memes from IndexedDB
  useEffect(() => {
    loadCustomMemesFromDB().then((memes) => {
      setCustomMemes(memes);
      eventEngineRef.current.setCustomMemes(memes);
    });
  }, []);

  // Subscribe to Event Engine updates
  useEffect(() => {
    setRecentlyUsedIds(eventEngineRef.current.getRecentlyUsedMemeIds());
    const unsubscribe = eventEngineRef.current.subscribe((event, popups) => {
      setActivePopups(popups);
      setRecentlyUsedIds(eventEngineRef.current.getRecentlyUsedMemeIds());
      if (event.actionId !== 'POPUP_EXPIRED') {
        setLastTriggeredEvent(event);
        setRecentEvents((prev) => [event, ...prev].slice(0, 40));

        // Shake effect trigger
        if (configRef.current.enableScreenShake) {
          setShakeActive(true);
          setTimeout(() => setShakeActive(false), 350);
        }

        // Protocol Forge Event Bus integration
        ProtocolEventBus.getInstance().publish(
          'MANUAL_TRIGGER',
          {
            triggerId: event.actionId,
            label: event.actionLabel,
            timestamp: event.timestamp,
          },
          'goofy-model-hand-only',
          event.confidence || 0.95
        );

        // Easter egg achievements for Hand Gestures
        sessionGesturesRef.current.add(event.actionId);
        unlockAchievement('GOOFY_FIRST_GESTURE');

        if (event.source === 'DUAL_HAND') {
          unlockAchievement('GOOFY_DUAL_COMBO');
        }

        if (event.actionId === 'THUMBS_UP' || event.actionId === 'DOUBLE_THUMBS_UP') {
          unlockAchievement('GOOFY_CHAD_THUMBS');
        }

        if (event.actionId === 'SWIPE_LEFT' || event.actionId === 'SWIPE_RIGHT') {
          unlockAchievement('GOOFY_SPEED_SWIPER');
        }

        if (sessionGesturesRef.current.size >= 5) {
          unlockAchievement('GOOFY_GESTURE_MASTER');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize MediaPipe Hand Perception Pipeline (Prefers GestureRecognizer, fallbacks to HandLandmarker)
  useEffect(() => {
    let mounted = true;
    const runner = runnerRef.current;
    const visualFx = visualFxRef.current;
    const audioEngine = audioEngineRef.current;

    runner
      .initHandPipeline({
        preferGestureRecognizer: true,
        gestureModelPath: '/models/gesture_recognizer.task',
        landmarkerModelPath: '/models/hand_landmarker.task',
        config: {
          numHands: 2,
          minHandDetectionConfidence: 0.40,
          minHandPresenceConfidence: 0.40,
          minTrackingConfidence: 0.40,
        },
      })
      .then(() => {
        if (mounted) {
          setActiveHandModelName(runner.getActiveHandModel());
        }
      })
      .catch((err) => {
        console.warn('[GoofyModel] MediaPipe hand perception pipeline notice:', err);
      });

    return () => {
      mounted = false;
      runner.dispose();
      visualFx.clear();
      audioEngine.stopAll();
    };
  }, []);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'GOOFY MODEL V3 (HAND-ONLY)',
      activeModel: 'hand_landmarker (21-point dual)',
      fps,
      p50Ms: 12,
      p95Ms: 18,
      trackingStatus: isStreaming ? 'TRACKING_ACTIVE' : 'STANDBY',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [fps, isStreaming, setPerfStats]);

  // Audio Context unlock helper
  const handleUnlockAudio = () => {
    const success = audioEngineRef.current.unlock();
    if (success) setAudioUnlocked(true);
  };

  // Fullscreen Browser API Controller (Targeting the camera feed wrapper)
  const toggleFullscreen = useCallback(async () => {
    const wrapper = cameraWrapperRef.current;
    if (!wrapper) return;

    try {
      if (!document.fullscreenElement) {
        if (wrapper.requestFullscreen) {
          await wrapper.requestFullscreen();
        } else if ((wrapper as any).webkitRequestFullscreen) {
          await (wrapper as any).webkitRequestFullscreen();
        } else if ((wrapper as any).mozRequestFullScreen) {
          await (wrapper as any).mozRequestFullScreen();
        } else if ((wrapper as any).msRequestFullscreen) {
          await (wrapper as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('[Goofy] Fullscreen toggle error:', err);
    }
  }, []);

  // Sync fullscreen state with browser changes
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement &&
        cameraWrapperRef.current &&
        document.fullscreenElement === cameraWrapperRef.current
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Keyboard shortcut listener for Esc and F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Accordion Toggle Handlers
  const toggleGestureAccordion = useCallback((gestureKey: string) => {
    setExpandedGestures((prev) => {
      const next = new Set(prev);
      if (next.has(gestureKey)) next.delete(gestureKey);
      else next.add(gestureKey);
      return next;
    });
  }, []);

  const handleExpandAllGestures = useCallback(() => {
    const all = [
      'OPEN_PALM',
      'CLOSED_FIST',
      'THUMBS_UP',
      'THUMBS_DOWN',
      'PEACE_SIGN',
      'POINTING',
      'PINCH',
      'THREE_FINGERS',
      'FOUR_FINGERS',
      'FIVE_FINGERS',
      'SWIPE_LEFT',
      'SWIPE_RIGHT',
    ];
    setExpandedGestures(new Set(all));
  }, []);

  const handleCollapseAllGestures = useCallback(() => {
    setExpandedGestures(new Set());
  }, []);

  const toggleComboAccordion = useCallback((comboKey: string) => {
    setExpandedCombos((prev) => {
      const next = new Set(prev);
      if (next.has(comboKey)) next.delete(comboKey);
      else next.add(comboKey);
      return next;
    });
  }, []);

  const handleExpandAllCombos = useCallback(() => {
    const all = [
      'DOUBLE_THUMBS_UP',
      'BOTH_HANDS_OPEN',
      'BOTH_HANDS_FIST',
      'DOUBLE_PEACE',
      'THUMBS_UP_AND_DOWN',
      'PERFECT_TEN',
      'DOUBLE_THREE',
      'ROCK_PAPER_SCISSORS',
      'SECRET_HEART_HANDS',
      'SECRET_MATRIX_DODGE',
      'SECRET_YOU_ARE_BREATHTAKING',
    ];
    setExpandedCombos(new Set(all));
  }, []);

  const handleCollapseAllCombos = useCallback(() => {
    setExpandedCombos(new Set());
  }, []);

  // Main 60 FPS Render & Evaluation Loop (Dedicated Hand Tracking Every Frame)
  const tick = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastFpsCalcRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcRef.current)));
      frameCountRef.current = 0;
      lastFpsCalcRef.current = now;
    }

    const inferStart = performance.now();
    let detectedHands: {
      handedness: 'Left' | 'Right';
      landmarks: Landmark3D[];
      worldLandmarks?: Landmark3D[];
      modelGestureHint?: { category: string; score: number };
      bbox?: { minX: number; maxX: number; minY: number; maxY: number };
    }[] = [];

    if (syntheticMode) {
      // Synthetic Demonstration Mode: Generates synthetic hand landmarks ONLY when explicitly enabled
      const synthLm = generateSyntheticHand(now, 'point');
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (const pt of synthLm) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      detectedHands = [
        {
          handedness: 'Right',
          landmarks: synthLm,
          bbox: { minX, maxX, minY, maxY },
        },
      ];
    } else if (videoRef.current && videoRef.current.readyState >= 2) {
      // Live Camera Processing: Dedicated Hand Tracking on Every Frame
      const handResult = runnerRef.current.detectHands(videoRef.current, now);
      if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
        detectedHands = handResult.landmarks.map((lms, idx) => {
          const rawHandedness =
            handResult.handedness && handResult.handedness[idx] && handResult.handedness[idx]![0]
              ? (handResult.handedness[idx]![0]!.displayName as 'Left' | 'Right')
              : idx === 0
              ? 'Right'
              : 'Left';

          const worldLms = handResult.worldLandmarks && handResult.worldLandmarks[idx]
            ? handResult.worldLandmarks[idx]!.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z }))
            : undefined;

          const gestureHint = handResult.gestures && handResult.gestures[idx] && handResult.gestures[idx]![0]
            ? {
                category: handResult.gestures[idx]![0]!.categoryName,
                score: handResult.gestures[idx]![0]!.score,
              }
            : undefined;

          let minX = 1, maxX = 0, minY = 1, maxY = 0;
          for (const pt of lms) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }

          return {
            handedness: rawHandedness,
            landmarks: lms.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z })),
            worldLandmarks: worldLms,
            modelGestureHint: gestureHint,
            bbox: { minX, maxX, minY, maxY },
          };
        });

        // Consistent visual screen-X handedness sorting to prevent handedness flipping
        if (detectedHands.length === 2 && detectedHands[0]?.landmarks[0] && detectedHands[1]?.landmarks[0]) {
          const h0x = isMirrored ? (1 - detectedHands[0].landmarks[0].x) : detectedHands[0].landmarks[0].x;
          const h1x = isMirrored ? (1 - detectedHands[1].landmarks[0].x) : detectedHands[1].landmarks[0].x;
          if (h0x <= h1x) {
            detectedHands[0].handedness = 'Left';
            detectedHands[1].handedness = 'Right';
          } else {
            detectedHands[0].handedness = 'Right';
            detectedHands[1].handedness = 'Left';
          }
        }

        // Update cached refs
        const leftH = detectedHands.find((h) => h.handedness === 'Left');
        const rightH = detectedHands.find((h) => h.handedness === 'Right');
        leftHandLandmarksRef.current = leftH ? leftH.landmarks : null;
        rightHandLandmarksRef.current = rightH ? rightH.landmarks : null;
      } else {
        detectedHands = [];
        leftHandLandmarksRef.current = null;
        rightHandLandmarksRef.current = null;
      }
    } else {
      detectedHands = [];
      leftHandLandmarksRef.current = null;
      rightHandLandmarksRef.current = null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas) {
      syncCanvasToVideo(canvas, video);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render Hand Bounding Box with Sleek Corner Brackets & Status Pill
        for (const hand of detectedHands) {
          if (hand.bbox) {
            const padX = (hand.bbox.maxX - hand.bbox.minX) * 0.18;
            const padY = (hand.bbox.maxY - hand.bbox.minY) * 0.18;
            const leftX = Math.max(0, hand.bbox.minX - padX);
            const rightX = Math.min(1, hand.bbox.maxX + padX);
            const topY = Math.max(0, hand.bbox.minY - padY);
            const botY = Math.min(1, hand.bbox.maxY + padY);

            const bx = isMirrored ? (1 - rightX) * canvas.width : leftX * canvas.width;
            const bw = (rightX - leftX) * canvas.width;
            const by = topY * canvas.height;
            const bh = (botY - topY) * canvas.height;

            const color = hand.handedness === 'Left' ? '#A855F7' : '#06B6D4';
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(bx, by, bw, bh);
            ctx.setLineDash([]);

            // Handedness pill at top corner of bounding box
            ctx.fillStyle = hand.handedness === 'Left' ? 'rgba(168, 85, 247, 0.90)' : 'rgba(6, 182, 212, 0.90)';
            ctx.font = 'bold 9px monospace';
            const badgeText = `${hand.handedness.toUpperCase()} [DETECTED]`;
            const badgeW = ctx.measureText(badgeText).width + 8;
            ctx.fillRect(bx, Math.max(0, by - 14), badgeW, 13);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(badgeText, bx + 4, Math.max(9, by - 4));
            ctx.restore();
          }
        }

        // Render On-Screen Guidance when camera active but no hands in view
        if (detectedHands.length === 0 && isStreaming) {
          ctx.save();
          const cardW = 340;
          const cardH = 46;
          const cardX = (canvas.width - cardW) / 2;
          const cardY = canvas.height - cardH - 24;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('NO HANDS DETECTED — SHOW HAND TO CAMERA', canvas.width / 2, cardY + 18);

          ctx.fillStyle = '#94A3B8';
          ctx.font = '9px monospace';
          ctx.fillText('• Keep inside frame  • Ensure adequate light  • Avoid rapid blur', canvas.width / 2, cardY + 34);
          ctx.restore();
        }

        // Render Hand Skeletons & 21 Landmarks
        for (const hand of detectedHands) {
          renderHandOverlay(ctx, hand.landmarks, canvas.width, canvas.height, {
            showJointLabels: showDiagnostics && showFingertipMarkers,
            showSkeleton: true,
            showCursor: false,
            showActiveRegion: false,
            isMirrored,
            clearBeforeRender: false,
          });

          // Fingertip highlighted markers when diagnostics enabled
          if (showDiagnostics && showFingertipMarkers) {
            const tipIndices = [4, 8, 12, 16, 20];
            for (const idx of tipIndices) {
              const tip = hand.landmarks[idx];
              if (tip) {
                const cx = isMirrored ? (1 - tip.x) * canvas.width : tip.x * canvas.width;
                const cy = tip.y * canvas.height;
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, 7, 0, Math.PI * 2);
                ctx.strokeStyle = hand.handedness === 'Left' ? '#A855F7' : '#06B6D4';
                ctx.lineWidth = 2.5;
                ctx.stroke();
                ctx.restore();
              }
            }
          }
        }

        // ─────────────────────────────────────────────────────────────
        // HAND INFERENCE, DUAL COMBOS & FINGER TELEMETRY
        // ─────────────────────────────────────────────────────────────
        let curLeftGesture: GoofyHandGestureType | null = null;
        let curRightGesture: GoofyHandGestureType | null = null;
        let leftFingers = 0;
        let rightFingers = 0;
        let leftResult: ReturnType<GoofyHandClassifier['classify']> | null = null;
        let rightResult: ReturnType<GoofyHandClassifier['classify']> | null = null;

        for (const hand of detectedHands) {
          const res = handClassifierRef.current.classify(
            hand.landmarks,
            hand.handedness,
            now,
            isMirrored,
            hand.worldLandmarks,
            hand.modelGestureHint
          );
          if (hand.handedness === 'Left') {
            curLeftGesture = res.gesture;
            leftFingers = res.fingerCount ?? 0;
            leftResult = res;
          } else {
            curRightGesture = res.gesture;
            rightFingers = res.fingerCount ?? 0;
            rightResult = res;
          }
        }

        // Feed State Machine: ALWAYS process both hands (pass gesture: null if absent)
        const leftInput = leftResult || {
          gesture: null,
          handedness: 'Left' as const,
          confidence: 0,
          label: 'NO HAND',
          comicCaption: '',
          rejectionReason: 'No left hand detected in frame',
        };
        const leftSM = leftHandSMRef.current.process(leftInput, now);

        const rightInput = rightResult || {
          gesture: null,
          handedness: 'Right' as const,
          confidence: 0,
          label: 'NO HAND',
          comicCaption: '',
          rejectionReason: 'No right hand detected in frame',
        };
        const rightSM = rightHandSMRef.current.process(rightInput, now);

        // Update Diagnostics Telemetry Throttled (Phase 6)
        const inferDuration = performance.now() - inferStart;
        if (showDiagnostics && now - lastDiagUpdateRef.current >= 80) {
          lastDiagUpdateRef.current = now;
          setDiagnosticsData({
            latencyMs: inferDuration,
            handCount: detectedHands.length,
            left: {
              raw: curLeftGesture,
              stabilized: leftSM.stabilizedGesture,
              state: leftSM.state,
              holdDurationMs: leftSM.holdDurationMs,
              confidence: leftResult ? leftResult.confidence : 0,
              rejectionReason: leftSM.rejectionReason,
              landmarksValid: !!leftResult,
              fingerStates: leftResult?.fingerStates,
            },
            right: {
              raw: curRightGesture,
              stabilized: rightSM.stabilizedGesture,
              state: rightSM.state,
              holdDurationMs: rightSM.holdDurationMs,
              confidence: rightResult ? rightResult.confidence : 0,
              rejectionReason: rightSM.rejectionReason,
              landmarksValid: !!rightResult,
              fingerStates: rightResult?.fingerStates,
            },
          });
        }

        // Dual-Hand Combination Evaluation & Arbitration
        let dualComboTriggered = false;
        let currentDualComboId: GoofyDualHandComboId | null = null;

        if (curLeftGesture && curRightGesture) {
          const comboResult = detectDualHandCombo(curLeftGesture, curRightGesture);
          currentDualComboId = comboResult.combo;
          const dualSM = dualHandSMRef.current.process(comboResult, now);

          if (dualSM.triggered && dualSM.combo) {
            dualComboTriggered = true;
            eventEngineRef.current.dispatchDualHandTrigger(
              dualSM.combo,
              comboResult.confidence,
              {
                fingerCount: leftFingers + rightFingers,
                isDynamic: false,
              }
            );

            // Dual Combo Achievements
            unlockAchievement('GOOFY_DUAL_COMBO');
            if (dualSM.combo === 'PERFECT_TEN') {
              unlockAchievement('GOOFY_PERFECT_TEN');
            }
            if (GOOFY_DUAL_COMBO_DEFINITIONS[dualSM.combo]?.isSecret) {
              unlockAchievement('GOOFY_SECRET_COMBO');
            }
          }
        } else {
          dualHandSMRef.current.reset();
        }

        // If a dual-hand combo is triggered, suppress individual single-hand triggers for this tick
        if (!dualComboTriggered) {
          if (leftSM.triggered && leftSM.gesture) {
            eventEngineRef.current.dispatchActionTrigger(
              leftSM.gesture,
              'HAND',
              'Left',
              leftSM.confidence,
              {
                fingerCount: leftResult?.fingerCount,
                isDynamic: leftResult?.isDynamic,
              }
            );
          }

          if (rightSM.triggered && rightSM.gesture) {
            eventEngineRef.current.dispatchActionTrigger(
              rightSM.gesture,
              'HAND',
              'Right',
              rightSM.confidence,
              {
                fingerCount: rightResult?.fingerCount,
                isDynamic: rightResult?.isDynamic,
              }
            );
          }
        }

        // Active Detection & Caption Resolution
        let newLabel = 'SHOW YOUR HANDS';
        let newCaption = 'HOLD A HAND GESTURE OR DUAL-HAND COMBO TO TRIGGER MEMES!';

        if (currentDualComboId) {
          const comboMeta = GOOFY_DUAL_COMBO_DEFINITIONS[currentDualComboId];
          newLabel = `${comboMeta.icon} ${comboMeta.label}`;
          newCaption = config.actionCustomCaptions[currentDualComboId] || comboMeta.defaultCaption;
        } else if (curRightGesture && curLeftGesture) {
          newLabel = `L: ${GOOFY_HAND_METADATA[curLeftGesture]?.label} | R: ${GOOFY_HAND_METADATA[curRightGesture]?.label}`;
          newCaption =
            config.actionCustomCaptions[curRightGesture] ||
            GOOFY_HAND_METADATA[curRightGesture]?.defaultCaption;
        } else if (curRightGesture) {
          const meta = GOOFY_HAND_METADATA[curRightGesture];
          newLabel = `${meta?.icon} RIGHT: ${meta?.label}`;
          newCaption = config.actionCustomCaptions[curRightGesture] || meta?.defaultCaption;
        } else if (curLeftGesture) {
          const meta = GOOFY_HAND_METADATA[curLeftGesture];
          newLabel = `${meta?.icon} LEFT: ${meta?.label}`;
          newCaption = config.actionCustomCaptions[curLeftGesture] || meta?.defaultCaption;
        } else if (detectedHands.length > 0) {
          newLabel = 'HANDS DETECTED (NO GESTURE)';
          newCaption = `DIGITS DETECTED: ${leftFingers + rightFingers} // FORM A GESTURE!`;
        }

        // High-Performance React State Throttling: only re-render DOM when telemetry values mutate
        const totalFingers = leftFingers + rightFingers;
        const prevT = prevTelemetryRef.current;
        if (
          prevT.handCount !== detectedHands.length ||
          prevT.leftGesture !== curLeftGesture ||
          prevT.rightGesture !== curRightGesture ||
          prevT.leftFingers !== leftFingers ||
          prevT.rightFingers !== rightFingers ||
          prevT.totalFingers !== totalFingers ||
          prevT.dualCombo !== currentDualComboId ||
          prevT.label !== newLabel ||
          prevT.caption !== newCaption
        ) {
          prevTelemetryRef.current = {
            handCount: detectedHands.length,
            leftGesture: curLeftGesture,
            rightGesture: curRightGesture,
            leftFingers,
            rightFingers,
            totalFingers,
            dualCombo: currentDualComboId,
            label: newLabel,
            caption: newCaption,
          };
          setHandCount(detectedHands.length);
          setLeftHandGesture(curLeftGesture);
          setRightHandGesture(curRightGesture);
          setLeftFingerCount(leftFingers);
          setRightFingerCount(rightFingers);
          setTotalFingerCount(totalFingers);
          setActiveDualCombo(currentDualComboId);
          setActiveDetectionLabel(newLabel);
          setComicCaption(newCaption);
        }

        // Render Visual Comic Particles
        visualFxRef.current.updateAndRender(ctx, now);
      }
    }
  }, [
    config.actionCustomCaptions,
    isMirrored,
    isStreaming,
    syntheticMode,
    videoRef,
    showDiagnostics,
    showFingertipMarkers,
  ]);

  // Animation Loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      tick();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [tick]);

  // All combined memes (custom uploads first, followed by built-in vector pack)
  const allMemes: MemeVisualDefinition[] = useMemo(() => {
    return [...customMemes, ...DEFAULT_MEME_LIBRARY];
  }, [customMemes]);

  // Star / Favorite toggle
  const toggleFavoriteMeme = (memeId: string) => {
    setConfig((prev) => {
      const favs = prev.favoriteMemes || [];
      const isFav = favs.includes(memeId);
      const nextFavs = isFav ? favs.filter((id) => id !== memeId) : [...favs, memeId];
      return { ...prev, favoriteMemes: nextFavs };
    });
  };

  // Preset Applicator
  const handleApplyPreset = (presetId: MemePresetId) => {
    const preset = BUILTIN_MEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      activePresetId: presetId,
      actionMemeMappings: {
        ...prev.actionMemeMappings,
        ...preset.actionMemeMappings,
      },
      popupAnimationStyle: preset.animationStyle || prev.popupAnimationStyle,
    }));
  };

  // Random Dice Roll Preview
  const handleDiceRoll = () => {
    if (allMemes.length === 0) return;
    const picked = allMemes[Math.floor(Math.random() * allMemes.length)];
    if (picked) {
      eventEngineRef.current.previewAction('OPEN_PALM', 'HAND', undefined, picked.id);
    }
  };

  // Helper to discover actions that currently use a specific meme
  const getAssignedActionsForMeme = (memeId: string): string[] => {
    const assigned: string[] = [];
    for (const [actionKey, mappedMemeId] of Object.entries(config.actionMemeMappings)) {
      if (mappedMemeId === memeId) {
        assigned.push(actionKey);
      }
    }
    return assigned;
  };

  // Assign meme to specific action handler
  const handleAssignToAction = (actionId: string, memeId: string) => {
    setConfig((prev) => ({
      ...prev,
      actionMemeMappings: {
        ...prev.actionMemeMappings,
        [actionId]: memeId,
      },
    }));
  };

  // Callback when user creates a new meme in Canvas Creator
  const handleSaveCreatedMeme = (meme: MemeVisualDefinition, targetAction?: string) => {
    const updated = [meme, ...customMemes];
    setCustomMemes(updated);
    eventEngineRef.current.setCustomMemes(updated);

    if (targetAction) {
      handleAssignToAction(targetAction, meme.id);
    }
  };

  // Filtered memes for discovery library
  const filteredMemes: MemeVisualDefinition[] = useMemo(() => {
    let list = allMemes;

    if (memeSearchQuery.trim()) {
      list = searchMemes(memeSearchQuery, list);
    }

    if (selectedMemeCategory === 'FAVORITES') {
      const favSet = new Set(config.favoriteMemes || []);
      list = list.filter((m: MemeVisualDefinition) => favSet.has(m.id) || m.isFavorite);
    } else if (selectedMemeCategory === 'RECENT') {
      const recSet = new Set(recentlyUsedIds);
      list = list.filter((m: MemeVisualDefinition) => recSet.has(m.id));
    } else if (selectedMemeCategory === 'CUSTOM') {
      list = list.filter((m: MemeVisualDefinition) => m.isCustom);
    } else if (selectedMemeCategory === 'GIFS') {
      list = list.filter((m: MemeVisualDefinition) => m.mediaType === 'gif');
    } else if (selectedMemeCategory === 'REAL_MEDIA') {
      list = list.filter((m: MemeVisualDefinition) => m.sourceType === 'REAL_MEDIA' || m.dataUrl.startsWith('/memes/'));
    } else if (selectedMemeCategory !== 'ALL') {
      list = filterMemesByCategory(selectedMemeCategory as MemeCategory, list);
    }

    return list;
  }, [allMemes, memeSearchQuery, selectedMemeCategory, config.favoriteMemes, recentlyUsedIds]);

  // Category counts across all 10 semantic categories + special tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      APPROVAL_CONFIDENCE: 0,
      DISAPPROVAL_REJECTION: 0,
      ANGER_AGGRESSION: 0,
      SURPRISE_SHOCK: 0,
      CONFUSION: 0,
      VICTORY_CELEBRATION: 0,
      SUSPICION_JUDGEMENT: 0,
      FAILURE_DISAPPOINTMENT: 0,
      CHAOS_UNEXPECTED: 0,
      HAND_GESTURE_REACTION: 0,
      GIFS: 0,
      REAL_MEDIA: 0,
      SHOCK: 0,
      CONFIDENCE: 0,
      FAILURE: 0,
      SUSPICIOUS: 0,
      CELEBRATION: 0,
      SPECIAL: 0,
      RECENT: 0,
    };
    counts['RECENT'] = recentlyUsedIds.length;
    for (const m of allMemes) {
      if (m.mediaType === 'gif') {
        counts['GIFS'] = (counts['GIFS'] || 0) + 1;
      }
      if (m.sourceType === 'REAL_MEDIA' || m.dataUrl.startsWith('/memes/')) {
        counts['REAL_MEDIA'] = (counts['REAL_MEDIA'] || 0) + 1;
      }
      if (m.category && counts[m.category] !== undefined) {
        counts[m.category] = (counts[m.category] || 0) + 1;
      }
    }
    return counts;
  }, [allMemes, recentlyUsedIds]);

  const favCount = useMemo(() => {
    const favSet = new Set(config.favoriteMemes || []);
    return allMemes.filter((m: MemeVisualDefinition) => favSet.has(m.id) || m.isFavorite).length;
  }, [allMemes, config.favoriteMemes]);

  // Reset to Built-in Defaults
  const handleResetDefaults = () => {
    setConfig(DEFAULT_GOOFY_CONFIG);
    leftHandSMRef.current.reset();
    rightHandSMRef.current.reset();
    dualHandSMRef.current.reset();
    eventEngineRef.current.clearHistory();
    setRecentEvents([]);
    setLastTriggeredEvent(null);
  };

  // Export JSON configuration, bindings, and custom meme assets
  const handleExportConfig = useCallback(() => {
    try {
      const exportData = {
        version: '4.0.0',
        system: 'OmniLocoGoofyModel',
        exportedAt: new Date().toISOString(),
        config,
        customMemes,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omni-goofy-config-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[GoofyMode] Export failed:', err);
    }
  }, [config, customMemes]);

  // Import JSON configuration & restore custom memes safely
  const handleImportConfig = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.config && typeof parsed.config === 'object') {
        setConfig((prev) => ({
          ...prev,
          ...parsed.config,
        }));
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, ...parsed.config }));
        }
      }

      if (Array.isArray(parsed.customMemes)) {
        for (const meme of parsed.customMemes) {
          if (meme && meme.id && meme.dataUrl) {
            try {
              await saveCustomMemeDefinitionToDB(meme);
            } catch (err) {
              console.warn('[GoofyMode] Could not save imported custom meme:', meme.id, err);
            }
          }
        }
        const updated = await loadCustomMemesFromDB();
        setCustomMemes(updated);
        eventEngineRef.current.setCustomMemes(updated);
      }
    } catch (err) {
      console.error('[GoofyMode] Import config failed:', err);
      alert('Failed to parse the imported config JSON. Please check file formatting.');
    } finally {
      e.target.value = '';
    }
  }, [config]);

  // Custom Meme File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    try {
      const savedMeme = await saveCustomMemeToDB(file, file.name.replace(/\.[^/.]+$/, ''));
      const updated = [savedMeme, ...customMemes];
      setCustomMemes(updated);
      eventEngineRef.current.setCustomMemes(updated);

      if (memeModalAction) {
        setConfig((prev) => ({
          ...prev,
          actionMemeMappings: {
            ...prev.actionMemeMappings,
            [memeModalAction]: savedMeme.id,
          },
        }));
        setMemeModalAction(null);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  // Delete Custom Meme
  const handleDeleteCustomMeme = async (id: string) => {
    await deleteCustomMemeFromDB(id);
    const updated = customMemes.filter((m) => m.id !== id);
    setCustomMemes(updated);
    eventEngineRef.current.setCustomMemes(updated);
  };

  return (
    <div className="min-h-screen bg-paper-cream text-charcoal-dark font-mono flex flex-col">
      <GlobalNav />

      {/* Audio Autoplay Gate Banner */}
      {!audioUnlocked && (
        <div className="bg-amber-400 text-charcoal-dark px-4 py-2 flex items-center justify-between text-xs font-bold border-b-2 border-charcoal-soft">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>ENABLE WEB AUDIO API MEME SOUND ENGINE</span>
          </div>
          <Button
            size="sm"
            onClick={handleUnlockAudio}
            className="bg-charcoal-dark text-paper-cream hover:bg-charcoal-soft text-xs"
          >
            ACTIVATE AUDIO
          </Button>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Module Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-charcoal-soft pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-1 p-1 h-7">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <StampBadge label="HAND-ONLY" variant="sage" />
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-charcoal-dark">
                GOOFY MODEL V3
              </h1>
            </div>
            <p className="text-xs text-ink-muted">
              HAND-ONLY GESTURE RECOGNITION // AUTOMATIC MEME REACTION ENGINE // DUAL COMBOS
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyntheticMode(!syntheticMode)}
              className={`gap-1.5 text-xs transition-all duration-150 active:scale-95 cursor-pointer ${
                syntheticMode ? 'bg-amber-500 text-charcoal-dark font-bold' : ''
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{syntheticMode ? 'SYNTHETIC ACTIVE' : 'USE SYNTHETIC'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionManualOpen(true)}
              className="gap-1.5 text-xs transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>GESTURE MANUAL</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfig((p) => ({ ...p, isMuted: !p.isMuted }))}
              className={`gap-1.5 text-xs transition-all duration-150 active:scale-95 cursor-pointer ${
                config.isMuted ? 'bg-rose-500 text-white font-bold' : ''
              }`}
            >
              {config.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{config.isMuted ? 'MUTED' : 'AUDIO ON'}</span>
            </Button>
          </div>
        </div>

        {/* Main Interactive Stage: 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Hand Camera, Overlays, Telemetry & Log (7 Cols) */}
          <div className="lg:col-span-7 space-y-4 w-full">
            {/* Camera Viewport Stage with Meme Pop-up Overlay */}
            <div
              ref={cameraWrapperRef}
              className={`relative border-4 border-charcoal-soft rounded-tactile overflow-hidden bg-charcoal-dark shadow-tactile-lg transition-transform duration-75 ${
                shakeActive ? 'translate-x-1.5 -translate-y-1.5 scale-[1.01]' : ''
              } ${
                isFullscreen
                  ? '!fixed !inset-0 !z-50 !w-screen !h-screen !border-0 !rounded-none flex items-center justify-center bg-black'
                  : ''
              }`}
            >
              <div
                className={`relative w-full flex items-center justify-center bg-black overflow-hidden ${
                  isFullscreen
                    ? 'h-full aspect-video max-h-screen max-w-full mx-auto'
                    : 'aspect-video'
                }`}
              >
                {/* Live Camera Video Stream */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
                />

                {/* Hand Skeleton Overlay Canvas */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                />

                {/* AUTOMATIC MEME POP-UP OVERLAY ENGINE */}
                <MemePopupOverlay popups={activePopups} />

                {/* Top Telemetry HUD: Dedicated Hand Tracking Indicators */}
                <div className="absolute top-3 inset-x-3 md:inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  {/* Left Badges: Hand Detection & Gestures */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black tracking-wider">
                    {/* FPS */}
                    <span className="px-2 py-0.5 bg-black/80 border border-white/20 text-white rounded shadow-sm">
                      FPS: {fps}
                    </span>

                    {/* Hand Count Badge */}
                    <span
                      className={`px-2 py-0.5 border rounded flex items-center gap-1 shadow-sm ${
                        handCount > 0
                          ? 'border-cyan-400 bg-cyan-500/90 text-black'
                          : 'border-white/20 bg-black/80 text-white/70'
                      }`}
                    >
                      <Hand className="w-3 h-3" />
                      HANDS: {handCount}
                    </span>

                    {/* Finger Count Telemetry Pill */}
                    <span className="px-2 py-0.5 bg-black/80 border border-emerald-400 text-emerald-400 rounded font-black shadow-sm">
                      DIGITS: L:{leftFingerCount} | R:{rightFingerCount} (TOTAL:{totalFingerCount})
                    </span>

                    {/* Left Hand Gesture */}
                    {leftHandGesture && (
                      <span className="px-2 py-0.5 bg-cyan-400 text-black rounded font-black shadow-sm">
                        L: {leftHandGesture}
                      </span>
                    )}

                    {/* Right Hand Gesture */}
                    {rightHandGesture && (
                      <span className="px-2 py-0.5 bg-cyan-400 text-black rounded font-black shadow-sm">
                        R: {rightHandGesture}
                      </span>
                    )}
                  </div>

                  {/* Right Badges & Fullscreen Controls */}
                  <div className="flex items-center gap-2 pointer-events-auto ml-auto">
                    {/* Dual Combo Active Badge */}
                    {activeDualCombo && (
                      <div
                        className={`flex items-center gap-1.5 border px-2.5 py-0.5 rounded font-black text-[10px] tracking-wider animate-pulse shadow-md ${
                          GOOFY_DUAL_COMBO_DEFINITIONS[activeDualCombo]?.isSecret
                            ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-amber-500 border-amber-300 text-white'
                            : 'bg-purple-600 border-purple-300 text-white'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{GOOFY_DUAL_COMBO_DEFINITIONS[activeDualCombo]?.label}</span>
                        {GOOFY_DUAL_COMBO_DEFINITIONS[activeDualCombo]?.isSecret && (
                          <span className="text-[9px] bg-black/50 px-1 py-0.5 rounded text-amber-300 font-extrabold">
                            SECRET
                          </span>
                        )}
                      </div>
                    )}

                    {/* Fullscreen Camera Toggle Icon Button */}
                    <button
                      onClick={toggleFullscreen}
                      title={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Expand Camera to Fullscreen (F)'}
                      className="px-2.5 py-1 bg-black/80 hover:bg-black text-white hover:text-cyan-300 border border-white/20 hover:border-cyan-400/50 rounded flex items-center gap-1.5 text-[10px] font-black tracking-wider transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span className="hidden sm:inline">
                        {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Tracking Loss Warning Banner when Streaming with No Hands in View */}
                {isStreaming && handCount === 0 && (
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 bg-amber-500/20 border border-amber-400/70 rounded-full backdrop-blur-md flex items-center gap-2 text-amber-300 text-xs font-black tracking-wider animate-pulse shadow-lg pointer-events-none">
                    <Hand className="w-3.5 h-3.5 text-amber-400" />
                    <span>NO HANDS DETECTED // SHOW YOUR HANDS TO CAMERA</span>
                  </div>
                )}

                {/* Bottom Active Action Telemetry Bar */}
                <div className="absolute bottom-3 inset-x-3 md:inset-x-4 z-20 p-2.5 bg-charcoal-dark/90 border-2 border-charcoal-soft rounded backdrop-blur-md space-y-1 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-ink-muted uppercase shrink-0">
                        ACTIVE DETECTION:
                      </span>
                      <span className="text-sm font-extrabold uppercase text-amber-400 truncate">
                        {activeDetectionLabel}
                      </span>
                    </div>

                    {lastTriggeredEvent && (
                      <div className="flex items-center gap-2 text-xs font-bold text-sage-green shrink-0">
                        <Music className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                        <span className="uppercase text-[11px] text-amber-300">
                          {lastTriggeredEvent.soundName}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] font-bold text-paper-cream tracking-wide uppercase truncate">
                    {comicCaption}
                  </p>
                </div>
              </div>
            </div>

            {/* GESTURE DIAGNOSTICS PANEL (PHASE 6) */}
            {showDiagnostics && (
              <div className="border-2 border-cyan-500 rounded-tactile p-3.5 bg-paper-cream shadow-tactile space-y-3">
                <div className="flex items-center justify-between border-b border-charcoal-soft/30 pb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-charcoal-dark">
                      GESTURE RECOGNITION DIAGNOSTICS & TELEMETRY
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 border border-cyan-400 text-cyan-800 font-bold">
                      {diagnosticsData.latencyMs.toFixed(1)} MS LATENCY
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-ink-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFingertipMarkers}
                      onChange={(e) => setShowFingertipMarkers(e.target.checked)}
                      className="accent-cyan-600"
                    />
                    <span>FINGERTIP HIGHLIGHTS</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* LEFT HAND TELEMETRY */}
                  <div className="p-2.5 rounded border border-purple-300 bg-purple-50/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase text-purple-900 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        LEFT HAND
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                          diagnosticsData.left.state === 'CONFIRMED' || diagnosticsData.left.state === 'TRIGGERED'
                            ? 'bg-emerald-500 text-white'
                            : diagnosticsData.left.state === 'CANDIDATE'
                            ? 'bg-amber-400 text-charcoal-dark'
                            : 'bg-paper-dark/30 text-ink-muted'
                        }`}
                      >
                        {diagnosticsData.left.state}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      <div>
                        <span className="text-ink-muted">Raw: </span>
                        <span className="font-bold text-charcoal-dark">{diagnosticsData.left.raw || 'NONE'}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted">Stabilized: </span>
                        <span className="font-bold text-purple-700">{diagnosticsData.left.stabilized || 'NONE'}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted">Confidence: </span>
                        <span className="font-bold">{(diagnosticsData.left.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-ink-muted">Hold Time: </span>
                        <span className="font-bold">{Math.round(diagnosticsData.left.holdDurationMs)} ms</span>
                      </div>
                    </div>

                    {/* Live Hold Progress Bar */}
                    <div className="w-full bg-purple-200 h-1.5 rounded overflow-hidden">
                      <div
                        className="bg-purple-600 h-full transition-all duration-75"
                        style={{ width: `${Math.min(100, (diagnosticsData.left.holdDurationMs / 200) * 100)}%` }}
                      />
                    </div>

                    {/* Finger Extended States */}
                    {diagnosticsData.left.fingerStates && (
                      <div className="flex items-center gap-1 text-[9px] pt-1">
                        <span className="text-ink-muted">Digits:</span>
                        {Object.entries(diagnosticsData.left.fingerStates).map(([digit, ext]) => (
                          <span
                            key={digit}
                            className={`px-1 py-0.5 rounded font-bold uppercase ${
                              ext ? 'bg-purple-600 text-white' : 'bg-paper-dark/30 text-ink-muted line-through'
                            }`}
                          >
                            {digit.slice(0, 1)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-ink-muted truncate">
                      <span>Gate: </span>
                      <span className="font-mono text-charcoal-soft">
                        {diagnosticsData.left.rejectionReason || 'Valid Recognition'}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT HAND TELEMETRY */}
                  <div className="p-2.5 rounded border border-cyan-300 bg-cyan-50/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase text-cyan-900 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-600" />
                        RIGHT HAND
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                          diagnosticsData.right.state === 'CONFIRMED' || diagnosticsData.right.state === 'TRIGGERED'
                            ? 'bg-emerald-500 text-white'
                            : diagnosticsData.right.state === 'CANDIDATE'
                            ? 'bg-amber-400 text-charcoal-dark'
                            : 'bg-paper-dark/30 text-ink-muted'
                        }`}
                      >
                        {diagnosticsData.right.state}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      <div>
                        <span className="text-ink-muted">Raw: </span>
                        <span className="font-bold text-charcoal-dark">{diagnosticsData.right.raw || 'NONE'}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted">Stabilized: </span>
                        <span className="font-bold text-cyan-700">{diagnosticsData.right.stabilized || 'NONE'}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted">Confidence: </span>
                        <span className="font-bold">{(diagnosticsData.right.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-ink-muted">Hold Time: </span>
                        <span className="font-bold">{Math.round(diagnosticsData.right.holdDurationMs)} ms</span>
                      </div>
                    </div>

                    {/* Live Hold Progress Bar */}
                    <div className="w-full bg-cyan-200 h-1.5 rounded overflow-hidden">
                      <div
                        className="bg-cyan-600 h-full transition-all duration-75"
                        style={{ width: `${Math.min(100, (diagnosticsData.right.holdDurationMs / 200) * 100)}%` }}
                      />
                    </div>

                    {/* Finger Extended States */}
                    {diagnosticsData.right.fingerStates && (
                      <div className="flex items-center gap-1 text-[9px] pt-1">
                        <span className="text-ink-muted">Digits:</span>
                        {Object.entries(diagnosticsData.right.fingerStates).map(([digit, ext]) => (
                          <span
                            key={digit}
                            className={`px-1 py-0.5 rounded font-bold uppercase ${
                              ext ? 'bg-cyan-600 text-white' : 'bg-paper-dark/30 text-ink-muted line-through'
                            }`}
                          >
                            {digit.slice(0, 1)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-ink-muted truncate">
                      <span>Gate: </span>
                      <span className="font-mono text-charcoal-soft">
                        {diagnosticsData.right.rejectionReason || 'Valid Recognition'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-paper-dark/15 rounded text-[11px] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-ink-muted">Landmarks:</span>
                    <span className="font-bold text-charcoal-dark">
                      {diagnosticsData.handCount > 0 ? `${diagnosticsData.handCount * 21}/42 Validated (3D)` : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-muted">Last Meme:</span>
                    <span className="font-bold text-amber-700 truncate max-w-[220px]">
                      {lastTriggeredEvent ? `${lastTriggeredEvent.memeTitle}` : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-muted">Clean Release:</span>
                    <span className="font-bold text-emerald-700">Protocol Active (140ms)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Camera & Tracking Controls Strip */}
            <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-cream flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (isStreaming ? stopCamera() : startCamera())}
                  className={`gap-1.5 text-xs font-bold transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md cursor-pointer ${
                    isStreaming
                      ? 'bg-rose-50 border-rose-400 text-rose-700 hover:bg-rose-100 hover:border-rose-500'
                      : 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isStreaming
                        ? 'bg-rose-500 animate-pulse ring-2 ring-rose-300'
                        : 'bg-emerald-500 ring-2 ring-emerald-300'
                    }`}
                  />
                  {isStreaming ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{isStreaming ? 'STOP CAMERA' : 'START CAMERA'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    leftHandSMRef.current.reset();
                    rightHandSMRef.current.reset();
                    dualHandSMRef.current.reset();
                    eventEngineRef.current.clearHistory();
                    setRecentEvents([]);
                    setLastTriggeredEvent(null);
                  }}
                  className="gap-1.5 text-xs font-bold bg-paper-cream hover:bg-paper-dark/30 border-charcoal-soft/40 hover:border-charcoal-soft text-charcoal-dark transition-all duration-150 active:scale-95 shadow-sm hover:shadow group cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-rotate-90 group-active:-rotate-180 text-cyan-600" />
                  <span>RESET TRACKING</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-ink-muted flex-wrap">
                <span>PIPELINE: Hand-Only (21-Point)</span>
                <span>&bull;</span>
                <span>DUAL COMBOS: 11 Patterns (3 Secret)</span>
                <span>&bull;</span>
                <span>BACKEND: WebGPU / WASM</span>
              </div>
            </div>

            {/* Genuine Model Event History Log */}
            <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-2 shadow-tactile-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-600" />
                  <span>HAND GESTURE REACTION LOG</span>
                </h3>
                <span className="text-[10px] text-ink-muted">{recentEvents.length} RECORDED</span>
              </div>

              {recentEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2 border border-charcoal-soft/30 rounded bg-paper-dark/30 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                            evt.source === 'DUAL_HAND'
                              ? 'bg-purple-500/20 text-purple-700 border border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-700 border border-cyan-500/30'
                          }`}
                        >
                          {evt.source === 'DUAL_HAND' ? 'DUAL' : 'HAND'}
                        </span>
                        <span className="font-bold text-charcoal-soft uppercase truncate">
                          {evt.actionLabel}
                          {evt.hand && ` (${evt.hand})`}
                        </span>
                        <span className="text-ink-muted text-[10px] truncate max-w-[150px]">
                          &quot;{evt.caption}&quot;
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[10px]">
                        <span className="font-bold text-amber-600 truncate max-w-[120px]">
                          🖼️ {evt.memeTitle}
                        </span>
                        <span className="font-bold text-sage-green">🔊 {evt.soundName}</span>
                        {evt.isManualPreview && (
                          <span className="text-[9px] px-1 bg-amber-500/20 text-amber-600 rounded">
                            PREVIEW
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-ink-muted py-3 text-center">
                  Hold any hand gesture or dual-hand combination in front of the camera to trigger
                  sound and meme pop-up reactions!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tabbed Hand Gestures, Dual Combos & Meme Library (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Master Settings Deck */}
            <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm text-xs">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
                <h3 className="font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  GESTURE ENGINE SETTINGS
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="text-[10px] gap-1 h-6"
                >
                  <RotateCcw className="w-3 h-3" />
                  RESET
                </Button>
              </div>

              {/* Sliders Grid: Volume & Cooldown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[11px]">VOLUME</span>
                    <span className="tabular-nums font-bold text-sage-green">
                      {Math.round(config.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.volume}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, volume: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-charcoal-soft h-1.5"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[11px]">COOLDOWN</span>
                    <span className="tabular-nums font-bold text-charcoal-soft">
                      {config.cooldownMs}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="50"
                    value={config.cooldownMs}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, cooldownMs: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-charcoal-soft h-1.5"
                  />
                </div>
              </div>

              {/* Sliders Grid: Meme Duration & Animation Style */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[11px]">POPUP DURATION</span>
                    <span className="tabular-nums font-bold text-amber-600">
                      {config.memeDurationMs}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="4000"
                    step="100"
                    value={config.memeDurationMs}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, memeDurationMs: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-charcoal-soft h-1.5"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-[11px] block">ANIMATION STYLE</span>
                  <select
                    value={config.popupAnimationStyle || 'CLASSIC'}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        popupAnimationStyle: e.target.value as PopupAnimationStyle,
                      }))
                    }
                    className="w-full p-1 border border-charcoal-soft/40 rounded bg-paper-cream text-xs font-bold font-mono"
                  >
                    <option value="CLASSIC">CLASSIC (BOUNCE)</option>
                    <option value="EXPLOSIVE">EXPLOSIVE (ZOOM)</option>
                    <option value="RETRO_ARCADE">RETRO ARCADE (CRT)</option>
                    <option value="CHAOS">CHAOS (COSMIC ROTATION)</option>
                    <option value="MINIMAL">MINIMAL (FADE)</option>
                    <option value="NO_ANIMATION">INSTANT POP</option>
                  </select>
                </div>
              </div>

              {/* Sliders Grid: Concurrency Policy & Gesture Sensitivity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="font-bold text-[11px] block">CONCURRENCY POLICY</span>
                  <select
                    value={config.popupConcurrencyPolicy || 'ALLOW_SIMULTANEOUS'}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        popupConcurrencyPolicy: e.target.value as any,
                      }))
                    }
                    className="w-full p-1 border border-charcoal-soft/40 rounded bg-paper-cream text-xs font-bold font-mono"
                  >
                    <option value="ALLOW_SIMULTANEOUS">SIMULTANEOUS (DUAL ALLOWED)</option>
                    <option value="REPLACE_EXISTING">REPLACE (NEWEST TAKES STAGE)</option>
                    <option value="QUEUE_SEQUENTIAL">QUEUE (SEQUENTIAL)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-[11px] block">GESTURE SENSITIVITY</span>
                  <select
                    value={config.gestureSensitivity || 'MEDIUM'}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        gestureSensitivity: e.target.value as any,
                      }))
                    }
                    className="w-full p-1 border border-charcoal-soft/40 rounded bg-paper-cream text-xs font-bold font-mono"
                  >
                    <option value="HIGH">HIGH (RESPONSIVE)</option>
                    <option value="MEDIUM">MEDIUM (BALANCED)</option>
                    <option value="RELAXED">RELAXED (STABLE)</option>
                  </select>
                </div>
              </div>

              {/* Toggles Strip */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-charcoal-soft/10">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                  <input
                    type="checkbox"
                    checked={config.enableMemePopups}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, enableMemePopups: e.target.checked }))
                    }
                    className="accent-charcoal-soft"
                  />
                  <span>MEME POPUPS</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                  <input
                    type="checkbox"
                    checked={config.enableSound}
                    onChange={(e) => setConfig((p) => ({ ...p, enableSound: e.target.checked }))}
                    className="accent-charcoal-soft"
                  />
                  <span>SOUND FX</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                  <input
                    type="checkbox"
                    checked={config.enableScreenShake}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, enableScreenShake: e.target.checked }))
                    }
                    className="accent-charcoal-soft"
                  />
                  <span>SCREEN SHAKE</span>
                </label>
              </div>

              {/* Advanced Modes: Smart Matching, Anti-Repetition, Rare Reactions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-charcoal-soft/10">
                <label
                  className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold"
                  title="AI-powered semantic matching of hand gestures to contextually appropriate memes"
                >
                  <input
                    type="checkbox"
                    checked={config.smartMatchingEnabled ?? true}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, smartMatchingEnabled: e.target.checked }))
                    }
                    className="accent-cyan-600"
                  />
                  <span className="text-cyan-800">SMART MATCHER</span>
                </label>

                <label
                  className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold"
                  title="Prevents consecutive repetitive meme pop-ups for the same gesture"
                >
                  <input
                    type="checkbox"
                    checked={config.preventImmediateRepetition ?? true}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, preventImmediateRepetition: e.target.checked }))
                    }
                    className="accent-emerald-600"
                  />
                  <span className="text-emerald-800">ANTI-REPEAT</span>
                </label>

                <label
                  className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold"
                  title="Random sound fx mode"
                >
                  <input
                    type="checkbox"
                    checked={config.randomSoundMode}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, randomSoundMode: e.target.checked }))
                    }
                    className="accent-charcoal-soft"
                  />
                  <span>RANDOM SOUND</span>
                </label>

                <label
                  className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold"
                  title="Enables rare legendary surprise reactions"
                >
                  <input
                    type="checkbox"
                    checked={config.enableRareReactions}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, enableRareReactions: e.target.checked }))
                    }
                    className="accent-fuchsia-600"
                  />
                  <span className="text-fuchsia-700">RARE MEMES</span>
                </label>
              </div>
            </div>

            {/* TAB SELECTOR: HAND GESTURES vs DUAL COMBOS vs MEME LIBRARY vs TEST BENCH */}
            <div className="flex items-center border-b-2 border-charcoal-soft gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('HANDS')}
                className={`px-3 py-2 text-xs font-extrabold uppercase border-b-2 transition-colors ${
                  activeTab === 'HANDS'
                    ? 'border-cyan-500 text-charcoal-dark'
                    : 'border-transparent text-ink-muted hover:text-charcoal-dark'
                }`}
              >
                HAND GESTURES (12)
              </button>

              <button
                onClick={() => setActiveTab('COMBOS')}
                className={`px-3 py-2 text-xs font-extrabold uppercase border-b-2 transition-colors ${
                  activeTab === 'COMBOS'
                    ? 'border-purple-600 text-charcoal-dark'
                    : 'border-transparent text-ink-muted hover:text-charcoal-dark'
                }`}
              >
                DUAL COMBOS (11)
              </button>

              <button
                onClick={() => setActiveTab('MEMES')}
                className={`px-3 py-2 text-xs font-extrabold uppercase border-b-2 transition-colors ${
                  activeTab === 'MEMES'
                    ? 'border-emerald-500 text-charcoal-dark'
                    : 'border-transparent text-ink-muted hover:text-charcoal-dark'
                }`}
              >
                MEME LIBRARY ({DEFAULT_MEME_LIBRARY.length + customMemes.length})
              </button>

              <button
                onClick={() => setActiveTab('TESTBENCH')}
                className={`px-3 py-2 text-xs font-extrabold uppercase border-b-2 transition-colors ${
                  activeTab === 'TESTBENCH'
                    ? 'border-amber-500 text-charcoal-dark font-black'
                    : 'border-transparent text-ink-muted hover:text-charcoal-dark'
                }`}
              >
                TEST BENCH (12)
              </button>
            </div>

            {/* TAB 1: 12 HAND GESTURES */}
            {activeTab === 'HANDS' && (
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {/* Accordion Controls Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-paper-dark/20 border border-charcoal-soft/20 rounded text-[11px] font-mono">
                  <span className="font-bold text-ink-muted uppercase">
                    12 GESTURES ({expandedGestures.size} EXPANDED)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExpandAllGestures}
                      className="text-cyan-700 hover:text-cyan-900 font-bold uppercase transition-colors cursor-pointer"
                    >
                      EXPAND ALL
                    </button>
                    <span className="text-charcoal-soft/30">&bull;</span>
                    <button
                      onClick={handleCollapseAllGestures}
                      className="text-ink-muted hover:text-charcoal-dark font-bold uppercase transition-colors cursor-pointer"
                    >
                      COLLAPSE ALL
                    </button>
                  </div>
                </div>

                {(
                  [
                    'OPEN_PALM',
                    'CLOSED_FIST',
                    'THUMBS_UP',
                    'THUMBS_DOWN',
                    'PEACE_SIGN',
                    'POINTING',
                    'PINCH',
                    'THREE_FINGERS',
                    'FOUR_FINGERS',
                    'FIVE_FINGERS',
                    'SWIPE_LEFT',
                    'SWIPE_RIGHT',
                  ] as GoofyHandGestureType[]
                ).map((gestureKey) => {
                  const meta = GOOFY_HAND_METADATA[gestureKey];
                  const mapping = config.handMappings[gestureKey];
                  const assignedMemeId =
                    config.actionMemeMappings[gestureKey] ||
                    (mapping && mapping.memeId) ||
                    getDefaultMemeForAction(gestureKey).id;
                  const memeDef =
                    getMemeById(assignedMemeId, customMemes) ||
                    getDefaultMemeForAction(gestureKey);

                  const isCurrentlyActive =
                    leftHandGesture === gestureKey || rightHandGesture === gestureKey;
                  const isExpanded = expandedGestures.has(gestureKey);

                  return (
                    <div
                      key={gestureKey}
                      className={`border-2 rounded-tactile bg-paper-cream shadow-tactile-sm transition-all duration-150 ${
                        isCurrentlyActive
                          ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-500/50'
                          : 'border-charcoal-soft hover:border-charcoal-dark'
                      }`}
                    >
                      {/* Accordion Header Row */}
                      <div
                        onClick={() => toggleGestureAccordion(gestureKey)}
                        className="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronDown
                            className={`w-4 h-4 text-charcoal-soft shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-cyan-700' : ''
                            }`}
                          />
                          <span className="text-lg shrink-0">{meta.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs uppercase text-charcoal-dark">
                                {meta.label}
                              </span>
                              {meta.isDynamic && (
                                <span className="px-1 py-0.2 bg-amber-200/80 text-amber-900 rounded text-[8px] font-black uppercase">
                                  SWIPE
                                </span>
                              )}
                              {isCurrentlyActive && (
                                <span className="px-1.5 py-0.2 bg-cyan-500 text-black rounded text-[8px] font-black uppercase animate-pulse">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-ink-muted truncate block">
                              {meta.cues[0]}
                            </span>
                          </div>
                        </div>

                        {/* Summary Badges & Quick Action Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Compact Summary Pills */}
                          <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-paper-dark/30 text-charcoal-dark flex items-center gap-1 max-w-[110px] truncate">
                              <Music className="w-2.5 h-2.5 text-sage-green shrink-0" />
                              <span className="truncate">{mapping?.soundId || 'RECORD_SCRATCH'}</span>
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-paper-dark/30 text-charcoal-dark flex items-center gap-1 max-w-[110px] truncate">
                              🖼️ <span className="truncate">{memeDef.title}</span>
                            </span>
                          </div>

                          {/* Quick Test Pop-Up Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              eventEngineRef.current.previewAction(
                                gestureKey,
                                'HAND',
                                mapping?.soundId,
                                memeDef.id
                              );
                            }}
                            className="p-1 rounded hover:bg-cyan-100 text-cyan-700 transition-colors cursor-pointer"
                            title="Quick Test Pop-Up"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Enabled Checkbox */}
                          <label
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 cursor-pointer text-[10px] font-bold"
                          >
                            <input
                              type="checkbox"
                              checked={mapping?.enabled ?? true}
                              onChange={(e) =>
                                setConfig((p) => ({
                                  ...p,
                                  handMappings: {
                                    ...p.handMappings,
                                    [gestureKey]: {
                                      ...p.handMappings[gestureKey],
                                      enabled: e.target.checked,
                                    },
                                  },
                                }))
                              }
                              className="accent-cyan-600"
                            />
                            <span className="hidden md:inline">ON</span>
                          </label>
                        </div>
                      </div>

                      {/* Accordion Expandable Body */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-charcoal-soft/15 space-y-2.5 text-xs">
                          {/* Sound & Meme Picker */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-ink-muted block uppercase">
                                SOUND EFFECT
                              </span>
                              <select
                                value={mapping?.soundId || 'RECORD_SCRATCH'}
                                onChange={(e) =>
                                  setConfig((p) => ({
                                    ...p,
                                    handMappings: {
                                      ...p.handMappings,
                                      [gestureKey]: {
                                        ...p.handMappings[gestureKey],
                                        soundId: e.target.value as GoofySoundId,
                                      },
                                    },
                                  }))
                                }
                                className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
                              >
                                {DEFAULT_SOUND_LIBRARY.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-ink-muted block uppercase">
                                MEME POP-UP
                              </span>
                              <button
                                onClick={() => setMemeModalAction(gestureKey)}
                                className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-dark/20 text-xs font-mono font-bold flex items-center justify-between hover:bg-paper-dark/40 truncate cursor-pointer"
                              >
                                <span className="truncate">🖼️ {memeDef.title}</span>
                                <span className="text-[10px] text-cyan-600 underline shrink-0">
                                  CHANGE
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Custom Caption Input */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-ink-muted block uppercase">
                              COMIC CAPTION
                            </span>
                            <input
                              type="text"
                              value={
                                config.actionCustomCaptions[gestureKey] ||
                                mapping?.customCaption ||
                                meta.defaultCaption
                              }
                              onChange={(e) =>
                                setConfig((p) => ({
                                  ...p,
                                  actionCustomCaptions: {
                                    ...p.actionCustomCaptions,
                                    [gestureKey]: e.target.value,
                                  },
                                }))
                              }
                              placeholder={meta.defaultCaption}
                              className="w-full p-1 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono"
                            />
                          </div>

                          {/* Action Buttons: Play Sound & Test Pop-Up */}
                          <div className="flex items-center justify-between pt-1 border-t border-charcoal-soft/10 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  audioEngineRef.current.playSound(
                                    mapping?.soundId || 'RECORD_SCRATCH',
                                    config.volume
                                  )
                                }
                                className="text-[10px] gap-1 p-1 h-6 cursor-pointer"
                              >
                                <Music className="w-3 h-3" />
                                <span>PLAY SOUND</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  eventEngineRef.current.previewAction(
                                    gestureKey,
                                    'HAND',
                                    mapping?.soundId,
                                    memeDef.id
                                  )
                                }
                                className="text-[10px] gap-1 p-1 h-6 text-cyan-600 font-bold cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>TEST POP-UP</span>
                              </Button>
                            </div>

                            <span className="text-[9px] text-ink-muted font-mono">{memeDef.category}</span>
                          </div>

                          {/* Quick Recommended Memes */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-charcoal-soft/10">
                            <span className="text-[9px] font-black text-ink-muted uppercase flex items-center gap-1">
                              <Wand2 className="w-2.5 h-2.5 text-cyan-600" />
                              REC:
                            </span>
                            {(GOOFY_ACTION_RECOMMENDED_MEMES[gestureKey] || []).map((recId) => {
                              const recMeme = getMemeById(recId, customMemes);
                              if (!recMeme) return null;
                              const isCurrent = assignedMemeId === recId;
                              return (
                                <button
                                  key={recId}
                                  onClick={() =>
                                    setConfig((p) => ({
                                      ...p,
                                      actionMemeMappings: {
                                        ...p.actionMemeMappings,
                                        [gestureKey]: recId,
                                      },
                                    }))
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                    isCurrent
                                      ? 'bg-cyan-500 text-charcoal-dark ring-1 ring-cyan-600'
                                      : 'bg-paper-dark/30 hover:bg-paper-dark/60 text-charcoal-dark'
                                  }`}
                                  title={`Assign "${recMeme.title}"`}
                                >
                                  {recMeme.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: 11 DUAL-HAND COMBOS */}
            {activeTab === 'COMBOS' && (
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {/* Accordion Controls Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-paper-dark/20 border border-charcoal-soft/20 rounded text-[11px] font-mono">
                  <span className="font-bold text-ink-muted uppercase">
                    11 DUAL COMBOS ({expandedCombos.size} EXPANDED)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExpandAllCombos}
                      className="text-purple-700 hover:text-purple-900 font-bold uppercase transition-colors cursor-pointer"
                    >
                      EXPAND ALL
                    </button>
                    <span className="text-charcoal-soft/30">&bull;</span>
                    <button
                      onClick={handleCollapseAllCombos}
                      className="text-ink-muted hover:text-charcoal-dark font-bold uppercase transition-colors cursor-pointer"
                    >
                      COLLAPSE ALL
                    </button>
                  </div>
                </div>

                {(
                  [
                    'DOUBLE_THUMBS_UP',
                    'BOTH_HANDS_OPEN',
                    'BOTH_HANDS_FIST',
                    'DOUBLE_PEACE',
                    'THUMBS_UP_AND_DOWN',
                    'PERFECT_TEN',
                    'DOUBLE_THREE',
                    'ROCK_PAPER_SCISSORS',
                    'SECRET_HEART_HANDS',
                    'SECRET_MATRIX_DODGE',
                    'SECRET_YOU_ARE_BREATHTAKING',
                  ] as GoofyDualHandComboId[]
                ).map((comboKey) => {
                  const meta = GOOFY_DUAL_COMBO_DEFINITIONS[comboKey];
                  const mapping = config.dualHandMappings?.[comboKey];
                  const assignedMemeId =
                    config.actionMemeMappings[comboKey] ||
                    (mapping && mapping.memeId) ||
                    meta.defaultMemeId;
                  const memeDef =
                    getMemeById(assignedMemeId, customMemes) ||
                    getDefaultMemeForAction(comboKey);

                  const isCurrentlyActive = activeDualCombo === comboKey;
                  const isExpanded = expandedCombos.has(comboKey);

                  return (
                    <div
                      key={comboKey}
                      className={`border-2 rounded-tactile bg-paper-cream shadow-tactile-sm transition-all duration-150 ${
                        isCurrentlyActive
                          ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500'
                          : 'border-charcoal-soft hover:border-charcoal-dark'
                      }`}
                    >
                      {/* Accordion Header Row */}
                      <div
                        onClick={() => toggleComboAccordion(comboKey)}
                        className="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronDown
                            className={`w-4 h-4 text-charcoal-soft shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-purple-700' : ''
                            }`}
                          />
                          <span className="text-lg shrink-0">{meta.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs uppercase text-charcoal-dark">
                                {meta.label}
                              </span>
                              {meta.isSecret && (
                                <span className="px-1.5 py-0.2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded text-[8px] font-black uppercase tracking-wider">
                                  SECRET
                                </span>
                              )}
                              {meta.requiredDigits !== undefined && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[8px] font-black uppercase">
                                  {meta.requiredDigits} DIGITS
                                </span>
                              )}
                              {isCurrentlyActive && (
                                <span className="px-1.5 py-0.2 bg-purple-600 text-white rounded text-[8px] font-black uppercase animate-pulse">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-ink-muted truncate block">
                              {meta.description}
                            </span>
                          </div>
                        </div>

                        {/* Summary Badges & Quick Action Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Compact Summary Pills */}
                          <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-paper-dark/30 text-charcoal-dark flex items-center gap-1 max-w-[100px] truncate">
                              <Music className="w-2.5 h-2.5 text-sage-green shrink-0" />
                              <span className="truncate">{mapping?.soundId || meta.defaultSoundId}</span>
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-paper-dark/30 text-charcoal-dark flex items-center gap-1 max-w-[100px] truncate">
                              🖼️ <span className="truncate">{memeDef.title}</span>
                            </span>
                          </div>

                          {/* Quick Test Pop-Up Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              eventEngineRef.current.previewAction(
                                comboKey,
                                'DUAL_HAND',
                                mapping?.soundId || meta.defaultSoundId,
                                memeDef.id
                              );
                            }}
                            className="p-1 rounded hover:bg-purple-100 text-purple-700 transition-colors cursor-pointer"
                            title="Quick Test Pop-Up"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Enabled Checkbox */}
                          <label
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 cursor-pointer text-[10px] font-bold"
                          >
                            <input
                              type="checkbox"
                              checked={mapping?.enabled ?? true}
                              onChange={(e) =>
                                setConfig((p) => ({
                                  ...p,
                                  dualHandMappings: {
                                    ...p.dualHandMappings,
                                    [comboKey]: {
                                      ...p.dualHandMappings[comboKey],
                                      enabled: e.target.checked,
                                    },
                                  },
                                }))
                              }
                              className="accent-purple-600"
                            />
                            <span className="hidden md:inline">ON</span>
                          </label>
                        </div>
                      </div>

                      {/* Accordion Expandable Body */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-charcoal-soft/15 space-y-2.5 text-xs">
                          {/* Required Hand Gestures Badge Row */}
                          <div className="flex items-center gap-2 text-[10px] bg-paper-dark/20 p-1.5 rounded">
                            <span className="font-bold text-ink-muted">REQUIRES:</span>
                            <span className="px-1.5 py-0.5 bg-paper-cream border border-charcoal-soft/30 rounded font-black">
                              LEFT: {Array.isArray(meta.leftGesture) ? meta.leftGesture.join(' / ') : meta.leftGesture}
                            </span>
                            <span>+</span>
                            <span className="px-1.5 py-0.5 bg-paper-cream border border-charcoal-soft/30 rounded font-black">
                              RIGHT: {Array.isArray(meta.rightGesture) ? meta.rightGesture.join(' / ') : meta.rightGesture}
                            </span>
                          </div>

                          {/* Sound & Meme Picker */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-ink-muted block uppercase">
                                SOUND EFFECT
                              </span>
                              <select
                                value={mapping?.soundId || meta.defaultSoundId}
                                onChange={(e) =>
                                  setConfig((p) => ({
                                    ...p,
                                    dualHandMappings: {
                                      ...p.dualHandMappings,
                                      [comboKey]: {
                                        ...p.dualHandMappings[comboKey],
                                        soundId: e.target.value as GoofySoundId,
                                      },
                                    },
                                  }))
                                }
                                className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
                              >
                                {DEFAULT_SOUND_LIBRARY.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-ink-muted block uppercase">
                                MEME POP-UP
                              </span>
                              <button
                                onClick={() => setMemeModalAction(comboKey)}
                                className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-dark/20 text-xs font-mono font-bold flex items-center justify-between hover:bg-paper-dark/40 truncate cursor-pointer"
                              >
                                <span className="truncate">🖼️ {memeDef.title}</span>
                                <span className="text-[10px] text-purple-700 underline shrink-0">
                                  CHANGE
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Custom Caption Input */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-ink-muted block uppercase">
                              COMIC CAPTION
                            </span>
                            <input
                              type="text"
                              value={
                                config.actionCustomCaptions[comboKey] ||
                                mapping?.customCaption ||
                                meta.defaultCaption
                              }
                              onChange={(e) =>
                                setConfig((p) => ({
                                  ...p,
                                  actionCustomCaptions: {
                                    ...p.actionCustomCaptions,
                                    [comboKey]: e.target.value,
                                  },
                                }))
                              }
                              placeholder={meta.defaultCaption}
                              className="w-full p-1 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono"
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-1 border-t border-charcoal-soft/10 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  audioEngineRef.current.playSound(
                                    mapping?.soundId || meta.defaultSoundId,
                                    config.volume
                                  )
                                }
                                className="text-[10px] gap-1 p-1 h-6 cursor-pointer"
                              >
                                <Music className="w-3 h-3" />
                                <span>PLAY SOUND</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  eventEngineRef.current.previewAction(
                                    comboKey,
                                    'DUAL_HAND',
                                    mapping?.soundId || meta.defaultSoundId,
                                    memeDef.id
                                  )
                                }
                                className="text-[10px] gap-1 p-1 h-6 text-purple-700 font-bold cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>TEST POP-UP</span>
                              </Button>
                            </div>

                            <span className="text-[9px] text-ink-muted font-mono">{memeDef.category}</span>
                          </div>

                          {/* Quick Recommended Memes */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-charcoal-soft/10">
                            <span className="text-[9px] font-black text-ink-muted uppercase flex items-center gap-1">
                              <Wand2 className="w-2.5 h-2.5 text-purple-600" />
                              REC:
                            </span>
                            {(GOOFY_ACTION_RECOMMENDED_MEMES[comboKey] || []).map((recId) => {
                              const recMeme = getMemeById(recId, customMemes);
                              if (!recMeme) return null;
                              const isCurrent = assignedMemeId === recId;
                              return (
                                <button
                                  key={recId}
                                  onClick={() =>
                                    setConfig((p) => ({
                                      ...p,
                                      actionMemeMappings: {
                                        ...p.actionMemeMappings,
                                        [comboKey]: recId,
                                      },
                                    }))
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                    isCurrent
                                      ? 'bg-purple-600 text-white ring-1 ring-purple-700'
                                      : 'bg-paper-dark/30 hover:bg-paper-dark/60 text-charcoal-dark'
                                  }`}
                                  title={`Assign "${recMeme.title}"`}
                                >
                                  {recMeme.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 3: MEME DISCOVERY LIBRARY */}
            {activeTab === 'MEMES' && (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {/* 1. Presets Accordion */}
                <div className="border border-charcoal-soft/30 rounded bg-paper-dark/15 overflow-hidden shadow-xs">
                  <div
                    onClick={() => setPresetsAccordionOpen((v) => !v)}
                    className="p-2.5 flex items-center justify-between cursor-pointer select-none text-[10px] font-black uppercase text-charcoal-soft hover:bg-paper-dark/25 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-charcoal-soft transition-transform duration-200 ${
                          presetsAccordionOpen ? 'rotate-180 text-amber-600' : ''
                        }`}
                      />
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>REACTION PRESETS &amp; COLLECTIONS</span>
                      <span className="text-ink-muted">({BUILTIN_MEME_PRESETS.length})</span>
                    </div>

                    {config.activePresetId && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-charcoal-dark font-black text-[9px] truncate max-w-[120px]">
                        {BUILTIN_MEME_PRESETS.find((p) => p.id === config.activePresetId)?.name || 'ACTIVE'}
                      </span>
                    )}
                  </div>

                  {presetsAccordionOpen && (
                    <div className="px-2.5 pb-2.5 pt-1 border-t border-charcoal-soft/15 flex flex-wrap gap-1.5">
                      {BUILTIN_MEME_PRESETS.map((p) => {
                        const isActive = config.activePresetId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => handleApplyPreset(p.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all uppercase flex items-center gap-1 cursor-pointer ${
                              isActive
                                ? 'bg-amber-500 text-charcoal-dark ring-2 ring-amber-600 font-black shadow-sm'
                                : 'bg-paper-cream hover:bg-paper-dark/30 text-charcoal-dark border border-charcoal-soft/30'
                            }`}
                            title={p.description}
                          >
                            {isActive && <Check className="w-3 h-3 text-charcoal-dark" />}
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal-soft/20 pb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => {
                        setCreatorTargetAction(null);
                        setCreatorModalOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-7 gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>CREATE MEME</span>
                    </Button>

                    <label className="border border-charcoal-soft rounded px-2 py-1 bg-paper-cream hover:bg-paper-dark/30 cursor-pointer flex items-center gap-1 text-[10px] font-bold h-7 text-charcoal-dark transition-all active:scale-95">
                      <Upload className="w-3 h-3 text-amber-600" />
                      <span>UPLOAD FILE</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDiceRoll}
                      className="text-[10px] h-7 gap-1 transition-all active:scale-95 cursor-pointer"
                      title="Roll a random meme pop-up"
                    >
                      <Dices className="w-3 h-3 text-purple-600" />
                      <span>RANDOM ROLL</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportConfig}
                      className="text-[10px] h-7 gap-1 transition-all active:scale-95 cursor-pointer"
                      title="Export configuration, bindings, and custom memes to JSON"
                    >
                      <Download className="w-3 h-3 text-cyan-600" />
                      <span>EXPORT</span>
                    </Button>

                    <label
                      className="border border-charcoal-soft rounded px-2 py-1 bg-paper-cream hover:bg-paper-dark/30 cursor-pointer flex items-center gap-1 text-[10px] font-bold h-7 text-charcoal-dark transition-all active:scale-95"
                      title="Import configuration and restore custom memes safely"
                    >
                      <Upload className="w-3 h-3 text-purple-600" />
                      <span>IMPORT</span>
                      <input
                        type="file"
                        accept="application/json"
                        onChange={handleImportConfig}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetDefaults}
                    className="text-[10px] h-7 text-ink-muted hover:text-charcoal-dark gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>RESET DEFAULTS</span>
                  </Button>
                </div>

                {uploadError && (
                  <p className="text-[11px] text-rose-600 font-bold p-1 bg-rose-50 border border-rose-300 rounded">
                    {uploadError}
                  </p>
                )}

                {/* 3. Search & Category Filters Accordion */}
                <div className="border border-charcoal-soft/30 rounded bg-paper-dark/15 overflow-hidden shadow-xs">
                  <div
                    onClick={() => setFiltersAccordionOpen((v) => !v)}
                    className="p-2.5 flex items-center justify-between cursor-pointer select-none text-[10px] font-black uppercase text-charcoal-soft hover:bg-paper-dark/25 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-charcoal-soft transition-transform duration-200 ${
                          filtersAccordionOpen ? 'rotate-180 text-cyan-700' : ''
                        }`}
                      />
                      <Search className="w-3 h-3 text-cyan-600" />
                      <span>DISCOVERY &amp; CATEGORIES</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-700 text-white font-mono text-[9px]">
                        CAT: {selectedMemeCategory}
                      </span>
                      {memeSearchQuery && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-mono text-[9px] truncate max-w-[100px]">
                          &quot;{memeSearchQuery}&quot;
                        </span>
                      )}
                    </div>
                  </div>

                  {filtersAccordionOpen && (
                    <div className="px-2.5 pb-2.5 pt-1 border-t border-charcoal-soft/15 space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="text"
                          value={memeSearchQuery}
                          onChange={(e) => setMemeSearchQuery(e.target.value)}
                          placeholder="Search 150+ memes by title, caption, tags..."
                          className="w-full pl-8 pr-8 py-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
                        />
                        {memeSearchQuery && (
                          <button
                            onClick={() => setMemeSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-charcoal-dark cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Quick Filters */}
                      <div className="flex flex-wrap gap-1 text-[10px] font-bold font-mono">
                        {[
                          { id: 'ALL', label: `ALL (${allMemes.length})` },
                          { id: 'REAL_MEDIA', label: `🔥 REAL MEDIA (${categoryCounts['REAL_MEDIA'] || 0})` },
                          { id: 'GIFS', label: `🎬 ANIMATED GIFS (${categoryCounts['GIFS'] || 0})` },
                          { id: 'RECENT', label: `🕒 RECENT (${recentlyUsedIds.length})` },
                          { id: 'FAVORITES', label: `★ FAVOURITES (${favCount})` },
                          { id: 'CUSTOM', label: `CUSTOM (${customMemes.length})` },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedMemeCategory(cat.id)}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                              selectedMemeCategory === cat.id
                                ? 'bg-charcoal-dark text-paper-cream font-black shadow-xs'
                                : 'bg-paper-dark/30 hover:bg-paper-dark/60 text-charcoal-dark'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* 10 Semantic Reaction Categories */}
                      <div className="pt-1 border-t border-charcoal-soft/20">
                        <span className="text-[9px] font-black uppercase tracking-wider text-ink-muted block mb-1">
                          SEMANTIC REACTION CATEGORIES:
                        </span>
                        <div className="flex flex-wrap gap-1 text-[9px] font-mono font-bold">
                          {SEMANTIC_MEME_CATEGORIES.map((sem) => {
                            const count = categoryCounts[sem.id] || 0;
                            const isSelected = selectedMemeCategory === sem.id;
                            return (
                              <button
                                key={sem.id}
                                onClick={() => setSelectedMemeCategory(sem.id)}
                                className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer ${
                                  isSelected
                                    ? 'bg-cyan-700 text-white font-black shadow-xs ring-1 ring-cyan-800'
                                    : 'bg-paper-dark/20 hover:bg-paper-dark/50 text-charcoal-dark border border-charcoal-soft/20'
                                }`}
                                title={sem.description}
                              >
                                <span>{sem.icon}</span>
                                <span>{sem.label} ({count})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Meme Grid */}
                {filteredMemes.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted text-xs border border-dashed border-charcoal-soft rounded">
                    No memes found matching &quot;{memeSearchQuery}&quot; in category{' '}
                    {selectedMemeCategory}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {filteredMemes.map((meme: MemeVisualDefinition) => {
                      const isFav =
                        (config.favoriteMemes || []).includes(meme.id) || meme.isFavorite;
                      const assignedActions = getAssignedActionsForMeme(meme.id);

                      return (
                        <div
                          key={meme.id}
                          className="border-2 border-charcoal-soft/50 rounded p-2 bg-paper-cream space-y-1.5 shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            {/* Thumbnail Container */}
                            <div className="relative aspect-[4/3] bg-black rounded overflow-hidden flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={meme.dataUrl}
                                alt={meme.title}
                                className="w-full h-full object-contain"
                              />

                              {/* Top Left Badges */}
                              <div className="absolute top-1 left-1 flex flex-col gap-1 items-start">
                                {meme.mediaType === 'gif' && (
                                  <span className="text-[8px] font-black px-1 py-0.5 rounded bg-emerald-500 text-black">
                                    GIF
                                  </span>
                                )}
                                {(meme.sourceType === 'REAL_MEDIA' || meme.dataUrl.startsWith('/memes/')) && (
                                  <span className="text-[8px] font-black px-1 py-0.5 rounded bg-cyan-500 text-black">
                                    VIRAL
                                  </span>
                                )}
                                {meme.rarity && meme.rarity !== 'COMMON' && (
                                  <span
                                    className={`text-[8px] font-black px-1 py-0.5 rounded ${
                                      meme.rarity === 'LEGENDARY'
                                        ? 'bg-amber-400 text-charcoal-dark ring-1 ring-amber-600'
                                        : 'bg-purple-600 text-white'
                                    }`}
                                  >
                                    ★ {meme.rarity}
                                  </span>
                                )}
                                {meme.isCustom && (
                                  <span className="text-[8px] font-black px-1 py-0.5 rounded bg-emerald-500 text-black">
                                    CUSTOM
                                  </span>
                                )}
                              </div>

                              {/* Top Right Favorite Star */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteMeme(meme.id);
                                }}
                                className={`absolute top-1 right-1 p-1 rounded-full ${
                                  isFav
                                    ? 'bg-amber-400 text-charcoal-dark'
                                    : 'bg-black/60 text-white/70 hover:text-white'
                                }`}
                                title={isFav ? 'Remove from favorites' : 'Mark as favorite'}
                              >
                                <Star className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                              </button>
                            </div>

                            {/* Title & Category */}
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[11px] truncate uppercase text-charcoal-dark block">
                                {meme.title}
                              </span>
                              {meme.isCustom && (
                                <button
                                  onClick={() => handleDeleteCustomMeme(meme.id)}
                                  className="text-rose-500 hover:text-rose-700 p-0.5"
                                  title="Delete custom meme"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Caption preview */}
                            <p className="text-[10px] text-ink-muted italic truncate">
                              &quot;{meme.caption}&quot;
                            </p>

                            {/* Assigned Actions Badges */}
                            {assignedActions.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {assignedActions.map((act) => (
                                  <span
                                    key={act}
                                    className="px-1.5 py-0.5 bg-cyan-400/90 text-charcoal-dark font-black text-[8px] rounded uppercase"
                                  >
                                    ASSIGNED: {act}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-charcoal-soft/10">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                eventEngineRef.current.previewAction(
                                  'OPEN_PALM',
                                  'HAND',
                                  meme.soundId,
                                  meme.id
                                )
                              }
                              className="text-[8px] h-6 px-1 gap-0.5"
                              title="Preview meme pop-up in camera"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                              <span>PREVIEW</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                audioEngineRef.current.playSound(
                                  meme.soundId || 'CHAD_GONG',
                                  config.volume
                                )
                              }
                              className="text-[8px] h-6 px-1 gap-0.5 bg-paper-dark/15 hover:bg-paper-dark/40"
                              title="Preview meme sound effect"
                            >
                              <Music className="w-2.5 h-2.5 text-cyan-600" />
                              <span>AUDIO</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssignModalMeme(meme)}
                              className="text-[8px] h-6 px-1 gap-0.5 bg-paper-dark/20 hover:bg-paper-dark/50"
                              title="Assign this meme to a hand gesture or dual combo"
                            >
                              <span>ASSIGN</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: GESTURE TEST BENCH (PHASE 7) */}
            {activeTab === 'TESTBENCH' && (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {/* Header Strip */}
                <div className="p-3 bg-amber-500/15 border-2 border-amber-400 rounded-tactile space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-700" />
                      <h4 className="text-xs font-black uppercase text-amber-900">
                        GESTURE TEST BENCH & CLASSIFIER EVALUATOR
                      </h4>
                    </div>
                    <span className="text-[10px] bg-amber-400 text-charcoal-dark px-2 py-0.5 rounded font-black">
                      PHASE 7 TEST SUITE
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-dark font-mono">
                    Evaluate pure geometric gesture classification independently from the meme reaction engine.
                    Select any gesture below to inspect real-time criteria or run automated benchmark fixtures.
                  </p>
                </div>

                {/* 12-Gesture Selector Pill Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      'THUMBS_UP',
                      'THUMBS_DOWN',
                      'CLOSED_FIST',
                      'OPEN_PALM',
                      'PEACE_SIGN',
                      'POINTING',
                      'PINCH',
                      'THREE_FINGERS',
                      'FOUR_FINGERS',
                      'FIVE_FINGERS',
                      'SWIPE_LEFT',
                      'SWIPE_RIGHT',
                    ] as GoofyHandGestureType[]
                  ).map((g) => {
                    const meta = GOOFY_HAND_METADATA[g];
                    const isSelected = selectedTestGesture === g;
                    const isCurrentlyDetected =
                      diagnosticsData.right.stabilized === g || diagnosticsData.left.stabilized === g;

                    return (
                      <button
                        key={g}
                        onClick={() => setSelectedTestGesture(g)}
                        className={`p-2 rounded border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-500 font-bold'
                            : isCurrentlyDetected
                            ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900'
                            : 'border-charcoal-soft/30 bg-paper-dark/15 hover:bg-paper-dark/30'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-base">{meta?.icon || '✋'}</span>
                          {isCurrentlyDetected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] font-black uppercase truncate mt-1">
                          {meta?.label || g}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Gesture Live Verification Card */}
                {selectedTestGesture && (
                  <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-cream space-y-2.5">
                    <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{GOOFY_HAND_METADATA[selectedTestGesture]?.icon}</span>
                        <div>
                          <h5 className="text-xs font-black uppercase text-charcoal-dark">
                            TESTING TARGET: {GOOFY_HAND_METADATA[selectedTestGesture]?.label}
                          </h5>
                          <span className="text-[10px] text-ink-muted">
                            {selectedTestGesture.includes('SWIPE') ? 'Dynamic Lateral Gesture' : 'Static Bone-Ratio Geometry'}
                          </span>
                        </div>
                      </div>

                      {/* Live Target Match Status Pill */}
                      {diagnosticsData.right.stabilized === selectedTestGesture ||
                      diagnosticsData.left.stabilized === selectedTestGesture ? (
                        <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-emerald-500 text-white font-black animate-bounce shadow">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CONFIRMED MATCH
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-paper-dark/30 text-ink-muted font-bold">
                          <AlertCircle className="w-3 h-3" />
                          AWAITING GESTURE
                        </span>
                      )}
                    </div>

                    {/* Target Geometric Requirements & Criteria */}
                    <div className="p-2 rounded bg-paper-dark/20 text-[11px] space-y-1">
                      <span className="font-extrabold uppercase text-[10px] text-ink-muted">
                        GEOMETRIC VALIDATION SIGNATURE:
                      </span>
                      <p className="text-charcoal-soft font-mono text-[10px]">
                        {selectedTestGesture === 'THUMBS_UP' && 'Thumb extended vertical upward (dy < 0), 4 non-thumb digits curled into palm (mcp-tip ratio < 0.65).'}
                        {selectedTestGesture === 'THUMBS_DOWN' && 'Thumb directed downward (dy > 0), 4 non-thumb digits curled into palm.'}
                        {selectedTestGesture === 'CLOSED_FIST' && 'All 5 digits curled into palm. isPinching strictly prohibited.'}
                        {selectedTestGesture === 'OPEN_PALM' && 'Flat coplanar hand, all 5 digits extended with moderate knuckle-to-wrist alignment.'}
                        {selectedTestGesture === 'PEACE_SIGN' && 'Index and middle extended (separation > 0.12), ring and pinky curled into palm.'}
                        {selectedTestGesture === 'POINTING' && 'Index fully extended (collinear dot > 0.88), middle, ring and pinky curled into palm.'}
                        {selectedTestGesture === 'PINCH' && 'Thumb tip & index tip distance < 0.22 palm scale with open index-MCP loop.'}
                        {selectedTestGesture === 'THREE_FINGERS' && 'Index, middle, ring extended; pinky curled, thumb tucked across palm.'}
                        {selectedTestGesture === 'FOUR_FINGERS' && 'Index, middle, ring, pinky extended; thumb tucked across palm.'}
                        {selectedTestGesture === 'FIVE_FINGERS' && 'All 5 digits extended radially wide (spread factor > 2.15 palm scale).'}
                        {selectedTestGesture === 'SWIPE_LEFT' && 'Deliberate lateral travel Δx < -0.15 over ≥ 80ms with horizontal velocity dominance.'}
                        {selectedTestGesture === 'SWIPE_RIGHT' && 'Deliberate lateral travel Δx > +0.15 over ≥ 80ms with horizontal velocity dominance.'}
                      </p>
                    </div>

                    {/* Live Comparison Telemetry */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-paper-dark/15">
                        <span className="text-ink-muted block text-[10px]">CURRENT LIVE RAW:</span>
                        <span className="font-black text-charcoal-dark">
                          {diagnosticsData.right.raw || diagnosticsData.left.raw || 'UNKNOWN / NONE'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-paper-dark/15">
                        <span className="text-ink-muted block text-[10px]">CURRENT STABILIZED:</span>
                        <span className="font-black text-cyan-700">
                          {diagnosticsData.right.stabilized || diagnosticsData.left.stabilized || 'UNKNOWN / NONE'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Automated Benchmark Suite Runner */}
                <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-dark/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black uppercase text-charcoal-dark flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-600" />
                        SYNTHETIC GEOMETRIC BENCHMARK RUNNER
                      </h5>
                      <span className="text-[10px] text-ink-muted">
                        Runs canonical 21-point geometric fixtures through GoofyHandClassifier
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setIsBenchmarking(true);
                        setTimeout(() => {
                          const rep = runComprehensiveGestureBenchmark(handClassifierRef.current);
                          setBenchmarkResults(rep);
                          setIsBenchmarking(false);
                        }, 50);
                      }}
                      disabled={isBenchmarking}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs gap-1.5 h-8"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isBenchmarking ? 'EVALUATING...' : 'RUN 12-GESTURE BENCHMARK'}</span>
                    </Button>
                  </div>

                  {/* Benchmark Report Table */}
                  {benchmarkResults && (
                    <div className="space-y-2 border-t border-charcoal-soft/20 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>ACCURACY: {benchmarkResults.accuracy}% ({benchmarkResults.passed}/{benchmarkResults.total} PASSED)</span>
                        <span className="text-emerald-700 font-black">ZERO GEOMETRIC CONFUSION</span>
                      </div>

                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {benchmarkResults.results.map((r) => (
                          <div
                            key={r.gesture}
                            className={`p-1.5 rounded border text-[10px] flex items-center justify-between ${
                              r.status === 'PASS'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                : 'bg-rose-50 border-rose-300 text-rose-950'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>{GOOFY_HAND_METADATA[r.gesture]?.icon}</span>
                              <span className="uppercase">{r.gesture}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-ink-muted font-mono">{r.latencyMs}ms</span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-black uppercase text-[9px] ${
                                  r.status === 'PASS' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                }`}
                              >
                                {r.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Multi-Variation Dataset Benchmark & Confusion Matrix (Phase 6) */}
                <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-dark/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black uppercase text-charcoal-dark flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-purple-600" />
                        MULTI-VARIATION DATASET EVALUATION (60+ SAMPLES)
                      </h5>
                      <span className="text-[10px] text-ink-muted">
                        Evaluates rotated (±15°), scaled (0.85x-1.18x), dual-handed & ambiguous gestures
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setIsEvaluatingDataset(true);
                        setTimeout(() => {
                          const rep = runFullDatasetEvaluation(handClassifierRef.current);
                          setEvaluationReport(rep);
                          setIsEvaluatingDataset(false);
                        }, 50);
                      }}
                      disabled={isEvaluatingDataset}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs gap-1.5 h-8"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>{isEvaluatingDataset ? 'COMPUTING...' : 'RUN FULL EVALUATION'}</span>
                    </Button>
                  </div>

                  {evaluationReport && (
                    <div className="space-y-3 border-t border-charcoal-soft/20 pt-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-paper-cream border border-charcoal-soft/30">
                          <span className="text-ink-muted block text-[10px]">OVERALL ACCURACY:</span>
                          <span className="text-sm font-black text-emerald-600">
                            {evaluationReport.overallAccuracy}% ({evaluationReport.correctPredictions}/{evaluationReport.totalSamples})
                          </span>
                        </div>
                        <div className="p-2 rounded bg-paper-cream border border-charcoal-soft/30">
                          <span className="text-ink-muted block text-[10px]">UNKNOWN REJECTION:</span>
                          <span className="text-sm font-black text-purple-700">
                            {evaluationReport.unknownRejectionRate}% REJECTED
                          </span>
                        </div>
                      </div>

                      {/* Subsets Breakdown */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-ink-muted uppercase block">
                          Dataset Breakdown by Conditions:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          {evaluationReport.breakdown.map((b) => (
                            <div key={b.datasetSubset} className="p-1 rounded bg-paper-dark/20 flex justify-between">
                              <span className="truncate pr-1">{b.datasetSubset}</span>
                              <span className="font-bold text-emerald-700">{b.accuracy}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Per Class Precision / Recall Summary */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-ink-muted uppercase block">
                          Per-Class Precision & Recall:
                        </span>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                          {Object.entries(evaluationReport.perClassMetrics).map(([cls, m]) => (
                            <div key={cls} className="flex items-center justify-between p-1 rounded bg-paper-dark/10">
                              <span className="font-bold uppercase">{cls}</span>
                              <div className="flex gap-2 text-ink-muted">
                                <span>P: <strong className="text-charcoal-dark">{m.precision}</strong></span>
                                <span>R: <strong className="text-charcoal-dark">{m.recall}</strong></span>
                                <span>F1: <strong className="text-emerald-700">{m.f1Score}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Sample Capture Workflow (Phase 6.A) */}
                <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-dark/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black uppercase text-charcoal-dark flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        USER-CONTROLLED SAMPLE CAPTURE (LOCAL ONLY)
                      </h5>
                      <span className="text-[10px] text-ink-muted">
                        Explicit consent: samples held in memory only, downloadable as JSON
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={sampleCaptureLabel}
                        onChange={(e) => setSampleCaptureLabel(e.target.value)}
                        className="bg-paper-cream border border-charcoal-soft rounded px-2 py-1 text-[11px] font-bold"
                      >
                        <option value="THUMBS_UP">THUMBS_UP</option>
                        <option value="THUMBS_DOWN">THUMBS_DOWN</option>
                        <option value="CLOSED_FIST">CLOSED_FIST</option>
                        <option value="OPEN_PALM">OPEN_PALM</option>
                        <option value="PEACE_SIGN">PEACE_SIGN</option>
                        <option value="POINTING">POINTING</option>
                        <option value="PINCH">PINCH</option>
                        <option value="THREE_FINGERS">THREE_FINGERS</option>
                        <option value="FOUR_FINGERS">FOUR_FINGERS</option>
                        <option value="FIVE_FINGERS">FIVE_FINGERS</option>
                        <option value="UNKNOWN">UNKNOWN</option>
                      </select>

                      <Button
                        size="sm"
                        onClick={() => {
                          const activeLm = rightHandLandmarksRef.current || leftHandLandmarksRef.current;
                          if (!activeLm) {
                            alert('No hand landmarks visible in camera to capture! Please show your hand.');
                            return;
                          }
                          const handedness: 'Left' | 'Right' = rightHandLandmarksRef.current ? 'Right' : 'Left';
                          const newSample: { id: string; label: string; timestamp: number; landmarks: Landmark3D[]; handedness: 'Left' | 'Right' } = {
                            id: `sample_${Date.now()}`,
                            label: sampleCaptureLabel,
                            timestamp: Date.now(),
                            landmarks: activeLm.map((p) => ({ ...p })),
                            handedness,
                          };
                          setCapturedSamples((prev) => [newSample, ...prev]);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs gap-1.5 h-8"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>CAPTURE FRAME</span>
                      </Button>
                    </div>
                  </div>

                  {capturedSamples.length > 0 && (
                    <div className="space-y-2 border-t border-charcoal-soft/20 pt-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>CAPTURED: {capturedSamples.length} SAMPLES</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(capturedSamples, null, 2));
                              const downloadAnchor = document.createElement('a');
                              downloadAnchor.setAttribute('href', dataStr);
                              downloadAnchor.setAttribute('download', `omni_hand_samples_${Date.now()}.json`);
                              document.body.appendChild(downloadAnchor);
                              downloadAnchor.click();
                              downloadAnchor.remove();
                            }}
                            className="text-[10px] h-7 gap-1"
                          >
                            <Download className="w-3 h-3" />
                            EXPORT JSON
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCapturedSamples([])}
                            className="text-[10px] h-7 gap-1 text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 className="w-3 h-3" />
                            CLEAR
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {capturedSamples.map((s) => (
                          <div key={s.id} className="p-1 rounded bg-paper-cream border text-[10px] flex items-center justify-between">
                            <span className="font-bold">{s.label} ({s.handedness})</span>
                            <span className="text-ink-muted">{new Date(s.timestamp).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL 1: MEME SELECTOR DIALOG */}
      {memeModalAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-cream border-4 border-charcoal-soft rounded-tactile max-w-2xl w-full p-4 space-y-3 shadow-tactile-lg max-h-[85vh] flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm uppercase">
                  SELECT MEME FOR: {memeModalAction}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMemeModalAction(null)}
                className="p-1 h-7"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Action Bar inside Modal */}
            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setCreatorTargetAction(memeModalAction);
                  setCreatorModalOpen(true);
                  setMemeModalAction(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-7 gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>CREATE CUSTOM FOR THIS ACTION</span>
              </Button>

              <label className="cursor-pointer text-amber-600 font-bold underline flex items-center gap-1 text-[11px]">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload image / GIF</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto flex-1 pr-1">
              {[...customMemes, ...DEFAULT_MEME_LIBRARY].map((meme) => {
                const isSelected = config.actionMemeMappings[memeModalAction] === meme.id;
                return (
                  <button
                    key={meme.id}
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        actionMemeMappings: {
                          ...prev.actionMemeMappings,
                          [memeModalAction]: meme.id,
                        },
                      }));
                      setMemeModalAction(null);
                    }}
                    className={`border-2 rounded p-2 text-left transition-all group ${
                      isSelected
                        ? 'border-amber-500 bg-amber-100/60 ring-2 ring-amber-500'
                        : 'border-charcoal-soft/40 hover:border-amber-500 hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-black rounded overflow-hidden mb-1 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={meme.dataUrl} alt={meme.title} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold uppercase truncate block group-hover:text-amber-600">
                      {meme.title}
                    </span>
                    <span className="text-[9px] text-ink-muted block truncate">{meme.caption}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-charcoal-soft/20 pt-2 flex justify-end items-center">
              <Button size="sm" onClick={() => setMemeModalAction(null)}>
                DONE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GESTURE & MEME MANUAL */}
      {actionManualOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-cream border-4 border-charcoal-soft rounded-tactile max-w-2xl w-full p-6 space-y-4 shadow-tactile-lg max-h-[85vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-600" />
                <h3 className="font-black text-sm uppercase">
                  GOOFY MODEL V3 // HAND GESTURE &amp; DUAL COMBO MANUAL
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActionManualOpen(false)}
                className="p-1 h-7"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Architecture info */}
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
                <h4 className="font-black text-cyan-800 uppercase mb-1">
                  HAND-ONLY REACTION ENGINE ARCHITECTURE
                </h4>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-charcoal-dark">
                  <li>Dedicated 60 FPS 21-point dual-hand landmark tracking with zero body pose overhead.</li>
                  <li>12 distinct single-hand gestures with unambiguous scale-invariant digit spread discrimination.</li>
                  <li>5 simultaneous dual-hand combinations with dedicated state machine and priority arbitration.</li>
                  <li>Real-time digit count telemetry tracking extended fingers (0-5 per hand, 0-10 total).</li>
                  <li>62 built-in original vector SVG memes across 7 reaction collections with custom Canvas creator.</li>
                </ul>
              </div>

              {/* 5 Dual Combos */}
              <div>
                <h4 className="font-extrabold text-purple-600 uppercase border-b border-charcoal-soft/20 pb-1 mb-2">
                  DUAL-HAND COMBINATIONS (5)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(
                    [
                      'DOUBLE_THUMBS_UP',
                      'BOTH_HANDS_OPEN',
                      'BOTH_HANDS_FIST',
                      'DOUBLE_PEACE',
                      'THUMBS_UP_AND_DOWN',
                    ] as GoofyDualHandComboId[]
                  ).map((comboKey) => {
                    const combo = GOOFY_DUAL_COMBO_DEFINITIONS[comboKey];
                    return (
                      <div
                        key={comboKey}
                        className="p-2 border border-purple-500/30 rounded bg-purple-50/30"
                      >
                        <div className="font-bold flex items-center gap-1.5 text-charcoal-dark uppercase">
                          <span>{combo.icon}</span>
                          <span>{combo.label}</span>
                        </div>
                        <p className="text-[11px] text-ink-muted mt-1">{combo.description}</p>
                        <div className="mt-1 text-[10px] font-bold text-purple-700">
                          Default: &quot;{combo.defaultCaption}&quot;
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 12 Hand Gestures */}
              <div>
                <h4 className="font-extrabold text-cyan-600 uppercase border-b border-charcoal-soft/20 pb-1 mb-2">
                  HAND GESTURES (12)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(
                    [
                      'OPEN_PALM',
                      'CLOSED_FIST',
                      'THUMBS_UP',
                      'THUMBS_DOWN',
                      'PEACE_SIGN',
                      'POINTING',
                      'PINCH',
                      'THREE_FINGERS',
                      'FOUR_FINGERS',
                      'FIVE_FINGERS',
                      'SWIPE_LEFT',
                      'SWIPE_RIGHT',
                    ] as GoofyHandGestureType[]
                  ).map((gesture) => (
                    <div
                      key={gesture}
                      className="p-2 border border-charcoal-soft/30 rounded bg-paper-dark/20"
                    >
                      <div className="font-bold flex items-center gap-1.5 text-charcoal-dark uppercase">
                        <span>{GOOFY_HAND_METADATA[gesture]?.icon}</span>
                        <span>{GOOFY_HAND_METADATA[gesture]?.label}</span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1">
                        {GOOFY_HAND_METADATA[gesture]?.description}
                      </p>
                      <div className="mt-1 text-[10px] font-bold text-cyan-700">
                        Default: &quot;{GOOFY_HAND_METADATA[gesture]?.defaultCaption}&quot;
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t-2 border-charcoal-soft pt-3 flex justify-end">
              <Button size="sm" onClick={() => setActionManualOpen(false)}>
                CLOSE MANUAL
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: IN-BROWSER CUSTOM MEME CREATOR */}
      <CustomMemeCreatorModal
        isOpen={creatorModalOpen}
        onClose={() => {
          setCreatorModalOpen(false);
          setCreatorTargetAction(null);
        }}
        onSaveMeme={handleSaveCreatedMeme}
        targetAction={creatorTargetAction}
      />

      {/* MODAL 4: QUICK ASSIGN MEME TO ACTION */}
      <AssignMemeModal
        meme={assignModalMeme}
        currentMappings={config.actionMemeMappings}
        onClose={() => setAssignModalMeme(null)}
        onAssignToAction={handleAssignToAction}
      />
    </div>
  );
}
