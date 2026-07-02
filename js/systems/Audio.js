// Procedural audio via Web Audio API — zero assets
// Includes procedural BGM (background music) system

// ─── 8-Bit Chiptune Sequencer ──────────────────────────────────────────
// Three channels: Square (melody/arp), Triangle (bass), Noise (drums)
// Pattern-based step sequencer, like a NES tracker

const NOTE = {
  C2:65.41, 'C#2':69.30, D2:73.42, 'Eb2':77.78, E2:82.41, F2:87.31,
  'F#2':92.50, G2:98.00, 'G#2':103.83, A2:110.00, 'Bb2':116.54, B2:123.47,
  C3:130.81, 'C#3':138.59, D3:146.83, 'Eb3':155.56, E3:164.81, F3:174.61,
  'F#3':185.00, G3:196.00, 'G#3':207.65, A3:220.00, 'Bb3':233.08, B3:246.94,
  C4:261.63, 'C#4':277.18, D4:293.66, 'Eb4':311.13, E4:329.63, F4:349.23,
  'F#4':369.99, G4:392.00, 'G#4':415.30, A4:440.00, 'Bb4':466.16, B4:493.88,
  C5:523.25, 'C#5':554.37, D5:587.33, 'Eb5':622.25, E5:659.25, F5:698.46,
  'F#5':739.99, G5:783.99, 'G#5':830.61, A5:880.00,
  C6:1046.50,
};

// Step: [arp_note, bass_note, kick=0, snare=0]
// arp_note = string key from NOTE, null = rest
// bass_note = string key from NOTE, null = rest
// kick=1 = noise burst, snare=1 = filtered noise crack
const S = (a, b, k, s) => [a||null, b||null, k||0, s||0];

// ── Menu — Slow, spacey title-screen feel (80 BPM) ──────────────────
// C minor arpeggio, ambient
const MENU_SEQ = [
  // Bar 1 — ascending
  S('C4','C3',1,0), S(null), S('Eb4'),    S(null),
  S('G4','G3'),     S(null), S('C5'),      S(null),
  S('C4','C3',1,0), S(null), S('Eb4'),    S(null),
  S('G4','Ab3'),    S(null), S('C5'),      S(null),
  // Bar 2 — descending with transition
  S('C5','C3',1,0), S(null), S('G4'),      S(null),
  S('Eb4','Bb3'),   S(null), S('C4'),      S(null),
  S('Bb3','C3',1,0),S(null), S('G4'),      S(null),
  S('G4','Ab3'),    S(null), S('C4'),      S(null),
  // Bar 3 — repeat ascending
  S('C4','C3',1,0), S(null), S('Eb4'),    S(null),
  S('G4','G3'),     S(null), S('C5'),      S(null),
  S('C4','C3',1,0), S(null), S('Eb4'),    S(null),
  S('G4','Ab3'),    S(null), S('C5'),      S(null),
  // Bar 4 — resolve
  S('C5','C3',1,0), S(null), S('Bb4'),    S(null),
  S('Ab4','F3'),    S(null), S('G4'),      S(null),
  S('F4','C3',1,0), S(null), S('G4'),      S(null),
  S('C5','C3'),     S(null), S('Eb5'),     S(null),
];

// ── Playing — Driving combat feel (120 BPM) ──────────────────────────
const PLAYING_SEQ = [
  // Bar 1
  S('C4','C3',1,0), S(null),  S('Eb4'),       S('C4',null,0,1),
  S('G4','G3',1,0), S(null),  S('C5'),         S('G4',null,0,1),
  S('Bb3','C3',1,0), S('G4'), S('Eb4'),        S(null,null,0,1),
  S('C4','G3',1,0), S(null),  S('G4'),         S('C5',null,0,1),
  // Bar 2
  S('C4','C3',1,0), S(null),  S('Eb4'),       S('C4',null,0,1),
  S('G4','G3',1,0), S(null),  S('C5'),         S('G4',null,0,1),
  S('C4','F3',1,0), S('Eb4'), S('G4'),         S(null,null,0,1),
  S('C5','G3',1,0), S(null),  S('G4'),         S('C5',null,0,1),
  // Bar 3 — hit harder
  S('C4','C3',1,0), S(null),  S('Eb4'),       S('C4',null,0,1),
  S('G4','G3',1,0), S(null),  S('C5'),         S('G4',null,0,1),
  S('Bb3','C3',1,0), S('G4'), S('Eb4'),        S(null,null,0,1),
  S('C4','G3',1,0), S(null),  S('G4'),         S('C5',null,0,1),
  // Bar 4 — high energy lead-out
  S('C4','C3',1,0), S('C5'),  S('Eb4'),        S(null,null,0,1),
  S('G4','G3',1,0), S('C5'),  S('C5'),         S('G4',null,0,1),
  S('F4','C3',1,0), S(null),  S('G4'),         S('F4',null,0,1),
  S('C5','G3',1,0), S('C5'),  S('Eb5'),        S('C5',null,0,1),
];

