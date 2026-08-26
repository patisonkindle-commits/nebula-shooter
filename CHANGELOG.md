# Nebula — Space Shooter · Release Changelogs

Play Console release notes (EN, ≤500 chars each).

## v1.20 (versionCode 12) — 2026-08-26

```
Stability & ads reliability update:
• Fixed frozen menu / dead taps after frame drops (game loop no longer stops)
• Fixed black screen on launch (missing resource)
• Ad retry deduped — no more request storms, less battery drain
• Closing a rewarded ad early no longer blocks the Revive button
• Smoother rendering during frame drops; engine pulse timing fixed
```

## v1.19 (versionCode 11) — 2026-08-24

```
Ads reliability:
• AdMob load-fail retries now single-flight (no exponential retry storm)
• Rewarded ad: early close no longer hangs revive flow
```

## v1.18 (versionCode 10) — 2026-08-24

```
Improvements:
• AdMob auto-retry with event listeners
• Banner resized to 80dp adaptive
• Safe-area display cutout support
• Audio engine fixes (BGM stop, suspended AudioContext resume)
```

---

## Build artifacts

| Version | AAB | APK |
|---------|-----|-----|
| v1.20 | `android/app/build/outputs/bundle/release/app-release.aab` (~7.1 MB) | `android/app/build/outputs/apk/release/app-release.apk` (~7.4 MB) |

Build env (WSL): `JAVA_HOME=$HOME/.local/jdk21`, `GRADLE_USER_HOME=$HOME/.gradle-wsl`,
`java -cp gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain assembleRelease bundleRelease -x lint --no-daemon`

## Upload checklist (v1.20)

- [x] versionCode 12 > 11 in Play Console
- [x] Signed with nebula-release.keystore (`jarsigner -verify`: jar verified)
- [x] Web assets in AAB match source (md5 AdsManager/Game.js = MATCH)
- [x] AdMob production IDs, isTesting=false
