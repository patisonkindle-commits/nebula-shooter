// Enemy factory + manager — v2 shell. Spawn/behavior/pooling lands Phase 3.
// Render delegates to procedural vector art (ShipRenderer), which handles all
// archetypes + elite + boss variants.

import { CONFIG } from '../core/config.js';
import { Pool } from '../core/Pool.js';
import { renderEnemy } from '../render/ShipRenderer.js';

const ENEMY_KEYS = ['swarmer', 'sniper', 'tank', 'kamikaze', 'blocker', 'vortex', 'minelayer', 'warp'];

function createEnemy() {
  return {
    alive: false, type: 'swarmer', score: 10,
    x: 0, y: 0, vx: 0, vy: 0, radius: 10, hp: 1, maxHp: 1,
    color: '#ff4466', isElite: false, isBoss: false,
    fireTimer: 0, phase: 0,
    // archetype-specific state
    vortexAngle: 0, vortexReachedPos: false, mineTimer: 1,
    warpTeleporting: false, warpFlash: 0,
    bossPhase: 1, phaseTransitionTimer: 0,
  };
}

class EnemyManager {
  constructor() {
    this.pool = new Pool(createEnemy, CONFIG.ENEMY_POOL_SIZE);
    this.bossActive = false;
    this.bossDefeated = false;
    this.bossSpawnedThisWave = false;
    this.kills = 0;
  }

  spawn(type, x, y, wave) {
    const e = this.pool.acquire();
    if (!e) return null;
    const t = CONFIG[type.toUpperCase()] || CONFIG.SWARMER;
    e.alive = true;
    e.type = type;
    e.x = x;
    e.y = y;
    e.radius = t.radius;
    e.hp = t.hp;
    e.maxHp = t.hp;
    e.color = t.color;
    e.score = t.score;
    e.isElite = false;
    e.isBoss = false;
    e.fireTimer = 0;
    return e;
  }

  update(dt, time) {
    // Movement/behavior land Phase 3; render-only for now.
    void dt;
    void time;
  }

  render(ctx, time) {
    this.pool.forEach(e => renderEnemy(ctx, e, time));
  }

  releaseAll() {
    this.pool.releaseAll();
    this.bossActive = false;
    this.bossDefeated = false;
    this.bossSpawnedThisWave = false;
    this.kills = 0;
  }
}

export { EnemyManager, ENEMY_KEYS };