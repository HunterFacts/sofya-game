// Главный файл: экраны, управление, игровой цикл.
import { UPGRADES, upgradePrice, MAX_UP } from './config.js';
import { levelStart } from './terrain.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';
import { load, store } from './save.js';
import { Garage, ChestOpener, renderLevels, showToast, boosterIcon, chestIcon } from './ui.js';
import { drawAnimal } from './art.js';
import { wrapAngle } from './rng.js';

const $ = (id) => document.getElementById(id);
const save = load();
const sound = new Sound();
sound.soundOn = save.sound;
sound.musicOn = save.music;
const world = new World();
const renderer = new Renderer($('game'));
const persist = (now = false) => store(save, now);

let state = 'menu';       // menu | play | pause | crash
let overlay = null;       // garage | levels | chest (поверх state)
let worldReady = false;
let runCoins = 0;
let lastRunSave = 0;

// ---------- старт мира в меню ----------
function placeWorld() {
  const run = save.run;
  if (run && run.L === save.level) world.start(run.L, run.x, run.taken);
  else world.start(save.level);
  worldReady = true;
  runCoins = 0;
  renderer.follow(world, 0, true);
}
placeWorld();

// ---------- управление ----------
const input = { gas: false, brake: false };
const keys = { gas: false, brake: false };
const pointers = new Map();
const touch = $('touch');
const side = (x) => (x < window.innerWidth / 2 ? 'brake' : 'gas');

function updateInput() {
  const vals = [...pointers.values()];
  input.gas = keys.gas || vals.includes('gas');
  input.brake = keys.brake || vals.includes('brake');
  $('pedalGas').classList.toggle('on', input.gas);
  if (input.gas && !save.seen.gas) { save.seen.gas = 1; persist(); show('gasHint', false); }
  $('pedalBrake').classList.toggle('on', input.brake);
}
function clearInput() { pointers.clear(); keys.gas = keys.brake = false; updateInput(); }

touch.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sound.unlock();
  pointers.set(e.pointerId, side(e.clientX));
  try { touch.setPointerCapture(e.pointerId); } catch (_) { /* */ }
  updateInput();
});
touch.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, side(e.clientX));
  updateInput();
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  touch.addEventListener(ev, (e) => { pointers.delete(e.pointerId); updateInput(); });
}
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

const KEYMAP = { ArrowRight: 'gas', KeyD: 'gas', ArrowUp: 'gas', ArrowLeft: 'brake', KeyA: 'brake', ArrowDown: 'brake' };
window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; updateInput(); e.preventDefault(); }
  if (state === 'play' && !overlay) {
    if (e.code === 'Digit1') useBooster('turbo');
    if (e.code === 'Digit2') useBooster('magnet');
    if (e.code === 'Digit3') useBooster('shield');
  }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') pause(); else if (state === 'pause' && !overlay) resume(); }
  if (e.code === 'Enter' || e.code === 'Space') {
    if (state === 'menu' && !overlay) play();
    else if (state === 'pause' && !overlay) resume();
    else if (state === 'crash' && !overlay) retry();
  }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = false; updateInput(); } });

// кнопки: срабатывают на нажатие (без задержки)
function onTap(id, fn) {
  const b = typeof id === 'string' ? $(id) : id;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); sound.unlock(); fn(e); });
}

// ---------- полный экран ----------
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => navigator.standalone || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
function canFullscreen() { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen); }
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function goFullscreen() {
  if (isFullscreen() || standalone()) return;
  const d = document.documentElement;
  const fn = d.requestFullscreen || d.webkitRequestFullscreen;
  if (!fn) return;
  try {
    const p = fn.call(d, { navigationUI: 'hide' });
    if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
  } catch (_) { /* */ }
}

// экран не гаснет во время игры
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (_) { wakeLock = null; }
}

// ---------- экраны ----------
function show(id, on) { $(id).classList.toggle('hidden', !on); }

function setState(s) {
  state = s;
  renderer.menu = s === 'menu';
  show('menu', s === 'menu');
  show('hud', s === 'play' || s === 'pause' || s === 'crash');
  show('touch', s === 'play');
  show('pause', s === 'pause');
  show('crash', s === 'crash');
  if (s === 'play') show('iosHint', false);
  show('gasHint', s === 'play' && !save.seen.gas);
  if (s !== 'play') clearInput();
  keepAwake(s === 'play');
  refresh();
}

function play() {
  sound.unlock();
  if (coarse) goFullscreen();
  if (!worldReady || world.crashed || world.L !== save.level) placeWorld();
  setState('play');
}
function pause() { if (state !== 'play') return; saveRun(); sound.click(); setState('pause'); }
function resume() { setState('play'); }
function retry() {
  save.run = null;
  world.start(save.level);
  runCoins = 0;
  renderer.follow(world, 0, true);
  setState('play');
}
function home() { saveRun(); persist(true); setState('menu'); }
function startLevel(L) {
  save.level = L;
  save.run = null;
  persist();
  closeOverlay(false);
  world.start(L);
  worldReady = true;
  runCoins = 0;
  renderer.follow(world, 0, true);
  if (coarse) goFullscreen();
  setState('play');
}

