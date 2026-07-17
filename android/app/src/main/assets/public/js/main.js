// Project Nebula — Entry point
(function() {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ── Global error guard (catches uncaught exceptions ← #1 crash fix) ──
  window.addEventListener('error', function(e) {
    const errDiv = document.getElementById('errlog');
    if (errDiv) errDiv.textContent = 'JS: ' + (e.message || e.error || e);
    console.log('[FATAL]', e.message || e.error || e);
    e.preventDefault();
  });
  window.addEventListener('unhandledrejection', function(e) {
    const errDiv = document.getElementById('errlog');
    if (errDiv) errDiv.textContent = 'PROMISE: ' + (e.reason || e);
    console.log('[FATAL] Unhandled rejection:', e.reason || e);
    e.preventDefault();
  });

  // ── Detect if running inside Capacitor native WebView ──
  const isAndroid = window.Capacitor && (
    window.Capacitor.isNative === true ||
    (window.Capacitor.getPlatform && ['android','ios'].includes(window.Capacitor.getPlatform()))
  );
  // If Capacitor native detected, add CSS class for Android layout
  if (isAndroid) {
    document.body.classList.add('capacitor');
  }

  // ── Bottom banner height in CSS pixels (≈ Android dp) ──
  // AdMob adaptive banner on phones ≈ 50dp; landscape ≈ 32dp.
  // Reserving this space keeps game canvas visible above the ad.
  const BANNER_HEIGHT = 50;

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
      visualViewportSafeTop = curTop;
      SAFE_TOP = getSafeAreaInsetTop() + curTop;
      resize();
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
      const dpr = window.devicePixelRatio || 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availH = vh - SAFE_TOP - BANNER_HEIGHT;

      // ── CSS display size (device-independent pixels) ──
      let cssW, cssH;
      if (vw / availH > gameAspect) {
        cssH = Math.floor(availH);
        cssW = Math.floor(availH * gameAspect);
      } else {
        cssW = Math.floor(vw);
        cssH = Math.floor(vw / gameAspect);
      }
      cssW = Math.max(cssW, 1);
      cssH = Math.max(cssH, 1);

      // ═══════════════════════════════════════════════════════════════
      // Canvas buffer = PHYSICAL pixels (CSS × DPR)
      // On Android this is ~1080×1944 — the exact screen resolution.
      // Compositor does ZERO upscaling = perfectly sharp pixels.
      // Game draws in logical coords (400×720) via setTransform.
      // Canvas CSS size = CSS display size (using -moz-device-pixel-ratio).
      // ═══════════════════════════════════════════════════════════════
      const bufW = Math.round(cssW * dpr);
      const bufH = Math.round(cssH * dpr);
      const scale = bufW / CONFIG.WIDTH;
      canvas.width = bufW;
      canvas.height = bufH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = false;

      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.style.position = 'absolute';
      canvas.style.left = Math.round((vw - cssW) / 2) + 'px';
      canvas.style.top = Math.round(SAFE_TOP + (availH - cssH) / 2) + 'px';

      // Container fills viewport
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

      // Store uniform scale (buffer px ÷ logical px) for game juice math
      canvas._pixelScale = scale;

      syncChromaCanvas();
      return;
    }

    // Desktop — same physical-pixel pattern for consistency
    const parent = canvas.parentElement;
    const pw = parent.clientWidth || CONFIG.WIDTH;
    const maxH = window.innerHeight - 4;

    let cssW2, cssH2;
    if (pw / gameAspect > maxH) {
      cssH2 = Math.floor(maxH);
      cssW2 = Math.floor(maxH * gameAspect);
    } else {
      cssW2 = Math.floor(pw);
      cssH2 = Math.floor(pw / gameAspect);
    }
    cssW2 = Math.max(cssW2, 1);
    cssH2 = Math.max(cssH2, 1);

    const dpr2 = window.devicePixelRatio || 1;
    const bufW2 = Math.round(cssW2 * dpr2);
    const bufH2 = Math.round(cssH2 * dpr2);
    const scale2 = bufW2 / CONFIG.WIDTH;
    canvas.width = bufW2;
    canvas.height = bufH2;
    ctx.setTransform(scale2, 0, 0, scale2, 0, 0);
    ctx.imageSmoothingEnabled = false;

    canvas.style.width = cssW2 + 'px';
    canvas.style.height = cssH2 + 'px';
    canvas.style.position = '';
    canvas.style.top = '';
    canvas.style.left = '';

    canvas._pixelScale = scale2;
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
    const g = window.__game;
    if (!g || !g.audio) return;
    if (document.hidden) {
      g.audio.bgmStop();
    } else {
      if (g.state === 'playing' || g.state === 'boss') {
        g.audio.bgmSetState(g.state);
      } else if (g.state === 'menu') {
        g.audio.bgmStart('menu');
      }
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', () => { const g = window.__game; if (g && g.audio) g.audio.bgmStop(); });
  window.addEventListener('beforeunload', () => { const g = window.__game; if (g && g.audio) g.audio.bgmStop(); });

  // Start game
  let game;
  try {
    game = new Game(canvas, ctx);
    game.init();
    game.start();
  } catch (e) {
    console.log('[FATAL] Game init error:', e && e.message);
  }

  // ── Initialize Ads (Capacitor only) ──
  setTimeout(() => {
    window.adsManager.init()
      .then(() => {
        if (window.adsManager.initialized) {
          return window.adsManager.showBanner()
            .then(() => {
              window.adsManager.prepareInterstitial();
              window.adsManager.prepareRewarded();
            });
        }
      })
      .catch(err => console.log('[Ads] Init chain error:', err));
  }, 1000);

  window.__game = game;
})();
