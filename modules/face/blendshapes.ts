import { FaceLandmark, BlendshapeCategory, HeadPose, FaceMetrics, BLENDSHAPE_NAMES, FACIAL_KEYPOINTS } from './types';

export class FaceMetricsAnalyzer {
  private blinkTimes: number[] = [];
  private isEyeClosed = false;
  private blinkStartTime = 0;
  private blinkDurations: number[] = [];
  private eyeClosedHistory: { time: number; closed: boolean }[] = [];
  private jawHistory: number[] = [];

  private dist2D(a: FaceLandmark, b: FaceLandmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate Eye Aspect Ratio (EAR)
  calculateEAR(landmarks: FaceLandmark[], eyeIndices: number[]): number {
    if (landmarks.length < 468) return 0.3;
    const p1 = landmarks[eyeIndices[0]!]!;
    const p2 = landmarks[eyeIndices[1]!]!;
    const p3 = landmarks[eyeIndices[2]!]!;
    const p4 = landmarks[eyeIndices[3]!]!;
    const p5 = landmarks[eyeIndices[4]!]!;
    const p6 = landmarks[eyeIndices[5]!]!;

    const vertical1 = this.dist2D(p2, p6);
    const vertical2 = this.dist2D(p3, p5);
    const horizontal = this.dist2D(p1, p4);

    if (horizontal < 0.001) return 0.3;
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  // Decompose head pose (yaw, pitch, roll) from key facial anchor landmarks
  decomposeHeadPose(landmarks: FaceLandmark[]): HeadPose {
    if (landmarks.length < 468) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }

    const nose = landmarks[FACIAL_KEYPOINTS.noseTip]!;
    const leftCheek = landmarks[FACIAL_KEYPOINTS.leftCheek]!;
    const rightCheek = landmarks[FACIAL_KEYPOINTS.rightCheek]!;
    const chin = landmarks[FACIAL_KEYPOINTS.chin]!;

    // Midpoint between cheeks
    const midX = (leftCheek.x + rightCheek.x) / 2;
    const midY = (leftCheek.y + rightCheek.y) / 2;
    const cheekWidth = Math.max(0.01, rightCheek.x - leftCheek.x);

    // Yaw: asymmetry between nose and midpoint
    const yawNorm = (nose.x - midX) / cheekWidth;
    const yaw = Math.round(yawNorm * 90);

    // Pitch: vertical offset of nose relative to eye/chin line
    const faceHeight = Math.max(0.01, chin.y - midY);
    const pitchNorm = (midY - nose.y) / faceHeight;
    const pitch = Math.round(pitchNorm * 80);

    // Roll: angle between cheeks
    const dCheekY = rightCheek.y - leftCheek.y;
    const dCheekX = rightCheek.x - leftCheek.x;
    const roll = Math.round((Math.atan2(dCheekY, dCheekX) * 180) / Math.PI);

    return {
      yaw: Math.max(-60, Math.min(60, yaw)),
      pitch: Math.max(-45, Math.min(45, pitch)),
      roll: Math.max(-45, Math.min(45, roll)),
    };
  }

  analyze(
    landmarks: FaceLandmark[],
    blendshapes: BlendshapeCategory[],
    now: number
  ): FaceMetrics {
    // 1. EAR and Blinks
    const earLeft = this.calculateEAR(landmarks, FACIAL_KEYPOINTS.leftEye);
    const earRight = this.calculateEAR(landmarks, FACIAL_KEYPOINTS.rightEye);
    const earAvg = (earLeft + earRight) / 2;

    const blinkThreshold = 0.21;
    const eyeCurrentlyClosed = earAvg < blinkThreshold;

    // Track PERCLOS (last 60 seconds)
    this.eyeClosedHistory.push({ time: now, closed: eyeCurrentlyClosed });
    const windowStart = now - 60000;
    this.eyeClosedHistory = this.eyeClosedHistory.filter((item) => item.time >= windowStart);

    const closedCount = this.eyeClosedHistory.filter((i) => i.closed).length;
    const perclos = this.eyeClosedHistory.length > 0 ? closedCount / this.eyeClosedHistory.length : 0;

    // Blink state machine
    if (eyeCurrentlyClosed && !this.isEyeClosed) {
      this.isEyeClosed = true;
      this.blinkStartTime = now;
    } else if (!eyeCurrentlyClosed && this.isEyeClosed) {
      this.isEyeClosed = false;
      const duration = now - this.blinkStartTime;
      if (duration > 50 && duration < 800) {
        this.blinkTimes.push(now);
        this.blinkDurations.push(duration);
        if (this.blinkDurations.length > 20) this.blinkDurations.shift();
      }
    }

    // Clean old blinks
    this.blinkTimes = this.blinkTimes.filter((t) => t >= windowStart);
    const blinksPerMinute = this.blinkTimes.length;
    const avgDuration =
      this.blinkDurations.length > 0
        ? this.blinkDurations.reduce((a, b) => a + b, 0) / this.blinkDurations.length
        : 140;

    // Drowsiness flag: PERCLOS > 0.15 or avg blink duration > 350ms
    const isDrowsy = perclos > 0.15 || avgDuration > 350;

    // 2. Head Pose
    const pose = this.decomposeHeadPose(landmarks);
    let headOrientation: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' = 'CENTER';
    if (pose.yaw < -15) headOrientation = 'LEFT';
    else if (pose.yaw > 15) headOrientation = 'RIGHT';
    else if (pose.pitch < -12) headOrientation = 'DOWN';
    else if (pose.pitch > 12) headOrientation = 'UP';

    // 3. Jaw / Talking detection
    const jawOpenScore = blendshapes.find((b) => b.categoryName === 'jawOpen')?.score || 0;
    const isMouthOpen = jawOpenScore > 0.25;

    this.jawHistory.push(jawOpenScore);
    if (this.jawHistory.length > 30) this.jawHistory.shift();
    // Talking variance
    const meanJaw = this.jawHistory.reduce((a, b) => a + b, 0) / (this.jawHistory.length || 1);
    const jawVariance =
      this.jawHistory.reduce((sum, v) => sum + Math.pow(v - meanJaw, 2), 0) / (this.jawHistory.length || 1);
    const isTalking = jawVariance > 0.005 && meanJaw > 0.08;

    // 4. Basic Expressions
    const smileLeft = blendshapes.find((b) => b.categoryName === 'mouthSmileLeft')?.score || 0;
    const smileRight = blendshapes.find((b) => b.categoryName === 'mouthSmileRight')?.score || 0;
    const browUp = blendshapes.find((b) => b.categoryName === 'browInnerUp')?.score || 0;
    const eyeWide = blendshapes.find((b) => b.categoryName === 'eyeWideLeft')?.score || 0;

    const expressions: { name: string; score: number }[] = [];
    const smileAvg = (smileLeft + smileRight) / 2;
    if (smileAvg > 0.35) expressions.push({ name: 'SMILE', score: Math.round(smileAvg * 100) / 100 });
    if (browUp > 0.45) expressions.push({ name: 'BROW RAISE', score: Math.round(browUp * 100) / 100 });
    if (jawOpenScore > 0.4 && eyeWide > 0.25) expressions.push({ name: 'SURPRISE', score: Math.round(jawOpenScore * 100) / 100 });

    return {
      earLeft: Math.round(earLeft * 100) / 100,
      earRight: Math.round(earRight * 100) / 100,
      earAvg: Math.round(earAvg * 100) / 100,
      blinksPerMinute,
      avgBlinkDurationMs: Math.round(avgDuration),
      isDrowsy,
      perclos: Math.round(perclos * 100) / 100,
      headPose: pose,
      headOrientation,
      isMouthOpen,
      isTalking,
      activeExpressions: expressions,
    };
  }

  reset(): void {
    this.blinkTimes = [];
    this.blinkDurations = [];
    this.eyeClosedHistory = [];
    this.jawHistory = [];
    this.isEyeClosed = false;
  }
}
