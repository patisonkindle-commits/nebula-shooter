// v2 ModeSelectScreen — pick game mode before run; honors unlock flags
import { CONFIG } from '../core/config.js';
import { MODES } from '../core/modes.js';

class ModeSelectScreen {
  constructor(game) {
    this.game = game;
    this.hoveredIndex = -1;
    this.buttonRects = [];
  }

  _calcRects() {
    const ids = Object.keys(MODES);
    const n = ids.length;
    const spacing = 64;
    const startY = CONFIG.HEIGHT * 0.35;
    this.buttonRects = ids.map((id, i) => ({
      id,
      x: CONFIG.WIDTH * 0.25,
      y: startY + i * spacing,
      w: CONFIG.WIDTH * 0.5,
      h: 54,
    }));
    // Back button (drawn separately, hit zone appended)
    this.buttonRects.push({
      id: '__back',
      x: CONFIG.WIDTH / 2 - 60,
      y: CONFIG.HEIGHT * 0.78,
      w: 120,
      h: 34,
    });
  }

  _isUnlocked(id) {
    const t = MODES[id].unlockThreshold;
    if (!t) return true;
    return !!this.game.save.get('unlocked_' + t.flag, false);
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

  /** Returns {action:'start'|'back', id} or null */
  handleTap(idx) {
    if (idx < 0 || idx >= this.buttonRects.length) return null;
    const r = this.buttonRects[idx];
    // Back button if rendered (index n)
    if (r.id === '__back') return { action: 'back' };
    if (!this._isUnlocked(r.id)) { this.game.sfx.play('hit'); return null; }
    this.game.sfx.play('click');
    return { action: 'start', id: r.id };
  }

  render(ctx) {
    this._calcRects();
    ctx.textAlign = 'center';

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.shadowColor = '#44ff88';
    ctx.shadowBlur = 24;
    ctx.fillText('SELECT MODE', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.16);
    ctx.shadowBlur = 0;

    const hs = (id) => this.game.save.get('hs_' + id, 0);

    this.buttonRects.forEach((r, i) => {
      const backBtn = r.id === '__back';
      const mode = backBtn ? null : MODES[r.id];
      const unlocked = backBtn || this._isUnlocked(r.id);
      const hover = i === this.hoveredIndex && unlocked;
      ctx.fillStyle = hover ? '#44ff8822' : 'rgba(11,16,32,0.85)';
      ctx.strokeStyle = unlocked ? (hover ? '#44ff88' : '#44ff8844') : '#66666666';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 8);
      ctx.fill(); ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = unlocked ? '#eee' : '#888';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(unlocked ? (mode ? mode.name : '') : '🔒 ' + (mode ? mode.name : ''), r.x + 14, r.y + 22);
      ctx.font = '9px monospace';
      ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)';
      // desc → single-line hint (first line)
      const hint = mode ? mode.desc.split('\n')[0] : '';
      ctx.fillText(hint, r.x + 14, r.y + 38);
      ctx.textAlign = 'right';
      const high = hs(r.id);
      ctx.fillStyle = high > 0 ? '#ffdd44' : '#ffffff44';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(high > 0 ? `HI ${high}` : '—', r.x + r.w - 14, r.y + 22);
      // lock row — second hint line if locked
      if (!unlocked && mode) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ff8844';
        ctx.font = '9px monospace';
        ctx.fillText(MODES[r.id].desc.split('\n').pop() || '', r.x + 14, r.y + 48);
      }
      ctx.textAlign = 'center';
    });

    // Back button
    const back = this.buttonRects[this.buttonRects.length - 1];
    ctx.fillStyle = this.hoveredIndex === this.buttonRects.length - 1 ? '#ff888833' : 'rgba(11,16,32,0.8)';
    ctx.strokeStyle = '#ff888855';
    ctx.beginPath();
    ctx.roundRect(back.x, back.y, back.w, back.h, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8888';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('← BACK', CONFIG.WIDTH / 2, back.y + 22);
    ctx.textAlign = 'left';
  }
}

export { ModeSelectScreen };