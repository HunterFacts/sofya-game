// Домик Мариссы и рыбки.
//
// Рыбки: 5–8 на каждом уровне, висят в пузырьках над трассой. Подъехал — рыбка в копилке (как монетки:
// после аварии появляются снова, но в одном заезде дважды не считаются).
//
// Домик (кнопка в меню с мордочкой Мариссы): уютная розовая комната. Марисса сидит в центре:
// погладить пальцем — мурлычет, жмурится, летят сердечки; тапнуть — мяукает и подпрыгивает.
// Аквариум с рыбками: тап по нему (или перетащить рыбку к Мариссе) — Марисса ест, за каждые 5 рыбок
// дарит подарок (ускорялку или монетки). Спасённые котята и щенки гуляют, спят и играют
// (до 12 на экране, остальные — в пузыре «+N»; тап по пузырю показывает следующих).
// Игрушки покупаются за монетки и появляются в комнате; тап по игрушке — с ней играют.
import { addDefaults } from '../save.js';
import { levelStart, groundY } from '../terrain.js';
import { rng, clamp } from '../rng.js';
import { TAU, circle, ellipse, rrect, fillStroke, heartPath, starPath } from '../draw-utils.js';
import { drawAnimal, drawBoosterIcon, drawCoin } from '../art.js';
import { drawSofya } from '../sofya.js';
import { Renderer } from '../render.js';
import { drawCritter, drawHead, parseCritter, critterVoice, drawHouseIcon } from './kittens.js';

// fish — рыбки в аквариуме, eaten — сколько Марисса съела всего, toys — купленные игрушки,
// run — какие рыбки уже взяты в текущем заезде {L, ids}
addDefaults({ house: { fish: 0, eaten: 0, toys: [], run: null } });

export const TOYS = [
  { id: 'yarn', price: 300 },
  { id: 'mouse', price: 500 },
  { id: 'feather', price: 800 },
  { id: 'box', price: 1200 },
  { id: 'bed', price: 2000 },
  { id: 'castle', price: 4000 },
];
const MAXK = 12;          // сколько зверят видно в комнате одновременно
const GIFT_EVERY = 5;     // подарок за каждые 5 съеденных рыбок
const CASTLE_K = 0.66;    // размер замка относительно головы Мариссы
const BOOSTS = ['turbo', 'magnet', 'shield'];

let api = null;
const S = () => {
  const s = api.save;
  if (!s.house || typeof s.house !== 'object') s.house = { fish: 0, eaten: 0, toys: [], run: null };
  const h = s.house;
  if (!(h.fish >= 0)) h.fish = 0;
  if (!(h.eaten >= 0)) h.eaten = 0;
  if (!Array.isArray(h.toys)) h.toys = [];
  return h;
};
const homeList = () => (api.save.kittens && Array.isArray(api.save.kittens.home) ? api.save.kittens.home : []);
const hasToy = (id) => S().toys.includes(id);

// ================== Рыбки ==================
const FISH_COL = [['#ff9f43', '#e0761c'], ['#ff7eb6', '#d9468b'], ['#5ec8ff', '#2a8fd6'], ['#b98cff', '#7f52d9'], ['#ffd23b', '#d99a00']];

// Рыбка длиной ~1.6 единицы, центр (x, y), s — масштаб
export function drawFish(ctx, x, y, s, col, t, flip = false) {
  const [body, dark] = FISH_COL[(col | 0) % FISH_COL.length];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const wag = Math.sin(t * 9 + x * 0.7) * 0.28;
  ctx.save();
  ctx.translate(-0.55, 0);
  ctx.rotate(wag);
  ctx.beginPath(); ctx.moveTo(0.06, 0); ctx.lineTo(-0.44, -0.36); ctx.quadraticCurveTo(-0.3, 0, -0.44, 0.36); ctx.closePath();
  fillStroke(ctx, dark, dark, 0.08);
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(-0.25, -0.33); ctx.quadraticCurveTo(0.0, -0.66, 0.22, -0.35); ctx.closePath();
  fillStroke(ctx, dark, dark, 0.06);
  ellipse(ctx, 0, 0, 0.62, 0.4);
  fillStroke(ctx, body, dark, 0.07);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ellipse(ctx, 0.04, 0.15, 0.38, 0.13); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.arc(-0.12, 0, 0.3, -0.9, 0.9); ctx.stroke();
  circle(ctx, 0.3, -0.08, 0.12); fillStroke(ctx, '#fff', null);
  circle(ctx, 0.33, -0.07, 0.065); fillStroke(ctx, '#2a2a30', null);
  circle(ctx, 0.35, -0.1, 0.025); fillStroke(ctx, '#fff', null);
  ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 0.045;
  ctx.beginPath(); ctx.arc(0.47, 0.06, 0.07, 0.3, 2.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,160,0.55)';
  ellipse(ctx, 0.24, 0.13, 0.08, 0.045); ctx.fill();
  ctx.restore();
}

function addFish(L, items) {
  if (!items || typeof L !== 'number' || L < 0 || items.fish) return;
  const r = rng(L * 7919 + 4242);
  const B0 = levelStart(L), len = levelStart(L + 1) - B0;
  const n = 5 + Math.floor(r() * 4);
  const fish = [];
  for (let i = 0; i < n; i++) {
    let x = B0 + 45 + ((i + 0.2 + r() * 0.6) / n) * (len - 100);
    const lift = r(), c = Math.floor(r() * FISH_COL.length);
    for (let k = 0; k < 8 && blocked(items, x); k++) x += 2.5;
    fish.push({ id: i, x, y: groundY(x) - 1.8 - lift * 0.6, c, taken: false, pull: false });
  }
  items.fish = fish;
}
function blocked(items, x) {
  for (const p of items.pickups || []) if (Math.abs(p.x - x) < 4) return true;
  for (const c of items.critters || []) if (Math.abs(c.x - x) < 4) return true;
  for (const c of items.coins || []) if (Math.abs(c.x - x) < 1.3) return true;
  return false;
}

// Рыбки текущего заезда: при продолжении (перезагрузка, пауза) уже взятые не появляются снова
function applyRun(world, L, x) {
  const h = S();
  const cont = x > levelStart(L) + 3.5;
  if (!cont || !h.run || h.run.L !== L || !Array.isArray(h.run.ids)) { h.run = null; return; }
  const it = world.items.get(L);
  if (it && it.fish) for (const f of it.fish) if (h.run.ids.includes(f.id)) f.taken = true;
}

function takeFish(world, L, f) {
  f.taken = true;
  const h = S();
  h.fish++;
  if (!h.run || h.run.L !== L || !Array.isArray(h.run.ids)) h.run = { L, ids: [] };
  h.run.ids.push(f.id);
  api.persist();
  world.burst(f.x, f.y, 'spark', 8, '#8fe3ff');
  world.burst(f.x, f.y, 'pop', 3, '#ffffff');
  const s = api.sound;
  s.tone(420, 0.1, 'sine', 0.14, 0, s.sfx, 950);
  s.tone(950, 0.09, 'sine', 0.08, 0.08, s.sfx, 1700);
  s.tone(1900, 0.12, 'triangle', 0.035, 0.14);
  syncPill(true);
}

function collectFish(world, dt, U) {
  if (world.mode !== 'normal' || world.crashed) return;
  const car = world.car, c = Math.cos(car.a), s = Math.sin(car.a);
  const range = world.magnet > 0 ? U.magnetRange : 0;
  for (const it of world.items.values()) {
    if (!it.fish) continue;
    for (const f of it.fish) {
      if (f.taken || Math.abs(f.x - car.x) > 12) continue;
      if (range > 0 || f.pull) {
        const dx = car.x - f.x, dy = car.y - f.y, d = Math.hypot(dx, dy);
        if ((f.pull || d < range) && d > 0.01) {
          f.pull = true;
          const v = Math.min(d, (16 + car.speed) * dt);
          f.x += (dx / d) * v;
          f.y += (dy / d) * v;
        }
      }
      for (let k = -1; k <= 1; k++) {
        const px = car.x + c * 1.3 * k + s * 0.35, py = car.y + s * 1.3 * k - c * 0.35;
        if ((px - f.x) ** 2 + (py - f.y) ** 2 < 1.15 * 1.15) { takeFish(world, it.L, f); break; }
      }
    }
  }
}

