// Particle system — explosions, trails, sparkles
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

  explosion(x, y) {
    this.emit(x, y, 20, { speed: 200, color: '#ff8844', size: 4, life: 0.6 });
    this.emit(x, y, 10, { speed: 150, color: '#ffcc44', size: 2.5, life: 0.4 });
    this.emit(x, y, 5, { speed: 100, color: '#ffffff', size: 2, life: 0.3 });
  }

  bossExplosion(x, y) {
    this.emit(x, y, 40, { speed: 300, color: '#ff44ff', size: 5, life: 0.8 });
    this.emit(x, y, 30, { speed: 200, color: '#ff88ff', size: 3, life: 0.6 });
    this.emit(x, y, 20, { speed: 150, color: '#ffffff', size: 2, life: 0.5 });
  }

  scrapBurst(x, y) {
    this.emit(x, y, 6, { speed: 80, color: '#44ff88', size: 2.5, life: 0.4 });
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
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  releaseAll() {
    this.pool.releaseAll();
  }
}
