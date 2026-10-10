// Бесконечная трасса: высоты, уровни, миры, монетки и украшения.
import { BIOMES } from './config.js';
import { noise, hash2, rng, clamp, smooth, lerp } from './rng.js';

export const STEP = 0.5; // шаг ломаной поверхности (м)

// ---------- Уровни ----------
export const levelLength = (L) => Math.min(1400 + 70 * L, 2500);
const starts = [0];
export function levelStart(L) {
  while (starts.length <= L) {
    const n = starts.length;
    starts.push(starts[n - 1] + levelLength(n - 1));
  }
  return starts[L];
}
export function levelAt(x) {
  if (x < 0) return 0;
  while (starts[starts.length - 1] <= x) levelStart(starts.length);
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= x) lo = mid; else hi = mid - 1;
  }
  return lo;
}
export const biomeOf = (L) => BIOMES[L % BIOMES.length];
export const difficulty = (L) => 1 - Math.exp(-L / 10);

// ---------- Высота ----------
// Горки: чередование вершин и впадин случайной ширины, крутизна ограничена по уровню.
export const TP = { hill: 2.6, hillD: 3.6, wMin: 11, wMax: 28, slope0: 27, slopeD: 17, long: 5, longD: 5, bump: 0.12, bumpD: 0.22 };
const profiles = new Map();
function profile(L) {
  let p = profiles.get(L);
  if (p) return p;
  const r = rng(L * 7777 + 5), b = biomeOf(L), d = difficulty(L);
  const B0 = levelStart(L), B1 = levelStart(L + 1);
  const A = (TP.hill + TP.hillD * d) * b.amp;
  const maxTan = Math.tan(((TP.slope0 + TP.slopeD * d) * Math.PI) / 180);
  const xs = [B0 - 80], hs = [0];
  let x = B0 - 80, k = 0, prev = 0;
  while (x < B1 + 80) {
    const w = (TP.wMin + r() * (TP.wMax - TP.wMin)) * b.wl;
    k++;
    let h = (k % 2 ? 1 : -1) * A * (0.3 + 0.7 * r());
    if (r() < 0.12) h = prev + (r() - 0.5) * 0.6; // передышка: почти ровно
    // косинусный переход: макс. уклон = π·Δh / (2w)
    const lim = (maxTan * 2 * w) / Math.PI;
    h = clamp(h, prev - lim, prev + lim);
    x += w;
    xs.push(x); hs.push(h);
    prev = h;
  }
  p = { xs, hs };
  profiles.set(L, p);
  if (profiles.size > 6) profiles.delete(profiles.keys().next().value);
  return p;
}
function hills(x, L) {
  const { xs, hs } = profile(L);
  let lo = 0, hi = xs.length - 2;
  if (x <= xs[0]) return hs[0];
  if (x >= xs[hi + 1]) return hs[hi + 1];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xs[mid] <= x) lo = mid; else hi = mid - 1;
  }
  const t = (x - xs[lo]) / (xs[lo + 1] - xs[lo]);
  return lerp(hs[lo], hs[lo + 1], (1 - Math.cos(Math.PI * t)) / 2);
}
function rawH(x, L) {
  const b = biomeOf(L), d = difficulty(L), s = L * 1013 + 77;
  const AL = (TP.long + TP.longD * d) * b.amp;
  const AB = (TP.bump + TP.bumpD * d) * b.bump;
  return hills(x, L) + AL * noise(x / 220, s) + AB * noise(x / 6, s + 2);
}

// Ровная площадка вокруг финиша: [-15, +25] м ровно, плавный переход 20 м
function plateauW(dx) {
  if (dx < -35 || dx > 45) return 0;
  if (dx < -15) return smooth(1 - (-15 - dx) / 20);
  if (dx > 25) return smooth(1 - (dx - 25) / 20);
  return 1;
}

const plateauCache = new Map();
function plateauH(L) {
  let v = plateauCache.get(L);
  if (v === undefined) { v = rawH(levelStart(L), L); plateauCache.set(L, v); }
  return v;
}

function smoothHeight(x) {
  const L = levelAt(x);
  let h = rawH(x, L);
  const B0 = levelStart(L), B1 = levelStart(L + 1);
  const w0 = plateauW(x - B0), w1 = plateauW(x - B1);
  if (w0 > 0) h = lerp(h, plateauH(L), w0);
  if (w1 > 0) h = lerp(h, plateauH(L + 1), w1);
  // стена в самом начале, чтобы не уехать назад в пустоту
  if (x < -12) h += (-12 - x) * (-12 - x) * 0.5;
  return h;
}

// Кэш точек ломаной
const CACHE = 8192;
const cIdx = new Int32Array(CACHE).fill(-0x7fffffff);
const cVal = new Float64Array(CACHE);
function sampleY(i) {
  const k = i & (CACHE - 1);
  if (cIdx[k] !== i) { cIdx[k] = i; cVal[k] = -smoothHeight(i * STEP); }
  return cVal[k];
}

