// Потерявшиеся котята и щенки.
// На каждом уровне у дороги сидят 3 зверька (места и окрас всегда одинаковые для уровня).
// Подъезжаешь — они запрыгивают в кузов и едут с Софьей: подпрыгивают на кочках и пищат «уиии».
// Если машина долго в воздухе (или перевернулась), они раскрывают зонтики, парят над машиной
// и плавно опускаются обратно. Они НИКОГДА не выпадают и не теряются: список едущих хранится
// в сохранении (переживает аварию и перезагрузку страницы).
// На финише выпрыгивают под аркой с сердечками и уходят домой к Мариссе (коллекция для домика,
// см. house.js), за каждого +10 монет.
import { addDefaults } from '../save.js';
import { levelStart, groundY } from '../terrain.js';
import { rng, clamp, wrapAngle } from '../rng.js';
import { TAU, ellipse, circle, rrect, fillStroke, heartPath, drawEyes } from '../draw-utils.js';
import { animalMouth, whiskers, drawAnimal } from '../art.js';

// ride — кто сейчас едет в кузове [{id, k, a, c}], home — все, кто уже дома у Мариссы ['k.a.c'],
// fresh — сколько новых пришло домой с прошлого захода в домик (значок на кнопке)
addDefaults({ kittens: { ride: [], home: [], fresh: 0 } });

// ================== Зверята ==================
export const KINDS = {
  white: { sp: 'cat', fur: '#fdfcff', line: '#c3bdd6', belly: '#ffffff', ear: '#ffb3c9', eye: '#2a2a30', iris: '#6fb4ff', mouth: '#b3acc6', whisk: '#d9d5e5' },
  ginger: { sp: 'cat', fur: '#ffb35c', line: '#d17a2e', belly: '#fff0dc', ear: '#ffb09a', eye: '#4a2a14', iris: '#86d05e', mouth: '#a8612a', whisk: '#fff0dc', stripe: '#ec872c' },
  gray: { sp: 'cat', fur: '#b9bdcd', line: '#7f849b', belly: '#f1f2f8', ear: '#ffb3c9', eye: '#2a2a30', iris: '#ffcf3a', mouth: '#6d7186', whisk: '#f1f2f8', stripe: '#9196ab' },
  black: { sp: 'cat', fur: '#3e3b49', line: '#211f29', belly: '#5b5767', ear: '#ff9fbd', eye: '#fff1a8', iris: '#ffd23b', mouth: '#d3cde0', whisk: '#9a95a8', pad: '#ff9fbd' },
  calico: { sp: 'cat', fur: '#fffaf3', line: '#cdbdab', belly: '#ffffff', ear: '#ffb3c9', eye: '#2a2a30', iris: '#86d05e', mouth: '#b3a390', whisk: '#e5ddd2', patch: ['#ffa043', '#3e3b49'], tail: '#ffa043' },
  golden: { sp: 'dog', fur: '#f2c37f', line: '#c08a47', belly: '#fff2dc', ear: '#cf8f4c', eye: '#2b1d14' },
  spotty: { sp: 'dog', fur: '#ffffff', line: '#c3bdd6', belly: '#ffffff', ear: '#3e3b49', eye: '#2b1d14', spot: '#3e3b49' },
  choco: { sp: 'dog', fur: '#a26f4d', line: '#6b432d', belly: '#efcda6', ear: '#6b432d', eye: '#2b1d14' },
};
// котят чуть больше, чем щенков
const SPAWN = ['white', 'ginger', 'gray', 'black', 'calico', 'ginger', 'gray', 'white', 'calico', 'black', 'golden', 'spotty', 'choco', 'golden'];
// бантики, ошейники, цветочки и зонтики
export const ACC_COL = ['#ff4f9a', '#a77bff', '#2ec4a0', '#3fa9ff', '#ffb31f'];
const UMB = [['#ff6fae', '#ffffff'], null, ['#b98cff', '#ffe1f0'], ['#ff8fc4', '#fff3a8'], ['#4fc3ff', '#ffffff'], null];
const RAINBOW = ['#ff5a5a', '#ff9f43', '#ffd93b', '#5ee07a', '#4fb3ff', '#a97bff'];

export const critterKey = (cr) => `${cr.k}.${cr.a | 0}.${cr.c | 0}`;
function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
// 'ginger.1.3' → {k, a, c, ph}; seed делает «характер» (фазу анимаций) у одинаковых зверят разным
export function parseCritter(s, seed = 0) {
  const [k, a, c] = String(s).split('.');
  return { k: KINDS[k] ? k : 'white', a: (+a || 0) % 4, c: (+c || 0) % ACC_COL.length, ph: strHash(s + ':' + seed) * TAU };
}
const isDog = (cr) => (KINDS[cr.k] || KINDS.white).sp === 'dog';

