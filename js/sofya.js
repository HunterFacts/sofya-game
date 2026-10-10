// Софья: тёмно-русые, слегка кудрявые, очень длинные волосы (до колен — уходят за край окна).
// style = save.look.sofya ({hair, outfit, acc}); pose — 'wave' (машет рукой) или null.
// Рисуется в «единицах головы»: лицо радиусом ~0.9 с центром (0, 0.1), ось Y вниз.
// В окне машины видно примерно x -1.4…2, y -2…1.2 (низ окна — у подбородка).
import { ellipse, circle, rrect, fillStroke, heartPath, starPath, wave, drawEyes } from './draw-utils.js';

const HAIR = '#937452', HAIR_D = '#6f5538', HAIR_L = '#b8976b', SKIN = '#ffdcc6', SKIN_D = '#f1bfa3';

// Причёски, наряды и украшения (id; цены — в js/features/dressup.js)
export const SOFYA_HAIR = ['long', 'ponytail', 'braids', 'buns', 'crown'];
const OUTFITS = {
  pink: { fill: '#ff8cc6', stroke: '#e0609f' },
  lilac: { fill: '#c6a3ff', stroke: '#9a70e6' },
  mint: { fill: '#7fe3c4', stroke: '#3cb48f' },
  sky: { fill: '#80c8ff', stroke: '#3f98e0' },
  yellow: { fill: '#ffe066', stroke: '#e0aa1c' },
  red: { fill: '#ff6b6b', stroke: '#d43f4f' },
  rainbow: { fill: '#ff5a5a', stroke: '#b45fa8', sleeve: '#ffd93b', pattern: 'rainbow' },
  hearts: { fill: '#ffe0ef', stroke: '#e0609f', sleeve: '#ffb3d6', pattern: 'hearts' },
  stars: { fill: '#6f5cff', stroke: '#4a37cf', pattern: 'stars' },
  princess: { fill: '#ffc6e5', stroke: '#e58cc0', sleeve: '#e6cbff', sleeveD: '#b58ee6', pattern: 'princess' },
};
export const SOFYA_OUTFITS = Object.keys(OUTFITS);
export const SOFYA_ACCS = ['heart', 'none', 'bow', 'glasses', 'flowers', 'headphones', 'cat', 'tiara'];

// ---------- Волосы ----------
const CURLS = [[0.55, 0.13], [1.25, 0.15], [1.95, 0.14], [2.6, 0.13]];

// Прядь перед плечом: от виска вниз за край окна
function hairLock(ctx, d, sway) {
  const ox = 1.02 * d, ix = 0.74 * d;
  ctx.beginPath();
  ctx.moveTo(ox, -0.15);
  wave(ctx, ox, -0.15, (1.42 + sway) * d, 3.0, 7, 0.13 * d);
  ctx.lineTo((0.98 + sway) * d, 3.0);
  wave(ctx, (0.98 + sway) * d, 3.0, ix, 0.35, 6, 0.11 * d);
  ctx.quadraticCurveTo(0.78 * d, 0.05, ox, -0.15);
  ctx.closePath();
  fillStroke(ctx, HAIR, HAIR_D, 0.06);
  // завитки-блики
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.07;
  for (const [y, r] of CURLS) {
    const x = (1.0 + sway * (y / 3) + y * 0.07) * d;
    ctx.beginPath();
    ctx.arc(x, y, r, d > 0 ? Math.PI * 0.9 : -Math.PI * 0.1, d > 0 ? Math.PI * 2.3 : Math.PI * 1.3);
    ctx.stroke();
  }
}

// Распущенные волосы сзади — до колен
function backLong(ctx, sway) {
  ctx.beginPath();
  ctx.moveTo(-0.2, -1.14);
  ctx.quadraticCurveTo(-1.25, -1.12, -1.22, -0.1);
  wave(ctx, -1.22, -0.1, -1.75 + sway, 3.2, 8, 0.12);
  ctx.lineTo(1.75 + sway, 3.2);
  wave(ctx, 1.75 + sway, 3.2, 1.22, -0.1, 8, 0.12);
  ctx.quadraticCurveTo(1.25, -1.12, 0.2, -1.14);
  ctx.closePath();
  fillStroke(ctx, HAIR, HAIR_D, 0.08);
}

