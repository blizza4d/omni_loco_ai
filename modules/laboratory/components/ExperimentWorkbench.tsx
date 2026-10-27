'use client';

import React, { useState, useEffect } from 'react';
import {
  LaboratoryModel,
  LaboratoryExperiment,
} from '../types';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import {
  getAllExperiments,
  saveExperiment,
  deleteExperiment,
  getAllDatasets,
} from '../model-storage';
import {
  Activity,
  Layers,
  Plus,
  Trash2,
  GitCompare,
  CheckCircle,
  Clock,
  ArrowRight,
  Sliders,
  ExternalLink,
} from 'lucide-react';

export interface ExperimentWorkbenchProps {
  model: LaboratoryModel;
  onLoadExperimentParams: (exp: LaboratoryExperiment) => void;
}

export function ExperimentWorkbench({ model, onLoadExperimentParams }: ExperimentWorkbenchProps) {
  const [experiments, setExperiments] = useState<LaboratoryExperiment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newExpName, setNewExpName] = useState('');
  const [newExpNotes, setNewExpNotes] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const refreshExperiments = () => {
    const list = getAllExperiments();
    setExperiments(list);
  };

  useEffect(() => {
    refreshExperiments();
  }, []);

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 3) {
        alert('You can compare up to 3 experiments simultaneously.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateExperiment = () => {
    if (!model.trainingStats) {
      alert('This model has not been trained yet. Train the model first in the Dataset tab.');
      return;
    }

    const exp: LaboratoryExperiment = {
      id: `exp-${Date.now().toString(36)}`,
      name: newExpName.trim() || `${model.name} Benchmark Run`,
      modelId: model.id,
      modelName: model.name,
      modelVersion: model.version,
      datasetId: model.datasetId,
      datasetName: model.datasetId ? 'Custom Gesture Set' : 'Default Benchmark',
      algorithm: model.trainingStats.algorithm || model.modelType,
      hyperparameters: { ...model.hyperparameters },
      stats: { ...model.trainingStats },
      notes: newExpNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    saveExperiment(exp);
    refreshExperiments();
    setIsRecordModalOpen(false);
    setNewExpName('');
    setNewExpNotes('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Permanently delete this benchmark experiment?')) {
      deleteExperiment(id);
      setSelectedIds(selectedIds.filter((item) => item !== id));
      refreshExperiments();
    }
  };

  const comparedExperiments = experiments.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-charcoal-soft pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-ink-muted px-1.5 py-0.5 border border-charcoal-soft rounded">
              BENCHMARK MATRIX
            </span>
            <span className="text-xs font-bold uppercase text-charcoal-soft">
              EXPERIMENT LOGS & MODEL COMPARISON
            </span>
            <StampBadge label={`${experiments.length} RUNS ARCHIVED`} variant="sage" />
          </div>
          <h2 className="text-base font-bold uppercase text-charcoal-soft">
            ADVANCED EXPERIMENT COMPARISON WORKBENCH
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="sage"
            size="sm"
            onClick={() => setIsRecordModalOpen(true)}
            className="text-xs gap-1 bg-sage-green text-charcoal-soft border-charcoal-soft hover:bg-sage-green/90"
          >
            <Plus className="w-3.5 h-3.5" />
            RECORD CURRENT RUN
          </Button>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      {comparedExperiments.length >= 2 ? (
        <div className="border-2 border-indigo-500 rounded-tactile p-4 bg-paper-cream space-y-4 shadow-tactile">
          <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase">
              <GitCompare className="w-4 h-4" />
              <span>SIDE-BY-SIDE BENCHMARK COMPARISON ({comparedExperiments.length})</span>
            </div>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[10px] font-bold text-ink-muted hover:text-charcoal-soft"
            >
              CLEAR COMPARISON
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-charcoal-soft bg-paper-dark/40">
                  <th className="p-2.5 font-bold uppercase text-[10px]">METRIC / PARAMETER</th>
                  {comparedExperiments.map((exp) => (
                    <th key={exp.id} className="p-2.5 font-bold uppercase text-[10px] border-l border-charcoal-soft/20">
                      <div>{exp.name}</div>
                      <div className="text-[8px] text-ink-muted">
                        v{exp.modelVersion} • {new Date(exp.createdAt).toLocaleDateString()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-soft/10">
                <tr>
                  <td className="p-2 font-bold text-ink-muted uppercase">ALGORITHM</td>
                  {comparedExperiments.map((exp) => (
                    <td key={exp.id} className="p-2 border-l border-charcoal-soft/20 font-bold uppercase">
                      {exp.algorithm.replace('_', ' ')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-ink-muted uppercase">VALIDATION ACCURACY</td>
                  {comparedExperiments.map((exp) => (
                    <td key={exp.id} className="p-2 border-l border-charcoal-soft/20 font-bold text-sage-green text-sm">
                      {Math.round(exp.stats.valAccuracy * 100)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-ink-muted uppercase">TRAINING ACCURACY</td>
                  {comparedExperiments.map((exp) => (
                    <td key={exp.id} className="p-2 border-l border-charcoal-soft/20 font-bold">
                      {Math.round(exp.stats.trainAccuracy * 100)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-ink-muted uppercase">SAMPLE COUNT</td>
                  {comparedExperiments.map((exp) => (
                    <td key={exp.id} className="p-2 border-l border-charcoal-soft/20">
                      {exp.stats.sampleCount}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-ink-muted uppercase">TRAIN DURATION</td>
                  {comparedExperiments.map((exp) => (
                    <td key={exp.id} className="p-2 border-l border-charcoal-soft/20 text-ink-muted">
                      {exp.stats.durationMs ? `${exp.stats.durationMs}ms` : 'Instant'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-ink-muted uppercase">CONFIDENCE THRESHOLD</td>
                  {comparedExperiments.map((exp) => (
                    <td key={exp.id} className="p-2 border-l border-charcoal-soft/20 font-mono">
                      {exp.hyperparameters.confidenceThreshold}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-ink-muted uppercase">DISTANCE METRIC</td>
                  {comparedExperiments.map((exp) => (
                    <td key={exp.id} className="p-2 border-l border-charcoal-soft/20 uppercase font-mono">
                      {exp.hyperparameters.metric || 'EUCLIDEAN'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-ink-muted uppercase">ACTIONS</td>
                  {comparedExperiments.map((exp) => (
                    <td key={exp.id} className="p-2 border-l border-charcoal-soft/20">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onLoadExperimentParams(exp)}
                        className="text-[10px] gap-1"
                      >
                        <Sliders className="w-3 h-3" />
                        LOAD PARAMS
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-4 border-2 border-dashed border-charcoal-soft/40 rounded-tactile text-center text-xs text-ink-muted space-y-1">
          <GitCompare className="w-5 h-5 mx-auto text-ink-muted" />
          <div className="font-bold text-charcoal-soft uppercase">SIDE-BY-SIDE COMPARISON READY</div>
          <p>Select checkboxes next to any 2 or 3 saved experiment runs below to compare metrics and parameters.</p>
        </div>
      )}

      {/* Experiment Runs Table */}
      <div className="border-2 border-charcoal-soft rounded-tactile p-4 bg-paper-cream space-y-3 shadow-tactile-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sage-green" />
            HISTORICAL BENCHMARK RUNS ({experiments.length})
          </h3>
          <span className="text-[10px] text-ink-muted">CHECK BOX TO COMPARE</span>
        </div>

        {experiments.length > 0 ? (
          <div className="space-y-2">
            {experiments.map((exp) => {
              const isSelected = selectedIds.includes(exp.id);
              return (
                <div
                  key={exp.id}
                  className={`p-3 border-2 rounded transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-charcoal-soft/30 bg-paper-dark/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(exp.id)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-charcoal-soft">{exp.name}</span>
                        <span className="text-[10px] px-1 py-0.5 border rounded text-ink-muted">
                          v{exp.modelVersion}
                        </span>
                        <span className="text-[9px] uppercase px-1 bg-paper-dark border rounded text-ink-muted">
                          {exp.algorithm.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {new Date(exp.createdAt).toLocaleString()} • {exp.stats.sampleCount} samples
                        {exp.notes && ` • "${exp.notes}"`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <div className="text-[9px] text-ink-muted">VAL ACC</div>
                        <div className="text-xs font-bold text-sage-green">
                          {Math.round(exp.stats.valAccuracy * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-ink-muted">TRAIN ACC</div>
                        <div className="text-xs font-bold">
                          {Math.round(exp.stats.trainAccuracy * 100)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onLoadExperimentParams(exp)}
                        className="text-[10px] px-2 py-1"
                        title="Load hyperparameters into configuration editor"
                      >
                        LOAD
                      </Button>

                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 hover:text-brick-red text-ink-muted"
                        title="Delete experiment run"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-ink-muted">
            No experiment benchmark runs recorded yet. Train your model and click &quot;RECORD CURRENT RUN&quot; to archive benchmarks.
          </div>
        )}
      </div>

      {/* Record Experiment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase text-charcoal-soft">
              RECORD MODEL BENCHMARK EXPERIMENT
            </h3>
            <p className="text-xs text-ink-muted">
              Snapshot current model parameters, training accuracy, and dataset metrics into an immutable benchmark entry.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">EXPERIMENT NAME</label>
                <input
                  type="text"
                  placeholder="e.g. kNN k=3 Euclidean Benchmark"
                  value={newExpName}
                  onChange={(e) => setNewExpName(e.target.value)}
                  className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-dark font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">RUN OBSERVATIONS & NOTES</label>
                <textarea
                  rows={3}
                  placeholder="Notes on lighting conditions, sample variation, or changes made..."
                  value={newExpNotes}
                  onChange={(e) => setNewExpNotes(e.target.value)}
                  className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-dark font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsRecordModalOpen(false)}>
                CANCEL
              </Button>
              <Button variant="sage" size="sm" onClick={handleCreateExperiment}>
                SAVE BENCHMARK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
