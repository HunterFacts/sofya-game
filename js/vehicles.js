// Машины. Каждая машина — описание: физика, контур для столкновений, окна для Софьи и зверька,
// грузовое место (для котят) и функция рисования кузова.
//
// Координаты машины: центр кузова (0,0), вперёд +X, вниз +Y, метры.
//
// spec = {
//   id, price,
//   phys: { anchors: [{x,y} задняя, {x,y} передняя], wheelR, rest, bump, maxExt, bodyMass, bodyInertia },
//   mult: { torque, speed, grip, air },   // множители к прокачке (1 = как пикап)
//   hull: [{x, y, roof?}],                // точки касания земли; roof — касание = авария
//   windows: [{ role: 'pet'|'driver', path(ctx), x, y, scale }],  // где сидят зверёк и Софья
//   glass: [yTop, yBottom],               // вертикальный диапазон стёкол (для градиента)
//   cargo: { x0, x1, floorY, wallY },     // грузовое место: пол и верх бортика
//   exhaust: {x, y}, headlight: {x, y},
//   draw(ctx, K)                          // рисует кузов; K — помощник (см. drawCar в art.js)
//   preview?: { x0, x1, y0 }              // рамка рисунка для превью, если он выступает за hull (хвост, пламя)
// }
import { rrect, ellipse, circle, fillStroke, heartPath, starPath } from './draw-utils.js';

export const VEHICLES = [];
export function registerVehicle(spec) {
  const i = VEHICLES.findIndex((v) => v.id === spec.id);
  if (i >= 0) VEHICLES[i] = spec; else VEHICLES.push(spec);
}
export function vehicleById(id) { return VEHICLES.find((v) => v.id === id) || VEHICLES[0]; }

// ================== Пикап (машина по умолчанию) ==================
const ARCH = 0.457, ARCH2 = Math.PI - 0.457;

function pickupLower(ctx) {
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
function pickupCab(ctx) {
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
function pickupRearWindow(ctx) { rrect(ctx, -0.9, -1.07, 0.8, 0.64, 0.1); }
function pickupFrontWindow(ctx) {
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

// Стойки подвески от точек крепления к колёсам (общие для всех машин)
export function drawStruts(ctx, K) {
  const { anchors } = K.vehicle.phys;
  for (const [col, lw] of [['#5b5566', 0.13], ['#8e879b', 0.06]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath(); ctx.moveTo(anchors[i].x, anchors[i].y - 0.05); ctx.lineTo(K.wheels[i].x, K.wheels[i].y); ctx.stroke();
    }
  }
}

// Антенна с сердечком
export function drawAntenna(ctx, K, x, y, len = 0.55) {
  const sway = Math.sin(K.t * 5) * 0.12 - K.state.a * 0.3;
  ctx.strokeStyle = '#6d6578';
  ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 0.05 + sway * 0.5, y - len * 0.5, x - 0.05 + sway, y - len); ctx.stroke();
  heartPath(ctx, x - 0.05 + sway, y - len - 0.02, 0.13);
  fillStroke(ctx, '#ff4f9a', '#c8306f', 0.03);
}

registerVehicle({
  id: 'pickup',
  price: 0,
  phys: { anchors: [{ x: -1.2, y: 0.25 }, { x: 1.2, y: 0.25 }], wheelR: 0.5, rest: 0.45, bump: 0.2, maxExt: 0.72, bodyMass: 7, bodyInertia: 9 },
  mult: { torque: 1, speed: 1, grip: 1, air: 1 },
  hull: [
    { x: 1.9, y: 0.25 }, { x: 1.85, y: -0.3 }, { x: 1.1, y: -0.35 },
    { x: -1.9, y: 0.25 }, { x: -1.9, y: -0.45 },
    { x: 0, y: 0.4 },
    { x: 0.75, y: -1.15, roof: true }, { x: -0.1, y: -1.2, roof: true }, { x: -0.95, y: -1.15, roof: true },
  ],
  windows: [
    { role: 'pet', path: pickupRearWindow, x: -0.5, y: -0.66, scale: 0.22 },
    { role: 'driver', path: pickupFrontWindow, x: 0.31, y: -0.67, scale: 0.2 },
  ],
  glass: [-1.07, -0.43],
  cargo: { x0: -1.88, x1: -1.08, floorY: -0.3, wallY: -0.47 },
  exhaust: { x: -2.02, y: 0.06 },
  headlight: { x: 1.9, y: -0.13 },
  draw(ctx, K) {
    const { paint } = K;
    drawStruts(ctx, K);
    // кабина
    pickupCab(ctx);
    fillStroke(ctx, K.paintFill(-1.2, -0.3), paint.dark, 0.05);
    K.decorate(pickupCab, 'cab', { x0: -1.05, x1: 1.15, y0: -1.2, y1: -0.3 });
    K.windows();
    drawAntenna(ctx, K, -0.85, -1.17);
    // котята и прочий груз — за бортом кузова
    K.cargo();
    // низ кузова
    pickupLower(ctx);
    ctx.fillStyle = K.paintFill(-0.5, 0.35);
    ctx.fill();
    K.decorate(pickupLower, 'lower', { x0: -2.0, x1: 2.0, y0: -0.5, y1: 0.32 }, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(-1.98, -0.47, 0.96, 0.1);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-2, -0.05, 4, 0.07);
    });
    pickupLower(ctx);
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
    // бамперы и выхлопная труба
    ctx.fillStyle = '#5b5566';
    rrect(ctx, 1.62, 0.13, 0.42, 0.17, 0.07); ctx.fill();
    rrect(ctx, -2.04, 0.13, 0.42, 0.17, 0.07); ctx.fill();
    ctx.fillStyle = '#8e879b';
    rrect(ctx, -2.1, 0.02, 0.16, 0.08, 0.03); ctx.fill();
  },
});

