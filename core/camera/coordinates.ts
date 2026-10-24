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
