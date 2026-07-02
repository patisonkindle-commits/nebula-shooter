// Main menu screen — redesigned with neon glow, animations, and vibrant visuals
class MenuScreen {
  constructor() {
    this.animTimer = 0;
    this.showTap = true;
    this.tapBlink = 0;
    this._engineParticles = [];
  }

  _drawShip(ctx, x, y, scale = 1, glow = '#4a9eff') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;

    // Outer hull
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-14, 10);
    ctx.lineTo(-6, 6);
    ctx.lineTo(0, 8);
    ctx.lineTo(6, 6);
    ctx.lineTo(14, 10);
    ctx.closePath();
    ctx.fillStyle = '#0f1a2a';
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cockpit
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-4, -2);
    ctx.lineTo(4, -2);
    ctx.closePath();
    ctx.fillStyle = glow;
    ctx.fill();

    // Engine glow (animated)
    ctx.shadowBlur = 0;
    const engineLen = 4 + Math.sin(this.animTimer * 4) * 2;
    const grad = ctx.createLinearGradient(0, 10, 0, 10 + engineLen);
    grad.addColorStop(0, 'rgba(74, 158, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(74, 158, 255, 0.3)');
    grad.addColorStop(1, 'rgba(74, 158, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.rect(-2, 10, 4, engineLen);
    ctx.fill();

    ctx.restore();
  }

  render(ctx, meta) {
    // Animated background — deeper space vibes
    ctx.fillStyle = '#06060e';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    this.animTimer += 0.016;

    // Nebula glow — two shifting color orbs
    const cx1 = CONFIG.WIDTH * 0.3 + Math.sin(this.animTimer * 0.08) * 30;
    const cy1 = CONFIG.HEIGHT * 0.3 + Math.cos(this.animTimer * 0.06) * 20;
    const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, CONFIG.WIDTH * 0.45);
    g1.addColorStop(0, 'rgba(68, 34, 136, 0.25)');
    g1.addColorStop(0.5, 'rgba(34, 68, 170, 0.1)');
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const cx2 = CONFIG.WIDTH * 0.7 + Math.sin(this.animTimer * 0.1 + 1) * 25;
    const cy2 = CONFIG.HEIGHT * 0.5 + Math.cos(this.animTimer * 0.07 + 1) * 15;
    const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, CONFIG.WIDTH * 0.35);
    g2.addColorStop(0, 'rgba(136, 34, 170, 0.15)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Grid lines (holographic feel)
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < CONFIG.HEIGHT; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(this.animTimer + y * 0.01) * 2);
      ctx.lineTo(CONFIG.WIDTH, y + Math.sin(this.animTimer + y * 0.01) * 2);
      ctx.stroke();
    }

    ctx.textAlign = 'center';

    // Subtitle accent line
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(74, 158, 255, 0.15)';
    ctx.fillRect(CONFIG.WIDTH * 0.2, CONFIG.HEIGHT * 0.18, CONFIG.WIDTH * 0.6, 1);

    // Title — NEBULA with strong neon glow
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#8ac4ff';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('NEBULA', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.21);

    // Secondary glow pass
    ctx.shadowBlur = 60;
    ctx.shadowColor = '#4a9eff';
    ctx.globalAlpha = 0.3;
    ctx.fillText('NEBULA', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.21);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#446688';
    ctx.font = '9px monospace';
    ctx.fillText('◈  ROGUELITE SPACE SHOOTER  ◈', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.27);

    // Decorative ship (larger, animated)
    const shipY = CONFIG.HEIGHT * 0.39 + Math.sin(this.animTimer * 0.5) * 3;
    this._drawShip(ctx, CONFIG.WIDTH / 2, shipY, 1.3, '#4a9eff');

    // Engine particles
    if (this.animTimer % 0.1 < 0.05) {
      this._engineParticles.push({
        x: CONFIG.WIDTH / 2 + (Math.random() - 0.5) * 6,
        y: shipY + 14,
        vy: 20 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 10,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
      });
    }
    for (let i = this._engineParticles.length - 1; i >= 0; i--) {
      const p = this._engineParticles[i];
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.life -= 0.016;
      if (p.life <= 0) { this._engineParticles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = '#4a9eff';
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Tap to start — pulsing with expanded glow
    this.tapBlink += 0.03;
    const tapAlpha = Math.sin(this.tapBlink) * 0.5 + 0.5;
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = tapAlpha * 15;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + tapAlpha * 0.5})`;
    ctx.font = '14px monospace';
    ctx.fillText('TAP TO START', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.52);
    ctx.shadowBlur = 0;

    // Subtitle line
    ctx.fillStyle = `rgba(74, 158, 255, ${0.2 + tapAlpha * 0.2})`;
    ctx.fillRect(CONFIG.WIDTH * 0.25, CONFIG.HEIGHT * 0.545, CONFIG.WIDTH * 0.5, 0.5);

    // Tips
    ctx.fillStyle = '#333355';
    ctx.font = '8px monospace';
    ctx.fillText('⟵  Drag to move  •  Auto-fire  •  Survive  ⟶', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.60);

    // Meta stats
    if (meta) {
      ctx.fillStyle = '#ff88ff';
      ctx.font = '10px monospace';
      ctx.shadowColor = '#ff44ff';
      ctx.shadowBlur = 6;
      ctx.fillText(`◆ ${meta.cores} cores`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.67);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#444466';
      ctx.font = '7px monospace';
      ctx.fillText(`lifetime: ${meta.totalCoresEarned}`, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.705);
    }

    // Upgrades button with glow
    const btnY = CONFIG.HEIGHT * 0.78;
    ctx.fillStyle = 'rgba(74, 158, 255, 0.06)';
    ctx.roundRect(CONFIG.WIDTH * 0.25, btnY - 10, CONFIG.WIDTH * 0.5, 22, 4);
    ctx.fill();

    ctx.fillStyle = '#5577aa';
    ctx.font = '9px monospace';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 4;
    ctx.fillText('◈ UPGRADES ◈', CONFIG.WIDTH / 2, btnY + 4);
    ctx.shadowBlur = 0;

    // Footer
    ctx.fillStyle = '#222244';
    ctx.font = '6px monospace';
    ctx.fillText('v1.0  •  procedural audio  •  webgl canvas', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 6);

    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
  }

  handleTap(game, input) {
    if (input.justTapped) {
      const p = input.getPos();
      // Check if tap is in the UPGRADES button area
      if (p.y > CONFIG.HEIGHT * 0.74 && p.y < CONFIG.HEIGHT * 0.82) {
        game.showMeta();
      } else {
        game.startGame();
      }
    }
  }
}