// ================== Общие детали для новых машин ==================
// Арка колеса с центром (cx, 0.6): правый край → верх → левый край (как у пикапа)
const archR = (cx) => cx + 0.68 * Math.cos(ARCH);
function arch(ctx, cx) { ctx.arc(cx, 0.6, 0.68, -ARCH, -ARCH2, true); }

function glassFill(ctx, K) {
  const [gy0, gy1] = K.vehicle.glass;
  const g = ctx.createLinearGradient(0, gy0, 0, gy1);
  g.addColorStop(0, '#bfe7ff');
  g.addColorStop(1, '#8cc9ef');
  return g;
}

// Окно без пассажира (занавески, игрушка): стекло, картинка внутри, блик и рамка — как окна с Софьей
function plainWindow(ctx, K, path, x, inside, glass = glassFill(ctx, K)) {
  path(ctx);
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.save();
  path(ctx);
  ctx.clip();
  if (inside) inside();
  const [gy0, gy1] = K.vehicle.glass, h = gy1 - gy0;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (const off of [-0.32, 0.36]) {
    const bx = x + off;
    ctx.beginPath();
    ctx.moveTo(bx, gy0 - 0.03); ctx.lineTo(bx + 0.16, gy0 - 0.03); ctx.lineTo(bx + 0.16 - h * 0.7, gy1 + 0.03); ctx.lineTo(bx - h * 0.7, gy1 + 0.03);
    ctx.fill();
  }
  ctx.restore();
  path(ctx);
  ctx.strokeStyle = K.paint.dark;
  ctx.lineWidth = 0.05;
  ctx.stroke();
}