function drawRoadFish(ctx, world, view, t) {
  for (const it of world.items.values()) {
    if (!it.fish) continue;
    for (const f of it.fish) {
      if (f.taken || f.x < view.x0 || f.x > view.x1) continue;
      const y = f.y + Math.sin(t * 2.6 + f.x) * 0.12;
      // пузырёк
      circle(ctx, f.x, y, 0.56);
      ctx.fillStyle = 'rgba(200,240,255,0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.05;
      ctx.stroke();
      drawFish(ctx, f.x, y, 0.4, f.c, t, false);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ellipse(ctx, f.x - 0.22, y - 0.3, 0.12, 0.06, -0.6); ctx.fill();
      const tw = (Math.sin(t * 4 + f.x * 3) + 1) / 2;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.6})`;
      starPath(ctx, f.x + 0.42, y - 0.42, 0.13, 0.045, 4);
      ctx.fill();
    }
  }
}

// ---------- счётчик рыбок в игре (под монетками) ----------
let pill = null, pillN = -1;
function syncPill(pop = false) {
  if (!pill) return;
  const n = S().fish;
  const show = (api.state === 'play' || api.state === 'pause' || api.state === 'crash') && (n > 0 || pop);
  pill.classList.toggle('hidden', !show);
  if (n !== pillN) { pillN = n; pill.querySelector('span').textContent = n; }
  if (pop) { pill.classList.remove('house-pop'); void pill.offsetWidth; pill.classList.add('house-pop'); }
}

// ================== Домик ==================
let open = false;
let el, cv, ctx, bg, bctx, drawer, shopBtn, kitsPill, menuBtn;
let W = 0, H = 0, DPR = 1;
let Lo = null;
let T = 0;
let page = 0;
let drawerOpen = false;
const M = { hop: 0, vh: 0, sq: 0, purr: 0, strokeT: 0, chomp: 0, paw: 0, pawT: 0, happy: 0, sleepy: 0, tilt: 0, tiltTo: 0, think: 0, jumpT: 0, heartT: 0 };
const actors = [];
const ents = [];
const parts = [];
const ptrs = new Map();
const flies = [];
let gift = null;
const anim = { yarn: 0, mouse: 0, feather: 0, box: 0, bed: 0, castle: 0 };
const ANIM_LEN = { yarn: 3.2, mouse: 3.6, feather: 3.4, box: 1.2, bed: 1.2, castle: 2.6 };
let bowlWob = 0;

// ---------- раскладка комнаты (в CSS-пикселях) ----------
function layout() {
  const P = H > W;
  const floor = Math.round(H * (P ? 0.56 : 0.6));
  const fh = H - floor;
  const R = P ? Math.min(W * 0.125, H * 0.06) : Math.min(H * 0.105, W * 0.068);
  const L = { P, floor, fh, R, ku: R * 0.42, mx: W / 2, my: floor + fh * (P ? 0.3 : 0.52) };
  L.win = P ? { x: W / 2, y: H * 0.2, w: W * 0.46, h: H * 0.17 } : { x: W / 2, y: H * 0.3, w: Math.min(W * 0.24, H * 0.56), h: H * 0.38 };
  const sw = P ? W * 0.42 : Math.min(W * 0.27, H * 0.62);
  L.sofa = { x: P ? W * 0.03 : W * 0.035, y: floor + fh * (P ? 0.05 : 0.12), w: sw, h: sw * 0.5 };
  L.tree = { x: P ? W * 0.84 : W * 0.9, y: floor + fh * (P ? 0.04 : 0.1), s: R };
  L.bowl = P ? { x: W * 0.8, y: floor + fh * 0.4 } : { x: W * 0.7, y: floor + fh * 0.44 };
  L.bowl.r = R * 0.85;
  L.bowl.top = L.bowl.y - R * 0.95;            // верх табуретки
  L.bowl.cy = L.bowl.top - L.bowl.r * 0.82;    // центр аквариума
  L.toy = P ? {
    yarn: { x: W * 0.32, y: floor + fh * 0.56 },
    mouse: { x: W * 0.6, y: floor + fh * 0.72 },
    feather: { x: W * 0.1, y: floor + fh * 0.3 },
    box: { x: W * 0.26, y: floor + fh * 0.88 },
    bed: { x: W * 0.72, y: floor + fh * 0.9 },
  } : {
    yarn: { x: W * 0.37, y: floor + fh * 0.8 },
    mouse: { x: W * 0.6, y: floor + fh * 0.86 },
    feather: { x: L.sofa.x + sw + R * 0.35, y: floor + fh * 0.14 },
    box: { x: W * 0.83, y: floor + fh * 0.78 },
    bed: { x: W * 0.17, y: floor + fh * 0.8 },
  };
  L.frames = P
    ? [{ x: W * 0.2, y: H * 0.4, s: R * 1.5, kind: 'sofya' }, { x: W * 0.62, y: H * 0.38, s: R * 1.35, kind: 'car' }]
    : [{ x: W * 0.2, y: H * 0.24, s: R * 1.55, kind: 'sofya' }, { x: W * 0.72, y: H * 0.2, s: R * 1.35, kind: 'car' }];
  L.bubble = { x: (P ? W * 0.1 : W * 0.06) + 6, y: P ? floor + fh * 0.55 : H - R * 1.0, r: Math.max(30, R * 0.7) };
  return L;
}

// Места, куда котята любят забираться
function spots() {
  const L = Lo, list = [];
  const sf = L.sofa;
  const seat = sf.y - sf.h * 0.46;
  list.push({ x: sf.x + sf.w * 0.33, y: seat, kind: 'sit' }, { x: sf.x + sf.w * 0.66, y: seat, kind: 'sit' }, { x: sf.x + sf.w * 0.5, y: sf.y - sf.h * 0.98, kind: 'sit' });
  const tr = L.tree;
  if (hasToy('castle')) {
    const s = tr.s * CASTLE_K;
    list.push({ x: tr.x - 1.35 * s, y: tr.y - 2.95 * s, kind: 'sit' }, { x: tr.x + 1.35 * s, y: tr.y - 2.95 * s, kind: 'sit' }, { x: tr.x, y: tr.y - 2.85 * s, kind: 'sit' });
  } else {
    list.push({ x: tr.x - 0.45 * tr.s, y: tr.y - 2.75 * tr.s, kind: 'sit' }, { x: tr.x + 0.5 * tr.s, y: tr.y - 4.35 * tr.s, kind: 'sit' });
  }
  if (hasToy('bed')) { const b = L.toy.bed; list.push({ x: b.x - L.R * 0.42, y: b.y - L.R * 0.12, kind: 'sleep' }, { x: b.x + L.R * 0.42, y: b.y - L.R * 0.12, kind: 'sleep' }); }
  if (hasToy('box')) { const b = L.toy.box; list.push({ x: b.x, y: b.y - L.R * 0.5, kind: 'box' }); }
  for (const s of list) s.who = null;
  return list;
}
let SP = [];

// ---------- статичный фон: стены, окно, рамки, диван, коврик, когтеточка ----------
function buildBg() {
  bg.width = Math.round(W * DPR);
  bg.height = Math.round(H * DPR);
  const c = bctx;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const L = Lo, R = L.R;
  // обои
  const g = c.createLinearGradient(0, 0, 0, L.floor);
  g.addColorStop(0, '#ffc4df');
  g.addColorStop(1, '#ffdcec');
  c.fillStyle = g;
  c.fillRect(0, 0, W, L.floor);
  const sw = Math.max(24, R * 0.62);
  c.fillStyle = 'rgba(255,255,255,0.3)';
  for (let x = 0; x < W; x += sw * 2) c.fillRect(x, 0, sw, L.floor);
  c.fillStyle = 'rgba(255,90,160,0.16)';
  for (let x = sw / 2, i = 0; x < W + sw; x += sw * 2, i++) {
    for (let y = sw * (i % 2 ? 1.3 : 0.6); y < L.floor - sw * 0.5; y += sw * 1.5) { heartPath(c, x, y, sw * 0.17); c.fill(); }
  }
  // гирлянда-сердечки под потолком
  c.strokeStyle = 'rgba(160,80,120,0.35)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(0, 8);
  for (let x = 0; x <= W; x += W / 6) c.quadraticCurveTo(x + W / 12, 30, x + W / 6, 8);
  c.stroke();
  const gc = ['#ffe14d', '#7fd7ff', '#ff6fae', '#8be86a', '#c38bff'];
  for (let i = 0; i < 12; i++) {
    const x = (i + 0.5) * (W / 12), seg = (x % (W / 6)) / (W / 6);
    const y = 8 + 4 * (22 * seg * (1 - seg)) + 6;
    heartPath(c, x, y, 7);
    fillStroke(c, gc[i % gc.length], '#ffffff', 1.5);
  }
  // плинтус и пол
  const fg = c.createLinearGradient(0, L.floor, 0, H);
  fg.addColorStop(0, '#f5cda5');
  fg.addColorStop(1, '#e9ae7e');
  c.fillStyle = fg;
  c.fillRect(0, L.floor, W, H - L.floor);
  c.strokeStyle = 'rgba(150,85,45,0.2)';
  c.lineWidth = 2;
  let y = L.floor, step = L.fh * 0.08, row = 0;
  while (y < H) {
    const y0 = y;
    y += step;
    step *= 1.3;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    const off = (row % 2) * 60;
    for (let x = off + 25; x < W; x += 130) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, Math.min(y, H)); c.stroke(); }
    row++;
  }
  c.fillStyle = '#ffffff';
  c.fillRect(0, L.floor - R * 0.24, W, R * 0.24);
  c.fillStyle = '#f5a3c8';
  c.fillRect(0, L.floor - R * 0.24, W, 3);
  c.fillStyle = 'rgba(150,85,45,0.15)';
  c.fillRect(0, L.floor, W, 4);

  drawWindow(c);
  for (const f of L.frames) drawFrame(c, f);
  drawSofa(c);
  // коврик
  const rx = Math.min(W * 0.3, R * 5.2), ry = Math.max(R * 0.55, rx * 0.2);
  ellipse(c, L.mx, L.my - R * 0.05, rx, ry);
  fillStroke(c, '#fff0f6', '#ff9fcf', 4);
  ellipse(c, L.mx, L.my - R * 0.05, rx * 0.78, ry * 0.7);
  c.setLineDash([8, 7]);
  c.strokeStyle = '#ffb8d9';
  c.lineWidth = 3;
  c.stroke();
  c.setLineDash([]);
  heartPath(c, L.mx - rx * 0.62, L.my + ry * 0.05, R * 0.18);
  fillStroke(c, '#ffc2de', null);
  heartPath(c, L.mx + rx * 0.62, L.my + ry * 0.05, R * 0.18);
  fillStroke(c, '#ffc2de', null);
  if (!hasToy('castle')) drawCatTree(c, L.tree.x, L.tree.y, L.tree.s);
}

function drawWindow(c) {
  const { x, y, w, h } = Lo.win;
  const x0 = x - w / 2, y0 = y - h / 2, r = Math.min(w, h) * 0.08;
  c.save();
  rrect(c, x0, y0, w, h, r);
  const g = c.createLinearGradient(0, y0, 0, y0 + h);
  g.addColorStop(0, '#79c5ff');
  g.addColorStop(1, '#d9f1ff');
  c.fillStyle = g;
  c.fill();
  c.clip();
  c.fillStyle = 'rgba(255,240,150,0.5)';
  circle(c, x0 + w * 0.76, y0 + h * 0.27, h * 0.17); c.fill();
  c.fillStyle = '#fff09a';
  circle(c, x0 + w * 0.76, y0 + h * 0.27, h * 0.11); c.fill();
  c.fillStyle = '#ffffff';
  for (const [cx, cy, s] of [[0.28, 0.3, 1], [0.55, 0.5, 0.7]]) {
    const u = h * 0.07 * s, px = x0 + w * cx, py = y0 + h * cy;
    c.beginPath();
    c.arc(px, py, u, 0, TAU); c.arc(px + u * 1.1, py - u * 0.5, u * 1.2, 0, TAU); c.arc(px + u * 2.2, py, u * 0.9, 0, TAU);
    c.fill();
  }
  c.fillStyle = '#9ee38a';
  ellipse(c, x0 + w * 0.25, y0 + h * 1.08, w * 0.55, h * 0.3); c.fill();
  c.fillStyle = '#7fd36a';
  ellipse(c, x0 + w * 0.9, y0 + h * 1.12, w * 0.5, h * 0.32); c.fill();
  c.restore();
  rrect(c, x0, y0, w, h, r);
  c.lineWidth = Math.max(6, w * 0.045);
  c.strokeStyle = '#ffffff';
  c.stroke();
  c.lineWidth = Math.max(4, w * 0.025);
  c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + h); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke();
  rrect(c, x0 - 10, y0 + h - 3, w + 20, Math.max(9, h * 0.06), 5);
  fillStroke(c, '#ffffff', '#f2bcd6', 2);
  // шторки
  for (const d of [-1, 1]) {
    c.fillStyle = '#ff8cc6';
    c.strokeStyle = '#e05f9f';
    c.lineWidth = 2.5;
    const ex = x + d * (w / 2 + 8), ix = x + d * (w / 2 - w * 0.18);
    c.beginPath();
    c.moveTo(ex + d * 8, y0 - 14);
    c.lineTo(ix, y0 - 14);
    c.quadraticCurveTo(ix + d * w * 0.06, y0 + h * 0.35, x + d * (w / 2 - 4), y0 + h * 0.55);
    c.quadraticCurveTo(ix + d * w * 0.02, y0 + h * 0.8, ix - d * 2, y0 + h + 14);
    c.lineTo(ex + d * 10, y0 + h + 14);
    c.closePath();
    c.fill();
    c.stroke();
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.beginPath(); c.moveTo(ex + d * 2, y0 - 8); c.quadraticCurveTo(ex - d * 4, y0 + h * 0.5, ex + d * 2, y0 + h + 8); c.stroke();
    c.restore();
    heartPath(c, x + d * (w / 2 - 4), y0 + h * 0.55, 8);
    fillStroke(c, '#ffe14d', '#e0a91a', 1.5);
  }
  c.fillStyle = '#c38bff';
  rrect(c, x0 - 26, y0 - 20, w + 52, 8, 4); c.fill();
  circle(c, x0 - 26, y0 - 16, 7); c.fill();
  circle(c, x0 + w + 26, y0 - 16, 7); c.fill();
}

function drawFrame(c, f) {
  const s = f.s, x0 = f.x - s / 2, y0 = f.y - s / 2;
  c.save();
  c.translate(f.x, f.y);
  c.rotate(f.kind === 'car' ? 0.05 : -0.05);
  c.translate(-f.x, -f.y);
  c.fillStyle = 'rgba(150,60,100,0.15)';
  rrect(c, x0 + 4, y0 + 6, s, s * (f.kind === 'car' ? 0.78 : 1), 10); c.fill();
  const h = f.kind === 'car' ? s * 0.78 : s;
  rrect(c, x0, y0, s, h, 10);
  fillStroke(c, '#ffe9a8', '#e8b73a', 4);
  rrect(c, x0 + s * 0.09, y0 + s * 0.09, s * 0.82, h - s * 0.18, 6);
  c.fillStyle = f.kind === 'car' ? '#d6f0ff' : '#fff3f9';
  c.fill();
  c.save();
  c.clip();
  if (f.kind === 'sofya') {
    c.translate(f.x, f.y + s * 0.02);
    c.scale(s * 0.3, s * 0.3);
    drawSofya(c, 'happy', 0.3, api.save.look.sofya, null);
  } else {
    c.fillStyle = '#9ee38a';
    c.fillRect(x0, y0 + h * 0.7, s, h);
    c.translate(x0 + s * 0.09, y0 + s * 0.05);
    Renderer.drawPreview(c, s * 0.82, h - s * 0.12, { ...api.save.look, animal: 'marissa' }, 'happy', 0.3);
  }
  c.restore();
  heartPath(c, f.x, y0 - 2, 7);
  fillStroke(c, '#ff4f9a', '#ffffff', 1.5);
  c.restore();
}

function drawSofa(c) {
  const { x, y, w, h } = Lo.sofa;
  c.fillStyle = '#9b6a4a';
  for (const fx of [0.1, 0.86]) rrect(c, x + w * fx, y - h * 0.12, w * 0.05, h * 0.14, 3), c.fill();
  rrect(c, x + w * 0.07, y - h * 0.98, w * 0.86, h * 0.62, h * 0.16);
  fillStroke(c, '#c9a2ff', '#9a72e6', 3);
  // подушки на спинке
  const cols = ['#ff9fd0', '#8fe3c9', '#ffd56b'];
  for (let i = 0; i < 3; i++) {
    const cx = x + w * (0.27 + i * 0.23), cy = y - h * 0.7;
    rrect(c, cx - w * 0.095, cy - h * 0.16, w * 0.19, h * 0.3, h * 0.1);
    fillStroke(c, cols[i], 'rgba(120,60,120,0.25)', 2);
    if (i === 1) { heartPath(c, cx, cy, h * 0.07); fillStroke(c, '#ffffff', null); }
    else { starPath(c, cx, cy, h * 0.07); fillStroke(c, '#ffffff', null); }
  }
  rrect(c, x + w * 0.05, y - h * 0.5, w * 0.9, h * 0.4, h * 0.12);
  fillStroke(c, '#b98cff', '#9a72e6', 3);
  c.strokeStyle = 'rgba(120,70,190,0.35)';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(x + w * 0.5, y - h * 0.48); c.lineTo(x + w * 0.5, y - h * 0.32); c.stroke();
  for (const fx of [0, 0.85]) {
    rrect(c, x + w * fx, y - h * 0.7, w * 0.15, h * 0.62, h * 0.12);
    fillStroke(c, '#a77be6', '#8a5fd4', 3);
  }
}

function drawCatTree(c, x, y, s) {
  rrect(c, x - 1.3 * s, y - 0.28 * s, 2.6 * s, 0.32 * s, 0.14 * s);
  fillStroke(c, '#c9a2ff', '#9a72e6', 2.5);
  for (const [px, top] of [[-0.45, 2.7], [0.55, 4.3]]) {
    rrect(c, x + px * s - 0.17 * s, y - top * s, 0.34 * s, (top - 0.2) * s, 0.06 * s);
    fillStroke(c, '#f6dcaa', '#d6ad6d', 2);
    c.strokeStyle = 'rgba(180,130,70,0.45)';
    c.lineWidth = 1.5;
    c.beginPath();
    for (let yy = y - top * s + 6; yy < y - 0.3 * s; yy += 6) { c.moveTo(x + px * s - 0.17 * s, yy); c.lineTo(x + px * s + 0.17 * s, yy + 3); }
    c.stroke();
  }
  rrect(c, x - 1.25 * s, y - 2.85 * s, 1.6 * s, 0.3 * s, 0.12 * s);
  fillStroke(c, '#b98cff', '#9a72e6', 2.5);
  rrect(c, x - 0.3 * s, y - 4.45 * s, 1.6 * s, 0.3 * s, 0.12 * s);
  fillStroke(c, '#b98cff', '#9a72e6', 2.5);
  // помпон на верёвочке
  c.strokeStyle = '#9a72e6';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x + 1.1 * s, y - 4.15 * s); c.lineTo(x + 1.1 * s, y - 3.3 * s); c.stroke();
  circle(c, x + 1.1 * s, y - 3.2 * s, 0.18 * s);
  fillStroke(c, '#ff6fae', '#d9468b', 2);
}

// ---------- игрушки ----------
function drawYarn(c, x, y, r, rot) {
  c.save();
  c.translate(x, y - r);
  c.rotate(rot);
  circle(c, 0, 0, r);
  fillStroke(c, '#ff8cc6', '#d94f92', Math.max(2, r * 0.08));
  c.save();
  circle(c, 0, 0, r);
  c.clip();
  c.strokeStyle = '#e8659f';
  c.lineWidth = Math.max(1.5, r * 0.07);
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(i * r * 0.32, 0, r * 0.35, r * 1.1, 0.5, 0, TAU); c.stroke(); }
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.4)';
  ellipse(c, -r * 0.35, -r * 0.4, r * 0.25, r * 0.14, -0.6); c.fill();
  c.restore();
}

function drawToyMouse(c, x, y, s, dir, t, run) {
  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);
  const b = run ? Math.abs(Math.sin(t * 22)) * 0.06 : 0;
  c.translate(0, -b);
  c.strokeStyle = '#ff8fb0';
  c.lineWidth = 0.07;
  c.beginPath(); c.moveTo(-0.55, -0.15); c.bezierCurveTo(-1.0, -0.1, -0.9, -0.55, -1.25, -0.45 + Math.sin(t * 8) * 0.08); c.stroke();
  c.beginPath(); c.moveTo(-0.6, -0.02); c.quadraticCurveTo(0, -0.75, 0.6, -0.1); c.quadraticCurveTo(0.68, 0, 0.55, 0.0); c.closePath();
  fillStroke(c, '#c3c6d6', '#8d91a8', 0.05);
  circle(c, 0.12, -0.5, 0.17); fillStroke(c, '#ffb3c9', '#8d91a8', 0.04);
  circle(c, 0.42, -0.24, 0.045); fillStroke(c, '#2a2a30', null);
  circle(c, 0.64, -0.08, 0.06); fillStroke(c, '#ff6fae', null);
  // ключик
  c.strokeStyle = '#e0a91a';
  c.lineWidth = 0.06;
  c.beginPath(); c.moveTo(-0.15, -0.45); c.lineTo(-0.15, -0.68); c.stroke();
  ellipse(c, -0.15, -0.76, 0.14, 0.08, Math.sin(t * (run ? 20 : 2)) * 1.2);
  fillStroke(c, '#ffd23b', '#e0a91a', 0.03);
  c.restore();
}

function drawFeatherWand(c, x0, y0, x1, y1, t, s) {
  c.strokeStyle = '#c38bff';
  c.lineWidth = Math.max(3, s * 0.09);
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  const fx = x1 + Math.sin(t * 3) * s * 0.35, fy = y1 + s * 0.9;
  c.strokeStyle = '#8a6a9a';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + fx) / 2 + s * 0.2, (y1 + fy) / 2, fx, fy); c.stroke();
  const cols = ['#ff6fae', '#ffd23b', '#46d3b0'];
  for (let i = 0; i < 3; i++) {
    c.save();
    c.translate(fx, fy);
    c.rotate((i - 1) * 0.5 + Math.sin(t * 5 + i) * 0.12);
    ellipse(c, 0, s * 0.42, s * 0.13, s * 0.42);
    fillStroke(c, cols[i], 'rgba(120,60,120,0.3)', 1.5);
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, s * 0.8); c.stroke();
    c.restore();
  }
  circle(c, fx, fy, s * 0.08);
  fillStroke(c, '#ffe14d', null);
}

function drawPot(c, x, y, s) {
  c.beginPath();
  c.moveTo(x - s * 0.42, y - s * 0.7); c.lineTo(x + s * 0.42, y - s * 0.7); c.lineTo(x + s * 0.32, y); c.lineTo(x - s * 0.32, y); c.closePath();
  fillStroke(c, '#ffb38a', '#e0855a', 2);
  rrect(c, x - s * 0.48, y - s * 0.82, s * 0.96, s * 0.18, 4);
  fillStroke(c, '#ff9f6b', '#e0855a', 2);
}

function drawBox(c, x, y, s, front) {
  const w = s * 1.9, h = s * 1.25;
  if (!front) {
    c.beginPath(); c.moveTo(x - w / 2, y - h); c.lineTo(x - w / 2 + s * 0.2, y - h - s * 0.32); c.lineTo(x + w / 2 - s * 0.2, y - h - s * 0.32); c.lineTo(x + w / 2, y - h); c.closePath();
    fillStroke(c, '#b9844f', '#9a6a3a', 2);
    return;
  }
  const wig = anim.box > 0 ? Math.sin(T * 30) * 0.05 * anim.box : 0;
  c.save();
  c.translate(x, y);
  c.rotate(wig);
  rrect(c, -w / 2, -h, w, h, 4);
  fillStroke(c, '#dfa66b', '#a8763f', 2.5);
  c.fillStyle = '#c99158';
  c.fillRect(-w * 0.08, -h, w * 0.16, h);
  heartPath(c, w * 0.26, -h * 0.45, s * 0.2);
  fillStroke(c, '#ff8cc6', null);
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(d * w / 2, -h); c.lineTo(d * (w / 2 + s * 0.35), -h - s * 0.45); c.lineTo(d * (w / 2 - s * 0.15), -h - s * 0.5); c.lineTo(d * (w / 2 - s * 0.3), -h); c.closePath();
    fillStroke(c, '#e7b47e', '#a8763f', 2);
  }
  c.restore();
}

function drawBed(c, x, y, s, front) {
  const w = s * 2.4, h = s * 0.9;
  if (!front) {
    ellipse(c, x, y - h * 0.55, w / 2, h * 0.6);
    fillStroke(c, '#ff9fd0', '#e0679f', 2.5);
    ellipse(c, x, y - h * 0.45, w * 0.4, h * 0.38);
    fillStroke(c, '#fff3f9', '#f0b8d4', 2);
    return;
  }
  c.beginPath();
  c.ellipse(x, y - h * 0.45, w / 2, h * 0.5, 0, 0, Math.PI);
  c.lineTo(x - w / 2 * 0.82, y - h * 0.45);
  c.ellipse(x, y - h * 0.45, w / 2 * 0.82, h * 0.3, 0, Math.PI, 0, true);
  c.closePath();
  fillStroke(c, '#ff7eb6', '#e0679f', 2.5);
  for (let i = -1; i <= 1; i++) { heartPath(c, x + i * w * 0.27, y - h * 0.12 - (i ? 0 : h * 0.02), s * 0.12); fillStroke(c, '#ffffff', null); }
}

function drawCastle(c, x, y, s, t) {
  const pink = '#ffc0de', pinkD = '#e58ab6', roof = '#b98cff', roofD = '#8a5fd4';
  const fast = anim.castle > 0 ? 3 : 1;
  for (const d of [-1, 1]) {
    const tx = x + d * 1.35 * s;
    // флажок
    c.strokeStyle = '#8a6a9a';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(tx, y - 5.55 * s); c.lineTo(tx, y - 6.3 * s); c.stroke();
    const wv = Math.sin(t * 6 * fast + d) * 0.15 * s;
    c.beginPath(); c.moveTo(tx, y - 6.3 * s); c.quadraticCurveTo(tx + 0.3 * s, y - 6.2 * s + wv, tx + 0.6 * s, y - 6.1 * s + wv); c.lineTo(tx, y - 5.95 * s); c.closePath();
    fillStroke(c, d < 0 ? '#ff4f9a' : '#ffd23b', null);
    rrect(c, tx - 0.55 * s, y - 4.3 * s, 1.1 * s, 4.3 * s, 0.08 * s);
    fillStroke(c, pink, pinkD, 2.5);
    c.beginPath(); c.moveTo(tx - 0.75 * s, y - 4.2 * s); c.lineTo(tx, y - 5.6 * s); c.lineTo(tx + 0.75 * s, y - 4.2 * s); c.closePath();
    fillStroke(c, roof, roofD, 2.5);
    c.beginPath(); c.moveTo(tx - 0.2 * s, y - 3.2 * s); c.lineTo(tx - 0.2 * s, y - 3.55 * s); c.arc(tx, y - 3.55 * s, 0.2 * s, Math.PI, 0); c.lineTo(tx + 0.2 * s, y - 3.2 * s); c.closePath();
    fillStroke(c, '#8f5b86', null);
    // балкончик
    rrect(c, tx - 0.75 * s, y - 2.95 * s, 1.5 * s, 0.24 * s, 0.1 * s);
    fillStroke(c, roof, roofD, 2);
  }
  rrect(c, x - 0.9 * s, y - 2.7 * s, 1.8 * s, 2.7 * s, 0.05 * s);
  fillStroke(c, pink, pinkD, 2.5);
  for (let i = 0; i < 3; i++) { rrect(c, x - 0.9 * s + i * 0.65 * s, y - 2.98 * s, 0.5 * s, 0.32 * s, 0.05 * s); fillStroke(c, pink, pinkD, 2); }
  c.beginPath(); c.moveTo(x - 0.42 * s, y); c.lineTo(x - 0.42 * s, y - 0.85 * s); c.arc(x, y - 0.85 * s, 0.42 * s, Math.PI, 0); c.lineTo(x + 0.42 * s, y); c.closePath();
  fillStroke(c, '#a8648f', '#8f5b86', 2);
  heartPath(c, x, y - 1.9 * s, 0.3 * s);
  fillStroke(c, '#ff4f9a', '#ffffff', 2);
  if (anim.castle > 0) {
    c.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 12)})`;
    starPath(c, x - 1.6 * s, y - 4.8 * s, 0.25 * s, 0.09 * s, 4); c.fill();
    starPath(c, x + 1.7 * s, y - 3.6 * s, 0.2 * s, 0.07 * s, 4); c.fill();
  }
}

