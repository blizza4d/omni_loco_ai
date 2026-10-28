'use client';

import React from 'react';
import { ProtocolDefinition, ProtocolExecutionState } from '../types';
import { BUILT_IN_PROTOCOLS } from '../templates';
import {
  Play,
  Square,
  Pause,
  Plus,
  Save,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  Radio,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface ProtocolToolbarProps {
  protocol: ProtocolDefinition;
  executionState: ProtocolExecutionState;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onSelectTemplate: (templateId: string) => void;
  onOpenLibrary: () => void;
  onToggleRecorder: () => void;
  isRecordingSession: boolean;
}

export function ProtocolToolbar({
  protocol,
  executionState,
  onStart,
  onPause,
  onStop,
  onReset,
  onSave,
  onExport,
  onImport,
  onSelectTemplate,
  onOpenLibrary,
  onToggleRecorder,
  isRecordingSession,
}: ProtocolToolbarProps) {
  const isRunning = executionState === 'RUNNING';

  const getStateBadge = () => {
    switch (executionState) {
      case 'RUNNING':
        return { label: 'RUNNING', bg: 'bg-sage-green text-paper-dark border-sage-green animate-pulse' };
      case 'PAUSED':
        return { label: 'PAUSED', bg: 'bg-apex-amber text-paper-dark border-apex-amber' };
      case 'READY':
        return { label: 'READY', bg: 'bg-paper-dark text-sage-green border-sage-green' };
      case 'FAILED':
        return { label: 'FAILED', bg: 'bg-brick-red text-paper-cream border-brick-red' };
      default:
        return { label: executionState, bg: 'bg-paper-dark text-ink-muted border-charcoal-soft' };
    }
  };

  const badge = getStateBadge();

  return (
    <div className="p-3 border-2 border-charcoal-soft bg-paper-dark rounded-tactile font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-tactile">
      {/* Left: Execution Controls & Status */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Play/Pause/Stop Buttons */}
        {!isRunning ? (
          <button
            onClick={onStart}
            className="px-3 py-1.5 bg-sage-green text-paper-dark font-bold text-xs uppercase rounded flex items-center gap-1.5 shadow-tactile hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-paper-dark" />
            <span>RUN PROTOCOL</span>
          </button>
        ) : (
          <button
            onClick={onPause}
            className="px-3 py-1.5 bg-apex-amber text-paper-dark font-bold text-xs uppercase rounded flex items-center gap-1.5 shadow-tactile hover:scale-105 active:scale-95 transition-all"
          >
            <Pause className="w-3.5 h-3.5 fill-paper-dark" />
            <span>PAUSE</span>
          </button>
        )}

        <button
          onClick={onStop}
          disabled={executionState === 'COMPLETED' || executionState === 'DRAFT'}
          className="px-2.5 py-1.5 border border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-cream-dark disabled:opacity-40 font-bold text-xs uppercase rounded flex items-center gap-1.5 transition-colors"
        >
          <Square className="w-3 h-3 fill-charcoal-soft" />
          <span>STOP</span>
        </button>

        <button
          onClick={onReset}
          className="px-2 py-1.5 border border-charcoal-soft text-ink-muted hover:text-charcoal-soft rounded"
          title="Reset unsaved edits to template baseline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* State Badge */}
        <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${badge.bg}`}>
          {badge.label}
        </span>
      </div>

      {/* Middle: Template Switcher */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-ink-muted hidden md:inline">TEMPLATE:</span>
        <select
          value={protocol.id}
          onChange={(e) => onSelectTemplate(e.target.value)}
          className="bg-paper-cream border border-charcoal-soft px-2.5 py-1 text-xs rounded text-charcoal-soft font-bold focus:outline-none"
        >
          {BUILT_IN_PROTOCOLS.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>
              {tmpl.name}
            </option>
          ))}
        </select>
      </div>

      {/* Right: Actions, Add Node & Recorder */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onOpenLibrary}
          className="px-2.5 py-1.5 border border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold text-xs uppercase rounded flex items-center gap-1 hover:bg-cyan-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ADD NODE</span>
        </button>

        <button
          onClick={onToggleRecorder}
          className={`px-2.5 py-1.5 border font-bold text-xs uppercase rounded flex items-center gap-1.5 transition-all ${
            isRecordingSession
              ? 'border-brick-red bg-brick-red text-white shadow-tactile-brick animate-pulse'
              : 'border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-cream-dark'
          }`}
          title="Multimodal Experiment Session Recorder & Replay Engine"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>{isRecordingSession ? 'REC ACTIVE' : 'RECORDER'}</span>
        </button>

        <button
          onClick={onSave}
          className="px-2.5 py-1.5 border border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-cream-dark font-bold text-xs uppercase rounded flex items-center gap-1 transition-colors"
          title="Save protocol to local storage"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SAVE</span>
        </button>

        <button
          onClick={onExport}
          className="p-1.5 border border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-cream-dark rounded transition-colors"
          title="Export Protocol to JSON"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onImport}
          className="p-1.5 border border-charcoal-soft bg-paper-cream text-charcoal-soft hover:bg-paper-cream-dark rounded transition-colors"
          title="Import Protocol from JSON"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
