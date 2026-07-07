// Project Nebula — Main game orchestrator
class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = 'menu'; // menu, playing, upgrade, gameover, meta
    this.running = true;
    this.lastFrame = 0;

    // Systems
    this.input = null;
    this.player = new Player();
    this.enemies = new EnemyManager();
    this.bullets = new BulletManager();
    this.particles = new ParticleSystem();
    this.scrapManager = new ScrapManager();
    this.starField = new StarField();
    this.audio = new AudioManager();
    this.meta = new MetaProgression();

    // UI
    this.hud = new HUD();
    this.menuScreen = new MenuScreen();
    this.upgradeUI = new UpgradeUI();
    this.metaScreen = new MetaScreen();
    this.popup = new ScorePopup();

    // Wave manager
    this.wave = 0;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.enemiesThisWave = 0;
    this.enemiesSpawnedThisWave = 0;
    this.waveEliteSpawned = false;
    this.waveComplete = false;
    this.transitionTimer = 0;
    this.coreDropBonus = 0;
    this.spawnInterval = CONFIG.SPAWN_INTERVAL;
    this._tier2Unlocked = false; // Burst/Ricochet/Wave unlocked after first boss

    // Run stats
    this.stats = {
      enemiesKilled: 0,
      totalDamageTaken: 0,
      timeSurvived: 0,
      bossesKilled: 0,
      scrap: 0,
      cores: 0,
      upgrades: [],
      restarts: 0,
    };

    // Juice effects
    this.screenShake = 0;

    // BGM flag — audio context is created on first interaction (in gesture)
    this._bgmStarted = false;
    this.chromaticIntensity = 0;
    this.screenFlash = 0;
    this.damageFlash = 0;
    this.hitPause = 0;
    this.hitPauseRemaining = 0;
    this.timeScale = 1;
    this._plasmaChainActive = false;
    this._gravityWellActive = false;
    this._solarFlareActive = false;
    this._solarFlareTimer = 0;
    this._magnetBonus = 0;
    this._burstPending = [];

    // Score
    this.score = 0;
    this.announcements = [];

    // Chromatic aberration offscreen canvas
    this._chromaCanvas = document.createElement('canvas');
    this._chromaCanvas.width = CONFIG.WIDTH;
    this._chromaCanvas.height = CONFIG.HEIGHT;
    this._chromaCtx = this._chromaCanvas.getContext('2d');

    // RAF loop
    this._loop = this._loop.bind(this);

    // Level-up XP tracking
    this.xp = 0;
    this.xpToNext = 20;
    this.level = 0;
  }

  init() {
    this.input = new Input(this.canvas, () => this.audio.onInteraction());
    // Burst callback — queue burst for delayed processing
    this.bullets.setBurstCallback((x, y, dmg) => {
      this._queueBurst(x, y, dmg);
    });
  }

  // ─── Game Loop ───

  start() {
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this._loop);
  }

  _loop(timestamp) {
    if (!this.running) return;

    try {
      const rawDt = (timestamp - this.lastFrame) / 1000;
      this.lastFrame = timestamp;
      let dt = Math.min(rawDt, 0.05);

      // Time scale (hit-pause / upgrade slow)
      if (this.hitPauseRemaining > 0) {
        this.hitPauseRemaining -= rawDt;
        // Render frozen frame
        this._render();
        requestAnimationFrame(this._loop);
        return;
      }

      dt *= this.timeScale;

      this._update(dt);
      this._render();

      if (this.input) this.input.postFrame();
    } catch (e) {
      console.error('Game loop error:', e.message);
      this.lastFrame = performance.now();
    }

    requestAnimationFrame(this._loop);
  }

  // ─── Update ───

  _update(dt) {
    // Mute toggle — tap top-right corner area in any state
    if (this.input && this.input.justTapped) {
      const p = this.input.getPos();
      if (p.x > CONFIG.WIDTH - 30 && p.y < 25) {
        this.audio.toggleMute();
        this.input.justTapped = false;
        return;
      }
    }

    switch (this.state) {
      case 'menu':
        this.starField.update(dt);
        // Start BGM after first touch (AudioContext created in gesture)
        if (!this._bgmStarted && this.input.isTouching()) {
          this.audio.bgmStart('menu');
          this._bgmStarted = true;
        }
        this.menuScreen.handleTap(this, this.input);
        break;

      case 'playing':
        this._updatePlaying(dt);
        break;

      case 'upgrade':
        // Slow-motion while upgrading
        this.screenShake *= Math.pow(CONFIG.SCREEN_SHAKE_DECAY, dt * 60);
        if (this.screenShake < 0.5) this.screenShake = 0;
        this.starField.update(dt * 0.3);
        this.particles.update(dt * 0.3);
        this._updateEnemiesAndBullets(dt * 0.1);
        const chosen = this.upgradeUI.handleTap(this.input);
        if (chosen) {
          if (chosen === 'DISMISS') {
            // Tap outside — resume without picking
            this.state = 'playing';
            this.timeScale = 1;
          } else {
            this._applyUpgrade(chosen);
            this.state = 'playing';
            this.timeScale = 1;
          }
        }
        break;

      case 'gameover':
        // Decay the death explosion shake
        this.screenShake *= Math.pow(0.88, dt * 60);
        if (this.screenShake < 0.5) this.screenShake = 0;
        this.screenFlash *= Math.pow(CONFIG.FLASH_DECAY, dt * 60);
        if (this.screenFlash < 0.01) this.screenFlash = 0;
        this.chromaticIntensity *= Math.pow(CONFIG.CHROMATIC_DECAY, dt * 60);
        if (this.chromaticIntensity < 0.5) this.chromaticIntensity = 0;

        // Stare at death screen — wait for tap
        if (this.input.justTapped) {
          const p = this.input.getPos();
          // Check if tap is in UPGRADES button area (bottom of screen)
          if (p.y > CONFIG.HEIGHT * 0.84) {
            this.showMeta();
          } else {
            this.state = 'menu';
            this.audio.bgmStart('menu');
            this._bgmStarted = true;
            this._resetJuice();
          }
        }
        break;

      case 'meta':
        const result = this.metaScreen.handleTap(this.input, this.meta);
        if (result) {
          if (result.action === 'upgrade') {
            this.meta.purchase(result.id);
          } else if (result.action === 'close') {
            this.state = 'menu';
          }
        }
        break;
    }
  }

  _updatePlaying(dt) {
    this.stats.timeSurvived += dt;
    this.starField.update(dt);

    // Decay juice effects (time-based)
    this.screenShake *= Math.pow(CONFIG.SCREEN_SHAKE_DECAY, dt * 60);
    if (this.screenShake < 0.5) this.screenShake = 0;
    this.chromaticIntensity *= Math.pow(CONFIG.CHROMATIC_DECAY, dt * 60);
    if (this.chromaticIntensity < 0.5) this.chromaticIntensity = 0;
    this.screenFlash *= Math.pow(CONFIG.FLASH_DECAY, dt * 60);
    if (this.screenFlash < 0.01) this.screenFlash = 0;
    this.damageFlash *= 0.92;
    if (this.damageFlash < 0.01) this.damageFlash = 0;

    this.player.update(dt, this.input, this.bullets, this.enemies);

    // Player engine trail particles
    if (this.player.alive) {
      this.particles.engineTrail(
        this.player.x + rand(-4, 4),
        this.player.y + this.player.radius * 0.6,
        Math.floor(dt * 30),
        this._solarFlareActive ? '#ff8844' : '#4a9eff'
      );
    }

    this._updateEnemiesAndBullets(dt);

    // Solar Flare — periodic pulse clears enemy bullets
    if (this._solarFlareActive) {
      this._solarFlareTimer += dt;
      if (this._solarFlareTimer >= CONFIG.SOLAR_FLARE_INTERVAL) {
        this._solarFlareTimer = 0;
        this._triggerSolarFlare();
      }
    }

    // Wave management
    this._updateWaves(dt);

    // Collision
    this._checkCollisions();

    // Process any queued bursts
    this._processBursts();

    // Update mine timers
    this._updateMines(dt);

    // Gravity Well — active pull every frame
    this._applyGravityWell(dt);

    // Scrap
    this.scrapManager.update(dt, this.player, this.meta, this);
    this._checkScrapCollection();

    // Particles
    this.particles.update(dt);
    this.popup.update(dt);
    // Update announcements
    for (let i = this.announcements.length - 1; i >= 0; i--) {
      this.announcements[i].timer -= dt;
      if (this.announcements[i].timer <= 0) this.announcements.splice(i, 1);
    }

    // Level up check
    if (this.xp >= this.xpToNext) {
      this._levelUp();
    }

    // Game over
    if (!this.player.alive) {
      this._gameOver();
    }
  }

  _updateEnemiesAndBullets(dt) {
    this.enemies.update(dt, this.player, this.bullets, this);
    this.bullets.update(dt, this.enemies);
  }

  _updateWaves(dt) {
    // Transition between waves
    if (this.waveComplete) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this._startNextWave();
      }
      return;
    }

    // Check if all enemies dead and enough spawned
    if (this.enemiesSpawnedThisWave >= this.enemiesThisWave &&
        this.enemies.count === 0 && !this.enemies.bossActive) {
      this.waveComplete = true;
      this.transitionTimer = 2;
      // Bonus scrap for wave completion (counted on collection)
      const bonus = 3 + Math.floor(this.wave * 1.5);
      this.scrapManager.spawn(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, bonus);
    }

    // Spawn timer
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemiesSpawnedThisWave < this.enemiesThisWave) {
      this.spawnTimer = this.spawnInterval;
      this._spawnEnemy();
      this.enemiesSpawnedThisWave++;
    }

    // Elite wave: boss at wave BOSS_WAVE
    if (this.wave === CONFIG.BOSS_WAVE && !this.enemies.bossSpawnedThisWave && this.enemiesSpawnedThisWave >= this.enemiesThisWave * 0.5) {
      this.enemies.bossSpawnedThisWave = true;
      this.enemies.spawnBoss(this.wave);
      this.audio.bossWarning();
      this.audio.bgmSetState('boss');
      this.screenShake = 8;
      this.screenFlash = 0.20;
    }
  }

  _spawnEnemy() {
    const types = ['swarmer', 'swarmer', 'swarmer', 'sniper', 'tank', 'kamikaze', 'blocker'];

    // Guarantee variety in early waves
    if (this.wave === 1) {
      const snapshot = this.enemies.pool.active.map(e => e.type);
      if (!snapshot.includes('sniper') && Math.random() < 0.5) types.push('sniper');
      if (!snapshot.includes('kamikaze') && Math.random() < 0.4) types.push('kamikaze');
    }

    // Later waves: more variety and new types
    if (this.wave >= 3) {
      types.push('sniper', 'kamikaze', 'blocker', 'blocker');
    }
    if (this.wave >= 5) {
      types.push('tank', 'tank');
    }
    // New enemy types introduced at specific waves
    if (this.wave >= 4) {
      types.push('vortex', 'vortex');
    }
    if (this.wave >= 6) {
      types.push('minelayer', 'minelayer');
    }
    if (this.wave >= 7) {
      types.push('warp', 'warp');
    }
    const type = types[Math.floor(Math.random() * types.length)];
    this.enemies.spawn(type, null, null, this.wave);
  }

  _checkCollisions() {
    // Player bullets vs enemies
    this.bullets.playerBullets.updateAll(0, (b) => {
      // Snapshot enemies before iterating (damageEnemy splices active array)
      const enemies = [...this.enemies.pool.active];
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = dist(b, e);
        if (d < e.radius + b.radius) {
          // Burst — queue burst before consuming
          if (b.burst && !b.isBurstSub) {
            this._queueBurst(b.x, b.y, b.damage);
          }

          const killed = this.enemies.damageEnemy(e, b.damage, this);
          if (killed) {
            this._onEnemyKilled(e);
          } else {
            this.audio.hit();
            this.particles.emit(e.x, e.y, 4, {
              speed: 80, color: e.color, size: 2, life: 0.3
            });
          }

          // Piercing: count down instead of releasing
          if (b.piercing && b.pierceRemaining > 0) {
            b.pierceRemaining--;
            if (b.pierceRemaining <= 0) {
              this.bullets.playerBullets.release(b);
              return; // consumed
            }
            // Continue to next enemy in snapshot
            continue;
          }

          this.bullets.playerBullets.release(b);
          return; // bullet consumed
        }
      }
    });
    // Laser beam collision — runs every frame when active
    if (this.player.alive && this.player.laserActive) {
      const p = this.player;
      const cx = p.x;
      const cy = p.y - p.radius;
      const beamLength = 500;
      const beamWidth = 16;
      const enemiesCopy = [...this.enemies.pool.active];
      for (const e of enemiesCopy) {
        if (!e.alive) continue;
        if (e.y > cy || e.y < cy - beamLength) continue;
        if (Math.abs(e.x - cx) < beamWidth + e.radius) {
          const killed = this.enemies.damageEnemy(e, 0.2, this);
          if (killed) {
            this._onEnemyKilled(e);
          }
        }
      }
      // Small particles for heat effect
      if (Math.random() < 0.3) {
        this.particles.emit(cx + (Math.random() - 0.5) * 6, cy - Math.random() * beamLength * 0.8, 1, {
          speed: 20, color: '#ff2222', size: 2, life: 0.12
        });
      }
    }

    // Enemy bullets vs player (including mines)
    if (this.player.alive) {
      this.bullets.enemyBullets.updateAll(0, (b) => {
        const d = dist(b, this.player);
        if (d < this.player.hitboxRadius + b.radius) {
          if (b.isMine) {
            // Mine explosion on contact
            this.particles.emit(b.x, b.y, 15, {
              speed: 120, color: '#88ff44', size: 4, life: 0.5
            });
            this.screenShake = Math.max(this.screenShake, 5);
          }
          this.bullets.enemyBullets.release(b);
          const dmg = b.damage;
          const took = this.player.takeDamage(dmg, this);
          if (took) {
            this.stats.totalDamageTaken += dmg;
            this._onPlayerHit();
          }
          return;
        }
      });
    }

    // Enemy body vs player (kamikaze collision)
    if (this.player.alive) {
      this.enemies.pool.updateAll(0, (e) => {
        const d = dist(e, this.player);
        if (d < this.player.hitboxRadius + e.radius) {
          const took = this.player.takeDamage(1, this);
          if (took) {
            this.stats.totalDamageTaken++;
            this._onPlayerHit();
          }
          if (e.type === 'kamikaze' || !e.isBoss) {
            this.enemies.damageEnemy(e, 99, this);
            this._onEnemyKilled(e);
          }
        }
      });
    }
  }

  _checkScrapCollection() {
    this.scrapManager.pool.updateAll(0, (s) => {
      const d = dist(s, this.player);
      if (d < this.player.radius + s.radius) {
        this.scrapManager.pool.release(s);
        if (s.isCore) {
          this.meta.earnCores(1);
          this.stats.cores++;
          this.audio.coreCollect();
          this.screenShake = Math.max(this.screenShake, 3);
          this.screenFlash = Math.max(this.screenFlash, 0.15);
          this.particles.emit(s.x, s.y, 15, {
            speed: 160, color: '#ff88ff', size: 4, life: 0.6
          });
          this.popup.add('◆+1', s.x, s.y, '#ff88ff');
        } else {
          this.stats.scrap++;
          this.xp += 1;
          this.audio.scrapCollect();
          this.particles.scrapBurst(s.x, s.y);
          this.popup.add('+1', s.x, s.y, '#44ff88');
        }
      }
    });
  }

  _queueBurst(x, y, damage) {
    this._burstPending.push({ x, y, damage });
  }

  _processBursts() {
    if (this._burstPending.length === 0) return;
    for (const bq of this._burstPending) {
      // Spawn 6 sub-bullets in a circle
      const count = 6;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const sub = this.bullets.firePlayerBullet(
          bq.x, bq.y, angle, bq.damage,
          false, 0, 0, false, true // isBurstSub=true
        );
        if (sub) {
          // Lower speed for burst sub-bullets
          sub.vx *= 0.4;
          sub.vy *= 0.4;
          sub.damage = Math.max(1, Math.floor(bq.damage * 0.5));
        }
      }
      // Visual: orange ring burst
      this.particles.emit(bq.x, bq.y, 10, {
        speed: 120, color: '#ff8844', size: 3, life: 0.4
      });
      this.screenShake = Math.max(this.screenShake, 3);
    }
    this._burstPending = [];
  }

  _onEnemyKilled(e) {
    this.score += e.score;
    this.stats.enemiesKilled++;
    this.audio.explosion();
    this.screenShake = Math.max(this.screenShake, e.radius * 0.3);

    // Plasma Chain — chain damage to nearby enemies
    if (this._plasmaChainActive) {
      this._applyPlasmaChain(e.x, e.y);
    }

    // Particle burst (scaled by enemy size)
    const scale = Math.min(e.radius / 10, 2);
    this.particles.explosion(e.x, e.y, scale);

    // Drop scrap
    const scrapCount = e.isBoss ? 15 : (e.type === 'tank' ? 4 : 2);
    this.scrapManager.spawn(e.x, e.y, scrapCount);
    // Note: stats.scrap is incremented only on collection in _checkScrapCollection

    // Drop cores (wave-scaled chance)
    const coreChance = CONFIG.CORE_CHANCE + this.coreDropBonus + this.wave * 0.02;
    if (Math.random() < coreChance) {
      this.scrapManager.spawn(e.x, e.y, 1, true);
    }
    // Guarantee core from tank
    if (e.type === 'tank' && Math.random() < 0.3) {
      this.scrapManager.spawn(e.x, e.y, 1, true);
    }
  }

  _onPlayerHit() {
    this.damageFlash = 0.3;
    if (this.player.shield > 0) {
      this.audio.shieldHit();
      this.particles.emit(this.player.x, this.player.y, 8, {
        speed: 100, color: '#66ccff', size: 3, life: 0.3
      });
    } else {
      this.audio.playerHit();
      this.hitPause = CONFIG.HIT_PAUSE_DURATION;
      this.hitPauseRemaining = CONFIG.HIT_PAUSE_DURATION;
      this.screenShake = Math.max(this.screenShake, 6);
      this.chromaticIntensity = Math.max(this.chromaticIntensity, 4);
      this.screenFlash = 0.1;
      this.particles.emit(this.player.x, this.player.y, 12, {
        speed: 150, color: '#ff4444', size: 3, life: 0.4
      });
    }
  }

  _levelUp() {
    this.level++;
    this.xp = 0;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);
    this.audio.levelUp();
    this.announcements.push({ text: 'LEVEL UP!', timer: 2, y: CONFIG.HEIGHT * 0.3 });

    // Update upgrade pool (tier-2 gating)
    this.upgradeUI.show(this.stats.upgrades, this._tier2Unlocked);
    this.state = 'upgrade';
    this.timeScale = 0.3;
  }

  _applyUpgrade(choice) {
    this.stats.upgrades.push(choice.name);

    switch (choice.name) {
      case 'Plasma Chain':
        this._plasmaChainActive = true;
        break;
      case 'Gravity Well':
        this._gravityWellActive = true;
        break;
      case 'Solar Flare':
        this._solarFlareActive = true;
        this._solarFlareTimer = 0;
        break;
      case 'Spread Shot':
        this.player.spreadLevel++;
        break;
      case 'Homing Shot':
        this.player.homingLevel++;
        break;
      case 'Piercing Shot':
        this.player.piercingLevel++;
        break;
      case 'Burst Shot':
        this.player.burstLevel++;
        break;
      case 'Ricochet Shot':
        this.player.ricochetLevel++;
        break;
      case 'Wave Shot':
        this.player.waveLevel = 1;
        break;
      case 'Attack Speed':
        this.player.fireRate *= 0.75;
        break;
      case 'Damage Up':
        this.player.damageMultiplier *= 1.3;
        break;
      case 'Shield Up':
        this.player.shield++;
        this.player.maxShield++;
        break;
      case 'Move Speed':
        this.player.speedMultiplier *= 1.2;
        this.player.moveSpeed *= 1.2;
        break;
      case 'Magnet Up':
        this._magnetBonus = (this._magnetBonus || 1) * 1.4;
        break;
      case 'Laser Beam':
        this.player.laserLevel = (this.player.laserLevel || 0) + 1;
        break;
      case 'Orbital Shot':
        this.player.orbitalLevel = (this.player.orbitalLevel || 0) + 1;
        break;
    }
  }

  onBossDefeated(bx, by) {
    this.audio.bgmSetState('playing');
    this.audio.explosion();
    this.screenShake = 15;
    this.chromaticIntensity = 8;
    this.screenFlash = 0.4;
    this.particles.bossExplosion(bx, by);
    this.stats.bossesKilled++;
    this._tier2Unlocked = true; // Unlock Burst/Ricochet/Wave upgrades
    this.meta.earnCores(3);
    this.scrapManager.spawn(bx, by, 15);
    this.scrapManager.spawn(bx, by, 3, true);
    this.waveComplete = true;
    this.transitionTimer = 3;
    this.coreDropBonus += 0.03; // permanent until death
  }

  _startNextWave() {
    this.wave++;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.enemiesSpawnedThisWave = 0;
    this.enemies.bossSpawnedThisWave = false;
    this.enemies.bossDefeated = false;
    this.waveComplete = false;
    this.waveEliteSpawned = false;

    // Wave scaling
    this.enemiesThisWave = CONFIG.ENEMIES_PER_WAVE + Math.floor(this.wave * 1.5);
    this.spawnInterval = Math.max(0.25, 0.8 - this.wave * 0.03);

    // Wave announcement
    this.announcements.push({ text: `✦ WAVE ${this.wave} ✦`, timer: 2, y: CONFIG.HEIGHT * 0.25 });

    // Boss wave check
    if (this.wave === CONFIG.BOSS_WAVE) {
      this.enemiesThisWave = Math.floor(this.enemiesThisWave * 1.5);
    }
  }

  // ─── Render ───

  _render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake offset — only during gameplay
    let shakeX = 0, shakeY = 0;
    if ((this.state === 'playing' || this.state === 'upgrade' || this.state === 'gameover') && this.screenShake > 0.5) {
      shakeX = rand(-this.screenShake, this.screenShake);
      shakeY = rand(-this.screenShake, this.screenShake);
      ctx.translate(shakeX, shakeY);
    }

    if (this.state === 'menu' || this.state === 'meta') {
      if (this.state === 'menu') {
        this.menuScreen.render(ctx, this.meta);
      } else {
        this.metaScreen.render(ctx, this.meta);
      }
      // Mute toggle on menu/meta
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = '14px monospace';
      const isMuted = this.audio && this.audio.isMuted();
      ctx.fillStyle = isMuted ? 'rgba(85,85,119,0.7)' : 'rgba(170,170,204,0.7)';
      ctx.shadowColor = isMuted ? 'transparent' : '#4a9eff';
      ctx.shadowBlur = isMuted ? 0 : 6;
      ctx.fillText(isMuted ? '🔇' : '🔊', CONFIG.WIDTH - 6, 18);
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.restore();
      return;
    }

    // Game render
    this.starField.render(ctx);
    this.scrapManager.render(ctx);
    this.enemies.render(ctx);
    this.bullets.renderPlayerBullets(ctx);
    this.bullets.renderEnemyBullets(ctx);
    this.player.render(ctx);

    // Laser beam render — below particles for layered effect
    if (this.player.alive && this.player.laserActive) {
      const p = this.player;
      const beamLength = 500;
      const peakGlow = 0.6 + 0.4 * Math.sin(performance.now() * 0.02);
      
      // Outer glow
      ctx.save();
      const grad = ctx.createLinearGradient(p.x, p.y - p.radius, p.x, p.y - p.radius - beamLength);
      grad.addColorStop(0, `rgba(255, 60, 60, ${peakGlow * 0.25})`);
      grad.addColorStop(0.4, `rgba(255, 200, 80, ${peakGlow * 0.12})`);
      grad.addColorStop(1, 'rgba(255, 60, 60, 0)');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 30 * peakGlow;
      ctx.beginPath();
      ctx.roundRect(p.x - 20, p.y - p.radius - beamLength, 40, beamLength, 10);
      ctx.fill();
      
      // Core beam
      ctx.shadowColor = '#ff2222';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = `rgba(255, 80, 80, ${peakGlow * 0.9})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.radius);
      ctx.lineTo(p.x, p.y - p.radius - beamLength);
      ctx.stroke();
      
      // Hot center
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(255, 220, 180, ${peakGlow})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.radius);
      ctx.lineTo(p.x, p.y - p.radius - beamLength);
      ctx.stroke();
      ctx.restore();
    }

    this.particles.render(ctx);
    this.popup.render(ctx);

    // Touch indicator — shows where the ship aims
    if (this.state === 'playing' && this.input.isTouching()) {
      const p = this.input.getPos();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y - CONFIG.UPWARD_OFFSET, 16 + Math.sin(performance.now() * 0.005) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Gravity well effect
    if (this._gravityWellActive) {
      ctx.strokeStyle = 'rgba(136, 68, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 10]);
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 50 + Math.sin(performance.now() * 0.003) * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Screen flash
    if (this.screenFlash > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlash})`;
      ctx.fillRect(-10, -10, CONFIG.WIDTH + 20, CONFIG.HEIGHT + 20);
    }

    // Damage red vignette
    if (this.damageFlash > 0.01) {
      const grad = ctx.createRadialGradient(
        CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.3,
        CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.7
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(255, 0, 0, ${this.damageFlash * 0.4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    }

    // Low-HP warning pulse
    if (this.player.alive && this.player.hp === 1 && this.state === 'playing') {
      const pulse = Math.sin(performance.now() * 0.003) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.08})`;
      ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    }

    // Announcements (LEVEL UP! etc.)
    for (const a of this.announcements) {
      const scale = a.timer > 1.5 ? 1 + (2 - a.timer) * 0.5 : 1;
      ctx.save();
      ctx.translate(CONFIG.WIDTH / 2, a.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffdd44';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 20;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(a.text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // HUD
    this.hud.render(ctx, this.player, this.enemies, this, this.scrapManager, this.stats);

    // Upgrade overlay
    if (this.state === 'upgrade') {
      this.upgradeUI.render(ctx);
    }

    // Game over overlay
    if (this.state === 'gameover') {
      this._renderGameOver(ctx);
    }

    ctx.restore();

    // Chromatic aberration
    if (this.chromaticIntensity > 0.5) {
      this._applyChromatic(ctx, shakeX, shakeY);
    }

    // Mute toggle — always visible in top-right corner
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '14px monospace';
    const isMuted = this.audio && this.audio.isMuted();
    ctx.fillStyle = isMuted ? 'rgba(85,85,119,0.7)' : 'rgba(170,170,204,0.7)';
    ctx.shadowColor = isMuted ? 'transparent' : '#4a9eff';
    ctx.shadowBlur = isMuted ? 0 : 6;
    ctx.fillText(isMuted ? '🔇' : '🔊', CONFIG.WIDTH - 6, 18);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _renderGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ff4466';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.17);
    ctx.shadowBlur = 0;

    // Wave reached badge
    ctx.shadowColor = '#ffddaa';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffddaa';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`✦ Reached Wave ${this.wave} ✦`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.215);
    ctx.shadowBlur = 0;

    // Score line
    ctx.fillStyle = '#ffddaa';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Score: ${this.score}`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.255);
    ctx.fillStyle = '#888899';
    ctx.font = '9px monospace';
    ctx.fillText(`Level ${this.level}`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.29);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CONFIG.WIDTH * 0.15, CONFIG.HEIGHT * 0.32);
    ctx.lineTo(CONFIG.WIDTH * 0.85, CONFIG.HEIGHT * 0.32);
    ctx.stroke();

    // Stats with icon labels
    ctx.font = '9px monospace';
    const statsList = [
      { label: '☠ Enemies', value: this.stats.enemiesKilled },
      { label: '⛋ Bosses', value: this.stats.bossesKilled },
      { label: '★ Scrap', value: this.stats.scrap },
      { label: '◆ Cores', value: this.stats.cores },
      { label: '⏱ Time', value: `${Math.floor(this.stats.timeSurvived)}s` },
      { label: '↑ Upgrades', value: this.stats.upgrades.length },
    ];
    const startY = CONFIG.HEIGHT * 0.36;
    const colW = CONFIG.WIDTH / 2;
    statsList.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = col === 0 ? CONFIG.WIDTH * 0.12 : CONFIG.WIDTH * 0.58;
      const sy = startY + row * 20;
      ctx.fillStyle = '#666688';
      ctx.textAlign = 'left';
      ctx.fillText(s.label, sx, sy);
      ctx.fillStyle = '#ccccdd';
      ctx.textAlign = 'right';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(s.value, sx + colW - 10, sy);
      ctx.font = '9px monospace';
    });
    ctx.textAlign = 'center';

    // Upgrades taken
    if (this.stats.upgrades.length > 0) {
      ctx.fillStyle = '#444466';
      ctx.font = '7px monospace';
      ctx.fillText(this.stats.upgrades.join(' • '), CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.62);
    }

    // Restart / Upgrades indicator
    const blink = Math.sin(performance.now() * 0.003);
    ctx.fillStyle = blink > 0 ? '#ffffff' : '#555577';
    ctx.font = '10px monospace';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = blink > 0 ? 6 : 0;
    ctx.fillText('TAP TO CONTINUE', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.80);
    ctx.shadowBlur = 0;

    // Meta access button
    ctx.fillStyle = '#ff88ff';
    ctx.font = '8px monospace';
    ctx.shadowColor = '#ff44ff';
    ctx.shadowBlur = 4;
    ctx.fillText('◈ UPGRADES ◈', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.88);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  _applyChromatic(ctx, sx, sy) {
    const shift = Math.min(this.chromaticIntensity * 0.2, 3);
    if (shift < 0.3) return;

    // Capture current frame (exclude shake offset)
    this._chromaCtx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    this._chromaCtx.drawImage(this.canvas, 0, 0);

    // Reset canvas transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Red channels shifted
    ctx.globalAlpha = 0.3;
    ctx.drawImage(this._chromaCanvas, -shift + sx, sy);

    // Blue channel shifted right
    ctx.drawImage(this._chromaCanvas, shift + sx, sy);

    // Green base
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this._chromaCanvas, sx, sy);

    if (sx !== 0 || sy !== 0) {
      ctx.setTransform(1, 0, 0, 1, sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  // ─── Game State Transitions ───

  // Spawn a mine from MineLayer
  spawnMine(x, y) {
    const b = this.bullets.enemyBullets.acquire();
    if (!b) return;
    b.x = x; b.y = y;
    b.vx = 0; b.vy = 0;
    b.damage = CONFIG.BOSS_DAMAGE;
    b.radius = 7;
    b.isEnemy = true;
    b.color = '#88ff44';
    b.isMine = true;
    b.mineTimer = 4; // auto-destruct after 4s
    // Visual indicator
    this.particles.emit(x, y, 6, {
      speed: 40, color: '#88ff44', size: 3, life: 0.3
    });
  }

  // Update mines timer in the playing loop
  _updateMines(dt) {
    this.bullets.enemyBullets.updateAll(dt, (b) => {
      if (!b.isMine) return;
      b.mineTimer -= dt;
      if (b.mineTimer <= 0) {
        this.bullets.enemyBullets.release(b);
      }
    });
  }

  startGame() {
    this.state = 'playing';
    this.audio.bgmSetState('playing');
    this.wave = 0;
    this.score = 0;
    this.xp = 0;
    this.xpToNext = 20;
    this.level = 0;
    this.coreDropBonus = 0;
    this.timeScale = 1;
    this._plasmaChainActive = false;
    this._gravityWellActive = false;
    this._solarFlareActive = false;
    this._solarFlareTimer = 0;
    this._magnetBonus = 0;
    this._burstPending = [];
    this._tier2Unlocked = false;
    this._resetJuice();

    this.stats = {
      enemiesKilled: 0,
      totalDamageTaken: 0,
      timeSurvived: 0,
      bossesKilled: 0,
      scrap: 0,
      cores: 0,
      upgrades: [],
      restarts: 0,
    };

    this.enemies.releaseAll();
    this.bullets.releaseAll();
    this.particles.releaseAll();
    this.scrapManager.releaseAll();
    this.player.reset(this.meta);

    this._startNextWave();
  }

  _gameOver() {
    this.state = 'gameover';
    this.stats.restarts++;
    this.audio.bgmStop();
    this.audio.gameOver();
    this._bgmStarted = false;
    this.screenShake = 10;
    this.chromaticIntensity = 8;
    this.screenFlash = 0.3;

    // Mega explosion
    this.particles.bossExplosion(this.player.x, this.player.y);
  }

  _resetJuice() {
    this.screenShake = 0;
    this.chromaticIntensity = 0;
    this.screenFlash = 0;
    this.damageFlash = 0;
  }

  _triggerSolarFlare() {
    // Clear all enemy bullets within range of player
    let cleared = 0;
    this.bullets.enemyBullets.updateAll(0, (b) => {
      const d = dist(b, this.player);
      if (d < CONFIG.SOLAR_FLARE_RANGE) {
        this.bullets.enemyBullets.release(b);
        cleared++;
      }
    });
    this.screenShake = Math.max(this.screenShake, 3);
    this.screenFlash = 0.15;
    this.announcements.push({ text: '☀ FLARE!', timer: 0.8, y: CONFIG.HEIGHT * 0.3 });
    // Sparkle particles
    this.particles.emit(this.player.x, this.player.y, 20, {
      speed: 150, color: '#ffaa44', size: 3, life: 0.5
    });
  }

  _applyPlasmaChain(x, y) {
    // Chain lightning to nearby enemies
    let targets = [];
    for (const e of this.enemies.pool.active) {
      if (!e.alive) continue;
      const d = dist({x, y}, e);
      if (d < CONFIG.PLASMA_CHAIN_RANGE) {
        targets.push({ enemy: e, distance: d });
      }
    }
    // Sort by distance, hit up to max targets
    targets.sort((a, b) => a.distance - b.distance);
    const hitCount = Math.min(targets.length, CONFIG.PLASMA_CHAIN_MAX_TARGETS);
    for (let i = 0; i < hitCount; i++) {
      const e = targets[i].enemy;
      const killed = this.enemies.damageEnemy(e, 1, this);
      this.particles.emit(e.x, e.y, 6, {
        speed: 100, color: '#44ff88', size: 3, life: 0.3
      });
      if (killed) {
        this._onEnemyKilled(e);
      } else {
        this.audio.hit();
      }
    }
  }

  _applyGravityWell(dt) {
    if (!this._gravityWellActive || !this.player.alive) return;

    const px = this.player.x;
    const py = this.player.y;

    // Pull enemies toward player
    for (const e of this.enemies.pool.active) {
      if (!e.alive || e.isBoss) continue;
      const d = dist(e, this.player);
      if (d > 2 && d < CONFIG.GRAVITY_WELL_RANGE) {
        const force = CONFIG.GRAVITY_WELL_ENEMY_PULL / Math.max(d, 10);
        e.x += (px - e.x) / d * force * dt;
        e.y += (py - e.y) / d * force * dt;
      }
    }

    // Pull scrap toward player (stronger)
    this.scrapManager.pool.updateAll(0, (s) => {
      const d = dist(s, this.player);
      if (d > 2 && d < CONFIG.GRAVITY_WELL_RANGE * 1.2) {
        const force = CONFIG.GRAVITY_WELL_SCRAP_PULL / Math.max(d, 10);
        s.x += (px - s.x) / d * force * dt;
        s.y += (py - s.y) / d * force * dt;
      }
    });
  }

  // Menu screen actions
  showMeta() {
    this.state = 'meta';
    this.metaScreen.active = true;
    this._resetJuice();
  }
}
