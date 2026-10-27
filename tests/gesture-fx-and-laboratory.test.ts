import { describe, it, expect, beforeEach } from 'vitest';

// Setup browser globals for Node test environment
const mockStorage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, val: string) => mockStorage.set(key, val),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

(globalThis as unknown as { window: unknown }).window = globalThis;
(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage;

import {
  GestureStateMachine,
  calculatePalmCenter,
  GestureEventPayload,
} from '@/modules/hand/gesture-events';
import { HandFeatureExtractor } from '@/modules/laboratory/feature-extractor';
import { ClassifierTrainer } from '@/modules/laboratory/classifier-trainer';
import {
  getAllModels,
  getModelById,
  saveModel,
  deleteModel,
  duplicateModel,
  publishModel,
  unpublishModel,
  exportModelToJSON,
  importModelFromJSON,
  BUILT_IN_MODELS,
} from '@/modules/laboratory/model-storage';
import { GestureFXEngine } from '@/modules/hand/fx/gesture-fx-engine';
import { DEFAULT_FX_CONFIG, FX_PRESET_PALETTES } from '@/modules/hand/fx/fx-registry';
import {
  createDefaultPipeline,
  validatePipeline,
} from '@/modules/laboratory/pipeline-runner';
import { generateSyntheticHand } from '@/modules/hand/synthetic-hand';
import { Landmark3D } from '@/modules/hand/types';
import { TrainingSample, LaboratoryModel } from '@/modules/laboratory/types';

describe('GestureStateMachine', () => {
  let sm: GestureStateMachine;
  const mockLandmarks = generateSyntheticHand(1000);

  beforeEach(() => {
    sm = new GestureStateMachine({ minHoldMs: 100 });
  });

  it('calculates palm center from 5 palm keypoints', () => {
    const center = calculatePalmCenter(mockLandmarks);
    expect(center.x).toBeGreaterThan(0);
    expect(center.x).toBeLessThan(1);
    expect(center.y).toBeGreaterThan(0);
    expect(center.y).toBeLessThan(1);
  });

  it('requires minHoldMs before transitioning to start phase', () => {
    const events: GestureEventPayload[] = [];
    sm.subscribe((e) => events.push(e));

    // Frame 1 at t=0: Candidate detected
    const e1 = sm.update('Right', 'open_palm', 0.95, mockLandmarks, 0);
    expect(e1).toBeNull();
    expect(events.length).toBe(0);

    // Frame 2 at t=50: Still pending
    const e2 = sm.update('Right', 'open_palm', 0.95, mockLandmarks, 50);
    expect(e2).toBeNull();
    expect(events.length).toBe(0);

    // Frame 3 at t=105: Hold requirement met -> fires start event
    const e3 = sm.update('Right', 'open_palm', 0.95, mockLandmarks, 105);
    expect(e3).not.toBeNull();
    expect(e3?.phase).toBe('start');
    expect(e3?.gesture).toBe('open_palm');
    expect(events.length).toBe(1);
  });

  it('emits active continuous updates while held and release when gesture ends', () => {
    const events: GestureEventPayload[] = [];
    sm.subscribe((e) => events.push(e));

    sm.update('Right', 'closed_fist', 0.9, mockLandmarks, 0);
    sm.update('Right', 'closed_fist', 0.9, mockLandmarks, 120); // start

    // Next frame at t=180: active phase
    const eActive = sm.update('Right', 'closed_fist', 0.9, mockLandmarks, 180);
    expect(eActive?.phase).toBe('active');
    expect(eActive?.durationMs).toBe(60);

    // Change to 'none' at t=300 (after 100ms hold of none, release is emitted)
    sm.update('Right', 'none', 0.9, mockLandmarks, 300);
    sm.update('Right', 'none', 0.9, mockLandmarks, 420);

    const releaseEvents = events.filter((e) => e.phase === 'release');
    expect(releaseEvents.length).toBe(1);
    expect(releaseEvents[0]?.gesture).toBe('closed_fist');
  });

  it('manages independent states for Left and Right hands', () => {
    sm.update('Left', 'pointing', 0.9, mockLandmarks, 0);
    sm.update('Left', 'pointing', 0.9, mockLandmarks, 120);

    sm.update('Right', 'thumbs_up', 0.9, mockLandmarks, 0);
    sm.update('Right', 'thumbs_up', 0.9, mockLandmarks, 120);

    expect(sm.getCurrentGesture('Left')).toBe('pointing');
    expect(sm.getCurrentGesture('Right')).toBe('thumbs_up');
  });
});

describe('HandFeatureExtractor', () => {
  const baseLandmarks = generateSyntheticHand(1000);

  it('produces a 63-element feature vector with wrist anchored at origin', () => {
    const features = HandFeatureExtractor.extractNormalizedVector(baseLandmarks);
    expect(features.length).toBe(63);
    // Joint 0 (WRIST) should be (0, 0, 0)
    expect(features[0]).toBe(0);
    expect(features[1]).toBe(0);
    expect(features[2]).toBe(0);
  });

  it('is invariant to global translation in 3D space', () => {
    const translatedLandmarks = baseLandmarks.map((pt) => ({
      x: pt.x + 0.35,
      y: pt.y - 0.22,
      z: pt.z + 0.15,
    }));

    const f1 = HandFeatureExtractor.extractNormalizedVector(baseLandmarks);
    const f2 = HandFeatureExtractor.extractNormalizedVector(translatedLandmarks);

    const dist = HandFeatureExtractor.euclideanDistance(f1, f2);
    expect(dist).toBeLessThan(0.0001);
  });

  it('is invariant to uniform scaling (hand distance from camera)', () => {
    const scaledLandmarks = baseLandmarks.map((pt) => ({
      x: pt.x * 2.5,
      y: pt.y * 2.5,
      z: pt.z * 2.5,
    }));

    const f1 = HandFeatureExtractor.extractNormalizedVector(baseLandmarks);
    const f2 = HandFeatureExtractor.extractNormalizedVector(scaledLandmarks);

    const dist = HandFeatureExtractor.euclideanDistance(f1, f2);
    expect(dist).toBeLessThan(0.0001);
  });

  it('computes cosine and euclidean distances accurately', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(HandFeatureExtractor.euclideanDistance(a, b)).toBeCloseTo(Math.SQRT2);
    expect(HandFeatureExtractor.cosineDistance(a, b)).toBeCloseTo(1.0); // orthogonal
  });
});