// ================== Рисунок ==================
// Единица — радиус головы. (0,0) — земля между лапками, вверх — минус Y. Мордочка смотрит на нас.
// pose: 'sit' | 'wave' | 'yay' | 'peek' | 'umbrella' | 'balloon' | 'walk' | 'sleep'
// arg: 'peek' — высота бортика (лапки лежат на нём), 'umbrella' — насколько раскрыт зонтик (0..1),
//      'walk' — фаза шага. lw — толщина контура.
export function drawCritter(ctx, cr, mood, t, pose = 'sit', arg = 0, lw = 0.09) {
  const K = KINDS[cr.k] || KINDS.white;
  const ph = cr.ph || 0;
  const dog = K.sp === 'dog';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (pose === 'sleep') { drawSleeping(ctx, cr, K, t, lw); return; }
  const air = pose === 'umbrella' || pose === 'yay' || pose === 'balloon';

  drawTail(ctx, K, dog, t + ph, lw, air);
  // задние лапки
  if (air) {
    const sw = Math.sin(t * 5 + ph) * 0.08;
    ellipse(ctx, -0.3, -0.06 + sw, 0.19, 0.3); fillStroke(ctx, K.fur, K.line, lw);
    ellipse(ctx, 0.3, -0.06 - sw, 0.19, 0.3); fillStroke(ctx, K.fur, K.line, lw);
  } else {
    const st = pose === 'walk' ? Math.sin(arg) * 0.14 : 0;
    ellipse(ctx, -0.42, -0.27 - Math.max(0, st), 0.36, 0.28); fillStroke(ctx, K.fur, K.line, lw);
    ellipse(ctx, 0.42, -0.27 - Math.max(0, -st), 0.36, 0.28); fillStroke(ctx, K.fur, K.line, lw);
  }
  // поднятые лапки (за головой)
  if (pose === 'wave') arm(ctx, K, 0.5, -0.95, 1.0 + Math.sin(t * 10 + ph) * 0.35, 0.85, lw);
  else if (pose === 'yay') {
    const w = Math.sin(t * 12 + ph) * 0.15;
    arm(ctx, K, 0.45, -0.95, 0.8 + w, 0.85, lw);
    arm(ctx, K, -0.45, -0.95, -0.8 - w, 0.85, lw);
  } else if (pose === 'umbrella') arm(ctx, K, 0.55, -0.98, 0.42, 1.45, lw);
  else if (pose === 'balloon') {
    arm(ctx, K, 0.55, -0.98, 0.42, 1.45, lw);
    arm(ctx, K, -0.5, -0.95, -1.0 - Math.sin(t * 10 + ph) * 0.35, 0.85, lw); // машет «пока!»
  }
  // тело
  ellipse(ctx, 0, -0.62, 0.74, 0.62);
  fillStroke(ctx, K.fur, K.line, lw);
  ctx.save();
  ellipse(ctx, 0, -0.62, 0.74, 0.62);
  ctx.clip();
  if (K.patch) {
    ctx.fillStyle = K.patch[0]; ellipse(ctx, -0.55, -0.95, 0.42, 0.34); ctx.fill();
    ctx.fillStyle = K.patch[1]; ellipse(ctx, 0.6, -0.4, 0.3, 0.26); ctx.fill();
  }
  if (K.spot) { ctx.fillStyle = K.spot; ellipse(ctx, -0.5, -0.5, 0.18, 0.14); ctx.fill(); ellipse(ctx, 0.48, -0.85, 0.14, 0.12); ctx.fill(); }
  if (K.stripe) {
    ctx.strokeStyle = K.stripe; ctx.lineWidth = 0.11;
    ctx.beginPath();
    for (const d of [-1, 1]) {
      ctx.moveTo(d * 0.78, -0.85); ctx.quadraticCurveTo(d * 0.55, -0.8, d * 0.5, -0.62);
      ctx.moveTo(d * 0.8, -0.55); ctx.quadraticCurveTo(d * 0.6, -0.5, d * 0.56, -0.36);
    }
    ctx.stroke();
  }
  ellipse(ctx, 0, -0.5, 0.4, 0.42);
  ctx.fillStyle = K.belly;
  ctx.fill();
  ctx.restore();
  // передние лапки
  if (pose !== 'peek' && pose !== 'yay' && pose !== 'balloon') {
    const st = pose === 'walk' ? Math.sin(arg + 1.6) * 0.12 : 0;
    paw(ctx, K, -0.22, -0.1 - Math.max(0, st), lw);
    if (pose !== 'wave' && pose !== 'umbrella' && pose !== 'balloon') paw(ctx, K, 0.22, -0.1 - Math.max(0, -st), lw);
  }
  // голова
  ctx.save();
  ctx.translate(0, -1.85 - (pose === 'walk' ? Math.abs(Math.sin(arg)) * 0.06 : 0));
  drawHead(ctx, cr, mood, t, lw, K);
  ctx.restore();
  if (pose === 'peek') { paw(ctx, K, -0.42, arg, lw); paw(ctx, K, 0.42, arg, lw); }
  if (pose === 'umbrella') drawUmbrella(ctx, cr, 1.14, -2.3, arg, lw);
  if (pose === 'balloon') drawBalloon(ctx, cr, 1.14, -2.3, t + ph, lw);
}

// Воздушный шарик-сердечко: ниточка в лапке (hx, hy)
const BALLOON = ['#ff4f9a', '#ff6b7d', '#b98cff', '#ff8fc4', '#4fc3ff'];
function drawBalloon(ctx, cr, hx, hy, t, lw) {
  const bx = hx - 0.45 + Math.sin(t * 1.7) * 0.15, by = hy - 3.1;
  ctx.strokeStyle = '#8a6a9a';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(hx + 0.3, (hy + by) / 2, bx, by + 0.75);
  ctx.stroke();
  const col = BALLOON[(cr.c | 0) % BALLOON.length];
  ctx.beginPath(); ctx.moveTo(bx - 0.12, by + 0.9); ctx.lineTo(bx + 0.12, by + 0.9); ctx.lineTo(bx, by + 0.72); ctx.closePath();
  fillStroke(ctx, col, null);
  heartPath(ctx, bx, by + 0.35, 1.25);
  fillStroke(ctx, col, 'rgba(90,30,70,0.35)', lw);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ellipse(ctx, bx - 0.45, by - 0.25, 0.18, 0.1, -0.7);
  ctx.fill();
}

function arm(ctx, K, x, y, ang, len, lw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ellipse(ctx, 0, -len / 2, 0.18, len / 2 + 0.06);
  fillStroke(ctx, K.fur, K.line, lw);
  circle(ctx, 0, -len + 0.1, 0.075);
  ctx.fillStyle = K.pad || '#ffb3c9';
  ctx.fill();
  ctx.restore();
}

