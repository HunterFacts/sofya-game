// Ежедневный подарок.
// Кнопка-коробка в меню (с «!», когда сегодняшний подарок ждёт). На экране 7 коробок — дни подряд;
// сегодняшняя светится и подпрыгивает, её открывают тремя тапами, как сундук.
// Подарок — раз в календарный день (по часам телефона). Пропущенные дни ничего не сбрасывают:
// просто открывается следующая коробка. После 7-й всё начинается с 1-й.
// В 7-й коробке, кроме монет, эксклюзивная раскраска («галактика», потом «конфетка»): в гараже она
// появляется, только когда уже есть (купить её нельзя, из сундука не выпадает).
import { addDefaults } from '../save.js';
import { PAINTS } from '../config.js';
import { boosterIcon, chestIcon } from '../ui.js';
import { Renderer } from '../render.js';
import { TAU, circle, ellipse, rrect, fillStroke, starPath, heartPath } from '../draw-utils.js';

// n — сколько подарков открыто всего, last — день последнего подарка (ГГГГММДД)
addDefaults({ daily: { n: 0, last: 0 } });

const DAYS = [
  { coins: 100 },
  { inv: { turbo: 2 } },
  { chest: 'silver' },
  { coins: 300 },
  { inv: { turbo: 1, magnet: 1, shield: 1 } },
  { chest: 'gold' },
  { coins: 1000, paint: true },
];
const NO_PAINT_LEFT = 500;   // если все эксклюзивные раскраски уже есть — ещё монетки

// Эксклюзивные раскраски: узор рисуем сами (событие car:stickers), цена — только «на всякий случай»
const EXCLUSIVE = [
  { id: 'galaxy', body: '#4a30b8', dark: '#1f1466', light: '#8f70ff', price: 9999, chest: false, daily: true },
  { id: 'candy', body: '#ff8cc6', dark: '#e0559c', light: '#fff0f8', price: 9999, chest: false, daily: true },
];

// цвета коробок по дням
const BOX = [
  { box: '#ff7eb6', dark: '#d94f8f', rib: '#ffe066', ribD: '#e0b21a' },
  { box: '#b98cff', dark: '#8d5fe0', rib: '#ff7eb6', ribD: '#d94f8f' },
  { box: '#5fd9b9', dark: '#2fae8c', rib: '#ff7eb6', ribD: '#d94f8f' },
  { box: '#6fc3ff', dark: '#3d93d6', rib: '#ffe066', ribD: '#e0b21a' },
  { box: '#ffa96b', dark: '#e07f3a', rib: '#b98cff', ribD: '#8d5fe0' },
  { box: '#ffd84d', dark: '#d9a21b', rib: '#ff5f9e', ribD: '#c8306f' },
  { box: 'rainbow', dark: '#c8478c', rib: '#ffd84d', ribD: '#d9a21b', lid: '#ff6fae' },
];
const RB = ['#ff7eb0', '#ffb067', '#ffe066', '#7fe39b', '#74c6ff', '#b28fff'];

const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
const isReady = (s) => !!s.daily && s.daily.last !== today();

let A = null;
const S = {
  el: null, row: null, rw: null, rwBox: null, burstCv: null, btn: null,
  running: false, taps: 0, openT: -1, shake: 0, todayCv: null, todayBox: null, todayIdx: 0,
  parts: [], shownAt: 0, lastT: 0, badge: null,
};

