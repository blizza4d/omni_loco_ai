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
import { useHandGestures } from '@/modules/hand/useHandGestures';
import { renderHandOverlay } from '@/modules/hand/overlay-renderer';
import { MouseFreeDemoBoard } from '@/modules/hand/components/MouseFreeDemoBoard';
import { JOINT_NAMES, Landmark3D } from '@/modules/hand/types';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { Video, VideoOff, RefreshCw, Sparkles, Cpu } from 'lucide-react';

export default function HandModulePage() {
  const [showJointLabels, setShowJointLabels] = useState(false);
  const [showRawCoords, setShowRawCoords] = useState(false);
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [rawCoordsList, setRawCoordsList] = useState<Landmark3D[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastRawCoordsUpdateRef = useRef<number>(0);

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

  // Direct render callback: draws immediately on animation frame with zero React state overhead!
  const handleFrameRender = useCallback(
    (
      landmarks: Landmark3D[] | null,
      cursor: { x: number; y: number; isPinching: boolean; dwellProgress: number }
    ) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      // Ensure canvas backing dimensions match video
      syncCanvasToVideo(canvas, video);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderHandOverlay(ctx, landmarks, canvas.width, canvas.height, {
        showJointLabels,
        showSkeleton: true,
        showCursor: true,
        showActiveRegion: true,
        cursor,
        isMirrored,
      });

      // Throttle raw coordinates table to 4 Hz
      if (showRawCoords && landmarks) {
        const now = performance.now();
        if (now - lastRawCoordsUpdateRef.current > 250) {
          lastRawCoordsUpdateRef.current = now;
          setRawCoordsList([...landmarks]);
        }
      }
    },
    [showJointLabels, isMirrored, showRawCoords, videoRef]
  );

  const {
    cursorRef,
    gestures,
    handedness,
    setHandedness,
    isTracking,
    fps,
    latencyMs,
    backendInUse,
    recalibrate,
  } = useHandGestures({
    videoRef,
    isActive: isStreaming || syntheticMode,
    isMirrored,
    syntheticMode,
    onFrameRender: handleFrameRender,
  });

  const activeGesture = gestures[0] || { name: 'none', confidence: 0, label: 'TRACKING' };

  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream">
      <GlobalNav />
      <PerformanceHUD />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Module Header Strip */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                OPTICAL KINEMATICS // FIG. 01
              </span>
              <StampBadge label="21 3D LANDMARKS" variant="sage" />
              <StampBadge label={`ACCEL: ${backendInUse}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              HAND GESTURE RECOGNITION & SPATIAL ENGINE
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Real-time 21-joint 3D spatial reconstruction with hysteresis pinch detection, One Euro coordinate smoothing, and touchless virtual cursor interaction.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={syntheticMode ? 'brick' : 'outline'}
              size="sm"
              onClick={() => setSyntheticMode(!syntheticMode)}
              className="gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{syntheticMode ? 'SYNTHETIC: ON' : 'SYNTHETIC MODE'}</span>
            </Button>
            <Button
              variant={isStreaming ? 'outline' : 'default'}
              size="sm"
              onClick={() => (isStreaming ? stopCamera() : startCamera())}
              className="gap-1.5"
            >
              {isStreaming ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span>{isStreaming ? 'PAUSE FEED' : 'ACTIVATE CAM'}</span>
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

        {/* Primary Optical Grid: Viewport + Gesture Telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Optical Viewport (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <CrosshairViewport
              title="OPTICAL HAND RECONSTRUCTION"
              isStreaming={isStreaming || syntheticMode}
              fps={fps}
              backend={backendInUse}
              overlayText={
                activeGesture.name !== 'none'
                  ? `DETECTED: ${activeGesture.label} (${Math.round(activeGesture.confidence * 100)}%)`
                  : undefined
              }
              controls={
                <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <MechanicalToggle
                      label="LABELS"
                      checked={showJointLabels}
                      onChange={setShowJointLabels}
                    />
                    <MechanicalToggle
                      label="MIRROR"
                      checked={isMirrored}
                      onChange={setIsMirrored}
                    />
                    <MechanicalToggle
                      label="RAW DATA"
                      checked={showRawCoords}
                      onChange={setShowRawCoords}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {devices.length > 1 && (
                      <select
                        value={currentDeviceId}
                        onChange={(e) => switchDevice(e.target.value)}
                        className="bg-paper-dark border border-charcoal-soft text-[10px] p-1 font-mono uppercase"
                      >
                        {devices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <Button variant="outline" size="sm" onClick={recalibrate} className="text-[10px]">
                      CALIBRATE
                    </Button>
                  </div>
                </div>
              }
            >
              {/* Sized & positioned synchronously with matching object-contain */}
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

              {/* High-Precision Overlay Canvas with matching object-contain */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            </CrosshairViewport>

            {/* Raw Joint Coordinates Inspector Table (Throttled update) */}
            {showRawCoords && (
              <DeskCard figure="TELEM. 01" title="RAW 3D JOINT VECTORS" inset>
                <div className="max-h-48 overflow-y-auto font-mono text-[10px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-charcoal-soft/40 text-ink-muted text-left">
                        <th className="py-1">#</th>
                        <th>JOINT</th>
                        <th>X (NORM)</th>
                        <th>Y (NORM)</th>
                        <th>Z (DEPTH)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-soft/10">
                      {rawCoordsList.map((pt, i) => (
                        <tr key={i} className="hover:bg-paper-cream">
                          <td className="py-0.5 font-bold">{i}</td>
                          <td className="text-charcoal-soft">{JOINT_NAMES[i]}</td>
                          <td className="tabular-nums">{pt.x.toFixed(4)}</td>
                          <td className="tabular-nums">{pt.y.toFixed(4)}</td>
                          <td className="tabular-nums">{pt.z.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DeskCard>
            )}
          </div>

          {/* Gesture Library Confidence Bars (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <DeskCard
              figure="CLASSIFIER"
              title="GESTURE RECOGNITION MATRIX"
              subtitle="Real-time multi-gesture confidence scores"
            >
              <div className="space-y-2.5 my-2">
                {[
                  { id: 'pinch', label: 'PINCH / CLICK (HYSTERESIS)' },
                  { id: 'open_palm', label: 'OPEN PALM (SPREAD)' },
                  { id: 'closed_fist', label: 'CLOSED FIST' },
                  { id: 'pointing', label: 'POINTING (INDEX EXTENDED)' },
                  { id: 'thumbs_up', label: 'THUMBS UP' },
                  { id: 'peace_sign', label: 'PEACE SIGN' },
                  { id: 'two_finger_scroll', label: 'TWO-FINGER SCROLL' },
                  { id: 'swipe_left', label: 'SWIPE LEFT' },
                  { id: 'swipe_right', label: 'SWIPE RIGHT' },
                ].map((item) => {
                  const match = gestures.find((g) => g.name === item.id);
                  const confidence = match ? match.confidence : 0;
                  const isActive = confidence > 0.6;

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className={isActive ? 'text-brick-red' : 'text-charcoal-soft'}>
                          {item.label}
                        </span>
                        <span className="tabular-nums text-ink-muted">
                          {(confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-paper-dark border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-150 ${
                            isActive ? 'bg-brick-red' : 'bg-sage-green'
                          }`}
                          style={{ width: `${confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-charcoal-soft/20 flex items-center justify-between text-[10px] text-ink-muted">
                <span>INFERENCE: {latencyMs}ms</span>
                <span>HANDEDNESS: {handedness}</span>
              </div>
            </DeskCard>
          </div>
        </div>

        {/* Spatial UI Mode: Mouse-Free Tactile Demo Board */}
        <MouseFreeDemoBoard
          cursorRef={cursorRef}
          onRecalibrate={recalibrate}
          handedness={handedness}
          onHandednessChange={setHandedness}
        />
      </main>
    </div>
  );
}