// Собранные волосы: только затылок вокруг головы
function backShort(ctx) {
  ellipse(ctx, 0, -0.12, 1.12, 1.08);
  fillStroke(ctx, HAIR, HAIR_D, 0.08);
}

// Макушка и кудрявая чёлка (одинаковые у всех причёсок — это «лицо» Софьи)
function topCap(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.02, 0.02);
  ctx.quadraticCurveTo(-1.02, -1.1, 0, -1.12);
  ctx.quadraticCurveTo(1.02, -1.1, 1.04, 0.02);
  ctx.quadraticCurveTo(0.95, -0.2, 0.82, -0.22);
  wave(ctx, 0.82, -0.22, -0.82, -0.22, 5, 0.17);
  ctx.quadraticCurveTo(-0.95, -0.2, -1.02, 0.02);
  fillStroke(ctx, HAIR, HAIR_D, 0.07);
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.08;
  ctx.beginPath(); ctx.moveTo(-0.5, -0.86); ctx.quadraticCurveTo(-0.1, -1.0, 0.3, -0.92); ctx.stroke();
  ctx.beginPath(); ctx.arc(-0.62, -0.5, 0.12, Math.PI * 0.8, Math.PI * 2.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(0.5, -0.62, 0.11, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke();
}

// Дуга эллипса отдельным кусочком пути (без линии от предыдущей точки)
function ellipseArc(ctx, x, y, rx, ry, rot, a0, a1) {
  const c = Math.cos(rot), s = Math.sin(rot), px = Math.cos(a0) * rx, py = Math.sin(a0) * ry;
  ctx.moveTo(x + px * c - py * s, y + px * s + py * c);
  ctx.ellipse(x, y, rx, ry, rot, a0, a1);
}

// Звенья косы: [доля длины, y, x без ветра, полуширина, наклон ±1] — посчитано заранее
const BRAID = [];
for (let i = 0; i < 12; i++) {
  const k = i / 11;
  BRAID.push([k, 0.32 + k * 2.75, 0.98 + 0.2 * Math.sin(k * 2.6), 0.25 - 0.05 * k, i % 2 ? 1 : -1]);
}

// Длинная коса через плечо: звенья «ёлочкой», внизу резинка и кисточка (ниже края окна)
function braid(ctx, d, sway) {
  // гладкое начало от виска
  ctx.beginPath();
  ctx.moveTo(0.86 * d, -0.3);
  ctx.quadraticCurveTo(1.12 * d, -0.1, 1.08 * d, 0.32);
  ctx.lineTo(0.86 * d, 0.32);
  ctx.quadraticCurveTo(0.9 * d, 0.0, 0.7 * d, -0.3);
  ctx.closePath();
  fillStroke(ctx, HAIR, HAIR_D, 0.06);
  // звенья снизу вверх (верхнее ложится на нижнее), блики — одним штрихом
  // (заливка всех звеньев разом, у контура каждого звена — только видимая часть)
  ctx.beginPath();
  for (const [k, y, bx, w, side] of BRAID) {
    const x = (bx + sway * 1.5 * k) * d + side * 0.07, rot = side * 0.6;
    ctx.moveTo(x + Math.cos(rot) * w, y + Math.sin(rot) * w);
    ctx.ellipse(x, y, w, 0.17, rot, 0, Math.PI * 2);
  }
  ctx.fillStyle = HAIR;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < BRAID.length; i++) {
    const [k, y, bx, w, side] = BRAID[i];
    const x = (bx + sway * 1.5 * k) * d + side * 0.07, rot = side * 0.6;
    const a0 = i ? -Math.PI * 0.18 - rot : 0, a1 = i ? a0 + Math.PI * 1.36 : Math.PI * 2;
    ellipseArc(ctx, x, y, w, 0.17, rot, a0, a1);
  }
  ctx.strokeStyle = HAIR_D;
  ctx.lineWidth = 0.055;
  ctx.stroke();
  ctx.beginPath();
  for (const [k, y, bx, w, side] of BRAID) {
    const x = (bx + sway * 1.5 * k) * d + side * 0.07, a0 = Math.PI * 1.15 + side * 0.6;
    ctx.moveTo(x + Math.cos(a0) * w * 0.6, y + Math.sin(a0) * 0.08);
    ctx.ellipse(x, y, w * 0.6, 0.08, side * 0.6, Math.PI * 1.15, Math.PI * 1.75);
  }
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  // резинка и кисточка
  const ex = (0.98 + 0.2 * Math.sin(2.6) + sway * 1.5) * d;
  ctx.beginPath();
  ctx.moveTo(ex - 0.12, 3.12);
  wave(ctx, ex - 0.12, 3.12, ex - 0.2, 3.55, 3, 0.06);
  ctx.lineTo(ex + 0.2, 3.55);
  wave(ctx, ex + 0.2, 3.55, ex + 0.12, 3.12, 3, 0.06);
  ctx.closePath();
  fillStroke(ctx, HAIR, HAIR_D, 0.05);
  ellipse(ctx, ex, 3.1, 0.17, 0.08);
  fillStroke(ctx, '#ff5fa8', '#d63d86', 0.04);
}

