// Бонус-уровень «Радужная дорога».
// После каждого 5-го уровня через 2 секунды открывается радужный портал, и машина попадает на радужную
// дорогу далеко от обычных уровней. 40 секунд с неба сыплются монетки (большие — по 10), щит не даёт
// перевернуться. В конце — конфетти и сколько монет собрано, потом обратно на обычный уровень.
//
// Надёжность: main.js в особом режиме (world.mode !== 'normal') не запоминает место, поэтому после
// перезагрузки Софья просто окажется на следующем обычном уровне. Любой world.start() (заново, карта
// уровней, сброс, перенос прогресса) сам завершает бонус. Портал, который ещё не успел открыться,
// запоминается в сохранении (bonus.pending) и откроется, когда Софья снова поедет.
//
// Участок трассы — в отрицательных x: рядом с нулём канвас рисует точно (при x ≈ 5 000 000 точности
// float32 в канвасе уже не хватает: частицы и мелкие фигуры «прыгают» по полметра).
import { addDefaults } from '../save.js';
import { registerRegion, regionAt, groundY, STEP } from '../terrain.js';
import { drawCoin } from '../art.js';
import { circle, ellipse, starPath, heartPath, fillStroke } from '../draw-utils.js';

addDefaults({ bonus: { pending: 0, runs: 0, best: 0 } });

const EVERY = 5;          // бонус после каждого 5-го уровня
const DELAY = 2;          // секунд после финиша до портала
const RAIN = 40;          // секунд монетного дождя
const RATE = 7.5;         // монеток в секунду
const BIG = 0.1;          // доля больших монет (по 10)
const LEN = 1200;         // длина участка трассы (м)
const START = 200;        // где появляется машина (от начала участка)
const END = 960;          // финишная радуга
const BASE_X = -20000;    // участки: BASE_X - k·2000 (первый свободный)
const TAU = Math.PI * 2;
const RB = ['#ff7eb0', '#ffb067', '#ffe066', '#7fe39b', '#74c6ff', '#b28fff'];

// Мир «радуга» (поля как у BIOMES в config.js)
export const RAINBOW = {
  id: 'rainbow', sky: ['#a6d8ff', '#ffe4f5'], far: '#dccbff', near: '#ffc8e6',
  top: '#ffffff', topLight: '#ffffff', soil: '#fde4f6', soilDark: '#d5c0ff', dust: '#fff3fb',
  deco: ['heart', 'lollipop', 'flower', 'cupcake', 'cane', 'flower', 'heart', 'lollipop'],
  amp: 0.8, wl: 1, bump: 0.3, gravity: 1,
};

// ---------- дорога: пологие волны, ровно у портала и после финиша, стенки по краям ----------
const wave = (u) => 1.7 * Math.sin((TAU * u) / 52) + 0.6 * Math.sin((TAU * u) / 19 + 1.3) + 0.9 * Math.sin((TAU * u) / 130 + 0.4);
const H0 = wave(START), H1 = wave(END);
const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function heightAt(u) {
  let h = wave(u);
  h += (H0 - h) * (1 - sm((u - START - 6) / 24));
  h += (H1 - h) * sm((u - END + 6) / 24);
  if (u < START - 30) h += (START - 30 - u) ** 2 * 0.5;
  if (u > LEN - 70) h += (u - LEN + 70) ** 2 * 0.5;
  return h;
}

let REG = null;
function region() {
  if (REG) return REG;
  const busy = (a, b) => {
    for (let x = a; x < b; x += 40) if (regionAt(x)) return true;
    return !!regionAt(b);
  };
  let k = 0;
  while (busy(BASE_X - k * 2000 - 100, BASE_X - k * 2000 + LEN + 100)) k++;
  const x0 = BASE_X - k * 2000;
  REG = registerRegion({ x0, x1: x0 + LEN, height: (x) => heightAt(x - x0), biome: RAINBOW, deco: RAINBOW.deco });
  return REG;
}

