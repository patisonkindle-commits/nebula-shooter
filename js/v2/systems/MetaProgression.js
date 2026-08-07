// v2 MetaProgression — 8 nodes, cores, localStorage
import { SaveManager } from './SaveManager.js';

class MetaProgression {
  constructor(saveManager) {
    this.save = saveManager;
    this.nodes = [
      { id: 'hull', name: 'Hull', maxLevel: 5, coreCost: [50, 100, 200, 400, 800], icon: '🛡️' },
      { id: 'speed', name: 'Speed', maxLevel: 5, coreCost: [40, 80, 160, 320, 640], icon: '💨' },
      { id: 'damage', name: 'Damage', maxLevel: 5, coreCost: [60, 120, 240, 480, 960], icon: '⚔️' },
      { id: 'fireRate', name: 'Fire Rate', maxLevel: 5, coreCost: [50, 100, 200, 400, 800], icon: '🔥' },
      { id: 'projectiles', name: 'Projectiles', maxLevel: 3, coreCost: [80, 160, 320], icon: '🎯' },
      { id: 'special', name: 'Special', maxLevel: 3, coreCost: [100, 200, 400], icon: '✨' },
      { id: 'cores', name: 'Core Bonus', maxLevel: 3, coreCost: [30, 60, 120], icon: '💎' },
      { id: 'score', name: 'Score', maxLevel: 3, coreCost: [40, 80, 160], icon: '🏆' },
    ];
    this.ranks = [];
    this._load();
  }

  _load() {
    this.nodes.forEach(n => n.level = this.save.get(`${n.id}_lvl`, 0));
    this.ranks = this.save.get('ranks', []);
  }

  get cores() {
    return this.save.get('cores', 0);
  }

  setCores(n) {
    this.save.set('cores', n);
  }

  getNode(id) {
    return this.nodes.find(n => n.id === id);
  }

  canAfford(node) {
    const cost = node.coreCost[node.level];
    return cost && this.cores >= cost;
  }

  buy(node) {
    if (!this.canAfford(node)) return false;
    const cost = node.coreCost[node.level];
    if (this.cores < cost) return false;
    this.cores -= cost;
    node.level++;
    this.save.set(`${node.id}_lvl`, node.level);
    this.save.set('cores', this.cores);
    return true;
  }

  getUpgradeLevel(id) {
    const node = this.getNode(id);
    return node ? node.level : 0;
  }

  _save() {
    this.nodes.forEach(n => this.save.set(`${n.id}_lvl`, n.level));
    this.save.set('ranks', this.ranks);
    this.save.set('cores', this.cores);
  }
}

export { MetaProgression };
