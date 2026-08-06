// Player entity — v2 shell. Position/state owned here; full combat logic lands Phase 3.
// Render delegates to procedural vector art (ShipRenderer).

import { CONFIG } from '../core/config.js';
import { renderPlayer } from '../render/ShipRenderer.js';

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
    this.invincibleTimer = 0;
    this.enginePulse = 0;
    this.moveSpeed = CONFIG.PLAYER_SPEED;
    this.fireTimer = 0;
    this.fireRate = CONFIG.PLAYER_FIRE_RATE;
  }

  reset() {
    this.x = CONFIG.WIDTH / 2;
    this.y = CONFIG.HEIGHT * 0.75;
    this.vx = 0;
    this.vy = 0;
    this.hp = CONFIG.PLAYER_MAX_HP;
    this.maxHp = CONFIG.PLAYER_MAX_HP;
    this.shield = 0;
    this.alive = true;
    this.invincibleTimer = CONFIG.PLAYER_INVINCIBLE_TIME;
    this.enginePulse = 0;
    this.fireTimer = 0;
  }

  /** Movement: drag-to-follow with finger offset (v1 behavior). */
  update(dt, input) {
    if (!this.alive) return;
    if (input.isTouching()) {
      const p = input.getPos();
      const targetX = p.x;
      const targetY = p.y - CONFIG.UPWARD_OFFSET;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const maxStep = this.moveSpeed * dt;
        this.vx = (dx / d) * this.moveSpeed;
        this.vy = (dy / d) * this.moveSpeed;
        if (d <= maxStep) {
          this.x = targetX;
          this.y = targetY;
        } else {
          this.x += (dx / d) * maxStep;
          this.y += (dy / d) * maxStep;
        }
      } else {
        this.vx = 0;
        this.vy = 0;
      }
    } else {
      this.vx = 0;
      this.vy = 0;
    }
    // Keep inside bounds
    this.x = Math.max(this.radius, Math.min(CONFIG.WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(CONFIG.HEIGHT - this.radius, this.y));
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
  }

  render(ctx, time) {
    if (!this.alive) return;
    renderPlayer(ctx, this, time);
  }
}

export { Player };