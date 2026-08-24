// Touch + mouse + keyboard input with relative offset
// v2: ES module; ports v1 Input, adds WASD/arrows for desktop.

import { CONFIG } from './config.js';

class Input {
  constructor(canvas, onInteraction) {
    this.canvas = canvas;
    this.onInteraction = onInteraction || (() => {});
    this.touchX = CONFIG.WIDTH / 2;
    this.touchY = CONFIG.HEIGHT * 0.7;
    this.touching = false;
    this.justTapped = false;
    this.hasMouse = false;
    this.activeTouchId = null;
    // Hover tracking (menu buttons)
    this.mouseX = CONFIG.WIDTH / 2;
    this.mouseY = 0;
    this.mouseInCanvas = false;
    // Keyboard state
    this.keys = new Set();
    this.spaceHeld = false;

    canvas.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', e => this._onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', e => this._onTouchEnd(e), { passive: false });

    canvas.addEventListener('mousedown', e => this._onMouseDown(e));
    canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    canvas.addEventListener('mouseup', e => this._onMouseUp(e));
    canvas.addEventListener('mouseleave', () => { if (this.hasMouse) { this.hasMouse = false; this.touching = false; this.mouseInCanvas = false; } });

    // Keyboard (desktop convenience)
    window.addEventListener('keydown', e => this._onKeyDown(e));
    window.addEventListener('keyup', e => this._onKeyUp(e));
  }

  _clientPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    // CSS fraction → buffer pixel → CONFIG logical space.
    // Buffer is scaled to CONFIG by bufW/CONFIG.WIDTH, so reverse it.
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    return {
      x: fx * CONFIG.WIDTH,
      y: fy * CONFIG.HEIGHT,
    };
  }

  _onTouchStart(e) {
    e.preventDefault();
    this.onInteraction();
    const t = e.changedTouches[0];
    this.activeTouchId = t.identifier;
    const pos = this._clientPos(t);
    this.touchX = pos.x; this.touchY = pos.y;
    this.touching = true;
    this.justTapped = true;
  }

  _onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this.activeTouchId) {
        const pos = this._clientPos(t);
        this.touchX = pos.x; this.touchY = pos.y;
        this.touching = true;
      }
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this.activeTouchId) {
        this.activeTouchId = null;
        this.touching = false;
      }
    }
  }

  _onMouseDown(e) {
    this.onInteraction();
    const pos = this._clientPos(e);
    this.touchX = pos.x; this.touchY = pos.y;
    this.hasMouse = true;
    this.touching = true;
    this.justTapped = true;
  }

  _onMouseMove(e) {
    if (!this.hasMouse) this.hasMouse = true;
    const pos = this._clientPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.mouseInCanvas = true;
    if (this.touching) {
      this.touchX = pos.x; this.touchY = pos.y;
    }
  }

  _onMouseUp() { this.touching = false; }

  _onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys[e.code] = true;
    if (e.code === 'Space') this.spaceHeld = true;
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
    if (e.code === 'Space') this.spaceHeld = false;
  }

  /** Apply keyboard steering to player position (desktop only). Mutates target. */
  applyKeyboard(player, dt) {
    let dx = 0, dy = 0;
    if (this.keys.ArrowLeft || this.keys.KeyA) dx -= 1;
    if (this.keys.ArrowRight || this.keys.KeyD) dx += 1;
    if (this.keys.ArrowUp || this.keys.KeyW) dy -= 1;
    if (this.keys.ArrowDown || this.keys.KeyS) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * player.moveSpeed * dt;
      player.y += (dy / len) * player.moveSpeed * dt;
      player.x = Math.max(player.radius, Math.min(CONFIG.WIDTH - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(CONFIG.HEIGHT - player.radius, player.y));
    }
  }

  getPos() {
    return { x: this.touchX, y: this.touchY };
  }

  isTouching() { return this.touching; }

  postFrame() {
    this.justTapped = false;
  }
}

export { Input };