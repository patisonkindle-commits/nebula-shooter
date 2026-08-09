# Nebula v2 — Handoff (2026-08-09)

## State at handoff
- **Branch**: `v2` (off `android-playstore`)
- **Plan**: 26/26 done — Phase 4.6 complete
- **Next phase**: 4.7 Balance Tuning
- **Last commit**: `74a9f6d` — `modes.js` + `ModeSelect.js` + project-status.md
- **Status doc**: `docs/v2-project-status.md`

## Module inventory (34 files)
```
js/v2/
├── core/
│   ├── Game.js (14k, engine loop + modes + score + meta-progression)
│   ├── GameLoop.js (requestAnimationFrame, delta)
│   ├── SpatialGrid.js (quad-tree, 5x5 grid, 3 levels)
│   ├── config.js (CONFIG, all constants — 659)
│   ├── modes.js (4 mode defs: classic/bossRush/endless/challenge)
│   └── Weapon.js
├── ui/
│   ├── ModeSelect.js (NEW — 4 buttons, unlock gating, per-mode hs)
│   ├── GameOverUI.js
│   ├── Menu.js
│   └── HUD.js
├── systems/
│   ├── MetaProgression.js
│   ├── SaveManager.js
│   ├── Score.js
│   └── Health.js
├── entities/
│   ├── Player.js
│   ├── Enemy.js (3 boss variants, 6 enemy types)
│   └── Boss.js
├── effects/
│   ├── Particles.js
│   ├── ScreenShake.js
│   └── DamageNumbers.js
├── audio/
│   ├── Music.js
│   └── SFX.js
├── stars/
│   ├── StarField.js
│   └── sector/ (4 themed starfield variants)
└── main.js (boot, Capacitor, ads)
```

## Key files — quick read guide

| File | Size | Purpose |
|------|------|---------|
| `js/v2/main.js` | 7k | Entry — boots `new Game()`, sets `window.__game` |
| `js/v2/core/Game.js` | 14k | `init()` → `startGame(mode)` → `_startNextWave()` → `update()` 60fps → `_render()` |
| `js/v2/core/GameLoop.js` | 3k | `requestAnimationFrame` loop, `deltaTime` |
| `js/v2/core/SpatialGrid.js` | 5k | Quad-tree collision, `tickSpatial(grid, game)` |
| `js/v2/core/config.js` | 13k | All constants — `CONFIG.WIDTH/HEIGHT`, `CONFIG.SCALE`, `CONFIG.BOSS_WAVES`, `CONFIG.ENEMIES_PER_WAVE`, `CONFIG.WEAPONS`, `CONFIG.BOMBS`, `CONFIG.META` |
| `js/v2/core/modes.js` | 12k | Mode definitions (rules, enemyTypes, bossWaves, victory conditions) |
| `js/v2/core/Weapon.js` | 7k | `Weapon.update(dt, player)`, `Weapon.draw(ctx, player)`, `Weapon.bulletPool` |
| `js/v2/ui/ModeSelect.js` | 4k | `buttonRects` (5 buttons), `_isUnlocked()`, `handleTap()`, `handleBack()` |
| `js/v2/ui/GameOverUI.js` | 3k | `handleTap()` → `startGame(mode)`, score display |
| `js/v2/ui/Menu.js` | 15k | `updateHover()`, `handleTap()`, `render()`, `startGame()` |
| `js/v2/systems/MetaProgression.js` | 11k | `earnCores(amount)`, `levelUp()`, save/load |
| `js/v2/systems/SaveManager.js` | 1k | localStorage, `get/set/remove` with try/catch |
| `js/v2/systems/Score.js` | 4k | `Score.updateScore(points)`, `Score.calculateScore()` |
| `js/v2/systems/Health.js` | 7k | `Health.updateHealth()`, `Health.takeDamage(damage)` |
| `js/v2/entities/Player.js` | 17k | `Player.update(dt)`, `Player.draw(ctx)`, weapon system, 3 ship types |
| `js/v2/entities/Enemy.js` | 8k | `Enemy.update(dt)`, 6 enemy types, 3 boss variants |
| `js/v2/entities/Boss.js` | 7k | Boss-specific behavior |
| `js/v2/effects/Particles.js` | 6k | `Particles.create()`, `Particles.update(dt)`, `Particles.draw(ctx)` |
| `js/v2/effects/ScreenShake.js` | 3k | `ScreenShake.shake(intensity, duration)` |
| `js/v2/effects/DamageNumbers.js` | 4k | Damage number popups |
| `js/v2/audio/Music.js` | 6k | BGM playlist |
| `js/v2/audio/SFX.js` | 2k | SFX playback |

