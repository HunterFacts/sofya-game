// Наклейки на машину.
// Гараж → вкладка ⭐: большая машина и палитра наклеек. Наклейку тянут пальцем на кузов (или просто
// нажимают — она сама прилетит на свободное место), двигают, увеличивают щипком или кнопками +/−,
// убирают в корзинку или просто стаскивают с машины. До 14 наклеек на каждую машину.
// В игре наклейки рисуются на кузове через событие 'car:stickers' (ctx уже обрезан по краске).
//
// Сохранение: save.stickers[vehicleId] = [{id, x, y, s, r}] — координаты машины (метры),
// s — размер наклейки (метры), r — поворот (радианы). save.stickerPacks[packId] = 1 — купленные наборы.
import { addDefaults } from '../save.js';
import { registerGarageTab } from '../ui.js';
import { drawCar, drawAnimal } from '../art.js';
import { vehicleById } from '../vehicles.js';
import { TAU, heartPath, starPath, circle, ellipse, rrect, fillStroke } from '../draw-utils.js';

addDefaults({ stickers: {}, stickerPacks: {} });

const MAX = 14;                       // наклеек на одну машину
const S_MIN = 0.24, S_MAX = 1.05, S_DEF = 0.42;

// ================== КАРТИНКИ НАКЛЕЕК ==================
// Каждая рисуется в круге радиусом ~1 с центром (0,0); белая «вырубка» по контуру добавляется сама.
function vgrad(c, y0, y1, a, b) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a); g.addColorStop(1, b);
  return g;
}
function shine(c, x, y, rx, ry, rot = -0.6) {
  c.fillStyle = 'rgba(255,255,255,0.75)';
  ellipse(c, x, y, rx, ry, rot); c.fill();
}
function cuteFace(c, y, col = '#5a2a4a', s = 1) {
  c.fillStyle = col;
  circle(c, -0.22 * s, y, 0.075 * s); c.fill();
  circle(c, 0.22 * s, y, 0.075 * s); c.fill();
  c.strokeStyle = col; c.lineWidth = 0.06 * s;
  c.beginPath(); c.arc(0, y + 0.05 * s, 0.13 * s, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
  c.fillStyle = 'rgba(255,110,150,0.5)';
  ellipse(c, -0.38 * s, y + 0.12 * s, 0.1 * s, 0.06 * s); c.fill();
  ellipse(c, 0.38 * s, y + 0.12 * s, 0.1 * s, 0.06 * s); c.fill();
}
function sparkle(c, x, y, r, col) {
  c.fillStyle = col;
  starPath(c, x, y, r, r * 0.28, 4); c.fill();
}
const heart = (light, base, dark) => (c) => {
  heartPath(c, 0, 0.25, 1.5);
  fillStroke(c, vgrad(c, -0.8, 0.8, light, base), dark, 0.08);
  shine(c, -0.42, -0.36, 0.2, 0.11);
  circle(c, -0.18, -0.5, 0.05); c.fill();
};
const star = (light, base, dark, face) => (c) => {
  starPath(c, 0, 0.1, 1.02, 0.52);
  c.lineJoin = 'round';
  c.lineWidth = 0.2; c.strokeStyle = dark; c.stroke();
  const g = vgrad(c, -0.9, 0.9, light, base);
  c.lineWidth = 0.1; c.strokeStyle = g; c.stroke();
  c.fillStyle = g; c.fill();
  if (face) cuteFace(c, 0.12, '#7a4a10');
  else shine(c, -0.18, -0.35, 0.1, 0.18, 0.4);
};
// мордочка зверька из игры (только голова)
const animalFace = (id, mood) => (c) => {
  c.save();
  c.translate(0, id === 'unicorn' ? 0.28 : 0.2);
  c.scale(0.72, 0.72);
  c.beginPath();
  c.ellipse(0, 0, 1.06, 0.96, 0, 0, TAU);
  c.rect(-1.8, -2.4, 3.6, 2.4);
  c.clip();
  drawAnimal(c, id, mood, 1, 'none');
  c.restore();
};

const ART = {
  heart: heart('#ffb3d6', '#ff4f9a', '#d9307a'),
  heartRed: heart('#ff9a9a', '#ff3b5c', '#c91f3d'),
  heartLilac: heart('#dcc6ff', '#a46bff', '#7a45d6'),
  heartSky: heart('#b5e4ff', '#4fb3ff', '#2a86d6'),
  star: star('#fff6a8', '#ffc83a', '#e09a12', true),
  starPink: star('#ffd6ea', '#ff7ab5', '#d9468b', false),
  marissa: animalFace('marissa', 'normal'),
  paw(c) {
    const g = vgrad(c, -0.9, 0.9, '#ff9ccc', '#ff4f9a');
    c.beginPath();
    c.moveTo(0, 0.02);
    c.bezierCurveTo(0.42, 0.02, 0.72, 0.5, 0.58, 0.74);
    c.bezierCurveTo(0.46, 0.94, 0.18, 0.84, 0, 0.84);
    c.bezierCurveTo(-0.18, 0.84, -0.46, 0.94, -0.58, 0.74);
    c.bezierCurveTo(-0.72, 0.5, -0.42, 0.02, 0, 0.02);
    fillStroke(c, g, '#d9307a', 0.07);
    for (const [x, y, r] of [[-0.68, -0.2, -0.35], [-0.25, -0.62, -0.1], [0.25, -0.62, 0.1], [0.68, -0.2, 0.35]]) {
      ellipse(c, x, y, 0.21, 0.27, r);
      fillStroke(c, g, '#d9307a', 0.07);
    }
    shine(c, -0.22, 0.25, 0.12, 0.07);
  },
  flower(c) {
    for (let i = 0; i < 5; i++) {
      c.save(); c.rotate((i * TAU) / 5);
      ellipse(c, 0, -0.52, 0.36, 0.46);
      fillStroke(c, vgrad(c, -1, 0, '#ffd6ea', '#ff8cc6'), '#e0609f', 0.07);
      c.restore();
    }
    circle(c, 0, 0, 0.38);
    fillStroke(c, '#ffe14d', '#e3b52c', 0.07);
    cuteFace(c, -0.04, '#8a5a10', 0.85);
  },
  rainbow(c) {
    const cols = ['#ff5a5a', '#ff9f43', '#ffd93b', '#5ee07a', '#4fb3ff', '#a97bff'];
    c.lineCap = 'butt';
    for (let i = 0; i < cols.length; i++) {
      c.strokeStyle = cols[i]; c.lineWidth = 0.1;
      c.beginPath(); c.arc(0, 0.38, 0.9 - i * 0.09, Math.PI, TAU); c.stroke();
    }
    c.lineCap = 'round';
    for (const d of [-1, 1]) {
      c.beginPath();
      c.arc(d * 0.72, 0.42, 0.22, 0, TAU);
      c.arc(d * 0.5, 0.48, 0.18, 0, TAU);
      c.arc(d * 0.92, 0.5, 0.16, 0, TAU);
      c.fillStyle = '#ffffff'; c.fill();
      c.strokeStyle = '#d9cfe6'; c.lineWidth = 0.04;
      c.beginPath(); c.moveTo(d * 0.36, 0.64); c.lineTo(d * 1.06, 0.64); c.stroke();
    }
  },
  butterfly(c) {
    for (const d of [-1, 1]) {
      ellipse(c, d * 0.46, -0.28, 0.44, 0.52, d * 0.5);
      fillStroke(c, vgrad(c, -0.8, 0.2, '#dcc6ff', '#a46bff'), '#7a45d6', 0.07);
      ellipse(c, d * 0.4, 0.4, 0.3, 0.36, -d * 0.4);
      fillStroke(c, vgrad(c, 0, 0.8, '#ffc2e0', '#ff7ab5'), '#d9468b', 0.07);
      c.fillStyle = '#ffffff';
      circle(c, d * 0.5, -0.32, 0.13); c.fill();
      circle(c, d * 0.4, 0.42, 0.09); c.fill();
      c.strokeStyle = '#6b3a8a'; c.lineWidth = 0.05;
      c.beginPath(); c.moveTo(d * 0.04, -0.5); c.quadraticCurveTo(d * 0.12, -0.85, d * 0.32, -0.9); c.stroke();
      circle(c, d * 0.32, -0.9, 0.07); fillStroke(c, '#ff4f9a', null);
    }
    ellipse(c, 0, 0.05, 0.11, 0.56);
    fillStroke(c, '#6b3a8a', null);
  },
  crown(c) {
    c.beginPath();
    c.moveTo(-0.86, 0.6); c.lineTo(-0.92, -0.32); c.lineTo(-0.44, 0.06); c.lineTo(0, -0.6);
    c.lineTo(0.44, 0.06); c.lineTo(0.92, -0.32); c.lineTo(0.86, 0.6); c.closePath();
    fillStroke(c, vgrad(c, -0.6, 0.6, '#fff3a8', '#ffc83a'), '#d99a00', 0.08);
    for (const [x, y] of [[-0.92, -0.42], [0, -0.72], [0.92, -0.42]]) { circle(c, x, y, 0.13); fillStroke(c, '#ff7ab5', '#d9468b', 0.05); }
    rrect(c, -0.86, 0.3, 1.72, 0.3, 0.06); fillStroke(c, '#ffb020', '#d99a00', 0.05);
    for (const [x, col] of [[-0.48, '#4fb3ff'], [0, '#ff4f9a'], [0.48, '#4fb3ff']]) { circle(c, x, 0.45, 0.1); fillStroke(c, col, null); }
    shine(c, -0.5, -0.05, 0.08, 0.16, 0.2);
  },
  bolt(c) {
    c.beginPath();
    c.moveTo(0.22, -1.0); c.lineTo(-0.58, 0.14); c.lineTo(-0.04, 0.14); c.lineTo(-0.26, 1.0);
    c.lineTo(0.6, -0.2); c.lineTo(0.06, -0.2); c.closePath();
    fillStroke(c, vgrad(c, -1, 1, '#fff6a8', '#ffc83a'), '#e08a00', 0.09);
    shine(c, -0.02, -0.4, 0.06, 0.2, 0.55);
  },
  smile(c) {
    circle(c, 0, 0, 0.9);
    fillStroke(c, vgrad(c, -0.9, 0.9, '#fff38a', '#ffc83a'), '#e0a01a', 0.08);
    c.fillStyle = '#5a3a10';
    ellipse(c, -0.3, -0.2, 0.1, 0.16); c.fill();
    ellipse(c, 0.3, -0.2, 0.1, 0.16); c.fill();
    c.fillStyle = '#fff';
    circle(c, -0.27, -0.26, 0.04); c.fill(); circle(c, 0.33, -0.26, 0.04); c.fill();
    c.beginPath(); c.moveTo(-0.45, 0.12); c.quadraticCurveTo(0, 0.72, 0.45, 0.12); c.closePath();
    fillStroke(c, '#c4475c', '#5a3a10', 0.07);
    c.fillStyle = 'rgba(255,110,150,0.5)';
    ellipse(c, -0.58, 0.18, 0.15, 0.09); c.fill(); ellipse(c, 0.58, 0.18, 0.15, 0.09); c.fill();
  },
  music(c) {
    const col = '#8d5fe0';
    c.strokeStyle = col; c.lineWidth = 0.13;
    c.beginPath(); c.moveTo(-0.22, 0.52); c.lineTo(-0.22, -0.6); c.stroke();
    c.beginPath(); c.moveTo(0.72, 0.36); c.lineTo(0.72, -0.76); c.stroke();
    c.beginPath(); c.moveTo(-0.28, -0.52); c.lineTo(0.78, -0.7); c.lineTo(0.78, -0.42); c.lineTo(-0.28, -0.24); c.closePath();
    fillStroke(c, col, col, 0.08);
    ellipse(c, -0.46, 0.56, 0.3, 0.22, -0.4); fillStroke(c, vgrad(c, 0.3, 0.8, '#c9a8ff', col), '#6b3a8a', 0.06);
    ellipse(c, 0.48, 0.4, 0.3, 0.22, -0.4); fillStroke(c, vgrad(c, 0.2, 0.6, '#c9a8ff', col), '#6b3a8a', 0.06);
    sparkle(c, -0.72, -0.5, 0.2, '#ffc83a');
  },
  cherry(c) {
    c.strokeStyle = '#5a9a2a'; c.lineWidth = 0.08;
    c.beginPath(); c.moveTo(-0.38, 0.22); c.quadraticCurveTo(-0.2, -0.45, 0.12, -0.78); c.stroke();
    c.beginPath(); c.moveTo(0.42, 0.3); c.quadraticCurveTo(0.35, -0.35, 0.12, -0.78); c.stroke();
    ellipse(c, 0.45, -0.72, 0.32, 0.15, -0.45); fillStroke(c, '#7ee08f', '#3fa85a', 0.05);
    for (const [x, y] of [[-0.4, 0.42], [0.44, 0.5]]) {
      circle(c, x, y, 0.4);
      fillStroke(c, vgrad(c, y - 0.4, y + 0.4, '#ff8a8a', '#e02a45'), '#b51f38', 0.07);
      shine(c, x - 0.15, y - 0.16, 0.1, 0.06);
    }
  },
  // --- сладости ---
  cupcake(c) {
    c.beginPath(); c.moveTo(-0.62, 0.12); c.lineTo(0.62, 0.12); c.lineTo(0.46, 0.92); c.lineTo(-0.46, 0.92); c.closePath();
    fillStroke(c, '#7fc8ff', '#3f8fd1', 0.07);
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.06;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 0.22, 0.18); c.lineTo(i * 0.17, 0.86); c.stroke(); }
    c.beginPath();
    c.arc(-0.42, 0.02, 0.3, 0, TAU); c.arc(0.42, 0.02, 0.3, 0, TAU);
    c.arc(-0.18, -0.24, 0.34, 0, TAU); c.arc(0.2, -0.22, 0.34, 0, TAU); c.arc(0, -0.5, 0.26, 0, TAU);
    fillStroke(c, '#ffb3d6', null);
    for (const [x, y, col, r] of [[-0.3, -0.2, '#ffe14d', 0.5], [0.15, -0.35, '#7ee08f', -0.4], [0.35, -0.05, '#4fb3ff', 0.9], [-0.08, 0.0, '#ffffff', 0.2]]) {
      c.save(); c.translate(x, y); c.rotate(r); c.fillStyle = col; rrect(c, -0.09, -0.03, 0.18, 0.06, 0.03); c.fill(); c.restore();
    }
    circle(c, 0.05, -0.78, 0.15); fillStroke(c, '#ff3b5c', '#c91f3d', 0.05);
  },
  icecream(c) {
    c.beginPath(); c.moveTo(-0.42, 0.05); c.lineTo(0.42, 0.05); c.lineTo(0, 1.0); c.closePath();
    fillStroke(c, '#f2bd72', '#c98a3a', 0.07);
    c.save(); c.clip();
    c.strokeStyle = 'rgba(160,100,40,0.45)'; c.lineWidth = 0.05;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 0.2 - 0.5, 0); c.lineTo(i * 0.2 + 0.5, 1); c.moveTo(i * 0.2 + 0.5, 0); c.lineTo(i * 0.2 - 0.5, 1); c.stroke(); }
    c.restore();
    circle(c, 0, -0.12, 0.5); fillStroke(c, vgrad(c, -0.6, 0.4, '#ffd6ea', '#ff8cc6'), '#e0609f', 0.07);
    circle(c, 0, -0.62, 0.38); fillStroke(c, vgrad(c, -1, -0.2, '#c9fff0', '#6fe0c0'), '#2fb08f', 0.07);
    circle(c, 0.08, -0.98, 0.13); fillStroke(c, '#ff3b5c', '#c91f3d', 0.05);
    shine(c, -0.22, -0.3, 0.1, 0.06); shine(c, -0.15, -0.75, 0.08, 0.05);
  },
  lolly(c) {
    c.strokeStyle = '#ffffff'; c.lineWidth = 0.16;
    c.beginPath(); c.moveTo(0, 0.25); c.lineTo(0, 1.0); c.stroke();
    c.strokeStyle = '#d9cfe6'; c.lineWidth = 0.04;
    c.beginPath(); c.moveTo(0.08, 0.3); c.lineTo(0.08, 0.98); c.stroke();
    circle(c, 0, -0.28, 0.66); fillStroke(c, '#ff6fae', '#d9307a', 0.07);
    c.save(); circle(c, 0, -0.28, 0.62); c.clip();
    c.strokeStyle = '#ffffff'; c.lineWidth = 0.13;
    c.beginPath();
    for (let i = 0; i <= 60; i++) { const a = i * 0.3, r = i * 0.011; c.lineTo(Math.cos(a) * r, -0.28 + Math.sin(a) * r); }
    c.stroke(); c.restore();
    shine(c, -0.3, -0.58, 0.12, 0.07);
  },
  donut(c) {
    circle(c, 0, 0, 0.88); fillStroke(c, '#e8a35a', '#b8732e', 0.07);
    c.beginPath();
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU, r = 0.7 + Math.sin(a * 7) * 0.06; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); fillStroke(c, '#ff8cc6', '#e0609f', 0.05);
    circle(c, 0, 0, 0.24); fillStroke(c, '#fff7fb', '#b8732e', 0.06);
    const cols = ['#ffe14d', '#7ee08f', '#4fb3ff', '#ffffff', '#a97bff'];
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39, r = 0.38 + (i % 3) * 0.1;
      c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(a * 1.7);
      c.fillStyle = cols[i % cols.length]; rrect(c, -0.08, -0.025, 0.16, 0.05, 0.025); c.fill(); c.restore();
    }
  },
  // --- волшебство ---
  unicorn: animalFace('unicorn', 'happy'),
  wand(c) {
    c.lineCap = 'round';
    c.strokeStyle = '#8d5fe0'; c.lineWidth = 0.16;
    c.beginPath(); c.moveTo(-0.72, 0.82); c.lineTo(0.08, -0.02); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 0.05;
    for (let i = 0; i < 4; i++) { const k = 0.15 + i * 0.2, x = -0.72 + 0.8 * k, y = 0.82 - 0.84 * k; c.beginPath(); c.moveTo(x - 0.05, y - 0.05); c.lineTo(x + 0.05, y + 0.05); c.stroke(); }
    starPath(c, 0.28, -0.3, 0.6, 0.3);
    c.lineJoin = 'round'; c.lineWidth = 0.14; c.strokeStyle = '#e09a12'; c.stroke();
    c.fillStyle = vgrad(c, -0.9, 0.3, '#fff6a8', '#ffc83a'); c.fill();
    sparkle(c, -0.5, -0.5, 0.22, '#ff7ab5');
    sparkle(c, 0.75, 0.45, 0.18, '#4fb3ff');
    sparkle(c, -0.1, 0.55, 0.12, '#ffc83a');
  },
  gem(c) {
    c.beginPath(); c.moveTo(-0.85, -0.3); c.lineTo(-0.45, -0.75); c.lineTo(0.45, -0.75); c.lineTo(0.85, -0.3); c.lineTo(0, 0.88); c.closePath();
    fillStroke(c, vgrad(c, -0.8, 0.9, '#d2f2ff', '#4fb3ff'), '#2a86d6', 0.07);
    c.strokeStyle = 'rgba(42,134,214,0.6)'; c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(-0.85, -0.3); c.lineTo(0.85, -0.3);
    c.moveTo(-0.45, -0.75); c.lineTo(-0.25, -0.3); c.lineTo(0, 0.88); c.lineTo(0.25, -0.3); c.lineTo(0.45, -0.75);
    c.moveTo(0, -0.75); c.lineTo(-0.25, -0.3); c.moveTo(0, -0.75); c.lineTo(0.25, -0.3);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath(); c.moveTo(-0.6, -0.36); c.lineTo(-0.38, -0.36); c.lineTo(-0.1, 0.4); c.closePath(); c.fill();
    sparkle(c, 0.62, -0.72, 0.22, '#ffffff');
  },
  sparkles(c) {
    sparkle(c, -0.18, 0.12, 0.82, '#ffd23b');
    sparkle(c, -0.18, 0.12, 0.42, '#fff6c4');
    sparkle(c, 0.6, -0.55, 0.38, '#ff7ab5');
    sparkle(c, 0.58, 0.6, 0.28, '#a97bff');
  },
  // --- космос ---
  planet(c) {
    c.strokeStyle = '#ffc83a'; c.lineWidth = 0.14;
    ellipse(c, 0, 0, 1.0, 0.28, -0.35); c.stroke();
    circle(c, 0, 0, 0.6);
    fillStroke(c, vgrad(c, -0.6, 0.6, '#dcc6ff', '#8d5fe0'), '#6b3a8a', 0.06);
    c.save(); circle(c, 0, 0, 0.6); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(-0.7, -0.25, 1.4, 0.12); c.fillRect(-0.7, 0.12, 1.4, 0.1);
    c.restore();
    c.beginPath(); c.ellipse(0, 0, 1.0, 0.28, -0.35, 0, Math.PI); c.strokeStyle = '#ffc83a'; c.lineWidth = 0.14; c.stroke();
    shine(c, -0.25, -0.3, 0.12, 0.07);
    sparkle(c, 0.75, -0.7, 0.2, '#fff38a');
  },
  rocket(c) {
    c.save(); c.rotate(0.6);
    c.beginPath(); c.moveTo(-0.2, 0.62); c.quadraticCurveTo(0, 1.05, 0.2, 0.62); c.closePath();
    fillStroke(c, '#ffc83a', '#ff8a3d', 0.07);
    for (const d of [-1, 1]) {
      c.beginPath(); c.moveTo(d * 0.3, 0.1); c.lineTo(d * 0.6, 0.62); c.lineTo(d * 0.24, 0.55); c.closePath();
      fillStroke(c, '#ff5a7a', '#c91f3d', 0.06);
    }
    c.beginPath(); c.moveTo(0, -1.0); c.bezierCurveTo(0.5, -0.6, 0.42, 0.2, 0.28, 0.62); c.lineTo(-0.28, 0.62); c.bezierCurveTo(-0.42, 0.2, -0.5, -0.6, 0, -1.0);
    fillStroke(c, vgrad(c, -1, 0.6, '#ffffff', '#dcd6ea'), '#9a90b0', 0.06);
    c.beginPath(); c.moveTo(0, -1.0); c.bezierCurveTo(0.25, -0.8, 0.32, -0.6, 0.35, -0.5); c.lineTo(-0.35, -0.5); c.bezierCurveTo(-0.32, -0.6, -0.25, -0.8, 0, -1.0);
    fillStroke(c, '#ff5a7a', null);
    circle(c, 0, -0.12, 0.18); fillStroke(c, '#8fd3ff', '#ff6fae', 0.07);
    c.restore();
  },
  moon(c) {
    c.beginPath(); c.arc(-0.05, 0.02, 0.85, 0, TAU); c.arc(0.4, -0.25, 0.72, 0, TAU, true);
    fillStroke(c, vgrad(c, -0.9, 0.9, '#fff6b0', '#ffd23b'), '#e0a01a', 0.07);
    c.strokeStyle = '#8a5a10'; c.lineWidth = 0.06;
    c.beginPath(); c.arc(-0.5, 0.0, 0.08, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.beginPath(); c.arc(-0.42, 0.3, 0.12, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,110,150,0.5)'; ellipse(c, -0.65, 0.2, 0.09, 0.06); c.fill();
    sparkle(c, 0.55, 0.45, 0.25, '#ffd23b');
    sparkle(c, 0.75, -0.65, 0.16, '#ffffff');
  },
  ufo(c) {
    c.beginPath(); c.arc(0, -0.08, 0.44, Math.PI, TAU); c.closePath();
    fillStroke(c, vgrad(c, -0.55, 0, '#e6f6ff', '#8fd3ff'), '#4f9fd6', 0.06);
    // котик в тарелке
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(-0.24, -0.2); c.lineTo(-0.2, -0.42); c.lineTo(-0.08, -0.3); c.lineTo(0.08, -0.3); c.lineTo(0.2, -0.42); c.lineTo(0.24, -0.2); c.closePath(); c.fill();
    circle(c, 0, -0.16, 0.2); c.fill();
    c.fillStyle = '#2a2a30'; circle(c, -0.08, -0.17, 0.035); c.fill(); circle(c, 0.08, -0.17, 0.035); c.fill();
    ellipse(c, 0, 0.12, 0.95, 0.3); fillStroke(c, vgrad(c, -0.2, 0.4, '#f1edf8', '#b9b0cf'), '#7e7498', 0.07);
    const cols = ['#ffe14d', '#ff6fae', '#7ee08f', '#ff6fae', '#ffe14d'];
    for (let i = 0; i < 5; i++) { circle(c, -0.6 + i * 0.3, 0.16, 0.07); fillStroke(c, cols[i], null); }
    c.fillStyle = 'rgba(255,240,150,0.5)';
    c.beginPath(); c.moveTo(-0.25, 0.4); c.lineTo(0.25, 0.4); c.lineTo(0.45, 0.95); c.lineTo(-0.45, 0.95); c.closePath(); c.fill();
  },
  // --- друзья ---
  bunny: animalFace('bunny', 'happy'),
  panda: animalFace('panda', 'happy'),
  fox: animalFace('fox', 'happy'),
  penguin: animalFace('penguin', 'happy'),
};

