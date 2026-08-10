// v2 Weapon Definitions (Task 4.2) — data-driven weapon system
// Each weapon has: id, name, fire(), damage, specialBehavior

export const WEAPONS = {
  base: {
    id: 'base',
    name: 'BLASTER',
    desc: 'Standard rapid-fire weapon',
    fire: null, // default, overridden by ship
    damage: 1,
    cooldown: 0,
    special: 'none'
  },
  seeker: {
    id: 'seeker',
    name: 'SEEKER MISSILE',
    desc: 'Homing missiles that explode on contact',
    fire: 'seeker',
    damage: 15,
    cooldown: 0.8,
    special: 'aoe'
  },
  plasma: {
    id: 'plasma',
    name: 'PLASMA CANNON',
    desc: 'Slow heavy bolt, high damage, pierces enemies',
    fire: 'plasma',
    damage: 25,
    cooldown: 1.2,
    special: 'pierce'
  },
  tesla: {
    id: 'tesla',
    name: 'TESLA ARC',
    desc: 'Lightning chains to nearby enemies',
    fire: 'tesla',
    damage: 5,
    cooldown: 0.4,
    special: 'chain'
  },
  lance: {
    id: 'lance',
    name: 'PHOTON LANCE',
    desc: 'High-speed beam, pierces all in path',
    fire: 'lance',
    damage: 8,
    cooldown: 0.25,
    special: 'beam'
  }
};

/**
 * Fire a seeker missile
 * @param {object} player - Player entity
 * @param {object} bullets - Bullet manager
 * @param {array} enemies - Array of active enemies
 */
function fireSeeker(player, bullets, enemies, game) {
  const b = bullets.playerBullets.acquire();
  if (!b) return;
  
  b.x = player.x;
  b.y = player.y - player.radius;
  b.vx = 0;
  b.vy = -200;
  b.radius = 4;
  b.damage = 15 + (game && game.wave ? game.wave * 0.5 : 0);
  b.isEnemy = false;
  b.homing = true;
  b.turnRate = 8;
  b.aoe = true;
  b.aoeRadius = 40;

  return b;
}

/**
 * Fire a plasma bolt
 * @param {object} player - Player entity
 * @param {object} bullets - Bullet manager
 * @param {array} enemies - Array of active enemies
 */
function firePlasma(player, bullets, enemies, game) {
  const b = bullets.playerBullets.acquire();
  if (!b) return;
  
  b.x = player.x;
  b.y = player.y - player.radius;
  b.vx = 0;
  b.vy = -120;
  b.radius = 5;
  b.damage = 25 + (game && game.wave ? game.wave : 0);
  b.isEnemy = false;
  b.piercing = 1;
  b.pierceRemaining = 1;
  
  return b;
}

/**
 * Fire tesla arc - chain lightning to nearby enemies
 * @param {object} player - Player entity
 * @param {object} bullets - Bullet manager
 * @param {array} enemies - Array of active enemies
 * @param {object} game - Game (for damage + fx)
 */
function fireTesla(player, bullets, enemies, game) {
  // Tesla doesn't fire a projectile - chains instantly
  const range = 150;
  const chainCount = 4;
  const g = game || player.game;
  const list = enemies && enemies.pool ? enemies.pool.active : (enemies || []);

  let target = null;
  let dist = Infinity;

  // Find nearest enemy
  for (const e of list) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < range && d < dist) {
      dist = d;
      target = e;
    }
  }

  if (!target || !target.alive) return;
  if (!g) return;

  // Chain lightning visual
  g.sfx && g.sfx.play('tesla');
  g.particles.emit(target.x, target.y, 8, {
    speed: 60,
    color: '#ffff00',
    size: 2,
    life: 0.3
  });

  // Damage first target
  const dmg = 5 + (game && game.wave ? game.wave * 0.3 : 0);
  if (g.enemies.damageEnemy(target, dmg, g)) {
    g._onEnemyKilled(target);
  }

  // Chain to 3 more enemies
  let prevX = target.x;
  let prevY = target.y;
  let prevTarget = target;
  let cur = target;

  for (let i = 0; i < chainCount; i++) {
    let nextTarget = null;
    let nextDist = 200;

    for (const e of list) {
      if (!e.alive) continue;
      if (e === cur || e === prevTarget) continue;
      const d = Math.hypot(e.x - prevX, e.y - prevY);
      if (d < nextDist) {
        nextDist = d;
        nextTarget = e;
      }
    }

    if (nextTarget) {
      g.sfx && g.sfx.play('tesla');
      g.particles.emit(nextTarget.x, nextTarget.y, 5, {
        speed: 50,
        color: '#ffff00',
        size: 1.5,
        life: 0.2
      });

      if (g.enemies.damageEnemy(nextTarget, dmg, g)) {
        g._onEnemyKilled(nextTarget);
      }

      prevTarget = cur;
      cur = nextTarget;
      prevX = nextTarget.x;
      prevY = nextTarget.y;
    } else {
      break;
    }
  }
}

/**
 * Fire photon lance - high-speed beam
 * @param {object} player - Player entity
 * @param {object} bullets - Bullet manager
 * @param {array} enemies - Array of active enemies
 */
function fireLance(player, bullets, enemies, game) {
  const b = bullets.playerBullets.acquire();
  if (!b) return;
  
  b.x = player.x;
  b.y = player.y - player.radius;
  b.vx = 0;
  b.vy = -500;
  b.radius = 2;
  b.damage = 8 + (game && game.wave ? game.wave * 0.8 : 0);
  b.isEnemy = false;
  b.piercing = 3;
  b.pierceRemaining = 3;
  
  return b;
}

/**
 * Fire weapon by ID
 * @param {string} weaponId - Weapon ID
 * @param {object} player - Player entity
 * @param {object} bullets - Bullet manager
 * @param {array} enemies - Array of active enemies
 * @param {object} game - Game (for tesla fx + damage)
 */
export function fireWeapon(weaponId, player, bullets, enemies, game) {
  switch (weaponId) {
    case 'seeker':
      return fireSeeker(player, bullets, enemies, game);
    case 'plasma':
      return firePlasma(player, bullets, enemies, game);
    case 'tesla':
      return fireTesla(player, bullets, enemies, game);
    case 'lance':
      return fireLance(player, bullets, enemies, game);
    default:
      return null;
  }
}

/**
 * Get weapon by ID
 */
export function getWeapon(id) {
  return WEAPONS[id] || WEAPONS.base;
}
