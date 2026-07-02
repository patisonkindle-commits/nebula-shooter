// Touch + mouse input with relative offset
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

    canvas.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', e => this._onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', e => this._onTouchEnd(e), { passive: false });

    canvas.addEventListener('mousedown', e => this._onMouseDown(e));
    canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    canvas.addEventListener('mouseup', e => this._onMouseUp(e));
    canvas.addEventListener('mouseleave', e => { if (this.hasMouse) { this.hasMouse = false; this.touching = false; }});
  }

  _clientPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CONFIG.WIDTH / rect.width),
      y: (e.clientY - rect.top) * (CONFIG.HEIGHT / rect.height)
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
    if (this.touching) {
      const pos = this._clientPos(e);
      this.touchX = pos.x; this.touchY = pos.y;
    }
  }

  _onMouseUp(e) {
    this.touching = false;
  }

  getPos() {
    return { x: this.touchX, y: this.touchY };
  }

  isTouching() { return this.touching; }

  postFrame() {
    this.justTapped = false;
  }
}