export function init(api) {
  A = api;
  injectStyle();
  syncPaints();

  // кнопка в меню
  S.btn = api.addMenuButton({
    id: 'btnDaily', label: 'Подарок', order: 5, badge: true,
    html: '<canvas width="120" height="120"></canvas>',
    onTap: () => api.openScreen('daily'),
  });
  const ic = S.btn.querySelector('canvas').getContext('2d');
  drawGift(ic, 60, 108, 80, BOX[0], 0, 0);
  sparkle(ic, 100, 22, 10);

  // экран
  const el = document.createElement('div');
  el.className = 'screen shop daily-screen';
  el.innerHTML = `
    <div class="shop-head">
      <button class="round daily-back" aria-label="Назад">⬅</button>
      <div class="pill coins-pill"><i class="coin"></i><span class="coinsText">0</span></div>
    </div>
    <div class="daily-row"></div>
    <div class="daily-rewards hidden"><div class="daily-rw-box"></div><div class="tap-hint">👆</div></div>
    <canvas class="daily-burst"></canvas>`;
  S.el = el;
  S.row = el.querySelector('.daily-row');
  S.rw = el.querySelector('.daily-rewards');
  S.rwBox = el.querySelector('.daily-rw-box');
  S.burstCv = el.querySelector('.daily-burst');
  el.querySelector('.daily-back').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); api.closeScreen(); });
  S.rw.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (performance.now() - S.shownAt < 700) return;
    A.sound.click();
    hideRewards();
  });
  api.registerScreen('daily', { el, open: openScreen, close: closeScreen });

  // эксклюзивный узор на машине
  api.on('car:stickers', (ctx, car) => {
    const id = car.look && car.look.paint;
    if (id === 'galaxy') drawGalaxy(ctx, (car.face && car.face.t) || 0);
    else if (id === 'candy') drawCandy(ctx);
  });

  // «!» на кнопке: при смене экрана, при возвращении в игру и раз в полминуты (наступил новый день)
  api.on('app:state', () => { syncPaints(); updateBadge(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateBadge(); });
  setInterval(updateBadge, 30000);
  // после переноса/сброса прогресса список раскрасок и «!» должны совпадать с сохранением ещё до открытия гаража
  document.addEventListener('pointerdown', () => { syncPaints(); updateBadge(); }, true);
  updateBadge();
}

// ---------- раскраски из подарка ----------
function syncPaints() {
  const owned = (A.save.owned && A.save.owned.paint) || [];
  for (const p of EXCLUSIVE) {
    const has = owned.includes(p.id), i = PAINTS.indexOf(p);
    if (has && i < 0) PAINTS.push(p);
    else if (!has && i >= 0) PAINTS.splice(i, 1);
  }
}
const nextExclusive = () => EXCLUSIVE.find((p) => !A.save.owned.paint.includes(p.id));
// нарисовать машину в раскраске, которой ещё нет (drawCar ищет краску в PAINTS)
function withPaint(p, fn) {
  const tmp = !PAINTS.includes(p);
  if (tmp) PAINTS.push(p);
  try { fn(); } finally { if (tmp) PAINTS.splice(PAINTS.indexOf(p), 1); }
}

function updateBadge() {
  if (!S.btn) return;
  const on = isReady(A.save);
  if (on === S.badge) return;
  S.badge = on;
  S.btn.classList.toggle('daily-ready', on);
  const b = S.btn.querySelector('.badge');
  if (b) b.textContent = on ? '!' : '';
}

// ---------- экран ----------
function openScreen() {
  syncPaints();
  S.taps = 0;
  S.openT = -1;
  S.shake = 0;
  S.parts.length = 0;
  S.rw.classList.add('hidden');
  renderRow();
  A.refresh();
  S.running = true;
  S.lastT = performance.now() / 1000;
  requestAnimationFrame(loop);
}

function closeScreen() {
  S.running = false;
  S.rw.classList.add('hidden');
  S.parts.length = 0;
  S.todayCv = null;
  updateBadge();
}

function renderRow() {
  const s = A.save, n = s.daily.n, ready = isReady(s);
  // какая коробка «сегодняшняя»: ждёт открытия или уже открыта сегодня
  const cur = ready ? n % 7 : (n - 1 + 7) % 7;
  S.row.innerHTML = '';
  S.todayCv = null;
  S.todayBox = null;
  for (let i = 0; i < 7; i++) {
    const kind = i < cur ? 'done' : i === cur ? (ready ? 'today' : 'done') : (!ready && i === cur + 1 ? 'next' : 'later');
    const b = document.createElement('button');
    b.className = `daily-box ${kind} d${i + 1}`;
    b.innerHTML = `<i class="daily-num">${i + 1}</i>`;
    const cv = document.createElement('canvas');
    cv.width = i === 6 ? 260 : 200;
    cv.height = 170;
    b.appendChild(cv);
    const prize = document.createElement('div');
    prize.className = 'daily-prize';
    if (kind === 'done') prize.innerHTML = '<b class="daily-check">✓</b>';
    else fillPrize(prize, i);
    b.appendChild(prize);
    if (kind === 'today') {
      S.todayCv = cv;
      S.todayBox = b;
      S.todayIdx = i;
      b.addEventListener('pointerdown', onTodayTap);
    } else {
      drawStatic(cv, i, kind);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        A.sound.click();
        b.classList.remove('daily-wiggle'); void b.offsetWidth; b.classList.add('daily-wiggle');
      });
    }
    S.row.appendChild(b);
  }
}