## Game flow (from boot)
1. `new Game(canvas, ctx)` in main.js
2. `game.init()` — creates spatial grid, meta progression, saves
3. `game.start()` — state='menu' → Menu renders
4. Menu.handleTap → `game.state='modeselect'` → ModeSelect renders
5. ModeSelect.handleTap → `game.startGame(modeId)` → state='playing'
6. `_startNextWave()` → sets `enemiesThisWave`, `spawnInterval`, `bossSpawnedThisWave`
7. `update()` loop: `_updateEnemies()`, `_updatePlayer()`, `_updateProjectiles()`, `_updateParticles()`
8. `_updateEnemies()` spawns grunts, checks boss spawn, handles collisions
9. Player dies → state='gameover' → GameOverUI renders
10. GameOverUI.handleTap → restart same mode (not implemented for menu return — BUG?)

## Known bugs from Phase 4.6 work

1. **Menu → GameOver restart path**: `GameOverUI.handleTap` calls `game.startGame(mode.id)` but menu has no restart mode reference. Player dies → stuck at gameover screen, can only restart same mode via GameOverUI. No path to "play again" other than startGame.

2. **ModeSelect `__back` button**: Was crashing (`mode.name` null for back button). Fixed with `backBtn` guard in `ModeSelect.js` render + `handleTap` + `_isUnlocked`.

3. **Boss Rush `enemiesThisWave`**: Fixed — was `1.5*(wave-1)` → now 0 for boss-only rules.

4. **Enemy composition**: `modes.js` declares `enemyTypes` per mode (Boss Rush empty), but `Game._spawnEnemy()` uses hardcoded list `['swarmer','swarmer','swarmer','sniper','tank','kamikaze','blocker']`. Should use `this.mode.rules.enemyTypes || default`. Not implemented yet.

5. **Classic Boss Waves**: Plan says "wave 10 → unlock Boss Rush" but `CONFIG.BOSS_WAVES = [5,10,15,20,25]` spawns bosses at 5/10/15/20/25. Plan text vs data mismatch. Plan text "wave 10 → unlock Boss Rush" matches boss gate at 10 (wave 10 boss dies, unlocks Boss Rush). Wave 5 boss at KolossLite (not Koloss) — plan says Koloss at 5. Minor text vs data.

6. **Boss Rush score multiplier**: Default 1.0 — but plan says "2x per boss defeated" — not implemented. Skip.

7. **Endless high score key**: `hs_endless` — not yet tested but follows same `_saveHighScore` pattern.

8. **ModeSelect hover bug**: `i === this.hoveredIndex && unlocked` — hovered but locked shows green? Lock row should be gray. Fix: `hoveredIndex` only set if unlocked. Currently `hoveredIndex` set via `updateHover(mx,my)` → `handleTap` only if `!unlocked` → returns. Hover color logic ok (unlocked only).

## What's Next (Phase 4.7 — Balance Tuning)

1. Boss Rush: add 20s timer per wave, 2x multiplier per boss (miti skip)
2. Classic: restrict boss spawns to wave 10 only (miti skip)
3. Enemy composition: respect `enemyTypes` from modes.js in `_spawnEnemy`
4. Balance pass: enemy scaling, boss HP, score multiplier curves
5. Visual polish: mode-specific title screens, victory effects
6. Build/sync/QA (Phase 5) after balance

## Browser test notes
- Served via `python3 -m http.server 8000` in `/home/patison/nebula-shooter`
- `window.__game` exposed globally
- State transitions: `game.state` (menu → modeselect → playing → gameover)
- ModeSelect: `buttonRects` array, `handleTap(mx,my)` → returns `{action: 'start'|'back', id}` or null
- Boss rush spawn at wave 5 verified: KolossLite, 94 HP, `bossActive=true`
- All unlock flags verified: `unlocked_boss10Killed`, `unlocked_boss20Killed`, `unlocked_wave15`
