import { describe, it, expect, beforeEach } from 'vitest';
import { Landmark3D } from '../modules/hand/types';
import {
  CustomGestureDefinition,
  CustomGestureSample,
  GestureSequenceDefinition,
  IntelligentReactionCombo,
  DEFAULT_GOOFY_CONFIG,
} from '../modules/pose/goofy-types';
import {
  CustomHandFeatureExtractor,
  GoofyCustomGestureClassifier,
} from '../modules/pose/goofy-custom-classifier';
import { GoofySequenceEngine } from '../modules/pose/goofy-sequence-engine';
import { GoofyEventEngine } from '../modules/pose/goofy-event-engine';
import { GoofyAudioEngine } from '../modules/pose/goofy-audio-engine';
import { GoofyVisualFXEngine } from '../modules/pose/goofy-visual-fx';
import {
  exportV7FullLibrary,
  importV7FullLibrary,
} from '../modules/pose/goofy-custom-store';
import { generateGestureFixture } from '../modules/pose/goofy-test-fixtures';

describe('Goofy Model V7: Custom Gesture Feature Extractor & Geometric Invariance', () => {
  it('extracts exactly 84 normalized invariant features from 21 landmarks', () => {
    const landmarks = generateGestureFixture('THUMBS_UP');
    const features = CustomHandFeatureExtractor.extract(landmarks);

    expect(features).toHaveLength(84);
    for (const val of features) {
      expect(Number.isFinite(val)).toBe(true);
      expect(Number.isNaN(val)).toBe(false);
    }
  });

  it('guarantees translation invariance: shifted hand produces near-zero feature distance', () => {
    const original = generateGestureFixture('PEACE_SIGN');
    const shifted = original.map((pt) => ({
      x: pt.x + 0.35,
      y: pt.y - 0.22,
      z: pt.z + 0.15,
    }));

    const f1 = CustomHandFeatureExtractor.extract(original);
    const f2 = CustomHandFeatureExtractor.extract(shifted);

    const distance = CustomHandFeatureExtractor.weightedDistance(f1, f2);
    expect(distance).toBeLessThan(0.001);
  });

  it('guarantees scale invariance: scaled hand produces minimal feature distance', () => {
    const original = generateGestureFixture('OPEN_PALM');
    // Scale hand around wrist (pt 0)
    const wrist = original[0]!;
    const scaled = original.map((pt) => ({
      x: wrist.x + (pt.x - wrist.x) * 1.6,
      y: wrist.y + (pt.y - wrist.y) * 1.6,
      z: wrist.z + (pt.z - wrist.z) * 1.6,
    }));

    const f1 = CustomHandFeatureExtractor.extract(original);
    const f2 = CustomHandFeatureExtractor.extract(scaled);

    const distance = CustomHandFeatureExtractor.weightedDistance(f1, f2);
    expect(distance).toBeLessThan(0.05);
  });

  it('validates landmark observation data and detects corrupted inputs', () => {
    const valid = generateGestureFixture('CLOSED_FIST');
    expect(CustomHandFeatureExtractor.validate(valid).valid).toBe(true);

    const invalidShort: Landmark3D[] = valid.slice(0, 15);
    expect(CustomHandFeatureExtractor.validate(invalidShort).valid).toBe(false);

    const invalidNaN = valid.map((pt, i) => (i === 4 ? { ...pt, x: NaN } : pt));
    expect(CustomHandFeatureExtractor.validate(invalidNaN).valid).toBe(false);
  });

  it('deduplicates near-identical samples to preserve dataset diversity', () => {
    const sampleA = generateGestureFixture('PINCH');
    const sampleB = sampleA.map((pt) => ({ ...pt })); // exact clone
    const existingSamples: CustomGestureSample[] = [
      {
        id: 's_001',
        gestureId: 'CUSTOM_PINCH',
        gestureLabel: 'Precision Pinch',
        landmarks: sampleA,
        handedness: 'Right',
        timestamp: 1000,
        normalizedFeatures: CustomHandFeatureExtractor.extract(sampleA),
      },
    ];

    expect(CustomHandFeatureExtractor.isSampleDeduplicated(sampleB, existingSamples)).toBe(false);

    // Different gesture should not be flagged as duplicate
    const different = generateGestureFixture('THUMBS_DOWN');
    expect(CustomHandFeatureExtractor.isSampleDeduplicated(different, existingSamples)).toBe(true);
  });
});

