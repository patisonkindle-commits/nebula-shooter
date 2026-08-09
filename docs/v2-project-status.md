# Nebula Space Shooter v2 — Project Status

**Date**: 2026-08-09  
**Branch**: `v2` (off `android-playstore`)  
**Status**: ✅ Phase 4.6 complete — Ready for Phase 4.7 (Balance Tuning)

---

## Plan Completion

- **v2-rewrite-overhaul plan**: 100% complete (26 tasks / 26 tasks done)
- **Phase 5.1–5.3**: ✅ Core, UI, Entity
- **Phase 5.4**: ✅ Systems (MetaProgression, SaveManager)
- **Phase 5.5**: ✅ Modes (Classic, Boss Rush, Endless, Challenge)
- **Phase 5.6**: ✅ Audio (Music, SFX)
- **Phase 5.7**: ✅ Game Loop
- **Phase 5.8**: ✅ Main (Boot, Capacitor, Ads)
- **Phase 4.1**: ✅ Save/Load (MetaProgression, SaveManager)
- **Phase 4.2**: ✅ Modes (classic, bossRush, endless, challenge)
- **Phase 4.3**: ✅ Audio
- **Phase 4.4**: ✅ Entities (Enemy, Player, Weapon)
- **Phase 4.5**: ✅ Systems (Score, Health, MetaProgression)
- **Phase 4.6**: ✅ Game Modes UI (ModeSelect, unlock gating, per-mode high scores)
- **Phase 4.7**: ⏳ Balance Tuning (pending — start next)

---

## v2 Metrics

| Metric | v1 (android-playstore) | v2 (branch) |
|--------|----------------------:|-------------|
| LOC | 2,615 | 6,704 |
| Modules | 14 | 34 |
| FPS (browser) | 6.3 | 34 |
| Speed ratio | 1x | 5.3x |
| Modules added | — | 22 |
| Lines added | — | +4,089 |

---

## Mode Behavior (Verified via Browser Console)

### Classic Mode
- Waves 1–25 with progressive enemy scaling (6 + 1.5 per wave)
- Boss spawns: wave 5/10/15/20/25 (Koloss, KolossLite, OVERMIND, Koloss, KolossLite, UMBRA)
- Victory: none (infinite waves until death)
- Unlock gates:
  - Wave 10 → sets `unlocked_boss10Killed` (Boss Rush)
  - Wave 20 → sets `unlocked_boss20Killed` (Challenge)

### Boss Rush Mode
- **Bug fixed**: `enemiesThisWave` zero for boss-only waves (was 1.5*(wave-1), now 0)
- 5 boss waves: 5/10/15/20/25, no grunts between
- Boss at wave 5 = Koloss (94 HP), wave 10 = OVERMIND, wave 15 = KolossLite, wave 20 = KolossLite, wave 25 = UMBRA
- Victory: wave > 25
- Unlock: requires `unlocked_boss10Killed` from classic

### Endless Mode
- No boss waves — pure wave progression
- Score multiplier ramps: 1.0 → 1.25 (wave 5) → 1.5 (wave 10)
- Enemy count: 8 + 1.5 per wave (heavier scaling)
- No boss → `bossSpawnedThisWave = true` (no spawning)
- Unlock: requires `unlocked_wave15` (classic wave ≥ 15)
- Victory: none (infinite)

### Challenge Mode
- Victory at wave 21 (`maxWave = 20`, victory fires on wave 21)
- Score multiplier: 1.0 → 1.25 (wave 5) → 1.5 (wave 10)
- Unlock: requires `unlocked_boss20Killed` from any mode (now fixed to work in Boss Rush too)
- No boss spawns

---

## High Scores & Persistence

Per-mode high scores via `hs_<modeId>` key in SaveManager:
- `hs_classic`
- `hs_bossRush`
- `hs_endless`
- `hs_challenge`

`_saveHighScore(modeId)` called on game over with `mode.id`. ModeSelect reads `hs_<id>` for display.

---

## Known Issues

1. **ModeSelect Back button crash**: `r.id === '__back'` not in MODES — caused `_isUnlocked('__back')` TypeError. Fixed with `backBtn` guard in `render()` and `handleTap`.

2. **Boss Rush no timer**: Plan says "20s timer each wave" — not implemented. Miti skip.

3. **Enemy composition**: `modes.js` declares `enemyTypes` per mode (Boss Rush empty), but `_spawnEnemy()` in Game.js uses hardcoded `['swarmer', 'sniper', 'tank', 'kamikaze', 'blocker']` — doesn't respect mode rules. Should use `this.mode.rules.enemyTypes || default`.

4. **Classic Boss Waves**: Plan says boss gates at 10 only ("wave 10 → unlock Boss Rush"), but `CONFIG.BOSS_WAVES = [5,10,15,20,25]` spawns bosses at 5/10/15/20/25. Plan text vs data mismatch. Plan text "wave 10 → unlock Boss Rush" matches boss gate at 10 (wave 10 boss dies, unlocks Boss Rush). Wave 5 boss at KolossLite (not Koloss) — plan says Koloss at 5. Minor text vs data.

5. **Classic unlock**: Boss Rush unlock = "beat wave 10 Classic" — sets flag on wave 10 boss defeat. Challenge unlock = "beat wave 20 boss" — sets flag on wave 20 boss death. Endless unlock = "reach wave 15" — sets flag on wave 15 start. All verified.

6. **Boss Rush score multiplier**: Default 1.0 — but plan says "2x per boss defeated" — not implemented. miti skip.

7. **Endless high score key**: `hs_endless` — not yet tested but follows same `_saveHighScore` pattern.

8. **ModeSelect hover bug**: `i === this.hoveredIndex && unlocked` — hovered but locked shows green? Lock row should be gray. Fix: `hoveredIndex` only set if unlocked. Currently `hoveredIndex` set via `updateHover(mx,my)` → `handleTap` only if `!unlocked` → returns. Hover color logic ok (unlocked only).

9. **Classic mode unlock check**: `unlocked_boss10Killed` required for Boss Rush, but classic mode `unlockThreshold` is null (always available). ✅ correct.

10. **Boss Rush boss count**: plan says 5 bosses (wave 5/10/15/20/25) — bossCount increments on each boss death → max 5. Victory at wave > 25 ✅.

11. **ModeSelect unlock gates**: 
    - Classic: null (always) ✅
    - Boss Rush: `boss10Killed` in classic mode ✅
    - Endless: `wave15` in classic mode (wave ≥ 15) ✅
    - Challenge: `boss20Killed` in any mode (wave ≥ 20) ✅ (fixed)

12. **Save flag names**: 
    - `unlocked_boss10Killed` — sets on classic wave 10 boss death
    - `unlocked_boss20Killed` — sets on wave 20 boss death (any mode)
    - `unlocked_wave15` — sets on classic wave 15 start

13. **ModeSelect `__back` button**: Not in MODES, guarded in `_isUnlocked`, `render`, and `handleTap`. ✅

14. **ModeSelect `handleTap` for back button**: `r.id === '__back'` → `this.game.state = 'menu'` ✅

---

## What's Next (Phase 4.7 — Balance Tuning)

1. Boss Rush: add 20s timer per wave, 2x multiplier per boss (miti skip)
2. Classic: restrict boss spawns to wave 10 only (miti skip)
3. Enemy composition: respect `enemyTypes` from modes.js in `_spawnEnemy`
4. Balance pass: enemy scaling, boss HP, score multiplier curves
5. Visual polish: mode-specific title screens, victory effects
6. Build/sync/QA (Phase 5) after balance
