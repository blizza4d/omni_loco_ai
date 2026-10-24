import { Fixation, AreaOfInterest } from './types';

export interface HeatmapConfig {
  radius: number;       // pixels (default 45)
  opacity: number;      // 0.1 to 1.0 (default 0.7)
  decay: boolean;       // fade over time or cumulative
  showScanPath: boolean;// draw numbered fixation circles
  showAOIs: boolean;
}

export class HeatmapRenderer {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  init(width: number, height: number): void {
    if (typeof document === 'undefined') return;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  addGazeDwell(x: number, y: number, intensity = 1.0, config: HeatmapConfig): void {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;
    const ctx = this.offscreenCtx;

    // Optional decay
    if (config.decay) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Gaussian radial gradient spot
    const r = config.radius;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(181, 68, 58, ${0.18 * intensity})`); // brick red hot core
    grad.addColorStop(0.5, `rgba(143, 169, 138, ${0.12 * intensity})`); // sage green mid
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
  }

  renderTo(
    targetCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    fixations: Fixation[],
    aois: AreaOfInterest[],
    config: HeatmapConfig
  ): void {
    targetCtx.clearRect(0, 0, width, height);

    // 1. Draw Accumulated Heatmap from offscreen canvas
    if (this.offscreenCanvas) {
      targetCtx.save();
      targetCtx.globalAlpha = config.opacity;
      targetCtx.drawImage(this.offscreenCanvas, 0, 0, width, height);
      targetCtx.restore();
    }

    // 2. Draw Scan-Path Overlay (Numbered fixation circles and saccade paths)
    if (config.showScanPath && fixations.length > 0) {
      targetCtx.save();
      targetCtx.strokeStyle = 'rgba(58, 58, 58, 0.6)';
      targetCtx.lineWidth = 1.5;
      targetCtx.setLineDash([3, 3]);

      // Connect fixations sequentially
      targetCtx.beginPath();
      for (let i = 0; i < fixations.length; i++) {
        const f = fixations[i]!;
        if (i === 0) targetCtx.moveTo(f.x, f.y);
        else targetCtx.lineTo(f.x, f.y);
      }
      targetCtx.stroke();
      targetCtx.setLineDash([]);

      // Draw numbered circles
      for (const f of fixations) {
        // Radius scales with duration (12px to 28px)
        const radius = Math.min(28, Math.max(12, 12 + (f.durationMs / 400) * 16));

        targetCtx.beginPath();
        targetCtx.arc(f.x, f.y, radius, 0, 2 * Math.PI);
        targetCtx.fillStyle = 'rgba(244, 238, 220, 0.9)'; // paper cream
        targetCtx.fill();
        targetCtx.lineWidth = 2;
        targetCtx.strokeStyle = '#3A3A3A';
        targetCtx.stroke();

        // Fixation order number
        targetCtx.font = 'bold 10px "Courier Prime", monospace';
        targetCtx.fillStyle = '#3A3A3A';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(`${f.id}`, f.x, f.y);
      }
      targetCtx.restore();
    }

    // 3. Draw Areas of Interest (AOIs)
    if (config.showAOIs) {
      targetCtx.save();
      for (const aoi of aois) {
        const ax = aoi.x * width;
        const ay = aoi.y * height;
        const aw = aoi.width * width;
        const ah = aoi.height * height;

        targetCtx.strokeStyle = '#B5443A'; // brick red
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(ax, ay, aw, ah);

        targetCtx.fillStyle = 'rgba(181, 68, 58, 0.08)';
        targetCtx.fillRect(ax, ay, aw, ah);

        // Stamped AOI Label badge
        targetCtx.font = 'bold 9px "Courier Prime", monospace';
        targetCtx.fillStyle = '#3A3A3A';
        const label = `${aoi.name} [TTFF: ${
          aoi.timeToFirstFixationMs !== null ? `${aoi.timeToFirstFixationMs}ms` : '--'
        } | DWELL: ${(aoi.totalDwellMs / 1000).toFixed(1)}s]`;
        targetCtx.fillText(label, ax + 4, ay - 4);
      }
      targetCtx.restore();
    }
  }

  clear(): void {
    if (this.offscreenCtx && this.offscreenCanvas) {
      this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    }
  }
}