function paw(ctx, K, x, y, lw) {
  ellipse(ctx, x, y, 0.2, 0.14);
  fillStroke(ctx, K.fur, K.line, lw);
}

function drawTail(ctx, K, dog, t, lw, air) {
  ctx.beginPath();
  if (dog) {
    const w = Math.sin(t * 14) * 0.3;
    ctx.moveTo(-0.5, -0.45);
    ctx.quadraticCurveTo(-1.05, -0.6, -1.0 + w * 0.5, -1.15 + Math.abs(w) * 0.2);
  } else if (air) {
    const s = Math.sin(t * 3) * 0.2;
    ctx.moveTo(-0.45, -0.3);
    ctx.bezierCurveTo(-0.9, 0.1, -1.25 + s, 0.05, -1.25 + s, -0.5);
  } else {
    const s = Math.sin(t * 2.2) * 0.22;
    ctx.moveTo(-0.5, -0.3);
    ctx.bezierCurveTo(-1.35, -0.3, -1.3 + s * 0.4, -1.0, -1.0 + s, -1.5);
  }
  const w = dog ? 0.26 : 0.32;
  ctx.strokeStyle = K.line; ctx.lineWidth = w + lw * 2; ctx.stroke();
  ctx.strokeStyle = K.tail || K.fur; ctx.lineWidth = w; ctx.stroke();
}

// Голова радиусом 1 с центром (0,0). mood: normal | happy | scared | sleep
export function drawHead(ctx, cr, mood, t, lw = 0.07, K = KINDS[cr.k] || KINDS.white) {
  const dog = K.sp === 'dog', ph = cr.ph || 0;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (!dog) {
    for (const d of [-1, 1]) {
      const tw = d === 1 && Math.sin(t * 1.3 + ph) > 0.96 ? 0.18 : 0; // ушко дёргается
      ctx.save();
      ctx.translate(d * 0.55, -0.52);
      ctx.rotate(d * (0.32 + tw));
      ctx.beginPath(); ctx.moveTo(-0.38, 0.22); ctx.lineTo(0, -0.62); ctx.lineTo(0.38, 0.22); ctx.closePath();
      fillStroke(ctx, K.patch ? K.patch[d < 0 ? 0 : 1] : K.fur, K.line, lw);
      ctx.beginPath(); ctx.moveTo(-0.2, 0.12); ctx.lineTo(0, -0.36); ctx.lineTo(0.2, 0.12); ctx.closePath();
      fillStroke(ctx, K.ear, null);
      ctx.restore();
    }
  }
  ellipse(ctx, 0, 0, 1, 0.88);
  fillStroke(ctx, K.fur, K.line, lw);
  // пятнышки и полоски
  ctx.save();
  ellipse(ctx, 0, 0, 1, 0.88);
  ctx.clip();
  if (K.stripe) {
    ctx.strokeStyle = K.stripe; ctx.lineWidth = 0.13;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.95); ctx.lineTo(-0.2, -0.58);
    ctx.moveTo(0, -0.98); ctx.lineTo(0, -0.55);
    ctx.moveTo(0.3, -0.95); ctx.lineTo(0.2, -0.58);
    ctx.stroke();
  }
  if (K.patch) {
    ctx.fillStyle = K.patch[0]; ellipse(ctx, -0.66, -0.4, 0.55, 0.45); ctx.fill();
    ctx.fillStyle = K.patch[1]; ellipse(ctx, 0.74, -0.55, 0.42, 0.36); ctx.fill();
  }
  if (K.spot) { ctx.fillStyle = K.spot; ellipse(ctx, 0.48, -0.5, 0.26, 0.22, 0.3); ctx.fill(); ellipse(ctx, -0.7, 0.05, 0.13, 0.11); ctx.fill(); }
  if (dog) { ellipse(ctx, 0, 0.42, 0.5, 0.36); ctx.fillStyle = K.belly; ctx.fill(); }
  ctx.restore();
  if (dog) {
    for (const d of [-1, 1]) {
      const fl = Math.sin(t * 5 + ph + d) * 0.07;
      ellipse(ctx, d * 0.9, 0.02, 0.27, 0.56, d * (0.32 + fl));
      fillStroke(ctx, K.ear, K.line, lw);
    }
  }
  if (mood === 'sleep') {
    ctx.strokeStyle = dog || K.fur !== '#3e3b49' ? '#3a2a3a' : '#d3cde0';
    ctx.lineWidth = 0.1;
    for (const x of [-0.38, 0.38]) { ctx.beginPath(); ctx.arc(x, -0.16, 0.16, 0.25, Math.PI - 0.25); ctx.stroke(); }
  } else drawEyes(ctx, mood, t + ph, -0.38, 0.38, -0.1, K.eye, dog ? undefined : K.iris, 1.15);
  ctx.fillStyle = 'rgba(255,120,160,0.45)';
  ellipse(ctx, -0.62, 0.28, 0.16, 0.1); ctx.fill();
  ellipse(ctx, 0.62, 0.28, 0.16, 0.1); ctx.fill();
  const m = mood === 'sleep' ? 'normal' : mood;
  if (dog) {
    ellipse(ctx, 0, 0.22, 0.17, 0.12); fillStroke(ctx, '#2b1d14', null);
    animalMouth(ctx, m, 0.36, '#5a3a22', m === 'happy');
  } else {
    ctx.beginPath(); ctx.moveTo(-0.11, 0.15); ctx.lineTo(0.11, 0.15); ctx.lineTo(0, 0.26); ctx.closePath();
    fillStroke(ctx, '#ff8fb0', null);
    animalMouth(ctx, m, 0.28, K.mouth);
    whiskers(ctx, 0.3, K.whisk);
  }
  accessory(ctx, cr, lw);
}

