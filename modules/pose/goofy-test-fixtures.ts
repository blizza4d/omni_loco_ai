import { Landmark3D } from '../hand/types';
import { GoofyHandGestureType } from './goofy-types';
import { GoofyHandClassifier } from './goofy-hand-classifier';

/**
 * Creates a base 21-point hand landmark array with all fingers extended.
 */
export function createBaseHandLandmarks(): Landmark3D[] {
  const lm: Landmark3D[] = [];
  const wx = 0.5;
  const wy = 0.7;

  // 0: Wrist
  lm.push({ x: wx, y: wy, z: 0 });

  // 1-4: Thumb (CMC, MCP, IP, TIP) - extended diagonally
  lm.push({ x: wx - 0.04, y: wy - 0.05, z: 0 });
  lm.push({ x: wx - 0.08, y: wy - 0.09, z: 0 });
  lm.push({ x: wx - 0.12, y: wy - 0.13, z: 0 });
  lm.push({ x: wx - 0.15, y: wy - 0.16, z: 0 });

  // 5-8: Index (MCP, PIP, DIP, TIP) - extended straight up
  lm.push({ x: wx - 0.04, y: wy - 0.12, z: 0 });
  lm.push({ x: wx - 0.05, y: wy - 0.18, z: 0 });
  lm.push({ x: wx - 0.05, y: wy - 0.22, z: 0 });
  lm.push({ x: wx - 0.05, y: wy - 0.28, z: 0 });

  // 9-12: Middle (MCP, PIP, DIP, TIP) - extended straight up
  lm.push({ x: wx, y: wy - 0.13, z: 0 });
  lm.push({ x: wx, y: wy - 0.19, z: 0 });
  lm.push({ x: wx, y: wy - 0.25, z: 0 });
  lm.push({ x: wx, y: wy - 0.31, z: 0 });

  // 13-16: Ring (MCP, PIP, DIP, TIP) - extended straight up
  lm.push({ x: wx + 0.04, y: wy - 0.12, z: 0 });
  lm.push({ x: wx + 0.04, y: wy - 0.18, z: 0 });
  lm.push({ x: wx + 0.04, y: wy - 0.23, z: 0 });
  lm.push({ x: wx + 0.04, y: wy - 0.29, z: 0 });

  // 17-20: Pinky (MCP, PIP, DIP, TIP) - extended straight up
  lm.push({ x: wx + 0.07, y: wy - 0.10, z: 0 });
  lm.push({ x: wx + 0.08, y: wy - 0.15, z: 0 });
  lm.push({ x: wx + 0.08, y: wy - 0.20, z: 0 });
  lm.push({ x: wx + 0.09, y: wy - 0.25, z: 0 });

  return lm;
}

/**
 * Curls a finger by collapsing DIP and TIP joints into the palm near the MCP.
 */
export function curlFinger(
  lm: Landmark3D[],
  mcpIdx: number,
  pipIdx: number,
  dipIdx: number,
  tipIdx: number
): void {
  const mcp = lm[mcpIdx]!;
  lm[dipIdx] = { x: mcp.x, y: mcp.y - 0.03, z: 0.02 };
  lm[tipIdx] = { x: mcp.x, y: mcp.y - 0.01, z: 0.04 };
}

/**
 * Generates an anatomically valid canonical 21-point hand landmark fixture
 * for any of the 12 supported Goofy hand gestures.
 */
