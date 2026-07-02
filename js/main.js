// Project Nebula — Entry point
(function() {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ratio = CONFIG.WIDTH / CONFIG.HEIGHT;

    canvas.width = CONFIG.WIDTH;
    canvas.height = CONFIG.HEIGHT;
    canvas.style.position = 'absolute';

    if (vw / vh < ratio) {
      canvas.style.width = vw + 'px';
      canvas.style.height = (vw / ratio) + 'px';
    } else {
      canvas.style.height = vh + 'px';
      canvas.style.width = (vh * ratio) + 'px';
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

  // Debug API
  window.__game = game;
})();
