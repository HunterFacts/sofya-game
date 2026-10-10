// Рисование: машина, Софья, зверята, шапочки, украшения, монетки, сундуки.
// Все размеры в метрах (или в «единицах головы» для лиц), ось Y вниз.
import { PAINTS } from './config.js';

const TAU = Math.PI * 2;

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function fillStroke(ctx, fill, stroke, lw) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
  ctx.closePath();
}
function starPath(ctx, x, y, r, r2 = r * 0.45, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? r2 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// ================== МАШИНА ==================
const ARCH = 0.457, ARCH2 = Math.PI - 0.457;
function lowerBodyPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.92, -0.47);
  ctx.lineTo(-1.0, -0.47);
  ctx.lineTo(-1.0, -0.36);
  ctx.lineTo(1.05, -0.36);
  ctx.lineTo(1.78, -0.31);
  ctx.quadraticCurveTo(1.98, -0.29, 1.98, -0.08);
  ctx.lineTo(1.98, 0.2);
  ctx.quadraticCurveTo(1.98, 0.3, 1.88, 0.3);
  ctx.lineTo(1.81, 0.3);
  ctx.arc(1.2, 0.6, 0.68, -ARCH, -ARCH2, true);
  ctx.lineTo(-0.59, 0.3);
  ctx.arc(-1.2, 0.6, 0.68, -ARCH, -ARCH2, true);
  ctx.lineTo(-1.88, 0.3);
  ctx.quadraticCurveTo(-1.98, 0.3, -1.98, 0.2);
  ctx.lineTo(-1.98, -0.42);
  ctx.quadraticCurveTo(-1.98, -0.47, -1.92, -0.47);
  ctx.closePath();
}
function cabPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.02, -0.3);
  ctx.lineTo(-1.02, -1.02);
  ctx.quadraticCurveTo(-1.02, -1.17, -0.86, -1.17);
  ctx.lineTo(0.5, -1.17);
  ctx.quadraticCurveTo(0.63, -1.17, 0.7, -1.08);
  ctx.lineTo(1.12, -0.36);
  ctx.lineTo(1.05, -0.3);
  ctx.closePath();
}
function rearWindowPath(ctx) { rrect(ctx, -0.9, -1.07, 0.8, 0.64, 0.1); }
function frontWindowPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0.03, -0.97);
  ctx.quadraticCurveTo(0.03, -1.07, 0.13, -1.07);
  ctx.lineTo(0.5, -1.07);
  ctx.quadraticCurveTo(0.56, -1.07, 0.6, -1.01);
  ctx.lineTo(0.94, -0.48);
  ctx.quadraticCurveTo(0.96, -0.43, 0.9, -0.43);
  ctx.lineTo(0.08, -0.43);
  ctx.quadraticCurveTo(0.03, -0.43, 0.03, -0.48);
  ctx.closePath();
}

function paintFill(ctx, paint, top, bottom) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, paint.light);
  g.addColorStop(0.35, paint.body);
  g.addColorStop(1, paint.dark);
  return g;
}

function drawPattern(ctx, paint, t) {
  if (!paint.pattern) return;
  ctx.save();
  if (paint.pattern === 'hearts') {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [x, y, s] of [[-1.6, -0.15, 0.13], [-0.7, 0.05, 0.1], [0.2, -0.15, 0.12], [1.5, -0.1, 0.11], [-0.4, -0.85, 0.09], [-1.3, -0.3, 0.07], [0.8, 0.05, 0.08]]) {
      heartPath(ctx, x, y, s); ctx.fill();
    }
  } else if (paint.pattern === 'stars') {
    ctx.fillStyle = '#fff3a8';
    for (const [x, y, s] of [[-1.6, -0.15, 0.12], [-0.7, 0.02, 0.1], [0.25, -0.12, 0.13], [1.5, -0.1, 0.1], [-0.45, -0.85, 0.08], [1.0, 0.08, 0.07]]) {
      starPath(ctx, x, y, s); ctx.fill();
    }
  } else if (paint.pattern === 'rainbow') {
    const cols = ['#ff5a5a', '#ff9f43', '#ffd93b', '#5ee07a', '#4fb3ff', '#a97bff'];
    for (let i = 0; i < cols.length; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(-2.1, -0.36 + i * 0.11, 4.2, 0.115); }
    for (let i = 0; i < cols.length; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(-2.1, -1.2 + i * 0.15, 4.2, 0.155); }
  } else if (paint.pattern === 'shine') {
    const off = ((t * 0.6) % 3) * 2 - 3;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(off, -1.3); ctx.lineTo(off + 0.35, -1.3); ctx.lineTo(off - 0.5, 0.4); ctx.lineTo(off - 0.85, 0.4);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWheel(ctx, x, y, rot, rim) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  circle(ctx, 0, 0, 0.5);
  fillStroke(ctx, '#2f2b36', '#1c1a21', 0.04);
  ctx.fillStyle = '#423c4c';
  for (let i = 0; i < 14; i++) {
    ctx.save(); ctx.rotate((i * TAU) / 14); ctx.fillRect(-0.05, -0.53, 0.1, 0.09); ctx.restore();
  }
  circle(ctx, 0, 0, 0.29);
  fillStroke(ctx, '#f4f1f8', '#c9c2d6', 0.03);
  ctx.strokeStyle = rim;
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.08, Math.sin(a) * 0.08); ctx.lineTo(Math.cos(a) * 0.24, Math.sin(a) * 0.24); ctx.stroke();
  }
  circle(ctx, 0, 0, 0.09);
  fillStroke(ctx, rim, null);
  ctx.restore();
}

/**
 * Машина целиком. state: {x, y, a, wheels:[{x,y,rot}]}, look: {paint, animal, hat}, face: {mood, t}
 */
