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
    // Canvas sizing: scale to fit container without overflow
    const parent = canvas.parentElement;
    const pw = parent.clientWidth || CONFIG.WIDTH;
    const ratio = CONFIG.WIDTH / CONFIG.HEIGHT;

    if (pw / ratio > window.innerHeight - 120) {
      // Window height is the bottleneck (mobile landscape excluded)
      canvas.style.width = 'auto';
      canvas.style.height = Math.min(window.innerHeight - 120, CONFIG.HEIGHT) + 'px';
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
