// Звуки и музыка синтезируются прямо в браузере (Web Audio), без файлов.

const MELODY = [
  76, 79, 81, 79, 76, 0, 72, 0,
  74, 76, 79, 76, 74, 0, 0, 0,
  72, 76, 81, 79, 76, 0, 72, 74,
  72, 0, 69, 0, 72, 0, 0, 0,
  76, 79, 84, 0, 81, 79, 76, 0,
  74, 0, 79, 0, 71, 74, 79, 0,
  81, 79, 76, 74, 72, 0, 69, 72,
  74, 0, 76, 0, 72, 0, 0, 0,
];
const BASS = [48, 43, 45, 41, 48, 43, 41, 43];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  constructor() {
    this.ctx = null;
    this.soundOn = true;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = 0;
    this.musicTimer = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = this.soundOn ? 1 : 0;
      this.sfx.connect(this.master);
      this.mus = this.ctx.createGain();
      this.mus.gain.value = this.musicOn ? 0.5 : 0;
      this.mus.connect(this.master);
      // мотор
      this.eng = this.ctx.createOscillator();
      this.eng.type = 'sawtooth';
      this.eng2 = this.ctx.createOscillator();
      this.eng2.type = 'square';
      this.engF = this.ctx.createBiquadFilter();
      this.engF.type = 'lowpass';
      this.engF.frequency.value = 380;
      this.engG = this.ctx.createGain();
      this.engG.gain.value = 0;
      this.eng.connect(this.engF);
      this.eng2.connect(this.engF);
      this.engF.connect(this.engG);
      this.engG.connect(this.sfx);
      this.eng.start();
      this.eng2.start();
      // короткий беззвучный звук — «разблокирует» звук на iPhone
      const b = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.connect(this.ctx.destination);
      src.start(0);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (this.musicOn) this.startMusic();
  }

  setSound(on) { this.soundOn = on; if (this.sfx) this.sfx.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05); }
  setMusic(on) {
    this.musicOn = on;
    if (!this.mus) return;
    this.mus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.1);
    if (on) this.startMusic(); else this.stopMusic();
  }

  // --- простые «инструменты» ---
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, out = this.sfx, slideTo = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur, vol, f0, f1, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfx);
    src.start(t);
  }

  // --- эффекты ---
  coin(combo = 1) {
    const k = Math.min(combo, 12);
    const f = 990 * Math.pow(2, (k % 8) / 24);
    this.tone(f, 0.08, 'square', 0.05);
    this.tone(f * 1.5, 0.16, 'square', 0.05, 0.06);
  }
  bigCoin() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, 'square', 0.05, i * 0.06)); }
  pickup() { this.tone(500, 0.25, 'triangle', 0.18, 0, this.sfx, 1400); }
  boost(kind) {
    if (kind === 'turbo') { this.noise(0.6, 0.35, 400, 3000); this.tone(200, 0.5, 'sawtooth', 0.06, 0, this.sfx, 600); }
    else if (kind === 'magnet') { [600, 800, 600, 800].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.15, i * 0.07)); }
    else { this.tone(300, 0.4, 'sine', 0.2, 0, this.sfx, 900); this.tone(600, 0.3, 'triangle', 0.08, 0.1, this.sfx, 1200); }
  }
  pop() { this.tone(900, 0.12, 'sine', 0.25, 0, this.sfx, 200); this.noise(0.15, 0.2, 2000, 500); }
  crash() {
    this.noise(0.4, 0.45, 800, 100);
    this.tone(180, 0.5, 'triangle', 0.25, 0, this.sfx, 60);
    this.tone(700, 0.6, 'sine', 0.12, 0.25, this.sfx, 150); // «бо-о-инг»
  }
  click() { this.tone(1200, 0.05, 'sine', 0.12); }
  deny() { this.tone(220, 0.15, 'square', 0.06); this.tone(180, 0.2, 'square', 0.06, 0.12); }
  buy() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.15, i * 0.07)); }
  level() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, i * 0.12));
    this.tone(1047, 0.6, 'square', 0.06, 0.5);
    this.tone(1319, 0.6, 'square', 0.05, 0.5);
    setTimeout(() => this.meow(), 900);
  }
  star(i) { this.tone(880 * Math.pow(1.26, i), 0.25, 'triangle', 0.2); this.tone(1760 * Math.pow(1.26, i), 0.15, 'sine', 0.08, 0.05); }
  chestTap(i) { this.tone(300 + i * 120, 0.12, 'square', 0.08); this.noise(0.1, 0.2, 1500, 600); }
  chestOpen() {
    this.noise(0.5, 0.3, 500, 4000);
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.18, 0.1 + i * 0.07));
  }

  // «Мяу» — пила через фильтры-форманты с изгибом высоты
  meow(pitch = 1) {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(480 * pitch, t);
    o.frequency.linearRampToValueAtTime(760 * pitch, t + 0.16);
    o.frequency.linearRampToValueAtTime(560 * pitch, t + 0.45);
    o.frequency.linearRampToValueAtTime(420 * pitch, t + 0.62);
    const vib = this.ctx.createOscillator();
    const vg = this.ctx.createGain();
    vib.frequency.value = 7;
    vg.gain.value = 12;
    vib.connect(vg); vg.connect(o.frequency);
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.28, t + 0.06);
    out.gain.setValueAtTime(0.28, t + 0.4);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);
    for (const [f0, f1, f2, q, v] of [[700, 1300, 650, 6, 1], [1800, 2600, 1500, 8, 0.5]]) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, t);
      bp.frequency.linearRampToValueAtTime(f1, t + 0.18);
      bp.frequency.linearRampToValueAtTime(f2, t + 0.6);
      const g = this.ctx.createGain();
      g.gain.value = v;
      o.connect(bp); bp.connect(g); g.connect(out);
    }
    out.connect(this.sfx);
    o.start(t); vib.start(t);
    o.stop(t + 0.7); vib.stop(t + 0.7);
  }

  // --- мотор ---
  engine(on, throttle, speed) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 45 + Math.min(speed, 30) * 4 + throttle * 20;
    this.eng.frequency.setTargetAtTime(f, t, 0.08);
    this.eng2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    this.engF.frequency.setTargetAtTime(250 + throttle * 350 + speed * 10, t, 0.1);
    this.engG.gain.setTargetAtTime(on ? 0.035 + throttle * 0.035 : 0, t, 0.1);
  }

  // --- музыка ---
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.schedule(), 60);
  }
  stopMusic() { clearInterval(this.musicTimer); this.musicTimer = 0; }
  schedule() {
    const eighth = 60 / 112 / 2;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const i = this.step % MELODY.length;
      const when = this.nextTime - this.ctx.currentTime;
      const m = MELODY[i];
      if (m) {
        this.tone(mtof(m), eighth * 1.6, 'triangle', 0.13, when, this.mus);
        this.tone(mtof(m + 12), eighth * 0.8, 'sine', 0.025, when, this.mus);
      }
      const bar = Math.floor(i / 8), pos = i % 8;
      if (pos === 0 || pos === 4) this.tone(mtof(BASS[bar] + (pos === 4 ? 7 : 0)), eighth * 1.8, 'sine', 0.18, when, this.mus);
      if (pos % 2 === 1) this.tone(mtof(BASS[bar] + 24 + (pos === 3 || pos === 7 ? 4 : 7)), eighth * 0.6, 'sine', 0.03, when, this.mus);
      this.nextTime += eighth;
      this.step++;
    }
  }
}
