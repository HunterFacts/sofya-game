// Погода и время суток: у каждого уровня своя (всегда одинаковая для этого уровня).
// ~55% солнышко (ничего не меняем), ~15% тёплый дождик (во второй половине уровня — радуга),
// ~15% вечер (звёзды, светлячки, фары), ~15% закат (оранжево-розовое небо).
// На Луне не бывает (там и так ночь). На стыке уровней погода плавно перетекает (по view.cam.x).
// Ничего не прячет препятствия: затемнение мягкое, а машина, монетки и бонусы рисуются поверх него ярко.
import { levelAt, levelStart, biomeOf, regionAt } from '../terrain.js';
import { hash2, clamp, smooth } from '../rng.js';

const SEED = 143;      // подобран так, чтобы дождь, вечер и закат встретились уже на уровнях 2–4
const EDGE = 25;       // полуширина плавного перехода на границе уровней (м), как у фона в render.js

// Погода уровня L: 'sun' | 'rain' | 'night' | 'sunset'
export function weatherOf(L) {
  const b = biomeOf(L);
  if (L === 0 || b.night) return 'sun';
  const h = hash2(L, SEED);
  if (h < 0.55) return 'sun';
  if (h < 0.7) return 'rain';
  if (h < 0.85) return 'night';
  return 'sunset';
}

// Сила каждого эффекта в текущем кадре (0..1), считается один раз в 'render:sky'
const W = { rain: 0, snow: 0, cloud: 0, rainbow: 0, night: 0, sunset: 0, fireflies: 0, any: false };

function addLevel(L, k, x) {
  if (k <= 0) return;
  const kind = weatherOf(L);
  if (kind === 'sun') return;
  if (kind === 'night') {
    W.night += k;
    if (biomeOf(L).id !== 'snow') W.fireflies += k;
    else W.snow += k * 0.6;              // зимний вечер — тихий снежок
    return;
  }
  if (kind === 'sunset') { W.sunset += k; return; }
  // дождь: к середине уровня утихает, выглядывает солнце и встаёт радуга
  const B0 = levelStart(L), len = levelStart(L + 1) - B0;
  const p = clamp((x - B0) / len, 0, 1);
  const fade = smooth(clamp((p - 0.42) / 0.16, 0, 1));
  const wet = k * (1 - 0.85 * fade);
  if (biomeOf(L).id === 'snow') W.snow += wet * 1.4;   // на снегу вместо дождя — снегопад
  else W.rain += wet;
  W.cloud += wet;
  W.rainbow += k * smooth(clamp((p - 0.5) / 0.12, 0, 1));
}

function measure(x) {
  W.rain = W.snow = W.cloud = W.rainbow = W.night = W.sunset = W.fireflies = 0;
  if (!regionAt(x)) {
    const L = levelAt(x);
    const B0 = levelStart(L), B1 = levelStart(L + 1);
    if (L > 0 && x - B0 < EDGE) {
      const t = smooth(clamp((x - B0 + EDGE) / (2 * EDGE), 0, 1));
      addLevel(L - 1, 1 - t, x); addLevel(L, t, x);
    } else if (B1 - x < EDGE) {
      const t = smooth(clamp((x - B1 + EDGE) / (2 * EDGE), 0, 1));
      addLevel(L, 1 - t, x); addLevel(L + 1, t, x);
    } else addLevel(L, 1, x);
  }
  W.any = W.cloud + W.rainbow + W.night + W.sunset + W.snow > 0.005;
}

