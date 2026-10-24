import { describe, it, expect, beforeEach } from 'vitest';
import { FingerCountingEngine } from '../modules/fingers/finger-classifier';
import { Landmark3D } from '../modules/hand/types';

/**
 * Creates synthetic 21 3D hand landmarks in standard canonical pose.
 * Palm reference: Wrist=(0.5, 0.8, 0), MiddleMCP=(0.5, 0.5, 0) => palmScale = 0.30
 */
function createSyntheticHand(fingerStates: {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}): Landmark3D[] {
  const wrist: Landmark3D = { x: 0.5, y: 0.8, z: 0 };

  // MCPs (base knuckles)
  const thumbCMC: Landmark3D = { x: 0.44, y: 0.72, z: 0.02 };
  const thumbMCP: Landmark3D = { x: 0.40, y: 0.65, z: 0.04 };
  const indexMCP: Landmark3D = { x: 0.45, y: 0.52, z: 0 };
  const middleMCP: Landmark3D = { x: 0.50, y: 0.50, z: 0 };
  const ringMCP: Landmark3D = { x: 0.55, y: 0.52, z: 0 };
  const pinkyMCP: Landmark3D = { x: 0.60, y: 0.56, z: 0 };

  // Thumb
  let thumbIP: Landmark3D;
  let thumbTip: Landmark3D;
  if (fingerStates.thumb) {
    // Abducted / Extended thumb (away from palm toward driver-left)
    thumbIP = { x: 0.34, y: 0.58, z: 0.06 };
    thumbTip = { x: 0.28, y: 0.52, z: 0.08 };
  } else {
    // Folded thumb across palm toward pinky MCP
    thumbIP = { x: 0.46, y: 0.60, z: 0.02 };
    thumbTip = { x: 0.52, y: 0.57, z: 0.01 };
  }

  // Non-thumb fingers helper
  const makeFinger = (
    mcp: Landmark3D,
    isOpen: boolean,
    xOffset: number
  ): [Landmark3D, Landmark3D, Landmark3D] => {
    if (isOpen) {
      // Extended straight upward (away from wrist)
      const pip = { x: mcp.x + xOffset * 0.2, y: mcp.y - 0.10, z: 0 };
      const dip = { x: mcp.x + xOffset * 0.4, y: mcp.y - 0.18, z: 0 };
      const tip = { x: mcp.x + xOffset * 0.5, y: mcp.y - 0.26, z: 0 };
      return [pip, dip, tip];
    } else {
      // Folded back toward palm
      const pip = { x: mcp.x, y: mcp.y - 0.06, z: -0.04 };
      const dip = { x: mcp.x, y: mcp.y + 0.02, z: -0.05 };
      const tip = { x: mcp.x, y: mcp.y + 0.06, z: -0.03 };
      return [pip, dip, tip];
    }
  };

  const [indexPIP, indexDIP, indexTip] = makeFinger(indexMCP, fingerStates.index, -0.02);
  const [middlePIP, middleDIP, middleTip] = makeFinger(middleMCP, fingerStates.middle, 0);
  const [ringPIP, ringDIP, ringTip] = makeFinger(ringMCP, fingerStates.ring, 0.02);
  const [pinkyPIP, pinkyDIP, pinkyTip] = makeFinger(pinkyMCP, fingerStates.pinky, 0.04);

  return [
    wrist, // 0
    thumbCMC, // 1
    thumbMCP, // 2
    thumbIP, // 3
    thumbTip, // 4
    indexMCP, // 5
    indexPIP, // 6
    indexDIP, // 7
    indexTip, // 8
    middleMCP, // 9
    middlePIP, // 10
    middleDIP, // 11
    middleTip, // 12
    ringMCP, // 13
    ringPIP, // 14
    ringDIP, // 15
    ringTip, // 16
    pinkyMCP, // 17
    pinkyPIP, // 18
    pinkyDIP, // 19
    pinkyTip, // 20
  ];
}

/**
 * Rotates landmarks by angle around center point
 */
function rotateLandmarks(landmarks: Landmark3D[], angleDeg: number): Landmark3D[] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = 0.5;
  const cy = 0.5;

  return landmarks.map((pt) => {
    const rx = pt.x - cx;
    const ry = pt.y - cy;
    return {
      x: cx + (rx * cos - ry * sin),
      y: cy + (rx * sin + ry * cos),
      z: pt.z,
    };
  });
}

/**
 * Scales landmarks by factor relative to wrist
 */
function scaleLandmarks(landmarks: Landmark3D[], factor: number): Landmark3D[] {
  const wrist = landmarks[0]!;
  return landmarks.map((pt) => ({
    x: wrist.x + (pt.x - wrist.x) * factor,
    y: wrist.y + (pt.y - wrist.y) * factor,
    z: pt.z * factor,
  }));
}

