// In-game HUD — hp, shield, wave, kills, scrap, boss hp, XP bar — with glow & polish
class HUD {
  render(ctx, player, enemies, game, scrapManager, stats) {
    // ── Top bar ──
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(0, 0, CONFIG.WIDTH, 32, [0, 0, 4, 4]);
    ctx.fill();

    // ── HP hearts ──
    ctx.textAlign = 'left';
    for (let i = 0; i < player.maxHp; i++) {
      const hx = 6 + i * 14;
      const alive = i < player.hp;
      ctx.shadowColor = alive ? '#ff4466' : 'transparent';
      ctx.shadowBlur = alive ? 8 : 0;
      ctx.fillStyle = alive ? '#ff4466' : '#332222';
      ctx.font = '13px monospace';
      ctx.fillText(alive ? '♥' : '♡', hx, 21);
      // Extra heartbeat pulse on last HP
      if (alive && player.hp === 1 && i === 0) {
        ctx.shadowBlur = 14 + 6 * Math.sin(performance.now() * 0.005);
        ctx.fillText('♥', hx, 21);
      }
    }
    ctx.shadowBlur = 0;

    // ── Shield indicator ──
    if (player.shield > 0) {
      ctx.fillStyle = '#66ccff';
      ctx.font = '9px monospace';
      ctx.fillText(`⛡${player.shield}`, 6 + player.maxHp * 14 + 4, 20);
    }

    // ── Shield visual bar ──
    if (player.maxShield > 0) {
      for (let i = 0; i < player.maxShield; i++) {
        const sx = 6 + i * 8;
        const sy = 24;
        const hasShield = i < player.shield;
        ctx.shadowColor = hasShield ? '#66ccff' : 'transparent';
        ctx.shadowBlur = hasShield ? 4 : 0;
        ctx.fillStyle = hasShield ? '#66ccff' : '#1a3344';
        ctx.fillRect(sx, sy, 6, 4);
      }
      ctx.shadowBlur = 0;
    }

    // ── Wave badge (glowing, top-right) ──
    ctx.textAlign = 'right';
    ctx.shadowColor = '#ffddaa';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffddaa';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`✧ WAVE ${game.wave}`, CONFIG.WIDTH - 8, 20);
    ctx.shadowBlur = 0;

    // ── Mute indicator (below wave badge, to avoid overlap) ──
    ctx.textAlign = 'right';
    const muted = game.audio.isMuted();
    ctx.fillStyle = muted ? '#ff4466' : '#44ff88';
    ctx.shadowColor = muted ? '#ff4466' : '#44ff88';
    ctx.shadowBlur = muted ? 6 : 4;
    ctx.font = '9px monospace';
    ctx.fillText(muted ? '🔇' : '🔊', CONFIG.WIDTH - 8, 30);
    ctx.shadowBlur = 0;

    // ── Boss HP bar ──
    if (enemies.bossActive) {
      for (const e of enemies.pool.active) {
        if (e.isBoss && e.alive) {
          const barY = 34;
          const barW = CONFIG.WIDTH - 40;
          const barH = 10;
          const bx = 20;

          // Bar background with glow
          ctx.shadowColor = '#ff44ff';
          ctx.shadowBlur = 10;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.beginPath();
          ctx.roundRect(bx, barY, barW, barH, 4);
          ctx.fill();
          ctx.shadowBlur = 0;

          // HP fill with gradient
          const pct = e.hp / e.maxHp;
          const fillColor = pct > 0.5 ? '#ff44ff' : pct > 0.25 ? '#ff8844' : '#ff2222';
          ctx.shadowColor = fillColor;
          ctx.shadowBlur = 6;
          ctx.fillStyle = fillColor;
          ctx.beginPath();
          ctx.roundRect(bx, barY, barW * pct, barH, 4);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Phase indicators
          if (e.bossPhase === 2) {
            ctx.fillStyle = '#ff2222';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 8;
            ctx.fillText('⚠ PHASE 2 ⚠', CONFIG.WIDTH / 2, barY + 9);
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
          }

          break;
        }
      }
    }

    // ── XP bar (gradient glow) ──
    const xpY = 34;
    const xpW = CONFIG.WIDTH - 16;
    const xpH = 4;
    if (game.level >= 0 && !enemies.bossActive) {
      const pct = Math.min(1, game.xp / game.xpToNext);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(8, xpY, xpW, xpH);
      if (pct > 0) {
        const xpGrad = ctx.createLinearGradient(8, xpY, 8 + xpW * pct, xpY);
        xpGrad.addColorStop(0, '#44aaff');
        xpGrad.addColorStop(0.5, '#6688ff');
        xpGrad.addColorStop(1, '#8844ff');
        ctx.fillStyle = xpGrad;
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 4;
        ctx.fillRect(8, xpY, xpW * pct, xpH);
        ctx.shadowBlur = 0;
      }
    }

    // ── Bottom stats bar ──
    const barY = CONFIG.HEIGHT - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(0, barY, CONFIG.WIDTH, 22, [4, 4, 0, 0]);
    ctx.fill();

    // Scrap with glow
    ctx.shadowColor = '#44ff88';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#44ff88';
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    ctx.fillText(`★ ${stats.scrap || 0}`, 8, barY + 15);
    ctx.shadowBlur = 0;

    // Cores with glow
    ctx.shadowColor = '#ff88ff';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ff88ff';
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillText(`◆ ${stats.cores || 0}`, CONFIG.WIDTH / 2, barY + 15);
    ctx.shadowBlur = 0;

    // Kills
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.font = '10px monospace';
    ctx.fillText(`☠ ${enemies.kills}`, CONFIG.WIDTH - 8, barY + 15);

    // Enemies remaining
    if (enemies && !enemies.bossActive) {
      const remaining = Math.max(0, game.enemiesThisWave - game.enemiesSpawnedThisWave + enemies.count);
      ctx.fillStyle = '#555577';
      ctx.textAlign = 'right';
      ctx.font = '7px monospace';
      ctx.fillText(`${remaining} left`, CONFIG.WIDTH - 8, barY + 4);
    }

    // ── Upgrade level indicators ──
    ctx.textAlign = 'left';
    let uiX = 6;
    let uiY = CONFIG.HEIGHT - 28;
    const activeUpgrades = [];
    if (player.spreadLevel > 0) activeUpgrades.push({ icon: '↕', color: '#ffaa44' });
    if (player.homingLevel > 0) activeUpgrades.push({ icon: '◎', color: '#44ffaa' });
    if (player.piercingLevel > 0) activeUpgrades.push({ icon: '⇛', color: '#ff66ff' });
    if (player.ricochetLevel > 0) activeUpgrades.push({ icon: '↯', color: '#66ccff' });
    if (player.waveLevel > 0) activeUpgrades.push({ icon: '〰', color: '#ff6688' });
    if (player.laserActive) activeUpgrades.push({ icon: '⚡', color: '#ff4444' });
    if (player.orbitalLevel > 0) activeUpgrades.push({ icon: '◆', color: '#cc77ff' });

    ctx.font = '7px monospace';
    for (const ug of activeUpgrades) {
      ctx.fillStyle = ug.color;
      ctx.shadowColor = ug.color;
      ctx.shadowBlur = 3;
      ctx.fillText(ug.icon, uiX, uiY);
      ctx.shadowBlur = 0;
      uiX += 11;
    }

    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
  }
}
