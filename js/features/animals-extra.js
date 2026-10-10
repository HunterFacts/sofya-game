// 15 новых (дорогих) зверят для заднего окна. Старые 8 не меняются.
// Каждый рисуется в том же стиле, что и зверята в art.js: голова радиусом ~1 с центром (0,0),
// тельце ниже, все настроения: normal (моргает), happy, scared, turbo, dizzy.
import { ANIMALS } from '../config.js';
import { registerAnimal } from '../art.js';
import { TAU, circle, ellipse, rrect, fillStroke, heartPath, starPath } from '../draw-utils.js';

ANIMALS.push(
  { id: 'hamster', name: 'Хомячок', price: 3000 },
  { id: 'piglet', name: 'Поросёнок', price: 3500 },
  { id: 'frog', name: 'Лягушонок', price: 4000 },
  { id: 'lamb', name: 'Овечка', price: 4500 },
  { id: 'hedgehog', name: 'Ёжик', price: 5000 },
  { id: 'squirrel', name: 'Белочка', price: 5500 },
  { id: 'owl', name: 'Совушка', price: 6000 },
  { id: 'raccoon', name: 'Енотик', price: 6500 },
  { id: 'koala', name: 'Коала', price: 7000 },
  { id: 'monkey', name: 'Обезьянка', price: 7500 },
  { id: 'elephant', name: 'Слонёнок', price: 8000 },
  { id: 'capybara', name: 'Капибара', price: 8500 },
  { id: 'tiger', name: 'Тигрёнок', price: 9000 },
  { id: 'lion', name: 'Львёнок', price: 9500 },
  { id: 'dragon', name: 'Дракончик', price: 10000 },
);

// ---------- голоса: зверёк «здоровается», когда его выбирают в гараже (как «мяу» у Мариссы) ----------
const DEF = undefined; // выход звука по умолчанию (this.sfx)
const VOICES = {
  hamster: (s) => { s.tone(1700, 0.07, 'sine', 0.1, 0, DEF, 2300); s.tone(1900, 0.07, 'sine', 0.1, 0.11, DEF, 2500); },
  piglet: (s) => { for (const w of [0, 0.22]) { s.tone(230, 0.16, 'sawtooth', 0.05, w, DEF, 170); s.noise(0.12, 0.08, 500, 250, w); } },
  frog: (s) => { for (let i = 0; i < 3; i++) s.tone(320, 0.05, 'square', 0.04, i * 0.06, DEF, 220); s.tone(300, 0.12, 'square', 0.04, 0.26, DEF, 200); },
  lamb: (s) => { for (let i = 0; i < 6; i++) s.tone(i % 2 ? 500 : 540, 0.09, 'triangle', 0.12, i * 0.07); },
  hedgehog: (s) => { for (let i = 0; i < 3; i++) s.noise(0.05, 0.16, 2500, 3500, i * 0.09); },
  squirrel: (s) => { for (let i = 0; i < 5; i++) s.tone(1900 + (i % 2) * 300, 0.04, 'square', 0.03, i * 0.06); },
  owl: (s) => { s.tone(430, 0.22, 'sine', 0.18, 0, DEF, 390); s.tone(430, 0.32, 'sine', 0.18, 0.3, DEF, 370); },
  raccoon: (s) => { s.tone(1100, 0.09, 'triangle', 0.1, 0, DEF, 1500); s.tone(1200, 0.09, 'triangle', 0.1, 0.12, DEF, 1700); },
  koala: (s) => { s.tone(150, 0.28, 'sawtooth', 0.04, 0, DEF, 120); s.tone(170, 0.2, 'sawtooth', 0.04, 0.3, DEF, 130); },
  monkey: (s) => { s.tone(480, 0.1, 'triangle', 0.12, 0, DEF, 760); s.tone(480, 0.1, 'triangle', 0.12, 0.14, DEF, 760); s.tone(760, 0.26, 'triangle', 0.12, 0.3, DEF, 480); },
  elephant: (s) => { s.tone(520, 0.4, 'sawtooth', 0.045, 0, DEF, 820); s.tone(1040, 0.35, 'triangle', 0.05, 0.03, DEF, 1600); },
  capybara: (s) => { s.tone(900, 0.07, 'sine', 0.1); s.tone(900, 0.07, 'sine', 0.1, 0.12); s.tone(700, 0.16, 'sine', 0.08, 0.26); },
  tiger: (s) => { s.tone(170, 0.32, 'sawtooth', 0.05, 0, DEF, 230); s.noise(0.28, 0.07, 350, 600); },
  lion: (s) => { s.tone(260, 0.38, 'sawtooth', 0.06, 0, DEF, 170); s.noise(0.32, 0.09, 700, 250); },
  dragon: (s) => {
    s.tone(300, 0.3, 'sawtooth', 0.05, 0, DEF, 460); s.noise(0.25, 0.08, 800, 2500);
    [1319, 1568, 2093].forEach((f, i) => s.tone(f, 0.18, 'triangle', 0.08, 0.3 + i * 0.07));
  },
};

export function init(api) {
  const cards = document.getElementById('cards');
  if (!cards) return;
  let before = null, wasSel = false;
  cards.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    before = api.save.look.animal;
    wasSel = !!card && card.classList.contains('sel');
  }, true);
  cards.addEventListener('click', () => {
    const tab = document.querySelector('#tabs .on');
    if (!tab || tab.dataset.tab !== 'animal') return;
    const id = api.save.look.animal, voice = VOICES[id];
    if (!voice || (id === before && !wasSel)) return;
    setTimeout(() => { try { voice(api.sound); } catch (e) { /* без звука */ } }, id === before ? 0 : 300);
  });
}

// ---------- общие кисточки ----------
const SIDES = [-1, 1];
const blinking = (mood, t) => mood === 'normal' && (t % 3.7) < 0.12;
const opened = (mood) => mood === 'happy' || mood === 'turbo';

// Несколько эллипсов [x, y, rx, ry?, rot?] как один силуэт с общим контуром
function blob(ctx, list, fill, stroke, lw = 0.07) {
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw * 2;
    for (const e of list) { ellipse(ctx, e[0], e[1], e[2], e[3] || e[2], e[4] || 0); ctx.stroke(); }
  }
  ctx.fillStyle = fill;
  for (const e of list) { ellipse(ctx, e[0], e[1], e[2], e[3] || e[2], e[4] || 0); ctx.fill(); }
}

function blushAt(ctx, x, y, rx = 0.16, ry = 0.1, col = 'rgba(255,120,160,0.45)') {
  ctx.fillStyle = col;
  ellipse(ctx, -x, y, rx, ry); ctx.fill();
  ellipse(ctx, x, y, rx, ry); ctx.fill();
}

