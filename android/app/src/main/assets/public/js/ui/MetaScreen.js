// Metaprogression screen — talent tree with enhanced visuals & bigger layout
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

    // Title — BIGGER
    ctx.shadowColor = '#ff44ff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff88ff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('◈ UPGRADES ◈', CONFIG.WIDTH / 2, 38);
    ctx.shadowBlur = 0;

    // Core count — BIGGER
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    ctx.fillText(`◆ ${meta.cores}`, CONFIG.WIDTH / 2, 62);

    // Node grid — BIGGER cards
    const nodeIds = Object.keys(CONFIG.META_NODES);
    const cols = 2;
    const cardW = CONFIG.WIDTH / cols - 14;
    const cardH = 76;
    const startY = 80;
    const gap = 7;

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
      ctx.roundRect(cx, cy, cardW, cardH, 6);
      ctx.fill();

      // Card border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = maxed ? '#44ff88' : canAfford ? '#44ff88' : '#282840';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 6);
      ctx.stroke();

      // Left accent bar
      ctx.fillStyle = maxed ? '#44ff88' : canAfford ? '#44ff88' : '#222244';
      ctx.fillRect(cx + 1, cy + 5, 3, cardH - 10);

      // Name — BIGGER
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(id.charAt(0).toUpperCase() + id.slice(1), cx + 12, cy + 18);
      
      // Rank — BIGGER
      ctx.fillStyle = '#666688';
      ctx.font = '8px monospace';
      ctx.fillText(`rank ${node.rank} / ${node.maxRank}`, cx + 12, cy + 32);

      // Description — BIGGER
      ctx.fillStyle = '#8888aa';
      ctx.font = '8px monospace';
      ctx.fillText(cfg.desc, cx + 12, cy + 50);

      // Cost / MAX badge — BIGGER
      ctx.textAlign = 'right';
      if (maxed) {
        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 10px monospace';
        ctx.shadowColor = '#44ff88';
        ctx.shadowBlur = 5;
        ctx.fillText('MAX', cx + cardW - 8, cy + 18);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = canAfford ? '#ffdd44' : '#443322';
        ctx.font = '9px monospace';
        ctx.fillText(`◆${cost}`, cx + cardW - 8, cy + 18);
      }

      // Ranks as glowing dots — BIGGER
      ctx.textAlign = 'right';
      for (let r = 0; r < node.maxRank; r++) {
        const dotX = cx + cardW - 8 - r * 9;
        if (r < node.rank) {
          ctx.shadowColor = '#44ff88';
          ctx.shadowBlur = 5;
          ctx.fillStyle = '#44ff88';
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#222233';
        }
        ctx.beginPath();
        ctx.arc(dotX, cy + cardH - 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Controls — BIGGER
    ctx.textAlign = 'center';
    ctx.fillStyle = '#444466';
    ctx.font = '8px monospace';
    ctx.fillText('tap card to upgrade  •  tap empty area to close', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 12);
    ctx.textAlign = 'left';
  }

  handleTap(input, meta) {
    if (!this.active || !input.justTapped) return false;

    const p = input.getPos();
    const nodeIds = Object.keys(CONFIG.META_NODES);
    const cols = 2;
    const cardW = CONFIG.WIDTH / cols - 14;
    const cardH = 76;
    const startY = 80;
    const gap = 7;

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
