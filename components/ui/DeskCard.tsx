'use client';

import React from 'react';

export interface DeskCardProps {
  figure?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
  highlight?: boolean;
}

export function DeskCard({
  figure,
  title,
  subtitle,
  headerAction,
  children,
  className = '',
  inset = false,
  highlight = false,
}: DeskCardProps) {
  return (
    <div
      className={`relative border-2 border-charcoal-soft rounded-tactile p-4 transition-all duration-150 flex flex-col ${
        inset ? 'bg-paper-dark' : 'bg-paper-cream'
      } ${
        highlight
          ? 'border-brick-red shadow-tactile-brick'
          : 'shadow-tactile hover:shadow-tactile-lg'
      } ${className}`}
    >
      {/* Corner Drafting Marks (+) */}
      <span className="absolute top-1 left-1.5 font-mono text-[9px] text-charcoal-soft/40 select-none pointer-events-none">
        +
      </span>
      <span className="absolute top-1 right-1.5 font-mono text-[9px] text-charcoal-soft/40 select-none pointer-events-none">
        +
      </span>
      <span className="absolute bottom-1 left-1.5 font-mono text-[9px] text-charcoal-soft/40 select-none pointer-events-none">
        +
      </span>
      <span className="absolute bottom-1 right-1.5 font-mono text-[9px] text-charcoal-soft/40 select-none pointer-events-none">
        +
      </span>

      {/* Header bar if figure or title provided */}
      {(figure || title || headerAction) && (
        <div className="flex items-start justify-between border-b border-charcoal-soft/20 pb-2 mb-3 gap-2 min-h-[46px]">
          <div>
            {figure && (
              <span className="block font-mono text-[10px] font-bold uppercase tracking-technical text-ink-muted">
                {figure}
              </span>
            )}
            {title && (
              <h3 className="font-mono text-sm font-bold uppercase tracking-technical text-charcoal-soft leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="font-mono text-[11px] text-ink-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
