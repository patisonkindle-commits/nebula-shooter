// Out-of-run metaprogression — localStorage talent tree
class MetaProgression {
  constructor() {
    this.cores = 0;
    this.totalCoresEarned = 0;
    this.nodes = {};
    this._initNodes();
    this.load();
  }

  _initNodes() {
    for (const [id, cfg] of Object.entries(CONFIG.META_NODES)) {
      this.nodes[id] = { rank: 0, maxRank: cfg.maxRank, costPerRank: cfg.costPerRank, desc: cfg.desc };
    }
  }

  getCost(nodeId) {
    const n = this.nodes[nodeId];
    if (!n || n.rank >= n.maxRank) return Infinity;
    return n.costPerRank[n.rank];
  }

  purchase(nodeId) {
    const cost = this.getCost(nodeId);
    if (this.cores < cost) return false;
    this.cores -= cost;
    this.nodes[nodeId].rank++;
    this.save();
    return true;
  }

  earnCores(amount) {
    this.cores += amount;
    this.totalCoresEarned += amount;
    this.save();
  }

  getAppliedModifiers() {
    const m = {
      speedMult: 1, hpBonus: 0, startingShield: 0,
      magnetMult: 1, damageMult: 1, fireRateMult: 1,
      scrapMagnet: false, coreMagnet: false,
    };
    if (this.nodes.speed) m.speedMult = CONFIG.META_NODES.speed.effect(this.nodes.speed.rank);
    if (this.nodes.hp) m.hpBonus = CONFIG.META_NODES.hp.effect(this.nodes.hp.rank) - 1;
    if (this.nodes.shield) m.startingShield = CONFIG.META_NODES.shield.effect(this.nodes.shield.rank);
    if (this.nodes.magnet) m.magnetMult = CONFIG.META_NODES.magnet.effect(this.nodes.magnet.rank);
    if (this.nodes.damage) m.damageMult = CONFIG.META_NODES.damage.effect(this.nodes.damage.rank);
    if (this.nodes.fireRate) m.fireRateMult = 1 / CONFIG.META_NODES.fireRate.effect(this.nodes.fireRate.rank);
    if (this.nodes.scrap) m.scrapMagnet = CONFIG.META_NODES.scrap.effect(this.nodes.scrap.rank);
    if (this.nodes.core) m.coreMagnet = CONFIG.META_NODES.core.effect(this.nodes.core.rank);
    return m;
  }

  save() {
    try {
      const data = {
        cores: this.cores,
        totalCoresEarned: this.totalCoresEarned,
        nodes: Object.fromEntries(
          Object.entries(this.nodes).map(([id, n]) => [id, n.rank])
        ),
      };
      localStorage.setItem('nebula_meta', JSON.stringify(data));
    } catch(e) { /* silently fail */ }
  }

  load() {
    try {
      const raw = localStorage.getItem('nebula_meta');
      if (!raw) return;
      const data = JSON.parse(raw);
      this.cores = data.cores || 0;
      this.totalCoresEarned = data.totalCoresEarned || 0;
      if (data.nodes) {
        for (const [id, rank] of Object.entries(data.nodes)) {
          if (this.nodes[id]) this.nodes[id].rank = Math.min(rank, this.nodes[id].maxRank);
        }
      }
      // Remove old node IDs
      for (const id of Object.keys(this.nodes)) {
        if (!CONFIG.META_NODES[id]) delete this.nodes[id];
      }
    } catch(e) { /* silently fail */ }
  }

  reset() {
    this._initNodes();
    this.cores = 0;
    this.totalCoresEarned = 0;
    this.save();
  }
}