// ---------- состояние ----------
const B = { active: false, phase: '', left: 0, got: 0, fin: 0, shownAt: -1, ret: null, acc: 0, combo: 0, comboT: 0, endX: 0, saveT: 0, dirty: false };
const coins = Array.from({ length: 110 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, big: false, landed: false, life: 0, pull: false }));
let A = null;             // api
let pendT = 0;            // сколько секунд ждём портал
let TR = null;            // переход через портал {kind:'in'|'out', t, swap, dur, done}
let selfStart = false;    // world.start() вызвали мы сами
let hudEl = null, barEl = null, lastP = -1, lastLow = false;

export function init(api) {
  A = api;
  injectStyle();
  hudEl = api.$('hud');
  barEl = api.$('hudFill').parentNode;

  api.on('app:levelDone', (e) => {
    if ((e.L + 1) % EVERY !== 0 || B.active) return;
    api.save.bonus.pending = 1;
    pendT = 0;
    api.persist();
  });

  api.on('world:update', (world, dt) => {
    if (TR) stepTransition(world, dt);
    if (B.active) stepBonus(world, dt);
    else if (!TR && api.save.bonus && api.save.bonus.pending && world.mode === 'normal' && !world.crashed && api.state === 'play') {
      pendT += dt;
      if (pendT >= DELAY) openPortal(world);
    }
  });

  // любой чужой world.start (заново, другой уровень, сброс) завершает бонус и отменяет портал
  api.on('world:start', () => {
    if (selfStart) return;
    if (B.active) cleanup();
    TR = null;
    pendT = 0;
  });

  // на всякий случай: в бонусе не переворачиваемся (щит должен был спасти)
  api.on('world:crash', (world) => {
    if (!B.active) return;
    world.crashed = false;
    world.crashT = 0;
    const i = world.events.findIndex((e) => e.type === 'crash');
    if (i >= 0) world.events.splice(i, 1);
    world.car.rescue(1.4);
    world.burst(world.car.x, world.car.y, 'pop', 18, '#ffffff');
  });

  api.on('hud:update', () => {
    if (!B.active) return;
    const p = B.phase === 'rain' ? Math.max(0, B.left) / RAIN : 0;
    const v = Math.round(p * 400) / 4;
    if (v !== lastP) { lastP = v; barEl.style.setProperty('--bonus-p', v + '%'); }
    const low = B.phase === 'rain' && B.left < 6;
    if (low !== lastLow) { lastLow = low; barEl.classList.toggle('bonus-low', low); }
  });

  api.on('render:sky', drawSky);
  api.on('render:world-back', drawRoad);
  api.on('render:world-items', drawCoins);
  api.on('render:screen', drawTransition);
  api.on('app:frame', stepAnims);
}

// ---------- портал ----------
function openPortal(world) {
  pendT = 0;
  world.shield = Math.max(world.shield, 4);   // чтобы не перевернуться, пока открывается портал
  const toast = A.$('toast');
  if (toast) toast.classList.add('hidden');
  sfxPortal();
  portalPopup();
  TR = { kind: 'in', t: 0, swap: 0.95, dur: 1.75, done: false };
}

function stepTransition(world, dt) {
  TR.t += dt;
  if (!TR.done && TR.t >= TR.swap) {
    TR.done = true;
    if (TR.kind === 'in') {
      if (world.crashed || world.mode !== 'normal') { TR = null; return; } // портал откроется после «заново»
      enterBonus(world);
    } else exitBonus(world);
  }
  if (TR && TR.t >= TR.dur) TR = null;
}

function enterBonus(world) {
  const reg = region();
  const car = world.car;
  B.ret = { L: world.L, x: car.x, taken: world.takenIds };
  const v = Math.min(Math.max(car.vx, 0), 12);
  car.place(reg.x0 + START);
  car.vx = v;
  for (const wh of car.wheels) { wh.vx = v; wh.w = v / car.R; }
  world.mode = 'bonus';
  world.particles.length = 0;
  world.shield = 999;
  world.react({ pet: 'happy', sofya: 'happy', pose: 'wave' }, 2.5);
  A.renderer.follow(world, 0, true);
  Object.assign(B, { active: true, phase: 'rain', left: RAIN, got: 0, fin: 0, shownAt: -1, acc: 0.6, combo: 0, comboT: 0, endX: reg.x0 + END, saveT: 0, dirty: false });
  for (const c of coins) c.on = false;
  const s = A.save;
  s.bonus.pending = 0;
  s.bonus.runs = (s.bonus.runs || 0) + 1;
  A.persist(true);
  lastP = -1;
  lastLow = false;
  hudEl.classList.add('bonus-on');
}

