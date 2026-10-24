'use client';

import React, { useState } from 'react';
import { SpeechSessionReport, FlawMarker } from '../types';
import { DeskCard } from '@/components/ui/DeskCard';
import { StampBadge } from '@/components/ui/StampBadge';
import { Button } from '@/components/ui/Button';
import { Download, CheckCircle, AlertTriangle, Layers, ArrowRight } from 'lucide-react';

export interface SpeechScorecardProps {
  currentReport: SpeechSessionReport;
  previousReport?: SpeechSessionReport | null;
  onSaveReport?: (report: SpeechSessionReport) => void;
}

export const SpeechScorecard = React.memo(function SpeechScorecard({
  currentReport,
  previousReport,
  onSaveReport,
}: SpeechScorecardProps) {
  const [contrastiveMode, setContrastiveMode] = useState(false);

  const exportReport = (format: 'json' | 'csv') => {
    let dataStr = '';
    let mime = '';

    if (format === 'json') {
      dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentReport, null, 2));
      mime = 'application/json';
    } else {
      const csvRows = [
        'Metric,Current Take,Previous Take',
        `Duration (sec),${currentReport.durationSec},${previousReport?.durationSec || 'N/A'}`,
        `Average WPM,${currentReport.avgWpm},${previousReport?.avgWpm || 'N/A'}`,
        `Speaking Ratio,${currentReport.speakingRatio},${previousReport?.speakingRatio || 'N/A'}`,
        `Pause Count,${currentReport.pauseCount},${previousReport?.pauseCount || 'N/A'}`,
        `Longest Silence (sec),${currentReport.longestSilenceSec},${previousReport?.longestSilenceSec || 'N/A'}`,
        `Pitch Variance (Hz),${currentReport.pitchVariance},${previousReport?.pitchVariance || 'N/A'}`,
        `Total Flaws Detected,${currentReport.flaws.length},${previousReport?.flaws.length || 'N/A'}`,
      ];
      dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
      mime = 'text/csv';
    }

    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `omni-speech-report-${currentReport.id}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between border-b-2 border-charcoal-soft pb-2 gap-2">
        <div className="flex items-center gap-2">
          <StampBadge label="SESSION SCORECARD" variant="charcoal" />
          <h3 className="font-bold text-sm uppercase tracking-technical text-charcoal-soft">
            SPEECH PERFORMANCE AUDIT
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {previousReport && (
            <button
              onClick={() => setContrastiveMode(!contrastiveMode)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase border rounded-tactile transition-all ${
                contrastiveMode
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                  : 'border-charcoal-soft bg-paper-dark hover:bg-paper-cream'
              }`}
            >
              CONTRASTIVE MODE {contrastiveMode ? '[ON]' : '[OFF]'}
            </button>
          )}

          <Button variant="outline" size="sm" onClick={() => exportReport('csv')} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            EXPORT AUDIT (CSV)
          </Button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-charcoal-soft p-3 bg-paper-cream">
          <span className="text-[10px] text-ink-muted uppercase block">AVERAGE CADENCE</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
              {currentReport.avgWpm}
            </span>
            <span className="text-[10px] text-ink-muted">WPM</span>
            {contrastiveMode && previousReport && (
              <span className="text-[10px] font-bold text-brick-red">
                vs {previousReport.avgWpm}
              </span>
            )}
          </div>
          <span className="text-[9px] text-ink-muted block mt-1">TARGET: 120-150 WPM</span>
        </div>

        <div className="border border-charcoal-soft p-3 bg-paper-cream">
          <span className="text-[10px] text-ink-muted uppercase block">SPEAKING RATIO</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
              {(currentReport.speakingRatio * 100).toFixed(0)}%
            </span>
            {contrastiveMode && previousReport && (
              <span className="text-[10px] font-bold text-brick-red">
                vs {(previousReport.speakingRatio * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <span className="text-[9px] text-ink-muted block mt-1">ACTIVE SPEECH TIME</span>
        </div>

        <div className="border border-charcoal-soft p-3 bg-paper-cream">
          <span className="text-[10px] text-ink-muted uppercase block">INTENTIONAL PAUSES</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
              {currentReport.pauseCount}
            </span>
            {contrastiveMode && previousReport && (
              <span className="text-[10px] font-bold text-brick-red">
                vs {previousReport.pauseCount}
              </span>
            )}
          </div>
          <span className="text-[9px] text-ink-muted block mt-1">
            LONGEST: {currentReport.longestSilenceSec}s
          </span>
        </div>

        <div className="border border-charcoal-soft p-3 bg-paper-cream">
          <span className="text-[10px] text-ink-muted uppercase block">PITCH INFLECTION</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
              &plusmn;{currentReport.pitchVariance}
            </span>
            <span className="text-[10px] text-ink-muted">HZ</span>
          </div>
          <span className="text-[9px] text-ink-muted block mt-1">
            {currentReport.pitchVariance < 12 ? 'MONOTONE BIAS' : 'MELODIC RANGE'}
          </span>
        </div>
      </div>

      {/* Flaw Timeline */}
      <DeskCard
        figure="CHRONOLOGY"
        title="TEMPORAL FLAW AUDIT & TIMELINE"
        subtitle="Chronological log of filler words, rushed bursts, and pauses"
      >
        {currentReport.flaws.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {currentReport.flaws.map((flaw) => (
              <div
                key={flaw.id}
                className="p-2 border border-charcoal-soft/30 bg-paper-dark rounded-[2px] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream font-bold text-[9px]">
                    {flaw.timestampSec}s
                  </span>
                  <span className="font-bold text-brick-red uppercase">{flaw.label}</span>
                  <span className="text-ink-muted text-[11px]">&mdash; {flaw.detail}</span>
                </div>
                <StampBadge label={flaw.type} variant="brick" />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 border border-sage-green bg-sage-green/10 rounded-[2px] text-xs text-charcoal-soft flex items-center justify-between">
            <span className="font-bold">ZERO FLURRIES OR CADENCE FLAWS DETECTED</span>
            <StampBadge label="IMMACULATE" variant="sage" />
          </div>
        )}
      </DeskCard>

      {/* 3 Actionable Suggestions */}
      <DeskCard
        figure="COACHING"
        title="3 ACTIONABLE ACOUSTIC ADJUSTMENTS"
        subtitle="Derived algorithmically from speech pacing and tone dispersion"
      >
        <div className="space-y-2">
          {currentReport.suggestions.map((sug, idx) => (
            <div
              key={idx}
              className="p-2.5 border border-charcoal-soft bg-paper-dark/60 rounded-tactile flex items-start gap-2.5"
            >
              <span className="shrink-0 w-5 h-5 border border-charcoal-soft bg-paper-cream font-bold flex items-center justify-center text-[10px]">
                0{idx + 1}
              </span>
              <p className="text-xs text-charcoal-soft leading-relaxed">{sug}</p>
            </div>
          ))}
        </div>
      </DeskCard>
    </div>
  );
});
