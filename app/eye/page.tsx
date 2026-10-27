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
import { PupillometryAnalyzer } from '@/modules/eye/pupillometry';
import { EyeRenderer } from '@/modules/eye/eye-renderer';
import { generateSyntheticEyeLandmarks } from '@/modules/eye/synthetic-eye';
import { BilateralMetrics, EyeTrackingConfig, Point3D } from '@/modules/eye/types';
import { useSystemStore } from '@/core/store';
import {
  Eye,
  Activity,
  Zap,
  Download,
  Video,
  VideoOff,
  Sparkles,
  Sliders,
  Flame,
  ShieldAlert,
  Crosshair,
  FlipHorizontal,
  CheckCircle2,
  MousePointer,
  Target,
  Hand,
  Compass,
} from 'lucide-react';
import {
  HeatVisionRenderer,
  HeatVisionConfig,
  DEFAULT_HEAT_VISION_CONFIG,
} from '@/modules/easter-eggs/heat-vision-renderer';
import { HeatVisionAudioSynthesizer } from '@/modules/easter-eggs/heat-vision-audio';
import { HeatVisionControls } from '@/components/easter-eggs/HeatVisionControls';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';
import {
  GazeCalibrationEngine,
  extractGazeFeatures,
} from '@/modules/gaze/calibration';
import {
  GazeCursorController,
  GazeCursorState,
} from '@/modules/gaze/gaze-cursor-controller';
import {
  GazeCursorConfig,
  DEFAULT_GAZE_CURSOR_CONFIG,
} from '@/modules/gaze/types';
import { GazeCursorOverlay } from '@/components/gaze/GazeCursorOverlay';
import { GazeCalibrationModal } from '@/components/gaze/GazeCalibrationModal';

