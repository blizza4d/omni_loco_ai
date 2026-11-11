'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Landmark3D } from '../../hand/types';
import {
  CustomGestureDefinition,
  CustomGestureSample,
  CrossValidationReport,
  MemeVisualDefinition,
  GoofySoundId,
  PopupAnimationStyle,
  DEFAULT_SOUND_LIBRARY,
} from '../goofy-types';
import {
  CustomHandFeatureExtractor,
  GoofyCustomGestureClassifier,
} from '../goofy-custom-classifier';
import {
  saveCustomGestureDefinition,
  saveGestureSamples,
} from '../goofy-custom-store';
import { Button } from '@/components/ui/Button';
import {
  X,
  Camera,
  Check,
  Trash2,
  Sparkles,
  Zap,
  Music,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Plus,
  Play,
  Layers,
  HelpCircle,
} from 'lucide-react';

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

interface CustomGestureStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLandmarks: Landmark3D[] | null;
  activeHandedness: 'Left' | 'Right' | null;
  existingGestures: CustomGestureDefinition[];
  allMemes: MemeVisualDefinition[];
  onGestureSaved: (
    gesture: CustomGestureDefinition,
    samples: CustomGestureSample[]
  ) => void;
  onPreviewReaction?: (
    memeId: string,
    soundId: GoofySoundId,
    caption: string,
    style?: PopupAnimationStyle
  ) => void;
}