function exitBonus(world) {
  const ret = B.ret, s = A.save;
  cleanup();
  selfStart = true;
  try {
    // туда же, откуда уехали в портал (это уже следующий уровень)
    if (ret && ret.L === s.level) world.start(ret.L, ret.x, ret.taken);
    else world.start(s.level);
  } finally { selfStart = false; }
  A.renderer.follow(world, 0, true);
  world.react({ pet: 'happy', sofya: 'happy' }, 1.5);
}

function cleanup() {
  B.active = false;
  B.phase = '';
  for (const c of coins) c.on = false;
  if (B.dirty) { B.dirty = false; A.persist(true); }
  hudEl.classList.remove('bonus-on');
  barEl.classList.remove('bonus-low');
  barEl.style.removeProperty('--bonus-p');
}

// ---------- монетный дождь ----------
function stepBonus(world, dt) {
  const car = world.car;
  world.shield = 999;
  if (B.phase === 'rain') {
    B.left -= dt;
    B.acc += dt * RATE;
    while (B.acc >= 1) { B.acc -= 1; spawn(world); }
    if (B.left <= 0 || car.x >= B.endX) {
      B.phase = 'fin';
      B.fin = 0;
      for (const c of coins) if (c.on) c.pull = true;   // все оставшиеся монетки летят к машине
    }
  } else if (B.phase === 'fin') {
    B.fin += dt;
    if (B.shownAt < 0 && (B.fin > 1.4 || !anyCoins())) celebrate(world);
    if (B.shownAt >= 0 && B.fin - B.shownAt > 3.4 && !TR) {
      B.phase = 'out';
      sfxPortal();
      TR = { kind: 'out', t: 0, swap: 0.95, dur: 1.75, done: false };
    }
  }
  stepCoins(world, dt);
  B.saveT += dt;
  if (B.dirty && B.saveT > 1.5) { B.saveT = 0; B.dirty = false; A.persist(true); }
}

function anyCoins() {
  for (const c of coins) if (c.on) return true;
  return false;
}

function spawn(world) {
  let c = null;
  for (const k of coins) if (!k.on) { c = k; break; }
  if (!c) return;
  const r = A.renderer, car = world.car, s = r.cam.s;
  const half = r.W / 2 / s, top = r.cam.y - r.H / 2 / s;
  c.y = top - 0.8 - Math.random() * 1.5;
  // падаем примерно за 1,1–1,7 с до высоты машины (на высоком экране — быстрее)
  const T = 1.1 + Math.random() * 0.6;
  c.vy = Math.max(2.5, (car.y - 1 - c.y) / T);
  if (Math.random() < 0.65) c.x = car.x + Math.max(0, car.vx) * T + (Math.random() - 0.4) * 9; // туда, где будет машина
  else c.x = r.cam.x + (Math.random() * 2 - 1) * half;                                          // и просто по всему небу
  c.vx = (Math.random() - 0.5) * 0.8;
  c.big = Math.random() < BIG;
  c.landed = false;
  c.pull = false;
  c.life = 0;
  c.on = true;
}