export function generateGestureFixture(
  gesture: GoofyHandGestureType,
  handedness: 'Left' | 'Right' = 'Right'
): Landmark3D[] {
  const lm = createBaseHandLandmarks();
  const wx = 0.5;
  const wy = 0.7;

  switch (gesture) {
    case 'THUMBS_UP': {
      // 4 fingers curled into palm
      curlFinger(lm, 5, 6, 7, 8);
      curlFinger(lm, 9, 10, 11, 12);
      curlFinger(lm, 13, 14, 15, 16);
      curlFinger(lm, 17, 18, 19, 20);
      // Thumb extended straight up
      lm[1] = { x: wx - 0.02, y: wy - 0.06, z: 0 };
      lm[2] = { x: wx - 0.02, y: wy - 0.12, z: 0 };
      lm[3] = { x: wx - 0.02, y: wy - 0.18, z: 0 };
      lm[4] = { x: wx - 0.02, y: wy - 0.25, z: 0 };
      break;
    }

    case 'THUMBS_DOWN': {
      // 4 fingers curled into palm
      curlFinger(lm, 5, 6, 7, 8);
      curlFinger(lm, 9, 10, 11, 12);
      curlFinger(lm, 13, 14, 15, 16);
      curlFinger(lm, 17, 18, 19, 20);
      // Thumb extended straight down below wrist
      lm[1] = { x: wx - 0.02, y: wy + 0.04, z: 0 };
      lm[2] = { x: wx - 0.02, y: wy + 0.10, z: 0 };
      lm[3] = { x: wx - 0.02, y: wy + 0.15, z: 0 };
      lm[4] = { x: wx - 0.02, y: wy + 0.22, z: 0 };
      break;
    }

    case 'CLOSED_FIST': {
      // All 5 digits curled tightly into palm
      curlFinger(lm, 5, 6, 7, 8);
      curlFinger(lm, 9, 10, 11, 12);
      curlFinger(lm, 13, 14, 15, 16);
      curlFinger(lm, 17, 18, 19, 20);
      // Thumb wrapped across curled fingers
      lm[1] = { x: wx - 0.03, y: wy - 0.05, z: 0 };
      lm[2] = { x: wx - 0.01, y: wy - 0.08, z: 0.03 };
      lm[3] = { x: wx + 0.01, y: wy - 0.08, z: 0.04 };
      lm[4] = { x: wx + 0.02, y: wy - 0.07, z: 0.05 };
      break;
    }

    case 'PINCH': {
      // Index and thumb tips close together, middle/ring/pinky extended or relaxed
      // Index tip at (0.45, 0.55)
      lm[5] = { x: wx - 0.03, y: wy - 0.12, z: 0 };
      lm[6] = { x: wx - 0.04, y: wy - 0.17, z: 0.01 };
      lm[7] = { x: wx - 0.04, y: wy - 0.20, z: 0.02 };
      lm[8] = { x: wx - 0.05, y: wy - 0.21, z: 0.02 };
      // Thumb tip meeting index tip
      lm[1] = { x: wx - 0.04, y: wy - 0.05, z: 0 };
      lm[2] = { x: wx - 0.06, y: wy - 0.11, z: 0.01 };
      lm[3] = { x: wx - 0.06, y: wy - 0.17, z: 0.01 };
      lm[4] = { x: wx - 0.052, y: wy - 0.208, z: 0.02 };
      break;
    }

    case 'PEACE_SIGN': {
      // Index and middle extended, ring and pinky curled, thumb tucked
      curlFinger(lm, 13, 14, 15, 16);
      curlFinger(lm, 17, 18, 19, 20);
      lm[4] = { x: wx - 0.01, y: wy - 0.08, z: 0.03 }; // thumb tucked
      // Spread index and middle slightly
      lm[8] = { x: wx - 0.08, y: wy - 0.28, z: 0 };
      lm[12] = { x: wx + 0.04, y: wy - 0.28, z: 0 };
      break;
    }

    case 'POINTING': {
      // Index extended straight, middle/ring/pinky curled, thumb tucked
      curlFinger(lm, 9, 10, 11, 12);
      curlFinger(lm, 13, 14, 15, 16);
      curlFinger(lm, 17, 18, 19, 20);
      lm[4] = { x: wx - 0.01, y: wy - 0.08, z: 0.03 }; // thumb tucked
      break;
    }

    case 'THREE_FINGERS': {
      // Index, middle, ring extended; pinky curled, thumb tucked
      curlFinger(lm, 17, 18, 19, 20);
      lm[2] = { x: wx - 0.02, y: wy - 0.06, z: 0 };
      lm[3] = { x: wx, y: wy - 0.07, z: 0.02 };
      lm[4] = { x: wx + 0.02, y: wy - 0.07, z: 0.03 }; // thumb tucked across palm
      break;
    }

    case 'FOUR_FINGERS': {
      // Index, middle, ring, pinky extended; thumb tucked
      lm[2] = { x: wx - 0.02, y: wy - 0.06, z: 0 };
      lm[3] = { x: wx, y: wy - 0.07, z: 0.02 };
      lm[4] = { x: wx + 0.02, y: wy - 0.07, z: 0.03 }; // thumb tucked across palm
      break;
    }

    case 'FIVE_FINGERS': {
      // All 5 digits extended with wide lateral separation
      lm[4] = { x: wx - 0.16, y: wy - 0.18, z: 0 };
      lm[8] = { x: wx - 0.08, y: wy - 0.28, z: 0 };
      lm[12] = { x: wx, y: wy - 0.31, z: 0 };
      lm[13] = { x: wx + 0.06, y: wy - 0.12, z: 0 };
      lm[16] = { x: wx + 0.08, y: wy - 0.29, z: 0 };
      lm[17] = { x: wx + 0.10, y: wy - 0.10, z: 0 };
      lm[20] = { x: wx + 0.14, y: wy - 0.25, z: 0 };
      break;
    }

    case 'OPEN_PALM': {
      // Flat open palm with moderate spread
      lm[4] = { x: wx - 0.13, y: wy - 0.16, z: 0 };
      lm[8] = { x: wx - 0.04, y: wy - 0.27, z: 0 };
      lm[12] = { x: wx, y: wy - 0.29, z: 0 };
      lm[16] = { x: wx + 0.04, y: wy - 0.27, z: 0 };
      lm[20] = { x: wx + 0.07, y: wy - 0.23, z: 0 };
      break;
    }

    case 'ROCK_SIGN': {
      // Index and pinky extended straight, middle and ring curled tightly into palm
      curlFinger(lm, 9, 10, 11, 12);
      curlFinger(lm, 13, 14, 15, 16);
      lm[4] = { x: wx - 0.01, y: wy - 0.08, z: 0.03 }; // thumb tucked across curled fingers
      break;
    }

    case 'OK_GESTURE': {
      // Middle, ring, pinky extended straight up
      // Index and thumb tips touching in an arch loop (index tip curled down towards thumb)
      lm[5] = { x: wx - 0.03, y: wy - 0.12, z: 0 };
      lm[6] = { x: wx - 0.04, y: wy - 0.16, z: 0.01 };
      lm[7] = { x: wx - 0.05, y: wy - 0.14, z: 0.02 };
      lm[8] = { x: wx - 0.05, y: wy - 0.12, z: 0.02 };
      lm[1] = { x: wx - 0.04, y: wy - 0.05, z: 0 };
      lm[2] = { x: wx - 0.06, y: wy - 0.08, z: 0.01 };
      lm[3] = { x: wx - 0.06, y: wy - 0.10, z: 0.01 };
      lm[4] = { x: wx - 0.052, y: wy - 0.118, z: 0.02 };
      break;
    }

    case 'CALL_ME': {
      // Thumb extended wide, pinky extended straight, index, middle, ring curled tightly
      curlFinger(lm, 5, 6, 7, 8);
      curlFinger(lm, 9, 10, 11, 12);
      curlFinger(lm, 13, 14, 15, 16);
      lm[1] = { x: wx - 0.04, y: wy - 0.05, z: 0 };
      lm[2] = { x: wx - 0.08, y: wy - 0.08, z: 0 };
      lm[3] = { x: wx - 0.12, y: wy - 0.11, z: 0 };
      lm[4] = { x: wx - 0.17, y: wy - 0.14, z: 0 };
      break;
    }

    case 'FINGER_HEART': {
      // Middle, ring, pinky curled into palm
      curlFinger(lm, 9, 10, 11, 12);
      curlFinger(lm, 13, 14, 15, 16);
      curlFinger(lm, 17, 18, 19, 20);
      // Index bent at DIP/PIP, thumb crossed over index tip in micro-pinch
      lm[5] = { x: wx - 0.03, y: wy - 0.10, z: 0 };
      lm[6] = { x: wx - 0.04, y: wy - 0.13, z: 0.01 };
      lm[7] = { x: wx - 0.04, y: wy - 0.14, z: 0.02 };
      lm[8] = { x: wx - 0.04, y: wy - 0.14, z: 0.02 };
      lm[1] = { x: wx - 0.03, y: wy - 0.05, z: 0 };
      lm[2] = { x: wx - 0.04, y: wy - 0.08, z: 0.01 };
      lm[3] = { x: wx - 0.04, y: wy - 0.11, z: 0.01 };
      lm[4] = { x: wx - 0.04, y: wy - 0.135, z: 0.02 };
      break;
    }

    case 'THREE_FINGER_SALUTE': {
      // Pinky curled, thumb tucked across palm
      curlFinger(lm, 17, 18, 19, 20);
      lm[2] = { x: wx - 0.02, y: wy - 0.06, z: 0 };
      lm[3] = { x: wx, y: wy - 0.07, z: 0.02 };
      lm[4] = { x: wx + 0.02, y: wy - 0.07, z: 0.03 };
      // Index, middle, ring straight and held parallel together
      lm[5] = { x: wx - 0.02, y: wy - 0.12, z: 0 };
      lm[6] = { x: wx - 0.02, y: wy - 0.18, z: 0 };
      lm[7] = { x: wx - 0.02, y: wy - 0.23, z: 0 };
      lm[8] = { x: wx - 0.02, y: wy - 0.29, z: 0 };
      lm[9] = { x: wx, y: wy - 0.13, z: 0 };
      lm[10] = { x: wx, y: wy - 0.19, z: 0 };
      lm[11] = { x: wx, y: wy - 0.25, z: 0 };
      lm[12] = { x: wx, y: wy - 0.31, z: 0 };
      lm[13] = { x: wx + 0.02, y: wy - 0.12, z: 0 };
      lm[14] = { x: wx + 0.02, y: wy - 0.18, z: 0 };
      lm[15] = { x: wx + 0.02, y: wy - 0.23, z: 0 };
      lm[16] = { x: wx + 0.02, y: wy - 0.29, z: 0 };
      break;
    }

    case 'SWIPE_LEFT':
    case 'SWIPE_RIGHT': {
      // Return base hand, temporal sequence tested via benchmark function
      break;
    }
  }

  // Adjust for left hand if needed
  if (handedness === 'Left') {
    for (let i = 0; i < lm.length; i++) {
      const p = lm[i]!;
      lm[i] = { x: 1 - p.x, y: p.y, z: p.z };
    }
  }

  return lm;
}