// Высокий хвост: из макушки дугой вверх и вниз за плечом (качается)
function ponytail(ctx, sway) {
  const s2 = sway * 2.2;
  ctx.beginPath();
  ctx.moveTo(0.22, -1.1);
  ctx.bezierCurveTo(0.35, -1.75, 1.15, -1.85, 1.38 + s2 * 0.3, -1.2);
  wave(ctx, 1.38 + s2 * 0.3, -1.2, 1.78 + s2, 3.3, 9, 0.11);
  ctx.lineTo(1.0 + s2, 3.3);
  wave(ctx, 1.0 + s2, 3.3, 0.98, -0.55, 8, 0.09);
  ctx.quadraticCurveTo(0.95, -1.25, 0.55, -1.12);
  ctx.closePath();
  fillStroke(ctx, HAIR, HAIR_D, 0.07);
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.07;
  ctx.beginPath(); ctx.moveTo(0.5, -1.38); ctx.quadraticCurveTo(0.9, -1.62, 1.18, -1.3); ctx.stroke();
  for (const [y, r] of CURLS) {
    const x = 1.38 + s2 * (y / 3.3) + y * 0.03;
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.9, Math.PI * 2.3); ctx.stroke();
  }
}

// Кудряшки у висков (при собранных волосах)
function templeCurl(ctx, d, sway) {
  ctx.beginPath();
  ctx.moveTo(0.98 * d, -0.25);
  wave(ctx, 0.98 * d, -0.25, (1.04 + sway) * d, 0.62, 4, 0.08 * d);
  ctx.strokeStyle = HAIR_D; ctx.lineWidth = 0.17; ctx.stroke();
  ctx.strokeStyle = HAIR; ctx.lineWidth = 0.08; ctx.stroke();
}

// Два пучка на макушке (с резинками у основания — чтобы не путать с ушками)
const BUNS = [[-0.58, -1.13, -1], [0.58, -1.13, 1]];
function buns(ctx) {
  for (const [x, y, d] of BUNS) {
    circle(ctx, x, y, 0.42);
    fillStroke(ctx, HAIR, HAIR_D, 0.07);
    ctx.strokeStyle = HAIR_L;
    ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.arc(x, y, 0.27, Math.PI * 0.85, Math.PI * 1.95); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 0.02, y + 0.02, 0.13, Math.PI * 0.1, Math.PI * 1.4); ctx.stroke();
  }
}
function bunTies(ctx) {
  for (const [x, y, d] of BUNS) {
    ellipse(ctx, x * 0.86, y + 0.3, 0.2, 0.09, d * 0.55);
    fillStroke(ctx, '#ff5fa8', '#d63d86', 0.045);
  }
}