// ---------- аквариум ----------
function drawBowl() {
  const b = Lo.bowl, R = Lo.R, c = ctx;
  // табуретка
  c.fillStyle = '#9b6a4a';
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(b.x + d * R * 0.3, b.top + 4); c.lineTo(b.x + d * R * 0.5, b.y); c.lineTo(b.x + d * R * 0.38, b.y); c.lineTo(b.x + d * R * 0.2, b.top + 4); c.fill(); }
  ellipse(c, b.x, b.top, R * 0.75, R * 0.16);
  fillStroke(c, '#c38bff', '#9a72e6', 2.5);
  const wob = bowlWob > 0 ? Math.sin(T * 30) * 0.06 * bowlWob : 0;
  c.save();
  c.translate(b.x, b.top);
  c.rotate(wob);
  c.translate(-b.x, -b.top);
  const r = b.r, cy = b.cy;
  // вода
  c.save();
  circle(c, b.x, cy, r);
  c.clip();
  const wg = c.createLinearGradient(0, cy - r * 0.4, 0, cy + r);
  wg.addColorStop(0, '#9fe0ff');
  wg.addColorStop(1, '#4fb3ff');
  c.fillStyle = wg;
  c.fillRect(b.x - r, cy - r * 0.45, r * 2, r * 1.5);
  c.fillStyle = '#ffe3a3';
  ellipse(c, b.x, cy + r * 0.92, r * 0.8, r * 0.22); c.fill();
  c.fillStyle = '#6fd37a';
  for (const d of [-0.45, 0.4]) { c.beginPath(); c.moveTo(b.x + d * r, cy + r * 0.85); c.quadraticCurveTo(b.x + d * r + Math.sin(T * 2 + d) * 4, cy + r * 0.3, b.x + d * r + 3, cy + r * 0.05); c.lineTo(b.x + d * r + 6, cy + r * 0.85); c.fill(); }
  const n = Math.min(S().fish, 5);
  for (let i = 0; i < n; i++) {
    const sp = 0.7 + i * 0.23;
    const fx = b.x + Math.sin(T * sp + i * 2) * r * 0.5, fy = cy + r * (0.05 + (i % 3) * 0.22) + Math.sin(T * 1.7 + i) * 3;
    drawFish(c, fx, fy, r * 0.2, i, T + i, Math.cos(T * sp + i * 2) < 0);
  }
  c.restore();
  circle(c, b.x, cy, r);
  c.fillStyle = 'rgba(220,245,255,0.18)';
  c.fill();
  c.strokeStyle = 'rgba(160,215,255,0.95)';
  c.lineWidth = 3;
  c.stroke();
  ellipse(c, b.x, cy - r * 0.62, r * 0.66, r * 0.14);
  c.strokeStyle = 'rgba(160,215,255,0.95)';
  c.lineWidth = 2.5;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(c, b.x - r * 0.5, cy - r * 0.2, r * 0.12, r * 0.3, 0.4); c.fill();
  c.restore();
  // число рыбок
  const fish = S().fish;
  const bx = b.x + r * 0.78, by = cy - r * 0.78, br = Math.max(15, R * 0.36);
  circle(c, bx, by, br);
  fillStroke(c, fish > 0 ? '#ff4f9a' : '#d9cde6', '#ffffff', 3);
  c.fillStyle = '#ffffff';
  c.font = `900 ${Math.round(br * 1.1)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(fish), bx, by + 1);
  // до подарка: 5 рыбок-точек
  const k = S().eaten % GIFT_EVERY;
  for (let i = 0; i < GIFT_EVERY; i++) {
    const px = b.x + (i - 2) * R * 0.32, py = b.y + R * 0.3;
    if (i < k) drawFish(c, px, py, R * 0.12, 1, 0, false);
    else { ellipse(c, px, py, R * 0.08, R * 0.05); c.fillStyle = 'rgba(150,85,45,0.25)'; c.fill(); }
  }
  if (fish > 0 && Math.sin(T * 1.3) > 0.7) {
    c.fillStyle = `rgba(255,255,255,${(Math.sin(T * 1.3) - 0.7) * 3})`;
    starPath(c, b.x - r * 0.75, cy - r * 0.9, r * 0.2, r * 0.07, 4); c.fill();
  }
}

// ---------- Марисса ----------
function drawMarissa() {
  const c = ctx, R = Lo.R;
  const hop = M.hop;
  c.fillStyle = 'rgba(160,60,110,0.16)';
  const sh = 1 - Math.min(0.5, hop / (R * 4));
  ellipse(c, Lo.mx, Lo.my, R * 1.45 * sh, R * 0.3 * sh); c.fill();
  c.save();
  c.translate(Lo.mx, Lo.my - hop);
  c.scale(R * (1 + M.sq * 0.6), R * (1 - M.sq));
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const lw = Math.max(0.045, 1.6 / R), line = '#cfd0da', fur = '#fbfbfd';
  // хвост знаком вопроса
  const sw = Math.sin(T * 1.6) * 0.12 + M.purr * Math.sin(T * 7) * 0.06;
  c.beginPath();
  c.moveTo(0.8, -0.45);
  c.bezierCurveTo(1.9, -0.55, 1.8, -1.9, 1.5 + sw, -2.4);
  c.bezierCurveTo(1.38 + sw, -2.62, 1.1 + sw, -2.6, 1.08 + sw, -2.38);
  c.strokeStyle = line; c.lineWidth = 0.42 + lw * 2; c.stroke();
  c.strokeStyle = fur; c.lineWidth = 0.42; c.stroke();
  for (const d of [-1, 1]) { ellipse(c, d * 0.78, -0.42, 0.5, 0.42); fillStroke(c, fur, line, lw); }
  ellipse(c, 0, -1.15, 1.12, 1.22);
  fillStroke(c, fur, line, lw);
  c.fillStyle = '#ffffff';
  ellipse(c, 0, -1.3, 0.62, 0.82); c.fill();
  const paws = (x) => {
    ellipse(c, x, -0.13, 0.3, 0.19); fillStroke(c, fur, line, lw);
    c.strokeStyle = line; c.lineWidth = lw;
    c.beginPath(); c.moveTo(x - 0.08, -0.04); c.lineTo(x - 0.08, -0.13); c.moveTo(x + 0.08, -0.04); c.lineTo(x + 0.08, -0.13); c.stroke();
  };
  paws(-0.38);
  if (M.paw < 0.5) paws(0.38);
  const bob = M.chomp > 0 ? Math.abs(Math.sin(M.chomp * 18)) * 0.08 : 0;
  const mood = M.chomp > 0 ? (Math.sin(M.chomp * 18) > 0 ? 'happy' : 'normal') : M.purr > 0.25 || M.happy > 0 || M.sleepy > 0 ? 'happy' : 'normal';
  c.save();
  c.translate(0, -3.0 + bob);
  c.rotate(M.tilt);
  c.save();
  c.beginPath(); c.rect(-3, -4, 6, 4.9); c.clip();
  drawAnimal(c, 'marissa', mood, T, api.save.look.hat);
  c.restore();
  // ошейник с колокольчиком
  c.strokeStyle = '#ff4f9a';
  c.lineWidth = 0.16;
  c.beginPath(); c.arc(0, -0.2, 1.02, 1.12, Math.PI - 1.12); c.stroke();
  circle(c, 0, 0.9, 0.14);
  fillStroke(c, '#ffd84d', '#d9a21b', lw);
  if (M.chomp > 0) {
    c.fillStyle = '#ffffff';
    for (const d of [-1, 1]) { circle(c, d * 0.55, 0.42, 0.24 + Math.abs(Math.sin(M.chomp * 18)) * 0.05); c.fill(); }
    c.fillStyle = 'rgba(255,140,170,0.5)';
    for (const d of [-1, 1]) { ellipse(c, d * 0.6, 0.38, 0.14, 0.08); c.fill(); }
    if (M.chomp > 0.75) drawFish(c, 0.15, 0.55, 0.3, 0, T, false);
  }
  if (M.sleepy > 0) {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    ellipse(c, 0, 0.5, 0.18, 0.22 * Math.min(1, M.sleepy)); c.fill();
  }
  c.restore();
  // лапка-цап (игра с игрушками)
  if (M.paw > 0.05) {
    c.save();
    c.translate(0.58, -1.75);
    c.rotate(0.5 + Math.sin(T * 14) * 0.25 * M.paw);
    ellipse(c, 0, -0.62 * M.paw, 0.26, 0.2 + 0.5 * M.paw);
    fillStroke(c, fur, line, lw);
    c.fillStyle = '#ffb3c9';
    circle(c, 0, -1.1 * M.paw, 0.1); c.fill();
    for (const d of [-1, 0, 1]) { circle(c, d * 0.11, -1.1 * M.paw - 0.15, 0.05); c.fill(); }
    c.restore();
  }
  c.restore();
}

const mouth = () => ({ x: Lo.mx + Math.sin(M.tilt) * Lo.R * 3, y: Lo.my - M.hop - Lo.R * 2.65 });
const hitMarissa = (x, y) => ((x - Lo.mx) / (Lo.R * 1.6)) ** 2 + ((y - (Lo.my - Lo.R * 2.1)) / (Lo.R * 2.5)) ** 2 < 1;
const nearHead = (x, y) => Math.hypot(x - Lo.mx, y - (Lo.my - Lo.R * 3)) < Lo.R * 1.8;

function updMarissa(dt) {
  const G = Lo.R * 55;
  if (M.hop > 0 || M.vh > 0) {
    M.vh -= G * dt;
    M.hop += M.vh * dt;
    if (M.hop <= 0) { M.sq = Math.min(0.1, -M.vh / (Lo.R * 120)); M.hop = 0; M.vh = 0; }
  }
  M.sq = Math.max(0, M.sq - dt * 0.6);
  M.strokeT = Math.max(0, M.strokeT - dt);
  const want = M.strokeT > 0 ? 1 : 0;
  M.purr += (want - M.purr) * Math.min(1, dt * (want ? 5 : 2.5));
  purrSet(M.purr);
  M.tilt += ((M.strokeT > 0 ? M.tiltTo : 0) - M.tilt) * Math.min(1, dt * 5);
  if (M.chomp > 0) {
    const before = M.chomp;
    M.chomp = Math.max(0, M.chomp - dt);
    for (const k of [1.0, 0.72, 0.44]) if (before > k && M.chomp <= k) nom();
    if (M.chomp === 0) { api.sound.meow(1.05); M.happy = 1.2; for (let i = 0; i < 5; i++) heartP(mouth().x, mouth().y - Lo.R, 1); }
  }
  M.pawT = Math.max(0, M.pawT - dt);
  M.paw += ((M.pawT > 0 ? 1 : 0) - M.paw) * Math.min(1, dt * 10);
  M.happy = Math.max(0, M.happy - dt);
  M.sleepy = Math.max(0, M.sleepy - dt);
  M.think = Math.max(0, M.think - dt);
  if (M.purr > 0.3) {
    M.heartT -= dt;
    if (M.heartT <= 0) { M.heartT = 0.22; heartP(Lo.mx + (Math.random() - 0.5) * Lo.R * 1.6, Lo.my - Lo.R * 3.6, 1); }
  }
  if (M.jumpT > 0) {
    M.jumpT -= dt;
    if (M.hop === 0 && M.vh === 0 && M.jumpT > 0.3) { mHop(1.1); M.pawT = 0.5; }
  }
}
function mHop(k = 1) { M.vh = Math.sqrt(2 * Lo.R * 55 * Lo.R * 0.9 * k); }

// ---------- котята в комнате ----------
function randFloor() {
  const L = Lo, k = L.ku;
  for (let i = 0; i < 12; i++) {
    const x = k * 2 + Math.random() * (W - k * 4);
    const y = L.floor + k * 1.4 + Math.random() * (H - L.floor - k * 2.4);
    if (Math.abs(x - L.mx) < L.R * 1.7 && y < L.my + L.R * 0.6) continue;           // не за Мариссой
    if (Math.abs(x - L.bowl.x) < L.R && y < L.bowl.y + 4 && y > L.bowl.y - L.R) continue;
    return { x, y };
  }
  return { x: k * 3, y: H - k * 2 };
}

function mkActor(code, i, enter) {
  const cr = parseCritter(code, i);
  const p = randFloor();
  const a = { cr, x: p.x, y: p.y, st: 'sit', T: 0.5 + Math.random() * 3, tx: p.x, ty: p.y, face: Math.random() < 0.5 ? -1 : 1, h: 0, vh: 0, step: 0, spot: null, happy: 0, j: null, zT: Math.random(), wave: 0, sp: Lo.R * (1.5 + Math.random() * 0.7) };
  if (enter) {
    a.x = -Lo.ku * 2 - i * Lo.ku * 1.5;
    a.st = 'walk';
    a.face = 1;
    a.happy = 3;
    a.enter = true;
  } else if (Math.random() < 0.25) { a.st = 'sleep'; a.T = 3 + Math.random() * 6; }
  return a;
}

function buildActors(fresh = 0) {
  for (const s of SP) s.who = null;
  actors.length = 0;
  const home = homeList();
  const n = home.length;
  if (page * MAXK >= n) page = 0;
  const end = n - page * MAXK, start = Math.max(0, end - MAXK);
  for (let i = start; i < end; i++) actors.push(mkActor(home[i], i, i >= n - fresh && page === 0));
  buildEnts();
}

const ENT_MARISSA = { kind: 'marissa', y: 0 }, ENT_BOWL = { kind: 'bowl', y: 0 };
function buildEnts() {
  ents.length = 0;
  ENT_MARISSA.y = Lo.my;
  ENT_BOWL.y = Lo.bowl.y;
  ents.push(ENT_MARISSA, ENT_BOWL);
  const t = Lo.toy;
  if (hasToy('yarn')) ents.push({ kind: 'yarn', y: t.yarn.y });
  if (hasToy('mouse')) ents.push({ kind: 'mouse', y: t.mouse.y });
  if (hasToy('feather')) ents.push({ kind: 'feather', y: t.feather.y });
  if (hasToy('box')) ents.push({ kind: 'boxBack', y: t.box.y - Lo.R * 0.6 }, { kind: 'boxFront', y: t.box.y });
  if (hasToy('bed')) ents.push({ kind: 'bedBack', y: t.bed.y - Lo.R * 0.5 }, { kind: 'bedFront', y: t.bed.y });
  for (const a of actors) ents.push(a);
}

function freeSpot(kind) {
  const free = SP.filter((s) => !s.who && (!kind || s.kind === kind));
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}
function jumpTo(a, x, y, next, spot = null) {
  a.j = { x0: a.x, y0: a.y, x1: x, y1: y, p: 0, dur: 0.45 + Math.min(0.3, Math.abs(y - a.y) / 600), next };
  if (a.spot && a.spot !== spot) a.spot.who = null;
  a.spot = spot;
  if (spot) spot.who = a;
  a.st = 'jump';
  a.face = x >= a.x ? 1 : -1;
}
function goTo(a, x, y, then) { a.st = 'walk'; a.tx = x; a.ty = y; a.then = then || null; }
function toFloor(a) { const p = randFloor(); jumpTo(a, a.x + (p.x > a.x ? 1 : -1) * Lo.ku * 2, Math.max(Lo.floor + Lo.ku * 1.4, Math.min(H - Lo.ku, a.y + Lo.R * 2)), 'sit'); }

function decide(a) {
  const r = Math.random();
  if (a.spot) {
    if (a.spot.kind === 'sleep' && r < 0.4) { a.st = 'sleep'; a.T = 4 + Math.random() * 5; return; }
    if (r < 0.55) { toFloor(a); return; }
    a.st = 'perch'; a.T = 2 + Math.random() * 3;
    return;
  }
  if (r < 0.38) { const p = randFloor(); goTo(a, p.x, p.y); }
  else if (r < 0.52) { a.st = 'sleep'; a.T = 4 + Math.random() * 5; }
  else if (r < 0.8) {
    const s = freeSpot();
    if (s) {
      const bx = s.x + (Math.random() - 0.5) * Lo.ku, by = Math.max(Lo.floor + Lo.ku * 1.2, s.y + Lo.ku * 0.5);
      goTo(a, bx, by, () => {
        if (s.who) { a.st = 'sit'; a.T = 1; return; }
        jumpTo(a, s.x, s.y, s.kind === 'sleep' ? 'sleep' : 'perch', s);
      });
    } else { a.st = 'sit'; a.T = 2; }
  } else { a.st = 'sit'; a.T = 1.5 + Math.random() * 3; a.wave = Math.random() < 0.4 ? 1.5 : 0; }
}

function updActor(a, dt) {
  a.happy = Math.max(0, a.happy - dt);
  a.wave = Math.max(0, a.wave - dt);
  const G = Lo.R * 55;
  if (a.h > 0 || a.vh > 0) {
    a.vh -= G * dt;
    a.h += a.vh * dt;
    if (a.h <= 0) { a.h = 0; a.vh = 0; }
  }
  switch (a.st) {
    case 'sit': case 'perch':
      a.T -= dt;
      if (a.T <= 0) decide(a);
      break;
    case 'sleep':
      a.T -= dt;
      a.zT -= dt;
      if (a.zT <= 0) { a.zT = 1.1; part('z', a.x + a.face * Lo.ku * 0.8, a.y - Lo.ku * 1.9, 6 * a.face, -18, 2.2, Lo.ku * 0.5); }
      if (a.T <= 0) { a.st = a.spot ? 'perch' : 'sit'; a.T = 1 + Math.random() * 2; }
      break;
    case 'walk': case 'chase': {
      if (a.st === 'chase') {
        const tp = chaseTarget(a);
        if (!tp) { a.st = 'sit'; a.T = 1 + Math.random(); a.happy = 1; break; }
        a.tx = tp.x; a.ty = tp.y;
      }
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      const v = a.sp * (a.st === 'chase' ? 1.7 : 1) * dt;
      a.step += dt * (a.st === 'chase' ? 16 : 11);
      if (Math.abs(dx) > 2) a.face = dx > 0 ? 1 : -1;
      if (d <= v) {
        a.x = a.tx; a.y = a.ty;
        if (a.st === 'chase') break;
        if (a.enter) { a.enter = false; a.happy = 1.5; heartP(a.x, a.y - Lo.ku * 3.4, 2); }
        const then = a.then;
        a.then = null;
        a.st = 'sit';
        a.T = 1.5 + Math.random() * 3;
        if (then) then();
      } else { a.x += (dx / d) * v; a.y += (dy / d) * v; }
      if (a.enter && Math.random() < dt * 3) heartP(a.x, a.y - Lo.ku * 3.4, 0.6);
      break;
    }
    case 'jump': {
      const j = a.j;
      j.p += dt / j.dur;
      const p = Math.min(1, j.p);
      a.x = j.x0 + (j.x1 - j.x0) * p;
      a.y = j.y0 + (j.y1 - j.y0) * p - Math.sin(Math.PI * p) * (Math.abs(j.y1 - j.y0) * 0.35 + Lo.ku * 1.6);
      if (j.p >= 1) {
        a.x = j.x1; a.y = j.y1;
        a.st = j.next;
        a.T = j.next === 'sleep' ? 6 + Math.random() * 6 : 2 + Math.random() * 3;
        a.j = null;
      }
      break;
    }
  }
}

function drawActor(a) {
  const k = Lo.ku, c = ctx;
  const inBox = a.spot && a.spot.kind === 'box' && a.st !== 'jump';
  if (!a.spot && a.st !== 'jump') {
    c.fillStyle = 'rgba(150,70,60,0.14)';
    ellipse(c, a.x, a.y, k * (a.st === 'sleep' ? 1.3 : 0.95) * (1 - Math.min(0.5, a.h / (k * 6))), k * 0.24); c.fill();
  }
  c.save();
  c.translate(a.x, a.y - a.h + (inBox ? Math.sin(T * 3 + a.cr.ph) * k * 0.15 : 0));
  c.scale(a.face * k, k);
  let pose = 'sit', mood = a.happy > 0 ? 'happy' : 'normal', arg = 0;
  if (a.st === 'walk' || a.st === 'chase') { pose = 'walk'; arg = a.step; }
  else if (a.st === 'sleep') pose = 'sleep';
  else if (a.st === 'jump' || a.h > 0) { pose = 'yay'; mood = 'happy'; }
  else if (a.wave > 0) pose = 'wave';
  drawCritter(c, a.cr, mood, T, pose, arg, Math.max(0.06, 1.4 / k));
  c.restore();
}

function hitActor(x, y) {
  for (let i = ents.length - 1; i >= 0; i--) {
    const a = ents[i];
    if (!a.cr) continue;
    const k = Lo.ku, pad = 10;
    const top = a.y - a.h - (a.st === 'sleep' ? 2 : 3.4) * k;
    if (x > a.x - 1.2 * k - pad && x < a.x + 1.2 * k + pad && y > top - pad && y < a.y + k * 0.3 + pad) return a;
  }
  return null;
}

function tapActor(a) {
  a.happy = 2;
  if (a.st === 'sleep') { a.st = a.spot ? 'perch' : 'sit'; a.T = 2; }
  if (a.st !== 'jump' && a.h === 0) a.vh = Math.sqrt(2 * Lo.R * 55 * Lo.ku * 2.2);
  critterVoice(api.sound, a.cr);
  for (let i = 0; i < 3; i++) heartP(a.x, a.y - Lo.ku * 3.2, 1);
}

// ---------- игры с игрушками ----------
function toyPos(id) {
  const b = Lo.toy[id];
  if (id === 'yarn') {
    const p = anim.yarn > 0 ? 1 - anim.yarn / ANIM_LEN.yarn : 0;
    const off = Math.sin(p * Math.PI) * W * (Lo.P ? 0.45 : 0.28) * (b.x < W / 2 ? 1 : -1);
    return { x: b.x + off, y: b.y, rot: off / (Lo.R * 0.42) };
  }
  if (id === 'mouse') {
    const p = anim.mouse > 0 ? 1 - anim.mouse / ANIM_LEN.mouse : 0;
    const span = W * (Lo.P ? 0.4 : 0.3);
    const x = b.x + Math.sin(p * TAU) * span;
    return { x, y: b.y + Math.sin(p * TAU * 2) * Lo.fh * 0.06, dir: Math.cos(p * TAU) >= 0 ? 1 : -1 };
  }
  return b;
}
function chaseTarget(a) {
  const id = a.chase;
  if (!id || anim[id] <= 0) return null;
  const p = toyPos(id);
  return { x: p.x - a.face * Lo.ku * (1.4 + (a.cr.ph % 1)), y: p.y + (a.cr.ph % 1 - 0.5) * Lo.ku };
}
function sendChasers(id, n) {
  const free = actors.filter((a) => !a.spot && a.st !== 'jump' && a.st !== 'chase');
  const p = toyPos(id);
  free.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
  for (const a of free.slice(0, n)) { a.st = 'chase'; a.chase = id; a.happy = 3; }
}

function playToy(id) {
  const s = api.sound;
  anim[id] = ANIM_LEN[id];
  M.happy = 1.5;
  if (id === 'yarn') {
    s.noise(0.5, 0.08, 600, 300);
    M.pawT = 0.6;
    sendChasers('yarn', 3);
  } else if (id === 'mouse') {
    s.tone(2100, 0.06, 'square', 0.025); s.tone(2500, 0.07, 'square', 0.025, 0.09); s.tone(2200, 0.06, 'square', 0.02, 0.2);
    mHop(0.8);
    sendChasers('mouse', 4);
  } else if (id === 'feather') {
    s.tone(1200, 0.25, 'sine', 0.06, 0, s.sfx, 1800);
    M.jumpT = ANIM_LEN.feather - 0.4;
  } else if (id === 'box') {
    const inside = actors.find((a) => a.spot && a.spot.kind === 'box' && a.st !== 'jump');
    s.noise(0.25, 0.12, 400, 200);
    if (inside) { toFloor(inside); inside.happy = 2; critterVoice(s, inside.cr, 1.1); }
    else {
      const sp = SP.find((x) => x.kind === 'box');
      const a = actors.filter((x) => !x.spot && x.st !== 'jump').sort((p, q) => Math.abs(p.x - sp.x) - Math.abs(q.x - sp.x))[0];
      if (a && sp) goTo(a, sp.x + Lo.ku * 1.5, Math.max(Lo.floor + Lo.ku * 1.2, sp.y + Lo.ku * 0.5), () => { if (!sp.who) jumpTo(a, sp.x, sp.y, 'perch', sp); });
      else { const b = Lo.toy.box; for (let i = 0; i < 4; i++) heartP(b.x, b.y - Lo.R * 1.5, 2); }
    }
  } else if (id === 'bed') {
    s.tone(500, 0.3, 'sine', 0.06, 0, s.sfx, 300);
    let n = 0;
    for (const sp of SP) {
      if (sp.kind !== 'sleep' || sp.who) continue;
      const a = actors.find((x) => !x.spot && x.st !== 'jump' && x.st !== 'walk');
      if (!a) break;
      jumpTo(a, sp.x, sp.y, 'sleep', sp);
      n++;
    }
    if (!n) { M.sleepy = 2.5; const b = Lo.toy.bed; part('z', b.x, b.y - Lo.R, 10, -20, 2, Lo.ku * 0.6); }
  } else if (id === 'castle') {
    [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.18, 'triangle', 0.1, i * 0.09));
    for (const sp of SP) {
      if (!sp.who && sp.kind === 'sit' && sp.y < Lo.floor - Lo.R) {
        const a = actors.find((x) => !x.spot && x.st !== 'jump');
        if (!a) break;
        goTo(a, sp.x, Math.max(Lo.floor + Lo.ku * 1.2, Lo.tree.y + Lo.ku), () => { if (!sp.who) jumpTo(a, sp.x, sp.y, 'perch', sp); });
      }
    }
    const tr = Lo.tree;
    for (let i = 0; i < 8; i++) part('spark', tr.x + (Math.random() - 0.5) * Lo.R * 3, tr.y - Lo.R * (1 + Math.random() * 3.5), (Math.random() - 0.5) * 60, -40, 1, Lo.R * 0.2, '#ffe14d');
  }
}

function toyHit(id, x, y) {
  const R = Lo.R, b = Lo.toy[id];
  if (id === 'yarn') { const p = toyPos('yarn'); return Math.hypot(x - p.x, y - (p.y - R * 0.42)) < R * 0.9; }
  if (id === 'mouse') { const p = toyPos('mouse'); return Math.abs(x - p.x) < R * 0.9 && y > p.y - R * 0.9 && y < p.y + R * 0.4; }
  if (id === 'feather') return Math.abs(x - b.x) < R * 0.9 && y > b.y - R * 3.2 && y < b.y + R * 0.2;
  if (id === 'box') return Math.abs(x - b.x) < R * 1.1 && y > b.y - R * 1.7 && y < b.y + R * 0.2;
  if (id === 'bed') return Math.abs(x - b.x) < R * 1.3 && y > b.y - R * 1.1 && y < b.y + R * 0.3;
  if (id === 'castle') { const t = Lo.tree; return Math.abs(x - t.x) < R * 1.4 && y > t.y - R * 4.2 && y < t.y + R * 0.3; }
  return false;
}

function updToys(dt) {
  for (const k of Object.keys(anim)) if (anim[k] > 0) anim[k] = Math.max(0, anim[k] - dt);
  if (anim.yarn > 0 && Math.random() < dt * 2) M.pawT = 0.4;
  if (anim.feather > 0) M.tiltTo = Math.sin(T * 3) * 0.15;
}

// ---------- кормление ----------
function nom() {
  const s = api.sound;
  s.noise(0.07, 0.16, 1300, 500);
  s.tone(320, 0.06, 'square', 0.025);
  const m = mouth();
  for (let i = 0; i < 3; i++) part('spark', m.x + (Math.random() - 0.5) * Lo.R * 0.6, m.y, (Math.random() - 0.5) * 80, -60 - Math.random() * 40, 0.6, Lo.R * 0.12, '#ffd23b');
}

function feed(x, y, col) {
  const h = S();
  if (h.fish <= 0) return;
  h.fish--;
  h.eaten++;
  const g = h.eaten % GIFT_EVERY === 0 ? rollGift() : null;
  api.persist();
  api.refresh();
  flies.push({ x0: x, y0: y, x, y, p: 0, c: col, to: 'mouth', gift: g });
  api.sound.tone(500, 0.2, 'sine', 0.08, 0, api.sound.sfx, 1100);
}

function rollGift() {
  const s = api.save;
  if (Math.random() < 0.7) {
    const k = BOOSTS[Math.floor(Math.random() * BOOSTS.length)];
    s.inv[k] = (s.inv[k] || 0) + 1;
    return { kind: k, n: 1 };
  }
  s.coins += 50;
  return { kind: 'coins', n: 50 };
}

function updFlies(dt) {
  for (let i = flies.length - 1; i >= 0; i--) {
    const f = flies[i];
    f.p += dt / 0.45;
    const tgt = f.to === 'mouth' ? mouth() : { x: Lo.bowl.x, y: Lo.bowl.cy };
    const p = Math.min(1, f.p), e = p * p * (3 - 2 * p);
    f.x = f.x0 + (tgt.x - f.x0) * e;
    f.y = f.y0 + (tgt.y - f.y0) * e - Math.sin(Math.PI * p) * Lo.R * 1.2;
    if (f.p >= 1) {
      flies.splice(i, 1);
      if (f.to === 'mouth') {
        M.chomp = 1.2;
        M.strokeT = 0;
        if (f.gift) gift = { t: -1.3, ...f.gift };
      } else {
        bowlWob = 0.5;
        api.sound.tone(600, 0.12, 'sine', 0.08, 0, api.sound.sfx, 300);
      }
    }
  }
}

const giftPos = () => (Lo.P ? { x: Lo.mx - Lo.R * 1.7, y: Lo.my + Lo.R * 1.3 } : { x: Lo.mx + Lo.R * 2.3, y: Lo.my + Lo.R * 0.1 });
function drawGift() {
  const g = gift, c = ctx, R = Lo.R;
  if (!g || g.t < 0) return;
  const { x, y } = giftPos();
  const s = R * 0.9;
  const drop = Math.min(1, g.t / 0.35);
  const sh = g.t > 0.35 && g.t < 1.0 ? Math.sin(g.t * 40) * 0.12 : 0;
  const open = clamp((g.t - 1.0) / 0.25, 0, 1);
  const fade = g.t > 2.8 ? clamp(1 - (g.t - 2.8) / 0.4, 0, 1) : 1;
  c.save();
  c.globalAlpha = fade;
  c.translate(x, y - (1 - drop) * R * 3);
  c.rotate(sh);
  if (open > 0) {
    const rg = c.createRadialGradient(0, -s * 0.9, 0, 0, -s * 0.9, s * 1.6);
    rg.addColorStop(0, `rgba(255,240,150,${0.8 * open})`);
    rg.addColorStop(1, 'rgba(255,240,150,0)');
    c.fillStyle = rg;
    circle(c, 0, -s * 0.9, s * 1.6); c.fill();
  }
  rrect(c, -s / 2, -s * 0.75, s, s * 0.75, s * 0.1);
  fillStroke(c, '#ff6fae', '#d9468b', 2.5);
  c.fillStyle = '#ffe14d';
  c.fillRect(-s * 0.08, -s * 0.75, s * 0.16, s * 0.75);
  c.save();
  c.translate(0, -s * 0.75);
  c.translate(open * s * 0.8, -open * s * 0.9);
  c.rotate(open * 0.9);
  rrect(c, -s * 0.58, -s * 0.22, s * 1.16, s * 0.24, s * 0.06);
  fillStroke(c, '#ff8cc6', '#d9468b', 2.5);
  c.fillStyle = '#ffe14d';
  c.fillRect(-s * 0.08, -s * 0.22, s * 0.16, s * 0.24);
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(0, -s * 0.22); c.quadraticCurveTo(d * s * 0.35, -s * 0.6, d * s * 0.3, -s * 0.2); c.closePath();
    fillStroke(c, '#ffe14d', '#e0a91a', 2);
  }
  c.restore();
  if (open > 0) {
    const ry = -s * 0.8 - open * s * 0.9 - Math.sin(g.t * 3) * 4;
    c.save();
    c.translate(0, ry);
    const r = s * 0.5;
    if (g.kind === 'coins') {
      c.scale(r / 0.55, r / 0.55);
      drawCoin(c, 0, 0, T, true);
    } else {
      const BUB = { turbo: ['#8a5cff', '#5d33d6'], magnet: ['#ff6b6b', '#d43f4f'], shield: ['#4fc3ff', '#1f8fd6'] }[g.kind];
      const bg2 = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      bg2.addColorStop(0, '#ffffff'); bg2.addColorStop(0.3, BUB[0]); bg2.addColorStop(1, BUB[1]);
      circle(c, 0, 0, r);
      fillStroke(c, bg2, '#ffffff', 3);
      drawBoosterIcon(c, g.kind, r * 0.68);
    }
    c.restore();
    c.font = `900 ${Math.round(R * 0.55)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 5;
    c.strokeStyle = '#ffffff';
    c.fillStyle = '#ff4f9a';
    c.strokeText('+' + g.n, s * 0.85, ry);
    c.fillText('+' + g.n, s * 0.85, ry);
  }
  c.restore();
}