function accessory(ctx, cr, lw) {
  const col = ACC_COL[(cr.c | 0) % ACC_COL.length];
  if (cr.a === 1) { // бантик
    ctx.save();
    ctx.translate(isDog(cr) ? 0.45 : 0.6, -0.72);
    ctx.rotate(0.35);
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * 0.38, -0.32, d * 0.4, 0); ctx.quadraticCurveTo(d * 0.38, 0.32, 0, 0);
      fillStroke(ctx, col, 'rgba(60,20,60,0.3)', lw * 0.7);
    }
    circle(ctx, 0, 0, 0.1); fillStroke(ctx, col, 'rgba(60,20,60,0.3)', lw * 0.7);
    ctx.restore();
  } else if (cr.a === 2) { // ошейник с колокольчиком
    ctx.strokeStyle = col; ctx.lineWidth = 0.15;
    ctx.beginPath(); ctx.arc(0, -0.15, 0.98, 1.08, Math.PI - 1.08); ctx.stroke();
    circle(ctx, 0, 0.88, 0.13); fillStroke(ctx, '#ffd84d', '#d9a21b', Math.max(0.04, lw * 0.6));
  } else if (cr.a === 3) { // цветочек
    ctx.save();
    ctx.translate(-0.6, -0.68);
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) { const an = (i * TAU) / 5; circle(ctx, Math.cos(an) * 0.13, Math.sin(an) * 0.13, 0.1); ctx.fill(); }
    circle(ctx, 0, 0, 0.08); ctx.fillStyle = '#ffe14d'; ctx.fill();
    ctx.restore();
  }
}

// Спящий клубочек (для домика)
function drawSleeping(ctx, cr, K, t, lw) {
  const br = Math.sin(t * 2 + (cr.ph || 0)) * 0.03;
  ellipse(ctx, 0, -0.5, 1.18, 0.52 + br);
  fillStroke(ctx, K.fur, K.line, lw);
  ctx.save();
  ellipse(ctx, 0, -0.5, 1.18, 0.52 + br);
  ctx.clip();
  if (K.patch) { ctx.fillStyle = K.patch[0]; ellipse(ctx, -0.6, -0.8, 0.5, 0.35); ctx.fill(); ctx.fillStyle = K.patch[1]; ellipse(ctx, 0.2, -0.95, 0.3, 0.2); ctx.fill(); }
  if (K.spot) { ctx.fillStyle = K.spot; ellipse(ctx, -0.5, -0.7, 0.16, 0.12); ctx.fill(); ellipse(ctx, 0.1, -0.85, 0.12, 0.1); ctx.fill(); }
  if (K.stripe) {
    ctx.strokeStyle = K.stripe; ctx.lineWidth = 0.12;
    ctx.beginPath();
    for (const x of [-0.7, -0.35, 0]) { ctx.moveTo(x, -1.05); ctx.quadraticCurveTo(x - 0.1, -0.85, x, -0.7); }
    ctx.stroke();
  }
  ctx.restore();
  // хвостик обнимает спереди
  ctx.beginPath();
  ctx.moveTo(-1.05, -0.35);
  ctx.quadraticCurveTo(-0.4, 0.12, 0.45, -0.1);
  ctx.strokeStyle = K.line; ctx.lineWidth = 0.28 + lw * 2; ctx.stroke();
  ctx.strokeStyle = K.tail || K.fur; ctx.lineWidth = 0.28; ctx.stroke();
  ctx.save();
  ctx.translate(0.55, -0.98);
  ctx.rotate(0.15);
  ctx.scale(0.9, 0.9);
  drawHead(ctx, cr, 'sleep', t, lw / 0.9, K);
  ctx.restore();
}

// Зонтик: ручка снизу в (hx, hy), open 0..1
function drawUmbrella(ctx, cr, hx, hy, open, lw) {
  const tx = hx - 0.8, ty = hy - 2.0;
  ctx.strokeStyle = '#7d6a8c';
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(hx, hy + 0.05);
  ctx.arc(hx - 0.13, hy + 0.05, 0.13, 0, Math.PI * 0.9);
  ctx.stroke();
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(-0.38);
  ctx.scale(0.3 + 0.7 * open, 0.55 + 0.45 * open);
  const R = 1.75;
  const canopy = () => {
    ctx.beginPath();
    ctx.moveTo(-R, 0);
    ctx.arc(0, 0, R, Math.PI, 0);
    for (let i = 0; i < 5; i++) {
      const x0 = R - (i * 2 * R) / 5, x1 = R - ((i + 1) * 2 * R) / 5;
      ctx.quadraticCurveTo((x0 + x1) / 2, -0.34, x1, 0);
    }
    ctx.closePath();
  };
  canopy();
  ctx.save();
  ctx.clip();
  const pal = UMB[(cr.c | 0) % UMB.length];
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0.2);
    ctx.arc(0, 0.2, R + 0.6, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
    ctx.closePath();
    ctx.fillStyle = pal ? pal[i % 2] : RAINBOW[i];
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ellipse(ctx, -0.6, -1.0, 0.45, 0.2, -0.5); ctx.fill();
  ctx.restore();
  canopy();
  ctx.strokeStyle = 'rgba(80,40,90,0.35)';
  ctx.lineWidth = lw;
  ctx.stroke();
  circle(ctx, 0, -R - 0.08, 0.13);
  fillStroke(ctx, pal ? pal[0] : '#ff6fae', 'rgba(80,40,90,0.35)', lw);
  ctx.restore();
}

