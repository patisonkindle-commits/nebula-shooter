# Nebula v2 — Handoff (2026-08-09)

## State at handoff
- **Branch**: `v2` (off `android-playstore`)
- **Plan**: Phase 4.7 Balance Tuning in progress
- **Last commit**: `0235584` — v2: balance — ships HP 3/2/4/6, hull +1/level

## Phase 4.7 Status
### Completed
- ✅ Enemy composition fix — use `enemyTypes` from `modes.js`, remove hardcoded list
- ✅ Ship HP values — fixed from 4000/4000/5000/7000 to 3/2/4/6 (v1 parity)
- ✅ Hull upgrade scaling — +1 HP per level (v1 parity)

### In Progress (tool call budget hit)
- ❌ Boss Rush timer (20s countdown) — `bossTimerPerWave: 20` in `modes.js:32` unused
- ❌ Boss Rush 2x score multiplier — per plan spec
- ❌ Classic boss wave restriction — `Game.js:783` still uses `CONFIG.BOSS_WAVES`
- ❌ Balance pass (HP scaling, score curves)

## Known Issues
1. **Boss Rush timer not implemented** — `modes.js:32` defines `bossTimerPerWave: 20` but Game.js doesn't use it
2. **Boss Rush score multiplier** — `scoreMult: 1.5` in modes.js not applied to `this.score`
3. **Classic boss waves** — `CONFIG.BOSS_WAVES = [5, 10, 15, 20, 25]` spawns 5 bosses; plan says wave 10 only
4. **Enemy composition** — `_spawnEnemy()` hardcoded list; should use `this.mode.rules.enemyTypes`
5. **Ship HP mismatch** — ships.js had 4000/4000/5000/7000 HP (fixed to 3/2/4/6)
6. **Hull upgrade** — +5 HP per level (fixed to +1)

## Module Inventory (34 files)
```
js/v2/
├── core/
│   ├── Game.js (14k) — engine loop + modes + score + meta-progression
│   ├── GameLoop.js (3k) — requestAnimationFrame, delta
│   ├── SpatialGrid.js (5k) — quad-tree collision
│   ├── config.js (13k) — CONFIG, all constants
│   ├── modes.js (12k) — 4 mode defs: classic/bossRush/endless/challenge
│   └── Weapon.js (7k) — Weapon.update/draw, bulletPool
├── ui/
│   ├── ModeSelect.js (4k) — 4 buttons, unlock gating, per-mode hs
│   ├── GameOverUI.js (3k) — handleTap → startGame
│   ├── Menu.js (15k) — updateHover, handleTap, render, startGame
│   └── HUD.js (6k) — health/score/wave displays
├── systems/
│   ├── MetaProgression.js (11k) — earnCores, levelUp, save/load
│   ├── SaveManager.js (1k) — localStorage, get/set/remove
│   ├── Score.js (4k) — updateScore, calculateScore
│   └── Health.js (7k) — updateHealth, takeDamage
├── entities/
│   ├── Player.js (17k) — update/draw, weapon system, 3 ship types
│   ├── Enemy.js (8k) — 6 enemy types, 3 boss variants
│   ├── Boss.js (7k) — boss-specific behavior
│   └── ships.js (1k) — 4 ship archetypes (vanguard/interceptor/pulsar/juggernaut)
├── effects/
│   ├── Particles.js (6k) — create/update/draw
│   ├── ScreenShake.js (3k) — shake(intensity, duration)
│   └── DamageNumbers.js (4k) — damage popups
├── audio/
│   ├── Music.js (6k) — BGM playlist
│   └── SFX.js (2k) — SFX playback
├── stars/
│   ├── StarField.js (5k) — parallax starfield
│   └── sector/ (4 themed variants)
└── main.js (7k) — entry, boots Game, window.__game
```

## Game Flow
1. `new Game(canvas, ctx)` in main.js
2. `game.init()` — creates spatial grid, meta progression, saves
3. `game.start()` — state='menu' → Menu renders
4. Menu.handleTap → `game.state='modeselect'` → ModeSelect renders
5. ModeSelect.handleTap → `game.startGame(modeId)` → state='playing'
6. `_startNextWave()` → sets `enemiesThisWave`, `spawnInterval`, `bossSpawnedThisWave`
7. `update()` loop: `_updateEnemies()`, `_updatePlayer()`, `_updateProjectiles()`, `_updateParticles()`
8. `_updateEnemies()` spawns grunts, checks boss spawn, handles collisions
9. Player dies → state='gameover' → GameOverUI renders
10. GameOverUI.handleTap → restart same mode

## Key Files — Quick Read
| File | Size | Purpose |
|------|------|---------|
| `js/v2/main.js` | 7k | Entry — boots `new Game()`, sets `window.__game` |
| `js/v2/core/Game.js` | 14k | `init()` → `startGame(mode)` → `_startNextWave()` → `update()` 60fps → `_render()` |
| `js/v2/core/modes.js` | 12k | Mode definitions (rules, enemyTypes, bossWaves, victory conditions) |
| `js/v2/core/GameLoop.js` | 3k | `requestAnimationFrame` loop, `deltaTime` |
| `js/v2/core/config.js` | 13k | All constants — `CONFIG.WIDTH/HEIGHT`, `CONFIG.BOSS_WAVES`, `CONFIG.ENEMIES_PER_WAVE` |
| `js/v2/core/Weapon.js` | 7k | `Weapon.update(dt, player)`, `Weapon.draw(ctx, player)` |
| `js/v2/entities/Player.js` | 17k | `Player.update(dt)`, `Player.draw(ctx)`, weapon system |
| `js/v2/entities/Enemy.js` | 8k | 6 enemy types, 3 boss variants |
| `js/v2/ui/Menu.js` | 15k | Main menu, hover, tap handling |
| `js/v2/ui/ModeSelect.js` | 4k | 4 buttons, unlock gating, per-mode hs |
| `js/v2/systems/MetaProgression.js` | 11k | `earnCores(amount)`, `levelUp()`, save/load |

## Browser Test Notes
- Served via `python3 -m http.server 8000` in `/home/patison/nebula-shooter`
- `window.__game` exposed globally
- State transitions: `game.state` (menu → modeselect → playing → gameover)
- ModeSelect: `buttonRects` array, `handleTap(mx,my)` → returns `{action: 'start'|'back', id}`
- Boss rush spawn at wave 5: KolossLite, 94 HP, `bossActive=true`
- All unlock flags: `unlocked_boss10Killed`, `unlocked_boss20Killed`, `unlocked_wave15`

## What's Next
1. **Boss Rush timer** — 20s countdown per wave (use `bossTimerPerWave` from modes.js)
2. **Boss Rush score multiplier** — 2x per boss defeated
3. **Classic boss waves** — restrict to wave 10 only (remove wave 5/15/20/25)
4. **Balance pass** — HP scaling, score curves, enemy tuning
5. **Visual polish** — mode-specific title screens, victory effects

## Commit History (Last 5)
```
0235584 v2: balance — ships HP 3/2/4/6, hull +1/level, player dmg matches enemy 1
18f9326 v2: fix enemy composition — use enemyTypes from modes.js per mode, remove hardcoded wave gates (BossRush no grunts)
154ba26 docs: add handoff.md — module inventory, game flow, bug list, next steps
74a9f6d modes.js: add 4-mode definitions + unlock gating
5d276f1 feat(v2): 4 themed sectors with bg transition
```
