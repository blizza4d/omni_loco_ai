import { describe, it, expect } from 'vitest';
import { ObjectDetectorEngine } from '../modules/objects/detector';
import { PromptableSegmenter } from '../modules/segment/segmenter';
import { DepthEstimationEngine } from '../modules/depth/estimator';
import { BoundingBox, DetectedObject } from '../modules/objects/types';
import { DepthEstimationResult } from '../modules/depth/types';

describe('Module 08: ObjectDetectorEngine', () => {
  it('correctly calculates Intersection-over-Union (IoU) between bounding boxes', () => {
    const engine = new ObjectDetectorEngine();

    const boxA: BoundingBox = { x: 100, y: 100, width: 100, height: 100 };
    const boxIdentical: BoundingBox = { x: 100, y: 100, width: 100, height: 100 };
    const boxDisjoint: BoundingBox = { x: 300, y: 300, width: 50, height: 50 };
    const boxPartial: BoundingBox = { x: 150, y: 100, width: 100, height: 100 };

    // Identical boxes must have IoU = 1.0
    expect(engine.computeIoU(boxA, boxIdentical)).toBeCloseTo(1.0, 5);

    // Non-overlapping boxes must have IoU = 0.0
    expect(engine.computeIoU(boxA, boxDisjoint)).toBe(0.0);

    // 50% horizontal overlap:
    // Box A: [100, 200], Box Partial: [150, 250]
    // Intersection: [150, 200] = 50 * 100 = 5000
    // Area A = 10000, Area B = 10000, Union = 10000 + 10000 - 5000 = 15000
    // IoU = 5000 / 15000 = 1/3 ~ 0.3333
    expect(engine.computeIoU(boxA, boxPartial)).toBeCloseTo(1 / 3, 3);
  });

  it('performs Non-Maximum Suppression (NMS) to eliminate duplicate detections', () => {
    const engine = new ObjectDetectorEngine();

    const detHighConf: DetectedObject = {
      id: 'd1',
      label: 'person',
      classId: 0,
      category: 'PERSON',
      confidence: 0.92,
      box: { x: 50, y: 50, width: 100, height: 200 },
      color: '#00E599',
    };

    const detDuplicate: DetectedObject = {
      id: 'd2',
      label: 'person',
      classId: 0,
      category: 'PERSON',
      confidence: 0.65,
      box: { x: 52, y: 54, width: 98, height: 196 }, // Overlaps > 90%
      color: '#00E599',
    };

    const detDifferentClass: DetectedObject = {
      id: 'd3',
      label: 'chair',
      classId: 56,
      category: 'INDOOR',
      confidence: 0.81,
      box: { x: 52, y: 54, width: 98, height: 196 }, // Overlaps but different class
      color: '#00E599',
    };

    const rawList = [detDuplicate, detHighConf, detDifferentClass];
    const nmsResult = engine.applyNMS(rawList, 0.45);

    // Must keep detHighConf and detDifferentClass, but eliminate detDuplicate
    expect(nmsResult.length).toBe(2);
    expect(nmsResult[0]?.confidence).toBe(0.92);
    expect(nmsResult.find((d) => d.classId === 56)).toBeDefined();
    expect(nmsResult.find((d) => d.confidence === 0.65)).toBeUndefined();
  });

  it('initializes backend gracefully', async () => {
    const engine = new ObjectDetectorEngine();
    const backend = await engine.init();
    expect(backend).toBeDefined();
    expect(typeof backend).toBe('string');
    expect(backend).toContain('ONNX');
  });
});

describe('Module 09: PromptableSegmenter', () => {
  it('returns empty mask when no prompts or bounding box are provided', () => {
    const segmenter = new PromptableSegmenter();
    // In node/vitest, pass dummy element
    const dummyCanvas = { width: 100, height: 100 } as any;

    const result = segmenter.segment(dummyCanvas, 100, 100, [], null);
    expect(result.maskWidth).toBe(100);
    expect(result.maskHeight).toBe(100);
    expect(result.maskData.length).toBe(10000);
    expect(result.areaPercentage).toBe(0);
    expect(result.confidenceScore).toBe(0);
  });

  it('initializes backend gracefully', async () => {
    const segmenter = new PromptableSegmenter();
    const backend = await segmenter.init();
    expect(backend).toBeDefined();
    expect(typeof backend).toBe('string');
    expect(backend).toContain('SAM');
  });
});

describe('Module 10: DepthEstimationEngine', () => {
  it('initializes backend gracefully', async () => {
    const depthEngine = new DepthEstimationEngine();
    const backend = await depthEngine.init();
    expect(backend).toBeDefined();
    expect(typeof backend).toBe('string');
    expect(backend).toContain('DEPTH');
  });

  it('computes 3D surface normal vector and distance tier on probed points', () => {
    const depthEngine = new DepthEstimationEngine();

    // Create a synthetic depth buffer with a linear ramp from top (far=0.1) to bottom (near=0.9)
    const w = 64;
    const h = 48;
    const depthBuffer = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        depthBuffer[y * w + x] = 0.1 + 0.8 * (y / h);
      }
    }

    const mockResult: DepthEstimationResult = {
      width: w,
      height: h,
      depthBuffer,
      minDepth: 0.1,
      maxDepth: 0.9,
      meanDepth: 0.5,
      inferenceDurationMs: 12,
    };

    // Probe foreground point (near bottom)
    const fgProbe = depthEngine.probePoint(mockResult, 0.5, 0.85);
    expect(fgProbe.depthRatio).toBeGreaterThan(0.65);
    expect(fgProbe.zone).toBe('FOREGROUND');

    // Surface normal must be normalized
    const len = Math.hypot(fgProbe.normal.nx, fgProbe.normal.ny, fgProbe.normal.nz);
    expect(len).toBeCloseTo(1.0, 1);

    // Probe background point (near top)
    const bgProbe = depthEngine.probePoint(mockResult, 0.5, 0.15);
    expect(bgProbe.depthRatio).toBeLessThan(0.35);
    expect(bgProbe.zone).toBe('BACKGROUND');

    // Probe midground point (near center)
    const midProbe = depthEngine.probePoint(mockResult, 0.5, 0.5);
    expect(midProbe.zone).toBe('MIDGROUND');
  });
});
