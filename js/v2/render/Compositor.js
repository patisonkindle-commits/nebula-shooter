// Canvas compositor — owns the render layer order for the v2 visual pipeline.
// v2: deep-space gradient → nebula blobs → parallax stars → (phase-1 overlays) → vignette.
// Owns the final logical→buffer transform + screen-fx hooks live in ScreenFX (Task 1.4).

import { CONFIG, RENDER } from '../core/config.js';
import { NebulaBackground } from './NebulaBackground.js';
import { StarField } from './StarField.js';

class Compositor {
  constructor() {
    // Only rebuild sprites when buffer size actually changes (dpr/resize)
    this._bgCacheKey = '';
    this.nebula = new NebulaBackground();
    this.stars = new StarField();
    // Vignette pre-rendered at logical res, blitted each frame.
    this._vignette = this._makeVignette();
  }

  _makeVignette() {
    const c = document.createElement('canvas');
    c.width = CONFIG.WIDTH;
    c.height = CONFIG.HEIGHT;
    const ctx = c.getContext('2d');
    const inner = CONFIG.WIDTH * 0.3;
    const outer = CONFIG.WIDTH * 0.85;
    const g = ctx.createRadialGradient(
      CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, inner,
      CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, outer
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${RENDER.VIGNETTE_STRENGTH})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    return c;
  }

  update(dt) {
    this.nebula.update(dt);
    this.stars.update(dt);
  }

  /**
   * Draw the full background stack onto an already-scaled ctx (logical 400x720).
   * `sector` (optional) re-tints palette; Phase 4 wires this.
   */
  render(ctx, sector) {
    this._renderBaseGradient(ctx);
    this.nebula.render(ctx);
    this.stars.render(ctx); // stars draw their own gradient too — see note
    if (this._vignette) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(this._vignette, 0, 0);
      ctx.globalAlpha = 1;
    }
  }

  /** Apply a base gradient fill matching the nebula palette (cheap, once per frame). */
  _renderBaseGradient(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
    g.addColorStop(0, '#060612');
    g.addColorStop(0.3, '#0a0820');
    g.addColorStop(0.6, '#0e0628');
    g.addColorStop(1, '#080812');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }
}

export { Compositor };