// Starfield — parallax background with 3-depth layers, twinkle, nebula clouds, vignette
// v2: ES module; drop-in for v1 StarField.

import { rand } from '../core/utils.js';
import { CONFIG, RENDER } from '../core/config.js';

class StarField {
  constructor() {
    this.layers = [];
    this.twinklePhase = 0;
    for (let i = 0; i < RENDER.STAR_LAYERS; i++) {
      const layer = [];
      const count = Math.floor(CONFIG.STAR_COUNT * (1 - i * 0.2));
      for (let j = 0; j < count; j++) {
        layer.push({
          x: rand(0, CONFIG.WIDTH),
          y: rand(0, CONFIG.HEIGHT),
          size: rand(0.5, 1.5 + i * 0.6),
          speed: rand(10 + i * 20, 30 + i * 40),
          brightness: rand(0.3, 1),
          twinkleSpeed: rand(1, 4),
          twinkleOffset: rand(0, Math.PI * 2),
          hue: 210 + rand(-20, 20) + (i === 2 ? 20 : -10),
        });
      }
      this.layers.push(layer);
    }
    this.nebulaOffset = 0;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    for (const layer of this.layers) {
      for (const s of layer) {
        s.y += s.speed * dt;
        if (s.y > CONFIG.HEIGHT + 2) {
          s.y = -2;
          s.x = rand(0, CONFIG.WIDTH);
        }
      }
    }
    this.nebulaOffset += dt * 4;
  }

  render(ctx, sector) {
    const palette = sector || CONFIG.SECTORS.default;
    // Deep space base gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
    const g = palette.gradient;
    grad.addColorStop(0, g[0]);
    grad.addColorStop(0.3, g[1]);
    grad.addColorStop(0.6, g[2]);
    grad.addColorStop(1, g[3]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Nebula clouds (4 shifting orbs, additive-ish alpha)
    ctx.globalAlpha = 0.12;
    const nebulaColors = palette.nebula;
    for (let i = 0; i < 4; i++) {
      const cx = CONFIG.WIDTH * (0.2 + i * 0.2) + Math.sin(this.nebulaOffset * 0.08 + i * 1.7) * 70;
      const cy = CONFIG.HEIGHT * (0.15 + i * 0.23) + Math.cos(this.nebulaOffset * 0.06 + i * 2.3) * 50;
      const rad = CONFIG.WIDTH * (0.25 + Math.sin(this.nebulaOffset * 0.03 + i) * 0.05);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, nebulaColors[i % nebulaColors.length]);
      g.addColorStop(0.5, nebulaColors[(i + 1) % nebulaColors.length] + '66');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Shooting star (rare)
    if (Math.sin(this.time * 0.3) > 0.95) {
      const sx = rand(0, CONFIG.WIDTH * 0.6);
      const sy = rand(0, CONFIG.HEIGHT * 0.4);
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#88ccff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 40, sy + 30);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(sx + 40, sy + 30);
      ctx.lineTo(sx + 60, sy + 45);
      ctx.stroke();
      ctx.restore();
    }

    // Stars with twinkle
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      for (const s of layer) {
        const twinkle = 0.6 + 0.4 * Math.sin(this.time * s.twinkleSpeed + s.twinkleOffset);
        const baseAlpha = s.brightness * (li === 0 ? 0.4 : li === 1 ? 0.65 : 0.9);
        const alpha = baseAlpha * twinkle;
        const sat = 30 + li * 10;
        ctx.fillStyle = `hsla(${s.hue}, ${sat}%, 85%, ${alpha})`;
        ctx.shadowColor = li === 2 ? 'rgba(200, 220, 255, 0.3)' : 'transparent';
        ctx.shadowBlur = li === 2 ? s.size * 2 : 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // Vignette
    const vigGrad = ctx.createRadialGradient(
      CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.25,
      CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.7
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, `rgba(0,0,0,${RENDER.VIGNETTE_STRENGTH})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }
}

export { StarField };