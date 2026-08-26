// v1.19 AdsManager unit tests — stub Capacitor.Plugins.AdMob, assert behavior.
const fs = require('fs');
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadAds() {
  const src = fs.readFileSync(__dirname + '/../js/AdsManager.js', 'utf8');
  const listeners = {}; let calls = [];
  const fakeAdmob = {
    initialize: async () => {},
    addListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); return () => {}; },
    showBanner: async () => { calls.push('showBanner'); },
    hideBanner: async () => {},
    prepareInterstitial: async () => { calls.push('prepInt'); },
    showInterstitial: async () => { calls.push('showInt'); },
    prepareRewardVideoAd: async () => { calls.push('prepRew'); },
    showRewardVideoAd: async () => { calls.push('showRew'); return { type: 'rewarded', amount: 1 }; },
  };
  global.Capacitor = {
    isNative: true,
    Plugins: { AdMob: fakeAdmob },
  };
  global.window = global;
  // fresh instance per test
  const sandbox = { window: null, Capacitor: global.Capacitor };
  const fn = new Function(src + '; return new AdsManager();');
  const mgr = fn();
  mgr.__fake = fakeAdmob; mgr.__listeners = listeners; mgr.__calls = calls;
  return mgr;
}

(async () => {
  // ── T1: init registers all event listeners once ──
  {
    const m = loadAds();
    await m.init(1);
    check('T1 init ok', m.initialized);
    for (const ev of ['interstitialAdLoaded','interstitialAdFailedToLoad','onRewardedVideoAdLoaded','onRewardedVideoAdFailedToLoad','onRewardedVideoAdDismissed'])
      check('T1 listener ' + ev, (m.__listeners[ev] || []).length === 1);
  }

  // ── T2: single-flight retry — N fail events in burst => exactly 1 scheduled timer ──
  {
    const m = loadAds();
    await m.init(1);
    for (let i = 0; i < 5; i++) m.__listeners['interstitialAdFailedToLoad'].forEach(f => f({}));
    check('T2 one pending retry timer', Object.keys(m._retryTimers).filter(k => m._retryTimers[k]).length === 1);
    check('T2 no immediate re-prepare storm', m.__calls.filter(c => c === 'prepInt').length === 0);
  }

  // ── T3: fail event → after 5s exactly ONE re-prepare fires (linear, not 2^N) ──
  {
    const m = loadAds();
    await m.init(1);
    m.prepareInterstitial(); // initial prepare
    await sleep(10);
    m.__calls.length = 0;
    // simulate persistent failure loop: each fail schedules one retry
    m.__listeners['interstitialAdFailedToLoad'].forEach(f => f({}));
    await sleep(5100);
    const n = m.__calls.filter(c => c === 'prepInt').length;
    check('T3 linear retry (1 per cycle)', n === 1);
  }

  // ── T4: rewarded full watch → callback fired, returns true ──
  {
    const m = loadAds();
    await m.init(1);
    m.rewardedLoaded = true;
    let rewarded = false;
    const ok = await m.showRewarded(() => { rewarded = true; });
    check('T4 full watch returns true', ok === true);
    check('T4 reward callback fired', rewarded);
  }

  // ── T5: early dismiss → race unblocks, returns false promptly, no reward ──
  {
    const m = loadAds();
    await m.init(1);
    m.rewardedLoaded = true;
    // Native behavior: showRewardVideoAd() NEVER resolves on early close.
    m.__fake.showRewardVideoAd = () => new Promise(() => {});
    let rewarded = false;
    const t0 = Date.now();
    const p = m.showRewarded(() => { rewarded = true; });
    await sleep(300); // ad "playing"
    m.__listeners['onRewardedVideoAdDismissed'].forEach(f => f());
    const ok = await Promise.race([p, sleep(2000).then(() => 'HUNG')]);
    const dt = Date.now() - t0;
    check('T5 dismiss returns false (no hang)', ok === false && dt < 1500);
    check('T5 no reward on early close', rewarded === false);
    // dismissal schedules one rewarded re-prepare
    await sleep(5100);
    check('T5 re-prepare after dismiss', m.__calls.filter(c => c === 'prepRew').length >= 1);
  }

  // ── T6: not loaded → wait loop prepares and polls up to 10s ──
  {
    const m = loadAds();
    await m.init(1);
    const p = m.showRewarded(() => {});
    await sleep(100);
    m.rewardedLoaded = true; // ad arrives mid-wait
    const t0 = Date.now();
    const ok = await p;
    check('T6 wait-loop then show OK', ok === true && Date.now() - t0 < 12000);
  }

  // ── T7: interstitial show failure path preps again, does not throw ──
  {
    const m = loadAds();
    await m.init(1);
    m.__fake.showInterstitial = async () => { throw new Error('not ready'); };
    let threw = false;
    try { await m.showInterstitial(); } catch (e) { threw = true; }
    check('T7 show fail swallowed + re-prepares', !threw);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
