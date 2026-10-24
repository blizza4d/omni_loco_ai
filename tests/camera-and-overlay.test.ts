import { describe, it, expect, vi } from 'vitest';
import { syncCanvasToVideo, mapNormalizedToCanvas } from '../core/camera/coordinates';
import { renderHandOverlay } from '../modules/hand/overlay-renderer';
import { renderFaceOverlay } from '../modules/face/overlay-renderer';
import { renderPoseOverlay } from '../modules/pose/overlay-renderer';

describe('Camera & Canvas Overlay Synchronization Suite', () => {
  it('syncCanvasToVideo synchronizes canvas backing buffer to video intrinsic dimensions', () => {
    const mockCanvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const mockVideo = { videoWidth: 1280, videoHeight: 720 } as HTMLVideoElement;

    const resized = syncCanvasToVideo(mockCanvas, mockVideo);
    expect(resized).toBe(true);
    expect(mockCanvas.width).toBe(1280);
    expect(mockCanvas.height).toBe(720);

    // Calling again with matching dimensions should NOT resize or trigger redrawing
    const unchanged = syncCanvasToVideo(mockCanvas, mockVideo);
    expect(unchanged).toBe(false);
  });

  it('syncCanvasToVideo falls back to default 640x480 when video metadata is pending', () => {
    const mockCanvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const mockVideo = { videoWidth: 0, videoHeight: 0 } as HTMLVideoElement;

    const resized = syncCanvasToVideo(mockCanvas, mockVideo);
    expect(resized).toBe(true);
    expect(mockCanvas.width).toBe(640);
    expect(mockCanvas.height).toBe(480);
  });

  it('mapNormalizedToCanvas correctly mirrors coordinates horizontally for webcam preview', () => {
    // Normal (unmirrored)
    const ptNormal = mapNormalizedToCanvas(0.2, 0.4, 640, 480, false);
    expect(ptNormal.x).toBeCloseTo(128);
    expect(ptNormal.y).toBeCloseTo(192);

    // Mirrored (front-facing selfie cam)
    const ptMirrored = mapNormalizedToCanvas(0.2, 0.4, 640, 480, true);
    expect(ptMirrored.x).toBeCloseTo((1.0 - 0.2) * 640); // 512
    expect(ptMirrored.y).toBeCloseTo(192);
  });

  it('renderHandOverlay always clears the canvas with transparent pixels', () => {
    const clearRect = vi.fn();
    const mockCtx = {
      clearRect,
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderHandOverlay(mockCtx, null, 640, 480);
    expect(clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
  });

  it('renderFaceOverlay clears the canvas and leaves video visible when no face is detected', () => {
    const clearRect = vi.fn();
    const mockCtx = {
      clearRect,
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderFaceOverlay(mockCtx, null, 640, 480, {
      layers: {
        tesselation: true,
        contours: true,
        eyes: true,
        irises: true,
        lips: true,
        headPoseGizmo: true,
      },
    });

    expect(clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
  });

  it('renderPoseOverlay clears the canvas and leaves video visible when no pose is detected', () => {
    const clearRect = vi.fn();
    const mockCtx = {
      clearRect,
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPoseOverlay(
      mockCtx,
      null,
      {
        leftElbow: 180,
        rightElbow: 180,
        leftKnee: 180,
        rightKnee: 180,
        leftShoulder: 90,
        rightShoulder: 90,
        leftHip: 180,
        rightHip: 180,
        trunkInclination: 0,
        forwardHeadAngle: 0,
        shoulderTiltAngle: 0,
      },
      640,
      480
    );

    expect(clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
  });
});
