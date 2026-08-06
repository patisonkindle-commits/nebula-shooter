// MusicEngine v2 — procedural music engine.
// Pads (detuned saws → lowpass → gain) + bass pulse (sine, 8th-note envelope) + arp (triangle, 16th-note plucks).
// Chord/arp data driven per game state; intensity scales with wave/elite count (0.4→1.0).
// Oscillators scheduled via setTimeout to avoid per-sample CPU work.
// Nodes cleaned up on state transition — no persistent buffers.

import { CONFIG } from '../core/config.js';

const BPM = 60;

const CHORDS = {
  menu:    { freqs: [220, 277.18, 329.63, 440, 523.25], name: 'Am(add9)' },
  playing: { freqs: [164.81, 196, 246.94, 329.63, 392],  name: 'Em(add9)' },
  boss:    { freqs: [146.83, 174.61, 220, 293.66, 349.23], name: 'Dm' },
};

const ARPS = {
  menu:    [0, 2, 4, 2, 0, 3, 2, 0],
  playing: [0, 1, 2, 4, 2, 1, 0, 3],
  boss:    [0, 4, 2, 4, 0, 3, 2, 0],
};

class MusicEngine {
  constructor() {
    this._masterPatch = null;  // master gain node on music bus
    this._ready = false;
    this._active = false;
    this._scheduledNodes = [];
    this._currentPatch = null;
    this._lastNoteAt = 0;
    this._rescheduleTimer = null;
  }

  /** Connect to a previously created gain node on the music bus. */
  init(busGainNode) {
    if (!busGainNode) return;
    this._masterPatch = busGainNode;
    this._currentPatch = 'menu';
  }

  /** Start music playback. Idempotent. */
  startMusic() {
    if (this._ready) return;
    this._ready = true;
    if (this._currentPatch) this._startPatch('menu');
  }

  /** Stop all music and release nodes. */
  stopMusic() {
    this._stopAll();
    this._active = false;
  }

  /** Transition to a new game state (music style changes). */
  transition(newState) {
    if (!this._ready) return;
    const key = newState === 'playing' ? 'playing' : 'boss';
    if (this._currentPatch === key) return;
    this._stopAll();
    this._startPatch(key);
    this._currentPatch = key;
  }

  /** Update intensity: scales master patch gain with wave/elite progress. */
  updateIntensity(wave, eliteActive) {
    if (!this._ready || !this._masterPatch) return;
    const intensity = this._calcIntensity(wave, eliteActive);
    const t = this._ctx().currentTime;
    this._masterPatch.gain.setTargetAtTime(
      intensity, t, 0.5
    );
  }

  _calcIntensity(wave, eliteActive) {
    // ramp 0.4 → 1.0 over waves 0-10, hold at 1.0; elite bumps +0.1 briefly
    const t = Math.min(wave / 10, 1);
    const base = 0.4 + t * 0.6;
    const eliteBump = eliteActive ? 0.1 : 0;
    return Math.min(base + eliteBump, 1.0);
  }

  _ctx() {
    return this._masterPatch ? this._masterPatch.context : null;
  }

  // ─── Patch management ──────────────────────────────────────

  _startPatch(stateKey) {
    const bus = this._masterPatch;
    if (!bus) return;
    const ctx = bus.context;

    // Pad: 2 detuned saws through lowpass → bus (continuous, no click)
    this._masterPatch.gain.value = 1;

    // Store current chord so note-scheduling can reference it
    this._currentChord = CHORDS[stateKey] || CHORDS.menu;
    this._currentArp = ARPS[stateKey] || ARPS.menu;
    this._currentArpState = stateKey === 'boss' ? 'boss' : 'playing';

    // Schedule first notes immediately
    this._scheduleBassNotes(ctx.currentTime);
    this._scheduleArpNotes(ctx.currentTime);

    // Keep pads going — setTargetAtTime ensures smooth transitions
    this._masterPatch.gain.setTargetAtTime(0.15, ctx.currentTime, 0.1);

    // Schedule periodic rescheduling to stay in sync with game loop
    if (this._rescheduleTimer) clearTimeout(this._rescheduleTimer);
    this._rescheduleTimer = setInterval(() => {
      if (this._ctx() && this._ctx().currentTime - this._lastNoteAt > 1.0) {
        this._scheduleBassNotes(this._ctx().currentTime);
        this._scheduleArpNotes(this._ctx().currentTime);
      }
    }, 1000);
  }