function bumper(ctx, x, y, w, h, fill = '#5b5566') {
  ctx.fillStyle = fill;
  rrect(ctx, x, y, w, h, Math.min(w, h) * 0.42);
  ctx.fill();
}
function headlight(ctx, x, y, rx = 0.09, ry = 0.11) {
  ellipse(ctx, x, y, rx, ry);
  fillStroke(ctx, '#fff7b0', '#e3b52c', 0.025);
}
function tailLight(ctx, x, y, h = 0.2) {
  rrect(ctx, x, y, 0.07, h, 0.03);
  fillStroke(ctx, '#ff5470', null);
}
function exhaustPipe(ctx, x, y) {
  ctx.fillStyle = '#8e879b';
  rrect(ctx, x, y, 0.16, 0.08, 0.03);
  ctx.fill();
}
// Обвести контур тёмным цветом краски
function outline(ctx, K, path, lw = 0.05) {
  path(ctx);
  ctx.strokeStyle = K.paint.dark;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// ================== Школьный автобус ==================
function busBody(ctx) {
  ctx.beginPath();
  ctx.moveTo(-2.42, 0.3);
  ctx.quadraticCurveTo(-2.56, 0.3, -2.56, 0.16);
  ctx.lineTo(-2.56, -1.24);
  ctx.quadraticCurveTo(-2.56, -1.46, -2.34, -1.46);
  ctx.lineTo(1.5, -1.46);
  ctx.bezierCurveTo(2.0, -1.46, 2.32, -1.18, 2.44, -0.62);
  ctx.lineTo(2.5, -0.3);
  ctx.quadraticCurveTo(2.56, -0.2, 2.56, -0.04);
  ctx.lineTo(2.56, 0.16);
  ctx.quadraticCurveTo(2.56, 0.3, 2.42, 0.3);
  ctx.lineTo(archR(1.7), 0.3);
  arch(ctx, 1.7);
  ctx.lineTo(archR(-1.7), 0.3);
  arch(ctx, -1.7);
  ctx.closePath();
}
const busWin1 = (ctx) => rrect(ctx, -2.34, -1.24, 0.66, 0.62, 0.12);
const busPetWindow = (ctx) => rrect(ctx, -1.52, -1.24, 0.92, 0.62, 0.12);
const busWin3 = (ctx) => rrect(ctx, -0.44, -1.24, 0.66, 0.62, 0.12);
function busFrontWindow(ctx) {
  ctx.beginPath();
  ctx.moveTo(1.12, -1.12);
  ctx.quadraticCurveTo(1.12, -1.24, 1.24, -1.24);
  ctx.lineTo(1.56, -1.24);
  ctx.bezierCurveTo(1.92, -1.24, 2.16, -1.0, 2.25, -0.72);
  ctx.quadraticCurveTo(2.28, -0.62, 2.18, -0.62);
  ctx.lineTo(1.22, -0.62);
  ctx.quadraticCurveTo(1.12, -0.62, 1.12, -0.72);
  ctx.closePath();
}

// Занавески с подхватами и оборкой
function curtains(ctx, x0, x1, y0, y1) {
  const mx = (x0 + x1) / 2, h = y1 - y0;
  for (const [a, d] of [[x0, 1], [x1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(a, y0);
    ctx.lineTo(a + d * (mx - a) * 0.9, y0);
    ctx.quadraticCurveTo(a + d * 0.07, y0 + h * 0.5, a + d * 0.2, y1 + 0.02);
    ctx.lineTo(a, y1 + 0.02);
    ctx.closePath();
    fillStroke(ctx, '#ffc0dc', '#f08cbc', 0.025);
    circle(ctx, a + d * 0.1, y0 + h * 0.56, 0.045);
    fillStroke(ctx, '#ff5fa8', null);
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 0.02);
  ctx.lineTo(x1, y0 - 0.02);
  ctx.lineTo(x1, y0 + 0.1);
  for (let i = 0; i < 5; i++) {
    const a = x1 - ((x1 - x0) * i) / 5, b = x1 - ((x1 - x0) * (i + 1)) / 5;
    ctx.quadraticCurveTo((a + b) / 2, y0 + 0.2, b, y0 + 0.1);
  }
  ctx.closePath();
  fillStroke(ctx, '#ff8cc6', null);
}

// Силуэт плюшевого мишки в окне
function teddy(ctx, x, y) {
  ctx.fillStyle = 'rgba(96,64,150,0.42)';
  circle(ctx, x - 0.13, y - 0.17, 0.07); ctx.fill();
  circle(ctx, x + 0.13, y - 0.17, 0.07); ctx.fill();
  circle(ctx, x, y - 0.05, 0.16); ctx.fill();
  ellipse(ctx, x, y + 0.25, 0.2, 0.19); ctx.fill();
  ellipse(ctx, x - 0.2, y + 0.16, 0.06, 0.1, 0.6); ctx.fill();
  ellipse(ctx, x + 0.2, y + 0.16, 0.06, 0.1, -0.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  heartPath(ctx, x, y + 0.3, 0.07); ctx.fill();
}

// Багажник на крыше: стойки и перила (перед грузом)
function busRack(ctx) {
  ctx.strokeStyle = '#6d6578';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  for (const x of [-2.1, -1.2, -0.3, 0.55]) { ctx.moveTo(x, -1.46); ctx.lineTo(x, -1.64); }
  ctx.moveTo(-2.15, -1.64); ctx.lineTo(0.6, -1.64);
  ctx.stroke();
  ctx.strokeStyle = '#b3abc0';
  ctx.lineWidth = 0.025;
  ctx.beginPath(); ctx.moveTo(-2.12, -1.655); ctx.lineTo(0.57, -1.655); ctx.stroke();
}

registerVehicle({
  id: 'bus',
  price: 2000,
  phys: { anchors: [{ x: -1.7, y: 0.25 }, { x: 1.7, y: 0.25 }], wheelR: 0.5, rest: 0.45, bump: 0.2, maxExt: 0.72, bodyMass: 7.2, bodyInertia: 15 },
  mult: { torque: 1.12, speed: 0.9, grip: 1.05, air: 0.9 },
  hull: [
    { x: 2.5, y: 0.25 }, { x: 2.52, y: -0.3 }, { x: 2.2, y: -1.05 },
    { x: -2.5, y: 0.25 }, { x: -2.52, y: -0.6 }, { x: -2.42, y: -1.36 },
    { x: 0, y: 0.4 },
    { x: 1.4, y: -1.5, roof: true }, { x: 0.3, y: -1.66, roof: true }, { x: -0.9, y: -1.66, roof: true }, { x: -2.0, y: -1.66, roof: true },
  ],
  windows: [
    { role: 'pet', path: busPetWindow, x: -1.06, y: -0.83, scale: 0.25 },
    { role: 'driver', path: busFrontWindow, x: 1.6, y: -0.85, scale: 0.22 },
  ],
  glass: [-1.24, -0.62],
  cargo: { x0: -2.12, x1: 0.55, floorY: -1.46, wallY: -1.6 },
  preview: { y0: -2.08 },
  exhaust: { x: -2.72, y: 0.07 },
  headlight: { x: 2.5, y: -0.1 },
  draw(ctx, K) {
    const { paint } = K;
    drawStruts(ctx, K);
    // котята и прочий груз — на крыше, за перилами
    K.cargo();
    busBody(ctx);
    ctx.fillStyle = K.paintFill(-1.46, 0.3);
    ctx.fill();
    K.decorate(busBody, 'body', { x0: -2.6, x1: 2.6, y0: -1.5, y1: 0.32 }, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-2.6, -1.5, 5.2, 0.12);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-2.6, -0.5, 5.2, 0.08);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(-2.6, -0.2, 5.2, 0.06);
    });
    outline(ctx, K, busBody);
    K.windows();
    const glass = glassFill(ctx, K);
    plainWindow(ctx, K, busWin1, -2.01, () => curtains(ctx, -2.34, -1.68, -1.24, -0.62), glass);
    plainWindow(ctx, K, busWin3, -0.11, () => teddy(ctx, -0.11, -0.84), glass);
    // дверь-гармошка
    rrect(ctx, 0.38, -1.3, 0.62, 1.42, 0.08);
    fillStroke(ctx, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.22)', 0.035);
    for (const x of [0.45, 0.71]) {
      rrect(ctx, x, -1.22, 0.22, 0.6, 0.06); fillStroke(ctx, glass, paint.dark, 0.03);
      rrect(ctx, x, -0.48, 0.22, 0.5, 0.06); fillStroke(ctx, glass, paint.dark, 0.03);
    }
    // перила багажника, антенна, мигалки
    busRack(ctx);
    drawAntenna(ctx, K, 1.05, -1.46, 0.45);
    for (const [x, col] of [[1.42, '#ffc83a'], [-2.36, '#ff5470']]) {
      ctx.beginPath(); ctx.arc(x, -1.46, 0.09, Math.PI, 0); ctx.closePath();
      fillStroke(ctx, col, 'rgba(0,0,0,0.25)', 0.025);
    }
    // фары, фонари, бамперы, выхлопная труба
    headlight(ctx, 2.5, -0.1, 0.08, 0.11);
    tailLight(ctx, -2.59, -0.42, 0.22);
    bumper(ctx, 2.28, 0.12, 0.36, 0.17);
    bumper(ctx, -2.64, 0.12, 0.36, 0.17);
    exhaustPipe(ctx, -2.76, 0.03);
  },
});

// ================== Фургон с мороженым ==================
function vanBody(ctx) {
  ctx.beginPath();
  ctx.moveTo(-2.1, 0.3);
  ctx.quadraticCurveTo(-2.22, 0.3, -2.22, 0.18);
  ctx.lineTo(-2.22, -1.36);
  ctx.quadraticCurveTo(-2.22, -1.5, -2.08, -1.5);
  ctx.lineTo(0.68, -1.5);
  ctx.quadraticCurveTo(0.82, -1.5, 0.82, -1.36);
  ctx.lineTo(0.82, -1.16);
  ctx.lineTo(1.24, -1.16);
  ctx.quadraticCurveTo(1.36, -1.16, 1.42, -1.06);
  ctx.lineTo(1.84, -0.5);
  ctx.lineTo(1.98, -0.47);
  ctx.quadraticCurveTo(2.18, -0.43, 2.18, -0.22);
  ctx.lineTo(2.18, 0.18);
  ctx.quadraticCurveTo(2.18, 0.3, 2.06, 0.3);
  ctx.lineTo(archR(1.35), 0.3);
  arch(ctx, 1.35);
  ctx.lineTo(archR(-1.35), 0.3);
  arch(ctx, -1.35);
  ctx.closePath();
}
function vanDriverWindow(ctx) {
  ctx.beginPath();
  ctx.moveTo(0.9, -0.98);
  ctx.quadraticCurveTo(0.9, -1.07, 0.99, -1.07);
  ctx.lineTo(1.2, -1.07);
  ctx.quadraticCurveTo(1.28, -1.07, 1.33, -1.0);
  ctx.lineTo(1.68, -0.56);
  ctx.quadraticCurveTo(1.7, -0.52, 1.65, -0.52);
  ctx.lineTo(0.95, -0.52);
  ctx.quadraticCurveTo(0.9, -0.52, 0.9, -0.57);
  ctx.closePath();
}
const vanServeWindow = (ctx) => rrect(ctx, -1.3, -1.1, 1.7, 0.66, 0.08);

// Полосатый козырёк с фестонами над окошком
function awningPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.36, -1.38);
  ctx.lineTo(0.46, -1.38);
  ctx.lineTo(0.56, -1.14);
  const n = 8, x0 = 0.56, x1 = -1.46;
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n, b = x0 + ((x1 - x0) * (i + 1)) / n;
    ctx.quadraticCurveTo((a + b) / 2, -1.0, b, -1.14);
  }
  ctx.closePath();
}
function awning(ctx) {
  ctx.save();
  awningPath(ctx);
  ctx.clip();
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#ff7eb6';
    ctx.beginPath();
    const x = -1.5 + i * 0.2525;
    ctx.moveTo(x + 0.03, -1.4); ctx.lineTo(x + 0.28, -1.4); ctx.lineTo(x + 0.2525, -0.98); ctx.lineTo(x, -0.98);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(-1.5, -1.4, 2.1, 0.06);
  ctx.restore();
  awningPath(ctx);
  ctx.strokeStyle = '#e0609f';
  ctx.lineWidth = 0.035;
  ctx.stroke();
}

