'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { MediaPipeTaskRunner } from '@/core/mediapipe/task-runner';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { generateSyntheticPose } from '@/modules/pose/synthetic-pose';
import { renderPoseOverlay } from '@/modules/pose/overlay-renderer';
import { renderHandOverlay } from '@/modules/hand/overlay-renderer';
import { generateSyntheticHand } from '@/modules/hand/synthetic-hand';
import { PoseKinematics } from '@/modules/pose/kinematics';
import { PoseLandmark } from '@/modules/pose/types';
import { Landmark3D } from '@/modules/hand/types';
import {
  GoofyPoseType,
  GoofyHandGestureType,
  GoofySoundId,
  GoofyModeConfig,
  ActiveMemePopup,
  UnifiedMemeEvent,
  PoseClassificationResult,
  MemeVisualDefinition,
  DEFAULT_GOOFY_CONFIG,
  DEFAULT_SOUND_LIBRARY,
  GOOFY_POSE_METADATA,
  GOOFY_HAND_METADATA,
} from '@/modules/pose/goofy-types';
import { GoofyPoseClassifier } from '@/modules/pose/goofy-pose-classifier';
import { GoofyPoseStateMachine } from '@/modules/pose/goofy-state-machine';
import {
  GoofyHandClassifier,
  GoofyHandStateMachine,
} from '@/modules/pose/goofy-hand-classifier';
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
  Play,
  RotateCcw,
  Upload,
  Activity,
  Smile,
  Zap,
  Music,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Settings2,
  Shuffle,
  BookOpen,
  X,
  Camera,
  CameraOff,
  Image as ImageIcon,
  Hand,
  User,
  Trash2,
  Layers,
  HelpCircle,
  Star,
  Search,
  Dices,
  Plus,
  Wand2,
  Check,
  Filter,
} from 'lucide-react';
import {
  PopupAnimationStyle,
  MemePresetId,
  MemeCategory,
  BUILTIN_MEME_PRESETS,
  GOOFY_ACTION_RECOMMENDED_MEMES,
} from '@/modules/pose/goofy-types';

