// Игровой заезд: машина, монетки, бонусы, финиш, авария, частицы.
import { PHYS, carParams, chestForLevel } from './config.js';
import { Car } from './car.js';
import { levelStart, levelAt, levelItems, biomeOf, biomeAtX, slopeAt, groundY } from './terrain.js';
import { wrapAngle, clamp } from './rng.js';
import { emit } from './hooks.js';
import { vehicleById } from './vehicles.js';

const COIN_POINTS = [{ x: 0, y: -0.5 }, { x: 1.3, y: -0.2 }, { x: -1.3, y: -0.3 }, { x: 0, y: 0.5 }];

export class World {
  constructor() {
    this.car = new Car();
    this.mode = 'normal';      // 'normal' — уровни; другие режимы (бонус-уровень) ведут свои возможности
    this.reaction = null;      // {pet, sofya, pose, until} — реакция на тап, гудок и т.п.
    this.items = new Map();
    this.particles = [];
    this.events = [];
    this.t = 0;
    this.U = carParams({ engine: 0, grip: 0, balance: 0, turbo: 0, magnet: 0 }, PHYS.g);
    this.input = { gas: false, brake: false };
    this.start(0);
  }

  // Сменить машину (из гаража)
  setVehicle(id) {
    if (this.car.vehicle.id === id) return;
    this.car.setVehicle(vehicleById(id));
  }

  // Начать уровень L (или продолжить с позиции x)
  start(L, x = null, taken = null) {
    this.L = L;
    this.mode = 'normal';
    this.reaction = null;
    this.items.clear();
    this.ensureItems();
    if (taken) {
      const it = this.items.get(L);
      for (const id of taken) if (it.coins[id]) it.coins[id].taken = true;
    }
    const sx = x ?? levelStart(L) + 3;
    this.car.place(sx);
    this.acc = 0;
    this.crashed = false;
    this.crashDone = false;
    this.crashT = 0;
    this.turbo = this.magnet = this.shield = 0;
    this.airT = 0;
    this.happyT = 0;
    this.stuckT = 0;
    this.particles.length = 0;
    this.combo = 0;
    this.comboT = 0;
    emit('world:start', this, L, sx);
  }

  ensureItems() {
    for (const k of [this.L, this.L + 1]) {
      if (this.items.has(k)) continue;
      const items = levelItems(k);
      emit('world:items', k, items);
      this.items.set(k, items);
    }
    for (const k of this.items.keys()) if (k < this.L) this.items.delete(k);
  }

  get level() { return this.items.get(this.L); }
  get gotCoins() { return this.level.coins.reduce((n, c) => n + (c.taken ? 1 : 0), 0); }
  get takenIds() { return this.level.coins.filter((c) => c.taken).map((c) => c.id); }
  get progress() {
    const a = levelStart(this.L), b = levelStart(this.L + 1);
    return clamp((this.car.x - a) / (b - a), 0, 1);
  }

  activate(kind, U) {
    if (this.crashed) return false;
    if (kind === 'turbo') this.turbo = U.turboTime;
    if (kind === 'magnet') this.magnet = U.magnetTime;
    if (kind === 'shield') this.shield = U.shieldTime;
    this.events.push({ type: 'boost', kind });
    return true;
  }

  // Временная реакция Софьи и зверька: {pet:'happy', sofya:'happy', pose:'wave'} на time секунд
  react(r, time = 1.2) { this.reaction = { ...r, until: this.t + time }; }