// Иконка домика с Мариссой (кнопка в меню, всплывашка на финише)
export function drawHouseIcon(ctx, w, h, t = 0, mood = 'happy', hat = 'none') {
  const s = Math.min(w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.lineJoin = 'round';
  // домик
  ctx.beginPath();
  ctx.moveTo(-0.47 * s, -0.08 * s); ctx.lineTo(0, -0.47 * s); ctx.lineTo(0.47 * s, -0.08 * s); ctx.closePath();
  fillStroke(ctx, '#ff6fae', '#d9468b', s * 0.035);
  rrect(ctx, -0.37 * s, -0.14 * s, 0.74 * s, 0.6 * s, 0.07 * s);
  fillStroke(ctx, '#ffe6f2', '#f0a6c9', s * 0.03);
  heartPath(ctx, 0, -0.25 * s, 0.07 * s);
  fillStroke(ctx, '#fff', null);
  // Марисса выглядывает
  ctx.save();
  rrect(ctx, -0.37 * s, -0.4 * s, 0.74 * s, 0.86 * s, 0.07 * s);
  ctx.clip();
  ctx.translate(0, 0.2 * s);
  ctx.scale(0.27 * s, 0.27 * s);
  drawAnimal(ctx, 'marissa', mood, t, hat);
  ctx.restore();
  ctx.restore();
}

// ================== Голоса ==================
function yip(sound, k = 1) {
  for (const w of [0, 0.15]) {
    sound.tone(760 * k, 0.09, 'square', 0.03, w, sound.sfx, 470 * k);
    sound.tone(1500 * k, 0.07, 'sine', 0.05, w, sound.sfx, 900 * k);
  }
}
// котёнок мяукает тоненько, щенок тявкает
export function critterVoice(sound, cr, k = 1) {
  if (!sound || !sound.ctx) return;
  if (isDog(cr)) yip(sound, k * (1 + ((cr.ph || 0) % 1) * 0.12));
  else sound.meow(k * (1.5 + ((cr.ph || 0) % 1) * 0.3));
}
const wheee = (s) => { s.tone(650, 0.34, 'sine', 0.06, 0, s.sfx, 1500); s.tone(1300, 0.32, 'triangle', 0.018, 0.02, s.sfx, 2700); };
const boing = (s) => s.tone(260, 0.22, 'sine', 0.12, 0, s.sfx, 820);
const umbrellaPop = (s) => { s.tone(1100, 0.08, 'triangle', 0.05, 0, s.sfx, 1700); s.tone(1650, 0.07, 'sine', 0.035, 0.06, s.sfx, 2200); };

// ================== Игра ==================
const K_W = 0.16;    // метров на «единицу головы» в мире: зверёк ростом ~0.53 м
const MAX = 4;       // сколько помещается в кузов
const RESCUE_R = 2.5;

let api = null;
const S = () => {
  const s = api.save;
  if (!s.kittens || typeof s.kittens !== 'object') s.kittens = { ride: [], home: [], fresh: 0 };
  const k = s.kittens;
  if (!Array.isArray(k.ride)) k.ride = [];
  if (!Array.isArray(k.home)) k.home = [];
  if (typeof k.fresh !== 'number') k.fresh = 0;
  return k;
};

const riders = [];   // едут в кузове: {cr, st:'leap'|'ride', p, sx, sy, lx, h, vh, sq, f, happy, delay, pend}
const goers = [];    // на финише улетают домой на шариках: {cr, i, n, lx, T, hT, x, y}
const hearts = [];   // сердечки в мире: {x, y, vx, vy, life, s}
let LW = 0.2;
let pvx = null, pvy = 0, accF = 0, squeakT = 0, idleT = 3, wasFloat = false, meowT = 0, cargoDrawn = false;
const roofCache = new WeakMap();

function mkRider(cr, st = 'ride') {
  return { cr, st, p: 0, sx: 0, sy: 0, lx: null, h: 0, vh: 0, sq: 0, f: 0, happy: 0, delay: -1, pend: 0 };
}
function critterFromSave(e) {
  if (!e || typeof e !== 'object' || !KINDS[e.k]) return null;
  return { id: String(e.id), k: e.k, a: (e.a | 0) % 4, c: (e.c | 0) % ACC_COL.length, ph: strHash(String(e.id)) * TAU };
}
// Список едущих всегда совпадает с сохранением (после переноса прогресса, сброса и т.п.)
function syncRiders() {
  const ride = S().ride;
  const same = ride.length === riders.length && ride.every((e, i) => e && riders[i].cr.id === String(e.id));
  if (same) return;
  const old = new Map(riders.map((r) => [r.cr.id, r]));
  riders.length = 0;
  for (const e of ride) {
    const cr = critterFromSave(e);
    if (!cr) continue;
    riders.push(old.get(cr.id) || mkRider(cr));
    if (riders.length >= 8) break;
  }
}
const rideIds = () => new Set(S().ride.map((e) => e && String(e.id)));

// ---------- зверята у дороги ----------
function addCritters(L, items) {
  if (!items || typeof L !== 'number' || L < 0 || items.critters) return;
  const r = rng(L * 48271 + 911);
  const B0 = levelStart(L), len = levelStart(L + 1) - B0;
  const riding = api ? rideIds() : new Set();
  items.critters = [0.3, 0.55, 0.8].map((f, i) => {
    let x = B0 + (f + (r() - 0.5) * 0.06) * len;
    for (const p of items.pickups || []) if (Math.abs(p.x - x) < 7) x = p.x + 8; // не на бонусе
    x = Math.min(x, B0 + len - 45);                                             // и подальше от финиша
    const id = `${L}:${i}`;
    return {
      id, k: SPAWN[Math.floor(r() * SPAWN.length)], a: Math.floor(r() * 4), c: Math.floor(r() * ACC_COL.length),
      ph: r() * TAU, x, y: groundY(x) + 0.03, taken: riding.has(id), meowed: false,
    };
  });
}

// ---------- места в кузове ----------
function slotX(i, n, cg) {
  const a = cg.x0 + 0.14, b = cg.x1 - 0.08;
  return a + ((i + 0.5) * (b - a)) / n;
}
// втроём-вчетвером теснее: зверята чуть меньше, через одного стоят повыше (на задних лапках)
const slotK = (n) => (n >= 4 ? 0.135 : n === 3 ? 0.145 : K_W);
const slotLift = (i, n) => 0.04 + (n >= 3 && i % 2 ? 0.08 : 0); // сидят на подушечке, чтобы мордочки были над бортиком
// У машины без кузова зверята сидят на крыше
function roofCargo(v) {
  let c = roofCache.get(v);
  if (!c) {
    const roof = v.hull.filter((p) => p.roof);
    const xs = roof.length ? roof.map((p) => p.x) : [-0.8, 0.8];
    const y = roof.length ? Math.min(...roof.map((p) => p.y)) : -1.2;
    c = { x0: Math.min(...xs) - 0.1, x1: Math.max(...xs) + 0.1, floorY: y + 0.02, wallY: y + 0.02 };
    roofCache.set(v, c);
  }
  return c;
}
const cargoOf = (v) => v.cargo || roofCargo(v);

// ---------- спасение ----------
function rescue(world, cr) {
  cr.taken = true;
  const r = mkRider(cr, 'leap');
  r.sx = cr.x; r.sy = cr.y;
  riders.push(r);
  S().ride.push({ id: cr.id, k: cr.k, a: cr.a, c: cr.c });
  api.persist();
  world.react({ pet: 'happy', sofya: 'happy' }, 1.3);
  world.burst(cr.x, cr.y - 0.3, 'spark', 7, '#ffb3d9');
  boing(api.sound);
  critterVoice(api.sound, cr, 1.1);
}

function update(world, dt) {
  const car = world.car, t = world.t;
  syncRiders();
  meowT = Math.max(0, meowT - dt);
  squeakT = Math.max(0, squeakT - dt);

  // зверята у дороги: машина близко — мяукают и запрыгивают
  if (world.mode === 'normal' && !world.crashed) {
    for (const it of world.items.values()) {
      if (!it.critters) continue;
      for (const cr of it.critters) {
        if (cr.taken) continue;
        const dx = cr.x - car.x;
        if (dx > 14 || dx < -6) continue;
        if (!cr.meowed && dx > RESCUE_R && meowT === 0) { cr.meowed = true; meowT = 0.5; critterVoice(api.sound, cr); }
        if (Math.abs(dx) < RESCUE_R && Math.abs(cr.y - 0.3 - car.y) < 5 && riders.length < MAX) rescue(world, cr);
      }
    }
  }

  // ускорение кузова вдоль «вверх машины»: резкий толчок снизу — зверята подпрыгивают
  let upAcc = 0;
  if (pvx !== null && dt > 0) {
    const ax = (car.vx - pvx) / dt, ay = (car.vy - pvy) / dt;
    upAcc = ax * Math.sin(car.a) - ay * Math.cos(car.a);
  }
  pvx = car.vx; pvy = car.vy;
  accF += (upAcc - accF) * Math.min(1, dt * 60);
  const floatWant = world.crashed || world.airT > 0.4;
  let hop = 0;
  if (!floatWant && car.grounded && accF > 12) hop = Math.min(3.4, 1.3 + (accF - 12) * 0.03);
  idleT -= dt;
  if (hop === 0 && idleT <= 0 && !floatWant && riders.length) {
    idleT = 2 + Math.random() * 3;
    const r = riders[Math.floor(Math.random() * riders.length)];
    if (r.st === 'ride' && r.h === 0 && r.f === 0) { r.vh = 1.3 + Math.random() * 0.6; r.happy = 0.8; }
  }
  if (floatWant && !wasFloat && riders.some((r) => r.st === 'ride')) umbrellaPop(api.sound);
  wasFloat = floatWant;

  let hopped = false;
  for (let i = 0; i < riders.length; i++) {
    const r = riders[i];
    if (r.st === 'leap') {
      r.p += dt / 0.55;
      if (r.p >= 1) {
        r.st = 'ride';
        const cg = cargoOf(car.vehicle);
        r.h = Math.max(0, cg.floorY - cg.wallY) + 0.05;
        r.vh = 0;
        r.happy = 1.4;
        wheee(api.sound);
      }
      continue;
    }
    if (floatWant) r.f = Math.min(1, r.f + dt * 2.6);
    else if (r.f > 0) r.f = Math.max(0, r.f - dt * 1.1);
    if (hop && r.h === 0 && r.f === 0 && r.delay < 0) { r.delay = i * 0.05; r.pend = hop * (0.85 + 0.3 * Math.random()); }
    if (r.delay >= 0) {
      r.delay -= dt;
      if (r.delay < 0) { r.vh = r.pend; r.happy = 0.9; hopped = true; }
    }
    if (r.h > 0 || r.vh > 0) {
      r.vh -= 16 * dt;
      r.h += r.vh * dt;
      if (r.h <= 0) { r.sq = Math.min(0.28, -r.vh * 0.07); r.h = 0; r.vh = 0; }
    }
    if (r.f > 0) { r.h = 0; r.vh = 0; }
    r.sq = Math.max(0, r.sq - dt * 1.6);
    r.happy = Math.max(0, r.happy - dt);
  }
  if (hopped && hop > 2 && squeakT === 0) { wheee(api.sound); squeakT = 0.9; }

  // выпрыгнувшие на финише
  if (goers.length) {
    const cg = cargoOf(car.vehicle), c = Math.cos(car.a), s = Math.sin(car.a);
    for (let i = goers.length - 1; i >= 0; i--) {
      const g = goers[i];
      g.T += dt;
      if (g.T < 0) continue;
      // выпрыгнули из кузова → взяли шарик → полетели вверх, держась рядом с машиной
      const sx = car.x + c * g.lx - s * cg.wallY, sy = car.y + s * g.lx + c * cg.wallY;
      const fx = car.x - 1.5 + (g.i - (g.n - 1) / 2) * 0.85 + Math.sin(g.T * 2 + g.cr.ph) * 0.2;
      const fy = car.y - 1.7 - Math.pow(Math.max(0, g.T - 0.45), 1.7) * 1.5;
      if (g.T < 0.45) {
        const p = g.T / 0.45, e = p * p * (3 - 2 * p);
        g.x = sx + (fx - sx) * e;
        g.y = sy + (fy - sy) * e - Math.sin(Math.PI * p) * 0.8;
      } else { g.x = fx; g.y = fy; }
      if (!g.out && g.T >= 0.45) { g.out = true; world.burst(g.x, g.y - 0.9, 'spark', 5, '#ffd6ea'); }
      g.hT -= dt;
      if (g.hT <= 0) { g.hT = 0.25 + Math.random() * 0.25; heart(g.x + (Math.random() - 0.5) * 0.4, g.y - 0.3, (Math.random() - 0.5) * 0.8, 0.6); }
      if (g.T > 5) goers.splice(i, 1);
    }
  }
  updateHearts(dt);
}

function heart(x, y, vx = (Math.random() - 0.5) * 0.6, vy = -1.2 - Math.random() * 0.6) {
  if (hearts.length > 60) hearts.shift();
  hearts.push({ x, y, vx, vy, life: 1.4, s: 0.12 + Math.random() * 0.08 });
}
function updateHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.life -= dt;
    if (h.life <= 0) { hearts.splice(i, 1); continue; }
    h.x += h.vx * dt; h.y += h.vy * dt;
    h.vx *= 1 - 1.5 * dt;
  }
}

