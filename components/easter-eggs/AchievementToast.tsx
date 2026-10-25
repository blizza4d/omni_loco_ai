'use client';

import React, { useEffect, useState } from 'react';
import { subscribeToAchievements, Achievement } from '@/modules/easter-eggs/achievements';
import { Award, X } from 'lucide-react';

export function AchievementToast() {
  const [activeToast, setActiveToast] = useState<Achievement | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAchievements((achievement) => {
      setActiveToast(achievement);

      // Play soft high-tech achievement chime using Web Audio API
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880.0, now + 0.08); // A5
          osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.5);
          setTimeout(() => {
            try {
              ctx.close();
            } catch {
              // ignore
            }
          }, 600);
        }
      } catch {
        // AudioContext restricted or muted
      }

      // Auto dismiss after 4.5 seconds
      const timer = setTimeout(() => {
        setActiveToast((current) => (current?.id === achievement.id ? null : current));
      }, 4500);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  if (!activeToast) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-paper-cream dark:bg-charcoal-pure border-2 border-amber-500 shadow-tactile-lg p-3 rounded-tactile animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-tactile border border-amber-500 bg-amber-500/10 flex items-center justify-center text-xl shrink-0">
          {activeToast.icon || <Award className="w-5 h-5 text-amber-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider text-amber-500 uppercase">
              CLASSIFIED UNLOCK // {activeToast.category}
            </span>
            <button
              onClick={() => setActiveToast(null)}
              className="text-ink-muted hover:text-charcoal-soft focus:outline-none"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="font-mono text-sm font-bold text-charcoal-soft uppercase tracking-wide truncate">
            {activeToast.title}
          </h4>

          <p className="font-mono text-[11px] text-ink-muted leading-tight mt-0.5">
            {activeToast.description}
          </p>

          <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-amber-500/80">
            <span>CODENAME: {activeToast.codename}</span>
            <span>{activeToast.unlockedAt || 'JUST NOW'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
