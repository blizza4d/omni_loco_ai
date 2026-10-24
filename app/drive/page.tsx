'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { useHandGestures } from '@/modules/hand/useHandGestures';
import { SteeringEngine } from '@/modules/drive/steering-engine';
import { VehiclePhysics } from '@/modules/drive/physics';
import { initRoadScene, RoadSceneController } from '@/modules/drive/road-generator';
import { DrivingHUD } from '@/modules/drive/components/DrivingHUD';
import { SimulatorDiagnostics } from '@/modules/drive/components/SimulatorDiagnostics';
import { VehicleState } from '@/modules/drive/types';
import { Landmark3D } from '@/modules/hand/types';
import { RefreshCw, Sun, Moon, Radio } from 'lucide-react';
import { useSettingsStore } from '@/core/store';

export default function DrivePage() {
  const { theme } = useSettingsStore();
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [lightingMode, setLightingMode] = useState<'day' | 'night'>(
    theme === 'dark' ? 'night' : 'day'
  );
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roadControllerRef = useRef<RoadSceneController | null>(null);
  const steeringEngineRef = useRef<SteeringEngine>(new SteeringEngine());
  const physicsRef = useRef<VehiclePhysics>(new VehiclePhysics());
  const animFrameRef = useRef<number | null>(null);
  const lastHudUpdateRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Keyboard state
  const keysPressedRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  // High-frequency mutable vehicle state for 60 FPS Three.js rendering
  const vehicleStateRef = useRef<VehicleState>({
    speed: 0,
    maxSpeed: 120,
    positionX: 0,
    distanceMeters: 0,
    steeringAngle: 0,
    wheelRotationRad: 0,
    throttle: 0,
    brake: 0,
    score: 1000,
    laneDiscipline: 100,
    handsLost: false,
    controlSource: 'GESTURE',
  });

  // Throttled UI state for DrivingHUD (10 Hz)
  const [vehicleState, setVehicleState] = useState<VehicleState>(vehicleStateRef.current);

  const { videoRef, isStreaming } = useCamera({ autoStart: true });

  const { landmarksRef, multiHandsRef, gestures, isTracking, fps, latencyMs } = useHandGestures({
    videoRef,
    isActive: isStreaming || syntheticMode,
    syntheticMode,
  });

  // Listen for keyboard controls
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysPressedRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysPressedRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysPressedRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysPressedRef.current.down = true;
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysPressedRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysPressedRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysPressedRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysPressedRef.current.down = false;
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize Three.js WebGL scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    roadControllerRef.current = initRoadScene(canvas);
    roadControllerRef.current.setLighting(lightingMode);

    const handleResize = () => {
      if (canvas && roadControllerRef.current) {
        roadControllerRef.current.resize(canvas.clientWidth, canvas.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (roadControllerRef.current) {
        roadControllerRef.current.dispose();
        roadControllerRef.current = null;
      }
    };
  }, []);

  // Sync lighting mode with global theme
  useEffect(() => {
    const desired = theme === 'dark' ? 'night' : 'day';
    setLightingMode(desired);
    if (roadControllerRef.current) {
      roadControllerRef.current.setLighting(desired);
    }
  }, [theme]);

  // Stable 60 FPS physics & rendering loop (NO React re-renders per frame)
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTimeRef.current) / 1000));
      lastFrameTimeRef.current = now;

      // Determine keyboard inputs
      let kbSteer = 0;
      if (keysPressedRef.current.left) kbSteer -= 1;
      if (keysPressedRef.current.right) kbSteer += 1;
      const kbThrottle = keysPressedRef.current.up ? 1 : 0;
      const kbBrake = keysPressedRef.current.down ? 1 : 0;

      // Extract wrist landmarks from multiHandsRef or landmarksRef
      const hands = multiHandsRef.current;
      let leftWrist: Landmark3D | undefined = undefined;
      let rightWrist: Landmark3D | undefined = undefined;
      let singleHandWrist: Landmark3D | undefined = undefined;
      let singleHandMcp: Landmark3D | undefined = undefined;

      if (hands && hands.length >= 2) {
        // Dual-hand mode: sort by screen-space X (mirrored user view: sx = 1.0 - rawX)
        const h0 = hands[0]!;
        const h1 = hands[1]!;
        const sx0 = 1.0 - h0[0]!.x;
        const sx1 = 1.0 - h1[0]!.x;

        const w0: Landmark3D = { x: sx0, y: h0[0]!.y, z: h0[0]!.z };
        const w1: Landmark3D = { x: sx1, y: h1[0]!.y, z: h1[0]!.z };

        // The hand with smaller screen X is on driver's left, larger is on driver's right
        if (w0.x < w1.x) {
          leftWrist = w0;
          rightWrist = w1;
        } else {
          leftWrist = w1;
          rightWrist = w0;
        }
      } else if (hands && hands.length === 1 && hands[0]) {
        // Single hand tilt mode in screen space
        const single = hands[0];
        const rawW = single[0]!;
        const rawM = single[9] || single[5]!;
        singleHandWrist = { x: 1.0 - rawW.x, y: rawW.y, z: rawW.z };
        singleHandMcp = { x: 1.0 - rawM.x, y: rawM.y, z: rawM.z };
      } else if (landmarksRef.current && landmarksRef.current.length >= 21) {
        const rawW = landmarksRef.current[0]!;
        const rawM = landmarksRef.current[9]!;
        singleHandWrist = { x: 1.0 - rawW.x, y: rawW.y, z: rawW.z };
        singleHandMcp = { x: 1.0 - rawM.x, y: rawM.y, z: rawM.z };
      }

      const isFist = gestures.some((g) => g.name === 'closed_fist');

      // Run steering engine
      const steeringResult = steeringEngineRef.current.process(
        {
          leftWrist,
          rightWrist,
          singleHandWrist,
          singleHandMcp,
          leftFist: isFist,
          rightFist: isFist,
          isTracking: Boolean(isTracking || syntheticMode || (hands && hands.length > 0)),
          timestamp: now,
        },
        kbSteer,
        kbThrottle,
        kbBrake
      );

      // Handle calibration
      if (isCalibrating) {
        const prog = steeringEngineRef.current.getCalibrationProgress();
        setCalibrationProgress(prog);
        if (prog >= 1.0) {
          setIsCalibrating(false);
        }
      }

      // Step physics & update road mesh in Three.js
      let roadCurvature = 0;
      if (roadControllerRef.current) {
        roadCurvature = roadControllerRef.current.update(
          vehicleStateRef.current.speed,
          (steeringResult.steeringAngle * Math.PI) / 180,
          vehicleStateRef.current.positionX,
          dt
        );
      }

      const nextState = physicsRef.current.update(
        steeringResult.steeringAngle,
        steeringResult.throttle,
        steeringResult.brake,
        roadCurvature,
        dt
      );

      nextState.handsLost = steeringResult.handsLost;
      nextState.controlSource = steeringResult.controlSource;
      vehicleStateRef.current = nextState;

      // Throttle HUD update to 10 Hz (every 100ms) to ensure 60fps Three.js simulation
      if (now - lastHudUpdateRef.current >= 100) {
        lastHudUpdateRef.current = now;
        setVehicleState({ ...nextState });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gestures, isTracking, syntheticMode, isCalibrating, landmarksRef, multiHandsRef]);

  const handleStartCalibration = () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    steeringEngineRef.current.startCalibration();
  };

  const toggleLighting = () => {
    const next = lightingMode === 'day' ? 'night' : 'day';
    setLightingMode(next);
    if (roadControllerRef.current) {
      roadControllerRef.current.setLighting(next);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream">
      <GlobalNav />
      <PerformanceHUD />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-4">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-3 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                SIMULATION RIG // FIG. 04
              </span>
              <StampBadge label="3D PROCEDURAL APEX" variant="sage" />
              <StampBadge label="DUAL/SINGLE-HAND GESTURE MATRIX" variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              GESTURE-STEERED VEHICLE DYNAMICS SIMULATOR
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiagnosticsOpen(true)}
              className="gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-brick-red" />
              <span>DIAGNOSTICS</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleStartCalibration} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>CALIBRATE WHEEL</span>
            </Button>
            <Button variant="outline" size="sm" onClick={toggleLighting} className="gap-1.5">
              {lightingMode === 'day' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{lightingMode.toUpperCase()}</span>
            </Button>
            <Button
              variant={syntheticMode ? 'brick' : 'outline'}
              size="sm"
              onClick={() => setSyntheticMode(!syntheticMode)}
            >
              <span>{syntheticMode ? 'SYNTHETIC ACTIVE' : 'SYNTHETIC BENCHMARK'}</span>
            </Button>
          </div>
        </div>

        {/* 3D WebGL Driving Simulation Cockpit Viewport */}
        <div className="relative w-full h-[520px] border-2 border-charcoal-soft rounded-tactile overflow-hidden shadow-tactile-lg bg-paper-cream">
          {/* Three.js Canvas */}
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Interactive Mechanical Instrument HUD */}
          <DrivingHUD
            vehicleState={vehicleState}
            isCalibrating={isCalibrating}
            calibrationProgress={calibrationProgress}
          />

          {/* Hidden camera preview for hand tracking */}
          <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        </div>

        {/* Driver Guidance Strip */}
        <div className="p-3 border-2 border-charcoal-soft bg-paper-dark rounded-tactile flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="font-bold uppercase text-charcoal-soft">HOW TO STEER:</span>
            <span>&bull; Dual-hand: grip imaginary steering wheel and tilt</span>
            <span>&bull; Single-hand: tilt palm left or right</span>
            <span>&bull; Clench fist: mechanical brake</span>
            <span>&bull; Keyboard override: [A/D or &larr;/&rarr;] steer, [W/&uarr;] gas, [S/&darr;] brake</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-ink-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-sage-green" />
            <span>KINEMATIC BICYCLE & BENT 3D ROAD ACTIVE</span>
          </div>
        </div>

        {/* Live Hardware & Telemetry Diagnostics Modal */}
        <SimulatorDiagnostics
          isOpen={diagnosticsOpen}
          onClose={() => setDiagnosticsOpen(false)}
          vehicleState={vehicleState}
          detectedHandsCount={multiHandsRef.current?.length || 0}
          isTracking={isTracking}
          fps={fps}
          latencyMs={latencyMs}
          lastTrackingUpdateMs={0}
          isCalibrating={isCalibrating}
          calibrationProgress={calibrationProgress}
          onRecalibrate={handleStartCalibration}
        />
      </main>
    </div>
  );
}
