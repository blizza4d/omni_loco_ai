/**
 * Coordinate System & Geometric Transformation Engine
 * Ensures sub-pixel alignment between video elements, canvas overlays, and model landmarks.
 */

export interface VideoViewportTransform {
  videoWidth: number;
  videoHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  isMirrored: boolean;
}

export interface ObjectFitBounds {
  renderX: number;
  renderY: number;
  renderWidth: number;
  renderHeight: number;
  scaleX: number;
  scaleY: number;
  cropOffsetX: number;
  cropOffsetY: number;
}

/**
 * Resizes the canvas backing buffer to match the video's intrinsic resolution.
 * Prevents letterboxing mismatch and coordinate drift.
 */
export function syncCanvasToVideo(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement | null
): boolean {
  if (!canvas || !video) return false;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (vw > 0 && vh > 0) {
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
      return true;
    }
  } else {
    // Default fallback if metadata is still loading
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 640;
      canvas.height = 480;
      return true;
    }
  }

  return false;
}

/**
 * Calculates displayed layout bounds accounting for CSS object-fit ('cover' or 'contain')
 */
export function computeObjectFitBounds(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
  fit: 'cover' | 'contain' = 'cover'
): ObjectFitBounds {
  if (videoWidth <= 0 || videoHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return {
      renderX: 0,
      renderY: 0,
      renderWidth: containerWidth,
      renderHeight: containerHeight,
      scaleX: 1,
      scaleY: 1,
      cropOffsetX: 0,
      cropOffsetY: 0,
    };
  }

  const containerAspect = containerWidth / containerHeight;
  const videoAspect = videoWidth / videoHeight;

  let renderWidth = containerWidth;
  let renderHeight = containerHeight;
  let renderX = 0;
  let renderY = 0;

  if (fit === 'cover') {
    if (containerAspect > videoAspect) {
      // Container is wider than video: video scales to container width, overflows top/bottom
      renderHeight = containerWidth / videoAspect;
      renderY = (containerHeight - renderHeight) / 2;
    } else {
      // Container is taller than video: video scales to container height, overflows left/right
      renderWidth = containerHeight * videoAspect;
      renderX = (containerWidth - renderWidth) / 2;
    }
  } else {
    // 'contain'
    if (containerAspect > videoAspect) {
      renderWidth = containerHeight * videoAspect;
      renderX = (containerWidth - renderWidth) / 2;
    } else {
      renderHeight = containerWidth / videoAspect;
      renderY = (containerHeight - renderHeight) / 2;
    }
  }

  const cropOffsetX = Math.max(0, -renderX);
  const cropOffsetY = Math.max(0, -renderY);

  return {
    renderX,
    renderY,
    renderWidth,
    renderHeight,
    scaleX: renderWidth / videoWidth,
    scaleY: renderHeight / videoHeight,
    cropOffsetX,
    cropOffsetY,
  };
}

/**
 * Converts normalized (0.0 to 1.0) landmark coordinates to exact canvas pixel coordinates.
 */
export function mapNormalizedToCanvas(
  normX: number,
  normY: number,
  canvasWidth: number,
  canvasHeight: number,
  isMirrored: boolean
): { x: number; y: number } {
  const x = isMirrored ? (1.0 - normX) * canvasWidth : normX * canvasWidth;
  const y = normY * canvasHeight;
  return { x, y };
}

/**
 * Maps normalized coordinates into container display pixels accounting for object-fit & mirroring
 */
export function mapNormalizedToDisplay(
  normX: number,
  normY: number,
  bounds: ObjectFitBounds,
  isMirrored: boolean
): { x: number; y: number } {
  const effectiveNormX = isMirrored ? 1.0 - normX : normX;
  const x = bounds.renderX + effectiveNormX * bounds.renderWidth;
  const y = bounds.renderY + normY * bounds.renderHeight;
  return { x, y };
}

/**
 * Maps container display coordinates back to normalized (0.0 to 1.0) video coordinates
 */
export function mapDisplayToNormalized(
  displayX: number,
  displayY: number,
  bounds: ObjectFitBounds,
  isMirrored: boolean
): { normX: number; normY: number } {
  if (bounds.renderWidth <= 0 || bounds.renderHeight <= 0) {
    return { normX: 0.5, normY: 0.5 };
  }

  let normX = (displayX - bounds.renderX) / bounds.renderWidth;
  let normY = (displayY - bounds.renderY) / bounds.renderHeight;

  if (isMirrored) {
    normX = 1.0 - normX;
  }

  return {
    normX: Math.max(0, Math.min(1.0, normX)),
    normY: Math.max(0, Math.min(1.0, normY)),
  };
}

/**
 * Adjusts canvas backing resolution to device pixel ratio for crystal clear rendering
 */
export function syncCanvasWithDPR(
  canvas: HTMLCanvasElement | null,
  displayWidth: number,
  displayHeight: number,
  dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
): boolean {
  if (!canvas || displayWidth <= 0 || displayHeight <= 0) return false;

  const targetWidth = Math.round(displayWidth * dpr);
  const targetHeight = Math.round(displayHeight * dpr);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (ctx && dpr !== 1) {
      ctx.scale(dpr, dpr);
    }
    return true;
  }

  return false;
}
