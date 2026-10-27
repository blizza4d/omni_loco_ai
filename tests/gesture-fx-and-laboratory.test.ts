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
import { analyzeDataset } from '@/modules/laboratory/dataset-diagnostics';
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
  createCustomVariant,
  saveNewVersion,
  restoreVersion,
  getAllDatasets,
  getDatasetById,
  saveDataset,
  deleteDataset,
  exportDatasetToJSON,
  importDatasetFromJSON,
  getAllExperiments,
  saveExperiment,
  deleteExperiment,
  saveDraft,
  getDraft,
  clearDraft,
  BUILT_IN_MODELS,
} from '@/modules/laboratory/model-storage';
import { GestureFXEngine } from '@/modules/hand/fx/gesture-fx-engine';
import { DEFAULT_FX_CONFIG, FX_PRESET_PALETTES } from '@/modules/hand/fx/fx-registry';
import {
  createDefaultPipeline,
  validatePipeline,
  executePipeline,
  arePortsCompatible,
} from '@/modules/laboratory/pipeline-runner';
import { generateSyntheticHand } from '@/modules/hand/synthetic-hand';
import { Landmark3D } from '@/modules/hand/types';
import { TrainingSample, LaboratoryModel, LaboratoryDataset, LaboratoryExperiment } from '@/modules/laboratory/types';

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
    sm.update('Right', 'closed_fist', 0.9, mockLandmarks, 120);

    const eActive = sm.update('Right', 'closed_fist', 0.9, mockLandmarks, 180);
    expect(eActive?.phase).toBe('active');
    expect(eActive?.durationMs).toBe(60);

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
    expect(HandFeatureExtractor.cosineDistance(a, b)).toBeCloseTo(1.0);
  });
});

describe('Dataset Quality Diagnostics', () => {
  it('analyzes sample counts, detects imbalance and near-duplicates', () => {
    const hand = generateSyntheticHand(500);
    const feat = HandFeatureExtractor.extractNormalizedVector(hand);

    // 25 identical samples for CLASS_A
    const samplesA: TrainingSample[] = Array.from({ length: 25 }, (_, i) => ({
      id: `a-${i}`,
      label: 'CLASS_A',
      landmarks: hand,
      normalizedFeatures: feat,
      timestamp: Date.now(),
      hand: 'Right',
      burstId: 'burst-1',
    }));

    // 4 slightly perturbed samples for CLASS_B
    const samplesB: TrainingSample[] = Array.from({ length: 4 }, (_, i) => ({
      id: `b-${i}`,
      label: 'CLASS_B',
      landmarks: hand,
      normalizedFeatures: feat.map((v) => v + 0.3),
      timestamp: Date.now(),
      hand: 'Right',
      burstId: 'burst-2',
    }));

    const report = analyzeDataset([...samplesA, ...samplesB], ['CLASS_A', 'CLASS_B']);
    expect(report.totalSamples).toBe(29);
    expect(report.imbalanceRatio).toBeGreaterThanOrEqual(6.0); // 25 / 4 = 6.25:1
    expect(report.nearDuplicateCount).toBeGreaterThan(0);
    expect(report.warnings.some((w) => w.includes('imbalance'))).toBe(true);
    expect(report.isValidForTraining).toBe(true);
  });
});