// Рожок с шариками; (x, y) — кончик рожка, s — размер; second = [цвет, обводка] второго шарика.
// Маленькие рожки на прилавке (big = false) — без вафельной сетки и посыпки: дешевле рисовать.
const SPRINKLES = [[-0.36, -0.24, 0.5, '#ffd93b'], [0.3, -0.48, -0.6, '#6fd3ff'], [0.06, 0.0, 1.2, '#ffffff'], [-0.12, -0.6, 0.1, '#8be86a']];
function scoop(ctx, cy, r, fill, stroke, sprinkles) {
  ctx.beginPath();
  ctx.arc(0, cy, r, Math.PI * 0.86, Math.PI * 0.14);
  const yb = cy + r * 0.52;
  for (let i = 0; i < 4; i++) {
    const a = r * 0.92 - (r * 1.84 * i) / 4, b = r * 0.92 - (r * 1.84 * (i + 1)) / 4;
    ctx.quadraticCurveTo((a + b) / 2, yb + r * (i % 2 ? 0.2 : 0.42), b, yb);
  }
  ctx.closePath();
  fillStroke(ctx, fill, stroke, 0.05);
  if (!sprinkles) return;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ellipse(ctx, -r * 0.4, cy - r * 0.45, r * 0.22, r * 0.13, -0.6); ctx.fill();
  ctx.lineWidth = 0.035;
  for (const [sx, sy, rot, col] of SPRINKLES) {
    const x = sx * r, y = cy + sy * r, dx = Math.cos(rot) * 0.045, dy = Math.sin(rot) * 0.045;
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  }
}
function iceCreamCone(ctx, x, y, s, top, topDark, second = null, big = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-0.3, -0.62); ctx.lineTo(0.3, -0.62); ctx.closePath();
  fillStroke(ctx, '#f6c27b', '#c98a45', 0.05);
  if (big) {
    // вафельная сетка: линии параллельно краям рожка, от края до края (без обрезки)
    ctx.strokeStyle = 'rgba(176,112,48,0.55)';
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    for (const u of [0.25, 0.5, 0.75]) {
      ctx.moveTo(0.3 * u, -0.62 * u); ctx.lineTo(0.6 * u - 0.3, -0.62);
      ctx.moveTo(-0.3 * u, -0.62 * u); ctx.lineTo(0.3 - 0.6 * u, -0.62);
    }
    ctx.stroke();
  }
  scoop(ctx, -0.74, 0.34, top, topDark, big);
  if (second) scoop(ctx, -1.06, 0.26, second[0], second[1], big);
  if (big) {
    ctx.strokeStyle = '#5a8a3a'; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(0.06, -1.38); ctx.quadraticCurveTo(0.1, -1.5, 0.2, -1.55); ctx.stroke();
    circle(ctx, 0.05, -1.34, 0.1);
    fillStroke(ctx, '#ff3b5c', '#c41f3d', 0.035);
    circle(ctx, 0.02, -1.37, 0.03); fillStroke(ctx, 'rgba(255,255,255,0.8)', null);
  }
  ctx.restore();
}

const VANILLA = ['#fff1c4', '#e8c77a'];

// Колокольчик-«динь-динь» на крыше кабины
function bell(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 5) * 0.18);
  ctx.strokeStyle = '#8e879b'; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(0, 0.02); ctx.lineTo(0, -0.08); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.2);
  ctx.quadraticCurveTo(-0.12, -0.36, 0, -0.36);
  ctx.quadraticCurveTo(0.12, -0.36, 0.14, -0.2);
  ctx.quadraticCurveTo(0.16, -0.1, 0.2, -0.08);
  ctx.lineTo(-0.2, -0.08);
  ctx.quadraticCurveTo(-0.16, -0.1, -0.14, -0.2);
  ctx.closePath();
  fillStroke(ctx, '#ffd23f', '#c3901b', 0.03);
  circle(ctx, 0, -0.06, 0.045); fillStroke(ctx, '#c3901b', null);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(ctx, -0.06, -0.22, 0.025, 0.06, 0.3); ctx.fill();
  ctx.restore();
}