function stepCoins(world, dt) {
  const car = world.car;
  const cx = car.x, cy = car.y - 0.35;
  const range = world.magnet > 0 && world.U ? world.U.magnetRange + 1.5 : 3.2;
  B.comboT -= dt;
  if (B.comboT <= 0) B.combo = 0;
  for (const c of coins) {
    if (!c.on) continue;
    const dx = cx - c.x, dy = cy - c.y, d2 = dx * dx + dy * dy;
    if (c.pull || d2 < range * range) {
      c.pull = true;
      const d = Math.sqrt(d2) || 1, v = Math.min(d, (14 + car.speed) * dt);
      c.x += (dx / d) * v;
      c.y += (dy / d) * v;
    } else if (!c.landed) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      const gy = groundY(c.x) - (c.big ? 0.75 : 0.55);
      if (c.y >= gy) { c.y = gy; c.landed = true; c.life = 7; }
    } else {
      c.life -= dt;
      if (c.life <= 0 || dx > 30) { c.on = false; continue; }
    }
    const rr = c.big ? 1.45 : 1.2;
    if ((cx - c.x) ** 2 + (cy - c.y) ** 2 < rr * rr) collect(world, c);
    else if (dx > 40 || c.y > cy + 40) c.on = false;
  }
}

function collect(world, c) {
  c.on = false;
  const v = c.big ? 10 : 1;
  A.save.coins += v;
  B.got += v;
  B.dirty = true;
  B.combo++;
  B.comboT = 1.2;
  world.happyT = 0.6;
  world.burst(c.x, c.y, 'spark', c.big ? 10 : 4, c.big ? '#ffd93b' : RB[B.combo % 6]);
  if (c.big) {
    world.particles.push({ type: 'text', x: c.x, y: c.y - 0.5, vx: 0, vy: -2, life: 1, max: 1, text: '+10' });
    A.sound.bigCoin();
  } else A.sound.coin(B.combo);
}

function celebrate(world) {
  for (const c of coins) if (c.on) { c.on = false; A.save.coins += c.big ? 10 : 1; B.got += c.big ? 10 : 1; }
  B.shownAt = B.fin;
  const car = world.car;
  confetti(world, car.x, car.y - 1);
  world.react({ pet: 'happy', sofya: 'happy', pose: 'wave' }, 3);
  const s = A.save;
  s.bonus.best = Math.max(s.bonus.best || 0, B.got);
  B.dirty = false;
  A.persist(true);
  A.refresh();
  sfxFanfare();
  resultPopup(B.got);
}

// конфетти прямо вокруг машины (радужных цветов)
function confetti(world, x, y) {
  for (let i = 0; i < 80; i++) {
    world.particles.push({
      type: 'confetti', x: x + (Math.random() - 0.5) * 3, y: y - Math.random(),
      vx: (Math.random() - 0.5) * 12, vy: -5 - Math.random() * 9, life: 2 + Math.random(), max: 3,
      color: RB[i % 6], size: 0.16 + Math.random() * 0.12, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
    });
  }
}

// ---------- звуки ----------
function sfxPortal() {
  const s = A.sound;
  s.noise(0.9, 0.12, 400, 5000);
  s.tone(260, 0.9, 'sine', 0.12, 0, undefined, 1300);
  [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => s.tone(f, 0.18, 'triangle', 0.1, 0.08 + i * 0.07));
}
function sfxFanfare() {
  const s = A.sound;
  [784, 988, 1175, 1568].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.16, i * 0.11));
  s.tone(1568, 0.7, 'square', 0.045, 0.48);
  s.tone(1976, 0.7, 'square', 0.035, 0.48);
  setTimeout(() => s.meow(1.15), 850);
}

// ---------- всплывашки с живыми картинками ----------
const anims = [];
function animCanvas(size, ms, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  anims.push({ cv, ctx: cv.getContext('2d'), t: 0, until: performance.now() + ms, draw });
  return cv;
}
function stepAnims(dt) {
  if (!anims.length) return;
  const now = performance.now();
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    a.t += dt;
    a.draw(a.ctx, a.cv.width, a.t);
    if (now > a.until) anims.splice(i, 1);
  }
}

function portalPopup() {
  const box = document.createElement('div');
  box.className = 'bonus-row';
  box.appendChild(animCanvas(168, 2700, drawPortalIcon));
  box.appendChild(animCanvas(168, 2700, drawRainIcon));
  const card = A.popup(box, 2400);
  card.classList.add('bonus-portal');
}

