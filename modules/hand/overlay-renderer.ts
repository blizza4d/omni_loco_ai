import { Landmark3D, HAND_CONNECTIONS, JOINT_NAMES } from './types';
import { ANALOG_TOKENS } from '@/core/rendering/analog-tokens';
import { mapNormalizedToCanvas } from '@/core/camera/coordinates';

export interface HandRenderOptions {
  showJointLabels?: boolean;
  showSkeleton?: boolean;
  showCursor?: boolean;
  showActiveRegion?: boolean;
  activeRegion?: { minX: number; maxX: number; minY: number; maxY: number };
  cursor?: { x: number; y: number; isPinching: boolean; dwellProgress: number };
  isMirrored?: boolean;
}

export function renderHandOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark3D[] | null,
  width: number,
  height: number,
  options: HandRenderOptions = {}
): void {
  const {
    showJointLabels = false,
    showSkeleton = true,
    showCursor = true,
    showActiveRegion = false,
    activeRegion = { minX: 0.15, maxX: 0.85, minY: 0.15, maxY: 0.85 },
    cursor,
    isMirrored = true,
  } = options;

  ctx.clearRect(0, 0, width, height);

  // 1. Draw Active Spatial Interaction Bounding Box (Technical Dashed Outline)
  if (showActiveRegion) {
    const rx = activeRegion.minX * width;
    const ry = activeRegion.minY * height;
    const rw = (activeRegion.maxX - activeRegion.minX) * width;
    const rh = (activeRegion.maxY - activeRegion.minY) * height;

    ctx.save();
    ctx.strokeStyle = ANALOG_TOKENS.colors.sageGreenTranslucent;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.font = `bold ${ANALOG_TOKENS.typography.microLabelSize} ${ANALOG_TOKENS.typography.fontFamily}`;
    ctx.fillStyle = ANALOG_TOKENS.colors.sageGreen;
    ctx.fillText('SPATIAL INTERACTION ACTIVE REGION', rx + 6, ry + 12);
    ctx.restore();
  }

  if (!landmarks || landmarks.length < 21) return;

  // 2. Draw Skeleton Connectors in Soft Charcoal
  if (showSkeleton) {
    ctx.save();
    ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
    ctx.lineWidth = ANALOG_TOKENS.geometry.standardLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (!p1 || !p2) continue;

      const pt1 = mapNormalizedToCanvas(p1.x, p1.y, width, height, isMirrored);
      const pt2 = mapNormalizedToCanvas(p2.x, p2.y, width, height, isMirrored);

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Draw Joints: Standard in Sage Green, Active Fingertips in Brick Red
  ctx.save();
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    if (!pt) continue;

    const { x, y } = mapNormalizedToCanvas(pt.x, pt.y, width, height, isMirrored);
    const isTip = [4, 8, 12, 16, 20].includes(i);
    const isIndexTip = i === 8;

    const radius = isTip
      ? ANALOG_TOKENS.geometry.activePointRadius
      : ANALOG_TOKENS.geometry.standardJointRadius;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = isIndexTip
      ? ANALOG_TOKENS.colors.brickRed
      : isTip
      ? ANALOG_TOKENS.colors.brickRed
      : ANALOG_TOKENS.colors.sageGreen;
    ctx.fill();

    ctx.lineWidth = 1.0;
    ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
    ctx.stroke();

    // Labeled joint index
    if (showJointLabels) {
      ctx.font = `bold 8px ${ANALOG_TOKENS.typography.fontFamily}`;
      ctx.fillStyle = ANALOG_TOKENS.colors.softCharcoal;
      ctx.fillText(JOINT_NAMES[i] || `${i}`, x + 7, y + 3);
    }
  }
  ctx.restore();

  // 4. Virtual Spatial Cursor with Charcoal Dwell Progress Arc
  if (showCursor && cursor) {
    const cx = cursor.x * width;
    const cy = cursor.y * height;

    ctx.save();
    // Outer Reticle
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
    ctx.strokeStyle = cursor.isPinching
      ? ANALOG_TOKENS.colors.brickRed
      : ANALOG_TOKENS.colors.softCharcoal;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center Crosshair
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = cursor.isPinching
      ? ANALOG_TOKENS.colors.brickRed
      : ANALOG_TOKENS.colors.sageGreen;
    ctx.fill();

    // Dwell Progress Arc (800ms dwell)
    if (cursor.dwellProgress > 0 && cursor.dwellProgress <= 1.0) {
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        14,
        -Math.PI / 2,
        -Math.PI / 2 + cursor.dwellProgress * 2 * Math.PI
      );
      ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (cursor.isPinching) {
      ctx.font = `bold 9px ${ANALOG_TOKENS.typography.fontFamily}`;
      ctx.fillStyle = ANALOG_TOKENS.colors.brickRed;
      ctx.fillText('PINCH', cx + 14, cy + 3);
    }
    ctx.restore();
  }
}
