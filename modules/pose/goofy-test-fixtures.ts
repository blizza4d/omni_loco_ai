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
      lm[4] = { x: wx - 0.10, y: wy - 0.14, z: 0 };
      lm[8] = { x: wx - 0.04, y: wy - 0.27, z: 0 };
      lm[12] = { x: wx, y: wy - 0.29, z: 0 };
      lm[16] = { x: wx + 0.04, y: wy - 0.27, z: 0 };
      lm[20] = { x: wx + 0.07, y: wy - 0.23, z: 0 };
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
    total: 12,
    passed: passedCount,
    accuracy: Math.round((passedCount / 12) * 100),
    results,
  };
}
