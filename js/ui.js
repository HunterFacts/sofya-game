// Экраны: гараж-магазин, сундуки, карта уровней, «уровень пройден».
import { UPGRADES, MAX_UP, upgradePrice, BOOSTERS, PAINTS, ANIMALS, HATS, CHESTS, BIOMES } from './config.js';
import { drawChest, drawBoosterIcon, drawAnimal, drawWheel } from './art.js';
import { Renderer } from './render.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
const coinPill = (n, cls = 'pill price') => `<div class="${cls}"><i class="coin small"></i>${n}</div>`;

function prepCanvas(cv, w, h) {
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

// ---------- Иконки ----------
const BUBBLE = { turbo: ['#8a5cff', '#5d33d6'], magnet: ['#ff6b6b', '#d43f4f'], shield: ['#4fc3ff', '#1f8fd6'] };
export function boosterIcon(cv, kind) {
  const w = cv.width, h = cv.height, ctx = prepCanvas(cv, w, h);
  const r = Math.min(w, h) * 0.46;
  ctx.translate(w / 2, h / 2);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, BUBBLE[kind][0]); g.addColorStop(1, BUBBLE[kind][1]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  drawBoosterIcon(ctx, kind, r * 0.68);
}

export function chestIcon(cv, tier, t = 0) {
  const w = cv.width, h = cv.height, ctx = prepCanvas(cv, w, h);
  drawChest(ctx, w / 2, h * 0.86, w * 0.8, tier, 0, t);
}

function upgradeIcon(cv, id, look) {
  const w = cv.width, h = cv.height, ctx = prepCanvas(cv, w, h);
  const r = h * 0.4;
  ctx.translate(w / 2, h / 2);
  ctx.lineCap = 'round';
  if (id === 'engine') {
    const cols = ['#7ee08f', '#ffd93b', '#ff8a5c', '#ff4f9a'];
    ctx.lineWidth = r * 0.28;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = cols[i];
      ctx.beginPath(); ctx.arc(0, r * 0.25, r, Math.PI + (i * Math.PI) / 4 + 0.04, Math.PI + ((i + 1) * Math.PI) / 4 - 0.04); ctx.stroke();
    }
    ctx.strokeStyle = '#6b3a8a'; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(0, r * 0.25); ctx.lineTo(r * 0.62, -r * 0.35); ctx.stroke();
    ctx.fillStyle = '#6b3a8a'; ctx.beginPath(); ctx.arc(0, r * 0.25, r * 0.16, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'grip') {
    ctx.scale(r * 1.6, r * 1.6);
    drawWheel(ctx, 0, 0, 0.3, '#ff6fae');
  } else if (id === 'balance') {
    ctx.save();
    ctx.rotate(-0.4);
    Renderer.drawPreview(ctx, 0, 0, look, 'happy', 0, r * 0.38);
    ctx.restore();
    ctx.strokeStyle = '#ff4f9a'; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.05, -2.6, -0.9); ctx.stroke();
    ctx.fillStyle = '#ff4f9a';
    ctx.beginPath(); ctx.moveTo(r * 0.75, -r * 0.95); ctx.lineTo(r * 0.75, -r * 0.5); ctx.lineTo(r * 0.38, -r * 0.82); ctx.fill();
  } else {
    ctx.translate(-w / 2, -h / 2);
    boosterIcon(cv, id);
  }
}

// ---------- Реестры для новых возможностей ----------
// Вкладка гаража: { id, icon, order, render(box, G) } — G см. Garage.helpers()
const extraTabs = [];
export function registerGarageTab(tab) {
  const i = extraTabs.findIndex((t) => t.id === tab.id);
  if (i >= 0) extraTabs[i] = tab; else extraTabs.push(tab);
  extraTabs.sort((a, b) => (a.order || 0) - (b.order || 0));
}

