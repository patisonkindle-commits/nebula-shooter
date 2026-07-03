// Mid-run upgrade selection overlay (3 choices) — redesigned cards with glow
class UpgradeUI {
  constructor() {
    this.active = false;
    this.options = [];
    this.selectedIndex = -1;
  }

  show(ownedUpgrades = []) {
    this.active = true;
    this.selectedIndex = -1;
    this.options = [];
    this.ownedSet = new Set(ownedUpgrades.map(n => n.toLowerCase()));
    const allUpgrades = [
      { name: 'Plasma Chain', desc: 'Chain shots hit nearby enemies', color: '#44ff88', icon: '⚡' },
      { name: 'Gravity Well', desc: 'Pull scrap & enemies closer', color: '#8844ff', icon: '◉' },
      { name: 'Solar Flare', desc: 'Periodic pulse destroys bullets', color: '#ffaa44', icon: '☀' },
      { name: 'Spread Shot', desc: 'Fire 3 bullets in a fan', color: '#ffcc44', icon: '✦' },
      { name: 'Homing Shot', desc: 'Bullets steer toward enemies', color: '#44ddff', icon: '🎯' },
      { name: 'Piercing Shot', desc: 'Bullets pierce through enemies', color: '#ffdd44', icon: '⤊' },
      { name: 'Burst Shot', desc: 'Bullets explode into fragments', color: '#ff8844', icon: '💥' },
      { name: 'Ricochet Shot', desc: 'Bullets bounce off walls', color: '#ffcc44', icon: '🎱' },
      { name: 'Wave Shot', desc: 'Bullets travel in sine waves', color: '#44ff88', icon: '〰️' },
      { name: 'Laser Beam', desc: 'Continuous beam of energy', color: '#ff4444', icon: '🔥' },
      { name: 'Orbital Shot', desc: 'Orbiting projectiles fire at enemies', color: '#cc77ff', icon: '🪐' },
      { name: 'Attack Speed', desc: '+25% fire rate', color: '#ff4466', icon: '↑' },
      { name: 'Damage Up', desc: '+30% bullet damage', color: '#ff6644', icon: '⚔' },
      { name: 'Shield Up', desc: '+1 shield charge', color: '#44aaff', icon: '⛡' },
      { name: 'Move Speed', desc: '+20% movement speed', color: '#44ffaa', icon: '▶' },
      { name: 'Magnet Up', desc: '+40% collection radius', color: '#ff88ff', icon: '⌖' },
    ];

    // Pick 3 random
    const shuffled = [...allUpgrades].sort(() => Math.random() - 0.5);
    this.options = shuffled.slice(0, 3);
  }

  render(ctx) {
    if (!this.active) return;
    // Darken background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Decorative diagonal lines
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = -CONFIG.WIDTH; i < CONFIG.WIDTH * 2; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - CONFIG.HEIGHT, CONFIG.HEIGHT);
      ctx.stroke();
    }

    ctx.textAlign = 'center';

    // Level up title with glow
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffddaa';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('LEVEL UP!', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.15);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#777788';
    ctx.font = '8px monospace';
    ctx.fillText('choose an upgrade', CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.195);

    const cardW = CONFIG.WIDTH * 0.28;
    const cardH = 110;
    const gap = 6;
    const totalW = this.options.length * cardW + (this.options.length - 1) * gap;
    const startX = (CONFIG.WIDTH - totalW) / 2;
    const cardY = CONFIG.HEIGHT * 0.28;

    this.options.forEach((opt, i) => {
      const cx = startX + i * (cardW + gap);
      const hovered = this.selectedIndex === i;

      // Card shadow
      ctx.shadowColor = hovered ? opt.color : 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = hovered ? 12 : 4;

      // Card bg gradient
      const bgGrad = ctx.createLinearGradient(cx, cardY, cx, cardY + cardH);
      bgGrad.addColorStop(0, hovered ? '#191944' : '#0d0d1a');
      bgGrad.addColorStop(1, hovered ? '#0f0f2a' : '#080810');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 8);
      ctx.fill();

      // Card border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hovered ? opt.color : '#222244';
      ctx.lineWidth = hovered ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 8);
      ctx.stroke();

      // Top accent bar
      ctx.fillStyle = hovered ? opt.color : 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(cx + 8, cardY + 4, cardW - 16, 3, 2);
      ctx.fill();

      // Icon with glow
      ctx.shadowColor = hovered ? opt.color : 'transparent';
      ctx.shadowBlur = hovered ? 8 : 0;
      ctx.fillStyle = opt.color;
      ctx.font = '24px monospace';
      ctx.fillText(opt.icon, cx + cardW / 2, cardY + 38);
      ctx.shadowBlur = 0;

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(opt.name, cx + cardW / 2, cardY + 58);

      // Description
      ctx.fillStyle = '#777788';
      ctx.font = '7px monospace';
      ctx.fillText(opt.desc, cx + cardW / 2, cardY + 72);

      // Ownership badge
      const isOwned = this.ownedSet && this.ownedSet.has(opt.name.toLowerCase());
      if (isOwned) {
        ctx.fillStyle = 'rgba(68, 255, 136, 0.15)';
        ctx.beginPath();
        ctx.roundRect(cx + cardW * 0.12, cardY + 80, cardW * 0.76, 14, 4);
        ctx.fill();
        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('✓ OWNED', cx + cardW / 2, cardY + 90);
      }

      // Bottom highlight on hover
      if (hovered) {
        ctx.shadowColor = opt.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = opt.color;
        ctx.fillRect(cx + cardW * 0.2, cardY + cardH - 3, cardW * 0.6, 2);
        ctx.shadowBlur = 0;
      }
    });

    // Footer tips
    ctx.fillStyle = '#333355';
    ctx.font = '7px monospace';
    ctx.fillText('tap a card to upgrade', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 30);
    ctx.fillText('game pauses while choosing', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 22);

    ctx.textAlign = 'left';
  }

  handleTap(input) {
    if (!this.active || !input.justTapped) return null;

    const p = input.getPos();
    const cardW = CONFIG.WIDTH * 0.28;
    const cardH = 110;
    const gap = 6;
    const totalW = this.options.length * cardW + (this.options.length - 1) * gap;
    const startX = (CONFIG.WIDTH - totalW) / 2;
    const cardY = CONFIG.HEIGHT * 0.28;

    for (let i = 0; i < this.options.length; i++) {
      const cx = startX + i * (cardW + gap);
      if (p.x >= cx && p.x <= cx + cardW && p.y >= cardY && p.y <= cardY + cardH) {
        this.active = false;
        return this.options[i];
      }
    }

    // Tap outside cards → dismiss the upgrade screen
    this.active = false;
    return 'DISMISS';
  }
}
