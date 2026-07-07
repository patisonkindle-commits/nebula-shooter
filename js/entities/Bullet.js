// Bullet factory — creates bullet objects for pools
function createPlayerBullet() {
  return {
    x: 0, y: 0, vx: 0, vy: 0, radius: 3, alive: false,
    damage: 1, isEnemy: false,
    homing: false, turnRate: 0,
    piercing: false, pierceRemaining: 0,
    burst: false, isBurstSub: false,
    ricochet: false, ricochetRemaining: 0,
    wave: false, waveTimer: 0, waveOffsetX: 0, waveOffsetY: 0,
    waveBaseX: 0, waveBaseY: 0, waveAngle: 0,
  };
}

function createEnemyBullet() {
  return { x: 0, y: 0, vx: 0, vy: 0, radius: 4, alive: false, damage: 1, isEnemy: true, color: '#ff6644', isMine: false, mineTimer: 0 };
}

class BulletManager {
  constructor() {
    this.playerBullets = new Pool(createPlayerBullet, CONFIG.BULLET_POOL_SIZE);
    this.enemyBullets = new Pool(createEnemyBullet, CONFIG.BULLET_POOL_SIZE);
    this._burstCallback = null;
  }

  setBurstCallback(fn) {
    this._burstCallback = fn;
  }

  firePlayerBullet(x, y, angle, damageMult = 1, homing = false, turnRate = 0, piercing = 0, burst = false, isBurstSub = false, ricochet = 0, wave = false) {
    const b = this.playerBullets.acquire();
    if (!b) return null;
    b.x = x; b.y = y;
    b.vx = Math.cos(angle) * CONFIG.PLAYER_BULLET_SPEED;
    b.vy = Math.sin(angle) * CONFIG.PLAYER_BULLET_SPEED;
    b.damage = CONFIG.PLAYER_BULLET_DAMAGE * damageMult;
    b.radius = isBurstSub ? 2 : 3;
    b.isEnemy = false;
    b.homing = homing;
    b.turnRate = turnRate;
    b.piercing = piercing > 0;
    b.pierceRemaining = piercing;
    b.burst = burst && !isBurstSub;
    b.isBurstSub = isBurstSub;
    b.ricochet = ricochet > 0;
    b.ricochetRemaining = ricochet;
    b.wave = wave;
    b.waveTimer = 0;
    b.waveBaseX = x;
    b.waveBaseY = y;
    b.waveAngle = angle;
    b.waveOffsetX = 0;
    b.waveOffsetY = 0;
    return b;
  }

  fireEnemyBullet(x, y, angle, speed, color) {
    const b = this.enemyBullets.acquire();
    if (!b) return;
    b.x = x; b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.damage = 1;
    b.radius = 4;
    b.isEnemy = true;
    b.color = color || '#ff6644';
  }

  update(dt, enemies) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

