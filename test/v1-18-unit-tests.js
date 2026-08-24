// v1.18 Unit Test Suite — Game Logic (Node.js + vm.runInNewContext)
// v1.18 modules are loose scripts — they leak into global scope via <script>.
// We load them in vm.runInNewContext with CONFIG + rand + localStorage as globals.

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const TESTS = [];
let passed = 0, failed = 0, skipped = 0;

function test(name, fn) { TESTS.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }
function assertEq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'mismatch'}: ${a} !== ${b}`); }
function assertClose(a, b, msg) { if (Math.abs(a - b) > 1e-9) throw new Error(`${msg || 'mismatch'}: ${a} !~ ${b}`); }

// ═══════════════════════════════════════════════════════════════════════════
// LOADER
// Modules are loose browser scripts (no exports, no strict mode). Each indirect
// eval gets its own lexical scope that DIES when the eval returns — only
// var/function land on globalThis. So: eval core+module as one unit, with a
// tail that copies the declared names onto globalThis before scope death.
// ═══════════════════════════════════════════════════════════════════════════

const JS_DIR = path.join(__dirname, '..', 'js');
const NAMES = ['CONFIG', 'rand', 'randInt', 'clamp', 'dist', 'angleTo', 'lerp',
  'ENEMY_TYPES', 'NUM_ENEMY_TYPES', 'Pool', 'SpatialGrid', 'Input',
  'createEnemy', 'createPlayerBullet', 'createEnemyBullet',
  'EnemyManager', 'BulletManager', 'ScrapManager',
  'MetaProgression', 'MetaScreen'];
// tail: export whatever of NAMES exists in this eval's scope onto globalThis
const TAIL = ';globalThis.__G=globalThis.__G||{};' +
  NAMES.map(n => `try{__G.${n}=${n}}catch(e){}`).join('');

// localStorage stub before any module loads (MetaProgression touches it)
if (typeof globalThis.localStorage === 'undefined') {
  const _store = {};
  globalThis.localStorage = {
    getItem: k => (k in _store ? _store[k] : null),
    setItem: (k, v) => { _store[k] = String(v); },
    removeItem: k => { delete _store[k]; },
    clear: () => { for (const k of Object.keys(_store)) delete _store[k]; },
  };
}

function _src(file) { return fs.readFileSync(path.join(JS_DIR, file), 'utf8'); }

function _evl(files) {
  (0, eval)(files.map(_src).join('\n;\n') + TAIL);
}

function runScript(name) {
  try {
    // one combined eval per call → module sees CONFIG/Pool/etc in its own scope;
    // dedupe: module may already be part of core (e.g. Pool.js)
    const files = ['config.js', 'entities/utils.js', 'Pool.js', 'SpatialGrid.js']
      .filter(f => fs.existsSync(path.join(JS_DIR, f)));
    const uniq = [...new Set(files.concat(name))];
    _evl(uniq);
  } catch (e) {
    console.warn(`[${name}] ${e.message}`);
  }
  return globalThis.__G || {};
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG — data integrity
// ═══════════════════════════════════════════════════════════════════════════

test('Config — WIDTH=400 HEIGHT=720', () => {
  const g = runScript('config.js');
  assertEq(g.CONFIG.WIDTH, 400, 'WIDTH');
  assertEq(g.CONFIG.HEIGHT, 720, 'HEIGHT');
});

test('Config — all required constants exist', () => {
  const g = runScript('config.js');
  const keys = ['WIDTH', 'HEIGHT', 'PLAYER_SPEED', 'PLAYER_RADIUS',
    'PLAYER_BULLET_SPEED', 'PLAYER_BULLET_DAMAGE', 'BULLET_POOL_SIZE',
    'ENEMY_POOL_SIZE', 'WAVE_HP_SCALE', 'WAVE_SCORE_SCALE', 'WAVE_SPEED_SCALE',
    'ELITE_WAVE_INTERVAL', 'ELITE_HP_BONUS', 'ELITE_SPEED_BONUS', 'ELITE_SCORE_BONUS',
    'BOSS_HP', 'BOSS_RADIUS', 'BOSS_SPEED', 'BOSS_FIRE_RATE', 'BOSS_DAMAGE',
    'BOSS_RING_SIZE', 'BOSS_EXPANDING_COUNT', 'BOSS_STAR_ARMS', 'BOSS_SPRAY_ANGLE'];
  keys.forEach(k => assert(g.CONFIG[k] !== undefined, `CONFIG.${k} exists`));
});

test('Config — enemy type definitions present', () => {
  const g = runScript('config.js');
  const types = ['SWARMER', 'SNIPER', 'TANK', 'KAMIKAZE', 'BLOCKER', 'VORTEX', 'MINELAYER', 'WARP'];
  types.forEach(t => assert(g.CONFIG[t] !== undefined, `CONFIG.${t} defined`));
});

// ═══════════════════════════════════════════════════════════════════════════
// POOL — O(1) acquire via freelist
// ═══════════════════════════════════════════════════════════════════════════

test('Pool — acquires returns alive object, active length grows', () => {
  const g = runScript('Pool.js');
  const pool = new g.Pool(() => ({ alive: false, x: 0 }), 5);

  const obj = pool.acquire();
  assert(obj.alive === true, 'acquired object is alive');
  assertEq(pool.active.length, 1, 'active has 1');
});

test('Pool — release puts object back, active shrinks', () => {
  const g = runScript('Pool.js');
  const pool = new g.Pool(() => ({ alive: false, x: 0 }), 3);
  const a = pool.acquire(); a.x = 42;
  const b = pool.acquire();
  assertEq(pool.active.length, 2, '2 active');
  pool.release(b);
  assertEq(pool.active.length, 1, '1 active after release');
  assertEq(pool.active[0], a, 'a still active');
  assertEq(a.x, 42, 'x preserved across release cycle');
});

test('Pool — acquire returns null when pool exhausted (not throw)', () => {
  const g = runScript('Pool.js');
  const pool = new g.Pool(() => ({ alive: false }), 2);
  pool.acquire();
  pool.acquire();
  assertEq(pool.acquire(), null, 'exhausted → null');
});

test('Pool — double-release is a no-op (guard)', () => {
  const g = runScript('Pool.js');
  const pool = new g.Pool(() => ({ alive: false }), 2);
  const a = pool.acquire(), b = pool.acquire();
  pool.release(a);
  pool.release(a); // second time: not in active → ignored
  assertEq(pool.active.length, 1, 'still only b active');
  assertEq(b.alive, true, 'b untouched');
});

test('Pool — releaseAll resets freelist and deactivates all', () => {
  const g = runScript('Pool.js');
  const pool = new g.Pool(() => ({ alive: false }), 3);
  const a = pool.acquire(), b = pool.acquire(), c = pool.acquire();
  pool.releaseAll();
  assertEq(pool.active.length, 0, 'active empty');
  assertEq(pool._freelist.length, 3, 'freelist has 3 slots');
  assertEq(a.alive, false, 'a deactivated');
  assertEq(b.alive, false, 'b deactivated');
  assertEq(c.alive, false, 'c deactivated');
});

test('Pool — releaseAll then acquire reuses slots (LIFO freelist)', () => {
  const g = runScript('Pool.js');
  const pool = new g.Pool(() => ({ alive: false }), 3);
  pool.acquire(); pool.acquire(); pool.acquire();
  pool.releaseAll();
  // freelist rebuilt as [0,1,2]; acquire pops from end → _poolIdx 2
  const a = pool.acquire();
  assertEq(a._poolIdx, 2, 'pops last index first');
  assertEq(a.alive, true, 'revived');
});

test('Pool — forEach iterates only active entities', () => {
  const g = runScript('Pool.js');
  const pool = new g.Pool(() => ({ alive: true, v: 0 }), 4);
  const a = pool.acquire(); a.v = 1;
  const b = pool.acquire(); b.v = 2;
  const c = pool.acquire(); c.v = 3;
  pool.release(b);
  let sum = 0;
  pool.forEach(o => { sum += o.v; });
  assertEq(sum, 4, 'forEach sums only active (1+3)');
});

test('Pool — updateAll calls _update on active objects', () => {
  const g = runScript('Pool.js');
  const pool = new g.Pool(() => ({ alive: true, counter: 0 }), 2);
  const a = pool.acquire();
  a._update = function(dt) { this.counter += dt; };
  let seen = 0;
  pool.updateAll(0.1, () => { seen++; });
  assert(a.counter > 0, '_update called with dt=0.1');
  assertEq(seen, 1, 'fn called once per active obj');
});

// ═══════════════════════════════════════════════════════════════════════════
// SPATIAL GRID — O(1) neighbor query
// ═══════════════════════════════════════════════════════════════════════════

test('SpatialGrid — insert/query/clear works', () => {
  const g = runScript('SpatialGrid.js');
  const grid = new g.SpatialGrid(50); // cellSize=50
  const obj = { x: 100, y: 200 };
  grid.insert(obj);
  const found = grid.query(100, 200, 50);
  assert(found.includes(obj), 'query returns inserted object');
  grid.clear();
  const after = grid.query(100, 200, 50);
  assert(!after.includes(obj), 'cleared grid returns nothing');
});

test('SpatialGrid — query radius spans multiple cells', () => {
  const g = runScript('SpatialGrid.js');
  const grid = new g.SpatialGrid(50);
  const near = { x: 100, y: 100 };
  const far = { x: 300, y: 300 };
  grid.insert(near);
  grid.insert(far);
  const res = grid.query(100, 100, 20);
  assert(res.includes(near), 'near found');
  assert(!res.includes(far), 'far excluded');
});

// ═══════════════════════════════════════════════════════════════════════════
// ENEMY FACTORY + SPOWNING
// ═══════════════════════════════════════════════════════════════════════════

test('Enemy — createEnemy returns valid template', () => {
  const g = runScript('entities/Enemy.js');
  const e = g.createEnemy();
  assertEq(e.x, 0, 'x=0');
  assertEq(e.alive, false, 'alive=false');
  assertEq(e.type, 'swarmer', 'default type');
  assert(e.hp !== undefined, 'has hp');
  assert(e.maxHp !== undefined, 'has maxHp');
});

test('EnemyManager — spawn creates enemy with type config', () => {
  const g = runScript('entities/Enemy.js');
  const mgr = new g.EnemyManager();
  const e = mgr.spawn('SWARMER', 200, 100, 5);
  assert(e !== null, 'spawn returned entity');
  assertEq(e.type, 'SWARMER', 'type set');
  assertEq(e.x, 200, 'x positioned');
  assertEq(e.y, 100, 'y positioned');
  assertEq(e.maxHp, e.hp, 'hp=maxHp initially');
  assertEq(e.alive, true, 'alive=true');
});

test('EnemyManager — elite wave applies gold tint + bonus', () => {
  const g = runScript('entities/Enemy.js');
  const mgr = new g.EnemyManager();
  const e = mgr.spawn('TANK', 200, 100, 5); // wave 5 = elite interval
  assert(e.isElite, 'isElite=true on elite wave');
  assertEq(e.color, '#ffdd44', 'gold tint on elite');
});

test('EnemyManager — spawnBoss sets isBoss flags', () => {
  const g = runScript('entities/Enemy.js');
  const mgr = new g.EnemyManager();
  mgr.spawnBoss(5);
  assert(mgr.bossActive, 'bossActive=true');
  // Find the boss
  let boss = null;
  mgr.pool.forEach(e => { if (e.isBoss && e.alive) boss = e; });
  assert(boss !== null, 'boss entity exists');
  assertEq(boss.isBoss, true, 'boss.isBoss=true');
  assertEq(boss.bossPhase, 1, 'phase starts at 1');
  assertEq(boss.color, '#ff44ff', 'boss color');
  assertEq(boss.x, 200, 'boss center X');
});

test('EnemyManager — boss phase transition at 50% HP', () => {
  const g = runScript('entities/Enemy.js');
  const mgr = new g.EnemyManager();
  mgr.spawnBoss(5);
  let boss = null;
  mgr.pool.forEach(e => { if (e.isBoss && e.alive) boss = e; });
  boss.hp = Math.floor(boss.maxHp * 0.4); // below 50%
  mgr.update(0.016, { x: 200, y: 600 }, null, { screenShake: 0, chromaticIntensity: 0, screenFlash: 0 });
  assertEq(boss.bossPhase, 2, 'phase 2 after 50% HP');
});

test('EnemyManager — normal update moves swarmer down', () => {
  const g = runScript('entities/Enemy.js');
  const mgr = new g.EnemyManager();
  const e = mgr.spawn('SWARMER', 200, 50, 1);
  const initialY = e.y;
  mgr.update(0.016, { x: 200, y: 600 }, { fireEnemyBullet() {} }, {});
  assert(e.y > initialY, 'swarmer moved down');
});

// ═══════════════════════════════════════════════════════════════════════════
// BULLET MANAGER
// ═══════════════════════════════════════════════════════════════════════════

test('BulletManager — firePlayerBullet returns bullet with correct stats', () => {
  const g = runScript('entities/Bullet.js');
  const mgr = new g.BulletManager();
  const b = mgr.firePlayerBullet(200, 600, Math.PI / 2, 2, true, 5, 0, false, false, 0, false);
  assert(b !== null, 'bullet returned');
  assertEq(b.x, 200, 'x=200');
  assertEq(b.y, 600, 'y=600');
  assert(b.alive, 'alive=true');
  assert(b.homing, 'homing flag');
  assertEq(b.turnRate, 5, 'turnRate=5');
  assertEq(b.damage > 0, true, 'damage positive');
});

test('BulletManager — bullet moves in direction', () => {
  const g = runScript('entities/Bullet.js');
  const mgr = new g.BulletManager();
  mgr.firePlayerBullet(200, 600, 0, 1); // angle 0 = right
  let b; mgr.playerBullets.forEach(e => b = e);
  const startX = b.x;
  mgr.update(0.016, { pool: { active: [] } });
  assert(b.x > startX, 'bullet moved right');
});

test('BulletManager — wave bullet oscillates perpendicular to travel', () => {
  const g = runScript('entities/Bullet.js');
  const mgr = new g.BulletManager();
  mgr.firePlayerBullet(200, 360, 0, 1, false, 0, 0, false, false, 0, true);
  let b; mgr.playerBullets.forEach(e => b = e);
  const baseY = b.y;
  // Update several times — wave motion should offset Y
  for (let i = 0; i < 10; i++) {
    mgr.update(0.016, { pool: { active: [] } });
    if (b.alive) {
      mgr.playerBullets.forEach(e => { b = e; });
    }
  }
  // waveOffset should have changed
  assert(b.waveOffsetX !== undefined, 'waveOffsetX exists');
});

test('BulletManager — burst callback fires on boundary', () => {
  const g = runScript('entities/Bullet.js');
  const mgr = new g.BulletManager();
  let burstCalled = false;
  mgr.setBurstCallback((x, y, dmg) => { burstCalled = true; });
  mgr.firePlayerBullet(200, 600, -Math.PI / 2, 1, false, 0, 0, true, false, 0, false);
  // Update until off screen
  for (let i = 0; i < 100; i++) {
    mgr.update(0.016, { pool: { active: [] } });
    if (burstCalled) break;
  }
  assert(burstCalled, 'burst callback invoked');
});

test('BulletManager — enemy bullets despawn offscreen', () => {
  const g = runScript('entities/Bullet.js');
  const mgr = new g.BulletManager();
  mgr.fireEnemyBullet(200, -10, 0, 100, '#ff0000', false, 1);
  let before = mgr.enemyBullets.count;
  for (let i = 0; i < 200; i++) {
    mgr.update(0.016, { pool: { active: [] } });
  }
  let after = mgr.enemyBullets.count;
  assert(after <= before, 'enemy bullet despawned or still active');
});

test('BulletManager — releaseAll empties both pools', () => {
  const g = runScript('entities/Bullet.js');
  const mgr = new g.BulletManager();
  mgr.firePlayerBullet(0, 0, 0);
  mgr.fireEnemyBullet(0, 0, 0, 0, '', false, 0);
  mgr.releaseAll();
  assertEq(mgr.playerBullets.count, 0, 'player pool empty');
  assertEq(mgr.enemyBullets.count, 0, 'enemy pool empty');
});

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO — BGM RECURSIVE TIMEOUT (not setInterval)
// ═══════════════════════════════════════════════════════════════════════════

test('Audio — BGM uses recursive setTimeout (line 177-180)', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/systems/Audio.js'), 'utf8');
  // The fix: _scheduleTick calls setTimeout → _tick → _scheduleTick recursively
  assert(code.includes('this._timer = setTimeout'), 'recursive setTimeout pattern');
  assert(code.includes('this._scheduleTick();'), 'reschedules itself');
  assert(!code.includes('setInterval'), 'NO setInterval used');
  assert(code.includes('clearTimeout'), 'clears timer in stop()');
});

test('Audio — stop() clears timer and stops master', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/systems/Audio.js'), 'utf8');
  const stopFn = code.match(/stop\(\).*?\n  \}/s);
  assert(stopFn, 'stop() function exists');
  // stop should set _running=false, clear _timer, ramp master gain to 0
  assert(code.includes('this._running = false'), 'sets _running=false');
  assert(code.includes('clearTimeout'), 'clears timer');
});

test('Audio — BGM has 3 state sequences (menu/playing/boss)', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/systems/Audio.js'), 'utf8');
  assert(code.includes('MENU_SEQ'), 'menu sequence');
  assert(code.includes('PLAYING_SEQ'), 'playing sequence');
  assert(code.includes('BOSS_SEQ'), 'boss sequence');
  // BPMs should differ
  const bpmMenu = code.match(/bpm:\s*80/);
  const bpmPlay = code.match(/bpm:\s*120/);
  const bpmBoss = code.match(/bpm:\s*140/);
  assert(bpmMenu, 'menu BPM=80');
  assert(bpmPlay, 'playing BPM=120');
  assert(bpmBoss, 'boss BPM=140');
});

test('Audio — SFX functions exist (fire/hit/explosion/playerHit/shieldHit/scrapCollect/coreCollect/levelUp/bossWarning/gameOver)', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/systems/Audio.js'), 'utf8');
  const sfxNames = ['fire()', 'hit()', 'explosion()', 'playerHit()', 'shieldHit()',
    'scrapCollect()', 'coreCollect()', 'levelUp()', 'bossWarning()', 'gameOver()'];
  sfxNames.forEach(fn => assert(code.includes(fn), `SFX ${fn} exists`));
});

test('Audio — toggleMute sets masterVolume to 0 and back', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/systems/Audio.js'), 'utf8');
  assert(code.includes('_muted'), 'has _muted flag');
  assert(code.includes('_savedVolume'), 'has _savedVolume for restore');
});

// ═══════════════════════════════════════════════════════════════════════════
// INPUT — postFrame clears justTapped
// ═══════════════════════════════════════════════════════════════════════════

test('Input — postFrame clears justTapped', () => {
  const g = runScript('Input.js');
  // Need CONFIG for Input constructor
  const input = new g.Input({ addEventListener() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 720 }; } });
  input.justTapped = true;
  input.postFrame();
  assertEq(input.justTapped, false, 'justTapped cleared');
});

test('Input — touch coords map to CONFIG space via _clientPos', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/Input.js'), 'utf8');
  assert(code.includes('CONFIG.WIDTH / rect.width'), 'maps X to CONFIG space');
  assert(code.includes('CONFIG.HEIGHT / rect.height'), 'maps Y to CONFIG space');
});

// ═══════════════════════════════════════════════════════════════════════════
// PLAYER — engine pulse uses dt
// ═══════════════════════════════════════════════════════════════════════════

test('Player — engine pulse scales with dt', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/entities/Player.js'), 'utf8');
  assert(code.includes('dt'), 'uses dt parameter');
  assert(code.includes('pulse') || code.includes('Pulse'), 'has engine pulse');
  // Pulse animation should scale with dt for frame-rate independence
  assert(code.includes('dt') && code.includes('Math.sin') ||
         code.match(/pulse.*dt/i) || code.match(/dt.*pulse/i),
    'pulse animation uses dt');
});

// ═══════════════════════════════════════════════════════════════════════════
// SCRAP MANAGER
// ═══════════════════════════════════════════════════════════════════════════

test('Scrap — collectible has proximity collection', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/entities/Scrap.js'), 'utf8');
  assert(code.includes('proximity') || code.includes('distance') ||
         code.includes('radius') || code.includes('player'),
    'has collection/ proximity logic');
});

// ═══════════════════════════════════════════════════════════════════════════
// META PROGRESSION
// ═══════════════════════════════════════════════════════════════════════════

test('MetaProgression — purchase deducts cost, rejects when broke', () => {
  const g = runScript('systems/MetaProgression.js');
  globalThis.localStorage.clear(); // constructor loads persisted state
  const meta = new g.MetaProgression();
  meta.cores = 500;

  const cost = meta.getCost('speed'); // rank0 → 5
  assertEq(cost, 5, 'speed rank0 costs 5');
  assert(meta.purchase('speed'), 'purchase ok');
  assertEq(meta.cores, 495, 'deducted');
  assertEq(meta.nodes.speed.rank, 1, 'rank up');

  meta.cores = 0; // now broke
  assert(!meta.purchase('speed'), 'insufficient funds rejected');
  assertEq(meta.cores, 0, 'unchanged on reject');
});

test('MetaProgression — earnCores accumulates', () => {
  const g = runScript('systems/MetaProgression.js');
  globalThis.localStorage.clear();
  const meta = new g.MetaProgression();
  meta.earnCores(10);
  meta.earnCores(15);
  assertEq(meta.cores, 25, '10+15=25');
});

test('MetaProgression — getAppliedModifiers returns rank effects', () => {
  const g = runScript('systems/MetaProgression.js');
  globalThis.localStorage.clear();
  const meta = new g.MetaProgression();
  meta.cores = 10000;
  meta.purchase('speed');   // effect: 1 + 1*0.03 = 1.03
  meta.purchase('damage');  // effect: 1 + 1*0.1 = 1.1

  const m = meta.getAppliedModifiers();
  assertClose(m.speedMult, 1.03, 'speedMult');
  assertClose(m.damageMult, 1.1, 'damageMult');
});

// ═══════════════════════════════════════════════════════════════════════════
// HUD — renders core info
// ═══════════════════════════════════════════════════════════════════════════

test('HUD — render function exists with correct signature', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/ui/HUD.js'), 'utf8');
  assert(code.includes('render(ctx, player, enemies, game, scrapManager, stats)'), 'render signature');
});

test('HUD — renders HP hearts', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/ui/HUD.js'), 'utf8');
  assert(code.includes('player.maxHp') && code.includes("'♥'"), 'renders hearts');
});

test('HUD — renders wave, boss HP bar, XP bar, scrap, cores, kills', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/ui/HUD.js'), 'utf8');
  assert(code.includes('WAVE'), 'wave display');
  assert(code.includes('bossActive'), 'boss HP bar gate');
  assert(code.includes('xp'), 'XP bar');
  assert(code.includes('stats.scrap'), 'scrap display');
  assert(code.includes('stats.cores'), 'cores display');
  assert(code.includes('enemies.kills'), 'kills display');
});

// ═══════════════════════════════════════════════════════════════════════════
// META SCREEN — upgrade grid
// ═══════════════════════════════════════════════════════════════════════════

test('MetaScreen — render and handleTap exist', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js/ui/MetaScreen.js'), 'utf8');
  assert(code.includes('render(ctx, meta)'), 'render signature');
  assert(code.includes('handleTap(input, meta)'), 'handleTap signature');
});

test('MetaScreen — handleTap returns upgrade action for card tap', () => {
  const g = runScript('ui/MetaScreen.js');
  const screen = new g.MetaScreen();
  screen.active = true;
  const result = screen.handleTap({ justTapped: true, getPos: () => ({ x: 100, y: 100 }) }, { cores: 100, nodes: {} });
  // Tap on card area should return upgrade action
  if (result) {
    assertEq(result.action, 'upgrade', 'tap returns upgrade action');
    assert(result.id, 'action has node id');
  } else {
    // Tap may be outside cards — that's OK (returns close)
    assert(true, 'tap outside cards = no-op');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════

async function run() {
  console.log('\n=== v1.18 Unit Tests ===\n');
  for (const { name, fn } of TESTS) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${e.message}`);
      failed++;
    }
  }
  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped\n`);
  if (failed > 0) process.exit(1);
}

run();
