// v2 AdsManager — production IDs, retry loop, interstitial + rewarded
class AdsManager {
  constructor() {
    this.bannerId = 'ca-app-pub-5374637740061879/6704210964';
    this.interstitialId = 'ca-app-pub-5374637740061879/6704210964';
    this.rewardedId = 'ca-app-pub-5374637740061879/6704210964';
    this._banner = null;
    this._interstitial = null;
    this._rewarded = null;
    this._initialized = false;
    this._interstitialReady = false;
    this._rewardedReady = false;
    this._retryCount = 0;
    this._maxRetries = 5;
  }

  init() {
    this._retryInit();
  }

  _retryInit() {
    if (!this._initialized) {
      try {
        // Capacitor AdMob plugin call
        if (typeof window !== 'undefined' && window.adsManager) {
          window.adsManager.init({
            banner: { adId: this.bannerId, position: 'bottom', x: 0, y: 0, width: 320, height: 50 },
            interstitial: { adId: this.interstitialId },
            rewarded: { adId: this.rewardedId },
          });
          this._initialized = true;
          this._interstitialReady = true;
          this._rewardedReady = true;
        }
      } catch (e) {
        console.warn('AdsManager: init failed, retrying...', e);
        setTimeout(() => this._retryInit(), 1000);
      }
    }
  }

  showInterstitial(callback) {
    if (!this._interstitialReady) {
      setTimeout(() => this.showInterstitial(callback), 2000);
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.adsManager) {
        window.adsManager.showInterstitial();
      }
      if (callback) callback();
    } catch (e) {
      console.warn('AdsManager: showInterstitial failed', e);
    }
  }

  showRewarded(callback) {
    if (!this._rewardedReady) {
      setTimeout(() => this.showRewarded(callback), 2000);
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.adsManager) {
        window.adsManager.showRewarded();
      }
      if (callback) callback();
    } catch (e) {
      console.warn('AdsManager: showRewarded failed', e);
    }
  }

  destroy() {
    try {
      if (typeof window !== 'undefined' && window.adsManager) {
        window.adsManager.destroy();
      }
    } catch (e) {
      console.warn('AdsManager: destroy failed', e);
    }
  }
}

export { AdsManager };
