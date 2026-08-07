// v2 MenuScreen — main menu buttons, hover, tap
import { CONFIG } from '../core/config.js';

class MenuScreen {
  constructor() {
    this.buttons = [
      { id: 'start', label: 'PLAY', color: '#44ff88' },
      { id: 'upgrades', label: 'UPGRADES', color: '#88ccff' },
      { id: 'hangar', label: 'SHIPS', color: '#ff8888' },
    ];
    this.hoveredIndex = -1;
    this.buttonRects = [];
  }

  // Button hit zones: centered horizontally, stacked vertically
  _calcRects() {
    this.buttonRects = this.buttons.map((b, i) => {
      const spacing = 54;
      const startY = CONFIG.HEIGHT * 0.55;
      return {
        x: CONFIG.WIDTH * 0.2,
        y: startY + i * spacing,
        w: CONFIG.WIDTH * 0.6,
        h: 44,
      };
    });
  }

  updateHover(mx, my) {
    this._calcRects();
    this.hoveredIndex = this.buttonIndexAt(mx, my);
  }

  buttonIndexAt(mx, my) {
    this._calcRects();
    for (let i = 0; i < this.buttonRects.length; i++) {
      const r = this.buttonRects[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
    }
    return -1;
  }

  /** Game calls getHoveredButton(x, y) → returns index or -1 */
  getHoveredButton(x, y) {
    return this.buttonIndexAt(x, y);
  }

  /** Game calls handleTap(index, game) → returns action string */
  handleTap(idx, game) {
    if (idx < 0 || idx >= this.buttons.length) return null;
    return this.buttons[idx].id;
  }

  render(ctx) {
    this._calcRects();
    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px monospace';
    ctx.shadowColor = '#44ff88';
    ctx.shadowBlur = 30;
    ctx.fillText('NEBULA', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.28);
    ctx.shadowBlur = 0;
    ctx.font = '15px monospace';
    ctx.fillStyle = '#88ccff';
    ctx.fillText('SPACE SHOOTER', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.28 + 34);

    // Buttons
    this.buttons.forEach((b, i) => {
      const r = this.buttonRects[i];
      ctx.fillStyle = i === this.hoveredIndex ? b.color + '33' : 'rgba(11,16,32,0.8)';
      ctx.strokeStyle = i === this.hoveredIndex ? b.color : '#ffffff22';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = i === this.hoveredIndex ? b.color : '#ffffffaa';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(b.label, r.x + r.w / 2, r.y + r.h / 2 + 6);
    });

    ctx.textAlign = 'left';
  }
}

export { MenuScreen };