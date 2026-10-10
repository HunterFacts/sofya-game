// Сальто и салют: машина сделала в воздухе полный оборот (вперёд или назад) и встала на колёса —
// над ней взлетают ракеты и рассыпаются искрами, сердечками и звёздочками, звучат фанфары,
// Софья и Марисса радуются, а монетки (20 за каждое сальто) летят в копилку в углу экрана.
// Двойное и тройное сальто — салют больше. Если машина перевернулась на крышу — награды нет.
import { slopeAt } from '../terrain.js';
import { wrapAngle } from '../rng.js';
import { heartPath, starPath } from '../draw-utils.js';

const TURN = Math.PI * 2;
const PER_FLIP = 20;       // монет за одно сальто
const FLIP_MIN = 0.82;     // столько оборотов уже считается сальто (с учётом наклона горок)
const UPRIGHT = 0.75;      // «стоит на колёсах»: отклонение от склона меньше этого (рад)
const SETTLE = 0.3;        // столько секунд машина должна спокойно простоять на колёсах (вдруг перевернётся)

let api, world;

// ================== Считаем обороты ==================
let prevA = 0, acc = 0, pending = null;

function resetTrack() { prevA = world.car.a; acc = 0; pending = null; }

function track(w, dt) {
  const car = w.car;
  let d = wrapAngle(car.a - prevA);
  prevA = car.a;
  if (Math.abs(d) > 0.9) { acc = 0; d = 0; }   // машину переставили (щит, «застряла») — не считаем
  if (w.crashed) { acc = 0; pending = null; return; }
  const upright = Math.abs(wrapAngle(car.a - slopeAt(car.x, 1.5))) < UPRIGHT;
  if (car.grounded && upright) {
    if (Math.abs(acc) >= FLIP_MIN * TURN) {
      const n = Math.min(5, Math.max(1, Math.round(Math.abs(acc) / TURN)));
      if (pending) pending.n = Math.max(pending.n, n); else pending = { n, t: 0, age: 0 };
    }
    acc = 0;
  } else acc += d;
  if (pending) {
    // жёсткое приземление может подбросить машину: ждём, пока она спокойно постоит на колёсах
    pending.age += dt;
    pending.t = car.grounded && upright ? pending.t + dt : 0;
    if (pending.t >= SETTLE) { const n = pending.n; pending = null; reward(n); }
    else if (pending.age > 5) pending = null;
  }
}

// ================== Салют (координаты мира) ==================
const PALETTE = [
  ['#ff4f9a', '#ffc2e0'], ['#ffd93b', '#fff6b0'], ['#4fc3ff', '#c9efff'],
  ['#8be86a', '#e0ffd0'], ['#b98cff', '#eadcff'], ['#ff8a5c', '#ffd9c7'],
];
const HEART = ['#ff3d8b', '#ffd1e6'];
const rockets = [];
const sparks = [];
const flashes = [];
const MAX_SPARKS = 420;

