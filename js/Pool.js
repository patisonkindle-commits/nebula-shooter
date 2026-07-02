// Generic object pool
class Pool {
  constructor(createFn, size) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < size; i++) {
      const obj = createFn();
      obj.alive = false;
      this.pool.push(obj);
    }
  }

  acquire() {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].alive) {
        this.pool[i].alive = true;
        this.active.push(this.pool[i]);
        return this.pool[i];
      }
    }
    return null;
  }

  release(obj) {
    obj.alive = false;
    const idx = this.active.indexOf(obj);
    if (idx >= 0) this.active.splice(idx, 1);
  }

  releaseAll() {
    for (const obj of this.active) obj.alive = false;
    this.active.length = 0;
  }

  updateAll(dt, fn) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      if (!obj.alive) { this.active.splice(i, 1); continue; }
      fn(obj, dt);
    }
  }

  forEach(fn) {
    for (const obj of this.active) fn(obj);
  }

  get count() { return this.active.length; }
}
