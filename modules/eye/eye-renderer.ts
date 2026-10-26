import { Point3D, BilateralMetrics, EyeTrackingConfig } from './types';

// Facial landmark indices for eye contours & irises
// Anatomical Right Eye (OD - Oculus Dexter):
const RIGHT_EYE_CONTOUR = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const RIGHT_IRIS_RING = [468, 469, 470, 471, 472];

// Anatomical Left Eye (OS - Oculus Sinister):
const LEFT_EYE_CONTOUR = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
const LEFT_IRIS_RING = [473, 474, 475, 476, 477];

export class EyeRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    landmarks: Point3D[] | null,
    metrics: BilateralMetrics,
    pupilHistory: { time: number; left: number; right: number }[],
    config: EyeTrackingConfig
  ): void {
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 478) {
      return;
    }

    const isMirrored = config.isMirrored;
    const toScreenX = (normX: number) => (isMirrored ? (1 - normX) * width : normX * width);
    const toScreenY = (normY: number) => normY * height;

    // ─────────────────────────────────────────────────────────────
    // 1. RENDER ANATOMICAL RIGHT EYE (OD)
    // ─────────────────────────────────────────────────────────────
    const od = metrics.rightEye;
    if (od.state === 'OCCLUDED' || od.state === 'NOT_DETECTED') {
      this.drawOcclusionMarker(ctx, landmarks, RIGHT_EYE_CONTOUR, toScreenX, toScreenY, 'OD (RIGHT EYE): OCCLUDED');
    } else if (od.state === 'BLINKING') {
      this.drawContour(ctx, landmarks, RIGHT_EYE_CONTOUR, toScreenX, toScreenY, 'rgba(245, 158, 11, 0.7)', 1.5, true);
      this.drawStatusTag(ctx, landmarks, 33, 133, toScreenX, toScreenY, 'OD: CLOSED', '#F59E0B');
    } else {
      // Normal Tracking
      this.drawContour(ctx, landmarks, RIGHT_EYE_CONTOUR, toScreenX, toScreenY, 'rgba(6, 182, 212, 0.6)', 1.5);
      if (config.showIrisContours) {
        this.drawIris(
          ctx,
          landmarks,
          468,
          RIGHT_IRIS_RING,
          od.pupilDiameterMm,
          toScreenX,
          toScreenY,
          'OD (RIGHT)',
          isMirrored
        );
      }
      if (config.showGazeVectors && landmarks[468] && landmarks[33] && landmarks[133]) {
        this.drawGazeVector(
          ctx,
          landmarks[468],
          landmarks[33],
          landmarks[133],
          toScreenX,
          toScreenY
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. RENDER ANATOMICAL LEFT EYE (OS)
    // ─────────────────────────────────────────────────────────────
    const os = metrics.leftEye;
    if (os.state === 'OCCLUDED' || os.state === 'NOT_DETECTED') {
      this.drawOcclusionMarker(ctx, landmarks, LEFT_EYE_CONTOUR, toScreenX, toScreenY, 'OS (LEFT EYE): OCCLUDED');
    } else if (os.state === 'BLINKING') {
      this.drawContour(ctx, landmarks, LEFT_EYE_CONTOUR, toScreenX, toScreenY, 'rgba(245, 158, 11, 0.7)', 1.5, true);
      this.drawStatusTag(ctx, landmarks, 362, 263, toScreenX, toScreenY, 'OS: CLOSED', '#F59E0B');
    } else {
      // Normal Tracking
      this.drawContour(ctx, landmarks, LEFT_EYE_CONTOUR, toScreenX, toScreenY, 'rgba(6, 182, 212, 0.6)', 1.5);
      if (config.showIrisContours) {
        this.drawIris(
          ctx,
          landmarks,
          473,
          LEFT_IRIS_RING,
          os.pupilDiameterMm,
          toScreenX,
          toScreenY,
          'OS (LEFT)',
          isMirrored
        );
      }
      if (config.showGazeVectors && landmarks[473] && landmarks[362] && landmarks[263]) {
        this.drawGazeVector(
          ctx,
          landmarks[473],
          landmarks[362],
          landmarks[263],
          toScreenX,
          toScreenY
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. MANUAL RETICLE TARGET (If Active)
    // ─────────────────────────────────────────────────────────────
    if (config.aimMode === 'MANUAL_RETICLE' && config.manualTarget) {
      this.drawManualReticle(ctx, config.manualTarget.x, config.manualTarget.y);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ROLLING PUPILLOMETRY STRIP CHART
    // ─────────────────────────────────────────────────────────────
    if (config.showPupilWaveform && pupilHistory.length > 2) {
      this.drawWaveform(ctx, width, height, pupilHistory, metrics);
    }
  }

  private drawContour(
    ctx: CanvasRenderingContext2D,
    landmarks: Point3D[],
    indices: number[],
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number,
    color: string,
    lineWidth: number,
    dashed = false
  ) {
    ctx.save();
    ctx.beginPath();
    if (dashed) {
      ctx.setLineDash([3, 3]);
    }
    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const x = toScreenX(pt.x);
      const y = toScreenY(pt.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  private drawIris(
    ctx: CanvasRenderingContext2D,
    landmarks: Point3D[],
    centerIdx: number,
    contourIndices: number[],
    pupilDiameterMm: number,
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number,
    label: string,
    isMirrored: boolean
  ) {
    const center = landmarks[centerIdx];
    if (!center) return;
    const cx = toScreenX(center.x);
    const cy = toScreenY(center.y);

    // Outer Iris ring
    ctx.beginPath();
    contourIndices.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const x = toScreenX(pt.x);
      const y = toScreenY(pt.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#00E599'; // Telemetry neon green
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Inner Pupil Ellipse (scaled by pupilDiameterMm)
    const pupilRadiusPx = Math.max(2.5, (pupilDiameterMm / 11.7) * 11);
    ctx.beginPath();
    ctx.arc(cx, cy, pupilRadiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 229, 153, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#00E599';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Pupil center crosshair
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#FF3B30'; // Pit red center
    ctx.fill();

    // Micro Telemetry Tag
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00E599';
    const tag = `${label} ${pupilDiameterMm.toFixed(1)}mm`;
    const textWidth = ctx.measureText(tag).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(cx - textWidth / 2 - 4, cy - 26, textWidth + 8, 14);
    ctx.strokeStyle = '#00E599';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(cx - textWidth / 2 - 4, cy - 26, textWidth + 8, 14);
    ctx.fillStyle = '#00E599';
    ctx.fillText(tag, cx - textWidth / 2, cy - 15);
    ctx.restore();
  }

  private drawGazeVector(
    ctx: CanvasRenderingContext2D,
    iris: Point3D,
    cornerA: Point3D,
    cornerB: Point3D,
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number
  ) {
    const ix = toScreenX(iris.x);
    const iy = toScreenY(iris.y);
    const eyeMidX = toScreenX((cornerA.x + cornerB.x) / 2);
    const eyeMidY = toScreenY((cornerA.y + cornerB.y) / 2);

    // Vector from eyeball center to iris projected outward
    const vx = (ix - eyeMidX) * 4.5;
    const vy = (iy - eyeMidY) * 4.5;

    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ix + vx, iy + vy);
    ctx.strokeStyle = '#06B6D4'; // Electric cyan
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Raycast target point
    ctx.beginPath();
    ctx.arc(ix + vx, iy + vy, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#06B6D4';
    ctx.fill();
  }

  private drawOcclusionMarker(
    ctx: CanvasRenderingContext2D,
    landmarks: Point3D[],
    indices: number[],
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number,
    label: string
  ) {
    // Find centroid of available points or fallback
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const idx of indices) {
      const pt = landmarks[idx];
      if (pt) {
        sumX += toScreenX(pt.x);
        sumY += toScreenY(pt.y);
        count++;
      }
    }
    if (count === 0) return;

    const cx = sumX / count;
    const cy = sumY / count;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 59, 48, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(cx - 30, cy - 16, 60, 32);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#FF3B30';
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(cx - textWidth / 2 - 3, cy - 28, textWidth + 6, 12);
    ctx.fillStyle = '#FF3B30';
    ctx.fillText(label, cx - textWidth / 2, cy - 19);
    ctx.restore();
  }

  private drawStatusTag(
    ctx: CanvasRenderingContext2D,
    landmarks: Point3D[],
    idxA: number,
    idxB: number,
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number,
    label: string,
    color: string
  ) {
    const ptA = landmarks[idxA];
    const ptB = landmarks[idxB];
    if (!ptA || !ptB) return;
    const cx = (toScreenX(ptA.x) + toScreenX(ptB.x)) / 2;
    const cy = (toScreenY(ptA.y) + toScreenY(ptB.y)) / 2;

    ctx.save();
    ctx.font = '9px monospace';
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(cx - textWidth / 2 - 3, cy - 22, textWidth + 6, 13);
    ctx.fillStyle = color;
    ctx.fillText(label, cx - textWidth / 2, cy - 12);
    ctx.restore();
  }

  private drawManualReticle(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.strokeStyle = '#FF2A10';
    ctx.lineWidth = 1.5;

    // Crosshair lines
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x + 14, y);
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y + 14);
    ctx.stroke();

    // Reticle circle
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Micro corner ticks
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.setLineDash([3, 6]);
    ctx.stroke();

    // Reticle tag
    ctx.font = '9px monospace';
    ctx.fillStyle = '#FF2A10';
    ctx.fillText('MANUAL RETICLE AIM', x + 18, y - 4);
    ctx.restore();
  }

  private drawWaveform(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    history: { time: number; left: number; right: number }[],
    metrics: BilateralMetrics
  ) {
    const chartHeight = 72;
    const chartWidth = Math.min(width - 32, 420);
    const startX = 16;
    const startY = height - chartHeight - 16;

    // Card background
    ctx.fillStyle = 'rgba(13, 15, 18, 0.9)';
    ctx.strokeStyle = 'rgba(42, 48, 60, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(startX, startY, chartWidth, chartHeight, 4);
    ctx.fill();
    ctx.stroke();

    // Grid lines (2mm, 4mm, 6mm, 8mm)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let mm = 2; mm <= 8; mm += 2) {
      const y = startY + chartHeight - ((mm - 1.5) / 7.0) * (chartHeight - 16) - 8;
      ctx.beginPath();
      ctx.moveTo(startX + 8, y);
      ctx.lineTo(startX + chartWidth - 8, y);
      ctx.stroke();
    }

    // Chart label & Legend
    ctx.font = '9px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('BILATERAL PUPILLOMETRY STRIP (mm)', startX + 10, startY + 12);

    ctx.fillStyle = '#00E599';
    ctx.fillText(`OS(L): ${metrics.leftEye.pupilDiameterMm.toFixed(1)}mm`, startX + chartWidth - 140, startY + 12);
    ctx.fillStyle = '#06B6D4';
    ctx.fillText(`OD(R): ${metrics.rightEye.pupilDiameterMm.toFixed(1)}mm`, startX + chartWidth - 70, startY + 12);

    // Left Eye OS Waveform (Neon Green)
    if (metrics.leftEye.state === 'TRACKING') {
      ctx.beginPath();
      history.forEach((sample, i) => {
        const x = startX + 8 + (i / Math.max(1, history.length - 1)) * (chartWidth - 16);
        const y = startY + chartHeight - ((sample.left - 1.5) / 7.0) * (chartHeight - 20) - 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#00E599';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Right Eye OD Waveform (Cyan)
    if (metrics.rightEye.state === 'TRACKING') {
      ctx.beginPath();
      history.forEach((sample, i) => {
        const x = startX + 8 + (i / Math.max(1, history.length - 1)) * (chartWidth - 16);
        const y = startY + chartHeight - ((sample.right - 1.5) / 7.0) * (chartHeight - 20) - 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
}