// Коса-корона через макушку (точки дуги посчитаны заранее)
const CROWN = [];
for (let i = 0; i < 13; i++) {
  const a = Math.PI * (1.1 + 0.8 * (i / 12));
  const tilt = i % 2 ? 0.55 : -0.55;
  CROWN.push([Math.cos(a) * 0.97, -0.12 + Math.sin(a) * 0.97, a + Math.PI / 2 + tilt, -tilt]);
}
function crownBraid(ctx) {
  // каждое следующее звено лежит на предыдущем: заливка разом, контуры — видимые части
  ctx.beginPath();
  for (const [x, y, rot] of CROWN) ellipseArc(ctx, x, y, 0.21, 0.145, rot, 0, Math.PI * 2);
  ctx.fillStyle = '#a5835c';
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < CROWN.length; i++) {
    const [x, y, rot, hide] = CROWN[i];
    if (i === CROWN.length - 1) ellipseArc(ctx, x, y, 0.21, 0.145, rot, 0, Math.PI * 2);
    else ellipseArc(ctx, x, y, 0.21, 0.145, rot, hide + Math.PI * 0.3, hide + Math.PI * 1.7);
  }
  ctx.strokeStyle = HAIR_D;
  ctx.lineWidth = 0.055;
  ctx.stroke();
  ctx.beginPath();
  for (const [x, y, rot] of CROWN) {
    ctx.moveTo(x + Math.cos(Math.PI * 1.1 + rot) * 0.12, y + Math.sin(Math.PI * 1.1 + rot) * 0.06);
    ctx.ellipse(x, y, 0.12, 0.06, rot, Math.PI * 1.1, Math.PI * 1.8);
  }
  ctx.strokeStyle = '#c9aa80';
  ctx.lineWidth = 0.05;
  ctx.stroke();
}

// ---------- Наряды ----------
const SPOTS = [[-0.55, 1.12, 0.1], [0.55, 1.12, 0.1], [-0.82, 1.42, 0.12], [-0.3, 1.5, 0.12], [0.3, 1.5, 0.12], [0.82, 1.42, 0.12],
  [-0.6, 1.85, 0.12], [0, 1.85, 0.12], [0.6, 1.85, 0.12]];
const RAINBOW = ['#ff5a5a', '#ff9f43', '#ffd93b', '#5ee07a', '#4fb3ff', '#a97bff'];
const SPARKLES = [[-0.62, 1.3, 0], [0.48, 1.62, 2], [-0.2, 1.95, 4], [0.85, 1.22, 1]];

function outfitPath(ctx) { ellipse(ctx, 0, 1.6, 1.12, 0.62); }