function mini(w = 64, h = 64) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

function fillPrize(box, i) {
  const d = DAYS[i];
  if (d.coins) box.insertAdjacentHTML('beforeend', `<span class="pill"><i class="coin small"></i>${d.coins}</span>`);
  if (d.inv) {
    for (const [k, n] of Object.entries(d.inv)) {
      const cv = mini();
      boosterIcon(cv, k);
      box.appendChild(cv);
      if (n > 1) box.insertAdjacentHTML('beforeend', `<b>×${n}</b>`);
    }
  }
  if (d.chest) { const cv = mini(80, 64); chestIcon(cv, d.chest); box.appendChild(cv); }
  if (d.paint) {
    const p = nextExclusive();
    if (p) {
      const cv = mini(108, 64);
      cv.className = 'daily-car';
      withPaint(p, () => Renderer.drawPreview(cv.getContext('2d'), 108, 64, { ...A.save.look, paint: p.id }, 'happy', 0.4));
      box.appendChild(cv);
    }
  }
}

function drawStatic(cv, i, kind) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const w = (i === 6 ? 140 : 110) * (kind === 'done' ? 0.8 : 1);
  drawGift(ctx, W / 2, H * 0.95, w, BOX[i], kind === 'done' ? 1 : 0, 0.3);
  if (kind === 'next') drawMoon(ctx, W * 0.8, H * 0.2, 22);
}

// сегодняшняя коробка: лучи, тряска от тапов, открывание
function drawToday(t, dt) {
  const cv = S.todayCv, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H * 0.6);
  ctx.rotate(t * 0.5);
  ctx.fillStyle = `rgba(255,214,90,${S.openT > 0 ? 0.55 : 0.32})`;
  for (let i = 0; i < 10; i++) {
    ctx.rotate(TAU / 10);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-W * 0.09, -W * 0.75); ctx.lineTo(W * 0.09, -W * 0.75); ctx.fill();
  }
  ctx.restore();
  if (S.openT >= 0) S.openT = Math.min(1, S.openT + dt / 0.4);
  S.shake = Math.max(0, S.shake - dt / 0.35);
  const sc = 1 + S.taps * 0.07 * (S.openT > 0 ? 1 - S.openT * 0.8 : 1);
  const w = S.todayIdx === 6 ? 140 : 110;
  ctx.save();
  ctx.translate(W / 2 + Math.sin(t * 50) * 9 * S.shake, H * 0.95);
  ctx.scale(sc, sc);
  ctx.rotate(Math.sin(t * 40) * 0.09 * S.shake);
  drawGift(ctx, 0, 0, w, BOX[S.todayIdx], Math.max(0, S.openT), t);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const a = 0.5 + 0.5 * Math.sin(t * 4 + i * 2.1);
    ctx.globalAlpha = a;
    sparkle(ctx, W * (0.18 + i * 0.32), H * (0.18 + (i % 2) * 0.16), 9 + 4 * a);
  }
  ctx.globalAlpha = 1;
}

function onTodayTap(e) {
  e.preventDefault();
  if (S.openT >= 0 || !isReady(A.save)) return;
  S.taps++;
  S.shake = 1;
  A.sound.chestTap(S.taps);
  if (S.taps >= 3) claim();
}

