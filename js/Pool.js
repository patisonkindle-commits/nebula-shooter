// Generic object pool — O(1) acquire via freelist
class Pool {
  constructor(createFn, size) {
    this.pool = [];
    this.active = [];
    this._freelist = [];
    for (let i = 0; i < size; i++) {
      const obj = createFn();
      obj.alive = false;
      obj._poolIdx = i;
      this.pool.push(obj);
      this._freelist.push(i);
    }
  }

  get count() {
    return this.active.length;
  }

  updateAll(dt, fn) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      if (obj.alive) {
        obj._update(dt);
        fn(obj);
      }
    }
  }

  acquire() {
    const idx = this._freelist.pop();
    if (idx === undefined) return null;
    const obj = this.pool[idx];
    obj.alive = true;
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    obj.alive = false;
    this._freelist.push(obj._poolIdx);
    const idx = this.active.indexOf(obj);
    if (idx >= 0) this.active.splice(idx, 1);
  }

  releaseAll() {
    for (const obj of this.active) obj.alive = false;
    this.active.length = 0;
  }

  forEach(fn) {
    for (const obj of this.active) fn(obj);
  }
}