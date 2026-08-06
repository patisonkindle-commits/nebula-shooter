// BloomPass — additive glow: capture scene → 1/4-res glow layer → 2× box-blur → screen composite.
// v2: NO ctx.filter (slow on Android). Box blur = drawImage downscale/upscale with smoothing.
// capture() snapshots the main scene (its glows/halos double as the bright pass); apply() blurs
// and screen-composites. TODO(Phase 3): real bright-pass routing for bullets/explosions/cores.

class BloomPass {
  constructor() {
    this._glow = document.createElement('canvas'); // 1/4-res glow buffer
    this._blur = document.createElement('canvas'); // half of glow (blur temp)
    this._gctx = this._glow.getContext('2d');
    this._bctx = this._blur.getContext('2d');
    this.enabled = true;
    this.intensity = 1.0;
  }

  /** Resize buffers to match main canvas buffer size (cw, ch physical px). */
  resize(cw, ch) {
    const gw = Math.max(2, Math.floor(cw / 4));
    const gh = Math.max(2, Math.floor(ch / 4));
    if (this._glow.width !== gw || this._glow.height !== gh) {
      this._glow.width = gw;
      this._glow.height = gh;
      this._blur.width = Math.max(1, gw >> 1);
      this._blur.height = Math.max(1, gh >> 1);
    }
  }

  /** Snapshot main scene buffer into glow layer (downsampled, smoothed). */
  capture(sourceCtx, cw, ch) {
    if (!this.enabled) return;
    this.resize(cw, ch);
    const g = this._gctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = this.intensity;
    g.clearRect(0, 0, this._glow.width, this._glow.height);
    g.imageSmoothingEnabled = true;
    g.drawImage(sourceCtx.canvas, 0, 0, this._glow.width, this._glow.height);
  }

  /** Box-blur (2 down/up passes) + screen-composite glow over main. */
  apply(destCtx, cw, ch) {
    if (!this.enabled) return;
    const g = this._gctx;
    const b = this._bctx;
    const gw = this._glow.width;
    const gh = this._glow.height;
    const hw = this._blur.width;
    const hh = this._blur.height;

    // Pass 1: glow → half-res (smoothing averages = box blur)
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, hw, hh);
    b.imageSmoothingEnabled = true;
    b.drawImage(this._glow, 0, 0, hw, hh);

    // Pass 2: half → full glow res (second averaging pass)
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, gw, gh);
    g.imageSmoothingEnabled = true;
    g.drawImage(this._blur, 0, 0, gw, gh);

    // Composite: screen-blend glow over main at full res
    destCtx.save();
    destCtx.setTransform(1, 0, 0, 1, 0, 0);
    destCtx.globalCompositeOperation = 'screen';
    destCtx.imageSmoothingEnabled = true;
    destCtx.drawImage(this._glow, 0, 0, cw, ch);
    destCtx.restore();
  }
}

export { BloomPass };