registerVehicle({
  id: 'icecream',
  price: 3000,
  horn: 'jingle',
  phys: { anchors: [{ x: -1.35, y: 0.25 }, { x: 1.35, y: 0.25 }], wheelR: 0.48, rest: 0.45, bump: 0.2, maxExt: 0.72, bodyMass: 7.5, bodyInertia: 10.5 },
  mult: { torque: 1.05, speed: 0.95, grip: 1.05, air: 1 },
  hull: [
    { x: 2.12, y: 0.25 }, { x: 2.14, y: -0.32 }, { x: 1.55, y: -1.0 },
    { x: -2.18, y: 0.25 }, { x: -2.18, y: -1.36 },
    { x: 0, y: 0.4 },
    { x: 1.05, y: -1.2, roof: true }, { x: 0.55, y: -1.54, roof: true }, { x: -0.46, y: -2.72, roof: true }, { x: -1.6, y: -1.73, roof: true },
  ],
  windows: [
    { role: 'pet', path: vanServeWindow, x: -0.45, y: -0.72, scale: 0.22 },
    { role: 'driver', path: vanDriverWindow, x: 1.2, y: -0.77, scale: 0.19 },
  ],
  glass: [-1.1, -0.44],
  cargo: { x0: -2.04, x1: -1.16, floorY: -1.5, wallY: -1.71 },
  preview: { y0: -2.95 },
  exhaust: { x: -2.36, y: 0.07 },
  headlight: { x: 2.13, y: -0.16 },
  draw(ctx, K) {
    drawStruts(ctx, K);
    // котята — в ящике на крыше
    K.cargo();
    vanBody(ctx);
    ctx.fillStyle = K.paintFill(-1.5, 0.3);
    ctx.fill();
    K.decorate(vanBody, 'body', { x0: -2.25, x1: 2.2, y0: -1.55, y1: 0.32 }, () => {
      // глазурь стекает с крыши
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(-2.3, -1.56); ctx.lineTo(0.9, -1.56); ctx.lineTo(0.9, -1.42);
      for (let i = 0; i < 11; i++) {
        const a = 0.9 - i * 0.29, b = a - 0.29;
        ctx.quadraticCurveTo((a + b) / 2, -1.42 + (i % 3 === 1 ? 0.3 : 0.12), b, -1.42);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-2.3, -0.2, 4.5, 0.08);
    });
    outline(ctx, K, vanBody);
    K.windows();
    // прилавок с рожками
    rrect(ctx, -1.38, -0.48, 1.86, 0.09, 0.035);
    fillStroke(ctx, '#fff4f8', '#e0b3c9', 0.03);
    iceCreamCone(ctx, -1.08, -0.48, 0.32, '#8a5a3c', '#5e3a22');
    iceCreamCone(ctx, 0.17, -0.48, 0.32, '#a6f0dc', '#46c9a8');
    awning(ctx);
    // ящик на крыше (передняя стенка — перед грузом)
    rrect(ctx, -2.06, -1.72, 0.92, 0.24, 0.04);
    fillStroke(ctx, '#f4c58f', '#c48a52', 0.03);
    ctx.strokeStyle = 'rgba(160,100,50,0.45)'; ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(-2.02, -1.6); ctx.lineTo(-1.18, -1.6);
    for (const x of [-1.83, -1.6, -1.37]) { ctx.moveTo(x, -1.7); ctx.lineTo(x, -1.5); }
    ctx.stroke();
    // большое мороженое на крыше
    ctx.save();
    ctx.translate(-0.46, -1.5);
    ctx.rotate(Math.sin(K.t * 2.4) * 0.04);
    iceCreamCone(ctx, 0, 0.04, 0.94, '#ff9cc9', '#e0609f', VANILLA, true);
    ctx.restore();
    bell(ctx, 1.06, -1.16, K.t);
    headlight(ctx, 2.13, -0.16, 0.07, 0.1);
    tailLight(ctx, -2.25, -0.42, 0.22);
    bumper(ctx, 1.9, 0.12, 0.36, 0.17);
    bumper(ctx, -2.3, 0.12, 0.36, 0.17);
    exhaustPipe(ctx, -2.4, 0.03);
  },
});

// ================== Машина-единорог ==================
function uniCab(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.16, -0.4);
  ctx.bezierCurveTo(-1.16, -1.02, -0.76, -1.27, -0.1, -1.27);
  ctx.bezierCurveTo(0.56, -1.27, 0.98, -0.98, 1.32, -0.4);
  ctx.closePath();
}
function uniLower(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.72, -0.5);
  ctx.lineTo(1.2, -0.5);
  ctx.bezierCurveTo(1.7, -0.5, 2.02, -0.36, 2.02, -0.02);
  ctx.lineTo(2.02, 0.16);
  ctx.quadraticCurveTo(2.02, 0.3, 1.88, 0.3);
  ctx.lineTo(archR(1.2), 0.3);
  arch(ctx, 1.2);
  ctx.lineTo(archR(-1.2), 0.3);
  arch(ctx, -1.2);
  ctx.lineTo(-1.88, 0.3);
  ctx.quadraticCurveTo(-2.02, 0.3, -2.02, 0.16);
  ctx.lineTo(-2.02, -0.24);
  ctx.bezierCurveTo(-2.02, -0.42, -1.92, -0.5, -1.72, -0.5);
  ctx.closePath();
}
function uniPetWindow(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.98, -0.56);
  ctx.bezierCurveTo(-0.98, -0.94, -0.7, -1.14, -0.24, -1.15);
  ctx.quadraticCurveTo(-0.18, -1.15, -0.18, -1.09);
  ctx.lineTo(-0.18, -0.56);
  ctx.quadraticCurveTo(-0.18, -0.52, -0.22, -0.52);
  ctx.lineTo(-0.94, -0.52);
  ctx.quadraticCurveTo(-0.98, -0.52, -0.98, -0.56);
  ctx.closePath();
}
function uniFrontWindow(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.04, -1.09);
  ctx.quadraticCurveTo(-0.04, -1.15, 0.02, -1.15);
  ctx.bezierCurveTo(0.45, -1.14, 0.8, -0.92, 1.08, -0.56);
  ctx.quadraticCurveTo(1.1, -0.52, 1.04, -0.52);
  ctx.lineTo(0.0, -0.52);
  ctx.quadraticCurveTo(-0.04, -0.52, -0.04, -0.56);
  ctx.closePath();
}