// Глаза на тёмном пятне (маска енота): светлые, чтобы их было видно
function maskEyes(ctx, k, mood, t, x, y) {
  if (mood === 'normal' && !blinking(mood, t)) {
    for (const d of SIDES) {
      circle(ctx, d * x, y, 0.16); fillStroke(ctx, '#fff', null);
      circle(ctx, d * x + 0.02, y + 0.02, 0.1); fillStroke(ctx, '#1d1d24', null);
      circle(ctx, d * x + 0.06, y - 0.03, 0.04); fillStroke(ctx, '#fff', null);
    }
  } else k.eyes(mood, t, -x, x, y, mood === 'scared' ? '#1d1d24' : '#fff');
}

// ================== Хомячок: толстые щёчки и семечка в лапках ==================
const HAMSTER_HEAD = [[0, 0, 1.0, 0.86], [-0.64, 0.3, 0.46, 0.42], [0.64, 0.3, 0.46, 0.42]];
const HAMSTER_FACE = [[-0.6, 0.36, 0.4, 0.34], [0.6, 0.36, 0.4, 0.34], [0, 0.42, 0.44, 0.36]];
registerAnimal('hamster', (ctx, mood, t, k) => {
  const F = '#f7b25e', D = '#cf8636', W = '#fff8ee';
  k.body(F, D);
  ellipse(ctx, 0, 1.5, 0.64, 0.46); fillStroke(ctx, W, null);
  for (const d of SIDES) {
    circle(ctx, d * 0.62, -0.66, 0.27); fillStroke(ctx, F, D, 0.07);
    circle(ctx, d * 0.62, -0.64, 0.15); fillStroke(ctx, '#ffb3c6', null);
  }
  blob(ctx, HAMSTER_HEAD, F, D);
  blob(ctx, HAMSTER_FACE, W, null);
  // белая полосочка на лбу
  ellipse(ctx, 0, -0.42, 0.1, 0.24); fillStroke(ctx, '#ffe2bd', null);
  k.eyes(mood, t, -0.38, 0.38, -0.14, '#2b1d14');
  blushAt(ctx, 0.68, 0.34, 0.18, 0.11);
  ellipse(ctx, 0, 0.16, 0.11, 0.08); fillStroke(ctx, '#ff8fab', null);
  k.mouth(mood, 0.26, '#a0704a');
  k.whiskers(0.26, '#e2c39c');
  // семечка в розовых лапках
  const nib = opened(mood) ? Math.sin(t * 14) * 0.03 : 0;
  ctx.save(); ctx.translate(0, 0.96 + nib); ctx.rotate(0.2);
  ctx.beginPath(); ctx.moveTo(0, -0.27); ctx.quadraticCurveTo(0.19, -0.04, 0.13, 0.14); ctx.quadraticCurveTo(0, 0.27, -0.13, 0.14); ctx.quadraticCurveTo(-0.19, -0.04, 0, -0.27); ctx.closePath();
  fillStroke(ctx, '#4a4452', '#2f2a36', 0.04);
  ctx.strokeStyle = '#d9d4e2'; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(-0.06, -0.12); ctx.lineTo(-0.07, 0.14); ctx.moveTo(0.06, -0.12); ctx.lineTo(0.07, 0.14); ctx.stroke();
  ctx.restore();
  for (const d of SIDES) { circle(ctx, d * 0.17, 1.04 + nib, 0.1); fillStroke(ctx, '#ffc4d2', '#e89aae', 0.04); }
}, { hatTop: -0.88 });

// ================== Поросёнок: пятачок и ушки с загнутыми кончиками ==================
registerAnimal('piglet', (ctx, mood, t, k) => {
  const F = '#ffb7c9', D = '#e7869f', N = '#c95577';
  k.body(F, D);
  for (const d of SIDES) {
    ctx.save(); ctx.translate(d * 0.62, -0.58); ctx.rotate(d * (0.72 + Math.sin(t * 5 + d) * 0.05));
    ctx.beginPath(); ctx.moveTo(-0.38, 0.22); ctx.lineTo(-0.2, -0.22); ctx.lineTo(0.2, -0.22); ctx.lineTo(0.38, 0.22); ctx.closePath();
    fillStroke(ctx, F, D, 0.07);
    ctx.beginPath(); ctx.moveTo(-0.22, 0.14); ctx.lineTo(-0.12, -0.14); ctx.lineTo(0.12, -0.14); ctx.lineTo(0.22, 0.14); ctx.closePath();
    fillStroke(ctx, '#ff93b0', null);
    // кончик ушка загнут вперёд и свисает
    ctx.beginPath(); ctx.moveTo(-0.24, -0.24); ctx.quadraticCurveTo(0, -0.3, 0.24, -0.24); ctx.lineTo(0.02, 0.24); ctx.closePath();
    fillStroke(ctx, '#ffc4d4', D, 0.06);
    ctx.restore();
  }
  k.head(F, D);
  // хохолок
  ctx.strokeStyle = D; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(-0.04, -0.86); ctx.quadraticCurveTo(0.02, -1.12, 0.2, -1.04); ctx.quadraticCurveTo(0.28, -0.94, 0.14, -0.93); ctx.stroke();
  k.eyes(mood, t, -0.4, 0.4, -0.2, '#3a2430');
  k.blush();
  // пятачок
  ellipse(ctx, 0, 0.27, 0.38, 0.27); fillStroke(ctx, '#ff98b4', D, 0.06);
  for (const d of SIDES) { ellipse(ctx, d * 0.13, 0.27, 0.065, 0.11); fillStroke(ctx, DEF, null); }
  k.mouth(mood, 0.6, N);
}, { hatTop: -0.86 });

