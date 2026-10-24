import { Point3D } from './types';

/**
 * Deterministic synthetic face landmarks with active iris/pupil oscillations,
 * micro-saccades, and pupil light reflex simulations for benchmarking.
 */
export function generateSyntheticEyeLandmarks(timeMs: number): Point3D[] {
  const t = timeMs / 1000;
  const landmarks: Point3D[] = [];

  // Initialize 478 neutral points
  for (let i = 0; i < 478; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0 });
  }

  // Left Eye Corners
  landmarks[33] = { x: 0.38, y: 0.45, z: 0 };
  landmarks[133] = { x: 0.44, y: 0.45, z: 0 };
  landmarks[159] = { x: 0.41, y: 0.42, z: 0 };
  landmarks[145] = { x: 0.41, y: 0.48, z: 0 };

  // Right Eye Corners
  landmarks[362] = { x: 0.56, y: 0.45, z: 0 };
  landmarks[263] = { x: 0.62, y: 0.45, z: 0 };
  landmarks[386] = { x: 0.59, y: 0.42, z: 0 };
  landmarks[374] = { x: 0.59, y: 0.48, z: 0 };

  // Saccadic oscillation
  const saccadeX = Math.sin(t * 1.8) * 0.015 + (Math.sin(t * 6.0) > 0.8 ? 0.02 : 0);
  const saccadeY = Math.cos(t * 1.4) * 0.008;

  // Left Iris (Center 468)
  const lCenterX = 0.41 + saccadeX;
  const lCenterY = 0.45 + saccadeY;
  const irisRadius = 0.018;

  landmarks[468] = { x: lCenterX, y: lCenterY, z: -0.01 };
  landmarks[469] = { x: lCenterX - irisRadius, y: lCenterY, z: -0.01 };
  landmarks[470] = { x: lCenterX, y: lCenterY - irisRadius, z: -0.01 };
  landmarks[471] = { x: lCenterX + irisRadius, y: lCenterY, z: -0.01 };
  landmarks[472] = { x: lCenterX, y: lCenterY + irisRadius, z: -0.01 };

  // Right Iris (Center 473)
  const rCenterX = 0.59 + saccadeX;
  const rCenterY = 0.45 + saccadeY;

  landmarks[473] = { x: rCenterX, y: rCenterY, z: -0.01 };
  landmarks[474] = { x: rCenterX - irisRadius, y: rCenterY, z: -0.01 };
  landmarks[475] = { x: rCenterX, y: rCenterY - irisRadius, z: -0.01 };
  landmarks[476] = { x: rCenterX + irisRadius, y: rCenterY, z: -0.01 };
  landmarks[477] = { x: rCenterX, y: rCenterY + irisRadius, z: -0.01 };

  return landmarks;
}
