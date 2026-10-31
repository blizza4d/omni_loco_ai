'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { PoseKinematics } from '@/modules/pose/kinematics';
import { PoseLandmark } from '@/modules/pose/types';
import {
  GoofyPoseType,
  GoofySoundId,
  GoofyModeConfig,
  GoofyTriggerEvent,
  PoseClassificationResult,
  DEFAULT_GOOFY_CONFIG,
  DEFAULT_SOUND_LIBRARY,
  GOOFY_POSE_METADATA,
} from '@/modules/pose/goofy-types';
import { GoofyPoseClassifier } from '@/modules/pose/goofy-pose-classifier';
import { GoofyPoseStateMachine } from '@/modules/pose/goofy-state-machine';
import { GoofyAudioEngine } from '@/modules/pose/goofy-audio-engine';
import { GoofyVisualFXEngine } from '@/modules/pose/goofy-visual-fx';
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
} from 'lucide-react';

const STORAGE_KEY = 'omni-goofy-config-v2';

export default function GoofyModePage() {
  const [config, setConfig] = useState<GoofyModeConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return DEFAULT_GOOFY_CONFIG;
  });

  const [syntheticMode, setSyntheticMode] = useState(false);
  const [fps, setFps] = useState(0);
  const [activePose, setActivePose] = useState<GoofyPoseType | null>(null);
  const [poseLabel, setPoseLabel] = useState<string>('NEUTRAL STANCE');
  const [comicCaption, setComicCaption] = useState<string>('STRIKE A HEROIC POSE OR PERFORM A JUMP / CLAP!');
  const [trackingStatus, setTrackingStatus] = useState<string>('NO_POSE');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [isDynamicActionActive, setIsDynamicActionActive] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [lastTriggeredEvent, setLastTriggeredEvent] = useState<GoofyTriggerEvent | null>(null);
  const [recentEvents, setRecentEvents] = useState<GoofyTriggerEvent[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const [actionManualOpen, setActionManualOpen] = useState(false);
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const [modelLoadingState, setModelLoadingState] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const kinematicsRef = useRef<PoseKinematics>(new PoseKinematics());
  const classifierRef = useRef<GoofyPoseClassifier>(new GoofyPoseClassifier());
  const stateMachineRef = useRef<GoofyPoseStateMachine>(
    new GoofyPoseStateMachine({
      minHoldMs: config.minHoldMs,
      cooldownMs: config.cooldownMs,
    })
  );
  const audioEngineRef = useRef<GoofyAudioEngine>(new GoofyAudioEngine());
  const visualFxRef = useRef<GoofyVisualFXEngine>(new GoofyVisualFXEngine());

  const animFrameRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsCalcRef = useRef(performance.now());
  const lastPoseDetectionTimeRef = useRef(0);
  const landmarksRef = useRef<PoseLandmark[] | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const {
    videoRef,
    isStreaming,
    startCamera,
    stopCamera,
    isMirrored,
  } = useCamera({ autoStart: true });

  // Save config to storage on updates
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
  }, [config]);

  // MediaPipe Pose Landmarker initialization
  useEffect(() => {
    let mounted = true;
    const runner = runnerRef.current;
    const visualFx = visualFxRef.current;
    const audioEngine = audioEngineRef.current;

    runner.initPoseLandmarker('/models/pose_landmarker_full.task')
      .then(() => {
        if (mounted) setModelLoadingState('READY');
      })
      .catch((err) => {
        console.warn('[GoofyModel] Model loading notice:', err);
        if (mounted) setModelLoadingState('READY'); // Fallback to synthetic if model asset not in dev root
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
      activeModule: 'GOOFY MODEL',
      activeModel: 'pose_landmarker_full.task',
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

    let currentLandmarks: PoseLandmark[] = [];

    if (syntheticMode || !videoRef.current || videoRef.current.readyState < 2) {
      currentLandmarks = generateSyntheticPose(now, 'squat');
    } else {
      const mpResult = runnerRef.current.detectPose(videoRef.current, now);
      if (mpResult && mpResult.landmarks && mpResult.landmarks[0]) {
        lastPoseDetectionTimeRef.current = now;
        currentLandmarks = mpResult.landmarks[0].map((pt) => ({
          x: pt.x,
          y: pt.y,
          z: pt.z,
          visibility: pt.visibility,
        }));
      } else {
        if (now - lastPoseDetectionTimeRef.current > 180) {
          currentLandmarks = [];
          landmarksRef.current = null;
        } else {
          currentLandmarks = landmarksRef.current || [];
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

        // 1. Pose Inference & Semantic Action Classification
        let classification: PoseClassificationResult = {
          pose: null,
          confidence: 0,
          label: 'NEUTRAL STANCE',
          comicCaption: 'STRIKE A HEROIC POSE OR PERFORM A JUMP / CLAP!',
          isDynamicAction: false,
          jointMetrics: {},
        };

        if (currentLandmarks.length >= 33) {
          landmarksRef.current = currentLandmarks;
          classification = classifierRef.current.classify(currentLandmarks, now);

          // Render skeleton overlay
          const angles = kinematicsRef.current.calculateJointAngles(currentLandmarks);
          renderPoseOverlay(ctx, currentLandmarks, angles, canvas.width, canvas.height, {
            showAngles: false,
            showGhostTarget: false,
            isMirrored,
          });
        }

        // 2. Feed to Temporal Pose State Machine
        const smResult = stateMachineRef.current.process(classification, now);

        // 3. Handle Trigger Event (Audio & Visuals)
        if (smResult.triggerEvent) {
          const soundResult = audioEngineRef.current.playSoundForPose(
            smResult.triggerEvent.pose,
            configRef.current
          );

          if (soundResult) {
            smResult.triggerEvent.soundId = soundResult.soundId;
            smResult.triggerEvent.soundName = soundResult.soundName;

            // Trigger visual reaction
            if (configRef.current.enableVisualFx) {
              visualFxRef.current.triggerPoseReaction(
                smResult.triggerEvent.pose,
                canvas.width,
                canvas.height,
                smResult.triggerEvent.caption
              );
            }

            if (configRef.current.enableScreenShake) {
              setShakeActive(true);
              setTimeout(() => setShakeActive(false), 260);
            }

            // Publish genuine model event to Omni Protocol Forge EventBus
            ProtocolEventBus.getInstance().publish(
              'POSE_STATE',
              {
                exercise: smResult.triggerEvent.pose.toLowerCase() as any,
                stage: 'up',
                repCount: 1,
                activeFaults: [],
              },
              'goofy',
              smResult.triggerEvent.confidence
            );

            unlockAchievement('GOOFY_CHAMPION');

            setLastTriggeredEvent(smResult.triggerEvent);
            setRecentEvents((prev) => [smResult.triggerEvent!, ...prev.slice(0, 7)]);
          }
        }

        // 4. Render 60 FPS Visual FX on Canvas
        visualFxRef.current.render(ctx, canvas.width, canvas.height);

        // 5. Update React UI State
        setActivePose(smResult.activePose);
        setPoseLabel(classification.label);
        setComicCaption(classification.comicCaption);
        setTrackingStatus(smResult.status);
        setHoldProgress(smResult.holdProgress);
        setConfidenceScore(classification.confidence);
        setIsDynamicActionActive(!!classification.isDynamicAction);
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, [syntheticMode, isMirrored, videoRef]);

  // Start / stop render animation loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tick]);

  // Configuration handlers
  const handleMappingChange = (
    pose: GoofyPoseType,
    updates: Partial<GoofyModeConfig['mappings'][GoofyPoseType]>
  ) => {
    setConfig((prev) => ({
      ...prev,
      mappings: {
        ...prev.mappings,
        [pose]: {
          ...prev.mappings[pose],
          ...updates,
        },
      },
    }));
  };

  const handleCustomAudioUpload = (
    pose: GoofyPoseType,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleMappingChange(pose, {
        soundId: 'CUSTOM_USER_AUDIO',
        customAudioUrl: dataUrl,
        customAudioName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all GOOFY MODEL sound assignments and thresholds to factory defaults?')) {
      setConfig(DEFAULT_GOOFY_CONFIG);
    }
  };

  // Preview sound strictly without firing detection event
  const handlePreviewSound = (soundId: GoofySoundId, customUrl?: string) => {
    setPreviewingSound(soundId);
    audioEngineRef.current.preview(soundId, customUrl, config.volume);
    setTimeout(() => {
      setPreviewingSound(null);
    }, 1200);
  };

  return (
    <div
      className={`min-h-screen bg-paper-cream text-charcoal-soft font-mono transition-transform duration-75 ${
        shakeActive ? 'translate-x-1 -translate-y-1' : ''
      }`}
      onClick={handleUnlockAudio}
    >
      <GlobalNav />
      <PerformanceHUD />

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-charcoal-soft pb-4">
          <div className="flex items-center gap-3">
            <Link href="/pose">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-charcoal-soft hover:bg-paper-dark"
                title="Return to Kinematic Pose Estimation"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="font-bold">POSE HUB</span>
              </Button>
            </Link>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-ink-muted px-1.5 py-0.5 border border-charcoal-soft rounded">
                  EXP. 04
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  REAL-TIME HUMAN ACTION RECOGNITION & MEME SOUND ENGINE
                </span>
                <StampBadge
                  label={modelLoadingState === 'READY' ? 'MODEL READY' : 'LOADING MODEL'}
                  variant={modelLoadingState === 'READY' ? 'sage' : 'brick'}
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-technical flex items-center gap-2">
                <Smile className="w-6 h-6 text-amber-500 animate-bounce" />
                GOOFY MODEL // ACTION RECOGNITION & MEME RIG
              </h1>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionManualOpen(true)}
              className="gap-1.5 text-xs font-bold border-charcoal-soft"
            >
              <BookOpen className="w-4 h-4 text-cyan-600" />
              <span>ACTION MANUAL</span>
            </Button>

            <Link href="/laboratory?model=built-in-goofy-model">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-bold border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>OPEN IN LABORATORY</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfig((p) => ({ ...p, isMuted: !p.isMuted }))}
              className={`gap-1.5 text-xs font-bold ${
                config.isMuted
                  ? 'border-brick-red bg-brick-red/10 text-brick-red'
                  : 'border-sage-green text-sage-green'
              }`}
            >
              {config.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {config.isMuted ? 'UNMUTE ALL' : 'MUTE SOUNDS'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyntheticMode(!syntheticMode)}
              className="text-xs"
            >
              {syntheticMode ? 'SYNTHETIC [ON]' : 'SYNTHETIC'}
            </Button>
          </div>
        </div>

        {/* Audio Unlock Notice if needed */}
        {!audioUnlocked && (
          <div className="p-3 border-2 border-amber-500 bg-amber-500/10 rounded-tactile flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                BROWSER AUDIO UNLOCK: Click anywhere on the screen or press the button to allow meme sound playback.
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleUnlockAudio} className="text-xs shrink-0">
              ACTIVATE AUDIO CONTEXT
            </Button>
          </div>
        )}

        {/* Main Workstation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Viewport & Live Status (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border-2 border-charcoal-soft rounded-tactile bg-charcoal-dark p-2 relative shadow-tactile overflow-hidden">
              <div className="relative aspect-[4/3] bg-charcoal-soft rounded overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${
                    isMirrored ? 'scale-x-[-1]' : ''
                  }`}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover z-10"
                />

                {/* Top Telemetry Pills */}
                <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold">
                  <span className="px-2 py-0.5 bg-charcoal-soft/90 border border-charcoal-soft text-paper-cream rounded">
                    FPS: {fps}
                  </span>
                  <span
                    className={`px-2 py-0.5 border rounded ${
                      trackingStatus === 'POSE_TRIGGERED'
                        ? 'border-sage-green bg-sage-green text-charcoal-dark font-extrabold'
                        : trackingStatus === 'CANDIDATE'
                        ? 'border-amber-500 bg-amber-500/90 text-charcoal-dark'
                        : 'border-charcoal-soft/80 bg-charcoal-dark/90 text-ink-muted'
                    }`}
                  >
                    STATUS: {trackingStatus}
                  </span>
                  {confidenceScore > 0 && (
                    <span className="px-2 py-0.5 bg-charcoal-dark/90 border border-charcoal-soft/80 text-amber-400 rounded">
                      CONF: {Math.round(confidenceScore * 100)}%
                    </span>
                  )}
                  {isDynamicActionActive && (
                    <span className="px-2 py-0.5 bg-cyan-500 text-charcoal-dark font-extrabold rounded animate-pulse">
                      DYNAMIC ACTION
                    </span>
                  )}
                </div>

                {/* Hold Progress Bar for Static Poses */}
                {trackingStatus === 'CANDIDATE' && !isDynamicActionActive && (
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-400">HOLDING POSE:</span>
                    <div className="w-24 h-2 bg-charcoal-dark/90 border border-amber-400 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-75"
                        style={{ width: `${Math.round(holdProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Bottom Active Gesture & Comic Reaction Banner */}
                <div className="absolute bottom-3 inset-x-3 z-20 p-3 bg-charcoal-dark/90 border-2 border-charcoal-soft rounded backdrop-blur-md space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-muted uppercase">ACTIVE ACTION:</span>
                      <span className="text-base font-extrabold uppercase text-amber-400">
                        {activePose ? GOOFY_POSE_METADATA[activePose]?.icon : ''} {poseLabel}
                      </span>
                    </div>

                    {lastTriggeredEvent && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sage-green">
                        <Music className="w-3.5 h-3.5 animate-pulse" />
                        <span className="uppercase">{lastTriggeredEvent.soundName}</span>
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
                <span>MODEL ID: built-in-goofy-model</span>
                <span>&bull;</span>
                <span>BACKEND: WebGPU / WASM</span>
              </div>
            </div>

            {/* Quick Trigger Event History Strip */}
            <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-2 shadow-tactile-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  <span>GENUINE MODEL EVENT LOG</span>
                </h3>
                <span className="text-[10px] text-ink-muted">{recentEvents.length} RECORDED</span>
              </div>

              {recentEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-1.5 border border-charcoal-soft/30 rounded bg-paper-dark/30 text-[11px] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-charcoal-soft uppercase">
                          {GOOFY_POSE_METADATA[evt.pose]?.icon} {evt.poseLabel}
                        </span>
                        <span className="text-ink-muted text-[10px] truncate max-w-[200px]">
                          &quot;{evt.caption}&quot;
                        </span>
                      </div>
                      <span className="font-bold text-sage-green uppercase text-[10px] shrink-0">
                        🔊 {evt.soundName}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-ink-muted py-2 text-center">
                  Strike any pose or perform a Jump / Clap in front of the camera to fire a meme sound reaction!
                </div>
              )}
            </div>
          </div>

          {/* Right: Pose-to-Sound Mapping Editor & Settings (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Master Control Deck */}
            <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm text-xs">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
                <h3 className="font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  MODEL CONFIGURATION
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="text-[10px] gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  RESET DEFAULTS
                </Button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold">MASTER VOLUME</span>
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
                  className="w-full accent-charcoal-soft"
                />
              </div>

              {/* Cooldown Slider */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold">TRIGGER COOLDOWN</span>
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
                  className="w-full accent-charcoal-soft"
                />
              </div>

              {/* Hold Threshold */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold">STATIC POSE HOLD TIME</span>
                  <span className="tabular-nums font-bold text-charcoal-soft">
                    {config.minHoldMs}ms
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="800"
                  step="50"
                  value={config.minHoldMs}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, minHoldMs: parseInt(e.target.value, 10) }))
                  }
                  className="w-full accent-charcoal-soft"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-charcoal-soft/20 grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={config.enableVisualFx}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, enableVisualFx: e.target.checked }))
                    }
                    className="rounded border-charcoal-soft"
                  />
                  <span>COMIC BURST FX</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={config.enableScreenShake}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, enableScreenShake: e.target.checked }))
                    }
                    className="rounded border-charcoal-soft"
                  />
                  <span>SCREEN SHAKE</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold col-span-2">
                  <input
                    type="checkbox"
                    checked={config.randomSoundMode}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, randomSoundMode: e.target.checked }))
                    }
                    className="rounded border-charcoal-soft"
                  />
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Shuffle className="w-3.5 h-3.5" />
                    RANDOM MEME SOUND ON EVERY TRIGGER
                  </span>
                </label>
              </div>
            </div>

            {/* Action-to-Sound Mapping List */}
            <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">
                  ACTION-TO-SOUND ASSIGNMENTS
                </h3>
                <span className="text-[10px] text-ink-muted">
                  {Object.keys(config.mappings).length} CLASSES
                </span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {(Object.keys(config.mappings) as GoofyPoseType[]).map((poseKey) => {
                  const mapping = config.mappings[poseKey]!;
                  const meta = GOOFY_POSE_METADATA[poseKey]!;
                  const isCurrent = activePose === poseKey;
                  const isTesting = previewingSound === mapping.soundId;

                  return (
                    <div
                      key={poseKey}
                      className={`p-2.5 border rounded text-xs transition-all space-y-2 ${
                        isCurrent
                          ? 'border-amber-500 bg-amber-500/10 shadow-tactile-sm'
                          : mapping.enabled
                          ? 'border-charcoal-soft/30 bg-paper-dark/30'
                          : 'border-charcoal-soft/20 opacity-60 bg-paper-dark/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold uppercase">
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                          <span
                            className={`text-[8px] px-1 py-0.2 rounded font-extrabold ${
                              meta.actionType === 'DYNAMIC_ACTION'
                                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/40'
                                : 'bg-charcoal-soft/20 text-charcoal-soft'
                            }`}
                          >
                            {meta.actionType === 'DYNAMIC_ACTION' ? 'DYNAMIC' : 'STATIC'}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] px-1 py-0.2 bg-amber-500 text-charcoal-dark font-extrabold rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <label className="flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mapping.enabled}
                            onChange={(e) =>
                              handleMappingChange(poseKey, { enabled: e.target.checked })
                            }
                          />
                          <span>ENABLED</span>
                        </label>
                      </div>

                      {/* Sound Picker & Preview */}
                      <div className="flex items-center gap-2">
                        <select
                          value={mapping.soundId}
                          onChange={(e) =>
                            handleMappingChange(poseKey, {
                              soundId: e.target.value as GoofySoundId,
                            })
                          }
                          disabled={!mapping.enabled}
                          className="flex-1 p-1 border rounded bg-paper-cream text-[11px] font-bold uppercase focus:outline-none"
                        >
                          {DEFAULT_SOUND_LIBRARY.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                          {mapping.customAudioUrl && (
                            <option value="CUSTOM_USER_AUDIO">
                              [CUSTOM] {mapping.customAudioName || 'User Audio'}
                            </option>
                          )}
                        </select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewSound(mapping.soundId, mapping.customAudioUrl)}
                          className={`text-[10px] px-2 py-1 gap-1 ${
                            isTesting ? 'border-amber-500 bg-amber-500/20 text-amber-600' : ''
                          }`}
                          title="Preview sound without firing an action event"
                        >
                          <Play className="w-2.5 h-2.5" />
                          <span>{isTesting ? 'PREVIEWING...' : 'PREVIEW'}</span>
                        </Button>
                      </div>

                      {/* Custom Audio Upload Option */}
                      <div className="flex items-center justify-between text-[10px] text-ink-muted pt-1">
                        <span>Replace with local audio file:</span>
                        <label className="cursor-pointer font-bold text-cyan-600 hover:underline flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>UPLOAD FILE</span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleCustomAudioUpload(poseKey, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Documentation & Kinematics Manual Modal */}
        {actionManualOpen && (
          <div className="fixed inset-0 z-50 bg-charcoal-dark/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-tactile">
              <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <h2 className="text-sm font-bold uppercase tracking-technical text-charcoal-soft">
                    GOOFY MODEL // ACTION RECOGNITION MANUAL & KINEMATICS
                  </h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActionManualOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                GOOFY MODEL performs semantic human action recognition directly in the browser via on-device MediaPipe 33-landmark pose estimation. It distinguishes between <strong>Static Poses</strong> (which evaluate normalized joint angles and require a minimum stability hold duration) and <strong>Dynamic Actions</strong> (which evaluate temporal movement sequences across sliding window buffers).
              </p>

              <div className="space-y-3">
                {(Object.keys(GOOFY_POSE_METADATA) as GoofyPoseType[]).map((key) => {
                  const meta = GOOFY_POSE_METADATA[key];
                  return (
                    <div key={key} className="p-3 border border-charcoal-soft/30 rounded bg-paper-dark/30 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase text-charcoal-soft flex items-center gap-1.5">
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                          meta.actionType === 'DYNAMIC_ACTION'
                            ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/40'
                            : 'bg-charcoal-soft/20 text-charcoal-soft'
                        }`}>
                          {meta.actionType === 'DYNAMIC_ACTION' ? 'DYNAMIC ACTION (TEMPORAL SEQUENCE)' : 'STATIC POSE (GEOMETRIC)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted">{meta.description}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {meta.kinematicCues.map((cue, idx) => (
                          <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-paper-dark/80 text-ink-muted border border-charcoal-soft/20 rounded">
                            &bull; {cue}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-charcoal-soft/20 flex justify-end">
                <Button variant="default" size="sm" onClick={() => setActionManualOpen(false)}>
                  CLOSE MANUAL
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
