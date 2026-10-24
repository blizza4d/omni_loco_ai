import { Point3D, PupilMetrics, EyeTrackingConfig } from './types';

// Facial landmark indices for eye contours
const LEFT_EYE_CONTOUR = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const RIGHT_EYE_CONTOUR = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
const LEFT_IRIS_RING = [468, 469, 470, 471, 472];
const RIGHT_IRIS_RING = [473, 474, 475, 476, 477];

export class EyeRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    landmarks: Point3D[] | null,
    metrics: PupilMetrics,
    pupilHistory: { time: number; left: number; right: number }[],
    config: EyeTrackingConfig
  ): void {
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 478) {
      return;
    }

    // 1. Draw Eye Contours
    this.drawContour(ctx, landmarks, LEFT_EYE_CONTOUR, width, height, 'rgba(6, 182, 212, 0.4)', 1.5);
    this.drawContour(ctx, landmarks, RIGHT_EYE_CONTOUR, width, height, 'rgba(6, 182, 212, 0.4)', 1.5);

    // 2. Draw Iris Contours & Pupil Centers
    if (config.showIrisContours) {
      this.drawIris(ctx, landmarks, 468, [469, 470, 471, 472], metrics.leftPupilDiameterMm, width, height, 'LEFT');
      this.drawIris(ctx, landmarks, 473, [474, 475, 476, 477], metrics.rightPupilDiameterMm, width, height, 'RIGHT');
    }

    // 3. Draw 3D Gaze Vectors
    if (config.showGazeVectors) {
      this.drawGazeVector(ctx, landmarks[468]!, landmarks[133]!, landmarks[33]!, width, height);
      this.drawGazeVector(ctx, landmarks[473]!, landmarks[263]!, landmarks[362]!, width, height);
    }

    // 4. Draw Rolling Pupillometry Strip Chart
    if (config.showPupilWaveform && pupilHistory.length > 2) {
      this.drawWaveform(ctx, width, height, pupilHistory, metrics);
    }
  }

  private drawContour(
    ctx: CanvasRenderingContext2D,
    landmarks: Point3D[],
    indices: number[],
    width: number,
    height: number,
    color: string,
    lineWidth: number
  ) {
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const x = pt.x * width;
      const y = pt.y * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  private drawIris(
    ctx: CanvasRenderingContext2D,
    landmarks: Point3D[],
    centerIdx: number,
    contourIndices: number[],
    pupilDiameterMm: number,
    width: number,
    height: number,
    label: string
  ) {
    const center = landmarks[centerIdx];
    if (!center) return;
    const cx = center.x * width;
    const cy = center.y * height;

    // Outer Iris ring
    ctx.beginPath();
    contourIndices.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const x = pt.x * width;
      const y = pt.y * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#00E599'; // Telemetry neon green
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Inner Pupil Ellipse (scaled by pupilDiameterMm)
    const pupilRadiusPx = Math.max(2, (pupilDiameterMm / 11.7) * 12);
    ctx.beginPath();
    ctx.arc(cx, cy, pupilRadiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 229, 153, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#00E599';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pupil center crosshair
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#FF3B30'; // Pit red center
    ctx.fill();

    // Micro Telemetry Tag
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00E599';
    ctx.fillText(`${label} ${pupilDiameterMm.toFixed(1)}mm`, cx - 22, cy - 16);
  }

  private drawGazeVector(
    ctx: CanvasRenderingContext2D,
    iris: Point3D,
    cornerA: Point3D,
    cornerB: Point3D,
    width: number,
    height: number
  ) {
    const ix = iris.x * width;
    const iy = iris.y * height;
    const eyeMidX = ((cornerA.x + cornerB.x) / 2) * width;
    const eyeMidY = ((cornerA.y + cornerB.y) / 2) * height;

    // Vector from eyeball center to iris
    const vx = (ix - eyeMidX) * 4.5;
    const vy = (iy - eyeMidY) * 4.5;

    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ix + vx, iy + vy);
    ctx.strokeStyle = '#06B6D4'; // Electric cyan
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Raycast target point
    ctx.beginPath();
    ctx.arc(ix + vx, iy + vy, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#06B6D4';
    ctx.fill();
  }

  private drawWaveform(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    history: { time: number; left: number; right: number }[],
    metrics: PupilMetrics
  ) {
    const chartHeight = 72;
    const chartWidth = Math.min(width - 32, 420);
    const startX = 16;
    const startY = height - chartHeight - 16;

    // Card background
    ctx.fillStyle = 'rgba(13, 15, 18, 0.88)';
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

    // Chart label
    ctx.font = '9px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('PUPILLARY DILATION WAVEFORM (mm)', startX + 10, startY + 12);
    ctx.fillText(`${metrics.meanPupilDiameterMm.toFixed(2)} mm`, startX + chartWidth - 55, startY + 12);

    // Left Eye Waveform (Neon Green)
    ctx.beginPath();
    history.forEach((sample, i) => {
      const x = startX + 8 + (i / (history.length - 1)) * (chartWidth - 16);
      const y = startY + chartHeight - ((sample.left - 1.5) / 7.0) * (chartHeight - 20) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00E599';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Right Eye Waveform (Cyan)
    ctx.beginPath();
    history.forEach((sample, i) => {
      const x = startX + 8 + (i / (history.length - 1)) * (chartWidth - 16);
      const y = startY + chartHeight - ((sample.right - 1.5) / 7.0) * (chartHeight - 20) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}
