# 🔐 Google Services (Firebase) — Required Step

## What you need to do

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one for `com.patison.nebula`)
3. Go to **Project Settings** → **General** → **Your apps** → **Android**
4. Download `google-services.json`
5. Place it at: `android/app/google-services.json`

## Why it's needed

- AdMob uses Firebase for ad serving
- Without it, ads (banner, interstitial, rewarded) **will not serve** in production
- The build still succeeds (graceful fallback), but ads won't load

## Project info for Firebase setup

| Field | Value |
|-------|-------|
| Package name | `com.patison.nebula` |
| App nickname | Nebula Space Shooter |
| SHA-1 (optional) | — |