  update(dt, ctl, up) {
    this.t += dt;
    const car = this.car;
    const biome = biomeAtX(car.x);
    const U = carParams(up, PHYS.g * (biome.gravity || 1), car.vehicle.mult);
    this.U = U;
    U.turbo = this.turbo > 0;
    const input = this.crashed ? { gas: false, brake: false } : ctl;
    this.input = input;

    // физика фиксированным шагом
    this.acc = Math.min(this.acc + dt, 0.1);
    while (this.acc >= PHYS.dt) {
      car.step(PHYS.dt, input, U);
      this.acc -= PHYS.dt;
    }

    // таймеры бонусов
    this.turbo = Math.max(0, this.turbo - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.happyT = Math.max(0, this.happyT - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    if (this.comboT === 0) this.combo = 0;
    this.airT = car.grounded ? 0 : this.airT + dt;

    // авария
    if (car.roofHit && !this.crashed) {
      car.roofHit = false;
      if (this.shield > 0) {
        this.shield = 0;
        car.rescue(1.4);
        this.burst(car.x, car.y, 'pop', 18, '#9be7ff');
        this.events.push({ type: 'shieldSave' });
      } else {
        this.crashed = true;
        this.crashT = 0;
        this.burst(car.x, car.y - 1, 'star', 8, '#ffe14d');
        this.events.push({ type: 'crash' });
        emit('world:crash', this);
      }
    }
    car.roofHit = false;
    if (this.crashed) {
      this.crashT += dt;
      if (this.crashT > 1.6 && !this.crashDone) { this.crashDone = true; this.events.push({ type: 'crashDone' }); }
    } else this.crashDone = false;

    // застряли на боку — аккуратно ставим на колёса
    const tilt = Math.abs(wrapAngle(car.a - slopeAt(car.x, 1.5)));
    if (!this.crashed && tilt > 1.1 && car.speed < 1.2) {
      this.stuckT += dt;
      if (this.stuckT > 2) { this.stuckT = 0; car.rescue(1); this.burst(car.x, car.y, 'pop', 12, '#ffffff'); }
    } else this.stuckT = 0;

    // финиш уровня (в особых режимах, например в бонус-уровне, уровнями управляет сама возможность)
    if (this.mode === 'normal' && !this.crashed && car.x >= levelStart(this.L + 1)) {
      const L = this.L, got = this.gotCoins, total = this.level.total;
      this.L = L + 1;
      this.ensureItems();
      this.confetti(levelStart(L + 1), groundY(levelStart(L + 1)));
      const e = { type: 'level', L, got, total, stars: got * 2 >= total ? 3 : 2, chest: chestForLevel(L) };
      emit('world:level', this, e);
      this.events.push(e);
    }

    if (this.mode === 'normal') this.collect(dt, U);
    this.updateParticles(dt);
    this.emitEffects(dt);
    emit('world:update', this, dt, U, input);
  }

  collect(dt, U) {
    const car = this.car;
    const c = Math.cos(car.a), s = Math.sin(car.a);
    const pts = COIN_POINTS.map((p) => ({ x: car.x + c * p.x - s * p.y, y: car.y + s * p.x + c * p.y }));
    const range = this.magnet > 0 ? U.magnetRange : 0;
    for (const it of this.items.values()) {
      for (const coin of it.coins) {
        if (coin.taken || Math.abs(coin.x - car.x) > 12) continue;
        if (range > 0 || coin.pull) {
          const dx = car.x - coin.x, dy = car.y - coin.y, d = Math.hypot(dx, dy);
          if (coin.pull || d < range) {
            coin.pull = true;
            const v = Math.min(d, (16 + car.speed) * dt);
            coin.x += (dx / d) * v;
            coin.y += (dy / d) * v;
          }
        }
        for (const p of pts) {
          const r = coin.big ? 1.25 : 1.0;
          if ((p.x - coin.x) ** 2 + (p.y - coin.y) ** 2 < r * r) {
            coin.taken = true;
            this.combo++;
            this.comboT = 1.2;
            this.happyT = 0.6;
            this.burst(coin.x, coin.y, 'spark', coin.big ? 10 : 4, '#ffd93b');
            if (coin.big) this.particles.push({ type: 'text', x: coin.x, y: coin.y - 0.5, vx: 0, vy: -2, life: 1, max: 1, text: '+10' });
            this.events.push({ type: 'coin', v: coin.v, big: !!coin.big, combo: this.combo });
            break;
          }
        }
      }
      for (const pk of it.pickups) {
        if (pk.taken || Math.abs(pk.x - car.x) > 4) continue;
        if (pts.some((p) => (p.x - pk.x) ** 2 + (p.y - pk.y) ** 2 < 1.4 * 1.4)) {
          pk.taken = true;
          this.happyT = 1;
          this.burst(pk.x, pk.y, 'spark', 12, pk.kind === 'chest' ? '#ffb347' : '#8fe3ff');
          if (pk.kind === 'chest') this.events.push({ type: 'chest', tier: 'wood' });
          else this.activate(pk.kind, U);
        }
      }
    }
  }

  // ---------- Частицы ----------
  burst(x, y, type, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
      this.particles.push({ type, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 0.7 + Math.random() * 0.5, max: 1.2, color, size: 0.15 + Math.random() * 0.2, rot: Math.random() * 6 });
    }
  }

  confetti(x, y) {
    const colors = ['#ff6fae', '#ffd93b', '#6fd3ff', '#8be86a', '#c38bff', '#ff8a5c'];
    for (let i = 0; i < 70; i++) {
      this.particles.push({
        type: 'confetti', x: x + (Math.random() - 0.5) * 6, y: y - 6 - Math.random() * 4,
        vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 8, life: 2.5 + Math.random(), max: 3.5,
        color: colors[i % colors.length], size: 0.18 + Math.random() * 0.12, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
      });
    }
  }

  emitEffects(dt) {
    const car = this.car, ps = this.particles;
    if (ps.length > 400) ps.splice(0, ps.length - 400);
    const biome = biomeAtX(car.x);
    for (const wh of car.wheels) {
      if (wh.contact && (wh.slip > 2.5 || (this.input.gas && car.speed > 4)) && Math.random() < dt * 25) {
        ps.push({ type: 'dust', x: wh.x - 0.3, y: wh.y + 0.4, vx: -1 - Math.random() * 2, vy: -1 - Math.random(), life: 0.6, max: 0.6, color: biome.dust, size: 0.25 + Math.random() * 0.2 });
      }
    }
    if (this.turbo > 0) {
      const c = Math.cos(car.a), s = Math.sin(car.a);
      const ex = car.vehicle.exhaust || { x: -1.95, y: 0.05 };   // пламя турбо — из выхлопной трубы машины
      for (let i = 0; i < 2; i++) {
        ps.push({ type: 'flame', x: car.x + c * ex.x - s * ex.y, y: car.y + s * ex.x + c * ex.y, vx: car.vx - c * 8 + (Math.random() - 0.5) * 2, vy: car.vy - s * 8 + (Math.random() - 0.5) * 2, life: 0.3, max: 0.3, size: 0.35 });
      }
    }
  }

  updateParticles(dt) {
    const ps = this.particles;
    let j = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'confetti') { p.vy += 9 * dt; p.vx *= 1 - 1.5 * dt; p.rot += p.vr * dt; }
      else if (p.type === 'spark' || p.type === 'star') { p.vy += 8 * dt; p.rot += 6 * dt; }
      else if (p.type === 'dust') { p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; p.size += dt * 0.8; }
      else if (p.type === 'text') { p.vy *= 1 - 3 * dt; }
      ps[j++] = p;
    }
    ps.length = j;
  }

  // Настроение зверька и Софьи
  mood() {
    if (this.crashed) return 'dizzy';
    if (this.reaction && this.reaction.pet && this.t < this.reaction.until) return this.reaction.pet;
    if (this.turbo > 0) return 'turbo';
    const tilt = Math.abs(wrapAngle(this.car.a));
    if (this.airT > 0.6 || tilt > 1.1) return 'scared';
    if (this.happyT > 0) return 'happy';
    return 'normal';
  }

  sofyaMood() {
    const r = this.reaction;
    if (r && r.sofya && this.t < r.until && !this.crashed) return r.sofya;
    return this.mood();
  }

  // Всё, что нужно для отрисовки лиц в окнах машины
  face(t) {
    const r = this.reaction;
    const pose = r && r.pose && this.t < r.until && !this.crashed ? r.pose : null;
    return { mood: this.mood(), sofyaMood: this.sofyaMood(), pose, t };
  }
}
