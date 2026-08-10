// v2 MetaScreen — upgrade tree, buy nodes, spend cores
import { CONFIG } from '../core/config.js';

class MetaScreen {
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.scrollY = 0;
    this.nodeButtons = [];
  }

  show() {
    this.visible = true;
    this._calcButtons();
  }

  hide() {
    this.visible = false;
  }

  _calcButtons() {
    this.nodeButtons = [];
    const node = this.game.metaProgression;
    node.nodes.forEach((n, i) => {
      const y = 80 + i * 130 + this.scrollY;
      this.nodeButtons.push({
        x: 20, y, w: CONFIG.WIDTH - 40, h: 110,
        id: n.id, name: n.name, level: n.level, maxLevel: n.maxLevel,
        cost: n.coreCost[n.level], icon: n.icon,
      });
    });
  }

  render(ctx) {
    if (!this.visible) return;
    const node = this.game.metaProgression;
    ctx.fillStyle = 'rgba(5,5,16,0.95)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px monospace';
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur = 20;
    ctx.fillText('UPGRADE TREE', CONFIG.WIDTH / 2, 50);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff88ff';
    ctx.font = '16px monospace';
    ctx.fillText(`Cores: ${node.cores}`, CONFIG.WIDTH / 2, 80);

    this.nodeButtons.forEach((btn, i) => {
      ctx.fillStyle = btn.level < btn.maxLevel ? 'rgba(11,16,32,0.9)' : 'rgba(170,170,170,0.2)';
      ctx.strokeStyle = btn.level < btn.maxLevel ? '#88ccff' : '#555';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`${btn.icon} ${btn.name}`, btn.x + 20, btn.y + 30);
      ctx.fillStyle = btn.level < btn.maxLevel ? '#44ff88' : '#888';
      ctx.font = '12px monospace';
      ctx.fillText(`Lvl ${btn.level} / ${btn.maxLevel}`, btn.x + 20, btn.y + 55);
      if (btn.level < btn.maxLevel) {
        ctx.fillStyle = '#ff88ff';
        ctx.fillText(`Cost: ${btn.cost} cores`, btn.x + 20, btn.y + 75);
        ctx.fillStyle = btn.cost <= node.cores ? '#44ff88' : '#ff4444';
        ctx.fillText(btn.cost <= node.cores ? 'TAP TO BUY' : 'NOT ENOUGH CORES', btn.x + btn.w - btn.cost.toString().length * 8 - 40, btn.y + 75);
      } else {
        ctx.fillStyle = '#888';
        ctx.fillText('MAX', btn.x + btn.w / 2, btn.y + 90);
      }
    });

    // Back button
    ctx.fillStyle = '#ff8888';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('← BACK', 40, CONFIG.HEIGHT - 30);

    ctx.textAlign = 'left';
  }

  handleTap(x, y) {
    if (!this.visible) return;
    // Back
    if (x < 80 && y > CONFIG.HEIGHT - 50) {
      this.hide();
      this.game.state = 'menu';
      return;
    }
    const node = this.game.metaProgression;
    this.nodeButtons.forEach(btn => {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (btn.level < btn.maxLevel && btn.cost <= node.cores) {
          const n = node.getNode(btn.id);
          node.buy(n);
          this._calcButtons();
        }
      }
    });
  }
}

export { MetaScreen };