const FREE = ['heart', 'heartRed', 'heartLilac', 'heartSky', 'star', 'starPink', 'marissa', 'paw',
  'flower', 'rainbow', 'butterfly', 'crown', 'bolt', 'smile', 'music', 'cherry'];
const PACKS = [
  { id: 'sweet', price: 120, items: ['cupcake', 'icecream', 'lolly', 'donut'] },
  { id: 'magic', price: 200, items: ['unicorn', 'wand', 'gem', 'sparkles'] },
  { id: 'space', price: 300, items: ['planet', 'rocket', 'moon', 'ufo'] },
  { id: 'friends', price: 400, items: ['bunny', 'panda', 'fox', 'penguin'] },
];

// ================== СПРАЙТЫ С БЕЛОЙ ВЫРУБКОЙ ==================
const SP = 160;                 // размер спрайта, px
const SP_ART = SP * 0.4;        // радиус картинки внутри спрайта
const SP_OUT = SP * 0.06;       // толщина белой каймы
const sprites = new Map();
function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function dilate(src, r, color) {
  const c = makeCanvas(SP), x = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    x.drawImage(src, Math.cos(a) * r, Math.sin(a) * r);
    x.drawImage(src, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
  }
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, SP, SP);
  return c;
}
// Готовая наклейка (canvas SP×SP) или null
export function stickerSprite(id) {
  let s = sprites.get(id);
  if (s !== undefined) return s;
  const draw = ART[id];
  if (!draw) { sprites.set(id, null); return null; }
  const art = makeCanvas(SP), a = art.getContext('2d');
  a.translate(SP / 2, SP / 2);
  a.scale(SP_ART, SP_ART);
  a.lineJoin = 'round'; a.lineCap = 'round';
  try { draw(a); } catch (e) { console.error('sticker', id, e); }
  s = makeCanvas(SP);
  const o = s.getContext('2d');
  o.drawImage(dilate(art, SP_OUT + 2.5, 'rgba(150,70,120,0.35)'), 0, 1.5);
  o.drawImage(dilate(art, SP_OUT, '#ffffff'), 0, 0);
  o.drawImage(art, 0, 0);
  sprites.set(id, s);
  return s;
}
// Уменьшенные копии (80 и 40 px): маленькая наклейка в игре без «ряби» на телефоне
const mips = new Map();
function spriteFor(id, px) {
  const big = stickerSprite(id);
  if (!big || px > 70) return big;
  let m = mips.get(id);
  if (!m) {
    m = [];
    let src = big;
    for (const size of [80, 40]) {
      const c = makeCanvas(size), x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, size, size);
      m.push(c);
      src = c;
    }
    mips.set(id, m);
  }
  return px > 36 ? m[0] : m[1];
}

