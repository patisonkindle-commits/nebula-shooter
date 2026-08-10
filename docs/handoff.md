# Nebula v2 — Handoff (2026-08-10, post-merge)

## State at handoff
- **Branches**: `v2` (active dev), `android-playstore` (release — now contains full v2 rewrite), `main`/`gh-pages` (untouched)
- **Plan**: **ALL 5 PHASES COMPLETE**. 0.1→4.7, 5.1→5.5 done. Merge v2 → android-playstore done + pushed.
- **Last commit**: `d5ccbb8` (merge on android-playstore) / `cda9faf` (docs on v2)
- **Live URL**: https://patisonkindle-commits.github.io/nebula-shooter/ — v2 deployed ✅
- **Working tree**: clean, on `v2`

## Phase 5 closure (this session)
| Task | Status | Notes |
|------|--------|-------|
| 5.1 Web sync | ✅ | `rsync js/ → www/js/` + `npx cap sync android`; fixed stale main.js `willReadFrequently` diff; `diff -rq www/js/ android/assets/public/js/` clean |
| 5.2 Browser QA | ✅ | Earlier session — see previous handoff; all flows verified via `window.__game` |
| 5.3 Android build | ✅ | versionCode 10→11, versionName 1.18→2.0. Wrapper build **SUCCESSFUL 25s**. Outputs: `android/app/build/outputs/bundle/release/app-release.aab` (6.8M), `apk/release/app-release.apk` (7.1M). Verified v2/main.js + modes.js + AdsManager inside both. Commit `58264d2` |
| 5.4 Docs + merge | ✅ | PLAY_CONSOLE_DETAILS.md → v2.0/11 + feature list. Merge v2 → android-playstore clean (no conflicts — android-playstore fully contained). Commits `cda9faf` (docs), `d5ccbb8` (merge, pushed) |
| 5.5 Pages deploy | ✅ | Earlier session — workflow deploy.yml on v2, build_type=workflow, branch policy added |

## Build commands (verified this session)
```bash
cd android
export JAVA_HOME=/home/patison/jdk-21.0.2+13   # bare JAVA_HOME=/path cmd → bash error; export first
$JAVA_HOME/bin/java -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain :app:assembleRelease :app:bundleRelease --no-daemon
```
- **`git add` on android/ fails — `android/` is in .gitignore (dir ignored, files tracked)**. Always `git add -f android/app/build.gradle`.
- Keystore: `android/app/nebula-release.keystore` (build.gradle path relative to app/).

## Post-merge TODO (next agent)
1. **Play Store upload (manual, user-led)**: AAB ready → Internal track. `PLAY_CONSOLE_DETAILS.md` blockers:
   - `google-services.json` MISSING at `android/app/google-services.json` (Firebase Console download) — skip for pure-AdMob (AdMob IDs work without it; it's only for FCM/analytics), but checklist flags it
   - Privacy policy URL: `https://patisonkindle-commits.github.io/nebula-shooter/privacy.html`
2. **Gameover BGM pause bug** — known pattern: BGM keeps playing after gameover. Verify `music.transition('menu')` on gameover state entry (v1 had it; v2 wiring may miss).
3. **Game-feel polish (4.8)**: hitstop, particles on upgrades, level-up glow, mode title screens (Boss Rush/Challenge victory effects), Endless scaling check.
4. **Leaderboard** — local hs exists per-mode (`hs_<mode>` keys); shareable/online deferred.

## Module inventory (js/v2/, 34 files)
- `core/` — Game.js (orchestrator+modes+score), GameLoop.js, Input.js, Pool.js, SpatialGrid.js, config.js, modes.js (4 modes + unlock gates), utils.js
- `ui/` — Menu.js, ModeSelect.js, Hangar.js, MetaScreen.js, UpgradeUI.js, GameOverUI.js, HUD.js, ScorePopup.js
- `systems/` — AudioManager.js, MusicEngine.js, SfxEngine.js, MetaProgression.js, SaveManager.js, AdsManager.js
- `entities/` — Player.js, Enemy.js, Bullet.js, Scrap.js, Particles.js, ships.js (4 ships), weapons.js (4 weapons)
- `render/` — Compositor.js, NebulaBackground.js, StarField.js, ShipRenderer.js, BloomPass.js, ScreenFX.js
- `main.js` (entry, window.__game), `compat-shim.js` (legacy v1 globals — do not extend)

## Game flow
menu → modeselect → (hangar / meta) → playing → upgrade ↔ playing → gameover → restart/meta. Mode `rules` in modes.js drive enemyTypes/bossWaves/timers/scoreMult. Mode-unlock flags: `unlocked_boss10Killed`, `unlocked_boss20Killed`, `unlocked_wave15`.

## Key pitfalls (still current)
- ESM module cache: kill server + cache-busted URL (`?cb=N`) after edits; SW unregister first
- Pool API v2: `acquire()/release()/forEach`, `count` getter, flag `b.alive` (not `b.active`); acquired objects carry STALE fields until overwritten
- `SaveManager.set()` only dirties — explicit `save()` or localStorage never written
- Getter-only fields crash on `-=` — mutate via setters (`setCores(...)`)
- `browser_console` FATAL = often your probe's bug (Pool `count()` vs getter), not game error
- `node -c` useless for ESM; smoke-import instead (`test/v2-smoke-test.mjs`)
- SfxEngine never on window — probe via `Object.getOwnPropertyNames(Object.getPrototypeOf(g.sfx))`
- AudioContext stays 'suspended' headless — don't gate on it
- deploy.yml pushes to `v2` trigger Pages; android-playstore pushes do NOT redeploy (Pages artrefs v2)
- Canvas has no a11y nodes → `browser_navigate` snapshot empty is NORMAL; probe `window.__game` state instead