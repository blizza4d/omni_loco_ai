'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { useHandGestures } from '@/modules/hand/useHandGestures';
import { FingerCountingEngine } from '@/modules/fingers/finger-classifier';
import { FingerOverlayRenderer } from '@/modules/fingers/overlay-renderer';
import {
  DualHandFingerResult,
  FingerActionMapping,
  DEFAULT_ACTION_MAPPINGS,
  CountHistoryItem,
} from '@/modules/fingers/types';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { useSystemStore } from '@/core/store';
import {
  Hand,
  Volume2,
  VolumeX,
  Camera,
  RefreshCw,
  Sliders,
  History,
  Activity,
  Zap,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function FingerCountingPage() {
  const [actionMappings, setActionMappings] =
    useState<FingerActionMapping[]>(DEFAULT_ACTION_MAPPINGS);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showFingerLabels, setShowFingerLabels] = useState(true);
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [history, setHistory] = useState<CountHistoryItem[]>([]);
  const [lastTriggeredAction, setLastTriggeredAction] = useState<string | null>(null);

  // Mutable classification result (zero React re-renders in 60fps loop)
  const resultRef = useRef<DualHandFingerResult>({
    leftHand: null,
    rightHand: null,
    totalRawCount: 0,
    totalStableCount: 0,
    activeGestures: [],
    combinedTextOutput: 'Hand not detected. Place hand in front of camera.',
    timestamp: 0,
  });

  // Throttled UI state (10 Hz) for scoreboard & gauges
  const [uiResult, setUiResult] = useState<DualHandFingerResult>(resultRef.current);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FingerCountingEngine>(new FingerCountingEngine());
  const rendererRef = useRef<FingerOverlayRenderer>(new FingerOverlayRenderer());
  const lastUiUpdateRef = useRef<number>(0);
  const lastSpokenCountRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const lastStableCountRef = useRef<number>(-1);

  const { setPerfStats } = useSystemStore();

  const {
    videoRef,
    isStreaming,
    startCamera,
    stopCamera,
    isMirrored,
    setIsMirrored,
    errorMessage,
  } = useCamera({ autoStart: true });

  // Direct 60 FPS Render Callback from Hand Gesture Pipeline (Synchronized inference & rendering)
  const handleFrameRender = useCallback(
    (
      _primaryLandmarks: any,
      _cursor: any,
      multiHands?: any[],
      multiHandednesses?: ('Left' | 'Right')[]
    ) => {
      const now = performance.now();
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      // Ensure canvas backing buffer matches video
      if (video && video.readyState >= 2) {
        syncCanvasToVideo(canvas, video);
      }

      const ctx = canvas.getContext('2d');
      const width = canvas.width || 640;
      const height = canvas.height || 480;

      const hands = multiHands || [];
      const handednessList = multiHandednesses || [];

      // 1. Process finger classification via invariant mathematical engine
      const fingerResult = engineRef.current.processHands(hands, handednessList, now);
      resultRef.current = fingerResult;

      // 2. Render overlays directly to canvas (ZERO React overhead!)
      if (ctx) {
        ctx.clearRect(0, 0, width, height);

        if (fingerResult.leftHand && fingerResult.leftHand.landmarks.length > 0) {
          rendererRef.current.renderHand(ctx, fingerResult.leftHand, width, height, {
            isMirrored,
            showSkeleton,
            showFingerLabels,
            showHandBanner: true,
          });
        }
        if (fingerResult.rightHand && fingerResult.rightHand.landmarks.length > 0) {
          rendererRef.current.renderHand(ctx, fingerResult.rightHand, width, height, {
            isMirrored,
            showSkeleton,
            showFingerLabels,
            showHandBanner: true,
          });
        }
      }

      // 3. Handle stable count change transitions (Action Mapping & Speech)
      const currentStable = fingerResult.totalStableCount;
      const hasHand = fingerResult.leftHand !== null || fingerResult.rightHand !== null;

      if (hasHand && currentStable !== lastStableCountRef.current) {
        lastStableCountRef.current = currentStable;

        // Map count to configured action
        const matchedAction = actionMappings.find((m) => m.count === currentStable);
        const actionLabel = matchedAction?.label || `COUNT_${currentStable}`;
        setLastTriggeredAction(actionLabel);

        // Append to history ledger
        const activeHandLabel =
          fingerResult.leftHand && fingerResult.rightHand
            ? 'Both Hands'
            : fingerResult.rightHand
            ? 'Right Hand'
            : 'Left Hand';

        const gesture =
          fingerResult.rightHand?.gestureName ||
          fingerResult.leftHand?.gestureName ||
          `${currentStable} Fingers`;

        setHistory((prev) => [
          {
            id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            count: currentStable,
            handedness: activeHandLabel,
            gesture,
            timestamp: new Date().toLocaleTimeString(),
            triggeredAction: actionLabel,
          },
          ...prev.slice(0, 19),
        ]);

        // Optional Text-to-Speech (TTS) announcement (debounced with cooldown)
        if (
          speechEnabled &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window &&
          now - lastSpeechTimeRef.current >= 1200
        ) {
          lastSpeechTimeRef.current = now;
          lastSpokenCountRef.current = currentStable;
          window.speechSynthesis.cancel(); // Cancel any lingering utterance
          const utterance = new SpeechSynthesisUtterance(
            `${currentStable} finger${currentStable === 1 ? '' : 's'}`
          );
          utterance.rate = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      } else if (!hasHand) {
        lastStableCountRef.current = -1;
      }

      // 4. Throttle React UI State updates to 10 Hz (every 100ms)
      if (now - lastUiUpdateRef.current >= 100) {
        lastUiUpdateRef.current = now;
        setUiResult({ ...fingerResult });
      }
    },
    [actionMappings, isMirrored, showSkeleton, showFingerLabels, speechEnabled, videoRef]
  );

  const {
    landmarksRef,
    multiHandsRef,
    multiHandednessesRef,
    handedness,
    isTracking,
    fps,
    latencyMs,
    backendInUse,
  } = useHandGestures({
    videoRef,
    isActive: isStreaming || syntheticMode,
    isMirrored,
    syntheticMode,
    onFrameRender: handleFrameRender,
  });

  // Check speech synthesis support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update Global Telemetry Diagnostics Store
  useEffect(() => {
    setPerfStats({
      activeModule: 'FINGER COUNTING',
      activeModel: 'hand_landmarker.task',
      fps,
      p50Ms: latencyMs,
      p95Ms: Math.round(latencyMs * 1.3),
      trackingStatus: isTracking ? 'TRACKING_ACTIVE' : 'SEARCHING',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [fps, latencyMs, isTracking, isStreaming, setPerfStats]);

  // Handle action mapping edit
  const handleActionLabelChange = (count: number, newLabel: string) => {
    setActionMappings((prev) =>
      prev.map((m) => (m.count === count ? { ...m, label: newLabel } : m))
    );
  };

  const handleResetDefaults = () => {
    setActionMappings(DEFAULT_ACTION_MAPPINGS);
    engineRef.current.reset();
    setHistory([]);
    setLastTriggeredAction(null);
  };

  const primaryHand = uiResult.rightHand || uiResult.leftHand;
  const isDualHand = uiResult.leftHand !== null && uiResult.rightHand !== null;

  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream text-charcoal-soft select-none">
      <GlobalNav />
      <PerformanceHUD />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Module Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                VISION & KINEMATICS // FIG. 12
              </span>
              <StampBadge label="21-LANDMARK CLASSIFIER" variant="sage" />
              <StampBadge label={`ACCEL: ${backendInUse}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              Finger Counting & Gesture Output
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Real-time rotation-invariant finger state classification (0-5 per hand, 0-10 combined), hysteresis stabilization, configurable action triggers & optional speech feedback.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <StampBadge label="100% ON-DEVICE" variant="sage" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMirrored(!isMirrored)}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isMirrored ? 'MIRROR: ON' : 'MIRROR: OFF'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </Button>
          </div>
        </div>

        {/* Live Output Banner */}
        <div
          className={`p-3.5 border-2 rounded-tactile shadow-tactile transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            primaryHand
              ? 'border-charcoal-soft bg-paper-dark'
              : 'border-charcoal-soft/40 bg-paper-cream-dark'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-tactile border flex items-center justify-center font-bold text-lg ${
                primaryHand
                  ? 'border-sage-green bg-sage-green/20 text-charcoal-soft'
                  : 'border-charcoal-soft bg-paper-cream text-ink-muted'
              }`}
            >
              {uiResult.totalStableCount}
            </div>
            <div>
              <span className="text-[10px] text-ink-muted uppercase block tracking-technical">
                PRIMARY DETECTION OUTPUT
              </span>
              <p className="text-sm font-bold text-charcoal-soft">
                {uiResult.combinedTextOutput}
              </p>
            </div>
          </div>

          {lastTriggeredAction && (
            <div className="flex items-center gap-2 px-3 py-1 bg-paper-cream border border-charcoal-soft rounded-tactile self-stretch sm:self-auto justify-between sm:justify-start">
              <Zap className="w-3.5 h-3.5 text-brick-red animate-pulse" />
              <span className="text-[10px] text-ink-muted">TRIGGERED:</span>
              <span className="text-xs font-bold text-charcoal-soft uppercase">
                {lastTriggeredAction}
              </span>
            </div>
          )}
        </div>

        {/* Main Grid: Viewport (8 cols) + Sidebars (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Viewport Canvas (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <DeskCard figure="FIG. 12-A" title="OPTICAL SENSOR VIEWPORT" subtitle="SKELETON & FINGER HUD">
              <div className="relative aspect-[4/3] w-full bg-[#05070A] rounded-tactile border-2 border-charcoal-soft overflow-hidden flex items-center justify-center shadow-tactile">
                {/* Background Video Stream */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${
                    isMirrored ? 'scale-x-[-1]' : ''
                  }`}
                />

                {/* 60 FPS Skeletal & HUD Overlay Canvas */}
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
                />

                {/* Corner Diagnostic HUD Badges */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                  <StampBadge
                    label={isTracking ? 'TRACKING ACTIVE' : 'SEARCHING FOR HAND'}
                    variant={isTracking ? 'sage' : 'charcoal'}
                    pulse={isTracking}
                  />
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-dark/90 border border-charcoal-soft rounded-[2px] text-charcoal-soft">
                    FPS: {fps} | {latencyMs}MS
                  </span>
                </div>

                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-dark/90 border border-charcoal-soft rounded-[2px] text-ink-muted">
                    RAW: {uiResult.totalRawCount} | STABLE: {uiResult.totalStableCount}
                  </span>
                </div>

                {/* Bottom Left Camera Hint */}
                <div className="absolute bottom-3 left-3 z-20 bg-paper-dark/90 backdrop-blur border border-charcoal-soft px-2.5 py-1 rounded-[2px] text-[10px] font-mono text-ink-muted">
                  Hold hand facing camera. Extend or fold fingers to count.
                </div>
              </div>

              {/* Viewport Toolbar Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-charcoal-soft/20 text-xs">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSkeleton}
                      onChange={(e) => setShowSkeleton(e.target.checked)}
                      className="accent-charcoal-soft"
                    />
                    <span className="text-ink-muted font-bold">SHOW SKELETON</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFingerLabels}
                      onChange={(e) => setShowFingerLabels(e.target.checked)}
                      className="accent-charcoal-soft"
                    />
                    <span className="text-ink-muted font-bold">FINGER STATUS PILLS</span>
                  </label>
                </div>

                {/* Speech Synthesis Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (speechSupported) setSpeechEnabled(!speechEnabled);
                    }}
                    disabled={!speechSupported}
                    className={`px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1.5 rounded-[2px] border transition-colors ${
                      speechEnabled
                        ? 'border-brick-red bg-brick-red/10 text-brick-red'
                        : 'border-charcoal-soft/40 bg-paper-cream text-ink-muted hover:text-charcoal-soft'
                    }`}
                  >
                    {speechEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-brick-red" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-ink-muted" />
                    )}
                    <span>VOICE ANNOUNCE {speechEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            </DeskCard>

            {/* Individual Hands Finger Breakdown Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Right Hand Card */}
              <DeskCard
                figure="FIG. 12-B"
                title="RIGHT HAND TELEMETRY"
                subtitle={uiResult.rightHand ? `${uiResult.rightHand.stableCount} OPEN` : 'NO DETECT'}
              >
                {uiResult.rightHand ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-baseline justify-between border-b border-charcoal-soft/20 pb-2">
                      <span className="text-ink-muted">DETECTED POSE:</span>
                      <span className="font-bold text-charcoal-soft uppercase">
                        {uiResult.rightHand.gestureName}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {(
                        ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
                      ).map((f) => {
                        const finger = uiResult.rightHand?.fingers[f];
                        const isOpen = finger?.isOpen;
                        return (
                          <div
                            key={f}
                            className={`p-2 rounded-[2px] border transition-colors ${
                              isOpen
                                ? 'border-sage-green bg-sage-green/20 text-charcoal-soft font-bold'
                                : 'border-charcoal-soft/30 bg-paper-dark text-ink-muted'
                            }`}
                          >
                            <span className="text-[9px] block uppercase">{f}</span>
                            <span className="text-xs font-bold">
                              {isOpen ? 'OPEN' : 'FOLD'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted italic py-4 text-center">
                    Right hand not in camera frame.
                  </p>
                )}
              </DeskCard>

              {/* Left Hand Card */}
              <DeskCard
                figure="FIG. 12-C"
                title="LEFT HAND TELEMETRY"
                subtitle={uiResult.leftHand ? `${uiResult.leftHand.stableCount} OPEN` : 'NO DETECT'}
              >
                {uiResult.leftHand ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-baseline justify-between border-b border-charcoal-soft/20 pb-2">
                      <span className="text-ink-muted">DETECTED POSE:</span>
                      <span className="font-bold text-charcoal-soft uppercase">
                        {uiResult.leftHand.gestureName}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {(
                        ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
                      ).map((f) => {
                        const finger = uiResult.leftHand?.fingers[f];
                        const isOpen = finger?.isOpen;
                        return (
                          <div
                            key={f}
                            className={`p-2 rounded-[2px] border transition-colors ${
                              isOpen
                                ? 'border-sage-green bg-sage-green/20 text-charcoal-soft font-bold'
                                : 'border-charcoal-soft/30 bg-paper-dark text-ink-muted'
                            }`}
                          >
                            <span className="text-[9px] block uppercase">{f}</span>
                            <span className="text-xs font-bold">
                              {isOpen ? 'OPEN' : 'FOLD'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted italic py-4 text-center">
                    Left hand not in camera frame.
                  </p>
                )}
              </DeskCard>
            </div>
          </div>

          {/* Right Sidebar: Action Mapping & History Ledger (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Configurable Action Mapping Panel */}
            <DeskCard
              figure="FIG. 12-D"
              title="CONFIGURABLE ACTION MAPPING"
              subtitle="COUNTS 0 THROUGH 5"
            >
              <div className="space-y-2 text-xs">
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Map finger counts to application triggers. The highlighted row flashes when executed.
                </p>

                <div className="divide-y divide-charcoal-soft/20 border border-charcoal-soft rounded-tactile overflow-hidden bg-paper-dark/60">
                  {actionMappings.map((m) => {
                    const isCurrentlyActive =
                      uiResult.totalStableCount === m.count && primaryHand !== null;
                    return (
                      <div
                        key={m.count}
                        className={`p-2.5 flex items-center justify-between gap-2 transition-colors ${
                          isCurrentlyActive
                            ? 'bg-sage-green/20 border-l-4 border-l-sage-green font-bold'
                            : 'hover:bg-paper-cream'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-[2px] border flex items-center justify-center font-bold text-xs ${
                              isCurrentlyActive
                                ? 'border-sage-green bg-sage-green text-charcoal-soft'
                                : 'border-charcoal-soft bg-paper-cream text-charcoal-soft'
                            }`}
                          >
                            {m.count}
                          </span>
                          <div>
                            <input
                              type="text"
                              value={m.label}
                              onChange={(e) =>
                                handleActionLabelChange(m.count, e.target.value)
                              }
                              className="bg-transparent border-b border-dashed border-charcoal-soft/40 text-xs font-bold text-charcoal-soft focus:border-charcoal-soft focus:outline-none w-36 uppercase"
                            />
                            <span className="text-[10px] text-ink-muted block">
                              {m.description}
                            </span>
                          </div>
                        </div>

                        {isCurrentlyActive && (
                          <span className="text-[9px] font-mono font-bold text-sage-green px-1.5 py-0.5 bg-sage-green/10 border border-sage-green rounded-[2px]">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </DeskCard>

            {/* Stable Count Change History Ledger */}
            <DeskCard
              figure="FIG. 12-E"
              title="COUNT TRANSITION LEDGER"
              subtitle="EVENT CHRONOLOGY"
            >
              <div className="space-y-2 text-xs">
                {history.length === 0 ? (
                  <p className="text-[11px] text-ink-muted italic py-6 text-center">
                    No finger transitions recorded yet. Move fingers in view to generate events.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-charcoal-soft/10">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="p-1.5 rounded-[2px] bg-paper-dark border border-charcoal-soft/30 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-[2px] bg-paper-cream border border-charcoal-soft flex items-center justify-center font-bold text-[11px]">
                            {item.count}
                          </span>
                          <div>
                            <span className="text-[11px] font-bold text-charcoal-soft block">
                              {item.triggeredAction}
                            </span>
                            <span className="text-[9px] text-ink-muted">
                              {item.handedness} · {item.gesture}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-ink-muted">
                          {item.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DeskCard>
          </div>
        </div>
      </main>
    </div>
  );
}