const RAINBOW = ['#ff6b8b', '#ffa04d', '#ffd93b', '#6fe08a', '#5ec0ff', '#b083ff'];
// Прядь гривы: капелька от основания (x, y) назад, кончик чуть вверх
function lock(ctx, x, y, len, ang, w, color) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const X = (u, v) => x + c * u - s * v, Y = (u, v) => y + s * u + c * v;
  ctx.beginPath();
  ctx.moveTo(X(0.06, -w), Y(0.06, -w));
  ctx.quadraticCurveTo(X(-len * 0.55, -w * 1.7), Y(-len * 0.55, -w * 1.7), X(-len, 0), Y(-len, 0));
  ctx.quadraticCurveTo(X(-len * 0.45, w * 0.4), Y(-len * 0.45, w * 0.4), X(0.06, w), Y(0.06, w));
  ctx.quadraticCurveTo(X(0.14, 0), Y(0.14, 0), X(0.06, -w), Y(0.06, -w));
  ctx.fillStyle = color;
  ctx.fill();
}
const TAIL = [RAINBOW[0], RAINBOW[2], RAINBOW[4], RAINBOW[5]];
const MANE = [[0.5, -1.15, 0.42], [0.24, -1.23, 0.3], [-0.04, -1.27, 0.18], [-0.32, -1.25, 0.04], [-0.6, -1.17, -0.12], [-0.86, -1.03, -0.3]];
function mane(ctx, t, speed) {
  const flow = Math.min(0.25, speed * 0.02);
  for (let i = MANE.length - 1; i >= 0; i--) {
    const [x, y, a] = MANE[i];
    const w = Math.sin(t * 7 - i * 0.9) * 0.07;
    lock(ctx, x, y, 0.56 + flow, a + 0.16 - flow * 0.5 + w, 0.12, RAINBOW[i]);
  }
}
function uniTail(ctx, t, speed) {
  const flow = Math.min(0.3, speed * 0.025);
  ctx.save();
  ctx.translate(-1.96, -0.36);
  ctx.rotate(-flow);
  for (let i = 0; i < 4; i++) {
    const sw = Math.sin(t * 4 - i * 0.7) * 0.08;
    ctx.beginPath();
    ctx.moveTo(0.1, -0.1 + i * 0.05);
    ctx.bezierCurveTo(-0.4, -0.4 + i * 0.08, -0.75 + sw, -0.05 + i * 0.1, -0.6 + sw, 0.55 - i * 0.04);
    ctx.bezierCurveTo(-0.55 + sw * 0.5, 0.1 + i * 0.06, -0.3, -0.08 + i * 0.07, 0.1, 0.06 + i * 0.05);
    ctx.closePath();
    ctx.fillStyle = TAIL[i];
    ctx.fill();
  }
  ctx.restore();
}
function uniHorn(ctx) {
  const g = ctx.createLinearGradient(1.5, -0.45, 1.95, -0.7);
  g.addColorStop(0, '#fff1b8');
  g.addColorStop(0.5, '#f6c544');
  g.addColorStop(1, '#d9a21f');
  ctx.beginPath();
  ctx.moveTo(1.44, -0.49);
  ctx.quadraticCurveTo(1.85, -0.8, 2.24, -1.12);
  ctx.quadraticCurveTo(2.0, -0.7, 1.8, -0.43);
  ctx.closePath();
  fillStroke(ctx, g, '#c3901b', 0.03);
  ctx.strokeStyle = 'rgba(195,144,27,0.8)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (const u of [0.2, 0.4, 0.6, 0.78]) {
    const lx = 1.44 + (2.24 - 1.44) * u, ly = -0.49 + (-1.12 + 0.49) * u;
    const rx = 1.8 + (2.24 - 1.8) * (u + 0.1), ry = -0.43 + (-1.12 + 0.43) * (u + 0.1);
    ctx.moveTo(lx, ly); ctx.lineTo(rx, ry);
  }
  ctx.stroke();
}
function uniEar(ctx, x, y, rot, fill, stroke) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-0.13, 0.04);
  ctx.quadraticCurveTo(-0.08, -0.26, 0.04, -0.36);
  ctx.quadraticCurveTo(0.15, -0.16, 0.13, 0.04);
  ctx.closePath();
  fillStroke(ctx, fill, stroke, 0.035);
  ctx.beginPath();
  ctx.moveTo(-0.06, 0.0);
  ctx.quadraticCurveTo(-0.03, -0.18, 0.03, -0.25);
  ctx.quadraticCurveTo(0.08, -0.12, 0.07, 0.0);
  ctx.closePath();
  fillStroke(ctx, '#ffb6cf', null);
  ctx.restore();
}
// Глазик с ресничками (моргает)
function uniEye(ctx, x, y, t) {
  ctx.strokeStyle = '#3a2a4a';
  ctx.lineCap = 'round';
  if (t % 4.3 < 0.14) {
    ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.arc(x, y - 0.02, 0.1, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    ellipse(ctx, x, y, 0.1, 0.13);
    fillStroke(ctx, '#3a2a4a', null);
    circle(ctx, x + 0.03, y - 0.05, 0.035); fillStroke(ctx, '#fff', null);
    circle(ctx, x - 0.03, y + 0.05, 0.018); fillStroke(ctx, '#fff', null);
  }
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (const [dx, dy, ex, ey] of [[-0.07, -0.1, -0.13, -0.18], [-0.01, -0.13, -0.03, -0.22], [0.05, -0.11, 0.08, -0.19]]) {
    ctx.moveTo(x + dx, y + dy); ctx.lineTo(x + ex, y + ey);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,160,0.45)';
  ellipse(ctx, x + 0.1, y + 0.2, 0.12, 0.06); ctx.fill();
}

registerVehicle({
  id: 'unicorn',
  price: 5000,
  phys: { anchors: [{ x: -1.2, y: 0.25 }, { x: 1.2, y: 0.25 }], wheelR: 0.5, rest: 0.45, bump: 0.2, maxExt: 0.72, bodyMass: 6.3, bodyInertia: 8.2 },
  mult: { torque: 1, speed: 1.03, grip: 1, air: 1.4 },
  hull: [
    { x: 1.98, y: 0.25 }, { x: 1.98, y: -0.3 }, { x: 2.08, y: -0.95 },
    { x: -1.98, y: 0.25 }, { x: -1.98, y: -0.42 },
    { x: 0, y: 0.4 },
    { x: 0.8, y: -1.12, roof: true }, { x: -0.1, y: -1.36, roof: true }, { x: -0.9, y: -1.14, roof: true },
  ],
  windows: [
    { role: 'pet', path: uniPetWindow, x: -0.56, y: -0.79, scale: 0.2 },
    { role: 'driver', path: uniFrontWindow, x: 0.42, y: -0.79, scale: 0.2 },
  ],
  glass: [-1.15, -0.52],
  cargo: { x0: -1.92, x1: -1.2, floorY: -0.36, wallY: -0.5 },
  preview: { x0: -2.75, x1: 2.25, y0: -1.6 },
  exhaust: { x: -2.06, y: 0.08 },
  headlight: { x: 1.99, y: -0.08 },
  draw(ctx, K) {
    const { paint } = K;
    const speed = Math.abs(K.state.vx || 0);
    drawStruts(ctx, K);
    uniTail(ctx, K.t, speed);
    // кабина-пузырь
    uniCab(ctx);
    fillStroke(ctx, K.paintFill(-1.27, -0.4), paint.dark, 0.05);
    K.decorate(uniCab, 'cab', { x0: -1.2, x1: 1.35, y0: -1.3, y1: -0.4 });
    K.windows();
    mane(ctx, K.t, speed);
    uniEar(ctx, 0.7, -1.04, 0.4, paint.light, paint.dark);
    uniEar(ctx, 0.9, -0.93, 0.6, paint.body, paint.dark);
    K.cargo();
    // низ кузова
    uniLower(ctx);
    ctx.fillStyle = K.paintFill(-0.5, 0.35);
    ctx.fill();
    K.decorate(uniLower, 'lower', { x0: -2.05, x1: 2.05, y0: -0.52, y1: 0.32 }, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-2.1, -0.05, 4.2, 0.07);
    });
    outline(ctx, K, uniLower);
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.moveTo(-0.08, -0.48); ctx.lineTo(-0.08, 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    rrect(ctx, -0.48, -0.32, 0.2, 0.05, 0.025); ctx.fill();
    uniHorn(ctx);
    uniEye(ctx, 1.5, -0.2, K.t);
    headlight(ctx, 1.99, -0.06, 0.06, 0.09);
    tailLight(ctx, -2.04, -0.36, 0.18);
    bumper(ctx, 1.66, 0.13, 0.4, 0.17, '#f4eefa');
    bumper(ctx, -2.06, 0.13, 0.4, 0.17, '#f4eefa');
    ctx.strokeStyle = '#cfc4dd'; ctx.lineWidth = 0.025;
    rrect(ctx, 1.66, 0.13, 0.4, 0.17, 0.07); ctx.stroke();
    rrect(ctx, -2.06, 0.13, 0.4, 0.17, 0.07); ctx.stroke();
  },
});

