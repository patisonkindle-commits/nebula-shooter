# Nebula Shooter v2 — Balance Analysis & Plan
*2026-08-10*

## Current State (v2, all 5 phases done)

### Player
- HP: 3, Speed: 240, Fire rate: 0.14s, Damage: 1
- Hitbox: 4px (generous), Invincibility: 1.2s
- Base weapon: single blaster, ship-dependent override (pulsar→plasma, juggernaut→lance)

### Meta Progression (8 nodes)
- Hull +1 HP per rank (max +5 = 8 HP), Speed +10% (max +50%), Damage +20% (max +100%)
- Fire Rate -8%/rank (max -40%), Projectiles +1 layer (max 3 layers), Special +1 laser (max 3)
- Cores +10% (max +30%), Score +15% (max +45%)

### In-Game Upgrades (15 options)
- Damage: 1.3x per pick (stacks multiplicatively), Fire Rate: 0.75x per pick
- Spread (2→5→6 angles), Homing (max 1), Piercing (max 1, 2 hits), Burst (3→5→7)
- Ricochet (max 1, 2 bounces), Wave (max 1), Laser (max 3), Orbital (max 1)
- Shield +1 HP, Move Speed 1.2x, Magnet 1.4x, Plasma Chain, Gravity Well, Solar Flare

### Enemy Archetypes (base stats)
| Type       | HP | Speed | Score | Note                      |
|------------|----|-------|-------|---------------------------|
| Swarmer    | 1  | 120   | 10    | Standard                |
| Sniper     | 1  | 60    | 15    | Slow, evasive             |
| Tank       | 4  | 50    | 30    | Slow, high HP            |
| Kamikaze   | 2  | 180   | 20    | Fast, ram damage          |
| Blocker    | 3  | 40    | 25    | Slow, blocks path         |
| Vortex     | 5  | 55    | 45    | High HP, dangerous        |
| Minelayer  | 4  | 35    | 35    | Drops mines               |
| Warp       | 2  | 100   | 30    | Teleports                 |
| Shielder   | 4  | 40    | 40    | Shielded (3 HP shield)    |
| Disrupter  | 2  | 55    | 35    | Debuffs                   |
| Ripper     | 1  | 220   | 25    | Fastest, zigzag           |

### Boss
- HP: 60 (wave 5: 72), scales at 20% per wave
- Wave 20: 60 × 2.0 = 120 HP, Wave 25: 60 × 2.0 = 120 HP (capped at 2.0×)
- Damage: 2 per bullet
- Patterns: ring, cross, expanding, star arms, laser, spray, orbit

### Wave Scaling
- Enemy HP: 1 + (0.06 × wave) — wave 10: 1.6 HP, wave 25: 2.5 HP
- Enemy speed: +1.5%/wave (negligible)
- Enemies/wave: base + 1.5 × (wave-1) — wave 10: 21, wave 20: 36
- Spawn interval: 0.8 - 0.03×wave, min 0.25 → hits floor at wave 17
- Boss wave: ×1.5 enemies (so 30-54 for boss waves)
- Elite: +50% HP, ×2 score, +15% speed (every 5 waves)

### Modes
- Classic: standard, wave 10 boss, unlocks Boss Rush
- Boss Rush: 5 boss-only waves (5,10,15,20,25), 30s timer each, 1.5× score
- Endless: 8+ enemies/wave, no bosses, -25% score every 5 waves (stacking)
- Challenge: 20 waves escalating, no bosses, 2× score

---

## Identified Problems

### P0 — Game Over at Wave 10+ (Survivability)
- Player HP: 3, all enemy damage = 1. Player dies in 3 hits.
- Boss damage: 2. 2 hits = death. No room for error at any wave.
- Wave 10+ enemies: 21+ spawning every 0.5s (at ~0.5s), all converging on player.
- Meta progression requires ~500+ cores (hard to get mid-run).
- **Result**: Players die at wave 10-15 without meta upgrades. Boss rush impossible.

### P1 — Swarmers Dominate, Others Underused
- Swarmers appear in ALL 4 modes, weighted heavily in Classic.
- Tanks/Blockers/Vortex/Shielder appear only in endgame/Challenge/Endless.
- In Classic (waves 1-10): only Swarmer + Sniper + occasional Tank.
- Vortex/Shielder/Minelayer are powerful but rare — players never learn counterplay.

### P2 — Spawn Rate Spike at Wave 17
- `spawnInterval = 0.8 - 0.03 × wave`. Hits floor 0.25 at wave 17.
- Between wave 12 (0.44s) and 17 (0.25s), spawn rate nearly doubles.
- Enemies per wave also growing linearly (base + 1.5×wave).
- **Result**: Sudden difficulty cliff at wave 12-17.

### P3 — Upgrades Don't Scale Through Game
- Damage: 1.3x per pick. Max ~6-7 picks → 6× damage. Strong but late.
- Shield picks are the ONLY defensive upgrade. 1 shield = 1 extra hit.
- No health regen, no dodge, no armor. Player can only buy damage/speed.
- Laser at 2 HP/s is negligible vs wave-25 enemies at 2.5 HP.
- Orbital at 1 damage is useless against anything above wave 5.

### P4 — Boss Rush is Brutal
- 5 consecutive boss fights with 30s timer each.
- Wave 5 boss: 72 HP → kills in 0.2s if not fast enough.
- Wave 20 boss: 120 HP with 2 damage bullets + multiple patterns.
- No healing between fights. Score 1.5× but survival is the bottleneck.

### P5 — Challenge Mode Too Simple
- 20 waves, 2× score, but no special rules beyond enemy density.
- Just "more enemies, faster" — no unique mechanics or gates.
- Feels like Classic with worse multiplier.

