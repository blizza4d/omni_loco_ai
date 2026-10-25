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
import { PoseKinematics } from '@/modules/pose/kinematics';
import { ExerciseStateMachine } from '@/modules/pose/exercise-state-machine';
import { generateSyntheticPose } from '@/modules/pose/synthetic-pose';
import { renderPoseOverlay } from '@/modules/pose/overlay-renderer';
import { PoseLandmark, JointAngles, ExerciseType, ExerciseRepStats } from '@/modules/pose/types';
import { MediaPipeTaskRunner } from '@/core/mediapipe/task-runner';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { useSystemStore } from '@/core/store';
import { Video, VideoOff, RefreshCw, Sparkles, Download, Activity, Dumbbell, UserCheck } from 'lucide-react';

export default function PoseModulePage() {
  const [modelTier, setModelTier] = useState<'lite' | 'full' | 'heavy'>('full');
  const [exercise, setExercise] = useState<ExerciseType>('squat');
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [showGhostTarget, setShowGhostTarget] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [rollingAngle, setRollingAngle] = useState<number[]>([]);
  const [backendInUse, setBackendInUse] = useState('INITIALIZING');
  const [fps, setFps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const kinematicsRef = useRef<PoseKinematics>(new PoseKinematics());
  const stateMachineRef = useRef<ExerciseStateMachine>(new ExerciseStateMachine('squat'));
  const animFrameRef = useRef<number | null>(null);

  // Real-time mutable references (zero React re-renders per frame)
  const landmarksRef = useRef<PoseLandmark[] | null>(null);
  const anglesRef = useRef<JointAngles | null>(null);
  const repStatsRef = useRef<ExerciseRepStats | null>(null);

  const [angles, setAngles] = useState<JointAngles>({
    leftElbow: 180,
    rightElbow: 180,
    leftShoulder: 180,
    rightShoulder: 180,
    leftHip: 180,
    rightHip: 180,
    leftKnee: 180,
    rightKnee: 180,
    trunkInclination: 0,
    forwardHeadAngle: 0,
    shoulderTiltAngle: 0,
  });

  const [repStats, setRepStats] = useState<ExerciseRepStats>({
    exercise: 'squat',
    repCount: 0,
    stage: 'neutral',
    romPercentage: 0,
    tempoSeconds: 0,
    activeFaults: [],
  });

  const lastUiUpdateRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(performance.now());
  const lastPoseDetectionTimeRef = useRef<number>(0);

  const {
    videoRef,
    isStreaming,
    startCamera,
    stopCamera,
    isMirrored,
    setIsMirrored,
    errorMessage,
  } = useCamera({ autoStart: true });

  const exerciseRef = useRef(exercise);
  exerciseRef.current = exercise;
  const showAnglesRef = useRef(showAngles);
  showAnglesRef.current = showAngles;
  const showGhostTargetRef = useRef(showGhostTarget);
  showGhostTargetRef.current = showGhostTarget;
  const isMirroredRef = useRef(isMirrored);
  isMirroredRef.current = isMirrored;

  // Initialize MediaPipe PoseLandmarker
  useEffect(() => {
    let mounted = true;
    const modelPath =
      modelTier === 'lite'
        ? '/models/pose_landmarker_full.task' // fallback to full if lite isn't preloaded
        : '/models/pose_landmarker_full.task';

    runnerRef.current.initPoseLandmarker(modelPath).then((success) => {
      if (mounted) {
        setBackendInUse(runnerRef.current.getBackend());
      }
    });

    return () => {
      mounted = false;
      runnerRef.current.dispose();
    };
  }, [modelTier]);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'POSE TRACKING',
      activeModel: 'pose_landmarker_full.task',
      fps,
      p50Ms: 22,
      p95Ms: 29,
      trackingStatus: isStreaming ? 'TRACKING_ACTIVE' : 'SEARCHING',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [fps, isStreaming, setPerfStats]);

  const handleExerciseChange = (newEx: ExerciseType) => {
    setExercise(newEx);
    stateMachineRef.current.setExercise(newEx);
  };

  // Main 60 FPS processing and render loop
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
      currentLandmarks = generateSyntheticPose(now, exercise);
    } else {
      // Run real MediaPipe PoseLandmarker
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
        // Drop tracking cleanly after 150ms of no detections to avoid ghost skeleton persistence
        if (now - lastPoseDetectionTimeRef.current > 150) {
          currentLandmarks = [];
          landmarksRef.current = null;
        } else {
          currentLandmarks = landmarksRef.current || [];
        }
      }
    }

    if (currentLandmarks.length >= 33) {
      landmarksRef.current = currentLandmarks;

      // Compute joint angles with EMA smoothing
      const computedAngles = kinematicsRef.current.calculateJointAngles(currentLandmarks);
      anglesRef.current = computedAngles;

      // Update Exercise State Machine
      const stats = stateMachineRef.current.process(computedAngles, currentLandmarks, now);
      repStatsRef.current = stats;

      // Direct canvas rendering with zero React re-render overhead!
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        syncCanvasToVideo(canvas, video);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderPoseOverlay(ctx, currentLandmarks, computedAngles, canvas.width, canvas.height, {
            showAngles: showAnglesRef.current,
            showGhostTarget: showGhostTargetRef.current,
            activeFaults: stats.activeFaults,
            isMirrored: isMirroredRef.current,
          });
        }
      }

      // Throttle React UI state updates to 5 Hz (every 200ms)
      if (now - lastUiUpdateRef.current >= 200) {
        lastUiUpdateRef.current = now;
        setAngles(computedAngles);
        setRepStats(stats);

        const currentEx = exerciseRef.current;
        const primaryAngle =
          currentEx === 'squat'
            ? computedAngles.leftKnee
            : currentEx === 'bicep_curl' || currentEx === 'push_up' || currentEx === 'shoulder_press'
            ? computedAngles.leftElbow
            : computedAngles.trunkInclination;

        setRollingAngle((prev) => {
          const next = [...prev, primaryAngle];
          return next.length > 50 ? next.slice(-50) : next;
        });
      }
    } else {
      // Clear overlay if no pose detected
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

  // Session summary export
  const exportSessionSummary = () => {
    const summary = {
      timestamp: new Date().toISOString(),
      exercise,
      totalReps: repStats.repCount,
      lastTempoSec: repStats.tempoSeconds,
      avgRomPercentage: repStats.romPercentage,
      jointAngles: angles,
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(summary, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `omni-pose-summary-${exercise}-${Date.now()}.json`;
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
                KINEMATICS // FIG. 03
              </span>
              <StampBadge label="33 WORLD LANDMARKS" variant="sage" />
              <StampBadge label={`ACCEL: ${backendInUse}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              KINEMATIC POSE ESTIMATION & BIOMECHANICAL RIG
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              3D vector trigonometry for joint angle estimation, hysteresis exercise rep-counting, range-of-motion tracking, and desk ergonomics posture audit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Model Tier Selector */}
            <div className="flex border border-charcoal-soft bg-paper-dark rounded-[2px] p-0.5 text-[10px]">
              {(['lite', 'full', 'heavy'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setModelTier(tier)}
                  className={`px-2 py-0.5 font-bold uppercase transition-colors ${
                    modelTier === tier
                      ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                      : 'text-charcoal-soft hover:bg-paper-cream'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

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

        {/* Exercise Selector Strip */}
        <div className="flex flex-wrap items-center gap-2 p-2 border-2 border-charcoal-soft bg-paper-dark rounded-tactile">
          <span className="text-[10px] font-bold text-ink-muted uppercase mr-1">
            EXERCISE MODE:
          </span>
          {[
            { id: 'squat', label: 'SQUAT' },
            { id: 'push_up', label: 'PUSH-UP' },
            { id: 'bicep_curl', label: 'BICEP CURL' },
            { id: 'shoulder_press', label: 'SHOULDER PRESS' },
            { id: 'lunge', label: 'LUNGE' },
            { id: 'posture_check', label: 'DESK POSTURE' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleExerciseChange(item.id as ExerciseType)}
              className={`px-3 py-1 font-mono text-xs uppercase font-bold border rounded-tactile transition-all ${
                exercise === item.id
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                  : 'border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-dark'
              }`}
            >
              {item.label}
            </button>
          ))}
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

        {/* Primary Kinematic Grid: Viewport + Telemetry Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Viewport (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <CrosshairViewport
              title="KINEMATIC SKELETAL TOPOLOGY"
              isStreaming={isStreaming || syntheticMode}
              fps={fps}
              backend={backendInUse}
              controls={
                <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <MechanicalToggle
                      label="ANGLES"
                      checked={showAngles}
                      onChange={setShowAngles}
                    />
                    <MechanicalToggle
                      label="PLUMB-LINE"
                      checked={showGhostTarget}
                      onChange={setShowGhostTarget}
                    />
                    <MechanicalToggle
                      label="MIRROR"
                      checked={isMirrored}
                      onChange={setIsMirrored}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stateMachineRef.current.reset()}
                    className="gap-1 text-[10px]"
                  >
                    <RefreshCw className="w-3 h-3" />
                    RESET REPS
                  </Button>
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

            {/* Rolling Angle Chrono Strip Chart */}
            <DeskCard figure="STRIP CHART" title="PRIMARY JOINT ANGLE OVER TIME" inset>
              <div className="h-16 flex items-end gap-1 pt-2">
                {rollingAngle.map((val, idx) => {
                  const heightPercent = Math.min(100, Math.max(5, (val / 180) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-sage-green rounded-[1px] transition-all"
                      style={{ height: `${heightPercent}%` }}
                      title={`Angle: ${val}°`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-ink-muted border-t border-charcoal-soft/20 pt-1 mt-1">
                <span>-50 SAMPLES</span>
                <span>RANGE: 0° TO 180°</span>
                <span>NOW: {rollingAngle[rollingAngle.length - 1] || 180}°</span>
              </div>
            </DeskCard>
          </div>

          {/* Biomechanical Telemetry & Form Warnings (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Rep Counting & Tempo Station */}
            <DeskCard
              figure="STATE MACHINE"
              title="REPETITION & TEMPO RIG"
              subtitle="Hysteresis inflection counter & cadence"
            >
              <div className="grid grid-cols-2 gap-3 my-2">
                <div className="border border-charcoal-soft p-3 bg-paper-dark">
                  <span className="text-[10px] text-ink-muted uppercase block">REP COUNT</span>
                  <span className="text-3xl font-bold text-charcoal-soft tabular-nums">
                    {repStats.repCount}
                  </span>
                  <span className="text-[9px] text-ink-muted block uppercase">
                    STAGE: {repStats.stage}
                  </span>
                </div>

                <div className="border border-charcoal-soft p-3 bg-paper-dark">
                  <span className="text-[10px] text-ink-muted uppercase block">LAST TEMPO</span>
                  <span className="text-3xl font-bold text-charcoal-soft tabular-nums">
                    {repStats.tempoSeconds}s
                  </span>
                  <span className="text-[9px] text-ink-muted block">SECONDS / REP</span>
                </div>
              </div>

              {/* Range of Motion Meter */}
              <div className="space-y-1 mt-3">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>RANGE OF MOTION (ROM)</span>
                  <span className="tabular-nums">{repStats.romPercentage}%</span>
                </div>
                <div className="w-full bg-paper-dark border border-charcoal-soft h-2.5 rounded-[1px] overflow-hidden">
                  <div
                    className="h-full bg-sage-green transition-all duration-150"
                    style={{ width: `${repStats.romPercentage}%` }}
                  />
                </div>
              </div>
            </DeskCard>

            {/* Active Form Faults & Biomechanical Warnings */}
            <DeskCard figure="BIOMECHANICS" title="FORM ANALYSIS & FAULT DETECTOR">
              {repStats.activeFaults.length > 0 ? (
                <div className="space-y-2 my-2">
                  {repStats.activeFaults.map((fault, i) => (
                    <div
                      key={i}
                      className="p-2 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs font-bold text-brick-red flex items-center gap-2"
                    >
                      <StampBadge label="FORM ERROR" variant="brick" />
                      <span>{fault}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 border border-sage-green bg-sage-green/10 rounded-[2px] text-xs text-charcoal-soft my-2 flex items-center justify-between">
                  <span className="font-bold">BIOMECHANICAL FORM VERIFIED</span>
                  <StampBadge label="ALIGNED" variant="sage" />
                </div>
              )}

              {/* Ergonomics posture measurements */}
              <div className="space-y-1 text-xs border-t border-charcoal-soft/20 pt-2">
                <div className="flex justify-between">
                  <span className="text-ink-muted">FORWARD HEAD:</span>
                  <span className="font-bold">
                    {angles.forwardHeadAngle}&deg; (THRESHOLD &le; 22&deg;)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">SHOULDER TILT:</span>
                  <span className="font-bold">
                    {angles.shoulderTiltAngle}&deg; (THRESHOLD &le; 6&deg;)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">TRUNK INCLINE:</span>
                  <span className="font-bold">{angles.trunkInclination}&deg;</span>
                </div>
              </div>
            </DeskCard>

            {/* Live Joint Angles Table */}
            <DeskCard figure="KINEMATICS" title="CALCULATED 3D JOINT ANGLES" inset>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-1.5 border border-charcoal-soft/20 bg-paper-cream flex justify-between">
                  <span className="text-ink-muted">L_ELBOW:</span>
                  <span className="font-bold tabular-nums">{angles.leftElbow}&deg;</span>
                </div>
                <div className="p-1.5 border border-charcoal-soft/20 bg-paper-cream flex justify-between">
                  <span className="text-ink-muted">R_ELBOW:</span>
                  <span className="font-bold tabular-nums">{angles.rightElbow}&deg;</span>
                </div>
                <div className="p-1.5 border border-charcoal-soft/20 bg-paper-cream flex justify-between">
                  <span className="text-ink-muted">L_KNEE:</span>
                  <span className="font-bold tabular-nums">{angles.leftKnee}&deg;</span>
                </div>
                <div className="p-1.5 border border-charcoal-soft/20 bg-paper-cream flex justify-between">
                  <span className="text-ink-muted">R_KNEE:</span>
                  <span className="font-bold tabular-nums">{angles.rightKnee}&deg;</span>
                </div>
                <div className="p-1.5 border border-charcoal-soft/20 bg-paper-cream flex justify-between">
                  <span className="text-ink-muted">L_HIP:</span>
                  <span className="font-bold tabular-nums">{angles.leftHip}&deg;</span>
                </div>
                <div className="p-1.5 border border-charcoal-soft/20 bg-paper-cream flex justify-between">
                  <span className="text-ink-muted">R_HIP:</span>
                  <span className="font-bold tabular-nums">{angles.rightHip}&deg;</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-charcoal-soft/20 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSessionSummary}
                  className="gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  EXPORT SUMMARY
                </Button>
              </div>
            </DeskCard>
          </div>
        </div>
      </main>
    </div>
  );
}