function updGift(dt) {
  if (!gift) return;
  const before = gift.t;
  gift.t += dt;
  const s = api.sound;
  if (before < 0 && gift.t >= 0) s.tone(700, 0.15, 'sine', 0.08, 0, s.sfx, 300);
  for (const k of [0.45, 0.65, 0.85]) if (before < k && gift.t >= k) s.chestTap(Math.round(k * 4));
  if (before < 1.0 && gift.t >= 1.0) {
    s.chestOpen();
    M.happy = 2;
    mHop(0.8);
    const gp = giftPos(), x = gp.x, y = gp.y - Lo.R;
    for (let i = 0; i < 12; i++) part('spark', x, y, (Math.random() - 0.5) * 220, -80 - Math.random() * 160, 1, Lo.R * 0.18, ['#ffe14d', '#ff6fae', '#7fd7ff'][i % 3]);
  }
  if (gift.t > 3.2) gift = null;
}

// ---------- частицы (сердечки, искры, «з-з-з») ----------
function part(type, x, y, vx, vy, life, s, col) {
  if (parts.length > 140) parts.shift();
  parts.push({ type, x, y, vx, vy, life, max: life, s, col, rot: Math.random() * 6 });
}
function heartP(x, y, k = 1) { part('heart', x + (Math.random() - 0.5) * 20, y, (Math.random() - 0.5) * 50 * k, -50 - Math.random() * 40 * k, 1.4, Lo.R * (0.16 + Math.random() * 0.1), '#ff4f9a'); }
function updParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'spark') p.vy += 260 * dt;
    else p.vx *= 1 - 1.2 * dt;
    p.rot += dt * 4;
  }
}
function drawParts() {
  const c = ctx;
  for (const p of parts) {
    c.globalAlpha = clamp(p.life / (p.max * 0.4), 0, 1);
    if (p.type === 'heart') { heartPath(c, p.x, p.y, p.s); fillStroke(c, p.col, '#ffffff', 2); }
    else if (p.type === 'spark') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); starPath(c, 0, 0, p.s, p.s * 0.4); c.fillStyle = p.col; c.fill(); c.restore(); }
    else if (p.type === 'z') {
      const s = p.s * (0.6 + 0.4 * (1 - p.life / p.max));
      c.strokeStyle = '#8d7bd6';
      c.lineWidth = Math.max(2, s * 0.18);
      c.beginPath(); c.moveTo(p.x - s / 2, p.y - s / 2); c.lineTo(p.x + s / 2, p.y - s / 2); c.lineTo(p.x - s / 2, p.y + s / 2); c.lineTo(p.x + s / 2, p.y + s / 2); c.stroke();
    }
  }
  c.globalAlpha = 1;
}