// ---------- финиш: домой к Мариссе ----------
function levelDone(world, e) {
  syncRiders();
  if (!riders.length) return;
  const car = world.car, cg = cargoOf(car.vehicle);
  const B = levelStart(e.L + 1);
  const list = [];
  riders.forEach((r, i) => {
    goers.push({ cr: r.cr, i, n: riders.length, lx: slotX(i, riders.length, cg), T: -i * 0.15, hT: 0.1, x: car.x, y: car.y });
    list.push(r.cr);
  });
  for (let k = 0; k < 8; k++) heart(B + (Math.random() - 0.5) * 3, groundY(B) - 1 - Math.random() * 2, (Math.random() - 0.5) * 2, -1.5);
  riders.length = 0;
  const k = S();
  k.ride = [];
  for (const cr of list) k.home.push(critterKey(cr));
  k.fresh += list.length;
  api.addCoins(list.length * 10);
  world.react({ pet: 'happy', sofya: 'happy', pose: 'wave' }, 2.5);
  list.forEach((cr, i) => setTimeout(() => critterVoice(api.sound, cr), 1400 + i * 380)); // после «мяу» Мариссы
  // карточку «домой к Мариссе» показываем, когда исчезнет «уровень пройден»
  setTimeout(() => { if (api.state === 'play' && !api.overlay) deliveryPopup(list); }, 3900);
  api.emit('kittens:home', list.length);
}

