// v2 GameOverUI — final stats, restart, meta
import { CONFIG } from '../core/config.js';

class GameOverUI {
  constructor(game) {
    this.game = game;
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  render(ctx) {
    if (!this.visible) return;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4466';
    ctx.font = 'bold 36px monospace';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 30;
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.3);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    ctx.fillText(`Score: ${this.game.score}`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.42);
    ctx.fillStyle = '#88ccff';
    ctx.font = '16px monospace';
    ctx.fillText(`Wave: ${this.game.wave}  Kills: ${this.game.stats.enemiesKilled}`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.48);
    ctx.fillStyle = '#ff88ff';
    ctx.font = '14px monospace';
    ctx.fillText('Tap to Restart', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.62);
    ctx.fillStyle = '#ffffffaa';
    ctx.font = '12px monospace';
    ctx.fillText('◈ UPGRADES ◈', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.88);
    ctx.textAlign = 'left';
  }

  handleTap(x, y) {
    if (!this.visible) return;
    if (y > CONFIG.HEIGHT * 0.85) {
      // Go to meta
      this.game.state = 'meta';
      this.game.metaScreen.show();
      this.hide();
      return;
    }
    // Restart
    this.game.startGame();
    this.hide();
  }
}

export { GameOverUI };
