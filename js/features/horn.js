// Гудок-«мяу» и тапы по окошкам машины.
// В игре: кнопка с кошачьей мордочкой → «мяу» (каждый раз чуть другое), зверёк радуется, Софья машет.
// У машины с horn: 'jingle' (фургон с мороженым) вместо «мяу» играет мелодия.
// В меню: тап по окну зверька → «мяу», по окну Софьи → смешок и «привет», по самой машине → «би-бип» и машина подпрыгивает.
import { drawAnimal } from '../art.js';
import { heartPath, starPath } from '../draw-utils.js';

const COOLDOWN = 0.45;          // сек между гудками
const JINGLE_COOLDOWN = 1.5;    // мелодия длиннее
const now = () => performance.now() / 1000;

let api, world, btn, iconKind = '';

// ---------- звуки ----------
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function meow() { api.sound.meow(0.9 + Math.random() * 0.35); }

// Мелодия фургона с мороженым: музыкальная шкатулка
const JINGLE = [[79, 1], [76, 1], [79, 1], [76, 1], [72, 1], [74, 1], [76, 2], [77, 1], [74, 1], [71, 1], [74, 1], [72, 3]];
function jingle() {
  const s = api.sound, e = 0.12;
  let at = 0;
  for (const [m, len] of JINGLE) {
    const f = mtof(m), d = e * len;
    s.tone(f, d * 1.1, 'square', 0.035, at);
    s.tone(f, d * 1.3, 'triangle', 0.1, at);
    s.tone(f * 2, d * 0.7, 'sine', 0.035, at);
    at += e * len;
  }
}

// Смешок Софьи: «хи-хи-хи» — короткие скользящие вверх слоги, каждый чуть ниже
function giggle() {
  const s = api.sound, base = 820 + Math.random() * 140;
  for (let i = 0; i < 5; i++) {
    const f = base * (1 - i * 0.05), at = i * 0.1;
    s.tone(f, 0.075, 'triangle', 0.13, at, undefined, f * 1.25);
    s.tone(f * 2.02, 0.06, 'sine', 0.025, at);
  }
}

// Игрушечный «би-бип»
function beep() {
  const s = api.sound;
  for (const at of [0, 0.19]) {
    s.tone(540, 0.14, 'square', 0.05, at, undefined, 590);
    s.tone(680, 0.15, 'triangle', 0.11, at, undefined, 720);
  }
}

// ---------- реакции ----------
let mine = null, mineUntil = 0;   // наша реакция (в меню время мира стоит — снимаем её сами)
function react(r, time) {
  world.react(r, time);
  mine = world.reaction;
  mineUntil = now() + time;
}

