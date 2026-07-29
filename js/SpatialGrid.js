// Spatial hash grid — O(1) collision queries
class SpatialGrid {
  constructor(cellSize = 80) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  clear() { this.cells.clear(); }
  _key(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
  insert(e) {
    const key = this._key(e.x, e.y);
    let cell = this.cells.get(key);
    if (!cell) { cell = []; this.cells.set(key, cell); }
    cell.push(e);
  }
  query(x, y, radius) {
    const res = [];
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (cell) res.push(...cell);
      }
    }
    return res;
  }
}
