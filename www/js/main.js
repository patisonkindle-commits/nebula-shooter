// Project Nebula — Entry point
(function() {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ── Detect if running inside Capacitor native WebView ──
  const isAndroid = window.Capacitor && window.Capacitor.isNative === true;

  // ── Determine the top safe-area inset for notch / status bar ──
  function getSafeAreaInsetTop() {
    // 1) CSS env() via probe — works with viewport-fit=cover
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;padding-top:env(safe-area-inset-top,0px);pointer-events:none;opacity:0;z-index:-1';
    document.body.appendChild(probe);
    const envTop = probe.offsetTop;
    document.body.removeChild(probe);
    if (envTop > 0) return envTop;

    // 2) Capacitor StatusBar plugin (if installed)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
      // We'll get it asynchronously later, but the synchronous call won't work
    }

    // 3) visualViewport.offsetTop — works on Android edge-to-edge (API 35+)
    if (window.visualViewport && window.visualViewport.offsetTop > 0) {
      return window.visualViewport.offsetTop;
    }

    // 4) Reasonable default for Android (density-independent pixels)
    //    24dp for status bar ≈ 24 * dpr pixels
    if (isAndroid) {
      const dpr = window.devicePixelRatio || 1;
      // Modern Android: status bar is ~24dp, but with notch can be 36-48dp
      const estimatedDp = dpr >= 3 ? 36 : 28;
      return Math.round(estimatedDp);
    }

    return 0;
  }

  // ── Dynamic visualViewport safe-area (handles resize/orientation) ──
  let SAFE_TOP = getSafeAreaInsetTop();
  let visualViewportSafeTop = 0;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const curTop = window.visualViewport.offsetTop || 0;
      if (curTop > visualViewportSafeTop) {
        visualViewportSafeTop = curTop;
        SAFE_TOP = curTop;
        resize();
      }
    });
  }

  // ── Core resize logic ──
  function _resize() {
    const gameAspect = CONFIG.WIDTH / CONFIG.HEIGHT; // 400/720 ≈ 0.555

    // Helper: sync offscreen chroma canvas to current buffer size
    function syncChromaCanvas() {
      const game = window.__game;
      if (game && game._chromaCanvas) {
        game._chromaCanvas.width = canvas.width;
        game._chromaCanvas.height = canvas.height;
        game._chromaCtx.imageSmoothingEnabled = false;
      }
    }

    if (isAndroid) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availH = vh - SAFE_TOP;

      // ── Calculate display size (CSS pixels) maintaining aspect ratio ──
      let cssW, cssH;
      if (vw / availH > gameAspect) {
        // Limited by height
        cssH = Math.floor(availH);
        cssW = Math.floor(availH * gameAspect);
      } else {
        // Limited by width
        cssW = Math.floor(vw);
        cssH = Math.floor(vw / gameAspect);
      }
      // Enforce minimum size
      cssW = Math.max(cssW, 1);
      cssH = Math.max(cssH, 1);

      // ── Canvas buffer = EXACTLY CSS display size (1:1 mapping) ──
      // No DPR multiplication — browser maps 1 buffer pixel → 1 CSS pixel
      // Scaling from logical coords (CONFIG.WIDTH × CONFIG.HEIGHT) is handled
      // via setTransform with ctx.imageSmoothingEnabled = false
      canvas.width = cssW;
      canvas.height = cssH;

      const scale = cssW / CONFIG.WIDTH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // CSS size = buffer size (1:1), so no sub-pixel interpolation occurs
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.style.position = 'absolute';
      canvas.style.left = Math.round((vw - cssW) / 2) + 'px';
      canvas.style.top = Math.round(SAFE_TOP + (availH - cssH) / 2) + 'px';

      // Container: fills viewport, bg colour handles letterbox bars
      const container = document.getElementById('container');
      if (container) {
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.overflow = 'hidden';
        container.style.background = '#050510';
      }

      // Store scale so Game.js can use it instead of window DPR
      canvas._pixelScale = scale;

      syncChromaCanvas();
      return;
    }

    // Desktop
    canvas.width = CONFIG.WIDTH;
    canvas.height = CONFIG.HEIGHT;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const parent = canvas.parentElement;
    const pw = parent.clientWidth || CONFIG.WIDTH;
    const maxH = window.innerHeight - 4;

    if (pw / gameAspect > maxH) {
      canvas.style.width = 'auto';
      canvas.style.height = Math.floor(maxH) + 'px';
    } else {
      canvas.style.width = Math.floor(pw) + 'px';
      canvas.style.height = Math.floor(pw / gameAspect) + 'px';
    }
    canvas.style.position = '';
    canvas.style.top = '';
    canvas.style.left = '';

    canvas._pixelScale = 1;
    syncChromaCanvas();
  }

  // ── Wrapped resize ──
  function resize() {
    _resize();
  }

  window.addEventListener('resize', resize);
  resize();

  // RoundRect polyfill
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

  // ── Audio lifecycle ──
  function handleVisibilityChange() {
    if (document.hidden) {
      game.audio.bgmStop();
    } else {
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
      await window.adsManager.showBanner();
      window.adsManager.prepareInterstitial();
      window.adsManager.prepareRewarded();
    }
  }, 1000);

  window.__game = game;
})();
