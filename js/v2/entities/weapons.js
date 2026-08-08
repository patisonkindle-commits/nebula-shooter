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
function fireSeeker(player, bullets, enemies) {
  const b = bullets.playerBullets.acquire();
  if (!b) return;
  
  b.x = player.x;
  b.y = player.y - player.radius;
  b.vx = 0;
  b.vy = -200;
  b.radius = 4;
  b.damage = 15;
  b.isEnemy = false;
  b.homing = true;
  b.turnRate = 8;
  b.aoe = true;
  b.aoeRadius = 40;
  b.aoeDamage = 7;
  
  return b;
}

/**
 * Fire a plasma bolt
 * @param {object} player - Player entity
 * @param {object} bullets - Bullet manager
 * @param {array} enemies - Array of active enemies
 */
function firePlasma(player, bullets, enemies) {
  const b = bullets.playerBullets.acquire();
  if (!b) return;
  
  b.x = player.x;
  b.y = player.y - player.radius;
  b.vx = 0;
  b.vy = -120;
  b.radius = 5;
  b.damage = 25;
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
 */
function fireTesla(player, bullets, enemies) {
  // Tesla doesn't fire a projectile - chains instantly
  const range = 150;
  const chainCount = 4;
  
  const hits = [];
  let target = enemies[0];
  let dist = Infinity;
  
  // Find nearest enemy
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < range && d < dist) {
      dist = d;
      target = e;
    }
  }
  
  if (!target || !target.alive) return;
  
  // Chain lightning visual
  player.game.sfx.play('tesla');
  player.game.particles.emit(target.x, target.y, 8, {
    speed: 60,
    color: '#ffff00',
    size: 2,
    life: 0.3
  });
  
  // Damage first target
  if (player.game.enemies.damageEnemy(target, 5, player.game)) {
    player.game._onEnemyKilled(target);
  }
  
  // Chain to 3 more enemies
  let prevX = target.x;
  let prevY = target.y;
  
  for (let i = 0; i < chainCount; i++) {
    let nextTarget = null;
    let nextDist = 200;
    
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e === target || e === prevTarget) continue;
      const d = Math.hypot(e.x - prevX, e.y - prevY);
      if (d < nextDist) {
        nextDist = d;
        nextTarget = e;
      }
    }
    
    if (nextTarget) {
      player.game.sfx.play('tesla');
      player.game.particles.emit(nextTarget.x, nextTarget.y, 5, {
        speed: 50,
        color: '#ffff00',
        size: 1.5,
        life: 0.2
      });
      
      if (player.game.enemies.damageEnemy(nextTarget, 5, player.game)) {
        player.game._onEnemyKilled(nextTarget);
      }
      
      prevX = nextTarget.x;
      prevY = nextTarget.y;
      prevTarget = nextTarget;
      target = nextTarget;
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
function fireLance(player, bullets, enemies) {
  const b = bullets.playerBullets.acquire();
  if (!b) return;
  
  b.x = player.x;
  b.y = player.y - player.radius;
  b.vx = 0;
  b.vy = -500;
  b.radius = 2;
  b.damage = 8;
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
 */
export function fireWeapon(weaponId, player, bullets, enemies) {
  switch (weaponId) {
    case 'seeker':
      return fireSeeker(player, bullets, enemies);
    case 'plasma':
      return firePlasma(player, bullets, enemies);
    case 'tesla':
      return fireTesla(player, bullets, enemies);
    case 'lance':
      return fireLance(player, bullets, enemies);
    default:
      // Base weapon - single shot
      const b = bullets.playerBullets.acquire();
      if (b) {
        b.x = player.x;
        b.y = player.y - player.radius;
        b.vx = 0;
        b.vy = -250;
        b.radius = 3;
        b.damage = player.ship.damage;
        b.isEnemy = false;
      }
      return b;
  }
}

/**
 * Get weapon by ID
 */
export function getWeapon(id) {
  return WEAPONS[id] || WEAPONS.base;
}
