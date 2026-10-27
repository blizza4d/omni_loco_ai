'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LaboratoryModel,
  LaboratoryDataset,
  TrainingSample,
  DatasetQualityReport,
} from '../types';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { useCamera } from '@/core/camera/useCamera';
import { useHandGestures } from '@/modules/hand/useHandGestures';
import { renderHandOverlay } from '@/modules/hand/overlay-renderer';
import { syncCanvasToVideo } from '@/core/camera/coordinates';
import { HandFeatureExtractor } from '../feature-extractor';
import { ClassifierTrainer } from '../classifier-trainer';
import { analyzeDataset } from '../dataset-diagnostics';
import {
  saveModel,
  getAllDatasets,
  saveDataset,
  deleteDataset,
  exportDatasetToJSON,
  importDatasetFromJSON,
} from '../model-storage';
import { Landmark3D } from '@/modules/hand/types';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';
import {
  Play,
  Square,
  Trash2,
  RefreshCw,
  Cpu,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Download,
  Upload,
  Plus,
  Eye,
  Sliders,
  Layers,
  X,
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
  // Datasets
  const [datasets, setDatasets] = useState<LaboratoryDataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<LaboratoryDataset | null>(null);

  // Selected class
  const [selectedClass, setSelectedClass] = useState<string>(model.classes[0] || 'GESTURE_1');
  const [newClassInput, setNewClassInput] = useState('');

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [syntheticMode, setSyntheticMode] = useState(false);
  const [currentBurstId, setCurrentBurstId] = useState<string>('');

  // Sample inspection modal
  const [inspectingSample, setInspectingSample] = useState<TrainingSample | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Asynchronous Training State
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStage, setTrainingStage] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const [trainingResult, setTrainingResult] = useState<{
    trainAcc: number;
    valAcc: number;
    f1: number;
    warnings: string[];
    durationMs?: number;
  } | null>(null);

  const [qualityReport, setQualityReport] = useState<DatasetQualityReport | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingCountRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);
  const latestLandmarksRef = useRef<Landmark3D[] | null>(null);

  // Load datasets on mount
  useEffect(() => {
    const list = getAllDatasets();
    setDatasets(list);

    // If model has datasetId, select it; otherwise find or create matching
    let target = list.find((d) => d.id === model.datasetId);
    if (!target) {
      if (list.length > 0) {
        target = list[0];
      } else {
        // Create initial default dataset
        const initialDS: LaboratoryDataset = {
          id: `dataset-${model.id}`,
          name: `${model.name} Dataset`,
          description: `Custom gesture training dataset for ${model.name}`,
          version: '1.0.0',
          classes: [...model.classes],
          samples: model.modelData?.trainingSamples || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveDataset(initialDS);
        target = initialDS;
        setDatasets([initialDS]);
      }
    }
    setActiveDataset(target || null);
  }, [model]);

  // Recalculate quality report when samples change
  useEffect(() => {
    if (activeDataset) {
      const rep = analyzeDataset(activeDataset.samples, activeDataset.classes);
      setQualityReport(rep);
    }
  }, [activeDataset]);

  // Draw sample in inspector modal
  useEffect(() => {
    if (inspectModalOpen && inspectingSample && sampleCanvasRef.current) {
      const cvs = sampleCanvasRef.current;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        renderHandOverlay(ctx, inspectingSample.landmarks, cvs.width, cvs.height, {
          showSkeleton: true,
          showCursor: false,
          showActiveRegion: false,
          isMirrored: false,
        });
      }
    }
  }, [inspectModalOpen, inspectingSample]);

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

      // Capture frame if recording
      if (isRecording && landmarks && landmarks.length >= 21 && activeDataset) {
        const now = performance.now();
        if (now - lastCaptureTimeRef.current >= 80) {
          lastCaptureTimeRef.current = now;
          const features = HandFeatureExtractor.extractNormalizedVector(landmarks);
          const sample: TrainingSample = {
            id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            label: selectedClass,
            landmarks: [...landmarks],
            normalizedFeatures: features,
            timestamp: Date.now(),
            hand: 'Right',
            burstId: currentBurstId,
            qualityScore: 0.95,
          };

          setActiveDataset((prev) => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              samples: [...prev.samples, sample],
              updatedAt: new Date().toISOString(),
            };
            saveDataset(updated);
            return updated;
          });

          recordingCountRef.current++;
          if (recordingCountRef.current >= 30) {
            setIsRecording(false);
          }
        }
      }
    },
    [isRecording, isMirrored, selectedClass, activeDataset, currentBurstId, videoRef]
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
    const bId = `burst-${Date.now().toString(36)}`;
    setCurrentBurstId(bId);
    lastCaptureTimeRef.current = performance.now();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleAddClass = () => {
    const formatted = newClassInput.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!formatted || !activeDataset) return;

    if (!activeDataset.classes.includes(formatted)) {
      const updated = {
        ...activeDataset,
        classes: [...activeDataset.classes, formatted],
      };
      saveDataset(updated);
      setActiveDataset(updated);
      setSelectedClass(formatted);
      setNewClassInput('');
    }
  };

  const handleDeleteSample = (id: string) => {
    if (!activeDataset) return;
    const updated = {
      ...activeDataset,
      samples: activeDataset.samples.filter((s) => s.id !== id),
    };
    saveDataset(updated);
    setActiveDataset(updated);
    if (inspectingSample?.id === id) setInspectModalOpen(false);
  };

  const handleRelabelSample = (id: string, newLabel: string) => {
    if (!activeDataset) return;
    const updated = {
      ...activeDataset,
      samples: activeDataset.samples.map((s) => (s.id === id ? { ...s, label: newLabel } : s)),
    };
    saveDataset(updated);
    setActiveDataset(updated);
    if (inspectingSample?.id === id) {
      setInspectingSample({ ...inspectingSample, label: newLabel });
    }
  };

  const handleClearClassSamples = (cls: string) => {
    if (!activeDataset) return;
    if (confirm(`Clear all captured samples for class "${cls}"?`)) {
      const updated = {
        ...activeDataset,
        samples: activeDataset.samples.filter((s) => s.label !== cls),
      };
      saveDataset(updated);
      setActiveDataset(updated);
    }
  };

  // Asynchronous Training Pass
  const handleTrainModel = async () => {
    if (!activeDataset || activeDataset.samples.length < 4) {
      alert('Please capture at least 4 total samples across classes before training.');
      return;
    }

    try {
      setIsTraining(true);
      setTrainingProgress(0);
      setTrainingStage('Initializing training engine...');
      abortControllerRef.current = new AbortController();

      const trainer = new ClassifierTrainer({
        metric: model.hyperparameters.metric || 'euclidean',
        kNeighbors: model.hyperparameters.kNeighbors || 3,
        confidenceThreshold: model.hyperparameters.confidenceThreshold || 0.68,
      });

      const { stats, warnings } = await trainer.trainAsync(activeDataset.samples, {
        valSplit: 0.2,
        onProgress: (p, s) => {
          setTrainingProgress(p);
          setTrainingStage(s);
        },
        signal: abortControllerRef.current.signal,
      });

      const modelData = trainer.getModelData();

      const updatedModel: LaboratoryModel = {
        ...model,
        datasetId: activeDataset.id,
        classes: [...activeDataset.classes],
        modelData: {
          ...modelData,
          trainingSamples: activeDataset.samples,
        },
        trainingStats: stats,
        lifecycleState: 'TRAINED',
        updatedAt: new Date().toISOString(),
      };

      saveModel(updatedModel);
      onModelUpdated(updatedModel);
      unlockAchievement('LAB_INVENTOR');

      // Calculate mean F1
      const f1Vals = Object.values(stats.confusionMatrix?.f1Score || {});
      const avgF1 = f1Vals.length > 0 ? f1Vals.reduce((a, b) => a + b, 0) / f1Vals.length : stats.valAccuracy;

      setTrainingResult({
        trainAcc: stats.trainAccuracy,
        valAcc: stats.valAccuracy,
        f1: Math.round(avgF1 * 100) / 100,
        warnings,
        durationMs: stats.durationMs,
      });
    } catch (err: any) {
      if (err?.message !== 'Training cancelled by user.') {
        alert(`Training failure: ${err?.message}`);
      }
    } finally {
      setIsTraining(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelTraining = () => {
    abortControllerRef.current?.abort();
  };

  const handleExportDataset = () => {
    if (!activeDataset) return;
    const json = exportDatasetToJSON(activeDataset.id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDataset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dataset.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDataset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const imported = importDatasetFromJSON(text);
        const updatedList = getAllDatasets();
        setDatasets(updatedList);
        setActiveDataset(imported);
        alert(`Dataset "${imported.name}" with ${imported.samples.length} samples imported successfully.`);
      } catch (err: any) {
        alert(`Failed to import dataset: ${err?.message}`);
      }
    };
    reader.readAsText(file);
  };

  const classCounts = activeDataset
    ? activeDataset.classes.reduce((acc, cls) => {
        acc[cls] = activeDataset.samples.filter((s) => s.label === cls).length;
        return acc;
      }, {} as Record<string, number>)
    : {};

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-charcoal-soft pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-ink-muted px-1.5 py-0.5 border border-charcoal-soft rounded">
              {model.figureTag}
            </span>
            <span className="text-xs font-bold uppercase text-charcoal-soft">
              DATASET WORKBENCH & CLASSIFIER TRAINER
            </span>
            <StampBadge
              label={`${activeDataset?.samples.length || 0} SAMPLES RECORDED`}
              variant="sage"
            />
          </div>
          <h2 className="text-base font-bold uppercase text-charcoal-soft">
            {activeDataset?.name || model.name}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportDataset} className="text-xs gap-1">
            <Download className="w-3.5 h-3.5" />
            EXPORT DATASET
          </Button>

          <label className="cursor-pointer">
            <input type="file" accept=".json" onChange={handleImportDataset} className="hidden" />
            <span className="inline-flex items-center justify-center font-mono uppercase font-bold text-xs tracking-technical border-2 border-charcoal-soft rounded-tactile px-2.5 py-1 text-[11px] bg-paper-cream hover:bg-paper-dark gap-1">
              <Upload className="w-3.5 h-3.5" />
              IMPORT
            </span>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSyntheticMode(!syntheticMode)}
            className="text-xs"
          >
            {syntheticMode ? 'SYNTHETIC: ON' : 'SYNTHETIC MODE'}
          </Button>

          {isTraining ? (
            <Button variant="brick" size="sm" onClick={handleCancelTraining} className="text-xs gap-1">
              CANCEL TRAINING
            </Button>
          ) : (
            <Button
              variant="sage"
              size="sm"
              onClick={handleTrainModel}
              className="text-xs bg-sage-green text-charcoal-soft border-charcoal-soft"
            >
              <Cpu className="w-3.5 h-3.5 mr-1" />
              TRAIN CLASSIFIER NOW
            </Button>
          )}
        </div>
      </div>

      {/* Asynchronous Training Progress Bar */}
      {isTraining && (
        <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-dark space-y-2 animate-pulse">
          <div className="flex justify-between text-xs font-bold uppercase">
            <span className="text-sage-green flex items-center gap-1.5">
              <Cpu className="w-4 h-4 animate-spin" />
              TRAINING IN PROGRESS: {trainingStage}
            </span>
            <span>{trainingProgress}%</span>
          </div>
          <div className="w-full bg-charcoal-soft/40 h-2.5 rounded overflow-hidden">
            <div
              className="bg-sage-green h-full transition-all duration-200"
              style={{ width: `${trainingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Viewport + Dataset Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Camera Viewport & Capture (7 Cols) */}
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
                  BURST CAPTURE IN PROGRESS ({recordingCountRef.current}/30)
                </div>
              )}

              <div className="absolute bottom-3 right-3 z-20 px-2 py-1 bg-charcoal-soft/80 border border-sage-green/40 text-[10px] text-sage-green font-mono rounded">
                TARGET CLASS: {selectedClass}
              </div>
            </div>
          </div>

          {/* Recording Controls Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-cream shadow-tactile-sm gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase text-charcoal-soft">RECORD CLASS:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-paper-dark border-2 border-charcoal-soft text-xs font-bold uppercase px-2 py-1 rounded"
              >
                {activeDataset?.classes.map((cls) => (
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
                  STOP
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleStartRecording} className="gap-1 text-xs">
                  <Play className="w-3.5 h-3.5 text-sage-green" />
                  CAPTURE 30 SAMPLES
                </Button>
              )}
            </div>
          </div>

          {/* Add New Class Strip */}
          <div className="flex gap-2 p-2 border border-charcoal-soft/30 rounded bg-paper-dark/20 text-xs">
            <input
              type="text"
              placeholder="ADD NEW CLASS NAME (e.g. OK_SIGN)"
              value={newClassInput}
              onChange={(e) => setNewClassInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
              className="flex-1 p-1.5 border rounded bg-paper-cream font-mono text-xs uppercase"
            />
            <Button variant="outline" size="sm" onClick={handleAddClass} className="text-xs gap-1">
              <Plus className="w-3 h-3" />
              ADD CLASS
            </Button>
          </div>
        </div>

        {/* Right: Quality Report & Dataset Distribution (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dataset Quality Report Card */}
          {qualityReport && (
            <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  DATASET READINESS AUDIT
                </h3>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 border rounded ${
                    qualityReport.isValidForTraining
                      ? 'border-sage-green text-sage-green bg-sage-green/10'
                      : 'border-amber-500 text-amber-500 bg-amber-500/10'
                  }`}
                >
                  {qualityReport.isValidForTraining ? 'READY TO TRAIN' : 'INCOMPLETE'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 bg-paper-dark/40 p-2 border border-charcoal-soft/20 rounded text-center">
                <div>
                  <div className="text-[9px] text-ink-muted">SAMPLES</div>
                  <div className="text-sm font-bold">{qualityReport.totalSamples}</div>
                </div>
                <div>
                  <div className="text-[9px] text-ink-muted">IMBALANCE</div>
                  <div className="text-sm font-bold">
                    {isFinite(qualityReport.imbalanceRatio) ? `${qualityReport.imbalanceRatio}:1` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-ink-muted">NEAR-DUPS</div>
                  <div className="text-sm font-bold text-amber-500">{qualityReport.nearDuplicateCount}</div>
                </div>
              </div>

              {qualityReport.warnings.length > 0 && (
                <div className="p-2 border border-amber-500/40 bg-amber-500/10 rounded space-y-1 text-[11px] text-amber-700 dark:text-amber-400">
                  {qualityReport.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Class Distribution Table */}
          <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">
                CLASS BREAKDOWN & SAMPLES
              </h3>
              <span className="text-[10px] text-ink-muted">
                {activeDataset?.classes.length || 0} CLASSES
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {activeDataset?.classes.map((cls) => {
                const count = classCounts[cls] || 0;
                const isCurrent = cls === selectedClass;
                return (
                  <div
                    key={cls}
                    className={`p-2 border rounded flex items-center justify-between text-xs transition-all ${
                      isCurrent
                        ? 'border-sage-green bg-sage-green/10'
                        : 'border-charcoal-soft/20 bg-paper-dark/20'
                    }`}
                  >
                    <div>
                      <span className="font-bold uppercase">{cls}</span>
                      <span className="text-[10px] text-ink-muted block">
                        {count >= 20 ? 'Sufficient variation' : count > 0 ? 'Capture more frames' : 'No samples'}
                      </span>
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
                <h4 className="text-xs font-bold uppercase">TRAINING & VALIDATION VERIFIED</h4>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-2 border border-charcoal-soft/30 rounded bg-paper-cream">
                  <div className="text-[9px] text-ink-muted uppercase">TRAIN ACC</div>
                  <div className="text-sm font-bold text-sage-green">
                    {Math.round(trainingResult.trainAcc * 100)}%
                  </div>
                </div>
                <div className="p-2 border border-charcoal-soft/30 rounded bg-paper-cream">
                  <div className="text-[9px] text-ink-muted uppercase">VAL ACC</div>
                  <div className="text-sm font-bold text-indigo-500">
                    {Math.round(trainingResult.valAcc * 100)}%
                  </div>
                </div>
                <div className="p-2 border border-charcoal-soft/30 rounded bg-paper-cream">
                  <div className="text-[9px] text-ink-muted uppercase">MEAN F1</div>
                  <div className="text-sm font-bold text-cyan-600">
                    {Math.round(trainingResult.f1 * 100)}%
                  </div>
                </div>
              </div>

              <Button
                variant="sage"
                size="sm"
                onClick={onGoToTestBench}
                className="w-full text-xs bg-sage-green text-charcoal-soft"
              >
                PROCEED TO LIVE TEST BENCH
              </Button>
            </div>
          )}

          {/* Interactive Sample Gallery Strip */}
          <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-2">
            <div className="flex justify-between items-center text-xs font-bold uppercase">
              <span>CAPTURED SAMPLE CARDS</span>
              <span className="text-[10px] text-ink-muted">CLICK TO INSPECT / RELABEL</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 max-h-24">
              {activeDataset?.samples.slice(-15).reverse().map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setInspectingSample(s);
                    setInspectModalOpen(true);
                  }}
                  className="p-1.5 border border-charcoal-soft/30 rounded hover:border-cyan-500 bg-paper-dark text-left shrink-0 text-[10px]"
                >
                  <div className="font-bold text-[9px] line-clamp-1">{s.label}</div>
                  <div className="text-[8px] text-ink-muted">{new Date(s.timestamp).toLocaleTimeString()}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sample Inspection Modal */}
      {inspectModalOpen && inspectingSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
              <h3 className="font-bold text-xs uppercase text-charcoal-soft flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-500" />
                INSPECT SAMPLE GEOMETRY
              </h3>
              <button onClick={() => setInspectModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas Rendering Sample Skeleton */}
            <div className="aspect-[4/3] bg-charcoal-dark rounded border border-charcoal-soft overflow-hidden flex items-center justify-center">
              <canvas ref={sampleCanvasRef} width={320} height={240} className="w-full h-full object-contain" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-muted">SAMPLE ID:</span>
                <span className="font-bold">{inspectingSample.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">BURST GROUP:</span>
                <span>{inspectingSample.burstId || 'Isolated capture'}</span>
              </div>

              {/* Relabel Dropdown */}
              <div className="space-y-1 pt-1">
                <label className="font-bold block text-[10px] text-ink-muted uppercase">ASSIGNED CLASS</label>
                <select
                  value={inspectingSample.label}
                  onChange={(e) => handleRelabelSample(inspectingSample.id, e.target.value)}
                  className="w-full p-1.5 border rounded bg-paper-dark font-mono text-xs uppercase"
                >
                  {activeDataset?.classes.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-charcoal-soft/20">
              <Button
                variant="brick"
                size="sm"
                onClick={() => handleDeleteSample(inspectingSample.id)}
                className="text-xs gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                DELETE SAMPLE
              </Button>

              <Button variant="default" size="sm" onClick={() => setInspectModalOpen(false)}>
                DONE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
