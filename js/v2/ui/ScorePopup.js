// v2 ScorePopup — floating score text on enemy death
import { CONFIG } from '../core/config.js';

class ScorePopup {
  constructor() {
    this.pops = [];
  }

  add(x, y, score, color) {
    this.pops.push({ x, y, score, color, life: 1.0, vy: -60 });
  }

  update(dt) {
    this.pops.forEach(p => {
      p.life -= dt * 1.5;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
    });
    this.pops = this.pops.filter(p => p.life > 0);
  }

  render(ctx) {
    this.pops.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color || '#ffdd44';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`+${p.score}`, p.x, p.y);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    });
  }

  clear() {
    this.pops = [];
  }
}

export { ScorePopup };