export interface BenchmarkReport {
  total: number;
  passed: number;
  accuracy: number;
  results: {
    gesture: GoofyHandGestureType;
    expected: GoofyHandGestureType;
    predicted: GoofyHandGestureType | null;
    status: 'PASS' | 'FAIL';
    confidence: number;
    latencyMs: number;
    notes: string;
  }[];
}

/**
 * Rotates a landmark array in the XY plane by angleDeg around landmark[centerIdx]
 */
export function rotateLandmarks(
  lm: Landmark3D[],
  angleDeg: number,
  centerIdx = 0
): Landmark3D[] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = lm[centerIdx]?.x ?? 0.5;
  const cy = lm[centerIdx]?.y ?? 0.7;

  return lm.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: cx + (dx * cos - dy * sin),
      y: cy + (dx * sin + dy * cos),
      z: p.z,
    };
  });
}

/**
 * Scales a landmark array relative to landmark[centerIdx]
 */
export function scaleLandmarks(
  lm: Landmark3D[],
  factor: number,
  centerIdx = 0
): Landmark3D[] {
  const cx = lm[centerIdx]?.x ?? 0.5;
  const cy = lm[centerIdx]?.y ?? 0.7;

  return lm.map((p) => ({
    x: cx + (p.x - cx) * factor,
    y: cy + (p.y - cy) * factor,
    z: p.z !== undefined ? p.z * factor : 0,
  }));
}