function launchFireworks(n) {
  const car = world.car, rd = api.renderer;
  const big = 1 + 0.2 * (n - 1);
  // где окажется камера, когда догонит машину (как в Renderer.follow): над машиной ~58% высоты экрана
  const viewW = rd.W / rd.cam.s;
  const room = (0.58 * rd.H) / rd.cam.s;
  const camX = car.x + viewW * 0.12 + Math.min(4, Math.max(-2, car.vx * 0.25));
  const hud = 66 / rd.cam.s;   // верхняя полоска HUD — салют под ней
  const R = Math.min(3, Math.max(1.4, room * 0.28)) * big;
  const apex = Math.max(2.8, Math.min(8, room - hud - R * 0.9 - 0.2));
  const count = n === 1 ? 3 : n === 2 ? 5 : 7;
  const mid = (count - 1) / 2;
  const bx = car.vx;   // салют «едет» вместе с машиной и остаётся на экране
  // сначала средняя ракета, потом по краям
  const order = [...Array(count).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  order.forEach((i, k) => {
    const f = count === 1 ? 0 : (i - mid) / mid;               // -1..1
    const center = i === Math.round(mid);
    const kind = center && n >= 2 ? 'heart' : ['ring', 'star', 'heart', 'ring', 'star', 'ring', 'heart'][(i + n) % 7];
    const h = apex * (center ? 1 : 0.68 + Math.random() * 0.25);
    const g = 11;
    rockets.push({
      x: camX + f * viewW * 0.34 + (Math.random() - 0.5) * 0.6, y: car.y + 0.4,
      vx: -f * 0.6, vy: -Math.sqrt(2 * g * (h + 1)), bx, g,
      delay: k * 0.17 + Math.random() * 0.06,
      col: kind === 'heart' ? HEART : PALETTE[(i * 2 + n) % PALETTE.length], kind,
      size: R * (center ? (n >= 2 ? 1.2 : 1.05) : 0.85 + Math.random() * 0.2),
      whistle: k % 2 === 0,
    });
  });
}

function addSpark(x, y, vx, vy, bx, col, shape, size, life) {
  if (sparks.length >= MAX_SPARKS) return;
  sparks.push({ x, y, vx, vy, bx, col, shape, size, life, max: life, tw: Math.random() * 6 });
}

function explode(r) {
  const { x, y, col, kind, size, bx } = r;
  flashes.push({ x, y, bx, life: 0.28, max: 0.28, r: size * 0.9, col: col[1] });
  const v = size * 2.4;   // скорость разлёта ~ радиус взрыва (сопротивление воздуха гасит её)
  if (kind === 'heart') {
    // искры раскладываются сердечком
    const N = 40;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TURN;
      const hx = Math.pow(Math.sin(a), 3);
      const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16;
      addSpark(x, y, hx * v, hy * v, bx, i % 4 ? col[0] : col[1], i % 3 === 0 ? 2 : 0, 0.15 + 0.03 * size, 1.4 + Math.random() * 0.3);
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TURN, s = Math.random() * 0.35 * v;
      addSpark(x, y, Math.cos(a) * s, Math.sin(a) * s, bx, '#ffffff', 2, 0.16, 1.1);
    }
  } else {
    const N = kind === 'star' ? 18 : 28;
    const shape = kind === 'star' ? 1 : 0;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TURN + Math.random() * 0.1, s = v * (0.85 + Math.random() * 0.25);
      addSpark(x, y, Math.cos(a) * s, Math.sin(a) * s, bx, i % 2 ? col[0] : col[1], shape, shape ? 0.26 : 0.14, 1.2 + Math.random() * 0.4);
    }
    // внутреннее колечко другого цвета
    const c2 = PALETTE[(PALETTE.indexOf(col) + 2) % PALETTE.length][0];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TURN, s = v * 0.45;
      addSpark(x, y, Math.cos(a) * s, Math.sin(a) * s, bx, c2, kind === 'star' ? 2 : 1, 0.2, 1.1 + Math.random() * 0.3);
    }
  }
  boom(size);
}