function claim() {
  const s = A.save;
  if (!isReady(s)) return;
  const idx = s.daily.n % 7;
  s.daily.n++;
  s.daily.last = today();
  const out = grant(idx);
  A.persist(true);
  A.refresh();
  updateBadge();
  S.openT = 0;
  A.sound.chestOpen();
  startBurst(S.todayBox);
  setTimeout(() => showRewards(out), 600);
}

function grant(idx) {
  const s = A.save, d = DAYS[idx], out = [];
  if (d.coins) { s.coins += d.coins; out.push({ type: 'coins', n: d.coins }); }
  if (d.inv) for (const [k, n] of Object.entries(d.inv)) { s.inv[k] = (s.inv[k] || 0) + n; out.push({ type: 'booster', id: k, n }); }
  if (d.chest) { A.giveChest(d.chest); out.push({ type: 'chest', tier: d.chest }); }
  if (d.paint) {
    const p = nextExclusive();
    if (p) {
      s.owned.paint.push(p.id);
      s.fresh = true;
      syncPaints();
      out.push({ type: 'paint', id: p.id });
    } else {
      s.coins += NO_PAINT_LEFT;
      out[0].n += NO_PAINT_LEFT;
    }
  }
  return out;
}

function showRewards(list) {
  if (!S.running) return;
  const box = S.rwBox;
  box.innerHTML = '';
  list.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = `reward ${r.type === 'paint' ? 'special' : ''}`;
    card.style.animationDelay = `${i * 0.18}s`;
    if (r.type === 'coins') {
      card.innerHTML = `<div class="big-emoji"><i class="coin" style="width:58px;height:58px;border-width:5px"></i></div>+${r.n}`;
    } else {
      const cv = mini(192, 144);
      if (r.type === 'booster') boosterIcon(cv, r.id);
      else if (r.type === 'chest') chestIcon(cv, r.tier);
      else Renderer.drawPreview(cv.getContext('2d'), 192, 144, { ...A.save.look, paint: r.id }, 'happy', 0.4);
      card.appendChild(cv);
      card.insertAdjacentHTML('beforeend', r.type === 'paint' ? '★' : `+${r.n || 1}`);
    }
    box.appendChild(card);
  });
  S.rw.classList.remove('hidden');
  S.shownAt = performance.now();
  if (list.some((r) => r.type === 'paint')) setTimeout(() => A.sound.meow(1.1), 500);
}

function hideRewards() {
  S.rw.classList.add('hidden');
  S.openT = -1;
  S.taps = 0;
  renderRow();
}

// ---------- салют из коробки ----------
function startBurst(box) {
  const cv = S.burstCv, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const r = box.getBoundingClientRect(), er = S.el.getBoundingClientRect();
  const x = r.left - er.left + r.width / 2, y = r.top - er.top + r.height * 0.45;
  for (let i = 0; i < 90; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 250 + Math.random() * 520;
    const kind = i < 12 ? 'coin' : i < 30 ? 'star' : i < 40 ? 'heart' : 'conf';
    S.parts.push({
      kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
      life: 1.4 + Math.random() * 0.8, max: 2.2, size: kind === 'conf' ? 5 + Math.random() * 4 : 9 + Math.random() * 7,
      color: RB[i % 6],
    });
  }
}

function stepBurst(dt) {
  const cv = S.burstCv, ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
  let j = 0;
  for (const p of S.parts) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vy += 900 * dt;
    p.vx *= 1 - 1.2 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    ctx.globalAlpha = Math.min(1, p.life / 0.5);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === 'conf') { ctx.fillStyle = p.color; ctx.scale(1, Math.cos(p.rot * 2)); ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size); }
    else if (p.kind === 'star') { starPath(ctx, 0, 0, p.size, p.size * 0.45); fillStroke(ctx, '#ffe14d', '#ffffff', 2); }
    else if (p.kind === 'heart') { heartPath(ctx, 0, 0, p.size); fillStroke(ctx, '#ff6fae', '#ffffff', 2); }
    else {
      ctx.scale(Math.max(0.2, Math.abs(Math.cos(p.rot))), 1);
      circle(ctx, 0, 0, p.size); fillStroke(ctx, '#ffd93b', '#d99a00', 2.5);
      circle(ctx, 0, 0, p.size * 0.62); ctx.strokeStyle = '#f0b400'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
    S.parts[j++] = p;
  }
  S.parts.length = j;
  ctx.globalAlpha = 1;
  if (!j) ctx.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
}

