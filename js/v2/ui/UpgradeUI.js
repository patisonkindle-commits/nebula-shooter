// v2 UpgradeUI — 3 random upgrade choices, tap to pick
import { CONFIG } from '../core/config.js';

const UPGRADE_POOL = [
  { id: 'damage', label: '+20% Damage', desc: 'Damage up', icon: '⚔️' },
  { id: 'fireRate', label: '+15% Fire Rate', desc: 'Shoot faster', icon: '🔥' },
  { id: 'projectiles', label: '+1 Projectile', desc: 'More projectiles', icon: '🎯' },
  { id: 'speed', label: '+10% Speed', desc: 'Move faster', icon: '💨' },
  { id: 'hull', label: '+1 Hull', desc: 'More HP', icon: '🛡️' },
  { id: 'special', label: 'Special Unlock', desc: 'Unlock ability', icon: '✨' },
  { id: 'weapon_seeker', label: 'Seeker Missile', desc: 'Homing + AoE', icon: '🎯' },
  { id: 'weapon_plasma', label: 'Plasma Cannon', desc: 'Heavy pierce', icon: '☄️' },
  { id: 'weapon_tesla', label: 'Tesla Arc', desc: 'Chain lightning', icon: '⚡' },
  { id: 'weapon_lance', label: 'Photon Lance', desc: 'Fast beam', icon: '🔫' },
];

class UpgradeUI {
  constructor(game) {
    this.game = game;
    this.choices = [];
    this.selected = -1;
    this.visible = false;
  }

  show() {
    this.choices = [];
    for (let i = 0; i < 3; i++) {
      this.choices.push(UPGRADE_POOL[Math.floor(Math.random() * UPGRADE_POOL.length)]);
    }
    this.visible = true;
    this.selected = -1;
  }

  hide() {
    this.visible = false;
  }

  apply(idx) {
    if (idx < 0 || idx >= this.choices.length) return;
    const upgrade = this.choices[idx];
    this.game.player.applyUpgrade(upgrade.id);
    this.game.stats.upgrades.push(upgrade.id);
    this.hide();
  }

  render(ctx) {
    if (!this.visible) return;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.shadowColor = '#44ff88';
    ctx.shadowBlur = 20;
    ctx.fillText('CHOOSE UPGRADE', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.15);
    ctx.shadowBlur = 0;

    const cardW = CONFIG.WIDTH * 0.3;
    const cardH = CONFIG.HEIGHT * 0.4;
    const startX = (CONFIG.WIDTH - cardW * 3) / 2;
    const startY = CONFIG.HEIGHT * 0.3;

    this.choices.forEach((c, i) => {
      const x = startX + i * (cardW + 20);
      const y = startY;
      ctx.fillStyle = i === this.selected ? 'rgba(68,255,136,0.15)' : 'rgba(11,16,32,0.9)';
      ctx.strokeStyle = i === this.selected ? '#44ff88' : '#ffffff22';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(c.icon, x + cardW / 2, y + 30);
      ctx.fillStyle = '#88ccff';
      ctx.font = '12px monospace';
      ctx.fillText(c.label, x + cardW / 2, y + 55);
      ctx.fillStyle = '#ffffffaa';
      ctx.font = '10px monospace';
      ctx.fillText(c.desc, x + cardW / 2, y + 75);
    });

    ctx.textAlign = 'left';
  }

  handleTap(x, y) {
    if (!this.visible) return false;
    const cardW = CONFIG.WIDTH * 0.3;
    const cardH = CONFIG.HEIGHT * 0.4;
    const startX = (CONFIG.WIDTH - cardW * 3) / 2;
    const startY = CONFIG.HEIGHT * 0.3;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + 20);
      if (x >= cx && x <= cx + cardW && y >= startY && y <= startY + cardH) {
        this.selected = i;
        this.apply(i);
        return true;
      }
    }
    return false;
  }
}

export { UpgradeUI };
