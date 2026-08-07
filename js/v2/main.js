// Project Nebula v2 — Entry point
// Bootstraps Game instance, handles Capacitor/Ads setup

import Game from './core/Game.js';
import { CONFIG } from './core/config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { willReadFrequently: false });

// ── Global error guard ──
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

// ── Detect Capacitor native ──
const isAndroid = window.Capacitor && (
  window.Capacitor.isNative === true ||
  (window.Capacitor.getPlatform && ['android','ios'].includes(window.Capacitor.getPlatform()))
);
if (isAndroid) {
  document.body.classList.add('capacitor');
}

// ── Safe-area + resize (mirrors v1 main.js logic) ──
const BANNER_HEIGHT = 80;

function getSafeAreaInsetTop() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;padding-top:env(safe-area-inset-top,0px);pointer-events:none;opacity:0;z-index:-1';
  document.body.appendChild(probe);
  const envTop = probe.offsetTop;
  document.body.removeChild(probe);
  if (envTop > 0) return envTop;

  if (window.visualViewport && window.visualViewport.offsetTop > 0) {
    return window.visualViewport.offsetTop;
  }

  if (isAndroid) {
    const dpr = window.devicePixelRatio || 1;
    const estimatedDp = dpr >= 3 ? 36 : 28;
    return Math.round(estimatedDp);
  }
  return 0;
}

let SAFE_TOP = getSafeAreaInsetTop();

function _resize() {
  const gameAspect = CONFIG.WIDTH / CONFIG.HEIGHT;
  const game = window.__game;

  function syncChromaCanvas() {
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

    const container = document.getElementById('container');
    if (container) {
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.overflow = 'visible';
      container.style.background = '#050510';
    }

    canvas._pixelScale = scale;
    syncChromaCanvas();
    return;
  }

  // Desktop path
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

window.addEventListener('resize', _resize);
_resize();

// ── RoundRect polyfill (needed before Game runs) ──
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r];
    const radii = r.map(v => Math.min(v, Math.min(w, h) / 2));
    const tl = radii[0] || 0;
    this.moveTo(x + tl, y);
    this.arcTo(x + w, y, x + w, y + h, tl);
    this.arcTo(x + w, y + h, x, y + h, tl);
    this.arcTo(x, y + h, x, y + h, tl);
    this.arcTo(x, y, x, y + h, tl);
    this.closePath();
  };
}

// ── Visibility change (BGM pause) ──
function handleVisibilityChange() {
  const g = window.__game;
  if (!g || !g.music) return;
  if (document.hidden) {
    g.music.stopMusic();
  } else {
    if (g.state === 'playing' || g.state === 'boss') {
      g.music.transition(g.state);
    } else if (g.state === 'menu') {
      g.music.transition('menu');
    }
  }
}
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('pagehide', () => { const g = window.__game; if (g && g.music) g.music.stopMusic(); });
window.addEventListener('beforeunload', () => { const g = window.__game; if (g && g.music) g.music.stopMusic(); });

// ── Boot game ──
let game;
try {
  game = new Game(canvas, ctx);
  game.init();
  game.start();
} catch (e) {
  console.log('[FATAL] Game init error:', e && e.message);
}

window.__game = game;

// ── Initialize Ads (Capacitor only) ──
setTimeout(() => {
  if (window.adsManager && window.adsManager.init) {
    console.log('[Ads] === Starting ads setup ===');
    window.adsManager.init().then(ok => {
      console.log('[Ads] Init result:', ok);
      if (!ok) return;

      console.log('[Ads] === Calling all ads ===');
      window.adsManager.showBanner().then(() => console.log('[Ads] Banner shown')).catch(e => console.log('[Ads] banner error:', e.message));
      window.adsManager.prepareInterstitial().then(() => console.log('[Ads] Interstitial prepared')).catch(e => console.log('[Ads] interstitial error:', e.message));
      window.adsManager.prepareRewarded().then(() => console.log('[Ads] Rewarded prepared')).catch(e => console.log('[Ads] rewarded error:', e.message));
    }).catch(e => console.log('[Ads] Init error:', e.message));
  }
}, 2000);