function drawOutfit(ctx, o, t) {
  outfitPath(ctx);
  if (!o.pattern) { fillStroke(ctx, o.fill, o.stroke, 0.08); return; }
  ctx.fillStyle = o.fill;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (o.pattern === 'rainbow') {
    for (let i = 0; i < RAINBOW.length; i++) { ctx.fillStyle = RAINBOW[i]; ctx.fillRect(-1.2, 0.98 + i * 0.21, 2.4, 0.22); }
  } else if (o.pattern === 'hearts' || o.pattern === 'stars') {
    ctx.fillStyle = o.pattern === 'hearts' ? '#ff5fa8' : '#ffe066';
    for (const [x, y, s] of SPOTS) {
      if (o.pattern === 'hearts') heartPath(ctx, x, y + 0.04, s); else starPath(ctx, x, y, s * 1.1);
      ctx.fill();
    }
  } else if (o.pattern === 'princess') {
    // светлая вставка спереди и жемчужинки
    ellipse(ctx, 0, 1.85, 0.5, 0.75);
    fillStroke(ctx, '#ffe6f3', '#f3b3d6', 0.05);
    ctx.beginPath();
    for (let y = 1.42; y < 2; y += 0.24) { ctx.moveTo(0.07, y); ctx.arc(0, y, 0.07, 0, Math.PI * 2); }
    ctx.strokeStyle = '#e8c9de'; ctx.lineWidth = 0.06; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fill();
  }
  ctx.restore();
  outfitPath(ctx);
  ctx.strokeStyle = o.stroke;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  if (o.pattern === 'princess') {
    // рукава-фонарики
    for (const d of [-1, 1]) {
      circle(ctx, d * 0.98, 1.36, 0.34);
      fillStroke(ctx, o.sleeve, o.sleeveD, 0.06);
      ctx.strokeStyle = o.sleeveD;
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.moveTo(d * 0.86, 1.06); ctx.quadraticCurveTo(d * 0.9, 1.36, d * 0.86, 1.66);
      ctx.moveTo(d * 1.1, 1.06); ctx.quadraticCurveTo(d * 1.08, 1.36, d * 1.12, 1.66);
      ctx.stroke();
    }
    // искорки
    for (const [x, y, ph] of SPARKLES) {
      const tw = 0.55 + 0.45 * Math.sin(t * 4 + ph);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = tw;
      starPath(ctx, x, y, 0.13 * tw + 0.04, 0.035, 4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// Кружевной воротничок принцессы (поверх шеи)
function lace(ctx) {
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.14, y = 1.12 + i * i * 0.012;
    ctx.moveTo(x + 0.09, y);
    ctx.arc(x, y, 0.09, 0, Math.PI * 2);
  }
  ctx.strokeStyle = '#efc6dd';
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

// ---------- Украшения ----------
function bow(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0.05); ctx.quadraticCurveTo(d * 0.18, 0.3, d * 0.3, 0.42); ctx.lineTo(d * 0.12, 0.42); ctx.closePath();
    fillStroke(ctx, '#ff4f9a', '#c8306f', 0.05);
  }
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * 0.45, -0.4, d * 0.5, 0); ctx.quadraticCurveTo(d * 0.45, 0.4, 0, 0);
    fillStroke(ctx, '#ff5fa8', '#c8306f', 0.06);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(d * 0.14, -0.1); ctx.quadraticCurveTo(d * 0.3, -0.22, d * 0.4, -0.12); ctx.stroke();
  }
  circle(ctx, 0, 0, 0.12);
  fillStroke(ctx, '#ff86bd', '#c8306f', 0.05);
  ctx.restore();
}

const FLOWER_COLS = ['#ff8cc6', '#ffffff', '#ffd84d', '#c6a3ff', '#ff6b8a', '#ffffff', '#ffd84d'];
// цветочки венка: [x, y, цвет, радиус, лепестки [[x, y]…]], листики [[x, y, наклон]…]
const FLOWERS = [], LEAVES = [];
for (let i = 0; i < 7; i++) {
  const a = Math.PI * (1.12 + 0.76 * (i / 6));
  const x = Math.cos(a) * 1.0, y = -0.1 + Math.sin(a) * 1.0, r = 0.1 + (i % 2) * 0.02;
  const petals = [];
  for (let k = 0; k < 5; k++) { const b = (k * Math.PI * 2) / 5 + i; petals.push([x + Math.cos(b) * r, y + Math.sin(b) * r]); }
  FLOWERS.push([x, y, FLOWER_COLS[i], r, petals]);
}
for (let i = 0; i < 6; i++) {
  const [x0, y0] = FLOWERS[i], [x1, y1] = FLOWERS[i + 1];
  LEAVES.push([(x0 + x1) / 2, (y0 + y1) / 2 - 0.04, Math.atan2(y1 - y0, x1 - x0) + 0.5]);
}
// Венок рисуется пачками по цвету (меньше заливок за кадр)
const FLOWER_FILLS = [...new Set(FLOWER_COLS)];
// which: цвет заливки, либо 'white' / 'color' — белые / цветные цветочки (для контура)
function petalsPath(ctx, which) {
  ctx.beginPath();
  for (const [, , col, r, petals] of FLOWERS) {
    const white = col === '#ffffff';
    if (which === 'white' ? !white : which === 'color' ? white : col !== which) continue;
    for (const [px, py] of petals) { ctx.moveTo(px + r * 0.8, py); ctx.arc(px, py, r * 0.8, 0, Math.PI * 2); }
  }
}
function flowerCrown(ctx) {
  ctx.beginPath();
  for (const [x, y, rot] of LEAVES) ellipseArc(ctx, x, y, 0.13, 0.065, rot, 0, Math.PI * 2);
  ctx.fillStyle = '#6fd07a';
  ctx.fill();
  // контуры сначала, заливки поверх — остаётся только внешняя обводка
  ctx.lineWidth = 0.06;
  petalsPath(ctx, 'white');
  ctx.strokeStyle = '#f2a0c4'; ctx.stroke();
  petalsPath(ctx, 'color');
  ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.stroke();
  for (const fill of FLOWER_FILLS) {
    petalsPath(ctx, fill);
    ctx.fillStyle = fill; ctx.fill();
  }
  for (const yellow of [true, false]) {
    ctx.beginPath();
    for (const [x, y, col, r] of FLOWERS) {
      if ((col === '#ffd84d') !== !yellow) continue;
      ctx.moveTo(x + r * 0.6, y); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    }
    ctx.fillStyle = yellow ? '#ffd84d' : '#ff9f43';
    ctx.fill();
  }
}

