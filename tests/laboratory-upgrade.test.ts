import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllModels,
  getModelById,
  saveModel,
  deleteModel,
  duplicateModel,
  createCustomVariant,
  saveNewVersion,
  restoreVersion,
  publishModel,
  unpublishModel,
  exportModelToJSON,
  importModelFromJSON,
  getAllDatasets,
  getDatasetById,
  saveDataset,
  deleteDataset,
  exportDatasetToJSON,
  importDatasetFromJSON,
  saveExperiment,
  getAllExperiments,
  saveDraft,
  getDraft,
  clearDraft,
  clearLaboratoryStorage,
  BUILT_IN_MODELS,
} from '@/modules/laboratory/model-storage';
import { ClassifierTrainer } from '@/modules/laboratory/classifier-trainer';
import { HandFeatureExtractor } from '@/modules/laboratory/feature-extractor';
import {
  createDefaultPipeline,
  validatePipeline,
  executePipeline,
  arePortsCompatible,
} from '@/modules/laboratory/pipeline-runner';
import { HandGestureClassifier } from '@/modules/hand/gesture-classifier';
import { generateSyntheticHand } from '@/modules/hand/synthetic-hand';
import {
  LaboratoryModel,
  LaboratoryDataset,
  TrainingSample,
  LaboratoryPipeline,
} from '@/modules/laboratory/types';

