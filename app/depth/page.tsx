'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { DeskCard } from '@/components/ui/DeskCard';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import { useCamera } from '@/core/camera/useCamera';
import { DepthEstimationEngine } from '@/modules/depth/estimator';
import {
  DepthPalette,
  DepthConfig,
  DepthProbePoint,
  DepthEstimationResult,
} from '@/modules/depth/types';
import { useSystemStore } from '@/core/store';
import {
  Layers,
  Upload,
  Download,
  Camera,
  RotateCcw,
  Sliders,
  Compass,
  Eye,
  Maximize2,
  Columns,
  SplitSquareVertical,
  Activity,
} from 'lucide-react';

const PALETTES: { id: DepthPalette; label: string; gradient: string }[] = [
  {
    id: 'VIRIDIS',
    label: 'Viridis',
    gradient: 'from-[#440154] via-[#21908d] to-[#fde725]',
  },
  {
    id: 'TURBO',
    label: 'Turbo Rainbow',
    gradient: 'from-[#30123b] via-[#28bbec] via-[#a2fc3c] to-[#7a0403]',
  },
  {
    id: 'INFERNO',
    label: 'Inferno',
    gradient: 'from-[#000004] via-[#bb3754] to-[#fcffa4]',
  },
  {
    id: 'GRAYSCALE',
    label: 'Grayscale (Lidar)',
    gradient: 'from-black to-white',
  },
];

