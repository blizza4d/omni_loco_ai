'use client';

import React from 'react';
import { GlobalNav } from './GlobalNav';
import { StampBadge } from './StampBadge';
import { Loader2 } from 'lucide-react';

export function ModuleLoading({ moduleName = 'MODULE' }: { moduleName?: string }) {
  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream">
      <GlobalNav />
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex items-center justify-center">
        <div className="border-2 border-charcoal-soft bg-paper-cream p-8 rounded-tactile shadow-tactile max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <StampBadge label="CALIBRATING SENSORS" variant="brick" pulse />
          </div>

          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-8 h-8 text-charcoal-soft animate-spin" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-sm uppercase tracking-technical text-charcoal-soft">
              LOADING {moduleName} SANDBOX
            </h3>
            <p className="text-xs text-ink-muted">
              Spawning worker thread & initializing hardware acceleration pipeline...
            </p>
          </div>

          <div className="w-full bg-paper-dark border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
            <div className="h-full bg-charcoal-soft animate-pulse w-3/4" />
          </div>
        </div>
      </main>
    </div>
  );
}