/**
 * Generates an ambiguous or unknown hand posture to verify strict unknown-rejection performance
 */
export function generateAmbiguousFixture(
  type: 'HORIZONTAL_THUMB' | 'CLOSED_TWO_FINGERS' | 'LOOSE_HAND' | 'HALF_CURLED_FIST'
): Landmark3D[] {
  const lm = createBaseHandLandmarks();
  const wx = 0.5;
  const wy = 0.7;

  switch (type) {
    case 'HORIZONTAL_THUMB': {
      // 4 fingers curled into palm, thumb pointing sideways horizontally (dx = 0.18, dy = 0.01)
      curlFinger(lm, 5, 6, 7, 8);
      curlFinger(lm, 9, 10, 11, 12);
      curlFinger(lm, 13, 14, 15, 16);
      curlFinger(lm, 17, 18, 19, 20);
      lm[1] = { x: wx - 0.04, y: wy - 0.05, z: 0 };
      lm[2] = { x: wx - 0.09, y: wy - 0.05, z: 0 };
      lm[3] = { x: wx - 0.14, y: wy - 0.05, z: 0 };
      lm[4] = { x: wx - 0.20, y: wy - 0.05, z: 0 }; // purely horizontal thumb!
      break;
    }
    case 'CLOSED_TWO_FINGERS': {
      // Index and middle extended, but pressed tightly together (tips touching, no V shape)
      curlFinger(lm, 13, 14, 15, 16);
      curlFinger(lm, 17, 18, 19, 20);
      lm[4] = { x: wx - 0.01, y: wy - 0.08, z: 0.03 };
      lm[8] = { x: wx - 0.01, y: wy - 0.28, z: 0 };
      lm[12] = { x: wx + 0.01, y: wy - 0.28, z: 0 }; // distance = 0.02 (tightly closed)
      break;
    }
    case 'LOOSE_HAND': {
      // All fingers half-curled at 60 degrees (neither extended straight nor curled into fist)
      for (const [mcpIdx, pipIdx, dipIdx, tipIdx] of [
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
        [17, 18, 19, 20],
      ]) {
        const mcp = lm[mcpIdx]!;
        lm[pipIdx] = { x: mcp.x, y: mcp.y - 0.07, z: 0 };
        lm[dipIdx] = { x: mcp.x, y: mcp.y - 0.10, z: 0.05 };
        lm[tipIdx] = { x: mcp.x, y: mcp.y - 0.09, z: 0.08 };
      }
      break;
    }
    case 'HALF_CURLED_FIST': {
      // Loose claw/fist
      for (const [mcpIdx, pipIdx, dipIdx, tipIdx] of [
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
        [17, 18, 19, 20],
      ]) {
        const mcp = lm[mcpIdx]!;
        lm[dipIdx] = { x: mcp.x, y: mcp.y - 0.07, z: 0.05 };
        lm[tipIdx] = { x: mcp.x, y: mcp.y - 0.05, z: 0.07 };
      }
      break;
    }
  }

  return lm;
}

