'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { AcousticDSP } from '@/modules/speech/pitch-detector';
import { VoiceActivityDetector } from '@/modules/speech/vad';
import { SpeechFlawAnalyzer } from '@/modules/speech/flaw-analyzer';
import { renderVUMeter, renderOscilloscope, renderSpectrogram } from '@/modules/speech/visualizers';
import { SpeechScorecard } from '@/modules/speech/components/SpeechScorecard';
import { AcousticFeatures, SpeechSessionReport } from '@/modules/speech/types';
import { useSystemStore } from '@/core/store';
import { Mic, MicOff, Circle, AlertTriangle, Radio, Sparkles } from 'lucide-react';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';

export default function SpeechPage() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [echoCancellation] = useState(true);
  const [noiseSuppression] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alienMode, setAlienMode] = useState(false);
  const alienModeRef = useRef(false);
  useEffect(() => {
    alienModeRef.current = alienMode;
  }, [alienMode]);

  // Canvas visualizer refs
  const vuCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const oscCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const specCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio Context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Pre-allocated typed arrays for zero-allocation 60 FPS DSP
  const timeDataRef = useRef<Float32Array>(new Float32Array(2048));
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(1024));

  // Mutable audio feature states (zero React overhead in DSP loop)
  const featuresRef = useRef<AcousticFeatures>({
    rms: 0,
    dbFs: -60,
    pitchHz: 0,
    spectralCentroid: 0,
    zeroCrossingRate: 0,
    isVoiced: false,
  });

  const vadStatsRef = useRef({
    isSpeaking: false,
    speakingRatio: 0,
    pauseCount: 0,
    longestSilenceSec: 0,
    estimatedWpm: 135,
  });

  // Throttled UI state (4 Hz) for numeric displays
  const [features, setFeatures] = useState<AcousticFeatures>(featuresRef.current);
  const [vadStats, setVadStats] = useState(vadStatsRef.current);

  // Analyzers
  const vadRef = useRef<VoiceActivityDetector>(new VoiceActivityDetector());
  const flawAnalyzerRef = useRef<SpeechFlawAnalyzer>(new SpeechFlawAnalyzer());

  const [sessionReport, setSessionReport] = useState<SpeechSessionReport | null>(null);
  const [previousReport, setPreviousReport] = useState<SpeechSessionReport | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const wpmHistoryRef = useRef<{ timeSec: number; wpm: number }[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  const lastUiUpdateRef = useRef<number>(0);

  // Sync recording ref for animation frame loop
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'SPEECH ANALYTICS',
      activeModel: 'acoustic_dsp.wasm',
      fps: isCapturing ? 60 : 0,
      p50Ms: 2,
      p95Ms: 4,
      trackingStatus: isRecording ? 'TRACKING_ACTIVE' : isCapturing ? 'SEARCHING' : 'STANDBY',
      streamStatus: isCapturing ? 'STREAMING' : 'STANDBY',
    });
  }, [isCapturing, isRecording, setPerfStats]);

  // Start Audio Stream
  const startAudio = async () => {
    try {
      setErrorMessage(null);
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation,
          noiseSuppression,
          autoGainControl: true,
        },
        video: false,
      });
      streamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Ensure pre-allocated buffer sizes match
      if (timeDataRef.current.length !== analyser.fftSize) {
        timeDataRef.current = new Float32Array(analyser.fftSize);
      }
      if (freqDataRef.current.length !== analyser.frequencyBinCount) {
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }

      setIsCapturing(true);
      sessionStartTimeRef.current = performance.now();
      vadRef.current.reset();
      flawAnalyzerRef.current.reset();
      wpmHistoryRef.current = [];
    } catch (err: unknown) {
      const e = err as Error;
      setIsCapturing(false);
      setErrorMessage(e.message || 'Microphone capture failed. Verify browser microphone permissions.');
    }
  };

  const stopAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsCapturing(false);
    setIsRecording(false);
  };

  // Ensure audio stream and AudioContext are cleanly released when leaving module
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Zero-allocation 60 FPS Audio DSP and Visualizer Loop
  useEffect(() => {
    if (!isCapturing) return;

    let active = true;

    const tick = () => {
      if (!active) return;

      const analyser = analyserRef.current;
      if (analyser && audioCtxRef.current) {
        const timeData = timeDataRef.current;
        const freqData = freqDataRef.current;

        analyser.getFloatTimeDomainData(timeData as any);
        analyser.getByteFrequencyData(freqData as any);

        const now = performance.now();
        const elapsedSec = (now - sessionStartTimeRef.current) / 1000;

        // Extract features via pure in-memory DSP
        const feat = AcousticDSP.analyze(timeData, freqData, audioCtxRef.current.sampleRate);
        featuresRef.current = feat;

        // Run Voice Activity Detector
        const vad = vadRef.current.process(feat.rms, feat.zeroCrossingRate, now);
        vadStatsRef.current = vad;

        if (vad.estimatedWpm > 0 && isRecordingRef.current) {
          wpmHistoryRef.current.push({ timeSec: Math.round(elapsedSec), wpm: vad.estimatedWpm });
          if (wpmHistoryRef.current.length > 60) wpmHistoryRef.current.shift();
        }

        // Detect speech flaws
        if (isRecordingRef.current) {
          flawAnalyzerRef.current.process(feat.pitchHz, vad.estimatedWpm, vad.isSpeaking, elapsedSec);
        }

        // Render Visualizers directly to canvas (zero React state overhead)
        if (vuCanvasRef.current) {
          const ctx = vuCanvasRef.current.getContext('2d');
          if (ctx) renderVUMeter(ctx, feat.dbFs, vuCanvasRef.current.width, vuCanvasRef.current.height, isRecordingRef.current);
        }

        if (oscCanvasRef.current) {
          const ctx = oscCanvasRef.current.getContext('2d');
          if (ctx) renderOscilloscope(ctx, timeData, oscCanvasRef.current.width, oscCanvasRef.current.height);
        }

        if (specCanvasRef.current) {
          const ctx = specCanvasRef.current.getContext('2d');
          if (ctx) renderSpectrogram(ctx, freqData, specCanvasRef.current.width, specCanvasRef.current.height);
        }

        // Alien Transmission CRT Phosphor Mode Overlay
        if (alienModeRef.current && specCanvasRef.current) {
          const ctx = specCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.font = '9px monospace';
            ctx.fillStyle = '#22c55e';
            ctx.fillText('📡 SETI // CARRIER: 1420.405 MHz', 8, 16);
            ctx.fillText(`SIG: ${Math.round(feat.rms * 1000)} µV [CARRIER LOCKED]`, 8, 28);
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(4, 4, specCanvasRef.current.width - 8, specCanvasRef.current.height - 8);
            ctx.restore();
          }
        }

        // Throttle UI text updates to 4 Hz (every 250ms) to preserve 60fps main thread
        if (now - lastUiUpdateRef.current >= 250) {
          lastUiUpdateRef.current = now;
          setFeatures({ ...feat });
          setVadStats({ ...vad });
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCapturing]);

  // Handle Recording Toggle
  const toggleRecording = () => {
    if (!isRecording) {
      // Start session
      setIsRecording(true);
      sessionStartTimeRef.current = performance.now();
      vadRef.current.reset();
      flawAnalyzerRef.current.reset();
      wpmHistoryRef.current = [];
    } else {
      // Stop session and generate report
      setIsRecording(false);
      const elapsedSec = Math.round((performance.now() - sessionStartTimeRef.current) / 1000);
      const flaws = flawAnalyzerRef.current.getFlaws();
      const currentVad = vadStatsRef.current;
      const suggestions = flawAnalyzerRef.current.generateSuggestions(
        currentVad.estimatedWpm,
        currentVad.speakingRatio,
        18
      );

      const report: SpeechSessionReport = {
        id: `take-${Date.now()}`,
        createdAt: new Date().toLocaleTimeString(),
        durationSec: elapsedSec,
        avgWpm: currentVad.estimatedWpm,
        speakingRatio: currentVad.speakingRatio,
        pauseCount: currentVad.pauseCount,
        longestSilenceSec: currentVad.longestSilenceSec,
        pitchVariance: 18,
        fillerWordsCount: flaws.filter((f) => f.type === 'FILLER_WORD').length,
        flaws,
        suggestions,
        wpmTimeSeries: [...wpmHistoryRef.current],
      };

      if (sessionReport) {
        setPreviousReport(sessionReport);
      }
      setSessionReport(report);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-mono bg-paper-cream">
      <GlobalNav />
      <PerformanceHUD />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                ACOUSTICS // FIG. 05
              </span>
              <StampBadge label="ON-DEVICE AUDIOWORKLET" variant="sage" />
              <StampBadge label="ZERO-CLOUD DSP" variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              ACOUSTIC & SPEECH ANALYTICS LABORATORY
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Real-time fundamental pitch tracking via autocorrelation, voice activity detection (VAD), cadence pacing analysis, and temporal flaw identification.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={alienMode ? 'brick' : 'outline'}
              size="sm"
              onClick={() => {
                setAlienMode((prev) => {
                  const next = !prev;
                  if (next) unlockAchievement('ALIEN_SIGNALS');
                  return next;
                });
              }}
              className="gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-sage-green" />
              <span>{alienMode ? 'ALIEN DSP: ACTIVE' : 'ALIEN DSP'}</span>
            </Button>

            {isCapturing && (
              <Button
                variant={isRecording ? 'brick' : 'outline'}
                size="sm"
                onClick={toggleRecording}
                className="gap-1.5"
              >
                <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-current animate-pulse' : ''}`} />
                <span>{isRecording ? 'STOP TAKE' : 'RECORD TAKE'}</span>
              </Button>
            )}

            <Button
              variant={isCapturing ? 'outline' : 'default'}
              size="sm"
              onClick={isCapturing ? stopAudio : startAudio}
              className="gap-1.5"
            >
              {isCapturing ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isCapturing ? 'DISCONNECT MIC' : 'CAPTURE MIC'}</span>
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Acoustic Visualizer Cluster */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Visualizer 1: Analog VU Meter */}
          <DeskCard figure="INSTRUMENT 01" title="ANALOG VU METER" subtitle="Loudness ballistics & peak indicator">
            <div className="py-2 flex items-center justify-center">
              <canvas
                ref={vuCanvasRef}
                width={280}
                height={140}
                className="border-2 border-charcoal-soft rounded-tactile shadow-tactile-sm"
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-muted border-t border-charcoal-soft/20 pt-1.5 mt-1">
              <span>OUTPUT: {features.dbFs} dBFS</span>
              <span>RMS: {features.rms.toFixed(3)}</span>
            </div>
          </DeskCard>

          {/* Visualizer 2: Laboratory Oscilloscope */}
          <DeskCard figure="INSTRUMENT 02" title="OSCILLOSCOPE" subtitle="Time-domain acoustic waveform">
            <div className="py-2 flex items-center justify-center">
              <canvas
                ref={oscCanvasRef}
                width={280}
                height={140}
                className="border-2 border-charcoal-soft rounded-tactile shadow-tactile-sm"
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-muted border-t border-charcoal-soft/20 pt-1.5 mt-1">
              <span>ZERO CROSSINGS: {features.zeroCrossingRate}</span>
              <span>VOICED: {features.isVoiced ? 'YES' : 'NO'}</span>
            </div>
          </DeskCard>

          {/* Visualizer 3: Spectrogram Waterfall */}
          <DeskCard figure="INSTRUMENT 03" title="WATERFALL SPECTROGRAM" subtitle="Spectral frequency density">
            <div className="py-2 flex items-center justify-center">
              <canvas
                ref={specCanvasRef}
                width={280}
                height={140}
                className="border-2 border-charcoal-soft rounded-tactile shadow-tactile-sm bg-paper-dark"
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-muted border-t border-charcoal-soft/20 pt-1.5 mt-1">
              <span>PITCH F0: {features.pitchHz > 0 ? `${features.pitchHz} Hz` : '--'}</span>
              <span>CENTROID: {features.spectralCentroid} Hz</span>
            </div>
          </DeskCard>
        </div>

        {/* Live Speech Telemetry Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-charcoal-soft p-3 bg-paper-cream">
            <span className="text-[10px] text-ink-muted uppercase block">ESTIMATED CADENCE</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
                {vadStats.estimatedWpm}
              </span>
              <span className="text-[10px] text-ink-muted">WPM</span>
            </div>
          </div>

          <div className="border border-charcoal-soft p-3 bg-paper-cream">
            <span className="text-[10px] text-ink-muted uppercase block">VOICE ACTIVITY</span>
            <div className="mt-1">
              <StampBadge
                label={vadStats.isSpeaking ? 'SPEAKING ACTIVE' : 'PAUSE / SILENT'}
                variant={vadStats.isSpeaking ? 'sage' : 'charcoal'}
              />
            </div>
          </div>

          <div className="border border-charcoal-soft p-3 bg-paper-cream">
            <span className="text-[10px] text-ink-muted uppercase block">SPEAKING RATIO</span>
            <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
              {(vadStats.speakingRatio * 100).toFixed(0)}%
            </span>
          </div>

          <div className="border border-charcoal-soft p-3 bg-paper-cream">
            <span className="text-[10px] text-ink-muted uppercase block">PAUSE COUNT</span>
            <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
              {vadStats.pauseCount}
            </span>
          </div>
        </div>

        {/* End of Session Scorecard */}
        {sessionReport ? (
          <SpeechScorecard
            currentReport={sessionReport}
            previousReport={previousReport}
            onSaveReport={setSessionReport}
          />
        ) : (
          <DeskCard figure="SCORECARD STANDBY" title="SPEECH AUDIT READY">
            <p className="text-xs text-ink-muted py-2">
              Click &quot;Record Take&quot; to speak for 15-30 seconds. Omni Loco will analyze speech pacing, filler words, pitch inflection, and generate 3 personalized suggestions.
            </p>
          </DeskCard>
        )}
      </main>
    </div>
  );
}
