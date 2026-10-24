'use client';

import React from 'react';
import Link from 'next/link';
import { GlobalNav } from './GlobalNav';
import { Button } from './Button';
import { StampBadge } from './StampBadge';
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react';

export interface ModuleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  moduleName?: string;
}

export function ModuleError({ error, reset, moduleName = 'MODULE' }: ModuleErrorProps) {
  // Categorize known failure signatures
  const message = error?.message || 'An unexpected runtime error occurred.';
  let category = 'RUNTIME FAULT';
  let recoveryTip = 'Restart the module sandbox or reset hardware context.';

  if (message.includes('Permission') || message.includes('denied')) {
    category = 'PERMISSION DENIED';
    recoveryTip = 'Grant camera/microphone access in your browser address bar and reload.';
  } else if (message.includes('NotFoundError') || message.includes('DevicesNotFoundError')) {
    category = 'NO SENSOR DETECTED';
    recoveryTip = 'Ensure your webcam or microphone is firmly plugged in and not disabled in system settings.';
  } else if (message.includes('NotReadableError') || message.includes('busy')) {
    category = 'HARDWARE BUSY';
    recoveryTip = 'Another application (Zoom, Teams, or another tab) is locking the camera hardware.';
  } else if (message.includes('WebGPU') || message.includes('lost') || message.includes('context')) {
    category = 'GPU CONTEXT LOST';
    recoveryTip = 'The browser WebGPU/WebGL pipeline crashed. Reloading will reinitialize shaders.';
  } else if (message.includes('memory') || message.includes('OOM')) {
    category = 'OUT OF MEMORY';
    recoveryTip = 'Close other browser tabs to free local system RAM for neural inference.';
  }

  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream">
      <GlobalNav />
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex items-center justify-center">
        <div className="border-2 border-brick-red bg-paper-cream p-8 rounded-tactile shadow-tactile-brick max-w-lg w-full space-y-4">
          <div className="flex items-center justify-between border-b border-brick-red/30 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-brick-red" />
              <h2 className="font-bold text-sm uppercase tracking-technical text-brick-red">
                {category}
              </h2>
            </div>
            <StampBadge label="HARDWARE INTERRUPT" variant="brick" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-charcoal-soft">
              FAILURE DETECTED IN {moduleName} SANDBOX:
            </p>
            <div className="p-3 bg-paper-dark border border-charcoal-soft rounded-[2px] font-mono text-xs text-charcoal-soft overflow-x-auto">
              {message}
            </div>
            <div className="p-3 bg-paper-cream border border-charcoal-soft/40 rounded-[2px] text-xs text-ink-muted">
              <span className="font-bold text-charcoal-soft uppercase block mb-1">
                RECOMMENDED ACTION:
              </span>
              {recoveryTip}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-charcoal-soft/20">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Home className="w-3.5 h-3.5" />
                RETURN TO HUB
              </Button>
            </Link>
            <Button variant="brick" size="sm" onClick={() => reset()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              RE-INITIALIZE SANDBOX
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
