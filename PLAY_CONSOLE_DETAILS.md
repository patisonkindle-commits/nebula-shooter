# Nebula — Space Shooter · Play Console Submission Details

## App Identity
| Field | Value |
|-------|-------|
| **App Name** | Nebula — Space Shooter |
| **Package Name** | `com.patison.nebula` |
| **Version Code** | `11` |
| **Version Name** | `2.0` |
| **Min SDK** | API 23 (Android 6.0) |
| **Target SDK** | API 35 (Android 15) |

---

## Build Files for Upload

### 1️⃣ AAB (App Bundle) — **Required for Play Store**
- **File:** `android/app/build/outputs/bundle/release/app-release.aab`
- **Size:** ~6.5 MB
- **Use:** Upload directly to Play Console → Production / Internal / Closed testing track

### 2️⃣ APK (Signed Universal) — **For testing**
- **File:** `android/app/build/outputs/apk/release/app-release.apk`
- **Size:** ~7.1 MB
- **Use:** Sideload to Android devices for pre-release testing

---

## Signing & Keystore
| Field | Value |
|-------|-------|
| **Keystore File** | `android/app/nebula-release.keystore` |
| **Keystore Password** | `NebulaPass` |
| **Key Alias** | `nebula` |
| **Key Password** | `NebulaPass` |
| **Signature Algorithm** | SHA256withRSA |
| **Key Size** | 2048 bits |

> ⚠️ **SAVE THE KEYSTORE SECURELY.** Without it, you CANNOT upload new versions to Play Store.

---

## AdMob (Production)
| Ad Type | Unit ID |
|---------|---------|
| **Banner** | `ca-app-pub-5374637740061879/8912551848` |
| **Interstitial** | `ca-app-pub-5374637740061879/8348645309` |
| **Rewarded** | `ca-app-pub-5374637740061879/4950163450` |
- **State:** Production mode (`isTesting: false`)
- **Test ads commented out** in `js/AdsManager.js`

---

## Required Checklist Before Play Store Submission

- [ ] **Privacy Policy** — ✅ Ready at `www/privacy.html`, also hosted online
  - URL to include in Play Console: `https://patisonkindle-commits.github.io/nebula-shooter/privacy.html`
- [ ] **Google Services JSON** — ❌ `google-services.json` **MISSING**
  - Download from Firebase Console → Project Settings → General → Your apps → Download google-services.json
  - Place at `android/app/google-services.json`
- [ ] **Content Rating Questionnaire** — Complete in Play Console
- [ ] **App Category** — Games → Action (or Arcade)
- [ ] **In-app Products** — None (ads only, no purchases)
- [ ] **Target API Level** — ✅ API 35 (Play Store requirement for Aug 2025+)
- [ ] **64-bit Architecture** — ✅ Covered by Capacitor's default AAB packaging

---

## Key Features (for Store Listing)
- **One-touch arcade shooter** — v2.0 rewrite: 4 selectable ships (Vanguard/Interceptor/Pulsar/Juggernaut), 4 weapon systems (seeker/plasma/tesla/lance), 11 enemy archetypes + 2 end-bosses (Koloss, Umbra)
- **4 game modes** — Classic, Boss Rush, Endless, Challenge (unlock-gated)
- **4 thematic sectors** — Azure Drift, Crimson Tide, Violet Deep, Oro Belt
- **Upgrade system** — collect scrap & cores, unlock power-ups mid-run
- **Meta progression** — permanent upgrades across runs, ship unlocks
- **Procedural audio** — WebAudio music engine + 9 synth SFX (no asset files)
- **Visual overhaul** — bloom/glow pipeline, layered nebula parallax, vector ship art
- **AdMob** — Banner (bottom) + Interstitial (between runs) + Rewarded (revive)
- **Offline play** — no internet connection required (ads limited when offline)

---

## Screenshots (recommended)
- Feature Graphic: 1024×500 PNG
- Phone screenshots: min 320px width, max 3840px height (JPEG/PNG, 24-bit)
- Include: Menu screen, gameplay with action, upgrade screen, game over with stats

## Tags
`arcade`, `shooter`, `space`, `action`, `retro`, `single-player`
