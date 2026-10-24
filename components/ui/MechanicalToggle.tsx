'use client';

import React from 'react';

export interface MechanicalToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function MechanicalToggle({
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: MechanicalToggleProps) {
  return (
    <label
      className={`inline-flex items-center justify-between gap-3 select-none cursor-pointer p-1.5 border border-transparent hover:border-charcoal-soft/20 rounded-tactile transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex flex-col text-left">
        <span className="font-mono text-xs uppercase font-bold tracking-technical text-charcoal-soft">
          {label}
        </span>
        {description && (
          <span className="font-mono text-[11px] text-ink-muted">{description}</span>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-12 shrink-0 border-2 border-charcoal-soft bg-paper-dark p-0.5 rounded-[2px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick-red ${
          checked ? 'bg-sage-green/40 shadow-tactile-sm' : 'shadow-tactile-sm'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-5 border border-charcoal-soft bg-paper-cream shadow-sm transition-transform duration-150 transform ${
            checked
              ? 'translate-x-5 bg-sage-green text-charcoal-soft'
              : 'translate-x-0 bg-charcoal-soft text-paper-cream'
          } flex items-center justify-center text-[8px] font-mono font-bold uppercase`}
        >
          {checked ? 'I' : 'O'}
        </span>
      </button>
    </label>
  );
}
