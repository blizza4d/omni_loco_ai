import { GoofyPoseType, GOOFY_POSE_METADATA } from './goofy-types';

interface ComicParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: 'star' | 'circle' | 'spark' | 'ring';
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
}

interface ComicBurst {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export class GoofyVisualFXEngine {
  private particles: ComicParticle[] = [];
  private bursts: ComicBurst[] = [];
  private activePoseBanner: { pose: GoofyPoseType; caption: string; alpha: number } | null = null;
  private prefersReducedMotion = false;
  private isShaking = false;
  private shakeIntensity = 0;
  private lastTriggerTime = 0;

  constructor() {
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

  burst(cx: number, cy: number, color = '#22c55e', count = 28): void {
    if (this.prefersReducedMotion) return;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 4 + Math.random() * 8;
      const shapes: ('star' | 'circle' | 'spark' | 'ring')[] = ['star', 'circle', 'spark', 'ring'];
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 8,
        color,
        shape: shapes[Math.floor(Math.random() * shapes.length)] || 'star',
        life: 0,
        maxLife: 30 + Math.random() * 20,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
      });
    }
  }

  getParticles(): ComicParticle[] {
    return this.particles;
  }

  update(dt = 0.016): void {
    const frameSteps = Math.max(1, Math.round(dt * 60));
    for (let s = 0; s < frameSteps; s++) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.rotation += p.vRot;
        p.life++;
        if (p.life >= p.maxLife) {
          this.particles.splice(i, 1);
        }
      }
    }
  }

  triggerPoseReaction(
    poseOrColor: GoofyPoseType | string = '#FFE600',
    canvasWidthOrShake: number | boolean = 640,
    canvasHeight = 480,
    caption?: string
  ): void {
    if (typeof canvasWidthOrShake === 'boolean') {
      const color = typeof poseOrColor === 'string' ? poseOrColor : '#FFE600';
      this.burst(320, 240, color, 30);
      if (canvasWidthOrShake) {
        this.isShaking = true;
        this.shakeIntensity = 8;
        this.lastTriggerTime = performance.now();
      }
      return;
    }

    const pose = poseOrColor as GoofyPoseType;
    const canvasWidth = canvasWidthOrShake;
    const meta = GOOFY_POSE_METADATA[pose];
    const burstText = meta?.label || pose;
    const finalCaption = caption || meta?.defaultCaption || '';

    this.activePoseBanner = {
      pose,
      caption: finalCaption,
      alpha: 1.0,
    };

    if (this.prefersReducedMotion) return;

    // Center of canvas for initial impact
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    const colors = ['#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#e11d48'];

    // Spawn comic typography burst
    this.bursts.push({
      x: cx,
      y: cy - 40,
      text: burstText,
      color: colors[Math.floor(Math.random() * colors.length)] || '#22c55e',
      life: 0,
      maxLife: 45,
      scale: 0.5,
    });

    // Spawn particles
    const particleCount = 28;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 4 + Math.random() * 8;
      const shapes: ('star' | 'circle' | 'spark' | 'ring')[] = ['star', 'circle', 'spark', 'ring'];

      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)] || '#ffffff',
        shape: shapes[Math.floor(Math.random() * shapes.length)] || 'star',
        life: 0,
        maxLife: 30 + Math.random() * 20,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
      });
    }

    this.isShaking = true;
    this.shakeIntensity = 8;
    this.lastTriggerTime = performance.now();
  }

  getShakeOffset(): { x: number; y: number } {
    if (!this.isShaking || this.prefersReducedMotion) return { x: 0, y: 0 };

    const elapsed = performance.now() - this.lastTriggerTime;
    if (elapsed > 250) {
      this.isShaking = false;
      this.shakeIntensity = 0;
      return { x: 0, y: 0 };
    }

    const damp = Math.max(0, 1 - elapsed / 250);
    return {
      x: (Math.random() - 0.5) * this.shakeIntensity * damp,
      y: (Math.random() - 0.5) * this.shakeIntensity * damp,
    };
  }

  getActiveBanner() {
    return this.activePoseBanner;
  }

  clear(): void {
    this.particles = [];
    this.bursts = [];
    this.activePoseBanner = null;
    this.isShaking = false;
  }

  /**
   * Render comic particles and visual effects at full 60 FPS
   */
  updateAndRender(ctx: CanvasRenderingContext2D, _timeMs?: number): void {
    const width = ctx.canvas?.width || 640;
    const height = ctx.canvas?.height || 480;
    this.render(ctx, width, height);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // 1. Update and render particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.rotation += p.vRot;
      p.life++;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'star') {
        this.drawStar(ctx, 0, 0, 5, p.size, p.size / 2);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ring') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(-p.size / 2, -1, p.size, 2);
      }

      ctx.restore();
    }

    // 2. Render Comic Typography Bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]!;
      b.life++;
      b.scale = Math.min(1.2, b.scale + 0.05);

      if (b.life >= b.maxLife) {
        this.bursts.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, 1 - b.life / b.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(b.x, b.y - b.life * 0.8);
      ctx.scale(b.scale, b.scale);

      ctx.font = '900 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Comic stroke outline
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0a0a0c';
      ctx.strokeText(b.text, 0, 0);

      // Bright fill
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, 0, 0);

      ctx.restore();
    }

    // 3. Fade active banner over time
    if (this.activePoseBanner) {
      this.activePoseBanner.alpha = Math.max(0, this.activePoseBanner.alpha - 0.01);
      if (this.activePoseBanner.alpha <= 0) {
        this.activePoseBanner = null;
      }
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

export { GoofyVisualFXEngine as GoofyParticleEmitter };