// ================== Лягушонок: глазки-бугорки сверху и широкая улыбка ==================
const FROG_HEAD = [[0, 0.05, 1.08, 0.8], [-0.45, -0.52, 0.34], [0.45, -0.52, 0.34]];
const FROG_TOP = { crown: -1.0, tiara: -0.98, party: -1.02, cap: -1.12, bow: -0.98, flower: -0.98 };
registerAnimal('frog', (ctx, mood, t, k) => {
  const F = '#7fd65a', D = '#4ea63a', B = '#dcf7b0', M = '#2f6b22';
  k.body(F, D);
  ellipse(ctx, 0, 1.52, 0.7, 0.5); fillStroke(ctx, B, null);
  blob(ctx, FROG_HEAD, F, D);
  // светлое горлышко и пятнышки
  ellipse(ctx, 0, 0.66, 0.56, 0.18); fillStroke(ctx, B, null);
  ctx.fillStyle = '#a6e683';
  circle(ctx, -0.12, -0.3, 0.07); ctx.fill(); circle(ctx, 0.16, -0.36, 0.05); ctx.fill(); circle(ctx, 0.02, -0.5, 0.045); ctx.fill();
  const white = !blinking(mood, t) && !opened(mood);
  if (white) for (const d of SIDES) { circle(ctx, d * 0.45, -0.54, 0.25); fillStroke(ctx, '#fff', null); }
  k.eyes(mood, t, -0.45, 0.45, -0.54, '#1d2a16', null, 0.85);
  for (const d of SIDES) { circle(ctx, d * 0.1, 0.06, 0.035); fillStroke(ctx, M, null); }
  blushAt(ctx, 0.66, 0.2, 0.18, 0.11, 'rgba(255,150,190,0.85)');
  ctx.lineCap = 'round';
  if (mood === 'scared') {
    ellipse(ctx, 0, 0.4, 0.13, 0.16); fillStroke(ctx, '#a63b4a', M, 0.05);
  } else if (opened(mood)) {
    ctx.beginPath(); ctx.moveTo(-0.52, 0.22); ctx.quadraticCurveTo(0, 0.38, 0.52, 0.22); ctx.quadraticCurveTo(0, 0.95, -0.52, 0.22); ctx.closePath();
    fillStroke(ctx, '#c4475c', M, 0.06);
    ellipse(ctx, 0, 0.52, 0.16, 0.08); fillStroke(ctx, '#ff8fa8', null);
  } else {
    ctx.strokeStyle = M; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(-0.55, 0.2); ctx.quadraticCurveTo(0, 0.58, 0.55, 0.2); ctx.stroke();
  }
}, { hatTop: (hat) => FROG_TOP[hat] ?? -1.0, glassesY: -0.5 });

// ================== Овечка: кудрявое облачко и висячие ушки ==================
const LAMB_WOOL = [[0, -0.05, 0.92, 0.86]];
for (let i = 0; i <= 8; i++) {
  const a = Math.PI * (0.92 + i * 0.145);
  LAMB_WOOL.push([Math.cos(a) * 0.84, Math.sin(a) * 0.8 - 0.05, 0.3]);
}
LAMB_WOOL.push([-0.86, 0.32, 0.26], [0.86, 0.32, 0.26]);
const LAMB_BANGS = [[-0.38, -0.5, 0.21], [-0.13, -0.6, 0.24], [0.14, -0.6, 0.24], [0.39, -0.5, 0.21]];
const LAMB_BODY = [[0, 1.55, 1.05, 0.7], [-0.6, 1.0, 0.3], [-0.2, 0.92, 0.3], [0.2, 0.92, 0.3], [0.6, 1.0, 0.3]];
registerAnimal('lamb', (ctx, mood, t, k) => {
  const W = '#ffffff', WS = '#d6cde4', FACE = '#ffe1d3', FS = '#eeb7a3';
  blob(ctx, LAMB_BODY, W, WS);
  for (const d of SIDES) {
    ctx.save(); ctx.translate(d * 0.82, -0.12); ctx.rotate(d * (0.5 + Math.sin(t * 4 + d) * 0.06));
    ellipse(ctx, d * 0.26, 0, 0.36, 0.17); fillStroke(ctx, FACE, FS, 0.06);
    ellipse(ctx, d * 0.28, 0, 0.23, 0.08); fillStroke(ctx, '#ffb3c4', null);
    ctx.restore();
  }
  blob(ctx, LAMB_WOOL, W, WS);
  ellipse(ctx, 0, 0.14, 0.66, 0.7); fillStroke(ctx, FACE, FS, 0.05);
  blob(ctx, LAMB_BANGS, W, WS, 0.03);
  k.eyes(mood, t, -0.3, 0.3, -0.02, '#3a2a3a', null, 0.9);
  blushAt(ctx, 0.44, 0.3, 0.13, 0.08);
  ctx.beginPath(); ctx.moveTo(-0.1, 0.24); ctx.lineTo(0.1, 0.24); ctx.lineTo(0, 0.34); ctx.closePath();
  fillStroke(ctx, '#ff9db6', null);
  k.mouth(mood, 0.37, '#b07a7a');
}, { hatTop: -1.02 });

// ================== Ёжик: иголки, остренький носик и яблочко на спинке ==================
registerAnimal('hedgehog', (ctx, mood, t, k) => {
  const SP = '#a06b46', SPD = '#6c4329', FACE = '#f6dcb4', FS = '#d2a67c';
  const puff = mood === 'scared' ? 1.16 + Math.sin(t * 40) * 0.02 : mood === 'turbo' ? 1.05 : 1;
  k.body('#f3d3a6', FS);
  // иголки: зубчатая шубка вокруг головы
  const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, n = 34;
  for (let layer = 0; layer < 2; layer++) {
    const off = layer ? (a1 - a0) / n : 0, rOut = (layer ? 1.3 : 1.48) * puff;
    ctx.beginPath();
    ctx.moveTo(0, 0.3);
    for (let i = 0; i <= n - layer * 2; i++) {
      const a = a0 + off + ((a1 - a0) * i) / n, r = i % 2 ? rOut : 0.92;
      ctx.lineTo(Math.cos(a) * r * 1.04, Math.sin(a) * r * 0.94 + 0.05);
    }
    ctx.closePath();
    fillStroke(ctx, layer ? '#8a5838' : SP, layer ? null : SPD, 0.07);
  }
  // яблочко на иголках
  ctx.save(); ctx.translate(-0.98, -0.8); ctx.rotate(-0.3);
  circle(ctx, 0, 0, 0.23); fillStroke(ctx, '#ff4f5e', '#cf2f40', 0.05);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ellipse(ctx, -0.08, -0.08, 0.06, 0.04, -0.6); ctx.fill();
  ctx.strokeStyle = '#7a4c27'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, -0.2); ctx.lineTo(0.02, -0.32); ctx.stroke();
  ellipse(ctx, 0.12, -0.3, 0.1, 0.05, -0.4); fillStroke(ctx, '#5ecf3e', null);
  ctx.restore();
  // мордочка
  ellipse(ctx, 0, 0.12, 0.9, 0.78); fillStroke(ctx, FACE, FS, 0.06);
  ctx.save();
  ellipse(ctx, 0, 0.12, 0.9, 0.78); ctx.clip();
  ctx.beginPath(); ctx.moveTo(-1, -1);
  for (let i = 0; i <= 8; i++) {
    const x = -0.95 + (1.9 * i) / 8, base = -0.3 + 0.42 * (x / 0.92) * (x / 0.92);
    ctx.lineTo(x, base + (i % 2 ? 0.2 : -0.02));
  }
  ctx.lineTo(1, -1); ctx.closePath();
  fillStroke(ctx, SP, null);
  ctx.restore();
  k.eyes(mood, t, -0.34, 0.34, 0.0, '#2b1d14', null, 0.9);
  blushAt(ctx, 0.55, 0.32, 0.15, 0.09);
  ellipse(ctx, 0, 0.36, 0.3, 0.22); fillStroke(ctx, '#fde9cf', null);
  circle(ctx, 0, 0.24, 0.12); fillStroke(ctx, '#2b1d14', null);
  circle(ctx, -0.04, 0.2, 0.035); fillStroke(ctx, '#fff', null);
  k.mouth(mood, 0.4, '#7a5038');
}, { hatTop: -1.2 });

