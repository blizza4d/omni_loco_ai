'use client';

import React, { useState } from 'react';
import { ProtocolLogEntry } from '../types';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Info,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';

interface ExecutionDiagnosticsPanelProps {
  logs: ProtocolLogEntry[];
  eventsProcessed: number;
  actionsExecuted: number;
  lastEventTime: number;
  subscriptionCount: number;
  onClearLogs: () => void;
}

export function ExecutionDiagnosticsPanel({
  logs,
  eventsProcessed,
  actionsExecuted,
  lastEventTime,
  subscriptionCount,
  onClearLogs,
}: ExecutionDiagnosticsPanelProps) {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'ACTION' | 'WARN' | 'ERROR'>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ACTION') return log.level === 'action';
    if (filterLevel === 'WARN') return log.level === 'warn';
    if (filterLevel === 'ERROR') return log.level === 'error';
    return true;
  });

  return (
    <div className="border-2 border-charcoal-soft bg-paper-dark rounded-tactile font-mono text-xs shadow-tactile flex flex-col h-full overflow-hidden">
      {/* Telemetry HUD Metric Tickers */}
      <div className="p-3 border-b-2 border-charcoal-soft grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-paper-cream-dark/40">
        <div className="p-1.5 border border-charcoal-soft/40 bg-paper-cream rounded">
          <span className="text-[9px] text-ink-muted uppercase block">EVENTS INGESTED</span>
          <span className="text-base font-bold text-sage-green">{eventsProcessed}</span>
        </div>
        <div className="p-1.5 border border-charcoal-soft/40 bg-paper-cream rounded">
          <span className="text-[9px] text-ink-muted uppercase block">ACTIONS FIRED</span>
          <span className="text-base font-bold text-charcoal-soft">{actionsExecuted}</span>
        </div>
        <div className="p-1.5 border border-charcoal-soft/40 bg-paper-cream rounded">
          <span className="text-[9px] text-ink-muted uppercase block">ACTIVE LISTENERS</span>
          <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">{subscriptionCount}</span>
        </div>
        <div className="p-1.5 border border-charcoal-soft/40 bg-paper-cream rounded">
          <span className="text-[9px] text-ink-muted uppercase block">BUS STATUS</span>
          <span className="text-base font-bold text-charcoal-soft flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sage-green animate-pulse" /> LIVE
          </span>
        </div>
      </div>

      {/* Log Console Toolbar */}
      <div className="px-3 py-2 border-b border-charcoal-soft/20 flex items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-sage-green" />
          <span className="font-bold uppercase text-charcoal-soft">DIAGNOSTIC EVENT STREAM</span>
          <span className="text-ink-muted">({filteredLogs.length})</span>
        </div>

        <div className="flex items-center gap-1">
          {(['ALL', 'ACTION', 'WARN', 'ERROR'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase transition-colors ${
                filterLevel === lvl
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream'
                  : 'border-charcoal-soft/30 text-ink-muted hover:text-charcoal-soft'
              }`}
            >
              {lvl}
            </button>
          ))}
          <button
            onClick={onClearLogs}
            className="p-1 text-ink-muted hover:text-charcoal-soft ml-1"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Log Entries Stream */}
      <div className="p-3 flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] min-h-[160px] max-h-[260px] bg-paper-dark">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-ink-muted/60 py-6 text-[10px]">
            NO EVENTS LOGGED YET. RUN PROTOCOL AND TRIGGER MULTIMODAL INPUTS.
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeColor = 'text-ink-muted border-charcoal-soft/30';
            let icon = <Info className="w-3 h-3 shrink-0" />;

            if (log.level === 'action') {
              badgeColor = 'text-sage-green border-sage-green/40 bg-sage-green/10';
              icon = <Zap className="w-3 h-3 shrink-0 text-sage-green" />;
            } else if (log.level === 'warn') {
              badgeColor = 'text-apex-amber border-apex-amber/40 bg-apex-amber/10';
              icon = <AlertTriangle className="w-3 h-3 shrink-0 text-apex-amber" />;
            } else if (log.level === 'error') {
              badgeColor = 'text-brick-red border-brick-red/40 bg-brick-red/10';
              icon = <AlertTriangle className="w-3 h-3 shrink-0 text-brick-red" />;
            }

            return (
              <div
                key={log.id}
                className={`p-1.5 border rounded flex items-start justify-between gap-2 bg-paper-cream/80 ${badgeColor}`}
              >
                <div className="flex items-start gap-1.5 overflow-hidden">
                  {icon}
                  <div className="overflow-hidden">
                    {log.nodeLabel && (
                      <span className="font-bold text-[9px] uppercase px-1 py-0.2 mr-1.5 border border-charcoal-soft/40 bg-paper-dark text-charcoal-soft rounded">
                        {log.nodeLabel}
                      </span>
                    )}
                    <span className="text-charcoal-soft">{log.message}</span>
                  </div>
                </div>
                <span className="text-[9px] text-ink-muted shrink-0">
                  +{log.timestamp ? Math.round(log.timestamp % 10000) : 0}ms
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