// ---------- градиенты (создаются заново только при смене размера экрана) ----------
let gH = 0;
const G = {};
function gradients(ctx, H) {
  if (gH === H) return G;
  gH = H;
  const lin = (stops) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  };
  G.nightSky = lin([[0, '#1c2466'], [0.55, '#3b3f93'], [1, '#6a5fb0']]);
  G.sunsetSky = lin([[0, '#a77be0'], [0.3, '#ff8fbf'], [0.62, '#ffad74'], [1, '#ffe08a']]);
  G.rainSky = lin([[0, '#9fb0e6'], [0.6, '#c9d4f2'], [1, '#e6ecfb']]);
  // «Умножающая» дымка: сверху почти прозрачная (звёзды остаются яркими), к земле чуть темнее
  G.nightTint = lin([[0, 'rgb(236,236,255)'], [0.45, 'rgb(190,196,245)'], [1, 'rgb(160,170,232)']]);
  G.sunsetTint = lin([[0, 'rgb(255,246,240)'], [1, 'rgb(255,212,190)']]);
  return G;
}

// ---------- небо ----------
function cloud(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 1.1, y - r * 0.4, r * 1.2, 0, Math.PI * 2);
  ctx.arc(x + r * 2.2, y, r * 0.9, 0, Math.PI * 2);
  ctx.rect(x, y - r * 0.2, r * 2.2, r * 1.0);
  ctx.fill();
}

function clouds(ctx, view, t, n, seed, color, yMax) {
  const { W: w, H, cam } = view, u = Math.min(w, H);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const span = w + u * 0.9;
    const x = ((hash2(i, seed) * span - cam.x * 4 * (0.4 + hash2(i, seed + 1) * 0.3) - t * 8) % span + span) % span - u * 0.45;
    const y = H * (0.04 + hash2(i, seed + 2) * yMax), r = u * (0.045 + hash2(i, seed + 3) * 0.035);
    cloud(ctx, x, y, r);
  }
}

