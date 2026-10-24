import { FaceLandmark, HeadPose, FaceMeshLayers, FACIAL_KEYPOINTS } from './types';
import { ANALOG_TOKENS } from '@/core/rendering/analog-tokens';
import { mapNormalizedToCanvas } from '@/core/camera/coordinates';

export interface FaceRenderOptions {
  layers: FaceMeshLayers;
  headPose?: HeadPose;
  isMirrored?: boolean;
}

export function renderFaceOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmark[] | null,
  width: number,
  height: number,
  options: FaceRenderOptions
): void {
  const { layers, headPose, isMirrored = true } = options;

  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length < 468) return;

  // 1. Tesselation Layer (Sage Green Mesh Wireframe)
  if (layers.tesselation) {
    ctx.save();
    ctx.strokeStyle = ANALOG_TOKENS.colors.sageGreenTranslucent;
    ctx.lineWidth = 0.75;

    ctx.beginPath();
    for (let i = 0; i < 400; i += 4) {
      const p1 = landmarks[i];
      const p2 = landmarks[i + 1];
      const p3 = landmarks[i + 2];
      if (p1 && p2 && p3) {
        const pt1 = mapNormalizedToCanvas(p1.x, p1.y, width, height, isMirrored);
        const pt2 = mapNormalizedToCanvas(p2.x, p2.y, width, height, isMirrored);
        const pt3 = mapNormalizedToCanvas(p3.x, p3.y, width, height, isMirrored);

        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.lineTo(pt3.x, pt3.y);
        ctx.closePath();
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // 2. Contours Layer (Oval)
  if (layers.contours) {
    ctx.save();
    ctx.strokeStyle = ANALOG_TOKENS.colors.sageGreen;
    ctx.lineWidth = ANALOG_TOKENS.geometry.connectorLineWidth;

    ctx.beginPath();
    for (let i = 0; i < 36; i++) {
      const idx = (i * 12) % 468;
      const pt = landmarks[idx];
      if (!pt) continue;
      const { x, y } = mapNormalizedToCanvas(pt.x, pt.y, width, height, isMirrored);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // 3. Eyes Layer (Soft Charcoal)
  if (layers.eyes) {
    ctx.save();
    ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
    ctx.lineWidth = 1.5;

    // Left Eye Loop
    ctx.beginPath();
    FACIAL_KEYPOINTS.leftEye.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const { x, y } = mapNormalizedToCanvas(pt.x, pt.y, width, height, isMirrored);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Right Eye Loop
    ctx.beginPath();
    FACIAL_KEYPOINTS.rightEye.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const { x, y } = mapNormalizedToCanvas(pt.x, pt.y, width, height, isMirrored);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // 4. Irises Layer: Sage ring with Brick Red pupil
  if (layers.irises) {
    ctx.save();
    const li = landmarks[468];
    if (li) {
      const { x, y } = mapNormalizedToCanvas(li.x, li.y, width, height, isMirrored);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.strokeStyle = ANALOG_TOKENS.colors.sageGreen;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = ANALOG_TOKENS.colors.brickRed;
      ctx.fill();
    }

    const ri = landmarks[473];
    if (ri) {
      const { x, y } = mapNormalizedToCanvas(ri.x, ri.y, width, height, isMirrored);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.strokeStyle = ANALOG_TOKENS.colors.sageGreen;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = ANALOG_TOKENS.colors.brickRed;
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Lips Layer (Soft Charcoal outline)
  if (layers.lips) {
    ctx.save();
    ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    FACIAL_KEYPOINTS.outerLips.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const { x, y } = mapNormalizedToCanvas(pt.x, pt.y, width, height, isMirrored);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // 6. 3D Head-Pose Gizmo (Projected from Nose Tip)
  if (layers.headPoseGizmo && headPose) {
    const nose = landmarks[FACIAL_KEYPOINTS.noseTip];
    if (nose) {
      const { x: nx, y: ny } = mapNormalizedToCanvas(nose.x, nose.y, width, height, isMirrored);
      const axisLen = 45;

      const yawRad = (headPose.yaw * Math.PI) / 180;
      const pitchRad = (headPose.pitch * Math.PI) / 180;
      const rollRad = (headPose.roll * Math.PI) / 180;

      ctx.save();
      ctx.lineWidth = 2.5;

      // Z-axis (Forward nose normal): Soft Charcoal
      const zx = nx + Math.sin(yawRad) * axisLen;
      const zy = ny - Math.sin(pitchRad) * axisLen;
      ctx.strokeStyle = ANALOG_TOKENS.colors.softCharcoal;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(zx, zy);
      ctx.stroke();

      // X-axis: Brick Red
      const xx = nx + Math.cos(rollRad) * (axisLen * 0.7);
      const xy = ny + Math.sin(rollRad) * (axisLen * 0.7);
      ctx.strokeStyle = ANALOG_TOKENS.colors.brickRed;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(xx, xy);
      ctx.stroke();

      // Y-axis: Sage Green
      const yx = nx - Math.sin(rollRad) * (axisLen * 0.7);
      const yy = ny - Math.cos(rollRad) * (axisLen * 0.7);
      ctx.strokeStyle = ANALOG_TOKENS.colors.sageGreen;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(yx, yy);
      ctx.stroke();

      ctx.restore();
    }
  }
}