// Коллекционная вещь (может выпасть из сундука):
// { type, w (вес в сундуке), rare? (вероятность вообще попасть в розыгрыш, 0..1),
//   items: [{id, price, name?, chest?: false}], owned(save) → массив id, preview(ctx, w, h, id, save, t) }
const cosmetics = [];
export function registerCosmetic(def) {
  const i = cosmetics.findIndex((c) => c.type === def.type);
  if (i >= 0) cosmetics[i] = def; else cosmetics.push(def);
}
export const cosmeticOf = (type) => cosmetics.find((c) => c.type === type);

const zooPreview = (kind) => (ctx, w, h, id, save, t = 1) => {
  ctx.save();
  ctx.translate(w / 2, h * 0.55);
  const k = Math.min(w, h) / 3.1;
  ctx.scale(k, k);
  drawAnimal(ctx, kind === 'animal' ? id : save.look.animal, 'happy', t, kind === 'hat' ? id : save.look.hat);
  ctx.restore();
};
// Зверят покупают за монеты: из сундука они выпадают очень редко (0,5% на сундук)
registerCosmetic({ type: 'animal', w: 3, rare: 0.005, items: ANIMALS, owned: (s) => s.owned.animal, preview: zooPreview('animal') });
registerCosmetic({ type: 'hat', w: 2, items: HATS, owned: (s) => s.owned.hat, preview: zooPreview('hat') });
registerCosmetic({
  type: 'paint', w: 2, items: PAINTS, owned: (s) => s.owned.paint,
  preview: (ctx, w, h, id, save, t = 0.5) => Renderer.drawPreview(ctx, w, h, { ...save.look, paint: id }, 'happy', t),
});

const BUILTIN_TABS = [
  { id: 'up', icon: '🔧' },
  { id: 'boost', icon: '⚡' },
  { id: 'paint', icon: '🎨' },
  { id: 'animal', icon: '🐾' },
  { id: 'hat', icon: '👑' },
];