function tiara(ctx, t) {
  ctx.save();
  ctx.translate(0, -1.0);
  ctx.strokeStyle = '#b9bdd0'; ctx.lineWidth = 0.14;
  ctx.beginPath(); ctx.arc(0, 0.75, 0.86, Math.PI + 0.72, -0.72); ctx.stroke();
  ctx.strokeStyle = '#eef0f8'; ctx.lineWidth = 0.08;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.5, 0.03); ctx.lineTo(-0.36, -0.28); ctx.lineTo(-0.2, -0.08); ctx.lineTo(0, -0.55);
  ctx.lineTo(0.2, -0.08); ctx.lineTo(0.36, -0.28); ctx.lineTo(0.5, 0.03);
  ctx.quadraticCurveTo(0, -0.14, -0.5, 0.03);
  ctx.closePath();
  fillStroke(ctx, '#f4f5fb', '#b9bdd0', 0.045);
  heartPath(ctx, 0, -0.16, 0.16); fillStroke(ctx, '#ff4f9a', '#d63d86', 0.03);
  circle(ctx, -0.36, -0.22, 0.06); fillStroke(ctx, '#7ecbff', null);
  circle(ctx, 0.36, -0.22, 0.06); fillStroke(ctx, '#7ecbff', null);
  const tw = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.globalAlpha = tw;
  ctx.fillStyle = '#ffffff';
  starPath(ctx, 0.2, -0.45, 0.14, 0.04, 4); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function catEars(ctx, hair) {
  ctx.strokeStyle = '#ff6fae'; ctx.lineWidth = 0.12;
  ctx.beginPath(); ctx.arc(0, -0.1, 0.99, Math.PI + 0.38, -0.38); ctx.stroke();
  const spread = hair === 'buns' ? 0.36 : 0.6;
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * spread, hair === 'buns' ? -1.1 : -0.9);
    ctx.rotate(d * (hair === 'buns' ? 0.25 : 0.5));
    ctx.beginPath(); ctx.moveTo(-0.27, 0.12); ctx.quadraticCurveTo(-0.1, -0.35, 0, -0.48); ctx.quadraticCurveTo(0.1, -0.35, 0.27, 0.12); ctx.closePath();
    fillStroke(ctx, '#ffffff', '#cfc4dc', 0.06);
    ctx.beginPath(); ctx.moveTo(-0.13, 0.06); ctx.quadraticCurveTo(-0.05, -0.2, 0, -0.3); ctx.quadraticCurveTo(0.05, -0.2, 0.13, 0.06); ctx.closePath();
    fillStroke(ctx, '#ffb6cf', null);
    ctx.restore();
  }
}