// ================== Ракета ==================
function rocketBody(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.9, -0.97);
  ctx.bezierCurveTo(-0.8, -1.05, 0.6, -1.05, 1.56, -1.0);
  ctx.lineTo(1.56, 0.12);
  ctx.bezierCurveTo(0.6, 0.17, -0.8, 0.17, -1.9, 0.09);
  ctx.quadraticCurveTo(-2.08, 0.08, -2.08, -0.1);
  ctx.lineTo(-2.08, -0.78);
  ctx.quadraticCurveTo(-2.08, -0.96, -1.9, -0.97);
  ctx.closePath();
}
function rocketNose(ctx) {
  ctx.beginPath();
  ctx.moveTo(1.5, -1.0);
  ctx.bezierCurveTo(2.05, -1.0, 2.5, -0.72, 2.62, -0.44);
  ctx.bezierCurveTo(2.5, -0.16, 2.05, 0.12, 1.5, 0.12);
  ctx.closePath();
}
const rocketPetWindow = (ctx) => circle(ctx, -0.3, -0.44, 0.35);
const rocketDriverWindow = (ctx) => circle(ctx, 0.84, -0.44, 0.35);
function rocketFinTop(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.25, -0.99);
  ctx.quadraticCurveTo(-1.8, -1.06, -2.2, -1.6);
  ctx.quadraticCurveTo(-2.3, -1.72, -2.38, -1.6);
  ctx.quadraticCurveTo(-2.32, -1.22, -2.06, -0.9);
  ctx.closePath();
}
function rocketFinSide(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.28, -0.5);
  ctx.quadraticCurveTo(-1.85, -0.4, -2.24, 0.1);
  ctx.quadraticCurveTo(-2.32, 0.22, -2.4, 0.12);
  ctx.quadraticCurveTo(-2.38, -0.35, -2.04, -0.62);
  ctx.closePath();
}
function rocketNozzle(ctx) {
  ctx.beginPath();
  ctx.moveTo(-2.0, -0.74);
  ctx.lineTo(-2.36, -0.84);
  ctx.quadraticCurveTo(-2.42, -0.44, -2.36, -0.04);
  ctx.lineTo(-2.0, -0.14);
  ctx.closePath();
}
// Пламя всегда горит и дрожит; на скорости — длиннее
const FLAME = [['#ff7a3d', 1, 0.34], ['#ffd23f', 0.72, 0.24], ['#fff6d0', 0.42, 0.13]];
function rocketFlame(ctx, t, speed) {
  const f = 0.55 + Math.min(0.35, speed * 0.03) + 0.1 * Math.sin(t * 37) + 0.07 * Math.sin(t * 23.3 + 1);
  for (const [col, k, hw] of FLAME) {
    const L = (0.45 + 1.1 * f) * k, wob = Math.sin(t * 29 + k * 5) * 0.05;
    ctx.beginPath();
    ctx.moveTo(-2.3, -0.44 - hw);
    ctx.quadraticCurveTo(-2.3 - L * 0.55, -0.44 - hw * 1.15, -2.3 - L, -0.44 + wob);
    ctx.quadraticCurveTo(-2.3 - L * 0.55, -0.44 + hw * 1.15, -2.3, -0.44 + hw);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  }
}
function finFill(ctx, K, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(1, '#ffc23a');
  return g;
}

