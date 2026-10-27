'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { MechanicalToggle } from '@/components/ui/MechanicalToggle';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { GazeCalibrationEngine, extractGazeFeatures } from '@/modules/gaze/calibration';
import { IDTFixationParser } from '@/modules/gaze/idt-parser';
import { HeatmapRenderer, HeatmapConfig } from '@/modules/gaze/heatmap-renderer';
import { GazeFeatures, AreaOfInterest } from '@/modules/gaze/types';
import { generateSyntheticFace } from '@/modules/face/synthetic-face';
import { MediaPipeTaskRunner } from '@/core/mediapipe/task-runner';
import { FaceMetricsAnalyzer } from '@/modules/face/blendshapes';
import { OneEuroFilter } from '@/core/filters';
import { useSystemStore } from '@/core/store';
import { Download, Target, Flame, MousePointer } from 'lucide-react';
import {
  HeatVisionRenderer,
  HeatVisionConfig,
  DEFAULT_HEAT_VISION_CONFIG,
} from '@/modules/easter-eggs/heat-vision-renderer';
import { HeatVisionAudioSynthesizer } from '@/modules/easter-eggs/heat-vision-audio';
import { HeatVisionControls } from '@/components/easter-eggs/HeatVisionControls';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';
import { GazeCursorOverlay } from '@/components/gaze/GazeCursorOverlay';
import { GazeCalibrationModal } from '@/components/gaze/GazeCalibrationModal';
import { GazeCursorController, GazeCursorState } from '@/modules/gaze/gaze-cursor-controller';
import { GazeCursorConfig, DEFAULT_GAZE_CURSOR_CONFIG } from '@/modules/gaze/types';

const INITIAL_AOIS: AreaOfInterest[] = [
  {
    id: 'aoi-1',
    name: 'PRIMARY CALL-TO-ACTION',
    x: 0.15,
    y: 0.25,
    width: 0.35,
    height: 0.22,
    timeToFirstFixationMs: null,
    totalDwellMs: 0,
  },
  {
    id: 'aoi-2',
    name: 'VALUE PROPOSITION HEADER',
    x: 0.55,
    y: 0.25,
    width: 0.38,
    height: 0.22,
    timeToFirstFixationMs: null,
    totalDwellMs: 0,
  },
];