// ================== Белочка: пушистый хвост, кисточки на ушках, зубки ==================
// хвост — цепочка пушистых кружков вдоль двух кривых Безье (считается один раз)
const SQ_TAIL = [], SQ_TAIL_IN = [];
{
  const segs = [[[0.5, 1.25], [1.55, 1.1], [1.7, 0.0], [1.4, -0.72]], [[1.4, -0.72], [1.2, -1.22], [0.72, -1.3], [0.62, -0.95]]];
  const bez = (a, b, c, d, u) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d;
  const N = 16;
  for (let i = 0; i < N; i++) {
    const v = i / (N - 1), sg = v < 0.6 ? segs[0] : segs[1], u = v < 0.6 ? v / 0.6 : (v - 0.6) / 0.4;
    const x = bez(sg[0][0], sg[1][0], sg[2][0], sg[3][0], u), y = bez(sg[0][1], sg[1][1], sg[2][1], sg[3][1], u);
    const r = 0.24 + 0.2 * Math.sin(Math.PI * Math.min(1, v * 1.15));
    SQ_TAIL.push([x, y, r + 0.04]);
    if (i > 0 && i < N - 1) SQ_TAIL_IN.push(x - 0.05, y + 0.02);
  }
}
const SQ_CHEEKS = [[-0.4, 0.34, 0.4, 0.34], [0.4, 0.34, 0.4, 0.34], [0, 0.5, 0.36, 0.3]];
registerAnimal('squirrel', (ctx, mood, t, k) => {
  const F = '#dd7536', D = '#ad5121', L = '#ffe6c8', T = '#e4813f';
  k.body(F, D);
  ellipse(ctx, 0, 1.5, 0.6, 0.48); fillStroke(ctx, L, null);
  // пушистый хвост
  ctx.save(); ctx.translate(0.6, 1.2); ctx.rotate(Math.sin(t * 3) * 0.06 + (mood === 'turbo' ? -0.12 : 0)); ctx.translate(-0.6, -1.2);
  blob(ctx, SQ_TAIL, T, D);
  ctx.strokeStyle = '#f5a262'; ctx.lineWidth = 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(SQ_TAIL_IN[0], SQ_TAIL_IN[1]);
  for (let i = 2; i < SQ_TAIL_IN.length; i += 2) ctx.lineTo(SQ_TAIL_IN[i], SQ_TAIL_IN[i + 1]);
  ctx.stroke();
  ctx.restore();
  // ушки с кисточками
  for (const d of SIDES) {
    ctx.save(); ctx.translate(d * 0.56, -0.62); ctx.rotate(d * 0.22);
    ctx.beginPath(); ctx.moveTo(-0.32, 0.2); ctx.lineTo(0, -0.55); ctx.lineTo(0.32, 0.2); ctx.closePath();
    fillStroke(ctx, F, D, 0.07);
    ctx.beginPath(); ctx.moveTo(-0.16, 0.1); ctx.lineTo(0, -0.3); ctx.lineTo(0.16, 0.1); ctx.closePath();
    fillStroke(ctx, '#ffc4a3', null);
    ctx.beginPath(); ctx.moveTo(-0.12, -0.42); ctx.quadraticCurveTo(-0.14, -0.78, d * 0.1, -0.95); ctx.quadraticCurveTo(0.02, -0.72, 0.13, -0.42); ctx.closePath();
    fillStroke(ctx, D, null);
    ctx.restore();
  }
  k.head(F, D);
  // светлые щёчки
  blob(ctx, SQ_CHEEKS, L, null);
  k.eyes(mood, t, -0.38, 0.38, -0.16, '#2b1d14');
  k.blush();
  ellipse(ctx, 0, 0.16, 0.13, 0.09); fillStroke(ctx, '#5a2e1a', null);
  k.mouth(mood, 0.27, '#8a4a2a');
  // зубки
  const ty = mood === 'scared' ? 0.32 : 0.3;
  rrect(ctx, -0.095, ty, 0.09, 0.14, 0.03); fillStroke(ctx, '#fff', '#c9b9a8', 0.025);
  rrect(ctx, 0.005, ty, 0.09, 0.14, 0.03); fillStroke(ctx, '#fff', '#c9b9a8', 0.025);
}, { hatTop: -0.88 });

// ================== Совушка: перьевые ушки, большие жёлтые глаза, клювик ==================
const OWL_DISKS = [[-0.42, -0.04, 0.44], [0.42, -0.04, 0.44]];
const OWL_MARKS = [[-0.22, 1.3], [0.22, 1.3], [0, 1.5], [-0.28, 1.72], [0.28, 1.72]];
registerAnimal('owl', (ctx, mood, t, k) => {
  const F = '#a9774c', D = '#76502f', L = '#f6e4c6', LS = '#d8bb93';
  k.body(F, D);
  ellipse(ctx, 0, 1.55, 0.62, 0.5); fillStroke(ctx, L, null);
  ctx.strokeStyle = '#caa47b'; ctx.lineWidth = 0.05;
  for (const [x, y] of OWL_MARKS) {
    ctx.beginPath(); ctx.moveTo(x - 0.09, y - 0.05); ctx.lineTo(x, y + 0.04); ctx.lineTo(x + 0.09, y - 0.05); ctx.stroke();
  }
  const flap = opened(mood) ? Math.sin(t * 16) * 0.2 : 0;
  for (const d of SIDES) { ellipse(ctx, d * 0.98, 1.3, 0.26, 0.55, d * (0.35 + flap)); fillStroke(ctx, '#8c5f3a', D, 0.07); }
  // ушки-пёрышки (с двумя кончиками)
  for (const d of SIDES) {
    ctx.beginPath();
    ctx.moveTo(d * 0.36, -0.74);
    ctx.quadraticCurveTo(d * 0.62, -0.92, d * 0.74, -1.22);
    ctx.lineTo(d * 0.84, -1.0);
    ctx.lineTo(d * 1.04, -1.12);
    ctx.quadraticCurveTo(d * 1.02, -0.72, d * 0.92, -0.42);
    ctx.closePath();
    fillStroke(ctx, F, D, 0.07);
  }
  ellipse(ctx, 0, 0, 1.05, 0.92); fillStroke(ctx, F, D, 0.07);
  blob(ctx, OWL_DISKS, L, LS, 0.03);
  // бровки-пёрышки
  ctx.strokeStyle = D; ctx.lineWidth = 0.07;
  ctx.beginPath(); ctx.moveTo(-0.26, -0.62); ctx.lineTo(0, -0.36); ctx.lineTo(0.26, -0.62); ctx.stroke();
  k.eyes(mood, t, -0.42, 0.42, -0.04, '#3a2414', '#ffb72e', 1.25);
  blushAt(ctx, 0.7, 0.38, 0.15, 0.09);
  if (opened(mood) || mood === 'scared') {
    ellipse(ctx, 0, 0.38, 0.09, 0.08); fillStroke(ctx, '#c4475c', null);
    ctx.beginPath(); ctx.moveTo(-0.13, 0.18); ctx.lineTo(0.13, 0.18); ctx.lineTo(0, 0.36); ctx.closePath();
    fillStroke(ctx, '#ffa53a', '#e07f16', 0.05);
    ctx.beginPath(); ctx.moveTo(-0.09, 0.44); ctx.lineTo(0.09, 0.44); ctx.lineTo(0, 0.54); ctx.closePath();
    fillStroke(ctx, '#ffa53a', '#e07f16', 0.05);
  } else {
    ctx.beginPath(); ctx.moveTo(-0.13, 0.18); ctx.lineTo(0.13, 0.18); ctx.lineTo(0, 0.46); ctx.closePath();
    fillStroke(ctx, '#ffa53a', '#e07f16', 0.05);
  }
}, { hatTop: -0.9, glassesY: -0.06 });

