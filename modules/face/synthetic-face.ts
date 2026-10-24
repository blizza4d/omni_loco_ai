import { FaceLandmark, BlendshapeCategory, BLENDSHAPE_NAMES, FACIAL_KEYPOINTS } from './types';

export function generateSyntheticFace(timeMs: number): {
  landmarks: FaceLandmark[];
  blendshapes: BlendshapeCategory[];
} {
  const t = timeMs / 1000;

  // Head motion oscillation
  const yawOffset = Math.sin(t * 0.8) * 0.05;
  const pitchOffset = Math.cos(t * 0.6) * 0.03;
  const rollOffset = Math.sin(t * 0.5) * 0.02;

  // Blink cycle: blinks every 3.5 seconds
  const blinkPhase = (t % 3.5);
  const isBlinking = blinkPhase < 0.18;
  const blinkScore = isBlinking ? 1.0 - Math.abs(blinkPhase - 0.09) / 0.09 : 0.05;

  // Smile cycle: subtle smile every 5 seconds
  const smileScore = Math.max(0, Math.sin(t * 0.4) * 0.6);

  // Generate 478 landmarks
  const landmarks: FaceLandmark[] = [];
  const centerX = 0.5 + yawOffset;
  const centerY = 0.45 + pitchOffset;

  for (let i = 0; i < 478; i++) {
    // Generate oval distribution of face mesh
    const angle = (i / 478) * Math.PI * 2 * 7;
    const radius = 0.12 + ((i % 20) / 20) * 0.15;
    const x = centerX + Math.cos(angle + rollOffset) * radius * 0.85;
    const y = centerY + Math.sin(angle) * radius * 1.1;
    const z = Math.sin(radius * 10) * 0.05;

    landmarks.push({ x, y, z });
  }

  // Anchor primary keypoints
  landmarks[FACIAL_KEYPOINTS.noseTip] = { x: centerX, y: centerY + 0.02, z: -0.06 };
  landmarks[FACIAL_KEYPOINTS.chin] = { x: centerX, y: centerY + 0.22, z: -0.01 };
  landmarks[FACIAL_KEYPOINTS.leftCheek] = { x: centerX - 0.18, y: centerY + 0.04, z: 0.02 };
  landmarks[FACIAL_KEYPOINTS.rightCheek] = { x: centerX + 0.18, y: centerY + 0.04, z: 0.02 };

  // Adjust eye landmarks for EAR calculation
  const leftEyeOpen = 0.025 * (1 - blinkScore * 0.85);
  const rightEyeOpen = 0.025 * (1 - blinkScore * 0.85);

  const leftEyeBaseX = centerX - 0.08;
  const rightEyeBaseX = centerX + 0.08;
  const eyeBaseY = centerY - 0.06;

  // Left Eye points
  landmarks[33] = { x: leftEyeBaseX - 0.04, y: eyeBaseY, z: -0.02 }; // p1
  landmarks[160] = { x: leftEyeBaseX - 0.015, y: eyeBaseY - leftEyeOpen, z: -0.02 }; // p2
  landmarks[158] = { x: leftEyeBaseX + 0.015, y: eyeBaseY - leftEyeOpen, z: -0.02 }; // p3
  landmarks[133] = { x: leftEyeBaseX + 0.04, y: eyeBaseY, z: -0.02 }; // p4
  landmarks[153] = { x: leftEyeBaseX + 0.015, y: eyeBaseY + leftEyeOpen, z: -0.02 }; // p5
  landmarks[144] = { x: leftEyeBaseX - 0.015, y: eyeBaseY + leftEyeOpen, z: -0.02 }; // p6

  // Right Eye points
  landmarks[362] = { x: rightEyeBaseX - 0.04, y: eyeBaseY, z: -0.02 };
  landmarks[385] = { x: rightEyeBaseX - 0.015, y: eyeBaseY - rightEyeOpen, z: -0.02 };
  landmarks[387] = { x: rightEyeBaseX + 0.015, y: eyeBaseY - rightEyeOpen, z: -0.02 };
  landmarks[263] = { x: rightEyeBaseX + 0.04, y: eyeBaseY, z: -0.02 };
  landmarks[373] = { x: rightEyeBaseX + 0.015, y: eyeBaseY + rightEyeOpen, z: -0.02 };
  landmarks[380] = { x: rightEyeBaseX - 0.015, y: eyeBaseY + rightEyeOpen, z: -0.02 };

  // Irises
  landmarks[468] = { x: leftEyeBaseX, y: eyeBaseY, z: -0.025 };
  landmarks[473] = { x: rightEyeBaseX, y: eyeBaseY, z: -0.025 };

  // Build 52 blendshape scores
  const blendshapes: BlendshapeCategory[] = BLENDSHAPE_NAMES.map((name) => {
    let score = 0.02;
    if (name === 'eyeBlinkLeft' || name === 'eyeBlinkRight') {
      score = blinkScore;
    } else if (name === 'mouthSmileLeft' || name === 'mouthSmileRight') {
      score = smileScore;
    } else if (name === 'jawOpen') {
      score = Math.max(0.02, Math.sin(t * 1.2) * 0.15);
    } else if (name === 'browInnerUp') {
      score = Math.max(0.05, Math.sin(t * 0.7) * 0.4);
    }
    return { categoryName: name, score: Math.round(score * 100) / 100 };
  });

  return { landmarks, blendshapes };
}
