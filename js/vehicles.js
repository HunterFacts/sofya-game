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
//   preview?: { y }                       // как ставить машину в превью гаража
// }
import { rrect, ellipse, fillStroke, heartPath } from './draw-utils.js';

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
