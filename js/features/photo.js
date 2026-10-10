// Фото-режим: на паузе кнопка с фотоаппаратом. Щёлк — вспышка, и появляется «полароид»:
// снимок игры вокруг машины в розовой рамке с сердечками, звёздочками и датой,
// рядом — большая машина с Софьей и зверьком. Кнопка ⬇ сохраняет/делится картинкой
// (на телефоне откроется меню «Сохранить изображение»), ⬅ — назад на паузу.
import { Renderer } from '../render.js';
import { TAU, heartPath, starPath, circle, rrect, fillStroke } from '../draw-utils.js';
import { stickerSprite } from './stickers.js';

// размеры полароида (px)
const PHW = 960, PHH = 720, M = 60, BOT = 250;
const PW = PHW + 2 * M, PH = PHH + M + BOT;

const CSS = `
.tile canvas.photo-ico { width: 82%; height: 82%; pointer-events: none; }
.photo-scr {
  flex-direction: row; gap: 4vw;
  background:
    radial-gradient(circle at 20% 25%, rgba(255,255,255,0.8) 0 4px, transparent 5px) 0 0 / 54px 54px,
    radial-gradient(circle at 50% 45%, #fff6fb 0, #ffe0f0 55%, #ffc6e2 100%);
}
.photo-back { position: absolute; top: calc(var(--sat) + 10px); left: calc(var(--sal) + 12px); z-index: 2; }
.photo-pol {
  position: relative; flex: none; height: min(84vh, 620px, 50vw); aspect-ratio: ${PW} / ${PH};
  border-radius: 8px; box-shadow: 0 12px 26px rgba(120, 30, 80, 0.3);
  transform: rotate(-2.5deg); animation: photoIn 0.6s cubic-bezier(.2, 1.4, .5, 1) both;
}
.photo-pol canvas { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 8px; }
.photo-pol canvas.photo-top { pointer-events: none; }
.photo-dev {
  position: absolute; left: ${(M / PW) * 100}%; top: ${(M / PH) * 100}%; width: ${(PHW / PW) * 100}%; height: ${(PHH / PH) * 100}%;
  background: linear-gradient(135deg, #f4eef7, #e9e0ef); pointer-events: none;
  animation: photoDev 2.2s ease-in 0.35s both;
}
.photo-side { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.photo-car { width: min(34vw, 400px); height: min(46vh, 240px); touch-action: none; }
.photo-car.boing { animation: photoBoing 0.5s; }
.photo-share { width: 104px; height: 104px; }
.photo-share svg { width: 56%; height: 56%; }
.photo-share.done { background: radial-gradient(circle at 35% 30%, #a6f5b4, #3fc35a 60%, #2a9e45); }
.photo-flash { position: fixed; inset: 0; z-index: 80; background: #fff; pointer-events: none; animation: photoFlash 0.5s ease-out forwards; }
@keyframes photoFlash { from { opacity: 1; } to { opacity: 0; } }
@keyframes photoIn { from { transform: translateY(-40px) rotate(-14deg) scale(0.6); opacity: 0; } to { transform: rotate(-2.5deg); opacity: 1; } }
@keyframes photoDev { from { opacity: 1; } to { opacity: 0; } }
@keyframes photoBoing { 30% { transform: scale(1.08, 0.92); } 60% { transform: scale(0.96, 1.05); } }
@media (orientation: portrait) {
  .photo-scr { flex-direction: column; gap: 2.5vh; }
  .photo-pol { height: auto; width: min(86vw, 560px); }
  .photo-car { width: min(86vw, 440px); height: min(24vh, 230px); }
}
@media (max-height: 420px) { .photo-share { width: 90px; height: 90px; } }
`;

const SHARE_ICON = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6v22m-9-9 9 9 9-9" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 28v8a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6v-8" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let api = null;
let scr, pol, polCv, topCv, dev, carCv, shareBtn;
let isOpen = false, blob = null, file = null, full = null, fileName = 'sofya-car.png', boingT = 0;
const hearts = [];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
const pad = (n) => String(n).padStart(2, '0');

