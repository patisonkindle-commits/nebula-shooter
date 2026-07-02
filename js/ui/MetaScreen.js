// Metaprogression screen — talent tree with enhanced visuals
class MetaScreen {
  constructor() {
    this.active = false;
    this.visible = false;
  }

  render(ctx, meta) {
    if (!this.active) return;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    ctx.textAlign = 'center';

    // Title
    ctx.shadowColor = '#ff44ff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff88ff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('◈ UPGRADES ◈', CONFIG.WIDTH / 2, 35);
    ctx.shadowBlur = 0;

    // Core count
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.fillText(`◆ ${meta.cores}`, CONFIG.WIDTH / 2, 55);

    // Node grid
    const nodeIds = Object.keys(CONFIG.META_NODES);
    const cols = 2;
    const cardW = CONFIG.WIDTH / cols - 14;
    const cardH = 64;
    const startY = 72;
    const gap = 6;

    nodeIds.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 6 + col * (cardW + 6);
      const cy = startY + row * (cardH + gap);

      const node = meta.nodes[id];
      const cfg = CONFIG.META_NODES[id];
      const cost = meta.getCost(id);
      const maxed = node.rank >= node.maxRank;
      const canAfford = !maxed && meta.cores >= cost;

      // Card bg with subtle gradient
      const bgGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      if (maxed) {
        bgGrad.addColorStop(0, '#0a1a0a');
        bgGrad.addColorStop(1, '#050f05');
      } else if (canAfford) {
        bgGrad.addColorStop(0, '#0a1a0f');
        bgGrad.addColorStop(1, '#050f08');
      } else {
        bgGrad.addColorStop(0, '#0a0a15');
        bgGrad.addColorStop(1, '#05050a');
      }
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 5);
      ctx.fill();

      // Card border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = maxed ? '#44ff88' : canAfford ? '#44ff88' : '#282840';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 5);
      ctx.stroke();

      // Left accent bar
      ctx.fillStyle = maxed ? '#44ff88' : canAfford ? '#44ff88' : '#222244';
      ctx.fillRect(cx + 1, cy + 4, 2, cardH - 8);

      // Name + rank
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(id.charAt(0).toUpperCase() + id.slice(1), cx + 10, cy + 16);
      ctx.fillStyle = '#555577';
      ctx.font = '7px monospace';
      ctx.fillText(`rank ${node.rank} / ${node.maxRank}`, cx + 10, cy + 28);

      // Description
      ctx.fillStyle = '#777788';
      ctx.font = '7px monospace';
      ctx.fillText(cfg.desc, cx + 10, cy + 42);

      // Cost / MAX badge
      ctx.textAlign = 'right';
      if (maxed) {
        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 8px monospace';
        ctx.shadowColor = '#44ff88';
        ctx.shadowBlur = 4;
        ctx.fillText('MAX', cx + cardW - 8, cy + 16);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = canAfford ? '#ffdd44' : '#443322';
        ctx.font = '8px monospace';
        ctx.fillText(`◆${cost}`, cx + cardW - 8, cy + 16);
      }

      // Ranks as glowing dots
      ctx.textAlign = 'right';
      for (let r = 0; r < node.maxRank; r++) {
        const dotX = cx + cardW - 8 - r * 8;
        if (r < node.rank) {
          ctx.shadowColor = '#44ff88';
          ctx.shadowBlur = 4;
          ctx.fillStyle = '#44ff88';
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#222233';
        }
        ctx.beginPath();
        ctx.arc(dotX, cy + cardH - 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Controls
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333355';
    ctx.font = '7px monospace';
    ctx.fillText('tap card to upgrade  •  tap empty area to close', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 12);
    ctx.textAlign = 'left';
  }

  handleTap(input, meta) {
    if (!this.active || !input.justTapped) return false;

    const p = input.getPos();
    const nodeIds = Object.keys(CONFIG.META_NODES);
    const cols = 2;
    const cardW = CONFIG.WIDTH / cols - 14;
    const cardH = 64;
    const startY = 72;
    const gap = 6;

    for (let i = 0; i < nodeIds.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 6 + col * (cardW + 6);
      const cy = startY + row * (cardH + gap);

      if (p.x >= cx && p.x <= cx + cardW && p.y >= cy && p.y <= cy + cardH) {
        const id = nodeIds[i];
        return { action: 'upgrade', id };
      }
    }

    // Tap empty area — close
    this.active = false;
    return { action: 'close' };
  }
}