describe('ClassifierTrainer', () => {
  it('trains on stratified samples and computes confusion matrix', () => {
    const baseHand = generateSyntheticHand(500);
    const baseVector = HandFeatureExtractor.extractNormalizedVector(baseHand);

    // Create 20 synthetic samples for CLASS_A (slightly perturbed)
    const samplesA: TrainingSample[] = Array.from({ length: 20 }, (_, idx) => {
      const v = baseVector.map((val) => val + (idx * 0.001 - 0.01));
      return {
        id: `sample-a-${idx}`,
        label: 'CLASS_A',
        landmarks: baseHand,
        normalizedFeatures: v,
        timestamp: Date.now(),
        hand: 'Right',
      };
    });

    // Create 20 synthetic samples for CLASS_B (distinct perturbation on index & thumb)
    const samplesB: TrainingSample[] = Array.from({ length: 20 }, (_, idx) => {
      const v = baseVector.map((val, i) => (i < 15 ? val + 0.5 : val) + (idx * 0.001 - 0.01));
      return {
        id: `sample-b-${idx}`,
        label: 'CLASS_B',
        landmarks: baseHand,
        normalizedFeatures: v,
        timestamp: Date.now(),
        hand: 'Right',
      };
    });

    const dataset = [...samplesA, ...samplesB];
    const trainer = new ClassifierTrainer({ confidenceThreshold: 0.6 });
    const { stats, warnings } = trainer.train(dataset, 0.2);

    expect(stats.sampleCount).toBe(40);
    expect(stats.trainAccuracy).toBeGreaterThan(0.9);
    expect(stats.valAccuracy).toBeGreaterThan(0.9);
    expect(stats.confusionMatrix).toBeDefined();
    expect(stats.confusionMatrix?.labels).toContain('CLASS_A');
    expect(stats.confusionMatrix?.labels).toContain('CLASS_B');
  });

  it('predicts accurate classes with confidence scores', () => {
    const handA = generateSyntheticHand(100);
    const vA = HandFeatureExtractor.extractNormalizedVector(handA);

    const handB = generateSyntheticHand(100).map((pt, i) =>
      i === 8 ? { x: pt.x + 0.3, y: pt.y - 0.4, z: pt.z } : pt
    );
    const vB = HandFeatureExtractor.extractNormalizedVector(handB);

    const trainer = new ClassifierTrainer({ confidenceThreshold: 0.5 });
    trainer.loadModelData({
      classes: ['POSE_A', 'POSE_B'],
      prototypes: {
        POSE_A: vA,
        POSE_B: vB,
      },
    });

    const predA = trainer.predict(handA);
    expect(predA.label).toBe('POSE_A');
    expect(predA.confidence).toBeGreaterThan(0.8);
    expect(predA.isRecognized).toBe(true);

    trainer.reset();
    const predB = trainer.predict(handB);
    expect(predB.label).toBe('POSE_B');
    expect(predB.confidence).toBeGreaterThan(0.8);
    expect(predB.isRecognized).toBe(true);
  });
});