// ---------- иконка фотоаппарата ----------
function cameraIcon() {
  const c = el('canvas', 'photo-ico');
  c.width = c.height = 120;
  const x = c.getContext('2d');
  x.lineJoin = 'round';
  rrect(x, 40, 20, 34, 20, 7); fillStroke(x, '#ff8cc6', '#d9307a', 4);
  rrect(x, 12, 32, 96, 70, 20);
  const g = x.createLinearGradient(0, 32, 0, 102);
  g.addColorStop(0, '#ffa6d2'); g.addColorStop(1, '#ff4f9a');
  fillStroke(x, g, '#d9307a', 4);
  rrect(x, 84, 40, 14, 9, 4); fillStroke(x, '#fff38a', null);
  circle(x, 60, 68, 25); fillStroke(x, '#ffffff', '#d9307a', 4);
  circle(x, 60, 68, 17); fillStroke(x, '#6b3a8a', null);
  heartPath(x, 60, 71, 11); fillStroke(x, '#ff7ab5', null);
  x.fillStyle = 'rgba(255,255,255,0.85)';
  circle(x, 53, 61, 4); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.5)';
  rrect(x, 20, 40, 22, 8, 4); x.fill();
  return c;
}

// ---------- звук затвора ----------
function shutter() {
  const s = api.sound;
  s.noise(0.05, 0.45, 5000, 2200);
  s.tone(2400, 0.03, 'square', 0.04);
  s.noise(0.07, 0.35, 3200, 900, 0.09);
  s.tone(1600, 0.04, 'square', 0.035, 0.09);
  [1319, 1568, 2093].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.07, 0.32 + i * 0.07));
}

// ---------- снимок игры вокруг машины ----------
function capture() {
  const R = api.renderer, cv = R.cv, dpr = R.dpr || 1, car = api.world.car;
  const out = el('canvas');
  out.width = PHW; out.height = PHH;
  const x = out.getContext('2d');
  x.fillStyle = '#bfe7ff';
  x.fillRect(0, 0, PHW, PHH);
  const p = R.worldToScreen(car.x, car.y - 0.6);
  let cw = Math.min(cv.width, 11 * R.cam.s * dpr), ch = cw * (PHH / PHW);
  if (ch > cv.height) { ch = cv.height; cw = ch * (PHW / PHH); }
  const sx = Math.max(0, Math.min(cv.width - cw, p.x * dpr - cw / 2));
  const sy = Math.max(0, Math.min(cv.height - ch, p.y * dpr - ch * 0.55));
  try { x.drawImage(cv, sx, sy, cw, ch, 0, 0, PHW, PHH); } catch (e) { console.error(e); }
  return out;
}