describe('Goofy Model V7: Lightweight Custom Gesture Classifier (KNN & Centroid)', () => {
  let classifier: GoofyCustomGestureClassifier;
  const customGestures: CustomGestureDefinition[] = [
    {
      id: 'CUSTOM_SPOCK',
      name: 'Spock Vulcan Salute',
      label: 'Spock Vulcan Salute',
      description: 'Split fingers V-salute',
      icon: '🖖',
      handedness: 'Right',
      minConfidence: 0.75,
      minHoldMs: 180,
      sampleCount: 5,
      assignedMemeId: 'REAL_MEME_GIGACHAD',
      assignedSoundId: 'CHAD_GONG',
      customCaption: 'LIVE LONG AND PROSPER',
      enabled: true,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'CUSTOM_THREE_FINGER',
      name: 'Rebel Salute',
      label: 'Rebel Salute',
      description: 'Three middle fingers straight up',
      icon: '🫡',
      handedness: 'Any',
      minConfidence: 0.75,
      minHoldMs: 180,
      sampleCount: 5,
      assignedMemeId: 'MEME_THREE_FINGER_DISTRICT',
      assignedSoundId: 'VICTORY_BELL',
      customCaption: 'DISTRICT 12 SALUTE',
      enabled: true,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  let samples: CustomGestureSample[] = [];

  beforeEach(() => {
    classifier = new GoofyCustomGestureClassifier();

    // Generate training samples for gesture 1
    const base1 = generateGestureFixture('PEACE_SIGN');
    const samples1: CustomGestureSample[] = [0, 1, 2, 3, 4].map((idx) => ({
      id: `s_spock_${idx}`,
      gestureId: 'CUSTOM_SPOCK',
      gestureLabel: 'Spock Vulcan Salute',
      landmarks: base1.map((pt) => ({
        x: pt.x + (idx * 0.002),
        y: pt.y - (idx * 0.001),
        z: pt.z,
      })),
      handedness: 'Right',
      timestamp: 1000 + idx * 100,
    }));

    // Generate training samples for gesture 2
    const base2 = generateGestureFixture('THREE_FINGERS');
    const samples2: CustomGestureSample[] = [0, 1, 2, 3, 4].map((idx) => ({
      id: `s_three_${idx}`,
      gestureId: 'CUSTOM_THREE_FINGER',
      gestureLabel: 'Rebel Salute',
      landmarks: base2.map((pt) => ({
        x: pt.x + (idx * 0.002),
        y: pt.y + (idx * 0.001),
        z: pt.z,
      })),
      handedness: 'Any',
      timestamp: 2000 + idx * 100,
    }));

    samples = [...samples1, ...samples2];
    classifier.train(customGestures, samples);
  });

  it('accurately classifies matching test landmark vectors', () => {
    const testSpock = generateGestureFixture('PEACE_SIGN');
    const resSpock = classifier.classify(testSpock, 'Right', 0.75);

    expect(resSpock.isMatch).toBe(true);
    expect(resSpock.gestureId).toBe('CUSTOM_SPOCK');
    expect(resSpock.confidence).toBeGreaterThanOrEqual(0.75);

    const testThree = generateGestureFixture('THREE_FINGERS');
    const resThree = classifier.classify(testThree, 'Left', 0.75);

    expect(resThree.isMatch).toBe(true);
    expect(resThree.gestureId).toBe('CUSTOM_THREE_FINGER');
  });

  it('rejects non-matching gestures cleanly as UNKNOWN without false positives', () => {
    // Closed fist has not been registered as a custom gesture
    const fist = generateGestureFixture('CLOSED_FIST');
    const result = classifier.classify(fist, 'Right', 0.75);

    expect(result.isMatch).toBe(false);
    expect(result.gestureId).toBeNull();
  });

  it('enforces handedness constraints during classification', () => {
    // CUSTOM_SPOCK was configured strictly for 'Right' hand
    const testSpock = generateGestureFixture('PEACE_SIGN');
    const resultLeft = classifier.classify(testSpock, 'Left', 0.75);

    expect(resultLeft.isMatch).toBe(false);
    expect(resultLeft.gestureId).toBeNull();
  });

  it('evaluates Leave-One-Out Cross-Validation with empirical accuracy metrics', () => {
    const report = classifier.evaluateCrossValidation();

    expect(report.totalSamples).toBe(10);
    expect(report.classesCount).toBe(2);
    expect(report.accuracyPercent).toBeGreaterThanOrEqual(80);
    expect(report.confusionMatrix['CUSTOM_SPOCK']).toBeDefined();
    expect(report.confusionMatrix['CUSTOM_THREE_FINGER']).toBeDefined();
  });
});

describe('Goofy Model V7: Advanced Temporal Sequence Engine', () => {
  let sequenceEngine: GoofySequenceEngine;

  const testSequences: GestureSequenceDefinition[] = [
    {
      id: 'SEQ_CUSTOM_TEST',
      label: 'CUSTOM SEQUENCE',
      description: 'Thumbs Up to Peace to Pinch',
      steps: ['THUMBS_UP', 'PEACE_SIGN', 'PINCH'],
      stepHands: ['Right', 'Right', 'Right'],
      maxWindowMs: 2500,
      defaultMemeId: 'REAL_MEME_GIGACHAD',
      defaultSoundId: 'CHAD_GONG',
      defaultCaption: 'COMBO UNLOCKED',
      icon: '🔥',
    },
    {
      id: 'SEQ_DUAL_HANDED',
      label: 'LEFT TO RIGHT',
      description: 'Left Open Palm then Right Fist',
      steps: ['OPEN_PALM', 'CLOSED_FIST'],
      stepHands: ['Left', 'Right'],
      maxWindowMs: 2000,
      defaultMemeId: 'REAL_MEME_SUCCESS_KID_GIF',
      defaultSoundId: 'VICTORY_BELL',
      defaultCaption: 'HAND EXCHANGE',
      icon: '⚡',
    },
  ];

  beforeEach(() => {
    sequenceEngine = new GoofySequenceEngine(testSequences, 1000);
  });

  it('advances through sequence steps and triggers upon final step', () => {
    let res = sequenceEngine.processGesture('THUMBS_UP', 'Right', 1000);
    expect(res.triggered).toBe(false);
    expect(res.progressPercent).toBe(33);

    res = sequenceEngine.processGesture('PEACE_SIGN', 'Right', 1500);
    expect(res.triggered).toBe(false);
    expect(res.progressPercent).toBe(67);

    res = sequenceEngine.processGesture('PINCH', 'Right', 2000);
    expect(res.triggered).toBe(true);
    expect(res.sequence?.id).toBe('SEQ_CUSTOM_TEST');
  });

  it('debounces continuous identical gestures within 380ms', () => {
    let res = sequenceEngine.processGesture('THUMBS_UP', 'Right', 1000);
    expect(res.progressPercent).toBe(33);

    // Frame 2, 50ms later with same gesture on same hand
    res = sequenceEngine.processGesture('THUMBS_UP', 'Right', 1050);
    // Should NOT advance to step 2
    expect(res.progressPercent).toBe(33);
  });

  it('resets sequence progression when step window expires', () => {
    let res = sequenceEngine.processGesture('THUMBS_UP', 'Right', 1000);
    expect(res.progressPercent).toBe(33);

    // 3500ms later (exceeds 2500ms maxWindowMs)
    res = sequenceEngine.processGesture('PEACE_SIGN', 'Right', 4500);
    // Should fail to advance sequence step 2
    expect(res.triggered).toBe(false);
  });

  it('tolerates momentary tracking loss without resetting sequence progress', () => {
    sequenceEngine.processGesture('THUMBS_UP', 'Right', 1000);

    // Hand momentarily lost for 300ms (flick or motion blur)
    sequenceEngine.notifyTrackingLoss(1100);

    // Restored within 750ms grace window
    const state = sequenceEngine.getActiveState(1300);
    expect(state).not.toBeNull();
    expect(state?.currentStepIndex).toBe(1);

    // Sequence can still complete
    const res = sequenceEngine.processGesture('PEACE_SIGN', 'Right', 1400);
    expect(res.progressPercent).toBe(67);
  });

  it('enforces handedness per step', () => {
    // Step 1 expects 'Left'
    let res = sequenceEngine.processGesture('OPEN_PALM', 'Right', 1000);
    expect(res.progressPercent).toBe(0); // Right hand should not advance Step 1

    res = sequenceEngine.processGesture('OPEN_PALM', 'Left', 1100);
    expect(res.progressPercent).toBe(50); // Left hand advances Step 1

    // Step 2 expects 'Right'
    res = sequenceEngine.processGesture('CLOSED_FIST', 'Right', 1600);
    expect(res.triggered).toBe(true);
    expect(res.sequence?.id).toBe('SEQ_DUAL_HANDED');
  });
});

describe('Goofy Model V7: Intelligent Reaction Combos', () => {
  let eventEngine: GoofyEventEngine;
  let audioEngine: GoofyAudioEngine;
  let visualFx: GoofyVisualFXEngine;

  beforeEach(() => {
    audioEngine = new GoofyAudioEngine();
    visualFx = new GoofyVisualFXEngine();
    eventEngine = new GoofyEventEngine(DEFAULT_GOOFY_CONFIG, audioEngine, visualFx);
  });

  it('dispatches intelligent reaction combo triggers with correct telemetry source', () => {
    const combo: IntelligentReactionCombo = {
      id: 'COMBO_TEST_SUPER',
      name: 'SUPER COMBO',
      firstAction: 'OPEN_PALM',
      secondAction: 'PINCH',
      windowMs: 2500,
      assignedMemeId: 'REAL_MEME_GIGACHAD',
      assignedSoundId: 'CHAD_GONG',
      caption: 'TEST COMBO SUCCESSFUL',
      enabled: true,
    };

    const event = eventEngine.dispatchReactionComboTrigger(combo, 0.99);
    expect(event).not.toBeNull();
    expect(event?.source).toBe('REACTION_COMBO');
    expect(event?.actionId).toBe('COMBO_TEST_SUPER');
  });
});

describe('Goofy Model V7: JSON Export & Import Schema Validation', () => {
  it('exports valid V7 JSON schema with gestures, sequences and mappings', async () => {
    const jsonStr = await exportV7FullLibrary(DEFAULT_GOOFY_CONFIG);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.version).toBe('7.0.0');
    expect(parsed.system).toBe('OmniLocoGoofyModel');
    expect(Array.isArray(parsed.customGestures)).toBe(true);
    expect(Array.isArray(parsed.samples)).toBe(true);
    expect(Array.isArray(parsed.customSequences)).toBe(true);
    expect(typeof parsed.actionMemeMappings).toBe('object');
  });

  it('validates and safely imports V7 JSON without crashes', async () => {
    const testImportPayload = {
      version: '7.0.0',
      exportedAt: new Date().toISOString(),
      system: 'OmniLocoGoofyModel',
      customGestures: [
        {
          id: 'IMPORTED_GESTURE_1',
          name: 'Imported Gesture One',
          label: 'Imported Gesture One',
          description: 'Test import',
          icon: '✨',
          handedness: 'Right',
          minConfidence: 0.8,
          minHoldMs: 180,
          sampleCount: 0,
          assignedMemeId: 'REAL_MEME_GIGACHAD',
          assignedSoundId: 'CHAD_GONG',
          customCaption: 'IMPORTED SUCCESS',
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      samples: [],
      customSequences: [
        {
          id: 'IMPORTED_SEQ_1',
          label: 'IMPORTED SEQUENCE',
          description: 'Sequence test',
          steps: ['THUMBS_UP', 'PEACE_SIGN'],
          maxWindowMs: 2000,
          defaultMemeId: 'REAL_MEME_GIGACHAD',
          defaultSoundId: 'CHAD_GONG',
          defaultCaption: 'IMPORTED SEQUENCE CAPTION',
          icon: '🔥',
        },
      ],
      actionMemeMappings: {
        IMPORTED_GESTURE_1: 'REAL_MEME_GIGACHAD',
      },
    };

    const res = await importV7FullLibrary(JSON.stringify(testImportPayload));
    expect(res.success).toBe(true);
    expect(res.gesturesImported).toBe(1);
    expect(res.sequencesImported).toBe(1);
  });

  it('rejects corrupted or non-JSON imports with descriptive error', async () => {
    const res = await importV7FullLibrary('{ corrupt json ...');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