export interface ClassEvaluationMetric {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface DetailedEvaluationReport {
  totalSamples: number;
  correctPredictions: number;
  overallAccuracy: number;
  unknownRejectionRate: number;
  perClassMetrics: Record<string, ClassEvaluationMetric>;
  confusionMatrix: Record<string, Record<string, number>>;
  breakdown: {
    datasetSubset: string;
    samples: number;
    accuracy: number;
  }[];
}

/**
 * Runs a comprehensive multi-variation evaluation dataset (canonical, left/right,
 * rotated +-15 deg, scaled 0.8x/1.2x, ambiguous rejection) and produces a full confusion matrix.
 */
export function runFullDatasetEvaluation(
  classifier: GoofyHandClassifier
): DetailedEvaluationReport {
  const staticGestures: GoofyHandGestureType[] = [
    'THUMBS_UP',
    'THUMBS_DOWN',
    'CLOSED_FIST',
    'OPEN_PALM',
    'PEACE_SIGN',
    'POINTING',
    'PINCH',
    'THREE_FINGERS',
    'FOUR_FINGERS',
    'FIVE_FINGERS',
    'ROCK_SIGN',
    'OK_GESTURE',
    'CALL_ME',
    'FINGER_HEART',
    'THREE_FINGER_SALUTE',
  ];

  const allClasses = [...staticGestures, 'SWIPE_LEFT', 'SWIPE_RIGHT', 'UNKNOWN'];
  const confusionMatrix: Record<string, Record<string, number>> = {};
  for (const exp of allClasses) {
    confusionMatrix[exp] = {};
    for (const pred of allClasses) {
      confusionMatrix[exp]![pred] = 0;
    }
  }

  let totalCount = 0;
  let correctCount = 0;

  // 1. Canonical Right and Left Hand Samples
  let canonicalRightCorrect = 0;
  let canonicalLeftCorrect = 0;

  for (const g of staticGestures) {
    // Right hand
    classifier.reset();
    const fixR = generateGestureFixture(g, 'Right');
    const resR = classifier.classify(fixR, 'Right', 1000);
    const predR = resR.gesture || 'UNKNOWN';
    confusionMatrix[g]![predR] = (confusionMatrix[g]![predR] || 0) + 1;
    totalCount++;
    if (predR === g) {
      correctCount++;
      canonicalRightCorrect++;
    }

    // Left hand
    classifier.reset();
    const fixL = generateGestureFixture(g, 'Left');
    const resL = classifier.classify(fixL, 'Left', 1000);
    const predL = resL.gesture || 'UNKNOWN';
    confusionMatrix[g]![predL] = (confusionMatrix[g]![predL] || 0) + 1;
    totalCount++;
    if (predL === g) {
      correctCount++;
      canonicalLeftCorrect++;
    }
  }

  // 2. Rotated variations (+15 deg, -15 deg)
  let rotatedCorrect = 0;
  let rotatedTotal = 0;
  for (const angle of [-15, 15]) {
    for (const g of staticGestures) {
      classifier.reset();
      const base = generateGestureFixture(g, 'Right');
      const rotated = rotateLandmarks(base, angle);
      const res = classifier.classify(rotated, 'Right', 1000);
      const pred = res.gesture || 'UNKNOWN';
      confusionMatrix[g]![pred] = (confusionMatrix[g]![pred] || 0) + 1;
      totalCount++;
      rotatedTotal++;
      if (pred === g) {
        correctCount++;
        rotatedCorrect++;
      }
    }
  }

  // 3. Scaled variations (0.85x, 1.18x)
  let scaledCorrect = 0;
  let scaledTotal = 0;
  for (const scale of [0.85, 1.18]) {
    for (const g of staticGestures) {
      classifier.reset();
      const base = generateGestureFixture(g, 'Right');
      const scaled = scaleLandmarks(base, scale);
      const res = classifier.classify(scaled, 'Right', 1000);
      const pred = res.gesture || 'UNKNOWN';
      confusionMatrix[g]![pred] = (confusionMatrix[g]![pred] || 0) + 1;
      totalCount++;
      scaledTotal++;
      if (pred === g) {
        correctCount++;
        scaledCorrect++;
      }
    }
  }

  // 4. Dynamic Swipes
  let swipeCorrect = 0;
  {
    // SWIPE_RIGHT
    classifier.reset();
    const t0 = 1000;
    const h1 = createBaseHandLandmarks();
    h1[0] = { x: 0.30, y: 0.50, z: 0 };
    classifier.classify(h1, 'Right', t0);
    const h2 = createBaseHandLandmarks();
    h2[0] = { x: 0.45, y: 0.50, z: 0 };
    classifier.classify(h2, 'Right', t0 + 50);
    const h3 = createBaseHandLandmarks();
    h3[0] = { x: 0.65, y: 0.50, z: 0 };
    const resR = classifier.classify(h3, 'Right', t0 + 100);
    const predR = resR.gesture || 'UNKNOWN';
    confusionMatrix['SWIPE_RIGHT']![predR] = (confusionMatrix['SWIPE_RIGHT']![predR] || 0) + 1;
    totalCount++;
    if (predR === 'SWIPE_RIGHT') {
      correctCount++;
      swipeCorrect++;
    }

    // SWIPE_LEFT
    classifier.reset();
    const h4 = createBaseHandLandmarks();
    h4[0] = { x: 0.70, y: 0.50, z: 0 };
    classifier.classify(h4, 'Right', t0);
    const h5 = createBaseHandLandmarks();
    h5[0] = { x: 0.55, y: 0.50, z: 0 };
    classifier.classify(h5, 'Right', t0 + 50);
    const h6 = createBaseHandLandmarks();
    h6[0] = { x: 0.35, y: 0.50, z: 0 };
    const resL = classifier.classify(h6, 'Right', t0 + 100);
    const predL = resL.gesture || 'UNKNOWN';
    confusionMatrix['SWIPE_LEFT']![predL] = (confusionMatrix['SWIPE_LEFT']![predL] || 0) + 1;
    totalCount++;
    if (predL === 'SWIPE_LEFT') {
      correctCount++;
      swipeCorrect++;
    }
  }

  // 5. Ambiguous / Unknown Gestures (Should be rejected as UNKNOWN / null)
  let unknownRejected = 0;
  const ambiguousTypes: ('HORIZONTAL_THUMB' | 'CLOSED_TWO_FINGERS' | 'LOOSE_HAND' | 'HALF_CURLED_FIST')[] = [
    'HORIZONTAL_THUMB',
    'CLOSED_TWO_FINGERS',
    'LOOSE_HAND',
    'HALF_CURLED_FIST',
  ];
  for (const amb of ambiguousTypes) {
    classifier.reset();
    const fix = generateAmbiguousFixture(amb);
    const res = classifier.classify(fix, 'Right', 1000);
    const pred = res.gesture || 'UNKNOWN';
    confusionMatrix['UNKNOWN']![pred] = (confusionMatrix['UNKNOWN']![pred] || 0) + 1;
    totalCount++;
    if (pred === 'UNKNOWN') {
      correctCount++;
      unknownRejected++;
    }
  }

  // Calculate Precision, Recall, and F1 per class
  const perClassMetrics: Record<string, ClassEvaluationMetric> = {};
  for (const c of allClasses) {
    const tp = confusionMatrix[c]?.[c] || 0;
    let fp = 0;
    let fn = 0;
    for (const exp of allClasses) {
      if (exp !== c) fp += confusionMatrix[exp]?.[c] || 0;
    }
    for (const pred of allClasses) {
      if (pred !== c) fn += confusionMatrix[c]?.[pred] || 0;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 1;

    perClassMetrics[c] = {
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1Score: Math.round(f1Score * 1000) / 1000,
    };
  }

  return {
    totalSamples: totalCount,
    correctPredictions: correctCount,
    overallAccuracy: Math.round((correctCount / totalCount) * 1000) / 10,
    unknownRejectionRate: Math.round((unknownRejected / ambiguousTypes.length) * 100),
    perClassMetrics,
    confusionMatrix,
    breakdown: [
      { datasetSubset: 'Canonical Right Hand (10)', samples: 10, accuracy: (canonicalRightCorrect / 10) * 100 },
      { datasetSubset: 'Canonical Left Hand (10)', samples: 10, accuracy: (canonicalLeftCorrect / 10) * 100 },
      { datasetSubset: 'Rotated Poses ±15° (20)', samples: rotatedTotal, accuracy: (rotatedCorrect / rotatedTotal) * 100 },
      { datasetSubset: 'Scaled Distances 0.85x-1.18x (20)', samples: scaledTotal, accuracy: (scaledCorrect / scaledTotal) * 100 },
      { datasetSubset: 'Dynamic Swipes (2)', samples: 2, accuracy: (swipeCorrect / 2) * 100 },
      { datasetSubset: 'Ambiguous Unknown Rejection (4)', samples: 4, accuracy: (unknownRejected / 4) * 100 },
    ],
  };
}

/**
 * Runs a pure, client-side deterministic benchmark of all 12 Goofy Hand Gestures
 * against canonical 21-point geometric fixtures.
 */
export function runComprehensiveGestureBenchmark(
  classifier: GoofyHandClassifier
): BenchmarkReport {
  const staticGestures: GoofyHandGestureType[] = [
    'THUMBS_UP',
    'THUMBS_DOWN',
    'CLOSED_FIST',
    'OPEN_PALM',
    'PEACE_SIGN',
    'POINTING',
    'PINCH',
    'THREE_FINGERS',
    'FOUR_FINGERS',
    'FIVE_FINGERS',
    'ROCK_SIGN',
    'OK_GESTURE',
    'CALL_ME',
    'FINGER_HEART',
    'THREE_FINGER_SALUTE',
  ];

  const results: BenchmarkReport['results'] = [];
  let passedCount = 0;

  // 1. Evaluate Static Gestures
  for (const g of staticGestures) {
    classifier.reset();
    const fixture = generateGestureFixture(g, 'Right');
    const start = performance.now();
    const res = classifier.classify(fixture, 'Right', 1000);
    const latency = performance.now() - start;

    const isMatch = res.gesture === g;
    if (isMatch) passedCount++;

    results.push({
      gesture: g,
      expected: g,
      predicted: res.gesture,
      status: isMatch ? 'PASS' : 'FAIL',
      confidence: res.confidence,
      latencyMs: Math.round(latency * 100) / 100,
      notes: isMatch
        ? `Confirmed with ${(res.confidence * 100).toFixed(0)}% confidence (${res.label})`
        : `Misclassified as ${res.gesture || 'UNKNOWN'}: ${res.rejectionReason || 'low confidence'}`,
    });
  }

  // 2. Evaluate Dynamic SWIPE_RIGHT
  {
    classifier.reset();
    const t0 = 1000;
    const h1 = createBaseHandLandmarks();
    h1[0] = { x: 0.30, y: 0.50, z: 0 };
    classifier.classify(h1, 'Right', t0);

    const h2 = createBaseHandLandmarks();
    h2[0] = { x: 0.45, y: 0.50, z: 0 };
    classifier.classify(h2, 'Right', t0 + 50);

    const h3 = createBaseHandLandmarks();
    h3[0] = { x: 0.65, y: 0.50, z: 0 };
    const start = performance.now();
    const res = classifier.classify(h3, 'Right', t0 + 100);
    const latency = performance.now() - start;

    const isMatch = res.gesture === 'SWIPE_RIGHT';
    if (isMatch) passedCount++;
    results.push({
      gesture: 'SWIPE_RIGHT',
      expected: 'SWIPE_RIGHT',
      predicted: res.gesture,
      status: isMatch ? 'PASS' : 'FAIL',
      confidence: res.confidence,
      latencyMs: Math.round(latency * 100) / 100,
      notes: isMatch
        ? 'Lateral displacement Δx = +0.35 across 100ms verified'
        : `Failed to detect swipe: ${res.gesture}`,
    });
  }

  // 3. Evaluate Dynamic SWIPE_LEFT
  {
    classifier.reset();
    const t0 = 1000;
    const h1 = createBaseHandLandmarks();
    h1[0] = { x: 0.70, y: 0.50, z: 0 };
    classifier.classify(h1, 'Right', t0);

    const h2 = createBaseHandLandmarks();
    h2[0] = { x: 0.55, y: 0.50, z: 0 };
    classifier.classify(h2, 'Right', t0 + 50);

    const h3 = createBaseHandLandmarks();
    h3[0] = { x: 0.35, y: 0.50, z: 0 };
    const start = performance.now();
    const res = classifier.classify(h3, 'Right', t0 + 100);
    const latency = performance.now() - start;

    const isMatch = res.gesture === 'SWIPE_LEFT';
    if (isMatch) passedCount++;
    results.push({
      gesture: 'SWIPE_LEFT',
      expected: 'SWIPE_LEFT',
      predicted: res.gesture,
      status: isMatch ? 'PASS' : 'FAIL',
      confidence: res.confidence,
      latencyMs: Math.round(latency * 100) / 100,
      notes: isMatch
        ? 'Lateral displacement Δx = -0.35 across 100ms verified'
        : `Failed to detect swipe: ${res.gesture}`,
    });
  }

  return {
    total: 17,
    passed: passedCount,
    accuracy: Math.round((passedCount / 17) * 100),
    results,
  };
}
