// Fixed-timestep game loop — single source of truth for frame stepping
// v2: pure loop engine, no game logic. Game orchestrator owns state.

class GameLoop {
  constructor() {
    this._rafId = 0;
    this._running = false;
    this._lastTime = 0;
    this._boundLoop = this._loop.bind(this);

    // Tunables — exposed so Game can tweak (hit-pause, slow-mo).
    this.dtMax = 0.05;
    this.timeScale = 1;
    this.hitPauseRemaining = 0;

    this.onUpdate = null; // fn(dt)
    this.onRender = null; // fn()

    // FPS tracking
    this.fps = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;
  }

  /** Start the RAF loop. Can only run once per instance. */
  start(onUpdate, onRender) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  _loop(timestamp) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._boundLoop);

    const rawDt = (timestamp - this._lastTime) / 1000;
    this._lastTime = timestamp;

    // FPS counter (refresh every 500ms)
    this._fpsFrames++;
    this._fpsTime += rawDt;
    if (this._fpsTime >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsTime);
      this._fpsFrames = 0;
      this._fpsTime = 0;
    }
    this.fps = this.fps || Math.round(1 / Math.max(rawDt, 1e-4));

    // Hit-pause: freeze updates, keep rendering frozen frame.
    if (this.hitPauseRemaining > 0) {
      this.hitPauseRemaining -= rawDt;
      if (this.onRender) this.onRender();
      return;
    }

    const dt = Math.min(rawDt, this.dtMax) * this.timeScale;

    if (this.onUpdate) this.onUpdate(dt);
    if (this.onRender) this.onRender();
  }
}

export { GameLoop };