// ---------- мурлыканье ----------
let purr = null;
function purrSet(level) {
  const s = api.sound;
  if (!s.ctx || !s.sfx) return;
  if (!purr && level < 0.02) return;
  if (!purr) purr = makePurr(s);
  purr.out.gain.setTargetAtTime(level * 0.42, s.ctx.currentTime, 0.08);
}
function makePurr(s) {
  const ac = s.ctx;
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  lp.Q.value = 1.2;
  const tone = ac.createOscillator();
  tone.type = 'sawtooth';
  tone.frequency.value = 50;
  const tl = ac.createBiquadFilter();
  tl.type = 'lowpass';
  tl.frequency.value = 260;
  const tg = ac.createGain();
  tg.gain.value = 0.35;
  // «р-р-р»: громкость пульсирует 25 раз в секунду
  const am = ac.createGain();
  am.gain.value = 0.5;
  const lfo = ac.createOscillator();
  lfo.frequency.value = 25;
  const lg = ac.createGain();
  lg.gain.value = 0.5;
  lfo.connect(lg); lg.connect(am.gain);
  // вдох-выдох
  const bm = ac.createGain();
  bm.gain.value = 0.7;
  const br = ac.createOscillator();
  br.frequency.value = 0.8;
  const bg2 = ac.createGain();
  bg2.gain.value = 0.3;
  br.connect(bg2); bg2.connect(bm.gain);
  src.connect(lp); lp.connect(am);
  tone.connect(tl); tl.connect(tg); tg.connect(am);
  am.connect(bm);
  const out = ac.createGain();
  out.gain.value = 0;
  bm.connect(out);
  out.connect(s.sfx);
  src.start(); tone.start(); lfo.start(); br.start();
  return { out, nodes: [src, tone, lfo, br] };
}
function purrStop() {
  if (!purr) return;
  const p = purr, ac = api.sound.ctx;
  purr = null;
  try { p.out.gain.setTargetAtTime(0, ac.currentTime, 0.05); } catch (_) { /* */ }
  setTimeout(() => { for (const n of p.nodes) { try { n.stop(); } catch (_) { /* */ } } try { p.out.disconnect(); } catch (_) { /* */ } }, 400);
}

