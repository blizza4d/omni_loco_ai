'use client';

import React, { useState, useEffect } from 'react';
import {
  LaboratoryModel,
  ModelHyperparameters,
  ModelVersionSnapshot,
} from '../types';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import {
  saveModel,
  createCustomVariant,
  saveNewVersion,
  restoreVersion,
  BUILT_IN_MODELS,
} from '../model-storage';
import {
  Sliders,
  RotateCcw,
  Save,
  Copy,
  History,
  CheckCircle,
  AlertTriangle,
  GitCommit,
  Sparkles,
} from 'lucide-react';
import { GestureFXType } from '@/modules/hand/fx/types';

export interface ModelConfigEditorProps {
  model: LaboratoryModel;
  onModelUpdated: (updated: LaboratoryModel) => void;
}

export function ModelConfigEditor({ model, onModelUpdated }: ModelConfigEditorProps) {
  const [params, setParams] = useState<ModelHyperparameters>({
    ...model.hyperparameters,
  });
  const [fxMapping, setFxMapping] = useState<Record<string, GestureFXType>>({
    ...(model.fxMapping || {}),
  });
  const [versionNote, setVersionNote] = useState('');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Synchronize parameter state when the selected model or its version changes
  useEffect(() => {
    setParams({ ...model.hyperparameters });
    setFxMapping({ ...(model.fxMapping || {}) });
  }, [model.id, model.updatedAt]);

  // Find factory baseline defaults if built-in
  const factoryDefault = BUILT_IN_MODELS.find((b) => b.id === model.id)?.hyperparameters;

  const handleSliderChange = (key: keyof ModelHyperparameters, value: number) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleFxChange = (gesture: string, fx: GestureFXType) => {
    setFxMapping((prev) => ({
      ...prev,
      [gesture]: fx,
    }));
  };

  const handleRevertDefaults = () => {
    if (!factoryDefault) return;
    setParams({ ...factoryDefault });
    setSaveToast('Configuration restored to factory defaults');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveConfig = () => {
    if (model.isBuiltIn) {
      alert('This is a protected factory model. Use "CREATE CUSTOM VARIANT" to save modifications.');
      return;
    }

    const updated: LaboratoryModel = {
      ...model,
      hyperparameters: params,
      fxMapping,
      updatedAt: new Date().toISOString(),
    };

    saveModel(updated);
    onModelUpdated(updated);
    setSaveToast('Configuration saved successfully');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleCreateVariant = () => {
    const variantName = prompt('Enter a name for this custom variant:', `${model.name} [Variant]`);
    if (!variantName) return;

    const variant = createCustomVariant(model.id, variantName);
    variant.hyperparameters = { ...params };
    variant.fxMapping = { ...fxMapping };
    saveModel(variant);
    onModelUpdated(variant);
    alert(`Custom variant "${variant.name}" created and loaded into editor.`);
  };

  const handleSaveAsNewVersion = () => {
    if (!versionNote.trim()) {
      alert('Please describe what changed in this version snapshot.');
      return;
    }

    const updatedModel: LaboratoryModel = {
      ...model,
      hyperparameters: params,
      fxMapping,
    };
    saveModel(updatedModel);

    const versioned = saveNewVersion(model.id, versionNote.trim());
    onModelUpdated(versioned);
    setIsVersionModalOpen(false);
    setVersionNote('');
    setSaveToast(`Model version updated to v${versioned.version}`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleRestoreVersion = (ver: string) => {
    if (confirm(`Roll back model configuration to v${ver}? Current state will be snapshotted in history.`)) {
      const restored = restoreVersion(model.id, ver);
      onModelUpdated(restored);
      setParams({ ...restored.hyperparameters });
      if (restored.fxMapping) setFxMapping({ ...restored.fxMapping });
    }
  };

  const isModified = factoryDefault
    ? Object.keys(params).some(
        (k) => (params as any)[k] !== (factoryDefault as any)[k]
      )
    : false;

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-charcoal-soft pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-ink-muted px-1.5 py-0.5 border border-charcoal-soft rounded">
              {model.figureTag}
            </span>
            <span className="text-xs font-bold uppercase text-charcoal-soft">
              MODEL HYPERPARAMETERS & RUNTIME CONFIGURATION
            </span>
            <StampBadge label={`v${model.version}`} variant="sage" />
            <StampBadge label={model.lifecycleState} variant="charcoal" />
          </div>
          <h2 className="text-base font-bold uppercase text-charcoal-soft">
            {model.name}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {model.isBuiltIn ? (
            <>
              {factoryDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevertDefaults}
                  disabled={!isModified}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  REVERT DEFAULTS
                </Button>
              )}

              <Button
                variant="sage"
                size="sm"
                onClick={handleCreateVariant}
                className="text-xs gap-1 bg-sage-green text-charcoal-soft border-charcoal-soft hover:bg-sage-green/90"
              >
                <Copy className="w-3.5 h-3.5" />
                CREATE CUSTOM VARIANT
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVersionModalOpen(true)}
                className="text-xs gap-1"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                SAVE NEW VERSION
              </Button>

              <Button
                variant="sage"
                size="sm"
                onClick={handleSaveConfig}
                className="text-xs gap-1 bg-sage-green text-charcoal-soft border-charcoal-soft hover:bg-sage-green/90"
              >
                <Save className="w-3.5 h-3.5" />
                SAVE CONFIGURATION
              </Button>
            </>
          )}
        </div>
      </div>

      {saveToast && (
        <div className="p-3 border-2 border-sage-green bg-sage-green/10 text-sage-green rounded text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {model.isBuiltIn && isModified && (
        <div className="p-3 border-2 border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded text-xs flex items-center justify-between">
          <span>Parameters differ from factory defaults. Click &quot;CREATE CUSTOM VARIANT&quot; to persist these changes.</span>
          <Button variant="outline" size="sm" onClick={handleRevertDefaults} className="text-[10px]">
            RESET
          </Button>
        </div>
      )}

      {/* Notice Banner: Runtime Settings vs Trained Centroids */}
      <div className="p-3 border-2 border-indigo-400/40 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-tactile text-xs flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold uppercase tracking-wider text-charcoal-soft">Runtime Configuration vs. Trained Weights: </span>
          <span className="text-ink-muted">
            The parameters below adjust real-time tracking thresholds, smoothing filters, and visual effect signatures. They modify runtime evaluation parameters without altering the underlying prototype centroids or dataset samples stored in the [TRAIN] tab.
          </span>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detection & Kinematics Thresholds */}
        <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-4 shadow-tactile-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5 border-b border-charcoal-soft/20 pb-2">
            <Sliders className="w-4 h-4 text-sage-green" />
            OPTICAL DETECTION & TRACKING CONSTRAINTS
          </h3>

          {/* Detection Confidence */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold">DETECTION CONFIDENCE MINIMUM</span>
              <span className="tabular-nums font-bold text-sage-green">
                {Math.round((params.detectionConfidence || 0.7) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.95"
              step="0.05"
              value={params.detectionConfidence || 0.7}
              onChange={(e) => handleSliderChange('detectionConfidence', parseFloat(e.target.value))}
              className="w-full accent-charcoal-soft"
            />
            <span className="text-[10px] text-ink-muted block">
              Initial hand presence probability threshold to lock tracking.
            </span>
          </div>

          {/* Tracking Confidence */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold">TRACKING CONFIDENCE MINIMUM</span>
              <span className="tabular-nums font-bold text-indigo-500">
                {Math.round((params.trackingConfidence || 0.6) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.95"
              step="0.05"
              value={params.trackingConfidence || 0.6}
              onChange={(e) => handleSliderChange('trackingConfidence', parseFloat(e.target.value))}
              className="w-full accent-charcoal-soft"
            />
            <span className="text-[10px] text-ink-muted block">
              Confidence threshold below which hand landmarks are re-detected.
            </span>
          </div>

          {/* Temporal Smoothing Window */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold">TEMPORAL SMOOTHING WINDOW</span>
              <span className="tabular-nums font-bold">{params.smoothingFrames} FRAMES</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={params.smoothingFrames}
              onChange={(e) => handleSliderChange('smoothingFrames', parseInt(e.target.value, 10))}
              className="w-full accent-charcoal-soft"
            />
            <span className="text-[10px] text-ink-muted block">
              Sliding consensus window to eliminate single-frame glitches.
            </span>
          </div>

          {/* Maximum Hands */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold">MAX CONCURRENT HANDS</span>
              <span className="tabular-nums font-bold">{params.maxHands || 1}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2].map((num) => (
                <button
                  key={num}
                  onClick={() => handleSliderChange('maxHands', num)}
                  className={`flex-1 py-1.5 border-2 rounded text-xs font-bold ${
                    (params.maxHands || 1) === num
                      ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream'
                      : 'border-charcoal-soft/30 hover:border-charcoal-soft'
                  }`}
                >
                  {num} HAND{num > 1 ? 'S' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Spatial Gestures & Output Mappings */}
        <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-4 shadow-tactile-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5 border-b border-charcoal-soft/20 pb-2">
            <Sparkles className="w-4 h-4 text-brick-red" />
            KINEMATIC GESTURES & FX PROFILE BINDINGS
          </h3>

          {/* Pinch Distance Threshold */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold">PINCH ACTIVATION DISTANCE</span>
              <span className="tabular-nums font-bold">{params.pinchThreshold || 0.32}</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.55"
              step="0.02"
              value={params.pinchThreshold || 0.32}
              onChange={(e) => handleSliderChange('pinchThreshold', parseFloat(e.target.value))}
              className="w-full accent-charcoal-soft"
            />
            <span className="text-[10px] text-ink-muted block">
              Normalized index-to-thumb distance threshold triggering click events.
            </span>
          </div>

          {/* Swipe Speed Threshold */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold">SWIPE VELOCITY THRESHOLD</span>
              <span className="tabular-nums font-bold">{params.swipeSpeedThreshold || 1.2} units/sec</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="2.5"
              step="0.1"
              value={params.swipeSpeedThreshold || 1.2}
              onChange={(e) => handleSliderChange('swipeSpeedThreshold', parseFloat(e.target.value))}
              className="w-full accent-charcoal-soft"
            />
            <span className="text-[10px] text-ink-muted block">
              Minimum wrist displacement velocity required to classify a swipe.
            </span>
          </div>

          {/* Gesture FX Mapping Table */}
          <div className="space-y-2 pt-2 border-t border-charcoal-soft/20">
            <span className="text-[10px] font-bold uppercase text-charcoal-soft block">
              GESTURE VISUAL EFFECT BINDINGS
            </span>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
              {model.classes.map((cls) => (
                <div
                  key={cls}
                  className="flex items-center justify-between p-2 border border-charcoal-soft/30 rounded bg-paper-dark/30"
                >
                  <span className="font-bold uppercase text-[11px]">{cls.replace('_', ' ')}</span>
                  <select
                    value={fxMapping[cls] || 'NONE'}
                    onChange={(e) => handleFxChange(cls, e.target.value as GestureFXType)}
                    className="bg-paper-cream border border-charcoal-soft text-[10px] font-mono px-2 py-1 rounded"
                  >
                    {[
                      'HOLOGRAM_BURST',
                      'POWER_CHARGE',
                      'SPATIAL_RAY',
                      'DUAL_BEACON',
                      'STATUS_PULSE',
                      'GRAVITY_LOCK',
                      'AFTERIMAGE_TRAIL',
                      'NONE',
                    ].map((fx) => (
                      <option key={fx} value={fx}>
                        {fx}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Version History List for Custom Models */}
      {!model.isBuiltIn && model.versionHistory && model.versionHistory.length > 0 && (
        <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-500" />
              VERSION REVISION HISTORY ({model.versionHistory.length})
            </h3>
            <span className="text-[10px] text-ink-muted">CURRENT: v{model.version}</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {model.versionHistory
              .slice()
              .reverse()
              .map((snap) => (
                <div
                  key={snap.version + snap.timestamp}
                  className="flex items-center justify-between p-2.5 border border-charcoal-soft/30 rounded bg-paper-dark/30 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase">v{snap.version}</span>
                      <span className="text-[10px] text-ink-muted">
                        {new Date(snap.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-charcoal-soft mt-0.5">{snap.changeNote}</p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreVersion(snap.version)}
                    className="text-[10px] gap-1"
                  >
                    <GitCommit className="w-3 h-3" />
                    RESTORE
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Save New Version Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase text-charcoal-soft">
              SNAPSHOT NEW MODEL VERSION
            </h3>
            <p className="text-xs text-ink-muted">
              Current configuration will be archived as an immutable snapshot. Version will bump automatically.
            </p>

            <div>
              <label className="font-bold block mb-1 text-xs">REVISION NOTE</label>
              <textarea
                rows={3}
                placeholder="e.g. Adjusted pinch threshold for higher sensitivity; bound gravity lock FX."
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-dark font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsVersionModalOpen(false)}>
                CANCEL
              </Button>
              <Button variant="sage" size="sm" onClick={handleSaveAsNewVersion}>
                COMMIT VERSION
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
