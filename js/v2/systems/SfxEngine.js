// SfxEngine v2 — layered procedural SFX synthesis (no asset files).
// Each synth builds scheduled WebAudio nodes on the ducked sfx bus via AudioManager,
// then self-clears — no persistent buffers, no per-sample work at runtime beyond scheduling.
// Layered: laser (2 osc + noise), hit (noise + pitch drop), explosion (sub thump + noise + crackle),
// pickup (major-3rd arp), shield (metallic ping), boss roar (saw sweep), revive, gameover.

import { CONFIG } from '../core/config.js';

class SfxEngine {
  constructor(audio) {
    this.audio = audio; // AudioManager instance
  }

  /** Fire one-shot scheduled nodes that disconnect themselves after duration. */
  _play(fn) {
    if (!this.audio || !this.audio._enabled) return;
    const ctx = this.audio.ensure();
    if (!ctx || ctx.state === 'suspended') return;
    try {
      fn(ctx, this.audio.getSfxBus());
    } catch (e) { /* audio unsupported — swallow */ }
  }

  // ─── Synths ────────────────────────────────────────────────

  /** Player laser — square+triangle blip, no burst. */
  laser() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      oscPair(ctx, bus, 1100, 520, 'square', 'triangle', 0.18, t, 0.09, 0.25);
    });
  }

  /** Enemy hit — noise burst + pitch-dropping oscillator. */
  hit() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      noiseBurst(ctx, bus, t, 0.12, 0.20);
      oscPair(ctx, bus, 700, 240, 'sawtooth', null, 0.18, t, 0.10, 0.18);
    });
  }

  /** Explosion — 3-layer: sub thump + noise + crackle. */
  explosion() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      // Sub thump
      thump(ctx, bus, 130, t, 0.35, 0.5);
      // Main noise burst
      noiseBurst(ctx, bus, t, 0.35, 0.5);
      // Crackle: highpassed random splatter (16 short blips)
      crackle(ctx, bus, t, 0.3);
    });
  }

  /** Scrap / core pickup — major-3rd arpeggio (3 quick plucks asc). */
  pickup(major = true) {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      const root = major ? 660 : 880;
      const steps = major ? [0, 4, 7] : [0, 3, 7]; // major/minor third
      for (let i = 0; i < steps.length; i++) {
        pluck(ctx, bus, root * Math.pow(2, steps[i] / 12), t + i * 0.05, 0.08, 0.14);
      }
    });
  }

  /** Shield recharge — metallic double ping + high sheen. */
  shield() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      // Metallic ping: 2 detuned partials decaying fast
      ping(ctx, bus, 1400, t, 0.18, 0.12);
      ping(ctx, bus, 2100, t + 0.03, 0.12, 0.10);
    });
  }

  /** Boss roar — sawtooth sweep down + growl. */
  bossRoar() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.6);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g); g.connect(bus);
      osc.start(t); osc.stop(t + 0.65);
    });
  }

  /** Cant-do-over: UI click — tiny square blip (short, not noisy). */
  click() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(500, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(g); g.connect(bus);
      osc.start(t); osc.stop(t + 0.06);
    });
  }

  /** Revive — rising tone. */
  revive() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.3);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g); g.connect(bus);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  /** Game over — descending minor. */
  gameOver() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      const base = 440;
      for (let i = 0; i < 3; i++) {
        pluck(ctx, bus, base * Math.pow(0.85, i), t + i * 0.18, 0.18, 0.3);
      }
    });
  }

  sectorChange() {
    this._play((ctx, bus) => {
      const t = ctx.currentTime;
      // Rising sweep — sector boundary sting
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g); g.connect(bus);
      osc.start(t); osc.stop(t + 0.45);
      ping(ctx, bus, 1320, t + 0.3, 0.25, 0.2);
    });
  }

  /** Available synth names — for wiring/dispatch. */
  static NAMES = ['laser', 'hit', 'explosion', 'pickup', 'shield', 'bossRoar', 'click', 'revive', 'gameOver', 'sectorChange'];

  /** Dispatch by name (event string), default noop. */
  play(name) {
    if (!this[name]) return;
    this[name]();
  }
}

// ─── Shared helpers ─────────────────────────────────────────

function oscPair(ctx, bus, f1, f2, t1, t2, vol, start, dur, decay) {
  const osc = ctx.createOscillator();
  osc.type = t1;
  osc.frequency.setValueAtTime(f1, start);
  if (typeof f2 === 'number' && t2) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), start + dur);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g); g.connect(bus);
  osc.start(start); osc.stop(start + dur + decay);
}

function noiseBurst(ctx, bus, start, dur, vol) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * vol;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.connect(g); g.connect(bus);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function thump(ctx, bus, freq, start, dur, vol) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(40, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g); g.connect(bus);
  osc.start(start); osc.stop(start + dur + 0.02);
}

function pluck(ctx, bus, freq, start, dur, vol) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g); g.connect(bus);
  osc.start(start); osc.stop(start + dur + 0.02);
}

function ping(ctx, bus, freq, start, dur, vol) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g); g.connect(bus);
  osc.start(start); osc.stop(start + dur + 0.02);
}

function crackle(ctx, bus, start, dur) {
  const nBursts = Math.floor(dur * 60);
  for (let i = 0; i < nBursts; i++) {
    const t = start + (i / nBursts) * dur;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 + Math.random() * 2000, t);
    g.gain.setValueAtTime(0.15 * Math.random(), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + 0.03);
  }
}

export { SfxEngine };