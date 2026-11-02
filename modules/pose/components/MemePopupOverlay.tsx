'use client';

import React from 'react';
import { ActiveMemePopup, MemeCategory, PopupAnimationStyle } from '../goofy-types';

interface MemePopupOverlayProps {
  popups: ActiveMemePopup[];
  defaultAnimationStyle?: PopupAnimationStyle;
}

export function MemePopupOverlay({
  popups,
  defaultAnimationStyle = 'CLASSIC',
}: MemePopupOverlayProps) {
  if (!popups || popups.length === 0) return null;

  const getBorderAndGlow = (popup: ActiveMemePopup) => {
    if (popup.isManualPreview) {
      return 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.6)]';
    }
    if (popup.rarity === 'LEGENDARY') {
      return 'border-fuchsia-400 shadow-[0_0_45px_rgba(217,70,239,0.85)] ring-2 ring-amber-300/60';
    }
    if (popup.rarity === 'RARE') {
      return 'border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.7)]';
    }

    const cat: MemeCategory | undefined = popup.category;
    switch (cat) {
      case 'CONFUSION':
        return 'border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.6)]';
      case 'SHOCK':
        return 'border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.6)]';
      case 'CONFIDENCE':
        return 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.6)]';
      case 'FAILURE':
        return 'border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.6)]';
      case 'SUSPICIOUS':
        return 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.6)]';
      case 'CELEBRATION':
        return 'border-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.6)]';
      case 'SPECIAL':
        return 'border-fuchsia-400 shadow-[0_0_40px_rgba(217,70,239,0.75)]';
      default:
        return popup.actionSource === 'DUAL_HAND'
          ? 'border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.7)]'
          : popup.actionSource === 'HAND'
          ? 'border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.6)]'
          : 'border-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.6)]';
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center p-4 overflow-hidden"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-center gap-4 max-w-full max-h-full">
        {popups.map((popup) => {
          const animStyle = popup.animationStyle || defaultAnimationStyle;
          const isExplosive = animStyle === 'EXPLOSIVE';
          const isRetro = animStyle === 'RETRO_ARCADE';
          const isMinimal = animStyle === 'MINIMAL';
          const isNoAnim = animStyle === 'NO_ANIMATION';

          let animClass = 'animate-meme-classic';
          if (isExplosive) animClass = 'animate-meme-explosive';
          else if (isRetro) animClass = 'animate-meme-retro';
          else if (isMinimal) animClass = 'animate-meme-minimal';
          else if (isNoAnim) animClass = 'animate-none';

          const rot = isMinimal || isNoAnim ? 0 : popup.rotationDeg;

          return (
            <div
              key={popup.id}
              className={`relative flex flex-col items-center ${animClass} transition-all transform-gpu`}
              style={{
                transform: `rotate(${rot}deg)`,
                maxWidth: popups.length > 1 ? '42%' : '85%',
                maxHeight: popups.length > 1 ? '60vh' : '80vh',
              }}
            >
              {/* Explosive Comic Starburst Backdrop */}
              {isExplosive && (
                <div
                  className="absolute inset-[-30px] pointer-events-none -z-10 opacity-75 animate-pulse"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(250,204,21,0.4) 0%, rgba(239,68,68,0.2) 50%, transparent 70%)',
                  }}
                />
              )}

              {/* Outer Comic Glow & Border Frame */}
              <div
                className={`relative rounded-xl overflow-hidden border-4 shadow-2xl bg-black/85 backdrop-blur-md ${getBorderAndGlow(
                  popup
                )}`}
              >
                {/* Header Action Tag */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-black/90 border-b border-white/10 gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-white">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        popup.actionSource === 'HAND'
                          ? 'bg-cyan-400 animate-pulse'
                          : 'bg-yellow-400 animate-pulse'
                      }`}
                    />
                    {popup.actionSource}: {popup.actionLabel}
                    {popup.hand && ` (${popup.hand})`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Rarity Badge */}
                    {popup.rarity === 'LEGENDARY' && (
                      <span className="font-mono text-[8px] font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-fuchsia-600 to-amber-500 text-white border border-white/30 animate-pulse">
                        ★ LEGENDARY
                      </span>
                    )}
                    {popup.rarity === 'RARE' && (
                      <span className="font-mono text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        ★ RARE
                      </span>
                    )}

                    {popup.isManualPreview && (
                      <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        TEST PREVIEW
                      </span>
                    )}
                  </div>
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

                  {/* Retro CRT Scanlines Overlay */}
                  {isRetro && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-25"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(0deg, rgba(0,0,0,0.8) 0px, rgba(0,0,0,0.8) 1px, transparent 1px, transparent 3px)',
                      }}
                    />
                  )}

                  {/* Comic Gradient Vignette */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                {/* Bottom Caption Banner */}
                {popup.caption && (
                  <div className="px-3 py-2 bg-gradient-to-r from-slate-900 via-black to-slate-900 border-t border-white/15 text-center">
                    <p
                      className={`font-mono text-xs sm:text-sm font-black tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
                        popup.isManualPreview
                          ? 'text-amber-400'
                          : popup.rarity === 'LEGENDARY'
                          ? 'text-fuchsia-300'
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
          );
        })}
      </div>

      <style jsx>{`
        @keyframes memeClassic {
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

        @keyframes memeExplosive {
          0% {
            opacity: 0;
            transform: scale(0.1) rotate(-10deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.18) rotate(4deg);
          }
          80% {
            transform: scale(0.95) rotate(-2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes memeMinimal {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes memeRetro {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          33% {
            opacity: 1;
            transform: scale(0.6);
          }
          66% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .animate-meme-classic {
          animation: memeClassic 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-meme-explosive {
          animation: memeExplosive 0.32s cubic-bezier(0.18, 1.25, 0.4, 1) forwards;
        }

        .animate-meme-minimal {
          animation: memeMinimal 0.18s ease-out forwards;
        }

        .animate-meme-retro {
          animation: memeRetro 0.25s steps(4) forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-meme-classic,
          .animate-meme-explosive,
          .animate-meme-minimal,
          .animate-meme-retro {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
