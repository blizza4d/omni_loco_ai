'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LaboratoryModel, LaboratoryDraft } from '@/modules/laboratory/types';
import {
  getAllModels,
  getModelById,
  getDraft,
  clearDraft,
  saveDraft,
} from '@/modules/laboratory/model-storage';
import { ModelLibrary } from '@/modules/laboratory/components/ModelLibrary';
import { NewModelWizard } from '@/modules/laboratory/components/NewModelWizard';
import { ModelConfigEditor } from '@/modules/laboratory/components/ModelConfigEditor';
import { VisualPipelineEditor } from '@/modules/laboratory/components/VisualPipelineEditor';
import { TrainingDataCollector } from '@/modules/laboratory/components/TrainingDataCollector';
import { LiveTestBench } from '@/modules/laboratory/components/LiveTestBench';
import { ExperimentWorkbench } from '@/modules/laboratory/components/ExperimentWorkbench';
import { LaboratoryEasterEggs } from '@/modules/laboratory/components/LaboratoryEasterEggs';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { unlockAchievement, trackVisitedModule } from '@/modules/easter-eggs/achievements';
import {
  FlaskConical,
  Layers,
  GitBranch,
  Camera,
  Play,
  ArrowLeft,
  Sliders,
  Activity,
  Sparkles,
  AlertCircle,
  X,
  RotateCcw,
} from 'lucide-react';

export type LabWorkstationMode =
  | 'LIBRARY'
  | 'CONFIG'
  | 'COLLECTOR'
  | 'PIPELINE'
  | 'TEST_BENCH'
  | 'EXPERIMENTS';