function saveRun() {
  const car = world.car;
  if (world.crashed || !car.grounded || Math.abs(wrapAngle(car.a)) > 0.8) return;
  save.run = { L: world.L, x: Math.round(car.x * 10) / 10, taken: world.takenIds };
  save.level = world.L;
  persist();
}

// ---------- оверлеи: гараж, уровни, сундуки ----------
const garage = new Garage({ save, sound, store: persist, onChange: refresh });
const chests = new ChestOpener({ save, sound, store: persist, onChange: refresh, onClose: () => closeOverlay() });

function openOverlay(name) {
  overlay = name;
  clearInput();
  if (state === 'play') setState('pause');
  if (name === 'garage') { save.fresh = false; show('garage', true); garage.open(); }
  if (name === 'levels') { show('levels', true); renderLevels(save, startLevel); }
  if (name === 'chest') { if (!chests.open()) overlay = null; }
  refresh();
}
function closeOverlay(click = true) {
  if (click) sound.click();
  if (overlay === 'garage') { garage.close(); show('garage', false); persist(); }
  if (overlay === 'levels') show('levels', false);
  overlay = null;
  refresh();
}

// ---------- кнопки ----------
onTap('btnPlay', play);
onTap('btnLevels', () => { sound.click(); openOverlay('levels'); });
onTap('btnGarage', () => { sound.click(); openOverlay('garage'); });
onTap('btnChests', () => { sound.click(); openOverlay('chest'); });
onTap('btnPause', pause);
onTap('hudChest', () => { sound.click(); openOverlay('chest'); });
onTap('pauseResume', resume);
onTap('pauseRestart', () => { sound.click(); retry(); });
onTap('pauseHome', () => { sound.click(); home(); });
onTap('pauseGarage', () => { sound.click(); openOverlay('garage'); });
onTap('pauseChests', () => { sound.click(); openOverlay('chest'); });
onTap('crashRetry', retry);
onTap('crashHome', () => { sound.click(); home(); });
onTap('crashGarage', () => { sound.click(); openOverlay('garage'); });
onTap('crashChests', () => { sound.click(); openOverlay('chest'); });
onTap('garageBack', () => closeOverlay());
onTap('levelsBack', () => closeOverlay());
onTap('iosOk', () => { sound.click(); show('iosHint', false); });
onTap('btnFull', () => {
  sound.click();
  if (canFullscreen()) goFullscreen();
  else if (isIOS) show('iosHint', true);
});
const toggleMusic = () => { save.music = !save.music; sound.setMusic(save.music); persist(); refresh(); };
const toggleSound = () => { save.sound = !save.sound; sound.setSound(save.sound); persist(); refresh(); };
onTap('btnMusic', toggleMusic);
onTap('pauseMusic', toggleMusic);
onTap('btnSound', toggleSound);
onTap('pauseSound', toggleSound);

// ускорялки
const boostBtns = {};
for (const b of document.querySelectorAll('.boost')) {
  const k = b.dataset.k;
  boostBtns[k] = { el: b, count: b.querySelector('b'), ring: b.querySelector('.ring'), last: -1, lastP: -1 };
  boosterIcon(b.querySelector('canvas'), k);
  onTap(b, () => useBooster(k));
}
function useBooster(k) {
  if (state !== 'play' || world.crashed) return;
  const active = world[k] > 0;
  if (save.inv[k] <= 0 || active) {
    sound.deny();
    const e = boostBtns[k].el;
    e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake');
    return;
  }
  save.inv[k]--;
  world.activate(k, world.U);
  persist();
}

// иконки сундуков на кнопках
for (const cv of document.querySelectorAll('.chest-btn canvas')) chestIcon(cv, 'gold');

// ---------- обновление интерфейса ----------
function canUpgrade() {
  return UPGRADES.some((u) => save.up[u.id] < MAX_UP && save.coins >= upgradePrice(u, save.up[u.id]));
}
function refresh() {
  for (const e of document.querySelectorAll('.coinsText')) e.textContent = save.coins;
  $('playLevel').textContent = save.level + 1;
  const n = save.chests.length ? String(save.chests.length) : '';
  for (const e of document.querySelectorAll('.chest-btn .badge')) e.textContent = n;
  for (const id of ['btnChests', 'pauseChests', 'crashChests']) $(id).classList.toggle('hidden', !save.chests.length);
  $('hudChest').classList.toggle('hidden', !save.chests.length);
  $('crashGarage').querySelector('.dot-new').classList.toggle('hidden', !(canUpgrade() || save.fresh));
  for (const id of ['btnMusic', 'pauseMusic']) $(id).classList.toggle('off', !save.music);
  for (const id of ['btnSound', 'pauseSound']) { $(id).classList.toggle('off', !save.sound); $(id).textContent = save.sound ? '🔊' : '🔇'; }
  for (const e of document.querySelectorAll('.screen:not(.hidden) .coinsText')) e.textContent = save.coins;
}

