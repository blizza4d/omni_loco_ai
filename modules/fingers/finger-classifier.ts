import { Landmark3D } from '../hand/types';
import {
  FingerName,
  FingerDetail,
  Handedness,
  SingleHandFingerResult,
  DualHandFingerResult,
} from './types';

export class FingerCountingEngine {
  // Rolling voting windows for temporal consensus (hysteresis buffer)
  private leftVotingWindow: number[] = [];
  private rightVotingWindow: number[] = [];
  private maxWindowSize = 5;

  // Previous finger open states for hysteresis transitions
  private lastLeftFingerStates: Record<FingerName, boolean> = {
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  };
  private lastRightFingerStates: Record<FingerName, boolean> = {
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  };

  // Tracking timestamps to handle tracking loss and immediate recovery
  private lastLeftDetectionTime = 0;
  private lastRightDetectionTime = 0;
  private trackingLossTimeoutMs = 150;

  // Mathematical utility functions
  private dist3D(a: Landmark3D, b: Landmark3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private angle3D(a: Landmark3D, b: Landmark3D, c: Landmark3D): number {
    // Vector b -> a and vector b -> c
    const bax = a.x - b.x;
    const bay = a.y - b.y;
    const baz = a.z - b.z;
    const bcx = c.x - b.x;
    const bcy = c.y - b.y;
    const bcz = c.z - b.z;

    const magBA = Math.sqrt(bax * bax + bay * bay + baz * baz);
    const magBC = Math.sqrt(bcx * bcx + bcy * bcy + bcz * bcz);

    if (magBA === 0 || magBC === 0) return 180;

    const dot = bax * bcx + bay * bcy + baz * bcz;
    const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (magBA * magBC)));
    return (Math.acos(cosTheta) * 180) / Math.PI;
  }

  /**
   * Evaluates individual finger state on a single hand
   */
  classifySingleHand(
    landmarks: Landmark3D[],
    handedness: Handedness,
    now: number
  ): SingleHandFingerResult {
    if (!landmarks || landmarks.length < 21) {
      return this.createEmptyResult(handedness);
    }

    const wrist = landmarks[0]!;
    const middleMCP = landmarks[9]!;
    const indexMCP = landmarks[5]!;
    const pinkyMCP = landmarks[17]!;

    // Invariant Palm Scale Normalization (distance from wrist to middle MCP)
    const palmScale = Math.max(0.01, this.dist3D(wrist, middleMCP));

    const lastStates =
      handedness === 'Left' ? this.lastLeftFingerStates : this.lastRightFingerStates;

    // 1. THUMB CLASSIFICATION
    // Uses distance from Thumb Tip (4) to Pinky MCP (17), Index MCP (5), and IP Joint Angle (2->3->4)
    const thumbMCP = landmarks[2]!;
    const thumbIP = landmarks[3]!;
    const thumbTip = landmarks[4]!;

    const thumbToPinkyDist = this.dist3D(thumbTip, pinkyMCP) / palmScale;
    const thumbToIndexDist = this.dist3D(thumbTip, indexMCP) / palmScale;
    const thumbIPAngle = this.angle3D(thumbMCP, thumbIP, thumbTip);

    // Hysteresis thresholding for thumb
    const prevThumbOpen = lastStates.thumb;
    const thumbOpenThreshold = prevThumbOpen ? 0.76 : 0.86;
    const thumbIndexThreshold = prevThumbOpen ? 0.40 : 0.48;

    const isThumbOpen =
      thumbToPinkyDist > thumbOpenThreshold &&
      thumbToIndexDist > thumbIndexThreshold &&
      thumbIPAngle > 125;
    lastStates.thumb = isThumbOpen;

    const thumbConfidence = Math.min(
      1.0,
      Math.max(0.5, (thumbToPinkyDist - 0.5) * 1.5)
    );

    const thumbDetail: FingerDetail = {
      name: 'thumb',
      label: 'Thumb',
      isOpen: isThumbOpen,
      confidence: Math.round(thumbConfidence * 100) / 100,
      extensionRatio: Math.round(thumbToPinkyDist * 100) / 100,
      angleDeg: Math.round(thumbIPAngle),
    };

    // 2. NON-THUMB FINGER CLASSIFICATION (Index, Middle, Ring, Pinky)
    const fingerConfigs: {
      name: FingerName;
      label: string;
      mcpIdx: number;
      pipIdx: number;
      dipIdx: number;
      tipIdx: number;
    }[] = [
      { name: 'index', label: 'Index', mcpIdx: 5, pipIdx: 6, dipIdx: 7, tipIdx: 8 },
      { name: 'middle', label: 'Middle', mcpIdx: 9, pipIdx: 10, dipIdx: 11, tipIdx: 12 },
      { name: 'ring', label: 'Ring', mcpIdx: 13, pipIdx: 14, dipIdx: 15, tipIdx: 16 },
      { name: 'pinky', label: 'Little', mcpIdx: 17, pipIdx: 18, dipIdx: 19, tipIdx: 20 },
    ];

    const fingers: Record<FingerName, FingerDetail> = {
      thumb: thumbDetail,
      index: {} as FingerDetail,
      middle: {} as FingerDetail,
      ring: {} as FingerDetail,
      pinky: {} as FingerDetail,
    };

    let rawCount = isThumbOpen ? 1 : 0;

    for (const cfg of fingerConfigs) {
      const mcp = landmarks[cfg.mcpIdx]!;
      const pip = landmarks[cfg.pipIdx]!;
      const dip = landmarks[cfg.dipIdx]!;
      const tip = landmarks[cfg.tipIdx]!;

      // Distance from wrist to tip vs wrist to pip
      const distWristToTip = this.dist3D(wrist, tip);
      const distWristToPip = Math.max(0.001, this.dist3D(wrist, pip));
      const extensionRatio = distWristToTip / distWristToPip;

      // Distance from MCP to tip vs MCP to pip
      const distMcpToTip = this.dist3D(mcp, tip);
      const distMcpToPip = Math.max(0.001, this.dist3D(mcp, pip));
      const mcpExtensionRatio = distMcpToTip / distMcpToPip;

      // PIP joint extension angle (MCP -> PIP -> DIP)
      const pipAngle = this.angle3D(mcp, pip, dip);

      // Hysteresis thresholding
      const prevOpen = lastStates[cfg.name];
      const ratioThreshold = prevOpen ? 1.10 : 1.22;
      const mcpRatioThreshold = prevOpen ? 1.15 : 1.30;
      const angleThreshold = prevOpen ? 115 : 132;

      const isOpen =
        extensionRatio > ratioThreshold &&
        mcpExtensionRatio > mcpRatioThreshold &&
        pipAngle > angleThreshold;

      lastStates[cfg.name] = isOpen;

      if (isOpen) rawCount++;

      const conf = Math.min(
        1.0,
        Math.max(0.5, (extensionRatio - 0.9) * 2.0)
      );

      fingers[cfg.name] = {
        name: cfg.name,
        label: cfg.label,
        isOpen,
        confidence: Math.round(conf * 100) / 100,
        extensionRatio: Math.round(extensionRatio * 100) / 100,
        angleDeg: Math.round(pipAngle),
      };
    }

    // 3. TEMPORAL CONSENSUS VOTING
    const votingWindow =
      handedness === 'Left' ? this.leftVotingWindow : this.rightVotingWindow;

    votingWindow.push(rawCount);
    if (votingWindow.length > this.maxWindowSize) {
      votingWindow.shift();
    }

    // Modal count in voting window
    const stableCount = this.calculateModalCount(votingWindow, rawCount);

    // 4. GESTURE & POSE IDENTIFICATION
    const gestureName = this.identifyGesturePose(fingers, stableCount);

    if (handedness === 'Left') {
      this.lastLeftDetectionTime = now;
    } else {
      this.lastRightDetectionTime = now;
    }

    return {
      handedness,
      rawCount,
      stableCount,
      fingers,
      gestureName,
      confidence: 0.94,
      trackingStatus: 'TRACKING_ACTIVE',
      landmarks,
    };
  }

  /**
   * Processes all detected hands and produces combined dual-hand analysis
   */
  processHands(
    hands: Landmark3D[][],
    handednesses: Handedness[] | undefined,
    now: number
  ): DualHandFingerResult {
    let leftHandResult: SingleHandFingerResult | null = null;
    let rightHandResult: SingleHandFingerResult | null = null;

    if (hands && hands.length > 0) {
      if (hands.length === 1 && hands[0]) {
        // Single hand: determine handedness from metadata or default to Right
        const hName = handednesses?.[0] || 'Right';
        const res = this.classifySingleHand(hands[0], hName, now);
        if (hName === 'Left') {
          leftHandResult = res;
        } else {
          rightHandResult = res;
        }
      } else if (hands.length >= 2 && hands[0] && hands[1]) {
        // Dual hands: sort by screen coordinate X (mirrored user view: sx = 1.0 - rawX)
        const h0 = hands[0];
        const h1 = hands[1];
        const sx0 = 1.0 - h0[0]!.x;
        const sx1 = 1.0 - h1[0]!.x;

        // Smaller screen X is on driver/user's Left side; larger is Right side
        let leftLms = sx0 < sx1 ? h0 : h1;
        let rightLms = sx0 < sx1 ? h1 : h0;

        leftHandResult = this.classifySingleHand(leftLms, 'Left', now);
        rightHandResult = this.classifySingleHand(rightLms, 'Right', now);
      }
    }

    // Check tracking loss timeouts
    if (!leftHandResult && now - this.lastLeftDetectionTime > this.trackingLossTimeoutMs) {
      this.leftVotingWindow = [];
      this.lastLeftFingerStates = {
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      };
    }
    if (!rightHandResult && now - this.lastRightDetectionTime > this.trackingLossTimeoutMs) {
      this.rightVotingWindow = [];
      this.lastRightFingerStates = {
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      };
    }

    const totalRaw = (leftHandResult?.rawCount || 0) + (rightHandResult?.rawCount || 0);
    const totalStable =
      (leftHandResult?.stableCount || 0) + (rightHandResult?.stableCount || 0);

    const activeGestures: string[] = [];
    if (leftHandResult) activeGestures.push(`Left: ${leftHandResult.gestureName}`);
    if (rightHandResult) activeGestures.push(`Right: ${rightHandResult.gestureName}`);

    // Combined textual output description
    let combinedTextOutput = 'Hand not detected. Place hands in camera view.';
    if (leftHandResult && rightHandResult) {
      combinedTextOutput = `Detected ${totalStable} open fingers across both hands (Left: ${leftHandResult.stableCount}, Right: ${rightHandResult.stableCount}).`;
    } else if (rightHandResult) {
      combinedTextOutput = `Detected ${rightHandResult.stableCount} open finger${
        rightHandResult.stableCount === 1 ? '' : 's'
      } on Right Hand (${rightHandResult.gestureName}).`;
    } else if (leftHandResult) {
      combinedTextOutput = `Detected ${leftHandResult.stableCount} open finger${
        leftHandResult.stableCount === 1 ? '' : 's'
      } on Left Hand (${leftHandResult.gestureName}).`;
    }

    return {
      leftHand: leftHandResult,
      rightHand: rightHandResult,
      totalRawCount: totalRaw,
      totalStableCount: totalStable,
      activeGestures,
      combinedTextOutput,
      timestamp: now,
    };
  }

  private calculateModalCount(window: number[], fallback: number): number {
    if (window.length === 0) return fallback;

    const counts: Record<number, number> = {};
    for (const v of window) {
      counts[v] = (counts[v] || 0) + 1;
    }

    let maxFreq = 0;
    let mode = fallback;
    for (const [valStr, freq] of Object.entries(counts)) {
      const val = Number(valStr);
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = val;
      }
    }

    // Require majority consensus (at least 60% of window or 3+ frames)
    if (maxFreq >= Math.ceil(window.length * 0.55)) {
      return mode;
    }
    return fallback;
  }

  private identifyGesturePose(
    fingers: Record<FingerName, FingerDetail>,
    count: number
  ): string {
    const { thumb, index, middle, ring, pinky } = fingers;

    if (count === 0) return 'Closed Fist';
    if (count === 5) return 'Open Palm';

    if (count === 1) {
      if (thumb.isOpen) return 'Thumbs Up';
      if (index.isOpen) return 'One Finger (Pointer)';
      if (pinky.isOpen) return 'Pinky Extended';
      return 'One Finger';
    }

    if (count === 2) {
      if (index.isOpen && middle.isOpen) return 'Two Fingers (Peace / V-Sign)';
      if (thumb.isOpen && index.isOpen) return 'Pinch / Gun Pose';
      if (index.isOpen && pinky.isOpen) return 'Rock On / Horns';
      return 'Two Fingers';
    }

    if (count === 3) {
      if (index.isOpen && middle.isOpen && ring.isOpen) return 'Three Fingers (W-Sign)';
      if (thumb.isOpen && index.isOpen && middle.isOpen) return 'Three Fingers (Scout)';
      return 'Three Fingers';
    }

    if (count === 4) {
      if (!thumb.isOpen) return 'Four Fingers (No Thumb)';
      return 'Four Fingers';
    }

    return `${count} Fingers Extended`;
  }

  private createEmptyResult(handedness: Handedness): SingleHandFingerResult {
    const emptyDetail = (name: FingerName, label: string): FingerDetail => ({
      name,
      label,
      isOpen: false,
      confidence: 0,
      extensionRatio: 0,
      angleDeg: 0,
    });

    return {
      handedness,
      rawCount: 0,
      stableCount: 0,
      fingers: {
        thumb: emptyDetail('thumb', 'Thumb'),
        index: emptyDetail('index', 'Index'),
        middle: emptyDetail('middle', 'Middle'),
        ring: emptyDetail('ring', 'Ring'),
        pinky: emptyDetail('pinky', 'Little'),
      },
      gestureName: 'Hand not detected',
      confidence: 0,
      trackingStatus: 'HAND_NOT_DETECTED',
      landmarks: [],
    };
  }

  reset(): void {
    this.leftVotingWindow = [];
    this.rightVotingWindow = [];
    this.lastLeftFingerStates = {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
    };
    this.lastRightFingerStates = {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
    };
    this.lastLeftDetectionTime = 0;
    this.lastRightDetectionTime = 0;
  }
}
