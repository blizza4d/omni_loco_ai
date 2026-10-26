'use client';

export type HeatVisionColor = 'CRIMSON' | 'SOLAR' | 'CYAN' | 'VIOLET';

export interface HeatVisionConfig {
  enabled: boolean;
  colorScheme: HeatVisionColor;
  intensity: number; // 0.5 to 2.0
  beamLength: 'TARGET' | 'INFINITE';
  aimMode?: 'GAZE_VECTOR' | 'MANUAL_RETICLE';
  manualTarget?: { x: number; y: number } | null;
  glowRadius: number; // 15 to 45
  sparksEnabled: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_HEAT_VISION_CONFIG: HeatVisionConfig = {
  enabled: false,
  colorScheme: 'CRIMSON',
  intensity: 1.2,
  beamLength: 'TARGET',
  aimMode: 'GAZE_VECTOR',
  manualTarget: null,
  glowRadius: 28,
  sparksEnabled: true,
  soundEnabled: false,
};

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class HeatVisionRenderer {
  private particles: EmberParticle[] = [];
  private maxParticles = 35;
  private animTime = 0;

  private getColorPalette(scheme: HeatVisionColor) {
    switch (scheme) {
      case 'SOLAR':
        return {
          core: '#FFFFFF',
          sheath: '#FFB703',
          outer: 'rgba(251, 133, 0, 0.35)',
          spill: 'rgba(255, 183, 3, 0.35)',
          spark: '#FFD166',
        };
      case 'CYAN':
        return {
          core: '#FFFFFF',
          sheath: '#00F5D4',
          outer: 'rgba(0, 187, 249, 0.35)',
          spill: 'rgba(0, 245, 212, 0.35)',
          spark: '#70E000',
        };
      case 'VIOLET':
        return {
          core: '#FFFFFF',
          sheath: '#E879F9',
          outer: 'rgba(168, 85, 247, 0.35)',
          spill: 'rgba(232, 121, 249, 0.35)',
          spark: '#F472B6',
        };
      case 'CRIMSON':
      default:
        return {
          core: '#FFFFFF',
          sheath: '#FF2A10',
          outer: 'rgba(255, 20, 20, 0.35)',
          spill: 'rgba(255, 42, 16, 0.35)',
          spark: '#FFAA33',
        };
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    leftEye: { x: number; y: number } | null,
    rightEye: { x: number; y: number } | null,
    targetPoint: { x: number; y: number } | null,
    config: HeatVisionConfig,
    now: number
  ): void {
    if (!config.enabled) return;
    // Both eyes occluded or not detected: do NOT render frozen floating lasers
    if (!leftEye && !rightEye) return;

    this.animTime = now * 0.006;
    const colors = this.getColorPalette(config.colorScheme);
    const intensity = config.intensity;
    const glowRadius = config.glowRadius * intensity;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // 1. Draw Ocular Aura & Facial Light Spill on visible eyes
    if (leftEye) {
      this.drawOcularSpill(ctx, leftEye.x, leftEye.y, glowRadius, colors);
      if (config.sparksEnabled) {
        this.drawEyeSocketArcs(ctx, leftEye.x, leftEye.y, glowRadius * 0.7, colors.sheath);
      }
    }
    if (rightEye) {
      this.drawOcularSpill(ctx, rightEye.x, rightEye.y, glowRadius, colors);
      if (config.sparksEnabled) {
        this.drawEyeSocketArcs(ctx, rightEye.x, rightEye.y, glowRadius * 0.7, colors.sheath);
      }
    }

    // 2. Compute Target Point based on Aim Mode
    const effectiveTarget =
      config.aimMode === 'MANUAL_RETICLE' && config.manualTarget
        ? config.manualTarget
        : targetPoint;

    const midEyeX =
      leftEye && rightEye
        ? (leftEye.x + rightEye.x) / 2
        : leftEye
        ? leftEye.x
        : rightEye!.x;
    const midEyeY =
      leftEye && rightEye
        ? (leftEye.y + rightEye.y) / 2
        : leftEye
        ? leftEye.y
        : rightEye!.y;

    // 3. Render Laser Beams for active eyes
    if (leftEye) {
      const { tx, ty } = this.calculateBeamTarget(
        leftEye,
        midEyeX,
        midEyeY,
        effectiveTarget,
        config.beamLength,
        width,
        height
      );
      this.drawLaserBeam(ctx, leftEye.x, leftEye.y, tx, ty, colors, intensity);
      this.drawIrisCore(ctx, leftEye.x, leftEye.y, 7 * intensity, colors);
    }

    if (rightEye) {
      const { tx, ty } = this.calculateBeamTarget(
        rightEye,
        midEyeX,
        midEyeY,
        effectiveTarget,
        config.beamLength,
        width,
        height
      );
      this.drawLaserBeam(ctx, rightEye.x, rightEye.y, tx, ty, colors, intensity);
      this.drawIrisCore(ctx, rightEye.x, rightEye.y, 7 * intensity, colors);
    }

    // 4. Impact Thermal Flares & Flying Burning Embers
    if (effectiveTarget && config.beamLength === 'TARGET') {
      this.drawImpactExplosion(ctx, effectiveTarget.x, effectiveTarget.y, colors, intensity);
      if (config.sparksEnabled) {
        this.updateAndDrawEmbers(ctx, effectiveTarget.x, effectiveTarget.y, colors.spark, intensity);
      }
    }

    ctx.restore();
  }

  private calculateBeamTarget(
    eye: { x: number; y: number },
    midEyeX: number,
    midEyeY: number,
    targetPoint: { x: number; y: number } | null,
    beamLength: 'TARGET' | 'INFINITE',
    width: number,
    height: number
  ): { tx: number; ty: number } {
    if (targetPoint && beamLength === 'TARGET') {
      return { tx: targetPoint.x, ty: targetPoint.y };
    }

    const dirX = targetPoint ? targetPoint.x - midEyeX : 0;
    const dirY = targetPoint ? targetPoint.y - midEyeY : height * 0.6;
    const len = Math.max(1, Math.hypot(dirX, dirY));
    const normX = dirX / len;
    const normY = dirY / len;

    const beamDist = Math.max(width, height) * 1.5;
    return {
      tx: eye.x + normX * beamDist,
      ty: eye.y + normY * beamDist,
    };
  }

  private drawOcularSpill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    colors: { sheath: string; spill: string }
  ) {
    const grad = ctx.createRadialGradient(x, y, 2, x, y, radius * 1.8);
    grad.addColorStop(0, colors.sheath);
    grad.addColorStop(0.35, colors.spill);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawIrisCore(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    colors: { core: string; sheath: string }
  ) {
    // Outer colored corona
    ctx.fillStyle = colors.sheath;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Intense pure white core
    ctx.fillStyle = colors.core;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLaserBeam(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    colors: { core: string; sheath: string; outer: string },
    intensity: number
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    // Layer 1: Wide atmospheric energy sheath
    ctx.strokeStyle = colors.outer;
    ctx.lineWidth = 32 * intensity;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Layer 2: Plasma sheath
    ctx.strokeStyle = colors.sheath;
    ctx.lineWidth = 14 * intensity;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Layer 3: White-hot photon laser core
    ctx.strokeStyle = colors.core;
    ctx.lineWidth = 4 * intensity;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Layer 4: Helical Plasma Turbulence Coil Wrapping Around the Beam
    ctx.save();
    ctx.strokeStyle = colors.sheath;
    ctx.lineWidth = 2 * intensity;
    ctx.beginPath();

    const perpX = -dy / dist;
    const perpY = dx / dist;
    const steps = 18;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = x1 + dx * t;
      const by = y1 + dy * t;
      const wave = Math.sin(t * 12 + this.animTime * 3) * (6 * intensity);
      const px = bx + perpX * wave;
      const py = by + perpY * wave;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawEyeSocketArcs(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: string
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;

    const numArcs = 3;
    for (let i = 0; i < numArcs; i++) {
      const angle = (i * Math.PI * 2) / numArcs + Math.sin(this.animTime + i) * 0.8;
      const r1 = radius * 0.4;
      const r2 = radius * (0.9 + Math.random() * 0.3);

      const x1 = cx + Math.cos(angle) * r1;
      const y1 = cy + Math.sin(angle) * r1;
      const midAngle = angle + (Math.random() - 0.5) * 0.4;
      const midR = (r1 + r2) / 2;
      const midX = cx + Math.cos(midAngle) * midR;
      const midY = cy + Math.sin(midAngle) * midR;
      const x2 = cx + Math.cos(angle) * r2;
      const y2 = cy + Math.sin(angle) * r2;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, midY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  private drawImpactExplosion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    colors: { core: string; sheath: string; outer: string },
    intensity: number
  ) {
    const pulse = 1.0 + Math.sin(this.animTime * 6) * 0.2;
    const radius = 24 * intensity * pulse;

    // Molten thermal splash
    const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
    grad.addColorStop(0, colors.core);
    grad.addColorStop(0.3, colors.sheath);
    grad.addColorStop(0.7, colors.outer);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Shockwave ring
    ctx.strokeStyle = colors.sheath;
    ctx.lineWidth = 2 * intensity;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }

  private updateAndDrawEmbers(
    ctx: CanvasRenderingContext2D,
    spawnX: number,
    spawnY: number,
    sparkColor: string,
    intensity: number
  ) {
    // Spawn new embers at impact location
    if (this.particles.length < this.maxParticles && Math.random() < 0.6) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 4) * intensity;
      this.particles.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // slight upward thermal buoyancy
        life: 0,
        maxLife: 20 + Math.random() * 20,
        size: 1.5 + Math.random() * 2.5,
      });
    }

    // Update and draw existing particles
    ctx.fillStyle = sparkColor;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      const alpha = 1.0 - p.life / p.maxLife;
      if (alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}
