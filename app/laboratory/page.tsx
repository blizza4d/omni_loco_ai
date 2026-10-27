'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LaboratoryModel } from '@/modules/laboratory/types';
import { getAllModels, getModelById } from '@/modules/laboratory/model-storage';
import { ModelLibrary } from '@/modules/laboratory/components/ModelLibrary';
import { NewModelWizard } from '@/modules/laboratory/components/NewModelWizard';
import { VisualPipelineEditor } from '@/modules/laboratory/components/VisualPipelineEditor';
import { TrainingDataCollector } from '@/modules/laboratory/components/TrainingDataCollector';
import { LiveTestBench } from '@/modules/laboratory/components/LiveTestBench';
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
  Sparkles,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

export type LabWorkstationMode = 'LIBRARY' | 'PIPELINE' | 'COLLECTOR' | 'TEST_BENCH';

export default function LaboratoryPage() {
  const router = useRouter();
  const [models, setModels] = useState<LaboratoryModel[]>([]);
  const [activeModel, setActiveModel] = useState<LaboratoryModel | null>(null);
  const [mode, setMode] = useState<LabWorkstationMode>('LIBRARY');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [quantumTheme, setQuantumTheme] = useState(false);

  const refreshModels = useCallback(() => {
    const list = getAllModels();
    setModels(list);
    if (!activeModel && list.length > 0) {
      setActiveModel(list[0]!);
    } else if (activeModel) {
      const refreshed = list.find((m) => m.id === activeModel.id);
      if (refreshed) setActiveModel(refreshed);
    }
  }, [activeModel]);

  useEffect(() => {
    refreshModels();
    trackVisitedModule('/laboratory');
    unlockAchievement('LAB_RAT');
  }, [refreshModels]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '1') {
        setMode('LIBRARY');
      } else if (e.key === '2' && activeModel) {
        setMode('PIPELINE');
      } else if (e.key === '3' && activeModel) {
        setMode('COLLECTOR');
      } else if (e.key === '4' && activeModel) {
        setMode('TEST_BENCH');
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
    setActiveModel(m);
    setMode('TEST_BENCH');
  };

  const handleOpenPipelineEditor = (m: LaboratoryModel) => {
    setActiveModel(m);
    setMode('PIPELINE');
  };

  const handleOpenDataCollector = (m: LaboratoryModel) => {
    setActiveModel(m);
    setMode('COLLECTOR');
  };

  const handleModelCreated = (newModel: LaboratoryModel) => {
    refreshModels();
    setActiveModel(newModel);
    if (newModel.modelType === 'pipeline') {
      setMode('PIPELINE');
    } else {
      setMode('COLLECTOR');
    }
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
                ON-DEVICE CUSTOM GESTURE TRAINING, PIPELINE SYNTHESIS & REAL-TIME FX
              </span>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1 bg-paper-dark p-1 border-2 border-charcoal-soft rounded-tactile">
            <button
              onClick={() => setMode('LIBRARY')}
              className={`px-2.5 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 ${
                mode === 'LIBRARY'
                  ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                  : 'text-charcoal-soft hover:bg-paper-cream'
              }`}
            >
              <Layers className="w-3 h-3 text-amber-500" />
              <span>LIBRARY [1]</span>
            </button>

            <button
              onClick={() => setMode('PIPELINE')}
              className={`px-2.5 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 ${
                mode === 'PIPELINE'
                  ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                  : 'text-charcoal-soft hover:bg-paper-cream'
              }`}
            >
              <GitBranch className="w-3 h-3 text-indigo-400" />
              <span>PIPELINE [2]</span>
            </button>

            <button
              onClick={() => setMode('COLLECTOR')}
              className={`px-2.5 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 ${
                mode === 'COLLECTOR'
                  ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                  : 'text-charcoal-soft hover:bg-paper-cream'
              }`}
            >
              <Camera className="w-3 h-3 text-sage-green" />
              <span>TRAIN [3]</span>
            </button>

            <button
              onClick={() => setMode('TEST_BENCH')}
              className={`px-2.5 py-1 text-xs font-bold uppercase rounded transition-all flex items-center gap-1 ${
                mode === 'TEST_BENCH'
                  ? 'bg-charcoal-soft text-paper-cream shadow-sm'
                  : 'text-charcoal-soft hover:bg-paper-cream'
              }`}
            >
              <Play className="w-3 h-3 text-cyan-400" />
              <span>TEST BENCH [4]</span>
            </button>
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

      {/* Main Laboratory Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {mode === 'LIBRARY' && (
          <ModelLibrary
            models={models}
            onRefresh={refreshModels}
            onOpenTestBench={handleOpenTestBench}
            onOpenPipelineEditor={handleOpenPipelineEditor}
            onOpenDataCollector={handleOpenDataCollector}
            onOpenNewWizard={() => setIsWizardOpen(true)}
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

        {mode === 'COLLECTOR' && activeModel && (
          <TrainingDataCollector
            model={activeModel}
            onModelUpdated={(updated) => {
              setActiveModel(updated);
              refreshModels();
            }}
            onGoToTestBench={() => setMode('TEST_BENCH')}
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