// Y поверхности (ось вниз)
export function groundY(x) {
  const f = x / STEP, i = Math.floor(f), t = f - i;
  const a = sampleY(i);
  return a + (sampleY(i + 1) - a) * t;
}

// Нормаль поверхности (смотрит из земли наружу)
export function normalAt(x) {
  const i = Math.floor(x / STEP);
  const ey = sampleY(i + 1) - sampleY(i);
  const len = Math.hypot(STEP, ey);
  return { x: ey / len, y: -STEP / len };
}

// Угол склона (в системе машины: отрицательный = подъём вправо)
export function slopeAt(x, span = 1.2) {
  return Math.atan2(groundY(x + span) - groundY(x - span), span * 2);
}

// Касание колеса (круга) с ломаной: нормаль и глубина
const hit = { nx: 0, ny: -1, pen: 0 };
export function circleContact(cx, cy, r, margin = 0.02) {
  const gy = groundY(cx);
  if (cy > gy) { // центр провалился под землю
    const n = normalAt(cx);
    hit.nx = n.x; hit.ny = n.y; hit.pen = r + (cy - gy) * -n.y;
    return hit;
  }
  const rr = r + margin;
  let best = rr * rr, bx = 0, by = 0, found = false;
  const i0 = Math.floor((cx - rr) / STEP), i1 = Math.floor((cx + rr) / STEP);
  for (let i = i0; i <= i1; i++) {
    const x0 = i * STEP, y0 = sampleY(i), ey = sampleY(i + 1) - y0;
    let t = ((cx - x0) * STEP + (cy - y0) * ey) / (STEP * STEP + ey * ey);
    t = clamp(t, 0, 1);
    const dx = cx - (x0 + STEP * t), dy = cy - (y0 + ey * t), d2 = dx * dx + dy * dy;
    if (d2 < best) { best = d2; bx = dx; by = dy; found = true; }
  }
  if (!found) return null;
  const d = Math.sqrt(best);
  if (d < 1e-6) { const n = normalAt(cx); hit.nx = n.x; hit.ny = n.y; }
  else { hit.nx = bx / d; hit.ny = by / d; }
  hit.pen = r - d;
  return hit;
}

// ---------- Монетки и бонусы уровня ----------
export function levelItems(L) {
  const r = rng(L * 9973 + 17);
  const B0 = levelStart(L), B1 = levelStart(L + 1), len = B1 - B0;
  const coins = [], pickups = [];
  const kinds = ['turbo', 'magnet', 'shield'];
  const slots = [0.2, 0.42, 0.62, 0.82].map((f) => B0 + f * len);
  const chestSlot = 1 + Math.floor(r() * 3);
  let slot = 0;
  let x = B0 + 32;
  while (x < B1 - 35) {
    if (slot < slots.length && x >= slots[slot]) {
      const kind = slot === chestSlot ? 'chest' : kinds[Math.floor(r() * kinds.length)];
      pickups.push({ x: x + 4, y: groundY(x + 4) - 1.3, kind, taken: false });
      slot++;
      x += 16;
      continue;
    }
    if (r() < 0.12) {
      coins.push({ x, y: groundY(x) - 1.7, v: 10, big: true, taken: false });
      x += 10 + r() * 8;
      continue;
    }
    const n = 5 + Math.floor(r() * 5);
    const arc = r() < 0.3;
    for (let k = 0; k < n; k++) {
      const cx = x + k * 1.25;
      const lift = arc ? Math.sin((Math.PI * k) / (n - 1)) * 1.6 : 0;
      coins.push({ x: cx, y: groundY(cx) - 1.1 - lift, v: 1, taken: false });
    }
    x += n * 1.25 + 14 + r() * 18;
  }
  coins.forEach((c, i) => (c.id = i));
  return { L, coins, pickups, total: coins.length };
}

// ---------- Украшения ----------
export const DECO_CELL = 3.5;
export function decoAt(cell) {
  const x0 = cell * DECO_CELL;
  const L = levelAt(x0);
  const b = biomeOf(L);
  const h = hash2(cell, 4242);
  if (h > 0.55) return null;
  const x = x0 + hash2(cell, 99) * 2.5;
  // не ставим рядом с финишными арками
  const B0 = levelStart(L), B1 = levelStart(L + 1);
  if (Math.abs(x - B0) < 9 || Math.abs(x - B1) < 9 || x < 8) return null;
  const type = b.deco[Math.floor(hash2(cell, 7) * b.deco.length)];
  return { x, type, s: 0.75 + hash2(cell, 13) * 0.5, flip: hash2(cell, 21) < 0.5, L };
}