export function drawCar(ctx, state, look, face) {
  const paint = PAINTS.find((p) => p.id === look.paint) || PAINTS[0];
  const c = Math.cos(state.a), s = Math.sin(state.a);
  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate(state.a);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // колёса в системе машины
  const wl = state.wheels.map((w) => {
    const dx = w.x - state.x, dy = w.y - state.y;
    return { x: c * dx + s * dy, y: -s * dx + c * dy, rot: w.rot - state.a };
  });

  // стойки подвески
  ctx.strokeStyle = '#5b5566';
  ctx.lineWidth = 0.13;
  for (let i = 0; i < 2; i++) {
    const ax = i ? 1.2 : -1.2;
    ctx.beginPath(); ctx.moveTo(ax, 0.2); ctx.lineTo(wl[i].x, wl[i].y); ctx.stroke();
  }
  ctx.strokeStyle = '#8e879b';
  ctx.lineWidth = 0.06;
  for (let i = 0; i < 2; i++) {
    const ax = i ? 1.2 : -1.2;
    ctx.beginPath(); ctx.moveTo(ax, 0.2); ctx.lineTo(wl[i].x, wl[i].y); ctx.stroke();
  }

  // кабина
  cabPath(ctx);
  fillStroke(ctx, paintFill(ctx, paint, -1.2, -0.3), paint.dark, 0.05);
  // окна: фон
  const glass = ctx.createLinearGradient(0, -1.07, 0, -0.43);
  glass.addColorStop(0, '#bfe7ff');
  glass.addColorStop(1, '#8cc9ef');
  for (const wp of [rearWindowPath, frontWindowPath]) { wp(ctx); ctx.fillStyle = glass; ctx.fill(); }
  // сиденья
  ctx.fillStyle = 'rgba(80,70,110,0.25)';
  rrect(ctx, -0.82, -0.86, 0.12, 0.45, 0.05); ctx.fill();
  rrect(ctx, 0.08, -0.86, 0.12, 0.45, 0.05); ctx.fill();

  // зверёк во втором окне
  ctx.save();
  rearWindowPath(ctx);
  ctx.clip();
  ctx.translate(-0.5, -0.66);
  ctx.scale(0.22, 0.22);
  drawAnimal(ctx, look.animal, face.mood, face.t, look.hat);
  ctx.restore();

  // Софья в первом окне
  ctx.save();
  frontWindowPath(ctx);
  ctx.clip();
  ctx.translate(0.31, -0.67);
  ctx.scale(0.2, 0.2);
  drawSofya(ctx, face.mood, face.t);
  ctx.restore();

  // блики стёкол и рамки
  for (const wp of [rearWindowPath, frontWindowPath]) {
    ctx.save();
    wp(ctx);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(-1, -1.1); ctx.lineTo(-0.75, -1.1); ctx.lineTo(-1.2, -0.4); ctx.lineTo(-1.45, -0.4);
    ctx.moveTo(0.05, -1.1); ctx.lineTo(0.22, -1.1); ctx.lineTo(-0.2, -0.4); ctx.lineTo(-0.37, -0.4);
    ctx.moveTo(0.85, -1.1); ctx.lineTo(1.0, -1.1); ctx.lineTo(0.55, -0.4); ctx.lineTo(0.4, -0.4);
    ctx.fill();
    ctx.restore();
    wp(ctx);
    ctx.strokeStyle = paint.dark;
    ctx.lineWidth = 0.05;
    ctx.stroke();
  }

  // антенна с сердечком
  const sway = Math.sin(face.t * 5) * 0.12 - state.a * 0.3;
  ctx.strokeStyle = '#6d6578';
  ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(-0.85, -1.17); ctx.quadraticCurveTo(-0.9 + sway * 0.5, -1.45, -0.9 + sway, -1.7); ctx.stroke();
  heartPath(ctx, -0.9 + sway, -1.72, 0.13);
  fillStroke(ctx, '#ff4f9a', '#c8306f', 0.03);

  // нижняя часть кузова
  lowerBodyPath(ctx);
  ctx.save();
  ctx.fillStyle = paintFill(ctx, paint, -0.5, 0.35);
  ctx.fill();
  ctx.clip();
  drawPattern(ctx, paint, face.t);
  // кузов-кузовок: тень внутри
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-1.98, -0.47, 0.96, 0.1);
  // полоска
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-2, -0.05, 4, 0.07);
  ctx.restore();
  lowerBodyPath(ctx);
  ctx.strokeStyle = paint.dark;
  ctx.lineWidth = 0.05;
  ctx.stroke();

  // двери и ручки
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(-0.04, -1.07); ctx.lineTo(-0.04, 0.2);
  ctx.moveTo(-1.0, -0.36); ctx.lineTo(-1.0, 0.2);
  ctx.moveTo(1.02, -0.36); ctx.lineTo(1.0, 0.2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rrect(ctx, -0.42, -0.25, 0.2, 0.05, 0.025); ctx.fill();
  rrect(ctx, 0.55, -0.25, 0.2, 0.05, 0.025); ctx.fill();

  // фара и задний фонарь
  ellipse(ctx, 1.9, -0.13, 0.09, 0.11);
  fillStroke(ctx, '#fff7b0', '#e3b52c', 0.025);
  rrect(ctx, -1.99, -0.38, 0.07, 0.2, 0.03);
  fillStroke(ctx, '#ff5470', null);
  // бамперы
  ctx.fillStyle = '#5b5566';
  rrect(ctx, 1.62, 0.13, 0.42, 0.17, 0.07); ctx.fill();
  rrect(ctx, -2.04, 0.13, 0.42, 0.17, 0.07); ctx.fill();
  // выхлопная труба
  ctx.fillStyle = '#8e879b';
  rrect(ctx, -2.1, 0.02, 0.16, 0.08, 0.03); ctx.fill();

  // колёса поверх
  ctx.restore();
  for (const w of state.wheels) drawWheel(ctx, w.x, w.y, w.rot, paint.body);
}

// ================== СОФЬЯ ==================
const HAIR = '#8b6b48', HAIR_D = '#6b5034', HAIR_L = '#a98861', SKIN = '#ffdcc6', SKIN_D = '#f1bfa3';

export function drawSofya(ctx, mood, t) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // хвостик сзади
  const swing = Math.sin(t * 6) * 0.08;
  ellipse(ctx, -1.05, 0.15 + swing, 0.38, 0.62, 0.5 + swing);
  fillStroke(ctx, HAIR, HAIR_D, 0.08);
  circle(ctx, -0.82, -0.25, 0.17);
  fillStroke(ctx, '#ff5fa8', '#d63d86', 0.06);
  // плечи и кофточка
  ellipse(ctx, 0, 1.55, 1.15, 0.65);
  fillStroke(ctx, '#ff8cc6', '#e0609f', 0.08);
  ellipse(ctx, 0, 1.05, 0.25, 0.2);
  ctx.fillStyle = SKIN_D; ctx.fill();
  // волосы сзади головы
  ellipse(ctx, 0, -0.05, 1.12, 1.15);
  fillStroke(ctx, HAIR, HAIR_D, 0.08);
  // лицо
  ellipse(ctx, 0, 0.1, 0.9, 0.92);
  fillStroke(ctx, SKIN, SKIN_D, 0.06);
  // чёлка
  ctx.beginPath();
  ctx.moveTo(-1.0, 0.0);
  ctx.quadraticCurveTo(-1.0, -1.05, 0, -1.08);
  ctx.quadraticCurveTo(1.0, -1.05, 1.02, 0.0);
  ctx.quadraticCurveTo(0.75, -0.35, 0.45, -0.38);
  ctx.quadraticCurveTo(0.3, -0.18, 0.1, -0.42);
  ctx.quadraticCurveTo(-0.2, -0.2, -0.45, -0.4);
  ctx.quadraticCurveTo(-0.8, -0.3, -1.0, 0.0);
  fillStroke(ctx, HAIR, HAIR_D, 0.07);
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.08;
  ctx.beginPath(); ctx.moveTo(-0.5, -0.85); ctx.quadraticCurveTo(-0.1, -0.98, 0.3, -0.9); ctx.stroke();
  // щёчки
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  ellipse(ctx, -0.52, 0.38, 0.18, 0.11); ctx.fill();
  ellipse(ctx, 0.52, 0.38, 0.18, 0.11); ctx.fill();
  drawEyes(ctx, mood, t, -0.36, 0.36, 0.08, '#4a3426', false, 0.7);
  drawHumanMouth(ctx, mood, 0, 0.55);
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