function faceCanvas(cr, t = 0.4) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 108;
  const ctx = cv.getContext('2d');
  ctx.translate(54, 62);
  ctx.scale(36, 36);
  drawHead(ctx, cr, 'happy', t, 0.07);
  return cv;
}
function deliveryPopup(list) {
  const box = document.createElement('div');
  box.className = 'kittens-pop';
  for (const cr of list.slice(0, MAX)) box.appendChild(faceCanvas(cr));
  box.insertAdjacentHTML('beforeend', '<i class="kittens-arrow"></i>');
  const home = document.createElement('canvas');
  home.width = home.height = 108;
  drawHouseIcon(home.getContext('2d'), 108, 108, 0.4, 'happy', api.save.look.hat);
  box.appendChild(home);
  box.insertAdjacentHTML('beforeend', `<div class="pill kittens-coins"><i class="coin small"></i>+${list.length * 10}</div>`);
  api.popup(box, 3800);
}

// ---------- рисование в мире ----------
function drawRoad(ctx, world, view, t) {
  const car = world.car;
  for (const it of world.items.values()) {
    if (!it.critters) continue;
    for (const cr of it.critters) {
      if (cr.taken || cr.x < view.x0 - 1 || cr.x > view.x1 + 1) continue;
      const near = cr.x - car.x < 14 && cr.x - car.x > -6;
      const hop = near ? Math.abs(Math.sin(t * 7 + cr.ph)) * 0.2 : Math.abs(Math.sin(t * 2.5 + cr.ph)) * 0.04;
      // мягкое свечение и сердечко над головой — заметно издалека
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ellipse(ctx, cr.x, cr.y - 0.32, 0.62, 0.5); ctx.fill();
      const hy = cr.y - 0.86 - hop - Math.sin(t * 3 + cr.ph) * 0.05, hs = 0.12 + Math.sin(t * 6 + cr.ph) * 0.015;
      heartPath(ctx, cr.x + 0.05, hy, hs);
      fillStroke(ctx, '#ff4f9a', '#ffffff', 0.03);
      ctx.save();
      ctx.translate(cr.x, cr.y - hop);
      ctx.scale(-K_W, K_W); // смотрят на подъезжающую машину
      drawCritter(ctx, cr, near ? 'happy' : 'normal', t, 'wave', 0, LW);
      ctx.restore();
    }
  }
}

