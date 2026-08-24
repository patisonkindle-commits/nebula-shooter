// v2 Hangar — ship select screen (Task 4.1)
// Menu button → state 'hangar' → buy/unlock ships with cores → select for next game

import { SHIPS } from '../entities/ships.js';

class Hangar {
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.hoveredIndex = -1;
    this.hoveredRect = null;
  }

  show() { this.visible = true; }
  hide() { this.visible = false; }

  updateHover(mx, my) { this.getHoverRect(mx, my); }

  /** Returns all unlocked ship ids (including currently selected) */
  getUnlocked() {
    const saves = this.game.save.get('shipUnlocks', {});
    return Object.keys(SHIPS).filter(id => saves[id] === true || SHIPS[id].unlockCost === 0);
  }

  /** Is a ship unlocked + selected? */
  isUnlocked(id) {
    const saves = this.game.save.get('shipUnlocks', {});
    return saves[id] === true || SHIPS[id].unlockCost === 0;
  }

  isCurrent(id) {
    const saves = this.game.save.get('shipUnlocks', {});
    return this.game.save.get('selectedShip', null) === id && this.isUnlocked(id);
  }

  /** buy a locked ship — deducts cores, marks unlocked. Returns true if successful */
  buy(id) {
    const s = SHIPS[id];
    const cores = this.game.metaProgression.cores;
    if (!s || s.unlockCost === 0) return false;
    const saves = this.game.save.get('shipUnlocks', {});
    if (saves[id]) return true; // already bought
    if (cores < s.unlockCost) return false;
    saves[id] = true;
    this.game.save.set('shipUnlocks', saves);
    this.game.metaProgression.setCores(this.game.metaProgression.cores - s.unlockCost);
    this.select(id);
    this.game.save.save();
    return true;
  }

  /** select a ship for next game (must be unlocked) */
  select(id) {
    const saves = this.game.save.get('shipUnlocks', {});
    if (!saves[id] && SHIPS[id].unlockCost !== 0) return false;
    this.game.save.set('selectedShip', id);
    this.game.save.save();
    return true;
  }

  /** Get ship by id */
  getShip(id) { return SHIPS[id] || null; }

  /** Check if buyable (unlocked + cores ≥ cost) */
  isBuyable(id) {
    const s = SHIPS[id];
    return !this.isUnlocked(id) && this.game.metaProgression.cores >= s.unlockCost;
  }

  /** Handle menu tap — performs buy/select side effects */
  handleMenuTap(x, y) {
    // Back button (top area)
    if (y < 140) return { action: 'back' };
    const cards = [
      { id: 'vanguard',   x: 50, y: 150 },
      { id: 'interceptor', x: 210, y: 150 },
      { id: 'pulsar',     x: 50,  y: 330 },
      { id: 'juggernaut', x: 210, y: 330 },
    ];
    for (const c of cards) {
      if (x >= c.x && x <= c.x + 140 && y >= c.y && y <= c.y + 160) {
        if (this.isUnlocked(c.id)) {
          this.select(c.id);
          return { action: 'select', id: c.id };
        }
        if (this.buy(c.id)) return { action: 'buy', id: c.id };
        return { action: 'locked', id: c.id };
      }
    }
    return null;
  }

  /** Handle canvas touch (same logic, different rect mapping for mobile) */
  handleTap(x, y) {
    return this.handleMenuTap(x, y);
  }

  /** Hover rect for visual feedback */
  getHoverRect(x, y) {
    const cards = [
      { id: 'vanguard',   x: 50, y: 150 },
      { id: 'interceptor', x: 210, y: 150 },
      { id: 'pulsar',     x: 50,  y: 330 },
      { id: 'juggernaut', x: 210, y: 330 },
    ];
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (x >= c.x && x <= c.x + 140 && y >= c.y && y <= c.y + 160) {
        this.hoveredIndex = i;
        return { x: c.x, y: c.y, w: 140, h: 160 };
      }
    }
    this.hoveredIndex = -1;
    return null;
  }

  render(ctx, t) {
    this.visible = true;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur = 12;
    ctx.fillText('HANGAR', 200, 50);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#88ccff';
    ctx.font = '10px monospace';
    ctx.fillText(`CORES: ${this.game.metaProgression.cores}`, 200, 72);

    // 2x2 ship cards
    const cards = [
      { id: 'vanguard',   x: 50, y: 150 },
      { id: 'interceptor', x: 210, y: 150 },
      { id: 'pulsar',     x: 50,  y: 330 },
      { id: 'juggernaut', x: 210, y: 330 },
    ];

    cards.forEach((c, i) => {
      const s = SHIPS[c.id];
      const unlocked = this.isUnlocked(c.id);
      const selected = this.isCurrent(c.id);
      const buyable = this.isBuyable(c.id);
      const hov = this.hoveredIndex === i;

      // card bg
      ctx.fillStyle = selected ? 'rgba(34,193,255,0.2)' : (buyable ? 'rgba(255,235,59,0.15)' : 'rgba(30,40,70,0.6)');
      ctx.strokeStyle = selected ? '#22c1ff' : (buyable ? '#ffe600' : (unlocked ? '#ffffff33' : '#ffffff1a'));
      ctx.lineWidth = selected || buyable ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, 140, 160, 8);
      ctx.fill();
      ctx.stroke();

      // ship color circle
      ctx.beginPath();
      ctx.arc(c.x + 70, c.y + 45, 18, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff22';
      ctx.lineWidth = 1;
      ctx.stroke();

      // name + desc
      ctx.textAlign = 'left';
      ctx.fillStyle = unlocked ? '#fff' : '#888';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(s.name, c.x + 10, c.y + 24);
      ctx.fillStyle = unlocked ? '#ffffff99' : '#555';
      ctx.font = '9px monospace';
      ctx.fillText(s.desc, c.x + 10, c.y + 38);

      // stats
      ctx.fillStyle = unlocked ? '#ffffffcc' : '#555';
      ctx.font = '9px monospace';
      const stats = `HP:${s.hp} SPD:${s.speed} DMG:${s.damage.toFixed(1)}`;
      ctx.fillText(stats, c.x + 10, c.y + 54);
      const fpk = ((1 / s.fireRate) * 60).toFixed(0);
      ctx.fillText(`FIRE: ${fpk}/s`, c.x + 10, c.y + 66);

      // lock/unlock/buy text
      ctx.fillStyle = unlocked ? '#44ff88' : (buyable ? '#ffe600' : '#ff4466');
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      if (selected) {
        ctx.fillText('EQUIPPED', c.x + 70, c.y + 145);
      } else if (buyable) {
        ctx.fillText(`BUY ${s.unlockCost}`, c.x + 70, c.y + 145);
      } else if (unlocked) {
        ctx.fillText('SELECT', c.x + 70, c.y + 145);
      } else {
        ctx.fillText(`🔒 ${s.unlockCost}`, c.x + 70, c.y + 145);
      }
      ctx.textAlign = 'left';

      if (hov) {
        ctx.strokeStyle = '#ffffff66';
        ctx.lineWidth = 1;
        ctx.strokeRect(c.x - 1, c.y - 1, 142, 162);
      }
    });

    // back / close prompt
    ctx.fillStyle = '#ffffff44';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TAP TOP TO CLOSE', 200, 17);
  }
}

export { Hangar };