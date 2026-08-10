# Nebula v2 — Full Rewrite + Visual/Audio Overhaul

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Rebuild Nebula Space Shooter from scratch on a clean ES-module architecture with a dramatically upgraded visual identity (procedural vector art, layered parallax, bloom/glow pipeline) and a richer procedural audio system — while keeping the proven v1.18 gameplay, Capacitor/AdMob integration, and Play Store pipeline.

**Architecture:** ES modules (`import`/`export`) replacing 17 globals-scope script tags. A single `Game` orchestrator owns a fixed-timestep update loop + render pipeline (background → entities → fx → screenspace). All entity managers use the existing object-pool pattern. Visual overhaul via layered canvas compositing (nebula gradient layers, parallax star layers, additive glow passes) and a new procedural vector-rendering layer replacing filled-circle placeholders. Audio stays fully procedural (WebAudio oscillators/noise — no asset files) but gains a proper mixer, ducking, and per-event synthesis.

**Tech Stack:** Vanilla JS ES2020 modules, HTML5 Canvas 2D, WebAudio API, Capacitor 7 (Android), @capacitor-community/admob. No game engine, no build step for web (native ES modules); Capacitor serves the same `www/`.

**Constraints (carried from v1.18, must not regress):**
- 400×720 logical portrait, touch-drag movement with finger-offset, auto-fire
- Pixel-sharp rendering: canvas buffer = physical pixels (CSS×DPR), `setTransform` logical→buffer, `imageSmoothingEnabled=false`
- AdMob: banner (bottom, 80dp safe-area), interstitial (between runs), rewarded (revive) — production IDs
- Meta-progression in localStorage, wave→boss(10) loop, elite waves, upgrade-choice between waves
- Sync rule: source `js/` → `www/js/` → `npx cap sync android` (APK bundles android assets; stale = old behavior)
- Token-in-URL must never re-enter git config

---

## Phase 0 — Foundation

### Task 0.1: Create v2 branch + project skeleton

**Objective:** Branch `v2` off `android-playstore`; scaffold directory structure for modules.

**Files:**
- Create: `js/v2/` (module root), `js/v2/core/`, `js/v2/entities/`, `js/v2/systems/`, `js/v2/ui/`, `js/v2/render/`

**Step 1:** Branch
```bash
cd /home/patison/nebula-shooter && git checkout -b v2 android-playstore
```
Expected: `Switched to a new branch 'v2'`

**Step 2:** Create dirs: `mkdir -p js/v2/{core,entities,systems,ui,render}`

**Step 3:** Verify: `git status --short` shows untracked dirs only.

**Step 4:** Commit `chore: scaffold v2 module tree`

---

### Task 0.2: ESM bootstrap — index.html + entry module

**Objective:** Load the game via `<script type="module">` with zero global leakage; keep a 2-file compatibility shim so the old build still opens.

**Files:**
- Modify: `index.html` (swap script tags for module entry)
- Create: `js/v2/main.js` (entry, bootstraps Game)
- Create: `js/v2/core/config.js` (v2 CONFIG, extends v1 constants)
- Create: `js/v2/core/utils.js` (rand, randInt, clamp, dist, angleTo, lerp — imported, not globals)

**Step 1:** index.html bottom becomes:
```html
<script type="module" src="js/v2/main.js"></script>
```
(Remove the 17 `<script>` tags.)

**Step 2:** `js/v2/core/utils.js` — export pure helpers from v1 `config.js` bottom block.

**Step 3:** `js/v2/core/config.js` — export const CONFIG = { ...v1 values..., new v2 keys (see Task 5.1) }.

**Step 4:** `js/v2/main.js` — minimal: import Game, construct with canvas, start loop; must run with zero errors.

**Step 5:** Verify in browser: open `index.html` via `python3 -m http.server 8000`, console has no module errors.

**Step 6:** Commit `feat(v2): ESM bootstrap`

---

### Task 0.3: Fixed-timestep loop core

**Objective:** Port v1's RAF loop (dt clamp 0.05, frame-skip >16ms, hit-pause, timeScale) into `Game` module with clean structure.

**Files:**
- Create: `js/v2/core/Game.js` (orchestrator: loop, update, render, state machine shell)
- Create: `js/v2/core/GameLoop.js` (loop only, pure)

