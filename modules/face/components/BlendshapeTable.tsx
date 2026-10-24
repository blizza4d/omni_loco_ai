'use client';

import React, { useState, useMemo } from 'react';
import { BlendshapeCategory } from '../types';
import { DeskCard } from '@/components/ui/DeskCard';
import { StampBadge } from '@/components/ui/StampBadge';
import { Search } from 'lucide-react';

export interface BlendshapeTableProps {
  blendshapes: BlendshapeCategory[];
}

export const BlendshapeTable = React.memo(function BlendshapeTable({
  blendshapes,
}: BlendshapeTableProps) {
  const [filter, setFilter] = useState('');

  // Top 5 active blendshapes calculated only when blendshapes changes
  const { top5Names, filtered } = useMemo(() => {
    const sorted = [...blendshapes].sort((a, b) => b.score - a.score);
    const top5 = new Set(sorted.slice(0, 5).map((b) => b.categoryName));

    const filt = filter
      ? blendshapes.filter((b) =>
          b.categoryName.toLowerCase().includes(filter.toLowerCase())
        )
      : blendshapes;

    return { top5Names: top5, filtered: filt };
  }, [blendshapes, filter]);

  return (
    <DeskCard
      figure="TELEMETRY 02"
      title="52 ARKIT BLENDSHAPES MATRIX"
      subtitle="Morph target activation weights [0.0 - 1.0]"
      headerAction={
        <div className="flex items-center gap-1.5 border border-charcoal-soft px-2 py-0.5 bg-paper-dark rounded-[2px]">
          <Search className="w-3 h-3 text-ink-muted" />
          <input
            type="text"
            placeholder="FILTER..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-20 bg-transparent text-[10px] font-mono uppercase focus:outline-none"
          />
        </div>
      }
    >
      <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5 font-mono text-xs">
        {filtered.map((b) => {
          const isTop5 = top5Names.has(b.categoryName) && b.score > 0.1;

          return (
            <div
              key={b.categoryName}
              className={`p-1.5 border rounded-[2px] transition-colors ${
                isTop5
                  ? 'border-brick-red bg-brick-red/10'
                  : 'border-charcoal-soft/20 bg-paper-cream hover:bg-paper-dark'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className={`font-bold ${isTop5 ? 'text-brick-red' : 'text-charcoal-soft'}`}>
                  {b.categoryName}
                </span>
                <div className="flex items-center gap-1.5">
                  {isTop5 && <StampBadge label="TOP 5" variant="brick" />}
                  <span className="tabular-nums font-mono text-ink-muted">
                    {b.score.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Sparkline Progress Bar */}
              <div className="w-full bg-paper-dark border border-charcoal-soft/40 h-1.5 rounded-[1px] overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    isTop5 ? 'bg-brick-red' : 'bg-sage-green'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, b.score * 100))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DeskCard>
  );
});
