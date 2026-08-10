// ShipRenderer — procedural vector art for player ship + enemy archetypes
// v2: replaces filled circles with angular hulls, engine glow, banking, elite pulses.
// Pure render functions; no state, no DOM access. Caller supplies ctx + entity.

// Shared path helper — build a closed polygon from unit points (×scale)
function polygon(ctx, points, scale) {
  ctx.beginPath();
  ctx.moveTo(points[0][0] * scale, points[0][1] * scale);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] * scale, points[i][1] * scale);
  }
  ctx.closePath();
}

// ─── Player ship — 12-point hull, cyan engine glow, banking from vx ───
const PLAYER_HULL = [
  [0, -1],        // nose
  [0.35, -0.55],  // right canopy
  [0.8, -0.35],   // right wing tip
  [0.6, 0.05],    // right wing inner
  [0.35, 0.15],   // right fuselage
  [0.2, 0.7],     // right tail
  [0, 0.55],      // tail notch
  [-0.2, 0.7],    // left tail
  [-0.35, 0.15],  // left fuselage
  [-0.6, 0.05],   // left wing inner
  [-0.8, -0.35],  // left wing tip
  [-0.35, -0.55], // left canopy
];

function renderPlayer(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);

  // Banking tilt from horizontal velocity (smooth)
  const tilt = Math.max(-0.3, Math.min(0.3, (p.vx || 0) / 400));
  ctx.rotate(tilt);

  // Engine glow — flicker via sin noise, tinted by ship color
  const flamePulse = 0.6 + 0.4 * Math.sin(time * 0.015 + p.enginePulse * 3);
  const flameLen = 14 + 8 * flamePulse;
  const flameCol = (p.ship && p.ship.color) || '#64b4ff';
  const outerGrad = ctx.createRadialGradient(0, 14 + flameLen * 0.3, 2, 0, 14 + flameLen * 0.3, flameLen * 2);
  outerGrad.addColorStop(0, `${flameCol}${Math.round(flamePulse * 0.35 * 255).toString(16).padStart(2, '0')}`);
  outerGrad.addColorStop(0.5, 'rgba(50, 100, 200, 0.12)');
  outerGrad.addColorStop(1, `${flameCol}00`);
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(0, 14 + flameLen * 0.3, flameLen * 2, 0, Math.PI * 2);
  ctx.fill();

  // Blink during invincibility
  if (p.invincibleTimer > 0 && Math.sin(p.invincibleTimer * 30) > 0) {
    ctx.globalAlpha = 0.5;
  }

  const r = p.radius || 14;

  // Hull fill — linear gradient (nose light → tail dark), tinted by ship color
  const sc = (p.ship && p.ship.color) || '#4a9eff';
  const hullGrad = ctx.createLinearGradient(0, -r, 0, r);
  hullGrad.addColorStop(0, sc);
  hullGrad.addColorStop(0.6, '#0f1e3a');
  hullGrad.addColorStop(1, '#081224');
  ctx.fillStyle = hullGrad;

  ctx.shadowColor = sc;
  ctx.shadowBlur = 18;
  polygon(ctx, PLAYER_HULL, r);
  ctx.fill();

  // Hull edge glow
  ctx.shadowBlur = 0;
  ctx.strokeStyle = sc;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner hull highlight
  ctx.beginPath();
  ctx.moveTo(0, -r + 4);
  ctx.lineTo(-r * 0.4, r * 0.2);
  ctx.lineTo(r * 0.4, r * 0.2);
  ctx.closePath();
  ctx.fillStyle = sc + '14';
  ctx.fill();

  // Cockpit
  ctx.shadowColor = '#4a9eff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.65);
  ctx.lineTo(-r * 0.25, -r * 0.15);
  ctx.lineTo(r * 0.25, -r * 0.15);
  ctx.closePath();
  ctx.fillStyle = '#4a9eff';
  ctx.fill();

  ctx.shadowBlur = 0;

  // Shield ring
  if (p.shield > 0) {
    ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 + 0.3 * Math.sin(time * 0.005)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Enemy silhouettes per archetype ───
// All render in local space (origin = entity center, +y down toward player).

function renderSwarmer(ctx, e, time) {
  const r = e.radius;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 6;

  // Spiked orb — 8 spikes
  ctx.fillStyle = e.color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time * 0.002;
    const rad = i % 2 === 0 ? r : r * 0.7;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#ff8899';
  ctx.beginPath();
  ctx.arc(-3, -2, 3, 0, Math.PI * 2);
  ctx.arc(3, -2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function renderSniper(ctx, e) {
  const r = e.radius;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = e.color;

  // Long triangle pointing down (toward player)
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.lineTo(-r * 0.7, -r * 0.5);
  ctx.lineTo(r * 0.7, -r * 0.5);
  ctx.closePath();
  ctx.fill();

  // Sniper lens
  ctx.fillStyle = '#ffdd44';
  ctx.beginPath();
  ctx.arc(0, -2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function renderTank(ctx, e, time) {
  const r = e.radius;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = e.color;

  // Hexagon hull
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time * 0.001;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();

  // Armor ring
  ctx.strokeStyle = '#6633cc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
  ctx.stroke();

  // Core
  ctx.fillStyle = '#ffcc66';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
}

function renderKamikaze(ctx, e) {
  const r = e.radius;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = e.color;

  // Arrow — pointed down (dive direction)
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.lineTo(-r * 0.8, -r * 0.6);
  ctx.lineTo(-r * 0.25, -r * 0.2);
  ctx.lineTo(0, -r * 0.55);
  ctx.lineTo(r * 0.25, -r * 0.2);
  ctx.lineTo(r * 0.8, -r * 0.6);
  ctx.closePath();
  ctx.fill();

  // Warhead core
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
}

function renderBlocker(ctx, e) {
  const r = e.radius;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = e.color;

  // Shield wedge — wide triangle facing player (down)
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.lineTo(-r * 1.1, -r * 0.8);
  ctx.lineTo(r * 1.1, -r * 0.8);
  ctx.closePath();
  ctx.fill();

  // Energy lattice
  ctx.strokeStyle = '#2288dd';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Center node
  ctx.fillStyle = '#88ddff';
  ctx.beginPath();
  ctx.arc(0, -r * 0.2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function renderVortex(ctx, e, time) {
  const r = e.radius;
  const pulse = 1 + 0.15 * Math.sin(time * 0.005);
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 2;

  // Spiral ring — rotating hexagon segments
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + e.vortexAngle * 0.3;
    const rad = r * pulse;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner glow
  ctx.fillStyle = e.color + '33';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Charging indicator ring
  if (e.vortexReachedPos) {
    ctx.strokeStyle = '#88ffdd';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 0.008);
    ctx.beginPath();
    ctx.arc(0, 0, r + 6 + 3 * Math.sin(time * 0.004), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function renderMinelayer(ctx, e, time) {
  const r = e.radius;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = e.color;

  // Diamond
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.8, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.8, 0);
  ctx.closePath();
  ctx.fill();

  // Cross pattern
  ctx.strokeStyle = '#ccff88';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.3);
  ctx.lineTo(r * 0.4, r * 0.3);
  ctx.moveTo(r * 0.4, -r * 0.3);
  ctx.lineTo(-r * 0.4, r * 0.3);
  ctx.stroke();

  // Mine deploy flash
  if (e.mineTimer < 0.2) {
    ctx.fillStyle = '#ffffff88';
    ctx.beginPath();
    ctx.arc(0, r + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderWarp(ctx, e, time) {
  const r = e.radius;
  if (e.warpTeleporting) {
    ctx.globalAlpha = 0.2 + 0.8 * (e.warpFlash / 0.25);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = e.color;

  // Ghost tetra — 4-point star (diamond with notches)
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.4, -r * 0.3);
  ctx.lineTo(r, 0);
  ctx.lineTo(r * 0.4, r * 0.3);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.4, r * 0.3);
  ctx.lineTo(-r, 0);
  ctx.lineTo(-r * 0.4, -r * 0.3);
  ctx.closePath();
  ctx.fill();

  // Center gem
  ctx.fillStyle = '#ffccff';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Boss — layered eye-core, phase spikes ───
function renderBoss(ctx, e, time) {
  const flash = e.phaseTransitionTimer > 0;
  if (flash) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.phaseTransitionTimer * 20);

  const r = e.radius;
  const phase1 = e.bossPhase === 1;
  ctx.shadowColor = phase1 ? '#ff44ff' : '#ff2222';
  ctx.shadowBlur = 20;

  // Outer ring
  ctx.strokeStyle = phase1 ? '#ff44ff' : '#ff2222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.stroke();

  // Main body — angular hull (12-point, slow rotation)
  ctx.fillStyle = phase1 ? '#661166' : '#661111';
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + time * 0.0005;
    const rad = i % 2 === 0 ? r : r * 0.85;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();

  // Core
  ctx.fillStyle = phase1 ? '#ff66ff' : '#ff4444';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = phase1 ? '#ff44ff' : '#ff2222';
  ctx.beginPath();
  ctx.arc(0, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Phase 2: extra spikes
  if (e.bossPhase === 2) {
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + time * 0.002;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * (r + 10), Math.sin(a) * (r + 10));
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ─── Elite variant: gold stroke + 20% scale pulse ───
function renderElite(ctx, e, time) {
  const pulseScale = 1 + 0.2 * Math.sin(time * 0.004);
  ctx.save();
  ctx.scale(pulseScale, pulseScale);
  // Body renders first, then gold stroke overlay
  const bodyRender = ENEMY_RENDERERS[e.type] || renderSwarmer;
  bodyRender(ctx, e, time);

  // Gold stroke over silhouette
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 10;
  ctx.globalAlpha = 0.9;
  // Re-trace generic outline: use circle approximation for all types
  ctx.beginPath();
  ctx.arc(0, 0, e.radius * 0.95, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Dispatch table — renderEnemy routes by type + elite flag
const ENEMY_RENDERERS = {
  swarmer: renderSwarmer,
  sniper: renderSniper,
  tank: renderTank,
  kamikaze: renderKamikaze,
  blocker: renderBlocker,
  vortex: renderVortex,
  minelayer: renderMinelayer,
  warp: renderWarp,
};

/**
 * Render an enemy (or boss) via procedural vector art.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} e enemy entity (must have x, y, radius, type, color)
 * @param {number} time elapsed ms for animation
 */
function renderEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.isBoss) {
    renderBoss(ctx, e, time);
    ctx.restore();
    return;
  }
  if (e.isElite) {
    renderElite(ctx, e, time);
    ctx.restore();
    return;
  }
  const r = ENEMY_RENDERERS[e.type];
  if (r) r(ctx, e, time);
  ctx.restore();
}

export { renderPlayer, renderEnemy };