describe('Module 11: FingerCountingEngine', () => {
  let engine: FingerCountingEngine;

  beforeEach(() => {
    engine = new FingerCountingEngine();
  });

  it('accurately identifies an Open Palm (5 open fingers)', () => {
    const hand = createSyntheticHand({
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });

    const result = engine.classifySingleHand(hand, 'Right', 1000);
    expect(result.rawCount).toBe(5);
    expect(result.fingers.thumb.isOpen).toBe(true);
    expect(result.fingers.index.isOpen).toBe(true);
    expect(result.fingers.middle.isOpen).toBe(true);
    expect(result.fingers.ring.isOpen).toBe(true);
    expect(result.fingers.pinky.isOpen).toBe(true);
    expect(result.gestureName).toBe('Open Palm');
  });

  it('accurately identifies a Closed Fist (0 open fingers)', () => {
    const hand = createSyntheticHand({
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
    });

    const result = engine.classifySingleHand(hand, 'Right', 1000);
    expect(result.rawCount).toBe(0);
    expect(result.fingers.thumb.isOpen).toBe(false);
    expect(result.fingers.index.isOpen).toBe(false);
    expect(result.fingers.middle.isOpen).toBe(false);
    expect(result.fingers.ring.isOpen).toBe(false);
    expect(result.fingers.pinky.isOpen).toBe(false);
    expect(result.gestureName).toBe('Closed Fist');
  });

  it('accurately detects individual counts from 1 through 4', () => {
    // 1 finger (Index Pointer)
    const hand1 = createSyntheticHand({
      thumb: false,
      index: true,
      middle: false,
      ring: false,
      pinky: false,
    });
    expect(engine.classifySingleHand(hand1, 'Right', 1000).rawCount).toBe(1);

    // 2 fingers (Peace / V-Sign: Index + Middle)
    const hand2 = createSyntheticHand({
      thumb: false,
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    });
    const res2 = engine.classifySingleHand(hand2, 'Right', 1020);
    expect(res2.rawCount).toBe(2);
    expect(res2.gestureName).toContain('Two Fingers');

    // 3 fingers (Index + Middle + Ring)
    const hand3 = createSyntheticHand({
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: false,
    });
    expect(engine.classifySingleHand(hand3, 'Right', 1040).rawCount).toBe(3);

    // 4 fingers (Index + Middle + Ring + Pinky)
    const hand4 = createSyntheticHand({
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });
    expect(engine.classifySingleHand(hand4, 'Right', 1060).rawCount).toBe(4);
  });

  it('remains invariant under 2D/3D hand rotation (pointing sideways and upside down)', () => {
    const hand2 = createSyntheticHand({
      thumb: false,
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    });

    // Rotate hand by 90 degrees (pointing sideways)
    const rotated90 = rotateLandmarks(hand2, 90);
    const res90 = engine.classifySingleHand(rotated90, 'Right', 1000);
    expect(res90.rawCount).toBe(2);

    // Rotate hand by 180 degrees (pointing downwards)
    const rotated180 = rotateLandmarks(hand2, 180);
    const res180 = engine.classifySingleHand(rotated180, 'Right', 1020);
    expect(res180.rawCount).toBe(2);
  });

  it('remains invariant under distance / scale changes', () => {
    const hand3 = createSyntheticHand({
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: false,
    });

    // Close to camera (scaled 1.8x)
    const scaledUp = scaleLandmarks(hand3, 1.8);
    expect(engine.classifySingleHand(scaledUp, 'Right', 1000).rawCount).toBe(3);

    // Far from camera (scaled 0.45x)
    const scaledDown = scaleLandmarks(hand3, 0.45);
    expect(engine.classifySingleHand(scaledDown, 'Right', 1020).rawCount).toBe(3);
  });

  it('eliminates flicker via temporal consensus voting window', () => {
    const hand3 = createSyntheticHand({
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: false,
    });
    const hand4 = createSyntheticHand({
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });

    // Feed 4 consecutive frames of count 3
    for (let t = 0; t < 4; t++) {
      engine.classifySingleHand(hand3, 'Right', 1000 + t * 30);
    }

    // Feed a SINGLE isolated noisy frame of count 4
    const noisyRes = engine.classifySingleHand(hand4, 'Right', 1150);

    // Raw count is 4, but stable modal consensus MUST remain 3!
    expect(noisyRes.rawCount).toBe(4);
    expect(noisyRes.stableCount).toBe(3);
  });

  it('accurately aggregates two visible hands (Left + Right summation)', () => {
    const leftHand = createSyntheticHand({
      thumb: false,
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    }); // 2 fingers

    const rightHand = createSyntheticHand({
      thumb: true,
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    }); // 3 fingers

    // In mirrored front-camera coordinates:
    // User's Left hand appears on screen-left (smaller screenX => larger rawX)
    // User's Right hand appears on screen-right (larger screenX => smaller rawX)
    const leftLms = leftHand.map((pt) => ({ x: pt.x + 0.2, y: pt.y, z: pt.z }));
    const rightLms = rightHand.map((pt) => ({ x: pt.x - 0.2, y: pt.y, z: pt.z }));

    const dualResult = engine.processHands([leftLms, rightLms], ['Left', 'Right'], 1000);

    expect(dualResult.leftHand).toBeDefined();
    expect(dualResult.rightHand).toBeDefined();
    expect(dualResult.leftHand?.rawCount).toBe(2);
    expect(dualResult.rightHand?.rawCount).toBe(3);
    expect(dualResult.totalRawCount).toBe(5);
    expect(dualResult.combinedTextOutput).toContain('Detected 5 open fingers across both hands');
  });

  it('resets cleanly upon tracking loss timeout (>150ms)', () => {
    const hand = createSyntheticHand({
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });

    engine.classifySingleHand(hand, 'Right', 1000);

    // Call processHands with empty hands after 250ms
    const lostResult = engine.processHands([], undefined, 1250);
    expect(lostResult.leftHand).toBeNull();
    expect(lostResult.rightHand).toBeNull();
    expect(lostResult.totalRawCount).toBe(0);
    expect(lostResult.totalStableCount).toBe(0);
    expect(lostResult.combinedTextOutput).toContain('Hand not detected');
  });
});