function resultPopup(total) {
  const box = document.createElement('div');
  box.className = 'bonus-row';
  box.appendChild(animCanvas(168, 4200, drawPotIcon));
  const num = document.createElement('b');
  num.className = 'bonus-num';
  num.textContent = '+0';
  box.appendChild(num);
  // число растёт от 0 до итога
  let shown = -1;
  anims.push({ cv: { width: 0 }, ctx: null, t: 0, until: performance.now() + 1600, draw: (_c, _w, t) => {
    const v = Math.round(total * Math.min(1, t / 1.2));
    if (v !== shown) { shown = v; num.textContent = '+' + v; }
  } });
  const card = A.popup(box, 3800);
  card.classList.add('bonus-pop');
}

function drawPortalIcon(ctx, S, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S, S);
  ctx.translate(S / 2, S / 2);
  const R = S * 0.46;
  const g = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#fff0fa');
  g.addColorStop(1, 'rgba(255,240,250,0)');
  ctx.fillStyle = g;
  circle(ctx, 0, 0, R);
  ctx.fill();
  ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const r = R * (0.92 - k * 0.13);
    const a0 = t * (2.4 + k * 0.7) * (k % 2 ? -1 : 1) + k;
    ctx.strokeStyle = RB[k];
    ctx.lineWidth = R * 0.11;
    ctx.beginPath(); ctx.arc(0, 0, r, a0, a0 + Math.PI * 1.45); ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  starPath(ctx, 0, 0, R * 0.22 * (1 + 0.15 * Math.sin(t * 9)), R * 0.07, 4, t * 2);
  ctx.fill();
}

function drawRainIcon(ctx, S, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, S * 0.3, S, S * 0.7); ctx.clip();
  for (let i = 0; i < 4; i++) {
    const x = S * (0.2 + i * 0.2);
    const y = S * 0.28 + (((t * 0.8 + i * 0.29) % 1) * S * 0.8);
    ctx.save(); ctx.translate(x, y); ctx.scale(S / 3.6, S / 3.6);
    drawCoin(ctx, 0, 0, t * 0.5 + i, i === 1);
    ctx.restore();
  }
  ctx.restore();
  // облачко
  ctx.fillStyle = '#bfe3ff';
  ctx.beginPath();
  ctx.arc(S * 0.27, S * 0.3, S * 0.16, 0, TAU);
  ctx.arc(S * 0.5, S * 0.2, S * 0.2, 0, TAU);
  ctx.arc(S * 0.73, S * 0.3, S * 0.16, 0, TAU);
  ctx.ellipse(S * 0.5, S * 0.36, S * 0.38, S * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ellipse(ctx, S * 0.42, S * 0.17, S * 0.09, S * 0.05, -0.3);
  ctx.fill();
}

