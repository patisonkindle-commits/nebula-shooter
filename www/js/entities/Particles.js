// Particle system — explosions, trails, sparkles, with glow
function createParticle() {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 3, alive: false };
}

class ParticleSystem {
  constructor() {
    this.pool = new Pool(createParticle, CONFIG.PARTICLE_POOL_SIZE);
  }

  emit(x, y, count, opts = {}) {
    const {
      speed = 120, color = '#ffffff', size = 3, life = 0.6,
      spread = Math.PI * 2, direction = 0, vary = true,
    } = opts;

    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      if (!p) break;
      const angle = direction + rand(-spread / 2, spread / 2);
      const spd = vary ? rand(speed * 0.3, speed) : speed;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.life = vary ? rand(life * 0.5, life) : life;
      p.maxLife = p.life;
      p.color = color;
      p.size = vary ? rand(size * 0.5, size) : size;
    }
  }

  explosion(x, y, scale = 1) {
    this.emit(x, y, Math.floor(20 * scale), { speed: 200 * scale, color: '#ff8844', size: 4 * scale, life: 0.6 * scale });
    this.emit(x, y, Math.floor(10 * scale), { speed: 150 * scale, color: '#ffcc44', size: 2.5 * scale, life: 0.4 * scale });
    this.emit(x, y, Math.floor(5 * scale), { speed: 100 * scale, color: '#ffffff', size: 2 * scale, life: 0.3 * scale });
  }

  bossExplosion(x, y) {
    this.emit(x, y, 50, { speed: 350, color: '#ff44ff', size: 6, life: 1.0 });
    this.emit(x, y, 40, { speed: 250, color: '#ff88ff', size: 4, life: 0.7 });
    this.emit(x, y, 25, { speed: 150, color: '#ffffff', size: 2.5, life: 0.5 });
  }

  scrapBurst(x, y) {
    this.emit(x, y, 8, { speed: 90, color: '#44ff88', size: 3, life: 0.45 });
  }

  // Player engine trail
  engineTrail(x, y, count, color) {
    this.emit(x, y, count, { speed: 40, color: color || '#4a9eff', size: 2.5, life: 0.35, direction: Math.PI / 2, spread: 0.6 });
  }

  // Mine explosion (green)
  mineExplosion(x, y) {
    this.emit(x, y, 20, { speed: 140, color: '#88ff44', size: 4, life: 0.5 });
    this.emit(x, y, 10, { speed: 100, color: '#ccff66', size: 2, life: 0.3 });
  }

  update(dt) {
    this.pool.updateAll(dt, (p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.release(p);
      }
    });
  }

  render(ctx) {
    this.pool.forEach(p => {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = t;

      // Glow behind bright particles
      if (p.size > 2) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();

      // Extra sparkle for white/very bright particles
      if (p.life > p.maxLife * 0.7 && p.size > 2.5) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = t * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  releaseAll() {
    this.pool.releaseAll();
  }
}
