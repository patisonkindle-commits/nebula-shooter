// Floating score popups — +1 for scrap, +XP, etc.
class ScorePopup {
  constructor() {
    this.items = [];
  }

  add(text, x, y, color = '#44ff88') {
    this.items.push({ text, x, y, vy: -40, life: 0.8, color, maxLife: 0.8 });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.items.splice(i, 1);
    }
  }

  render(ctx) {
    for (const p of this.items) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }
}
