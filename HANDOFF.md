# Nebula — Space Shooter · Hand-off Note (2026-08-26)

## Current release
- **v1.20** (versionCode 12) built, signed, committed `e11a73a`
- Artifacts: `~/Desktop/Nebula-Shooter-Release-v1.20/`
  - `Nebula-Shooter-v1.20.aab` (7,113,720 B, md5 `80f552a321f53a521735e976fe02c5e4`) ← Play Console
  - `Nebula-Shooter-v1.20.apk` — sideload testing
  - `.aab.zip` copy = same bytes (Telegram attachment workaround)
- Changelog (EN ≤500 chars): repo root `CHANGELOG.md` — paste into Play Console

## Verified before release
- AdMob audit clean: event names v7 correct, single-flight retry `_scheduleRetry()`, rewarded-dismiss race (no revive hang), production IDs match AndroidManifest (`ca-app-pub-5374637740061879~8627847901`), isTesting=false
- Unit tests `test/v1-19-admob-tests.js`: 16/16 pass
- Build integrity: md5 AdsManager.js + Game.js identical across source / APK / AAB
- `jarsigner -verify`: jar verified (keystore `android/app/nebula-release.keystore`, alias nebula, valid → 2053)

## What changed v1.19 → v1.20
No code change. Version bump only + tests + changelog. The v1.19 fixes (retry storm, dismiss race, rAF freeze, black screen) were already in the code but never shipped to Play — v1.20 IS that ship.

## Pending / TODO
- [ ] Upload AAB to Play Console (Production or Internal track)
- [ ] Runtime ad check on device: logcat tag `[Ads]` — expect init → Banner shown → loaded events
- [ ] Hermes memory store FULL (2200/2200 chars): gradle WSL fix below not saved yet

## Build environment (WSL) — critical quirks
```bash
export JAVA_HOME=$HOME/.local/jdk21        # ~/.local/bin/java points to Windows java.exe → "Incorrect function"
export GRADLE_USER_HOME=$HOME/.gradle-wsl  # default ~/.gradle sits on Windows mount → FileHasher crash
cd android
java -cp gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain \
     assembleRelease bundleRelease -x lint --no-daemon
```
- `./gradlew` broken — use wrapper jar directly
- Corrupt transform cache → `rm -rf $HOME/.gradle-wsl` and rebuild (~2m41s)
- JS edits: edit `js/` → copy to `www/js/` → `npx cap sync android` → verify md5 APK == source

## Key paths
- Repo: `/home/patison/nebula-shooter` (git, latest `e11a73a`)
- AdMob manager: `js/AdsManager.js` (231 lines, mirrored in www/ + android assets)
- Previous releases: `~/Desktop/Nebula-Shooter-Release-v1.12/`
- Play Console details: `PLAY_CONSOLE_DETAILS.md`; privacy policy live at patisonkindle-commits.github.io/nebula-shooter/privacy.html
