// Player ship — touch-controlled, auto-firing, tiny hitbox
class Player {
  constructor() {
    this.x = CONFIG.WIDTH / 2;
    this.y = CONFIG.HEIGHT * 0.75;
    this.vx = 0;
    this.vy = 0;
    this.radius = CONFIG.PLAYER_RADIUS;
    this.hitboxRadius = CONFIG.HITBOX_RADIUS;
    this.hp = CONFIG.PLAYER_MAX_HP;
    this.maxHp = CONFIG.PLAYER_MAX_HP;
    this.shield = 0;
    this.maxShield = 0;
    this.alive = true;
    this.fireTimer = 0;
    this.fireRate = CONFIG.PLAYER_FIRE_RATE;
    this.invincibleTimer = 0;
    this.enginePulse = 0;
    this.trail = [];
    this.speedMultiplier = 1;
    this.damageMultiplier = 1;
    this.moveSpeed = CONFIG.PLAYER_SPEED;
    this.shieldFlash = 0;
    this.spreadLevel = 0;        // 0=normal, 1=spread shot
    this.homingLevel = 0;        // 0=normal, 1=homing shot
    this.piercingLevel = 0;      // 0=normal, 1+=pierces N enemies
    this.burstLevel = 0;         // 0=normal, 1=burst on hit/offscreen
    this.ricochetLevel = 0;    // 0=normal, 1+=ricochets off walls
    this.waveLevel = 0;        // 0=normal, 1=sine wave motion
  }

  reset(meta) {
    const m = meta ? meta.getAppliedModifiers() : {};
    this.hp = CONFIG.PLAYER_MAX_HP + (m.hpBonus || 0);
    this.maxHp = this.hp;
    this.shield = m.startingShield || 0;
    this.maxShield = m.startingShield || 0;
    this.alive = true;
    this.fireTimer = 0;
    this.invincibleTimer = CONFIG.PLAYER_INVINCIBLE_TIME;
    this.trail = [];
    this.speedMultiplier = m.speedMult || 1;
    this.damageMultiplier = m.damageMult || 1;
    this.fireRate = CONFIG.PLAYER_FIRE_RATE * (m.fireRateMult || 1);
    this.moveSpeed = CONFIG.PLAYER_SPEED * this.speedMultiplier;
    this.spreadLevel = 0;
    this.homingLevel = 0;
    this.piercingLevel = 0;
    this.burstLevel = 0;
    this.ricochetLevel = 0;
    this.waveLevel = 0;
  }

  update(dt, input, entities) {
    if (!this.alive) return;

    // Movement
    if (input.isTouching()) {
      const p = input.getPos();
      const targetX = p.x;
      const targetY = p.y - CONFIG.UPWARD_OFFSET;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const maxStep = this.moveSpeed * dt;
        if (d <= maxStep) {
          this.x = targetX; this.y = targetY;
        } else {
          this.x += (dx / d) * maxStep;
          this.y += (dy / d) * maxStep;
        }
      }
    }

    this.x = clamp(this.x, this.radius, CONFIG.WIDTH - this.radius);
    this.y = clamp(this.y, this.radius * 0.5, CONFIG.HEIGHT - this.radius);

    // Auto-fire
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      this._fire(entities);
    }

    // Invincibility
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    // Engine pulse
    this.enginePulse = 0.6 + 0.4 * Math.sin(this.enginePulse * 10 + performance.now() * 0.008);
    this.trail.unshift({ x: this.x, y: this.y + this.radius * 0.5 });
    if (this.trail.length > 12) this.trail.pop();

    if (this.shieldFlash > 0) this.shieldFlash -= dt;
  }

  _fire(entities) {
    const homing = this.homingLevel >= 1;
    const homingRate = homing ? 4 : 0;
    const piercing = this.piercingLevel;
    const burst = this.burstLevel >= 1;
    const ricochet = this.ricochetLevel;
    const wave = this.waveLevel >= 1;

    // Spread Shot pattern
    if (this.spreadLevel >= 1) {
      const count = 3 + (this.spreadLevel - 1) * 2; // 3, 5, 7...
      const totalSpread = 0.4; // ~23°
      for (let i = 0; i < count; i++) {
        const t = (count === 1) ? 0 : (i / (count - 1)) - 0.5;
        const angle = -Math.PI / 2 + t * totalSpread;
        entities.firePlayerBullet(this.x, this.y - this.radius, angle, this.damageMultiplier, homing, homingRate, piercing, burst, false, ricochet, wave);
      }
      return;
    }

    // Homing single shot (piercing/burst apply too)
    if (homing) {
      const angle = -Math.PI / 2;
      entities.firePlayerBullet(this.x, this.y - this.radius, angle, this.damageMultiplier, true, 4, piercing, burst, false, ricochet, wave);
      return;
    }

    // Default single shot with slight spread
    const spread = 0.07; // ±4°
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    entities.firePlayerBullet(this.x, this.y - this.radius, angle, this.damageMultiplier, false, 0, piercing, burst, false, ricochet, wave);
  }

  takeDamage(amount, entities) {
    if (this.invincibleTimer > 0) return false;
    if (this.shield > 0) {
      this.shield -= amount;
      this.shieldFlash = 0.2;
      this.invincibleTimer = 0.3;
      if (this.shield < 0) {
        this.hp += this.shield;
        this.shield = 0;
      }
    } else {
      this.hp -= amount;
      this.invincibleTimer = CONFIG.PLAYER_INVINCIBLE_TIME;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return true;
  }

  render(ctx) {
    if (!this.alive) return;

    // Engine glow
    const grad = ctx.createRadialGradient(this.x, this.y + 14, 2, this.x, this.y + 14, 22);
    grad.addColorStop(0, `rgba(100, 180, 255, ${this.enginePulse * 0.6})`);
    grad.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y + 14, 22, 0, Math.PI * 2);
    ctx.fill();

    // Motion trail
    for (let i = 0; i < this.trail.length; i++) {
      ctx.globalAlpha = (1 - i / this.trail.length) * 0.25;
      ctx.fillStyle = '#8ac4ff';
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, (1 - i / this.trail.length) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ship body — sleek triangle
    ctx.save();
    ctx.translate(this.x, this.y);

    // Ship glow
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 12;

    const blink = this.invincibleTimer > 0 && Math.sin(this.invincibleTimer * 30) > 0;
    if (blink) ctx.globalAlpha = 0.5;

    // Main hull
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(-this.radius * 0.8, this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.35, this.radius * 0.4);
    ctx.lineTo(0, this.radius * 0.55);
    ctx.lineTo(this.radius * 0.35, this.radius * 0.4);
    ctx.lineTo(this.radius * 0.8, this.radius * 0.7);
    ctx.closePath();
    ctx.fillStyle = '#1a2a4a';
    ctx.fill();
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 0.65);
    ctx.lineTo(-5, -this.radius * 0.15);
    ctx.lineTo(5, -this.radius * 0.15);
    ctx.closePath();
    ctx.fillStyle = '#4a9eff';
    ctx.fill();

    ctx.shadowBlur = 0;

    // Hitbox dot (debug: always visible — the fair hitbox)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, this.hitboxRadius, 0, Math.PI * 2);
    ctx.fill();

    // Shield ring
    if (this.shield > 0) {
      ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 + 0.3 * Math.sin(performance.now() * 0.005)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