export default function GazePage() {
  const [targetCanvasMode, setTargetCanvasMode] = useState<'sample_ui' | 'upload' | 'camera'>('sample_ui');
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [gazeCursorConfig, setGazeCursorConfig] = useState<GazeCursorConfig>(DEFAULT_GAZE_CURSOR_CONFIG);
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
  const [accuracy, setAccuracy] = useState({ errorPx: 28, errorDeg: 0.8 });
  const [syntheticMode, setSyntheticMode] = useState(false);

  // Heatmap configuration
  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>({
    radius: 45,
    opacity: 0.75,
    decay: false,
    showScanPath: true,
    showAOIs: true,
  });

  // Mutable AOI references (zero React re-renders per frame)
  const aoisRef = useRef<AreaOfInterest[]>(INITIAL_AOIS.map((a) => ({ ...a })));
  const currentGazeRef = useRef<{ x: number; y: number }>({ x: 320, y: 240 });
  const lastUiUpdateRef = useRef<number>(0);

  // Heat Vision Apex Override State & Audio Synthesizer
  const [heatVisionConfig, setHeatVisionConfig] = useState<HeatVisionConfig>(DEFAULT_HEAT_VISION_CONFIG);
  const heatVisionConfigRef = useRef<HeatVisionConfig>(DEFAULT_HEAT_VISION_CONFIG);
  useEffect(() => {
    heatVisionConfigRef.current = heatVisionConfig;
  }, [heatVisionConfig]);

  const heatVisionRendererRef = useRef<HeatVisionRenderer>(new HeatVisionRenderer());
  const heatVisionAudioRef = useRef<HeatVisionAudioSynthesizer>(new HeatVisionAudioSynthesizer());
  const blinkHistoryRef = useRef<number[]>([]);
  const lastFaceLandmarksRef = useRef<any>(null);

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
    const audio = heatVisionAudioRef.current;
    return () => {
      audio.dispose();
    };
  }, []);

  // 'V' key shortcut listener for Heat Vision
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
        setHeatVisionConfig((prev) => {
          const next = !prev.enabled;
          if (next) unlockAchievement('HEAT_SIGNATURE');
          return { ...prev, enabled: next };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Throttled UI state (4 Hz) for the AOI table
  const [aois, setAois] = useState<AreaOfInterest[]>(INITIAL_AOIS);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const calibrationEngineRef = useRef<GazeCalibrationEngine>(new GazeCalibrationEngine());
  const idtParserRef = useRef<IDTFixationParser>(new IDTFixationParser());
  const heatmapRendererRef = useRef<HeatmapRenderer>(new HeatmapRenderer());
  const taskRunnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const faceAnalyzerRef = useRef<FaceMetricsAnalyzer>(new FaceMetricsAnalyzer());
  const gazeFilterXRef = useRef<OneEuroFilter>(new OneEuroFilter(60, { minCutoff: 1.0, beta: 0.012 }));
  const gazeFilterYRef = useRef<OneEuroFilter>(new OneEuroFilter(60, { minCutoff: 1.0, beta: 0.012 }));
  const animFrameRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number>(performance.now());
  const [modelBackend, setModelBackend] = useState<string>('INITIALIZING...');

  const { videoRef, isStreaming, startCamera, stopCamera, errorMessage } = useCamera({ autoStart: true });

  // Initialize offscreen heatmap renderer and FaceLandmarker
  useEffect(() => {
    heatmapRendererRef.current.init(640, 480);
    setAccuracy(calibrationEngineRef.current.getAccuracy());

    let unmounted = false;
    const runner = taskRunnerRef.current;
    runner.initFaceLandmarker().then((success) => {
      if (!unmounted) {
        setModelBackend(success ? `MEDIAPIPE (${runner.getBackend()})` : 'SYNTHETIC FALLBACK');
      }
    });

    return () => {
      unmounted = true;
      runner.dispose();
    };
  }, []);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'GAZE HEATMAP',
      activeModel: 'face_landmarker.task',
      fps: 30,
      p50Ms: 16,
      p95Ms: 22,
      trackingStatus: calibrationModalOpen ? 'INITIALIZING' : isStreaming ? 'TRACKING_ACTIVE' : 'STANDBY',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [calibrationModalOpen, isStreaming, setPerfStats]);

  // Main 60 FPS Tracking & Rendering Loop (Decoupled from React State)
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const now = performance.now();
      const elapsedMs = Math.round(now - sessionStartTimeRef.current);

      // Extract Gaze features
      let gazeFeatures: GazeFeatures = {
        leftRatioX: 0.5,
        leftRatioY: 0.5,
        rightRatioX: 0.5,
        rightRatioY: 0.5,
        headYaw: 0,
        headPitch: 0,
        eyeMidX: 0.5,
        eyeMidY: 0.5,
        isTracking: false,
        confidence: 0,
      };

      if (!syntheticMode && videoRef.current && videoRef.current.readyState >= 2) {
        const faceResult = taskRunnerRef.current.detectFace(videoRef.current, now);
        if (faceResult && faceResult.faceLandmarks && faceResult.faceLandmarks[0]) {
          const lms = faceResult.faceLandmarks[0];
          lastFaceLandmarksRef.current = lms;

          // Double blink detection for secret ocular gesture
          if (lms[159] && lms[145] && lms[386] && lms[374]) {
            const leftGap = Math.abs(lms[159].y - lms[145].y);
            const rightGap = Math.abs(lms[386].y - lms[374].y);
            if (leftGap < 0.016 && rightGap < 0.016) {
              const hist = blinkHistoryRef.current;
              const lastBlink = hist[hist.length - 1] || 0;
              if (now - lastBlink > 220) {
                hist.push(now);
                if (hist.length >= 2) {
                  if (now - hist[hist.length - 2] < 650) {
                    unlockAchievement('DOUBLE_TAKE');
                    setHeatVisionConfig((prev) => {
                      const next = !prev.enabled;
                      if (next) unlockAchievement('HEAT_SIGNATURE');
                      return { ...prev, enabled: next };
                    });
                    blinkHistoryRef.current = [];
                  }
                }
              }
            }
          }

          const extracted = extractGazeFeatures(lms as any, true);
          if (extracted) {
            gazeFeatures = extracted;
          }
        }
      } else {
        const syn = generateSyntheticFace(now);
        lastFaceLandmarksRef.current = syn.landmarks;
        const extracted = extractGazeFeatures(syn.landmarks as any, true);
        if (extracted) {
          gazeFeatures = extracted;
        }
      }

      const width = 640;
      const height = 480;

      // Handle active calibration
      if (calibrationModalOpen) {
        calibrationEngineRef.current.addSample(gazeFeatures, now);
      }

      // Predict screen coordinates with OneEuroFilter adaptive stabilization
      const rawGaze = calibrationEngineRef.current.predictGaze(gazeFeatures, width, height);
      const smoothGazeX = gazeFilterXRef.current.filter(rawGaze.x, now);
      const smoothGazeY = gazeFilterYRef.current.filter(rawGaze.y, now);
      const gaze = { x: smoothGazeX, y: smoothGazeY };
      currentGazeRef.current = gaze;

      // Accumulate into heatmap offscreen buffer
      heatmapRendererRef.current.addGazeDwell(gaze.x, gaze.y, 1.0, heatmapConfig);

      // I-DT Fixation parsing
      const fixations = idtParserRef.current.processSample(gaze.x, gaze.y, now);

      // Accumulate AOI Dwell Time directly in mutable memory
      for (const aoi of aoisRef.current) {
        const inAoi =
          gaze.x >= aoi.x * width &&
          gaze.x <= (aoi.x + aoi.width) * width &&
          gaze.y >= aoi.y * height &&
          gaze.y <= (aoi.y + aoi.height) * height;

        if (inAoi) {
          aoi.totalDwellMs += 16;
          if (aoi.timeToFirstFixationMs === null) {
            aoi.timeToFirstFixationMs = elapsedMs;
          }
        }
      }

      // Render Canvas directly at 60 FPS
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          heatmapRendererRef.current.renderTo(ctx, width, height, fixations, aoisRef.current, heatmapConfig);

          // Draw live gaze cursor crosshair
          ctx.save();
          ctx.strokeStyle = '#B5443A';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(gaze.x, gaze.y, 8, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(gaze.x, gaze.y, 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#B5443A';
          ctx.fill();
          ctx.restore();

          // Render Homelander-inspired Heat Vision dual lasers
          if (heatVisionConfigRef.current.enabled && lastFaceLandmarksRef.current) {
            const lms = lastFaceLandmarksRef.current;
            const leftIris = lms[468];
            const rightIris = lms[473];
            if (leftIris && rightIris) {
              const leftPos = { x: (1 - leftIris.x) * width, y: leftIris.y * height };
              const rightPos = { x: (1 - rightIris.x) * width, y: rightIris.y * height };
              heatVisionRendererRef.current.render(
                ctx,
                width,
                height,
                leftPos,
                rightPos,
                gaze,
                heatVisionConfigRef.current,
                now
              );
            }
          }
        }
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

      // Throttle UI table updates to 10 Hz (every 100ms)
      if (now - lastUiUpdateRef.current >= 100) {
        lastUiUpdateRef.current = now;
        setAois(aoisRef.current.map((a) => ({ ...a })));
        setCursorState(liveCursorState);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [syntheticMode, calibrationModalOpen, heatmapConfig, videoRef]);

  const handleStartCalibration = () => {
    calibrationEngineRef.current.startCalibration();
    setCalibrationModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageSrc(event.target?.result as string);
        setTargetCanvasMode('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  // Export PNG of heatmap
  const exportHeatmapPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `omni-gaze-heatmap-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Export JSON telemetry
  const exportGazeJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      accuracy,
      fixations: idtParserRef.current.getFixations(),
      aois: aoisRef.current,
    };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    a.download = `omni-gaze-telemetry-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const activeTarget = calibrationEngineRef.current.getActiveTarget();

  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream">
      <GlobalNav />
      <PerformanceHUD />

      {/* Viewport Gaze Cursor Overlay */}
      <GazeCursorOverlay cursorState={cursorState} config={gazeCursorConfig} />

      {/* 9-Point Calibration Modal */}
      <GazeCalibrationModal
        isOpen={calibrationModalOpen}
        engine={calibrationEngineRef.current}
        onClose={() => setCalibrationModalOpen(false)}
        onCalibrationComplete={() => {
          setGazeCursorConfig((prev) => ({ ...prev, enabled: true }));
          setAccuracy(calibrationEngineRef.current.getAccuracy());
        }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                OCULAR ATTENTION // FIG. 07
              </span>
              <StampBadge label="9-POINT RIDGE REGRESSION" variant="sage" />
              <StampBadge label={`ACCURACY: ±${accuracy.errorDeg}°`} variant="charcoal" />
              <StampBadge label={`VISION: ${modelBackend}`} variant="brick" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              GAZE-TRACKING HEATMAP &amp; FIXATION ANALYZER
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Iris vector estimation, I-DT fixation clustering, scan-path ordering, cumulative dwell accumulation, and automated Area of Interest (AOI) metrics.
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

            <Link href="/eye">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Target className="w-3.5 h-3.5 text-sage-green" />
                <span>PUPILLOMETRY LAB &rarr;</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleStartCalibration}
              className="gap-1.5"
            >
              <Target className="w-3.5 h-3.5 text-brick-red" />
              <span>9-POINT CALIBRATION</span>
            </Button>

            <Button variant="outline" size="sm" onClick={exportHeatmapPNG} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT HEATMAP (PNG)</span>
            </Button>

            <Button
              variant={syntheticMode ? 'brick' : 'outline'}
              size="sm"
              onClick={() => setSyntheticMode(!syntheticMode)}
            >
              <span>{syntheticMode ? 'SYNTHETIC' : 'SYNTHETIC MODE'}</span>
            </Button>
          </div>
        </div>

        {/* Hardware / Permission Warning */}
        {errorMessage && !syntheticMode && (
          <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red flex items-center justify-between">
            <span>HARDWARE WARNING: {errorMessage}</span>
            <Button variant="brick" size="sm" onClick={() => setSyntheticMode(true)}>
              SWITCH TO SYNTHETIC STREAM
            </Button>
          </div>
        )}

        {/* Target Canvas Switcher Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 border-2 border-charcoal-soft bg-paper-dark rounded-tactile text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-ink-muted">TARGET CANVAS:</span>
            <button
              onClick={() => setTargetCanvasMode('sample_ui')}
              className={`px-3 py-1 font-bold uppercase border rounded-tactile ${
                targetCanvasMode === 'sample_ui'
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                  : 'border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-dark'
              }`}
            >
              SAMPLE UI WIREFRAME
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-3 py-1 font-bold uppercase border rounded-tactile ${
                targetCanvasMode === 'upload'
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                  : 'border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-dark'
              }`}
            >
              UPLOADED SCREENSHOT
            </button>
            <button
              onClick={() => setTargetCanvasMode('camera')}
              className={`px-3 py-1 font-bold uppercase border rounded-tactile ${
                targetCanvasMode === 'camera'
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                  : 'border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-dark'
              }`}
            >
              CAMERA OVERLAY
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setHeatVisionConfig((prev) => {
                  const next = !prev.enabled;
                  if (next) unlockAchievement('HEAT_SIGNATURE');
                  return { ...prev, enabled: next };
                });
              }}
              className={`px-3 py-1 font-bold uppercase border rounded-tactile flex items-center gap-1.5 transition-all ${
                heatVisionConfig.enabled
                  ? 'border-brick-red bg-brick-red text-white shadow-[0_0_15px_rgba(255,42,16,0.4)]'
                  : 'border-brick-red text-brick-red hover:bg-brick-red/10'
              }`}
              title="Toggle Homelander Heat Vision [V]"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>HEAT VISION [V]</span>
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                heatmapRendererRef.current.clear();
                aoisRef.current = INITIAL_AOIS.map((a) => ({ ...a }));
                setAois(INITIAL_AOIS);
              }}
              className="text-[10px]"
            >
              CLEAR HEATMAP
            </Button>
          </div>
        </div>

        {/* Primary Heatmap & Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visualizer Canvas Container (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative w-full h-[480px] border-2 border-charcoal-soft bg-paper-cream rounded-tactile overflow-hidden shadow-tactile select-none">
              {/* Underlying Target Content */}
              {targetCanvasMode === 'sample_ui' && (
                <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none opacity-85">
                  <div className="border-b-2 border-charcoal-soft pb-3 flex justify-between items-center">
                    <span className="font-bold text-base">ACME DESIGN SYSTEM MOCKUP</span>
                    <span className="text-xs border border-charcoal-soft px-2 py-0.5">v2.4</span>
                  </div>

                  <div className="grid grid-cols-2 gap-6 my-auto">
                    <div className="border-2 border-charcoal-soft p-5 bg-paper-dark rounded-tactile space-y-2">
                      <span className="font-bold text-xs uppercase text-brick-red block">
                        FEATURE SPOTLIGHT #01
                      </span>
                      <h3 className="font-bold text-base">INSTANT CLIENT-SIDE INFERENCE</h3>
                      <p className="text-xs text-ink-muted">
                        Zero server latencies with embedded WASM SIMD and WebGPU tensor pipelines.
                      </p>
                    </div>

                    <div className="border-2 border-charcoal-soft p-5 bg-paper-cream rounded-tactile space-y-2">
                      <span className="font-bold text-xs uppercase text-sage-green block">
                        BENCHMARK STATS
                      </span>
                      <h3 className="font-bold text-base">30+ FPS DETERMINISTIC</h3>
                      <p className="text-xs text-ink-muted">
                        Smooth frame rates decoupled cleanly across Web Worker barriers.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-charcoal-soft/20 pt-3 flex justify-between text-[11px] text-ink-muted">
                    <span>MOCK PAGE SPECIMEN FOR EYE-TRACKING UX AUDITING</span>
                    <span>CONFIDENTIAL</span>
                  </div>
                </div>
              )}

              {targetCanvasMode === 'upload' && uploadedImageSrc && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={uploadedImageSrc}
                  alt="Target screenshot"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              )}

              {targetCanvasMode === 'camera' && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              )}

              {/* Heatmap & Scan-Path Canvas */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              {/* Heat Vision Apex Controls Drawer */}
              <HeatVisionControls
                config={heatVisionConfig}
                onChange={setHeatVisionConfig}
                onDisengage={() =>
                  setHeatVisionConfig((prev) => ({ ...prev, enabled: false }))
                }
              />
            </div>

            {/* Calibration Status Banner */}
            <div className="p-3 border-2 border-charcoal-soft bg-paper-dark rounded-tactile flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <StampBadge label="CALIBRATION PROFILE" variant="sage" />
                <span className="font-bold text-charcoal-soft">
                  ESTIMATED ERROR: {accuracy.errorPx}px (&plusmn;{accuracy.errorDeg}&deg; VISUAL ANGLE)
                </span>
              </div>
              <span className="text-[10px] text-ink-muted">
                {calibrationModalOpen ? 'CALIBRATION IN PROGRESS' : 'CALIBRATED & ACCUMULATING'}
              </span>
            </div>
          </div>

          {/* Controls & AOI Metrics Station (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Heatmap Rendering Controls */}
            <DeskCard
              figure="CONTROLS"
              title="ACCUMULATION RENDER SETTINGS"
              subtitle="Kernel radius, opacity, and decay properties"
            >
              <div className="space-y-3 my-2 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-[11px] mb-1">
                    <span>GAUSSIAN RADIUS</span>
                    <span className="tabular-nums">{heatmapConfig.radius}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={heatmapConfig.radius}
                    onChange={(e) =>
                      setHeatmapConfig((c) => ({ ...c, radius: parseInt(e.target.value) }))
                    }
                    className="w-full accent-charcoal-soft"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-[11px] mb-1">
                    <span>LAYER OPACITY</span>
                    <span className="tabular-nums">{Math.round(heatmapConfig.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={Math.round(heatmapConfig.opacity * 100)}
                    onChange={(e) =>
                      setHeatmapConfig((c) => ({ ...c, opacity: parseInt(e.target.value) / 100 }))
                    }
                    className="w-full accent-charcoal-soft"
                  />
                </div>

                <div className="pt-2 border-t border-charcoal-soft/20 flex flex-wrap gap-4">
                  <MechanicalToggle
                    label="SCAN-PATH"
                    checked={heatmapConfig.showScanPath}
                    onChange={(v) => setHeatmapConfig((c) => ({ ...c, showScanPath: v }))}
                  />
                  <MechanicalToggle
                    label="AOI BOXES"
                    checked={heatmapConfig.showAOIs}
                    onChange={(v) => setHeatmapConfig((c) => ({ ...c, showAOIs: v }))}
                  />
                  <MechanicalToggle
                    label="FADE DECAY"
                    checked={heatmapConfig.decay}
                    onChange={(v) => setHeatmapConfig((c) => ({ ...c, decay: v }))}
                  />
                </div>
              </div>
            </DeskCard>

            {/* Areas of Interest (AOI) Telemetry Table */}
            <DeskCard
              figure="ANALYTICS"
              title="AREAS OF INTEREST (AOI) LEDGER"
              subtitle="Time-to-first-fixation (TTFF) & dwell duration"
            >
              <div className="space-y-2.5 my-2 text-xs">
                {aois.map((aoi) => (
                  <div
                    key={aoi.id}
                    className="p-2.5 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-charcoal-soft">{aoi.name}</span>
                      <StampBadge label="BOUNDED AOI" variant="brick" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-charcoal-soft/20">
                      <div>
                        <span className="text-ink-muted block text-[10px]">TIME TO FIRST FIXATION:</span>
                        <span className="font-bold tabular-nums">
                          {aoi.timeToFirstFixationMs !== null ? `${aoi.timeToFirstFixationMs} ms` : 'NOT YET FIXATED'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[10px]">TOTAL DWELL TIME:</span>
                        <span className="font-bold tabular-nums">
                          {(aoi.totalDwellMs / 1000).toFixed(1)} SECONDS
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-charcoal-soft/20 flex justify-end">
                <Button variant="outline" size="sm" onClick={exportGazeJSON} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  EXPORT TELEMETRY (JSON)
                </Button>
              </div>
            </DeskCard>
          </div>
        </div>
      </main>
    </div>
  );
}