// Глаза для всех: настроение меняет форму
function drawEyes(ctx, mood, t, lx, rx, y, color, iris, size = 1) {
  const blink = (t % 3.7) < 0.12 && mood === 'normal';
  ctx.lineCap = 'round';
  for (const x of [lx, rx]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.1 * size;
    if (mood === 'happy') {
      ctx.beginPath(); ctx.arc(x, y + 0.08 * size, 0.15 * size, Math.PI + 0.3, -0.3); ctx.stroke();
    } else if (mood === 'turbo') {
      const d = x < (lx + rx) / 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x - 0.15 * size * d, y - 0.12 * size); ctx.lineTo(x + 0.12 * size * d, y); ctx.lineTo(x - 0.15 * size * d, y + 0.12 * size);
      ctx.stroke();
    } else if (mood === 'dizzy') {
      ctx.lineWidth = 0.07 * size;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = i * 0.55 + t * 8, r = (i / 24) * 0.18 * size;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.stroke();
    } else if (mood === 'scared') {
      circle(ctx, x, y, 0.2 * size); fillStroke(ctx, '#fff', color, 0.05 * size);
      circle(ctx, x, y, 0.07 * size); fillStroke(ctx, color, null);
    } else if (blink) {
      ctx.beginPath(); ctx.moveTo(x - 0.14 * size, y); ctx.lineTo(x + 0.14 * size, y); ctx.stroke();
    } else {
      ellipse(ctx, x, y, 0.17 * size, 0.22 * size);
      fillStroke(ctx, iris || color, null);
      if (iris) { ellipse(ctx, x, y + 0.02 * size, 0.08 * size, 0.15 * size); fillStroke(ctx, '#1d1d24', null); }
      circle(ctx, x + 0.06 * size, y - 0.08 * size, 0.06 * size); fillStroke(ctx, '#fff', null);
      circle(ctx, x - 0.05 * size, y + 0.07 * size, 0.03 * size); fillStroke(ctx, '#fff', null);
    }
  }
}

function animalMouth(ctx, mood, y, color, tongue = false) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  if (mood === 'scared') {
    ellipse(ctx, 0, y + 0.16, 0.11, 0.14); fillStroke(ctx, '#a63b4a', color, 0.05);
  } else if (mood === 'happy' || mood === 'turbo' || tongue) {
    ctx.beginPath(); ctx.moveTo(-0.22, y + 0.02); ctx.quadraticCurveTo(0, y + 0.42, 0.22, y + 0.02); ctx.closePath();
    fillStroke(ctx, '#c4475c', color, 0.05);
    ellipse(ctx, 0, y + 0.2, 0.09, 0.06); fillStroke(ctx, '#ff8fa8', null);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, y - 0.04); ctx.lineTo(0, y + 0.04);
    ctx.arc(-0.1, y + 0.04, 0.1, 0, Math.PI * 0.85);
    ctx.moveTo(0, y + 0.04);
    ctx.arc(0.1, y + 0.04, 0.1, Math.PI, Math.PI * 0.15, true);
    ctx.stroke();
  }
}

function whiskers(ctx, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.035;
  for (const d of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(d * 0.42, y + i * 0.08); ctx.lineTo(d * 0.98, y + i * 0.14 - 0.03); ctx.stroke();
    }
  }
}

