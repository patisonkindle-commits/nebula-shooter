// Project Nebula — all tunable constants
const CONFIG = {
  WIDTH: 400,
  HEIGHT: 720,
  UPWARD_OFFSET: 70,
  PLAYER_RADIUS: 14,
  HITBOX_RADIUS: 4,
  PLAYER_SPEED: 220,
  PLAYER_MAX_HP: 3,
  PLAYER_FIRE_RATE: 0.15,
  PLAYER_BULLET_SPEED: 500,
  PLAYER_BULLET_DAMAGE: 1,
  PLAYER_INVINCIBLE_TIME: 1.5,
  BULLET_POOL_SIZE: 400,
  ENEMY_BULLET_SPEED: 200,
  ENEMY_POOL_SIZE: 80,
  SCRAP_POOL_SIZE: 100,
  PARTICLE_POOL_SIZE: 500,
  STAR_COUNT: 60,
  SCRAP_COLLECT_RADIUS: 24,
  SCRAP_AUTO_COLLECT_RADIUS: 22,
  CORE_CHANCE: 0.08,

  // Waves
  WAVE_DURATION: 25,
  ELITE_WAVE_INTERVAL: 5,
  BOSS_WAVE: 10,
  ENEMIES_PER_WAVE: 6,
  SPAWN_INTERVAL: 0.8,

  // Enemy archetypes
  SWARMER: { hp: 1, speed: 120, radius: 10, score: 10, color: '#ff4466' },
  SNIPER:  { hp: 1, speed: 60,  radius: 10, score: 15, color: '#ffaa00' },
  TANK:    { hp: 4, speed: 50,  radius: 16, score: 30, color: '#8844ff' },
  KAMIKAZE:{ hp: 2, speed: 180, radius: 12, score: 20, color: '#ff6600' },
  BLOCKER: { hp: 3, speed: 40,  radius: 18, score: 25, color: '#44aaff' },

  // Boss
  BOSS_HP: 50,
  BOSS_SPEED: 60,
  BOSS_RADIUS: 32,
  BOSS_SCORE: 200,
  BOSS_FIRE_RATE: 1.5,
  BOSS_RING_SIZE: 10,

  // Solar flare interval (seconds)
  SOLAR_FLARE_INTERVAL: 8,
  SOLAR_FLARE_RANGE: 100,
  PLASMA_CHAIN_RANGE: 80,
  PLASMA_CHAIN_MAX_TARGETS: 3,
  GRAVITY_WELL_RANGE: 65,
  GRAVITY_WELL_ENEMY_PULL: 60,
  GRAVITY_WELL_SCRAP_PULL: 120,

  // Scrap
  SCRAP_SPEED: 60,
  CORE_COST_BASE: 10,

  // Juice
  SCREEN_SHAKE_DECAY: 0.85,
  CHROMATIC_DECAY: 0.88,
  HIT_PAUSE_DURATION: 0.08,
  FLASH_DECAY: 0.92,

  // Metaprogression nodes
  META_NODES: {
    speed:   { maxRank: 5, costPerRank: [5,10,20,40,80], desc: '+3% Move Speed', effect: v => 1 + v * 0.03 },
    hp:      { maxRank: 5, costPerRank: [5,10,20,40,80], desc: '+1 Max HP', effect: v => 1 + v },
    shield:  { maxRank: 3, costPerRank: [10,25,50],      desc: '+1 Starting Shield', effect: v => v },
    magnet:  { maxRank: 3, costPerRank: [8,20,40],       desc: '+20% Magnet Radius', effect: v => 1 + v * 0.2 },
    damage:  { maxRank: 5, costPerRank: [5,10,20,40,80], desc: '+10% Damage', effect: v => 1 + v * 0.1 },
    fireRate:{ maxRank: 5, costPerRank: [5,10,20,40,80], desc: '+8% Fire Rate', effect: v => 1 + v * 0.08 },
    scrap:   { maxRank: 3, costPerRank: [8,20,40],       desc: '+15% Scrap Magnet', effect: v => v > 0 },
    core:    { maxRank: 3, costPerRank: [15,35,70],      desc: '+15% Core Magnet', effect: v => v > 0 },
  }
};

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
const lerp = (a, b, t) => a + (b - a) * t;

const ENEMY_TYPES = ['swarmer','sniper','tank','kamikaze','blocker'];
const NUM_ENEMY_TYPES = ENEMY_TYPES.length;