// Солнечные очки-сердечки подняты на макушку
function sunglasses(ctx) {
  ctx.strokeStyle = '#ff4f9a'; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(-0.6, -0.72); ctx.lineTo(-0.95, -0.55); ctx.moveTo(0.6, -0.72); ctx.lineTo(0.95, -0.55); ctx.stroke();
  for (const d of [-1, 1]) {
    heartPath(ctx, d * 0.33, -0.72, 0.27);
    fillStroke(ctx, '#5a2d6e', '#ff4f9a', 0.07);
  }
  ctx.beginPath(); ctx.moveTo(-0.1, -0.86); ctx.quadraticCurveTo(0, -0.93, 0.1, -0.86); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  circle(ctx, -0.43, -0.85, 0.05); ctx.fill();
  circle(ctx, 0.23, -0.85, 0.05); ctx.fill();
}

function headphones(ctx) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#8d5fe0'; ctx.lineWidth = 0.2;
  ctx.beginPath(); ctx.arc(0, -0.08, 1.06, Math.PI + 0.22, -0.22); ctx.stroke();
  ctx.strokeStyle = '#b98cff'; ctx.lineWidth = 0.1;
  ctx.stroke();
  for (const d of [-1, 1]) {
    rrect(ctx, d * 1.04 - 0.19, -0.3, 0.38, 0.6, 0.16);
    fillStroke(ctx, '#ff8cc6', '#d9468b', 0.06);
    heartPath(ctx, d * 1.04, 0.02, 0.12);
    fillStroke(ctx, '#ffffff', null);
  }
}

function drawAcc(ctx, acc, hair, t) {
  switch (acc) {
    case 'none': break;
    case 'bow':
      if (hair === 'buns') bow(ctx, 0, -1.12, 0.8, 0);
      else if (hair === 'ponytail') bow(ctx, 0.42, -1.18, 0.85, 0.45);
      else bow(ctx, 0.56, -0.98, 0.95, 0.35);
      break;
    case 'flowers': flowerCrown(ctx); break;
    case 'tiara': tiara(ctx, t); break;
    case 'cat': catEars(ctx, hair); break;
    case 'glasses': sunglasses(ctx); break;
    case 'headphones': headphones(ctx); break;
    default:
      // розовая заколка-сердечко
      heartPath(ctx, 0.72, -0.62, 0.2);
      fillStroke(ctx, '#ff5fa8', '#d63d86', 0.05);
  }
}

// ---------- «Привет!»: поднятая рука машет ----------
function waveArm(ctx, o, t) {
  const a = Math.sin(t * 11) * 0.4 + 0.1;              // качание предплечья
  const sx = 0.9, sy = 1.4, ex = 1.6, ey = 0.72;        // плечо и локоть
  const wx = ex + Math.sin(a) * 0.82, wy = ey - Math.cos(a) * 0.82;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // рука
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy);
  ctx.strokeStyle = SKIN_D; ctx.lineWidth = 0.32; ctx.stroke();
  ctx.strokeStyle = SKIN; ctx.lineWidth = 0.23; ctx.stroke();
  // короткий рукав
  ctx.beginPath(); ctx.moveTo(sx - 0.05, sy + 0.05); ctx.lineTo(sx + (ex - sx) * 0.42, sy + (ey - sy) * 0.42);
  ctx.strokeStyle = o.sleeveD || o.stroke; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.strokeStyle = o.sleeve || o.fill; ctx.lineWidth = 0.39; ctx.stroke();
  // ладошка с пальчиками
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(a);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ellipseArc(ctx, -0.14 + i * 0.093, -0.24 - (i === 1 || i === 2 ? 0.035 : 0), 0.055, 0.13, 0, 0, Math.PI * 2);
  ellipseArc(ctx, 0.21, -0.04, 0.11, 0.06, -0.6, 0, Math.PI * 2);
  ctx.strokeStyle = SKIN_D; ctx.lineWidth = 0.07; ctx.stroke();
  ctx.fillStyle = SKIN; ctx.fill();
  ellipse(ctx, 0, -0.07, 0.19, 0.17);
  fillStroke(ctx, SKIN, SKIN_D, 0.04);
  ctx.fillStyle = SKIN;
  ellipse(ctx, 0, -0.16, 0.16, 0.08); ctx.fill();
  ctx.restore();
}