// ================== ЗВЕРЯТА ==================
// Голова радиусом ~1, центр (0,0)
export function drawAnimal(ctx, id, mood, t, hat) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const bob = Math.sin(t * 4) * 0.03;
  ctx.translate(0, bob);
  const ear = (x, rot, fill, inner, stroke) => {
    ctx.save(); ctx.translate(x, -0.6); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-0.38, 0.2); ctx.lineTo(0, -0.62); ctx.lineTo(0.38, 0.2); ctx.closePath();
    fillStroke(ctx, fill, stroke, 0.07);
    if (inner) { ctx.beginPath(); ctx.moveTo(-0.2, 0.1); ctx.lineTo(0, -0.38); ctx.lineTo(0.2, 0.1); ctx.closePath(); fillStroke(ctx, inner, null); }
    ctx.restore();
  };
  const body = (fill, stroke) => { ellipse(ctx, 0, 1.55, 1.05, 0.7); fillStroke(ctx, fill, stroke, 0.07); };
  const head = (fill, stroke) => { ellipse(ctx, 0, 0, 1.0, 0.9); fillStroke(ctx, fill, stroke, 0.07); };
  const blush = () => {
    ctx.fillStyle = 'rgba(255,120,160,0.45)';
    ellipse(ctx, -0.6, 0.3, 0.17, 0.1); ctx.fill();
    ellipse(ctx, 0.6, 0.3, 0.17, 0.1); ctx.fill();
  };

  switch (id) {
    case 'dog': {
      body('#e3b47a', '#b98a52');
      head('#e8bb82', '#b98a52');
      ellipse(ctx, 0, 0.42, 0.55, 0.38); fillStroke(ctx, '#f8e2c2', null);
      ellipse(ctx, 0.42, -0.2, 0.3, 0.26); fillStroke(ctx, '#c58f55', null);
      for (const d of [-1, 1]) {
        const flop = Math.sin(t * 6 + d) * 0.08;
        ellipse(ctx, d * 0.95, 0.05, 0.28, 0.6, d * (0.35 + flop));
        fillStroke(ctx, '#9b6537', '#7a4c27', 0.07);
      }
      drawEyes(ctx, mood, t, -0.38, 0.38, -0.12, '#2b1d14');
      blush();
      ellipse(ctx, 0, 0.22, 0.2, 0.14); fillStroke(ctx, '#2b1d14', null);
      animalMouth(ctx, mood, 0.38, '#5a3a22', mood === 'normal' && (t % 5) < 2);
      break;
    }
    case 'bunny': {
      body('#f4f1f6', '#cfc7da');
      for (const d of [-1, 1]) {
        ctx.save(); ctx.translate(d * 0.4, -0.7); ctx.rotate(d * 0.25 + Math.sin(t * 3 + d) * 0.05);
        ellipse(ctx, 0, -0.55, 0.24, 0.65); fillStroke(ctx, '#f4f1f6', '#cfc7da', 0.07);
        ellipse(ctx, 0, -0.5, 0.12, 0.48); fillStroke(ctx, '#ffb6cf', null);
        ctx.restore();
      }
      head('#f8f6fa', '#cfc7da');
      drawEyes(ctx, mood, t, -0.38, 0.38, -0.08, '#3a2a3a');
      blush();
      ctx.beginPath(); ctx.moveTo(-0.1, 0.18); ctx.lineTo(0.1, 0.18); ctx.lineTo(0, 0.3); ctx.closePath();
      fillStroke(ctx, '#ff8fb0', null);
      animalMouth(ctx, mood, 0.32, '#8a6a7a');
      if (mood === 'normal') { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#cfc7da'; ctx.lineWidth = 0.03; rrect(ctx, -0.09, 0.42, 0.18, 0.16, 0.03); ctx.fill(); ctx.stroke(); }
      whiskers(ctx, 0.3, '#b9aec6');
      break;
    }
    case 'panda': {
      body('#2d2d35', '#1b1b20');
      circle(ctx, -0.72, -0.68, 0.3); fillStroke(ctx, '#2d2d35', null);
      circle(ctx, 0.72, -0.68, 0.3); fillStroke(ctx, '#2d2d35', null);
      head('#ffffff', '#c9c9d4');
      ellipse(ctx, -0.4, -0.05, 0.27, 0.34, 0.5); fillStroke(ctx, '#2d2d35', null);
      ellipse(ctx, 0.4, -0.05, 0.27, 0.34, -0.5); fillStroke(ctx, '#2d2d35', null);
      if (mood === 'normal') {
        const blink = (t % 3.7) < 0.12;
        for (const x of [-0.38, 0.38]) {
          if (blink) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(x - 0.1, -0.04); ctx.lineTo(x + 0.1, -0.04); ctx.stroke(); }
          else { circle(ctx, x, -0.04, 0.12); fillStroke(ctx, '#fff', null); circle(ctx, x + 0.02, -0.02, 0.07); fillStroke(ctx, '#111', null); }
        }
      } else drawEyes(ctx, mood, t, -0.38, 0.38, -0.04, mood === 'scared' ? '#111' : '#fff');
      blush();
      ellipse(ctx, 0, 0.25, 0.16, 0.11); fillStroke(ctx, '#2d2d35', null);
      animalMouth(ctx, mood, 0.38, '#2d2d35');
      break;
    }
    case 'fox': {
      body('#ff8a3d', '#d8662a');
      ear(-0.6, -0.35, '#ff8a3d', '#fff1e3', '#d8662a');
      ear(0.6, 0.35, '#ff8a3d', '#fff1e3', '#d8662a');
      head('#ff8f45', '#d8662a');
      ctx.beginPath();
      ctx.moveTo(-0.98, 0.05); ctx.quadraticCurveTo(-0.6, 0.15, 0, 0.2); ctx.quadraticCurveTo(0.6, 0.15, 0.98, 0.05);
      ctx.quadraticCurveTo(0.8, 0.85, 0, 0.9); ctx.quadraticCurveTo(-0.8, 0.85, -0.98, 0.05);
      fillStroke(ctx, '#fff6ec', null);
      drawEyes(ctx, mood, t, -0.38, 0.38, -0.15, '#2b1d14');
      blush();
      ellipse(ctx, 0, 0.27, 0.15, 0.1); fillStroke(ctx, '#2b1d14', null);
      animalMouth(ctx, mood, 0.4, '#5a3a22');
      break;
    }
    case 'bear': {
      body('#a8754a', '#7d5230');
      for (const d of [-1, 1]) { circle(ctx, d * 0.72, -0.68, 0.3); fillStroke(ctx, '#a8754a', '#7d5230', 0.07); circle(ctx, d * 0.72, -0.68, 0.16); fillStroke(ctx, '#e3b98f', null); }
      head('#b07b4e', '#7d5230');
      ellipse(ctx, 0, 0.35, 0.45, 0.35); fillStroke(ctx, '#e8c39b', null);
      drawEyes(ctx, mood, t, -0.38, 0.38, -0.12, '#2b1d14');
      blush();
      ellipse(ctx, 0, 0.2, 0.17, 0.12); fillStroke(ctx, '#3a2516', null);
      animalMouth(ctx, mood, 0.34, '#3a2516');
      break;
    }
    case 'penguin': {
      body('#2f3654', '#1d2238');
      head('#2f3654', '#1d2238');
      ctx.beginPath();
      ctx.moveTo(0, -0.35);
      ctx.bezierCurveTo(-0.3, -0.75, -0.95, -0.4, -0.75, 0.25);
      ctx.quadraticCurveTo(-0.5, 0.82, 0, 0.82);
      ctx.quadraticCurveTo(0.5, 0.82, 0.75, 0.25);
      ctx.bezierCurveTo(0.95, -0.4, 0.3, -0.75, 0, -0.35);
      fillStroke(ctx, '#ffffff', null);
      drawEyes(ctx, mood, t, -0.36, 0.36, -0.02, '#1d2238');
      blush();
      ctx.beginPath(); ctx.moveTo(-0.2, 0.22); ctx.quadraticCurveTo(0, 0.12, 0.2, 0.22); ctx.lineTo(0, mood === 'scared' || mood === 'happy' ? 0.55 : 0.45); ctx.closePath();
      fillStroke(ctx, '#ffa53a', '#e07f16', 0.05);
      break;
    }
    case 'unicorn': {
      body('#fff4fd', '#e2c9ea');
      // грива
      const mane = ['#ff7eb6', '#ffb86b', '#ffe066', '#7fe0a0', '#7fc8ff', '#c69bff'];
      for (let i = 0; i < mane.length; i++) {
        ellipse(ctx, -0.75 + i * 0.05, -0.55 + i * 0.22, 0.32, 0.22, -0.6); fillStroke(ctx, mane[i], null);
      }
      ear(-0.55, -0.3, '#fff4fd', '#ffc6e3', '#e2c9ea');
      ear(0.55, 0.3, '#fff4fd', '#ffc6e3', '#e2c9ea');
      head('#fff7fe', '#e2c9ea');
      // рог
      ctx.beginPath(); ctx.moveTo(-0.17, -0.8); ctx.lineTo(0, -1.65); ctx.lineTo(0.17, -0.8); ctx.closePath();
      fillStroke(ctx, '#ffd84d', '#e0a91a', 0.05);
      ctx.strokeStyle = '#e0a91a'; ctx.lineWidth = 0.04;
      for (let i = 0; i < 3; i++) { const y = -0.95 - i * 0.2; ctx.beginPath(); ctx.moveTo(-0.13 + i * 0.03, y); ctx.lineTo(0.13 - i * 0.03, y - 0.08); ctx.stroke(); }
      for (let i = 0; i < 3; i++) {
        ellipse(ctx, -0.55 - i * 0.04, -0.5 + i * 0.25, 0.25, 0.18, -0.6); fillStroke(ctx, mane[i * 2], null);
      }
      drawEyes(ctx, mood, t, -0.36, 0.36, -0.08, '#4a2a5a');
      if (mood === 'normal') {
        ctx.strokeStyle = '#4a2a5a'; ctx.lineWidth = 0.05;
        for (const x of [-0.36, 0.36]) { const d = Math.sign(x); ctx.beginPath(); ctx.moveTo(x + d * 0.15, -0.2); ctx.lineTo(x + d * 0.27, -0.3); ctx.stroke(); }
      }
      blush();
      ellipse(ctx, 0, 0.42, 0.42, 0.28); fillStroke(ctx, '#ffe2f0', null);
      ctx.fillStyle = '#d9a7c4'; circle(ctx, -0.13, 0.36, 0.05); ctx.fill(); circle(ctx, 0.13, 0.36, 0.05); ctx.fill();
      animalMouth(ctx, mood, 0.48, '#a0708a');
      break;
    }
    default: { // Марисса: белая кошечка, вокруг носа чёрное
      body('#fbfbfd', '#cfd0da');
      ear(-0.58, -0.3, '#fbfbfd', '#ffb3c9', '#cfd0da');
      ear(0.58, 0.3, '#fbfbfd', '#ffb3c9', '#cfd0da');
      head('#fdfdff', '#cfd0da');
      // чёрная мордочка
      ctx.beginPath();
      ctx.moveTo(0, 0.02);
      ctx.bezierCurveTo(0.32, -0.05, 0.55, 0.2, 0.48, 0.45);
      ctx.bezierCurveTo(0.42, 0.72, 0.15, 0.78, 0, 0.74);
      ctx.bezierCurveTo(-0.15, 0.78, -0.42, 0.72, -0.48, 0.45);
      ctx.bezierCurveTo(-0.55, 0.2, -0.32, -0.05, 0, 0.02);
      fillStroke(ctx, '#2a2a30', null);
      drawEyes(ctx, mood, t, -0.4, 0.4, -0.18, '#2a2a30', '#6fd39a');
      ctx.fillStyle = 'rgba(255,140,170,0.5)';
      ellipse(ctx, -0.68, 0.18, 0.16, 0.1); ctx.fill();
      ellipse(ctx, 0.68, 0.18, 0.16, 0.1); ctx.fill();
      // розовый носик
      ctx.beginPath(); ctx.moveTo(-0.12, 0.17); ctx.lineTo(0.12, 0.17); ctx.lineTo(0, 0.3); ctx.closePath();
      fillStroke(ctx, '#ff9bbb', null);
      animalMouth(ctx, mood, 0.32, '#e7e7ef');
      whiskers(ctx, 0.35, '#e7e7ef');
    }
  }
  drawHat(ctx, hat, t, id);
}

