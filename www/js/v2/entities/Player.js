// v2 Player — faithful ESM port of v1 (JS/entities/Player.js)
// Combat, upgrades, shield/invincibility, engine trail. Render via ShipRenderer.

import { CONFIG } from '../core/config.js';
import { clamp, dist } from '../core/utils.js';
import { renderPlayer } from '../render/ShipRenderer.js';
import { fireWeapon, getWeapon } from './weapons.js';

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
    this.spreadLevel = 0;
    this.homingLevel = 0;
    this.piercingLevel = 0;
    this.burstLevel = 0;
    this.ricochetLevel = 0;
    this.waveLevel = 0;
    this.laserLevel = 0;
    this.laserActive = false;
    this.laserTimer = 0;
    this.laserCooldown = 0;
    this.orbitalLevel = 0;
    this.orbitals = [];
    this.orbitalAngle = 0;
    this.weapon = 'base';
    this.weaponCooldown = 0;
    this._lastUpgrade = null;
    this._upgradedThisFrame = false;
  }

  reset(meta, ship) {
    const m = meta ? meta.getAppliedModifiers() : {};
    const s = ship || {};
    this.x = CONFIG.WIDTH / 2;
    this.y = CONFIG.HEIGHT * 0.75;
    this.vx = 0;
    this.vy = 0;
    this.hp = (s.hp || CONFIG.PLAYER_MAX_HP) + (m.hull ? m.hull : 0);
    this.maxHp = (s.hp || CONFIG.PLAYER_MAX_HP) + (m.hull ? m.hull : 0);
    this.shield = 0;
    this.maxShield = 0;
    if (m.shield) this.shield = this.maxShield = m.shield;
    this.alive = true;
    this.fireTimer = 0;
    this.fireRate = (s.fireRate || CONFIG.PLAYER_FIRE_RATE);
    if (m.fireRate) this.fireRate *= m.fireRate;
    this.invincibleTimer = 0;
    this.speedMultiplier = 1;
    this.damageMultiplier = 1;
    this.moveSpeed = (s.speed || CONFIG.PLAYER_SPEED);
    if (m.moveSpeed) this.moveSpeed *= m.moveSpeed;
    this.ship = s;
    this.critChance = s.special === 'crit' ? 0.2 : 0;
    this.shieldFlash = 0;
    this.spreadLevel = 0;
    this.homingLevel = 0;
    this.piercingLevel = 0;
    this.burstLevel = 0;
    this.ricochetLevel = 0;
    this.waveLevel = 0;
    this.laserLevel = 0;
    this.laserActive = false;
    this.laserTimer = 0;
    this.laserCooldown = 0;
    this.orbitalLevel = 0;
    this.orbitals = [];
    this.orbitalAngle = 0;
    this.weapon = 'base';
    this.weaponCooldown = 0;
    // Ship default weapon (Task 4.2) — pulsar→plasma, juggernaut→lance
    if (s.weapon) {
      this.weapon = s.weapon;
      this.weaponCooldown = 0;
    }
    this.trail = [];
    this._lastUpgrade = null;
    this._upgradedThisFrame = false;
  }

  update(dt, input, bullets, enemies, game) {
    if (!this.alive) return;

    // Movement — touch/mouse drag
    const dx = input.touchX - this.x;
    const dy = input.touchY - this.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    if (input.touching && dist > 10) {
      const speed = this.moveSpeed * this.speedMultiplier;
      const maxStep = speed * dt;
      this.x += clamp(Math.cos(angle) * dist, -maxStep, maxStep);
      this.y += clamp(Math.sin(angle) * dist, -maxStep, maxStep);
      this.x = Math.max(this.radius, Math.min(CONFIG.WIDTH - this.radius, this.x));
      this.y = Math.max(this.radius, Math.min(CONFIG.HEIGHT - this.radius, this.y));
    }

    // Keyboard fallback — v2 Input uses object keys
    if (input.keys['ArrowLeft'] || input.keys['KeyA']) this.x -= this.moveSpeed * dt;
    if (input.keys['ArrowRight'] || input.keys['KeyD']) this.x += this.moveSpeed * dt;
    if (input.keys['ArrowUp'] || input.keys['KeyW']) this.y -= this.moveSpeed * dt;
    if (input.keys['ArrowDown'] || input.keys['KeyS']) this.y += this.moveSpeed * dt;
    this.x = Math.max(this.radius, Math.min(CONFIG.WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(CONFIG.HEIGHT - this.radius, this.y));

    // Shield flash decay
    if (this.shieldFlash > 0) this.shieldFlash -= dt * 4;
    if (this.shieldFlash < 0) this.shieldFlash = 0;
    this.invincibleTimer -= dt;
    if (this.invincibleTimer < 0) this.invincibleTimer = 0;
    this.enginePulse += dt * 8;
    this._lastUpgrade = null;
    this._upgradedThisFrame = false;

    // Auto-fire (spread/homing/piercing/burst)
    if (bullets) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this._fireBase(bullets);
        this._fireSpread(bullets);
        this._fireHoming(bullets);
        this._firePiercing(bullets);
        this._fireBurst(bullets);
        this._fireRicochet(bullets);
        this._fireWave(bullets);
      }
    }

    // Weapon fire (seeker/plasma/tesla/lance)
    if (this.weapon && this.weapon !== 'base') {
      this.weaponCooldown -= dt;
      if (this.weaponCooldown <= 0) {
        const w = getWeapon(this.weapon);
        fireWeapon(this.weapon, this, bullets, enemies, game);
        this.weaponCooldown = w.cooldown;
      }
    }

    // Laser
    if (input.spaceHeld && this.laserLevel > 0) {
      if (!this.laserActive) {
        this.laserActive = true;
        this.laserTimer = 0;
        this.laserCooldown = 0;
      }
    } else if (this.laserActive && input.spaceHeld === false) {
      this.laserActive = false;
    }
    if (this.laserActive) {
      this.laserTimer += dt;
      this.laserCooldown -= dt;
      if (this.laserCooldown <= 0) {
        this.laserActive = false;
      }
    }

    // Orbitals
    if (this.orbitalLevel > 0) {
      this.orbitalAngle += dt * 3;
      for (let i = 0; i < this.orbitalLevel; i++) {
        const angle = this.orbitalAngle + (Math.PI * 2 / this.orbitalLevel) * i;
        this.orbitals[i] = {
          x: this.x + Math.cos(angle) * 40,
          y: this.y + Math.sin(angle) * 40,
        };
      }
    }
  }

  /** Base weapon per ship (Task 4.1) — vanguard=single, interceptor=twin, others=heavy single */
  _fireBase(bullets) {
    const ship = this.ship || {};
    const crit = this.critChance > 0 && Math.random() < this.critChance;
    const dmg = (ship.damage || 1) * (crit ? 2 : 1);
    if (ship.projectile === 'twin') {
      bullets.firePlayerBullet(this.x - 9, this.y - this.radius, -Math.PI / 2, dmg);
      bullets.firePlayerBullet(this.x + 9, this.y - this.radius, -Math.PI / 2, dmg);
      return;
    }
    // vanguard single (plasma/lance handled in Task 4.2 weapons.js)
    bullets.firePlayerBullet(this.x, this.y - this.radius, -Math.PI / 2, dmg);
  }

  _fireSpread(bullets) {
    if (this.spreadLevel === 0) return;
    const angles = this.spreadLevel === 1 ? [-0.3, 0, 0.3] :
                   this.spreadLevel === 2 ? [-0.5, -0.2, 0, 0.2, 0.5] :
                   [-0.6, -0.3, 0, 0.3, 0.6];
    for (const angle of angles) {
      bullets.firePlayerBullet(this.x, this.y - this.radius, angle, 1);
    }
  }

  _fireHoming(bullets) {
    if (this.homingLevel === 0) return;
    bullets.firePlayerBullet(this.x, this.y - this.radius, -Math.PI / 2, 1, true, 6);
  }

  _firePiercing(bullets) {
    if (this.piercingLevel === 0) return;
    bullets.firePlayerBullet(this.x, this.y - this.radius, -Math.PI / 2, 1, false, 0, 2 + this.piercingLevel);
  }

  _fireBurst(bullets) {
    if (this.burstLevel === 0) return;
    const count = this.burstLevel === 1 ? 3 : this.burstLevel === 2 ? 5 : 7;
    for (let i = 0; i < count; i++) {
      bullets.firePlayerBullet(this.x, this.y - this.radius, -Math.PI / 2, 1, false, 0, 0, true, i > 0);
    }
  }

  _fireRicochet(bullets) {
    if (this.ricochetLevel === 0) return;
    bullets.firePlayerBullet(this.x, this.y - this.radius, -Math.PI / 2, 1, false, 0, 0, false, false, 2);
  }

  _fireWave(bullets) {
    if (this.waveLevel === 0) return;
    bullets.firePlayerBullet(this.x, this.y - this.radius, -Math.PI / 2, 1, false, 0, 0, false, false, 0, true);
  }

  applyUpgrade(key) {
    switch (key) {
      case 'damage': this.damageMultiplier *= 1.2; break;
      case 'fireRate': this.fireRate *= 0.85; break;
      case 'projectiles': this.spreadLevel++; break;
      case 'speed': this.moveSpeed *= 1.1; this.speedMultiplier *= 1.1; break;
      case 'hull': this.maxHp += 1; this.hp += 1; break;
      case 'special': this.laserLevel = (this.laserLevel || 0) + 1; break;
      case 'weapon_seeker':
      case 'weapon_plasma':
      case 'weapon_tesla':
      case 'weapon_lance':
        this.weapon = key.replace('weapon_', '');
        this.weaponCooldown = 0;
        break;
    }
  }

  takeDamage(damage, game) {
    if (this.invincibleTimer > 0) return false;
    if (this.shield > 0) {
      this.shield -= damage;
      if (this.shield < 0) this.shield = 0;
      this.shieldFlash = 1;
      this.invincibleTimer = 0.5;
      return true;
    }
    this.hp -= damage;
    this.shieldFlash = 1;
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
      return true;
    }
    return true;
  }

  render(ctx, time) {
    if (!this.alive) return;
    renderPlayer(ctx, this, time);

    // Shield glow
    if (this.shieldFlash > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(100, 200, 255, ${this.shieldFlash * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Shield bar
    if (this.shield > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
      ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, this.radius * 2 * this.shield / this.maxShield, 3);
      ctx.restore();
    }

    // HP bar
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? '#44ff88' : hpRatio > 0.25 ? '#ffaa44' : '#ff4466';
    ctx.fillRect(this.x - this.radius, this.y - this.radius - 6, this.radius * 2 * hpRatio, 2);

    // Invincibility flash
    if (this.invincibleTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(time * 0.01) * 0.1;
      ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export { Player };
