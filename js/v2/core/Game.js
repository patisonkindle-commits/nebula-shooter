// Project Nebula v2 — Main game orchestrator
// Owns state machine, fixed-timestep loop, render pipeline.
// Phase 0: menu renders starfield + title; gameplay wiring lands in Phase 3.

import { CONFIG } from './config.js';
import { rand } from './utils.js';
import { GameLoop } from './GameLoop.js';
import { Input } from './Input.js';
import { StarField } from '../render/StarField.js';
import { MenuScreen } from '../ui/Menu.js';

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
    this.starField = new StarField();
    this.menuScreen = new MenuScreen();
    this.audio = null; // AudioManager v2 lands in Phase 2

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

    // Juice
    this.screenShake = 0;
    this.chromaticIntensity = 0;
    this.screenFlash = 0;
    this.damageFlash = 0;
    this.hitPauseRemaining = 0;

    // Chromatic aberration offscreen canvas (sized on first render)
    this._chromaCanvas = document.createElement('canvas');
    this._chromaCtx = this._chromaCanvas.getContext('2d');

    this._bgmStarted = false;
  }

  _getDPR() {
    return this.canvas._pixelScale || 1;
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
    this.screenShake = 0;
    this.chromaticIntensity = 0;
    this.screenFlash = 0;
    this.damageFlash = 0;
    this.hitPauseRemaining = 0;
    this.loop.timeScale = 1;
    this.loop.hitPauseRemaining = 0;
  }

  // ─── Update ───

  _update(dt) {
    switch (this.state) {
      case 'menu':
        this.starField.update(dt);
        if (!this._bgmStarted && this.input.isTouching()) {
          this._bgmStarted = true;
        }
        this.menuScreen.handleTap(this, this.input);
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
    this.starField.update(dt);
    this._decayJuice(dt);
    this._decayJuice = this._decayJuice; // noop guard — real decay in Phase 3

    // Phase 3: player/enemies/bullets/scrap/particles/waves update here.

    // Player movement: pointer drag (Phase 3) + keyboard fallback (already available)
    if (this.input) this.input.applyKeyboard(this._dummyPlayer(), dt);
  }

  _dummyPlayer() {
    // Placeholder player object so keyboard movement works pre-Phase-3.
    if (!this._dp) {
      this._dp = { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT * 0.7, radius: CONFIG.PLAYER_RADIUS, moveSpeed: CONFIG.PLAYER_SPEED };
    }
    return this._dp;
  }

  _decayJuice(dt) {
    this.screenShake *= Math.pow(CONFIG.SCREEN_SHAKE_DECAY, dt * 60);
    if (this.screenShake < 0.5) this.screenShake = 0;
    this.chromaticIntensity *= Math.pow(CONFIG.CHROMATIC_DECAY, dt * 60);
    if (this.chromaticIntensity < 0.5) this.chromaticIntensity = 0;
    this.screenFlash *= Math.pow(CONFIG.FLASH_DECAY, dt * 60);
    if (this.screenFlash < 0.01) this.screenFlash = 0;
    this.damageFlash *= 0.92;
    if (this.damageFlash < 0.01) this.damageFlash = 0;
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

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if ((this.state === 'playing' || this.state === 'gameover') && this.screenShake > 0.5) {
      const shakeScale = this.canvas._pixelScale >= 1 ? 1 : 0.5;
      shakeX = rand(-this.screenShake * shakeScale, this.screenShake * shakeScale);
      shakeY = rand(-this.screenShake * shakeScale, this.screenShake * shakeScale);
      ctx.translate(shakeX, shakeY);
    }

    if (this.state === 'menu' || this.state === 'meta') {
      if (this.state === 'menu') {
        this.menuScreen.render(ctx, null);
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

    // Game render path (Phase 1 fills nebula layers, entities, HUD)
    this.starField.render(ctx);

    // Placeholder player ship
    const p = this._dummyPlayer();
    if (this.state === 'playing') {
      ctx.save();
      ctx.fillStyle = '#4a9eff';
      ctx.shadowColor = '#4a9eff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Screen flash
    if (this.screenFlash > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlash})`;
      ctx.fillRect(-10, -10, CONFIG.WIDTH + 20, CONFIG.HEIGHT + 20);
    }

    ctx.restore();

    // Chromatic aberration
    if (this.chromaticIntensity > 0.5) {
      this._applyChromatic(ctx, shakeX, shakeY);
    }
  }

  _applyChromatic(ctx, shakeX, shakeY) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scale = cw / CONFIG.WIDTH;
    const off = 1.5 * this.chromaticIntensity * scale;

    if (this._chromaCanvas.width !== cw) {
      this._chromaCanvas.width = cw;
      this._chromaCanvas.height = ch;
      this._chromaCtx.imageSmoothingEnabled = false;
    }
    const cctx = this._chromaCtx;
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.clearRect(0, 0, cw, ch);
    cctx.drawImage(this.canvas, 0, 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(this.canvas, -off, 0);
    ctx.drawImage(this.canvas, off, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this._chromaCanvas, 0, 0);
  }

  // ─── FPS accessor (HUD debug) ───
  getFPS() { return this.loop.fps; }
}

export default Game;