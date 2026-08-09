// v2 Game — ESM orchestrator (port of v1 Game.js)
// States: menu → playing → upgrade → playing → ... → gameover → menu / meta
// Owns Input, Player, EnemyManager, BulletManager, ScrapManager, ParticleSystem,
// StarField, AudioManager + SfxEngine + MusicEngine. Fixed-timestep loop.

import { CONFIG, getSector } from './config.js';
import { MODES, getMode, initialModeState } from './modes.js';
import { dist, rand } from './utils.js';
import { Input } from './Input.js';
import { SpatialGrid } from './SpatialGrid.js';
import { StarField } from '../render/StarField.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../entities/Enemy.js';
import { BulletManager } from '../entities/Bullet.js';
import { ScrapManager } from '../entities/Scrap.js';
import { ParticleSystem } from '../entities/Particles.js';
import { AudioManager } from '../systems/AudioManager.js';
import { MusicEngine } from '../systems/MusicEngine.js';
import { SfxEngine } from '../systems/SfxEngine.js';
import { MenuScreen } from '../ui/Menu.js';
import { ModeSelectScreen } from '../ui/ModeSelect.js';
import { MetaScreen } from '../ui/MetaScreen.js';
import { UpgradeUI } from '../ui/UpgradeUI.js';
import { HUD } from '../ui/HUD.js';
import { GameOverUI } from '../ui/GameOverUI.js';
import { Hangar } from '../ui/Hangar.js';
import { SaveManager } from '../systems/SaveManager.js';
import { MetaProgression } from '../systems/MetaProgression.js';
import { SHIPS } from '../entities/ships.js';

