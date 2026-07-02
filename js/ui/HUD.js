// In-game HUD — hp, shield, wave, kills, scrap, boss hp, XP bar
class HUD {
  render(ctx, player, enemies, game, scrapManager, stats) {
    // ── Top bar ──
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, 32);

    // ── HP hearts ──
    ctx.textAlign = 'left';
    for (let i = 0; i < player.maxHp; i++) {
      const hx = 6 + i * 14;
      const alive = i < player.hp;
      // Heart glow
      ctx.shadowColor = alive ? '#ff4466' : 'transparent';
      ctx.shadowBlur = alive ? 6 : 0;
      ctx.fillStyle = alive ? '#ff4466' : '#332222';
      ctx.font = '12px monospace';
      ctx.fillText(alive ? '♥' : '♡', hx, 20);
    }
    ctx.shadowBlur = 0;

    // ── Shield indicator ──
    if (player.shield > 0) {
      ctx.fillStyle = '#66ccff';
      ctx.font = '9px monospace';
      ctx.fillText(`⛡${player.shield}`, 6 + player.maxHp * 14 + 4, 20);
    }

    // ── Wave badge ──
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffddaa';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`✧ WAVE ${game.wave}`, CONFIG.WIDTH - 8, 20);

    // ── Boss HP bar ──
    if (enemies.bossActive) {
      for (const e of enemies.pool.active) {
        if (e.isBoss && e.alive) {
          const barY = 34;
          const barW = CONFIG.WIDTH - 40;
          const barH = 8;
          const bx = 20;

          // Bar background with glow
          ctx.shadowColor = '#ff44ff';
          ctx.shadowBlur = 6;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.roundRect(bx, barY, barW, barH, 3);
          ctx.fill();
          ctx.shadowBlur = 0;

          // HP fill
          const pct = e.hp / e.maxHp;
          const fillColor = pct > 0.3 ? '#ff44ff' : '#ff2222';
          ctx.fillStyle = fillColor;
          ctx.beginPath();
          ctx.roundRect(bx, barY, barW * pct, barH, 3);
          ctx.fill();

          // Label
          ctx.fillStyle = '#ff88ff';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#ff44ff';
          ctx.shadowBlur = 4;
          ctx.fillText('⚠ BOSS ⚠', CONFIG.WIDTH / 2, 40);
          ctx.shadowBlur = 0;
          ctx.textAlign = 'left';
          break;
        }
      }
    }

    // ── XP bar (below top bar) ──
    const xpY = 34;
    const xpW = CONFIG.WIDTH - 16;
    const xpH = 4;
    if (game.level >= 0) {
      const pct = Math.min(1, game.xp / game.xpToNext);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(8, xpY, xpW, xpH);
      const xpGrad = ctx.createLinearGradient(8, xpY, 8 + xpW * pct, xpY);
      xpGrad.addColorStop(0, '#44aaff');
      xpGrad.addColorStop(1, '#8844ff');
      ctx.fillStyle = xpGrad;
      ctx.fillRect(8, xpY, xpW * pct, xpH);
    }

    // ── Bottom stats bar ──
    const barY = CONFIG.HEIGHT - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, barY, CONFIG.WIDTH, 22);

    // Scrap
    ctx.fillStyle = '#44ff88';
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    ctx.fillText(`★ ${stats.scrap || 0}`, 8, barY + 15);

    // Cores
    ctx.fillStyle = '#ff88ff';
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillText(`◆ ${stats.cores || 0}`, CONFIG.WIDTH / 2, barY + 15);

    // Kills
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.font = '10px monospace';
    ctx.fillText(`☠ ${enemies.kills}`, CONFIG.WIDTH - 8, barY + 15);

    // Enemies remaining
    if (enemies && !enemies.bossActive) {
      const remaining = Math.max(0, game.enemiesThisWave - game.enemiesSpawnedThisWave + enemies.count);
      ctx.fillStyle = '#444466';
      ctx.textAlign = 'right';
      ctx.font = '7px monospace';
      ctx.fillText(`${remaining} left`, CONFIG.WIDTH - 8, barY + 4);
    }

    ctx.textAlign = 'left';
  }
}
