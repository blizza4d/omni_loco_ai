import { PoseLandmark, JointAngles, POSE_CONNECTIONS } from './types';
import { ANALOG_TOKENS } from '@/core/rendering/analog-tokens';
import { mapNormalizedToCanvas } from '@/core/camera/coordinates';

export interface PoseRenderOptions {
  showAngles?: boolean;
  showGhostTarget?: boolean;
  activeFaults?: string[];
  isMirrored?: boolean;
}

export function renderPoseOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[] | null,
  angles: JointAngles,
  width: number,
  height: number,
  options: PoseRenderOptions = {}
): void {
  const { showAngles = true, showGhostTarget = false, activeFaults = [], isMirrored = true } = options;

  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length < 33) return;

  // 1. Ghost Target Pose Overlay (Dashed Plumb-Line)
  if (showGhostTarget) {
    ctx.save();
    ctx.strokeStyle = 'rgba(51, 51, 51, 0.35)'; // dashed soft charcoal
    ctx.lineWidth = 1.75;
    ctx.setLineDash([6, 6]);

    const centerX = width / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, height * 0.08);
    ctx.lineTo(centerX, height * 0.92);
    ctx.stroke();

    ctx.font = `bold ${ANALOG_TOKENS.typography.microLabelSize} ${ANALOG_TOKENS.typography.fontFamily}`;
    ctx.fillStyle = ANALOG_TOKENS.colors.inkMuted;
    ctx.fillText('TARGET PLUMB-LINE (IDEAL ALIGNMENT)', centerX + 8, height * 0.12);
    ctx.restore();
  }

  // 2. Draw Skeleton Connectors in Soft Charcoal
  ctx.save();
  ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
  ctx.lineWidth = ANALOG_TOKENS.geometry.standardLineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [sIdx, eIdx] of POSE_CONNECTIONS) {
    const p1 = landmarks[sIdx];
    const p2 = landmarks[eIdx];
    if (!p1 || !p2) continue;
    if ((p1.visibility && p1.visibility < 0.45) || (p2.visibility && p2.visibility < 0.45)) {
      continue;
    }

    const pt1 = mapNormalizedToCanvas(p1.x, p1.y, width, height, isMirrored);
    const pt2 = mapNormalizedToCanvas(p2.x, p2.y, width, height, isMirrored);

    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Draw Joints: Sage Green circles
  ctx.save();
  const trackedAngleJoints = [
    { idx: 13, angle: angles.leftElbow, label: 'L_ELBOW' },
    { idx: 14, angle: angles.rightElbow, label: 'R_ELBOW' },
    { idx: 11, angle: angles.leftShoulder, label: 'L_SHLDR' },
    { idx: 12, angle: angles.rightShoulder, label: 'R_SHLDR' },
    { idx: 23, angle: angles.leftHip, label: 'L_HIP' },
    { idx: 24, angle: angles.rightHip, label: 'R_HIP' },
    { idx: 25, angle: angles.leftKnee, label: 'L_KNEE' },
    { idx: 26, angle: angles.rightKnee, label: 'R_KNEE' },
  ];

  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    if (!pt || (pt.visibility && pt.visibility < 0.45)) continue;

    const { x, y } = mapNormalizedToCanvas(pt.x, pt.y, width, height, isMirrored);

    ctx.beginPath();
    ctx.arc(x, y, ANALOG_TOKENS.geometry.standardJointRadius, 0, 2 * Math.PI);
    ctx.fillStyle = ANALOG_TOKENS.colors.sageGreen;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
    ctx.stroke();
  }

  // Draw angle arcs and values
  if (showAngles) {
    ctx.font = `bold 10px ${ANALOG_TOKENS.typography.fontFamily}`;
    for (const joint of trackedAngleJoints) {
      const pt = landmarks[joint.idx];
      if (!pt || (pt.visibility && pt.visibility < 0.45)) continue;

      const { x, y } = mapNormalizedToCanvas(pt.x, pt.y, width, height, isMirrored);

      // Angle Arc
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, (joint.angle / 180) * Math.PI);
      ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Degree Badge
      ctx.fillStyle = ANALOG_TOKENS.colors.softCharcoal;
      ctx.fillText(`${joint.angle}°`, x + 14, y + 3);
    }
  }
  ctx.restore();

  // 4. Active Fault Warnings in Brick Red
  if (activeFaults.length > 0) {
    ctx.save();
    let bannerY = 24;
    for (const fault of activeFaults) {
      ctx.font = `bold 11px ${ANALOG_TOKENS.typography.fontFamily}`;
      const textWidth = ctx.measureText(fault).width;

      ctx.fillStyle = ANALOG_TOKENS.colors.brickRed;
      ctx.fillRect(width / 2 - textWidth / 2 - 8, bannerY - 14, textWidth + 16, 20);

      ctx.fillStyle = ANALOG_TOKENS.colors.paperCream;
      ctx.fillText(fault, width / 2 - textWidth / 2, bannerY);
      bannerY += 26;
    }
    ctx.restore();
  }
}
