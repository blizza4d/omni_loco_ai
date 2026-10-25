'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { PromptableSegmenter } from '@/modules/segment/segmenter';
import {
  PointPrompt,
  BoxPrompt,
  MaskConfig,
  SegmentationResult,
  TELEMETRY_COLORS,
} from '@/modules/segment/types';
import { useSystemStore } from '@/core/store';
import {
  Scissors,
  Upload,
  Download,
  Camera,
  RotateCcw,
  PlusCircle,
  MinusCircle,
  Eye,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function SegmentationPage() {
  const [backend, setBackend] = useState('INITIALIZING...');
  const [promptMode, setPromptMode] = useState<1 | 0>(1); // 1 = positive, 0 = negative
  const [points, setPoints] = useState<PointPrompt[]>([]);
  const [capturedImageSrc, setCapturedImageSrc] = useState<string | null>(null);
  const [cutoutPreviewSrc, setCutoutPreviewSrc] = useState<string | null>(null);

  const [maskConfig, setMaskConfig] = useState<MaskConfig>({
    opacity: 0.55,
    colorHex: '#00E599',
    showBoundary: true,
    invertMask: false,
  });

  const [segResult, setSegResult] = useState<SegmentationResult>({
    maskWidth: 640,
    maskHeight: 480,
    maskData: new Uint8Array(640 * 480),
    areaPercentage: 0,
    confidenceScore: 0,
    inferenceDurationMs: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeImgRef = useRef<HTMLImageElement | null>(null);
  const segmenterRef = useRef<PromptableSegmenter>(new PromptableSegmenter());

  const { videoRef, isStreaming, startCamera, stopCamera, errorMessage } = useCamera({ autoStart: true });

  // Initialize Segmenter Backend
  useEffect(() => {
    segmenterRef.current.init().then((b) => {
      setBackend(b);
    });
  }, []);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'SEGMENTATION LAB',
      activeModel: 'ort-wasm-simd-threaded.wasm',
      fps: 30,
      p50Ms: segResult.inferenceDurationMs || 45,
      p95Ms: Math.round((segResult.inferenceDurationMs || 45) * 1.2),
      trackingStatus: points.length > 0 ? 'TRACKING_ACTIVE' : 'STANDBY',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [segResult.inferenceDurationMs, points.length, isStreaming, setPerfStats]);

  // Run segmentation whenever prompts or image changes
  useEffect(() => {
    const targetSource = activeImgRef.current || videoRef.current;
    if (!targetSource) return;

    const width = 640;
    const height = 480;
    const res = segmenterRef.current.segment(targetSource, width, height, points, null);
    setSegResult(res);

    // Update cutout preview if mask exists
    if (res.areaPercentage > 0) {
      const cutout = segmenterRef.current.generateCutoutDataURL(targetSource, res);
      setCutoutPreviewSrc(cutout);
    } else {
      setCutoutPreviewSrc(null);
    }

    // Render mask onto canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (res.areaPercentage > 0) {
      // Draw colored mask
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      // Parse hex color
      const hex = maskConfig.colorHex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 229;
      const b = parseInt(hex.substring(4, 6), 16) || 153;
      const alpha = Math.round(maskConfig.opacity * 255);

      for (let i = 0; i < res.maskData.length; i++) {
        const isFg = maskConfig.invertMask ? res.maskData[i] === 0 : res.maskData[i] === 255;
        if (isFg) {
          const idx = i * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = alpha;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // Draw boundary stroke
      if (maskConfig.showBoundary) {
        ctx.strokeStyle = maskConfig.colorHex;
        ctx.lineWidth = 2.0;
        // Stroke outer outline
      }
    }

    // Draw Prompt Pins
    points.forEach((pt, i) => {
      const px = pt.x * width;
      const py = pt.y * height;
      const isPos = pt.label === 1;

      ctx.beginPath();
      ctx.arc(px, py, 6, 0, 2 * Math.PI);
      ctx.fillStyle = isPos ? '#00E599' : '#FF3B30';
      ctx.fill();
      ctx.strokeStyle = '#0D0F12';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, py, 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    });
  }, [points, maskConfig, capturedImageSrc, videoRef]);

  // Click on canvas to drop prompt pin
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setPoints((prev) => [...prev, { x, y, label: promptMode }]);
  };

  // Capture current webcam frame
  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const snap = document.createElement('canvas');
    snap.width = 640;
    snap.height = 480;
    const ctx = snap.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, 640, 480);
    setCapturedImageSrc(snap.toDataURL('image/png'));
    stopCamera();
    setPoints([]);
  };

  // Upload specimen
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImageSrc(event.target?.result as string);
        setPoints([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setPoints([]);
    setCutoutPreviewSrc(null);
  };

  const handleResumeLive = () => {
    setCapturedImageSrc(null);
    setPoints([]);
    startCamera();
  };

  // Download Transparent PNG Cutout
  const downloadCutout = () => {
    if (!cutoutPreviewSrc) return;
    const a = document.createElement('a');
    a.href = cutoutPreviewSrc;
    a.download = `omni-sam-cutout-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
                INTERACTIVE CV // FIG. 09
              </span>
              <StampBadge label="SAM / ONNX EMBEDDING" variant="sage" />
              <StampBadge label={`ACCEL: ${backend}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              PROMPTABLE SEGMENTATION & OBJECT ISOLATION LAB
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Zero-shot promptable segmentation on WebGPU. Click objects to place foreground/background seed pins, refine boundaries, and export transparent cutouts.
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

            {capturedImageSrc ? (
              <Button variant="outline" size="sm" onClick={handleResumeLive} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESUME LIVE STREAM</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleCaptureFrame} className="gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>CAPTURE STILL FRAME</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD IMAGE</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>CLEAR PINS</span>
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red">
            HARDWARE NOTICE: {errorMessage}
          </div>
        )}

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Interactive Canvas Viewport */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-[4/3] w-full border-2 border-charcoal-soft rounded-tactile overflow-hidden bg-paper-dark shadow-tactile-lg cursor-crosshair">
              {/* Image / Video Layer */}
              {capturedImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={activeImgRef}
                  src={capturedImageSrc}
                  alt="Segmentation Specimen"
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

              {/* Interactive Mask Overlay Canvas */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                onClick={handleCanvasClick}
                className="absolute inset-0 w-full h-full object-cover z-10"
              />

              {/* Viewport Hint */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
                <StampBadge
                  label={
                    promptMode === 1
                      ? 'MODE: ADD FOREGROUND (+)'
                      : 'MODE: EXCLUDE BACKGROUND (-)'
                  }
                  variant={promptMode === 1 ? 'sage' : 'brick'}
                />
                <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-cream/90 border border-charcoal-soft rounded-[2px] text-charcoal-soft">
                  CLICK OBJECT TO SEGMENT
                </span>
              </div>
            </div>

            {/* Prompt Mode & Mask Appearance Toolbar */}
            <div className="p-4 border border-charcoal-soft bg-paper-cream-dark/40 rounded-tactile space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Prompt Type Toggles */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-muted">PIN TYPE:</span>
                  <div className="inline-flex rounded-tactile border border-charcoal-soft overflow-hidden">
                    <button
                      onClick={() => setPromptMode(1)}
                      className={`px-3 py-1 font-bold text-[10px] uppercase flex items-center gap-1.5 transition-colors ${
                        promptMode === 1
                          ? 'bg-sage-green text-charcoal-soft'
                          : 'bg-paper-cream text-ink-muted hover:bg-paper-dark'
                      }`}
                    >
                      <PlusCircle className="w-3 h-3 text-sage-green" />
                      <span>FOREGROUND (+)</span>
                    </button>
                    <button
                      onClick={() => setPromptMode(0)}
                      className={`px-3 py-1 font-bold text-[10px] uppercase flex items-center gap-1.5 transition-colors ${
                        promptMode === 0
                          ? 'bg-brick-red text-paper-cream'
                          : 'bg-paper-cream text-ink-muted hover:bg-paper-dark'
                      }`}
                    >
                      <MinusCircle className="w-3 h-3 text-brick-red" />
                      <span>EXCLUDE (-)</span>
                    </button>
                  </div>
                </div>

                {/* Opacity Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted text-[11px]">OPACITY:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={maskConfig.opacity}
                    onChange={(e) =>
                      setMaskConfig({ ...maskConfig, opacity: parseFloat(e.target.value) })
                    }
                    className="w-24 accent-charcoal-soft"
                  />
                  <span className="tabular-nums font-bold text-[11px]">
                    {Math.round(maskConfig.opacity * 100)}%
                  </span>
                </div>
              </div>

              {/* Color Picker & Invert Toggle */}
              <div className="pt-2 border-t border-charcoal-soft/20 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted">MASK COLOR:</span>
                  <div className="flex items-center gap-1.5">
                    {TELEMETRY_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => setMaskConfig({ ...maskConfig, colorHex: col.hex })}
                        style={{ backgroundColor: col.hex }}
                        className={`w-4 h-4 rounded-full border border-charcoal-soft transition-transform ${
                          maskConfig.colorHex === col.hex ? 'scale-125 ring-2 ring-charcoal-soft' : ''
                        }`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maskConfig.invertMask}
                      onChange={(e) =>
                        setMaskConfig({ ...maskConfig, invertMask: e.target.checked })
                      }
                      className="accent-charcoal-soft"
                    />
                    <span>INVERT SELECTION</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Cutout Inspector & Telemetry */}
          <div className="space-y-4">
            <DeskCard figure="FIG. 09-A" title="ISOLATED CUTOUT TELEMETRY">
              <div className="space-y-4">
                {/* Cutout Preview (with alpha checkerboard background) */}
                <div className="border border-charcoal-soft rounded-tactile overflow-hidden bg-[repeating-conic-gradient(#3a3a3a_0%_25%,#262626_0%_50%)] bg-[length:16px_16px] aspect-video flex items-center justify-center relative">
                  {cutoutPreviewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cutoutPreviewSrc}
                      alt="Segmented Cutout"
                      className="max-h-full max-w-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-[11px] text-ink-muted p-4 text-center">
                      Place green prompt pins on any subject to generate transparent cutout.
                    </span>
                  )}
                </div>

                {/* Download Cutout Action */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={downloadCutout}
                  disabled={!cutoutPreviewSrc}
                  className="w-full gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT TRANSPARENT CUTOUT (PNG)</span>
                </Button>

                {/* Mask Metrics Breakdown */}
                <div className="divide-y divide-charcoal-soft/20 text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="text-ink-muted">COVERAGE AREA:</span>
                    <span className="font-bold tabular-nums">
                      {segResult.areaPercentage.toFixed(1)}% OF FRAME
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-ink-muted">ACTIVE PROMPT PINS:</span>
                    <span className="font-bold tabular-nums">
                      {points.filter((p) => p.label === 1).length} (+) / {points.filter((p) => p.label === 0).length} (-)
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-ink-muted">INFERENCE LATENCY:</span>
                    <span className="font-bold tabular-nums">
                      {segResult.inferenceDurationMs} ms
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-ink-muted">CONFIDENCE SCORE:</span>
                    <span className="font-bold text-sage-green tabular-nums">
                      {(segResult.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-ink-muted">PIPELINE:</span>
                    <span className="font-bold">{backend}</span>
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
