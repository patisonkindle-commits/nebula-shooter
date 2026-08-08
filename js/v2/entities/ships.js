// v2 ship archetypes (Task 4.1) — 4 ships with distinct stats + projectile types
export const SHIPS = {
  vanguard: {
    id: 'vanguard',
    name: 'VANGUARD',
    desc: 'Balanced starter ship',
    color: '#22c1ff',
    hp: 4000,      // base HP (meta hull stacks)
    speed: 280,     // moveSpeed px/s
    fireRate: 0.14, // seconds between shots
    damage: 1,      // base damage mult
    projectile: 'single', // single | twin | pulse
    unlockCost: 0,  // 0 = free
    unlocked: true,
  },
  interceptor: {
    id: 'interceptor',
    name: 'INTERCEPTOR',
    desc: 'Twin-barrel rapid fire, squishy',
    color: '#ff6b4a',
    hp: 3000,
    speed: 320,
    fireRate: 0.10,
    damage: 0.85,
    projectile: 'twin',
    unlockCost: 500,
    unlocked: false,
  },
  pulsar: {
    id: 'pulsar',
    name: 'PULSAR',
    desc: 'Slow pulse cannon, high damage',
    color: '#ffeb3b',
    hp: 5000,
    speed: 240,
    fireRate: 0.22,
    damage: 1.5,
    projectile: 'pulse',
    unlockCost: 800,
    unlocked: false,
  },
  juggernaut: {
    id: 'juggernaut',
    name: 'JUGGERNAUT',
    desc: 'Tank. Highest HP + raw damage',
    color: '#00e676',
    hp: 7000,
    speed: 200,
    fireRate: 0.28,
    damage: 2.2,
    projectile: 'single',
    unlockCost: 1200,
    unlocked: false,
  },
};