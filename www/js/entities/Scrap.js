// Scrap / Core collectibles
function createScrap() {
  return { x: 0, y: 0, vx: 0, vy: 0, radius: 5, alive: false, isCore: false, bob: 0 };
}

class ScrapManager {
  constructor() {
    this.pool = new Pool(createScrap, CONFIG.SCRAP_POOL_SIZE);
    this.totalCollected = 0;
  }

  spawn(x, y, count, isCore = false) {
    for (let i = 0; i < count; i++) {
      const s = this.pool.acquire();
      if (!s) break;
      s.x = x + rand(-5, 5);
      s.y = y + rand(-5, 5);
      s.vx = rand(-30, 30);
      s.vy = rand(-60, -20);
      s.isCore = isCore;
      s.radius = isCore ? 7 : 4;
      s.bob = rand(0, Math.PI * 2);
    }
  }

  update(dt, player, meta, game) {
    const mods = meta ? meta.getAppliedModifiers() : {};
    let magnetMult = mods.magnetMult || 1;
    // Apply in-run Magnet Up bonus
    if (game && game._magnetBonus) {
      magnetMult *= game._magnetBonus;
    }
    const magnetRadius = CONFIG.SCRAP_COLLECT_RADIUS * magnetMult;
    const hasScrapMagnet = mods.scrapMagnet || false;
    const hasCoreMagnet = mods.coreMagnet || false;

    this.pool.updateAll(dt, (s) => {
      s.bob += dt * 3;
      s.vy += 80 * dt; // gravity
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Auto-collect proximity (snap to player so _checkScrapCollection picks it up)
      const d = dist(s, player);
      if (game && d < CONFIG.SCRAP_AUTO_COLLECT_RADIUS) {
        s.x = player.x;
        s.y = player.y;
        return;
      }

      // Magnet toward player
      const isScrap = !s.isCore;
      if ((isScrap && (d < magnetRadius || hasScrapMagnet)) ||
          (!isScrap && (d < magnetRadius * 1.5 || hasCoreMagnet))) {
        if (d > 2) {
          const pull = isScrap ? 400 : 300;
          s.x += (player.x - s.x) / d * pull * dt;
          s.y += (player.y - s.y) / d * pull * dt;
        }
      }

      if (s.y > CONFIG.HEIGHT + 20 || s.x < -20 || s.x > CONFIG.WIDTH + 20) {
        this.pool.release(s);
      }
    });
  }

  render(ctx) {
    this.pool.forEach(s => {
      const bobOffset = Math.sin(s.bob) * 2;
      ctx.shadowBlur = 0;
      if (s.isCore) {
        ctx.fillStyle = '#ff66ff';
        ctx.shadowColor = '#ff44ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(s.x, s.y + bobOffset, s.radius, 0, Math.PI * 2);
        ctx.fill();
        // Inner diamond
        ctx.fillStyle = '#ffaaff';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + bobOffset - 3);
        ctx.lineTo(s.x + 3, s.y + bobOffset);
        ctx.lineTo(s.x, s.y + bobOffset + 3);
        ctx.lineTo(s.x - 3, s.y + bobOffset);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#44ff88';
        ctx.shadowColor = '#22ff66';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y + bobOffset, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    });
  }

  releaseAll() {
    this.pool.releaseAll();
    this.totalCollected = 0;
  }
}