// ---------- Гараж ----------
export class Garage {
  constructor(ctx) {
    this.c = ctx; // { save, sound, store, onChange }
    this.tab = 'up';
    $('tabs').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.tab = b.dataset.tab;
      for (const x of $('tabs').children) x.classList.toggle('on', x === b);
      this.c.sound.click();
      this.render();
    });
    this.preview = $('garagePreview');
  }

  buildTabs() {
    const tabs = [...BUILTIN_TABS, ...extraTabs];
    if (!tabs.some((t) => t.id === this.tab)) this.tab = 'up';
    $('tabs').innerHTML = tabs.map((t) => `<button data-tab="${t.id}" class="${t.id === this.tab ? 'on' : ''}">${t.icon}</button>`).join('');
  }

  open(tab) { if (tab) this.tab = tab; this.buildTabs(); this.render(); this.anim = true; this.loop(); }
  close() { this.anim = false; }

  loop() {
    if (!this.anim) return;
    const cv = this.preview, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const t = performance.now() / 1000;
    Renderer.drawPreview(ctx, w, h, this.c.save.look, this.mood || 'normal', t);
    requestAnimationFrame(() => this.loop());
  }

  cheer() {
    this.mood = 'happy';
    clearTimeout(this.moodT);
    this.moodT = setTimeout(() => (this.mood = 'normal'), 1200);
  }

  pay(price, card) {
    const s = this.c.save;
    if (s.coins < price) {
      this.c.sound.deny();
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      return false;
    }
    s.coins -= price;
    this.c.sound.buy();
    this.cheer();
    return true;
  }

  // Помощник для вкладок новых возможностей
  helpers() {
    const G = {
      save: this.c.save, sound: this.c.sound, el, coinPill, Renderer, drawAnimal,
      pay: (price, card) => this.pay(price, card),
      done: () => this.done(),
      cheer: () => this.cheer(),
      // карточка с картинкой 260×195
      card(cls = '') {
        const card = el('button', `card ${cls}`);
        const cv = el('canvas'); cv.width = 260; cv.height = 195;
        card.appendChild(cv);
        $('cards').appendChild(card);
        return { card, cv, ctx: cv.getContext('2d') };
      },
      // готовая вкладка коллекции: купить → выбрать
      // opt = { items, isOwned(id), own(id), isSelected(id), select(id), preview(ctx, w, h, item) }
      collection: (opt) => this.collection(opt),
    };
    return G;
  }

  collection(opt) {
    const s = this.c.save;
    for (const it of opt.items) {
      const owned = opt.isOwned(it.id), sel = opt.isSelected(it.id);
      const card = el('button', `card ${owned ? 'owned' : s.coins >= it.price ? 'can' : 'cant'} ${sel ? 'sel' : ''}`);
      const cv = el('canvas'); cv.width = 260; cv.height = 195;
      card.appendChild(cv);
      $('cards').appendChild(card);
      opt.preview(cv.getContext('2d'), 260, 195, it);
      if (it.name) card.insertAdjacentHTML('beforeend', `<div class="name">${it.name}</div>`);
      card.insertAdjacentHTML('beforeend', owned ? `<div class="check">${sel ? '✓' : ''}</div>` : coinPill(it.price));
      card.onclick = () => {
        if (!owned) {
          if (!this.pay(it.price, card)) return;
          opt.own(it.id);
        } else this.c.sound.click();
        opt.select(it.id);
        this.cheer();
        if (opt.onSelect) opt.onSelect(it.id);
        this.done();
      };
    }
  }

  render() {
    const s = this.c.save, box = $('cards');
    box.innerHTML = '';
    box.scrollTop = 0;
    const add = (card) => { box.appendChild(card); return card; };
    const look = s.look;

    const extra = extraTabs.find((t) => t.id === this.tab);
    if (extra) { extra.render(box, this.helpers()); return; }

    if (this.tab === 'up') {
      for (const u of UPGRADES) {
        const lvl = s.up[u.id], max = lvl >= MAX_UP, price = upgradePrice(u, lvl);
        const card = add(el('button', `card ${max ? 'max' : s.coins >= price ? 'can' : 'cant'}`));
        const cv = el('canvas'); cv.width = 260; cv.height = 195;
        card.appendChild(cv);
        upgradeIcon(cv, u.id, look);
        card.insertAdjacentHTML('beforeend', `<div class="pips">${Array.from({ length: MAX_UP }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>`);
        card.insertAdjacentHTML('beforeend', max ? '<div class="check">★</div>' : coinPill(price));
        card.onclick = () => {
          if (max || !this.pay(price, card)) return;
          s.up[u.id]++;
          this.done();
        };
      }
    } else if (this.tab === 'boost') {
      for (const b of BOOSTERS) {
        const card = add(el('button', `card ${s.coins >= b.price ? 'can' : 'cant'}`));
        const cv = el('canvas'); cv.width = 260; cv.height = 195;
        card.appendChild(cv);
        boosterIcon(cv, b.id);
        card.insertAdjacentHTML('beforeend', `<div class="pill count">×${s.inv[b.id]}</div>`);
        card.insertAdjacentHTML('beforeend', coinPill(b.price));
        card.onclick = () => {
          if (!this.pay(b.price, card)) return;
          s.inv[b.id]++;
          this.done();
        };
      }
    } else {
      const kind = this.tab;
      const def = cosmeticOf(kind);
      this.collection({
        items: def.items,
        isOwned: (id) => def.owned(s).includes(id),
        own: (id) => def.owned(s).push(id),
        isSelected: (id) => look[kind] === id,
        select: (id) => { look[kind] = id; },
        onSelect: (id) => { if (kind === 'animal' && id === 'marissa') this.c.sound.meow(); },
        preview: (ctx, w, h, it) => def.preview(ctx, w, h, it.id, s),
      });
    }
  }

  done() {
    this.c.store();
    this.c.onChange();
    const top = $('cards').scrollTop;
    this.render();
    $('cards').scrollTop = top;
  }
}

