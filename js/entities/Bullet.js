// Bullet factory — creates bullet objects for pools
function createPlayerBullet() {
  return { x: 0, y: 0, vx: 0, vy: 0, radius: 3, alive: false, damage: 1, isEnemy: false, homing: false, turnRate: 0 };
}

function createEnemyBullet() {
  return { x: 0, y: 0, vx: 0, vy: 0, radius: 4, alive: false, damage: 1, isEnemy: true };
}

class BulletManager {
  constructor() {
    this.playerBullets = new Pool(createPlayerBullet, CONFIG.BULLET_POOL_SIZE);
    this.enemyBullets = new Pool(createEnemyBullet, CONFIG.BULLET_POOL_SIZE);
  }

  firePlayerBullet(x, y, angle, damageMult = 1, homing = false, turnRate = 0) {
    const b = this.playerBullets.acquire();
    if (!b) return;
    b.x = x; b.y = y;
    b.vx = Math.cos(angle) * CONFIG.PLAYER_BULLET_SPEED;
    b.vy = Math.sin(angle) * CONFIG.PLAYER_BULLET_SPEED;
    b.damage = CONFIG.PLAYER_BULLET_DAMAGE * damageMult;
    b.radius = 3;
    b.isEnemy = false;
    b.homing = homing;
    b.turnRate = turnRate;
  }

  fireEnemyBullet(x, y, angle, speed) {
    const b = this.enemyBullets.acquire();
    if (!b) return;
    b.x = x; b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.damage = 1;
    b.radius = 4;
    b.isEnemy = true;
  }

  update(dt, enemies) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

    this.playerBullets.updateAll(dt, (b) => {
      // Homing: steer toward nearest enemy
      if (b.homing && enemies) {
        let nearest = null, nearDist = Infinity;
        for (const e of enemies.pool.active) {
          if (!e.alive) continue;
          const d = dist(b, e);
          if (d < nearDist) { nearDist = d; nearest = e; }
        }
        if (nearest && nearDist < 300) {
          const targetAngle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
          const currentAngle = Math.atan2(b.vy, b.vx);
          let diff = targetAngle - currentAngle;
          // Normalize angle difference
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.sign(diff) * Math.min(Math.abs(diff), b.turnRate * dt);
          const newAngle = currentAngle + turn;
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(newAngle) * speed;
          b.vy = Math.sin(newAngle) * speed;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        this.playerBullets.release(b);
      }
    });

    this.enemyBullets.updateAll(dt, (b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        this.enemyBullets.release(b);
      }
    });
  }

  renderPlayerBullets(ctx) {
    ctx.fillStyle = '#8ac4ff';
    this.playerBullets.forEach(b => {
      // Glow
      ctx.shadowColor = '#4a9eff';
      ctx.shadowBlur = 8;

      // Homing bullets get a different shape (small diamond)
      if (b.homing) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - b.radius * 1.4);
        ctx.lineTo(b.x + b.radius * 1.2, b.y);
        ctx.lineTo(b.x, b.y + b.radius * 1.4);
        ctx.lineTo(b.x - b.radius * 1.2, b.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    });
  }

  renderEnemyBullets(ctx) {
    this.enemyBullets.forEach(b => {
      ctx.fillStyle = '#ff6644';
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  releaseAll() {
    this.playerBullets.releaseAll();
    this.enemyBullets.releaseAll();
  }
}
