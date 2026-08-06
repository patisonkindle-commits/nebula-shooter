// Nebula — AdMob Manager for Capacitor (Banner + Interstitial + Rewarded)
class AdsManager {
  constructor() {
    this.initialized = false;
    this.admob = null;
    this.bannerShowing = false;
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;

    // ── Ad Unit IDs (PRODUCTION) ──
    this.ADS = {
      banner: 'ca-app-pub-5374637740061879/8912551848',
      interstitial: 'ca-app-pub-5374637740061879/8348645309',
      rewarded: 'ca-app-pub-5374637740061879/4950163450',
    };
    this.isTesting = false;

    // Check if running inside Capacitor WebView
    this.isCapacitor = typeof Capacitor !== 'undefined' && (
      Capacitor.isNative === true ||
      (Capacitor.getPlatform && ['android','ios'].includes(Capacitor.getPlatform()))
    );
  }

  // ── Init with retry ──
  async init(retries = 5) {
    if (!this.isCapacitor) {
      console.log('[Ads] Skipped (not Capacitor)');
      return false;
    }
    for (let i = 0; i < retries; i++) {
      try {
        this.admob = Capacitor.Plugins.AdMob;
        await this.admob.initialize();
        this.initialized = true;
        console.log('[Ads] AdMob initialized');

        // ── Event listeners for interstitial ──
        this.admob.addListener('interstitialAdLoaded', () => {
          this.interstitialLoaded = true;
          console.log('[Ads] Interstitial loaded event');
        });
        this.admob.addListener('interstitialAdFailedToLoad', (err) => {
          this.interstitialLoaded = false;
          console.log('[Ads] Interstitial load fail:', JSON.stringify(err));
          setTimeout(() => this.prepareInterstitial(), 5000);
        });

        // ── Event listeners for rewarded ──
        this.admob.addListener('onRewardedVideoAdLoaded', () => {
          this.rewardedLoaded = true;
          console.log('[Ads] Rewarded loaded event');
        });
        this.admob.addListener('onRewardedVideoAdFailedToLoad', (err) => {
          this.rewardedLoaded = false;
          console.log('[Ads] Rewarded load fail:', JSON.stringify(err));
          setTimeout(() => this.prepareRewarded(), 5000);
        });
        return true;
      } catch (e) {
        console.log(`[Ads] Init attempt ${i + 1}/${retries} failed:`, e.message);
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
    console.log('[Ads] Init failed after', retries, 'attempts');
    return false;
  }

  // ══════════════ BANNER ══════════════
  async showBanner() {
    if (!this.initialized || this.bannerShowing) return;
    try {
      await this.admob.showBanner({
        adId: this.ADS.banner,
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        isTesting: this.isTesting,
      });
      this.bannerShowing = true;
      console.log('[Ads] Banner shown');
    } catch (e) {
      console.log('[Ads] Banner error:', e.message);
    }
  }

  async hideBanner() {
    if (!this.initialized || !this.bannerShowing) return;
    try {
      await this.admob.hideBanner();
      this.bannerShowing = false;
      console.log('[Ads] Banner hidden');
    } catch (e) {
      console.log('[Ads] Banner hide error:', e.message);
    }
  }

  // ══════════════ INTERSTITIAL ══════════════
  async prepareInterstitial() {
    if (!this.initialized) return;
    this.interstitialLoaded = false;
    try {
      await this.admob.prepareInterstitial({
        adId: this.ADS.interstitial,
        isTesting: this.isTesting,
      });
      console.log('[Ads] Interstitial prepared OK');
      // Retry up to 5s if event doesn't fire
      setTimeout(() => {
        if (!this.interstitialLoaded) {
          console.log('[Ads] No interstitial event after 5s — retrying prepare');
          this.prepareInterstitial();
        }
      }, 5000);
    } catch (e) {
      console.log('[Ads] Interstitial prepare error:', e.message);
      // Retry after 5s
      setTimeout(() => this.prepareInterstitial(), 5000);
    }
  }

  async showInterstitial() {
    if (!this.initialized) return Promise.reject(new Error('Ads not initialized'));
    try {
      await this.admob.showInterstitial();
      console.log('[Ads] Interstitial shown');
      this.interstitialLoaded = false;
      // Preload next
      setTimeout(() => this.prepareInterstitial(), 1000);
    } catch (e) {
      console.log('[Ads] Interstitial show error:', e.message);
      // If not ready, try preparing now
      if (!this.interstitialLoaded) {
        this.prepareInterstitial();
      }
    }
  }

  isInterstitialReady() {
    return this.initialized && this.interstitialLoaded;
  }

  // ══════════════ REWARDED ══════════════
  async prepareRewarded() {
    if (!this.initialized) return;
    this.rewardedLoaded = false; // reset until event confirms load
    try {
      await this.admob.prepareRewardVideoAd({
        adId: this.ADS.rewarded,
        isTesting: this.isTesting,
      });
      console.log('[Ads] Rewarded request sent');
    } catch (e) {
      console.log('[Ads] Rewarded prepare error:', e.message);
      setTimeout(() => this.prepareRewarded(), 5000);
    }
  }

  async showRewarded(callback) {
    if (!this.initialized) {
      console.log('[Ads] Rewarded: not initialized');
      return false;
    }
    if (!this.rewardedLoaded) {
      console.log('[Ads] Rewarded not loaded, trying prepare first');
      await this.prepareRewarded();
      // Wait up to 10s for load
      for (let i = 0; i < 20; i++) {
        if (this.rewardedLoaded) break;
        await new Promise(r => setTimeout(r, 500));
      }
      if (!this.rewardedLoaded) {
        console.log('[Ads] Rewarded still not ready after waiting');
        return false;
      }
    }
    try {
      const result = await this.admob.showRewardVideoAd();
      console.log('[Ads] Reward! type:', result.type, 'amount:', result.amount);
      this.rewardedLoaded = false;
      if (callback) callback();
      setTimeout(() => this.prepareRewarded(), 1000);
      return true;
    } catch (e) {
      console.log('[Ads] Rewarded error:', e.message);
    }
    return false;
  }

  isRewardedReady() {
    return this.initialized && this.rewardedLoaded;
  }
}

// Singleton
window.adsManager = new AdsManager();
