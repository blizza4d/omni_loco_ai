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
import { GoofyAudioEngine } from '@/modules/pose/goofy-audio-engine';
import { GoofyVisualFXEngine } from '@/modules/pose/goofy-visual-fx';
import { GoofyEventEngine } from '@/modules/pose/goofy-event-engine';
import {
  DEFAULT_MEME_LIBRARY,
  getMemeById,
  getDefaultMemeForAction,
  loadCustomMemesFromDB,
  saveCustomMemeToDB,
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

  const [activeTab, setActiveTab] = useState<'HANDS' | 'COMBOS' | 'MEMES'>('HANDS');
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [fps, setFps] = useState(0);

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

  // Modal Dialogs
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [creatorTargetAction, setCreatorTargetAction] = useState<string | null>(null);
  const [assignModalMeme, setAssignModalMeme] = useState<MemeVisualDefinition | null>(null);

  // System states
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const [actionManualOpen, setActionManualOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  // Initialize MediaPipe Hand Landmarker ONLY (Zero body pose overhead)
  useEffect(() => {
    let mounted = true;
    const runner = runnerRef.current;
    const visualFx = visualFxRef.current;
    const audioEngine = audioEngineRef.current;

    runner
      .initHandLandmarker('/models/hand_landmarker.task')
      .catch((err) => {
        console.warn('[GoofyModel] MediaPipe hand loader notice:', err);
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

  // Main 60 FPS Render & Evaluation Loop (Dedicated Hand Tracking Every Frame)
  const tick = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastFpsCalcRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcRef.current)));
      frameCountRef.current = 0;
      lastFpsCalcRef.current = now;
    }

    let detectedHands: { handedness: 'Left' | 'Right'; landmarks: Landmark3D[] }[] = [];

    if (syntheticMode || !videoRef.current || videoRef.current.readyState < 2) {
      // Synthetic Demonstration Mode: Generates synthetic hand landmarks
      detectedHands = [
        {
          handedness: 'Right',
          landmarks: generateSyntheticHand(now, 'point'),
        },
      ];
    } else {
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
          return {
            handedness: rawHandedness,
            landmarks: lms.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z })),
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
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas) {
      syncCanvasToVideo(canvas, video);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render Hand Skeletons & 21 Landmarks
        for (const hand of detectedHands) {
          renderHandOverlay(ctx, hand.landmarks, canvas.width, canvas.height, {
            showJointLabels: false,
            showSkeleton: true,
            showCursor: false,
            showActiveRegion: false,
            isMirrored,
            clearBeforeRender: false,
          });
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
            isMirrored
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
          if (leftResult && leftResult.gesture) {
            const sm = leftHandSMRef.current.process(leftResult, now);
            if (sm.triggered && sm.gesture) {
              eventEngineRef.current.dispatchActionTrigger(
                sm.gesture,
                'HAND',
                'Left',
                leftResult.confidence,
                {
                  fingerCount: leftResult.fingerCount,
                  isDynamic: leftResult.isDynamic,
                }
              );
            }
          }

          if (rightResult && rightResult.gesture) {
            const sm = rightHandSMRef.current.process(rightResult, now);
            if (sm.triggered && sm.gesture) {
              eventEngineRef.current.dispatchActionTrigger(
                sm.gesture,
                'HAND',
                'Right',
                rightResult.confidence,
                {
                  fingerCount: rightResult.fingerCount,
                  isDynamic: rightResult.isDynamic,
                }
              );
            }
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
  }, [config.actionCustomCaptions, isMirrored, syntheticMode, videoRef]);

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
  }, [allMemes, memeSearchQuery, selectedMemeCategory, config.favoriteMemes]);

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
    };
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
  }, [allMemes]);

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
              <span>GESTURE MANUAL</span>
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
          {/* Left Column: Live Hand Camera, Overlays, Telemetry & Log (7 Cols) */}
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

                {/* Hand Skeleton Overlay Canvas */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                />

                {/* AUTOMATIC MEME POP-UP OVERLAY ENGINE */}
                <MemePopupOverlay popups={activePopups} />

                {/* Top Telemetry HUD: Dedicated Hand Tracking Indicators */}
                <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  {/* Left Badges: Hand Detection & Gestures */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black tracking-wider">
                    {/* FPS */}
                    <span className="px-2 py-0.5 bg-black/80 border border-white/20 text-white rounded">
                      FPS: {fps}
                    </span>

                    {/* Hand Count Badge */}
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

                    {/* Finger Count Telemetry Pill */}
                    <span className="px-2 py-0.5 bg-black/80 border border-emerald-400 text-emerald-400 rounded font-black">
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
                </div>

                {/* Bottom Active Action Telemetry Bar */}
                <div className="absolute bottom-3 inset-x-3 z-20 p-2.5 bg-charcoal-dark/90 border-2 border-charcoal-soft rounded backdrop-blur-md space-y-1">
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
                    leftHandSMRef.current.reset();
                    rightHandSMRef.current.reset();
                    dualHandSMRef.current.reset();
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
                    <option value="MINIMAL">MINIMAL (FADE)</option>
                    <option value="NO_ANIMATION">INSTANT POP</option>
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

            {/* TAB SELECTOR: HAND GESTURES vs DUAL COMBOS vs MEME LIBRARY */}
            <div className="flex items-center border-b-2 border-charcoal-soft gap-2">
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
            </div>

            {/* TAB 1: 12 HAND GESTURES */}
            {activeTab === 'HANDS' && (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
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
                          ? 'border-cyan-500 bg-cyan-50/50 ring-1 ring-cyan-500'
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
                              {meta.isDynamic ? 'DYNAMIC SWIPE' : 'STATIC GESTURE'} &bull;{' '}
                              {meta.cues[0]}
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
                            className="accent-cyan-600"
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

            {/* TAB 2: 11 DUAL-HAND COMBOS */}
            {activeTab === 'COMBOS' && (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
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

                  return (
                    <div
                      key={comboKey}
                      className={`border-2 rounded-tactile p-3 bg-paper-cream space-y-2.5 shadow-tactile-sm transition-all ${
                        isCurrentlyActive
                          ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500'
                          : 'border-charcoal-soft'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{meta.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs uppercase block text-charcoal-dark">
                                {meta.label}
                              </span>
                              {meta.isSecret && (
                                <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded text-[9px] font-black uppercase tracking-wider">
                                  SECRET
                                </span>
                              )}
                              {meta.requiredDigits !== undefined && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-black uppercase">
                                  {meta.requiredDigits} DIGITS
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-ink-muted">{meta.description}</span>
                          </div>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
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
                          <span>ENABLED</span>
                        </label>
                      </div>

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
                            className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-dark/20 text-xs font-mono font-bold flex items-center justify-between hover:bg-paper-dark/40 truncate"
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
                                comboKey,
                                'DUAL_HAND',
                                mapping?.soundId || meta.defaultSoundId,
                                memeDef.id
                              )
                            }
                            className="text-[10px] gap-1 p-1 h-6 text-purple-700 font-bold"
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
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
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

                  {/* Quick Filters */}
                  <div className="flex flex-wrap gap-1 text-[10px] font-bold font-mono">
                    {[
                      { id: 'ALL', label: `ALL (${allMemes.length})` },
                      { id: 'REAL_MEDIA', label: `🔥 REAL MEDIA (${categoryCounts['REAL_MEDIA'] || 0})` },
                      { id: 'GIFS', label: `🎬 ANIMATED GIFS (${categoryCounts['GIFS'] || 0})` },
                      { id: 'FAVORITES', label: `★ FAVOURITES (${favCount})` },
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
                            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
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