export default function EyeTrackingPage() {
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [modelBackend, setModelBackend] = useState('INITIALIZING...');
  const [discoveredHeatVision, setDiscoveredHeatVision] = useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);

  // Eye Tracking Display Configuration
  const [config, setConfig] = useState<EyeTrackingConfig>({
    showIrisContours: true,
    showGazeVectors: true,
    showPupilWaveform: true,
    smoothingBeta: 0.01,
    canonicalIrisDiameterMm: 11.7,
    isMirrored: true,
    aimMode: 'GAZE_VECTOR',
    manualTarget: { x: 320, y: 240 },
  });

  const configRef = useRef<EyeTrackingConfig>(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Gaze Cursor Configuration & Controller
  const [gazeCursorConfig, setGazeCursorConfig] = useState<GazeCursorConfig>(
    DEFAULT_GAZE_CURSOR_CONFIG
  );
  const gazeCursorConfigRef = useRef<GazeCursorConfig>(DEFAULT_GAZE_CURSOR_CONFIG);
  useEffect(() => {
    gazeCursorConfigRef.current = gazeCursorConfig;
    cursorControllerRef.current.updateConfig(gazeCursorConfig);
  }, [gazeCursorConfig]);

  const calibrationEngineRef = useRef<GazeCalibrationEngine>(new GazeCalibrationEngine());
  const cursorControllerRef = useRef<GazeCursorController>(new GazeCursorController());

  const [cursorState, setCursorState] = useState<GazeCursorState>({
    x: 0,
    y: 0,
    rawX: 0,
    rawY: 0,
    normX: 0.5,
    normY: 0.5,
    isTracking: false,
    isCalibrated: false,
    isFixating: true,
    velocityPxSec: 0,
    dwellProgress: 0,
    dwellTargetName: null,
    dwellLocked: false,
    trail: [],
    lastUpdateTime: 0,
  });

  const analyzerRef = useRef<PupillometryAnalyzer>(new PupillometryAnalyzer());
  const [metrics, setMetrics] = useState<BilateralMetrics>(() =>
    analyzerRef.current.generateIdleMetrics()
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const taskRunnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const rendererRef = useRef<EyeRenderer>(new EyeRenderer());
  const lastUiUpdateRef = useRef<number>(0);

  // Status badge multi-click Easter egg trigger
  const badgeClickCountRef = useRef<number>(0);
  const lastBadgeClickRef = useRef<number>(0);

  // Heat Vision Apex Override State & Audio Synthesizer
  const [heatVisionConfig, setHeatVisionConfig] = useState<HeatVisionConfig>(
    DEFAULT_HEAT_VISION_CONFIG
  );
  const heatVisionConfigRef = useRef<HeatVisionConfig>(DEFAULT_HEAT_VISION_CONFIG);
  useEffect(() => {
    heatVisionConfigRef.current = heatVisionConfig;
  }, [heatVisionConfig]);

  const heatVisionRendererRef = useRef<HeatVisionRenderer>(new HeatVisionRenderer());
  const heatVisionAudioRef = useRef<HeatVisionAudioSynthesizer>(
    new HeatVisionAudioSynthesizer()
  );

  // Double blink detection state
  const blinkHistoryRef = useRef<number[]>([]);
  const lastDoubleBlinkTriggerRef = useRef<number>(0);

  // Load secret discovery state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('omni-heat-vision-discovered');
      if (stored === 'true') {
        setDiscoveredHeatVision(true);
      }
    }
  }, []);

  const triggerHeatVisionToggle = useCallback((source: string) => {
    setHeatVisionConfig((prev) => {
      const next = !prev.enabled;
      if (next) {
        unlockAchievement('HEAT_SIGNATURE');
        if (typeof window !== 'undefined') {
          localStorage.setItem('omni-heat-vision-discovered', 'true');
          setDiscoveredHeatVision(true);
        }
      }
      return { ...prev, enabled: next };
    });
  }, []);

  // Synchronize procedural laser sound
  useEffect(() => {
    if (heatVisionConfig.enabled && heatVisionConfig.soundEnabled) {
      heatVisionAudioRef.current.setMuted(false);
      heatVisionAudioRef.current.start();
      heatVisionAudioRef.current.updateIntensity(heatVisionConfig.intensity);
    } else {
      heatVisionAudioRef.current.stop();
    }
  }, [heatVisionConfig.enabled, heatVisionConfig.soundEnabled, heatVisionConfig.intensity]);

  useEffect(() => {
    return () => {
      heatVisionAudioRef.current.dispose();
    };
  }, []);

  // Keyboard shortcut listener ('V' for Heat Vision, 'C' for Gaze Cursor)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        triggerHeatVisionToggle('KEYBOARD_V');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setGazeCursorConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerHeatVisionToggle]);

  const { videoRef, isStreaming, startCamera, stopCamera, errorMessage } = useCamera({
    autoStart: true,
  });

  // Initialize MediaPipe FaceLandmarker with cleanup
  useEffect(() => {
    let unmounted = false;
    taskRunnerRef.current.initFaceLandmarker().then((success) => {
      if (!unmounted) {
        setModelBackend(
          success
            ? `MEDIAPIPE (${taskRunnerRef.current.getBackend()})`
            : 'SYNTHETIC FALLBACK'
        );
      }
    });

    return () => {
      unmounted = true;
      taskRunnerRef.current.dispose();
    };
  }, []);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'FIG. 08 — BILATERAL EYE & IRIS TRACKING',
      activeModel: 'face_landmarker.task',
      fps: 30,
      p50Ms: 14,
      p95Ms: 20,
      trackingStatus: isStreaming ? 'TRACKING_ACTIVE' : 'SEARCHING',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [isStreaming, setPerfStats]);

  // Handle manual reticle aiming by tracking pointer movements over viewport
  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (config.aimMode !== 'MANUAL_RETICLE') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const target = { x: Math.max(0, Math.min(canvas.width, x)), y: Math.max(0, Math.min(canvas.height, y)) };
    setConfig((prev) => ({ ...prev, manualTarget: target }));
    setHeatVisionConfig((prev) => ({ ...prev, manualTarget: target }));
  };

  // Status badge multi-click handler (Easter Egg trigger)
  const handleStatusBadgeClick = () => {
    const now = performance.now();
    if (now - lastBadgeClickRef.current > 1800) {
      badgeClickCountRef.current = 0;
    }
    lastBadgeClickRef.current = now;
    badgeClickCountRef.current += 1;

    if (badgeClickCountRef.current >= 5) {
      badgeClickCountRef.current = 0;
      triggerHeatVisionToggle('BADGE_5_CLICKS');
    }
  };

  // Main Tracking & Rendering Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const now = performance.now();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const width = canvas?.width || 640;
      const height = canvas?.height || 480;

      let landmarks: Point3D[] | null = null;

      if (!syntheticMode && videoRef.current && videoRef.current.readyState >= 2) {
        const faceResult = taskRunnerRef.current.detectFace(videoRef.current, now);
        if (faceResult && faceResult.faceLandmarks && faceResult.faceLandmarks[0]) {
          landmarks = faceResult.faceLandmarks[0] as Point3D[];
        }
      }

      if (!landmarks && (syntheticMode || !isStreaming)) {
        landmarks = generateSyntheticEyeLandmarks(now);
      }

      const currentConfig = configRef.current;
      const currentHeatConfig = heatVisionConfigRef.current;

      if (landmarks) {
        const currentMetrics = analyzerRef.current.process(landmarks, now);
        const pupilHistory = analyzerRef.current.getPupilHistory();

        // Extract high-precision gaze features for calibration & live cursor
        const gazeFeatures = extractGazeFeatures(landmarks, currentConfig.isMirrored);

        // Feed calibration engine if calibration is actively in progress
        if (calibrationModalOpen && gazeFeatures) {
          calibrationEngineRef.current.addSample(gazeFeatures, now);
        }

        // Process live Gaze Cursor across full viewport
        const vpWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const vpHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const liveCursorState = cursorControllerRef.current.process(
          gazeFeatures,
          calibrationEngineRef.current,
          vpWidth,
          vpHeight,
          now
        );

        // Secret Easter Egg: Intentional double-blink detection (with 3.5s cooldown)
        if (
          currentMetrics.leftEye.state === 'BLINKING' &&
          currentMetrics.rightEye.state === 'BLINKING'
        ) {
          const hist = blinkHistoryRef.current;
          const lastBlink = hist[hist.length - 1] || 0;
          if (now - lastBlink > 200) {
            hist.push(now);
            if (hist.length >= 2) {
              const prevBlink = hist[hist.length - 2]!;
              if (now - prevBlink < 650 && now - lastDoubleBlinkTriggerRef.current > 3500) {
                lastDoubleBlinkTriggerRef.current = now;
                unlockAchievement('DOUBLE_TAKE');
                triggerHeatVisionToggle('DOUBLE_BLINK');
                blinkHistoryRef.current = [];
              }
            }
          }
        }

        // Render Ocular Contours, Irises, Reticle, and Waveform
        if (ctx) {
          rendererRef.current.render(
            ctx,
            width,
            height,
            landmarks,
            currentMetrics,
            pupilHistory,
            currentConfig
          );

          // Render Homelander Heat Vision if engaged
          if (currentHeatConfig.enabled) {
            const isMirrored = currentConfig.isMirrored;
            const toScreenX = (normX: number) =>
              isMirrored ? (1 - normX) * width : normX * width;
            const toScreenY = (normY: number) => normY * height;

            // Only track iris center if that specific eye is active (NOT occluded)
            const leftIris =
              currentMetrics.leftEye.state === 'TRACKING' && landmarks[473]
                ? {
                    x: toScreenX(landmarks[473].x),
                    y: toScreenY(landmarks[473].y),
                  }
                : null;

            const rightIris =
              currentMetrics.rightEye.state === 'TRACKING' && landmarks[468]
                ? {
                    x: toScreenX(landmarks[468].x),
                    y: toScreenY(landmarks[468].y),
                  }
                : null;

            // Compute target point for gaze vector
            let targetPoint: { x: number; y: number } | null = null;
            if (currentHeatConfig.aimMode === 'MANUAL_RETICLE' && currentConfig.manualTarget) {
              targetPoint = currentConfig.manualTarget;
            } else if (leftIris || rightIris) {
              // Gaze vector targeting: use the calibrated viewport gaze estimate mapped to preview canvas!
              targetPoint = {
                x: liveCursorState.normX * width,
                y: liveCursorState.normY * height,
              };
            }

            heatVisionRendererRef.current.render(
              ctx,
              width,
              height,
              leftIris,
              rightIris,
              targetPoint,
              currentHeatConfig,
              now
            );
          }
        }

        // Throttle React state update to 12 Hz (every 80ms)
        if (now - lastUiUpdateRef.current >= 80) {
          lastUiUpdateRef.current = now;
          setMetrics(currentMetrics);
          setCursorState(liveCursorState);
        }
      } else if (ctx) {
        ctx.clearRect(0, 0, width, height);
      }

      requestAnimationFrame(tick);
    };

    const handle = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(handle);
    };
  }, [syntheticMode, isStreaming, videoRef, calibrationModalOpen, triggerHeatVisionToggle]);

  const exportSessionJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      module: 'FIG. 08 — BILATERAL EYE & IRIS TRACKING',
      metrics,
      cursorState,
      calibrationAccuracy: calibrationEngineRef.current.getAccuracy(),
      pupilHistory: analyzerRef.current.getPupilHistory(),
      saccades: analyzerRef.current.getRecentSaccades(),
      config,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omni-loco-bilateral-eye-${Date.now()}.json`;
    a.click();
    a.remove();
  };

  const getStatusBadgeVariant = (status: string): 'sage' | 'brick' | 'charcoal' | 'ink' => {
    switch (status) {
      case 'BILATERAL_LOCKED':
      case 'TRACKING':
        return 'sage';
      case 'BLINKING':
      case 'UNILATERAL_LEFT':
      case 'UNILATERAL_RIGHT':
        return 'ink';
      case 'OCCLUDED':
        return 'brick';
      default:
        return 'charcoal';
    }
  };

  const accuracy = calibrationEngineRef.current.getAccuracy();
  const isCalibrated = calibrationEngineRef.current.isReady();

  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream">
      <GlobalNav />
      <PerformanceHUD />

      {/* Global Viewport Gaze Cursor Overlay */}
      <GazeCursorOverlay cursorState={cursorState} config={gazeCursorConfig} />

      {/* 9-Point Gaze Calibration Modal */}
      <GazeCalibrationModal
        isOpen={calibrationModalOpen}
        engine={calibrationEngineRef.current}
        onClose={() => setCalibrationModalOpen(false)}
        onCalibrationComplete={() => {
          setGazeCursorConfig((prev) => ({ ...prev, enabled: true }));
        }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                OCULAR BIOMETRICS // FIG. 08
              </span>
              <StampBadge label="BILATERAL IRIS TRACKING" variant="sage" />
              <StampBadge label={`VISION: ${modelBackend}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              FIG. 08 — BILATERAL EYE &amp; IRIS TRACKING
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Anatomical bilateral tracking of Oculus Sinister (OS) &amp; Oculus Dexter (OD) with calibrated viewport gaze cursor, dwell interaction, and synchronized Heat Vision aiming.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Gaze Cursor Toggle Button */}
            <button
              onClick={() =>
                setGazeCursorConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className={`px-3 py-1 text-xs font-bold font-mono uppercase border-2 rounded-tactile flex items-center gap-1.5 transition-all ${
                gazeCursorConfig.enabled
                  ? 'border-sage-green bg-sage-green/20 text-charcoal-soft shadow-tactile-sm'
                  : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark'
              }`}
              title="Toggle Live Viewport Gaze Cursor [Shortcut: C]"
            >
              <MousePointer className="w-3.5 h-3.5 text-sage-green" />
              <span>{gazeCursorConfig.enabled ? 'GAZE CURSOR: ON [C]' : 'GAZE CURSOR [C]'}</span>
            </button>

            {/* 9-Point Calibration Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCalibrationModalOpen(true);
                calibrationEngineRef.current.startCalibration();
              }}
              className="gap-1.5"
            >
              <Target className="w-3.5 h-3.5 text-brick-red" />
              <span>{isCalibrated ? 'RECALIBRATE [9-PT]' : 'CALIBRATE GAZE'}</span>
            </Button>

            {/* Heat Vision Apex Override Button */}
            <button
              onClick={() => triggerHeatVisionToggle('HEADER_BUTTON')}
              className={`px-3 py-1 text-xs font-bold font-mono uppercase border-2 rounded-tactile flex items-center gap-1.5 transition-all ${
                heatVisionConfig.enabled
                  ? 'border-brick-red bg-brick-red text-white shadow-[0_0_15px_rgba(255,42,16,0.5)] animate-pulse'
                  : discoveredHeatVision
                  ? 'border-brick-red text-brick-red hover:bg-brick-red/10'
                  : 'border-charcoal-soft text-ink-muted hover:border-brick-red hover:text-brick-red opacity-80'
              }`}
              title="Toggle Secret Homelander Heat Vision [Shortcut: V]"
            >
              <Flame className="w-3.5 h-3.5 text-brick-red" />
              <span>
                {heatVisionConfig.enabled
                  ? 'HEAT VISION: ENGAGED [V]'
                  : discoveredHeatVision
                  ? 'HEAT VISION [V]'
                  : 'OVERRIDE [V]'}
              </span>
            </button>

            <Link href="/gaze">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sage-green" />
                <span>GAZE HEATMAP &rarr;</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={exportSessionJSON} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT JSON</span>
            </Button>
            <Button
              variant={syntheticMode ? 'brick' : 'outline'}
              size="sm"
              onClick={() => setSyntheticMode(!syntheticMode)}
              className="gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{syntheticMode ? 'SYNTHETIC' : 'SYNTHETIC MODE'}</span>
            </Button>
            <Button
              variant={isStreaming ? 'outline' : 'default'}
              size="sm"
              onClick={() => (isStreaming ? stopCamera() : startCamera())}
              className="gap-1.5"
            >
              {isStreaming ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span>{isStreaming ? 'PAUSE CAM' : 'ACTIVATE CAM'}</span>
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>HARDWARE NOTICE: {errorMessage}</span>
          </div>
        )}

        {/* Primary Viewport & Instrumentation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div
              ref={viewportContainerRef}
              onPointerMove={handleViewportPointerMove}
              className="relative aspect-[4/3] w-full border-2 border-charcoal-soft rounded-tactile overflow-hidden bg-paper-dark shadow-tactile-lg select-none"
            >
              {/* Underlying Camera Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                  syntheticMode ? 'hidden' : 'block'
                } ${config.isMirrored ? 'scale-x-[-1]' : ''}`}
              />

              {/* High-Precision Ocular Tracking Canvas */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
              />

              {/* Top Viewport Status Stamps */}
              <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleStatusBadgeClick}
                  className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
                  title="Tracking State Stamp (Hint: Click 5x for Easter Egg)"
                >
                  <StampBadge
                    label={`SYSTEM: ${metrics.overallStatus}`}
                    variant={getStatusBadgeVariant(metrics.overallStatus)}
                  />
                </button>
                <StampBadge
                  label={metrics.isFixating ? 'FIXATION LOCKED' : 'SACCADIC BURST'}
                  variant={metrics.isFixating ? 'sage' : 'brick'}
                />
                <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-cream/90 border border-charcoal-soft rounded-[2px] text-charcoal-soft">
                  CANONICAL REF: 11.7 MM
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-cream/90 border border-charcoal-soft rounded-[2px] text-ink-muted">
                  {config.isMirrored ? 'VIEW: MIRRORED (SELFIE)' : 'VIEW: SENSOR RAW'}
                </span>
              </div>

              {/* Heat Vision Controls Drawer */}
              <HeatVisionControls
                config={heatVisionConfig}
                onChange={setHeatVisionConfig}
                onDisengage={() =>
                  setHeatVisionConfig((prev) => ({ ...prev, enabled: false }))
                }
                onReset={() =>
                  setHeatVisionConfig({ ...DEFAULT_HEAT_VISION_CONFIG, enabled: true })
                }
              />
            </div>

            {/* Viewport Display Controls Toolbar */}
            <div className="p-3 border border-charcoal-soft bg-paper-cream-dark/40 rounded-tactile flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-ink-muted flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-charcoal-soft" />
                OVERLAY CONTROLS:
              </span>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.isMirrored}
                    onChange={(e) => setConfig({ ...config, isMirrored: e.target.checked })}
                    className="accent-charcoal-soft"
                  />
                  <FlipHorizontal className="w-3 h-3 text-ink-muted" />
                  <span>MIRROR FEED</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={gazeCursorConfig.enabled}
                    onChange={(e) =>
                      setGazeCursorConfig({ ...gazeCursorConfig, enabled: e.target.checked })
                    }
                    className="accent-charcoal-soft"
                  />
                  <MousePointer className="w-3 h-3 text-sage-green" />
                  <span>GAZE CURSOR</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={gazeCursorConfig.dwellEnabled}
                    onChange={(e) =>
                      setGazeCursorConfig({ ...gazeCursorConfig, dwellEnabled: e.target.checked })
                    }
                    className="accent-charcoal-soft"
                  />
                  <Hand className="w-3 h-3 text-brick-red" />
                  <span>DWELL INTERACTION</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.showIrisContours}
                    onChange={(e) => setConfig({ ...config, showIrisContours: e.target.checked })}
                    className="accent-charcoal-soft"
                  />
                  <span>IRIS &amp; PUPILS</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.showPupilWaveform}
                    onChange={(e) => setConfig({ ...config, showPupilWaveform: e.target.checked })}
                    className="accent-charcoal-soft"
                  />
                  <span>WAVEFORM STRIP</span>
                </label>
                <button
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      aimMode: prev.aimMode === 'GAZE_VECTOR' ? 'MANUAL_RETICLE' : 'GAZE_VECTOR',
                    }))
                  }
                  className={`flex items-center gap-1 px-2 py-0.5 border rounded-[2px] text-[10px] font-bold transition-all ${
                    config.aimMode === 'MANUAL_RETICLE'
                      ? 'border-brick-red bg-brick-red/10 text-brick-red'
                      : 'border-charcoal-soft/40 text-ink-muted hover:text-charcoal-soft'
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{config.aimMode === 'MANUAL_RETICLE' ? 'RETICLE ACTIVE' : 'GAZE AIM'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Instrument Telemetry Clusters */}
          <div className="space-y-4">
            {/* FIG. 08-C — Calibrated Gaze Cursor & Dwell Control */}
            <DeskCard figure="FIG. 08-C" title="CALIBRATED GAZE POINTER &amp; DWELL CONTROL">
              <div className="space-y-3">
                {/* Real-time Viewport Coordinates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile text-center">
                    <span className="text-[10px] text-ink-muted block uppercase">VIEWPORT GAZE (X)</span>
                    <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
                      {cursorState.isTracking ? Math.round(cursorState.x) : '---'}
                    </span>
                    <span className="text-[9px] text-sage-green block mt-0.5">
                      {(cursorState.normX * 100).toFixed(1)}% WIDTH
                    </span>
                  </div>

                  <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile text-center">
                    <span className="text-[10px] text-ink-muted block uppercase">VIEWPORT GAZE (Y)</span>
                    <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
                      {cursorState.isTracking ? Math.round(cursorState.y) : '---'}
                    </span>
                    <span className="text-[9px] text-cyan-600 block mt-0.5">
                      {(cursorState.normY * 100).toFixed(1)}% HEIGHT
                    </span>
                  </div>
                </div>

                {/* Calibration Status Strip */}
                <div className="p-2.5 border border-charcoal-soft/40 bg-paper-cream rounded-[2px] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-ink-muted block uppercase">CALIBRATION ENGINE</span>
                    <span className="font-bold text-charcoal-soft flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-brick-red" />
                      {isCalibrated ? '9-POINT RIDGE REGRESSION' : 'ANATOMICAL PRIOR'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-ink-muted block uppercase">EST. RESIDUAL</span>
                    <span className="font-bold text-sage-green tabular-nums">
                      &plusmn;{accuracy.errorDeg}&deg; ({accuracy.errorPx}px)
                    </span>
                  </div>
                </div>

                {/* Saccadic Velocity & Fixation Dynamics */}
                <div className="p-2.5 border border-charcoal-soft/40 bg-paper-cream rounded-[2px] space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-muted flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-brick-red" />
                      INSTANTANEOUS SACCADE
                    </span>
                    <span className="font-bold tabular-nums text-charcoal-soft">
                      {cursorState.velocityPxSec} PX/S
                    </span>
                  </div>
                  <div className="w-full bg-paper-cream border border-charcoal-soft h-1.5 rounded-[1px] overflow-hidden">
                    <div
                      className="h-full bg-brick-red transition-all duration-75"
                      style={{
                        width: `${Math.min(100, (cursorState.velocityPxSec / 800) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Dwell Interaction Feedback */}
                <div className="p-2.5 border border-charcoal-soft/40 bg-paper-cream rounded-[2px] space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-muted flex items-center gap-1 font-bold">
                      <Hand className="w-3.5 h-3.5 text-brick-red" />
                      DWELL CLICK INTERACTION:
                    </span>
                    <span className="text-[10px] font-bold text-charcoal-soft">
                      {gazeCursorConfig.dwellEnabled ? 'ACTIVE (1.1S)' : 'DISABLED'}
                    </span>
                  </div>

                  {gazeCursorConfig.dwellEnabled && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-ink-muted">
                        <span className="truncate max-w-[180px]">
                          TARGET: {cursorState.dwellTargetName || 'NONE'}
                        </span>
                        <span>{Math.round(cursorState.dwellProgress * 100)}%</span>
                      </div>
                      <div className="w-full bg-paper-cream border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
                        <div
                          className="h-full bg-sage-green transition-all duration-75"
                          style={{ width: `${cursorState.dwellProgress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Honest Scientific Disclosure Notice */}
                <div className="p-2.5 border border-charcoal-soft/30 bg-paper-cream/60 rounded-[2px] text-[10px] text-ink-muted flex items-start gap-2 leading-relaxed">
                  <Compass className="w-4 h-4 shrink-0 text-charcoal-soft mt-0.5" />
                  <span>
                    Consumer webcam eye tracking estimates screen point-of-regard within ~1&deg;&ndash;1.8&deg; visual angle. Accuracy depends on user distance, camera tilt, and ambient lighting.
                  </span>
                </div>
              </div>
            </DeskCard>

            {/* FIG. 08-A — Anatomical Bilateral Telemetry */}
            <DeskCard figure="FIG. 08-A" title="ANATOMICAL BILATERAL TELEMETRY">
              <div className="space-y-4">
                {/* Left (OS) vs Right (OD) Individual Eye Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Left Eye (OS) */}
                  <div
                    className={`p-3 border rounded-tactile text-center transition-colors ${
                      metrics.leftEye.state === 'OCCLUDED'
                        ? 'border-brick-red/50 bg-brick-red/5'
                        : 'border-charcoal-soft bg-paper-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-ink-muted">LEFT (OS)</span>
                      <StampBadge
                        label={metrics.leftEye.state}
                        variant={getStatusBadgeVariant(metrics.leftEye.state)}
                      />
                    </div>
                    <span className="text-2xl font-bold text-charcoal-soft tabular-nums block">
                      {metrics.leftEye.state === 'OCCLUDED'
                        ? '---'
                        : metrics.leftEye.pupilDiameterMm.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-sage-green block mt-0.5 font-bold">
                      {metrics.leftEye.state === 'OCCLUDED' ? 'OCCLUDED' : 'MM DIAMETER'}
                    </span>
                    <div className="mt-2 pt-2 border-t border-charcoal-soft/20 text-[10px] text-ink-muted flex justify-between">
                      <span>EAR: {metrics.leftEye.ear.toFixed(2)}</span>
                      <span>APER: {metrics.leftEye.apertureMm.toFixed(1)}mm</span>
                    </div>
                  </div>

                  {/* Right Eye (OD) */}
                  <div
                    className={`p-3 border rounded-tactile text-center transition-colors ${
                      metrics.rightEye.state === 'OCCLUDED'
                        ? 'border-brick-red/50 bg-brick-red/5'
                        : 'border-charcoal-soft bg-paper-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-ink-muted">RIGHT (OD)</span>
                      <StampBadge
                        label={metrics.rightEye.state}
                        variant={getStatusBadgeVariant(metrics.rightEye.state)}
                      />
                    </div>
                    <span className="text-2xl font-bold text-charcoal-soft tabular-nums block">
                      {metrics.rightEye.state === 'OCCLUDED'
                        ? '---'
                        : metrics.rightEye.pupilDiameterMm.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-cyan-600 block mt-0.5 font-bold">
                      {metrics.rightEye.state === 'OCCLUDED' ? 'OCCLUDED' : 'MM DIAMETER'}
                    </span>
                    <div className="mt-2 pt-2 border-t border-charcoal-soft/20 text-[10px] text-ink-muted flex justify-between">
                      <span>EAR: {metrics.rightEye.ear.toFixed(2)}</span>
                      <span>APER: {metrics.rightEye.apertureMm.toFixed(1)}mm</span>
                    </div>
                  </div>
                </div>

                {/* Saccadic Velocity Gauge */}
                <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-brick-red" />
                      SACCADIC VELOCITY
                    </span>
                    <span className="font-bold tabular-nums text-charcoal-soft">
                      {metrics.saccadicVelocityDegSec} °/S
                    </span>
                  </div>
                  <div className="w-full bg-paper-cream border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
                    <div
                      className="h-full bg-brick-red transition-all duration-75"
                      style={{
                        width: `${Math.min(100, (metrics.saccadicVelocityDegSec / 350) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-ink-muted">
                    <span>FIXATION (&lt;35°/s)</span>
                    <span>PURSUIT</span>
                    <span>SACCADE (&gt;100°/s)</span>
                  </div>
                </div>

                {/* Cognitive Load Index */}
                <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-sage-green" />
                      COGNITIVE WORKLOAD
                    </span>
                    <span className="font-bold tabular-nums text-charcoal-soft">
                      {metrics.cognitiveLoadIndex} / 100
                    </span>
                  </div>
                  <div className="w-full bg-paper-cream border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
                    <div
                      className="h-full bg-sage-green transition-all duration-100"
                      style={{ width: `${metrics.cognitiveLoadIndex}%` }}
                    />
                  </div>
                </div>

                {/* Diagnostic Details Grid */}
                <div className="divide-y divide-charcoal-soft/20 text-xs">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-ink-muted">ANISOCORIA (&Delta; OS-OD):</span>
                    <span
                      className={`font-bold tabular-nums ${
                        metrics.anisocoriaMm > 0.4 ? 'text-brick-red' : 'text-charcoal-soft'
                      }`}
                    >
                      {metrics.anisocoriaMm.toFixed(2)} mm{' '}
                      {metrics.anisocoriaMm > 0.4 ? '(CLINICAL ASYMMETRY)' : '(NORMAL)'}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-ink-muted">PUPILLARY UNREST (PUI):</span>
                    <span className="font-bold tabular-nums text-charcoal-soft">
                      {metrics.pupillaryUnrestIndex.toFixed(1)}{' '}
                      {metrics.pupillaryUnrestIndex > 3.0 ? 'FATIGUE STATE' : 'ALERT'}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-ink-muted">BLINK FREQUENCY:</span>
                    <span className="font-bold tabular-nums text-charcoal-soft">
                      {metrics.blinkFrequencyPerMin} BPM
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-ink-muted">INFERENCE PIPELINE:</span>
                    <span className="font-bold text-sage-green flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      100% ON-DEVICE
                    </span>
                  </div>
                </div>
              </div>
            </DeskCard>
          </div>
        </div>
      </main>
    </div>
  );
}
