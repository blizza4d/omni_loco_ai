'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LaboratoryModel, TrainingSample } from '../types';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { useCamera } from '@/core/camera/useCamera';
import { useHandGestures } from '@/modules/hand/useHandGestures';
import { renderHandOverlay } from '@/modules/hand/overlay-renderer';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { HandFeatureExtractor } from '../feature-extractor';
import { ClassifierTrainer } from '../classifier-trainer';
import { saveModel } from '../model-storage';
import { Landmark3D } from '@/modules/hand/types';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';
import {
  Camera,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Cpu,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export interface TrainingDataCollectorProps {
  model: LaboratoryModel;
  onModelUpdated: (updated: LaboratoryModel) => void;
  onGoToTestBench: () => void;
}

export function TrainingDataCollector({
  model,
  onModelUpdated,
  onGoToTestBench,
}: TrainingDataCollectorProps) {
  const [selectedClass, setSelectedClass] = useState<string>(model.classes[0] || 'GESTURE_1');
  const [samples, setSamples] = useState<TrainingSample[]>(
    model.modelData?.trainingSamples || []
  );
  const [isRecording, setIsRecording] = useState(false);
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [trainingResult, setTrainingResult] = useState<{
    trainAcc: number;
    valAcc: number;
    warnings: string[];
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingCountRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);
  const latestLandmarksRef = useRef<Landmark3D[] | null>(null);

  const {
    videoRef,
    isStreaming,
    startCamera,
    stopCamera,
    isMirrored,
    setIsMirrored,
  } = useCamera({ autoStart: true });

  const handleFrameRender = useCallback(
    (landmarks: Landmark3D[] | null) => {
      latestLandmarksRef.current = landmarks;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      syncCanvasToVideo(canvas, video);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderHandOverlay(ctx, landmarks, canvas.width, canvas.height, {
        showSkeleton: true,
        showCursor: false,
        showActiveRegion: false,
        isMirrored,
      });

      // If recording, capture frames at ~10 Hz (every 100ms)
      if (isRecording && landmarks && landmarks.length >= 21) {
        const now = performance.now();
        if (now - lastCaptureTimeRef.current >= 90) {
          lastCaptureTimeRef.current = now;
          const features = HandFeatureExtractor.extractNormalizedVector(landmarks);
          const sample: TrainingSample = {
            id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            label: selectedClass,
            landmarks: [...landmarks],
            normalizedFeatures: features,
            timestamp: Date.now(),
            hand: 'Right',
          };

          setSamples((prev) => {
            const updated = [...prev, sample];
            recordingCountRef.current++;
            if (recordingCountRef.current >= 30) {
              setIsRecording(false);
            }
            return updated;
          });
        }
      }
    },
    [isRecording, isMirrored, selectedClass, videoRef]
  );

  useHandGestures({
    videoRef,
    isActive: isStreaming || syntheticMode,
    isMirrored,
    syntheticMode,
    onFrameRender: handleFrameRender,
  });

  const handleStartRecording = () => {
    recordingCountRef.current = 0;
    lastCaptureTimeRef.current = performance.now();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleDeleteSample = (id: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearClassSamples = (cls: string) => {
    if (confirm(`Clear all captured samples for class "${cls}"?`)) {
      setSamples((prev) => prev.filter((s) => s.label !== cls));
    }
  };

  const handleTrainModel = () => {
    if (samples.length < 4) {
      alert('Please record at least 4 total samples across classes before training.');
      return;
    }

    const trainer = new ClassifierTrainer({
      metric: model.hyperparameters.metric || 'euclidean',
      kNeighbors: model.hyperparameters.kNeighbors || 3,
      confidenceThreshold: model.hyperparameters.confidenceThreshold || 0.68,
    });

    const { stats, warnings } = trainer.train(samples, 0.2);
    const modelData = trainer.getModelData();

    const updatedModel: LaboratoryModel = {
      ...model,
      modelData: {
        ...modelData,
        trainingSamples: samples,
      },
      trainingStats: stats,
      updatedAt: new Date().toISOString(),
    };

    saveModel(updatedModel);
    onModelUpdated(updatedModel);
    unlockAchievement('LAB_INVENTOR');

    setTrainingResult({
      trainAcc: stats.trainAccuracy,
      valAcc: stats.valAccuracy,
      warnings,
    });
  };

  const classCounts = model.classes.reduce((acc, cls) => {
    acc[cls] = samples.filter((s) => s.label === cls).length;
    return acc;
  }, {} as Record<string, number>);

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
              DATA COLLECTOR & MODEL TRAINER
            </span>
            <StampBadge label={`${samples.length} SAMPLES RECORDED`} variant="sage" />
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
            {syntheticMode ? 'SYNTHETIC STREAM [ACTIVE]' : 'SYNTHETIC MODE'}
          </Button>

          <Button
            variant="sage"
            size="sm"
            onClick={handleTrainModel}
            className="text-xs bg-sage-green text-charcoal-soft border-charcoal-soft"
          >
            <Cpu className="w-3.5 h-3.5 mr-1" />
            TRAIN CLASSIFIER NOW
          </Button>
        </div>
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Camera Recorder (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border-2 border-charcoal-soft rounded-tactile bg-charcoal-dark p-2 relative shadow-tactile overflow-hidden">
            <div className="relative aspect-[4/3] bg-charcoal-soft rounded overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10" />

              {/* Recording Overlay Indicator */}
              {isRecording && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 bg-brick-red/90 text-paper-cream text-xs font-bold rounded animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-paper-cream animate-ping" />
                  RECORDING SAMPLE BATCH ({recordingCountRef.current}/30)
                </div>
              )}

              {/* Status HUD Tag */}
              <div className="absolute bottom-3 right-3 z-20 px-2 py-1 bg-charcoal-soft/80 border border-sage-green/40 text-[10px] text-sage-green font-mono rounded">
                ACTIVE CLASS: {selectedClass}
              </div>
            </div>
          </div>

          {/* Recording Controls Strip */}
          <div className="flex items-center justify-between p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-cream shadow-tactile-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-charcoal-soft">RECORD CLASS:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-paper-dark border-2 border-charcoal-soft text-xs font-bold uppercase px-2 py-1 rounded"
              >
                {model.classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls} ({classCounts[cls] || 0} samples)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {isRecording ? (
                <Button variant="brick" size="sm" onClick={handleStopRecording} className="gap-1 text-xs">
                  <Square className="w-3.5 h-3.5" />
                  STOP RECORDING
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleStartRecording} className="gap-1 text-xs">
                  <Play className="w-3.5 h-3.5" />
                  CAPTURE 30 SAMPLES
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Dataset Gallery & Training Metrics (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Class Breakdown Card */}
          <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">
                DATASET CLASS DISTRIBUTION
              </h3>
              <span className="text-[10px] text-ink-muted">TOTAL: {samples.length}</span>
            </div>

            <div className="space-y-2">
              {model.classes.map((cls) => {
                const count = classCounts[cls] || 0;
                const isCurrent = cls === selectedClass;
                return (
                  <div
                    key={cls}
                    className={`p-2.5 border-2 rounded transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'border-sage-green bg-sage-green/10'
                        : 'border-charcoal-soft/30 bg-paper-dark/20'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold uppercase">{cls}</div>
                      <div className="text-[10px] text-ink-muted">
                        {count >= 20 ? (
                          <span className="text-sage-green font-semibold">✓ Sufficient samples</span>
                        ) : count > 0 ? (
                          <span className="text-amber-500 font-semibold">▲ Low samples ({count}/20)</span>
                        ) : (
                          <span className="text-brick-red font-semibold">✕ No samples yet</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{count}</span>
                      {count > 0 && (
                        <button
                          onClick={() => handleClearClassSamples(cls)}
                          className="p-1 hover:text-brick-red text-ink-muted"
                          title="Clear class samples"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Training Results HUD */}
          {trainingResult && (
            <div className="border-2 border-sage-green rounded-tactile p-4 bg-sage-green/10 space-y-3">
              <div className="flex items-center gap-1.5 text-sage-green">
                <CheckCircle className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">TRAINING COMPLETE & MODEL PERSISTED</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 border border-charcoal-soft/30 rounded bg-paper-cream">
                  <div className="text-[9px] text-ink-muted uppercase">TRAIN ACCURACY</div>
                  <div className="text-base font-bold text-sage-green">
                    {Math.round(trainingResult.trainAcc * 100)}%
                  </div>
                </div>
                <div className="p-2 border border-charcoal-soft/30 rounded bg-paper-cream">
                  <div className="text-[9px] text-ink-muted uppercase">VAL ACCURACY</div>
                  <div className="text-base font-bold text-indigo-500">
                    {Math.round(trainingResult.valAcc * 100)}%
                  </div>
                </div>
              </div>

              {trainingResult.warnings.length > 0 && (
                <div className="space-y-1 text-[11px] text-amber-600 bg-amber-500/10 p-2 rounded border border-amber-500/30">
                  {trainingResult.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="sage"
                size="sm"
                onClick={onGoToTestBench}
                className="w-full text-xs"
              >
                PROCEED TO LIVE TEST BENCH
              </Button>
            </div>
          )}

          {/* Recent Samples Strip */}
          <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-2">
            <div className="flex justify-between items-center text-xs font-bold uppercase">
              <span>RECENT CAPTURED SAMPLES</span>
              <span className="text-[10px] text-ink-muted">CLICK TO REMOVE</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 max-h-24">
              {samples.slice(-10).reverse().map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleDeleteSample(sample.id)}
                  className="p-1.5 border border-charcoal-soft/30 rounded hover:border-brick-red bg-paper-dark text-left shrink-0 text-[10px]"
                  title="Delete sample"
                >
                  <div className="font-bold text-[9px] line-clamp-1">{sample.label}</div>
                  <div className="text-[8px] text-ink-muted">
                    {new Date(sample.timestamp).toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