// ================== ШАПОЧКИ ==================
export function drawHat(ctx, hat, t, id) {
  if (!hat || hat === 'none') return;
  const top = id === 'bunny' ? -0.82 : id === 'unicorn' ? -0.78 : -0.86;
  ctx.save();
  ctx.lineJoin = 'round';
  switch (hat) {
    case 'bow': {
      ctx.translate(0.55, top + 0.08);
      ctx.rotate(0.3);
      for (const d of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * 0.45, -0.38, d * 0.48, 0); ctx.quadraticCurveTo(d * 0.45, 0.38, 0, 0);
        fillStroke(ctx, '#ff4f9a', '#c8306f', 0.06);
      }
      circle(ctx, 0, 0, 0.12); fillStroke(ctx, '#ff7ab5', '#c8306f', 0.05);
      break;
    }
    case 'flower': {
      ctx.translate(-0.5, top + 0.1);
      ctx.rotate(t * 0.5);
      for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; circle(ctx, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.16); fillStroke(ctx, '#ffffff', '#f2a0c4', 0.04); }
      circle(ctx, 0, 0, 0.13); fillStroke(ctx, '#ffd23f', '#e0a91a', 0.04);
      break;
    }
    case 'party': {
      ctx.translate(0.15, top);
      ctx.rotate(0.15);
      ctx.beginPath(); ctx.moveTo(-0.38, 0.05); ctx.lineTo(0, -0.95); ctx.lineTo(0.38, 0.05); ctx.closePath();
      fillStroke(ctx, '#7ecbff', '#3f8fd1', 0.06);
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-0.5, -0.15 - i * 0.25); ctx.lineTo(0.5, -0.35 - i * 0.25); ctx.lineTo(0.5, -0.25 - i * 0.25); ctx.lineTo(-0.5, -0.05 - i * 0.25); ctx.fill(); }
      ctx.restore();
      circle(ctx, 0, -0.95, 0.13); fillStroke(ctx, '#ff6fae', null);
      break;
    }
    case 'cap': {
      ctx.translate(0, top + 0.2);
      ctx.beginPath(); ctx.ellipse(0, 0.05, 0.85, 0.6, 0, Math.PI, 0); ctx.closePath();
      fillStroke(ctx, '#ff6fae', '#d9468b', 0.06);
      ctx.beginPath(); ctx.ellipse(0.8, 0.05, 0.55, 0.13, 0, 0, TAU);
      fillStroke(ctx, '#d9468b', '#b22f6e', 0.05);
      circle(ctx, 0, -0.52, 0.08); fillStroke(ctx, '#fff', null);
      heartPath(ctx, -0.05, -0.15, 0.17); fillStroke(ctx, '#fff', null);
      break;
    }
    case 'glasses': {
      ctx.translate(0, id === 'penguin' ? -0.02 : -0.12);
      for (const d of [-1, 1]) { heartPath(ctx, d * 0.4, 0.08, 0.3); fillStroke(ctx, 'rgba(40,20,60,0.85)', '#ff4f9a', 0.06); }
      ctx.strokeStyle = '#ff4f9a'; ctx.lineWidth = 0.06;
      ctx.beginPath(); ctx.moveTo(-0.15, -0.05); ctx.quadraticCurveTo(0, -0.12, 0.15, -0.05); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      circle(ctx, -0.48, -0.05, 0.05); ctx.fill(); circle(ctx, 0.32, -0.05, 0.05); ctx.fill();
      break;
    }
    case 'headphones': {
      ctx.strokeStyle = '#ff6fae'; ctx.lineWidth = 0.14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 1.0, Math.PI + 0.25, -0.25); ctx.stroke();
      for (const d of [-1, 1]) { rrect(ctx, d * 1.02 - 0.17, -0.3, 0.34, 0.5, 0.14); fillStroke(ctx, '#ff8cc6', '#d9468b', 0.06); }
      break;
    }
    case 'crown': {
      ctx.translate(0, top);
      ctx.beginPath();
      ctx.moveTo(-0.45, 0.08); ctx.lineTo(-0.5, -0.4); ctx.lineTo(-0.25, -0.15); ctx.lineTo(0, -0.5); ctx.lineTo(0.25, -0.15); ctx.lineTo(0.5, -0.4); ctx.lineTo(0.45, 0.08); ctx.closePath();
      fillStroke(ctx, '#ffd84d', '#d9a21b', 0.06);
      for (const [x, y, col] of [[-0.25, -0.05, '#ff4f9a'], [0, -0.08, '#4fb3ff'], [0.25, -0.05, '#ff4f9a']]) { circle(ctx, x, y, 0.07); fillStroke(ctx, col, null); }
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, -0.3, -0.25, 0.04); ctx.fill();
      break;
    }
    case 'tiara': {
      ctx.translate(0, top + 0.05);
      ctx.strokeStyle = '#d8dbe8'; ctx.lineWidth = 0.08;
      ctx.beginPath(); ctx.arc(0, 0.6, 0.62, Math.PI + 0.55, -0.55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.25, 0.05); ctx.lineTo(0, -0.35); ctx.lineTo(0.25, 0.05); ctx.closePath();
      fillStroke(ctx, '#eef0f8', '#b9bdd0', 0.04);
      heartPath(ctx, 0, -0.08, 0.13); fillStroke(ctx, '#ff4f9a', null);
      const tw = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = `rgba(255,255,255,${tw})`; starPath(ctx, 0.25, -0.3, 0.12, 0.04, 4); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ================== МОНЕТКИ И БОНУСЫ ==================
export function drawCoin(ctx, x, y, t, big) {
  const r = big ? 0.55 : 0.33;
  const sx = Math.max(0.15, Math.abs(Math.cos(t * 3 + x * 0.4)));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  circle(ctx, 0, 0, r);
  fillStroke(ctx, big ? '#ffcf3a' : '#ffd93b', '#d99a00', r * 0.16);
  circle(ctx, 0, 0, r * 0.68);
  ctx.strokeStyle = '#f0b400'; ctx.lineWidth = r * 0.1; ctx.stroke();
  if (big) { starPath(ctx, 0, 0, r * 0.5); ctx.fillStyle = '#fff3a8'; ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ellipse(ctx, -r * 0.35, -r * 0.35, r * 0.18, r * 0.1, -0.7); ctx.fill();
  ctx.restore();
}

const PICKUP_COL = { turbo: ['#8a5cff', '#5d33d6'], magnet: ['#ff6b6b', '#d43f4f'], shield: ['#4fc3ff', '#1f8fd6'] };
export function drawPickup(ctx, kind, x, y, t) {
  const bob = Math.sin(t * 3 + x) * 0.12;
  ctx.save();
  ctx.translate(x, y + bob);
  if (kind === 'chest') {
    drawChest(ctx, 0, 0.1, 0.9, 'wood', 0, t);
    ctx.restore();
    return;
  }
  const [c1, c2] = PICKUP_COL[kind];
  const g = ctx.createRadialGradient(-0.15, -0.2, 0.05, 0, 0, 0.62);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c1); g.addColorStop(1, c2);
  circle(ctx, 0, 0, 0.6);
  fillStroke(ctx, g, '#ffffff', 0.07);
  drawBoosterIcon(ctx, kind, 0.4);
  ctx.restore();
}

export function drawBoosterIcon(ctx, kind, s) {
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  if (kind === 'turbo') {
    ctx.beginPath();
    ctx.moveTo(0.15, -0.95); ctx.lineTo(-0.5, 0.12); ctx.lineTo(-0.02, 0.12); ctx.lineTo(-0.2, 0.95); ctx.lineTo(0.5, -0.18); ctx.lineTo(0.03, -0.18); ctx.closePath();
    fillStroke(ctx, '#ffe14d', '#c98a00', 0.1);
  } else if (kind === 'magnet') {
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.arc(0, 0.05, 0.5, Math.PI, 0, true); ctx.stroke();
    ctx.strokeStyle = '#e8394d'; ctx.lineWidth = 0.32;
    ctx.beginPath(); ctx.arc(0, 0.05, 0.5, Math.PI, 0, true); ctx.stroke();
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(-0.7, -0.45, 0.4, 0.4); ctx.fillRect(0.3, -0.45, 0.4, 0.4);
  } else if (kind === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -0.85); ctx.quadraticCurveTo(0.45, -0.6, 0.7, -0.65); ctx.quadraticCurveTo(0.75, 0.45, 0, 0.9);
    ctx.quadraticCurveTo(-0.75, 0.45, -0.7, -0.65); ctx.quadraticCurveTo(-0.45, -0.6, 0, -0.85);
    fillStroke(ctx, '#ffffff', '#1f8fd6', 0.1);
    heartPath(ctx, 0, 0.05, 0.38); fillStroke(ctx, '#ff6fae', null);
  }
  ctx.restore();
}