let hudCache = {};
function updateHud() {
  const set = (k, v, fn) => { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } };
  set('coins', save.coins, (v) => ($('hudCoins').textContent = v));
  set('level', world.L, (v) => ($('hudLevel').textContent = v + 1));
  const p = Math.round(world.progress * 1000) / 10;
  set('prog', p, (v) => { $('hudFill').style.width = v + '%'; $('hudDot').style.left = v + '%'; });
  const U = world.U;
  for (const k of ['turbo', 'magnet', 'shield']) {
    const b = boostBtns[k];
    const cnt = save.inv[k];
    if (b.last !== cnt) { b.last = cnt; b.count.textContent = cnt; b.el.classList.toggle('empty', cnt <= 0); }
    const total = k === 'turbo' ? U.turboTime : k === 'magnet' ? U.magnetTime : U.shieldTime;
    const pr = world[k] > 0 ? Math.round((world[k] / total) * 100) / 100 : 0;
    if (b.lastP !== pr) { b.lastP = pr; b.ring.style.setProperty('--p', pr); b.el.classList.toggle('active', pr > 0); }
  }
}

// ---------- события мира ----------
function handleEvents() {
  for (const e of world.events) {
    switch (e.type) {
      case 'coin':
        save.coins += e.v;
        runCoins += e.v;
        if (e.big) sound.bigCoin(); else sound.coin(e.combo);
        persist();
        break;
      case 'boost': sound.boost(e.kind); break;
      case 'chest':
        save.chests.push(e.tier);
        sound.pickup();
        persist();
        refresh();
        break;
      case 'shieldSave': sound.pop(); break;
      case 'crash':
        sound.crash();
        setTimeout(() => sound.meow(0.8), 500);
        save.run = null;
        persist(true);
        break;
      case 'crashDone':
        if (state === 'play') {
          $('crashCoins').textContent = '+' + runCoins;
          setState('crash');
        }
        break;
      case 'level': {
        const L = e.L;
        save.stars[L] = Math.max(save.stars[L] || 0, e.stars);
        save.level = L + 1;
        save.maxLevel = Math.max(save.maxLevel, L + 1);
        const bonus = 20 + 5 * L;
        save.coins += bonus;
        save.chests.push(e.chest);
        save.run = { L: L + 1, x: levelStart(L + 1) + 3, taken: [] };
        persist(true);
        sound.level();
        showToast(L, e.stars, e.chest, bonus, sound);
        refresh();
        break;
      }
    }
  }
  world.events.length = 0;
}

// ---------- цикл ----------
let last = performance.now();
let t = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  const active = state === 'play' || state === 'crash';
  if (active && !overlay) {
    world.update(dt, input, save.up);
    handleEvents();
    renderer.follow(world, dt);
    updateHud();
    if (state === 'play' && now - lastRunSave > 2000) { lastRunSave = now; saveRun(); }
  } else if (state === 'menu') {
    renderer.follow(world, dt);
  }
  sound.engine(state === 'play' && !overlay && !world.crashed, input.gas ? 1 : 0, world.car.speed);
  if (overlay !== 'garage' && overlay !== 'levels') renderer.draw(world, save.look, t);
  if (state === 'crash' && !overlay) drawCrashFace();
  requestAnimationFrame(frame);
}

function drawCrashFace() {
  const cv = $('crashFace'), ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(150, 150, 146, 0, Math.PI * 2); ctx.fill();
  ctx.clip();
  ctx.translate(150, 158);
  ctx.scale(88, 88);
  drawAnimal(ctx, save.look.animal, 'dizzy', t, save.look.hat);
}

// ---------- системное ----------
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('orientationchange', () => setTimeout(() => renderer.resize(), 200));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state === 'play') pause();
    saveRun();
    persist(true);
    sound.stopMusic();
    if (sound.ctx) sound.ctx.suspend().catch(() => {});
  } else if (sound.ctx) {
    sound.ctx.resume().catch(() => {});
    if (save.music) sound.startMusic();
  }
});
window.addEventListener('pagehide', () => { saveRun(); persist(true); });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// для проверки в браузере
window.__game = { world, save, renderer, setState, play, input, get state() { return state; }, openOverlay, closeOverlay };

setState('menu');
if (isIOS && !standalone() && !save.seen.ios) { save.seen.ios = 1; persist(); show('iosHint', true); }
requestAnimationFrame(frame);
