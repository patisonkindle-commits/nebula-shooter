// Project Nebula — Entry point
(function() {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    canvas.width = CONFIG.WIDTH;
    canvas.height = CONFIG.HEIGHT;

    // On Android/Capacitor — fill full screen (AdMob banner overlays WebView)
    const isAndroid = window.Capacitor && window.Capacitor.isNative;
    if (isAndroid) {
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      return;
    }

    // Desktop: aspect-ratio fit with room for footer
    const parent = canvas.parentElement;
    const pw = parent.clientWidth || CONFIG.WIDTH;
    const ratio = CONFIG.WIDTH / CONFIG.HEIGHT;
    const maxH = vh - 4;

    if (pw / ratio > maxH) {
      canvas.style.width = 'auto';
      canvas.style.height = maxH + 'px';
    } else {
      canvas.style.width = pw + 'px';
      canvas.style.height = (pw / ratio) + 'px';
    }
  }

  resize();
  window.addEventListener('resize', resize);

  // RoundRect polyfill for Canvas
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      if (typeof r === 'number') r = [r];
      const radii = r.map(v => Math.min(v, Math.min(w, h) / 2));
      const tl = radii[0] || 0;
      this.moveTo(x + tl, y);
      this.arcTo(x + w, y, x + w, y + h, tl);
      this.arcTo(x + w, y + h, x, y + h, tl);
      this.arcTo(x, y + h, x, y, tl);
      this.arcTo(x, y, x + w, y, tl);
      this.closePath();
    };
  }

  // ── Stop audio when page is hidden / closed ──
  function handleVisibilityChange() {
    if (document.hidden) {
      game.audio.bgmStop();
    } else {
      // Resume BGM if we were playing before (state is not 'menu' idle)
      if (game.state === 'playing' || game.state === 'boss') {
        game.audio.bgmSetState(game.state);
      } else if (game.state === 'menu') {
        game.audio.bgmStart('menu');
      }
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', () => game.audio.bgmStop());
  window.addEventListener('beforeunload', () => game.audio.bgmStop());

  // Start game
  const game = new Game(canvas, ctx);
  game.init();
  game.start();

  // ── Initialize Ads (Capacitor only) ──
  setTimeout(async () => {
    await window.adsManager.init();
    if (window.adsManager.initialized) {
      // Show banner immediately
      await window.adsManager.showBanner();
      // Preload interstitial & rewarded
      window.adsManager.prepareInterstitial();
      window.adsManager.prepareRewarded();
    }
  }, 1000);

  // Debug API
  window.__game = game;
})();
