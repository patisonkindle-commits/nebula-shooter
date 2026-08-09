// Game mode definitions — Classic / Boss Rush / Endless / Challenge
// v2 — Task 4.6

// Each mode is a plain object. Game checks `mode.active` at start, mutates
// `this.mode` during play to track progression (warpCooldown reset, scoreMult, etc.).
export const MODES = {
  classic: {
    id: 'classic',
    name: 'CLASSIC',
    desc: 'Waves of enemies. Boss gates.\nWave 10 → unlock Boss Rush.',
    rules: {
      bossWave: 10,
      maxWave: null, // unlimited; waves 1-30+ in practice
      scoreMult: 1,
      bossCount: null, // 1 boss (at wave 10)
      enemiesPerWave: 6,
      spawnInterval: 0.8,
      spawnIntervalDecay: 0.03,
      enemyTypes: ['swarmer','swarmer','swarmer','sniper','tank','kamikaze','blocker','vortex','minelayer','warp','shielder','disrupter','ripper'],
      unlockFrom: null, // always available
      unlockAt: null,   // unlocks Boss Rush at wave 10 (boss dies)
    },
    unlockThreshold: null,
  },
  bossRush: {
    id: 'bossRush',
    name: 'BOSS RUSH',
    desc: 'Only boss waves (5, 10, 15, 20, 25).\nNo enemies between bosses.\nUnlock: beat wave 10 Classic.',
    rules: {
      bossWave: null, // pre-listed
      bossWaves: [5, 10, 15, 20, 25],
      bossTimerPerWave: 20,
      maxWave: 25,
      scoreMult: 1.5,
      bossCount: 5, // 5 boss kills required
      enemiesPerWave: 0, // no swarmers — only bosses
      spawnInterval: null,
      spawnIntervalDecay: 0,
      enemyTypes: [],
      unlockFrom: 'classic',
      unlockAt: 'boss10Killed', // flag set when boss dies in classic
    },
    unlockThreshold: { mode: 'classic', flag: 'boss10Killed' },
  },
  endless: {
    id: 'endless',
    name: 'ENDLESS',
    desc: 'Waves never stop. Score ×0.25 every 5 waves.\nUnlock: survive to wave 15.',
    rules: {
      bossWave: null, // no bosses
      maxWave: null,
      scoreMult: 1,
      scoreMultIncrement: 0.25,
      scoreMultPerXWave: 5,
      bossCount: 0,
      enemiesPerWave: 8,
      spawnInterval: 0.6,
      spawnIntervalDecay: 0.04,
      enemyTypes: ['swarmer','swarmer','sniper','tank','kamikaze','blocker','vortex','minelayer','warp','shielder','disrupter','ripper','warp','warp'],
      unlockFrom: 'classic',
      unlockAt: 'wave15', // flag set when wave 15 starts
    },
    unlockThreshold: { mode: 'classic', flag: 'wave15' },
  },
  challenge: {
    id: 'challenge',
    name: 'CHALLENGE',
    desc: 'Survive 20 escalating waves.\nNo bosses. Pure difficulty.\nUnlock: defeat the wave 20 boss.',
    rules: {
      bossWave: null, // no bosses in game mode
      maxWave: 20,
      scoreMult: 2,
      bossCount: 0,
      enemiesPerWave: 10,
      spawnInterval: 0.5,
      spawnIntervalDecay: 0.04,
      enemyTypes: ['swarmer','swarmer','swarmer','sniper','tank','kamikaze','blocker','vortex','minelayer','warp','shielder','disrupter','ripper'],
      unlockFrom: 'bossRush',
      unlockAt: 'boss20Killed', // flag set when boss 20 dies (in classic, triggers unlock here)
    },
    unlockThreshold: { mode: 'classic', flag: 'boss20Killed' },
  },
};

// Helper: given a mode id, return the mode object (or null)
export function getMode(id) {
  return MODES[id] || null;
}

// Helper: build initial mode state for Game (flat fields, ready to mutate)
export function initialModeState(modeId) {
  const mode = getMode(modeId);
  if (!mode) return null;
  return {
    id: modeId,
    name: mode.name,
    desc: mode.desc,
    // mutable
    active: true,
    bossKills: 0,
    wave: 0,
    score: 0,
    // rules snapshot
    rules: { ...mode.rules },
  };
}
