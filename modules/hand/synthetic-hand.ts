import { Landmark3D } from './types';

/**
 * Generates an anatomically structured 21-landmark hand pose in 3D normalized coordinates.
 * Allows deterministic camera-less testing and synthetic demonstration mode.
 */
export function generateSyntheticHand(timeMs: number, mode: 'pinch' | 'wave' | 'point' = 'pinch'): Landmark3D[] {
  const t = timeMs / 1000;
  // Base wrist oscillation
  const baseX = 0.5 + Math.sin(t * 1.5) * 0.15;
  const baseY = 0.55 + Math.cos(t * 1.2) * 0.1;
  const baseZ = 0;

  // Simulate pinch cycle (opens and closes every 2.5 seconds)
  const pinchPhase = (Math.sin(t * 2.5) + 1) / 2; // 0 = open, 1 = pinched

  const landmarks: Landmark3D[] = [];

  // 0: Wrist
  landmarks.push({ x: baseX, y: baseY, z: baseZ });

  // Thumb (1, 2, 3, 4)
  const thumbSpread = 0.08 * (1 - pinchPhase * 0.7);
  landmarks.push({ x: baseX - thumbSpread * 0.3, y: baseY - 0.05, z: baseZ - 0.01 });
  landmarks.push({ x: baseX - thumbSpread * 0.6, y: baseY - 0.10, z: baseZ - 0.02 });
  landmarks.push({ x: baseX - thumbSpread * 0.8, y: baseY - 0.14, z: baseZ - 0.03 });
  // Thumb Tip (4) moves toward Index Tip (8) when pinched
  const thumbTipX = baseX - thumbSpread * 0.9 + pinchPhase * 0.07;
  const thumbTipY = baseY - 0.18 + pinchPhase * 0.03;
  landmarks.push({ x: thumbTipX, y: thumbTipY, z: baseZ - 0.04 });

  // Index (5, 6, 7, 8)
  landmarks.push({ x: baseX - 0.03, y: baseY - 0.12, z: baseZ - 0.01 });
  landmarks.push({ x: baseX - 0.03, y: baseY - 0.18, z: baseZ - 0.02 });
  landmarks.push({ x: baseX - 0.025, y: baseY - 0.23, z: baseZ - 0.03 });
  // Index Tip (8)
  const indexTipX = baseX - 0.02 - pinchPhase * 0.02;
  const indexTipY = baseY - 0.27 + pinchPhase * 0.08;
  landmarks.push({ x: indexTipX, y: indexTipY, z: baseZ - 0.04 });

  // Middle (9, 10, 11, 12)
  landmarks.push({ x: baseX + 0.01, y: baseY - 0.12, z: baseZ - 0.01 });
  landmarks.push({ x: baseX + 0.01, y: baseY - 0.19, z: baseZ - 0.02 });
  landmarks.push({ x: baseX + 0.01, y: baseY - 0.25, z: baseZ - 0.03 });
  landmarks.push({ x: baseX + 0.01, y: baseY - 0.30, z: baseZ - 0.04 });

  // Ring (13, 14, 15, 16)
  landmarks.push({ x: baseX + 0.05, y: baseY - 0.11, z: baseZ - 0.01 });
  landmarks.push({ x: baseX + 0.05, y: baseY - 0.17, z: baseZ - 0.02 });
  landmarks.push({ x: baseX + 0.05, y: baseY - 0.22, z: baseZ - 0.03 });
  landmarks.push({ x: baseX + 0.05, y: baseY - 0.26, z: baseZ - 0.04 });

  // Pinky (17, 18, 19, 20)
  landmarks.push({ x: baseX + 0.09, y: baseY - 0.09, z: baseZ - 0.01 });
  landmarks.push({ x: baseX + 0.10, y: baseY - 0.14, z: baseZ - 0.02 });
  landmarks.push({ x: baseX + 0.11, y: baseY - 0.18, z: baseZ - 0.03 });
  landmarks.push({ x: baseX + 0.11, y: baseY - 0.21, z: baseZ - 0.04 });

  return landmarks;
}
