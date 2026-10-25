'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  getAchievements,
  resetAchievements,
  Achievement,
} from '@/modules/easter-eggs/achievements';
import { Trophy, X, Lock, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AchievementsModal({ isOpen, onClose }: AchievementsModalProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  const refresh = () => {
    setAchievements(getAchievements());
  };

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filtered = achievements.filter((a) => {
    if (filter === 'UNLOCKED') return !!a.unlockedAt;
    if (filter === 'LOCKED') return !a.unlockedAt;
    return true;
  });

  const handleReset = () => {
    if (window.confirm('Reset all classified laboratory achievements on this machine?')) {
      resetAchievements();
      refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-pure/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-paper-cream dark:bg-charcoal-pure border-2 border-charcoal-soft shadow-tactile-lg rounded-tactile overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft px-4 py-3 bg-paper-dark dark:bg-charcoal-soft/20">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-charcoal-soft">
              LABORATORY DOSSIER // CLASSIFIED DISCOVERIES
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-charcoal-soft transition-colors focus:outline-none"
            aria-label="Close dossier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Filter Header */}
        <div className="p-4 border-b border-charcoal-soft/20 bg-paper-cream dark:bg-charcoal-pure space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
            <div>
              <span className="font-bold text-charcoal-soft">DISCOVERY CLEARANCE: </span>
              <span className="text-amber-500 font-bold">
                {unlockedCount} / {totalCount} UNLOCKED ({pct}%)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-ink-muted mr-1">FILTER:</span>
              {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-[2px] transition-all ${
                    filter === f
                      ? 'bg-charcoal-soft text-paper-cream'
                      : 'border border-charcoal-soft/30 text-ink-muted hover:text-charcoal-soft'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-2 bg-paper-dark dark:bg-charcoal-soft/30 border border-charcoal-soft/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Achievements List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 font-mono text-xs text-ink-muted">
              NO DISCOVERIES MATCH THE SELECTED FILTER.
            </div>
          ) : (
            filtered.map((item) => {
              const isUnlocked = !!item.unlockedAt;

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 border-2 rounded-tactile transition-all ${
                    isUnlocked
                      ? 'border-amber-500/60 bg-amber-500/5 dark:bg-amber-500/10'
                      : 'border-charcoal-soft/30 bg-paper-dark/30 opacity-70'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-tactile border flex items-center justify-center text-xl shrink-0 ${
                      isUnlocked
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-charcoal-soft/40 bg-charcoal-soft/10 text-ink-muted'
                    }`}
                  >
                    {isUnlocked ? item.icon : <Lock className="w-4 h-4 text-ink-muted" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-xs font-bold text-charcoal-soft uppercase">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono text-ink-muted px-1 border border-charcoal-soft/30 rounded-[2px]">
                          {item.category}
                        </span>
                      </div>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-sage-green font-bold shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{item.unlockedAt}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-ink-muted shrink-0 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>RESTRICTED</span>
                        </span>
                      )}
                    </div>

                    <p className="font-mono text-[11px] text-ink-muted mt-0.5 leading-snug">
                      {isUnlocked
                        ? item.description
                        : 'Classified laboratory protocol. Trigger secret interaction or execute hidden commands to unlock.'}
                    </p>

                    <div className="mt-1 text-[9px] font-mono text-charcoal-soft/60">
                      ID: {item.codename}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-charcoal-soft p-3 bg-paper-dark dark:bg-charcoal-soft/20 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-brick-red hover:underline focus:outline-none"
            title="Wipe local achievement progress"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET PROGRESS</span>
          </button>

          <Button variant="outline" size="sm" onClick={onClose}>
            DISMISS
          </Button>
        </div>
      </div>
    </div>
  );
}
