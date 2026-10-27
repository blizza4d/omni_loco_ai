import { GestureEventPayload } from '../gesture-events';
import { Landmark3D } from '../types';
import {
  GestureFXConfig,
  GestureFXType,
  Particle,
  Shockwave,
  ActiveChargeEffect,
  ActiveRayEffect,
} from './types';
import { FX_PRESET_PALETTES, loadFXConfig } from './fx-registry';
import { soundSynth } from './sound-synth';
import { mapNormalizedToCanvas } from '@/core/camera/coordinates';

const MAX_PARTICLES = 300;

export class GestureFXEngine {
  private config: GestureFXConfig;
  private particlePool: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private activeCharges: Map<'Left' | 'Right', ActiveChargeEffect> = new Map();
  private activeRays: Map<'Left' | 'Right', ActiveRayEffect> = new Map();
  private lastRenderTime: number = performance.now();
  private activeFingerCount: { count: number; x: number; y: number; alpha: number } | null = null;
  private prefersReducedMotion: boolean = false;

  constructor(initialConfig?: GestureFXConfig) {
    this.config = initialConfig || loadFXConfig();
    soundSynth.setEnabled(this.config.audioEnabled);

    // Initialize pre-allocated particle pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        angle: 0,
        vRot: 0,
        life: 0,
        maxLife: 1,
        color: '#ffffff',
        shape: 'circle',
      });
    }

    if (typeof window !== 'undefined') {
      try {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = media.matches;
        media.addEventListener('change', (e) => {
          this.prefersReducedMotion = e.matches;
        });
      } catch {
        // matchMedia not available
      }
    }
  }

  updateConfig(newConfig: GestureFXConfig): void {
    this.config = newConfig;
    soundSynth.setEnabled(newConfig.audioEnabled);
  }

  getConfig(): GestureFXConfig {
    return this.config;
  }

  private getPalette() {
    return FX_PRESET_PALETTES[this.config.preset] || FX_PRESET_PALETTES.CYBER_NEON;
  }

  /**
   * Acquire an inactive particle from the pool
   */
  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    maxLife: number,
    color: string,
    shape: 'circle' | 'square' | 'line' | 'ring' = 'circle'
  ): void {
    const p = this.particlePool.find((item) => !item.active);
    if (!p) return;

    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx * (this.prefersReducedMotion ? 0.3 : 1.0);
    p.vy = vy * (this.prefersReducedMotion ? 0.3 : 1.0);
    p.size = size * this.config.intensity;
    p.angle = Math.random() * Math.PI * 2;
    p.vRot = (Math.random() - 0.5) * 0.15;
    p.life = 0;
    p.maxLife = Math.max(10, Math.floor(maxLife / (this.prefersReducedMotion ? 1.5 : 1.0)));
    p.color = color;
    p.shape = shape;
  }

  /**
   * Spawn a shockwave ring
   */
  private spawnShockwave(
    x: number,
    y: number,
    maxRadius: number,
    color: string,
    lineWidth = 2.5
  ): void {
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: maxRadius * this.config.intensity,
      color,
      alpha: 1.0,
      lineWidth,
    });
    if (this.shockwaves.length > 12) {
      this.shockwaves.shift();
    }
  }

  /**
   * Primary entry point: process incoming gesture events from the state machine
   */
  onGestureEvent(
    event: GestureEventPayload,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean
  ): void {
    if (!this.config.enabled) return;

    const mappedFX = this.config.mappings[event.gesture] || 'NONE';
    if (mappedFX === 'NONE') return;

    const palette = this.getPalette();
    const palm = mapNormalizedToCanvas(
      event.palmCenter.x,
      event.palmCenter.y,
      canvasWidth,
      canvasHeight,
      isMirrored
    );

    const landmarks = event.landmarks;
    const indexTip =
      landmarks && landmarks[8]
        ? mapNormalizedToCanvas(landmarks[8].x, landmarks[8].y, canvasWidth, canvasHeight, isMirrored)
        : palm;
    const middleTip =
      landmarks && landmarks[12]
        ? mapNormalizedToCanvas(landmarks[12].x, landmarks[12].y, canvasWidth, canvasHeight, isMirrored)
        : palm;
    const thumbTip =
      landmarks && landmarks[4]
        ? mapNormalizedToCanvas(landmarks[4].x, landmarks[4].y, canvasWidth, canvasHeight, isMirrored)
        : palm;

    switch (mappedFX) {
      case 'HOLOGRAM_BURST': {
        if (event.phase === 'start') {
          soundSynth.playChime(650, 0.35);
          this.spawnShockwave(palm.x, palm.y, 85, palette.primary, 3);
          const count = Math.floor(24 * this.config.particleCountMultiplier);
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            const speed = 2.5 + Math.random() * 5.0;
            this.spawnParticle(
              palm.x,
              palm.y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              4 + Math.random() * 6,
              30 + Math.random() * 18,
              i % 2 === 0 ? palette.primary : palette.secondary,
              'square'
            );
          }
        }
        break;
      }

      case 'POWER_CHARGE': {
        if (event.phase === 'start' || event.phase === 'active') {
          let charge = this.activeCharges.get(event.hand);
          if (!charge) {
            charge = {
              hand: event.hand,
              x: palm.x,
              y: palm.y,
              charge: 0,
              radius: 12,
              rotation: 0,
            };
            this.activeCharges.set(event.hand, charge);
          }
          charge.x = palm.x;
          charge.y = palm.y;
          charge.charge = Math.min(1.0, charge.charge + 0.04);
          charge.radius = 15 + charge.charge * 30;
          charge.rotation += 0.12;

          // Siphon particles into center
          if (Math.random() < 0.6) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const dist = 45 + Math.random() * 35;
            const sx = palm.x + Math.cos(spawnAngle) * dist;
            const sy = palm.y + Math.sin(spawnAngle) * dist;
            const vx = (palm.x - sx) * 0.1;
            const vy = (palm.y - sy) * 0.1;
            this.spawnParticle(sx, sy, vx, vy, 3, 14, palette.accent, 'circle');
          }
        } else if (event.phase === 'release') {
          // Explode on release!
          const charge = this.activeCharges.get(event.hand);
          if (charge) {
            soundSynth.playShockwave();
            this.spawnShockwave(palm.x, palm.y, 110 * charge.charge, palette.accent, 4);
            const count = Math.floor(36 * charge.charge * this.config.particleCountMultiplier);
            for (let i = 0; i < count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 4 + Math.random() * 8;
              this.spawnParticle(
                palm.x,
                palm.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                5 + Math.random() * 5,
                35 + Math.random() * 15,
                palette.accent,
                'ring'
              );
            }
            this.activeCharges.delete(event.hand);
          }
        }
        break;
      }

      case 'SPATIAL_RAY': {
        if (event.phase === 'start' || event.phase === 'active') {
          // Direction vector along index finger (joint 7 -> 8)
          let dirX = 0;
          let dirY = -1;
          if (landmarks && landmarks[7] && landmarks[8]) {
            const p7 = mapNormalizedToCanvas(
              landmarks[7].x,
              landmarks[7].y,
              canvasWidth,
              canvasHeight,
              isMirrored
            );
            const dx = indexTip.x - p7.x;
            const dy = indexTip.y - p7.y;
            const len = Math.hypot(dx, dy);
            if (len > 0.001) {
              dirX = dx / len;
              dirY = dy / len;
            }
          }

          const beamLength = 260 * this.config.intensity;
          const targetX = indexTip.x + dirX * beamLength;
          const targetY = indexTip.y + dirY * beamLength;

          this.activeRays.set(event.hand, {
            hand: event.hand,
            startX: indexTip.x,
            startY: indexTip.y,
            targetX,
            targetY,
            angle: Math.atan2(dirY, dirX),
            intensity: event.confidence,
          });

          if (event.phase === 'start') {
            soundSynth.playZap();
          }

          // Sparks at ray end
          if (Math.random() < 0.7) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            this.spawnParticle(
              targetX,
              targetY,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              3,
              12,
              palette.primary,
              'line'
            );
          }
        } else if (event.phase === 'release') {
          this.activeRays.delete(event.hand);
        }
        break;
      }

      case 'DUAL_BEACON': {
        if (event.phase === 'start') {
          soundSynth.playChime(784, 0.25);
          this.spawnShockwave(indexTip.x, indexTip.y, 45, palette.secondary, 2);
          this.spawnShockwave(middleTip.x, middleTip.y, 45, palette.secondary, 2);
        }
        if (Math.random() < 0.5) {
          const midX = (indexTip.x + middleTip.x) / 2;
          const midY = (indexTip.y + middleTip.y) / 2;
          this.spawnParticle(
            midX,
            midY,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            3.5,
            16,
            palette.secondary,
            'ring'
          );
        }
        break;
      }

      case 'STATUS_PULSE': {
        if (event.phase === 'start') {
          soundSynth.playChime(987.77, 0.2);
          this.spawnShockwave(thumbTip.x, thumbTip.y, 65, palette.secondary, 3);
          const count = Math.floor(16 * this.config.particleCountMultiplier);
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            this.spawnParticle(
              thumbTip.x,
              thumbTip.y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              3,
              20,
              palette.secondary,
              'circle'
            );
          }
        }
        break;
      }

      case 'GRAVITY_LOCK': {
        const pinchCenterX = (thumbTip.x + indexTip.x) / 2;
        const pinchCenterY = (thumbTip.y + indexTip.y) / 2;

        if (event.phase === 'start') {
          soundSynth.playChime(523.25, 0.18);
          this.spawnShockwave(pinchCenterX, pinchCenterY, 35, palette.accent, 2);
        } else if (event.phase === 'active') {
          // Gravitational swirling rings
          if (Math.random() < 0.4) {
            const a = Math.random() * Math.PI * 2;
            const r = 18 + Math.random() * 20;
            const px = pinchCenterX + Math.cos(a) * r;
            const py = pinchCenterY + Math.sin(a) * r;
            const vx = -Math.sin(a) * 2.5;
            const vy = Math.cos(a) * 2.5;
            this.spawnParticle(px, py, vx, vy, 2.5, 18, palette.primary, 'circle');
          }
        } else if (event.phase === 'release') {
          soundSynth.playShockwave();
          this.spawnShockwave(pinchCenterX, pinchCenterY, 50, palette.primary, 2);
        }
        break;
      }

      case 'AFTERIMAGE_TRAIL': {
        if (event.phase === 'start') {
          soundSynth.playWhoosh();
          const count = Math.floor(20 * this.config.particleCountMultiplier);
          const dir =
            event.gesture === 'swipe_right'
              ? 1
              : event.gesture === 'swipe_left'
              ? -1
              : 0;
          const dirY =
            event.gesture === 'swipe_down'
              ? 1
              : event.gesture === 'swipe_up'
              ? -1
              : 0;

          for (let i = 0; i < count; i++) {
            const vx = (dir !== 0 ? dir * (5 + Math.random() * 7) : (Math.random() - 0.5) * 4);
            const vy = (dirY !== 0 ? dirY * (5 + Math.random() * 7) : (Math.random() - 0.5) * 4);
            this.spawnParticle(
              palm.x + (Math.random() - 0.5) * 30,
              palm.y + (Math.random() - 0.5) * 30,
              vx,
              vy,
              4 + Math.random() * 6,
              22 + Math.random() * 12,
              palette.primary,
              'line'
            );
          }
        }
        break;
      }

      case 'DIGIT_PROTOCOL': {
        // Parse finger count from gesture label or confidence
        let count = 5;
        if (event.gesture.includes('1') || event.gesture === 'pointing') count = 1;
        else if (event.gesture.includes('2') || event.gesture === 'peace_sign') count = 2;
        else if (event.gesture.includes('3')) count = 3;
        else if (event.gesture.includes('4')) count = 4;
        else if (event.gesture.includes('5') || event.gesture === 'open_palm') count = 5;

        this.activeFingerCount = {
          count,
          x: palm.x,
          y: palm.y - 70,
          alpha: 1.0,
        };
        break;
      }
    }
  }

  /**
   * 60 FPS Render loop for Canvas overlays
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.config.enabled) return;

    const now = performance.now();
    const dt = Math.min(32, now - this.lastRenderTime) / 1000;
    this.lastRenderTime = now;

    const palette = this.getPalette();
    ctx.save();

    // 1. Render Active Lasers / Spatial Rays
    this.activeRays.forEach((ray) => {
      ctx.save();
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 3.5;
      if (this.config.glowEnabled) {
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 12;
      }

      // Collimated core beam
      ctx.beginPath();
      ctx.moveTo(ray.startX, ray.startY);
      ctx.lineTo(ray.targetX, ray.targetY);
      ctx.stroke();

      // Outer luminous halo
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ray.startX, ray.startY);
      ctx.lineTo(ray.targetX, ray.targetY);
      ctx.stroke();

      // Reticle target at end
      ctx.beginPath();
      ctx.arc(ray.targetX, ray.targetY, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ray.targetX - 14, ray.targetY);
      ctx.lineTo(ray.targetX + 14, ray.targetY);
      ctx.moveTo(ray.targetX, ray.targetY - 14);
      ctx.lineTo(ray.targetX, ray.targetY + 14);
      ctx.stroke();

      ctx.restore();
    });

    // 2. Render Active Plasma Charges
    this.activeCharges.forEach((charge) => {
      ctx.save();
      ctx.translate(charge.x, charge.y);
      ctx.rotate(charge.rotation);

      if (this.config.glowEnabled) {
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = 18 * charge.charge;
      }

      // Orbital energy rings
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, charge.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-charge.radius * 0.7, -charge.radius * 0.7, charge.radius * 1.4, charge.radius * 1.4);

      // Core plasma sphere
      const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, charge.radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, palette.accent);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, charge.radius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 3. Render Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i]!;
      sw.radius += (sw.maxRadius - sw.radius) * 0.22;
      sw.alpha = Math.max(0, 1.0 - sw.radius / sw.maxRadius);

      if (sw.alpha <= 0.02 || sw.radius >= sw.maxRadius - 1) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      if (this.config.glowEnabled) {
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Render Active Digit Protocol
    if (this.activeFingerCount && this.activeFingerCount.alpha > 0.05) {
      const af = this.activeFingerCount;
      af.alpha -= 0.02;

      ctx.save();
      ctx.globalAlpha = af.alpha;
      ctx.fillStyle = palette.primary;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (this.config.glowEnabled) {
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 10;
      }
      ctx.fillText(`[FIG.${af.count}] DIGITS: ${af.count}`, af.x, af.y);

      // Radial node ring
      for (let j = 0; j < 5; j++) {
        const rad = (j / 5) * Math.PI * 2 - Math.PI / 2;
        const nx = af.x + Math.cos(rad) * 24;
        const ny = af.y + 30 + Math.sin(rad) * 12;
        ctx.beginPath();
        ctx.arc(nx, ny, j < af.count ? 4 : 2, 0, Math.PI * 2);
        ctx.fillStyle = j < af.count ? palette.secondary : '#4b5563';
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Update & Render Particle Pool
    for (const p of this.particlePool) {
      if (!p.active) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.vRot;
      p.life++;

      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;

      if (this.config.glowEnabled && alpha > 0.4) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
      }

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'square') {
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.shape === 'ring') {
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'line') {
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  clear(): void {
    this.particlePool.forEach((p) => (p.active = false));
    this.shockwaves = [];
    this.activeCharges.clear();
    this.activeRays.clear();
    this.activeFingerCount = null;
  }
}
