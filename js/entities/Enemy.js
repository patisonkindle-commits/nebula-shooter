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
    // Vortex
    vortexAngle: 0, vortexReachedPos: false, vortexStopY: 0,
    // Mine layer
    mines: null, mineTimer: 0,
    // Warp
    warpTimer: 0, warpCooldown: 0, warpTeleporting: false, warpFlash: 0,
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
    // New type fields
    e.vortexAngle = 0;
    e.vortexReachedPos = false;
    e.vortexStopY = 0;
    e.mineTimer = 0;
    e.mines = null;
    e.warpTimer = 0;
    e.warpCooldown = 0;
    e.warpTeleporting = false;
    e.warpFlash = 0;
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
          bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED, '#ffaa00');
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
            bullets.fireEnemyBullet(e.x, e.y + e.radius, a, CONFIG.ENEMY_BULLET_SPEED * 0.7, '#44aaff');
          }
        }
        break;
      case 'vortex':
        this._updateVortex(dt, e, player, bullets);
        break;
      case 'minelayer':
        this._updateMineLayer(dt, e, player, bullets, game);
        break;
      case 'warp':
        this._updateWarp(dt, e, player, bullets);
        break;
    }

    e.y += e.vy * dt;
  }

  // ─── New enemy behaviors ───

  _updateVortex(dt, e, player, bullets) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const t = CONFIG.VORTEX;

    // Move to mid-screen then stop
    if (!e.vortexReachedPos) {
      e.vortexStopY = e.vortexStopY || rand(100, H * 0.35);
      if (e.y < e.vortexStopY) {
        e.vy = t.speed;
      } else {
        e.vy = lerp(e.vy, 0, dt * 3);
        if (Math.abs(e.vy) < 1) {
          e.vy = 0;
          e.vortexReachedPos = true;
        }
      }
      // Slight horizontal movement while entering
      e.x += Math.sin(performance.now() * 0.002) * 30 * dt;
    } else {
      // Hover and spin — expanding bullet rings
      e.vortexAngle += dt * 2.5;
      e.y += Math.sin(e.vortexAngle * 0.5) * 15 * dt;
      e.x += Math.sin(e.vortexAngle * 0.7) * 20 * dt;

      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = 2.0 + rand(0, 0.5);
        const count = CONFIG.BOSS_EXPANDING_COUNT;
        const speed = 60;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          bullets.fireEnemyBullet(e.x, e.y, a, speed + rand(-5, 5), '#44ffdd');
        }
      }
    }
  }

  _updateMineLayer(dt, e, player, bullets, game) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const t = CONFIG.MINELAYER;

    // Slow drift down
    e.vy = lerp(e.vy, t.speed, dt);
    e.x += Math.sin(performance.now() * 0.0015 + e.y * 0.01) * 25 * dt;

    // Deploy mines periodically
    e.mineTimer -= dt;
    if (e.mineTimer <= 0) {
      e.mineTimer = 1.5 + rand(0, 1);
      if (game) {
        game.spawnMine(e.x, e.y + e.radius);
      }
      // Visual flash
      e.spawnFlash = 0.15;
    }
  }

  _updateWarp(dt, e, player, bullets) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const t = CONFIG.WARP;

    if (e.warpTeleporting) {
      // During teleport flash — invincible, can't be hit
      e.warpFlash -= dt;
      if (e.warpFlash <= 0) {
        e.warpTeleporting = false;
        e.spawnFlash = 0.3;
      }
      return;
    }

    e.warpCooldown -= dt;
    e.fireTimer -= dt;

    if (e.warpCooldown <= 0) {
      // Teleport to new random position
      e.x = rand(30, W - 30);
      e.y = rand(40, H * 0.4);
      e.warpCooldown = 1.8 + rand(0, 1.5);
      e.warpTeleporting = true;
      e.warpFlash = 0.25;
      // Fire a burst right after teleport
      const a = angleTo(e, player);
      for (let i = 0; i < 3; i++) {
        bullets.fireEnemyBullet(e.x, e.y, a + rand(-0.15, 0.15), CONFIG.ENEMY_BULLET_SPEED * 1.2, '#dd77ff');
      }
      return;
    }

    // While visible, drift and fire
    e.y += Math.sin(performance.now() * 0.003 + e.x) * 20 * dt;
    e.x += Math.sin(performance.now() * 0.002) * 30 * dt;

    if (e.fireTimer <= 0) {
      e.fireTimer = 1.0 + rand(0, 0.5);
      const a = angleTo(e, player);
      bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED * 0.9, '#dd77ff');
    }
  }

  // ─── Enhanced Boss Patterns ───

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
      e.fireRate = 0.9;
      e.bossPattern = 0; // reset pattern index on phase change
    }
    if (e.phaseTransitionTimer > 0) e.phaseTransitionTimer -= dt;

    // Movement — figure-8 in phase 1, tighter in phase 2
    const amplitude = e.bossPhase === 1 ? CONFIG.WIDTH * 0.3 : CONFIG.WIDTH * 0.35;
    const speedMult = e.bossPhase === 1 ? 0.4 : 0.7;
    e.x = CONFIG.WIDTH / 2 + Math.sin(e.moveTimer * speedMult) * amplitude;
    e.y = Math.min(110, CONFIG.HEIGHT * 0.14 + Math.sin(e.moveTimer * speedMult * 0.8) * 30);

    // Camera jitter in phase transition
    if (e.phaseTransitionTimer > 0) {
      e.spawnFlash = e.phaseTransitionTimer;
    }

    // Attack — 4 rotating patterns
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = e.fireRate;
      const patCount = e.bossPhase === 1 ? 3 : 4;
      e.bossPattern = (e.bossPattern || 0) % patCount;

      if (e.bossPhase === 1) {
        // Phase 1 patterns: Ring, Cross, Expanding
        const p = e.bossPattern;
        if (p === 0) {
          // Ring burst (classic)
          this._bossRingBurst(e, bullets);
        } else if (p === 1) {
          // Cross: 4 cardinal beams
          this._bossCross(e, bullets);
        } else if (p === 2) {
          // Expanding ring
          this._bossExpandingRing(e, bullets);
        }
      } else {
        // Phase 2 patterns: Fast ring, Spiral, Star, Spray
        const p = e.bossPattern;
        if (p === 0) {
          // Fast ring burst
          this._bossRingBurst(e, bullets, 2);
        } else if (p === 1) {
          // Spiral
          this._bossSpiral(e, bullets);
        } else if (p === 2) {
          // Star burst: N radiating arms
          this._bossStarBurst(e, bullets);
        } else if (p === 3) {
          // Spray: aimed cone at player
          this._bossSpray(e, player, bullets);
        }
        // Phase 2 also gets aimed volley every other attack
        if (p % 2 === 0) {
          const a = angleTo(e, player);
          bullets.fireEnemyBullet(e.x, e.y, a + rand(-0.08, 0.08), CONFIG.ENEMY_BULLET_SPEED * 1.3, '#ff4444');
        }
      }
      e.bossPattern = (e.bossPattern + 1) % patCount;
    }

    // Phase 2: random aimed shots between patterns
    if (e.bossPhase === 2) {
      e.spiralAngle += dt;
      if (e.spiralAngle > e.fireRate * 0.4) {
        e.spiralAngle = 0;
        const a = angleTo(e, player);
        bullets.fireEnemyBullet(e.x, e.y, a + rand(-0.12, 0.12), CONFIG.ENEMY_BULLET_SPEED * 1.4, '#ff4444');
        bullets.fireEnemyBullet(e.x, e.y, a + rand(-0.15, 0.15), CONFIG.ENEMY_BULLET_SPEED * 1.3, '#ff4444');
      }
    }
  }

  // ─── Boss attack patterns ───

  _bossRingBurst(e, bullets, speedMul = 1) {
    const count = CONFIG.BOSS_RING_SIZE + randInt(-2, 2);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.08, 0.08);
      bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED * 0.6 * speedMul, '#ff44ff');
    }
  }

  _bossCross(e, bullets) {
    // 4 cardinal beams — thin spread of bullets along each axis
    const speeds = [0.5, 0.7, 0.9];
    const directions = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    for (const dir of directions) {
      for (const spd of speeds) {
        bullets.fireEnemyBullet(e.x, e.y, dir + rand(-0.03, 0.03), CONFIG.ENEMY_BULLET_SPEED * spd, '#ff88aa');
      }
    }
  }

  _bossExpandingRing(e, bullets) {
    // Single ring that spreads outward slower — creates expanding wall
    const count = CONFIG.BOSS_EXPANDING_COUNT;
    const baseSpeed = CONFIG.ENEMY_BULLET_SPEED * 0.35;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const spdOffset = (i % 3) * 10; // alternating speeds
      bullets.fireEnemyBullet(e.x, e.y, a, baseSpeed + spdOffset, '#88ddff');
    }
  }

  _bossSpiral(e, bullets) {
    e.spiralAngle += 0.6;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const a = e.spiralAngle + (i / count) * Math.PI * 2;
      bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED * 0.6, '#ff66aa');
    }
  }

  _bossStarBurst(e, bullets) {
    // Radiating arms that rotate slightly each time
    e.spiralAngle += 0.3;
    const arms = CONFIG.BOSS_STAR_ARMS;
    const perArm = 3;
    for (let i = 0; i < arms; i++) {
      const baseAngle = (i / arms) * Math.PI * 2 + e.spiralAngle;
      for (let j = 0; j < perArm; j++) {
        const speed = CONFIG.ENEMY_BULLET_SPEED * (0.25 + j * 0.2);
        bullets.fireEnemyBullet(e.x, e.y, baseAngle + rand(-0.04, 0.04), speed, '#ff8888');
      }
    }
  }

  _bossSpray(e, player, bullets) {
    // Aimed cone toward player
    const baseAngle = angleTo(e, player);
    const spread = CONFIG.BOSS_SPRAY_ANGLE;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const a = baseAngle - spread / 2 + (i / (count - 1)) * spread + rand(-0.04, 0.04);
      bullets.fireEnemyBullet(e.x, e.y, a, CONFIG.ENEMY_BULLET_SPEED * (0.5 + Math.random() * 0.5), '#ff4444');
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
      case 'vortex':
        // Hexagon that pulses — cyan glow
        const pulse = 1 + 0.15 * Math.sin(performance.now() * 0.005);
        ctx.shadowBlur = 14;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + e.vortexAngle * 0.3;
          const r = e.radius * pulse;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.stroke();
        // Inner glow
        ctx.fillStyle = e.color + '33';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Spinning ring indicator (shows it's charging)
        if (e.vortexReachedPos) {
          ctx.strokeStyle = '#88ffdd';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.3 + 0.3 * Math.sin(performance.now() * 0.008);
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 6 + 3 * Math.sin(performance.now() * 0.004), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      case 'minelayer':
        // Diamond shape with green glow
        ctx.shadowBlur = 10;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(e.radius * 0.8, 0);
        ctx.lineTo(0, e.radius);
        ctx.lineTo(-e.radius * 0.8, 0);
        ctx.closePath(); ctx.fill();
        // Inner pattern — cross
        ctx.strokeStyle = '#ccff88';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-e.radius * 0.4, -e.radius * 0.3);
        ctx.lineTo(e.radius * 0.4, e.radius * 0.3);
        ctx.moveTo(e.radius * 0.4, -e.radius * 0.3);
        ctx.lineTo(-e.radius * 0.4, e.radius * 0.3);
        ctx.stroke();
        // Mine deploy flash
        if (e.mineTimer < 0.2) {
          ctx.fillStyle = '#ffffff88';
          ctx.beginPath();
          ctx.arc(0, e.radius + 6, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'warp':
        // Star shape — purple with shimmer during visibility
        if (e.warpTeleporting) {
          ctx.globalAlpha = 0.2 + 0.8 * (e.warpFlash / 0.25);
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        ctx.shadowBlur = 12;
        ctx.fillStyle = e.color;
        // 5-pointed star
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
          const r = i % 2 === 0 ? e.radius : e.radius * 0.45;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        // Center gem
        ctx.fillStyle = '#ffccff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
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