// ================== Енотик: чёрная маска и полосатый хвост ==================
const TAIL_DASH = [0.24, 0.2];
registerAnimal('raccoon', (ctx, mood, t, k) => {
  const F = '#a5a5b5', D = '#6c6c80', W = '#f6f4fa', M = '#3a3946';
  k.body(F, D);
  ellipse(ctx, 0, 1.55, 0.55, 0.45); fillStroke(ctx, '#d9d8e2', null);
  // полосатый хвост слева
  const sw = Math.sin(t * 3) * 0.08;
  ctx.beginPath(); ctx.moveTo(-0.7, 1.35); ctx.bezierCurveTo(-1.5, 1.1, -1.5 + sw, 0.2, -1.32 + sw, -0.55);
  ctx.lineCap = 'round';
  ctx.strokeStyle = D; ctx.lineWidth = 0.62; ctx.stroke();
  ctx.strokeStyle = F; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.lineCap = 'butt'; ctx.strokeStyle = M; ctx.setLineDash(TAIL_DASH); ctx.stroke(); ctx.setLineDash([]);
  ctx.lineCap = 'round';
  circle(ctx, -1.32 + sw, -0.55, 0.25); fillStroke(ctx, M, null);
  k.ear(-0.6, -0.32, F, M, D);
  k.ear(0.6, 0.32, F, M, D);
  k.head(F, D);
  // белые бровки и мордочка
  for (const d of SIDES) { ellipse(ctx, d * 0.4, -0.46, 0.27, 0.13, d * 0.15); fillStroke(ctx, W, null); }
  ellipse(ctx, 0, 0.42, 0.5, 0.36); fillStroke(ctx, W, null);
  // маска
  ctx.beginPath();
  ctx.moveTo(-0.98, 0.1);
  ctx.quadraticCurveTo(-0.9, -0.32, -0.45, -0.32);
  ctx.quadraticCurveTo(-0.15, -0.32, 0, -0.16);
  ctx.quadraticCurveTo(0.15, -0.32, 0.45, -0.32);
  ctx.quadraticCurveTo(0.9, -0.32, 0.98, 0.1);
  ctx.quadraticCurveTo(0.72, 0.24, 0.42, 0.16);
  ctx.quadraticCurveTo(0.12, 0.08, 0, 0.1);
  ctx.quadraticCurveTo(-0.12, 0.08, -0.42, 0.16);
  ctx.quadraticCurveTo(-0.72, 0.24, -0.98, 0.1);
  ctx.closePath();
  fillStroke(ctx, M, null);
  // светлая полоска на носу
  ellipse(ctx, 0, -0.42, 0.07, 0.22); fillStroke(ctx, W, null);
  maskEyes(ctx, k, mood, t, 0.42, -0.08);
  blushAt(ctx, 0.62, 0.34, 0.15, 0.09);
  ellipse(ctx, 0, 0.25, 0.15, 0.1); fillStroke(ctx, '#2b2a33', null);
  k.mouth(mood, 0.37, '#5a5866');
}, { hatTop: -0.88 });

// ================== Коала: большие пушистые уши и большой нос ==================
registerAnimal('koala', (ctx, mood, t, k) => {
  const F = '#aab4c4', D = '#7b879b', IN = '#f4eff7';
  k.body(F, D);
  ellipse(ctx, 0, 1.55, 0.6, 0.48); fillStroke(ctx, '#e3e6ee', null);
  for (const d of SIDES) {
    const wig = Math.sin(t * 3 + d) * 0.03;
    circle(ctx, d * 0.9, -0.5 + wig, 0.5); fillStroke(ctx, F, D, 0.07);
    circle(ctx, d * 0.86, -0.46 + wig, 0.32); fillStroke(ctx, IN, null);
    ctx.strokeStyle = '#d8d3e2'; ctx.lineWidth = 0.04;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(d * (0.72 + i * 0.02), -0.46 + i * 0.12 + wig); ctx.lineTo(d * 1.02, -0.5 + i * 0.16 + wig); ctx.stroke(); }
  }
  k.head(F, D);
  ellipse(ctx, 0, 0.42, 0.55, 0.36); fillStroke(ctx, '#c3cbd8', null);
  k.eyes(mood, t, -0.42, 0.42, -0.14, '#2b2a33', null, 0.85);
  k.blush();
  ellipse(ctx, 0, 0.16, 0.23, 0.3); fillStroke(ctx, '#3d3a48', '#2b2933', 0.04);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(ctx, -0.07, 0.04, 0.06, 0.1, 0.3); ctx.fill();
  k.mouth(mood, 0.52, '#4a4656');
}, { hatTop: -0.86 });