// ---------- полароид ----------
// два слоя: снизу рамка со снимком (поверх неё «проявка»), сверху наклейки и скотч
function drawPolaroid(shot) {
  const c = polCv;
  let x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  // розовая рамка в горошек
  const g = x.createLinearGradient(0, 0, PW, PH);
  g.addColorStop(0, '#ffd3ea'); g.addColorStop(1, '#ffadd5');
  x.fillStyle = g;
  x.fillRect(0, 0, PW, PH);
  x.fillStyle = 'rgba(255,255,255,0.35)';
  for (let yy = 18; yy < PH; yy += 44) for (let xx = (yy / 44) % 2 ? 40 : 18; xx < PW; xx += 44) { circle(x, xx, yy, 5); x.fill(); }
  // снимок
  x.fillStyle = '#ffffff';
  x.fillRect(M - 10, M - 10, PHW + 20, PHH + 20);
  x.drawImage(shot, M, M);
  // сердечки и звёздочки на рамке
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cols = ['#ffffff', '#ff4f9a', '#ffd23b', '#a97bff', '#4fb3ff'];
  const spots = [];
  for (let i = 0; i < 9; i++) spots.push([rnd(20, PW - 20), rnd(8, M - 16)]);
  for (let i = 0; i < 6; i++) spots.push([rnd(6, M - 18), rnd(M, M + PHH)]);
  for (let i = 0; i < 6; i++) spots.push([rnd(PW - M + 18, PW - 6), rnd(M, M + PHH)]);
  for (let i = 0; i < 7; i++) spots.push([rnd(PW * 0.42, PW * 0.6), rnd(M + PHH + 30, PH - 20)]);
  spots.forEach(([sx, sy], i) => {
    x.fillStyle = cols[i % cols.length];
    const r = rnd(9, 17);
    if (i % 2) heartPath(x, sx, sy + r * 0.2, r); else starPath(x, sx, sy, r, r * 0.45);
    x.fill();
  });
  // дата (только цифры)
  const d = new Date();
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  x.save();
  x.translate(M + 20, M + PHH + BOT * 0.5);
  x.rotate(-0.04);
  x.font = '900 64px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  x.lineWidth = 14; x.strokeStyle = '#ffffff'; x.strokeText(date, 0, 0);
  x.fillStyle = '#d9307a'; x.fillText(date, 0, 0);
  x.restore();
  // машинка с Софьей и зверьком
  x.save();
  x.translate(PW - 400, M + PHH + 10);
  Renderer.drawPreview(x, 380, 236, api.save.look, { mood: 'happy', sofyaMood: 'happy', pose: 'wave' }, 0.6, 62);
  x.restore();
  x.strokeStyle = 'rgba(217,48,122,0.35)';
  x.lineWidth = 6;
  x.strokeRect(3, 3, PW - 6, PH - 6);
  // наклейки по уголкам и скотч
  x = topCv.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, PW, PH);
  const stick = (id, cx, cy, size, rot) => {
    const sp = stickerSprite(id);
    if (!sp) return;
    x.save(); x.translate(cx, cy); x.rotate(rot); x.drawImage(sp, -size / 2, -size / 2, size, size); x.restore();
  };
  stick('heart', M + PHW - 18, M + 22, 150, 0.3);
  stick('marissa', M + 36, M + PHH - 30, 160, -0.2);
  stick('star', M + 28, M + 20, 110, -0.25);
  x.save();
  x.translate(PW / 2, M - 4);
  x.rotate(-0.05);
  x.fillStyle = 'rgba(255,255,255,0.62)';
  x.fillRect(-150, -30, 300, 60);
  x.fillStyle = 'rgba(255,111,174,0.45)';
  for (let i = -150; i < 150; i += 30) { x.beginPath(); x.moveTo(i, -30); x.lineTo(i + 15, -30); x.lineTo(i + 3, 30); x.lineTo(i - 12, 30); x.closePath(); x.fill(); }
  x.restore();
}

function prepareFile() {
  blob = null; file = null;
  const d = new Date();
  fileName = `sofya-car-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`;
  const all = el('canvas');
  all.width = PW; all.height = PH;
  const x = all.getContext('2d');
  x.drawImage(polCv, 0, 0);
  x.drawImage(topCv, 0, 0);
  full = all;
  try {
    all.toBlob((b) => {
      if (!b) return;
      blob = b;
      try { file = new File([b], fileName, { type: 'image/png' }); } catch (_) { file = null; }
    }, 'image/png');
  } catch (e) { console.error(e); }
}

// ---------- сохранить / поделиться ----------
function download() {
  const a = document.createElement('a');
  let url;
  if (blob) url = URL.createObjectURL(blob);
  else url = (full || polCv).toDataURL('image/png');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (blob) setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function happy() {
  api.sound.buy();
  shareBtn.classList.add('done');
  setTimeout(() => shareBtn.classList.remove('done'), 1400);
  boingT = performance.now();
  for (let i = 0; i < 10; i++) spawnHeart(true);
}
function share() {
  api.sound.unlock();
  api.sound.click();
  const canFiles = file && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }));
  if (canFiles) {
    navigator.share({ files: [file] })
      .then(() => happy())
      .catch((e) => { if (e && e.name !== 'AbortError') { download(); happy(); } });
    return;
  }
  download();
  happy();
}