// ---------- касания ----------
function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
const hitBowl = (x, y) => Math.hypot(x - Lo.bowl.x, y - Lo.bowl.cy) < Lo.bowl.r * 1.35 || (Math.abs(x - Lo.bowl.x) < Lo.R * 0.8 && y > Lo.bowl.cy && y < Lo.bowl.y);
const hitBubble = (x, y) => homeList().length > MAXK && Math.hypot(x - Lo.bubble.x, y - Lo.bubble.y) < Lo.bubble.r + 12;

function onDown(e) {
  e.preventDefault();
  api.sound.unlock();
  if (drawerOpen) { toggleDrawer(false); return; }
  if (!Lo) return;
  const { x, y } = pos(e);
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* */ }
  const p = { x, y, moved: 0, kind: 'none', fish: null };
  ptrs.set(e.pointerId, p);
  if (hitBowl(x, y)) {
    if (S().fish > 0) {
      p.kind = 'fish';
      p.fish = { x, y, c: Math.floor(Math.random() * FISH_COL.length) };
      api.sound.tone(380, 0.1, 'sine', 0.1, 0, api.sound.sfx, 800);
    } else {
      bowlWob = 1;
      M.think = 2.5;
      api.sound.tone(500, 0.12, 'sine', 0.08, 0, api.sound.sfx, 350);
      setTimeout(() => api.sound.meow(1.1), 250);
    }
    return;
  }
  const a = hitActor(x, y);
  if (a) { tapActor(a); return; }
  for (const id of ['yarn', 'mouse', 'feather', 'box', 'bed', 'castle']) if (hasToy(id) && toyHit(id, x, y)) { playToy(id); return; }
  if (hitBubble(x, y)) { page++; buildActors(); api.sound.pop(); return; }
  if (hitMarissa(x, y)) p.kind = 'pet';
}
function onMove(e) {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  const { x, y } = pos(e);
  const d = Math.hypot(x - p.x, y - p.y);
  p.moved += d;
  p.x = x; p.y = y;
  if (p.fish) { p.fish.x = x; p.fish.y = y; return; }
  if (p.kind === 'none' && p.moved > 10 && hitMarissa(x, y)) p.kind = 'pet';
  if (p.kind === 'pet' && p.moved > 10 && hitMarissa(x, y) && d > 0.5) {
    M.strokeT = 0.35;
    M.tiltTo = clamp((x - Lo.mx) / (Lo.R * 6), -0.18, 0.18);
  }
}
function onUp(e) {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  ptrs.delete(e.pointerId);
  if (e.type === 'pointercancel') { if (p.fish) flies.push({ x0: p.fish.x, y0: p.fish.y, x: p.fish.x, y: p.fish.y, p: 0, c: p.fish.c, to: 'bowl' }); return; }
  if (p.kind === 'pet' && p.moved < 10) {
    M.happy = 1.2;
    mHop(0.6);
    api.sound.meow(1);
    for (let i = 0; i < 4; i++) heartP(Lo.mx, Lo.my - Lo.R * 4, 1.5);
  }
  if (p.fish) {
    if (p.moved < 16 || nearHead(p.x, p.y)) feed(p.fish.x, p.fish.y, p.fish.c);
    else flies.push({ x0: p.fish.x, y0: p.fish.y, x: p.fish.x, y: p.fish.y, p: 0, c: p.fish.c, to: 'bowl' });
  }
}

