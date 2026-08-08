// Project Nebula v2 — tunable constants (extends v1, adds v2 keys)
import { SHIPS } from '../entities/ships.js';
export { SHIPS };
export const CONFIG = {
  // Canvas / layout
  WIDTH: 400,
  HEIGHT: 720,
  UPWARD_OFFSET: 70,

  // Player
  PLAYER_RADIUS: 14,
  HITBOX_RADIUS: 4,
  PLAYER_SPEED: 240,
  PLAYER_MAX_HP: 3,
  PLAYER_FIRE_RATE: 0.14,
  PLAYER_BULLET_SPEED: 520,
  PLAYER_BULLET_DAMAGE: 1,
  PLAYER_INVINCIBLE_TIME: 1.2,

  // Pool sizes
  BULLET_POOL_SIZE: 400,
  ENEMY_POOL_SIZE: 80,
  SCRAP_POOL_SIZE: 100,
  PARTICLE_POOL_SIZE: 600,

  // Stars
  STAR_COUNT: 80,

  // Scrap
  SCRAP_COLLECT_RADIUS: 24,
  SCRAP_AUTO_COLLECT_RADIUS: 22,
  CORE_CHANCE: 0.08,

  // Waves
  WAVE_DURATION: 25,
  ELITE_WAVE_INTERVAL: 5,
  BOSS_WAVE: 10,
  ENEMIES_PER_WAVE: 6,
  SPAWN_INTERVAL: 0.8,

  // Thematic sectors — rotate per 10 waves (wave 1-10 Azure, 11-20 Crimson, ...)
  SECTORS: {
    default: { name: 'AZURE DRIFT', tint: '#2244cc', accent: '#66ccff', gradient: ['#060612', '#0a0820', '#0e0628', '#080812'], nebula: ['#4411aa', '#2244cc', '#aa1188', '#1155aa'] },
    crimson: { name: 'CRIMSON TIDE', tint: '#aa2244', accent: '#ff6644', gradient: ['#140406', '#220a08', '#2a0812', '#100608'], nebula: ['#882211', '#cc2244', '#aa1155', '#442211'] },
    violet:  { name: 'VIOLET DEEP', tint: '#6622aa', accent: '#cc88ff', gradient: ['#0a0614', '#140a24', '#1a0a2c', '#0c0814'], nebula: ['#4411aa', '#8822cc', '#5511aa', '#331188'] },
    oro:     { name: 'ORO BELT', tint: '#aa8822', accent: '#ffcc44', gradient: ['#140e04', '#221a08', '#2a2208', '#100c06'], nebula: ['#aa8822', '#ccaa44', '#887722', '#aa6600'] },
  },

  // Enemy archetypes — balanced HP/Damage scaling tier
  SWARMER:   { hp: 1, speed: 120, radius: 10, score: 10, color: '#ff4466' },
  SNIPER:    { hp: 1, speed: 60,  radius: 10, score: 15, color: '#ffaa00' },
  TANK:      { hp: 4, speed: 50,  radius: 16, score: 30, color: '#8844ff' },
  KAMIKAZE:  { hp: 2, speed: 180, radius: 12, score: 20, color: '#ff6600' },
  BLOCKER:   { hp: 3, speed: 40,  radius: 18, score: 25, color: '#44aaff' },
  VORTEX:    { hp: 5, speed: 55,  radius: 18, score: 45, color: '#44ffdd' },
  MINELAYER: { hp: 4, speed: 35,  radius: 16, score: 35, color: '#88ff44' },
  WARP:      { hp: 2, speed: 100, radius: 12, score: 30, color: '#dd77ff' },
  SHIELDER:  { hp: 4, speed: 40,  radius: 16, score: 40, color: '#66ccff', shieldHp: 3, shieldRecharge: 4 },
  DISRUPTER: { hp: 2, speed: 55,  radius: 14, score: 35, color: '#ff66aa', disruptChance: 0.2 },
  RIPPER:    { hp: 1, speed: 220, radius: 14, score: 25, color: '#ff5555', zigzag: 90 },

  // Wave scaling
  WAVE_HP_SCALE: 0.06,
  WAVE_SPEED_SCALE: 0.015,
  WAVE_SCORE_SCALE: 0.08,
  WAVE_DAMAGE_SCALE: 0.04,

  // Elite
  ELITE_HP_BONUS: 0.5,
  ELITE_SCORE_BONUS: 2,
  ELITE_SPEED_BONUS: 0.15,

  // Boss
  BOSS_HP: 60,
  BOSS_SPEED: 60,
  BOSS_RADIUS: 32,
  BOSS_SCORE: 300,
  BOSS_FIRE_RATE: 1.8,
  BOSS_RING_SIZE: 12,
  BOSS_CROSS_BULLETS: 4,
  BOSS_CROSS_RATE: 2.5,
  BOSS_EXPANDING_RATE: 4,
  BOSS_EXPANDING_COUNT: 16,
  BOSS_STAR_ARMS: 12,
  BOSS_STAR_TURNS: 3,
  BOSS_SPRAY_ANGLE: 0.4,
  BOSS_DAMAGE: 2,

  // Bosses
  KOLOSS:       { wave: 5,   hpMultiplier: 1.2, radius: 38, color: '#ffcc33', score: 500, name: 'KOLOSS' },
  UMBRA:        { wave: 25,  hpMultiplier: 3.5, radius: 44, color: '#8800cc', score: 2000, name: 'UMBRA' },
  BOSS_WAVES:   [5, 10, 15, 20, 25],

  // Solar / abilities
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
  SCREEN_SHAKE_DECAY: 0.88,
  CHROMATIC_DECAY: 0.88,
  HIT_PAUSE_DURATION: 0.10,
  FLASH_DECAY: 0.92,
  MIN_SHAKE_THRESHOLD: 0.8,

  // Meta-progression nodes
  META_NODES: {
    speed:   { maxRank: 5, costPerRank: [5,10,20,40,80], desc: '+3% Move Speed', effect: v => 1 + v * 0.03 },
    hp:      { maxRank: 5, costPerRank: [5,10,20,40,80], desc: '+1 Max HP',       effect: v => 1 + v },
    shield:  { maxRank: 3, costPerRank: [10,25,50],      desc: '+1 Starting Shield', effect: v => v },
    magnet:  { maxRank: 3, costPerRank: [8,20,40],       desc: '+20% Magnet Radius', effect: v => 1 + v * 0.2 },
    damage:  { maxRank: 5, costPerRank: [5,10,20,40,80], desc: '+10% Damage',      effect: v => 1 + v * 0.1 },
    fireRate:{ maxRank: 5, costPerRank: [5,10,20,40,80], desc: '+8% Fire Rate',    effect: v => 1 + v * 0.08 },
    scrap:   { maxRank: 3, costPerRank: [8,20,40],       desc: '+15% Scrap Magnet',  effect: v => v > 0 },
    core:    { maxRank: 3, costPerRank: [15,35,70],      desc: '+15% Core Magnet',   effect: v => v > 0 },
  },
};

// v2 additions (used by v2 features, placeholder defaults)
export const RENDER = {
  BLOOM_SCALE: 0.25,        // bloom layer res fraction (1/4)
  BLOOM_BLUR_PASS: 2,       // box-blur downsample passes
  NEBULA_BLOBS: 6,           // nebula gradient blob count
  NEBULA_SPEED: 3,            // px/s drift
  STAR_LAYERS: 3,             // parallax depth layers
  VIGNETTE_STRENGTH: 0.6,
};

// v2 enemy archetypes — extended (Task 4.3)
export const ENEMY_TYPES = ['swarmer','sniper','tank','kamikaze','blocker','vortex','minelayer','warp','shielder','disrupter','ripper'];

// Sector lookup: wave → sector key (rotates every 10 waves, cycles 4)
const SECTOR_ORDER = ['default', 'crimson', 'violet', 'oro'];
export function getSector(wave) {
  const idx = (Math.max(0, Math.floor((wave - 1) / 10))) % SECTOR_ORDER.length;
  return { key: SECTOR_ORDER[idx], ...CONFIG.SECTORS[SECTOR_ORDER[idx]] };
}
