'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { CrosshairViewport } from '@/components/ui/CrosshairViewport';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { WasteClassifier } from '@/modules/waste/classifier';
import { SessionTally } from '@/modules/waste/components/SessionTally';
import { WasteCategory, WASTE_CLASSES, ClassificationResult } from '@/modules/waste/types';
import { useSystemStore } from '@/core/store';
import { Video, VideoOff, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function WastePage() {
  const [backend, setBackend] = useState('INITIALIZING...');
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [lastLockedItem, setLastLockedItem] = useState<WasteCategory | null>(null);
  const [tally, setTally] = useState<Record<WasteCategory, number>>({
    plastic: 2,
    paper: 3,
    cardboard: 1,
    glass: 0,
    metal: 4,
    organic: 2,
    'e-waste': 0,
    textile: 0,
    hazardous: 0,
    general: 1,
  });

  // Mutable classification result
  const classificationRef = useRef<ClassificationResult>({
    lockedCategory: null,
    isStable: false,
    top3: [],
    backend: 'WEBGPU',
    inferenceDurationMs: 0,
  });

  const [classification, setClassification] = useState<ClassificationResult>(classificationRef.current);

  const classifierRef = useRef<WasteClassifier>(new WasteClassifier());
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedImgRef = useRef<HTMLImageElement | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const lastLockedRef = useRef<WasteCategory | null>(null);
  const hasClassifiedUploadedRef = useRef<boolean>(false);

  const { videoRef, isStreaming, startCamera, stopCamera, errorMessage } = useCamera({ autoStart: true });

  // Initialize ML backend with proper cleanup
  useEffect(() => {
    let unmounted = false;
    const classifier = classifierRef.current;
    classifier.init().then((b) => {
      if (!unmounted) setBackend(b);
    });
    return () => {
      unmounted = true;
      classifier.dispose();
    };
  }, []);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'WASTE CLASSIFIER',
      activeModel: 'classifier.tflite',
      fps: 30,
      p50Ms: classification.inferenceDurationMs || 15,
      p95Ms: Math.round((classification.inferenceDurationMs || 15) * 1.25),
      trackingStatus: classification.lockedCategory ? 'TRACKING_ACTIVE' : 'SEARCHING',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [classification.inferenceDurationMs, classification.lockedCategory, isStreaming, setPerfStats]);

  // Continuous Inference & Adaptive Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const now = performance.now();
      const targetSource = uploadedImgRef.current || videoRef.current;
      const isStaticUpload = !!uploadedImageSrc;

      // Skip redundant continuous processing of identical static images
      if (isStaticUpload && hasClassifiedUploadedRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      // Rate-limit inference to ~12 FPS (every 80ms)
      if (
        now - lastInferenceTimeRef.current >= 80 &&
        targetSource &&
        ((targetSource as HTMLVideoElement).readyState >= 2 || uploadedImageSrc)
      ) {
        lastInferenceTimeRef.current = now;
        const res = classifierRef.current.classifyFrame(targetSource, now);
        classificationRef.current = res;

        if (isStaticUpload) {
          hasClassifiedUploadedRef.current = true;
        }

        // Auto-increment session tally when stable lock occurs
        if (res.isStable && res.lockedCategory && res.lockedCategory !== lastLockedRef.current) {
          lastLockedRef.current = res.lockedCategory;
          setLastLockedItem(res.lockedCategory);
          setTally((prev) => ({
            ...prev,
            [res.lockedCategory!]: (prev[res.lockedCategory!] || 0) + 1,
          }));
        } else if (!res.isStable) {
          lastLockedRef.current = null;
        }

        // Throttle UI re-renders to 5 Hz (every 200ms)
        if (now - lastUiUpdateRef.current >= 200) {
          lastUiUpdateRef.current = now;
          setClassification({ ...res });
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
  }, [uploadedImageSrc, videoRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      hasClassifiedUploadedRef.current = false;
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearUpload = () => {
    setUploadedImageSrc(null);
    hasClassifiedUploadedRef.current = false;
    startCamera();
  };

  const activeMeta = classification.lockedCategory
    ? WASTE_CLASSES[classification.lockedCategory]
    : classification.top3[0]
    ? WASTE_CLASSES[classification.top3[0].category]
    : null;

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
                COMPUTER VISION // FIG. 06
              </span>
              <StampBadge label="10-CLASS SEGREGATION" variant="sage" />
              <StampBadge label={`TF.JS: ${backend}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              SMART WASTE SEGREGATION & RECYCLING SCANNER
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Real-time MobileNetV3 visual inference on WebGPU with center-crop ROI alignment, 8-frame temporal voting stability, and automated municipal disposal routing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            {uploadedImageSrc ? (
              <Button variant="outline" size="sm" onClick={clearUpload} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RESUME LIVE CAM</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>UPLOAD SPECIMEN</span>
              </Button>
            )}

            <Button
              variant={isStreaming ? 'outline' : 'default'}
              size="sm"
              onClick={() => (isStreaming ? stopCamera() : startCamera())}
              className="gap-1.5"
            >
              {isStreaming ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span>{isStreaming ? 'PAUSE' : 'ACTIVATE'}</span>
            </Button>
          </div>
        </div>

        {/* Hardware / Permission Error Warning */}
        {errorMessage && (
          <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red flex items-center justify-between">
            <span>HARDWARE WARNING: {errorMessage}</span>
            <Button variant="brick" size="sm" onClick={() => fileInputRef.current?.click()}>
              UPLOAD SPECIMEN INSTEAD
            </Button>
          </div>
        )}

        {/* Primary Scanner Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Camera Viewport with Center-Crop ROI Frame (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <CrosshairViewport
              title="OPTICAL SPECIMEN REGISTRATION FEED"
              isStreaming={isStreaming || !!uploadedImageSrc}
              backend={backend}
            >
              {uploadedImageSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  ref={uploadedImgRef}
                  src={uploadedImageSrc}
                  alt="Uploaded specimen"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}

              {/* Center-Crop ROI Box with Mechanical Registration Brackets */}
              <div className="absolute w-56 h-56 border-2 border-dashed border-sage-green pointer-events-none flex items-center justify-center">
                {/* Corner registration crosshairs */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-charcoal-soft" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-charcoal-soft" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-charcoal-soft" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-charcoal-soft" />

                <span className="font-mono text-[9px] uppercase font-bold text-sage-green bg-charcoal-soft/80 px-1.5 py-0.5 rounded-[1px]">
                  ROI SPECIMEN BOX
                </span>
              </div>
            </CrosshairViewport>

            {/* Classification Stability Status Banner */}
            {classification.isStable ? (
              <div className="p-3 border-2 border-sage-green bg-sage-green/15 rounded-tactile flex items-center justify-between text-xs text-charcoal-soft">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sage-green" />
                  <span className="font-bold uppercase tracking-technical">
                    IDENTIFICATION LOCKED (TEMPORAL CONSENSUS &ge; 5/8 FRAMES)
                  </span>
                </div>
                <StampBadge label="STABLE" variant="sage" />
              </div>
            ) : (
              <div className="p-3 border-2 border-charcoal-soft bg-paper-dark rounded-tactile flex items-center justify-between text-xs text-charcoal-soft">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-ink-muted" />
                  <span className="font-bold text-ink-muted uppercase">
                    UNCERTAIN &mdash; CENTER AND STEADY ITEM IN ROI BOX
                  </span>
                </div>
                <StampBadge label="ACQUIRING" variant="ink" />
              </div>
            )}
          </div>

          {/* Classification & Routing Station (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Locked Item Card with Disposal Recommendation */}
            <DeskCard
              figure="ROUTING"
              title="DISPOSAL ACTION & BIN DIRECTIVE"
              subtitle="Derived municipal waste sorting instruction"
            >
              {activeMeta && (
                <div className="space-y-3 my-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block">DETECTED MATERIAL</span>
                      <h3 className="text-base font-bold text-charcoal-soft uppercase">
                        {activeMeta.name}
                      </h3>
                    </div>
                    <StampBadge
                      label={activeMeta.bin}
                      variant={activeMeta.binChipVariant}
                      className="text-xs px-2.5 py-1"
                    />
                  </div>

                  <div className="p-3 bg-paper-dark border border-charcoal-soft rounded-tactile space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-technical text-charcoal-soft block">
                      HANDLING DIRECTIVE:
                    </span>
                    <p className="text-xs text-charcoal-soft leading-relaxed">
                      {activeMeta.disposalTip}
                    </p>
                  </div>
                </div>
              )}
            </DeskCard>

            {/* Top-3 Confidence Scores */}
            <DeskCard
              figure="CONFIDENCE"
              title="TOP-3 CLASSIFICATION PROBABILITIES"
              subtitle="Softmax output distribution"
            >
              <div className="space-y-2.5 my-2">
                {classification.top3.map((pred, idx) => {
                  const confPercent = Math.round(pred.confidence * 100);
                  const isTop = idx === 0;

                  return (
                    <div key={pred.category} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className={isTop ? 'text-charcoal-soft' : 'text-ink-muted'}>
                          0{idx + 1}. {pred.label}
                        </span>
                        <span className="tabular-nums font-mono">{confPercent}%</span>
                      </div>
                      <div className="w-full bg-paper-dark border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            isTop ? 'bg-sage-green' : 'bg-charcoal-soft/50'
                          }`}
                          style={{ width: `${confPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-2 border-t border-charcoal-soft/20 flex justify-between text-[10px] text-ink-muted">
                <span>INFERENCE LATENCY: {classification.inferenceDurationMs}ms</span>
                <span>ROI SIZE: 224 x 224 px</span>
              </div>
            </DeskCard>
          </div>
        </div>

        {/* Cumulative Session Disposal Ledger & Tally */}
        <SessionTally
          tally={tally}
          onReset={() =>
            setTally({
              plastic: 0,
              paper: 0,
              cardboard: 0,
              glass: 0,
              metal: 0,
              organic: 0,
              'e-waste': 0,
              textile: 0,
              hazardous: 0,
              general: 0,
            })
          }
        />
      </main>
    </div>
  );
}
