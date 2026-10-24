import { HAND_CONNECTIONS } from '../hand/types';
import { SingleHandFingerResult, FingerName } from './types';

export interface FingerRenderOptions {
  isMirrored?: boolean;
  showSkeleton?: boolean;
  showFingerLabels?: boolean;
  showHandBanner?: boolean;
}

export class FingerOverlayRenderer {
  renderHand(
    ctx: CanvasRenderingContext2D,
    result: SingleHandFingerResult,
    width: number,
    height: number,
    options: FingerRenderOptions = {}
  ): void {
    const {
      isMirrored = true,
      showSkeleton = true,
      showFingerLabels = true,
      showHandBanner = true,
    } = options;

    const landmarks = result.landmarks;
    if (!landmarks || landmarks.length < 21) return;

    ctx.save();

    // Map finger landmark indices
    const fingerTipIndices: Record<FingerName, number> = {
      thumb: 4,
      index: 8,
      middle: 12,
      ring: 16,
      pinky: 20,
    };

    const fingerJointChains: Record<FingerName, number[]> = {
      thumb: [1, 2, 3, 4],
      index: [5, 6, 7, 8],
      middle: [9, 10, 11, 12],
      ring: [13, 14, 15, 16],
      pinky: [17, 18, 19, 20],
    };

    // Helper to get screen coords
    const getX = (rawX: number) => (isMirrored ? (1.0 - rawX) * width : rawX * width);
    const getY = (rawY: number) => rawY * height;

    // 1. Draw Skeleton Bones
    if (showSkeleton) {
      // Draw palm base connections (wrist to MCPs)
      const palmPairs: [number, number][] = [
        [0, 1],
        [0, 5],
        [0, 9],
        [0, 13],
        [0, 17],
        [5, 9],
        [9, 13],
        [13, 17],
      ];

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const [i1, i2] of palmPairs) {
        const pt1 = landmarks[i1]!;
        const pt2 = landmarks[i2]!;
        ctx.beginPath();
        ctx.moveTo(getX(pt1.x), getY(pt1.y));
        ctx.lineTo(getX(pt2.x), getY(pt2.y));
        ctx.stroke();
      }

      // Draw each finger chain with color depending on whether it's open or folded
      for (const [fName, chain] of Object.entries(fingerJointChains) as [
        FingerName,
        number[]
      ][]) {
        const isOpen = result.fingers[fName]?.isOpen || false;
        ctx.strokeStyle = isOpen ? '#22C55E' : '#F59E0B';
        ctx.lineWidth = isOpen ? 3.5 : 2.0;

        for (let i = 0; i < chain.length - 1; i++) {
          const pt1 = landmarks[chain[i]!]!;
          const pt2 = landmarks[chain[i + 1]!]!;
          ctx.beginPath();
          ctx.moveTo(getX(pt1.x), getY(pt1.y));
          ctx.lineTo(getX(pt2.x), getY(pt2.y));
          ctx.stroke();
        }
      }
    }

    // 2. Draw Landmark Joint Nodes
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i]!;
      const sx = getX(pt.x);
      const sy = getY(pt.y);

      const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;

      if (!isTip) {
        // Intermediate knuckle node
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 3. Draw Large Fingertip Nodes & Status Badges
    for (const [fName, tipIdx] of Object.entries(fingerTipIndices) as [
      FingerName,
      number
    ][]) {
      const finger = result.fingers[fName];
      const pt = landmarks[tipIdx]!;
      const sx = getX(pt.x);
      const sy = getY(pt.y);

      const isOpen = finger?.isOpen || false;
      const themeColor = isOpen ? '#22C55E' : '#F59E0B';

      // Glowing tip circle
      ctx.fillStyle = themeColor;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, isOpen ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Floating Fingertip Label Pill
      if (showFingerLabels && finger) {
        const text = `${finger.label.toUpperCase()}: ${isOpen ? 'OPEN' : 'FOLDED'}`;
        ctx.font = 'bold 9px monospace';
        const textMetrics = ctx.measureText(text);
        const padX = 5;
        const padY = 3;
        const boxW = textMetrics.width + padX * 2;
        const boxH = 16;
        const boxX = sx - boxW / 2;
        const boxY = sy - 22;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = themeColor;
        ctx.fillText(text, boxX + padX, boxY + 11);
      }
    }

    // 4. Draw Hand Root Banner
    if (showHandBanner) {
      const wrist = landmarks[0]!;
      const wx = getX(wrist.x);
      const wy = getY(wrist.y);

      const bannerText = `${result.handedness.toUpperCase()}: ${result.stableCount} FINGER${
        result.stableCount === 1 ? '' : 'S'
      }`;
      ctx.font = 'bold 11px monospace';
      const bMetrics = ctx.measureText(bannerText);
      const bPadX = 8;
      const bPadY = 4;
      const bW = bMetrics.width + bPadX * 2;
      const bH = 22;
      const bX = wx - bW / 2;
      const bY = wy + 16;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#22C55E';
      ctx.fillText(bannerText, bX + bPadX, bY + 15);
    }

    ctx.restore();
  }
}
