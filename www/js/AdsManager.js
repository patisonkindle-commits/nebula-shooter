// Nebula — AdMob Manager for Capacitor (Banner + Interstitial + Rewarded)
class AdsManager {
  constructor() {
    this.initialized = false;
    this.admob = null;
    this.bannerShowing = false;
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;

    // ── Ad Unit IDs (จาก AdMob) ──
    this.ADS = {
      banner: 'ca-app-pub-5374637740061879/8912551848',
      interstitial: 'ca-app-pub-5374637740061879/8348645309',
      rewarded: 'ca-app-pub-5374637740061879/4950163450',
    };

    // Check if running inside Capacitor WebView
    this.isCapacitor = typeof Capacitor !== 'undefined' && Capacitor.Plugins;
  }

  // ── Init ──
  async init() {
    if (!this.isCapacitor) {
      console.log('[Ads] Skipped (not Capacitor)');
      return;
    }
    try {
      this.admob = Capacitor.Plugins.AdMob;
      // Init the AdMob SDK
      await this.admob.initialize();
      this.initialized = true;
      console.log('[Ads] AdMob initialized');
    } catch (e) {
      console.log('[Ads] Init error:', e.message);
    }
  }

  // ══════════════ BANNER ══════════════
  async showBanner() {
    if (!this.initialized || this.bannerShowing) return;
    try {
      await this.admob.showBanner({
        adId: this.ADS.banner,
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        isTesting: false,
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
    try {
      await this.admob.prepareInterstitial({
        adId: this.ADS.interstitial,
        isTesting: false,
      });
      this.interstitialLoaded = true;
      console.log('[Ads] Interstitial ready');
    } catch (e) {
      console.log('[Ads] Interstitial prepare error:', e.message);
    }
  }

  async showInterstitial() {
    if (!this.initialized || !this.interstitialLoaded) return;
    try {
      await this.admob.showInterstitial();
      console.log('[Ads] Interstitial shown');
      this.interstitialLoaded = false;
      // Preload next one immediately
      setTimeout(() => this.prepareInterstitial(), 1000);
    } catch (e) {
      console.log('[Ads] Interstitial show error:', e.message);
    }
  }

  // ══════════════ REWARDED ══════════════
  async prepareRewarded() {
    if (!this.initialized) return;
    try {
      await this.admob.prepareRewardVideoAd({
        adId: this.ADS.rewarded,
        isTesting: false,
      });
      this.rewardedLoaded = true;
      console.log('[Ads] Rewarded ready');
    } catch (e) {
      console.log('[Ads] Rewarded prepare error:', e.message);
    }
  }

  async showRewarded(callback) {
    if (!this.initialized || !this.rewardedLoaded) {
      console.log('[Ads] Rewarded not loaded yet');
      return false;
    }
    try {
      const result = await this.admob.showRewardVideoAd();
      console.log('[Ads] Reward! type:', result.type, 'amount:', result.amount);
      this.rewardedLoaded = false;
      if (callback) callback();
      // Preload next
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

  isInterstitialReady() {
    return this.initialized && this.interstitialLoaded;
  }
}

// Singleton
window.adsManager = new AdsManager();