// ================== НАКЛЕЙКИ НА МАШИНЕ (игра, меню, гараж) ==================
let api = null;
let maskMode = false;                                     // рисуем маску краски (см. maskFor)
const ED = { active: false, skip: null, pop: new WeakMap() }; // состояние редактора для отрисовки

function drawStickers(ctx, info) {
  if (maskMode) { ctx.fillStyle = '#ff00ff'; ctx.fillRect(-30, -30, 60, 60); return; }
  const all = api && api.save.stickers;
  const list = all && all[info.vehicle.id];
  if (!list || !list.length) return;
  const now = ED.active ? performance.now() : 0;
  const tm = ctx.getTransform(), k = Math.hypot(tm.a, tm.b); // пикселей на метр
  for (let i = 0; i < list.length; i++) {
    const st = list[i];
    if (st === ED.skip) continue;
    const img = spriteFor(st.id, st.s * k);
    if (!img) continue;
    let s = st.s;
    if (ED.active) {
      const p = ED.pop.get(st);
      if (p) {
        const k = (now - p) / 260;
        if (k < 1) s *= 1 + 0.32 * (1 - k) * Math.cos(k * Math.PI * 2);
        else ED.pop.delete(st);
      }
    }
    ctx.save();
    ctx.translate(st.x, st.y);
    if (st.r) ctx.rotate(st.r);
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

// ================== ГЕОМЕТРИЯ МАШИНЫ ==================
function carBounds(v) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
  for (const p of v.hull) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); }
  const ph = v.phys;
  let wb = -Infinity;
  for (const a of ph.anchors) wb = Math.max(wb, a.y + ph.rest - 0.07 + ph.wheelR);
  return { x0: x0 - 0.25, x1: x1 + 0.25, y0: y0 - 0.78, y1: wb + 0.1, ground: wb };
}
function restState(v, rot = 0) {
  const ph = v.phys;
  return { x: 0, y: 0, a: 0, vehicle: v, wheels: ph.anchors.map((a) => ({ x: a.x, y: a.y + ph.rest - 0.07, rot })) };
}