export function CustomGestureStudioModal({
  isOpen,
  onClose,
  activeLandmarks,
  activeHandedness,
  existingGestures,
  allMemes,
  onGestureSaved,
  onPreviewReaction,
}: CustomGestureStudioModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Gesture Metadata
  const [gestureName, setGestureName] = useState('');
  const [gestureDescription, setGestureDescription] = useState('');
  const [gestureIcon, setGestureIcon] = useState('🤘');
  const [requiredHand, setRequiredHand] = useState<'Any' | 'Left' | 'Right'>('Any');

  // Step 2: Captured Samples
  const [capturedSamples, setCapturedSamples] = useState<CustomGestureSample[]>([]);
  const [burstCount, setBurstCount] = useState(0);
  const [captureStatusMsg, setCaptureStatusMsg] = useState<string | null>(null);

  // Step 3: Classifier Configuration & Live Test
  const [minConfidence, setMinConfidence] = useState(0.82);
  const [minHoldMs, setMinHoldMs] = useState(180);
  const [cvReport, setCvReport] = useState<CrossValidationReport | null>(null);
  const [liveTestMatch, setLiveTestMatch] = useState<{
    isMatch: boolean;
    confidence: number;
    distance: number;
  } | null>(null);

  // Step 4: Reaction Binding
  const [assignedMemeId, setAssignedMemeId] = useState(allMemes[0]?.id || 'MEME_ROCK_STAR');
  const [assignedSoundId, setAssignedSoundId] = useState<GoofySoundId>('CHAD_GONG');
  const [customCaption, setCustomCaption] = useState('CUSTOM GESTURE UNLOCKED!');
  const [animationStyle, setAnimationStyle] = useState<PopupAnimationStyle>('CINEMATIC');

  // Mini-skeleton canvas ref for previewing active landmarks
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate gesture ID
  const gestureId = useMemo(() => {
    const slug = gestureName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return `custom_${slug || 'GESTURE'}_${Date.now().toString(36)}`;
  }, [gestureName]);

  // Train a local temporary classifier whenever captured samples update
  const localClassifier = useMemo(() => {
    if (capturedSamples.length === 0) return null;
    const tempDef: CustomGestureDefinition = {
      id: gestureId,
      name: gestureName || 'New Custom Gesture',
      description: gestureDescription,
      icon: gestureIcon,
      handedness: requiredHand,
      minConfidence,
      minHoldMs,
      sampleCount: capturedSamples.length,
      assignedMemeId,
      assignedSoundId,
      customCaption,
      animationStyle,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return new GoofyCustomGestureClassifier([tempDef], capturedSamples, Math.min(3, capturedSamples.length));
  }, [capturedSamples, gestureId, gestureName, gestureDescription, gestureIcon, requiredHand, minConfidence, minHoldMs, assignedMemeId, assignedSoundId, customCaption, animationStyle]);

  // Update cross-validation when entering step 3
  useEffect(() => {
    if (currentStep === 3 && localClassifier) {
      setCvReport(localClassifier.evaluateCrossValidation());
    }
  }, [currentStep, localClassifier]);

  // Live testing classification loop in step 3
  useEffect(() => {
    if (currentStep !== 3 || !localClassifier || !activeLandmarks) {
      setLiveTestMatch(null);
      return;
    }

    const hand = activeHandedness || 'Right';
    const res = localClassifier.classify(activeLandmarks, hand, minConfidence);
    setLiveTestMatch({
      isMatch: res.isMatch,
      confidence: res.confidence,
      distance: res.distance,
    });
  }, [currentStep, activeLandmarks, activeHandedness, localClassifier, minConfidence]);

  // Draw live hand skeleton in Step 2 on canvas
  useEffect(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!activeLandmarks || activeLandmarks.length !== 21) {
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO HAND IN VIEW', canvas.width / 2, canvas.height / 2);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Draw connection lines
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2.5;
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = activeLandmarks[a]!;
      const pb = activeLandmarks[b]!;
      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    }

    // Draw landmark joints
    for (let i = 0; i < 21; i++) {
      const p = activeLandmarks[i]!;
      ctx.fillStyle = i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ? '#F59E0B' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [activeLandmarks]);

  if (!isOpen) return null;

  // Single sample capture
  const handleCaptureSample = () => {
    if (!activeLandmarks || activeLandmarks.length !== 21) {
      setCaptureStatusMsg('No valid hand detected in camera! Show your hand.');
      return;
    }

    const validation = CustomHandFeatureExtractor.validate(activeLandmarks);
    if (!validation.valid) {
      setCaptureStatusMsg(validation.reason || 'Invalid hand coordinates');
      return;
    }

    // Check deduplication
    if (localClassifier && !localClassifier.isSampleDeduplicated(activeLandmarks, capturedSamples, 0.04)) {
      setCaptureStatusMsg('Sample too similar to previous! Rotate or shift hand slightly for variety.');
      return;
    }

    const newSample: CustomGestureSample = {
      id: `sample_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gestureId,
      gestureLabel: gestureName || 'Custom Gesture',
      landmarks: activeLandmarks.map((pt) => ({ ...pt })),
      normalizedFeatures: CustomHandFeatureExtractor.extract(activeLandmarks),
      handedness: activeHandedness || 'Right',
      timestamp: Date.now(),
    };

    setCapturedSamples((prev) => [...prev, newSample]);
    setCaptureStatusMsg(`Captured Sample #${capturedSamples.length + 1} (${newSample.handedness})`);
  };

  // Burst capture 5 samples spaced by 200ms
  const handleBurstCapture = () => {
    if (burstCount > 0) return;
    setBurstCount(5);
    let remaining = 5;

    const interval = setInterval(() => {
      if (!activeLandmarks) return;
      handleCaptureSample();
      remaining--;
      setBurstCount(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 220);
  };

  // Delete individual captured sample
  const handleDeleteSample = (sampleId: string) => {
    setCapturedSamples((prev) => prev.filter((s) => s.id !== sampleId));
  };

  // Save the custom gesture
  const handleFinalSave = async () => {
    if (!gestureName.trim() || capturedSamples.length === 0) return;

    const newDef: CustomGestureDefinition = {
      id: gestureId,
      name: gestureName.trim().toUpperCase(),
      description: gestureDescription.trim() || 'Custom Trained Hand Gesture',
      icon: gestureIcon || '✨',
      handedness: requiredHand,
      minConfidence,
      minHoldMs,
      sampleCount: capturedSamples.length,
      assignedMemeId,
      assignedSoundId,
      customCaption: customCaption.trim() || `${gestureName.toUpperCase()} RECOGNIZED!`,
      animationStyle,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveCustomGestureDefinition(newDef);
    await saveGestureSamples(capturedSamples);

    onGestureSaved(newDef, capturedSamples);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-paper-cream border-4 border-charcoal-dark rounded-tactile max-w-3xl w-full p-4 md:p-6 shadow-tactile-lg space-y-4 font-mono text-xs flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-emerald-500 text-charcoal-dark">
              <Zap className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-sm md:text-base uppercase tracking-wider text-charcoal-dark">
                CUSTOM GESTURE STUDIO // GUIDED WORKSPACE
              </h3>
              <span className="text-[10px] text-ink-muted">
                TEACH OMNI LOCO AI NEW HAND GESTURES & BIND UNIQUE MEME REACTIONS
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-paper-dark/30 rounded text-charcoal-dark transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Wizard Bar */}
        <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-paper-dark/20 rounded border border-charcoal-soft/20 text-[10px] font-black uppercase text-center">
          <div className={`p-1.5 rounded ${currentStep === 1 ? 'bg-cyan-500 text-charcoal-dark shadow-sm' : 'text-ink-muted'}`}>
            1. IDENTITY
          </div>
          <div className={`p-1.5 rounded ${currentStep === 2 ? 'bg-cyan-500 text-charcoal-dark shadow-sm' : 'text-ink-muted'}`}>
            2. CAPTURE ({capturedSamples.length})
          </div>
          <div className={`p-1.5 rounded ${currentStep === 3 ? 'bg-cyan-500 text-charcoal-dark shadow-sm' : 'text-ink-muted'}`}>
            3. TRAIN & TEST
          </div>
          <div className={`p-1.5 rounded ${currentStep === 4 ? 'bg-cyan-500 text-charcoal-dark shadow-sm' : 'text-ink-muted'}`}>
            4. REACTION
          </div>
          <div className={`p-1.5 rounded ${currentStep === 5 ? 'bg-cyan-500 text-charcoal-dark shadow-sm' : 'text-ink-muted'}`}>
            5. FINALIZE
          </div>
        </div>

        {/* Wizard Body Steps */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* STEP 1: IDENTITY */}
          {currentStep === 1 && (
            <div className="space-y-3.5">
              <div className="p-3 bg-cyan-500/10 border-2 border-cyan-400 rounded space-y-1">
                <span className="font-black text-cyan-900 text-xs uppercase block">
                  STEP 1: DEFINE GESTURE IDENTITY
                </span>
                <p className="text-[11px] text-charcoal-dark">
                  Name your new gesture, provide a short cue, and specify which hand it targets.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold uppercase text-[11px] text-charcoal-dark block">
                  GESTURE NAME *
                </label>
                <input
                  type="text"
                  value={gestureName}
                  onChange={(e) => setGestureName(e.target.value)}
                  placeholder="e.g. SPOCK VULCAN SALUTE, FINGER GUNS, WESTSIDE W"
                  className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold uppercase text-[11px] text-charcoal-dark block">
                  DESCRIPTION & INTENDED ACTION
                </label>
                <textarea
                  value={gestureDescription}
                  onChange={(e) => setGestureDescription(e.target.value)}
                  placeholder="Describe the finger configuration, orientation, or intended comic meaning..."
                  rows={2}
                  className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-extrabold uppercase text-[11px] text-charcoal-dark block">
                    ICON BADGE
                  </label>
                  <div className="flex gap-1.5">
                    {['🖖', '👉', '🤞', '🤌', '🤙', '🖐️', '👌', '⚡', '✨', '👑'].map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setGestureIcon(ic)}
                        className={`text-lg p-1.5 rounded border transition-all cursor-pointer ${
                          gestureIcon === ic
                            ? 'bg-amber-400 border-amber-600 ring-2 ring-amber-500'
                            : 'bg-paper-dark/20 hover:bg-paper-dark/40 border-charcoal-soft/20'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold uppercase text-[11px] text-charcoal-dark block">
                    REQUIRED HANDEDNESS
                  </label>
                  <select
                    value={requiredHand}
                    onChange={(e) => setRequiredHand(e.target.value as any)}
                    className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
                  >
                    <option value="Any">ANY HAND (LEFT OR RIGHT)</option>
                    <option value="Right">RIGHT HAND ONLY</option>
                    <option value="Left">LEFT HAND ONLY</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CAPTURE GENUINE 21-POINT SAMPLES */}
          {currentStep === 2 && (
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-500/10 border-2 border-amber-400 rounded space-y-1">
                <span className="font-black text-amber-900 text-xs uppercase block">
                  STEP 2: RECORD 21-POINT LANDMARK OBSERVATIONS
                </span>
                <p className="text-[11px] text-charcoal-dark">
                  Hold your hand steady in front of the camera in the target gesture configuration.
                  Capture 5–15 diverse samples at slight distance and angle variations.
                </p>
              </div>

              {/* Live Hand Skeleton Preview Canvas & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="relative aspect-[4/3] bg-black/95 rounded-tactile border-2 border-charcoal-soft overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={liveCanvasRef}
                    width={280}
                    height={210}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-cyan-400 border border-cyan-400/50 text-[10px] font-black">
                    {activeLandmarks ? `LIVE 21-PT DETECTED (${activeHandedness || 'HAND'})` : 'AWAITING HAND'}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={handleCaptureSample}
                      disabled={!activeLandmarks}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 h-10 shadow-tactile-sm active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>CAPTURE SINGLE SAMPLE</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBurstCapture}
                      disabled={!activeLandmarks || burstCount > 0}
                      className="bg-amber-400 hover:bg-amber-500 text-charcoal-dark font-black text-xs gap-1.5 h-9 active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{burstCount > 0 ? `BURST RECORDING (${burstCount})...` : 'BURST RECORD (5 SAMPLES)'}</span>
                    </Button>
                  </div>

                  {captureStatusMsg && (
                    <div className="p-2 rounded bg-paper-dark/20 text-[10px] font-mono text-charcoal-dark border border-charcoal-soft/30 animate-pulse">
                      {captureStatusMsg}
                    </div>
                  )}

                  <div className="p-2 bg-paper-cream border border-charcoal-soft/30 rounded text-[10px] space-y-1">
                    <span className="font-black text-ink-muted uppercase block">SAMPLE CRITERIA:</span>
                    <ul className="list-disc list-inside text-ink-muted space-y-0.5">
                      <li>21 genuine 3D points validated with zero NaNs.</li>
                      <li>Wrist-normalized translation and scale invariance.</li>
                      <li>Automatic duplicate suppression prevents identical frames.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Captured Samples Review Gallery */}
              {capturedSamples.length > 0 && (
                <div className="space-y-2 border-t border-charcoal-soft/20 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase">
                    <span>CAPTURED OBSERVATIONS ({capturedSamples.length})</span>
                    <button
                      onClick={() => setCapturedSamples([])}
                      className="text-rose-600 hover:text-rose-800 text-[10px] underline cursor-pointer"
                    >
                      CLEAR ALL
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                    {capturedSamples.map((s, idx) => (
                      <div
                        key={s.id}
                        className="p-1.5 rounded border border-charcoal-soft/40 bg-paper-dark/15 flex items-center justify-between text-[10px]"
                      >
                        <div>
                          <span className="font-black block">#{idx + 1} ({s.handedness})</span>
                          <span className="text-[9px] text-ink-muted">21 pts valid</span>
                        </div>
                        <button
                          onClick={() => handleDeleteSample(s.id)}
                          className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                          title="Remove this sample"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: TRAIN & LIVE TEST */}
          {currentStep === 3 && (
            <div className="space-y-3.5">
              <div className="p-3 bg-purple-500/10 border-2 border-purple-400 rounded space-y-1">
                <span className="font-black text-purple-900 text-xs uppercase block">
                  STEP 3: CLASSIFIER TRAINING & REAL-TIME VERIFICATION
                </span>
                <p className="text-[11px] text-charcoal-dark">
                  Trained via normalized K-Nearest Neighbors (KNN) on articulation-invariant joint angles.
                  Test the gesture live right now before finalizing!
                </p>
              </div>

              {/* Training Metrics Card */}
              <div className="p-3 rounded border-2 border-charcoal-soft bg-paper-cream space-y-2">
                <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
                  <span className="font-extrabold text-xs uppercase text-charcoal-dark">
                    TRAINED MODEL ACCURACY & DISCRIMINATION
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-charcoal-dark font-black text-[10px]">
                    KNN (K=3) ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-paper-dark/20">
                    <span className="text-[9px] text-ink-muted block uppercase">TOTAL SAMPLES</span>
                    <span className="font-black text-base text-charcoal-dark">{capturedSamples.length}</span>
                  </div>
                  <div className="p-2 rounded bg-paper-dark/20">
                    <span className="text-[9px] text-ink-muted block uppercase">CROSS-VALIDATION</span>
                    <span className="font-black text-base text-emerald-700">
                      {cvReport ? `${cvReport.accuracyPercent}%` : '100%'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-paper-dark/20">
                    <span className="text-[9px] text-ink-muted block uppercase">FEATURE VECTORS</span>
                    <span className="font-black text-base text-cyan-700">84-DIM</span>
                  </div>
                </div>
              </div>

              {/* Sensitivity & Threshold Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[10px] uppercase">CONFIDENCE THRESHOLD</span>
                    <span className="font-black text-amber-700 text-xs">{Math.round(minConfidence * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.65"
                    max="0.95"
                    step="0.01"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                    className="w-full accent-charcoal-soft h-1.5"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[10px] uppercase">MIN HOLD DURATION</span>
                    <span className="font-black text-amber-700 text-xs">{minHoldMs}ms</span>
                  </div>
                  <input
                    type="range"
                    min="120"
                    max="400"
                    step="10"
                    value={minHoldMs}
                    onChange={(e) => setMinHoldMs(parseInt(e.target.value, 10))}
                    className="w-full accent-charcoal-soft h-1.5"
                  />
                </div>
              </div>

              {/* Live Testing Feedback Box */}
              <div className="p-3 border-2 border-dashed border-charcoal-soft rounded bg-paper-dark/15 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">LIVE CAMERA INFERENCE:</span>
                  <span className="font-black text-sm uppercase text-charcoal-dark">
                    {liveTestMatch?.isMatch ? `✓ MATCH: ${gestureName}` : 'AWAITING RECOGNITION / UNKNOWN'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-ink-muted uppercase block">CONFIDENCE:</span>
                  <span className={`font-black text-sm ${liveTestMatch?.isMatch ? 'text-emerald-700' : 'text-ink-muted'}`}>
                    {liveTestMatch ? `${Math.round(liveTestMatch.confidence * 100)}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REACTION BINDINGS */}
          {currentStep === 4 && (
            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-500/10 border-2 border-emerald-400 rounded space-y-1">
                <span className="font-black text-emerald-900 text-xs uppercase block">
                  STEP 4: ASSIGN MEME POP-UP & AUDIO REACTION
                </span>
                <p className="text-[11px] text-charcoal-dark">
                  Select which meme displays and which sound effect fires when this gesture is recognized.
                </p>
              </div>

              {/* Meme Selector & Sound Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-ink-muted block">
                    ASSIGNED MEME POP-UP
                  </label>
                  <select
                    value={assignedMemeId}
                    onChange={(e) => setAssignedMemeId(e.target.value)}
                    className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
                  >
                    {allMemes.map((m) => (
                      <option key={m.id} value={m.id}>
                        🖼️ {m.title} ({m.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-ink-muted block">
                    ASSIGNED SOUND EFFECT
                  </label>
                  <select
                    value={assignedSoundId}
                    onChange={(e) => setAssignedSoundId(e.target.value as GoofySoundId)}
                    className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
                  >
                    {DEFAULT_SOUND_LIBRARY.map((s) => (
                      <option key={s.id} value={s.id}>
                        🎵 {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comic Caption & Presentation Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-ink-muted block">
                    COMIC BANNER CAPTION
                  </label>
                  <input
                    type="text"
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="e.g. MAXIMUM LEVEL UNLOCKED // PURE CINEMA"
                    className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-ink-muted block">
                    PRESENTATION STYLE
                  </label>
                  <select
                    value={animationStyle}
                    onChange={(e) => setAnimationStyle(e.target.value as PopupAnimationStyle)}
                    className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
                  >
                    <option value="CINEMATIC">CINEMATIC (LETTERBOX)</option>
                    <option value="EXPLOSIVE">EXPLOSIVE (ZOOM)</option>
                    <option value="RETRO_ARCADE">RETRO ARCADE (CRT)</option>
                    <option value="CHAOS">CHAOS (COSMIC ROTATION)</option>
                    <option value="CLEAN">CLEAN (STUDIO MINIMAL)</option>
                    <option value="CLASSIC">CLASSIC (BOUNCE)</option>
                    <option value="MINIMAL">MINIMAL (FADE)</option>
                  </select>
                </div>
              </div>

              {/* Preview Reaction Button */}
              {onPreviewReaction && (
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPreviewReaction(assignedMemeId, assignedSoundId, customCaption, animationStyle)}
                    className="text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>PREVIEW MEME & AUDIO REACTION</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: FINALIZE & SUMMARY */}
          {currentStep === 5 && (
            <div className="space-y-3.5">
              <div className="p-3 bg-cyan-500/10 border-2 border-cyan-400 rounded space-y-1">
                <span className="font-black text-cyan-900 text-xs uppercase block">
                  STEP 5: REVIEW & SAVE CUSTOM GESTURE
                </span>
                <p className="text-[11px] text-charcoal-dark">
                  Ready to activate! Your custom gesture will be added to the live gesture classifier,
                  sequence combo builder, and indexed database.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-4 border-2 border-charcoal-dark rounded bg-paper-cream space-y-2.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2 bg-paper-dark/20 rounded">{gestureIcon}</span>
                  <div>
                    <h4 className="font-black text-sm uppercase text-charcoal-dark">{gestureName}</h4>
                    <span className="text-[10px] text-ink-muted">{gestureDescription || 'Custom gesture'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-charcoal-soft/20 pt-2 font-mono">
                  <div>
                    <span className="text-[10px] text-ink-muted block">SAMPLES:</span>
                    <span className="font-black">{capturedSamples.length} observations</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted block">HANDEDNESS:</span>
                    <span className="font-black">{requiredHand}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted block">ASSIGNED MEME:</span>
                    <span className="font-black truncate block">
                      {allMemes.find((m) => m.id === assignedMemeId)?.title || assignedMemeId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted block">SOUND FX:</span>
                    <span className="font-black">{assignedSoundId}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t-2 border-charcoal-soft pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as any)}
            disabled={currentStep === 1}
            className="text-xs font-bold gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK</span>
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <Button
                size="sm"
                onClick={() => {
                  if (currentStep === 1 && !gestureName.trim()) {
                    alert('Please enter a gesture name to proceed.');
                    return;
                  }
                  if (currentStep === 2 && capturedSamples.length === 0) {
                    alert('Please capture at least 1 landmark observation.');
                    return;
                  }
                  setCurrentStep((prev) => Math.min(5, prev + 1) as any);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs gap-1 cursor-pointer"
              >
                <span>NEXT STEP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFinalSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-tactile-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>SAVE & ACTIVATE GESTURE</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
