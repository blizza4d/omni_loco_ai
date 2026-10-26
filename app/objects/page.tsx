'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { ObjectDetectorEngine } from '@/modules/objects/detector';
import { ObjectOverlayRenderer } from '@/modules/objects/overlay-renderer';
import { DetectedObject, DetectionConfig, COCO_CLASSES } from '@/modules/objects/types';
import { useSystemStore } from '@/core/store';
import {
  Boxes,
  Activity,
  Download,
  Video,
  VideoOff,
  Upload,
  RefreshCw,
  Sliders,
  Eye,
  Filter,
} from 'lucide-react';

export default function ObjectsPage() {
  const [backend, setBackend] = useState('INITIALIZING...');
  const [isRunning, setIsRunning] = useState(true);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [config, setConfig] = useState<DetectionConfig>({
    confidenceThreshold: 0.45,
    iouThreshold: 0.45,
    maxDetections: 12,
    filterClass: null,
    enableTracking: true,
    showLabels: true,
    showTrajectories: true,
    inferenceResolution: 640,
  });

  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [fps, setFps] = useState(0);
  const [inferenceLatency, setInferenceLatency] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedImgRef = useRef<HTMLImageElement | null>(null);
  const detectorRef = useRef<ObjectDetectorEngine>(new ObjectDetectorEngine());
  const rendererRef = useRef<ObjectOverlayRenderer>(new ObjectOverlayRenderer());
  const animFrameRef = useRef<number | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const hasDetectedUploadedRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(performance.now());

  const { videoRef, isStreaming, startCamera, stopCamera, errorMessage } = useCamera({ autoStart: true });

  // Initialize Detector Backend
  useEffect(() => {
    let unmounted = false;
    detectorRef.current.init().then((b) => {
      if (!unmounted) setBackend(b);
    });
    return () => {
      unmounted = true;
      detectorRef.current.reset();
    };
  }, []);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'OBJECT DETECTION',
      activeModel: 'ort-wasm-simd-threaded.wasm',
      fps,
      p50Ms: inferenceLatency || 25,
      p95Ms: Math.round((inferenceLatency || 25) * 1.3),
      trackingStatus: detections.length > 0 ? 'TRACKING_ACTIVE' : 'SEARCHING',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [fps, inferenceLatency, detections.length, isStreaming, setPerfStats]);

  // Main Detection Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const now = performance.now();
      frameCountRef.current++;

      // Compute FPS at 1 Hz
      if (now - lastFpsCalcRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcRef.current)));
        frameCountRef.current = 0;
        lastFpsCalcRef.current = now;
      }

      const targetSource = uploadedImgRef.current || videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const width = canvas?.width || 640;
      const height = canvas?.height || 480;
      const isStaticUpload = !!uploadedImageSrc;

      // Skip redundant continuous processing of identical static uploaded image
      if (isStaticUpload && hasDetectedUploadedRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      // Rate limit inference to ~15-20 FPS (every 50-60ms) to ensure smooth 60fps UI
      if (
        isRunning &&
        now - lastInferenceTimeRef.current >= 55 &&
        targetSource &&
        ((targetSource as HTMLVideoElement).readyState >= 2 || uploadedImageSrc)
      ) {
        lastInferenceTimeRef.current = now;
        const currentDets = detectorRef.current.detect(targetSource, config, now);
        const tracks = detectorRef.current.getTracks();

        if (isStaticUpload) {
          hasDetectedUploadedRef.current = true;
        }

        if (ctx) {
          rendererRef.current.render(ctx, width, height, currentDets, tracks, config);
        }

        // Throttle UI re-render to 8 Hz (every 120ms)
        if (now - lastUiUpdateRef.current >= 120) {
          lastUiUpdateRef.current = now;
          setDetections(currentDets);
          setInferenceLatency(detectorRef.current.getLastInferenceMs());
        }
      } else if (!isRunning && ctx) {
        ctx.clearRect(0, 0, width, height);
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
  }, [isRunning, uploadedImageSrc, config, videoRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      hasDetectedUploadedRef.current = false;
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearUpload = () => {
    setUploadedImageSrc(null);
    hasDetectedUploadedRef.current = false;
    startCamera();
  };

  // Export Telemetry (JSON)
  const exportTelemetry = () => {
    const data = {
      timestamp: new Date().toISOString(),
      backend,
      config,
      totalDetections: detections.length,
      detections,
      activeTracks: detectorRef.current.getTracks(),
    };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    a.download = `omni-yolo-detections-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Calculate object inventory summary
  const inventoryCounts: Record<string, number> = {};
  for (const det of detections) {
    inventoryCounts[det.label] = (inventoryCounts[det.label] || 0) + 1;
  }

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
                NEURAL PERCEPTION // FIG. 09
              </span>
              <StampBadge label="YOLO26 / ONNX WEB" variant="sage" />
              <StampBadge label={`ACCEL: ${backend}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              ADVANCED OBJECT INTELLIGENCE & TRACKING RIG
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Browser-native ONNX detection with multi-object IoU temporal tracking, Non-Maximum Suppression (NMS), and class filtering on WebGPU / WASM SIMD.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
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

            <Button variant="outline" size="sm" onClick={exportTelemetry} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT TELEMETRY</span>
            </Button>

            <Button
              variant={isRunning ? 'outline' : 'default'}
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              className="gap-1.5"
            >
              {isRunning ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'PAUSE INFERENCE' : 'RESUME'}</span>
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red">
            HARDWARE NOTICE: {errorMessage}
          </div>
        )}

        {/* Main Grid: Viewport + Controls + Telemetry Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Viewport & Live Overlay */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-[4/3] w-full border-2 border-charcoal-soft rounded-tactile overflow-hidden bg-paper-dark shadow-tactile-lg">
              {/* Camera Video / Uploaded Image */}
              {uploadedImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={uploadedImgRef}
                  src={uploadedImageSrc}
                  alt="Detection Specimen"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* 60 FPS Bounding Box & Tracker Canvas */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
              />

              {/* Top Viewport Stamped Badges */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <StampBadge
                  label={`${detections.length} OBJECTS TRACKED`}
                  variant={detections.length > 0 ? 'sage' : 'charcoal'}
                />
                <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-cream/90 border border-charcoal-soft rounded-[2px] text-charcoal-soft">
                  LATENCY: {inferenceLatency}MS
                </span>
              </div>
            </div>

            {/* Interactive Detection Controls Bar */}
            <div className="p-4 border border-charcoal-soft bg-paper-cream-dark/40 rounded-tactile space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-charcoal-soft" />
                  <span className="font-bold uppercase tracking-technical">INFERENCE THRESHOLDS:</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-muted">CONF:</span>
                    <input
                      type="range"
                      min="0.25"
                      max="0.90"
                      step="0.05"
                      value={config.confidenceThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, confidenceThreshold: parseFloat(e.target.value) })
                      }
                      className="w-24 accent-charcoal-soft"
                    />
                    <span className="tabular-nums font-bold text-[11px]">
                      {(config.confidenceThreshold * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-muted">IOU NMS:</span>
                    <input
                      type="range"
                      min="0.20"
                      max="0.75"
                      step="0.05"
                      value={config.iouThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, iouThreshold: parseFloat(e.target.value) })
                      }
                      className="w-24 accent-charcoal-soft"
                    />
                    <span className="tabular-nums font-bold text-[11px]">
                      {config.iouThreshold.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-charcoal-soft/20 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableTracking}
                      onChange={(e) => setConfig({ ...config, enableTracking: e.target.checked })}
                      className="accent-charcoal-soft"
                    />
                    <span>SPATIAL TRACKING IDS</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showTrajectories}
                      onChange={(e) => setConfig({ ...config, showTrajectories: e.target.checked })}
                      className="accent-charcoal-soft"
                    />
                    <span>TRAJECTORY PATHS</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showLabels}
                      onChange={(e) => setConfig({ ...config, showLabels: e.target.checked })}
                      className="accent-charcoal-soft"
                    />
                    <span>CONFIDENCE LABELS</span>
                  </label>
                </div>

                {/* Filter Class */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-ink-muted" />
                  <select
                    value={config.filterClass || 'ALL'}
                    onChange={(e) =>
                      setConfig({ ...config, filterClass: e.target.value === 'ALL' ? null : e.target.value })
                    }
                    className="px-2 py-0.5 border border-charcoal-soft rounded-[2px] bg-paper-cream text-[10px] font-bold"
                  >
                    <option value="ALL">ALL CLASSES (80 COCO)</option>
                    {['person', 'laptop', 'cell phone', 'bottle', 'cup', 'chair', 'book', 'backpack', 'car'].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Telemetry & Inventory */}
          <div className="space-y-4">
            <DeskCard figure="FIG. 09-A" title="OBJECT INVENTORY TELEMETRY">
              <div className="space-y-4">
                {/* Scoreboard */}
                <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-2">
                  <span className="text-[10px] text-ink-muted block uppercase">ACTIVE TARGETS</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-charcoal-soft tabular-nums">
                      {detections.length}
                    </span>
                    <span className="text-xs text-sage-green font-bold">DETECTED OBJECTS</span>
                  </div>
                </div>

                {/* Detected Classes Breakdown */}
                <div className="space-y-2">
                  <span className="text-[10px] text-ink-muted block uppercase">CATEGORY BREAKDOWN</span>
                  {Object.keys(inventoryCounts).length === 0 ? (
                    <p className="text-[11px] text-ink-muted italic py-3 text-center">
                      Point camera at objects (people, laptops, bottles, phones) to begin tracking.
                    </p>
                  ) : (
                    <div className="divide-y divide-charcoal-soft/20 border border-charcoal-soft rounded-tactile overflow-hidden bg-paper-dark/60">
                      {Object.entries(inventoryCounts).map(([label, count]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between p-2 text-xs"
                        >
                          <span className="font-bold uppercase text-charcoal-soft">{label}</span>
                          <span className="px-2 py-0.5 bg-paper-cream border border-charcoal-soft rounded-[2px] font-bold tabular-nums">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Spatial Tracking Ledger */}
                <div className="space-y-2">
                  <span className="text-[10px] text-ink-muted block uppercase">ACTIVE TRACK IDs</span>
                  <div className="divide-y divide-charcoal-soft/20 border border-charcoal-soft rounded-tactile overflow-hidden bg-paper-dark/40 max-h-48 overflow-y-auto">
                    {detections.map((obj, i) => (
                      <div key={i} className="p-2 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-charcoal-soft">
                          #{obj.trackId || (i + 1)} {obj.label.toUpperCase()}
                        </span>
                        <span className="text-ink-muted tabular-nums">
                          {(obj.confidence * 100).toFixed(0)}% CONF
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specs */}
                <div className="pt-2 border-t border-charcoal-soft/20 divide-y divide-charcoal-soft/20 text-xs">
                  <div className="py-1.5 flex justify-between">
                    <span className="text-ink-muted">MODEL PIPELINE:</span>
                    <span className="font-bold">YOLO ONNX</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-ink-muted">INFERENCE ACCEL:</span>
                    <span className="font-bold text-sage-green">{backend}</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-ink-muted">INPUT RESOLUTION:</span>
                    <span className="font-bold">{config.inferenceResolution}x{config.inferenceResolution}</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-ink-muted">NMS SUPPRESSION:</span>
                    <span className="font-bold">ACTIVE (IoU {config.iouThreshold})</span>
                  </div>
                </div>
              </div>
            </DeskCard>
          </div>
        </div>
      </main>
    </div>
  );
}
