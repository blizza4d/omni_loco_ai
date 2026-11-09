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
      case 'APPROVAL_CONFIDENCE':
      case 'CONFIDENCE':
        return 'border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.75)] ring-2 ring-yellow-400/40';
      case 'DISAPPROVAL_REJECTION':
        return 'border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.75)] ring-2 ring-rose-500/40';
      case 'ANGER_AGGRESSION':
        return 'border-red-600 shadow-[0_0_55px_rgba(220,38,38,0.85)] ring-2 ring-red-500/50';
      case 'SURPRISE_SHOCK':
      case 'SHOCK':
        return 'border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.8)] ring-2 ring-cyan-400/40';
      case 'CONFUSION':
        return 'border-purple-400 shadow-[0_0_50px_rgba(168,85,247,0.75)] ring-2 ring-purple-400/40';
      case 'VICTORY_CELEBRATION':
      case 'CELEBRATION':
        return 'border-emerald-400 shadow-[0_0_55px_rgba(52,211,153,0.8)] ring-2 ring-amber-400/50';
      case 'SUSPICION_JUDGEMENT':
      case 'SUSPICIOUS':
        return 'border-orange-400 shadow-[0_0_50px_rgba(251,146,60,0.75)] ring-2 ring-amber-400/40';
      case 'FAILURE_DISAPPOINTMENT':
      case 'FAILURE':
        return 'border-slate-400 shadow-[0_0_45px_rgba(148,163,184,0.65)] ring-2 ring-rose-500/30';
      case 'CHAOS_UNEXPECTED':
        return 'border-orange-500 shadow-[0_0_60px_rgba(249,115,22,0.85)] ring-2 ring-red-500/50';
      case 'HAND_GESTURE_REACTION':
        return 'border-cyan-300 shadow-[0_0_50px_rgba(6,182,212,0.8)] ring-2 ring-purple-400/40';
      case 'SPECIAL':
        return 'border-fuchsia-400 shadow-[0_0_50px_rgba(217,70,239,0.85)]';
      default:
        return popup.actionSource === 'DUAL_HAND'
          ? 'border-purple-400 shadow-[0_0_50px_rgba(168,85,247,0.8)]'
          : popup.actionSource === 'HAND'
          ? 'border-cyan-400 shadow-[0_0_45px_rgba(6,182,212,0.75)]'
          : 'border-yellow-400 shadow-[0_0_45px_rgba(250,204,21,0.75)]';
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
          const isChaos = animStyle === 'CHAOS';
          const isRetro = animStyle === 'RETRO_ARCADE';
          const isMinimal = animStyle === 'MINIMAL';
          const isCinematic = animStyle === 'CINEMATIC';
          const isClean = animStyle === 'CLEAN';
          const isNoAnim = animStyle === 'NO_ANIMATION';

          let animClass = 'animate-meme-classic';
          if (isExplosive) animClass = 'animate-meme-explosive';
          else if (isChaos) animClass = 'animate-meme-chaos';
          else if (isRetro) animClass = 'animate-meme-retro';
          else if (isMinimal) animClass = 'animate-meme-minimal';
          else if (isCinematic) animClass = 'animate-meme-cinematic';
          else if (isClean) animClass = 'animate-meme-clean';
          else if (isNoAnim) animClass = 'animate-none';

          const rot = isMinimal || isNoAnim || isCinematic || isClean ? 0 : popup.rotationDeg;

          return (
            <div
              key={popup.id}
              className={`relative flex flex-col items-center ${animClass} transition-all transform-gpu`}
              style={{
                transform: `rotate(${rot}deg)`,
                maxWidth: popups.length > 1 ? '48%' : '94%',
                maxHeight: popups.length > 1 ? '68vh' : '88vh',
              }}
            >
              {/* Explosive & Chaos Comic Starburst Backdrop */}
              {(isExplosive || isChaos) && (
                <div
                  className="absolute inset-[-50px] pointer-events-none -z-10 opacity-85 animate-pulse"
                  style={{
                    background: isChaos
                      ? 'radial-gradient(circle, rgba(236,72,153,0.6) 0%, rgba(168,85,247,0.4) 40%, rgba(6,182,212,0.3) 70%, transparent 90%)'
                      : 'radial-gradient(circle, rgba(250,204,21,0.5) 0%, rgba(239,68,68,0.3) 50%, transparent 70%)',
                  }}
                />
              )}

              {/* Outer Comic Glow & Border Frame */}
              <div
                className={`relative rounded-2xl overflow-hidden border-4 shadow-2xl bg-black/90 backdrop-blur-md ${getBorderAndGlow(
                  popup
                )}`}
              >
                {/* Header Action Tag */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-black/95 border-b border-white/10 gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] font-black uppercase tracking-wider text-white">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        popup.actionSource === 'DUAL_HAND'
                          ? 'bg-purple-400 animate-ping'
                          : popup.actionSource === 'HAND'
                          ? 'bg-cyan-400 animate-pulse'
                          : 'bg-yellow-400 animate-pulse'
                      }`}
                    />
                    {popup.actionSource}: {popup.actionLabel}
                    {popup.hand && ` (${popup.hand})`}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Media Type Indicator */}
                    {popup.mediaType === 'gif' && (
                      <span className="font-mono text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        GIF
                      </span>
                    )}

                    {/* Semantic Match Score Indicator */}
                    {popup.matchScore !== undefined && (
                      <span className="font-mono text-[8px] font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        AI MATCH {popup.matchScore}%
                      </span>
                    )}

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

                {/* Meme Visual Display - Prominent Sizing for Main Attraction */}
                <div className="relative aspect-[4/3] w-[340px] sm:w-[460px] md:w-[540px] lg:w-[620px] max-w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {popup.mediaType === 'video' || popup.memeUrl.endsWith('.mp4') ? (
                    <video
                      src={popup.memeUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain select-none"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={popup.memeUrl}
                      alt={popup.caption || popup.memeTitle}
                      className="w-full h-full object-contain select-none transition-transform duration-300 hover:scale-105"
                      draggable={false}
                    />
                  )}

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

                  {/* Cinematic Letterbox Bars */}
                  {isCinematic && (
                    <>
                      <div className="absolute top-0 inset-x-0 h-4 bg-black pointer-events-none z-10 shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />
                      <div className="absolute bottom-0 inset-x-0 h-4 bg-black pointer-events-none z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.8)]" />
                    </>
                  )}

                  {/* Comic Gradient Vignette */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                </div>

                {/* Bottom Caption Banner - Bold Meme Style Typography */}
                {popup.caption && (
                  <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-black to-slate-950 border-t border-white/15 text-center">
                    <p
                      className={`font-sans font-black text-sm sm:text-base md:text-lg tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight ${
                        popup.isManualPreview
                          ? 'text-amber-400'
                          : popup.rarity === 'LEGENDARY'
                          ? 'text-fuchsia-300'
                          : popup.actionSource === 'DUAL_HAND'
                          ? 'text-purple-300'
                          : popup.actionSource === 'HAND'
                          ? 'text-cyan-300'
                          : 'text-yellow-400'
                      }`}
                      style={{
                        textShadow:
                          '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 3px 6px rgba(0,0,0,0.8)',
                      }}
                    >
                      {popup.caption}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-1.5 text-white/50 font-mono text-[9px] tracking-widest uppercase">
                      <span>AUDIO: {popup.soundName}</span>
                      {popup.matchReason && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400/80">{popup.matchReason}</span>
                        </>
                      )}
                    </div>
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

        @keyframes memeChaos {
          0% {
            opacity: 0;
            transform: scale(0.1) rotate(-25deg);
            filter: hue-rotate(180deg) invert(0.3);
          }
          40% {
            opacity: 1;
            transform: scale(1.35) rotate(12deg);
            filter: hue-rotate(90deg) saturate(2);
          }
          75% {
            transform: scale(0.9) rotate(-8deg);
            filter: hue-rotate(0deg) saturate(1.5);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
            filter: none;
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

        @keyframes memeCinematic {
          0% {
            opacity: 0;
            transform: scale(1.12);
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        @keyframes memeClean {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-meme-classic {
          animation: memeClassic 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-meme-explosive {
          animation: memeExplosive 0.32s cubic-bezier(0.18, 1.25, 0.4, 1) forwards;
        }

        .animate-meme-chaos {
          animation: memeChaos 0.35s cubic-bezier(0.15, 1.45, 0.45, 1) forwards;
        }

        .animate-meme-minimal {
          animation: memeMinimal 0.18s ease-out forwards;
        }

        .animate-meme-retro {
          animation: memeRetro 0.25s steps(4) forwards;
        }

        .animate-meme-cinematic {
          animation: memeCinematic 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-meme-clean {
          animation: memeClean 0.20s ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-meme-classic,
          .animate-meme-explosive,
          .animate-meme-chaos,
          .animate-meme-minimal,
          .animate-meme-retro,
          .animate-meme-cinematic,
          .animate-meme-clean {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