// ================== Обезьянка: мордочка-сердечко, круглые ушки, банан ==================
const MONKEY_FACE = [[-0.32, -0.14, 0.36, 0.38], [0.32, -0.14, 0.36, 0.38], [0, 0.38, 0.64, 0.42]];
registerAnimal('monkey', (ctx, mood, t, k) => {
  const F = '#9a5f35', D = '#6c4022', FACE = '#f8d4b0', FS = '#d9a77e';
  k.body(F, D);
  ellipse(ctx, 0, 1.55, 0.58, 0.46); fillStroke(ctx, FACE, null);
  for (const d of SIDES) {
    circle(ctx, d * 1.0, -0.02, 0.32); fillStroke(ctx, F, D, 0.07);
    circle(ctx, d * 1.0, -0.02, 0.19); fillStroke(ctx, FACE, null);
  }
  k.head(F, D);
  // чубчик
  ctx.beginPath(); ctx.moveTo(-0.22, -0.82); ctx.quadraticCurveTo(-0.15, -1.15, 0.08, -1.08); ctx.quadraticCurveTo(-0.05, -0.98, 0.02, -0.86); ctx.quadraticCurveTo(0.2, -1.1, 0.34, -0.95); ctx.quadraticCurveTo(0.2, -0.9, 0.2, -0.8); ctx.closePath();
  fillStroke(ctx, F, D, 0.06);
  blob(ctx, MONKEY_FACE, FACE, FS, 0.03);
  k.eyes(mood, t, -0.32, 0.32, -0.12, '#2b1d14');
  blushAt(ctx, 0.5, 0.32, 0.14, 0.09);
  for (const d of SIDES) { ellipse(ctx, d * 0.08, 0.2, 0.04, 0.05); fillStroke(ctx, '#7a4c2f', null); }
  k.mouth(mood, 0.36, '#7a4c2f');
  // банан в лапке
  ctx.save(); ctx.translate(0.62, 0.86); ctx.rotate(-0.7 + (opened(mood) ? Math.sin(t * 10) * 0.12 : 0));
  ctx.beginPath(); ctx.moveTo(-0.42, -0.16); ctx.quadraticCurveTo(0, 0.34, 0.46, -0.16); ctx.quadraticCurveTo(0, 0.1, -0.42, -0.16); ctx.closePath();
  fillStroke(ctx, '#ffe066', '#e0b020', 0.05);
  ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(0.44, -0.16); ctx.lineTo(0.54, -0.26); ctx.stroke();
  ctx.restore();
  circle(ctx, 0.5, 1.0, 0.14); fillStroke(ctx, FACE, FS, 0.04);
}, { hatTop: -0.9 });

// ================== Слонёнок: большие ушки и хоботок ==================
// хобот: up = 0 — висит с завитком, 1 — поднят вбок (мимо глазика)
const TRUNK_DOWN = [0, -0.02, 0, 0.45, 0.02, 0.74, 0.22, 0.84, 0.42, 0.9, 0.46, 0.7];
const TRUNK_UP = [0, -0.02, 0, 0.42, 0.42, 0.62, 0.7, 0.34, 0.9, 0.14, 0.8, -0.06];
const TRUNK = new Array(12).fill(0);
function trunkPath(ctx, up) {
  for (let i = 0; i < 12; i++) TRUNK[i] = TRUNK_DOWN[i] + (TRUNK_UP[i] - TRUNK_DOWN[i]) * up;
  const p = TRUNK;
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]);
  ctx.quadraticCurveTo(p[8], p[9], p[10], p[11]);
}
registerAnimal('elephant', (ctx, mood, t, k) => {
  const F = '#b7c6dc', D = '#8293b0', IN = '#ffc3d6';
  k.body(F, D);
  for (const d of SIDES) {
    const flap = Math.sin(t * 5 + d) * 0.06 + (mood === 'turbo' ? 0.15 : 0);
    ctx.save(); ctx.translate(d * 0.7, -0.05); ctx.rotate(d * (0.15 + flap));
    ellipse(ctx, d * 0.42, 0.05, 0.6, 0.74); fillStroke(ctx, F, D, 0.07);
    ellipse(ctx, d * 0.46, 0.08, 0.4, 0.54); fillStroke(ctx, IN, null);
    ctx.restore();
  }
  ellipse(ctx, 0, 0, 0.92, 0.88); fillStroke(ctx, F, D, 0.07);
  // волосики на макушке
  ctx.strokeStyle = D; ctx.lineWidth = 0.05;
  for (const x of [-0.1, 0, 0.1]) { ctx.beginPath(); ctx.moveTo(x, -0.86); ctx.lineTo(x * 1.8, -1.08); ctx.stroke(); }
  k.eyes(mood, t, -0.4, 0.4, -0.2, '#2b2a3a');
  blushAt(ctx, 0.56, 0.22, 0.15, 0.09);
  const up = opened(mood) ? 1 : mood === 'scared' ? 0.45 : 0;
  if (up > 0.4) k.mouth(mood, 0.34, '#5a6480');
  ctx.lineCap = 'round';
  trunkPath(ctx, up);
  ctx.strokeStyle = D; ctx.lineWidth = 0.4; ctx.stroke();
  ctx.strokeStyle = F; ctx.lineWidth = 0.27; ctx.stroke();
  // складочки на хоботе
  ctx.strokeStyle = D; ctx.lineWidth = 0.035;
  for (const y of [0.2, 0.34]) { ctx.beginPath(); ctx.moveTo(-0.1, y); ctx.lineTo(0.1, y - up * 0.04); ctx.stroke(); }
  if (mood === 'happy' && (t % 1.6) < 0.8) {
    // фонтанчик из хобота
    ctx.fillStyle = '#7fd0ff';
    const p = (t % 0.8) / 0.8;
    for (let i = 0; i < 3; i++) { circle(ctx, 0.82 + (i - 1) * 0.12 * (1 + p), -0.3 - p * 0.45 + Math.abs(i - 1) * 0.08, 0.07); ctx.fill(); }
  }
}, { hatTop: -0.86 });

// ================== Капибара: квадратная мордочка, спокойные глазки, мандаринка ==================
registerAnimal('capybara', (ctx, mood, t, k, hat) => {
  const F = '#b8895a', D = '#86603a', M = '#a37548';
  k.body(F, D);
  for (const d of SIDES) { circle(ctx, d * 0.64, -0.74, 0.19); fillStroke(ctx, '#9c7148', D, 0.06); circle(ctx, d * 0.64, -0.72, 0.09); fillStroke(ctx, '#6b4a2c', null); }
  rrect(ctx, -0.92, -0.82, 1.84, 1.66, 0.6); fillStroke(ctx, F, D, 0.07);
  // большой носик-мордочка
  rrect(ctx, -0.6, 0.02, 1.2, 0.76, 0.34); fillStroke(ctx, M, null);
  for (const d of SIDES) {
    ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 0.08;
    ctx.beginPath(); ctx.moveTo(d * 0.2, 0.16); ctx.quadraticCurveTo(d * 0.27, 0.24, d * 0.22, 0.32); ctx.stroke();
  }
  k.eyes(mood, t, -0.42, 0.42, -0.28, '#2b1d14', null, 0.8);
  // спокойные полуприкрытые глазки
  if (mood === 'normal' && !blinking(mood, t)) {
    for (const d of SIDES) {
      ctx.beginPath(); ctx.ellipse(d * 0.42, -0.28, 0.17, 0.2, 0, Math.PI, 0); ctx.closePath();
      fillStroke(ctx, F, null);
      ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 0.06;
      ctx.beginPath(); ctx.moveTo(d * 0.42 - 0.16, -0.28); ctx.lineTo(d * 0.42 + 0.16, -0.28); ctx.stroke();
    }
  }
  blushAt(ctx, 0.66, 0.08, 0.15, 0.09);
  k.mouth(mood, 0.5, '#5a3a22');
  // мандаринка на голове (если нет шапочки)
  if (!hat || hat === 'none' || hat === 'glasses' || hat === 'headphones' || hat === 'bow') {
    const b = Math.sin(t * 2) * 0.02;
    circle(ctx, -0.06, -1.04 + b, 0.27); fillStroke(ctx, '#ffa21f', '#e07a00', 0.05);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ellipse(ctx, -0.15, -1.13 + b, 0.07, 0.045, -0.5); ctx.fill();
    ellipse(ctx, 0.07, -1.31 + b, 0.13, 0.06, -0.5); fillStroke(ctx, '#4fbf3a', null);
  }
}, { hatTop: -0.8, glassesY: -0.26 });