registerVehicle({
  id: 'rocket',
  price: 8000,
  phys: { anchors: [{ x: -1.3, y: 0.2 }, { x: 1.25, y: 0.2 }], wheelR: 0.46, rest: 0.45, bump: 0.2, maxExt: 0.72, bodyMass: 6.6, bodyInertia: 8.6 },
  mult: { torque: 1.08, speed: 1.15, grip: 0.92, air: 1.55 },
  hull: [
    { x: 2.6, y: -0.44 }, { x: 2.2, y: 0.02 }, { x: 2.2, y: -0.9, roof: true },
    { x: -2.06, y: 0.08 }, { x: -2.36, y: 0.14 }, { x: -2.4, y: -0.44 },
    { x: 0, y: 0.18 },
    { x: -2.3, y: -1.62 },
    { x: 1.0, y: -1.04, roof: true }, { x: -0.25, y: -1.06, roof: true }, { x: -1.3, y: -1.1, roof: true }, { x: -1.95, y: -1.0, roof: true },
  ],
  windows: [
    { role: 'pet', path: rocketPetWindow, x: -0.3, y: -0.42, scale: 0.21 },
    { role: 'driver', path: rocketDriverWindow, x: 0.84, y: -0.43, scale: 0.2 },
  ],
  glass: [-0.79, -0.09],
  cargo: { x0: -1.15, x1: -0.42, floorY: -1.02, wallY: -1.14 },
  preview: { x0: -3.5, x1: 2.62, y0: -1.75 },
  exhaust: { x: -2.4, y: -0.44 },
  headlight: { x: 2.3, y: -0.2 },
  draw(ctx, K) {
    const { paint } = K;
    const speed = Math.abs(K.state.vx || 0);
    rocketFlame(ctx, K.t, speed);
    drawStruts(ctx, K);
    rocketFinTop(ctx);
    fillStroke(ctx, finFill(ctx, K, -1.7, -0.9), '#e0a91a', 0.04);
    rocketNozzle(ctx);
    fillStroke(ctx, '#8e879b', '#5b5566', 0.04);
    K.cargo();
    // корпус
    rocketBody(ctx);
    ctx.fillStyle = K.paintFill(-1.05, 0.17);
    ctx.fill();
    K.decorate(rocketBody, 'body', { x0: -2.1, x1: 1.6, y0: -1.06, y1: 0.18 }, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-1.75, -1.1, 0.1, 1.3);
      ctx.fillRect(1.32, -1.1, 0.1, 1.3);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-2.1, -0.92, 3.7, 0.08);
    });
    outline(ctx, K, rocketBody);
    // нос
    const ng = ctx.createLinearGradient(0, -1.0, 0, 0.12);
    ng.addColorStop(0, '#ffffff');
    ng.addColorStop(1, '#dcd4e8');
    rocketNose(ctx);
    fillStroke(ctx, ng, '#b9b0c9', 0.04);
    ctx.save();
    rocketNose(ctx);
    ctx.clip();
    ctx.fillStyle = '#ff5f8f';
    ctx.beginPath(); ctx.arc(2.95, -0.44, 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = paint.body;
    ctx.fillRect(1.5, -1.05, 0.1, 1.2);
    ctx.restore();
    // иллюминаторы
    K.windows();
    for (const x of [-0.3, 0.84]) {
      circle(ctx, x, -0.44, 0.38);
      ctx.strokeStyle = '#c9c2d6'; ctx.lineWidth = 0.08; ctx.stroke();
      circle(ctx, x, -0.44, 0.42);
      ctx.strokeStyle = '#8e879b'; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.fillStyle = '#8e879b';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.39, rx = x + Math.cos(a) * 0.38, ry = -0.44 + Math.sin(a) * 0.38;
        ctx.moveTo(rx + 0.018, ry); ctx.arc(rx, ry, 0.018, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    // перильца для груза наверху
    ctx.strokeStyle = '#6d6578'; ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(-1.16, -1.0); ctx.lineTo(-1.16, -1.16); ctx.lineTo(-0.4, -1.16); ctx.lineTo(-0.4, -1.02);
    ctx.stroke();
    // боковой стабилизатор
    rocketFinSide(ctx);
    fillStroke(ctx, finFill(ctx, K, -0.6, 0.2), '#e0a91a', 0.04);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    starPath(ctx, -1.95, -0.32, 0.1); ctx.fill();
    headlight(ctx, 2.3, -0.2, 0.06, 0.07);
  },
});