describe('Laboratory Model Storage', () => {
  it('loads built-in models correctly', () => {
    const models = getAllModels();
    expect(models.length).toBeGreaterThanOrEqual(3);
    const ids = models.map((m) => m.id);
    expect(ids).toContain('built-in-mediapipe-standard');
    expect(ids).toContain('built-in-triad-lock');
    expect(ids).toContain('built-in-cyber-vulcan');
  });

  it('exports and imports model JSON with validation', () => {
    const exportedJson = exportModelToJSON('built-in-triad-lock');
    expect(exportedJson).not.toBeNull();
    const parsed = JSON.parse(exportedJson!);
    expect(parsed.name).toBe('Triad Lock Spatial Key');

    const imported = importModelFromJSON(exportedJson!);
    expect(imported.id).toMatch(/^imported-/);
    expect(imported.isBuiltIn).toBe(false);
  });

  it('manages publishing states', () => {
    publishModel('built-in-cyber-vulcan');
    const model = getModelById('built-in-cyber-vulcan');
    expect(model?.isPublished).toBe(true);

    unpublishModel('built-in-cyber-vulcan');
    const modelUnpublished = getModelById('built-in-cyber-vulcan');
    expect(modelUnpublished?.isPublished).toBe(false);
  });
});

describe('GestureFXEngine', () => {
  it('initializes with default config and resolves preset palettes', () => {
    const engine = new GestureFXEngine();
    const config = engine.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.intensity).toBe(1.0);
    expect(FX_PRESET_PALETTES.CYBER_NEON.primary).toBe('#00f3ff');
  });

  it('updates configuration and intensity cleanly', () => {
    const engine = new GestureFXEngine();
    engine.updateConfig({
      ...DEFAULT_FX_CONFIG,
      intensity: 1.8,
      preset: 'QUANTUM_VOID',
    });
    expect(engine.getConfig().intensity).toBe(1.8);
    expect(engine.getConfig().preset).toBe('QUANTUM_VOID');
  });
});

describe('PipelineValidator', () => {
  it('validates default pipeline DAG', () => {
    const pipeline = createDefaultPipeline();
    const result = validatePipeline(pipeline);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.executionOrder.length).toBe(pipeline.nodes.length);
  });

  it('detects cycles in pipeline connections', () => {
    const pipeline = createDefaultPipeline();
    // Introduce a cycle: node-stab -> node-prep
    pipeline.connections.push({
      id: 'cycle-link',
      fromNodeId: 'node-stab',
      fromPortId: 'out_stable_class',
      toNodeId: 'node-prep',
      toPortId: 'in_landmarks',
    });

    const result = validatePipeline(pipeline);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Cycle detected'))).toBe(true);
  });

  it('detects missing inputs or outputs', () => {
    const pipeline = createDefaultPipeline();
    pipeline.nodes = pipeline.nodes.filter((n) => n.category !== 'input');

    const result = validatePipeline(pipeline);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('missing an Input node'))).toBe(true);
  });
});