// Сердечки и нотки, вылетающие из окошка (координаты машины)
const parts = [];
const COLORS = { heart: ['#ff5fa2', '#ff86c0', '#ff4f7b'], note: ['#8a5cff', '#4fb3ff', '#ff6fae'], star: ['#ffd93b', '#ffe97a'] };
function spawn(role, kind, n) {
  const ws = world.car.vehicle.windows;
  const w = ws.find((x) => x.role === role) || ws[0];
  if (!w) return;
  for (let i = 0; i < n; i++) {
    if (parts.length > 40) parts.shift();
    const cols = COLORS[kind];
    parts.push({
      x: w.x + (Math.random() - 0.5) * 0.35, y: w.y - 0.35,
      vx: (Math.random() - 0.5) * 0.7 + (i - (n - 1) / 2) * 0.25, vy: -1.2 - Math.random() * 0.5,
      life: 1.1, max: 1.1, delay: i * 0.1, kind, color: cols[i % cols.length], rot: (Math.random() - 0.5) * 0.6,
    });
  }
}
function updateParts(dt) {
  let j = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.delay > 0) { p.delay -= dt; parts[j++] = p; continue; }
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt + Math.sin(p.life * 9) * 0.004;
    p.y += p.vy * dt;
    p.vy *= 1 - 0.8 * dt;
    parts[j++] = p;
  }
  parts.length = j;
}
function drawNote(ctx, x, y, s) {
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.4, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x + s * 0.38, y - s * 1.55, s * 0.17, s * 1.55);
  ctx.beginPath();
  ctx.moveTo(x + s * 0.55, y - s * 1.55);
  ctx.quadraticCurveTo(x + s * 1.2, y - s * 1.1, x + s * 0.95, y - s * 0.55);
  ctx.quadraticCurveTo(x + s * 1.0, y - s * 1.0, x + s * 0.55, y - s * 1.12);
  ctx.fill();
}
function drawParts(ctx, info) {
  if (!parts.length || info.state !== world.car) return;
  ctx.save();
  for (const p of parts) {
    if (p.delay > 0) continue;
    const age = p.max - p.life;
    const sc = Math.min(1, age / 0.15) * (1 + 0.15 * Math.sin(age * 12));
    ctx.globalAlpha = Math.min(1, p.life / 0.35);
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === 'heart') {
      heartPath(ctx, 0, 0, 0.27 * sc);
      ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.05; ctx.stroke();
    } else if (p.kind === 'note') {
      drawNote(ctx, 0, 0, 0.2 * sc);
    } else {
      starPath(ctx, 0, 0, 0.27 * sc, 0.12 * sc);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// ---------- машина подпрыгивает в меню (кузов на пружинах, колёса на земле) ----------
let bounce = null;
function startBounce() { if (!bounce) bounce = { t: 0, base: world.car.y }; else bounce.t = 0; }
function endBounce(restore = true) {
  if (bounce && restore) world.car.y = bounce.base;
  bounce = null;
}
function updateBounce(dt) {
  if (!bounce) return;
  bounce.t += dt;
  const k = bounce.t / 0.6;
  if (k >= 1 || api.state !== 'menu') { endBounce(); return; }
  world.car.y = bounce.base - 0.22 * Math.sin(k * Math.PI * 3) * (1 - k);
}

// ---------- кнопка-гудок ----------
function drawIcon(cv, kind) {
  const w = cv.width, h = cv.height, ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.46;
  ctx.translate(w / 2, h / 2);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#ffa6d2'); g.addColorStop(1, '#ec5aa0');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  if (kind === 'jingle') {
    // рожок мороженого
    ctx.save();
    ctx.translate(-r * 0.12, r * 0.02);
    ctx.fillStyle = '#e9a85a'; ctx.strokeStyle = '#b8732e'; ctx.lineWidth = r * 0.05; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.33, -r * 0.05); ctx.lineTo(r * 0.33, -r * 0.05); ctx.lineTo(0, r * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.18, -r * 0.05); ctx.lineTo(r * 0.12, r * 0.45); ctx.moveTo(r * 0.18, -r * 0.05); ctx.lineTo(-r * 0.12, r * 0.45); ctx.stroke();
    ctx.fillStyle = '#fff1f7'; ctx.strokeStyle = '#ff86c0';
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.32, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff4f7b'; ctx.beginPath(); ctx.arc(r * 0.05, -r * 0.55, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else {
    // Марисса поёт «мяу»
    ctx.save();
    ctx.translate(-r * 0.16, r * 0.1);
    ctx.scale(r * 0.46, r * 0.46);
    drawAnimal(ctx, 'marissa', 'happy', 0.5, 'none');
    ctx.restore();
  }
  ctx.restore();
  // звуковые волны
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.1;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath(); ctx.arc(r * 0.18, -r * 0.05, r * (0.5 + i * 0.22), -0.55, 0.55); ctx.stroke();
  }
}

function syncIcon() {
  const kind = world.car.vehicle.horn === 'jingle' ? 'jingle' : 'meow';
  if (kind === iconKind || !btn) return;
  iconKind = kind;
  drawIcon(btn.querySelector('canvas'), kind);
}

function bump(el) {
  if (el && el.animate) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.84)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
}

