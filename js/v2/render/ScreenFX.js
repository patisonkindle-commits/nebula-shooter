// ScreenFX — juice module: screen shake, flash, chromatic aberration, hit-pause, shockwaves.
// v2: decoupled from Game so it can be reused/tested standalone. Pure state + update/render.
// Ports v1 decay logic verbatim (0.88 shake/chroma, 0.92 flash, min thresholds) +
// adds radial shockwave rings (boss death/revive).

import { CONFIG } from '../core/config.js';
import { rand } from '../core/utils.js';

class ScreenFX {
  constructor() {
    this.screenShake = 0;
    this.screenFlash = 0;
    this.chromaticIntensity = 0;
    this.hitPauseRemaining = 0;
    this.shockwaves = []; // {x, y, r, maxR, speed, alpha, decay}
  }

  /** Trigger an impulse. amount applied, decay handled over subsequent frames. */
  addShake(amount) { this.screenShake = Math.max(this.screenShake, amount); }
  addFlash(amount) { this.screenFlash = Math.max(this.screenFlash, amount); }
  addChromatic(amount) { this.chromaticIntensity = Math.max(this.chromaticIntensity, amount); }
  addHitPause(seconds) { this.hitPauseRemaining = Math.max(this.hitPauseRemaining, seconds); }

  /** Add a radial shockwave ring expanding from (x,y). */
  addShockwave(x, y, maxR = 180, speed = 900, alpha = 0.5) {
    this.shockwaves.push({ x, y, r: 8, maxR, speed, alpha, decay: 0.985 });
    if (this.shockwaves.length > 12) this.shockwaves.shift();
  }

  /** Frame update — decay juice + advance shockwaves. Pure, time-based. */
  update(dt) {
    // v1-verbatim decay (per-60fps frame)
    this.screenShake *= Math.pow(CONFIG.SCREEN_SHAKE_DECAY, dt * 60);
    if (this.screenShake < 0.5) this.screenShake = 0;
    this.chromaticIntensity *= Math.pow(CONFIG.CHROMATIC_DECAY, dt * 60);
    if (this.chromaticIntensity < 0.5) this.chromaticIntensity = 0;
    this.screenFlash *= Math.pow(CONFIG.FLASH_DECAY, dt * 60);
    if (this.screenFlash < 0.01) this.screenFlash = 0;
    // hit-pause decrement
    if (this.hitPauseRemaining > 0) {
      this.hitPauseRemaining -= dt;
      if (this.hitPauseRemaining < 0) this.hitPauseRemaining = 0;
    }
    // shockwaves expand + fade
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += s.speed * dt;
      s.alpha *= s.decay;
      if (s.r > s.maxR || s.alpha < 0.02) this.shockwaves.splice(i, 1);
    }
  }

  /** Should we pause the fixed loop (hit-pause / freeze-frame)? */
  get isHitPaused() { return this.hitPauseRemaining > 0; }

  /** Apply camera shake translate to ctx. Returns {x, y} shake offset. */
  applyShake(ctx, intensityScale = 1) {
    if (this.screenShake <= 0.5) return { x: 0, y: 0 };
    const s = this.screenShake * intensityScale;
    const x = rand(-s, s);
    const y = rand(-s, s);
    ctx.translate(x, y);
    return { x, y };
  }

  /**
   * Draw full-screen flash overlay (white channel).
   * @param {CanvasRenderingContext2D} ctx
   */
  drawFlash(ctx) {
    if (this.screenFlash <= 0.01) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.screenFlash)})`;
    ctx.fillRect(-10, -10, ctx.canvas.width + 20, ctx.canvas.height + 20);
    ctx.restore();
  }

  /**
   * Draw RGB-split chromatic aberration by re-drawing the buffered canvas offset
   * in screen-blend. Reuses a chroma buffer so we don't draw the live canvas twice.
   * @param {CanvasRenderingContext2D} ctx main ctx
   * @param {HTMLCanvasElement} chromaCanvas reusable offscreen (size = buffer)
   * @param {number} bufferW buffer pixel width
   * @param {number} bufferH buffer pixel height
   */
  drawChromatic(ctx, chromaCanvas, bufferW, bufferH) {
    if (this.chromaticIntensity <= 0.5) return;
    const off = 1.5 * this.chromaticIntensity;
    const cctx = chromaCanvas.getContext('2d');
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.clearRect(0, 0, bufferW, bufferH);
    cctx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(ctx.canvas, off, 0);
    ctx.drawImage(ctx.canvas, -off, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(chromaCanvas, 0, 0);
    ctx.restore();
  }

  /** Draw currently-active shockwave rings (additive, center around (x,y) in scene space). */
  drawShockwaves(ctx) {
    if (!this.shockwaves.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.shockwaves) {
      ctx.strokeStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.lineWidth = 2 + s.r * 0.02;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export { ScreenFX };