// Enemy factory — 5 archetypes
function createEnemy() {
  return {
    x: 0, y: 0, vx: 0, vy: 0,
    hp: 1, maxHp: 1, radius: 10, speed: 100,
    alive: false, type: 'swarmer', score: 10,
    fireTimer: 0, fireRate: 2, angle: 0,
    spawnFlash: 0, color: '#ff4466',
    isBoss: false, bossPhase: 1, phaseTransitionTimer: 0,
    spiralAngle: 0, moveTimer: 0,
  };
}

class EnemyManager {
  constructor() {
    this.pool = new Pool(createEnemy, CONFIG.ENEMY_POOL_SIZE);
    this.bossActive = false;
    this.bossDefeated = false;
    this.bossSpawnedThisWave = false;
    this.spawnTimer = 0;
    this.kills = 0;
  }

  get count() { return this.pool.count; }

  spawn(type, x, y) {
    const e = this.pool.acquire();
    if (!e) return null;
    const t = CONFIG[type.toUpperCase()];
    e.type = type;
    e.hp = t.hp;
    e.maxHp = t.hp;
    e.radius = t.radius;
    e.speed = t.speed;
    e.score = t.score;
    e.color = t.color;
    e.x = x != null ? x : rand(20, CONFIG.WIDTH - 20);
    e.y = y != null ? y : -20;
    e.vx = 0; e.vy = t.speed;
    e.fireTimer = rand(1, 3);
    e.fireRate = 2;
    e.angle = 0;
    e.spawnFlash = 0.4;
    e.isBoss = false;
    return e;
  }

  spawnBoss() {
    const e = this.pool.acquire();
    if (!e) return;
    e.type = 'boss';
    e.hp = CONFIG.BOSS_HP;
    e.maxHp = CONFIG.BOSS_HP;
    e.radius = CONFIG.BOSS_RADIUS;
    e.speed = CONFIG.BOSS_SPEED;
    e.score = CONFIG.BOSS_SCORE;
    e.color = '#ff44ff';
    e.x = CONFIG.WIDTH / 2;
    e.y = -40;
    e.vx = 0; e.vy = 0;
    e.fireTimer = 2;
    e.fireRate = CONFIG.BOSS_FIRE_RATE;
    e.angle = 0;
    e.spawnFlash = 1;
    e.isBoss = true;
    e.bossPhase = 1;
    e.phaseTransitionTimer = 0;
    e.spiralAngle = 0;
    e.moveTimer = 0;
    this.bossActive = true;
    this.bossDefeated = false;
    this.bossSpawnedThisWave = true;
  }

  update(dt, player, bullets, game) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

