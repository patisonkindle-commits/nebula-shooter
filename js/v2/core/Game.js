// Project Nebula v2 — Main game orchestrator
// Owns state machine, fixed-timestep loop, render pipeline.
// Phase 0: menu renders starfield + title; gameplay wiring lands in Phase 3.

import { CONFIG } from './config.js';
import { GameLoop } from './GameLoop.js';
import { Input } from './Input.js';
import { Compositor } from '../render/Compositor.js';
import { BloomPass } from '../render/BloomPass.js';
import { ScreenFX } from '../render/ScreenFX.js';
import { MenuScreen } from '../ui/Menu.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../entities/Enemy.js';

class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = 'menu';
    this.running = true;

    // Loop
    this.loop = new GameLoop();

    // Systems (Phase 3 wires full entity stack; menu needs these now)
    this.input = null;
    this.compositor = new Compositor();
    this.bloom = new BloomPass();
    this.menuScreen = new MenuScreen();
    this.audio = null; // AudioManager v2 lands in Phase 2

    // Entities (Phase 3 wires full update; render wired now for Task 1.2)
    this.player = new Player();
    this.enemies = new EnemyManager();

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
    this.score = 0;
    this.wave = 0;
    this.level = 0;

    // Juice — ScreenFX module owns decay, shockwaves, chroma, flash, hit-pause
    this.effects = new ScreenFX();

    // Chromatic aberration offscreen canvas (sized on first render)
    this._chromaCanvas = document.createElement('canvas');
    this._chromaCtx = this._chromaCanvas.getContext('2d');

    this._bgmStarted = false;
  }

  _getDPR() {
    return this.canvas._pixelScale || 1;
  }

  /** Menu render needs a time source — performance.now() is injected by loop. */
  _now() {
    return performance.now();
  }

  /** Convert a menu button index to its scene-space rect (matches Menu.js layout). */
  _buttonRect(i) {
    const cx = CONFIG.WIDTH / 2;
    const startY = CONFIG.HEIGHT * 0.62;
    return { x: cx - 110, y: startY + i * 48, w: 220, h: 48 };
  }

  init() {
    this.input = new Input(this.canvas, () => this._onInteraction());
    this.loop.start(dt => this._update(dt), () => this._render());
  }

  _onInteraction() {
    // AudioContext resume hook — AudioManager v2 wires here in Phase 2.
  }

  // ─── State transitions ───

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.wave = 0;
    this.level = 0;
    this.stats = {
      enemiesKilled: 0, totalDamageTaken: 0, timeSurvived: 0,
      bossesKilled: 0, scrap: 0, cores: 0, upgrades: [], restarts: 0,
    };
    this._resetJuice();
  }

  showMeta() {
    this.state = 'meta';
  }

  _resetJuice() {
    // Fresh ScreenFX clears all juice state
    this.effects.screenShake = 0;
    this.effects.chromaticIntensity = 0;
    this.effects.screenFlash = 0;
    this.effects.hitPauseRemaining = 0;
    this.effects.shockwaves.length = 0;
    this.loop.timeScale = 1;
    this.loop.hitPauseRemaining = 0;
  }

  // ─── Update ───

  _update(dt) {
    switch (this.state) {
      case 'menu':
        this.compositor.update(dt);
        if (!this._bgmStarted && this.input.isTouching()) {
          this._bgmStarted = true;
        }
        // Menu button interaction: tap START → play, UPGRADES → meta, CREDITS → noop
        if (this.input.justTapped) {
          const idx = this.menuScreen.getHoveredButton(this.input.touchX, this.input.touchY);
          const action = this.menuScreen.handleTap(idx, this);
          if (action === 'start') this.startGame();
          else if (action === 'upgrades') this.showMeta();
          // credits: Phase 3 modal
        }
        break;

      case 'playing':
        this._updatePlaying(dt);
        break;

      case 'meta':
        // Phase 3 wires MetaScreen; for now any tap closes back to menu.
        if (this.input.justTapped) {
          this.state = 'menu';
        }
        break;

      case 'gameover':
        if (this.input.justTapped) {
          this.state = 'menu';
          this._resetJuice();
        }
        break;
    }
  }

  _updatePlaying(dt) {
    this.stats.timeSurvived += dt;
    this.compositor.update(dt);
    this._decayJuice(dt);
    this._decayJuice = this._decayJuice; // noop guard — real decay in Phase 3

    // Player movement: drag (Player.update) + keyboard fallback
    this.player.update(dt, this.input);
    if (this.input) this.input.applyKeyboard(this.player, dt);

    // Demo spawns for Task 1.2 visual verification (removed in Phase 3)
    if (!this._demoSpawned) {
      this._demoSpawned = true;
      const types = ['swarmer', 'sniper', 'tank', 'kamikaze', 'blocker', 'vortex', 'minelayer', 'warp'];
      types.forEach((t, i) => {
        const e = this.enemies.spawn(t, 50 + i * 42, 100, 1);
        if (e) {
          e.vortexAngle = i;
          e.vortexReachedPos = t === 'vortex';
          e.mineTimer = t === 'minelayer' ? 0.1 : 1;
          e.warpTeleporting = t === 'warp' ? false : false;
          if (i === 3) e.isElite = true; // one elite demo
        }
      });
    }
    this.enemies.update(dt, performance.now());
  }

  _decayJuice(dt) {
    // ScreenFX module handles decay; loop hit-pause is checked in GameLoop.
    this.effects.update(dt);
  }

  // ─── Render ───

  _render() {
    const ctx = this.ctx;
    const scale = this.canvas.width / CONFIG.WIDTH;

    // Identity → clear full buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();

    // Screen shake — delegate to ScreenFX
    if ((this.state === 'playing' || this.state === 'gameover') && this.effects.screenShake > 0.5) {
      const shakeScale = this.canvas._pixelScale >= 1 ? 1 : 0.5;
      this.effects.applyShake(ctx, shakeScale);
    }

    // Menu state: skip bloom, no camera shake
    if (this.state === 'menu' || this.state === 'meta') {
      if (this.state === 'menu') {
        const now = this._now();
        this.menuScreen.render(ctx, now);
        // Update hover state from tracked mouse
        if (this.input && this.input.mouseInCanvas) {
          this.menuScreen.updateHover(this.input.mouseX, this.input.mouseY);
          // Highlighted button — subtle indicator
          const hi = this.menuScreen.hoveredId;
          if (hi >= 0) {
            const rect = this._buttonRect(hi);
            ctx.strokeStyle = 'rgba(100, 170, 255, 0.85)';
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            ctx.fillStyle = 'rgba(200, 230, 255, 0.95)';
          }
        }
      } else {
        // Meta placeholder — dark panel + "UPGRADES" + tap to return
        ctx.fillStyle = 'rgba(5,5,16,0.92)';
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8ac4ff';
        ctx.font = 'bold 22px monospace';
        ctx.shadowColor = '#4a9eff';
        ctx.shadowBlur = 20;
        ctx.fillText('UPGRADES', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#444466';
        ctx.font = '9px monospace';
        ctx.fillText('Meta tree arrives in Phase 3', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.28);
        ctx.fillStyle = '#5577aa';
        ctx.font = '12px monospace';
        ctx.fillText('◈ TAP TO RETURN ◈', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.5);
      }

      // Mute indicator placeholder
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = '14px monospace';
      ctx.fillStyle = 'rgba(170,170,204,0.7)';
      ctx.fillText('🔊', CONFIG.WIDTH - 8, 18);
      ctx.restore();

      ctx.restore();
      return;
    }

    // Game render path — Phase 1 compositor (nebula layers + parallax stars + vignette)
    this.compositor.render(ctx);

    // Placeholder player ship
    const p = this.player;
    if (this.state === 'playing') {
      p.render(this.ctx, performance.now());
    }
    // Enemies — Task 1.2 vector silhouettes
    if (this.state === 'playing') {
      this.enemies.render(this.ctx, performance.now());
    }

    // Additive bloom pass (only during gameplay, not menu)
    if (this.bloom && this.bloom.enabled) {
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      this.bloom.capture(this.ctx, cw, ch);
      this.bloom.apply(this.ctx, cw, ch);
    }

    // Screen flash — delegate to ScreenFX
    this.effects.drawFlash(ctx);

    // Shockwave rings (boss death/revive)
    this.effects.drawShockwaves(ctx);

    // FPS debug overlay (top-left, subtle)
    ctx.save();
    ctx.fillStyle = 'rgba(74, 158, 255, 0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.loop.fps} FPS`, 4, 10);
    ctx.restore();

    ctx.restore();

    // Chromatic aberration
    if (this.effects.chromaticIntensity > 0.5) {
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      if (this._chromaCanvas.width !== cw) {
        this._chromaCanvas.width = cw;
        this._chromaCanvas.height = ch;
      }
      this.effects.drawChromatic(ctx, this._chromaCanvas, cw, ch);
    }
  }

  // ─── FPS accessor (HUD debug) ───
  getFPS() { return this.loop.fps; }
}

export default Game;