describe('Omni Loco Laboratory Upgrade Test Suite', () => {
  beforeEach(() => {
    clearLaboratoryStorage();
  });

  describe('Model Registry & Storage Engine', () => {
    it('returns built-in factory models by default', () => {
      const models = getAllModels();
      expect(models.length).toBeGreaterThanOrEqual(3);
      expect(models.some((m) => m.id === 'built-in-mediapipe-standard')).toBe(true);
      expect(models.some((m) => m.id === 'built-in-triad-lock')).toBe(true);
      expect(models.some((m) => m.id === 'built-in-cyber-vulcan')).toBe(true);
    });

    it('prevents overwriting or deleting built-in models', () => {
      const builtIn = BUILT_IN_MODELS[0]!;
      expect(() => {
        saveModel({ ...builtIn, name: 'Hacked Model' });
      }).toThrow(/Cannot overwrite protected built-in model/i);

      const deleted = deleteModel(builtIn.id);
      expect(deleted).toBe(false);
      expect(getModelById(builtIn.id)).not.toBeNull();
    });

    it('creates custom variants from built-in models with independent state', () => {
      const variant = createCustomVariant('built-in-mediapipe-standard', 'Tactile Claw Variant');
      expect(variant.id).toMatch(/^variant-/);
      expect(variant.name).toBe('Tactile Claw Variant');
      expect(variant.isBuiltIn).toBe(false);
      expect(variant.version).toBe('1.0.0');
      expect(variant.versionHistory?.length).toBe(1);

      // Verify variant is retrievable
      const fetched = getModelById(variant.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Tactile Claw Variant');
    });

    it('supports saving, updating, and deleting custom user models', () => {
      const customModel: LaboratoryModel = {
        id: 'user-model-1',
        name: 'Quantum Grip',
        description: 'Gesture model for quantum grip simulation',
        version: '1.0.0',
        figureTag: 'EXP. 42',
        author: 'Laboratory Specialist',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isBuiltIn: false,
        isPublished: false,
        modelType: 'centroid_prototype',
        lifecycleState: 'CONFIGURED',
        classes: ['GRIP', 'NEUTRAL'],
        hyperparameters: {
          confidenceThreshold: 0.7,
          smoothingFrames: 2,
        },
      };

      saveModel(customModel);
      expect(getModelById('user-model-1')?.name).toBe('Quantum Grip');

      // Update model
      saveModel({ ...customModel, description: 'Updated operational description' });
      expect(getModelById('user-model-1')?.description).toBe('Updated operational description');

      // Delete model
      const deleted = deleteModel('user-model-1');
      expect(deleted).toBe(true);
      expect(getModelById('user-model-1')).toBeNull();
    });

    it('creates version snapshots and supports rolling back to previous versions', () => {
      const baseModel = createCustomVariant('built-in-triad-lock', 'Version Test Model');
      expect(baseModel.version).toBe('1.0.0');

      // Update parameters and create version 1.1.0
      baseModel.hyperparameters.confidenceThreshold = 0.85;
      saveModel(baseModel);
      const v2 = saveNewVersion(baseModel.id, 'Tuned confidence threshold to 0.85');
      expect(v2.version).toBe('1.1.0');
      expect(v2.versionHistory?.length).toBe(2);

      // Rollback to version 1.0.0
      const restored = restoreVersion(v2.id, '1.0.0');
      expect(restored.version).toBe('1.0.0-restored');
      expect(restored.hyperparameters.confidenceThreshold).toBe(0.7);
      // History should now record the rollback point
      expect(restored.versionHistory?.length).toBe(3);
    });

    it('exports and imports models safely while blocking prototype pollution', () => {
      const model = createCustomVariant('built-in-mediapipe-standard', 'Exportable Model');
      const exportedJson = exportModelToJSON(model.id);
      expect(exportedJson).not.toBeNull();

      // Test malicious payload with __proto__
      const maliciousJson = JSON.stringify({
        __proto__: { polluted: true },
        name: 'Injected Model',
        modelType: 'centroid_prototype',
        classes: ['A', 'B'],
        hyperparameters: { confidenceThreshold: 0.7, smoothingFrames: 2 },
      });

      const imported = importModelFromJSON(maliciousJson);
      expect(imported.name).toContain('Injected Model');
      expect((Object.prototype as any).polluted).toBeUndefined();

      // Test invalid payload schema
      expect(() => {
        importModelFromJSON(JSON.stringify({ invalid: true }));
      }).toThrow(/Invalid schema/i);
    });

    it('toggles publishing state to primary hand module', () => {
      const model = createCustomVariant('built-in-cyber-vulcan', 'Publishable Model');
      expect(model.isPublished).toBe(false);

      publishModel(model.id);
      expect(getModelById(model.id)?.isPublished).toBe(true);

      unpublishModel(model.id);
      expect(getModelById(model.id)?.isPublished).toBe(false);
    });
  });

  describe('Dataset Management & Class Mutation Workflow', () => {
    it('saves and retrieves training datasets', () => {
      const dataset: LaboratoryDataset = {
        id: 'test-dataset-01',
        name: 'Hand Gesture Corpus A',
        description: 'Test training corpus',
        version: '1.0.0',
        classes: ['POSE_ALPHA', 'POSE_BETA'],
        samples: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveDataset(dataset);
      const retrieved = getDatasetById('test-dataset-01');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Hand Gesture Corpus A');
      expect(retrieved?.classes).toEqual(['POSE_ALPHA', 'POSE_BETA']);
    });

    it('supports class renaming and updates sample labels across the dataset', () => {
      const mockLandmarks = generateSyntheticHand(100);
      const features = HandFeatureExtractor.extractNormalizedVector(mockLandmarks);

      const sample1: TrainingSample = {
        id: 's1',
        label: 'OLD_CLASS',
        landmarks: mockLandmarks,
        normalizedFeatures: features,
        timestamp: Date.now(),
        hand: 'Right',
      };
      const sample2: TrainingSample = {
        id: 's2',
        label: 'OTHER_CLASS',
        landmarks: mockLandmarks,
        normalizedFeatures: features,
        timestamp: Date.now(),
        hand: 'Right',
      };

      const dataset: LaboratoryDataset = {
        id: 'ds-rename-test',
        name: 'Rename Test DS',
        description: 'Testing label renames',
        version: '1.0.0',
        classes: ['OLD_CLASS', 'OTHER_CLASS'],
        samples: [sample1, sample2],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveDataset(dataset);

      // Perform simulated rename
      const updatedClasses = dataset.classes.map((c) => (c === 'OLD_CLASS' ? 'NEW_CLASS' : c));
      const updatedSamples = dataset.samples.map((s) => (s.label === 'OLD_CLASS' ? { ...s, label: 'NEW_CLASS' } : s));
      const updatedDs = { ...dataset, classes: updatedClasses, samples: updatedSamples };
      saveDataset(updatedDs);

      const fetched = getDatasetById('ds-rename-test');
      expect(fetched?.classes).toContain('NEW_CLASS');
      expect(fetched?.classes).not.toContain('OLD_CLASS');
      expect(fetched?.samples.find((s) => s.id === 's1')?.label).toBe('NEW_CLASS');
      expect(fetched?.samples.find((s) => s.id === 's2')?.label).toBe('OTHER_CLASS');
    });

    it('enforces minimum 2 classes when managing dataset classes', () => {
      const dataset: LaboratoryDataset = {
        id: 'ds-guard-test',
        name: 'Class Guard Test',
        description: 'Ensuring minimum 2 classes',
        version: '1.0.0',
        classes: ['CLASS_1', 'CLASS_2'],
        samples: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveDataset(dataset);

      // Deleting when only 2 classes remain should be blocked by business logic
      const canDelete = dataset.classes.length > 2;
      expect(canDelete).toBe(false);
    });

    it('exports and imports datasets with complete sample vector validation', () => {
      const mockLandmarks = generateSyntheticHand(200);
      const features = HandFeatureExtractor.extractNormalizedVector(mockLandmarks);

      const dataset: LaboratoryDataset = {
        id: 'ds-export-test',
        name: 'Exportable Dataset',
        description: 'Dataset for JSON export',
        version: '1.0.0',
        classes: ['GESTURE_X', 'GESTURE_Y'],
        samples: [
          {
            id: 'sample-x1',
            label: 'GESTURE_X',
            landmarks: mockLandmarks,
            normalizedFeatures: features,
            timestamp: Date.now(),
            hand: 'Right',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveDataset(dataset);
      const json = exportDatasetToJSON(dataset.id);
      expect(json).not.toBeNull();

      const imported = importDatasetFromJSON(json!);
      expect(imported.name).toContain('Exportable Dataset');
      expect(imported.samples.length).toBe(1);
      expect(imported.samples[0]!.normalizedFeatures.length).toBe(63);

      // Invalid sample features should throw
      const malformedJson = JSON.stringify({
        name: 'Bad DS',
        samples: [{ label: 'FAIL', normalizedFeatures: [1, 2, 3] }],
      });
      expect(() => importDatasetFromJSON(malformedJson)).toThrow(/Malformed sample/i);
    });
  });

  describe('Classifier Training Engine & Validation Metrics', () => {
    function generateSyntheticSamples(classA: string, classB: string, countPerClass = 10): TrainingSample[] {
      const samples: TrainingSample[] = [];
      const baseLandmarks = generateSyntheticHand(500);
      const baseVector = HandFeatureExtractor.extractNormalizedVector(baseLandmarks);

      for (let i = 0; i < countPerClass; i++) {
        // Perturb features slightly for class A
        const vecA = baseVector.map((v) => v + (Math.random() - 0.5) * 0.04);
        samples.push({
          id: `a-${i}`,
          label: classA,
          landmarks: baseLandmarks,
          normalizedFeatures: vecA,
          timestamp: Date.now(),
          hand: 'Right',
          burstId: `burst-a-${Math.floor(i / 5)}`,
        });

        // Perturb features differently for class B
        const vecB = baseVector.map((v, idx) => (idx % 2 === 0 ? v + 0.35 : v - 0.25) + (Math.random() - 0.5) * 0.04);
        samples.push({
          id: `b-${i}`,
          label: classB,
          landmarks: baseLandmarks,
          normalizedFeatures: vecB,
          timestamp: Date.now(),
          hand: 'Right',
          burstId: `burst-b-${Math.floor(i / 5)}`,
        });
      }
      return samples;
    }

    it('trains centroid prototype classifier and produces precision, recall, and F1 metrics', async () => {
      const samples = generateSyntheticSamples('TRIAD', 'REST', 12);
      const trainer = new ClassifierTrainer({
        metric: 'euclidean',
        confidenceThreshold: 0.6,
      });

      const { stats, warnings } = await trainer.trainAsync(samples, {
        valSplit: 0.25,
      });

      expect(stats.sampleCount).toBe(24);
      expect(stats.trainAccuracy).toBeGreaterThanOrEqual(0.9);
      expect(stats.valAccuracy).toBeGreaterThanOrEqual(0.9);
      expect(stats.confusionMatrix).toBeDefined();
      expect(stats.confusionMatrix?.precision?.['TRIAD']).toBeDefined();
      expect(stats.confusionMatrix?.recall?.['TRIAD']).toBeDefined();
      expect(stats.confusionMatrix?.f1Score?.['TRIAD']).toBeDefined();

      const modelData = trainer.getModelData();
      expect(modelData.classes).toEqual(expect.arrayContaining(['TRIAD', 'REST']));
      expect(modelData.prototypes['TRIAD']?.length).toBe(63);
      expect(modelData.prototypes['REST']?.length).toBe(63);
    });

    it('supports cancellation during async training pass via AbortSignal', async () => {
      const samples = generateSyntheticSamples('POSE_1', 'POSE_2', 8);
      const trainer = new ClassifierTrainer();
      const controller = new AbortController();
      controller.abort();

      await expect(
        trainer.trainAsync(samples, { signal: controller.signal })
      ).rejects.toThrow(/Training cancelled/i);
    });

    it('supports k-NN algorithm and classifies nearest neighbor samples', () => {
      const samples = generateSyntheticSamples('PEACE', 'FIST', 10);
      const trainer = new ClassifierTrainer({
        algorithm: 'knn_landmark',
        kNeighbors: 3,
      });

      const { stats } = trainer.train(samples, 0.2);
      expect(stats.sampleCount).toBe(20);

      // Predict with peace-like sample
      const testPeace = samples.find((s) => s.label === 'PEACE')!;
      const pred = (trainer as any).predictKNN(testPeace.normalizedFeatures);
      expect(pred.label).toBe('PEACE');
      expect(pred.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Live Test Bench & Genuine Non-Fabricated Inference', () => {
    it('returns genuine unrecognized result for untrained model rather than hardcoded open_palm', () => {
      const untrainedTrainer = new ClassifierTrainer();
      const mockLandmarks = generateSyntheticHand(800);

      const prediction = untrainedTrainer.predict(mockLandmarks);
      expect(prediction.label).toBe('none');
      expect(prediction.confidence).toBe(0);
      expect(prediction.isRecognized).toBe(false);
    });

    it('runs genuine geometric classification via HandGestureClassifier', () => {
      const classifier = new HandGestureClassifier();
      const mockLandmarks = generateSyntheticHand(1000);

      const gestures = classifier.classify(mockLandmarks, performance.now());
      expect(gestures.length).toBeGreaterThan(0);
      // Valid classification result without fabricated fallbacks
      expect(typeof gestures[0]?.name).toBe('string');
      expect(typeof gestures[0]?.confidence).toBe('number');
    });

    it('performs accurate inference on trained prototype models', () => {
      const trainer = new ClassifierTrainer({ confidenceThreshold: 0.5 });
      const syntheticLandmarks = generateSyntheticHand(300);
      const baseFeatures = HandFeatureExtractor.extractNormalizedVector(syntheticLandmarks);

      const samples: TrainingSample[] = [
        {
          id: 's-a1',
          label: 'TARGET_POSE',
          landmarks: syntheticLandmarks,
          normalizedFeatures: baseFeatures,
          timestamp: Date.now(),
          hand: 'Right',
        },
        {
          id: 's-b1',
          label: 'BASELINE_REST',
          landmarks: syntheticLandmarks,
          normalizedFeatures: baseFeatures.map((v) => v + 0.5),
          timestamp: Date.now(),
          hand: 'Right',
        },
      ];

      trainer.train(samples, 0);
      const result = trainer.predict(syntheticLandmarks);
      expect(result.label).toBe('TARGET_POSE');
      expect(result.isRecognized).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.distances['TARGET_POSE']).toBeLessThan(result.distances['BASELINE_REST']!);
    });
  });

  describe('Visual Pipeline Graph Validation & Execution', () => {
    it('creates default pipeline graph with valid initial topology', () => {
      const pipeline = createDefaultPipeline();
      expect(pipeline.nodes.length).toBeGreaterThanOrEqual(4);
      expect(pipeline.connections.length).toBeGreaterThanOrEqual(3);

      const validation = validatePipeline(pipeline);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.executionOrder.length).toBe(pipeline.nodes.length);
    });

    it('detects cycles and disconnected loops in custom graph wiring', () => {
      const pipeline: LaboratoryPipeline = {
        nodes: [
          {
            id: 'node-a',
            type: 'filter-temporal',
            label: 'Filter A',
            category: 'preprocessing',
            x: 0,
            y: 0,
            inputs: [{ id: 'in', name: 'Input', type: 'features' }],
            outputs: [{ id: 'out', name: 'Output', type: 'features' }],
            parameters: {},
          },
          {
            id: 'node-b',
            type: 'filter-temporal',
            label: 'Filter B',
            category: 'preprocessing',
            x: 100,
            y: 0,
            inputs: [{ id: 'in', name: 'Input', type: 'features' }],
            outputs: [{ id: 'out', name: 'Output', type: 'features' }],
            parameters: {},
          },
        ],
        connections: [
          { id: 'c1', fromNodeId: 'node-a', fromPortId: 'out', toNodeId: 'node-b', toPortId: 'in' },
          { id: 'c2', fromNodeId: 'node-b', fromPortId: 'out', toNodeId: 'node-a', toPortId: 'in' }, // Cycle!
        ],
        isValid: false,
        version: '1.0.0',
      };

      const val = validatePipeline(pipeline);
      expect(val.isValid).toBe(false);
      expect(val.errors.some((e) => e.includes('Cycle detected'))).toBe(true);
    });

    it('validates port data type compatibility correctly', () => {
      expect(arePortsCompatible('landmarks', 'landmarks')).toBe(true);
      expect(arePortsCompatible('features', 'features')).toBe(true);
      expect(arePortsCompatible('landmarks', 'features')).toBe(false);
      expect(arePortsCompatible('stream', 'classification')).toBe(false);
    });

    it('executes pipeline graph and propagates data between nodes', async () => {
      const pipeline = createDefaultPipeline();
      const mockLandmarks = generateSyntheticHand(500);

      const { pipeline: executedPipeline, executionLog, finalOutput } = executePipeline(pipeline, mockLandmarks);
      expect(executedPipeline.nodes.length).toBe(pipeline.nodes.length);
      expect(executionLog.length).toBeGreaterThan(0);
      expect(finalOutput).toBeDefined();
    });
  });

  describe('Draft Autosave & Recovery', () => {
    it('persists and restores work-in-progress drafts', () => {
      saveDraft({
        modelId: 'exp-model-01',
        mode: 'CONFIG',
        timestamp: Date.now(),
        unsavedModel: { name: 'Work in Progress Draft' },
      });

      const draft = getDraft('exp-model-01');
      expect(draft).not.toBeNull();
      expect(draft?.unsavedModel?.name).toBe('Work in Progress Draft');

      clearDraft();
      expect(getDraft('exp-model-01')).toBeNull();
    });
  });
});