describe('ClassifierTrainer', () => {
  it('trains asynchronously with progress callbacks and burst isolation', async () => {
    const baseHand = generateSyntheticHand(500);
    const baseVector = HandFeatureExtractor.extractNormalizedVector(baseHand);

    // 2 distinct bursts for POSE_1
    const samples1: TrainingSample[] = Array.from({ length: 20 }, (_, idx) => ({
      id: `sample-1-${idx}`,
      label: 'POSE_1',
      landmarks: baseHand,
      normalizedFeatures: baseVector.map((val) => val + (idx * 0.001 - 0.01)),
      timestamp: Date.now(),
      hand: 'Right',
      burstId: idx < 10 ? 'burst-1a' : 'burst-1b',
    }));

    // 2 distinct bursts for POSE_2
    const samples2: TrainingSample[] = Array.from({ length: 20 }, (_, idx) => ({
      id: `sample-2-${idx}`,
      label: 'POSE_2',
      landmarks: baseHand,
      normalizedFeatures: baseVector.map((val, i) => (i < 15 ? val + 0.5 : val) + (idx * 0.001 - 0.01)),
      timestamp: Date.now(),
      hand: 'Right',
      burstId: idx < 10 ? 'burst-2a' : 'burst-2b',
    }));

    const progressSteps: number[] = [];
    const trainer = new ClassifierTrainer({ confidenceThreshold: 0.6 });

    const { stats, warnings } = await trainer.trainAsync([...samples1, ...samples2], {
      valSplit: 0.2,
      onProgress: (percent) => progressSteps.push(percent),
    });

    expect(progressSteps.length).toBeGreaterThan(0);
    expect(stats.sampleCount).toBe(40);
    expect(stats.trainAccuracy).toBeGreaterThan(0.9);
    expect(stats.valAccuracy).toBeGreaterThan(0.9);
    expect(stats.confusionMatrix?.f1Score).toBeDefined();
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

describe('Laboratory Model Storage & Versioning', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('loads built-in models and protects them against overwriting', () => {
    const models = getAllModels();
    expect(models.length).toBeGreaterThanOrEqual(3);

    // Attempting to overwrite a built-in directly throws an error
    expect(() => {
      saveModel({
        ...BUILT_IN_MODELS[0]!,
        name: 'Hacked Builtin',
      });
    }).toThrow(/Cannot overwrite protected built-in model/);
  });

  it('creates custom variants from built-ins and saves new versions', () => {
    const variant = createCustomVariant('built-in-mediapipe-standard', 'Custom High-Speed Landmarker');
    expect(variant.id).toMatch(/^variant-/);
    expect(variant.isBuiltIn).toBe(false);

    // Modify a hyperparameter and commit a new version
    variant.hyperparameters.smoothingFrames = 5;
    saveModel(variant);

    const versioned = saveNewVersion(variant.id, 'Increased temporal smoothing to 5 frames');
    expect(versioned.version).toBe('1.1.0');
    expect(versioned.versionHistory?.length).toBeGreaterThanOrEqual(1);

    // Rollback to earlier version
    const restored = restoreVersion(variant.id, '1.0.0');
    expect(restored.version).toContain('1.0.0-restored');
  });

  it('handles dataset CRUD, export, and import with schema validation', () => {
    const ds: LaboratoryDataset = {
      id: 'ds-test-1',
      name: 'Test Gestures Dataset',
      description: 'Benchmark dataset',
      version: '1.0.0',
      classes: ['PINCH', 'EXPAND'],
      samples: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveDataset(ds);
    const loaded = getDatasetById('ds-test-1');
    expect(loaded?.name).toBe('Test Gestures Dataset');

    const json = exportDatasetToJSON('ds-test-1');
    expect(json).not.toBeNull();

    const imported = importDatasetFromJSON(json!);
    expect(imported.name).toContain('[Imported]');

    deleteDataset('ds-test-1');
    expect(getDatasetById('ds-test-1')).toBeNull();
  });

  it('handles experiment benchmark logging', () => {
    const exp: LaboratoryExperiment = {
      id: 'exp-101',
      name: 'Prototype Baseline Run',
      modelId: 'built-in-triad-lock',
      modelName: 'Triad Lock',
      modelVersion: '1.0.0',
      algorithm: 'centroid_prototype',
      hyperparameters: { confidenceThreshold: 0.7, smoothingFrames: 2 },
      stats: {
        sampleCount: 50,
        trainAccuracy: 0.98,
        valAccuracy: 0.96,
        classCounts: { TRIAD: 25, NEUTRAL: 25 },
        trainedAt: '12:00:00',
      },
      notes: 'Clean execution',
      createdAt: new Date().toISOString(),
    };

    saveExperiment(exp);
    const list = getAllExperiments();
    expect(list.length).toBe(1);
    expect(list[0]?.name).toBe('Prototype Baseline Run');

    deleteExperiment('exp-101');
    expect(getAllExperiments().length).toBe(0);
  });

  it('saves and clears autosave drafts', () => {
    saveDraft({
      modelId: 'test-model',
      mode: 'PIPELINE',
      timestamp: Date.now(),
      unsavedModel: { name: 'Draft Model' },
    });

    const draft = getDraft('test-model');
    expect(draft?.unsavedModel?.name).toBe('Draft Model');

    clearDraft();
    expect(getDraft('test-model')).toBeNull();
  });
});

describe('Visual Pipeline Runner & Execution Engine', () => {
  it('validates default pipeline DAG and port compatibility', () => {
    const pipeline = createDefaultPipeline();
    const result = validatePipeline(pipeline);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(arePortsCompatible('landmarks', 'landmarks')).toBe(true);
    expect(arePortsCompatible('classification', 'stream')).toBe(false);
  });

  it('executes real pipeline passing 3D landmarks through every node', () => {
    const pipeline = createDefaultPipeline();
    const testHand = generateSyntheticHand(100);

    const { pipeline: executed, finalOutput, executionLog } = executePipeline(pipeline, testHand);

    expect(executionLog.length).toBe(pipeline.nodes.length);
    expect(finalOutput).toBeDefined();
    expect(finalOutput.type).toBe('GESTURE_FX_EVENT');

    // Verify intermediate outputs on nodes
    const normalizerNode = executed.nodes.find((n) => n.type === 'wrist_normalizer');
    expect(normalizerNode?.lastOutput).toBeDefined();
    expect(normalizerNode?.lastOutput.length).toBe(21);

    const featureNode = executed.nodes.find((n) => n.type === 'landmark_vector_extractor');
    expect(featureNode?.lastOutput).toBeDefined();
    expect(featureNode?.lastOutput.length).toBe(63);
  });

  it('detects cycles in pipeline connections', () => {
    const pipeline = createDefaultPipeline();
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
});
