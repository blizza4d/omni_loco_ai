'use client';

import React, { useRef, useState } from 'react';
import { ProtocolSessionLog, SessionRecordItem } from '../types';
import { SessionRecorder } from '../session-recorder';
import {
  Download,
  FileText,
  Play,
  Radio,
  RotateCcw,
  Square,
  Upload,
  X,
  Zap,
} from 'lucide-react';

interface SessionRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recorder: SessionRecorder;
  activeSession: ProtocolSessionLog | null;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function SessionRecorderModal({
  isOpen,
  onClose,
  recorder,
  activeSession,
  isRecording,
  onStartRecording,
  onStopRecording,
}: SessionRecorderModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [replayProgress, setReplayProgress] = useState<{
    index: number;
    total: number;
    currentItem?: SessionRecordItem;
  } | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [importedSession, setImportedSession] = useState<ProtocolSessionLog | null>(null);

  if (!isOpen) return null;

  const sessionToView = importedSession || activeSession;

  const handleStartReplay = () => {
    if (!sessionToView) return;
    setIsReplaying(true);
    setReplayProgress({ index: 0, total: sessionToView.items.length });

    recorder.startReplay(
      sessionToView,
      (idx, total, item) => {
        setReplayProgress({ index: idx, total, currentItem: item });
      },
      () => {
        setIsReplaying(false);
        setReplayProgress(null);
      }
    );
  };

  const handleStopReplay = () => {
    recorder.stopReplay();
    setIsReplaying(false);
    setReplayProgress(null);
  };

  const handleExportJSON = () => {
    if (!sessionToView) return;
    const jsonStr = recorder.exportSessionJSON(sessionToView);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omni-session-${sessionToView.protocolName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = recorder.importSessionJSON(text);
        setImportedSession(parsed);
      } catch (err: any) {
        alert(`Failed to import session log: ${err?.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-label="Multimodal Experiment Session Recorder & Replay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-soft/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile p-6 font-mono space-y-4 max-h-[90vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
          <div className="flex items-center gap-2.5">
            <Radio className={`w-5 h-5 ${isRecording ? 'text-brick-red animate-pulse' : 'text-charcoal-soft'}`} />
            <div>
              <span className="text-[10px] text-ink-muted uppercase block tracking-technical">
                MULTIMODAL AUDIT LEDGER
              </span>
              <h3 className="font-bold text-base tracking-technical uppercase text-charcoal-soft">
                EXPERIMENT SESSION RECORDER & REPLAY ENGINE
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-charcoal-soft transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status & Recorder Toolbar */}
        <div className="p-3 bg-paper-dark border border-charcoal-soft rounded flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                isRecording
                  ? 'bg-brick-red animate-pulse'
                  : isReplaying
                  ? 'bg-cyan-500 animate-pulse'
                  : 'bg-ink-muted'
              }`}
            />
            <div>
              <span className="font-bold uppercase text-charcoal-soft block">
                {isRecording
                  ? 'RECORDING ACTIVE IN-FLIGHT SESSION'
                  : isReplaying
                  ? 'DETERMINISTIC REPLAY MODE ENGAGED'
                  : 'RECORDER STANDBY'}
              </span>
              <span className="text-[10px] text-ink-muted">
                {sessionToView
                  ? `${sessionToView.items.length} items recorded (${sessionToView.totalEventsProcessed} events, ${sessionToView.totalActionsExecuted} actions)`
                  : 'No active or loaded session.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={onStartRecording}
                className="px-3 py-1 bg-brick-red text-white font-bold text-xs uppercase rounded flex items-center gap-1 shadow-tactile hover:scale-105 transition-all"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>START RECORDING</span>
              </button>
            ) : (
              <button
                onClick={onStopRecording}
                className="px-3 py-1 bg-charcoal-soft text-paper-cream font-bold text-xs uppercase rounded flex items-center gap-1 shadow-tactile hover:scale-105 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-paper-cream" />
                <span>FINISH RECORDING</span>
              </button>
            )}
          </div>
        </div>

        {/* Replay Controls & Progress Bar */}
        {sessionToView && (
          <div className="p-3 bg-paper-dark border border-cyan-500/40 rounded space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-600 dark:text-cyan-400 uppercase flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" /> CAMERA-LESS DETERMINISTIC REPLAY MODE
              </span>
              {!isReplaying ? (
                <button
                  onClick={handleStartReplay}
                  disabled={isRecording || sessionToView.items.length === 0}
                  className="px-2.5 py-1 bg-cyan-600 text-white font-bold text-xs uppercase rounded hover:bg-cyan-500 disabled:opacity-40 transition-colors"
                >
                  START REPLAY
                </button>
              ) : (
                <button
                  onClick={handleStopReplay}
                  className="px-2.5 py-1 bg-brick-red text-white font-bold text-xs uppercase rounded hover:bg-brick-red/90 transition-colors"
                >
                  HALT REPLAY
                </button>
              )}
            </div>

            {replayProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-ink-muted">
                  <span>
                    STEP {replayProgress.index} OF {replayProgress.total}
                  </span>
                  <span>{Math.round((replayProgress.index / (replayProgress.total || 1)) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-paper-cream border border-charcoal-soft rounded overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{
                      width: `${(replayProgress.index / (replayProgress.total || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session Items Ledger Timeline */}
        <div className="flex-1 overflow-y-auto space-y-1.5 border border-charcoal-soft rounded p-2.5 bg-paper-dark max-h-[220px] text-[11px]">
          {!sessionToView || sessionToView.items.length === 0 ? (
            <div className="text-center text-ink-muted py-6 text-xs">
              NO SESSION LOG ITEMS RECORDED. START RECORDING TO LOG MULTIMODAL INFERENCE & ACTIONS.
            </div>
          ) : (
            sessionToView.items.map((item) => (
              <div
                key={item.id}
                className="p-1.5 border border-charcoal-soft/20 bg-paper-cream rounded flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-bold text-[9px] uppercase px-1 py-0.5 border border-charcoal-soft rounded bg-paper-dark text-charcoal-soft shrink-0">
                    {item.type}
                  </span>
                  <span className="truncate text-charcoal-soft font-mono">
                    {item.eventName || item.nodeType || JSON.stringify(item.payload)}
                  </span>
                </div>
                <span className="text-[9px] text-ink-muted shrink-0">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions (Export, Import) */}
        <div className="flex items-center justify-between pt-2 border-t border-charcoal-soft/20">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              disabled={!sessionToView}
              className="px-2.5 py-1.5 border border-charcoal-soft bg-paper-dark hover:bg-paper-dark/80 disabled:opacity-40 rounded flex items-center gap-1.5 text-xs text-charcoal-soft font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 border border-charcoal-soft bg-paper-dark hover:bg-paper-dark/80 rounded flex items-center gap-1.5 text-xs text-charcoal-soft font-bold transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>IMPORT JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-charcoal-soft text-paper-cream rounded font-bold text-xs uppercase hover:bg-charcoal-soft/90 transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
