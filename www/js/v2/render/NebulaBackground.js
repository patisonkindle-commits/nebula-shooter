// NebulaBackground — slowly-drifting, pulsing radial-gradient blobs
// v2: CPU-cheap, additive blend for glowing nebula feel. 6 blobs pre-rendered to sprites.

import { rand } from '../core/utils.js';
import { CONFIG, RENDER } from '../core/config.js';

const NEBULA_TINTS = ['#6a2c91', '#1d4ed8', '#0ea5e9', '#ff2d55', '#7c3aed', '#0d9488'];

class NebulaBackground {
  constructor() {
    this.blobs = [];
    const count = RENDER.NEBULA_BLOBS || 6;
    for (let i = 0; i < count; i++) {
      const sprite = this._makeSprite(i);
      this.blobs.push({
        sprite,
        x: rand(0, CONFIG.WIDTH),
        y: rand(0, CONFIG.HEIGHT),
        vx: rand(-RENDER.NEBULA_SPEED, RENDER.NEBULA_SPEED),
        vy: rand(-RENDER.NEBULA_SPEED, RENDER.NEBULA_SPEED),
        alpha: rand(0.05, 0.12),
        phase: rand(0, Math.PI * 2),
        driftSpeed: rand(0.3, 0.8),
      });
    }
  }

  _makeSprite(index) {
    // Pre-render: one sprite per blob, gradient cached once for CPU savings
    const radius = CONFIG.WIDTH * rand(0.2, 0.6);
    const c = document.createElement('canvas');
    c.width = Math.ceil(radius * 2);
    c.height = Math.ceil(radius * 2);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    g.addColorStop(0, NEBULA_TINTS[index % NEBULA_TINTS.length]);
    g.addColorStop(0.6, NEBULA_TINTS[index % NEBULA_TINTS.length] + 'aa');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  update(dt) {
    for (const b of this.blobs) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += dt * b.driftSpeed;
      const pad = b.sprite.width / 2;
      if (b.x < -pad) b.x = CONFIG.WIDTH + pad;
      if (b.x > CONFIG.WIDTH + pad) b.x = -pad;
      if (b.y < -pad) b.y = CONFIG.HEIGHT + pad;
      if (b.y > CONFIG.HEIGHT + pad) b.y = -pad;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.blobs) {
      const pulse = 1 + 0.08 * Math.sin(b.phase * 2);
      ctx.globalAlpha = b.alpha * pulse;
      ctx.drawImage(b.sprite, b.x - b.sprite.width / 2, b.y - b.sprite.height / 2);
    }
    ctx.restore();
  }
}

export { NebulaBackground };