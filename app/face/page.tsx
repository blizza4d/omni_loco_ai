'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { CrosshairViewport } from '@/components/ui/CrosshairViewport';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { MechanicalToggle } from '@/components/ui/MechanicalToggle';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { FaceMetricsAnalyzer } from '@/modules/face/blendshapes';
import { generateSyntheticFace } from '@/modules/face/synthetic-face';
import { renderFaceOverlay } from '@/modules/face/overlay-renderer';
import { BlendshapeTable } from '@/modules/face/components/BlendshapeTable';
import { FaceLandmark, BlendshapeCategory, FaceMetrics, FaceMeshLayers } from '@/modules/face/types';
import { MediaPipeTaskRunner } from '@/core/mediapipe/task-runner';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { Video, VideoOff, Download, Circle, Sparkles, MessageSquare } from 'lucide-react';

export default function FaceModulePage() {
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSamples, setRecordedSamples] = useState<unknown[]>([]);
  const [rollingEAR, setRollingEAR] = useState<number[]>([]);
  const [backendInUse, setBackendInUse] = useState('INITIALIZING');
  const [fps, setFps] = useState(0);

  // Toggleable visualization layers
  const [layers, setLayers] = useState<FaceMeshLayers>({
    tesselation: true,
    contours: true,
    eyes: true,
    irises: true,
    lips: true,
    headPoseGizmo: true,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const analyzerRef = useRef<FaceMetricsAnalyzer>(new FaceMetricsAnalyzer());
  const animFrameRef = useRef<number | null>(null);

  // Real-time mutable references (zero React re-renders per frame)
  const landmarksRef = useRef<FaceLandmark[] | null>(null);
  const blendshapesRef = useRef<BlendshapeCategory[]>([]);
  const metricsRef = useRef<FaceMetrics | null>(null);

  const [blendshapes, setBlendshapes] = useState<BlendshapeCategory[]>([]);
  const [metrics, setMetrics] = useState<FaceMetrics>({
    earLeft: 0.3,
    earRight: 0.3,
    earAvg: 0.3,
    blinksPerMinute: 0,
    avgBlinkDurationMs: 140,
    isDrowsy: false,
    perclos: 0,
    headPose: { yaw: 0, pitch: 0, roll: 0 },
    headOrientation: 'CENTER',
    isMouthOpen: false,
    isTalking: false,
    activeExpressions: [],
  });

  const lastUiUpdateRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(performance.now());
  const lastFaceDetectionTimeRef = useRef<number>(0);

  const {
    videoRef,
    isStreaming,
    startCamera,
    stopCamera,
    isMirrored,
    setIsMirrored,
    devices,
    currentDeviceId,
    switchDevice,
    errorMessage,
  } = useCamera({ autoStart: true });

  const recordedSamplesRef = useRef<Record<string, unknown>[]>([]);
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const isMirroredRef = useRef(isMirrored);
  isMirroredRef.current = isMirrored;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let mounted = true;
    runnerRef.current.initFaceLandmarker().then((success) => {
      if (mounted) {
        setBackendInUse(runnerRef.current.getBackend());
      }
    });

    return () => {
      mounted = false;
      runnerRef.current.dispose();
    };
  }, []);

  // Main 60 FPS processing and render loop
  const tick = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastFpsCalcRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcRef.current)));
      frameCountRef.current = 0;
      lastFpsCalcRef.current = now;
    }

    let currentLandmarks: FaceLandmark[] = [];
    let currentBlendshapes: BlendshapeCategory[] = [];

    if (syntheticMode || !videoRef.current || videoRef.current.readyState < 2) {
      const syn = generateSyntheticFace(now);
      currentLandmarks = syn.landmarks;
      currentBlendshapes = syn.blendshapes;
    } else {
      // Run real MediaPipe FaceLandmarker
      const mpResult = runnerRef.current.detectFace(videoRef.current, now);
      if (mpResult && mpResult.faceLandmarks && mpResult.faceLandmarks[0]) {
        lastFaceDetectionTimeRef.current = now;
        currentLandmarks = mpResult.faceLandmarks[0].map((pt) => ({
          x: pt.x,
          y: pt.y,
          z: pt.z,
        }));
        if (mpResult.faceBlendshapes && mpResult.faceBlendshapes[0]) {
          currentBlendshapes = mpResult.faceBlendshapes[0].categories.map((c) => ({
            categoryName: c.categoryName,
            score: Math.round(c.score * 100) / 100,
          }));
        }
      } else {
        // Drop tracking cleanly after 150ms of no detections to avoid ghost face persistence
        if (now - lastFaceDetectionTimeRef.current > 150) {
          currentLandmarks = [];
          landmarksRef.current = null;
          blendshapesRef.current = [];
          currentBlendshapes = [];
        } else {
          currentLandmarks = landmarksRef.current || [];
          currentBlendshapes = blendshapesRef.current || [];
        }
      }
    }

    if (currentLandmarks.length >= 468) {
      landmarksRef.current = currentLandmarks;
      blendshapesRef.current = currentBlendshapes;

      const computed = analyzerRef.current.analyze(currentLandmarks, currentBlendshapes, now);
      metricsRef.current = computed;

      // Direct canvas rendering with zero React re-render overhead!
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        syncCanvasToVideo(canvas, video);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderFaceOverlay(ctx, currentLandmarks, canvas.width, canvas.height, {
            layers: layersRef.current,
            headPose: computed.headPose,
            isMirrored: isMirroredRef.current,
          });
        }
      }

      // Record sample in mutable ref (zero React state overhead during recording)
      if (isRecordingRef.current) {
        recordedSamplesRef.current.push({
          timestamp: new Date().toISOString(),
          ear: computed.earAvg,
          yaw: computed.headPose.yaw,
          pitch: computed.headPose.pitch,
          roll: computed.headPose.roll,
          perclos: computed.perclos,
          drowsy: computed.isDrowsy,
          blinksPerMin: computed.blinksPerMinute,
        });
      }

      // Throttle React UI state updates to 5 Hz (every 200ms)
      if (now - lastUiUpdateRef.current >= 200) {
        lastUiUpdateRef.current = now;
        setMetrics(computed);
        setBlendshapes(currentBlendshapes);
        setRollingEAR((prev) => {
          const next = [...prev, computed.earAvg];
          return next.length > 50 ? next.slice(-50) : next;
        });
      }
    } else {
      // Clear overlay if no face detected
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, [syntheticMode, videoRef]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tick]);

  // Export local recording session
  const exportSession = (format: 'json' | 'csv') => {
    const samples = recordedSamplesRef.current.length > 0 ? recordedSamplesRef.current : recordedSamples;
    if (samples.length === 0) return;
    let dataStr = '';

    if (format === 'json') {
      dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(samples, null, 2));
    } else {
      const headers = Object.keys(samples[0] as object).join(',');
      const rows = samples
        .map((row) => Object.values(row as object).join(','))
        .join('\n');
      dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(`${headers}\n${rows}`);
    }

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `omni-loco-face-session-${Date.now()}.${format}`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
                BIOMETRICS // FIG. 02
              </span>
              <StampBadge label="478 DENSE LANDMARKS" variant="sage" />
              <StampBadge label={`ACCEL: ${backendInUse}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              BIOMETRIC FACE MESH & EXPRESSION ENGINE
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Sub-millimeter facial mesh topology, 3D head attitude decomposition, Eye Aspect Ratio (EAR) blink rate, PERCLOS fatigue tracking, and raw morph weights.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* REC Button */}
            <Button
              variant={isRecording ? 'brick' : 'outline'}
              size="sm"
              onClick={() => {
                if (!isRecording) setRecordedSamples([]);
                setIsRecording(!isRecording);
              }}
              className="gap-1.5"
            >
              <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-current animate-pulse' : ''}`} />
              <span>{isRecording ? 'RECORDING REC' : 'REC SESSION'}</span>
            </Button>

            {recordedSamples.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSession('csv')}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT CSV ({recordedSamples.length})</span>
              </Button>
            )}

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
              <span>{isStreaming ? 'PAUSE' : 'ACTIVATE'}</span>
            </Button>
          </div>
        </div>

        {/* Permission / Hardware error warning if any */}
        {errorMessage && !syntheticMode && (
          <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red flex items-center justify-between">
            <span>HARDWARE WARNING: {errorMessage}</span>
            <Button variant="brick" size="sm" onClick={() => setSyntheticMode(true)}>
              SWITCH TO SYNTHETIC STREAM
            </Button>
          </div>
        )}

        {/* Viewport & Live Derived Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Optical Viewport (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <CrosshairViewport
              title="478-POINT FACIAL TOPOLOGY"
              isStreaming={isStreaming || syntheticMode}
              isRecording={isRecording}
              fps={fps}
              backend={backendInUse}
              controls={
                <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <MechanicalToggle
                      label="MESH"
                      checked={layers.tesselation}
                      onChange={(v) => setLayers((l) => ({ ...l, tesselation: v }))}
                    />
                    <MechanicalToggle
                      label="IRISES"
                      checked={layers.irises}
                      onChange={(v) => setLayers((l) => ({ ...l, irises: v }))}
                    />
                    <MechanicalToggle
                      label="3D GIZMO"
                      checked={layers.headPoseGizmo}
                      onChange={(v) => setLayers((l) => ({ ...l, headPoseGizmo: v }))}
                    />
                    <MechanicalToggle
                      label="MIRROR"
                      checked={isMirrored}
                      onChange={setIsMirrored}
                    />
                  </div>
                </div>
              }
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => syncCanvasToVideo(canvasRef.current, videoRef.current)}
                className={`absolute inset-0 w-full h-full object-contain ${
                  isMirrored ? 'scale-x-[-1]' : ''
                }`}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            </CrosshairViewport>

            {/* Rolling 60s EAR Strip Chart */}
            <DeskCard figure="STRIP CHART" title="EYE ASPECT RATIO (EAR) ROLLING CHRONO" inset>
              <div className="h-16 flex items-end gap-1 pt-2">
                {rollingEAR.map((val, idx) => {
                  const heightPercent = Math.min(100, Math.max(5, (val / 0.45) * 100));
                  const isClosed = val < 0.21;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-[1px] transition-all"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: isClosed ? '#B83B2F' : '#8EA48C',
                      }}
                      title={`EAR: ${val.toFixed(3)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-ink-muted border-t border-charcoal-soft/20 pt-1 mt-1">
                <span>-50 FRAMES</span>
                <span>BLINK THRESHOLD: 0.21</span>
                <span>NOW: {metrics.earAvg.toFixed(3)}</span>
              </div>
            </DeskCard>
          </div>

          {/* Derived Biometric Indicators (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Drowsiness & Blink Station */}
            <DeskCard
              figure="TELEMETRY 01"
              title="VIGILANCE & OCULAR DYNAMICS"
              subtitle="PERCLOS drowsiness and blink frequency"
            >
              <div className="grid grid-cols-2 gap-3 my-2">
                <div className="border border-charcoal-soft p-2.5 bg-paper-dark">
                  <span className="text-[10px] text-ink-muted uppercase block">BLINK RATE</span>
                  <span className="text-xl font-bold text-charcoal-soft tabular-nums">
                    {metrics.blinksPerMinute}
                  </span>
                  <span className="text-[9px] text-ink-muted block">BLINKS / MIN</span>
                </div>

                <div className="border border-charcoal-soft p-2.5 bg-paper-dark">
                  <span className="text-[10px] text-ink-muted uppercase block">AVG DURATION</span>
                  <span className="text-xl font-bold text-charcoal-soft tabular-nums">
                    {metrics.avgBlinkDurationMs}
                  </span>
                  <span className="text-[9px] text-ink-muted block">MILLISECONDS</span>
                </div>

                <div className="border border-charcoal-soft p-2.5 bg-paper-dark">
                  <span className="text-[10px] text-ink-muted uppercase block">PERCLOS TIREDNESS</span>
                  <span className="text-xl font-bold text-charcoal-soft tabular-nums">
                    {(metrics.perclos * 100).toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-ink-muted block">EYE CLOSURE TIME</span>
                </div>

                <div className="border border-charcoal-soft p-2.5 bg-paper-dark flex flex-col justify-between">
                  <span className="text-[10px] text-ink-muted uppercase block">FATIGUE STATUS</span>
                  <div>
                    {metrics.isDrowsy ? (
                      <StampBadge label="DROWSINESS ALERT" variant="brick" pulse />
                    ) : (
                      <StampBadge label="ALERT / ACTIVE" variant="sage" />
                    )}
                  </div>
                </div>
              </div>
            </DeskCard>

            {/* Head Pose & Orientation Matrix */}
            <DeskCard
              figure="ATTITUDE"
              title="HEAD POSE DECOMPOSITION"
              subtitle="Euler rotation angles derived from facial plane"
            >
              <div className="grid grid-cols-3 gap-2 my-2 text-center">
                <div className="border border-charcoal-soft p-2 bg-paper-cream">
                  <span className="text-[9px] text-ink-muted uppercase block">YAW (X)</span>
                  <span className="text-base font-bold text-charcoal-soft tabular-nums">
                    {metrics.headPose.yaw}&deg;
                  </span>
                </div>
                <div className="border border-charcoal-soft p-2 bg-paper-cream">
                  <span className="text-[9px] text-ink-muted uppercase block">PITCH (Y)</span>
                  <span className="text-base font-bold text-charcoal-soft tabular-nums">
                    {metrics.headPose.pitch}&deg;
                  </span>
                </div>
                <div className="border border-charcoal-soft p-2 bg-paper-cream">
                  <span className="text-[9px] text-ink-muted uppercase block">ROLL (Z)</span>
                  <span className="text-base font-bold text-charcoal-soft tabular-nums">
                    {metrics.headPose.roll}&deg;
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-charcoal-soft/20">
                <span className="text-ink-muted text-[10px]">ORIENTATION:</span>
                <StampBadge label={metrics.headOrientation} variant="charcoal" />
              </div>
            </DeskCard>

            {/* Live Expressions & Speaking Activity */}
            <DeskCard figure="DYNAMICS" title="VOCAL & EXPRESSION DETECTORS">
              <div className="space-y-2 my-2 text-xs">
                <div className="flex items-center justify-between p-2 border border-charcoal-soft bg-paper-dark">
                  <span className="flex items-center gap-1.5 font-bold">
                    <MessageSquare className="w-3.5 h-3.5 text-charcoal-soft" />
                    TALKING ACTIVITY
                  </span>
                  <StampBadge
                    label={metrics.isTalking ? 'TALKING' : 'SILENT'}
                    variant={metrics.isTalking ? 'brick' : 'charcoal'}
                  />
                </div>

                <div className="flex items-center justify-between p-2 border border-charcoal-soft bg-paper-dark">
                  <span>MOUTH STATE</span>
                  <StampBadge
                    label={metrics.isMouthOpen ? 'MOUTH OPEN' : 'CLOSED'}
                    variant={metrics.isMouthOpen ? 'sage' : 'charcoal'}
                  />
                </div>

                {metrics.activeExpressions.length > 0 && (
                  <div className="p-2 border border-sage-green bg-sage-green/10 rounded-[2px] flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-charcoal-soft">DETECTED:</span>
                    {metrics.activeExpressions.map((exp) => (
                      <StampBadge key={exp.name} label={exp.name} variant="sage" />
                    ))}
                  </div>
                )}
              </div>
            </DeskCard>
          </div>
        </div>

        {/* 52 Blendshape Matrix */}
        <BlendshapeTable blendshapes={blendshapes} />
      </main>
    </div>
  );
}