export default function DepthEstimationPage() {
  const [backend, setBackend] = useState('INITIALIZING...');
  const [capturedImageSrc, setCapturedImageSrc] = useState<string | null>(null);
  const [scrubberPos, setScrubberPos] = useState<number>(50); // 0 to 100%
  const [isScrubbing, setIsScrubbing] = useState(false);

  const [config, setConfig] = useState<DepthConfig>({
    palette: 'VIRIDIS',
    nearClip: 0.05,
    farClip: 0.95,
    invertDepth: false,
    viewMode: 'SPLIT_SCRUBBER',
  });

  const [depthResult, setDepthResult] = useState<DepthEstimationResult>({
    width: 320,
    height: 240,
    depthBuffer: new Float32Array(320 * 240),
    minDepth: 0,
    maxDepth: 1,
    meanDepth: 0.5,
    inferenceDurationMs: 0,
  });

  const [activeProbe, setActiveProbe] = useState<DepthProbePoint>({
    x: 0.5,
    y: 0.5,
    depthRatio: 0.5,
    zone: 'MIDGROUND',
    normal: { nx: 0, ny: 0, nz: 1 },
  });

  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const depthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeImgRef = useRef<HTMLImageElement | null>(null);
  const hasEstimatedUploadedRef = useRef<boolean>(false);
  const cachedDepthResultRef = useRef<DepthEstimationResult | null>(null);
  const engineRef = useRef<DepthEstimationEngine>(new DepthEstimationEngine());
  const animationFrameRef = useRef<number | null>(null);

  const { videoRef, isStreaming, startCamera, stopCamera, errorMessage } = useCamera({ autoStart: true });

  // Initialize Depth Engine
  useEffect(() => {
    engineRef.current.init().then((b) => {
      setBackend(b);
    });
  }, []);

  const { setPerfStats } = useSystemStore();

  useEffect(() => {
    setPerfStats({
      activeModule: 'DEPTH ESTIMATION',
      activeModel: 'ort-wasm-simd-threaded.wasm',
      fps: 30,
      p50Ms: depthResult.inferenceDurationMs || 32,
      p95Ms: Math.round((depthResult.inferenceDurationMs || 32) * 1.3),
      trackingStatus: isStreaming ? 'TRACKING_ACTIVE' : 'STANDBY',
      streamStatus: isStreaming ? 'STREAMING' : 'STANDBY',
    });
  }, [depthResult.inferenceDurationMs, isStreaming, setPerfStats]);

  // Frame processing loop
  const processFrame = useCallback(() => {
    const targetSource = activeImgRef.current || videoRef.current;
    if (!targetSource) return;

    if (targetSource instanceof HTMLVideoElement) {
      if (targetSource.readyState < 2 || targetSource.videoWidth === 0) return;
    }

    const width = 320;
    const height = 240;
    const isStatic = !!activeImgRef.current;

    let res: DepthEstimationResult;
    if (isStatic && hasEstimatedUploadedRef.current && cachedDepthResultRef.current) {
      res = cachedDepthResultRef.current;
    } else {
      res = engineRef.current.estimate(targetSource, width, height);
      if (isStatic) {
        hasEstimatedUploadedRef.current = true;
        cachedDepthResultRef.current = res;
      }
      setDepthResult(res);
    }

    // Render raw depth map to hidden canvas
    const depthCanvas = depthCanvasRef.current;
    if (depthCanvas) {
      engineRef.current.renderDepthMapToCanvas(depthCanvas, res, config);
    }

    // Compose view onto display canvas
    const displayCanvas = displayCanvasRef.current;
    if (displayCanvas && depthCanvas) {
      const dCtx = displayCanvas.getContext('2d');
      if (dCtx) {
        if (displayCanvas.width !== 640 || displayCanvas.height !== 480) {
          displayCanvas.width = 640;
          displayCanvas.height = 480;
        }

        const cw = displayCanvas.width;
        const ch = displayCanvas.height;
        dCtx.clearRect(0, 0, cw, ch);

        if (config.viewMode === 'DEPTH_ONLY') {
          // Draw full depth canvas stretched to display
          dCtx.drawImage(depthCanvas, 0, 0, cw, ch);
        } else if (config.viewMode === 'SIDE_BY_SIDE') {
          // Left half RGB, Right half Depth
          const halfW = cw / 2;
          dCtx.drawImage(targetSource, 0, 0, halfW, ch);
          dCtx.drawImage(depthCanvas, halfW, 0, halfW, ch);

          // Divider
          dCtx.strokeStyle = '#22C55E';
          dCtx.lineWidth = 2;
          dCtx.beginPath();
          dCtx.moveTo(halfW, 0);
          dCtx.lineTo(halfW, ch);
          dCtx.stroke();
        } else {
          // SPLIT_SCRUBBER mode
          const splitX = Math.round((scrubberPos / 100) * cw);

          // 1. Draw entire RGB video first
          dCtx.drawImage(targetSource, 0, 0, cw, ch);

          // 2. Clip and draw depth map on the right side
          dCtx.save();
          dCtx.beginPath();
          dCtx.rect(splitX, 0, cw - splitX, ch);
          dCtx.clip();
          dCtx.drawImage(depthCanvas, 0, 0, cw, ch);
          dCtx.restore();

          // 3. Draw high-visibility tactical divider line
          dCtx.strokeStyle = '#22C55E';
          dCtx.lineWidth = 2;
          dCtx.beginPath();
          dCtx.moveTo(splitX, 0);
          dCtx.lineTo(splitX, ch);
          dCtx.stroke();

          // 4. Draw Scrubber Reticle Pill
          dCtx.fillStyle = '#1C2430';
          dCtx.strokeStyle = '#22C55E';
          dCtx.lineWidth = 2;
          dCtx.beginPath();
          dCtx.roundRect(splitX - 18, ch / 2 - 20, 36, 40, 6);
          dCtx.fill();
          dCtx.stroke();

          // Little scrubber grips
          dCtx.fillStyle = '#22C55E';
          dCtx.fillRect(splitX - 6, ch / 2 - 8, 3, 16);
          dCtx.fillRect(splitX + 3, ch / 2 - 8, 3, 16);
        }

        // Draw Probe reticle if active
        if (isHoveringCanvas) {
          const px = activeProbe.x * cw;
          const py = activeProbe.y * ch;

          dCtx.strokeStyle = '#22C55E';
          dCtx.lineWidth = 1.5;
          dCtx.beginPath();
          dCtx.arc(px, py, 14, 0, Math.PI * 2);
          dCtx.stroke();

          // Reticle crosshairs
          dCtx.beginPath();
          dCtx.moveTo(px - 20, py);
          dCtx.lineTo(px + 20, py);
          dCtx.moveTo(px, py - 20);
          dCtx.lineTo(px + 20, py);
          dCtx.stroke();

          // Surface normal vector arrow
          const nx = activeProbe.normal.nx;
          const ny = activeProbe.normal.ny;
          const arrowLen = 30;
          dCtx.strokeStyle = '#EF4444';
          dCtx.lineWidth = 2;
          dCtx.beginPath();
          dCtx.moveTo(px, py);
          dCtx.lineTo(px + nx * arrowLen, py + ny * arrowLen);
          dCtx.stroke();

          // Label
          dCtx.font = '10px monospace';
          dCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          dCtx.fillRect(px + 18, py - 24, 110, 42);
          dCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          dCtx.strokeRect(px + 18, py - 24, 110, 42);

          dCtx.fillStyle = '#22C55E';
          dCtx.fillText(`Z: ${(activeProbe.depthRatio * 100).toFixed(0)}% (${activeProbe.zone[0]})`, px + 24, py - 10);
          dCtx.fillStyle = '#94A3B8';
          dCtx.fillText(`N: [${nx}, ${ny}]`, px + 24, py + 6);
        }
      }
    }
  }, [config, scrubberPos, isHoveringCanvas, activeProbe]);

  // Real-time animation loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      processFrame();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [processFrame]);

  // Handle Canvas Mouse Move for Probe and Scrubber Drag
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const normX = x / rect.width;
    const normY = y / rect.height;

    if (isScrubbing && config.viewMode === 'SPLIT_SCRUBBER') {
      setScrubberPos(Math.round(normX * 100));
    }

    if (depthResult.depthBuffer.length > 0) {
      const probe = engineRef.current.probePoint(depthResult, normX, normY);
      setActiveProbe(probe);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (config.viewMode === 'SPLIT_SCRUBBER') {
      setIsScrubbing(true);
      const canvas = displayCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width;
        setScrubberPos(Math.round(Math.max(0, Math.min(100, normX * 100))));
      }
    }
  };

  const handleMouseUp = () => {
    setIsScrubbing(false);
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    hasEstimatedUploadedRef.current = false;
    cachedDepthResultRef.current = null;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        activeImgRef.current = img;
        setCapturedImageSrc(event.target?.result as string);
        stopCamera();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Reset to live camera
  const handleSwitchToCamera = () => {
    activeImgRef.current = null;
    hasEstimatedUploadedRef.current = false;
    cachedDepthResultRef.current = null;
    setCapturedImageSrc(null);
    startCamera();
  };

  // Export Depth Map PNG
  const handleExportDepthMap = () => {
    const depthCanvas = depthCanvasRef.current;
    if (!depthCanvas) return;

    const link = document.createElement('a');
    link.download = `omni-depth-map-${config.palette.toLowerCase()}-${Date.now()}.png`;
    link.href = depthCanvas.toDataURL('image/png');
    link.click();
  };

  // Export Depth JSON
  const handleExportJSON = () => {
    const step = 4;
    const downW = Math.floor(depthResult.width / step);
    const downH = Math.floor(depthResult.height / step);
    const matrix: number[][] = [];

    for (let y = 0; y < downH; y++) {
      const row: number[] = [];
      for (let x = 0; x < downW; x++) {
        const origIdx = (y * step) * depthResult.width + (x * step);
        row.push(Math.round((depthResult.depthBuffer[origIdx] || 0) * 1000) / 1000);
      }
      matrix.push(row);
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      dimensions: { width: downW, height: downH },
      summary: {
        minDepth: depthResult.minDepth,
        maxDepth: depthResult.maxDepth,
        meanDepth: depthResult.meanDepth,
        latencyMs: depthResult.inferenceDurationMs,
      },
      depthMatrix: matrix,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `omni-depth-matrix-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="min-h-screen flex flex-col font-mono bg-paper-cream text-charcoal-soft select-none"
      onMouseUp={handleMouseUp}
    >
      <GlobalNav />
      <PerformanceHUD />

      {/* Hidden processing elements */}
      <canvas ref={depthCanvasRef} className="hidden" />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Module Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                SCENE GEOMETRY // FIG. 11
              </span>
              <StampBadge label="ONNX / WEBGPU ACCELERATED" variant="sage" />
              <StampBadge label={`BACKEND: ${backend}`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase">
              Monocular Depth Estimation & Scene Geometry
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1 leading-relaxed">
              Real-time dense relative depth estimation, interactive split-screen scrubbing, spectral colormaps & 3D surface normal vector probing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StampBadge label="100% ON-DEVICE" variant="sage" />
          </div>
        </div>

        {/* Main Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center Viewport Canvas (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <DeskCard figure="FIG. 11-A" title="SPATIAL GEOMETRY VIEWPORT" subtitle="INTERACTIVE SCRUBBER">
              <div
                ref={containerRef}
                className="relative aspect-[4/3] w-full bg-[#05070A] rounded-tactile border-2 border-charcoal-soft overflow-hidden flex items-center justify-center cursor-crosshair shadow-tactile"
              >
                <canvas
                  ref={displayCanvasRef}
                  width={640}
                  height={480}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={() => setIsHoveringCanvas(true)}
                  onMouseLeave={() => {
                    setIsHoveringCanvas(false);
                    setIsScrubbing(false);
                  }}
                  className="w-full h-full object-contain"
                />

                {/* Tactical Corner HUD Overlays */}
                <div className="absolute top-3 left-3 bg-paper-dark/90 backdrop-blur border border-charcoal-soft px-2.5 py-1 rounded-[2px] text-xs font-mono text-charcoal-soft flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-sage-green animate-pulse" />
                  <span>LATENCY: {depthResult.inferenceDurationMs}ms</span>
                </div>

                <div className="absolute top-3 right-3 bg-paper-dark/90 backdrop-blur border border-charcoal-soft px-2.5 py-1 rounded-[2px] text-xs font-mono text-ink-muted flex items-center gap-2">
                  <span>VIEW: {config.viewMode.replace('_', ' ')}</span>
                  <span className="font-bold text-charcoal-soft">|</span>
                  <span className="text-charcoal-soft font-bold">{config.palette}</span>
                </div>

                {/* Helper hint */}
                <div className="absolute bottom-3 left-3 bg-paper-dark/90 backdrop-blur border border-charcoal-soft px-2.5 py-1 rounded-[2px] text-[10px] font-mono text-ink-muted">
                  {config.viewMode === 'SPLIT_SCRUBBER'
                    ? 'Drag divider to scrub original RGB vs Depth Map'
                    : 'Hover cursor to probe 3D surface normal vector'}
                </div>
              </div>

              {/* View Mode Switcher Toolbar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-charcoal-soft/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-ink-muted uppercase tracking-wider">
                    View Mode:
                  </span>
                  <div className="inline-flex rounded-tactile border border-charcoal-soft p-1 bg-paper-cream-dark">
                    <button
                      onClick={() => setConfig((c) => ({ ...c, viewMode: 'SPLIT_SCRUBBER' }))}
                      className={`px-3 py-1 rounded-[2px] text-xs font-mono flex items-center gap-1.5 transition-colors ${
                        config.viewMode === 'SPLIT_SCRUBBER'
                          ? 'bg-charcoal-soft text-paper-cream font-bold'
                          : 'text-ink-muted hover:text-charcoal-soft'
                      }`}
                    >
                      <SplitSquareVertical className="w-3.5 h-3.5" />
                      Split Scrubber
                    </button>
                    <button
                      onClick={() => setConfig((c) => ({ ...c, viewMode: 'SIDE_BY_SIDE' }))}
                      className={`px-3 py-1 rounded-[2px] text-xs font-mono flex items-center gap-1.5 transition-colors ${
                        config.viewMode === 'SIDE_BY_SIDE'
                          ? 'bg-charcoal-soft text-paper-cream font-bold'
                          : 'text-ink-muted hover:text-charcoal-soft'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      Side by Side
                    </button>
                    <button
                      onClick={() => setConfig((c) => ({ ...c, viewMode: 'DEPTH_ONLY' }))}
                      className={`px-3 py-1 rounded-[2px] text-xs font-mono flex items-center gap-1.5 transition-colors ${
                        config.viewMode === 'DEPTH_ONLY'
                          ? 'bg-charcoal-soft text-paper-cream font-bold'
                          : 'text-ink-muted hover:text-charcoal-soft'
                      }`}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Depth Only
                    </button>
                  </div>
                </div>

                {/* Scrubber Range Slider (in split mode) */}
                {config.viewMode === 'SPLIT_SCRUBBER' && (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-mono text-ink-muted">Scrubber:</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={scrubberPos}
                      onChange={(e) => setScrubberPos(Number(e.target.value))}
                      className="w-32 accent-charcoal-soft"
                    />
                    <span className="text-xs font-mono text-charcoal-soft font-bold w-8">{scrubberPos}%</span>
                  </div>
                )}
              </div>
            </DeskCard>

            {/* Input Source & Export Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-paper-dark border-2 border-charcoal-soft p-4 rounded-tactile shadow-tactile">
              <div className="flex items-center gap-2">
                <Button
                  variant={capturedImageSrc ? 'outline' : 'default'}
                  size="sm"
                  onClick={handleSwitchToCamera}
                >
                  <Camera className="w-4 h-4 mr-1.5 text-sage-green" />
                  Live Video
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant={capturedImageSrc ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload Image
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportDepthMap}>
                  <Download className="w-4 h-4 mr-1.5 text-sage-green" />
                  Export PNG
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Export JSON
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Palette, Calibration & Surface Normal Inspector (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Color Map Palette Selector */}
            <DeskCard figure="FIG. 11-B" title="DEPTH COLORMAPS" subtitle="SPECTRAL ENCODING">
              <div className="space-y-2">
                {PALETTES.map((p) => {
                  const isSelected = config.palette === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setConfig((c) => ({ ...c, palette: p.id }))}
                      className={`w-full flex items-center justify-between p-2.5 rounded-[2px] border transition-all text-left ${
                        isSelected
                          ? 'border-charcoal-soft bg-paper-dark font-bold shadow-tactile-sm'
                          : 'border-charcoal-soft/40 bg-paper-cream hover:border-charcoal-soft'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-5 rounded-[2px] bg-gradient-to-r ${p.gradient} border border-charcoal-soft/60`}
                        />
                        <span className="text-xs font-mono text-charcoal-soft font-medium">
                          {p.label}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold text-sage-green px-2 py-0.5 rounded-[2px] bg-sage-green/10 border border-sage-green">
                          ACTIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </DeskCard>

            {/* Depth Clipping Calibration */}
            <DeskCard figure="FIG. 11-C" title="RANGE CALIBRATION" subtitle="NEAR / FAR CLIP">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono text-ink-muted mb-1">
                    <span>Near Clip Limit:</span>
                    <span className="text-charcoal-soft font-bold">{config.nearClip.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={0.45}
                    step={0.01}
                    value={config.nearClip}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, nearClip: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-charcoal-soft"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-ink-muted mb-1">
                    <span>Far Clip Limit:</span>
                    <span className="text-charcoal-soft font-bold">{config.farClip.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.55}
                    max={1.0}
                    step={0.01}
                    value={config.farClip}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, farClip: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-charcoal-soft"
                  />
                </div>

                <div className="pt-2 border-t border-charcoal-soft/20 flex items-center justify-between">
                  <span className="text-xs font-mono text-ink-muted">Invert Depth Map:</span>
                  <button
                    onClick={() => setConfig((c) => ({ ...c, invertDepth: !c.invertDepth }))}
                    className={`px-3 py-1 rounded-[2px] text-xs font-mono font-semibold transition-colors ${
                      config.invertDepth
                        ? 'bg-charcoal-soft text-paper-cream'
                        : 'bg-paper-dark border border-charcoal-soft text-charcoal-soft hover:bg-paper-cream'
                    }`}
                  >
                    {config.invertDepth ? 'INVERTED' : 'STANDARD'}
                  </button>
                </div>
              </div>
            </DeskCard>

            {/* 3D Surface Normal Probe Telemetry */}
            <DeskCard figure="FIG. 11-D" title="3D SURFACE NORMAL PROBE" subtitle="RETICLE TELEMETRY">
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-paper-dark rounded-[2px] border border-charcoal-soft space-y-2">
                  <div className="flex justify-between items-center text-ink-muted">
                    <span>Normalized Coords:</span>
                    <span className="text-charcoal-soft font-bold">
                      [{activeProbe.x.toFixed(2)}, {activeProbe.y.toFixed(2)}]
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-ink-muted">
                    <span>Depth Ratio (Z):</span>
                    <span className="text-sage-green font-bold">
                      {(activeProbe.depthRatio * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-ink-muted">
                    <span>Distance Tier:</span>
                    <span
                      className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold border ${
                        activeProbe.zone === 'FOREGROUND'
                          ? 'border-sage-green text-charcoal-soft bg-sage-green/20'
                          : activeProbe.zone === 'MIDGROUND'
                          ? 'border-charcoal-soft text-charcoal-soft bg-paper-cream'
                          : 'border-ink-muted text-ink-muted bg-paper-dark'
                      }`}
                    >
                      {activeProbe.zone}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-charcoal-soft/20 space-y-1">
                    <span className="text-ink-muted text-[11px] block">
                      Surface Normal Vector [Nx, Ny, Nz]:
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-1 bg-paper-cream rounded-[2px] border border-charcoal-soft">
                        <span className="text-[10px] text-ink-muted">Nx</span>
                        <p className="text-charcoal-soft font-bold">{activeProbe.normal.nx}</p>
                      </div>
                      <div className="p-1 bg-paper-cream rounded-[2px] border border-charcoal-soft">
                        <span className="text-[10px] text-ink-muted">Ny</span>
                        <p className="text-charcoal-soft font-bold">{activeProbe.normal.ny}</p>
                      </div>
                      <div className="p-1 bg-paper-cream rounded-[2px] border border-charcoal-soft">
                        <span className="text-[10px] text-ink-muted">Nz</span>
                        <p className="text-charcoal-soft font-bold">{activeProbe.normal.nz}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Depth Map Global Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-paper-dark rounded-[2px] border border-charcoal-soft">
                    <span className="text-[10px] text-ink-muted">Min Depth</span>
                    <p className="text-charcoal-soft font-bold">{depthResult.minDepth}</p>
                  </div>
                  <div className="p-2 bg-paper-dark rounded-[2px] border border-charcoal-soft">
                    <span className="text-[10px] text-ink-muted">Mean Depth</span>
                    <p className="text-sage-green font-bold">{depthResult.meanDepth}</p>
                  </div>
                  <div className="p-2 bg-paper-dark rounded-[2px] border border-charcoal-soft">
                    <span className="text-[10px] text-ink-muted">Max Depth</span>
                    <p className="text-charcoal-soft font-bold">{depthResult.maxDepth}</p>
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