---

## Balance Plan

### Fix 1: Player Survivability (P0)
**File**: `config.js`
```js
// Before:
PLAYER_MAX_HP: 3
PLAYER_INVINCIBLE_TIME: 1.2

// After:
PLAYER_MAX_HP: 4       // +1 base HP (more forgiving)
PLAYER_INVINCIBLE_TIME: 1.5   // +0.3s after-hit invincibility
```
**Rationale**: 4 HP + 1.5s invincibility = players can take 4 hits before dying, with 1.5s breathing room after each hit. Meta progression still matters but isn't required to survive wave 10.

### Fix 2: Enemy Archetype Weighting (P1)
**File**: `modes.js` — rebalance enemy pools per mode

Classic (waves 1-10):
- Remove: Tank, Vortex (too strong early)
- Add: Swarmer×3, Sniper×2, Minelayer×1
- Pool: `[swarmer, swarmer, swarmer, sniper, sniper, minelayer]`

Classic (waves 11-25):
- Add: Tank×2, Shielder×1, Blocker×1
- Pool: `[swarmer×2, sniper, tank, tank, shielder, blocker, minelayer, disrupter]`

Boss Rush:
- Only bosses (already correct)

Endless:
- All types, weighted toward danger
- Pool: `[swarmer×2, ripper, kamikaze, blocker, vortex, minelayer, warp, shielder, disrupter, ripper]`

Challenge:
- All types, heavy on aggressive
- Pool: `[swarmer×3, ripper, kamikaze×2, disrupter, warp, shielder, viper, ripple]`

### Fix 3: Wave Scaling Curve (P2)
**File**: `Game.js` `_startNextWave()` + `config.js`

Change spawn interval formula to logarithmic decay:
```js
// Before (linear):
this.spawnInterval = Math.max(0.25, base - wave * decay);

// After (logarithmic, gentler):
let decay = (rules ? rules.spawnIntervalDecay : 0.03);
let raw = (rules ? rules.spawnInterval : 0.8);
this.spawnInterval = Math.max(0.2, raw - decay * Math.log1p(wave) * 2);
```
At wave 1: 0.62s, wave 5: 0.48s, wave 10: 0.39s, wave 15: 0.33s, wave 20: 0.28s
Floor at 0.20s instead of 0.25s, but no sudden cliff.

Also: Cap enemies/wave growth to prevent screen flood:
```js
// Cap: max 40 enemies per wave
this.enemiesThisWave = Math.min(40, baseCount + (this.wave - 1) * 1.5);
```

### Fix 4: Upgrade Scaling (P3)
**Files**: `Game.js`, `Player.js`, `config.js`

#### a) Damage upgrade more impactful (single pick):
```js
// Game.js _applyUpgrade:
case 'damage': p.damageMultiplier *= 1.5; break;  // was 1.3
```
Now: 1 pick = 1.5×, 2 picks = 2.25×, 3 picks = 3.4×. Enough to kill wave-25 enemies in 1-2 hits.

#### b) Add "Shield Up" upgrade (in addition to meta):
Already exists in upgrade pool as 'shield' — good. It stacks additively (+1 shield per pick). At 3 picks = 3 shield = 3 extra hits.

#### c) Laser gets wave scaling:
```js
// Player.js laser damage (was fixed 0.2):
if (killed = this.enemies.damageEnemy(e, 0.2 * (1 + this.laserLevel * 0.5), this));
```
At wave 25: 0.2 × (1 + 1.5) = 0.5 HP/s laser. Still weak but relevant with 3 laser levels.

#### d) Weapon upgrades get wave scaling:
- Seeker missile (15 dmg → 15 + wave×0.5)
- Plasma bolt (25 dmg → 25 + wave×1)
- Lance (8 dmg → 8 + wave×0.8)
- Tesla (5 dmg → 5 + wave×0.3)

### Fix 5: Boss Rush Tuning (P4)
**File**: `modes.js` — Boss Rush rules

- Timer: 30s per boss is fine.
- Boss HP reduction for Boss Rush mode (they're solo encounters, should be beatable):
  - Wave 5: 72 → 55 HP
  - Wave 10: 96 → 75 HP
  - Wave 15: 108 → 90 HP
  - Wave 20: 120 → 100 HP
  - Wave 25: 120 → 100 HP
- Add: After each boss kill, 3s healing window (player HP partially restores)

### Fix 6: Challenge Mode Redesign (P5)
**File**: `modes.js` — Challenge rules

Add unique mechanics:
- Wave 1-5: Standard (baseline)
- Wave 6-10: Double enemy spawn rate, no scrap drops
- Wave 11-15: Shielders spawn every wave, no health pickups
- Wave 16-20: Boss every 2 waves, all enemies get +20% HP/speed
- Score: 3× instead of 2× (higher risk/reward)
- Special unlock: "No Meta Progression" mode — cores still earned but can't spend them

---

## Implementation Order

1. **Fix 1** — `config.js`: HP +1, invincibility +0.3s
2. **Fix 2** — `modes.js`: Rebalance enemy pools per mode
3. **Fix 3** — `Game.js` + `config.js`: Logarithmic spawn curve + wave cap
4. **Fix 4** — `Game.js` + `Player.js`: Stronger upgrades + wave scaling
5. **Fix 5** — `modes.js`: Boss Rush HP reduction
6. **Fix 6** — `modes.js`: Challenge mode redesign

## Verification
- Playtest each fix in browser (no meta upgrades needed to survive to wave 10+)
- Confirm wave 15+ enemies killable with base weapons
- Confirm boss rush completable in 15min (5 bosses × 30s timer)
- Confirm challenge mode 20-wave completion possible (10-15min run)
- Verify score multipliers feel rewarding
