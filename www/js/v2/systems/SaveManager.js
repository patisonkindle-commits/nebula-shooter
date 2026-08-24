// v2 SaveManager — localStorage with try/catch + version field
import { CONFIG } from '../core/config.js';

class SaveManager {
  constructor() {
    this.key = `${CONFIG.SAVE_KEY || 'nebula_v2'}_${CONFIG.VERSION || '2.0'}`;
    this._data = null;
    this._dirty = false;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      this._data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('SaveManager: load failed', e);
      this._data = null;
    }
    return this._data;
  }

  save() {
    if (!this._dirty) return;
    try {
      localStorage.setItem(this.key, JSON.stringify(this._data));
      this._dirty = false;
    } catch (e) {
      console.warn('SaveManager: save failed', e);
    }
  }

  get data() {
    if (!this._data) this.load();
    return this._data || {};
  }

  set(key, value) {
    if (!this._data) this._data = {};
    this._data[key] = value;
    this._dirty = true;
  }

  get(key, defaultValue) {
    const d = this.data;
    return key in d ? d[key] : defaultValue;
  }

  has(key) {
    return key in this.data;
  }

  clear() {
    this._data = {};
    this._dirty = true;
    this.save();
  }

  /** Migrate v1 meta (cores + ranks) into v2 schema once */
  migrateV1() {
    try {
      const v1Key = 'nebula_meta';
      const raw = localStorage.getItem(v1Key);
      if (!raw) return;
      const v1 = JSON.parse(raw);
      this._data = this._data || {};
      this._data.cores = v1.cores || 0;
      this._data.ranks = v1.ranks || 0;
      this._data.migrated = true;
      this._dirty = true;
      localStorage.removeItem(v1Key);
    } catch (e) {
      console.warn('SaveManager: v1 migration failed', e);
    }
  }
}

export { SaveManager };