const STORAGE_KEY = 'omni-goofy-config-v3-full';

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
            mappings: { ...DEFAULT_GOOFY_CONFIG.mappings, ...(parsed.mappings || {}) },
            handMappings: { ...DEFAULT_GOOFY_CONFIG.handMappings, ...(parsed.handMappings || {}) },
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

  const [activeTab, setActiveTab] = useState<'BODY' | 'HANDS' | 'MEMES'>('BODY');
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [fps, setFps] = useState(0);

  // Body Tracking Telemetry
  const [activePose, setActivePose] = useState<GoofyPoseType | null>(null);
  const [poseLabel, setPoseLabel] = useState<string>('NEUTRAL STANCE');
  const [comicCaption, setComicCaption] = useState<string>('STRIKE A HEROIC POSE OR SHOW A HAND GESTURE!');
  const [bodyTrackingStatus, setBodyTrackingStatus] = useState<string>('NO_POSE');
  const [bodyVisibilityState, setBodyVisibilityState] = useState<'FULL_BODY' | 'UPPER_BODY_ONLY' | 'PARTIAL' | 'NO_BODY'>('NO_BODY');
  const [visibilityWarning, setVisibilityWarning] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [isDynamicActionActive, setIsDynamicActionActive] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);

  // Hand Tracking Telemetry
  const [handCount, setHandCount] = useState<number>(0);
  const [leftHandGesture, setLeftHandGesture] = useState<GoofyHandGestureType | null>(null);
  const [rightHandGesture, setRightHandGesture] = useState<GoofyHandGestureType | null>(null);

  // Pop-up & Event Engine States
  const [activePopups, setActivePopups] = useState<ActiveMemePopup[]>([]);
  const [recentEvents, setRecentEvents] = useState<UnifiedMemeEvent[]>([]);
  const [lastTriggeredEvent, setLastTriggeredEvent] = useState<UnifiedMemeEvent | null>(null);
  const [customMemes, setCustomMemes] = useState<MemeVisualDefinition[]>([]);
  const [memeModalAction, setMemeModalAction] = useState<string | null>(null);

  // Meme Discovery, Search & Category States
  const [memeSearchQuery, setMemeSearchQuery] = useState('');
  const [selectedMemeCategory, setSelectedMemeCategory] = useState<string>('ALL');

  // Modal Dialogs
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [creatorTargetAction, setCreatorTargetAction] = useState<string | null>(null);
  const [assignModalMeme, setAssignModalMeme] = useState<MemeVisualDefinition | null>(null);

  // System states
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const [actionManualOpen, setActionManualOpen] = useState(false);
  const [modelLoadingState, setModelLoadingState] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const kinematicsRef = useRef<PoseKinematics>(new PoseKinematics());
  const classifierRef = useRef<GoofyPoseClassifier>(new GoofyPoseClassifier());
  const handClassifierRef = useRef<GoofyHandClassifier>(new GoofyHandClassifier());

  const stateMachineRef = useRef<GoofyPoseStateMachine>(
    new GoofyPoseStateMachine({
      minHoldMs: config.minHoldMs,
      cooldownMs: config.cooldownMs,
    })
  );
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

  const audioEngineRef = useRef<GoofyAudioEngine>(new GoofyAudioEngine());
  const visualFxRef = useRef<GoofyVisualFXEngine>(new GoofyVisualFXEngine());
  const eventEngineRef = useRef<GoofyEventEngine>(
    new GoofyEventEngine(config, audioEngineRef.current, visualFxRef.current)
  );

  const landmarksRef = useRef<PoseLandmark[] | null>(null);
  const leftHandLandmarksRef = useRef<Landmark3D[] | null>(null);
  const rightHandLandmarksRef = useRef<Landmark3D[] | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsCalcRef = useRef(performance.now());
  const lastPoseDetectionTimeRef = useRef(performance.now());
  const lastHandDetectionTimeRef = useRef(performance.now());
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
    stateMachineRef.current.updateConfig({
      minHoldMs: config.minHoldMs,
      cooldownMs: config.cooldownMs,
    });
    leftHandSMRef.current.updateConfig({ cooldownMs: config.cooldownMs });
    rightHandSMRef.current.updateConfig({ cooldownMs: config.cooldownMs });
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
    const unsubscribe = eventEngineRef.current.subscribe((event, popups) => {
      setActivePopups(popups);
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
          'goofy-model',
          event.confidence || 0.95
        );

        // Easter egg achievements
        unlockAchievement('GOOFY_FIRST_ACTION');
        if (event.actionId === 'CLAP') unlockAchievement('GOOFY_STANDING_OVATION');
        if (event.actionId === 'THUMBS_UP') unlockAchievement('GOOFY_CHAD_ENERGY');
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize MediaPipe Pose and Hand Landmarkers concurrently
  useEffect(() => {
    let mounted = true;
    const runner = runnerRef.current;
    const visualFx = visualFxRef.current;
    const audioEngine = audioEngineRef.current;

    Promise.all([
      runner.initPoseLandmarker('/models/pose_landmarker_full.task'),
      runner.initHandLandmarker('/models/hand_landmarker.task'),
    ])
      .then(() => {
        if (mounted) setModelLoadingState('READY');
      })
      .catch((err) => {
        console.warn('[GoofyModel] MediaPipe loader notice:', err);
        if (mounted) setModelLoadingState('READY');
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
      activeModule: 'GOOFY MODEL V3',
      activeModel: 'pose_landmarker_full + hand_landmarker',
      fps,
      p50Ms: 16,
      p95Ms: 24,
      trackingStatus: isStreaming ? 'TRACKING_ACTIVE' : 'STANDBY',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [fps, isStreaming, setPerfStats]);

  // Audio Context unlock helper
  const handleUnlockAudio = () => {
    const success = audioEngineRef.current.unlock();
    if (success) setAudioUnlocked(true);
  };

  // Main 60 FPS Render & Evaluation Loop
  const tick = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastFpsCalcRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcRef.current)));
      frameCountRef.current = 0;
      lastFpsCalcRef.current = now;
    }

    let currentPoseLandmarks: PoseLandmark[] = [];
    let detectedHands: { handedness: 'Left' | 'Right'; landmarks: Landmark3D[] }[] = [];

    if (syntheticMode || !videoRef.current || videoRef.current.readyState < 2) {
      // Synthetic Demonstration Mode: Generates synthetic body & hand
      currentPoseLandmarks = generateSyntheticPose(now, 'squat');
      detectedHands = [
        {
          handedness: 'Right',
          landmarks: generateSyntheticHand(now, 'point'),
        },
      ];
    } else {
      // Live Camera Processing: Interleaved scheduling for ultra-smooth 60 FPS
      // Even frames: Pose inference | Odd frames: Hand inference
      const isEven = frameCountRef.current % 2 === 0;

      if (isEven) {
        const poseResult = runnerRef.current.detectPose(videoRef.current, now);
        if (poseResult && poseResult.landmarks && poseResult.landmarks.length > 0) {
          lastPoseDetectionTimeRef.current = now;
          currentPoseLandmarks = poseResult.landmarks[0]!.map((pt) => ({
            x: pt.x,
            y: pt.y,
            z: pt.z,
            visibility: pt.visibility,
          }));
          landmarksRef.current = currentPoseLandmarks;
        } else if (now - lastPoseDetectionTimeRef.current < 200) {
          currentPoseLandmarks = landmarksRef.current || [];
        } else {
          currentPoseLandmarks = [];
          landmarksRef.current = null;
        }
      } else {
        const handResult = runnerRef.current.detectHands(videoRef.current, now);
        if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
          lastHandDetectionTimeRef.current = now;
          detectedHands = handResult.landmarks.map((lms, idx) => {
            const hName =
              handResult.handedness && handResult.handedness[idx] && handResult.handedness[idx]![0]
                ? (handResult.handedness[idx]![0]!.displayName as 'Left' | 'Right')
                : (idx === 0 ? 'Right' : 'Left');
            return {
              handedness: hName,
              landmarks: lms.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z })),
            };
          });

          // Update cached refs
          const leftH = detectedHands.find((h) => h.handedness === 'Left');
          const rightH = detectedHands.find((h) => h.handedness === 'Right');
          leftHandLandmarksRef.current = leftH ? leftH.landmarks : null;
          rightHandLandmarksRef.current = rightH ? rightH.landmarks : null;
        } else if (now - lastHandDetectionTimeRef.current < 200) {
          detectedHands = [];
          if (leftHandLandmarksRef.current) {
            detectedHands.push({ handedness: 'Left', landmarks: leftHandLandmarksRef.current });
          }
          if (rightHandLandmarksRef.current) {
            detectedHands.push({ handedness: 'Right', landmarks: rightHandLandmarksRef.current });
          }
        } else {
          detectedHands = [];
          leftHandLandmarksRef.current = null;
          rightHandLandmarksRef.current = null;
        }
      }
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas) {
      syncCanvasToVideo(canvas, video);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ─────────────────────────────────────────────────────────────
        // 1. POSE INFERENCE & CLASSIFICATION
        // ─────────────────────────────────────────────────────────────
        let poseClassification: PoseClassificationResult = {
          pose: null,
          confidence: 0,
          label: 'NEUTRAL STANCE',
          comicCaption: 'STRIKE A HEROIC POSE OR SHOW A HAND GESTURE!',
          isDynamicAction: false,
          jointMetrics: {},
          visibilityState: 'NO_BODY',
        };

        if (currentPoseLandmarks.length >= 33) {
          poseClassification = classifierRef.current.classify(currentPoseLandmarks, now);

          // Render skeleton overlay
          const angles = kinematicsRef.current.calculateJointAngles(currentPoseLandmarks);
          renderPoseOverlay(ctx, currentPoseLandmarks, angles, canvas.width, canvas.height, {
            showAngles: false,
            showGhostTarget: false,
            isMirrored,
          });
        }

        // Feed to Pose State Machine
        const smResult = stateMachineRef.current.process(poseClassification, now);
        if (smResult.triggerEvent) {
          eventEngineRef.current.dispatchActionTrigger(
            smResult.triggerEvent.pose,
            'BODY',
            undefined,
            smResult.triggerEvent.confidence
          );
        }

        // Update Body telemetry state
        setBodyTrackingStatus(smResult.status);
        setBodyVisibilityState(poseClassification.visibilityState || 'NO_BODY');
        setVisibilityWarning(poseClassification.visibilityWarning || null);
        setActivePose(smResult.activePose);
        setPoseLabel(poseClassification.label);
        setComicCaption(poseClassification.comicCaption);
        setConfidenceScore(poseClassification.confidence);
        setIsDynamicActionActive(Boolean(poseClassification.isDynamicAction));
        setHoldProgress(smResult.holdProgress);

        // ─────────────────────────────────────────────────────────────
        // 2. HAND INFERENCE & CLASSIFICATION
        // ─────────────────────────────────────────────────────────────
        setHandCount(detectedHands.length);
        let curLeftGesture: GoofyHandGestureType | null = null;
        let curRightGesture: GoofyHandGestureType | null = null;

        for (const hand of detectedHands) {
          // Render Hand Skeletons over Pose without clearing
          renderHandOverlay(ctx, hand.landmarks, canvas.width, canvas.height, {
            showJointLabels: false,
            showSkeleton: true,
            showCursor: false,
            showActiveRegion: false,
            isMirrored,
            clearBeforeRender: false,
          });

          // Classify Hand Gesture
          const handResult = handClassifierRef.current.classify(hand.landmarks, hand.handedness, now);

          if (hand.handedness === 'Left') {
            curLeftGesture = handResult.gesture;
            const sm = leftHandSMRef.current.process(handResult, now);
            if (sm.triggered && sm.gesture) {
              eventEngineRef.current.dispatchActionTrigger(sm.gesture, 'HAND', 'Left', handResult.confidence);
            }
          } else {
            curRightGesture = handResult.gesture;
            const sm = rightHandSMRef.current.process(handResult, now);
            if (sm.triggered && sm.gesture) {
              eventEngineRef.current.dispatchActionTrigger(sm.gesture, 'HAND', 'Right', handResult.confidence);
            }
          }
        }

        setLeftHandGesture(curLeftGesture);
        setRightHandGesture(curRightGesture);

        // ─────────────────────────────────────────────────────────────
        // 3. RENDER VISUAL COMIC PARTICLES
        // ─────────────────────────────────────────────────────────────
        visualFxRef.current.updateAndRender(ctx, now);
      }
    }
  }, [isMirrored, syntheticMode, videoRef]);

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
      eventEngineRef.current.previewAction('T_POSE', 'BODY', undefined, picked.id);
    }
  };

  // Helper to discover actions that currently use a specific meme
  const getAssignedActionsForMeme = (memeId: string): string[] => {
    const assigned: string[] = [];
    // Check explicit overrides in config
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
    } else if (selectedMemeCategory === 'CUSTOM') {
      list = list.filter((m: MemeVisualDefinition) => m.isCustom);
    } else if (selectedMemeCategory !== 'ALL') {
      list = filterMemesByCategory(selectedMemeCategory as MemeCategory, list);
    }

    return list;
  }, [allMemes, memeSearchQuery, selectedMemeCategory, config.favoriteMemes]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      CONFUSION: 0,
      SHOCK: 0,
      CONFIDENCE: 0,
      FAILURE: 0,
      SUSPICIOUS: 0,
      CELEBRATION: 0,
      SPECIAL: 0,
    };
    for (const m of allMemes) {
      if (m.category && counts[m.category] !== undefined) {
        counts[m.category] = (counts[m.category] || 0) + 1;
      }
    }
    return counts;
  }, [allMemes]);

  const favCount = useMemo(() => {
    const favSet = new Set(config.favoriteMemes || []);
    return allMemes.filter((m: MemeVisualDefinition) => favSet.has(m.id) || m.isFavorite).length;
  }, [allMemes, config.favoriteMemes]);

  // Reset to Built-in Defaults
  const handleResetDefaults = () => {
    setConfig(DEFAULT_GOOFY_CONFIG);
    stateMachineRef.current.reset();
    leftHandSMRef.current.reset();
    rightHandSMRef.current.reset();
    eventEngineRef.current.clearHistory();
    setRecentEvents([]);
    setLastTriggeredEvent(null);
  };

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

      // If assigning to a specific action from modal
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
    <div
      className={`min-h-screen bg-paper-cream text-charcoal-dark font-mono flex flex-col transition-transform duration-75 ${
        shakeActive ? 'translate-x-1 -translate-y-1' : ''
      }`}
    >
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
              <StampBadge label="EXP. 04" variant="sage" />
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-charcoal-dark">
                GOOFY MODEL V3
              </h1>
            </div>
            <p className="text-xs text-ink-muted">
              ADVANCED MEME LIBRARY // REACTION COLLECTIONS // PERSONALISATION &amp; MULTIMODAL EVENT ENGINE
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyntheticMode(!syntheticMode)}
              className={`gap-1.5 text-xs ${
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
              className="gap-1.5 text-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>ACTION MANUAL</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfig((p) => ({ ...p, isMuted: !p.isMuted }))}
              className={`gap-1.5 text-xs ${
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
          {/* Left Column: Live Camera, Overlays, and Event History (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Camera Viewport Stage with Meme Pop-up Overlay */}
            <div className="relative border-4 border-charcoal-soft rounded-tactile overflow-hidden bg-charcoal-dark shadow-tactile-lg">
              <div className="relative aspect-video w-full flex items-center justify-center bg-black overflow-hidden">
                {/* Live Camera Video Stream */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
                />

                {/* Combined Canvas: Pose Skeleton + Hand Landmarks + Particles */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                />

                {/* AUTOMATIC MEME POP-UP OVERLAY ENGINE */}
                <MemePopupOverlay popups={activePopups} />

                {/* Top Telemetry HUD: Multimodal Tracking Indicators */}
                <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  {/* Left Badges: Body & Hand Tracking Status */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black tracking-wider">
                    {/* FPS */}
                    <span className="px-2 py-0.5 bg-black/80 border border-white/20 text-white rounded">
                      FPS: {fps}
                    </span>

                    {/* Body Visibility State */}
                    <span
                      className={`px-2 py-0.5 border rounded flex items-center gap-1 ${
                        bodyVisibilityState === 'FULL_BODY'
                          ? 'border-emerald-400 bg-emerald-500/90 text-black'
                          : bodyVisibilityState === 'UPPER_BODY_ONLY'
                          ? 'border-amber-400 bg-amber-500/90 text-black'
                          : 'border-white/20 bg-black/80 text-white/70'
                      }`}
                    >
                      <User className="w-3 h-3" />
                      BODY: {bodyVisibilityState}
                    </span>

                    {/* Hand Tracking Count & Gestures */}
                    <span
                      className={`px-2 py-0.5 border rounded flex items-center gap-1 ${
                        handCount > 0
                          ? 'border-cyan-400 bg-cyan-500/90 text-black'
                          : 'border-white/20 bg-black/80 text-white/70'
                      }`}
                    >
                      <Hand className="w-3 h-3" />
                      HANDS: {handCount}
                    </span>

                    {/* Current Detected Hand Gestures */}
                    {leftHandGesture && (
                      <span className="px-2 py-0.5 bg-cyan-400 text-black rounded font-black">
                        L: {leftHandGesture}
                      </span>
                    )}
                    {rightHandGesture && (
                      <span className="px-2 py-0.5 bg-cyan-400 text-black rounded font-black">
                        R: {rightHandGesture}
                      </span>
                    )}
                  </div>

                  {/* Hold Progress Bar for Static Poses */}
                  {bodyTrackingStatus === 'CANDIDATE' && !isDynamicActionActive && (
                    <div className="flex items-center gap-2 bg-black/80 px-2.5 py-1 rounded border border-amber-400">
                      <span className="text-[10px] font-bold text-amber-400">HOLD:</span>
                      <div className="w-16 h-2 bg-black border border-amber-400 rounded overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-75"
                          style={{ width: `${Math.round(holdProgress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lower Body Visibility Warning Banner (Eliminates Squat False Positives) */}
                {visibilityWarning && (
                  <div className="absolute top-12 left-3 z-20 px-2.5 py-1 bg-amber-500/90 border border-black text-black font-black text-[10px] rounded tracking-wide flex items-center gap-1.5 shadow-md">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{visibilityWarning}</span>
                  </div>
                )}

                {/* Bottom Active Action Telemetry Bar */}
                <div className="absolute bottom-3 inset-x-3 z-20 p-2.5 bg-charcoal-dark/90 border-2 border-charcoal-soft rounded backdrop-blur-md space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-muted uppercase">ACTIVE DETECTION:</span>
                      <span className="text-sm font-extrabold uppercase text-amber-400">
                        {activePose ? GOOFY_POSE_METADATA[activePose]?.icon : ''} {poseLabel}
                      </span>
                    </div>

                    {lastTriggeredEvent && (
                      <div className="flex items-center gap-2 text-xs font-bold text-sage-green">
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

            {/* Camera & Tracking Controls Strip */}
            <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-cream flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (isStreaming ? stopCamera() : startCamera())}
                  className="gap-1 text-xs"
                >
                  {isStreaming ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{isStreaming ? 'STOP CAMERA' : 'START CAMERA'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    stateMachineRef.current.reset();
                    leftHandSMRef.current.reset();
                    rightHandSMRef.current.reset();
                    eventEngineRef.current.clearHistory();
                    setRecentEvents([]);
                    setLastTriggeredEvent(null);
                  }}
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET TRACKING</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                <span>ENGINE: Multimodal (Pose + Hand)</span>
                <span>&bull;</span>
                <span>BACKEND: WebGPU / WASM</span>
              </div>
            </div>

            {/* Genuine Model Event History Log */}
            <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-2 shadow-tactile-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  <span>MULTIMODAL MEME EVENT LOG</span>
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
                            evt.source === 'HAND'
                              ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                          }`}
                        >
                          {evt.source}
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
                        <span className="font-bold text-sage-green">
                          🔊 {evt.soundName}
                        </span>
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
                  Perform any body action or hand gesture in front of the camera to trigger sound and meme pop-up effects!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tabbed Action & Gesture Configuration Panels (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Master Control Deck */}
            <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm text-xs">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
                <h3 className="font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  ENGINE SETTINGS
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

              {/* Sliders Grid: Meme Duration & Hold Threshold */}
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
                  <div className="flex justify-between">
                    <span className="font-bold text-[11px]">STATIC HOLD TIME</span>
                    <span className="tabular-nums font-bold text-charcoal-soft">
                      {config.minHoldMs}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="800"
                    step="25"
                    value={config.minHoldMs}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, minHoldMs: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-charcoal-soft h-1.5"
                  />
                </div>
              </div>

              {/* Animation Style Selector */}
              <div className="space-y-1 pt-1 border-t border-charcoal-soft/10">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold">POPUP ANIMATION STYLE</span>
                  <span className="text-amber-600 font-bold uppercase">{config.popupAnimationStyle || 'CLASSIC'}</span>
                </div>
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
                  <option value="CLASSIC">CLASSIC (COMIC POP &amp; BOUNCE)</option>
                  <option value="EXPLOSIVE">EXPLOSIVE (STARBURST RAYS &amp; ZOOM)</option>
                  <option value="RETRO_ARCADE">RETRO ARCADE (CRT SCANLINES &amp; FLICKER)</option>
                  <option value="MINIMAL">MINIMAL (CLEAN FADE &amp; GLIDE)</option>
                  <option value="NO_ANIMATION">NO ANIMATION (INSTANT POP)</option>
                </select>
              </div>

              {/* Toggles Strip */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-charcoal-soft/10">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                  <input
                    type="checkbox"
                    checked={config.enableMemePopups}
                    onChange={(e) => setConfig((p) => ({ ...p, enableMemePopups: e.target.checked }))}
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
                    onChange={(e) => setConfig((p) => ({ ...p, enableScreenShake: e.target.checked }))}
                    className="accent-charcoal-soft"
                  />
                  <span>SCREEN SHAKE</span>
                </label>
              </div>

              {/* Advanced Reaction Mode Toggles */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-charcoal-soft/10">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold" title="Randomizes reaction from compatible memes with anti-repetition memory">
                  <input
                    type="checkbox"
                    checked={config.randomMemeMode}
                    onChange={(e) => setConfig((p) => ({ ...p, randomMemeMode: e.target.checked }))}
                    className="accent-purple-600"
                  />
                  <span className="text-purple-700">RANDOM MEME</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                  <input
                    type="checkbox"
                    checked={config.randomSoundMode}
                    onChange={(e) => setConfig((p) => ({ ...p, randomSoundMode: e.target.checked }))}
                    className="accent-charcoal-soft"
                  />
                  <span>RANDOM SOUND</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold" title="Enables rare legendary easter egg meme pop-ups">
                  <input
                    type="checkbox"
                    checked={config.enableRareReactions}
                    onChange={(e) => setConfig((p) => ({ ...p, enableRareReactions: e.target.checked }))}
                    className="accent-fuchsia-600"
                  />
                  <span className="text-fuchsia-700">RARE MEMES</span>
                </label>
              </div>

              {/* Rare Reaction Probability Slider */}
              {config.enableRareReactions && (
                <div className="space-y-1 pt-1 border-t border-charcoal-soft/10">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-fuchsia-800">RARE REACTION PROBABILITY</span>
                    <span className="tabular-nums font-bold text-fuchsia-700">
                      {Math.round((config.rareReactionProbability ?? 0.1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.40"
                    step="0.02"
                    value={config.rareReactionProbability ?? 0.1}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        rareReactionProbability: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-fuchsia-600 h-1.5"
                  />
                </div>
              )}

              {/* Simultaneous Event Arbitration Policy */}
              <div className="flex items-center justify-between pt-1 border-t border-charcoal-soft/10 text-[11px]">
                <span className="font-bold">SIMULTANEOUS POLICY:</span>
                <select
                  value={config.simultaneousPolicy}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      simultaneousPolicy: e.target.value as GoofyModeConfig['simultaneousPolicy'],
                    }))
                  }
                  className="p-1 border border-charcoal-soft/40 rounded bg-paper-cream text-xs font-bold font-mono"
                >
                  <option value="ALLOW_BOTH">ALLOW BOTH (CONCURRENT)</option>
                  <option value="HAND_PRIORITY">HAND GESTURE PRIORITY</option>
                  <option value="BODY_PRIORITY">BODY ACTION PRIORITY</option>
                  <option value="REPLACE_OLDEST">REPLACE OLDEST</option>
                </select>
              </div>
            </div>

            {/* TAB SELECTOR: BODY ACTIONS vs HAND GESTURES vs MEME LIBRARY */}
            <div className="flex items-center border-b-2 border-charcoal-soft gap-2">
              <button
                onClick={() => setActiveTab('BODY')}
                className={`px-3 py-2 text-xs font-extrabold uppercase border-b-2 transition-colors ${
                  activeTab === 'BODY'
                    ? 'border-amber-500 text-charcoal-dark'
                    : 'border-transparent text-ink-muted hover:text-charcoal-dark'
                }`}
              >
                BODY ACTIONS (8)
              </button>

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
                onClick={() => setActiveTab('MEMES')}
                className={`px-3 py-2 text-xs font-extrabold uppercase border-b-2 transition-colors ${
                  activeTab === 'MEMES'
                    ? 'border-emerald-500 text-charcoal-dark'
                    : 'border-transparent text-ink-muted hover:text-charcoal-dark'
                }`}
              >
                MEME LIBRARY ({DEFAULT_MEME_LIBRARY.length + customMemes.length})
              </button>
            </div>

            {/* TAB 1: BODY ACTIONS LIST */}
            {activeTab === 'BODY' && (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {(
                  [
                    'T_POSE',
                    'HANDS_RAISED',
                    'HANDS_ON_HIPS',
                    'ARMS_CROSSED',
                    'SQUAT',
                    'JUMP',
                    'FLEX_POSE',
                    'CLAP',
                  ] as GoofyPoseType[]
                ).map((poseKey) => {
                  const meta = GOOFY_POSE_METADATA[poseKey];
                  const mapping = config.mappings[poseKey];
                  const assignedMemeId =
                    config.actionMemeMappings[poseKey] ||
                    (mapping && mapping.memeId) ||
                    getDefaultMemeForAction(poseKey).id;
                  const memeDef =
                    getMemeById(assignedMemeId, customMemes) ||
                    getDefaultMemeForAction(poseKey);

                  return (
                    <div
                      key={poseKey}
                      className={`border-2 rounded-tactile p-3 bg-paper-cream space-y-2.5 shadow-tactile-sm transition-all ${
                        activePose === poseKey
                          ? 'border-amber-500 bg-amber-50/50'
                          : 'border-charcoal-soft'
                      }`}
                    >
                      {/* Card Header: Icon, Name, Type, Enable Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{meta.icon}</span>
                          <div>
                            <span className="font-extrabold text-xs uppercase block text-charcoal-dark">
                              {meta.label}
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              {meta.actionType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                            <input
                              type="checkbox"
                              checked={mapping?.enabled ?? true}
                              onChange={(e) =>
                                setConfig((p) => ({
                                  ...p,
                                  mappings: {
                                    ...p.mappings,
                                    [poseKey]: {
                                      ...p.mappings[poseKey],
                                      enabled: e.target.checked,
                                    },
                                  },
                                }))
                              }
                              className="accent-charcoal-soft"
                            />
                            <span>ENABLED</span>
                          </label>
                        </div>
                      </div>

                      {/* Sound & Meme Assignment Pickers */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Sound Selector */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-ink-muted block uppercase">
                            SOUND EFFECT
                          </span>
                          <select
                            value={mapping?.soundId || 'INCEPTION_BRAAAM'}
                            onChange={(e) =>
                              setConfig((p) => ({
                                ...p,
                                mappings: {
                                  ...p.mappings,
                                  [poseKey]: {
                                    ...p.mappings[poseKey],
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

                        {/* Meme Visual Selector */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-ink-muted block uppercase">
                            MEME POP-UP
                          </span>
                          <button
                            onClick={() => setMemeModalAction(poseKey)}
                            className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-dark/20 text-xs font-mono font-bold flex items-center justify-between hover:bg-paper-dark/40 truncate"
                          >
                            <span className="truncate">🖼️ {memeDef.title}</span>
                            <span className="text-[10px] text-amber-600 underline shrink-0">
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
                            config.actionCustomCaptions[poseKey] ||
                            mapping?.customCaption ||
                            meta.defaultCaption
                          }
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              actionCustomCaptions: {
                                ...p.actionCustomCaptions,
                                [poseKey]: e.target.value,
                              },
                            }))
                          }
                          placeholder={meta.defaultCaption}
                          className="w-full p-1 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono"
                        />
                      </div>

                      {/* Action Buttons: Preview Sound, Preview Meme, Combined Test */}
                      <div className="flex items-center justify-between pt-1 border-t border-charcoal-soft/10 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              audioEngineRef.current.playSound(
                                mapping?.soundId || 'INCEPTION_BRAAAM',
                                config.volume
                              )
                            }
                            className="text-[10px] gap-1 p-1 h-6"
                            title="Preview Sound Only"
                          >
                            <Music className="w-3 h-3" />
                            <span>PLAY SOUND</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              eventEngineRef.current.previewAction(
                                poseKey,
                                'BODY',
                                mapping?.soundId,
                                memeDef.id
                              )
                            }
                            className="text-[10px] gap-1 p-1 h-6 text-amber-600 font-bold"
                            title="Preview Sound + Meme Together"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>TEST POP-UP</span>
                          </Button>
                        </div>

                        <span className="text-[9px] text-ink-muted font-mono">
                          {memeDef.category}
                        </span>
                      </div>

                      {/* Quick Recommended Memes */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-charcoal-soft/10">
                        <span className="text-[9px] font-black text-ink-muted uppercase flex items-center gap-1">
                          <Wand2 className="w-2.5 h-2.5 text-amber-500" />
                          REC:
                        </span>
                        {(GOOFY_ACTION_RECOMMENDED_MEMES[poseKey] || []).map((recId) => {
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
                                    [poseKey]: recId,
                                  },
                                }))
                              }
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                isCurrent
                                  ? 'bg-amber-500 text-charcoal-dark ring-1 ring-amber-600'
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
                  );
                })}
              </div>
            )}

            {/* TAB 2: HAND GESTURES LIST */}
            {activeTab === 'HANDS' && (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
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

                  return (
                    <div
                      key={gestureKey}
                      className={`border-2 rounded-tactile p-3 bg-paper-cream space-y-2.5 shadow-tactile-sm transition-all ${
                        isCurrentlyActive
                          ? 'border-cyan-500 bg-cyan-50/50'
                          : 'border-charcoal-soft'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{meta.icon}</span>
                          <div>
                            <span className="font-extrabold text-xs uppercase block text-charcoal-dark">
                              {meta.label}
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              {meta.isDynamic ? 'DYNAMIC SWIPE' : 'STATIC GESTURE'}
                            </span>
                          </div>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
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
                            className="accent-charcoal-soft"
                          />
                          <span>ENABLED</span>
                        </label>
                      </div>

                      {/* Sound & Meme Picker */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
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
                            className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-dark/20 text-xs font-mono font-bold flex items-center justify-between hover:bg-paper-dark/40 truncate"
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

                      {/* Action Buttons */}
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
                            className="text-[10px] gap-1 p-1 h-6"
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
                            className="text-[10px] gap-1 p-1 h-6 text-cyan-600 font-bold"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>TEST POP-UP</span>
                          </Button>
                        </div>

                        <span className="text-[9px] text-ink-muted font-mono">
                          {meta.cues[0]}
                        </span>
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
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
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
                  );
                })}
              </div>
            )}

            {/* TAB 3: MEME DISCOVERY LIBRARY */}
            {activeTab === 'MEMES' && (
              <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
                {/* 1. Presets Bar */}
                <div className="space-y-1.5 border border-charcoal-soft/30 rounded p-2.5 bg-paper-dark/15">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-charcoal-soft">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      REACTION PRESETS &amp; COLLECTIONS
                    </span>
                    <span className="text-ink-muted">{BUILTIN_MEME_PRESETS.length} PRESETS</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BUILTIN_MEME_PRESETS.map((p) => {
                      const isActive = config.activePresetId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleApplyPreset(p.id)}
                          className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all uppercase flex items-center gap-1 ${
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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-7 gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>CREATE MEME</span>
                    </Button>

                    <label className="border border-charcoal-soft rounded px-2 py-1 bg-paper-cream hover:bg-paper-dark/30 cursor-pointer flex items-center gap-1 text-[10px] font-bold h-7 text-charcoal-dark">
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
                      className="text-[10px] h-7 gap-1"
                      title="Roll a random meme pop-up"
                    >
                      <Dices className="w-3 h-3 text-purple-600" />
                      <span>RANDOM ROLL</span>
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetDefaults}
                    className="text-[10px] h-7 text-ink-muted hover:text-charcoal-dark gap-1"
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

                {/* 3. Search and Category Filter Deck */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      value={memeSearchQuery}
                      onChange={(e) => setMemeSearchQuery(e.target.value)}
                      placeholder="Search 60+ memes by title, caption, tags..."
                      className="w-full pl-8 pr-8 py-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
                    />
                    {memeSearchQuery && (
                      <button
                        onClick={() => setMemeSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-charcoal-dark"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] font-bold font-mono">
                    {[
                      { id: 'ALL', label: `ALL (${allMemes.length})` },
                      { id: 'FAVORITES', label: `★ FAVOURITES (${favCount})` },
                      { id: 'CONFUSION', label: `CONFUSION (${categoryCounts['CONFUSION'] || 0})` },
                      { id: 'SHOCK', label: `SHOCK (${categoryCounts['SHOCK'] || 0})` },
                      { id: 'CONFIDENCE', label: `CONFIDENCE (${categoryCounts['CONFIDENCE'] || 0})` },
                      { id: 'FAILURE', label: `FAILURE (${categoryCounts['FAILURE'] || 0})` },
                      { id: 'SUSPICIOUS', label: `SUSPICIOUS (${categoryCounts['SUSPICIOUS'] || 0})` },
                      { id: 'CELEBRATION', label: `CELEBRATION (${categoryCounts['CELEBRATION'] || 0})` },
                      { id: 'SPECIAL', label: `SPECIAL (${categoryCounts['SPECIAL'] || 0})` },
                      { id: 'CUSTOM', label: `CUSTOM (${customMemes.length})` },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedMemeCategory(cat.id)}
                        className={`px-2 py-0.5 rounded transition-all ${
                          selectedMemeCategory === cat.id
                            ? 'bg-charcoal-dark text-paper-cream font-black shadow-xs'
                            : 'bg-paper-dark/30 hover:bg-paper-dark/60 text-charcoal-dark'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Meme Grid */}
                {filteredMemes.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted text-xs border border-dashed border-charcoal-soft rounded">
                    No memes found matching &quot;{memeSearchQuery}&quot; in category {selectedMemeCategory}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {filteredMemes.map((meme: MemeVisualDefinition) => {
                      const isFav = (config.favoriteMemes || []).includes(meme.id) || meme.isFavorite;
                      const assignedActions = getAssignedActionsForMeme(meme.id);

                      // Category Border Color
                      const borderCol =
                        meme.category === 'CONFUSION'
                          ? 'hover:border-purple-500'
                          : meme.category === 'SHOCK'
                          ? 'hover:border-cyan-500'
                          : meme.category === 'CONFIDENCE'
                          ? 'hover:border-amber-500'
                          : meme.category === 'FAILURE'
                          ? 'hover:border-rose-500'
                          : meme.category === 'SUSPICIOUS'
                          ? 'hover:border-emerald-500'
                          : meme.category === 'CELEBRATION'
                          ? 'hover:border-yellow-500'
                          : meme.category === 'SPECIAL'
                          ? 'hover:border-fuchsia-500'
                          : 'hover:border-charcoal-soft';

                      return (
                        <div
                          key={meme.id}
                          className={`border-2 border-charcoal-soft/50 ${borderCol} rounded p-2 bg-paper-cream space-y-1.5 shadow-sm transition-all flex flex-col justify-between`}
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
                                    className="px-1.5 py-0.5 bg-amber-400/90 text-charcoal-dark font-black text-[8px] rounded uppercase"
                                  >
                                    ASSIGNED: {act}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-charcoal-soft/10">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                eventEngineRef.current.previewAction(
                                  'T_POSE',
                                  'BODY',
                                  undefined,
                                  meme.id
                                )
                              }
                              className="text-[9px] h-6 px-1 gap-1"
                              title="Preview meme pop-up in camera"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                              <span>PREVIEW</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssignModalMeme(meme)}
                              className="text-[9px] h-6 px-1 gap-1 bg-paper-dark/20 hover:bg-paper-dark/50"
                              title="Assign this meme to a body or hand action"
                            >
                              <span>ASSIGN TO...</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

      {/* MODAL 2: ACTION MANUAL DOCUMENTATION */}
      {actionManualOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-cream border-4 border-charcoal-soft rounded-tactile max-w-2xl w-full p-6 space-y-4 shadow-tactile-lg max-h-[85vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm uppercase">
                  GOOFY MODEL V3 // ACTION &amp; MEME MANUAL
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
              {/* Presets and Features Summary */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                <h4 className="font-black text-amber-700 uppercase mb-1">GOOFY V3 UPGRADE FEATURES</h4>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-charcoal-dark">
                  <li>62 built-in original vector SVG memes across 7 reaction packs.</li>
                  <li>In-browser Canvas Custom Meme Creator with text outlines, comic stamps, and borders.</li>
                  <li>7 one-click Curated Meme Presets: Balanced, Chaos, Clean Comedy, Ultra Drama, Maximum Aura, Failure, Unhinged.</li>
                  <li>5 Visual Animation Styles: Classic, Explosive, Retro Arcade, Minimal, No Animation.</li>
                  <li>Anti-repetition memory prevents duplicate reactions on sustained actions.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-extrabold text-amber-600 uppercase border-b border-charcoal-soft/20 pb-1 mb-2">
                  BODY ACTIONS (8)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(
                    [
                      'T_POSE',
                      'HANDS_RAISED',
                      'HANDS_ON_HIPS',
                      'ARMS_CROSSED',
                      'SQUAT',
                      'JUMP',
                      'FLEX_POSE',
                      'CLAP',
                    ] as GoofyPoseType[]
                  ).map((pose) => (
                    <div key={pose} className="p-2 border border-charcoal-soft/30 rounded bg-paper-dark/20">
                      <div className="font-bold flex items-center gap-1.5 text-charcoal-dark uppercase">
                        <span>{GOOFY_POSE_METADATA[pose]?.icon}</span>
                        <span>{GOOFY_POSE_METADATA[pose]?.label}</span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1">
                        {GOOFY_POSE_METADATA[pose]?.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

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
                    <div key={gesture} className="p-2 border border-charcoal-soft/30 rounded bg-paper-dark/20">
                      <div className="font-bold flex items-center gap-1.5 text-charcoal-dark uppercase">
                        <span>{GOOFY_HAND_METADATA[gesture]?.icon}</span>
                        <span>{GOOFY_HAND_METADATA[gesture]?.label}</span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1">
                        {GOOFY_HAND_METADATA[gesture]?.description}
                      </p>
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