export default function LaboratoryPage() {
  const router = useRouter();
  const [models, setModels] = useState<LaboratoryModel[]>([]);
  const [activeModel, setActiveModel] = useState<LaboratoryModel | null>(null);
  const [mode, setMode] = useState<LabWorkstationMode>('LIBRARY');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [quantumTheme, setQuantumTheme] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<LaboratoryDraft | null>(null);

  // Synchronize with URL query params on initial mount
  useEffect(() => {
    trackVisitedModule('/laboratory');
    unlockAchievement('LAB_RAT');

    const list = getAllModels();
    setModels(list);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode') as LabWorkstationMode | null;
      const urlModelId = params.get('model');

      let selectedModel = list[0] || null;
      if (urlModelId) {
        const found = list.find((m) => m.id === urlModelId);
        if (found) selectedModel = found;
      }
      setActiveModel(selectedModel);

      if (urlMode && ['LIBRARY', 'CONFIG', 'COLLECTOR', 'PIPELINE', 'TEST_BENCH', 'EXPERIMENTS'].includes(urlMode)) {
        setMode(urlMode);
      }

      // Check for unsaved draft
      const draft = getDraft(selectedModel?.id);
      if (draft && Date.now() - draft.timestamp < 3600000 * 24) {
        setPendingDraft(draft);
      }
    }
  }, []);

  // Update URL query parameters on mode or model change
  const handleModeChange = (newMode: LabWorkstationMode) => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('mode', newMode);
      if (activeModel) params.set('model', activeModel.id);
      window.history.replaceState(null, '', `?${params.toString()}`);
    }
  };

  const handleModelChange = (m: LaboratoryModel) => {
    setActiveModel(m);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('model', m.id);
      window.history.replaceState(null, '', `?${params.toString()}`);
    }
  };

  const refreshModels = useCallback(() => {
    const list = getAllModels();
    setModels(list);
    if (activeModel) {
      const refreshed = list.find((m) => m.id === activeModel.id);
      if (refreshed) setActiveModel(refreshed);
    }
  }, [activeModel]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '1') {
        handleModeChange('LIBRARY');
      } else if (e.key === '2' && activeModel) {
        handleModeChange('CONFIG');
      } else if (e.key === '3' && activeModel) {
        handleModeChange('COLLECTOR');
      } else if (e.key === '4' && activeModel) {
        handleModeChange('PIPELINE');
      } else if (e.key === '5' && activeModel) {
        handleModeChange('TEST_BENCH');
      } else if (e.key === '6') {
        handleModeChange('EXPERIMENTS');
      } else if (e.key === 'b' || e.key === 'B') {
        setBlueprintMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        router.push('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModel, router]);

  const handleOpenTestBench = (m: LaboratoryModel) => {
    handleModelChange(m);
    handleModeChange('TEST_BENCH');
  };

  const handleOpenConfigEditor = (m: LaboratoryModel) => {
    handleModelChange(m);
    handleModeChange('CONFIG');
  };

  const handleOpenPipelineEditor = (m: LaboratoryModel) => {
    handleModelChange(m);
    handleModeChange('PIPELINE');
  };

  const handleOpenDataCollector = (m: LaboratoryModel) => {
    handleModelChange(m);
    handleModeChange('COLLECTOR');
  };

  const handleModelCreated = (newModel: LaboratoryModel) => {
    refreshModels();
    handleModelChange(newModel);
    if (newModel.modelType === 'pipeline') {
      handleModeChange('PIPELINE');
    } else {
      handleModeChange('COLLECTOR');
    }
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft || !activeModel) return;
    if (pendingDraft.unsavedModel) {
      const restored = { ...activeModel, ...pendingDraft.unsavedModel };
      setActiveModel(restored);
    }
    if (pendingDraft.mode) {
      handleModeChange(pendingDraft.mode as LabWorkstationMode);
    }
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setPendingDraft(null);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-mono transition-colors duration-300 ${
        quantumTheme
          ? 'bg-[#090b14] text-indigo-100'
          : blueprintMode
          ? 'bg-[#04111f] text-cyan-200'
          : 'bg-paper-cream text-charcoal-soft'
      }`}
    >
      <PerformanceHUD />

      {/* Laboratory Command Header */}
      <header className="sticky top-0 z-50 bg-paper-cream/95 backdrop-blur-md border-b-2 border-charcoal-soft px-4 py-2.5 transition-colors select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left Exit & Identity */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-charcoal-soft hover:bg-brick-red hover:text-paper-cream hover:border-brick-red transition-all"
                title="Exit Laboratory and return to Omni Loco Hub [ESC]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="font-bold">EXIT LAB</span>
                <span className="text-[9px] text-ink-muted hidden sm:inline">[ESC]</span>
              </Button>
            </Link>

            <div className="flex flex-col">
              <span className="font-mono text-base font-bold uppercase tracking-technical text-charcoal-soft flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-sage-green animate-pulse" />
                LABORATORY WORKSPACE
                <span className="text-[10px] text-cyan-500 border border-cyan-500 px-1 rounded-[2px] hidden md:inline-block">
                  NEURAL COMPILER
                </span>
              </span>
              <span className="text-[9px] uppercase tracking-wider text-ink-muted hidden lg:block">
                ON-DEVICE CUSTOM GESTURE TRAINING, PIPELINE SYNTHESIS & BENCHMARKS
              </span>
            </div>
          </div>

          {/* Model Selector Dropdown & Mode Tabs */}
          <div className="flex items-center gap-2">
            {/* Active Model Selector */}
            {mode !== 'LIBRARY' && activeModel && (
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-paper-dark border-2 border-charcoal-soft rounded-tactile text-xs">
                <span className="text-[10px] text-ink-muted uppercase">ACTIVE MODEL:</span>
                <select
                  value={activeModel.id}
                  onChange={(e) => {
                    const found = models.find((m) => m.id === e.target.value);
                    if (found) handleModelChange(found);
                  }}
                  className="bg-transparent font-bold uppercase text-[11px] focus:outline-none cursor-pointer"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.figureTag})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-0.5 bg-paper-dark p-1 border-2 border-charcoal-soft rounded-tactile overflow-x-auto">
              <button
                onClick={() => handleModeChange('LIBRARY')}
                className={`px-2 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 shrink-0 ${
                  mode === 'LIBRARY'
                    ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                    : 'text-charcoal-soft hover:bg-paper-cream'
                }`}
              >
                <Layers className="w-3 h-3 text-amber-500" />
                <span>LIBRARY [1]</span>
              </button>

              <button
                onClick={() => handleModeChange('CONFIG')}
                className={`px-2 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 shrink-0 ${
                  mode === 'CONFIG'
                    ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                    : 'text-charcoal-soft hover:bg-paper-cream'
                }`}
              >
                <Sliders className="w-3 h-3 text-indigo-400" />
                <span>CONFIG [2]</span>
              </button>

              <button
                onClick={() => handleModeChange('COLLECTOR')}
                className={`px-2 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 shrink-0 ${
                  mode === 'COLLECTOR'
                    ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                    : 'text-charcoal-soft hover:bg-paper-cream'
                }`}
              >
                <Camera className="w-3 h-3 text-sage-green" />
                <span>TRAIN [3]</span>
              </button>

              <button
                onClick={() => handleModeChange('PIPELINE')}
                className={`px-2 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 shrink-0 ${
                  mode === 'PIPELINE'
                    ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                    : 'text-charcoal-soft hover:bg-paper-cream'
                }`}
              >
                <GitBranch className="w-3 h-3 text-cyan-400" />
                <span>PIPELINE [4]</span>
              </button>

              <button
                onClick={() => handleModeChange('TEST_BENCH')}
                className={`px-2 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 shrink-0 ${
                  mode === 'TEST_BENCH'
                    ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                    : 'text-charcoal-soft hover:bg-paper-cream'
                }`}
              >
                <Play className="w-3 h-3 text-sage-green" />
                <span>TEST [5]</span>
              </button>

              <button
                onClick={() => handleModeChange('EXPERIMENTS')}
                className={`px-2 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 shrink-0 ${
                  mode === 'EXPERIMENTS'
                    ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                    : 'text-charcoal-soft hover:bg-paper-cream'
                }`}
              >
                <Activity className="w-3 h-3 text-brick-red" />
                <span>BENCHMARK [6]</span>
              </button>
            </div>
          </div>

          {/* Right Easter Eggs Bar */}
          <div className="hidden xl:flex items-center gap-2">
            <LaboratoryEasterEggs
              blueprintMode={blueprintMode}
              onToggleBlueprint={() => setBlueprintMode(!blueprintMode)}
              quantumTheme={quantumTheme}
              onToggleQuantumTheme={() => setQuantumTheme(!quantumTheme)}
            />
          </div>
        </div>
      </header>

      {/* Recoverable Draft Notice Banner */}
      {pendingDraft && (
        <div className="bg-indigo-900/90 border-b-2 border-indigo-500 text-indigo-100 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-cyan-400" />
            <span>
              Unsaved draft detected from{' '}
              {new Date(pendingDraft.timestamp).toLocaleTimeString()}. Would you like to restore your edits?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="sage" size="sm" onClick={handleRestoreDraft} className="text-[10px] py-0.5">
              RESTORE DRAFT
            </Button>
            <button
              onClick={handleDiscardDraft}
              className="text-indigo-300 hover:text-paper-cream text-[10px] uppercase font-bold"
            >
              DISCARD
            </button>
          </div>
        </div>
      )}

      {/* Main Laboratory Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {mode === 'LIBRARY' && (
          <ModelLibrary
            models={models}
            onRefresh={refreshModels}
            onOpenTestBench={handleOpenTestBench}
            onOpenConfigEditor={handleOpenConfigEditor}
            onOpenPipelineEditor={handleOpenPipelineEditor}
            onOpenDataCollector={handleOpenDataCollector}
            onOpenNewWizard={() => setIsWizardOpen(true)}
          />
        )}

        {mode === 'CONFIG' && activeModel && (
          <ModelConfigEditor
            model={activeModel}
            onModelUpdated={(updated) => {
              setActiveModel(updated);
              refreshModels();
            }}
          />
        )}

        {mode === 'COLLECTOR' && activeModel && (
          <TrainingDataCollector
            model={activeModel}
            onModelUpdated={(updated) => {
              setActiveModel(updated);
              refreshModels();
            }}
            onGoToTestBench={() => handleModeChange('TEST_BENCH')}
          />
        )}

        {mode === 'PIPELINE' && activeModel && (
          <VisualPipelineEditor
            model={activeModel}
            onModelUpdated={(updated) => {
              setActiveModel(updated);
              refreshModels();
            }}
          />
        )}

        {mode === 'TEST_BENCH' && activeModel && (
          <LiveTestBench
            model={activeModel}
            onModelUpdated={(updated) => {
              setActiveModel(updated);
              refreshModels();
            }}
          />
        )}

        {mode === 'EXPERIMENTS' && activeModel && (
          <ExperimentWorkbench
            model={activeModel}
            onLoadExperimentParams={(exp) => {
              setActiveModel({
                ...activeModel,
                hyperparameters: { ...exp.hyperparameters },
              });
              handleModeChange('CONFIG');
            }}
          />
        )}
      </main>

      {/* New Model Creation Wizard */}
      <NewModelWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onModelCreated={handleModelCreated}
      />
    </div>
  );
}
