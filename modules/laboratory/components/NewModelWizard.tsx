'use client';

import React, { useState } from 'react';
import { LaboratoryModel, ModelType } from '../types';
import { GestureFXType } from '../../hand/fx/types';
import { Button } from '@/components/ui/Button';
import { saveModel } from '../model-storage';
import { createDefaultPipeline } from '../pipeline-runner';
import { X, Sparkles, Cpu, Layers, ArrowRight, Check, AlertTriangle } from 'lucide-react';

export interface NewModelWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onModelCreated: (model: LaboratoryModel) => void;
}

export function NewModelWizard({ isOpen, onClose, onModelCreated }: NewModelWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [modelType, setModelType] = useState<ModelType>('centroid_prototype');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [figureTag, setFigureTag] = useState(`EXP. ${Math.floor(10 + Math.random() * 89)}`);
  const [author, setAuthor] = useState('Lab Researcher');
  const [classes, setClasses] = useState<string[]>(['CUSTOM_POSE_1', 'NEUTRAL_REST']);
  const [newClassInput, setNewClassInput] = useState('');
  const [selectedFX, setSelectedFX] = useState<GestureFXType>('HOLOGRAM_BURST');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddClass = () => {
    const formatted = newClassInput.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!formatted) return;
    if (classes.includes(formatted)) {
      setValidationError(`Class "${formatted}" already exists in model definition.`);
      return;
    }
    setValidationError(null);
    setClasses([...classes, formatted]);
    setNewClassInput('');
  };

  const handleRemoveClass = (cls: string) => {
    if (classes.length <= 2) {
      setValidationError('A minimum of 2 classes is required.');
      return;
    }
    setValidationError(null);
    setClasses(classes.filter((c) => c !== cls));
  };

  const handleNext = () => {
    setValidationError(null);
    if (step === 2) {
      if (!name.trim()) {
        setValidationError('Model name is required before proceeding.');
        return;
      }
    } else if (step === 3) {
      if (classes.length < 2) {
        setValidationError('At least 2 distinct gesture classes are required to train a model.');
        return;
      }
    }
    setStep((s) => (s + 1) as any);
  };

  const handleFinish = () => {
    const modelId = `custom-model-${Date.now().toString(36)}`;
    const fxMapping: Record<string, GestureFXType> = {};
    classes.forEach((c) => {
      fxMapping[c] = c === 'NEUTRAL_REST' ? 'NONE' : selectedFX;
    });

    const newModel: LaboratoryModel = {
      id: modelId,
      name: name.trim() || 'Untitled Experimental Classifier',
      description: description.trim() || 'Custom on-device gesture classifier trained on normalized 63D landmark vectors.',
      version: '1.0.0',
      figureTag,
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBuiltIn: false,
      isPublished: false,
      modelType,
      lifecycleState: 'CONFIGURED',
      classes,
      fxMapping,
      pipelineConfig: modelType === 'pipeline' ? createDefaultPipeline() : undefined,
      hyperparameters: {
        confidenceThreshold: 0.68,
        kNeighbors: 3,
        metric: 'euclidean',
        smoothingFrames: 2,
      },
      trainingStats: {
        sampleCount: 0,
        trainAccuracy: 0,
        valAccuracy: 0,
        classCounts: {},
        trainedAt: 'Untrained Draft',
      },
    };

    saveModel(newModel);
    onModelCreated(newModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/70 backdrop-blur-sm font-mono">
      <div className="relative w-full max-w-2xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sage-green" />
            <h2 className="text-sm font-bold uppercase tracking-technical text-charcoal-soft">
              NEW EXPERIMENTAL MODEL WIZARD // STEP {step} OF 4
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-paper-dark rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase">
          {['1. ARCHITECTURE', '2. METADATA', '3. CLASSES', '4. FX BINDING'].map((lbl, idx) => (
            <div
              key={lbl}
              className={`py-1 border rounded ${
                step === idx + 1
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream'
                  : 'border-charcoal-soft/30 text-ink-muted'
              }`}
            >
              {lbl}
            </div>
          ))}
        </div>

        {/* Step 1: Architecture */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-charcoal-soft">
              SELECT CLASSIFIER ARCHITECTURE
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  type: 'centroid_prototype' as ModelType,
                  title: 'CENTROID LANDMARK PROTOTYPE (RECOMMENDED)',
                  desc: 'Learns Euclidean centroid prototypes in normalized 63D relative feature space. Instant training, low CPU/RAM footprint, optimal for distinct hand poses.',
                },
                {
                  type: 'knn_landmark' as ModelType,
                  title: 'k-NEAREST NEIGHBORS (k-NN)',
                  desc: 'Stores sample vectors and votes on k=3 closest neighbors. Robust against variations in finger flexion and micro-rotations.',
                },
                {
                  type: 'pipeline' as ModelType,
                  title: 'VISUAL PIPELINE GRAPH (ADVANCED)',
                  desc: 'Custom node-based dataflow connecting preprocessors, custom feature extractors, filters, and multiple output triggers.',
                },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setModelType(item.type)}
                  className={`p-3.5 border-2 rounded-tactile text-left transition-all ${
                    modelType === item.type
                      ? 'border-sage-green bg-sage-green/10 shadow-tactile-sm'
                      : 'border-charcoal-soft/40 hover:border-charcoal-soft'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase">{item.title}</span>
                    {modelType === item.type && <Check className="w-4 h-4 text-sage-green" />}
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Metadata */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-charcoal-soft">
              MODEL SPECIFICATIONS & METADATA
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">MODEL NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Tactical Claw"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-dark font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">FIGURE IDENTIFIER</label>
                  <input
                    type="text"
                    value={figureTag}
                    onChange={(e) => setFigureTag(e.target.value)}
                    className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-dark font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">AUTHOR / LAB UNIT</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-dark font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">OPERATIONAL DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Describe gesture geometry, intent, and operational context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-dark font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Classes */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-charcoal-soft">
              TARGET GESTURE CLASSES TO TRAIN
            </h3>
            <p className="text-xs text-ink-muted">
              Define the distinct gesture classes this model will recognize. Include at least one target gesture and the baseline &quot;NEUTRAL_REST&quot; pose.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="NEW_GESTURE_NAME"
                value={newClassInput}
                onChange={(e) => setNewClassInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                className="flex-1 p-2 border-2 border-charcoal-soft rounded bg-paper-dark font-mono text-xs uppercase"
              />
              <Button variant="outline" size="sm" onClick={handleAddClass} className="text-xs">
                ADD CLASS
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
              {classes.map((cls) => (
                <div
                  key={cls}
                  className="flex items-center justify-between p-2 border border-charcoal-soft/30 rounded bg-paper-dark/30 text-xs"
                >
                  <span className="font-bold">{cls}</span>
                  {cls !== 'NEUTRAL_REST' && classes.length > 2 && (
                    <button
                      onClick={() => handleRemoveClass(cls)}
                      className="text-brick-red hover:underline text-[10px]"
                    >
                      REMOVE
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: FX Binding */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-charcoal-soft">
              BIND VISUAL EFFECT PROFILE
            </h3>
            <p className="text-xs text-ink-muted">
              Choose the visual signature that triggers when your custom gesture is recognized:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  'HOLOGRAM_BURST',
                  'POWER_CHARGE',
                  'SPATIAL_RAY',
                  'DUAL_BEACON',
                  'STATUS_PULSE',
                  'GRAVITY_LOCK',
                  'AFTERIMAGE_TRAIL',
                  'NONE',
                ] as GestureFXType[]
              ).map((fx) => (
                <button
                  key={fx}
                  onClick={() => setSelectedFX(fx)}
                  className={`p-2.5 border-2 rounded-tactile text-left transition-all ${
                    selectedFX === fx
                      ? 'border-sage-green bg-sage-green/10 shadow-tactile-sm'
                      : 'border-charcoal-soft/40 hover:border-charcoal-soft'
                  }`}
                >
                  <span className="font-bold uppercase text-[11px] block">{fx.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-2.5 border-2 border-brick-red/40 bg-brick-red/10 rounded-tactile text-xs text-brick-red font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-charcoal-soft">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setValidationError(null);
                setStep((s) => (s - 1) as any);
              }}
            >
              BACK
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onClose}>
              CANCEL
            </Button>
          )}

          {step < 4 ? (
            <Button variant="default" size="sm" onClick={handleNext}>
              NEXT <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button variant="sage" size="sm" onClick={handleFinish} className="bg-sage-green">
              INITIALIZE MODEL
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
