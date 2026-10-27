'use client';

import React, { useState } from 'react';
import { LaboratoryModel } from '../types';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import {
  Sparkles,
  Play,
  Share2,
  Copy,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  Cpu,
  Layers,
  FlaskConical,
  Plus,
  GitBranch,
} from 'lucide-react';
import {
  duplicateModel,
  deleteModel,
  publishModel,
  unpublishModel,
  exportModelToJSON,
  importModelFromJSON,
} from '../model-storage';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';

export interface ModelLibraryProps {
  models: LaboratoryModel[];
  onRefresh: () => void;
  onOpenTestBench: (model: LaboratoryModel) => void;
  onOpenPipelineEditor: (model: LaboratoryModel) => void;
  onOpenDataCollector: (model: LaboratoryModel) => void;
  onOpenNewWizard: () => void;
}

export function ModelLibrary({
  models,
  onRefresh,
  onOpenTestBench,
  onOpenPipelineEditor,
  onOpenDataCollector,
  onOpenNewWizard,
}: ModelLibraryProps) {
  const [filter, setFilter] = useState<'ALL' | 'BUILTIN' | 'CUSTOM' | 'PUBLISHED'>('ALL');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const filteredModels = models.filter((m) => {
    if (filter === 'BUILTIN') return m.isBuiltIn;
    if (filter === 'CUSTOM') return !m.isBuiltIn;
    if (filter === 'PUBLISHED') return m.isPublished;
    return true;
  });

  const handleDuplicate = (id: string) => {
    duplicateModel(id);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Permanently delete this custom laboratory model?')) {
      deleteModel(id);
      onRefresh();
    }
  };

  const handleTogglePublish = (m: LaboratoryModel) => {
    if (m.isPublished) {
      unpublishModel(m.id);
    } else {
      publishModel(m.id);
      unlockAchievement('LAB_INVENTOR');
    }
    onRefresh();
  };

  const handleExport = (id: string, name: string) => {
    const json = exportModelToJSON(id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_model.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    try {
      setImportError(null);
      importModelFromJSON(importJsonText);
      setImportModalOpen(false);
      setImportJsonText('');
      onRefresh();
    } catch (err: any) {
      setImportError(err?.message || 'Failed to parse JSON model specification');
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-charcoal-soft pb-4">
        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'PUBLISHED', 'CUSTOM', 'BUILTIN'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 text-xs uppercase font-bold rounded-tactile border-2 transition-all ${
                filter === tab
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream'
                  : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark'
              }`}
            >
              {tab === 'ALL'
                ? `ALL (${models.length})`
                : tab === 'PUBLISHED'
                ? `PUBLISHED (${models.filter((m) => m.isPublished).length})`
                : tab === 'CUSTOM'
                ? `CUSTOM (${models.filter((m) => !m.isBuiltIn).length})`
                : `FACTORY BUILT-IN (${models.filter((m) => m.isBuiltIn).length})`}
            </button>
          ))}
        </div>

        {/* Global Model Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Upload className="w-3.5 h-3.5 text-ink-muted" />
            IMPORT JSON
          </Button>

          <Button
            variant="sage"
            size="sm"
            onClick={onOpenNewWizard}
            className="gap-1.5 text-xs bg-sage-green text-charcoal-soft border-charcoal-soft hover:bg-sage-green/90"
          >
            <Plus className="w-3.5 h-3.5" />
            NEW EXPERIMENTAL MODEL
          </Button>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => {
          const stats = model.trainingStats;
          return (
            <div
              key={model.id}
              className={`border-2 rounded-tactile p-4 bg-paper-cream flex flex-col justify-between transition-all relative ${
                model.isPublished
                  ? 'border-sage-green shadow-tactile-sm'
                  : 'border-charcoal-soft shadow-tactile'
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-ink-muted px-1.5 py-0.5 border border-charcoal-soft rounded">
                      {model.figureTag}
                    </span>
                    <span className="text-[10px] text-ink-muted">v{model.version}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {model.isPublished ? (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-sage-green/20 text-sage-green border border-sage-green rounded flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" />
                        PUBLISHED
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-paper-dark text-ink-muted border border-ink-muted/30 rounded">
                        STANDBY
                      </span>
                    )}

                    <StampBadge
                      label={model.isBuiltIn ? 'CORE' : 'USER'}
                      variant={model.isBuiltIn ? 'charcoal' : 'brick'}
                    />
                  </div>
                </div>

                <h3 className="font-bold text-sm uppercase text-charcoal-soft line-clamp-1">
                  {model.name}
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed line-clamp-2">
                  {model.description}
                </p>

                {/* Architecture & Classes tags */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                    <Cpu className="w-3 h-3 text-indigo-500" />
                    <span className="uppercase font-semibold">
                      ARCH: {model.modelType.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    {model.classes.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="text-[9px] px-1 py-0.5 bg-paper-dark border border-charcoal-soft/20 rounded text-charcoal-soft uppercase"
                      >
                        {c.replace('_', ' ')}
                      </span>
                    ))}
                    {model.classes.length > 4 && (
                      <span className="text-[9px] text-ink-muted">+{model.classes.length - 4} more</span>
                    )}
                  </div>
                </div>

                {/* Metrics Matrix */}
                {stats && (
                  <div className="mt-3 grid grid-cols-3 gap-1 bg-paper-dark/50 p-2 border border-charcoal-soft/20 rounded text-center">
                    <div>
                      <div className="text-[9px] text-ink-muted">SAMPLES</div>
                      <div className="text-xs font-bold">{stats.sampleCount}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-ink-muted">TRAIN ACC</div>
                      <div className="text-xs font-bold text-sage-green">
                        {Math.round(stats.trainAccuracy * 100)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-ink-muted">VAL ACC</div>
                      <div className="text-xs font-bold text-indigo-400">
                        {Math.round(stats.valAccuracy * 100)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-charcoal-soft/20 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onOpenTestBench(model)}
                    className="gap-1 text-[11px] py-1.5"
                  >
                    <Play className="w-3 h-3 text-sage-green" />
                    TEST BENCH
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenPipelineEditor(model)}
                    className="gap-1 text-[11px] py-1.5"
                  >
                    <GitBranch className="w-3 h-3 text-indigo-400" />
                    PIPELINE
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  {!model.isBuiltIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenDataCollector(model)}
                      className="text-[10px] px-2 py-1 gap-1"
                    >
                      <FlaskConical className="w-2.5 h-2.5" />
                      TRAIN
                    </Button>
                  )}

                  <Button
                    variant={model.isPublished ? 'brick' : 'outline'}
                    size="sm"
                    onClick={() => handleTogglePublish(model)}
                    className="text-[10px] px-2 py-1"
                  >
                    {model.isPublished ? 'UNPUBLISH' : 'PUBLISH'}
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(model.id)}
                      className="p-1.5 border border-charcoal-soft/30 rounded hover:bg-paper-dark text-charcoal-soft"
                      title="Duplicate Model"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleExport(model.id, model.name)}
                      className="p-1.5 border border-charcoal-soft/30 rounded hover:bg-paper-dark text-charcoal-soft"
                      title="Export JSON"
                    >
                      <Download className="w-3 h-3" />
                    </button>

                    {!model.isBuiltIn && (
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="p-1.5 border border-brick-red/40 rounded hover:bg-brick-red/10 text-brick-red"
                        title="Delete Model"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/70 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase text-charcoal-soft">
              IMPORT LABORATORY MODEL SPECIFICATION [JSON]
            </h3>

            {importError && (
              <div className="p-2 border border-brick-red text-brick-red bg-brick-red/10 text-xs rounded">
                {importError}
              </div>
            )}

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste exported Laboratory Model JSON here..."
              className="w-full p-2.5 font-mono text-xs border-2 border-charcoal-soft rounded bg-paper-dark"
            />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>
                CANCEL
              </Button>
              <Button variant="sage" size="sm" onClick={handleImportSubmit}>
                IMPORT MODEL
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
