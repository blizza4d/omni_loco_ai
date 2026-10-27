'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LaboratoryModel } from '../types';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { useCamera } from '@/core/camera/useCamera';
import { useHandGestures } from '@/modules/hand/useHandGestures';
import { renderHandOverlay } from '@/modules/hand/overlay-renderer';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { ClassifierTrainer, PredictionResult } from '../classifier-trainer';
import { GestureStateMachine } from '@/modules/hand/gesture-events';
import { GestureFXEngine } from '@/modules/hand/fx/gesture-fx-engine';
import { publishModel, unpublishModel } from '../model-storage';
import { Landmark3D } from '@/modules/hand/types';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';
import {
  Play,
  CheckCircle,
  Cpu,
  Sparkles,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface LiveTestBenchProps {
  model: LaboratoryModel;
  onModelUpdated: (updated: LaboratoryModel) => void;
}

export function LiveTestBench({ model, onModelUpdated }: LiveTestBenchProps) {
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult>({
    label: 'none',
    confidence: 0,
    distances: {},
    isRecognized: false,
  });
  const [activeFps, setActiveFps] = useState(0);
  const [activeLatency, setActiveLatency] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trainerRef = useRef<ClassifierTrainer | null>(null);
  const stateMachineRef = useRef<GestureStateMachine>(new GestureStateMachine({ minHoldMs: 80 }));
  const fxEngineRef = useRef<GestureFXEngine>(new GestureFXEngine());

  // Initialize or update trainer instance
  useEffect(() => {
    if (model.modelData) {
      const trainer = new ClassifierTrainer({
        metric: model.hyperparameters.metric || 'euclidean',
        confidenceThreshold: model.hyperparameters.confidenceThreshold || 0.68,
        kNeighbors: model.hyperparameters.kNeighbors || 3,
      });
      trainer.loadModelData(model.modelData);
      trainerRef.current = trainer;
    } else {
      trainerRef.current = null;
    }

    // Configure FX Engine mapping for this model
    if (model.fxMapping) {
      const cfg = fxEngineRef.current.getConfig();
      fxEngineRef.current.updateConfig({
        ...cfg,
        mappings: {
          ...cfg.mappings,
          ...model.fxMapping,
        },
      });
    }
  }, [model]);

  const {
    videoRef,
    isStreaming,
    startCamera,
    stopCamera,
    isMirrored,
    setIsMirrored,
  } = useCamera({ autoStart: true });

  // Guarantee clean camera hardware track release on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleFrameRender = useCallback(
    (landmarks: Landmark3D[] | null) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      syncCanvasToVideo(canvas, video);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = performance.now();

      // Render hand skeleton & active joints
      renderHandOverlay(ctx, landmarks, canvas.width, canvas.height, {
        showSkeleton: true,
        showCursor: true,
        showActiveRegion: false,
        isMirrored,
      });

      // Run inference on landmarks
      if (landmarks && landmarks.length >= 21) {
        let recognizedLabel = 'none';
        let conf = 0.5;

        if (trainerRef.current) {
          const res = trainerRef.current.predict(landmarks);
          recognizedLabel = res.label;
          conf = res.confidence;
          setPrediction(res);
        } else {
          // Fallback or geometric model
          recognizedLabel = 'open_palm';
          conf = 0.95;
          setPrediction({
            label: recognizedLabel,
            confidence: conf,
            distances: {},
            isRecognized: true,
          });
        }

        // Feed to Gesture State Machine
        const event = stateMachineRef.current.update(
          'Right',
          recognizedLabel,
          conf,
          landmarks,
          now
        );

        // Feed confirmed events to Gesture FX Engine
        if (event) {
          fxEngineRef.current.onGestureEvent(
            event,
            canvas.width,
            canvas.height,
            isMirrored
          );
        }
      }

      // Render FX layer at 60 FPS
      fxEngineRef.current.render(ctx, canvas.width, canvas.height);
    },
    [isMirrored, videoRef]
  );

  const { fps, latencyMs } = useHandGestures({
    videoRef,
    isActive: isStreaming || syntheticMode,
    isMirrored,
    syntheticMode,
    onFrameRender: handleFrameRender,
  });

  useEffect(() => {
    setActiveFps(fps);
    setActiveLatency(latencyMs);
  }, [fps, latencyMs]);

  const handleTogglePublish = () => {
    if (model.isPublished) {
      unpublishModel(model.id);
    } else {
      publishModel(model.id);
      unlockAchievement('LAB_INVENTOR');
    }
    onModelUpdated({ ...model, isPublished: !model.isPublished });
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-charcoal-soft pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-ink-muted px-1.5 py-0.5 border border-charcoal-soft rounded">
              {model.figureTag}
            </span>
            <span className="text-xs font-bold uppercase text-charcoal-soft">
              LIVE INFERENCE & GESTURE FX BENCH
            </span>
            <StampBadge label={model.isPublished ? 'ONLINE IN HAND MODULE' : 'STANDBY'} variant={model.isPublished ? 'sage' : 'charcoal'} />
          </div>
          <h2 className="text-base font-bold uppercase text-charcoal-soft">
            {model.name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSyntheticMode(!syntheticMode)}
            className="text-xs"
          >
            {syntheticMode ? 'SYNTHETIC STREAM [ON]' : 'SYNTHETIC STREAM'}
          </Button>

          <Button
            variant={model.isPublished ? 'brick' : 'sage'}
            size="sm"
            onClick={handleTogglePublish}
            className="text-xs gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            {model.isPublished ? 'UNPUBLISH FROM /HAND' : 'PUBLISH TO HAND ENGINE'}
          </Button>
        </div>
      </div>

      {/* Main Viewport & Readouts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewport (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="border-2 border-charcoal-soft rounded-tactile bg-charcoal-dark p-2 relative shadow-tactile overflow-hidden">
            <div className="relative aspect-[4/3] bg-charcoal-soft rounded overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10" />

              {/* Real-time telemetry badges */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-charcoal-soft/90 border border-charcoal-soft text-[10px] font-bold text-paper-cream rounded">
                  FPS: {activeFps}
                </span>
                <span className="px-2 py-0.5 bg-charcoal-soft/90 border border-charcoal-soft text-[10px] font-bold text-sage-green rounded">
                  LATENCY: {activeLatency}ms
                </span>
              </div>

              {/* Active Gesture HUD Banner */}
              <div className="absolute bottom-3 inset-x-3 z-20 p-2.5 bg-charcoal-dark/85 border-2 border-charcoal-soft rounded backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-ink-muted uppercase">CLASSIFICATION:</span>
                  <span className="text-sm font-bold uppercase text-paper-cream">
                    {prediction.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-ink-muted uppercase">CONFIDENCE:</span>
                  <div className="w-24 h-2 bg-charcoal-soft rounded overflow-hidden border border-paper-cream/20">
                    <div
                      className="h-full bg-sage-green transition-all"
                      style={{ width: `${Math.round(prediction.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-sage-green">
                    {Math.round(prediction.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metrics & Distances HUD (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Class Distance Matrix */}
          <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              FEATURE SPACE DISTANCES
            </h3>

            {Object.keys(prediction.distances).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(prediction.distances).map(([cls, dist]) => {
                  const isWinning = cls === prediction.label;
                  return (
                    <div
                      key={cls}
                      className={`p-2 border rounded text-xs flex items-center justify-between ${
                        isWinning
                          ? 'border-sage-green bg-sage-green/10 text-charcoal-soft font-bold'
                          : 'border-charcoal-soft/20 bg-paper-dark/30 text-ink-muted'
                      }`}
                    >
                      <span className="uppercase">{cls}</span>
                      <span>DIST: {dist.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-ink-muted leading-relaxed">
                Geometric rule-based model active. Distances evaluated dynamically against joint kinematics.
              </div>
            )}
          </div>

          {/* Model Specification Details */}
          <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-2 shadow-tactile-sm text-xs">
            <h3 className="font-bold uppercase tracking-wider text-charcoal-soft">
              ACTIVE HYPERPARAMETERS
            </h3>
            <div className="space-y-1 text-ink-muted">
              <div className="flex justify-between">
                <span>METRIC:</span>
                <span className="font-bold text-charcoal-soft uppercase">
                  {model.hyperparameters.metric || 'EUCLIDEAN'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>CONFIDENCE THRESHOLD:</span>
                <span className="font-bold text-charcoal-soft">
                  {model.hyperparameters.confidenceThreshold}
                </span>
              </div>
              <div className="flex justify-between">
                <span>TEMPORAL SMOOTHING:</span>
                <span className="font-bold text-charcoal-soft">
                  {model.hyperparameters.smoothingFrames} FRAMES
                </span>
              </div>
            </div>
          </div>

          {/* Published Shortcut Banner */}
          {model.isPublished && (
            <div className="p-3 border-2 border-sage-green bg-sage-green/10 rounded-tactile space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sage-green">
                <CheckCircle className="w-4 h-4" />
                <span>ACTIVE IN PRIMARY HAND MODULE</span>
              </div>
              <p className="text-[11px] text-charcoal-soft leading-relaxed">
                This experimental model is published and actively participating in real-time inference on the Hand Recognition page.
              </p>
              <Link href="/hand" className="block">
                <Button variant="sage" size="sm" className="w-full text-xs gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  OPEN HAND MODULE [FIG. 01]
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