// ================== Тигрёнок: полоски и белые щёчки ==================
const TIGER_CHEEKS = [[-0.24, 0.36, 0.32, 0.27], [0.24, 0.36, 0.32, 0.27], [0, 0.5, 0.3, 0.26]];
function stripe(ctx, x0, y0, x1, y1, w) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = (-dy / len) * w, ny = (dx / len) * w;
  ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.quadraticCurveTo(x1, y1, x0 - nx, y0 - ny); ctx.closePath(); ctx.fill();
}
registerAnimal('tiger', (ctx, mood, t, k) => {
  const F = '#ffa23d', D = '#d9731d', W = '#fff8ef', S = '#47302a';
  k.body(F, D);
  ellipse(ctx, 0, 1.55, 0.55, 0.45); fillStroke(ctx, W, null);
  ctx.fillStyle = S;
  for (const d of SIDES) { stripe(ctx, d * 1.0, 1.25, d * 0.7, 1.3, 0.07); stripe(ctx, d * 0.98, 1.55, d * 0.68, 1.55, 0.07); }
  for (const d of SIDES) {
    circle(ctx, d * 0.7, -0.64, 0.28); fillStroke(ctx, F, D, 0.07);
    circle(ctx, d * 0.7, -0.62, 0.14); fillStroke(ctx, W, null);
  }
  ellipse(ctx, 0, 0, 1.02, 0.9); fillStroke(ctx, F, D, 0.07);
  // полоски
  ctx.fillStyle = S;
  stripe(ctx, 0, -0.92, 0, -0.5, 0.1);
  for (const d of SIDES) {
    stripe(ctx, d * 0.27, -0.88, d * 0.2, -0.6, 0.085);
    stripe(ctx, d * 1.04, -0.14, d * 0.66, -0.08, 0.1);
    stripe(ctx, d * 1.0, 0.16, d * 0.68, 0.16, 0.09);
  }
  // белые пятнышки над глазками и щёчки
  for (const d of SIDES) { ellipse(ctx, d * 0.36, -0.42, 0.15, 0.08); fillStroke(ctx, W, null); }
  blob(ctx, TIGER_CHEEKS, W, null);
  k.eyes(mood, t, -0.38, 0.38, -0.16, '#2b1d14');
  k.blush();
  ctx.beginPath(); ctx.moveTo(-0.13, 0.17); ctx.quadraticCurveTo(0, 0.13, 0.13, 0.17); ctx.lineTo(0, 0.3); ctx.closePath();
  fillStroke(ctx, '#ff8fa8', '#e06a86', 0.03);
  k.mouth(mood, 0.33, '#8a5a4a');
  k.whiskers(0.36, '#e8ddd0');
}, { hatTop: -0.88 });

// ================== Львёнок: пышная грива ==================
const MANE = [];
for (let i = 0; i < 13; i++) { const a = (i / 13) * TAU; MANE.push([Math.cos(a) * 1.0, Math.sin(a) * 0.98 + 0.04, 0.42]); }
MANE.push([0, 0.04, 1.05]);
const LION_MUZZLE = [[-0.2, 0.36, 0.26, 0.22], [0.2, 0.36, 0.26, 0.22], [0, 0.5, 0.24, 0.2]];
const LION_DOTS = [[0.16, 0.36], [0.28, 0.42], [0.2, 0.48]];
registerAnimal('lion', (ctx, mood, t, k) => {
  const M = '#e07a2c', MD = '#b4581a', F = '#ffd27a', D = '#e0a040', W = '#fff3d6';
  k.body(F, D);
  ellipse(ctx, 0, 1.6, 0.55, 0.42); fillStroke(ctx, W, null);
  ctx.save();
  ctx.rotate(mood === 'turbo' ? Math.sin(t * 20) * 0.04 : Math.sin(t * 2) * 0.02);
  blob(ctx, MANE, M, MD);
  // светлые завитки на гриве
  ctx.strokeStyle = '#f59a48'; ctx.lineWidth = 0.06;
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * TAU + 0.24;
    ctx.beginPath(); ctx.arc(Math.cos(a) * 1.08, Math.sin(a) * 1.06 + 0.04, 0.16, a - 1.3, a + 0.6); ctx.stroke();
  }
  ctx.restore();
  for (const d of SIDES) { circle(ctx, d * 0.6, -0.58, 0.24); fillStroke(ctx, F, D, 0.06); circle(ctx, d * 0.6, -0.56, 0.12); fillStroke(ctx, '#f5a85a', null); }
  ellipse(ctx, 0, 0.06, 0.82, 0.78); fillStroke(ctx, F, D, 0.06);
  // чёлочка из гривы
  ctx.beginPath(); ctx.moveTo(-0.3, -0.66); ctx.quadraticCurveTo(-0.1, -0.5, 0.0, -0.68); ctx.quadraticCurveTo(0.1, -0.5, 0.3, -0.66); ctx.quadraticCurveTo(0, -0.84, -0.3, -0.66); ctx.closePath();
  fillStroke(ctx, M, null);
  blob(ctx, LION_MUZZLE, W, null);
  k.eyes(mood, t, -0.34, 0.34, -0.1, '#3a2414');
  blushAt(ctx, 0.52, 0.22, 0.14, 0.09);
  ctx.beginPath(); ctx.moveTo(-0.14, 0.18); ctx.quadraticCurveTo(0, 0.13, 0.14, 0.18); ctx.lineTo(0, 0.32); ctx.closePath();
  fillStroke(ctx, '#a8553a', null);
  k.mouth(mood, 0.36, '#8a4a2a');
  ctx.fillStyle = '#d9a46a';
  for (const d of SIDES) for (const [x, y] of LION_DOTS) { circle(ctx, d * x, y, 0.025); ctx.fill(); }
}, { hatTop: (hat) => (hat === 'cap' ? -1.08 : -1.2) });