const CHEST_COL = {
  wood: { body: '#c17a3e', dark: '#8a5222', band: '#7a7a8c', lock: '#ffd84d' },
  silver: { body: '#b9c3d6', dark: '#7e8aa3', band: '#ffffff', lock: '#4fc3ff' },
  gold: { body: '#ffcf3a', dark: '#d59a12', band: '#ff6fae', lock: '#ff4f9a' },
};
// Сундук: центр низа в (x, y), size — ширина. open: 0..1
export function drawChest(ctx, x, y, size, tier, open, t) {
  const c = CHEST_COL[tier] || CHEST_COL.wood;
  const w = size, h = size * 0.62;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  if (open > 0) {
    const g = ctx.createRadialGradient(0, -h, 0, 0, -h, size * 1.2);
    g.addColorStop(0, `rgba(255,240,150,${0.9 * open})`);
    g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -h, size * 1.2, 0, TAU); ctx.fill();
  }
  // корпус
  rrect(ctx, -w / 2, -h * 0.62, w, h * 0.62, w * 0.06);
  fillStroke(ctx, c.body, c.dark, w * 0.04);
  ctx.fillStyle = c.dark;
  for (const fx of [-0.36, 0.28]) ctx.fillRect(w * fx, -h * 0.62, w * 0.08, h * 0.62);
  // крышка
  ctx.save();
  ctx.translate(0, -h * 0.62);
  ctx.rotate(-open * 1.9);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.2);
  ctx.quadraticCurveTo(-w / 2, -h * 0.48, 0, -h * 0.5);
  ctx.quadraticCurveTo(w / 2, -h * 0.48, w / 2, -h * 0.2);
  ctx.lineTo(w / 2, 0); ctx.closePath();
  fillStroke(ctx, c.body, c.dark, w * 0.04);
  ctx.fillStyle = c.band;
  for (const fx of [-0.36, 0.28]) ctx.fillRect(w * fx, -h * 0.48, w * 0.08, h * 0.48);
  ctx.restore();
  // замочек
  if (open < 0.3) {
    rrect(ctx, -w * 0.09, -h * 0.72, w * 0.18, h * 0.24, w * 0.03);
    fillStroke(ctx, c.lock, c.dark, w * 0.025);
  }
  // блеск
  const tw = (Math.sin(t * 4) + 1) / 2;
  ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * tw})`;
  starPath(ctx, w * 0.42, -h * 0.95, w * 0.09, w * 0.03, 4);
  ctx.fill();
  ctx.restore();
}

// ================== УКРАШЕНИЯ МИРОВ ==================
// (x, y) — точка на земле, s — масштаб
export function drawDeco(ctx, type, x, y, s, flip, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (type) {
    case 'tree': case 'atree': {
      ctx.fillStyle = '#8a5a31'; rrect(ctx, -0.2, -2.2, 0.4, 2.3, 0.1); ctx.fill();
      const leaf = type === 'atree' ? ['#e8692c', '#f59a2b', '#ffc23f'] : ['#4cb648', '#5ecf3e', '#7fdc5c'];
      for (const [cx, cy, r, k] of [[-0.7, -2.5, 0.9, 0], [0.7, -2.6, 0.85, 0], [0, -3.3, 1.05, 1], [0.2, -2.6, 0.6, 2]]) { circle(ctx, cx, cy, r); ctx.fillStyle = leaf[k]; ctx.fill(); }
      ctx.fillStyle = type === 'atree' ? '#d8452f' : '#ff6b8a';
      for (const [ax, ay] of [[-0.6, -2.4], [0.5, -3.3], [0.9, -2.3]]) { circle(ctx, ax, ay, 0.13); ctx.fill(); }
      break;
    }
    case 'flower': {
      const col = ['#ff6fae', '#ffd93b', '#b98cff', '#ff8a5c', '#ffffff'][Math.floor(Math.abs(x * 7)) % 5];
      ctx.strokeStyle = '#3fa52a'; ctx.lineWidth = 0.08;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.1, -0.4, 0, -0.75); ctx.stroke();
      ctx.save(); ctx.translate(0, -0.8); ctx.rotate(Math.sin(t * 2 + x) * 0.15);
      for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; circle(ctx, Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.13); ctx.fillStyle = col; ctx.fill(); }
      circle(ctx, 0, 0, 0.1); ctx.fillStyle = '#ffb32b'; ctx.fill();
      ctx.restore();
      break;
    }
    case 'bush': {
      ctx.fillStyle = '#4cb648';
      for (const [cx, cy, r] of [[-0.5, -0.4, 0.5], [0.4, -0.45, 0.55], [0, -0.7, 0.6]]) { circle(ctx, cx, cy, r); ctx.fill(); }
      ctx.fillStyle = '#ff4f6d';
      for (const [cx, cy] of [[-0.4, -0.6], [0.2, -0.9], [0.5, -0.4]]) { circle(ctx, cx, cy, 0.09); ctx.fill(); }
      break;
    }
    case 'rock': case 'moonrock': {
      ctx.beginPath(); ctx.moveTo(-0.7, 0.1); ctx.quadraticCurveTo(-0.6, -0.6, 0, -0.65); ctx.quadraticCurveTo(0.65, -0.55, 0.7, 0.1); ctx.closePath();
      fillStroke(ctx, type === 'rock' ? '#a9a3b5' : '#8d8da6', type === 'rock' ? '#8a8496' : '#6d6d86', 0.06);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ellipse(ctx, -0.2, -0.4, 0.2, 0.08, -0.3); ctx.fill();
      break;
    }
    case 'lollipop': {
      ctx.fillStyle = '#fff'; ctx.fillRect(-0.06, -2.2, 0.12, 2.3);
      ctx.save(); ctx.translate(0, -2.5); ctx.rotate(t * 0.8);
      circle(ctx, 0, 0, 0.6); fillStroke(ctx, '#ff6fae', '#d9468b', 0.05);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.13;
      ctx.beginPath(); for (let i = 0; i < 30; i++) { const a = i * 0.4, r = i * 0.018; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
      ctx.restore();
      break;
    }
    case 'cane': {
      ctx.lineWidth = 0.28; ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -2); ctx.arc(0.4, -2, 0.4, Math.PI, 0); ctx.stroke();
      ctx.setLineDash([0.18, 0.18]); ctx.strokeStyle = '#ff4f6d'; ctx.stroke(); ctx.setLineDash([]);
      break;
    }
    case 'cupcake': {
      ctx.beginPath(); ctx.moveTo(-0.5, -0.7); ctx.lineTo(0.5, -0.7); ctx.lineTo(0.38, 0); ctx.lineTo(-0.38, 0); ctx.closePath();
      fillStroke(ctx, '#ffb3d9', '#e081b0', 0.05);
      for (const [cx, cy, r] of [[-0.3, -0.8, 0.28], [0.3, -0.8, 0.28], [0, -1.0, 0.35]]) { circle(ctx, cx, cy, r); ctx.fillStyle = '#fff6fb'; ctx.fill(); }
      circle(ctx, 0, -1.35, 0.13); ctx.fillStyle = '#ff3d6e'; ctx.fill();
      break;
    }
    case 'heart': {
      ctx.translate(0, -1.4 + Math.sin(t * 2 + x) * 0.2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(0, 0.3); ctx.lineTo(0, 1.4); ctx.stroke();
      heartPath(ctx, 0, 0, 0.55); fillStroke(ctx, '#ff4f9a', '#d9307a', 0.05);
      break;
    }
    case 'cactus': {
      ctx.fillStyle = '#4fb36b'; ctx.strokeStyle = '#3a8f52'; ctx.lineWidth = 0.05;
      rrect(ctx, -0.25, -2.1, 0.5, 2.15, 0.25); ctx.fill(); ctx.stroke();
      rrect(ctx, -0.85, -1.4, 0.32, 0.9, 0.16); ctx.fill(); ctx.stroke();
      rrect(ctx, -0.85, -0.8, 0.7, 0.3, 0.15); ctx.fill();
      rrect(ctx, 0.5, -1.8, 0.32, 0.8, 0.16); ctx.fill(); ctx.stroke();
      rrect(ctx, 0.15, -1.2, 0.67, 0.3, 0.15); ctx.fill();
      circle(ctx, 0, -2.15, 0.15); ctx.fillStyle = '#ff6fae'; ctx.fill();
      break;
    }
    case 'palm': {
      ctx.strokeStyle = '#a8733d'; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.5, -1.8, 0.2, -3.4); ctx.stroke();
      ctx.save(); ctx.translate(0.2, -3.4); ctx.rotate(Math.sin(t * 1.5 + x) * 0.05);
      ctx.fillStyle = '#3fae5a';
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55;
        ctx.save(); ctx.rotate(a + Math.PI / 2);
        ellipse(ctx, 0, -0.9, 0.25, 0.95, 0); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#7a4a22'; circle(ctx, -0.12, 0.12, 0.14); ctx.fill(); circle(ctx, 0.15, 0.15, 0.14); ctx.fill();
      ctx.restore();
      break;
    }
    case 'pine': {
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(-0.15, -0.6, 0.3, 0.7);
      for (let i = 0; i < 3; i++) {
        const y0 = -0.4 - i * 0.9, w = 1.2 - i * 0.3;
        ctx.beginPath(); ctx.moveTo(-w, y0); ctx.lineTo(0, y0 - 1.3); ctx.lineTo(w, y0); ctx.closePath();
        ctx.fillStyle = '#2f8f5b'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-w * 0.55, y0 - 0.55); ctx.lineTo(0, y0 - 1.3); ctx.lineTo(w * 0.55, y0 - 0.55);
        ctx.quadraticCurveTo(0, y0 - 0.4, -w * 0.55, y0 - 0.55); ctx.fillStyle = '#fff'; ctx.fill();
      }
      break;
    }
    case 'snowman': {
      circle(ctx, 0, -0.55, 0.6); fillStroke(ctx, '#fff', '#c9dff0', 0.05);
      circle(ctx, 0, -1.4, 0.42); fillStroke(ctx, '#fff', '#c9dff0', 0.05);
      ctx.fillStyle = '#2b2b33'; circle(ctx, -0.13, -1.5, 0.05); ctx.fill(); circle(ctx, 0.13, -1.5, 0.05); ctx.fill();
      ctx.fillStyle = '#ff8a2b'; ctx.beginPath(); ctx.moveTo(0, -1.42); ctx.lineTo(0.38, -1.36); ctx.lineTo(0, -1.32); ctx.fill();
      ctx.fillStyle = '#ff4f9a'; ctx.fillRect(-0.4, -1.12, 0.8, 0.14); ctx.fillRect(0.15, -1.12, 0.14, 0.4);
      ctx.fillStyle = '#ff6fae'; ctx.beginPath(); ctx.ellipse(0, -1.78, 0.38, 0.12, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.28, -1.78); ctx.lineTo(0, -2.2); ctx.lineTo(0.28, -1.78); ctx.fill();
      break;
    }
    case 'mushroom': {
      ctx.fillStyle = '#fff3e0'; rrect(ctx, -0.15, -0.6, 0.3, 0.65, 0.1); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -0.6, 0.55, 0.42, 0, Math.PI, 0); ctx.closePath();
      fillStroke(ctx, '#ff4f4f', '#d43030', 0.04);
      ctx.fillStyle = '#fff'; circle(ctx, -0.22, -0.78, 0.08); ctx.fill(); circle(ctx, 0.18, -0.88, 0.09); ctx.fill(); circle(ctx, 0.3, -0.68, 0.06); ctx.fill();
      break;
    }
    case 'pumpkin': {
      for (const [cx, rx] of [[-0.3, 0.35], [0.3, 0.35], [0, 0.4]]) { ellipse(ctx, cx, -0.4, rx, 0.4); fillStroke(ctx, '#ff9a2b', '#d9761a', 0.04); }
      ctx.fillStyle = '#4c9a3a'; ctx.fillRect(-0.05, -0.95, 0.1, 0.2);
      break;
    }
    case 'crater': {
      ellipse(ctx, 0, 0.05, 0.9, 0.22); fillStroke(ctx, 'rgba(90,90,120,0.45)', 'rgba(255,255,255,0.4)', 0.05);
      break;
    }
    case 'rocket': {
      ctx.rotate(-0.15);
      ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.quadraticCurveTo(0.45, -2.0, 0.4, -0.5); ctx.lineTo(-0.4, -0.5); ctx.quadraticCurveTo(-0.45, -2.0, 0, -2.6);
      fillStroke(ctx, '#f6f3fb', '#b9b2c9', 0.05);
      ctx.fillStyle = '#ff6fae'; ctx.beginPath(); ctx.moveTo(-0.4, -1.0); ctx.lineTo(-0.75, -0.2); ctx.lineTo(-0.4, -0.5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.4, -1.0); ctx.lineTo(0.75, -0.2); ctx.lineTo(0.4, -0.5); ctx.fill();
      circle(ctx, 0, -1.7, 0.2); fillStroke(ctx, '#7fd0ff', '#5a5470', 0.05);
      break;
    }
    case 'shell': {
      ctx.beginPath(); ctx.moveTo(-0.45, 0); ctx.quadraticCurveTo(-0.5, -0.6, 0, -0.65); ctx.quadraticCurveTo(0.5, -0.6, 0.45, 0); ctx.closePath();
      fillStroke(ctx, '#ffc2d6', '#e892b0', 0.05);
      ctx.strokeStyle = '#e892b0'; ctx.lineWidth = 0.04;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, -0.05); ctx.lineTo(i * 0.17, -0.58 + Math.abs(i) * 0.06); ctx.stroke(); }
      break;
    }
    case 'umbrella': {
      ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(0, 0.1); ctx.lineTo(0.1, -2.3); ctx.stroke();
      ctx.save(); ctx.translate(0.1, -2.3); ctx.rotate(0.1);
      const cols = ['#ff6fae', '#fff', '#ff6fae', '#fff', '#ff6fae'];
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0.3, 1.3, Math.PI + 0.25 + i * 0.53, Math.PI + 0.25 + (i + 1) * 0.53); ctx.closePath();
        ctx.fillStyle = cols[i]; ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'starfish': {
      starPath(ctx, 0, -0.3, 0.4, 0.18, 5, -Math.PI / 2 + 0.2);
      fillStroke(ctx, '#ff8a5c', '#e0603a', 0.04);
      break;
    }
  }
  ctx.restore();
}