// Маска «куда можно клеить»: машина рисуется, а вместо наклеек кузов заливается пурпурным.
// Окна, бамперы и фары рисуются поверх — туда наклейка не попадёт.
const masks = new Map();
function maskFor(v) {
  let m = masks.get(v.id);
  if (m) return m;
  const B = carBounds(v), K = 40;
  const w = Math.ceil((B.x1 - B.x0) * K), h = Math.ceil((B.y1 - B.y0) * K);
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(K, 0, 0, K, -B.x0 * K, -B.y0 * K);
  maskMode = true;
  try { drawCar(ctx, restState(v), { ...api.save.look, vehicle: v.id, paint: 'white' }, { mood: 'normal', t: 1 }); }
  catch (e) { console.error(e); }
  finally { maskMode = false; }
  const d = ctx.getImageData(0, 0, w, h).data;
  const bits = new Uint8Array(w * h);
  let sx = 0, sy = 0, n = 0;
  for (let i = 0, j = 0; i < bits.length; i++, j += 4) {
    if (d[j + 3] > 200 && d[j] > 150 && d[j + 2] > 150 && d[j + 1] < 90) { bits[i] = 1; sx += i % w; sy += (i / w) | 0; n++; }
  }
  m = { B, K, w, h, bits, spots: [], cx: n ? B.x0 + sx / n / K : 0, cy: n ? B.y0 + sy / n / K : 0 };
  // места для «прилёта» наклейки: там, где наклейка обычного размера почти целиком на краске
  for (let y = B.y0; y < B.y1; y += 0.07) {
    for (let x = B.x0; x < B.x1; x += 0.07) {
      if (isPaint(m, x, y) && coverage(m, x, y, S_DEF * 0.4) >= 0.85) m.spots.push({ x, y });
    }
  }
  masks.set(v.id, m);
  return m;
}
// Какая часть наклейки радиусом r (центр x,y) окажется на краске: 0..1
const DISK = [];
for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9.5) DISK.push(i / 3, j / 3);
function coverage(m, x, y, r) {
  let n = 0;
  for (let k = 0; k < DISK.length; k += 2) if (isPaint(m, x + DISK[k] * r, y + DISK[k + 1] * r)) n++;
  return n / (DISK.length / 2);
}
// Куда приклеить наклейку, отпущенную в точке (x, y): туда же, если её хорошо видно,
// иначе — в ближайшее место на кузове, где её видно. null — отпустили мимо машины.
function placeFor(m, x, y, size) {
  const r = size * 0.4;
  if (coverage(m, x, y, r) >= 0.5) return { x, y };
  if (coverage(m, x, y, 0.45) === 0) return null; // рядом нет краски — мимо машины
  const R = 1.6, step = 0.06;
  let best = null, bs = -Infinity, alt = null, as = -Infinity;
  for (let dy = -R; dy <= R; dy += step) {
    for (let dx = -R; dx <= R; dx += step) {
      const d = Math.hypot(dx, dy);
      if (d > R || !isPaint(m, x + dx, y + dy)) continue;
      const cov = coverage(m, x + dx, y + dy, r);
      const sc = cov * 0.6 - d;
      if (cov >= 0.72 && sc > bs) { bs = sc; best = { x: x + dx, y: y + dy }; }
      if (cov * 2 - d > as) { as = cov * 2 - d; alt = { x: x + dx, y: y + dy }; }
    }
  }
  return best || alt;
}
function isPaint(m, x, y) {
  const px = Math.floor((x - m.B.x0) * m.K), py = Math.floor((y - m.B.y0) * m.K);
  return px >= 0 && py >= 0 && px < m.w && py < m.h && m.bits[py * m.w + px] === 1;
}