function updateFireworks(dt) {
  let j = 0;
  for (let i = 0; i < rockets.length; i++) {
    const r = rockets[i];
    if (r.delay > 0) {
      r.delay -= dt;
      if (r.delay <= 0 && r.whistle) whistle();
      r.x += r.bx * dt;   // пока ракета ждёт старта, она едет вместе с машиной
      rockets[j++] = r;
      continue;
    }
    r.vy += r.g * dt;
    r.x += (r.bx + r.vx) * dt;
    r.y += r.vy * dt;
    if (r.vy > -1.2) { explode(r); continue; }
    rockets[j++] = r;
  }
  rockets.length = j;

  const drag = Math.exp(-2.6 * dt);
  j = 0;
  for (let i = 0; i < sparks.length; i++) {
    const p = sparks[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vx *= drag; p.vy = p.vy * drag + 2.2 * dt;
    p.x += (p.bx + p.vx) * dt;
    p.y += p.vy * dt;
    sparks[j++] = p;
  }
  sparks.length = j;

  j = 0;
  for (let i = 0; i < flashes.length; i++) {
    const f = flashes[i];
    f.life -= dt;
    if (f.life <= 0) continue;
    f.x += f.bx * dt;
    flashes[j++] = f;
  }
  flashes.length = j;
}

function drawFireworks(ctx, w, view, t) {
  if (!rockets.length && !sparks.length && !flashes.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  // вспышки
  for (const f of flashes) {
    const k = f.life / f.max;
    ctx.globalAlpha = k * 0.55;
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - k * 0.6), 0, TURN); ctx.fill();
    ctx.globalAlpha = k;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.3 * k, 0, TURN); ctx.fill();
  }
  // ракеты: хвостик и яркая головка
  for (const r of rockets) {
    if (r.delay > 0) continue;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = r.col[0];
    ctx.lineWidth = 0.09;
    ctx.beginPath(); ctx.moveTo(r.x - (r.bx + r.vx) * 0.06, r.y - r.vy * 0.06); ctx.lineTo(r.x, r.y); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(r.x, r.y, 0.09, 0, TURN); ctx.fill();
    ctx.fillStyle = r.col[1];
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(r.x - (r.bx + r.vx) * 0.1, r.y - r.vy * 0.1, 0.06, 0, TURN); ctx.fill();
  }
  // искры
  for (const p of sparks) {
    const k = p.life / p.max;
    let a = k < 0.35 ? k / 0.35 : 1;
    if (k < 0.5) a *= 0.6 + 0.4 * Math.abs(Math.sin(t * 18 + p.tw));   // мерцают под конец
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    const s = p.size * (0.7 + 0.3 * k);
    if (p.shape === 0) {
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TURN); ctx.fill();
      if (k > 0.6) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.45, 0, TURN); ctx.fill(); }
    } else if (p.shape === 1) {
      starPath(ctx, p.x, p.y, s, s * 0.45, 5, -Math.PI / 2 + p.tw + t * 2);
      ctx.fill();
    } else {
      heartPath(ctx, p.x, p.y + s * 0.2, s);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ================== Звуки ==================
function fanfare(n) {
  const s = api.sound;
  [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.18, 'triangle', 0.16, i * 0.085));
  s.tone(1319, 0.45, 'triangle', 0.12, 0.36);
  s.tone(1047, 0.45, 'square', 0.035, 0.36);
  if (n >= 2) [1175, 1319, 1568].forEach((f, i) => s.tone(f, 0.16, 'triangle', 0.11, 0.62 + i * 0.08));
  if (n >= 3) [1568, 2093].forEach((f, i) => s.tone(f, 0.3, 'sine', 0.08, 0.9 + i * 0.1));
}
function whistle() { const s = api.sound; s.tone(700 + Math.random() * 200, 0.45, 'sine', 0.025, 0, undefined, 1700); }
function boom(size) {
  const s = api.sound;
  s.noise(0.32, 0.13, 2600, 380);
  s.tone(150 + Math.random() * 60, 0.3, 'sine', 0.12, 0, undefined, 55);
  for (let k = 0; k < 4; k++) s.noise(0.04, 0.05 + 0.02 * size / 3, 5200, 3200, 0.16 + k * 0.07 + Math.random() * 0.04);
}

// ================== Монетки летят в копилку (экран) ==================
const coins = [];
let target = { x: 40, y: 30 }, pendingCoins = 0, lastFlush = 0, arrived = 0;
let sprite = null;