function drawFront(ctx, world, view, t) {
  const car = world.car;
  // прыжок в кузов
  if (riders.some((r) => r.st === 'leap')) {
    const cg = cargoOf(car.vehicle);
    const c = Math.cos(car.a), s = Math.sin(car.a);
    riders.forEach((r, i) => {
      if (r.st !== 'leap') return;
      const lx = slotX(i, riders.length, cg), ly = cg.wallY - 0.05;
      const tx = car.x + c * lx - s * ly, ty = car.y + s * lx + c * ly;
      const p = Math.min(1, r.p), e = p * p * (3 - 2 * p);
      const x = r.sx + (tx - r.sx) * e;
      const y = r.sy + (ty - r.sy) * e - Math.sin(Math.PI * p) * (1.3 + Math.min(1.5, Math.abs(tx - r.sx) * 0.2));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(Math.PI * p) * -0.3);
      ctx.scale(K_W, K_W);
      drawCritter(ctx, r.cr, 'happy', t, 'yay', 0, LW);
      ctx.restore();
    });
  }
  // на финише: выпрыгнули, машут, исчезают в сердечках
  for (const g of goers) {
    if (g.T < 0) continue;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.sin(g.T * 2.3 + g.cr.ph) * 0.1);
    ctx.scale(K_W, K_W);
    drawCritter(ctx, g.cr, 'happy', t, g.T < 0.35 ? 'yay' : 'balloon', 0, LW);
    ctx.restore();
  }
  for (const h of hearts) {
    ctx.globalAlpha = clamp(h.life / 0.5, 0, 1);
    heartPath(ctx, h.x, h.y, h.s);
    fillStroke(ctx, '#ff4f9a', '#ffffff', 0.025);
  }
  ctx.globalAlpha = 1;
}

// В кузове (координаты машины). Парящие с зонтиками рисуются тут же, но держатся ровно.
function drawRiders(ctx, info, cg) {
  syncRiders();
  const n = riders.length;
  if (!n) return;
  const st = info.state, world = api.world;
  const live = st === world.car;
  const t = info.face.t;
  const lw = live ? LW : 0.12;
  const a = wrapAngle(st.a), c = Math.cos(st.a), s = Math.sin(st.a);
  const kw = slotK(n);
  // сначала те, кто стоит повыше (они дальше), потом сидящие у бортика
  for (let j = 0; j < n; j++) {
    const i = n >= 3 ? (j < (n >> 1) ? j * 2 + 1 : (j - (n >> 1)) * 2) : j;
    const r = riders[i];
    const lift = slotLift(i, n);
    const pawY = (cg.wallY - cg.floorY + lift) / kw;
    if (live && r.st !== 'ride') continue;
    const tx = slotX(i, n, cg);
    if (!live || r.lx === null) r.lx = tx; else r.lx += (tx - r.lx) * 0.15;
    let x = live ? r.lx : tx, y = cg.floorY - lift - (live ? r.h : 0);
    const f = live ? r.f : 0;
    let rot = 0, open = 0;
    if (f > 0) {
      const e = f * f * (3 - 2 * f);
      const k = i - (n - 1) / 2;
      const wx = st.x - 1.0 + k * 0.72 + clamp(-(st.vx || 0) * 0.03, -0.6, 0.6) + Math.sin(t * 1.6 + r.cr.ph) * 0.18;
      const wy = st.y - 2.05 - (i % 2) * 0.35 + Math.sin(t * 2.1 + r.cr.ph) * 0.12;
      const dx = wx - st.x, dy = wy - st.y;
      x += (c * dx + s * dy - x) * e;
      y += (-s * dx + c * dy - y) * e;
      rot = (-a + Math.sin(t * 1.9 + r.cr.ph) * 0.12) * e;
      open = clamp(f * 1.6, 0, 1);
    }
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    const sq = live ? r.sq : 0;
    const sc = f > 0 ? K_W : kw;
    ctx.scale(sc * (1 + sq * 0.5), sc * (1 - sq));
    if (open > 0) drawCritter(ctx, r.cr, 'happy', t, 'umbrella', open, lw);
    else drawCritter(ctx, r.cr, live && (r.happy > 0 || r.h > 0) ? 'happy' : 'normal', t, 'peek', pawY, lw);
    ctx.restore();
  }
}

export function init(a) {
  api = a;
  // зверята для уже созданных уровней (мир стартовал раньше, чем подключились возможности)
  for (const [L, items] of api.world.items) addCritters(L, items);
  syncRiders();

  api.on('world:items', (L, items) => addCritters(L, items));
  api.on('world:start', () => {
    pvx = null;
    accF = 0;
    syncRiders();
    // после аварии зверята на зонтиках плавно опускаются в кузов уже на новом месте
    for (const r of riders) {
      if (r.st === 'leap') { r.st = 'ride'; r.f = 1; }
      r.h = 0; r.vh = 0; r.delay = -1; r.lx = null;
    }
    goers.length = 0;
    hearts.length = 0;
  });
  api.on('world:update', update);
  api.on('world:level', levelDone);
  api.on('render:world-back', (ctx, world, view) => { LW = clamp(1.25 / (view.s * K_W), 0.07, 0.3); });
  api.on('render:world-items', drawRoad);
  api.on('render:world-front', drawFront);
  api.on('car:back', () => { cargoDrawn = false; });
  api.on('car:cargo', (ctx, info) => { cargoDrawn = true; drawRiders(ctx, info, info.vehicle.cargo || roofCargo(info.vehicle)); });
  api.on('car:front', (ctx, info) => { if (!cargoDrawn) drawRiders(ctx, info, roofCargo(info.vehicle)); });

  const css = document.createElement('style');
  css.textContent = `
    .kittens-pop { display: flex; align-items: center; gap: 4px; }
    .kittens-pop canvas { width: 50px; height: 50px; }
    .kittens-pop canvas:nth-last-of-type(1) { width: 56px; height: 56px; }
    .kittens-arrow { width: 22px; height: 22px; flex: none; background: #ff6fae; clip-path: polygon(0 30%, 55% 30%, 55% 0, 100% 50%, 55% 100%, 55% 70%, 0 70%); }
    .kittens-coins { font-size: 22px; box-shadow: none; background: #fff3c4; margin-left: 4px; }
  `;
  document.head.appendChild(css);
}

// для проверки в браузере
export const debug = { riders, goers, hearts, get S() { return S(); }, get accF() { return accF; } };
