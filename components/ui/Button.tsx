'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'brick' | 'sage' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className = '', children, disabled, ...props }, ref) => {
    let baseStyles =
      'inline-flex items-center justify-center font-mono uppercase font-bold text-xs tracking-technical border-2 border-charcoal-soft rounded-tactile select-none cursor-pointer btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick-red focus-visible:ring-offset-2';

    let variantStyles = '';
    switch (variant) {
      case 'brick':
        variantStyles =
          'bg-brick-red text-paper-cream shadow-tactile hover:bg-[#a23b32] active:shadow-tactile-sm';
        break;
      case 'sage':
        variantStyles =
          'bg-sage-green text-charcoal-soft shadow-tactile hover:bg-[#819b7d] active:shadow-tactile-sm';
        break;
      case 'outline':
        variantStyles =
          'bg-transparent text-charcoal-soft shadow-tactile hover:bg-paper-dark active:shadow-tactile-sm';
        break;
      case 'ghost':
        variantStyles =
          'border-transparent text-charcoal-soft hover:border-charcoal-soft hover:bg-paper-dark hover:shadow-tactile';
        break;
      case 'default':
      default:
        variantStyles =
          'bg-paper-cream text-charcoal-soft shadow-tactile hover:bg-paper-dark active:shadow-tactile-sm';
        break;
    }

    let sizeStyles = '';
    switch (size) {
      case 'sm':
        sizeStyles = 'px-2.5 py-1 text-[11px]';
        break;
      case 'lg':
        sizeStyles = 'px-6 py-3 text-sm';
        break;
      case 'md':
      default:
        sizeStyles = 'px-4 py-2 text-xs';
        break;
    }

    const disabledStyles = disabled
      ? 'opacity-50 cursor-not-allowed pointer-events-none shadow-none transform-none border-dashed'
      : '';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${disabledStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