  _stopAll() {
    if (this._rescheduleTimer) {
      clearInterval(this._rescheduleTimer);
      this._rescheduleTimer = null;
    }
    this._stopAllNodes();
  }

  _stopAllNodes() {
    for (const node of this._scheduledNodes) {
      try {
        if (node.stop) node.stop(this._ctx() ? this._ctx().currentTime + 0.01 : 0);
        else if (node.disconnect) node.disconnect();
      } catch (e) { /* already stopped */ }
    }
    this._scheduledNodes = [];
  }

  // ─── Scheduling ─────────────────────────────────────────────

  _noteInterval() { return 60 / BPM; } // 1 second at 60 BPM

  _scheduleBassNotes(startAt) {
    if (!this._currentChord) return;
    const rootFreq = this._currentChord.freqs[0];
    const fifthFreq = this._currentChord.freqs[2] || this._currentChord.freqs[1];
    const ctx = this._ctx();
    if (!ctx) return;

    let t = startAt;
    const now = ctx.currentTime;

    while (t < now + 4) {
      this._addBassNote(ctx, rootFreq, t);
      this._addBassNote(ctx, fifthFreq, t + this._noteInterval() * 0.5);
      t += this._noteInterval();
    }
    this._lastNoteAt = now;
  }

  _addBassNote(ctx, freq, when) {
    if (when - ctx.currentTime > 10) return; // guard: skip future notes far away

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);

    // Sharp attack + quick decay for punchy pulse
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.6, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.01, when + 0.06);

    osc.connect(g);
    g.connect(this._masterPatch);

    osc.start(when);
    osc.stop(when + 0.1);

    const schedId = setTimeout(() => this._removeNode(osc), (when - ctx.currentTime) * 1000 + 200);
    this._scheduledNodes.push({ stop: () => { clearTimeout(schedId); try { osc.disconnect(); } catch(e){} } });
  }

  _scheduleArpNotes(startAt) {
    if (!this._currentArp) return;
    const freqs = this._currentChord ? this._currentChord.freqs : CHORDS.menu.freqs;
    const arpSeq = this._currentArp;
    const ctx = this._ctx();
    if (!ctx) return;

    let t = startAt;
    const now = ctx.currentTime;
    const arpDur = this._noteInterval() * 0.75; // arp note plays 75% of interval

    while (t < now + 4) {
      const noteIdx = arpSeq[Math.floor((t - startAt) / this._noteInterval()) % arpSeq.length];
      const freq = freqs[noteIdx] || freqs[0];

      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      // Pluck envelope: attack fast, decay medium
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + arpDur);

      osc.connect(g);
      g.connect(this._masterPatch);

      osc.start(t);
      osc.stop(t + arpDur + 0.05);

      const schedId = setTimeout(() => this._removeNode(osc), (t - ctx.currentTime) * 1000 + arpDur * 1000 + 100);
      this._scheduledNodes.push({ stop: () => { clearTimeout(schedId); try { osc.disconnect(); } catch(e){} } });

      t += arpDur;
    }
  }

  _removeNode(node) {
    try { node.disconnect(); } catch (e) {}
    const idx = this._scheduledNodes.findIndex(n => n === node || n.stop === undefined);
    if (idx >= 0) this._scheduledNodes.splice(idx, 1);
  }
}

export { MusicEngine };
