'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { PupilMetrics, EyeTrackingConfig } from '@/modules/eye/types';
import {
  Eye,
  Activity,
  Zap,
  Download,
  Video,
  VideoOff,
  Sparkles,
  Gauge,
  Sliders,
} from 'lucide-react';

export default function EyeTrackingPage() {
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [modelBackend, setModelBackend] = useState('INITIALIZING...');
  const [config, setConfig] = useState<EyeTrackingConfig>({
    showIrisContours: true,
    showGazeVectors: true,
    showPupilWaveform: true,
    smoothingBeta: 0.01,
    canonicalIrisDiameterMm: 11.7,
  });

  const [metrics, setMetrics] = useState<PupilMetrics>({
    leftPupilDiameterMm: 3.5,
    rightPupilDiameterMm: 3.5,
    meanPupilDiameterMm: 3.5,
    anisocoriaMm: 0,
    pupilDilationRatio: 0.35,
    saccadicVelocityDegSec: 0,
    blinkFrequencyPerMin: 14,
    cognitiveLoadIndex: 42,
    pupillaryUnrestIndex: 1.2,
    isFixating: true,
    eyeOpeningRatioLeft: 0.85,
    eyeOpeningRatioRight: 0.85,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const taskRunnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const analyzerRef = useRef<PupillometryAnalyzer>(new PupillometryAnalyzer());
  const rendererRef = useRef<EyeRenderer>(new EyeRenderer());
  const animFrameRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef<number>(0);

  const { videoRef, isStreaming, startCamera, stopCamera, errorMessage } = useCamera({ autoStart: true });

  // Initialize MediaPipe FaceLandmarker with cleanup
  useEffect(() => {
    let unmounted = false;
    taskRunnerRef.current.initFaceLandmarker().then((success) => {
      if (!unmounted) {
        setModelBackend(
          success ? `MEDIAPIPE (${taskRunnerRef.current.getBackend()})` : 'SYNTHETIC FALLBACK'
        );
      }
    });

    return () => {
      unmounted = true;
      taskRunnerRef.current.dispose();
    };
  }, []);

  // Main 60 FPS Tracking & Rendering Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const now = performance.now();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const width = canvas?.width || 640;
      const height = canvas?.height || 480;

      let landmarks: any = null;

      if (!syntheticMode && videoRef.current && videoRef.current.readyState >= 2) {
        const faceResult = taskRunnerRef.current.detectFace(videoRef.current, now);
        if (faceResult && faceResult.faceLandmarks && faceResult.faceLandmarks[0]) {
          landmarks = faceResult.faceLandmarks[0];
        }
      }

      if (!landmarks && (syntheticMode || !isStreaming)) {
        landmarks = generateSyntheticEyeLandmarks(now);
      }

      if (landmarks) {
        const currentMetrics = analyzerRef.current.process(landmarks, now);
        const pupilHistory = analyzerRef.current.getPupilHistory();

        // Render directly to Canvas at 60 FPS
        if (ctx) {
          rendererRef.current.render(ctx, width, height, landmarks, currentMetrics, pupilHistory, config);
        }

        // Throttle React state update to 10 Hz (every 100ms)
        if (now - lastUiUpdateRef.current >= 100) {
          lastUiUpdateRef.current = now;
          setMetrics(currentMetrics);
        }
      } else if (ctx) {
        ctx.clearRect(0, 0, width, height);
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
  }, [syntheticMode, isStreaming, config, videoRef]);

  // Export session metrics (JSON)
  const exportSessionJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      modelBackend,
      metrics,
      pupilHistory: analyzerRef.current.getPupilHistory(),
      recentSaccades: analyzerRef.current.getRecentSaccades(),
    };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    a.download = `omni-pupillometry-telemetry-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream">
      <GlobalNav />
      <PerformanceHUD />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                OCULAR BIOMETRICS // FIG. 08
              </span>
              <StampBadge label="SUB-MM PUPILLOMETRY" variant="sage" />
              <StampBadge label={`VISION: ${modelBackend}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              3D OCULAR PUPILLOMETRY & GAZE TELEMETRY RIG
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Sub-millimeter pupil diameter measurement, Pupillary Light Reflex (PLR), micro-saccadic velocity dynamics, and 3D optical gaze raycast vectors on client-side WebGPU.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={exportSessionJSON} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT TELEMETRY</span>
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
          <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red">
            HARDWARE NOTICE: {errorMessage}
          </div>
        )}

        {/* Primary Viewport & Waveform Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-[4/3] w-full border-2 border-charcoal-soft rounded-tactile overflow-hidden bg-paper-dark shadow-tactile-lg">
              {/* Underlying Camera Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                  syntheticMode ? 'hidden' : 'block'
                }`}
              />

              {/* High-Precision Ocular Tracking Canvas */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-cover z-10"
              />

              {/* Viewport Status Header Stamp */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <StampBadge
                  label={metrics.isFixating ? 'FIXATION LOCKED' : 'SACCADIC BURST'}
                  variant={metrics.isFixating ? 'sage' : 'brick'}
                />
                <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-cream/90 border border-charcoal-soft rounded-[2px] text-charcoal-soft">
                  CANONICAL REF: 11.7 MM
                </span>
              </div>
            </div>

            {/* Quick Display Controls */}
            <div className="p-3 border border-charcoal-soft bg-paper-cream-dark/40 rounded-tactile flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-ink-muted flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-charcoal-soft" />
                OVERLAY LAYERS:
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.showIrisContours}
                    onChange={(e) => setConfig({ ...config, showIrisContours: e.target.checked })}
                    className="accent-charcoal-soft"
                  />
                  <span>IRIS & PUPIL ELLIPSE</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.showGazeVectors}
                    onChange={(e) => setConfig({ ...config, showGazeVectors: e.target.checked })}
                    className="accent-charcoal-soft"
                  />
                  <span>3D OPTICAL GAZE VECTORS</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.showPupilWaveform}
                    onChange={(e) => setConfig({ ...config, showPupilWaveform: e.target.checked })}
                    className="accent-charcoal-soft"
                  />
                  <span>PUPILLOMETRY STRIP CHART</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Instrument Telemetry Cluster */}
          <div className="space-y-4">
            <DeskCard figure="FIG. 08-A" title="PUPILLOMETRIC TELEMETRY">
              <div className="space-y-4">
                {/* Left & Right Pupil Diameter */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile text-center">
                    <span className="text-[10px] text-ink-muted block">LEFT PUPIL (OS)</span>
                    <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
                      {metrics.leftPupilDiameterMm.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-sage-green block mt-0.5">MM DIAMETER</span>
                  </div>
                  <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile text-center">
                    <span className="text-[10px] text-ink-muted block">RIGHT PUPIL (OD)</span>
                    <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
                      {metrics.rightPupilDiameterMm.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-cyan-500 block mt-0.5">MM DIAMETER</span>
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

                {/* Cognitive Load & Dilation Index */}
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
                      {metrics.anisocoriaMm.toFixed(2)} mm {metrics.anisocoriaMm > 0.4 ? '(DISPARITY)' : '(NORMAL)'}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-ink-muted">PUPILLARY UNREST (PUI):</span>
                    <span className="font-bold tabular-nums text-charcoal-soft">
                      {metrics.pupillaryUnrestIndex.toFixed(1)} {metrics.pupillaryUnrestIndex > 3.0 ? 'FATIGUE' : 'ALERT'}
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
                    <span className="font-bold text-sage-green">100% ON-DEVICE</span>
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