// Софья в окне машины (и крупно в гараже)
export function drawSofya(ctx, mood, t, style = {}, pose = null) {
  const st = style || {};
  const hair = st.hair || 'long', acc = st.acc || 'heart';
  const o = OUTFITS[st.outfit] || OUTFITS.pink;
  const up = hair === 'braids' || hair === 'ponytail';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const sway = Math.sin(t * 3) * 0.06 + (mood === 'turbo' ? -0.12 : 0);
  // волосы сзади
  if (up) backShort(ctx); else backLong(ctx, sway);
  if (hair === 'ponytail') ponytail(ctx, sway);
  else if (hair === 'buns') buns(ctx);
  // плечи и кофточка
  drawOutfit(ctx, o, t);
  ellipse(ctx, 0, 1.05, 0.25, 0.2);
  ctx.fillStyle = SKIN_D; ctx.fill();
  if (o.pattern === 'princess') lace(ctx);
  // лицо
  ellipse(ctx, 0, 0.1, 0.9, 0.92);
  fillStroke(ctx, SKIN, SKIN_D, 0.06);
  // пряди спереди, на плечах
  if (hair === 'braids') { braid(ctx, -1, sway); braid(ctx, 1, sway); }
  else if (hair === 'ponytail') { templeCurl(ctx, -1, sway); templeCurl(ctx, 1, sway); }
  else { hairLock(ctx, -1, sway); hairLock(ctx, 1, sway); }
  // макушка и кудрявая чёлка
  topCap(ctx);
  if (hair === 'crown') crownBraid(ctx);
  else if (hair === 'buns') bunTies(ctx);
  else if (hair === 'ponytail') { ellipse(ctx, 0.38, -1.1, 0.17, 0.12, 0.5); fillStroke(ctx, '#ff5fa8', '#d63d86', 0.05); }
  drawAcc(ctx, acc, hair, t);
  // щёчки
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  ellipse(ctx, -0.52, 0.38, 0.18, 0.11); ctx.fill();
  ellipse(ctx, 0.52, 0.38, 0.18, 0.11); ctx.fill();
  drawEyes(ctx, mood, t, -0.36, 0.36, 0.08, '#4a3426', false, 0.7);
  drawHumanMouth(ctx, mood, 0, 0.55);
  if (pose === 'wave') waveArm(ctx, o, t);
}

function drawHumanMouth(ctx, mood, x, y) {
  ctx.strokeStyle = '#a64a4a';
  ctx.lineWidth = 0.08;
  if (mood === 'scared') {
    ellipse(ctx, x, y + 0.05, 0.13, 0.17); fillStroke(ctx, '#a63b4a', null);
  } else if (mood === 'happy' || mood === 'turbo') {
    ctx.beginPath(); ctx.moveTo(x - 0.25, y - 0.04); ctx.quadraticCurveTo(x, y + 0.4, x + 0.25, y - 0.04); ctx.closePath();
    fillStroke(ctx, '#c4475c', '#a64a4a', 0.06);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 0.17, y - 0.03, 0.34, 0.07);
  } else if (mood === 'dizzy') {
    ctx.beginPath(); ctx.moveTo(x - 0.22, y + 0.08);
    ctx.quadraticCurveTo(x - 0.11, y - 0.05, x, y + 0.08); ctx.quadraticCurveTo(x + 0.11, y + 0.2, x + 0.22, y + 0.08); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(x, y - 0.1, 0.2, 0.35, Math.PI - 0.35); ctx.stroke();
  }
}
