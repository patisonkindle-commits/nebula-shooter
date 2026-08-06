// MenuScreen — main menu with animated title, ship silhouette, buttons, credits.
// v2: all pure render functions, no state mutations. Menu state lives in Game.js.
// Features: letter-spacing + glow pulse on title, bobbing ship, hoverable buttons.

import { CONFIG } from '../core/config.js';

const MENU_W = CONFIG.WIDTH;
const MENU_H = CONFIG.HEIGHT;

// Button hit zones (scene coords): centered horizontally, stacked vertically
function buttonRect(index) {
  const cx = MENU_W / 2;
  const spacing = 48;
  const startY = MENU_H * 0.62;
  return { x: cx - 110, y: startY + index * spacing, w: 220, h: 48 };
}

function buttonIndexAt(mx, my) {
  for (let i = 0; i < 3; i++) {
    const r = buttonRect(i);
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
  }
  return -1;
}

// ─── Ship silhouette ───
function drawShipSilhouette(ctx, x, y, time, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const bob = Math.sin(time * 0.003) * 4;
  ctx.translate(0, bob);

  // Main body — small diamond with wing lines
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-12, 6);
  ctx.lineTo(-6, 14);
  ctx.lineTo(0, 10);
  ctx.lineTo(6, 14);
  ctx.lineTo(12, 6);
  ctx.closePath();

  ctx.fillStyle = 'rgba(40, 60, 90, 0.3)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(70, 130, 220, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Engine glow
  ctx.beginPath();
  ctx.arc(0, 12, 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(80, 160, 255, ${0.4 + Math.sin(time * 0.01) * 0.15})`;
  ctx.fill();

  ctx.restore();
}

// ─── Title ───
function drawTitle(ctx, time) {
  const cx = MENU_W / 2;
  const y = MENU_H * 0.25;

  // Glow pulse
  const pulse = 0.6 + Math.sin(time * 0.004) * 0.2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow pass
  ctx.shadowColor = `rgba(60, 140, 255, ${pulse})`;
  ctx.shadowBlur = 18;
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillStyle = `rgba(180, 220, 255, ${pulse})`;
  ctx.fillText('NEBULA', cx, y - 16);
  ctx.fillText('SHOOTER', cx, y + 18);

  // Main text
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(220, 240, 255, 0.9)';
  ctx.fillText('NEBULA', cx, y - 16);
  ctx.fillText('SHOOTER', cx, y + 18);

  ctx.restore();
}

// ─── Buttons ───
function drawButton(ctx, label, rect, hovered, time) {
  const { x, y, w, h } = rect;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Background
  const bgAlpha = hovered ? 0.25 : 0.1;
  ctx.fillStyle = `rgba(30, 60, 120, ${bgAlpha})`;
  ctx.fillRect(x, y, w, h);

  // Border
  const borderAlpha = hovered ? 0.8 : 0.4;
  ctx.strokeStyle = `rgba(80, 150, 255, ${borderAlpha})`;
  ctx.lineWidth = hovered ? 2 : 1.5;
  ctx.strokeRect(x, y, w, h);

  // Label
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillStyle = `rgba(220, 240, 255, ${hovered ? 1 : 0.7})`;
  ctx.fillText(label, cx, cy);

  // Idle glow pulse on label
  if (!hovered) {
    const glow = 0.7 + Math.sin(time * 0.005 + x * 0.01) * 0.1;
    ctx.fillStyle = `rgba(220, 240, 255, ${glow})`;
    ctx.fillText(label, cx, cy);
  }
  ctx.restore();
}

// ─── Credits ───
function drawCredits(ctx, time) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = `rgba(120, 150, 200, ${0.4 + Math.sin(time * 0.002) * 0.1})`;
  ctx.fillText('v2.0 — Made with ♥', MENU_W / 2, MENU_H - 30);
  ctx.restore();
}

// ─── Animated background ───
function drawBackground(ctx, time) {
  // Deep space gradient
  const grad = ctx.createRadialGradient(
    MENU_W / 2, MENU_H * 0.4, 0,
    MENU_W / 2, MENU_H * 0.4, MENU_W * 0.7
  );
  grad.addColorStop(0, '#0a0e1a');
  grad.addColorStop(1, '#020510');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MENU_W, MENU_H);

  // Scattered stars
  ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
  const starSeed = [
    [0.1, 0.2], [0.3, 0.45], [0.6, 0.3], [0.8, 0.55],
    [0.2, 0.7], [0.7, 0.8], [0.4, 0.9], [0.85, 0.15],
  ];
  for (let i = 0; i < starSeed.length; i++) {
    const [sx, sy] = starSeed[i];
    const size = 1 + (i % 3);
    const twinkle = 0.5 + Math.sin(time * 0.003 + i * 1.5) * 0.3;
    ctx.globalAlpha = twinkle;
    ctx.fillRect(
      sx * MENU_W,
      sy * MENU_H,
      size,
      size
    );
  }
  ctx.globalAlpha = 1;
}

// ─── Public API ───
class MenuScreen {
  constructor() {
    this.hoveredButton = -1;
    this.hoveredId = -1;
  }

  /**
   * Render the menu state. Pure render — no state mutations.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} time current performance.now()
   */
  render(ctx, time) {
    ctx.clearRect(0, 0, MENU_W, MENU_H);
    drawBackground(ctx, time);
    drawTitle(ctx, time);
    drawShipSilhouette(ctx, MENU_W / 2, MENU_H * 0.44, time);
    const btnLabels = ['START', 'UPGRADES', 'CREDITS'];
    for (let i = 0; i < 3; i++) {
      drawButton(ctx, btnLabels[i], buttonRect(i), i === this.hoveredId, time);
    }
    drawCredits(ctx, time);
  }

  /**
   * Convert canvas mouse coords to button index or -1.
   * @param {number} mouseX scene X
   * @param {number} mouseY scene Y
   */
  getHoveredButton(mouseX, mouseY) {
    return buttonIndexAt(mouseX, mouseY);
  }

  /**
   * Handle tap/click on button index. Pure function — returns action string.
   * @param {number} index button index (0=START, 1=UPGRADES, 2=CREDITS)
   * @param {Object} game Game instance with startGame() method
   * @returns {string|null} action or null
   */
  handleTap(index, game) {
    if (index === -1) return null;
    if (index === 0) return 'start';
    if (index === 1) return 'upgrades';
    if (index === 2) return 'credits';
    return null;
  }

  /**
   * Update hover state. Pure: returns new hoveredId.
   * @param {number} mouseX scene X
   * @param {number} mouseY scene Y
   */
  updateHover(mouseX, mouseY) {
    this.hoveredId = this.getHoveredButton(mouseX, mouseY);
    return this.hoveredId;
  }
}

export { MenuScreen };