// ---------- Сундуки ----------
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export function rollChest(tier, save) {
  const cfg = CHESTS[tier] || CHESTS.wood;
  const out = [];
  const coins = rnd(cfg.coins[0], cfg.coins[1]);
  save.coins += coins;
  out.push({ type: 'coins', n: coins });
  const got = {};
  for (let i = 0; i < cfg.boosters; i++) {
    const b = BOOSTERS[rnd(0, BOOSTERS.length - 1)].id;
    save.inv[b]++;
    got[b] = (got[b] || 0) + 1;
  }
  for (const [id, n] of Object.entries(got)) out.push({ type: 'booster', id, n });
  if (Math.random() < cfg.cosmetic) {
    const pool = [];
    for (const def of cosmetics) {
      if (def.rare !== undefined && Math.random() >= def.rare) continue;
      const own = def.owned(save);
      for (const it of def.items) if (!own.includes(it.id) && it.chest !== false) pool.push({ type: def.type, id: it.id, w: it.w || def.w || 2 });
    }
    if (pool.length) {
      let r = Math.random() * pool.reduce((n, p) => n + p.w, 0);
      const pick = pool.find((p) => (r -= p.w) < 0) || pool[0];
      cosmeticOf(pick.type).owned(save).push(pick.id);
      save.fresh = true;
      out.push(pick);
    } else {
      save.coins += 100;
      out[0].n += 100;
    }
  }
  return out;
}

export class ChestOpener {
  constructor(ctx) {
    this.c = ctx; // { save, sound, store, onChange, onClose }
    this.cv = $('chestCanvas');
    $('chest').addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap(); });
  }

  open() {
    if (!this.c.save.chests.length) return false;
    $('chest').classList.remove('hidden');
    this.next();
    this.running = true;
    this.loop();
    return true;
  }

  next() {
    this.tier = this.c.save.chests[0];
    this.taps = 0;
    this.openT = -1;
    this.shake = 0;
    this.rewards = null;
    $('chestRewards').innerHTML = '';
    $('chestHint').classList.remove('hidden');
  }

  tap() {
    const s = this.c.save;
    if (this.rewards) {
      if (performance.now() - this.shownAt < 600) return;
      if (s.chests.length) { this.next(); this.c.sound.click(); }
      else this.close();
      return;
    }
    if (this.openT >= 0) return;
    this.taps++;
    this.shake = 1;
    this.c.sound.chestTap(this.taps);
    if (this.taps >= 3) {
      this.openT = 0;
      this.c.sound.chestOpen();
      s.chests.shift();
      const rewards = rollChest(this.tier, s);
      this.c.store(true);
      this.c.onChange();
      setTimeout(() => this.showRewards(rewards), 450);
    }
  }

  showRewards(list) {
    this.rewards = list;
    this.shownAt = performance.now();
    const box = $('chestRewards');
    box.innerHTML = '';
    list.forEach((r, i) => {
      const card = el('div', `reward ${r.type !== 'coins' && r.type !== 'booster' ? 'special' : ''}`);
      card.style.animationDelay = `${i * 0.18}s`;
      const cv = el('canvas'); cv.width = 192; cv.height = 144;
      const ctx = cv.getContext('2d');
      if (r.type === 'coins') {
        card.innerHTML = `<div class="big-emoji"><i class="coin" style="width:58px;height:58px;border-width:5px"></i></div>+${r.n}`;
      } else if (r.type === 'booster') {
        boosterIcon(cv, r.id);
        card.appendChild(cv);
        card.insertAdjacentHTML('beforeend', `+${r.n}`);
      } else {
        const def = cosmeticOf(r.type);
        if (def) def.preview(ctx, 192, 144, r.id, this.c.save);
        card.appendChild(cv);
        card.insertAdjacentHTML('beforeend', '★');
        if (r.type === 'animal' && r.id === 'marissa') this.c.sound.meow();
      }
      box.appendChild(card);
    });
    $('chestHint').classList.add('hidden');
    setTimeout(() => this.rewards && $('chestHint').classList.remove('hidden'), 1200);
  }

  close() {
    this.running = false;
    $('chest').classList.add('hidden');
    this.c.onClose();
  }

  loop() {
    if (!this.running) return;
    const cv = this.cv, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const t = performance.now() / 1000;
    if (this.openT >= 0) this.openT = Math.min(1, this.openT + 1 / 60 / 0.4);
    this.shake = Math.max(0, this.shake - 1 / 60 / 0.35);
    const size = Math.min(w * 0.5, h * 0.55);
    const cy = h * 0.5 + size * 0.3;
    // лучи света
    if (this.openT > 0) {
      const R = Math.hypot(w, h);
      ctx.save();
      ctx.translate(w / 2, cy - size * 0.35);
      ctx.rotate(t * 0.4);
      ctx.fillStyle = `rgba(255,236,140,${0.4 * this.openT})`;
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-R * 0.09, -R); ctx.lineTo(R * 0.09, -R); ctx.fill();
      }
      ctx.restore();
    }
    const bob = this.openT < 0 ? Math.sin(t * 3) * 6 : 0;
    const sx = Math.sin(t * 50) * 10 * this.shake;
    const sc = 1 + this.taps * 0.06;
    ctx.save();
    ctx.translate(w / 2 + sx, cy + bob);
    ctx.scale(sc, sc);
    ctx.rotate(Math.sin(t * 40) * 0.08 * this.shake);
    drawChest(ctx, 0, 0, size, this.tier, Math.max(0, this.openT), t);
    ctx.restore();
    requestAnimationFrame(() => this.loop());
  }
}