function coinSprite() {
  if (sprite) return sprite;
  const S = 64;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = S;
  const c = sprite.getContext('2d');
  const r = S / 2 - 3;
  c.translate(S / 2, S / 2);
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fff8c4'); g.addColorStop(0.35, '#ffe04a'); g.addColorStop(1, '#f5b800');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, TURN); c.fill();
  c.strokeStyle = '#d99a00'; c.lineWidth = 5; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 3;
  c.beginPath(); c.arc(0, 0, r * 0.66, 0, TURN); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.beginPath(); c.ellipse(-r * 0.35, -r * 0.38, r * 0.2, r * 0.11, -0.7, 0, TURN); c.fill();
  return sprite;
}

let pillBox = { left: 10, bottom: 50 };
function coinTarget() {
  const el = document.querySelector('#hud .coins-pill .coin');
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.width) target = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  const pr = el.parentNode.getBoundingClientRect();
  if (pr.width) pillBox = { left: pr.left, bottom: pr.bottom };
}

function coinShower(value) {
  coinTarget();
  const p = api.renderer.worldToScreen(world.car.x, world.car.y - 0.8);
  const n = Math.min(value, 40);
  const u = Math.min(api.renderer.W, api.renderer.H);
  for (let i = 0; i < n; i++) {
    const v = Math.floor(value / n) + (i < value % n ? 1 : 0);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
    const d = u * (0.12 + Math.random() * 0.2);
    coins.push({
      x0: p.x, y0: p.y, cx: p.x + Math.cos(a) * d, cy: p.y + Math.sin(a) * d - u * 0.08,
      age: -i * 0.035, dur: 0.85 + Math.random() * 0.3, v, spin: Math.random() * 6,
    });
  }
}

function flushCoins() {
  if (pendingCoins > 0) {
    api.addCoins(pendingCoins);
    pendingCoins = 0;
    const pill = document.querySelector('#hud .coins-pill');
    if (pill && pill.animate) pill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 200 });
  }
  lastFlush = performance.now();
}

// все монетки, которые ещё летят, сразу кладём в копилку (пауза в меню, новый заезд)
function finishCoins() {
  for (const c of coins) pendingCoins += c.v;
  coins.length = 0;
  flushCoins();
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
let rings = [];   // «бульк» у копилки
function updateCoins(dt) {
  if (!coins.length && !pendingCoins) return;
  let j = 0;
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    c.age += dt;
    if (c.age >= c.dur) {
      pendingCoins += c.v;
      arrived++;
      if (arrived % 2 === 0) api.sound.coin(Math.min(12, arrived / 2));
      if (rings.length < 6) rings.push({ life: 0.3 });
      continue;
    }
    coins[j++] = c;
  }
  coins.length = j;
  if (pendingCoins && (performance.now() - lastFlush > 120 || !coins.length)) flushCoins();
  if (!coins.length) arrived = 0;
}

function drawCoins(ctx, view, t, dt) {
  if (rings.length) {
    ctx.save();
    ctx.strokeStyle = '#ffe04a';
    ctx.lineWidth = 3;
    let j = 0;
    for (const r of rings) {
      r.life -= dt;
      if (r.life <= 0) continue;
      ctx.globalAlpha = r.life / 0.3;
      ctx.beginPath(); ctx.arc(target.x, target.y, 14 + (0.3 - r.life) * 70, 0, TURN); ctx.stroke();
      rings[j++] = r;
    }
    rings.length = j;
    ctx.restore();
  }
  if (!coins.length) return;
  const img = coinSprite();
  const R = 12;
  for (const c of coins) {
    if (c.age < 0) continue;
    const k = ease(Math.min(1, c.age / c.dur)), m = 1 - k;
    const x = m * m * c.x0 + 2 * m * k * c.cx + k * k * target.x;
    const y = m * m * c.y0 + 2 * m * k * c.cy + k * k * target.y;
    const sc = R * (1 + 0.35 * Math.sin(Math.PI * Math.min(1, c.age / c.dur)));
    const sx = Math.max(0.25, Math.abs(Math.cos(t * 7 + c.spin)));
    ctx.drawImage(img, x - sc * sx, y - sc, sc * 2 * sx, sc * 2);
  }
}