class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = 'menu';
    this.running = false;
    this.lastTime = 0;

    // Systems
    this.input = null;
    this.spatialGrid = new SpatialGrid();
    this.player = new Player();
    this.enemies = new EnemyManager();
    this.bullets = new BulletManager();
    this.particles = new ParticleSystem();
    this.scrap = new ScrapManager();
    this.starField = new StarField();
    this.audio = new AudioManager();
    this.music = new MusicEngine();
    this.sfx = new SfxEngine(this.audio);
    this.menuScreen = new MenuScreen();
    this.modeSelect = new ModeSelectScreen(this);
    this.pendingMode = 'classic';

    // Meta-progression (Task 3.4)
    this.save = new SaveManager();
    this.metaProgression = new MetaProgression(this.save);
    this.metaScreen = new MetaScreen(this);
    this.upgradeUI = new UpgradeUI(this);
    this.gameOverUI = new GameOverUI(this);
    this.hangar = new Hangar(this);

    // HUD
    this.hud = new HUD(canvas, ctx, this);

    // Run state
    this.wave = 0;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.enemiesThisWave = 0;
    this.enemiesSpawnedThisWave = 0;
    this.waveComplete = false;
    this.transitionTimer = 0;
    this.spawnInterval = CONFIG.SPAWN_INTERVAL || 0.8;
    this.coreDropBonus = 0;
    this._tier2Unlocked = false;
    this.timeScale = 1;
    this.waveEliteSpawned = false;
    this.sector = getSector(0);       // current sector (starts Azure)
    this.sectorBannerTimer = 0;       // >0 shows "— SECTOR —" banner

    // Stats
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

    // Score / xp
    this.score = 0;
    this.xp = 0;
    this.xpToNext = 20;
    this.level = 0;
    this.announcements = [];

    // Juice
    this.screenShake = 0;
    this.chromaticIntensity = 0;
    this.screenFlash = 0;
    this.damageFlash = 0;
    this.hitPause = 0;
    this.hitPauseRemaining = 0;
    this._plasmaChainActive = false;
    this._gravityWellActive = false;
    this._solarFlareActive = false;
    this._solarFlareTimer = 0;
    this._magnetBonus = 1;
    this._burstPending = [];
    this._bgmStarted = false;

    // Upgrade timer (state 'upgrade')
    this._upgradeTimer = 0;

    // FPS
    this._fps = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;

    this._loop = this._loop.bind(this);
  }

  _getDPR() {
    return this.canvas._pixelScale || 1;
  }

  init() {
    this.input = new Input(this.canvas, () => {
      if (!this.audio._ctx) this.audio.ensure();
      if (!this.music._ready) {
        this.music.init(this.audio.getMusicBus());
        this.music.startMusic();
        this.audio.setMusicActive(true);
      }
    });
    this.bullets.setBurstCallback((x, y, dmg) => {
      this._queueBurst(x, y, dmg);
    });
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop);
  }

  _loop(timestamp) {
    if (!this.running) return;
    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this._fpsFrames++;
    this._fpsTime += rawDt;
    if (this._fpsTime >= 0.5) {
      this._fps = Math.round(this._fpsFrames / this._fpsTime);
      this._fpsFrames = 0;
      this._fpsTime = 0;
    }

    const dt = Math.min(rawDt, 0.05);

    if (this.hitPauseRemaining > 0) {
      this.hitPauseRemaining -= rawDt;
      this._render();
      requestAnimationFrame(this._loop);
      return;
    }

    this._update(dt * this.timeScale);
    this._render();
    if (this.input) this.input.postFrame();

    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    // Mute toggle — tap top-right corner
    if (this.input && this.input.justTapped) {
      const p = this.input.getPos();
      if (p.x > CONFIG.WIDTH - 30 && p.y < 25) {
        this.audio.setEnabled(!this.audio._enabled);
        this.input.justTapped = false;
        return;
      }
    }

    switch (this.state) {
      case 'menu':
        this.starField.update(dt);
        this.menuScreen.updateHover(this.input.mouseX, this.input.mouseY);
        if (this.input.justTapped) {
          const p = this.input.getPos();
          const idx = this.menuScreen.getHoveredButton(p.x, p.y);
          const action = this.menuScreen.handleTap(idx, this);
          if (action === 'start') {
            this.state = 'modeselect';
            this.sfx.play('click');
          }
          else if (action === 'upgrades') {
            this.state = 'meta';
            this.metaScreen.show();
          }
          else if (action === 'hangar') {
            this.state = 'hangar';
            this.hangar.show();
          }
        }
        break;

      case 'modeselect':
        this.starField.update(dt);
        this.modeSelect.updateHover(this.input.mouseX, this.input.mouseY);
        if (this.input.justTapped) {
          const p = this.input.getPos();
          const idx = this.modeSelect.buttonIndexAt(p.x, p.y);
          const res = this.modeSelect.handleTap(idx);
          if (res) {
            if (res.action === 'back') this.state = 'menu';
            else if (res.action === 'start') {
              this.mode = initialModeState(res.id);
              this.startGame(res.id);
            }
          }
        }
        break;

      case 'hangar':
        this.starField.update(dt);
        this.hangar.updateHover(this.input.mouseX, this.input.mouseY);
        if (this.input.justTapped) {
          const p = this.input.getPos();
          const res = this.hangar.handleTap(p.x, p.y);
          if (res && res.action === 'back') {
            this.state = 'menu';
            this.hangar.hide();
          }
        }
        break;

      case 'playing':
        this._updatePlaying(dt);
        break;

      case 'upgrade':
        this.screenShake *= Math.pow(CONFIG.SCREEN_SHAKE_DECAY, dt * 60);
        if (this.screenShake < 0.5) this.screenShake = 0;
        this.starField.update(dt * 0.3);
        this.particles.update(dt * 0.3);
        // UpgradeUI (Task 3.4): tap to pick one of 3 cards
        if (this.input.justTapped) {
          const p = this.input.getPos();
          if (this.upgradeUI.handleTap(p.x, p.y)) {
            this.state = 'playing';
            this.timeScale = 1;
            this.upgradeUI.hide();
          }
        }
        // Fallback: auto-pick only if player hasn't tapped (tap hides UI + resets timer)
        if (this.upgradeUI.visible) {
          this._upgradeTimer = (this._upgradeTimer || 0) - dt;
          if (this._upgradeTimer <= 0) {
            const options = this._rollUpgrades();
            if (options.length > 0) {
              this._applyUpgrade(options[0]);
            }
            this.state = 'playing';
            this.timeScale = 1;
            this.upgradeUI.hide();
          }
        }
        break;

      case 'gameover':
        this.screenShake *= Math.pow(0.88, dt * 60);
        if (this.screenShake < 0.5) this.screenShake = 0;
        this.screenFlash *= Math.pow(CONFIG.FLASH_DECAY, dt * 60);
        if (this.screenFlash < 0.01) this.screenFlash = 0;
        this.chromaticIntensity *= Math.pow(CONFIG.CHROMATIC_DECAY, dt * 60);
        if (this.chromaticIntensity < 0.5) this.chromaticIntensity = 0;

        if (this.input.justTapped) {
          const p = this.input.getPos();

          // GameOverUI handles tap routing (meta vs restart)
          this.gameOverUI.handleTap(p.x, p.y);
        }
        break;

      case 'meta':
        if (this.input.justTapped) {
          const p = this.input.getPos();
          this.metaScreen.handleTap(p.x, p.y);
        }
        break;
    }
  }

  _updatePlaying(dt) {
    this.stats.timeSurvived += dt;
    this.starField.update(dt);

    // Decay juice
    this.screenShake *= Math.pow(CONFIG.SCREEN_SHAKE_DECAY, dt * 60);
    if (this.screenShake < 0.5) this.screenShake = 0;
    this.chromaticIntensity *= Math.pow(CONFIG.CHROMATIC_DECAY, dt * 60);
    if (this.chromaticIntensity < 0.5) this.chromaticIntensity = 0;
    this.screenFlash *= Math.pow(CONFIG.FLASH_DECAY, dt * 60);
    if (this.screenFlash < 0.01) this.screenFlash = 0;
    this.damageFlash *= 0.92;
    if (this.damageFlash < 0.01) this.damageFlash = 0;

    this.player.update(dt, this.input, this.bullets, this.enemies, this);

    // Engine trail
    if (this.player.alive) {
      this.particles.engineTrail(
        this.player.x + rand(-4, 4),
        this.player.y + this.player.radius * 0.6,
        Math.floor(dt * 30),
        this._solarFlareActive ? '#ff8844' : '#4a9eff'
      );
    }

    this._updateEnemiesAndBullets(dt);

    // Solar Flare
    if (this._solarFlareActive) {
      this._solarFlareTimer += dt;
      if (this._solarFlareTimer >= (CONFIG.SOLAR_FLARE_INTERVAL || 8)) {
        this._solarFlareTimer = 0;
        this._triggerSolarFlare();
      }
    }

    this._updateWaves(dt);
    this._checkCollisions();
    this._processBursts();
    this._updateMines(dt);
    this._applyGravityWell(dt);

    this.scrap.update(dt, this.player, this.metaProgression, this);
    this._checkScrapCollection();

    this.particles.update(dt);

    for (let i = this.announcements.length - 1; i >= 0; i--) {
      this.announcements[i].timer -= dt;
      if (this.announcements[i].timer <= 0) this.announcements.splice(i, 1);
    }
    if (this.sectorBannerTimer > 0) this.sectorBannerTimer -= dt;

    if (this.xp >= this.xpToNext) {
      this._levelUp();
    }

    if (!this.player.alive) {
      this._gameOver();
    }
  }

  _updateEnemiesAndBullets(dt) {
    this.enemies.update(dt, this.player, this.bullets, this);
    this.bullets.update(dt, this.enemies);
  }

  _updateWaves(dt) {
    if (this.waveComplete) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) this._startNextWave();
      return;
    }

    const rules = this.mode ? this.mode.rules : null;

    // Boss Rush: pending boss wave keeps arena open (no auto-complete)
    const pendingBossWave = rules && (rules.bossWaves || []).includes(this.wave) && !this.enemies.bossSpawnedThisWave;

    if (!pendingBossWave &&
        this.enemiesSpawnedThisWave >= this.enemiesThisWave &&
        this.enemies.count === 0 && !this.enemies.bossActive) {
      this.waveComplete = true;
      this.transitionTimer = 2;
      const bonus = 3 + Math.floor(this.wave * 1.5);
      this.scrap.spawn(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, bonus);
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemiesSpawnedThisWave < this.enemiesThisWave) {
      this.spawnTimer = this.spawnInterval;
      this._spawnEnemy();
      this.enemiesSpawnedThisWave++;
    }

    if ((rules && rules.bossWaves ? rules.bossWaves : (CONFIG.BOSS_WAVES || [10])).includes(this.wave) &&
        !this.enemies.bossSpawnedThisWave &&
        (this.enemiesThisWave === 0 || this.enemiesSpawnedThisWave >= this.enemiesThisWave * 0.5)) {
      this.enemies.bossSpawnedThisWave = true;
      this.enemies.spawnBoss(this.wave);
      this.sfx.play('bossRoar');
      this.music.transition('boss');
      this.screenShake = 4;
      this.screenFlash = 0.20;
    }
  }

  _spawnEnemy() {
    const modePool = this.mode && this.mode.rules && this.mode.rules.enemyTypes;
    let types;
    if (modePool && modePool.length > 0) {
      types = [...modePool];
    } else {
      // BossRush has empty enemyTypes → no grunts (not a bug)
      if (this.mode && this.mode.id === 'bossRush') return;
      types = ['swarmer', 'swarmer', 'swarmer', 'sniper', 'tank', 'kamikaze', 'blocker'];
    }
    const type = types[Math.floor(Math.random() * types.length)];
    this.enemies.spawn(type, null, null, this.wave);
  }

  _checkCollisions() {
    this.spatialGrid.clear();
    for (const e of this.enemies.pool.active) {
      if (e.alive) this.spatialGrid.insert(e);
    }

    // Player bullets vs enemies
    this.bullets.playerBullets.updateAll(0, (b) => {
      const near = this.spatialGrid.query(b.x, b.y, 50);
      for (const e of near) {
        if (!e.alive) continue;
        const d = dist(b, e);
        // Disrupter aura: 20% of bullets near it fizzle
        if (e.type === 'disrupter' && d < e.radius + 60 && Math.random() < 0.2) {
          this.particles.emit(b.x, b.y, 3, { speed: 40, color: '#ff66aa', size: 2, life: 0.2 });
          this.bullets.playerBullets.release(b);
          return;
        }
        if (d < e.radius + b.radius) {
          if (b.burst && !b.isBurstSub) {
            this._queueBurst(b.x, b.y, b.damage);
          }

          const killed = this.enemies.damageEnemy(e, b.damage, this);
          if (killed) {
            this._onEnemyKilled(e);
          } else {
            this.sfx.play('hit');
            this.particles.emit(e.x, e.y, 4, {
              speed: 80, color: e.color, size: 2, life: 0.3
            });
          }

          // AoE explosion (seeker) — damage nearby enemies
          if (b.aoe) {
            const blasts = this.spatialGrid.query(b.x, b.y, b.aoeRadius);
            for (const ae of blasts) {
              if (!ae.alive || ae === e) continue;
              const ad = dist(b, ae);
              if (ad < b.aoeRadius + ae.radius) {
                const ak = this.enemies.damageEnemy(ae, b.damage * 0.5, this);
                if (ak) this._onEnemyKilled(ae);
              }
            }
            this.particles.emit(b.x, b.y, 12, {
              speed: 140, color: '#ff8844', size: 3, life: 0.4
            });
            if (this.screenShake !== undefined) this.screenShake = Math.max(this.screenShake, 4);
          }

          if (b.piercing && b.pierceRemaining > 0) {
            b.pierceRemaining--;
            if (b.pierceRemaining <= 0) {
              this.bullets.playerBullets.release(b);
              return;
            }
            continue;
          }

          this.bullets.playerBullets.release(b);
          return;
        }
      }
    });

    // Laser beam collision
    if (this.player.alive && this.player.laserActive) {
      const p = this.player;
      const cx = p.x;
      const cy = p.y - p.radius;
      const beamLength = 500;
      const beamWidth = 16;
      const near = this.spatialGrid.query(cx, cy, beamLength);
      for (const e of near) {
        if (!e.alive) continue;
        if (e.y > cy || e.y < cy - beamLength) continue;
        if (Math.abs(e.x - cx) < beamWidth + e.radius) {
          const killed = this.enemies.damageEnemy(e, 0.2, this);
          if (killed) this._onEnemyKilled(e);
        }
      }
      if (Math.random() < 0.3) {
        this.particles.emit(cx + (Math.random() - 0.5) * 6, cy - Math.random() * beamLength * 0.8, 1, {
          speed: 20, color: '#ff2222', size: 2, life: 0.12
        });
      }
    }

    // Enemy bullets vs player (incl mines)
    if (this.player.alive) {
      this.bullets.enemyBullets.updateAll(0, (b) => {
        if (!b.isEnemy) return;
        const d = dist(b, this.player);
        if (d < this.player.hitboxRadius + b.radius) {
          if (b.isMine) {
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

    // Enemy body vs player
    if (this.player.alive) {
      const near = this.spatialGrid.query(this.player.x, this.player.y, 60);
      for (const e of near) {
        if (!e.alive) continue;
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
      }
    }
  }

  _checkScrapCollection() {
    this.scrap.pool.updateAll(0, (s) => {
      const d = dist(s, this.player);
      if (d < this.player.radius + s.radius) {
        this.scrap.pool.release(s);
        if (s.isCore) {
          this.metaProgression.earnCores(1);
          this.stats.cores++;
          this.sfx.play('pickup');
          this.screenShake = Math.max(this.screenShake, 3);
          this.screenFlash = Math.max(this.screenFlash, 0.15);
          this.particles.emit(s.x, s.y, 15, {
            speed: 160, color: '#ff88ff', size: 4, life: 0.6
          });
        } else {
          this.stats.scrap++;
          this.xp += 1;
          this.sfx.play('pickup');
          this.particles.scrapBurst(s.x, s.y);
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
      const count = 6;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const sub = this.bullets.firePlayerBullet(
          bq.x, bq.y, angle, bq.damage,
          false, 0, 0, false, true
        );
        if (sub) {
          sub.vx *= 0.4;
          sub.vy *= 0.4;
          sub.damage = Math.max(1, Math.floor(bq.damage * 0.5));
        }
      }
      this.particles.emit(bq.x, bq.y, 10, {
        speed: 120, color: '#ff8844', size: 3, life: 0.4
      });
      this.screenShake = Math.max(this.screenShake, 3);
    }
    this._burstPending = [];
  }

  _onEnemyKilled(e) {
    const mult = this.mode && this.mode.scoreMult ? this.mode.scoreMult : 1;
    this.score += Math.round(e.score * mult);
    this.stats.enemiesKilled++;
    this.sfx.play('explosion');
    this.screenShake = Math.max(this.screenShake, e.radius * 0.3);

    if (this._plasmaChainActive) {
      this._applyPlasmaChain(e.x, e.y);
    }

    const scale = Math.min(e.radius / 10, 2);
    this.particles.explosion(e.x, e.y, scale);

    const scrapCount = e.isBoss ? 15 : (e.type === 'tank' ? 4 : 2);
    this.scrap.spawn(e.x, e.y, scrapCount);

    const coreChance = (CONFIG.CORE_CHANCE || 0.06) + this.coreDropBonus + this.wave * 0.02;
    if (Math.random() < coreChance) {
      this.scrap.spawn(e.x, e.y, 1, true);
    }
    if (e.type === 'tank' && Math.random() < 0.3) {
      this.scrap.spawn(e.x, e.y, 1, true);
    }
  }

  _onPlayerHit() {
    this.damageFlash = 0.3;
    if (this.player.shield > 0) {
      this.sfx.play('shield');
      this.particles.emit(this.player.x, this.player.y, 8, {
        speed: 100, color: '#66ccff', size: 3, life: 0.3
      });
      this.screenShake = Math.max(this.screenShake, 4);
      this.chromaticIntensity = Math.max(this.chromaticIntensity, 2);
    } else {
      this.sfx.play('hit');
      this.hitPause = CONFIG.HIT_PAUSE_DURATION || 0.08;
      this.hitPauseRemaining = this.hitPause;
      this.screenShake = Math.max(this.screenShake, 6);
      this.chromaticIntensity = Math.max(this.chromaticIntensity, 5);
      this.screenFlash = 0.15;
      this.particles.emit(this.player.x, this.player.y, 16, {
        speed: 180, color: '#ff4444', size: 4, life: 0.5
      });
    }
  }

  _levelUp() {
    this.level++;
    this.xp = 0;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);
    this.sfx.play('levelUp');
    this.announcements.push({ text: 'LEVEL UP!', timer: 2, y: CONFIG.HEIGHT * 0.3 });

    this._upgradeTimer = 1.5;
    this.state = 'upgrade';
    this.timeScale = 0.3;
    this.upgradeUI.show();
  }

  _rollUpgrades() {
    const pool = [
      { name: 'Spread Shot', key: 'spread' },
      { name: 'Homing Shot', key: 'homing' },
      { name: 'Piercing Shot', key: 'piercing' },
      { name: 'Burst Shot', key: 'burst' },
      { name: 'Ricochet Shot', key: 'ricochet' },
      { name: 'Wave Shot', key: 'wave' },
      { name: 'Attack Speed', key: 'fireRate' },
      { name: 'Damage Up', key: 'damage' },
      { name: 'Shield Up', key: 'shield' },
      { name: 'Move Speed', key: 'moveSpeed' },
      { name: 'Magnet Up', key: 'magnet' },
      { name: 'Laser Beam', key: 'laser' },
      { name: 'Orbital Shot', key: 'orbital' },
      { name: 'Plasma Chain', key: 'plasmaChain' },
      { name: 'Gravity Well', key: 'gravityWell' },
      { name: 'Solar Flare', key: 'solarFlare' },
    ];
    const picked = [];
    while (picked.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  _applyUpgrade(choice) {
    this.stats.upgrades.push(choice.name);
    const p = this.player;

    switch (choice.key) {
      case 'spread': p.spreadLevel++; break;
      case 'homing': p.homingLevel++; break;
      case 'piercing': p.piercingLevel++; break;
      case 'burst': p.burstLevel++; break;
      case 'ricochet': p.ricochetLevel++; break;
      case 'wave': p.waveLevel = 1; break;
      case 'fireRate': p.fireRate *= 0.75; break;
      case 'damage': p.damageMultiplier *= 1.3; break;
      case 'shield': p.shield++; p.maxShield++; break;
      case 'moveSpeed': p.speedMultiplier *= 1.2; p.moveSpeed *= 1.2; break;
      case 'magnet': this._magnetBonus *= 1.4; break;
      case 'laser': p.laserLevel = (p.laserLevel || 0) + 1; break;
      case 'orbital': p.orbitalLevel = (p.orbitalLevel || 0) + 1; break;
      case 'plasmaChain': this._plasmaChainActive = true; break;
      case 'gravityWell': this._gravityWellActive = true; break;
      case 'solarFlare': this._solarFlareActive = true; this._solarFlareTimer = 0; break;
    }
  }

  onBossDefeated(bx, by) {
    this.music.transition('playing');
    this.sfx.play('explosion');
    this.screenShake = 8;
    this.chromaticIntensity = 8;
    this.screenFlash = 0.4;
    this.particles.bossExplosion(bx, by);
    this.stats.bossesKilled++;
    this._tier2Unlocked = true;

    // Unlock gates — Boss Rush unlocked by beating classic wave 10; Challenge by wave-20 boss
    if (this.mode && this.mode.id === 'classic') {
      if (this.wave === 10) this.save.set('unlocked_boss10Killed', true);
    }
    if (this.wave >= 20) this.save.set('unlocked_boss20Killed', true);
    this.mode.bossKills = (this.mode.bossKills || 0) + 1;

    this.metaProgression.earnCores(3);
    this.scrap.spawn(bx, by, 15);
    this.scrap.spawn(bx, by, 3, true);
    this.waveComplete = true;
    this.transitionTimer = 3;
    this.coreDropBonus += 0.03;
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

    const rules = this.mode ? this.mode.rules : null;

    // Mode-specific enemy count + spawn interval decay
    const baseCount = rules ? (rules.enemiesPerWave ?? CONFIG.ENEMIES_PER_WAVE) : (CONFIG.ENEMIES_PER_WAVE || 6);
    // Boss Rush rules.enemyTypes=[] → pure boss arena, zero grunts
    this.enemiesThisWave = (rules && rules.enemyTypes && rules.enemyTypes.length === 0) ? 0 : baseCount + (this.wave - 1) * 1.5;
    this.spawnInterval = Math.max(0.25, (rules ? rules.spawnInterval : 0.8) - this.wave * (rules ? rules.spawnIntervalDecay : 0.03));

    // Mode caps: Endless & Challenge don't spawn bosses
    if (rules && rules.bossWave === null) this.enemies.bossSpawnedThisWave = true;

    // Endless unlock: reached wave 15 in Classic
    if (this.mode && this.mode.id === 'classic' && this.wave >= 15) {
      this.save.set('unlocked_wave15', true);
    }

    this.announcements.push({ text: `✦ WAVE ${this.wave} ✦`, timer: 2, y: CONFIG.HEIGHT * 0.25 });

    // Sector rotation — banner + palette swap on sector change (waves 1, 11, 21, ...)
    const nextSector = getSector(this.wave);
    if (nextSector.key !== this.sector.key) {
      this.sector = nextSector;
      this.sectorBannerTimer = 2.5;
      this.sfx.play('sectorChange');
      this.screenFlash = 0.15;
    }

    if ((CONFIG.BOSS_WAVE || 10) && this.wave === CONFIG.BOSS_WAVE) {
      this.enemiesThisWave = Math.floor(this.enemiesThisWave * 1.5);
    }

    // Score multiplier per N waves (Endless)
    if (rules && rules.scoreMultIncrement) {
      this.mode.scoreMult = 1 + rules.scoreMultIncrement * Math.floor(this.wave / rules.scoreMultPerXWave);
    }

    // Wave cap reached → end run as victory
    if (rules && rules.maxWave && this.wave >= rules.maxWave) {
      this.waveComplete = true;
      this.transitionTimer = 0;
      this._victory();
      return;
    }

    this.music.updateIntensity(this.wave, false);
  }

  /** Current selected ship def (from save, defaults vanguard) */
  selectedShip() {
    const id = this.save.get('selectedShip', 'vanguard');
    return SHIPS[id] || SHIPS.vanguard;
  }

  startGame(modeId) {
    this.mode = modeId ? initialModeState(modeId) : initialModeState(this.pendingMode || 'classic');
    const rules = this.mode.rules;
    this.score = 0;
    this.xp = 0;
    this.xpToNext = 20;
    this.level = 0;
    this.wave = 0;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.enemiesThisWave = 0;
    this.enemiesSpawnedThisWave = 0;
    this.waveComplete = false;
    this.transitionTimer = 0;
    this.coreDropBonus = 0;
    this._tier2Unlocked = false;
    this._plasmaChainActive = false;
    this._gravityWellActive = false;
    this._solarFlareActive = false;
    this._magnetBonus = 1;
    this._burstPending = [];
    this._upgradeTimer = 0;
    this.sector = getSector(0);
    this.sectorBannerTimer = 0;
    this.stats.enemiesKilled = 0;
    this.stats.totalDamageTaken = 0;
    this.stats.timeSurvived = 0;
    this.stats.bossesKilled = 0;
    this.stats.scrap = 0;
    this.stats.cores = 0;
    this.stats.upgrades = [];
    this.announcements = [];
    this._resetJuice();

    // Mode-scoped overrides
    this.spawnInterval = rules.spawnInterval ?? CONFIG.SPAWN_INTERVAL;
    this.enemiesThisWave = rules.enemiesPerWave ?? CONFIG.ENEMIES_PER_WAVE;

    this.player.reset(this.metaProgression, this.selectedShip());
    this.enemies.pool.releaseAll();
    this.bullets.playerBullets.releaseAll();
    this.bullets.enemyBullets.releaseAll();
    this.particles.clear();
    this.scrap.pool.releaseAll();

    this.state = 'playing';
    this.timeScale = 1;
    this.music.transition('playing');
    this.sfx.play('click');
  }

  _gameOver() {
    this.state = 'gameover';
    this.music.transition('menu');
    this.sfx.play('gameOver');
    this.screenShake = 12;
    this.screenFlash = 0.5;
    this.chromaticIntensity = 8;
    this.particles.bossExplosion(this.player.x, this.player.y);
    this.gameOverUI.show();
    this._saveHighScore();
    this.save.save();
  }

  /** Record per-mode high score if beaten */
  _saveHighScore() {
    if (!this.mode) return;
    const key = 'hs_' + this.mode.id;
    const prev = this.save.get(key, 0) || 0;
    if (this.score > prev) this.save.set(key, this.score);
  }

  _victory() {
    this.state = 'gameover';
    this.music.transition('menu');
    this.sfx.play('gameOver');
    this.screenFlash = 0.4;
    this.gameOverUI.show(true); // victory flag
    this._saveHighScore();
    this.save.save();
  }

  _resetJuice() {
    this.screenShake = 0;
    this.chromaticIntensity = 0;
    this.screenFlash = 0;
    this.damageFlash = 0;
    this.hitPauseRemaining = 0;
  }

  // ─── Utility hooks (called by Enemy.js) ───

  spawnMine(x, y) {
    const b = this.bullets.enemyBullets.acquire();
    if (!b) return;
    b.x = x; b.y = y;
    b.vx = 0; b.vy = 0;
    b.damage = CONFIG.BOSS_DAMAGE || 1;
    b.radius = 7;
    b.isEnemy = true;
    b.color = '#88ff44';
    b.isMine = true;
    b.mineTimer = 4;
    this.particles.emit(x, y, 6, {
      speed: 40, color: '#88ff44', size: 3, life: 0.3
    });
  }

  _updateMines(dt) {
    this.bullets.enemyBullets.updateAll(dt, (b) => {
      if (!b.isMine) return;
      b.mineTimer -= dt;
      if (b.mineTimer <= 0) {
        this.particles.emit(b.x, b.y, 8, {
          speed: 60, color: '#88ff44', size: 3, life: 0.3
        });
        this.bullets.enemyBullets.release(b);
      }
    });
  }

  _triggerSolarFlare() {
    // Vaporize all non-boss enemies + bullets on screen
    for (const e of this.enemies.pool.active) {
      if (!e.alive || e.isBoss) continue;
      this.enemies.damageEnemy(e, 999, this);
      this._onEnemyKilled(e);
    }
    this.bullets.enemyBullets.releaseAll();
    this.sfx.play('explosion');
    this.screenFlash = 0.3;
    this.screenShake = 6;
    this.chromaticIntensity = 6;
  }

  _applyGravityWell(dt) {
    if (!this._gravityWellActive || !this.player.alive) return;
    const R = 130;
    for (const e of this.enemies.pool.active) {
      if (!e.alive || e.isBoss) continue;
      const d = dist(e, this.player);
      if (d < R && d > 1) {
        const pull = (1 - d / R) * 120 * dt;
        e.x += (this.player.x - e.x) / d * pull;
        e.y += (this.player.y - e.y) / d * pull;
      }
    }
    for (const s of this.scrap.pool.active) {
      if (!s.alive) continue;
      const d = dist(s, this.player);
      if (d < R && d > 1) {
        const pull = (1 - d / R) * 200 * dt;
        s.x += (this.player.x - s.x) / d * pull;
        s.y += (this.player.y - s.y) / d * pull;
      }
    }
  }

  _applyPlasmaChain(x, y) {
    const R = CONFIG.PLASMA_CHAIN_RANGE || 100;
    let targets = [];
    for (const e of this.enemies.pool.active) {
      if (!e.alive || e.isBoss) continue;
      const d = dist(e, { x, y });
      if (d < R) targets.push({ e, d });
    }
    targets.sort((a, b) => a.d - b.d);
    for (let i = 0; i < Math.min(3, targets.length); i++) {
      const killed = this.enemies.damageEnemy(targets[i].e, 2, this);
      if (killed) this._onEnemyKilled(targets[i].e);
    }
  }

  // ─── Render ───

  _render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const scale = this.canvas.width / CONFIG.WIDTH;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();

    let shakeX = 0, shakeY = 0;
    if ((this.state === 'playing' || this.state === 'upgrade' || this.state === 'gameover') && this.screenShake > 0.5) {
      shakeX = rand(-this.screenShake, this.screenShake);
      shakeY = rand(-this.screenShake, this.screenShake);
      ctx.translate(shakeX, shakeY);
    }

    if (this.state === 'menu' || this.state === 'modeselect' || this.state === 'meta' || this.state === 'hangar') {
      this.menuScreen.render(ctx, performance.now());
      if (this.state === 'modeselect') {
        this.modeSelect.render(ctx);
      } else if (this.state === 'meta') {
        this.metaScreen.render(ctx);
      } else if (this.state === 'hangar') {
        this.hangar.render(ctx);
      }
      ctx.restore();
      return;
    }

    // Game render
    this.starField.render(ctx, this.sector);
    this.scrap.render(ctx);
    this.enemies.render(ctx);
    this.bullets.renderPlayerBullets(ctx);
    this.bullets.renderEnemyBullets(ctx);
    this.player.render(ctx, performance.now() / 1000);

    // Boss name + HP bar (top of screen)
    if (this.enemies.bossActive) {
      const boss = this.enemies.pool.active.find(e => e.isBoss && e.alive !== false);
      if (boss) {
        const bw = 360, bx = (CONFIG.WIDTH - bw) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = boss.color;
        ctx.shadowColor = boss.color;
        ctx.shadowBlur = 12;
        ctx.fillText(boss.bossName || 'BOSS', CONFIG.WIDTH / 2, 38);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx, 48, bw, 10);
        ctx.fillStyle = boss.color;
        ctx.fillRect(bx, 48, bw * Math.max(0, boss.hp / boss.maxHp), 10);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, 48, bw, 10);
        ctx.restore();
      }
    }

    // Laser beam render
    if (this.player.alive && this.player.laserActive) {
      this._renderLaser(ctx);
    }

    this.particles.render(ctx);

    // Touch indicator
    if (this.state === 'playing' && this.input.isTouching()) {
      const p = this.input.getPos();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y - (CONFIG.UPWARD_OFFSET || 60), 16 + Math.sin(performance.now() * 0.005) * 3, 0, Math.PI * 2);
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

    // Sector transition banner ("— CRIMSON TIDE —")
    if (this.sectorBannerTimer > 0) {
      const t = this.sectorBannerTimer;
      const alpha = Math.min(1, t / 0.6) * 0.9;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillStyle = this.sector.accent;
      ctx.shadowColor = this.sector.accent;
      ctx.shadowBlur = 24;
      ctx.font = 'bold 26px monospace';
      ctx.fillText(`— ${this.sector.name} —`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.18);
      ctx.shadowBlur = 0;
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('SECTOR BOUNDARY', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.18 + 20);
      ctx.restore();
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

    // HUD
    this.hud.render();

    // Upgrade overlay
    if (this.state === 'upgrade') {
      this.upgradeUI.render(ctx);
    }
    for (const a of this.announcements) {
      const scaleA = a.timer > 1.5 ? 1 + (2 - a.timer) * 0.5 : 1;
      ctx.save();
      ctx.translate(CONFIG.WIDTH / 2, a.y);
      ctx.scale(scaleA, scaleA);
      ctx.globalAlpha = Math.min(1, a.timer);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffdd44';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 20;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(a.text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Game over overlay
    if (this.state === 'gameover') {
      this.gameOverUI.render(ctx);
    }

    ctx.restore();
  }

  _renderHUD(ctx) {
    const p = this.player;

    // HP bar top-left
    const barW = 120, barH = 8;
    const bx = 12, by = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#44ff88' : hpRatio > 0.25 ? '#ffaa44' : '#ff4466';
    ctx.fillRect(bx, by, barW * hpRatio, barH);
    if (p.shield > 0) {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
      ctx.fillRect(bx, by + barH + 2, barW * (p.shield / Math.max(1, p.maxShield)), 3);
    }

    // Wave + score
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(220, 240, 255, 0.9)';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`WAVE ${this.wave}`, CONFIG.WIDTH - 12, 20);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px monospace';
    ctx.fillText(`SCORE ${this.score}`, CONFIG.WIDTH - 12, 34);

    // Scrap counter
    ctx.textAlign = 'left';
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`★ ${this.stats.scrap}`, bx, by + barH + 18);

    // Cores
    ctx.fillStyle = '#ff88ff';
    ctx.fillText(`◆ ${this.stats.cores}`, bx + 60, by + barH + 18);

    // XP bar
    const xpW = 100;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx - 1, by + barH + 24, xpW + 2, 5);
    ctx.fillStyle = '#88ccff';
    ctx.fillRect(bx, by + barH + 25, xpW * Math.min(1, this.xp / this.xpToNext), 3);

    // FPS debug
    if (this._fps > 0) {
      ctx.fillStyle = this._fps >= 50 ? 'rgba(68, 255, 136, 0.8)' : this._fps >= 30 ? 'rgba(255, 170, 68, 0.8)' : 'rgba(255, 68, 102, 0.8)';
      ctx.font = '10px monospace';
      ctx.fillText(`${this._fps} FPS`, bx, by + barH + 36);
    }

    // Mute indicator top-right
    ctx.textAlign = 'right';
    const isMuted = !this.audio._enabled;
    ctx.fillStyle = isMuted ? 'rgba(85,85,119,0.7)' : 'rgba(170,170,204,0.7)';
    ctx.font = '14px monospace';
    ctx.fillText(isMuted ? '🔇' : '🔊', CONFIG.WIDTH - 8, 18);
    ctx.textAlign = 'left';
  }

  _renderLaser(ctx) {
    const p = this.player;
    const beamLength = 500;
    const peakGlow = 0.6 + 0.4 * Math.sin(performance.now() * 0.02);

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

    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = `rgba(255, 80, 80, ${peakGlow * 0.9})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.radius);
    ctx.lineTo(p.x, p.y - p.radius - beamLength);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.strokeStyle = `rgba(255, 220, 180, ${peakGlow})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.radius);
    ctx.lineTo(p.x, p.y - p.radius - beamLength);
    ctx.stroke();
    ctx.restore();
  }

  _renderGameOver(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 34px monospace';
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.35);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`Score: ${this.score}`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.45);
    ctx.fillText(`Wave: ${this.wave}  Kills: ${this.stats.enemiesKilled}`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px monospace';
    ctx.fillText('TAP TO RESTART', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.62);
    ctx.fillStyle = '#ff88ff';
    ctx.font = '10px monospace';
    ctx.fillText('◈ UPGRADES ◈', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.88);
  }
}

export default Game;