// ---------- Карта уровней ----------
export function renderLevels(save, onPick) {
  const grid = $('levelGrid');
  grid.innerHTML = '';
  const n = Math.max(save.maxLevel + 4, 12);
  let total = 0;
  for (const v of Object.values(save.stars)) total += v;
  $('starsTotal').textContent = total;
  for (let L = 0; L < n; L++) {
    const b = BIOMES[L % BIOMES.length];
    const locked = L > save.maxLevel;
    const btn = el('button', `lv ${locked ? 'locked' : ''} ${L === save.level ? 'cur' : ''}`);
    btn.style.background = `linear-gradient(${b.sky[0]} 0 45%, ${b.top} 45% 60%, ${b.soil} 60%)`;
    btn.textContent = locked ? '🔒' : L + 1;
    const st = save.stars[L];
    if (st) btn.insertAdjacentHTML('beforeend', `<div class="st">${[0, 1, 2].map((i) => `<i class="star ${i < st ? '' : 'off'}"></i>`).join('')}</div>`);
    btn.onclick = () => { if (!locked) onPick(L); };
    grid.appendChild(btn);
  }
  setTimeout(() => {
    const cur = grid.querySelector('.cur');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }, 0);
}

// ---------- «Уровень пройден» ----------
let toastTimer = 0;
export function showToast(L, stars, chest, bonus, sound) {
  const box = $('toast');
  $('toastLevel').textContent = L + 1;
  const st = $('toastStars');
  st.innerHTML = [0, 1, 2].map((i) => `<i class="star ${i < stars ? '' : 'off'}"></i>`).join('');
  const rw = $('toastRewards');
  rw.innerHTML = '';
  const cv = el('canvas'); cv.width = 108; cv.height = 108;
  chestIcon(cv, chest);
  rw.appendChild(cv);
  rw.insertAdjacentHTML('beforeend', coinPill(`+${bonus}`, 'pill'));
  box.classList.remove('hidden');
  const card = box.firstElementChild;
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  for (let i = 0; i < stars; i++) setTimeout(() => sound.star(i), 250 * i + 150);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.add('hidden'), 4000);
}