// ── Boss — Frantic, aggressive (140 BPM) ────────────────────────────
const BOSS_SEQ = [
  // Bar 1 — chromatic tension
  S('C4','C3',1,0), S('Eb4'),  S('F#4'),       S('G4',null,0,1),
  S('C5','G3',1,0), S('G4'),   S('F#4'),        S('Eb4',null,0,1),
  S('C4','C3',1,0), S('F#4'),  S('G4'),         S('C5',null,0,1),
  S('Eb4','G3',1,0),S('F#4'),  S('G4'),         S('C5',null,0,1),
  // Bar 2 — tension + release
  S('F4','F3',1,0), S('G4'),   S('Ab4'),        S('C5',null,0,1),
  S('F4','C3',1,0), S('G4'),   S('Ab4'),        S('C5',null,0,1),
  S('F4','F3',1,0), S('G4'),   S('Ab4'),        S('C5',null,0,1),
  S('C4','C3',1,0), S('Eb4'),  S('G4'),         S('C5',null,0,1),
  // Bar 3 — fast repeat
  S('C4','C3',1,0), S('Eb4'),  S('F#4'),        S('G4',null,0,1),
  S('C5','G3',1,0), S('G4'),   S('F#4'),        S('Eb4',null,0,1),
  S('C4','C3',1,0), S('F#4'),  S('G4'),         S('C5',null,0,1),
  S('Eb4','G3',1,0),S('F#4'),  S('G4'),         S('C5',null,0,1),
  // Bar 4 — climax
  S('F4','F3',1,0), S('Ab4'),  S('C5'),         S('F4',null,0,1),
  S('F4','C3',1,0), S('Ab4'),  S('C5'),         S('F4',null,0,1),
  S('G4','C3',1,0), S('Bb4'),  S('C5'),         S('G4',null,0,1),
  S('C5','C3',1,0), S('C5'),   S('Eb5'),        S('C5',null,0,1),
];

class BGM {
  constructor(ctx) {
    this.ctx = ctx;
    this.master = null;
    this.state = null;
    this._timer = null;
    this._beat = 0;
    this._running = false;
    this._bpm = 120;
    this._seq = null;
    this._lastVol = 0.09;
  }

