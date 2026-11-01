'use client';

import React from 'react';
import { ActiveMemePopup } from '../goofy-types';

interface MemePopupOverlayProps {
  popups: ActiveMemePopup[];
}

export function MemePopupOverlay({ popups }: MemePopupOverlayProps) {
  if (!popups || popups.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center p-4 overflow-hidden"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-center gap-4 max-w-full max-h-full">
        {popups.map((popup) => (
          <div
            key={popup.id}
            className="relative flex flex-col items-center animate-meme-pop transition-all transform-gpu"
            style={{
              transform: `rotate(${popup.rotationDeg}deg)`,
              maxWidth: popups.length > 1 ? '42%' : '85%',
              maxHeight: popups.length > 1 ? '60vh' : '80vh',
            }}
          >
            {/* Outer Comic Glow & Border Frame */}
            <div
              className={`relative rounded-xl overflow-hidden border-4 shadow-2xl bg-black/85 backdrop-blur-md ${
                popup.isManualPreview
                  ? 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.5)]'
                  : popup.actionSource === 'HAND'
                  ? 'border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.6)]'
                  : 'border-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.6)]'
              }`}
            >
              {/* Header Action Tag */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-black/90 border-b border-white/10 gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-white">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      popup.actionSource === 'HAND' ? 'bg-cyan-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
                    }`}
                  />
                  {popup.actionSource}: {popup.actionLabel}
                  {popup.hand && ` (${popup.hand})`}
                </span>
                {popup.isManualPreview && (
                  <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    TEST PREVIEW
                  </span>
                )}
              </div>

              {/* Meme Visual Display */}
              <div className="relative aspect-[4/3] w-[280px] sm:w-[340px] md:w-[380px] max-w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={popup.memeUrl}
                  alt={popup.caption || popup.memeTitle}
                  className="w-full h-full object-contain select-none"
                  draggable={false}
                />

                {/* Comic Speed Burst Highlight (Subtle) */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              {/* Bottom Caption Banner */}
              {popup.caption && (
                <div className="px-3 py-2 bg-gradient-to-r from-slate-900 via-black to-slate-900 border-t border-white/15 text-center">
                  <p
                    className={`font-mono text-xs sm:text-sm font-black tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
                      popup.isManualPreview
                        ? 'text-amber-400'
                        : popup.actionSource === 'HAND'
                        ? 'text-cyan-300'
                        : 'text-yellow-400'
                    }`}
                  >
                    {popup.caption}
                  </p>
                  <p className="font-mono text-[9px] text-white/50 tracking-wider mt-0.5">
                    SOUND: {popup.soundName}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes memePop {
          0% {
            opacity: 0;
            transform: scale(0.4) rotate(0deg);
          }
          65% {
            opacity: 1;
            transform: scale(1.08) rotate(var(--rot, 0deg));
          }
          85% {
            transform: scale(0.97) rotate(var(--rot, 0deg));
          }
          100% {
            transform: scale(1) rotate(var(--rot, 0deg));
          }
        }
        .animate-meme-pop {
          animation: memePop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-meme-pop {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