// ---------- машина рядом с фото ----------
function spawnHeart(burst) {
  const w = carCv.clientWidth || 300, h = carCv.clientHeight || 200;
  hearts.push({
    x: w * (0.2 + Math.random() * 0.6), y: burst ? h * 0.5 : h * (0.75 + Math.random() * 0.2),
    vx: (Math.random() - 0.5) * (burst ? 160 : 20), vy: -(burst ? 120 + Math.random() * 120 : 30 + Math.random() * 30),
    s: 7 + Math.random() * 8, life: burst ? 1.4 : 2.4, max: burst ? 1.4 : 2.4,
    col: ['#ff4f9a', '#ff8cc6', '#ffd23b', '#a97bff'][hearts.length % 4],
  });
}
let heartT = 0;
function drawCarSide(dt) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = carCv.clientWidth, h = carCv.clientHeight;
  if (!w || !h) return;
  if (carCv.width !== Math.round(w * dpr) || carCv.height !== Math.round(h * dpr)) { carCv.width = Math.round(w * dpr); carCv.height = Math.round(h * dpr); }
  const x = carCv.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);
  const now = performance.now(), t = now / 1000;
  heartT += dt;
  if (heartT > 0.5 && hearts.length < 12) { heartT = 0; spawnHeart(false); }
  let j = 0;
  for (const p of hearts) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt;
    x.globalAlpha = Math.min(1, p.life / 0.6);
    x.fillStyle = p.col;
    heartPath(x, p.x, p.y, p.s); x.fill();
    hearts[j++] = p;
  }
  hearts.length = j;
  x.globalAlpha = 1;
  const k = (now - boingT) / 500;
  const jump = k < 1 ? Math.sin(k * Math.PI) * 14 : 0;
  x.save();
  x.translate(0, -jump);
  const sc = Math.min(w / 5.4, (h - 16) / 3.9);
  Renderer.drawPreview(x, w, h, api.save.look, { mood: 'happy', sofyaMood: 'happy', pose: 'wave' }, t, sc);
  x.restore();
}

// ---------- экран ----------
function build() {
  scr = el('div', 'screen photo-scr hidden');
  const back = el('button', 'round photo-back', '⬅');
  back.setAttribute('aria-label', 'Назад');
  pol = el('div', 'photo-pol');
  polCv = el('canvas');
  polCv.width = PW; polCv.height = PH;
  topCv = el('canvas', 'photo-top');
  topCv.width = PW; topCv.height = PH;
  dev = el('div', 'photo-dev');
  pol.append(polCv, dev, topCv);
  const side = el('div', 'photo-side');
  carCv = el('canvas', 'photo-car');
  shareBtn = el('button', 'play photo-share', SHARE_ICON);
  shareBtn.setAttribute('aria-label', 'Сохранить фото');
  side.append(carCv, shareBtn);
  scr.append(back, pol, side);

  back.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); api.closeScreen(); });
  // поделиться можно только из «настоящего» нажатия (click), иначе телефон не покажет меню
  shareBtn.addEventListener('click', (e) => { e.preventDefault(); share(); });
  carCv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    api.sound.unlock();
    boingT = performance.now();
    carCv.classList.remove('boing'); void carCv.offsetWidth; carCv.classList.add('boing');
    if (api.save.look.animal === 'marissa') api.sound.meow(1.1); else api.sound.pop();
    for (let i = 0; i < 6; i++) spawnHeart(true);
  });
}

function openPhoto(shot) {
  isOpen = true;
  drawPolaroid(shot || capture());
  prepareFile();
  // проявка: рамка «падает», снимок проявляется
  for (const e of [pol, dev]) { e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; }
  hearts.length = 0;
  boingT = performance.now() + 300;
  setTimeout(() => { if (isOpen && api.save.look.animal === 'marissa') api.sound.meow(1.2); }, 700);
}

function snap() {
  if (api.overlay) return;
  const shot = capture();
  shutter();
  const f = el('div', 'photo-flash');
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 600);
  setTimeout(() => api.openScreen('photo', shot), 160);
}

export function init(a) {
  api = a;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  build();
  api.registerScreen('photo', {
    el: scr,
    open: (_, shot) => openPhoto(shot),
    close: () => { isOpen = false; },
  });
  const btn = api.addPauseButton({ id: 'pausePhoto', html: '', label: 'Фото', order: 50, sound: false, onTap: snap });
  btn.appendChild(cameraIcon());
  api.on('app:frame', (dt) => { if (isOpen) drawCarSide(dt); });
}