function loop() {
  if (!S.running) return;
  const t = performance.now() / 1000, dt = Math.min(0.05, t - S.lastT);
  S.lastT = t;
  if (S.todayCv) drawToday(t, dt);
  if (S.parts.length) stepBurst(dt);
  requestAnimationFrame(loop);
}

// ---------- рисунки ----------
// Коробка с бантом: (x, y) — середина низа, w — ширина, open 0..1 — крышка улетает
function drawGift(ctx, x, y, w, pal, open = 0, t = 0) {
  const h = w * 0.62, lw = w * 1.1, lh = w * 0.24;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (open > 0) {
    const g = ctx.createRadialGradient(0, -h, 0, 0, -h, w * 0.95);
    g.addColorStop(0, `rgba(255,244,170,${0.95 * open})`);
    g.addColorStop(1, 'rgba(255,244,170,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, -h, w * 0.95);
    ctx.fill();
  }
  // коробка
  rrect(ctx, -w / 2, -h, w, h, w * 0.08);
  if (pal.box === 'rainbow') {
    ctx.save();
    ctx.clip();
    for (let k = 0; k < 6; k++) { ctx.fillStyle = RB[k]; ctx.fillRect(-w / 2, -h + (k * h) / 6, w, h / 6 + 1); }
    ctx.restore();
    rrect(ctx, -w / 2, -h, w, h, w * 0.08);
    ctx.strokeStyle = pal.dark; ctx.lineWidth = w * 0.035; ctx.stroke();
  } else fillStroke(ctx, pal.box, pal.dark, w * 0.035);
  // горошек
  ctx.save();
  rrect(ctx, -w / 2, -h, w, h, w * 0.08);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const [fx, fy] of [[-0.33, 0.3], [0.3, 0.25], [-0.22, 0.72], [0.36, 0.7], [0.12, 0.5], [-0.42, 0.55]]) { circle(ctx, w * fx, -h + h * fy, w * 0.045); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-w / 2, -h, w, h * 0.13);
  ctx.restore();
  // лента
  ctx.fillStyle = pal.rib;
  ctx.fillRect(-w * 0.08, -h, w * 0.16, h);
  ctx.strokeStyle = pal.ribD;
  ctx.lineWidth = w * 0.018;
  ctx.beginPath(); ctx.moveTo(-w * 0.08, -h); ctx.lineTo(-w * 0.08, 0); ctx.moveTo(w * 0.08, -h); ctx.lineTo(w * 0.08, 0); ctx.stroke();
  // крышка с бантом
  ctx.save();
  const hop = Math.sin(Math.PI * Math.min(1, open)) * 0.25;
  ctx.translate(open * w * 0.2, -h - (open * 0.36 + hop) * w);
  ctx.rotate(open * 0.45);
  rrect(ctx, -lw / 2, -lh, lw, lh, w * 0.06);
  fillStroke(ctx, pal.lid || (pal.box === 'rainbow' ? RB[0] : pal.box), pal.dark, w * 0.035);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-lw / 2 + w * 0.06, -lh + w * 0.03, lw - w * 0.12, lh * 0.22);
  ctx.fillStyle = pal.rib;
  ctx.fillRect(-w * 0.085, -lh, w * 0.17, lh);
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -lh);
    ctx.bezierCurveTo(d * w * 0.34, -lh - w * 0.36, d * w * 0.46, -lh - w * 0.02, 0, -lh);
    fillStroke(ctx, pal.rib, pal.ribD, w * 0.025);
    ctx.beginPath();
    ctx.moveTo(0, -lh);
    ctx.quadraticCurveTo(d * w * 0.12, -lh + w * 0.1, d * w * 0.2, -lh + w * 0.16);
    ctx.strokeStyle = pal.ribD; ctx.lineWidth = w * 0.045; ctx.stroke();
  }
  circle(ctx, 0, -lh - w * 0.02, w * 0.07);
  fillStroke(ctx, pal.rib, pal.ribD, w * 0.025);
  ctx.restore();
  // блеск
  const tw = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.globalAlpha = 0.5 + 0.5 * tw;
  sparkle(ctx, w * 0.36, -h * 0.75, w * 0.07);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function sparkle(ctx, x, y, r) {
  starPath(ctx, x, y, r, r * 0.32, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

// луна со звёздочками — «завтра»
function drawMoon(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#ffe066';
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  circle(ctx, x + r * 0.45, y - r * 0.3, r * 0.85);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#b28fff';
  starPath(ctx, x - r * 1.5, y + r * 0.6, r * 0.38, r * 0.15, 5);
  ctx.fill();
  starPath(ctx, x + r * 0.9, y + r * 1.0, r * 0.28, r * 0.11, 5);
  ctx.fill();
}

// ---------- узоры эксклюзивных раскрасок (координаты машины, ctx уже обрезан по кузову) ----------
const GSTARS = Array.from({ length: 46 }, (_, i) => {
  const f = (v) => v - Math.floor(v);
  const fy = f(Math.sin(i * 47.3) * 9631.1);
  return [-2.05 + f(Math.sin(i * 91.7) * 4375.5) * 4.1, i % 3 ? -0.5 + fy * 0.8 : -1.2 + fy * 0.8,
    0.03 + f(Math.sin(i * 13.1) * 777.7) * 0.045, i * 1.7, i % 5 === 0 ? '#ffe3a8' : i % 7 === 0 ? '#bfe8ff' : '#ffffff'];
});
function drawGalaxy(ctx, t) {
  ctx.save();
  // туманности
  ctx.fillStyle = 'rgba(255,110,210,0.42)';
  ellipse(ctx, -1.2, -0.1, 1.0, 0.3, -0.3); ctx.fill();
  ellipse(ctx, 0.2, -0.75, 0.6, 0.22, 0.2); ctx.fill();
  ctx.fillStyle = 'rgba(100,220,255,0.38)';
  ellipse(ctx, 0.9, -0.2, 0.95, 0.26, 0.35); ctx.fill();
  ellipse(ctx, -0.6, -0.95, 0.55, 0.18, -0.2); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,255,0.22)';
  ellipse(ctx, -0.1, 0.0, 1.6, 0.12, 0.12); ctx.fill();
  // звёзды мерцают
  for (const [x, y, r, ph, col] of GSTARS) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + ph);
    ctx.fillStyle = col;
    circle(ctx, x, y, r);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff6b0';
  for (const [x, y, r] of [[-1.5, -0.25, 0.16], [0.4, -0.9, 0.12], [1.45, -0.1, 0.14], [-0.6, 0.12, 0.1]]) { starPath(ctx, x, y, r, r * 0.3, 4); ctx.fill(); }
  // маленькая планета с кольцом
  circle(ctx, -0.45, -0.72, 0.13);
  fillStroke(ctx, '#ffb86b', null);
  ctx.strokeStyle = '#ffe3a8'; ctx.lineWidth = 0.035;
  ellipse(ctx, -0.45, -0.72, 0.25, 0.07, -0.3); ctx.stroke();
  ctx.restore();
}

