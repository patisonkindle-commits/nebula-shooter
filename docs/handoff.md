# Nebula v2 — Handoff (2026-08-09)

## State at handoff
- **Branch**: `v2` (off `android-playstore`)
- **Plan**: Phase 4.7 Balance Tuning — **COMPLETED**
- **Last commit**: `95713b1` — Phase 4.7: Boss Rush timer, score multiplier, classic boss restriction, balance tuning

## Phase 4.7 Status
### Completed
- ✅ Enemy composition fix — use `enemyTypes` from `modes.js`, remove hardcoded list
- ✅ Ship HP values — fixed from 4000/4000/5000/7000 to 3/2/4/6 (v1 parity)
- ✅ Hull upgrade scaling — +1 HP per level (v1 parity)
- ✅ Boss Rush timer — 30s countdown per wave, gameover on expiry, resets on boss kill
- ✅ Boss Rush score multiplier — 1.5x applied in `_onEnemyKilled`
- ✅ Classic boss wave restriction — wave 10 only (1 boss max), no 5/15/20/25
- ✅ Balance pass — UMBRA hpMult 3.5→2.0, timer 20→30s (wave 25 killable ~28s)
- ✅ Browser playtest — all verified live (timer gameover, multiplier math, boss restriction)
- ✅ Git commit + push — 95713b1 pushed to origin/v2

### Bug Fixes in 4.7
- **Timer not wired** — `modes.js:32` `bossTimerPerWave: 20` unused → now used in `_updateWaves`, gameover at 0
- **Score multiplier undefined** — `initialModeState` returned mode without `scoreMult` → set in `startGame` from `rules.scoreMult`
- **Classic bossWaves fallback** — classic missing `bossWaves` + `enemiesPerWave` → fell back to `CONFIG.BOSS_WAVES = [5,10,15,20,25]` (5 bosses) → fixed in modes.js
- **BossRush bossSpawnedThisWave blocked** — `_startNextWave` line 765: `rules.bossWave === null` forced `bossSpawnedThisWave = true` → blocked timer init AND boss spawn. Fixed: check both `bossWave` and `bossWaves` list existence.
- **HUD timer display** — added pulsing countdown (orange 30-5s, red 5-0s) top-center when active

## Known Issues (Resolved in 4.7)
1. ~~**Boss Rush timer not implemented**~~ — ✅ Now 30s countdown with gameover on expiry
2. ~~**Boss Rush score multiplier**~~ — ✅ 1.5x applied in `_onEnemyKilled`
3. ~~**Classic boss waves**~~ — ✅ Restricted to wave 10 only (1 boss max)
4. ~~**Enemy composition**~~ — ✅ Use `enemyTypes` from `modes.js` per mode
5. ~~**Ship HP mismatch**~~ — ✅ Fixed to 3/2/4/6
6. ~~**Hull upgrade**~~ — ✅ +1 per level
7. **BossRush bossSpawnedThisWave blocked** — ✅ Fixed: `_startNextWave` now checks both `bossWave` and `bossWaves` list

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
│   └── HUD.js (6k) — health/score/wave/timer displays
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
| `js/v2/ui/HUD.js` | 6k | health/score/wave/timer displays (updated 4.7) |

## Browser Test Notes
- Served via `python3 -m http.server 8000` in `/home/patison/nebula-shooter`
- `window.__game` exposed globally
- State transitions: `game.state` (menu → modeselect → playing → gameover)
- ModeSelect: `buttonRects` array, `handleTap(mx,my)` → returns `{action: 'start'|'back', id}`
- Boss rush spawn at wave 5: KolossLite, 94 HP, `bossActive=true`
- All unlock flags: `unlocked_boss10Killed`, `unlocked_boss20Killed`, `unlocked_wave15`
- Timer display: pulsing orange 30-5s, red 5-0s, top-center
- BossRush score 1.5x verified: boss score 500 → 750 per kill

## What's Next (Post-4.7)
1. **Boss Rush mode polish** — mode title screen, victory effect on wave 25
2. **Challenge mode polish** — mode title screen, win condition on score target
3. **Endless mode polish** — mode title screen, infinite waves with scaling
4. **Visual polish** — ship upgrades, death effects, level-up glow
5. **Audio polish** — mode-specific BGM, upgrade SFX, boss theme
6. **Mobile touch** — tap to move, auto-fire, gesture menu
7. **Performance** — spatial grid for collision, object pooling
8. **Content expansion** — ship variants, weapon types, boss abilities
9. **Leaderboard** — local hs, shareable scores, online if needed
10. **Game feel** — hitstop, particles, screen-shake, music sync

## Commit History (Last 5)
```
95713b1 Phase 4.7: Boss Rush timer, score multiplier, classic boss restriction, balance tuning
0235584 v2: balance — ships HP 3/2/4/6, hull +1/level, player dmg matches enemy 1
18f9326 v2: fix enemy composition — use enemyTypes from modes.js per mode, remove hardcoded wave gates (BossRush no grunts)
154ba26 docs: add handoff.md — module inventory, game flow, bug list, next steps
74a9f6d modes.js: add 4-mode definitions + unlock gating
5d276f1 feat(v2): 4 themed sectors with bg transition
```