**Step 1:** GameLoop: `start(onUpdate, onRender)`, fixed dt = min(rawDt, 0.05), frame-skip, hit-pause freeze-render.

**Step 2:** Game owns state ('menu' | 'playing' | 'upgrade' | 'gameover'), swap on transitions.

**Step 3:** Verify: menu state renders starfield + title, zero console errors.

**Step 4:** Commit `feat(v2): fixed-timestep loop + state machine`

---

## Phase 1 — Render Pipeline (visual overhaul core)

### Task 1.1: Canvas compositor — nebula background layers

**Objective:** Replace flat `#050510` + 80-star twinkle with a 4-layer compositor: deep-space gradient, drifting nebula blobs (radial gradients, slow rotation), parallax star layers (3 depths), vignette.

**Files:**
- Create: `js/v2/render/Compositor.js`
- Create: `js/v2/render/NebulaBackground.js`
- Create: `js/v2/render/StarField.js` (v2, 3-depth parallax; drop-in for v1 StarField)
- Modify: `js/v2/core/Game.js` render path

**Step 1:** NebulaBackground: 4-6 pre-rendered radial-gradient blobs (#6a2c91, #1d4ed8, #0ea5e9, #ff2d55 tints) drifting at 2-5 px/s, alpha 0.05-0.12, additive.

**Step 2:** StarField: 3 layers (depth 0.2/0.5/1.0), speeds 20/60/140 px/s, sizes 1/1.5/2, twinkle via sin(phase + t).

**Step 3:** Vignette: pre-rendered radial darkening composited last.

**Step 4:** Verify: menu + gameplay show layered nebula, no perf drop (FPS debug overlay on).

**Step 5:** Commit `feat(v2): layered nebula + parallax starfield + vignette`

---

### Task 1.2: Vector ship renderer — Player + enemies

**Objective:** Replace circle/rounded shapes with procedural vector art: angular ship hulls, engine glow, thruster flicker, enemy silhouettes per archetype.

**Files:**
- Create: `js/v2/render/ShipRenderer.js` (player + enemy path definitions)
- Modify: `js/v2/entities/Player.js` render call
- Modify: `js/v2/entities/Enemy.js` render call

**Step 1:** Player ship: 12-point hull path (nose, swept wings, twin tail), fill gradient, cyan engine glow with flicker (sin noise), banking tilt from vx.

**Step 2:** Enemy silhouettes per type: swarmer=spiked orb, sniper=long triangle, tank=hexagon, kamikaze=arrow, blocker=shield wedge, vortex=spiral ring, minelayer=diamond, warp=ghost tetra.

**Step 3:** Elite variant: gold stroke + 20% scale pulse.

**Step 4:** Verify in browser: all archetypes render distinctly; no fill-circle leftovers in entity render paths.

**Step 5:** Commit `feat(v2): procedural vector ship renderer`

---

### Task 1.3: Additive glow / bloom pass

**Objective:** Real glow: render bright elements to an offscreen canvas with `globalCompositeOperation='lighter'`, then composite with blur (cheap: 2-pass downscale blur, NOT ctx.filter).

**Files:**
- Create: `js/v2/render/BloomPass.js`
- Modify: `js/v2/core/Game.js` render pipeline order

**Step 1:** BloomPass: glow layer at 1/4 res, 2× box-blur downsample (or single blur + upscale), composite `screen` over main.

**Step 2:** Route bullets, engine glow, explosions, cores, laser into glow layer.

**Step 3:** Verify: glow without `ctx.filter` (perf), FPS stays ≥55 on desktop, ≥45 Android mid-bullet-hell.

**Step 4:** Commit `feat(v2): additive bloom pass`

---

### Task 1.4: Screen FX module — shake, flash, chromatic aberration

**Objective:** Port v1 juice (screenShake, screenFlash, chromaticIntensity, hit-pause) into a `ScreenFX` module with decay-based updates, plus new: radial shockwave rings on boss death.

**Files:**
- Create: `js/v2/render/ScreenFX.js`
- Modify: `js/v2/core/Game.js`

**Step 1:** Port v1 decay logic verbatim (0.88 decay, min thresholds).
**Step 2:** Chromatic aberration: draw RGB-offset copies of FX layer (offset ±1.5px×intensity) — reuse v1 `_chromaCanvas` pattern.
**Step 3:** Shockwave: expanding ring stroke, additive, on boss death + revive.
**Step 4:** Verify: identical juice feel to v1.18, plus shockwaves.
**Step 5:** Commit `feat(v2): ScreenFX with shockwaves`

---

## Phase 2 — Audio overhaul

### Task 2.1: AudioManager v2 — mixer bus + master + ducking

**Objective:** Rebuild v1 AudioManager: master gain → music bus + sfx bus + duck bus; sfx ducked (gain -12dB) while music plays; all synthesis procedural.

**Files:**
- Create: `js/v2/systems/AudioManager.js` (v2)
- Delete: `js/systems/Audio.js` usage (kept for v1 branch)

**Step 1:** Buses: `master → music/sfx/duck`, duck bus ducks sfx by 0.25 when music active.
**Step 2:** `ensure()` on first gesture (iOS/Android resume rule), resume on visibilitychange.
**Step 3:** Volume config: master 0.8, music 0.5, sfx 0.9.

**Step 4:** Verify: audio context resumes on first tap on device; ducking audible.
**Step 5:** Commit `feat(v2): audio mixer bus + ducking`

---

### Task 2.2: Procedural music engine — layered ambient pads + pulsing bass

**Objective:** Music without files: WebAudio oscillators. v1 used simple loops; v2 gets evolving chord pads (2 detuned saws + lowpass sweep), pulsing sub-bass (16th-note gate), arpeggio layer, keyed to game state (menu=Am, playing=Em, boss=Dm, intensity rises with wave).

**Files:**
- Create: `js/v2/systems/MusicEngine.js`
- Modify: `js/v2/systems/AudioManager.js`

**Step 1:** Chords per state: menu Am(add9), playing Em(add9), boss Dm. Pads: 2 detuned saws per note → lowpass 800Hz → gain 0.05.
**Step 2:** Bass: sine at root, 8th-note pulse, gain envelope.
**Step 3:** Arp: 16th-note pluck (triangle, short env) cycling pentatonic.
**Step 4:** Intensity: filter cutoff + pad gain scale with wave/elite count (0.4→1.0).
**Step 5:** Verify: 3 states audibly distinct; CPU light (no per-sample work).
**Step 6:** Commit `feat(v2): procedural music engine`

---

### Task 2.3: SFX synthesis suite

**Objective:** Replace v1 one-shot blips with layered synthesis: laser (2 osc + noise burst), hit (noise + pitch drop), explosion (3-layer: sub thump + noise + crackle), pickup (major 3rd arp), shield (metallic ping), boss roar (saw sweep down), UI click.

**Files:**
- Create: `js/v2/systems/SfxEngine.js`

**Step 1:** Implement 8 named synths matching the list; each returns scheduled nodes, never persistent buffers.
**Step 2:** Hook into game events: fire, enemy hit, enemy death, player hit, scrap pickup, core pickup, upgrade pick, boss spawn, boss death, revive, game over.
**Step 3:** Verify: every event audibly distinct, no clipping (master clamp).
**Step 4:** Commit `feat(v2): procedural SFX suite`

---

## Phase 3 — Entity/gameplay port (v1 features, v2 code)

### Task 3.1: Input v2 — touch + mouse + keyboard

**Objective:** Port v1 Input (pointer-drag, finger-offset, tap detection, postFrame) as module; add keyboard arrows/WASD for desktop testing.

**Files:**
- Create: `js/v2/core/Input.js`
- Delete: old `js/Input.js` from v2 bundle

**Step 1:** Pointer events: pointerdown/move/up on canvas, `isTouching()`, `getPos()` with `UPWARD_OFFSET` (y - 70).
**Step 2:** `justTapped` semantics identical to v1 (tap = down+up within 200ms, <10px drift).
**Step 3:** Keyboard: arrows/WASD move at PLAYER_SPEED; Space fires.
**Step 4:** Verify: mouse-drag on desktop + touch on Android both move ship identically to v1.
**Step 5:** Commit `feat(v2): Input module with keyboard support`

---

### Task 3.2: Entity managers — Pool, Player, Bullets, Enemies, Scrap, Particles

**Objective:** Port v1 entity systems to modules, keeping pool pattern + collision + all weapon upgrades (spread, homing, piercing, burst, ricochet, wave, laser, orbitals).

**Files:**
- Create: `js/v2/core/Pool.js`
- Create: `js/v2/entities/Player.js`, `js/v2/entities/Bullet.js`, `js/v2/entities/Enemy.js`, `js/v2/entities/Scrap.js`, `js/v2/entities/Particles.js`
- Create: `js/v2/core/SpatialGrid.js`
- Modify: `js/v2/core/Game.js` to wire managers

**Step 1:** Port Pool (freelist rebuild + double-free guard from v1.17/1.18) verbatim.
**Step 2:** Port Player update/fire/upgrades verbatim (incl. laser timing, orbital update).
**Step 3:** Port BulletManager (homing steer, wave motion, ricochet, burst, pierce).
**Step 4:** Port EnemyManager (8 archetypes + boss + 4-phase boss patterns + elite logic).
**Step 5:** Port ScrapManager + ParticleSystem (gravity, magnet, cores).
**Step 6:** SpatialGrid for enemy-vs-bullet broadphase (v1.17 perf).
**Step 7:** Verify: full v1 gameplay loop — waves, elites, boss at 10, upgrades, scrap/core economy, meta mods applied.
**Step 8:** Commit `feat(v2): entity systems ported to modules`

---

### Task 3.3: Meta-progression + saves

**Objective:** Port v1 MetaProgression (8 nodes, cores, localStorage) as module; schema-version the save key (`nebula_meta_v2`) with v1→v2 migration reading old key once.

**Files:**
- Create: `js/v2/systems/MetaProgression.js`
- Create: `js/v2/systems/SaveManager.js`

**Step 1:** SaveManager wraps localStorage with try/catch + version field.
**Step 2:** MetaProgression reads v2 key; if absent, migrates v1 `nebula_meta` once (cores + ranks), then writes v2.
**Step 3:** Verify: fresh install starts clean; upgrade from v1 keeps cores/ranks.
**Step 4:** Commit `feat(v2): meta-progression with save migration`

---

### Task 3.4: UI screens — HUD, Menu, Upgrade choice, Meta tree, Game Over

**Objective:** Port v1 UI screens to modules with v2 visual style (glass panels, glow text, rounded rects) — same interactions (3 upgrade choices, revive zone, meta tree).

**Files:**
- Create: `js/v2/ui/HUD.js`, `js/v2/ui/Menu.js`, `js/v2/ui/UpgradeUI.js`, `js/v2/ui/MetaScreen.js`, `js/v2/ui/GameOverUI.js`, `js/v2/ui/ScorePopup.js`
- Modify: `js/v2/core/Game.js`

**Step 1:** Port each screen's logic; restyle: dark glass (#0b1020cc fill, 1px #ffffff22 stroke, rounded 12), glow text via shadowBlur, accent colors per state.
**Step 2:** HUD: HP pips → segmented bar, scrap counter with icon, wave banner, mute button top-right, FPS debug.
**Step 3:** Game Over: big stats panel + revive button (always visible, readiness deferred to showRewarded — v1.18 behavior).
**Step 4:** Verify: all screens reachable, touch targets ≥44px, no v1 text overflow.
**Step 5:** Commit `feat(v2): UI screens restyled`

---

### Task 3.5: AdsManager port

**Objective:** Port v1.18 AdsManager verbatim (retry loop, event listeners, auto-reload, production IDs) as module; keep `window.adsManager` bridge for main.js.

**Files:**
- Create: `js/v2/systems/AdsManager.js`

**Step 1:** Copy v1.18 logic unchanged (init retries=5, interstitial/rewarded listeners + 5s retry, showInterstitial re-prepare, showRewarded wait loop).
**Step 2:** Expose `window.adsManager = new AdsManager()` for Capacitor bridge.
**Step 3:** Verify: banner shows on device, interstitial between runs, rewarded revive path works.
**Step 4:** Commit `feat(v2): AdsManager module`

---

## Phase 4 — Content Expansion (new v2 content)

> Heavy content addition on the v2 engine. Every feature here is a module/archetype registered into the rewritten core — no engine changes, just config + new entity/render/UI. Additions are optional slices; each is independently shippable.

### Task 4.1: Multiple selectable ships (hangar)

**Objective:** 3 pilotable ships, each a weapon/stats archetype, unlock + select on a hangar screen before run.

**Files:**
- Create: `js/v2/entities/ships.js` (ship archetype table)
- Create: `js/v2/ui/Hangar.js` (ship select screen)
- Modify: `js/v2/core/config.js`, `js/v2/core/Game.js`, `js/v2/ui/Menu.js`, `js/v2/systems/MetaProgression.js` (unlock flags)

**Ships:**
| Ship | HP | Speed | Weapon chief | Special | Unlock |
|------|----|-------|--------------|------|--------|
| **Vanguard** (default) | 3 | 240 | auto single | balanced (v1) | start |
| **Interceptor** | 2 | 320 | rapid twin-shot | banked dodge, high crit | 500 cores |
| **Pulsar** | 4 | 200 | plasma arc minopull | splash, slow | 800 cores |
| **Juggernaut** | 6 | 160 | heavy piercer | shield charge, slow | 1200 cores |

**Step 1:** `ships.js` — each ship: `{ hp, speed, fireRate, damage, projectile, special, colors, unlockCost }`.
**Step 2:** Game reads `this.ship = ships[selectedId]` at run start; Player/upgrade logic keys off ship fields.
**Step 3:** Hangar screen: ship cards (draw miniature ship render from ShipRenderer), stats bars, locked = dimmed + cost; buy spends cores; persists in save.
**Step 4:** Menu gets "SHIPS" button → Hangar → back.
**Step 5:** Verify: pick each ship, see distinct fire pattern + stats, unlock gating works, cores deducted.
**Step 6:** Commit `feat(v2): ship hangar — Interceptor, Pulsar, Juggernaut`

---

### Task 4.2: New weapon pool (pick-ups + ship perks)

**Objective:** Expand beyond v1's 8 upgrade lines with 4 new weapons: seeker missiles, plasma cannon, tesla arc, photon lance. Some are ship-exclusive; all selectable as upgrades.

**Files:**
- Create: `js/v2/entities/weapons.js` (weapon defs + fire logic)
- Modify: `js/v2/entities/Bullet.js`, `js/v2/entities/Player.js`, `js/v2/ui/UpgradeUI.js`

**Step 1:** Data-driven `weapons.js`: `{ id, name, fire(), pool, damage, pelletCount }` so UpgradeUI and ships both consume it.
**Step 2:** Implement 4 weapons:
- **Seeker missiles** — 1 fast homing+explodes radial on contact (AoE 40).
- **Plasma cannon** — slow heavy bolt, high damage, punch-through.
- **Tesla arc** — chain to 4 enemies (reuse v1 `PLASMA_CHAIN_RANGE/net`), electric FX.
- **Photon lance** — hitscan beam, pierces all, short cooldown.
**Step 3:** Add each as an upgrade-choice pool + pool size/bit in CONFIG (bump BULLET_POOL_SIZE by 60).
**Step 4:** Wire a per-ship default weapon (Pulsar→plasma, Juggernaut→lance) + allow stacking with base.
**Step 5:** Verify: each new weapon fires, AoE/chain/lance work, no pool exhaustion mid-run.
**Step 6:** Commit `feat(v2): 4 new weapons (seeker, plasma, tesla, lance)`

---

### Task 4.3: 3 new enemy archetypes

**Files:**
- Modify: `src/v2/entities/enemies.js` (archetype table + behaviors), `src/v2/render/ShipRenderer.js`

**Step 1:** Register new archetypes in enemy config (HP/speed/radius/score scaled like existing):
- **Shielder** — drops behind a tank; periodic forward HP shield wall (absorb N hits).
- **Disrupter** — slow, but its aura scrambles player fire (alternate bullets, miss 20%).
- **Ripper** — fast zigzag close-range melee; high kamikaze, low HP, big radius.
**Step 2:** ShipRenderer silhouettes for each (shield wedge, aura hex, claw orb).
**Step 3:** Allocate them into wave composition `ENEMY_WAVE_MIX` — unlock as waves progress (e.g., ripper w6+, shielder w8+, disrupter w9+).
**Step 4:** Verify: each spawns, behaves, dies, awards score; no type collisions in pool.
**Step 5:** Commit `feat(v2): 3 new enemies (Shielder, Disruptor, Ripper)`

---

### Task 4.4: 2 new mini-bosses + 1 end-boss tier

**Objective:** Varies the boss loop: a mid-wave "Elite Lord" every 5 waves, and a new end-boss on wave 25 in addition to wave-10 boss.

**Files:**
- Modify: `src/v2/entities/enemies.js` (boss defs + patterns), `src/v2/core/config.js`, `src/v2/render/ShipRenderer.js`, `src/v2/ui/ScorePopup.js`, `src/v2/systems/AudioManager.js`

**Step 1:** Elite mini-boss (wave 5/15/25): **Koloss** — heavy tank, arm plus (ring+spray), yellow/gold, dies → drops 3 cores. Identified as a mid-boss difficulty gate.
**Step 2:** End-boss (wave 25): **Umbra** — 3-phase: (a) spiral rings, (b) aimed lance waves, (c) minion spawn + frenzy. Bigger, scripted intro announcement + shockwave.
**Step 3:** Add telegraphs (pre-fire outline + rail-warning) — reuse v1 spawnFlash pattern.
**Step 4:** Verify: all three fight correctly, phase transitions, deaths award cores/score, no softlock.
**Step 5:** Commit `feat(v2): Koloss + Umbra bosses`

---

### Task 4.5: Levels — thematic sectors

**Files:**
- Create: `src/v2/levels/sectors.js`, `src/v2/render/sectorBackgrounds.js`
- Modify: `src/v2/render/NebulaBackground.js`, `src/v2/render/StarField.js`, `src/v2/core/Game.js`

**Step 1:** Data-driven sector table (per 10 waves; rotate after 50): 
| Sector | Palette | Bg | Note |
|--------|---------|----|------|
| Azure Drift | blues/cyans | default | intro |
| Crimson Tide | reds/oranges | nebula min | more pellets, fast line |
| Violet Deep | purples/browns | amber clouds | tank-heavy, more shielders |
| Oro Belt | golds/ambers | rare gold blobs | score multiplier+0.25 |
Tracks 25-wave loop (waves 1-25 → boss each) with sector = floor(wave/10) % sectors.length.
**Step 2:** NebulaBackground picks palette by sector (gradient + blob tints); StarField adjusts star tint ~5% sector; wall accent color changes.
**Step 3:** Sector transition banner ("— AZURE CORE —"), short FX flash on change.
**Step 4:** Verify by fast-forwarding waves (temp hook) → all 4 sectors render, banner shows, combat unaffected.
**Step 5:** Commit `feat(v2): 4 themed sectors with bg transition`

---

### Task 4.6: Game modes — Endless, Boss Rush, Challenge, (Classic)

**Files:**
- Create: `src/v2/modes.js`, `src/v2/ui/ModeSelect.js`
- Modify: `src/v2/core/Game.js`, `src/v2/core/config.js`, `src/v2/ui/Menu.js`, `src/v2/systems/MetaProgression.js` (mode unlock flags)

**Step 1:** 
- Classic = existing v2 run (default).
- Endless = waves don't stop, difficulty ramps, no boss gating; score board = max wave + score.
- Boss Rush = fight boss every wave (spawn Koloss on 0/ignoring Elite timing), no grunts between—hook + rapid.
- Challenge = fixed 5-wave gauntlet w/ locked loadout, 1 life; unlock first.
**Step 2:** ModeSelect from Menu → pick mode (unlock: Boss = reach wave 10, Endless = reach 15, Challenge = beat Boss-mode wave 10).
**Step 3:** Meta per mode: separate highscore (`nebula_v2_score_<mode>`), unlock flags in save.
**Step 4:** Verify: each mode startable, scoring/unlock gates, revive/interstitial still wired (not mode-blocked).
**Step 5:** Commit `feat(v2): Classic / Endless / Boss / Challenge modes`

---

### Task 4.7: Content balance + difficulty tuning

**Files:** `src/v2/core/config.js`, `src/v2/systems/MetaProgression.js`

**Step 1:** Rebalance: unlock costs 500/800/1200 cores set against `coreDropBonus`/elite/core cadence; tune new enemies' HP/speed vs player power.
**Step 2:** Per-ship stat recheck against wave-scaling (avoid insta-kill at Interceptor hp=2 vs max-waving damage).
**Step 3:** Boss HP: Koloss/Umbra scale with wave + mode (Endless >15).
**Step 4:** Verify: unlock costs reachable (~10-15 runs), no ship makes boss trivially or impossible.
**Step 5:** Commit `balance(v2): ships/weapons/bosses/modes`

---

## Phase 5 — Build, sync, QA

### Task 5.1: Web sync + cap sync

**Objective:** Sync v2 code into `www/` and Android bundle; confirm APK carries v2.

**Files:**
- `www/` (all v2 js), `android/app/src/main/assets/public/`

**Step 1:** `rsync -a js/ www/js/` (or cp -r) — v2 tree replaces old.
**Step 2:** `npx cap sync android` (regenerates android assets from www).
**Step 3:** Verify: `diff -rq www/ android/app/src/main/assets/public/` clean (except cordova.js).
**Step 4:** Commit `chore(v2): sync www + android assets`

---

### Task 5.2: Browser playtest — full QA pass

**Objective:** Play v2 in browser; verify every v1 feature + new visuals. Log findings as fixes.

**Files:** (fix targets as found)

**Step 1:** `python3 -m http.server 8000` → open `http://localhost:8000`.
**Step 2:** Check: menu render, start, movement, firing, waves 1-10, elite wave, boss phases, all 8 enemy archetypes, upgrades, scrap/core, meta tree, revive, game over, interstitial call.
**Step 3:** Performance: FPS overlay ≥55 desktop, no GC hitches.
**Step 4:** Audio: all 3 states + all SFX distinct, no clipping.
**Step 5:** Fix anything broken; re-run.
**Step 6:** Commit fixes as `fix(v2): <issue>`

---

### Task 5.3: Android build + device check

**Objective:** Build signed AAB/APK with v2, verify assets inside.

**Files:**
- `android/app/build.gradle` (version bump 1.18 → 2.0, versionCode 10 → 11)

**Step 1:** `JAVA_HOME=/home/patison/jdk21 ANDROID_HOME=/home/patison/Android/Sdk ./gradlew :app:assembleRelease :app:bundleRelease`
**Step 2:** Verify APK contains v2: python zipfile read `assets/public/js/v2/main.js` present + `init(retries` in AdsManager.
**Step 3:** Sideload to device: touch move, banner visible above safe-area, interstitial fires, rewarded revive works, audio resumes on return-to-app.
**Step 4:** Commit `release(v2): v2.0 build`

---

### Task 5.4: Docs + branch merge

**Objective:** Update PLAY_CONSOLE_DETAILS.md for v2.0, merge v2 → android-playstore, push.

**Files:**
- Modify: `PLAY_CONSOLE_DETAILS.md` (version 2.0, versionCode 11)

**Step 1:** Update doc fields (Version Name 2.0, Version Code 11, feature list).
**Step 2:** `git checkout android-playstore && git merge v2`
**Step 3:** Push: `git push origin android-playstore`
**Step 4:** Post to Play Console Internal track when user is ready (manual step).

---

## Risks / Tradeoffs / Open Questions

1. **Perf on low-end Android:** bloom at 1/4 res + nebula layers — if Android mid-range dips below 45 FPS, drop nebula to 2 blobs or bloom to 1/8 res (ponytail: config flag `RENDER.BLOOM_SCALE`).
2. **ESM on Capacitor WebView:** Android System WebView (Chromium 110+) supports ES modules — fine for API 23+ target; verify on device in Task 4.3.
3. **Old branch safety:** v1 stays intact on `android-playstore` until Task 4.4 merge; `gh-pages` and `main` untouched.
4. **Save migration:** one-time v1→v2 read; if user has never played v1, fresh start. No write-back to v1 key (v1 branch won't see v2 cores — acceptable).
5. **Keyboard input scope:** desktop-only convenience, excluded from Capacitor (touch is primary).

## Validation checklist (final)

- [ ] `git log --oneline` on v2 shows task commits
- [ ] Browser: full run to boss kill, all 8 archetypes + 4 boss patterns, upgrades, revive
- [ ] FPS ≥55 desktop, ≥45 Android during bullet-hell
- [ ] `diff -rq www/ android/.../public/` clean (except cordova)
- [ ] APK contains `js/v2/main.js`, versionName 2.0
- [ ] AdMob: banner + interstitial + rewarded all fire on device
- [ ] Save migration: v1 cores appear after upgrade