const SPRINKLES = [[-1.6, -0.1, 0.4, '#ffe066'], [-0.9, 0.1, 1.2, '#74c6ff'], [-0.3, -0.25, 2.2, '#7fe39b'], [0.4, 0.05, 0.9, '#b28fff'],
  [1.1, -0.2, 2.6, '#ffe066'], [1.6, 0.1, 1.6, '#74c6ff'], [-0.6, -0.85, 0.3, '#7fe39b'], [0.3, -0.95, 1.9, '#ffb067'], [-0.2, -0.55, 2.8, '#b28fff']];
function drawCandy(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.rotate(-0.6);
  for (let x = -4; x < 4; x += 0.55) ctx.fillRect(x, -3, 0.22, 6);
  ctx.restore();
  ctx.save();
  for (const [x, y, a, col] of SPRINKLES) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = col;
    rrect(ctx, -0.09, -0.03, 0.18, 0.06, 0.03);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ---------- оформление ----------
function injectStyle() {
  const css = `
#btnDaily canvas { width: 86%; height: 86%; }
#btnDaily.daily-ready { animation: daily-wiggle 1.8s ease-in-out infinite; }
.daily-screen { gap: 4px; }
.daily-row { flex: 1; width: 100%; max-width: 1000px; display: grid; grid-template-columns: repeat(6, 1fr) 1.3fr;
  gap: 10px; align-items: center; align-content: center; padding: 14px 4px 10px; }
.daily-box { position: relative; background: #fff; border-radius: 22px; box-shadow: 0 5px 0 rgba(160, 60, 120, 0.22);
  padding: 10px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; border: 4px solid transparent;
  min-height: 64px; touch-action: manipulation; }
.daily-box > canvas { width: 100%; aspect-ratio: 20 / 17; }
.daily-box.d7 > canvas { aspect-ratio: 26 / 17; }
.daily-num { position: absolute; top: -12px; left: -8px; width: 32px; height: 32px; border-radius: 50%; background: var(--pink);
  color: #fff; border: 3px solid #fff; display: grid; place-items: center; font-weight: 900; font-size: 16px; font-style: normal;
  box-shadow: 0 2px 0 rgba(160, 60, 120, 0.3); }
.daily-box.done { background: #f6eefa; }
.daily-box.done .daily-num { background: #c9b8dc; }
.daily-box.later > canvas { opacity: 0.92; }
.daily-box.today { border-color: #ffd93b; z-index: 1; animation: daily-bob 1s ease-in-out infinite;
  box-shadow: 0 0 0 4px rgba(255, 217, 59, 0.35), 0 0 26px 8px rgba(255, 196, 70, 0.8), 0 5px 0 rgba(160, 60, 120, 0.22); }
.daily-box.next { border-color: #e2d4f5; }
.daily-box.daily-wiggle { animation: daily-nudge 0.4s; }
.daily-prize { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 2px; min-height: 30px;
  font-weight: 900; font-size: 15px; }
.daily-prize canvas { width: 28px; height: 28px; }
.daily-prize canvas.daily-car { width: 46px; height: 28px; }
.daily-prize .pill { font-size: 15px; padding: 2px 8px 2px 3px; box-shadow: none; background: #f1e9f5; gap: 3px; }
.daily-check { width: 30px; height: 30px; border-radius: 50%; background: var(--green); color: #fff; display: grid; place-items: center;
  font-weight: 900; font-size: 18px; }
.daily-rewards { position: absolute; inset: 0; z-index: 3; background: rgba(70, 20, 80, 0.5); display: flex; align-items: center;
  justify-content: center; }
.daily-rewards.hidden { display: none; }
.daily-rw-box { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; padding: 20px; }
.daily-burst { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 4; }
@keyframes daily-bob { 0%, 100% { transform: translateY(0) scale(1.04); } 50% { transform: translateY(-8px) scale(1.08); } }
@keyframes daily-nudge { 30% { transform: rotate(-5deg); } 60% { transform: rotate(4deg); } }
@keyframes daily-wiggle { 0%, 55%, 100% { transform: rotate(0); } 65% { transform: rotate(-9deg) scale(1.06); }
  75% { transform: rotate(8deg) scale(1.06); } 85% { transform: rotate(-4deg); } }
@media (orientation: portrait) {
  .daily-row { grid-template-columns: repeat(4, 1fr); gap: 22px 10px; max-width: 520px; }
  .daily-box.d7 { grid-column: span 2; }
}
@media (max-height: 420px) {
  .daily-row { gap: 8px; padding-top: 16px; }
  .daily-box { padding: 8px 3px 6px; }
}
`;
  const st = document.createElement('style');
  st.id = 'daily-style';
  st.textContent = css;
  document.head.appendChild(st);
}

// для проверки в браузере
export const _debug = { S, today, isReady, renderRow };
