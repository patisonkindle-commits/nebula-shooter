// v2 HUD — HP bar, scrap, cores, wave, FPS, mute
import { CONFIG } from '../core/config.js';

class HUD {
  constructor(canvas, ctx, game) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.game = game;
  }

  update(dt) {
    // HUD updates tied to game state
  }

  render() {
    if (this.game.state !== 'playing') return;
    const p = this.game.player;
    const ctx = this.ctx;

    // HP bar bottom-left
    const bx = 10, by = CONFIG.HEIGHT - 50, barW = 140, barH = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, by, barW, barH);
    const hpPct = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = hpPct > 0.5 ? '#44ff88' : hpPct > 0.25 ? '#ffaa22' : '#ff4444';
    ctx.fillRect(bx, by, barW * hpPct, barH);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, bx + barW - 50, by + 10);

    // Wave + score top-right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#88ccff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`WAVE ${this.game.wave}`, CONFIG.WIDTH - 10, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`SCORE ${this.game.score}`, CONFIG.WIDTH - 10, 38);

    // Mute button (top-right, small)
    ctx.fillStyle = this.game.audio._enabled ? 'rgba(68,255,136,0.8)' : 'rgba(170,170,170,0.5)';
    ctx.font = '12px monospace';
    ctx.fillText(this.game.audio._enabled ? '🔊' : '🔇', CONFIG.WIDTH - 60, 16);

    ctx.textAlign = 'left';
  }

  tapTaps(x, y) {
    // Mute handled in Game._update (top-right corner); HUD is read-only
  }
}

export { HUD };