// ================== Значок «сальто» с числом монет ==================
let badge = null;   // {n, value, life, max, y}
function drawLoop(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI * 0.35, Math.PI * 1.45); ctx.stroke();
  const a = Math.PI * 1.45, ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r;
  ctx.beginPath();
  ctx.moveTo(ex + r * 0.55, ey - r * 0.05);
  ctx.lineTo(ex - r * 0.1, ey - r * 0.5);
  ctx.lineTo(ex - r * 0.05, ey + r * 0.45);
  ctx.closePath();
  ctx.fill();
}
function drawBadge(ctx, view, dt) {
  if (!badge) return;
  badge.life -= dt;
  if (badge.life <= 0) { badge = null; return; }
  const age = badge.max - badge.life;
  const k = Math.min(1, age / 0.3) - 1;   // «пружинка» при появлении (easeOutBack)
  const pop = 1 + 2.7 * k * k * k + 1.7 * k * k + (age > 0.3 ? 0.04 * Math.sin((age - 0.3) * 8) : 0);
  const alpha = Math.min(1, badge.life / 0.3);
  const loops = Math.min(badge.n, 3);
  ctx.save();
  ctx.font = '900 28px system-ui, -apple-system, sans-serif';
  if (!badge.tw) badge.tw = ctx.measureText(badge.text).width;
  const w = loops * 36 + 14 + badge.tw + 10 + 30 + 26, h = 48;
  ctx.translate(badge.x + w / 2, badge.y);
  ctx.scale(pop, pop);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(160,60,120,0.25)';
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2 + 4, w, h, h / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  let x = -w / 2 + 16;
  ctx.strokeStyle = '#ff4f9a'; ctx.fillStyle = '#ff4f9a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < loops; i++) { drawLoop(ctx, x + 14, 0, 11); x += 36; }
  x += 6;
  ctx.fillStyle = '#6b3a8a';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.text, x, 2);
  x += badge.tw + 10;
  ctx.drawImage(coinSprite(), x, -15, 30, 30);
  ctx.restore();
}

// ================== Награда ==================
function reward(n) {
  const value = PER_FLIP * n;
  world.react({ pet: 'happy', sofya: 'happy', pose: 'wave' }, 1.4 + 0.4 * n);
  world.happyT = Math.max(world.happyT || 0, 1.5);
  launchFireworks(n);
  fanfare(n);
  coinShower(value);
  // значок под копилкой: туда же летят монетки, а середина неба остаётся салюту
  badge = { n, text: '+' + value, life: 2.4, max: 2.4, x: pillBox.left, y: pillBox.bottom + 34, tw: 0 };
  api.emit('flips:flip', n, value);
}

let lastT = 0;
export function init(a) {
  api = a;
  world = api.world;
  resetTrack();
  api.on('world:start', () => { resetTrack(); rockets.length = 0; sparks.length = 0; flashes.length = 0; finishCoins(); });
  api.on('world:update', (w, dt) => { track(w, dt); updateFireworks(dt); });
  api.on('world:crash', () => { acc = 0; pending = null; });
  api.on('render:world-front', drawFireworks);
  api.on('render:screen', (ctx, w, view, t) => {
    const dt = Math.min(0.05, Math.max(0, t - lastT));
    lastT = t;
    drawCoins(ctx, view, t, dt);
    drawBadge(ctx, view, dt);
  });
  api.on('app:frame', (dt) => updateCoins(dt));
  api.on('app:state', (s) => {
    if (s === 'menu') { finishCoins(); badge = null; rockets.length = 0; sparks.length = 0; flashes.length = 0; }
  });
  // для проверки: __game.api.emit('flips:test', 2) — награда как за двойное сальто
  api.on('flips:test', (n) => reward(n || 1));
}