function drawPotIcon(ctx, S, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S, S);
  // радуга
  ctx.lineCap = 'butt';
  for (let k = 0; k < 6; k++) {
    ctx.strokeStyle = RB[k];
    ctx.lineWidth = S * 0.055;
    ctx.beginPath(); ctx.arc(S * 0.5, S * 0.78, S * (0.44 - k * 0.052), Math.PI, TAU); ctx.stroke();
  }
  // горка монет
  const pile = [[0.3, 0.84], [0.5, 0.86], [0.7, 0.84], [0.4, 0.69], [0.6, 0.69], [0.5, 0.53]];
  pile.forEach(([fx, fy], i) => {
    ctx.save(); ctx.translate(S * fx, S * fy); ctx.scale(S / 2.9, S / 2.9);
    drawCoin(ctx, 0, 0, i === 5 ? t * 0.8 : 1.9, i === 5);
    ctx.restore();
  });
  // искорки
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const a = 0.5 + 0.5 * Math.sin(t * 5 + i * 2);
    ctx.globalAlpha = a;
    starPath(ctx, S * (0.2 + i * 0.3), S * (0.35 + (i % 2) * 0.12), S * 0.06, S * 0.02, 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- отрисовка мира ----------
const SPARK = Array.from({ length: 14 }, (_, i) => {
  const f = (v) => v - Math.floor(v);
  return [f(Math.sin(i * 12.9898) * 43758.5453), f(Math.sin(i * 78.233) * 12543.123) * 0.55, 0.6 + f(Math.sin(i * 3.7) * 999) * 0.8];
});

function inRainbow(view) {
  return view.blend && (view.blend.a === RAINBOW || view.blend.b === RAINBOW);
}

function drawSky(ctx, view, t) {
  if (!inRainbow(view)) return;
  const { W, H } = view, u = Math.min(W, H);
  // большая радуга в небе
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.lineCap = 'butt';
  const tall = H > W;
  const R0 = tall ? W * 0.8 : Math.max(W * 0.55, u * 0.9), bw = u * 0.045, cy = tall ? H * 0.58 : H * 0.95;
  for (let k = 0; k < 6; k++) {
    ctx.strokeStyle = RB[k];
    ctx.lineWidth = bw + 1;
    ctx.beginPath(); ctx.arc(W * 0.45, cy, R0 - k * bw, Math.PI, TAU); ctx.stroke();
  }
  // искорки
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < SPARK.length; i++) {
    const [fx, fy, k] = SPARK[i];
    ctx.globalAlpha = 0.35 + 0.55 * Math.abs(Math.sin(t * 1.7 + i));
    starPath(ctx, fx * W, fy * H + 6, u * 0.018 * k, u * 0.006 * k, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawRoad(ctx, world, view, t) {
  const R = REG;
  if (!R || view.x1 < R.x0 || view.x0 > R.x1) return;
  const a = Math.max(view.x0, R.x0), b = Math.min(view.x1, R.x1);
  const i0 = Math.floor(a / STEP), i1 = Math.ceil(b / STEP);
  const path = new Path2D();
  path.moveTo(i0 * STEP, groundY(i0 * STEP));
  for (let i = i0 + 1; i <= i1; i++) path.lineTo(i * STEP, groundY(i * STEP));
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  ctx.translate(0, 0.02);
  ctx.lineWidth = 0.18;
  for (let k = 0; k < 6; k++) {
    ctx.translate(0, k ? 0.16 : 0.09);
    ctx.strokeStyle = RB[k];
    ctx.stroke(path);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.07;
  ctx.translate(0, 0.02);
  ctx.stroke(path);
  ctx.restore();
  // радуги-ворота: у портала и на финише
  for (const [u, big] of [[START - 6, false], [END, true]]) {
    const x = R.x0 + u;
    if (x > view.x0 - 7 && x < view.x1 + 7) rainbowGate(ctx, x, big, t);
  }
}

function rainbowGate(ctx, x, big, t) {
  const gy = groundY(x);
  const R0 = big ? 5.4 : 4.6, bw = 0.34;
  ctx.save();
  ctx.lineCap = 'butt';
  for (let k = 0; k < 6; k++) {
    ctx.strokeStyle = RB[k];
    ctx.lineWidth = bw + 0.02;
    ctx.beginPath(); ctx.arc(x, gy + 0.4, R0 - k * bw, Math.PI, TAU); ctx.stroke();
  }
  // облачка у ножек
  ctx.fillStyle = '#ffffff';
  for (const d of [-1, 1]) {
    const cx = x + d * (R0 - 2.5 * bw), cy = groundY(cx) - 0.05;
    circle(ctx, cx - 0.55, cy, 0.55); ctx.fill();
    circle(ctx, cx + 0.5, cy - 0.05, 0.6); ctx.fill();
    circle(ctx, cx, cy - 0.5, 0.7); ctx.fill();
  }
  if (big) {
    // на финише — большая монетка и сердечки
    ctx.save(); ctx.translate(x, gy - R0 - 0.9); ctx.scale(1.6, 1.6);
    drawCoin(ctx, 0, 0, t, true);
    ctx.restore();
    for (const d of [-1, 1]) {
      heartPath(ctx, x + d * 1.6, gy - R0 - 0.3 + Math.sin(t * 3 + d) * 0.15, 0.35);
      fillStroke(ctx, '#ff6fae', '#ffffff', 0.06);
    }
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
    starPath(ctx, x, gy - R0 - 0.5, 0.45, 0.15, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawCoins(ctx, world, view, t) {
  if (!B.active) return;
  // искорки над падающими монетками
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const c of coins) {
    if (!c.on || c.landed || c.pull || c.x < view.x0 || c.x > view.x1 || c.y < view.yTop - 1) continue;
    const k = c.big ? 1.4 : 1;
    circle(ctx, c.x, c.y - 0.62 * k, 0.075 * k); ctx.fill();
    circle(ctx, c.x + 0.05, c.y - 0.95 * k, 0.055 * k); ctx.fill();
    circle(ctx, c.x - 0.04, c.y - 1.22 * k, 0.04 * k); ctx.fill();
  }
  for (const c of coins) {
    if (!c.on || c.x < view.x0 || c.x > view.x1 || c.y < view.yTop - 1) continue;
    if (c.landed && c.life < 1.5 && Math.sin(t * 25) > 0) continue; // мигает, перед тем как исчезнуть
    drawCoin(ctx, c.x, c.y, t, c.big);
  }
}

// Радужные кольца вокруг машины: заезд в портал и выезд из него
function drawTransition(ctx, world, view) {
  if (!TR || A.state === 'menu') return;
  const p = TR.t < TR.swap ? TR.t / TR.swap : Math.max(0, 1 - (TR.t - TR.swap) / (TR.dur - TR.swap));
  if (p <= 0) return;
  const { W, H } = view;
  const car = world.car;
  const pt = A.renderer.worldToScreen(car.x, car.y - 0.3);
  const diag = Math.hypot(W, H);
  const bw = Math.max(12, diag * 0.045);
  const e = p * p * (3 - 2 * p);
  const R = e * (diag * 1.25 + 6 * bw);
  ctx.save();
  const inner = R - 6 * bw;
  if (inner > 0) {
    ctx.fillStyle = `rgba(255,248,252,${Math.min(1, 0.25 + e)})`;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, inner, 0, TAU); ctx.fill();
  }
  for (let k = 0; k < 6; k++) {
    const r = R - (k + 0.5) * bw;
    if (r <= 0) continue;
    ctx.strokeStyle = RB[5 - k];
    ctx.lineWidth = bw + 1;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// ---------- оформление ----------
function injectStyle() {
  const css = `
#hud.bonus-on .bar .fill { width: 100% !important; background: linear-gradient(90deg, ${RB.join(', ')});
  clip-path: inset(0 calc(100% - var(--bonus-p, 100%)) 0 0 round 8px); }
#hud.bonus-on .bar .dot { left: var(--bonus-p, 100%) !important; background: radial-gradient(circle at 35% 30%, #fff8c4 0 14%, #ffe04a 35%, #f5b800 80%); }
#hud.bonus-on .flag { visibility: hidden; }
#hud.bonus-on #hudLevel { position: relative; color: transparent; background: conic-gradient(${RB.join(', ')}, ${RB[0]}); }
#hud.bonus-on #hudLevel::after { content: ""; position: absolute; inset: 5px; background: #fff;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
#hud .bar.bonus-low { animation: bonus-blink 0.45s ease-in-out infinite alternate; }
@keyframes bonus-blink { to { transform: scale(1.05); box-shadow: 0 0 14px 4px rgba(255, 126, 176, 0.85); } }
.popup .bonus-row { display: flex; align-items: center; gap: 4px; }
.popup.bonus-portal { padding: 6px 14px; }
.popup.bonus-portal canvas { width: 76px; height: 76px; }
.popup.bonus-pop { padding: 6px 24px 6px 10px; }
@media (max-height: 500px) { .popup.bonus-pop, .popup.bonus-portal { margin-top: -84px; } }
.popup.bonus-pop canvas { width: 84px; height: 84px; }
.bonus-num { font-size: 44px; font-weight: 900; color: #f0a400; -webkit-text-stroke: 1.5px #b8730a; letter-spacing: 1px; }
`;
  const st = document.createElement('style');
  st.id = 'bonus-style';
  st.textContent = css;
  document.head.appendChild(st);
}

// для проверки в браузере
export const _debug = { B, coins, get TR() { return TR; }, region, finishNow() { if (B.active) B.left = 0; } };