    this.playerBullets.updateAll(dt, (b) => {
      // Homing: steer toward nearest enemy
      if (b.homing && enemies && !b.wave) { // wave + homing not combined
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
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.sign(diff) * Math.min(Math.abs(diff), b.turnRate * dt);
          const newAngle = currentAngle + turn;
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(newAngle) * speed;
          b.vy = Math.sin(newAngle) * speed;
        }
      }

      // Wave motion: sine oscillation perpendicular to travel
      if (b.wave) {
        b.waveTimer += dt;
        b.waveBaseX += b.vx * dt;
        b.waveBaseY += b.vy * dt;
        // Perpendicular offset (left/right relative to travel angle)
        const amplitude = 15;
        const frequency = 10;
        const perpAngle = b.waveAngle + Math.PI / 2;
        const offset = Math.sin(b.waveTimer * frequency) * amplitude;
        b.x = b.waveBaseX + Math.cos(perpAngle) * offset;
        b.y = b.waveBaseY + Math.sin(perpAngle) * offset;
        b.waveOffsetX = Math.cos(perpAngle) * offset;
        b.waveOffsetY = Math.sin(perpAngle) * offset;
      } else {
        // Normal movement
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }

      // Boundary check
      const cx = b.wave ? b.waveBaseX : b.x;
      const cy = b.wave ? b.waveBaseY : b.y;

      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) {
        // Ricochet off side/top walls
        if (b.ricochet && b.ricochetRemaining > 0) {
          if (cx < -20 || cx > W + 20) {
            b.vx = -b.vx;
            if (b.wave) {
              b.waveAngle = Math.atan2(b.vy, b.vx);
            }
          }
          if (cy < -20) {
            b.vy = -b.vy;
            if (b.wave) {
              b.waveAngle = Math.atan2(b.vy, b.vx);
            }
          }
          b.ricochetRemaining--;
          // Reposition to inside boundary
          if (b.wave) {
            b.waveBaseX = clamp(b.waveBaseX, 10, W - 10);
            b.waveBaseY = clamp(b.waveBaseY, 10, H - 10);
          } else {
            b.x = clamp(b.x, 10, W - 10);
            b.y = clamp(b.y, 10, H - 10);
          }
          return;
        }
        // Burst when going off-screen (non-ricochet)
        if (b.burst && this._burstCallback) {
          const burstX = b.wave ? b.waveBaseX : b.x;
          const burstY = b.wave ? b.waveBaseY : b.y;
          this._burstCallback(burstX, burstY, b.damage);
        }
        this.playerBullets.release(b);
      }
    });

    this.enemyBullets.updateAll(dt, (b) => {
      // Mines don't move and should stay until timer expires
      if (b.isMine) return;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        this.enemyBullets.release(b);
      }
    });
  }

  renderPlayerBullets(ctx) {
    this.playerBullets.forEach(b => {
      ctx.shadowBlur = 0;

      if (b.wave) {
        // Wave shot — green sine wave trail
        ctx.save();
        ctx.strokeStyle = 'rgba(68, 255, 136, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const steps = 8;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const px = b.waveBaseX - b.vx * t * 0.12 + b.waveOffsetX * (1 - t);
          const py = b.waveBaseY - b.vy * t * 0.12 + b.waveOffsetY * (1 - t);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();

        // Main bullet — green diamond with glow
        ctx.shadowColor = '#44ff88';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#66ffaa';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Center bright spot
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#bbffdd';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.ricochet) {
        // Ricochet shot — golden triangle with trail dots
        // Trail dots
        ctx.save();
        for (let i = 1; i <= 3; i++) {
          const alpha = 0.3 / i;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ffcc44';
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(b.x - b.vx * 0.04 * i, b.y - b.vy * 0.04 * i, 2.5 - i * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Main bullet — diamond with gold glow
        ctx.shadowColor = '#ffcc44';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffdd66';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Center
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffeebb';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.burst) {
        // Burst bullet — pulsing orange glow ball
        const pulse = 1 + 0.25 * Math.sin(performance.now() * 0.008);
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 14 * pulse;
        ctx.fillStyle = '#ff8844';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.piercing) {
        // Piercing bullet — elongated gold capsule
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.shadowColor = '#ffdd44';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffdd44';
        const w = 6, h = 3;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffee88';
        ctx.beginPath();
        ctx.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, h / 2 - 0.5);
        ctx.fill();
        ctx.restore();
      } else if (b.homing) {
        // Homing diamond
        ctx.shadowColor = '#4a9eff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#8ac4ff';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - b.radius * 1.4);
        ctx.lineTo(b.x + b.radius * 1.2, b.y);
        ctx.lineTo(b.x, b.y + b.radius * 1.4);
        ctx.lineTo(b.x - b.radius * 1.2, b.y);
        ctx.closePath();
        ctx.fill();
      } else if (b.isBurstSub) {
        // Burst sub-bullet — small orange dot
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffaa44';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Default circle
        ctx.shadowColor = '#4a9eff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#8ac4ff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    });
  }

  renderEnemyBullets(ctx) {
    this.enemyBullets.forEach(b => {
      if (b.isMine) {
        // Mine render — pulsing green circle with cross
        const pulse = 1 + 0.2 * Math.sin(performance.now() * 0.006);
        ctx.save();
        ctx.shadowColor = '#88ff44';
        ctx.shadowBlur = 12 * pulse;
        ctx.fillStyle = '#44aa22';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Cross pattern
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#aaff66';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.x - b.radius * 0.5, b.y);
        ctx.lineTo(b.x + b.radius * 0.5, b.y);
        ctx.moveTo(b.x, b.y - b.radius * 0.5);
        ctx.lineTo(b.x, b.y + b.radius * 0.5);
        ctx.stroke();
        // Danger blink when about to expire
        if (b.mineTimer < 1) {
          ctx.fillStyle = `rgba(255, 255, 100, ${0.3 + 0.7 * Math.sin(performance.now() * 0.02)})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        return;
      }
      ctx.fillStyle = b.color || '#ff6644';
      ctx.shadowColor = b.color || '#ff4400';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      // Extra glow ring for colored bullets
      if (b.color !== '#ff6644' && b.color !== '#ff4400') {
        ctx.shadowBlur = 10;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.shadowBlur = 0;
    });
  }

  releaseAll() {
    this.playerBullets.releaseAll();
    this.enemyBullets.releaseAll();
  }
}