    this.pool.updateAll(dt, (e) => {
      if (e.spawnFlash > 0) e.spawnFlash -= dt;

      if (e.isBoss) {
        this._updateBoss(dt, e, player, bullets, game);
      } else {
        this._updateNormal(dt, e, player, bullets, game);
      }

      // Offscreen cleanup
      if (!e.isBoss && (e.y > H + 40 || e.x < -40 || e.x > W + 40)) {
        this.pool.release(e);
      }
    });
  }

  _updateNormal(dt, e, player, bullets, game) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const t = CONFIG[e.type.toUpperCase()];

    switch (e.type) {
      case 'swarmer':
        e.vy = lerp(e.vy, t.speed, dt * 2);
        e.x += Math.sin(e.angle + performance.now() * 0.003) * 60 * dt;
        break;
      case 'sniper':
        e.vy = lerp(e.vy, t.speed * 0.3, dt);
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = e.fireRate;
          const a = angleTo(e, player);
          bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED);
        }
        break;
      case 'tank':
        e.vy = lerp(e.vy, t.speed, dt);
        break;
      case 'kamikaze':
        if (e.y < H * 0.3) {
          e.vy = t.speed;
        } else {
          const a = angleTo(e, player);
          e.vx = Math.cos(a) * t.speed * 1.5;
          e.vy = Math.sin(a) * t.speed * 1.5;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        }
        break;
      case 'blocker':
        if (e.y < 60) {
          e.vy = t.speed;
        } else {
          e.vy = lerp(e.vy, 20, dt);
          e.x += Math.sin(performance.now() * 0.002 + e.x) * 40 * dt;
          e.fireTimer -= dt;
          if (e.fireTimer <= 0) {
            e.fireTimer = e.fireRate * 1.5;
            const a = angleTo(e, player);
            bullets.fireEnemyBullet(e.x, e.y + e.radius, a, CONFIG.ENEMY_BULLET_SPEED * 0.7);
          }
        }
        break;
    }

    e.y += e.vy * dt;
  }

  _updateBoss(dt, e, player, bullets, game) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    e.moveTimer += dt;

    // Phase transition
    if (e.hp < e.maxHp * 0.5 && e.bossPhase === 1) {
      e.bossPhase = 2;
      e.phaseTransitionTimer = 1;
      game.screenShake = 12;
      game.chromaticIntensity = 6;
      game.screenFlash = 0.3;
      e.fireRate = 1.0;
    }
    if (e.phaseTransitionTimer > 0) e.phaseTransitionTimer -= dt;

    // Movement — sine wave
    const targetY = Math.min(120, CONFIG.HEIGHT * 0.15 + Math.sin(e.moveTimer * 0.5) * 40);
    e.y = lerp(e.y, targetY, dt * 2);
    e.x = CONFIG.WIDTH / 2 + Math.sin(e.moveTimer * 0.3) * (CONFIG.WIDTH * 0.3);

    // Attack
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = e.fireRate;
      if (e.bossPhase === 1) {
        // Ring burst
        const count = CONFIG.BOSS_RING_SIZE + randInt(-2, 2);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + rand(-0.08, 0.08);
          bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED * 0.6);
        }
      } else {
        // Ring + spiral
        const count = CONFIG.BOSS_RING_SIZE + 2;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + rand(-0.08, 0.08);
          bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED * 0.7);
        }
        e.spiralAngle += 0.5;
        const spr = Math.floor(count * 0.6);
        for (let i = 0; i < spr; i++) {
          const a = e.spiralAngle + (i / spr) * Math.PI * 2;
          bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED * 0.8);
        }
        // Aimed volley
        const a = angleTo(e, player);
        bullets.fireEnemyBullet(e.x, e.y, a + rand(-0.1, 0.1), CONFIG.ENEMY_BULLET_SPEED * 1.2);
        bullets.fireEnemyBullet(e.x, e.y, a + rand(-0.12, 0.12), CONFIG.ENEMY_BULLET_SPEED * 1.2);
      }
    }
  }

  render(ctx) {
    this.pool.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.isBoss) {
        this._renderBoss(ctx, e);
      } else {
        this._renderNormal(ctx, e);
      }
      ctx.restore();
    });
  }

  _renderNormal(ctx, e) {
    // Spawn flash
    if (e.spawnFlash > 0) {
      const blink = 0.5 + Math.sin(e.spawnFlash * 30) * 0.5;
      ctx.globalAlpha = blink;
    }

    // Glow
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 6;

    // Body shape
    switch (e.type) {
      case 'swarmer':
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.fillStyle = '#ff8899';
        ctx.beginPath();
        ctx.arc(-3, -2, 3, 0, Math.PI * 2);
        ctx.arc(3, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'sniper':
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(-e.radius * 0.7, e.radius * 0.5);
        ctx.lineTo(e.radius * 0.7, e.radius * 0.5);
        ctx.closePath();
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.arc(0, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'tank':
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.strokeStyle = '#6633cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius - 3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'kamikaze':
        ctx.beginPath();
        ctx.moveTo(0, e.radius);
        ctx.lineTo(-e.radius * 0.8, -e.radius * 0.6);
        ctx.lineTo(e.radius * 0.8, -e.radius * 0.6);
        ctx.closePath();
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'blocker':
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.strokeStyle = '#2288dd';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
    }

    // HP bar for tanks/blockers
    if (e.maxHp > 1) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-e.radius, -e.radius - 5, e.radius * 2, 3);
      ctx.fillStyle = '#44ff88';
      ctx.fillRect(-e.radius, -e.radius - 5, e.radius * 2 * (e.hp / e.maxHp), 3);
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  _renderBoss(ctx, e) {
    const flash = e.phaseTransitionTimer > 0;
    if (flash) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.phaseTransitionTimer * 20);

    ctx.shadowColor = '#ff44ff';
    ctx.shadowBlur = 20;

    // Outer ring
    ctx.strokeStyle = e.bossPhase === 1 ? '#ff44ff' : '#ff2222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
    ctx.stroke();

    // Main body
    ctx.fillStyle = e.bossPhase === 1 ? '#661166' : '#661111';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = e.bossPhase === 1 ? '#ff66ff' : '#ff4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.bossPhase === 1 ? '#ff44ff' : '#ff2222';
    ctx.beginPath();
    ctx.arc(0, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Phase 2: extra spikes
    if (e.bossPhase === 2) {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + performance.now() * 0.002;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
        ctx.lineTo(Math.cos(a) * (e.radius + 10), Math.sin(a) * (e.radius + 10));
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // HP bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-e.radius, -e.radius - 10, e.radius * 2, 4);
    const hpPct = e.hp / e.maxHp;
    ctx.fillStyle = hpPct > 0.3 ? '#ff44ff' : '#ff2222';
    ctx.fillRect(-e.radius, -e.radius - 10, e.radius * 2 * hpPct, 4);
  }

  damageEnemy(e, amount, game) {
    e.hp -= amount;
    if (e.hp <= 0) {
      this.pool.release(e);
      if (e.isBoss) {
        this.bossActive = false;
        this.bossDefeated = true;
        game.onBossDefeated(e.x, e.y);
      } else {
        this.kills++;
      }
      return true;
    }
    return false;
  }

  releaseAll() {
    this.pool.releaseAll();
    this.bossActive = false;
    this.bossDefeated = false;
    this.bossSpawnedThisWave = false;
    this.kills = 0;
  }
}