// ================== ЗВУКИ ==================
const sfx = {
  slap() { const s = api.sound; s.noise(0.06, 0.22, 2600, 700); s.tone(520, 0.12, 'sine', 0.13, 0, undefined, 1040); },
  peel() { api.sound.noise(0.09, 0.12, 900, 3200); },
  bigger() { api.sound.tone(660, 0.09, 'triangle', 0.1, 0, undefined, 990); },
  smaller() { api.sound.tone(880, 0.09, 'triangle', 0.1, 0, undefined, 560); },
  sparkle() { [1319, 1568, 2093].forEach((f, i) => api.sound.tone(f, 0.16, 'triangle', 0.07, i * 0.06)); },
};

// ================== СТИЛИ ==================
const CSS = `
/* с новыми вкладками гаража ряд вкладок не помещается на узком экране — переносим */
#garage > .tabs { max-width: 100%; flex-wrap: wrap; justify-content: center; row-gap: 6px; }
#garage.stk-mode #garagePreview { display: none; }
#garage.stk-mode #cards { display: block; overflow: hidden; padding: 2px 0 0; touch-action: none; }
@media (orientation: landscape) {
  #garage.stk-mode { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-rows: auto minmax(0, 1fr); gap: 6px 10px; align-items: center; }
  #garage.stk-mode > .shop-head { display: contents; }
  #garage.stk-mode #garageBack { grid-area: 1 / 1; }
  #garage.stk-mode > .tabs { grid-area: 1 / 2; justify-self: center; }
  #garage.stk-mode > .shop-head > .coins-pill { grid-area: 1 / 3; }
  #garage.stk-mode #cards { grid-area: 2 / 1 / 3 / 4; align-self: stretch; height: auto; min-height: 0; }
}
.stk-root { position: relative; width: 100%; height: 100%; display: flex; gap: 8px; touch-action: none; }
.stk-stage {
  position: relative; flex: 1; min-width: 0; min-height: 0; overflow: hidden; touch-action: none;
  border-radius: 26px; border: 4px solid #fff;
  background:
    radial-gradient(ellipse 70% 22% at 50% 88%, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%),
    radial-gradient(circle at 18% 20%, rgba(255,255,255,0.7) 0 3px, transparent 4px) 0 0 / 46px 46px,
    linear-gradient(#fff4fa, #ffd9ec);
  box-shadow: 0 5px 0 rgba(160, 60, 120, 0.22);
}
.stk-cv { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
.stk-tool {
  position: absolute; z-index: 2; width: 56px; height: 56px; border-radius: 50%; background: #fff;
  box-shadow: 0 4px 0 rgba(160, 60, 120, 0.3); display: grid; place-items: center;
  font-size: 30px; font-weight: 900; color: var(--pink); line-height: 1; touch-action: none;
  transition: transform 0.12s, opacity 0.2s, background 0.2s;
}
.stk-tool:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(160, 60, 120, 0.3); }
.stk-tool.off { opacity: 0.35; }
.stk-trash { left: 8px; bottom: 8px; font-size: 28px; }
.stk-trash.hot { transform: scale(1.3); background: #ffe1ec; }
.stk-trash.gulp { animation: stkGulp 0.4s; }
.stk-sizes { position: absolute; z-index: 2; display: flex; gap: 10px; }
.stk-sizes .stk-tool { position: relative; }
.stk-stage.side .stk-sizes { right: 8px; top: 50%; transform: translateY(-50%); flex-direction: column; }
.stk-stage.bottom .stk-sizes { right: 8px; bottom: 8px; }
.stk-dots { position: absolute; z-index: 1; display: flex; gap: 4px; pointer-events: none; }
.stk-dots i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255, 255, 255, 0.9); box-shadow: inset 0 0 0 2px #ffc2df; }
.stk-dots i.on { background: var(--pink); box-shadow: none; }
.stk-dots.full { animation: shake 0.35s; }
.stk-stage.side .stk-dots { left: 31px; top: 14px; flex-direction: column; }
.stk-stage.bottom .stk-dots { left: calc(50% - 70px); bottom: 22px; display: grid; grid-template-columns: repeat(7, 8px); gap: 3px 3px; }
.stk-stage.bottom .stk-dots i { width: 8px; height: 8px; }
.stk-pal {
  flex: none; width: 262px; overflow: auto; scrollbar-width: none; touch-action: none;
  display: grid; grid-template-columns: repeat(4, 58px); grid-auto-rows: 58px; grid-auto-flow: row dense;
  gap: 8px; align-content: start; padding: 4px 4px 14px;
}
.stk-pal::-webkit-scrollbar { display: none; }
.stk-item {
  border-radius: 18px; background: #fff; box-shadow: 0 4px 0 rgba(160, 60, 120, 0.22);
  display: grid; place-items: center; touch-action: none;
}
.stk-item canvas { width: 52px; height: 52px; pointer-events: none; }
.stk-item.new { animation: pop 0.45s cubic-bezier(.2, 1.6, .5, 1) both; background: #fff6c4; }
.stk-pal.full .stk-item { filter: grayscale(0.7); opacity: 0.55; }
.stk-pack { grid-column: span 2; grid-row: span 2; padding: 4px 4px 7px; gap: 2px; justify-content: space-between; touch-action: none; border-width: 3px; }
.stk-pack canvas { width: 100%; height: auto; flex: 1; min-height: 0; aspect-ratio: auto; pointer-events: none; }
.stk-pack .price { pointer-events: none; }
.stk-ghost {
  position: fixed; left: 0; top: 0; width: 100px; height: 100px; z-index: 60; pointer-events: none;
  filter: drop-shadow(0 7px 5px rgba(120, 30, 80, 0.35)); will-change: transform;
}
.stk-hint { position: absolute; left: 0; top: 0; z-index: 3; pointer-events: none; display: flex; flex-direction: column; align-items: center; animation: stkHint 2.4s ease-in-out infinite; }
.stk-hint canvas { width: 46px; height: 46px; }
.stk-hint span { font-size: 40px; line-height: 1; margin-top: -10px; }
@keyframes stkHint {
  0% { transform: translate(var(--fx), var(--fy)); opacity: 0; }
  12% { transform: translate(var(--fx), var(--fy)); opacity: 1; }
  70% { transform: translate(var(--tx), var(--ty)); opacity: 1; }
  85%, 100% { transform: translate(var(--tx), var(--ty)) scale(1.15); opacity: 0; }
}
@keyframes stkGulp { 30% { transform: scale(1.35) rotate(-12deg); } 60% { transform: scale(0.9) rotate(8deg); } }
@media (orientation: portrait) {
  .stk-root { flex-direction: column; }
  .stk-pal {
    width: 100%; height: calc(4 * 62px + 3 * 8px + 10px);
    grid-template-columns: none; grid-template-rows: repeat(4, 62px); grid-auto-columns: 62px; grid-auto-rows: auto;
    grid-auto-flow: column dense; padding: 4px 4px 6px;
  }
}
@media (orientation: portrait) and (max-height: 700px) {
  .stk-pal { height: calc(3 * 62px + 2 * 8px + 10px); grid-template-rows: repeat(3, 62px); }
}
`;

// ================== РЕДАКТОР ==================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round3 = (v) => Math.round(v * 1000) / 1000;
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function inRect(r, x, y, pad = 0) { return r && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; }
function tapBtn(b, fn) {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); api.sound.unlock(); fn(); });
}
const packOf = (id) => PACKS.find((p) => p.items.includes(id));

let ghost = null;
function ghostEl() {
  if (!ghost) {
    ghost = makeCanvas(200);
    ghost.className = 'stk-ghost hidden';
    document.body.appendChild(ghost);
  }
  return ghost;
}

let cur = null; // открытый редактор