  _gain(vol, ramp = 0.05) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + ramp);
    return g;
  }

  _note(freq, dur, type, vol) {
    if (!freq || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.01);
  }

  _noise(dur, vol) {
    if (!this.master) return;
    const sr = this.ctx.sampleRate;
    const len = Math.ceil(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(g).connect(this.master);
    src.start();
  }

  start(state) {
    if (!this.ctx) return;
    this.stop();
    this.state = state;
    this._beat = 0;

    const CFG = {
      menu:   { bpm: 80,  seq: MENU_SEQ,   vol: 0.12 },
      playing:{ bpm: 120, seq: PLAYING_SEQ, vol: 0.09 },
      boss:   { bpm: 140, seq: BOSS_SEQ,   vol: 0.11 },
    };
    const cfg = CFG[state];
    if (!cfg) return;
    this._bpm = cfg.bpm;
    this._seq = cfg.seq;

    // Master gain with gentle fade-in
    this.master = this._gain(cfg.vol, 0.15);
    this.master.connect(this.ctx.destination);

    this._running = true;
    this._lastVol = cfg.vol;
    const ms = 60000 / this._bpm / 4; // 16th-note tick
    this._timer = setInterval(() => this._tick(), ms);
  }

  _tick() {
    if (!this._running || !this._seq) return;

    const i = this._beat % this._seq.length;
    const [arp, bass, kick, snare] = this._seq[i];
    const dur = 60 / this._bpm / 4 * 0.85;

    // Square-wave arpeggio (8-bit lead)
    if (arp) this._note(NOTE[arp], dur, 'square', 0.09);

    // Triangle-wave bass
    if (bass) this._note(NOTE[bass], dur * 1.5, 'triangle', 0.13);

    // Kick drum — noise burst
    if (kick) this._noise(0.07, 0.30);

    // Snare — short filtered noise crack
    if (snare) this._noise(0.04, 0.18);

    this._beat++;
  }

  setState(state) {
    if (state === this.state || !this.ctx) return;
    // Crossfade: fade old out, start new
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0.001, t + 0.08);
    }
    this.start(state);
  }

  stop() {
    this._running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0.001, t + 0.15);
      const old = this.master;
      setTimeout(() => {
        try { old.disconnect(); } catch(e) {}
      }, 200);
      this.master = null;
    }
    this._beat = 0;
  }
}

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.25;
    this._savedVolume = 0.25;
    this._muted = false;
    this.bgm = null;
    this._bgmState = null;
  }

  isMuted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    if (this._muted) {
      this._savedVolume = this.masterVolume;
      this.masterVolume = 0;
      if (this.bgm && this.bgm.master) this.bgm.master.gain.setValueAtTime(0, this.ctx.currentTime);
    } else {
      this.masterVolume = this._savedVolume;
      if (this.bgm && this.bgm.master && this.ctx) {
        const target = this.bgm._lastVol !== undefined ? this.bgm._lastVol : 0.09;
        this.bgm.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.05);
      }
    }
  }

  resume() {
    if (!this.ctx) {
      this._ensure();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }

  onInteraction() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgm = new BGM(this.ctx);
      } catch(e) { /* silently fail */ }
    }
  }

  bgmStart(state = 'menu') {
    this._ensure();
    if (!this.bgm) return;
    this._bgmState = state;
    this.bgm.start(state);
  }

  bgmStop() {
    if (!this.bgm) return;
    this.bgm.stop();
    this._bgmState = null;
  }

  bgmSetState(state) {
    if (state === this._bgmState) return;
    this._ensure();
    if (!this.bgm) return;
    this._bgmState = state;
    this.bgm.setState(state);
  }

  _noise(duration) {
    if (!this.ctx) return null;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * duration, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
    }
    return buf;
  }

  _playTone(freq, duration, type = 'square', volume = 1, ramp = true) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (ramp) o.frequency.exponentialRampToValueAtTime(freq * 0.3, this.ctx.currentTime + duration);
    g.gain.setValueAtTime(this.masterVolume * volume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    o.connect(g).connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + duration + 0.01);
  }

  fire() {
    this._ensure();
    this._playTone(1200, 0.08, 'square', 0.3);
  }

  hit() {
    this._ensure();
    if (!this.ctx) return;
    const buf = this._noise(0.05);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(this.masterVolume * 0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    src.connect(g).connect(this.ctx.destination);
    src.start();
  }

  explosion() {
    this._ensure();
    if (!this.ctx) return;
    const buf = this._noise(0.3);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(this.masterVolume * 0.5, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    src.connect(g).connect(this.ctx.destination);
    src.start();
    this._playTone(80, 0.2, 'sawtooth', 0.3);
  }

  playerHit() {
    this._ensure();
    this._playTone(200, 0.15, 'sawtooth', 0.4);
    if (!this.ctx) return;
    const buf = this._noise(0.1);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(this.masterVolume * 0.4, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    src.connect(g).connect(this.ctx.destination);
    src.start();
  }

  shieldHit() {
    this._ensure();
    this._playTone(1500, 0.1, 'sine', 0.35);
  }

  scrapCollect() {
    this._ensure();
    this._playTone(880, 0.06, 'sine', 0.2);
    setTimeout(() => this._playTone(1320, 0.08, 'sine', 0.15), 40);
  }

  coreCollect() {
    this._ensure();
    this._playTone(660, 0.1, 'sine', 0.3);
    setTimeout(() => this._playTone(990, 0.1, 'sine', 0.25), 60);
    setTimeout(() => this._playTone(1320, 0.12, 'sine', 0.2), 120);
  }

  levelUp() {
    this._ensure();
    this._playTone(440, 0.15, 'sine', 0.3);
    setTimeout(() => this._playTone(660, 0.15, 'sine', 0.25), 100);
    setTimeout(() => this._playTone(880, 0.2, 'sine', 0.2), 200);
  }

  bossWarning() {
    this._ensure();
    this._playTone(110, 0.5, 'sawtooth', 0.3, false);
    setTimeout(() => this._playTone(150, 0.4, 'sawtooth', 0.25, false), 300);
  }

  gameOver() {
    this._ensure();
    this._playTone(400, 0.3, 'sawtooth', 0.3);
    setTimeout(() => this._playTone(300, 0.3, 'sawtooth', 0.25), 300);
    setTimeout(() => this._playTone(200, 0.4, 'sawtooth', 0.2), 600);
    if (this.ctx) {
      const buf = this._noise(0.5);
      if (buf) {
        setTimeout(() => {
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(this.masterVolume * 0.3, this.ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
          src.connect(g).connect(this.ctx.destination);
          src.start();
        }, 900);
      }
    }
  }
}
