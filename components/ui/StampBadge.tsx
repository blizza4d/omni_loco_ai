'use client';

import React from 'react';

export interface StampBadgeProps {
  label: string;
  variant?: 'charcoal' | 'brick' | 'sage' | 'ink';
  pulse?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function StampBadge({
  label,
  variant = 'charcoal',
  pulse = false,
  className = '',
  icon,
}: StampBadgeProps) {
  let colorStyles = '';
  switch (variant) {
    case 'brick':
      colorStyles = 'border-brick-red text-brick-red bg-brick-red/10';
      break;
    case 'sage':
      colorStyles = 'border-sage-green text-charcoal-soft bg-sage-green/20';
      break;
    case 'ink':
      colorStyles = 'border-ink-muted text-ink-muted bg-paper-dark';
      break;
    case 'charcoal':
    default:
      colorStyles = 'border-charcoal-soft text-charcoal-soft bg-paper-dark/60';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-technical font-bold border rounded-[2px] select-none ${colorStyles} ${
        pulse ? 'animate-pulse-slow' : ''
      } ${className}`}
    >
      {pulse && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            variant === 'brick' ? 'bg-brick-red' : 'bg-sage-green'
          }`}
        />
      )}
      {icon}
      <span>{label}</span>
    </span>
  );
}
