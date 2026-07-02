// Starfield parallax background
class StarField {
  constructor() {
    this.layers = [];
    for (let i = 0; i < 3; i++) {
      const layer = [];
      const count = CONFIG.STAR_COUNT * (1 - i * 0.25);
      for (let j = 0; j < count; j++) {
        layer.push({
          x: rand(0, CONFIG.WIDTH),
          y: rand(0, CONFIG.HEIGHT),
          size: rand(0.5, 1.5 + i * 0.5),
          speed: rand(10 + i * 20, 30 + i * 30),
          brightness: rand(0.3, 1),
        });
      }
      this.layers.push(layer);
    }
    this.nebulaOffset = 0;
  }

  update(dt) {
    for (const layer of this.layers) {
      for (const s of layer) {
        s.y += s.speed * dt;
        if (s.y > CONFIG.HEIGHT) {
          s.y = -2;
          s.x = rand(0, CONFIG.WIDTH);
        }
      }
    }
    this.nebulaOffset += dt * 4;
  }

  render(ctx) {
    // Nebula background
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(0.5, '#0f0a2a');
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Subtle nebula clouds
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 3; i++) {
      const cx = CONFIG.WIDTH * 0.3 + Math.sin(this.nebulaOffset * 0.1 + i * 2) * 80;
      const cy = CONFIG.HEIGHT * (0.3 + i * 0.2) + Math.sin(this.nebulaOffset * 0.05 + i) * 40;
      const rad = CONFIG.WIDTH * 0.3;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const colors = ['#4411aa', '#2244aa', '#aa1188'];
      g.addColorStop(0, colors[i]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Stars
    for (const layer of this.layers) {
      for (const s of layer) {
        const alpha = s.brightness * (layer === this.layers[0] ? 0.4 : layer === this.layers[1] ? 0.6 : 0.9);
        ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
