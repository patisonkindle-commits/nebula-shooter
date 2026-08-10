// AudioManager v2 — mixer bus + master + ducking.
// Graph: master → music bus / sfx bus / duck bus.
// Ducking: while music active, sfx gain drops to 0.25× (≈ -12dB), with smooth envelope.
// All synthesis procedural (no external assets). Web Audio only, no-op when unavailable.

import { CONFIG } from '../core/config.js';

const DUCK_GAIN = 0.25;      // sfx gain while music active
const DUCK_SMOOTH = 0.08;    // seconds for duck envelope
const NORMAL_SFX_GAIN = 0.9;
const MUSIC_GAIN = 0.5;
const MASTER_GAIN = 0.8;

class AudioManager {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._musicBus = null;
    this._sfxBus = null;
    this._duckGain = null;     // controls sfx ducking
    this._musicActive = false;
    this._enabled = true;
  }

  /** Create/resume the AudioContext. Safe to call on first user gesture. */
  ensure() {
    if (this._ctx) {
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;

    this._ctx = new AC();

    // Master
    this._master = this._ctx.createGain();
    this._master.gain.value = MASTER_GAIN;
    this._master.connect(this._ctx.destination);

    // Music bus → master
    this._musicBus = this._ctx.createGain();
    this._musicBus.gain.value = MUSIC_GAIN;
    this._musicBus.connect(this._master);

    // Duck gain sits between sfx bus and master: sfx → duck → master
    this._duckGain = this._ctx.createGain();
    this._duckGain.gain.value = 1;
    this._duckGain.connect(this._master);

    this._sfxBus = this._ctx.createGain();
    this._sfxBus.gain.value = NORMAL_SFX_GAIN;
    this._sfxBus.connect(this._duckGain);

    // Resume on visibility change (mobile lock/unlock)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume();
      }
    });

    return this._ctx;
  }

  /** Toggle all audio. Returns new enabled state. */
  setEnabled(on) {
    this._enabled = on;
    if (this._ctx) {
      this._ctx.suspend().then(() => {});
      if (on) this._ctx.resume();
    }
    return this._enabled;
  }

  /** Mark music active → duck sfx. */
  setMusicActive(active) {
    this._musicActive = active;
    if (!this._ctx || !this._duckGain) return;
    const target = active ? DUCK_GAIN : 1;
    this._duckGain.gain.setTargetAtTime(target, this._ctx.currentTime, DUCK_SMOOTH);
  }

  /** Get a node to connect music sources into (music bus). */
  getMusicBus() {
    this.ensure();
    return this._musicBus;
  }

  /** Get a node to connect sfx sources into (ducked sfx bus). */
  getSfxBus() {
    this.ensure();
    return this._sfxBus;
  }

  /** Convenience: play a one-shot oscillator+gain envelope on sfx bus. */
  blip(freq, dur = 0.1, type = 'square', vol = 0.3, freqEnd) {
    if (!this._enabled || !this.ensure()) return;
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this._sfxBus);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.05);
  }

  /** Short UI click. */
  click() { this.blip(600, 0.05, 'square', 0.15); }
}

export { AudioManager };