// ================== Дракончик: рожки, крылышки, гребешок (главный приз) ==================
const DRAGON_SPARKS = [[-1.4, -1.15, 0.2], [1.45, -1.3, 0.24], [1.55, 0.25, 0.16], [-1.55, 0.1, 0.14]];
registerAnimal('dragon', (ctx, mood, t, k) => {
  const F = '#a98bff', D = '#7457d6', B = '#ffe8a3', WING = '#ff9fd0', H = '#ffd84d', HD = '#e0a91a';
  // волшебные искорки вокруг (главный приз!)
  ctx.fillStyle = '#ffe066';
  for (let i = 0; i < DRAGON_SPARKS.length; i++) {
    const [x, y, r] = DRAGON_SPARKS[i], tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
    starPath(ctx, x, y, r * (0.5 + tw * 0.6), r * 0.22, 4); ctx.fill();
  }
  // крылышки
  const flap = Math.sin(t * (opened(mood) ? 14 : 4)) * (opened(mood) ? 0.22 : 0.08);
  for (const d of SIDES) {
    ctx.save(); ctx.translate(d * 0.7, 0.75); ctx.rotate(d * (-0.1 + flap));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(d * 0.4, -1.05, d * 1.05, -1.25);
    ctx.quadraticCurveTo(d * 1.0, -0.85, d * 1.1, -0.6);
    ctx.quadraticCurveTo(d * 0.85, -0.6, d * 0.85, -0.35);
    ctx.quadraticCurveTo(d * 0.6, -0.4, d * 0.55, -0.12);
    ctx.quadraticCurveTo(d * 0.3, -0.2, 0, 0);
    ctx.closePath();
    fillStroke(ctx, WING, D, 0.07);
    ctx.strokeStyle = D; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d * 0.85, -0.38); ctx.moveTo(0, 0); ctx.lineTo(d * 1.0, -0.66); ctx.stroke();
    ctx.restore();
  }
  k.body(F, D);
  ctx.beginPath(); ctx.ellipse(0, 1.6, 0.55, 0.5, 0, 0, TAU); fillStroke(ctx, B, null);
  ctx.strokeStyle = '#f0c96a'; ctx.lineWidth = 0.04;
  for (const y of [1.3, 1.5, 1.7]) { ctx.beginPath(); ctx.moveTo(-0.4, y); ctx.quadraticCurveTo(0, y + 0.08, 0.4, y); ctx.stroke(); }
  // рожки
  for (const d of SIDES) {
    ctx.beginPath();
    ctx.moveTo(d * 0.42, -0.72);
    ctx.quadraticCurveTo(d * 0.6, -1.0, d * 0.86, -1.22);
    ctx.quadraticCurveTo(d * 0.84, -0.92, d * 0.74, -0.6);
    ctx.closePath();
    fillStroke(ctx, H, HD, 0.05);
  }
  // плавнички-ушки
  for (const d of SIDES) {
    ctx.beginPath(); ctx.moveTo(d * 0.86, -0.38); ctx.lineTo(d * 1.32, -0.42); ctx.lineTo(d * 1.12, -0.24); ctx.lineTo(d * 1.3, -0.1); ctx.lineTo(d * 0.9, 0.06); ctx.closePath();
    fillStroke(ctx, WING, D, 0.06);
  }
  k.head(F, D);
  // гребешок
  for (const [x, y, s] of [[0, -0.86, 0.2], [-0.24, -0.82, 0.14], [0.24, -0.82, 0.14]]) {
    ctx.beginPath(); ctx.moveTo(x - s * 0.8, y + 0.06); ctx.quadraticCurveTo(x - s * 0.2, y - s * 1.2, x + s * 0.2, y - s * 1.6); ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s * 0.8, y + 0.06); ctx.closePath();
    fillStroke(ctx, '#ff7eb6', '#d9468b', 0.04);
  }
  ellipse(ctx, 0, 0.4, 0.54, 0.38); fillStroke(ctx, '#cbb8ff', null);
  k.eyes(mood, t, -0.38, 0.38, -0.16, '#3a2060', mood === 'normal' ? '#ffcf3a' : null, 1.1);
  if (mood === 'normal' && !blinking(mood, t)) {
    for (const d of SIDES) { circle(ctx, d * 0.38 + 0.07, -0.25, 0.065); fillStroke(ctx, '#fff', null); }
  }
  k.blush();
  for (const d of SIDES) { ellipse(ctx, d * 0.13, 0.27, 0.05, 0.035); fillStroke(ctx, '#7457d6', null); }
  k.mouth(mood, 0.42, '#5a3a8a');
  if (opened(mood)) {
    // клычок
    ctx.beginPath(); ctx.moveTo(0.06, 0.44); ctx.lineTo(0.16, 0.43); ctx.lineTo(0.11, 0.55); ctx.closePath();
    fillStroke(ctx, '#fff', null);
  }
  if (mood === 'turbo') {
    // огонёк вперёд (машина едет вправо)
    const fl = 1 + Math.sin(t * 30) * 0.12;
    ctx.save(); ctx.translate(0.26, 0.56); ctx.rotate(0.35); ctx.scale(fl, fl);
    ctx.beginPath(); ctx.moveTo(0, -0.12); ctx.quadraticCurveTo(0.7, -0.3, 1.0, 0); ctx.quadraticCurveTo(0.7, 0.3, 0, 0.12); ctx.closePath();
    fillStroke(ctx, '#ff8a3d', null);
    ctx.beginPath(); ctx.moveTo(0.05, -0.06); ctx.quadraticCurveTo(0.45, -0.16, 0.66, 0); ctx.quadraticCurveTo(0.45, 0.16, 0.05, 0.06); ctx.closePath();
    fillStroke(ctx, '#ffe066', null);
    ctx.restore();
  } else if (mood === 'happy') {
    // сердечки из носика
    const p = (t * 0.9) % 1;
    ctx.globalAlpha = 1 - p;
    heartPath(ctx, -0.25 - p * 0.3, 0.1 - p * 0.9, 0.12 + p * 0.06); fillStroke(ctx, '#ff6fae', null);
    heartPath(ctx, 0.3 + p * 0.3, -0.05 - p * 0.8, 0.1 + p * 0.06); fillStroke(ctx, '#ff6fae', null);
    ctx.globalAlpha = 1;
  } else if (mood === 'normal' && (t % 4) < 1.2) {
    // колечки дыма
    const p = (t % 4) / 1.2;
    ctx.globalAlpha = 0.7 * (1 - p);
    ctx.fillStyle = '#ffffff';
    for (const d of SIDES) { circle(ctx, d * (0.13 + p * 0.2), 0.2 - p * 0.6, 0.06 + p * 0.08); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}, { hatTop: -0.9 });