let readyAt = 0;
function honk() {
  const t = now();
  if (t < readyAt) return;
  const isJingle = world.car.vehicle.horn === 'jingle';
  readyAt = t + (isJingle ? JINGLE_COOLDOWN : COOLDOWN);
  if (isJingle) jingle(); else meow();
  react({ pet: 'happy', sofya: 'happy', pose: 'wave' }, 1.2);
  spawn('pet', isJingle ? 'note' : 'heart', 3);
  bump(btn);
}

// ---------- тапы по машине в меню ----------
const bounds = new WeakMap();
function carBounds(v) {
  let b = bounds.get(v);
  if (!b) {
    const ph = v.phys;
    const xs = v.hull.map((p) => p.x), ys = v.hull.map((p) => p.y);
    const wheelBottom = Math.max(...ph.anchors.map((a) => a.y + ph.rest + ph.wheelR));
    b = { x0: Math.min(...xs) - 0.2, x1: Math.max(...xs) + 0.2, y0: Math.min(...ys) - 0.3, y1: wheelBottom + 0.1 };
    bounds.set(v, b);
  }
  return b;
}

const lastTap = { pet: 0, driver: 0, body: 0 };
function onMenuTap(x, y) {
  if (api.state !== 'menu' || api.overlay) return;
  const car = world.car, v = car.vehicle, R = api.renderer;
  const c = Math.cos(car.a), s = Math.sin(car.a);
  // окна: ближайшее к пальцу (не меньше 30 px в радиусе — удобная цель для детского пальца)
  const rad = Math.max(30, R.cam.s * 0.42);
  let hit = null, best = rad;
  for (const w of v.windows) {
    const p = R.worldToScreen(car.x + c * w.x - s * w.y, car.y + s * w.x + c * w.y);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < best) { best = d; hit = w.role; }
  }
  if (!hit) {
    const p = R.screenToWorld(x, y);
    const dx = p.x - car.x, dy = p.y - car.y;
    const lx = c * dx + s * dy, ly = -s * dx + c * dy;
    const b = carBounds(v);
    if (lx > b.x0 && lx < b.x1 && ly > b.y0 && ly < b.y1) hit = 'body';
  }
  if (!hit) return;
  api.sound.unlock();
  const t = now();
  if (t - lastTap[hit] < 0.3) return;
  lastTap[hit] = t;
  if (hit === 'pet') {
    meow();
    react({ pet: 'happy' }, 1.2);
    spawn('pet', 'heart', 3);
  } else if (hit === 'driver') {
    giggle();
    react({ sofya: 'happy', pose: 'wave' }, 1.4);
    spawn('driver', 'star', 3);
  } else {
    if (v.horn !== 'jingle') beep();
    else if (now() >= readyAt) { readyAt = now() + JINGLE_COOLDOWN; jingle(); }
    react({ pet: 'happy', sofya: 'happy' }, 1.0);
    spawn('pet', v.horn === 'jingle' ? 'note' : 'heart', 1);
    spawn('driver', 'note', 2);
    startBounce();
  }
}

export function init(a) {
  api = a;
  world = api.world;
  btn = api.addHudButton({ id: 'hornBtn', html: '<canvas width="96" height="96"></canvas>', label: 'Гудок', order: 10, sound: false, onTap: honk });
  syncIcon();
  api.on('menu:tap', onMenuTap);
  api.on('car:front', drawParts);
  api.on('app:frame', (dt) => {
    updateParts(dt);
    updateBounce(dt);
    // в меню время мира стоит: снимаем свою реакцию по настоящим часам
    if (mine && now() > mineUntil) {
      if (world.reaction === mine && api.state === 'menu') world.reaction = null;
      mine = null;
    }
  });
  api.on('app:state', () => { endBounce(); syncIcon(); });
  api.on('world:start', () => { endBounce(false); parts.length = 0; syncIcon(); });
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyH' && api.state === 'play' && !api.overlay) honk(); });
}