// ---------- кадр ----------
function checkSize() {
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (w === W && h === H && dpr === DPR) return true;
  W = w; H = h; DPR = dpr;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  Lo = layout();
  SP = spots();
  buildBg();
  buildActors();
  return true;
}

function frame(dt) {
  if (!checkSize()) return;
  T += dt;
  updMarissa(dt);
  for (const a of actors) updActor(a, dt);
  updToys(dt);
  updFlies(dt);
  updGift(dt);
  updParts(dt);
  bowlWob = Math.max(0, bowlWob - dt * 1.5);
  draw();
}

function draw() {
  const c = ctx, L = Lo;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.drawImage(bg, 0, 0, W, H);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (hasToy('castle')) drawCastle(c, L.tree.x, L.tree.y, L.tree.s * CASTLE_K, T);
  // по глубине: кто ближе к нам — рисуется позже
  for (let i = 1; i < ents.length; i++) {
    const e = ents[i];
    let j = i - 1;
    while (j >= 0 && ents[j].y > e.y) { ents[j + 1] = ents[j]; j--; }
    ents[j + 1] = e;
  }
  for (const e of ents) {
    if (e.cr) { drawActor(e); continue; }
    switch (e.kind) {
      case 'marissa': drawMarissa(); break;
      case 'bowl': drawBowl(); break;
      case 'yarn': {
        const p = toyPos('yarn'), b = L.toy.yarn;
        if (anim.yarn > 0) {
          c.strokeStyle = '#ff8cc6'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(b.x, b.y - 2); c.quadraticCurveTo((b.x + p.x) / 2, b.y + 8, p.x, p.y - 2); c.stroke();
        }
        drawYarn(c, p.x, p.y, L.R * 0.42, p.rot || 0);
        break;
      }
      case 'mouse': { const p = toyPos('mouse'); drawToyMouse(c, p.x, p.y, L.R * 0.8, p.dir || -1, T, anim.mouse > 0); break; }
      case 'feather': {
        const b = L.toy.feather;
        drawPot(c, b.x, b.y, L.R * 0.8);
        if (!(anim.feather > 0)) drawFeatherWand(c, b.x, b.y - L.R * 0.6, b.x + L.R * 0.5, b.y - L.R * 2.7, T, L.R * 0.75);
        break;
      }
      case 'boxBack': drawBox(c, L.toy.box.x, L.toy.box.y, L.R * 0.95, false); break;
      case 'boxFront': drawBox(c, L.toy.box.x, L.toy.box.y, L.R * 0.95, true); break;
      case 'bedBack': drawBed(c, L.toy.bed.x, L.toy.bed.y, L.R, false); break;
      case 'bedFront': drawBed(c, L.toy.bed.x, L.toy.bed.y, L.R, true); break;
    }
  }
  // палочка с пёрышками летает над Мариссой
  if (anim.feather > 0) {
    const tx = L.mx + Math.sin(T * 2.6) * L.R * 1.3, ty = L.my - L.R * (4.7 + 0.25 * Math.sin(T * 5));
    drawFeatherWand(c, tx + L.R * 1.6, ty - L.R * 1.4, tx, ty, T, L.R * 0.75);
  }
  for (const p of ptrs.values()) if (p.fish) drawFish(c, p.fish.x, p.fish.y, L.R * 0.42, p.fish.c, T, p.fish.x > L.mx);
  for (const f of flies) drawFish(c, f.x, f.y, L.R * 0.42, f.c, T, f.x > L.mx);
  drawGift();
  // мечтает о рыбке (аквариум пуст)
  if (M.think > 0) {
    const a = Math.min(1, M.think * 2);
    c.globalAlpha = a;
    const bx = L.mx - L.R * 1.9, by = L.my - L.R * 4.9;
    c.fillStyle = '#ffffff';
    circle(c, L.mx - L.R * 1.0, L.my - L.R * 3.9, L.R * 0.12); c.fill();
    circle(c, L.mx - L.R * 1.35, L.my - L.R * 4.3, L.R * 0.18); c.fill();
    ellipse(c, bx, by, L.R * 0.95, L.R * 0.62);
    fillStroke(c, '#ffffff', '#f3b5d3', 2);
    drawFish(c, bx, by, L.R * 0.4, 1, T, false);
    c.globalAlpha = 1;
  }
  // остальные зверята — в пузыре «+N»
  const n = homeList().length;
  if (n > MAXK) {
    const b = L.bubble, bob = Math.sin(T * 2) * 3;
    circle(c, b.x, b.y + bob, b.r);
    fillStroke(c, '#ffffff', '#ff9fcf', 3);
    const cr = actors.length ? actors[0].cr : parseCritter('white.0.0');
    c.save();
    c.translate(b.x, b.y + bob - b.r * 0.15);
    c.scale(b.r * 0.42, b.r * 0.42);
    drawHead(c, cr, 'happy', T, 0.08);
    c.restore();
    const rest = n - actors.length;
    c.font = `900 ${Math.round(b.r * 0.62)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 5;
    c.strokeStyle = '#ffffff';
    c.fillStyle = '#ff4f9a';
    c.strokeText('+' + rest, b.x, b.y + bob + b.r * 0.62);
    c.fillText('+' + rest, b.x, b.y + bob + b.r * 0.62);
  }
  drawParts();
}

// ---------- магазин игрушек ----------
function toyPreview(c, w, h, id) {
  c.save();
  c.clearRect(0, 0, w, h);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const s = h * 0.3, x = w / 2, y = h * 0.86;
  const T0 = 0.6;
  if (id === 'yarn') drawYarn(c, x, y, s * 1.1, 0.4);
  else if (id === 'mouse') drawToyMouse(c, x + s * 0.2, y, s * 1.4, -1, T0, false);
  else if (id === 'feather') { drawPot(c, x - s * 0.6, y, s * 1.2); drawFeatherWand(c, x - s * 0.6, y - s, x + s * 0.4, y - s * 2.4, T0, s * 0.9); }
  else if (id === 'box') { drawBox(c, x, y, s * 1.2, false); drawBox(c, x, y, s * 1.2, true); }
  else if (id === 'bed') { drawBed(c, x, y, s * 1.15, false); drawBed(c, x, y, s * 1.15, true); }
  else if (id === 'castle') drawCastle(c, x, y, s * 0.42, T0);
  c.restore();
}

function buildDrawer() {
  drawer.innerHTML = '';
  const s = api.save;
  for (const toy of TOYS) {
    const owned = hasToy(toy.id);
    const card = document.createElement('button');
    card.className = `card ${owned ? 'owned' : s.coins >= toy.price ? 'can' : 'cant'}`;
    const c = document.createElement('canvas');
    c.width = 260; c.height = 195;
    card.appendChild(c);
    toyPreview(c.getContext('2d'), 260, 195, toy.id);
    card.insertAdjacentHTML('beforeend', owned ? '<div class="check">✓</div>' : `<div class="pill price"><i class="coin small"></i>${toy.price}</div>`);
    card.addEventListener('click', () => onToyCard(toy, card));
    drawer.appendChild(card);
  }
}

function onToyCard(toy, card) {
  const s = api.save;
  if (hasToy(toy.id)) { api.sound.click(); toggleDrawer(false); setTimeout(() => playToy(toy.id), 250); return; }
  if (s.coins < toy.price) {
    api.sound.deny();
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    return;
  }
  s.coins -= toy.price;
  S().toys.push(toy.id);
  api.sound.buy();
  api.persist();
  api.refresh();
  SP = spots();
  if (toy.id === 'castle') buildBg();
  buildActors();
  buildDrawer();
  syncTop();
  setTimeout(() => {
    toggleDrawer(false);
    const p = toy.id === 'castle' ? { x: Lo.tree.x, y: Lo.tree.y - Lo.R * 2 } : { x: Lo.toy[toy.id].x, y: Lo.toy[toy.id].y - Lo.R * 0.6 };
    for (let i = 0; i < 14; i++) part('spark', p.x, p.y, (Math.random() - 0.5) * 240, -60 - Math.random() * 180, 1, Lo.R * 0.2, ['#ffe14d', '#ff6fae', '#7fd7ff'][i % 3]);
    for (let i = 0; i < 4; i++) heartP(p.x, p.y, 1.5);
    M.happy = 2;
    mHop(0.8);
    setTimeout(() => api.sound.meow(1.05), 200);
    setTimeout(() => open && playToy(toy.id), 700);
  }, 350);
}

function toggleDrawer(on) {
  drawerOpen = on;
  if (on) buildDrawer();
  drawer.classList.toggle('off', !on);
  shopBtn.classList.toggle('on', on);
}

function canBuySomething() { return TOYS.some((t) => !hasToy(t.id) && api.save.coins >= t.price); }

function syncTop() {
  if (!el) return;
  shopBtn.querySelector('.dot-new').classList.toggle('hidden', !canBuySomething());
  const home = homeList();
  kitsPill.classList.toggle('hidden', !home.length);
  if (home.length) {
    kitsPill.querySelector('span').textContent = home.length;
    const c = kitsPill.querySelector('canvas'), x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, c.width, c.height);
    x.translate(c.width / 2, c.height * 0.56);
    x.scale(c.width * 0.36, c.width * 0.36);
    drawHead(x, parseCritter(home[home.length - 1], home.length - 1), 'happy', 0.4, 0.08);
  }
}

// ---------- кнопка в меню ----------
function drawMenuIcon() {
  if (!menuBtn) return;
  const c = menuBtn.querySelector('canvas'), x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, c.width, c.height);
  drawHouseIcon(x, c.width, c.height, 0.4, 'happy', api.save.look.hat);
}
function syncBadge() {
  if (!menuBtn) return;
  const k = api.save.kittens;
  const n = k && k.fresh > 0 ? k.fresh : 0;
  menuBtn.querySelector('.badge').textContent = n ? String(n) : '';
  menuBtn.classList.toggle('house-new', n > 0);
}

function openHouse() {
  open = true;
  T = 0;
  page = 0;
  W = H = 0; // пересчитать раскладку (могли повернуть телефон, сменить шапочку)
  Object.assign(M, { hop: 0, vh: 0, sq: 0, purr: 0, strokeT: 0, chomp: 0, paw: 0, pawT: 0, happy: 1.5, sleepy: 0, tilt: 0, tiltTo: 0, think: 0, jumpT: 0, heartT: 0 });
  for (const k of Object.keys(anim)) anim[k] = 0;
  parts.length = 0;
  flies.length = 0;
  gift = null;
  ptrs.clear();
  toggleDrawer(false);
  const k = api.save.kittens;
  const fresh = k && k.fresh > 0 ? Math.min(k.fresh, MAXK) : 0;
  if (checkSize()) buildActors(fresh);
  else requestAnimationFrame(() => { if (open && checkSize()) buildActors(fresh); });
  if (k) k.fresh = 0;
  api.persist();
  syncBadge();
  syncTop();
  setTimeout(() => open && api.sound.meow(1), 250);
  if (fresh) actors.filter((a) => a.enter).forEach((a, i) => setTimeout(() => open && critterVoice(api.sound, a.cr), 700 + i * 300));
}

function closeHouse() {
  open = false;
  purrStop();
  ptrs.clear();
  flies.length = 0; // рыбки и подарки уже записаны в сохранение в момент кормления
  gift = null;
  toggleDrawer(false);
  api.persist();
  api.refresh();
}

// ---------- подключение ----------
export function init(a) {
  api = a;
  for (const [L, items] of api.world.items) addFish(L, items);
  applyRun(api.world, api.world.L, api.world.car.x);
  api.on('world:items', (L, items) => addFish(L, items));
  api.on('world:start', (world, L, x) => applyRun(world, L, x));
  api.on('world:update', collectFish);
  api.on('render:world-items', drawRoadFish);

  const css = document.createElement('style');
  css.textContent = `
    #btnHouse canvas { width: 92%; height: 92%; }
    #btnHouse.house-new canvas { animation: bounce 1.2s infinite; }
    .house-fishpill { position: absolute; top: calc(var(--sat) + 66px); left: calc(var(--sal) + 10px); font-size: 20px; padding: 3px 14px 3px 6px; gap: 4px; }
    .house-fishpill canvas { width: 36px; height: 27px; }
    .house-pop { animation: pop 0.35s cubic-bezier(.2, 1.6, .5, 1); }
    .house-screen { padding: 0; background: #ffd6ea; overflow: hidden; }
    .house-cv { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
    .house-top { position: absolute; z-index: 2; top: calc(var(--sat) + 10px); left: calc(var(--sal) + 12px); right: calc(var(--sar) + 12px);
      display: flex; justify-content: space-between; align-items: center; gap: 10px; pointer-events: none; }
    .house-top > div { display: flex; align-items: center; gap: 10px; }
    .house-top button, .house-top .pill { pointer-events: auto; }
    .house-top .round { width: 60px; height: 60px; font-size: 28px; }
    .house-shop canvas { width: 50px; height: 50px; }
    .house-shop.on { background: var(--pink); }
    .house-shop .dot-new { top: -4px; right: -4px; }
    .house-kits { pointer-events: none !important; padding: 3px 14px 3px 4px; }
    .house-kits canvas { width: 36px; height: 36px; }
    .house-drawer { position: absolute; z-index: 3; left: 0; right: 0; bottom: 0;
      padding: 14px calc(var(--sar) + 12px) calc(var(--sab) + 14px) calc(var(--sal) + 12px);
      background: rgba(255, 240, 248, 0.97); border-radius: 28px 28px 0 0; box-shadow: 0 -5px 0 rgba(160, 60, 120, 0.18);
      display: grid; grid-template-columns: repeat(6, minmax(0, 124px)); justify-content: center; gap: 12px;
      transition: transform 0.25s ease; }
    .house-drawer.off { transform: translateY(115%); }
    .house-drawer .card { padding: 6px 6px 8px; touch-action: manipulation; }
    @media (orientation: portrait) { .house-drawer { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-height: 420px) { .house-drawer .card canvas { aspect-ratio: 4 / 2.7; } .house-drawer { padding-top: 10px; } }
  `;
  document.head.appendChild(css);

  // счётчик рыбок в игре
  pill = document.createElement('div');
  pill.className = 'pill house-fishpill hidden';
  pill.innerHTML = '<canvas width="72" height="54"></canvas><span>0</span>';
  const pc = pill.querySelector('canvas').getContext('2d');
  drawFish(pc, 36, 28, 26, 0, 0.3, false);
  api.$('hud').appendChild(pill);
  api.on('app:state', () => { syncPill(); syncBadge(); if (api.state === 'menu') drawMenuIcon(); });

  // экран домика
  el = document.createElement('div');
  el.className = 'screen house-screen hidden';
  el.innerHTML = `
    <canvas class="house-cv"></canvas>
    <div class="house-top">
      <div>
        <button class="round house-back" aria-label="Назад">⬅</button>
        <div class="pill house-kits hidden"><canvas width="72" height="72"></canvas><span>0</span></div>
      </div>
      <div>
        <button class="round house-shop" aria-label="Игрушки"><canvas width="100" height="100"></canvas><i class="dot-new hidden"></i></button>
        <div class="pill coins-pill"><i class="coin"></i><span class="coinsText">0</span></div>
      </div>
    </div>
    <div class="house-drawer off"></div>`;
  cv = el.querySelector('.house-cv');
  ctx = cv.getContext('2d');
  bg = document.createElement('canvas');
  bctx = bg.getContext('2d');
  drawer = el.querySelector('.house-drawer');
  shopBtn = el.querySelector('.house-shop');
  kitsPill = el.querySelector('.house-kits');
  const sc = shopBtn.querySelector('canvas').getContext('2d');
  drawYarn(sc, 46, 82, 30, 0.3);
  sc.save(); sc.translate(76, 74); sc.scale(36, 36); drawCoin(sc, 0, 0, 0, false); sc.restore();
  const tap = (node, fn) => node.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); api.sound.unlock(); fn(e); });
  tap(el.querySelector('.house-back'), () => api.closeScreen());
  tap(shopBtn, () => { api.sound.click(); toggleDrawer(!drawerOpen); });
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, onUp);
  api.registerScreen('house', { el, open: openHouse, close: closeHouse });
  api.on('app:frame', (dt) => { if (open) frame(Math.min(dt, 0.05)); });

  menuBtn = api.addMenuButton({ id: 'btnHouse', html: '<canvas width="120" height="120"></canvas>', label: 'Домик Мариссы', order: 3, badge: true, onTap: () => api.openScreen('house') });
  drawMenuIcon();
  syncBadge();
  api.on('kittens:home', syncBadge);
}

// для проверки в браузере
export const debug = { M, actors, anim, get Lo() { return Lo; }, playToy, feed: () => feed(Lo.bowl.x, Lo.bowl.cy, 0), get open() { return open; } };
