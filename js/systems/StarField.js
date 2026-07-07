// Starfield parallax background — enhanced with twinkle, deep nebula layers, and grid
class StarField {
  constructor() {
    this.layers = [];
    this.twinklePhase = 0;
    for (let i = 0; i < 3; i++) {
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
          // Color tint: distant=cool, near=warm
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

  render(ctx) {
    // ── Deep space base ──
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
    grad.addColorStop(0, '#060612');
    grad.addColorStop(0.3, '#0a0820');
    grad.addColorStop(0.6, '#0e0628');
    grad.addColorStop(1, '#080812');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // ── Nebula clouds (3 shifting orbs) ──
    ctx.globalAlpha = 0.12;
    const nebulaColors = ['#4411aa', '#2244cc', '#aa1188', '#1155aa'];
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

    // ── Shooting star layer ──
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

    // ── Targeting grid (subtle) ──
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.025)';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x <= CONFIG.WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.WIDTH, y);
      ctx.stroke();
    }

    // ── Stars with twinkle ──
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      for (const s of layer) {
        const twinkle = 0.6 + 0.4 * Math.sin(this.time * s.twinkleSpeed + s.twinkleOffset);
        const baseAlpha = s.brightness * (li === 0 ? 0.4 : li === 1 ? 0.65 : 0.9);
        const alpha = baseAlpha * twinkle;

        // Star color — slightly tinted by layer
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

    // ── Vignette overlay ──
    const vigGrad = ctx.createRadialGradient(
      CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.25,
      CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.7
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }
}
