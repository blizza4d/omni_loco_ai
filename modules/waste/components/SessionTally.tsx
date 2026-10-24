'use client';

import React from 'react';
import { WasteCategory, WASTE_CLASSES } from '../types';
import { DeskCard } from '@/components/ui/DeskCard';
import { StampBadge } from '@/components/ui/StampBadge';
import { Button } from '@/components/ui/Button';
import { BarChart3, RotateCcw } from 'lucide-react';

export interface SessionTallyProps {
  tally: Record<WasteCategory, number>;
  onReset: () => void;
}

export const SessionTally = React.memo(function SessionTally({ tally, onReset }: SessionTallyProps) {
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const maxVal = Math.max(1, ...Object.values(tally));

  return (
    <DeskCard
      figure="TELEMETRY 02"
      title="SESSION DISPOSAL LEDGER & TALLY"
      subtitle="Cumulative items classified by category"
      headerAction={
        <div className="flex items-center gap-2">
          <StampBadge label={`TOTAL: ${total}`} variant="charcoal" />
          <button
            onClick={onReset}
            className="p-1 border border-charcoal-soft bg-paper-cream hover:bg-paper-dark rounded-[2px]"
            title="Reset tally ledger"
          >
            <RotateCcw className="w-3 h-3 text-charcoal-soft" />
          </button>
        </div>
      }
    >
      <div className="space-y-2 font-mono text-xs my-2">
        {(Object.keys(WASTE_CLASSES) as WasteCategory[]).map((cat) => {
          const count = tally[cat] || 0;
          const meta = WASTE_CLASSES[cat];
          const percent = Math.round((count / maxVal) * 100);

          return (
            <div key={cat} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-charcoal-soft">{meta.name}</span>
                  <StampBadge label={meta.bin} variant={meta.binChipVariant} />
                </div>
                <span className="font-bold tabular-nums text-charcoal-soft">{count}</span>
              </div>

              <div className="w-full bg-paper-dark border border-charcoal-soft/40 h-2 rounded-[1px] overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    meta.binChipVariant === 'brick'
                      ? 'bg-brick-red'
                      : meta.binChipVariant === 'sage'
                      ? 'bg-sage-green'
                      : 'bg-charcoal-soft'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DeskCard>
  );
});
