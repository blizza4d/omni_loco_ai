import { DetectedObject, ObjectTrack, DetectionConfig } from './types';

export class ObjectOverlayRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    detections: DetectedObject[],
    tracks: ObjectTrack[],
    config: DetectionConfig
  ): void {
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Trajectory History Trails
    if (config.showTrajectories) {
      ctx.lineWidth = 1.5;
      for (const track of tracks) {
        if (track.history.length > 2) {
          ctx.beginPath();
          ctx.strokeStyle = track.color + '88';
          track.history.forEach((pt, i) => {
            const hx = pt.x * width;
            const hy = pt.y * height;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          });
          ctx.stroke();
        }
      }
    }

    // 2. Draw Bounding Boxes and Reticles
    for (const obj of detections) {
      const bx = obj.box.x * width;
      const by = obj.box.y * height;
      const bw = obj.box.width * width;
      const bh = obj.box.height * height;
      const col = obj.color;

      // Outer bounding box with tactical corner brackets
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.0;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner accent marks
      const cornerLen = Math.min(14, bw / 4);
      ctx.lineWidth = 3.0;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerLen);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + cornerLen, by);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + cornerLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(bx, by + bh - cornerLen);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + cornerLen, by + bh);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - cornerLen);
      ctx.stroke();

      // Semi-transparent box fill
      ctx.fillStyle = col + '18';
      ctx.fillRect(bx, by, bw, bh);

      // Label Header Stamp
      if (config.showLabels) {
        const trackTag = obj.trackId ? `#${obj.trackId} ` : '';
        const labelText = `${trackTag}${obj.label.toUpperCase()} ${(obj.confidence * 100).toFixed(0)}%`;

        ctx.font = 'bold 11px monospace';
        const textWidth = ctx.measureText(labelText).width;
        const tagHeight = 18;

        // Label background badge
        ctx.fillStyle = col;
        ctx.fillRect(bx, Math.max(0, by - tagHeight), textWidth + 8, tagHeight);

        // Label text (black for contrast against bright neon)
        ctx.fillStyle = '#0D0F12';
        ctx.fillText(labelText, bx + 4, Math.max(13, by - 4));
      }

      // Center crosshair
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx + 5, cy);
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx, cy + 5);
      ctx.stroke();
    }
  }
}