function drawNightSky(ctx, view, t, k) {
  const { W: w, H } = view, u = Math.min(w, H);
  ctx.globalAlpha = k;
  ctx.fillStyle = G.nightSky;
  ctx.fillRect(0, 0, w, H);
  // звёзды-искорки
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 60; i++) {
    const x = hash2(i, 301) * w, y = hash2(i, 302) * H * 0.62;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.8 + hash2(i, 303)) + i));
    ctx.globalAlpha = k * tw;
    const s = hash2(i, 304) < 0.2 ? 3 : 2;
    ctx.fillRect(x, y, s, s);
  }
  // пара больших звёздочек-лучиков
  for (let i = 0; i < 4; i++) {
    const x = (0.12 + hash2(i, 311) * 0.6) * w, y = (0.06 + hash2(i, 312) * 0.3) * H;
    const r = u * 0.018 * (0.8 + 0.4 * Math.abs(Math.sin(t * 1.3 + i * 2)));
    ctx.globalAlpha = k * 0.95;
    ctx.fillStyle = '#fff6c2';
    ctx.beginPath();
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4, rr = j % 2 ? r * 0.3 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
  }
  // улыбчивая луна (там, где днём солнышко)
  const mx = w * 0.82, my = H * 0.18, mr = u * 0.075;
  ctx.globalAlpha = k * 0.22;
  ctx.fillStyle = '#fff7c4';
  ctx.beginPath(); ctx.arc(mx, my, mr * (1.4 + 0.05 * Math.sin(t * 1.5)), 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = k;
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(230,210,140,0.55)';
  ctx.beginPath(); ctx.arc(mx + mr * 0.45, my - mr * 0.35, mr * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx - mr * 0.5, my + mr * 0.5, mr * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = Math.max(1.5, mr * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(mx - mr * 0.32, my - mr * 0.05, mr * 0.14, Math.PI * 1.15, Math.PI * 1.85);
  ctx.moveTo(mx + mr * 0.46, my - mr * 0.05);
  ctx.arc(mx + mr * 0.32, my - mr * 0.05, mr * 0.14, Math.PI * 1.15, Math.PI * 1.85);
  ctx.moveTo(mx - mr * 0.22, my + mr * 0.3);
  ctx.arc(mx, my + mr * 0.22, mr * 0.24, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,140,170,0.5)';
  ctx.beginPath(); ctx.arc(mx - mr * 0.55, my + mr * 0.22, mr * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + mr * 0.55, my + mr * 0.22, mr * 0.13, 0, Math.PI * 2); ctx.fill();
  // редкие сиреневые облачка
  ctx.globalAlpha = k * 0.35;
  clouds(ctx, view, t, 3, 321, '#b9b3ec', 0.25);
}

function drawSunsetSky(ctx, view, t, k) {
  const { W: w, H } = view, u = Math.min(w, H);
  ctx.globalAlpha = k;
  ctx.fillStyle = G.sunsetSky;
  ctx.fillRect(0, 0, w, H);
  // большое низкое солнце (низ прячется за горами)
  const sx = w * 0.66, sy = H * 0.27, sr = u * 0.12;
  ctx.fillStyle = 'rgba(255,236,150,0.35)';
  ctx.beginPath(); ctx.arc(sx, sy, sr * (1.45 + 0.05 * Math.sin(t * 2)), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd25e';
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,90,0.6)';
  ctx.beginPath(); ctx.arc(sx, sy + sr * 0.15, sr * 0.92, 0.1, Math.PI - 0.1); ctx.fill();
  // розовые облака
  ctx.globalAlpha = k * 0.9;
  clouds(ctx, view, t, 5, 331, '#ffc4dc', 0.28);
}

function drawRainSky(ctx, view, t, k) {
  const { W: w, H } = view;
  ctx.globalAlpha = k * 0.8;
  ctx.fillStyle = G.rainSky;
  ctx.fillRect(0, 0, w, H);
  // пухлые сиренево-белые тучки (не серые — дождик тёплый и весёлый)
  ctx.globalAlpha = k * 0.85;
  clouds(ctx, view, t, 4, 351, '#b9b7e8', 0.1);
  ctx.globalAlpha = k;
  clouds(ctx, view, t, 7, 341, '#f4f5ff', 0.2);
}

const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
function drawRainbow(ctx, view, k) {
  const { W: w, H, cam } = view, u = Math.min(w, H);
  const cx = w * 0.62 - ((cam.x * 0.6) % 40), cy = H * 0.72, r0 = Math.max(w, H) * 0.42, bw = u * 0.032;
  ctx.globalAlpha = k * 0.62;
  ctx.lineWidth = bw + 1;
  for (let i = 0; i < RAINBOW.length; i++) {
    ctx.strokeStyle = RAINBOW[i];
    ctx.beginPath(); ctx.arc(cx, cy, r0 - i * bw, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
  }
}

function onSky(ctx, view, t) {
  measure(view.cam.x);
  if (!W.any) return;
  gradients(ctx, view.H);
  ctx.save();
  if (W.night > 0.005) drawNightSky(ctx, view, t, W.night);
  if (W.sunset > 0.005) drawSunsetSky(ctx, view, t, W.sunset);
  if (W.cloud > 0.005) drawRainSky(ctx, view, t, W.cloud);
  if (W.rainbow > 0.005) drawRainbow(ctx, view, W.rainbow);
  ctx.restore();
}

// ---------- мягкое «умножение» цвета для гор и земли (до монеток и машины) ----------
function onWorldBack(ctx, world, view) {
  if (!W.any || W.night + W.sunset + W.cloud < 0.005) return;
  ctx.save();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  if (W.night > 0.005) { ctx.globalAlpha = W.night; ctx.fillStyle = G.nightTint; ctx.fillRect(0, 0, view.W, view.H); }
  if (W.sunset > 0.005) { ctx.globalAlpha = W.sunset; ctx.fillStyle = G.sunsetTint; ctx.fillRect(0, 0, view.W, view.H); }
  if (W.cloud > 0.005) { ctx.globalAlpha = W.cloud * 0.5; ctx.fillStyle = 'rgb(226,230,250)'; ctx.fillRect(0, 0, view.W, view.H); }
  ctx.restore();
}

// ---------- дождик, снежок, светлячки (экран) ----------
function onScreen(ctx, world, view, t) {
  if (!W.any) return;
  const { W: w, H, cam } = view;
  const shift = cam.x * cam.s;
  ctx.save();
  if (W.rain > 0.01) {
    const n = Math.round(30 + 40 * Math.min(1, W.rain));
    ctx.globalAlpha = Math.min(1, W.rain) * 0.6;
    ctx.strokeStyle = '#e8f3ff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const span = w + 60;
    for (let i = 0; i < n; i++) {
      const sp = 520 + hash2(i, 401) * 260;
      const y = (hash2(i, 402) * (H + 40) + t * sp) % (H + 40) - 20;
      const x = ((hash2(i, 403) * span - shift * 0.9 - y * 0.25) % span + span) % span - 30;
      ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13 + hash2(i, 404) * 6);
    }
    ctx.stroke();
  }
  if (W.snow > 0.01) {
    const n = Math.round(20 + 40 * Math.min(1, W.snow));
    ctx.globalAlpha = Math.min(1, W.snow) * 0.95;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const y = (hash2(i, 411) * (H + 20) + t * (35 + hash2(i, 412) * 45)) % (H + 20) - 10;
      const x = ((hash2(i, 413) * w - shift * 0.6 + Math.sin(t * 1.3 + i) * 18) % w + w) % w;
      const r = 2.5 + hash2(i, 414) * 3.5;
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  if (W.fireflies > 0.01) {
    const span = w * 1.3;
    for (let i = 0; i < 14; i++) {
      const x = ((hash2(i, 421) * span - shift * (0.5 + hash2(i, 422) * 0.3) + Math.sin(t * 0.7 + i) * 30) % span + span) % span - w * 0.15;
      const y = H * (0.3 + hash2(i, 423) * 0.45) + Math.sin(t * 1.4 + i * 2.1) * 14;
      const blink = 0.35 + 0.65 * Math.max(0, Math.sin(t * (1.6 + hash2(i, 424)) + i * 1.7));
      ctx.globalAlpha = W.fireflies * blink * 0.3;
      ctx.fillStyle = '#eaff6a';
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = W.fireflies * blink * 0.6;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = W.fireflies * blink;
      ctx.fillStyle = '#fdffc8';
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- фары (координаты машины) ----------
const beams = new WeakMap();   // машина → градиенты луча (координаты машины постоянны)
function onCarFront(ctx, info, world) {
  if (W.night < 0.01 || info.state !== world.car) return;
  const v = info.vehicle, h = v.headlight;
  if (!h) return;
  let g = beams.get(v);
  if (!g) {
    const beam = ctx.createLinearGradient(h.x, 0, h.x + 6.5, 0);
    beam.addColorStop(0, 'rgba(255,238,160,0.6)');
    beam.addColorStop(0.5, 'rgba(255,238,160,0.22)');
    beam.addColorStop(1, 'rgba(255,238,160,0)');
    const glow = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 0.45);
    glow.addColorStop(0, 'rgba(255,250,210,0.95)');
    glow.addColorStop(1, 'rgba(255,240,170,0)');
    g = { beam, glow };
    beams.set(v, g);
  }
  ctx.save();
  ctx.globalAlpha = W.night;
  ctx.fillStyle = g.beam;
  ctx.beginPath();
  ctx.moveTo(h.x - 0.02, h.y - 0.09);
  ctx.lineTo(h.x + 6.5, h.y - 0.9);
  ctx.quadraticCurveTo(h.x + 6.9, h.y + 0.35, h.x + 6.5, h.y + 1.6);
  ctx.lineTo(h.x - 0.02, h.y + 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = g.glow;
  ctx.beginPath(); ctx.arc(h.x, h.y, 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function init(api) {
  const world = api.world;
  api.on('render:sky', onSky);
  api.on('render:world-back', onWorldBack);
  api.on('render:screen', onScreen);
  api.on('car:front', (ctx, info) => onCarFront(ctx, info, world));
}