class Editor {
  constructor(G) {
    this.G = G;
    this.save = G.save;
    this.v = vehicleById(this.save.look.vehicle);
    this.ptrs = new Map();
    this.sel = null;
    this.drag = null;     // {pid, st, kind:'new'|'move', mode:'wait'|'lift', offX, offY, x, y}
    this.ps = null;       // нажатие в палитре
    this.pinch = null;
    this.flying = [];     // наклейки, которые сами летят на машину
    this.parts = [];      // искорки
    this.happyUntil = 0;
    this.T = null;        // {s, ox, oy, ground}
    this.B = carBounds(this.v);
    this.state = restState(this.v);
    this.build();
  }

  get list() {
    const all = this.save.stickers || (this.save.stickers = {});
    if (!Array.isArray(all[this.v.id])) all[this.v.id] = [];
    return all[this.v.id];
  }

  build() {
    const root = this.root = el('div', 'stk-root');
    const stage = this.stage = el('div', 'stk-stage side');
    this.cv = el('canvas', 'stk-cv');
    this.ctx = this.cv.getContext('2d');
    this.trash = el('button', 'stk-tool stk-trash', '🗑️');
    this.trash.setAttribute('aria-label', 'Убрать');
    const sizes = el('div', 'stk-sizes');
    this.plus = el('button', 'stk-tool stk-plus off', '+');
    this.minus = el('button', 'stk-tool stk-minus off', '−');
    sizes.append(this.plus, this.minus);
    this.dots = el('div', 'stk-dots');
    for (let i = 0; i < MAX; i++) this.dots.appendChild(el('i'));
    stage.append(this.cv, this.dots, this.trash, sizes);
    this.pal = el('div', 'stk-pal');
    root.append(stage, this.pal);
    this.fillPalette();
    this.updDots();

    root.addEventListener('pointerdown', (e) => this.down(e));
    root.addEventListener('pointermove', (e) => this.move(e));
    root.addEventListener('pointerup', (e) => this.up(e, false));
    root.addEventListener('pointercancel', (e) => this.up(e, true));
    root.addEventListener('lostpointercapture', (e) => { if (this.ptrs.has(e.pointerId)) this.up(e, true); });
    tapBtn(this.trash, () => this.trashTap());
    tapBtn(this.plus, () => this.scaleSel(1.2));
    tapBtn(this.minus, () => this.scaleSel(1 / 1.2));

    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(stage);
    }
  }

  destroy() {
    if (this.ro) this.ro.disconnect();
    clearTimeout(this.ps && this.ps.timer);
    if (ghost) ghost.classList.add('hidden');
    ED.active = false;
    ED.skip = null;
  }

  // ---------- палитра ----------
  fillPalette(fresh) {
    const pal = this.pal, s = this.save;
    pal.innerHTML = '';
    const item = (id) => {
      const b = el('button', 'stk-item' + (fresh && fresh.includes(id) ? ' new' : ''));
      b.dataset.id = id;
      const c = makeCanvas(104), x = c.getContext('2d');
      const sp = stickerSprite(id);
      if (sp) x.drawImage(sp, 0, 0, 104, 104);
      b.appendChild(c);
      pal.appendChild(b);
    };
    for (const id of FREE) item(id);
    for (const p of PACKS) if (s.stickerPacks && s.stickerPacks[p.id]) p.items.forEach(item);
    for (const p of PACKS) {
      if (s.stickerPacks && s.stickerPacks[p.id]) continue;
      const card = el('button', `card stk-pack ${s.coins >= p.price ? 'can' : 'cant'}`);
      card.dataset.pack = p.id;
      const c = makeCanvas(220, 140), x = c.getContext('2d');
      p.items.forEach((id, i) => {
        const sp = stickerSprite(id);
        if (!sp) return;
        const cx = 55 + (i % 2) * 110, cy = 36 + Math.floor(i / 2) * 68;
        x.save(); x.translate(cx, cy); x.rotate((i % 2 ? 0.18 : -0.15)); x.drawImage(sp, -40, -40, 80, 80); x.restore();
      });
      card.appendChild(c);
      card.insertAdjacentHTML('beforeend', this.G.coinPill(p.price));
      pal.appendChild(card);
    }
    pal.classList.toggle('full', this.count() >= MAX);
  }

  count() { return this.list.length + this.flying.length; }

  updDots() {
    const n = this.list.length;
    const d = this.dots.children;
    for (let i = 0; i < d.length; i++) d[i].classList.toggle('on', i < n);
    this.pal.classList.toggle('full', this.count() >= MAX);
  }

  buy(card) {
    const p = PACKS.find((x) => x.id === card.dataset.pack);
    if (!p) return;
    if (!this.G.pay(p.price, card)) return;
    (this.save.stickerPacks || (this.save.stickerPacks = {}))[p.id] = 1;
    api.persist();
    api.refresh();
    const top = this.pal.scrollTop, left = this.pal.scrollLeft;
    this.fillPalette(p.items);
    this.pal.scrollTop = top; this.pal.scrollLeft = left;
    this.cheer();
    this.burst(this.w / 2, this.h * 0.45, 26);
    setTimeout(() => sfx.sparkle(), 250);
  }

  // ---------- размеры и пересчёт координат ----------
  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h; this.dpr = dpr;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    const B = this.B, cw = B.x1 - B.x0, ch = B.y1 - B.y0;
    const TOOL = 70;
    const sSide = Math.min((w - 2 * TOOL) / cw, (h * 0.94) / ch);
    const sBottom = Math.min((w * 0.97) / cw, ((h - TOOL) * 0.95) / ch);
    const bottom = sBottom > sSide;
    const s = Math.max(10, bottom ? sBottom : sSide);
    const areaH = bottom ? h - TOOL + 6 : h;
    this.T = { s, ox: w / 2 - (s * (B.x0 + B.x1)) / 2, oy: areaH / 2 - (s * (B.y0 + B.y1)) / 2, ground: B.ground };
    this.stage.classList.toggle('bottom', bottom);
    this.stage.classList.toggle('side', !bottom);
    if (!this.save.seen.stk) requestAnimationFrame(() => this.hint());
  }
  toLocal(cx, cy) {
    const r = this.rCv, T = this.T;
    return { x: (cx - r.left - T.ox) / T.s, y: (cy - r.top - T.oy) / T.s };
  }
  toClient(x, y) {
    const r = this.rCv || this.cv.getBoundingClientRect(), T = this.T;
    return { x: r.left + T.ox + x * T.s, y: r.top + T.oy + y * T.s };
  }
  rects() {
    // читаем раскладку один раз за нажатие (без чтения в каждом движении пальца)
    this.rStage = this.stage.getBoundingClientRect();
    this.rCv = this.cv.getBoundingClientRect();
    this.rTrash = this.trash.getBoundingClientRect();
    this.rPal = this.pal.getBoundingClientRect();
    this.palVert = getComputedStyle(this.pal).gridAutoFlow.indexOf('column') < 0;
    this.palScroll = this.palVert ? this.pal.scrollHeight > this.pal.clientHeight + 2 : this.pal.scrollWidth > this.pal.clientWidth + 2;
  }

  // первый раз: пальчик показывает, как перетащить наклейку
  hint() {
    if (this.hintEl || this.save.seen.stk || !this.root.isConnected) return;
    const it = this.pal.querySelector('.stk-item');
    if (!it) return;
    const rr = this.root.getBoundingClientRect(), ri = it.getBoundingClientRect(), rs = this.cv.getBoundingClientRect();
    const T = this.T, m = maskFor(this.v);
    const h = this.hintEl = el('div', 'stk-hint');
    const c = makeCanvas(92);
    c.getContext('2d').drawImage(stickerSprite('heart'), 0, 0, 92, 92);
    h.append(c, el('span', '', '👆'));
    h.style.setProperty('--fx', `${ri.left - rr.left + ri.width / 2 - 23}px`);
    h.style.setProperty('--fy', `${ri.top - rr.top + ri.height / 2 - 23}px`);
    h.style.setProperty('--tx', `${rs.left - rr.left + T.ox + m.cx * T.s - 23}px`);
    h.style.setProperty('--ty', `${rs.top - rr.top + T.oy + m.cy * T.s - 23}px`);
    this.root.appendChild(h);
  }
  hideHint() {
    if (!this.save.seen.stk) { this.save.seen.stk = 1; api.persist(); }
    if (this.hintEl) { this.hintEl.remove(); this.hintEl = null; }
  }

  // ---------- выбор ----------
  select(st) {
    this.sel = st;
    this.plus.classList.toggle('off', !st || st.s >= S_MAX - 0.001);
    this.minus.classList.toggle('off', !st || st.s <= S_MIN + 0.001);
  }
  hit(L) {
    const list = this.list, slop = 14 / this.T.s;
    for (let i = list.length - 1; i >= 0; i--) {
      const st = list[i];
      if (Math.hypot(L.x - st.x, L.y - st.y) < st.s * 0.45 + slop) return st;
    }
    return null;
  }
  toFront(st) {
    const l = this.list, i = l.indexOf(st);
    if (i >= 0 && i < l.length - 1) { l.splice(i, 1); l.push(st); }
  }
  cheer() { this.happyUntil = performance.now() + 1300; }

  // ---------- касания ----------
  down(e) {
    if (e.button > 0) return;
    e.preventDefault();
    api.sound.unlock();
    if (this.ptrs.size >= 2) return;
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { this.root.setPointerCapture(e.pointerId); } catch (_) { /* */ }
    if (this.ptrs.size === 2) { this.startPinch(); return; }
    this.rects();
    const x = e.clientX, y = e.clientY;
    const item = e.target.closest && e.target.closest('.stk-item');
    const pack = e.target.closest && e.target.closest('.stk-pack');
    if (item || pack) {
      this.ps = { pid: e.pointerId, item, pack, x0: x, y0: y, mode: 'wait', s0: 0 };
      if (item) this.ps.timer = setTimeout(() => { if (this.ps && this.ps.mode === 'wait') this.palDrag(); }, 300);
      return;
    }
    if (!inRect(this.rStage, x, y) || !this.T) return;
    const st = this.hit(this.toLocal(x, y));
    if (st) {
      const c = this.toClient(st.x, st.y);
      this.drag = { pid: e.pointerId, st, kind: 'move', mode: 'wait', offX: c.x - x, offY: c.y - y, x, y, x0: x, y0: y };
      this.select(st);
      this.toFront(st);
    } else this.select(null);
  }

  move(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (this.pinch) { this.updPinch(); return; }
    const ps = this.ps;
    if (ps && ps.pid === e.pointerId) {
      const dx = p.x - ps.x0, dy = p.y - ps.y0;
      if (ps.mode === 'wait' && dx * dx + dy * dy > 81) {
        clearTimeout(ps.timer);
        const along = this.palVert ? dy : dx, across = this.palVert ? dx : dy;
        if (ps.item && (!this.palScroll || Math.abs(across) > Math.abs(along) * 0.8)) { this.palDrag(); return this.moveDrag(p.x, p.y); }
        ps.mode = 'scroll';
        ps.s0 = this.palVert ? this.pal.scrollTop : this.pal.scrollLeft;
      }
      if (ps.mode === 'scroll') {
        if (this.palVert) this.pal.scrollTop = ps.s0 - dy; else this.pal.scrollLeft = ps.s0 - dx;
      }
      return;
    }
    const d = this.drag;
    if (d && d.pid === e.pointerId) this.moveDrag(p.x, p.y);
  }

  moveDrag(x, y) {
    const d = this.drag;
    if (!d) return;
    d.x = x; d.y = y;
    if (d.mode === 'wait') {
      if (Math.hypot(x - d.x0, y - d.y0) < 7) return;
      d.mode = 'lift';
      ED.skip = d.st;
      sfx.peel();
      this.showGhost(d.st);
    }
    const gx = x + d.offX, gy = y + d.offY;
    const hot = inRect(this.rTrash, gx, gy, 14);
    if (hot !== this.trashHot) { this.trashHot = hot; this.trash.classList.toggle('hot', hot); }
    const onStage = inRect(this.rStage, gx, gy);
    this.ghostAt(gx, gy, onStage ? d.st.s * this.T.s * 1.12 : 64, d.st.r);
  }

  up(e, cancel) {
    const pid = e.pointerId;
    if (!this.ptrs.has(pid)) return;
    this.ptrs.delete(pid);
    if (this.pinch) {
      const pn = this.pinch;
      this.pinch = null;
      api.persist();
      const d = this.drag;
      if (d && d.pid === pid) { if (d.mode === 'lift') this.drop(cancel); else this.drag = null; }
      else if (d && d.mode === 'lift') {
        // второй палец отпустили — продолжаем тащить первым
        const p = this.ptrs.get(d.pid);
        if (p) { const c = this.ghostPos; d.offX = c.x - p.x; d.offY = c.y - p.y; }
      }
      if (pn.placed) this.select(pn.st);
      return;
    }
    const ps = this.ps;
    if (ps && ps.pid === pid) {
      clearTimeout(ps.timer);
      this.ps = null;
      if (ps.mode === 'wait' && !cancel) {
        if (ps.item) this.autoPlace(ps.item.dataset.id, ps.item);
        else if (ps.pack) this.buy(ps.pack);
      }
      return;
    }
    const d = this.drag;
    if (d && d.pid === pid) {
      if (d.mode === 'wait') {
        this.drag = null;
        ED.pop.set(d.st, performance.now());
        api.sound.click();
      } else this.drop(cancel);
    }
  }

  palDrag() {
    const ps = this.ps;
    if (!ps || !ps.item) return;
    clearTimeout(ps.timer);
    this.ps = null;
    if (this.count() >= MAX) { this.full(); return; }
    const id = ps.item.dataset.id;
    const st = { id, x: 0, y: 0, s: S_DEF, r: round3((Math.random() - 0.5) * 0.5) };
    const p = this.ptrs.get(ps.pid);
    this.drag = { pid: ps.pid, st, kind: 'new', mode: 'lift', offX: 0, offY: -34, x: p.x, y: p.y, x0: ps.x0, y0: ps.y0, item: ps.item };
    this.select(null);
    sfx.peel();
    this.showGhost(st);
    this.ghostAt(p.x, p.y - 34, 64, st.r);
  }

  full() {
    api.sound.deny();
    this.dots.classList.remove('full'); void this.dots.offsetWidth; this.dots.classList.add('full');
    this.trash.classList.remove('gulp'); void this.trash.offsetWidth; this.trash.classList.add('gulp');
  }

  drop(cancel) {
    const d = this.drag;
    this.drag = null;
    ED.skip = null;
    this.hideGhost();
    if (this.trashHot) { this.trashHot = false; this.trash.classList.remove('hot'); }
    if (!d) return;
    const gx = d.x + d.offX, gy = d.y + d.offY;
    const list = this.list;
    const remove = (poof) => {
      const i = list.indexOf(d.st);
      if (i >= 0) list.splice(i, 1);
      if (this.sel === d.st) this.select(null);
      api.sound.pop();
      if (poof) { const L = this.toLocal(gx, gy); this.burst(this.T.ox + L.x * this.T.s, this.T.oy + L.y * this.T.s, 12); }
      else { this.trash.classList.remove('gulp'); void this.trash.offsetWidth; this.trash.classList.add('gulp'); }
      this.updDots();
      api.persist();
    };
    if (cancel) return; // жест прервала система — наклейка остаётся, где была
    // долго подержали наклейку в палитре и отпустили на месте — пусть сама прилетит на машину
    if (d.kind === 'new' && Math.hypot(d.x - d.x0, d.y - d.y0) < 14) { this.autoPlace(d.st.id, d.item); return; }
    if (inRect(this.rTrash, gx, gy, 14)) { if (d.kind === 'move') remove(false); else api.sound.pop(); return; }
    if (!inRect(this.rStage, gx, gy)) { if (d.kind === 'move') remove(false); return; }
    const L = this.toLocal(gx, gy), m = maskFor(this.v);
    const pt = placeFor(m, L.x, L.y, d.st.s);
    if (!pt) { if (d.kind === 'move') remove(true); else { api.sound.pop(); this.burst(this.T.ox + L.x * this.T.s, this.T.oy + L.y * this.T.s, 8); } return; }
    if (d.kind === 'new') {
      if (this.count() >= MAX) { this.full(); return; }
      list.push(d.st);
    }
    this.stick(d.st, pt.x, pt.y);
  }

  // наклейка села на машину
  stick(st, x, y) {
    st.x = round3(x); st.y = round3(y); st.s = round3(st.s); st.r = round3(st.r || 0);
    this.toFront(st);
    this.select(st);
    ED.pop.set(st, performance.now());
    sfx.slap();
    if (st.id === 'marissa') setTimeout(() => api.sound.meow(1.15), 120);
    this.cheer();
    this.burst(this.T.ox + st.x * this.T.s, this.T.oy + st.y * this.T.s, 7);
    this.updDots();
    this.hideHint();
    api.persist();
  }

  // нажали на наклейку в палитре — сама прилетает на свободное место
  autoPlace(id, item) {
    if (!this.T) return;
    if (this.count() >= MAX) { this.full(); return; }
    const m = maskFor(this.v);
    const others = this.list.concat(this.flying.map((f) => f.st));
    let best = null, bs = -1;
    for (const c of m.spots) {
      let dmin = 1.4;
      for (const o of others) dmin = Math.min(dmin, Math.hypot(c.x - o.x, c.y - o.y));
      const sc = dmin + Math.random() * 0.3;
      if (sc > bs) { bs = sc; best = c; }
    }
    if (!best) best = { x: m.cx, y: m.cy };
    const st = { id, x: best.x, y: best.y, s: S_DEF, r: round3((Math.random() - 0.5) * 0.6) };
    const ri = item.getBoundingClientRect();
    const to = this.toClient(st.x, st.y);
    this.flying.push({ st, t0: performance.now(), x0: ri.left + ri.width / 2, y0: ri.top + ri.height / 2, x1: to.x, y1: to.y, k1: st.s * this.T.s });
    this.pal.classList.toggle('full', this.count() >= MAX);
    sfx.peel();
    if (this.flying.length === 1) this.showGhost(st);
  }

  // ---------- щипок: размер и поворот ----------
  startPinch() {
    const d = this.drag;
    if (this.ps) { clearTimeout(this.ps.timer); this.ps = null; }
    const st = d ? d.st : null;
    if (!st) return;
    const [a, b] = [...this.ptrs.values()];
    this.pinch = { st, placed: d.mode === 'wait', d0: Math.hypot(b.x - a.x, b.y - a.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), s0: st.s, r0: st.r || 0 };
  }
  updPinch() {
    const pn = this.pinch;
    const [a, b] = [...this.ptrs.values()];
    if (!a || !b) return;
    pn.st.s = clamp(pn.s0 * Math.hypot(b.x - a.x, b.y - a.y) / pn.d0, S_MIN, S_MAX);
    pn.st.r = pn.r0 + Math.atan2(b.y - a.y, b.x - a.x) - pn.a0;
    const d = this.drag;
    if (d && d.mode === 'lift') {
      const p = this.ptrs.get(d.pid) || a;
      d.x = p.x; d.y = p.y;
      this.ghostAt(p.x + d.offX, p.y + d.offY, pn.st.s * this.T.s * 1.12, pn.st.r);
    }
  }

  scaleSel(k) {
    const st = this.sel;
    if (!st) { api.sound.deny(); return; }
    const s = clamp(st.s * k, S_MIN, S_MAX);
    if (Math.abs(s - st.s) < 0.001) { api.sound.deny(); return; }
    st.s = round3(s);
    ED.pop.set(st, performance.now() - 120);
    if (k > 1) sfx.bigger(); else sfx.smaller();
    this.select(st);
    api.persist();
  }

  trashTap() {
    const st = this.sel;
    if (!st) { this.trash.classList.remove('gulp'); void this.trash.offsetWidth; this.trash.classList.add('gulp'); api.sound.click(); return; }
    const l = this.list, i = l.indexOf(st);
    if (i >= 0) l.splice(i, 1);
    this.select(null);
    api.sound.pop();
    this.burst(this.T.ox + st.x * this.T.s, this.T.oy + st.y * this.T.s, 12);
    this.trash.classList.remove('gulp'); void this.trash.offsetWidth; this.trash.classList.add('gulp');
    this.updDots();
    api.persist();
  }

  // ---------- «призрак» наклейки под пальцем ----------
  showGhost(st) {
    const g = ghostEl(), x = g.getContext('2d');
    x.clearRect(0, 0, 200, 200);
    const sp = stickerSprite(st.id);
    if (sp) x.drawImage(sp, 0, 0, 200, 200);
    g.classList.remove('hidden');
    this.ghostId = st.id;
  }
  ghostAt(x, y, size, r) {
    this.ghostPos = { x, y };
    ghostEl().style.transform = `translate(${x - 50}px, ${y - 50}px) rotate(${r || 0}rad) scale(${size / 100})`;
  }
  hideGhost() { if (ghost) ghost.classList.add('hidden'); }

  // ---------- искорки ----------
  burst(x, y, n) {
    const cols = ['#ff4f9a', '#ffd23b', '#4fb3ff', '#a97bff', '#ffffff', '#7ee08f'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.7 + Math.random() * 0.4, max: 1.1, size: 4 + Math.random() * 5, rot: Math.random() * 6, col: cols[i % cols.length] });
    }
  }

  // ---------- кадр ----------
  frame(dt) {
    if (!this.T || !this.w) { if (!window.ResizeObserver || !this.w) this.resize(); if (!this.T) return; }
    const now = performance.now(), t = now / 1000;
    // летящие наклейки (если в это время тащат другую — сразу приклеиваем)
    if (this.flying.length && this.drag && this.drag.mode === 'lift') {
      for (const f of this.flying.splice(0)) if (this.list.length < MAX) { this.list.push(f.st); this.stick(f.st, f.st.x, f.st.y); }
    }
    if (this.flying.length) {
      const f = this.flying[0];
      const k = Math.min(1, (now - f.t0) / 340), e = 1 - (1 - k) * (1 - k);
      const x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 60;
      this.ghostAt(x, y, 64 + (f.k1 - 64) * e, f.st.r * e);
      if (k >= 1) {
        this.flying.shift();
        if (this.list.length < MAX) { this.list.push(f.st); this.stick(f.st, f.st.x, f.st.y); }
        if (this.flying.length) { this.flying[0].t0 = now; this.showGhost(this.flying[0].st); }
        else this.hideGhost();
      }
    }
    const { ctx, dpr, T } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(dpr * T.s, 0, 0, dpr * T.s, dpr * T.ox, dpr * T.oy);
    ctx.fillStyle = 'rgba(150,60,110,0.13)';
    const B = this.B;
    ellipse(ctx, (B.x0 + B.x1) / 2, T.ground, (B.x1 - B.x0) * 0.5, 0.16);
    ctx.fill();
    const mood = now < this.happyUntil ? 'happy' : 'normal';
    ED.active = true;
    drawCar(ctx, this.state, this.save.look, { mood, sofyaMood: mood, t });
    // рамка выбранной наклейки
    const st = this.sel;
    if (st && st !== ED.skip && this.list.includes(st)) {
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(t * 0.8);
      ctx.lineWidth = 3 / T.s;
      ctx.setLineDash([7 / T.s, 6 / T.s]);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, st.s * 0.56 + 4 / T.s, 0, TAU); ctx.stroke();
      ctx.lineDashOffset = 6.5 / T.s;
      ctx.strokeStyle = '#ff4f9a';
      ctx.stroke();
      ctx.restore();
    }
    // искорки (экранные координаты)
    if (this.parts.length) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let j = 0;
      for (const p of this.parts) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.rot += dt * 5;
        ctx.globalAlpha = Math.min(1, p.life / 0.4);
        ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        starPath(ctx, 0, 0, p.size, p.size * 0.45); ctx.fill();
        ctx.restore();
        this.parts[j++] = p;
      }
      this.parts.length = j;
      ctx.globalAlpha = 1;
    }
  }
}

// ================== ПОДКЛЮЧЕНИЕ ==================
function deactivate() {
  if (cur) { cur.destroy(); cur = null; }
  const g = document.getElementById('garage');
  if (g) g.classList.remove('stk-mode');
}

export function init(a) {
  api = a;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  api.on('car:stickers', drawStickers);

  registerGarageTab({
    id: 'stickers',
    icon: '⭐',
    order: 30,
    render(box, G) {
      if (cur) cur.destroy();
      document.getElementById('garage').classList.add('stk-mode');
      cur = new Editor(G);
      box.appendChild(cur.root);
      if (!window.ResizeObserver) requestAnimationFrame(() => cur && cur.resize());
    },
  });

  // вкладку сменили или гараж закрыли — убираем редактор
  const tabs = document.getElementById('tabs');
  if (tabs) tabs.addEventListener('click', () => { if (cur && !cur.root.isConnected) deactivate(); });
  const garage = document.getElementById('garage');
  api.on('app:frame', (dt) => {
    if (!cur) return;
    if (!cur.root.isConnected || garage.classList.contains('hidden')) { deactivate(); return; }
    cur.frame(dt);
  });
}
