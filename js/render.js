// Отрисовка мира на канвасе: небо, горы, земля, украшения, монетки, машина, частицы.
import { STEP, groundY, levelAt, levelStart, biomeOf, decoAt, DECO_CELL, regionAt } from './terrain.js';
import { emit } from './hooks.js';
import { vehicleById } from './vehicles.js';
import { drawCar, drawCoin, drawPickup, drawDeco } from './art.js';
import { noise, hash2, clamp, smooth } from './rng.js';

const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}
function mix(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const x = rgb(a), y = rgb(b);
  return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`;
}

// Плавный переход фона между мирами вокруг финиша
function blendAt(x) {
  const reg = regionAt(x);
  if (reg) return { a: reg.biome, b: reg.biome, t: 0 };
  const L = levelAt(x);
  const B0 = levelStart(L), B1 = levelStart(L + 1);
  if (L > 0 && x - B0 < 25) return { a: biomeOf(L - 1), b: biomeOf(L), t: smooth(clamp((x - B0 + 25) / 50, 0, 1)) };
  if (B1 - x < 25) return { a: biomeOf(L), b: biomeOf(L + 1), t: smooth(clamp((x - B1 + 25) / 50, 0, 1)) };
  return { a: biomeOf(L), b: biomeOf(L), t: 0 };
}

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, s: 30 };
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.H * this.dpr);
  }

  baseScale() {
    const { W, H } = this;
    return W >= H ? Math.min(W / 20, H / 10) : Math.min(W / 12, H / 14);
  }

  follow(world, dt, snap = false) {
    const car = world.car, cam = this.cam;
    const base = this.baseScale() * (this.menu ? 1.45 : 1);
    const ts = base / (1 + Math.max(0, car.speed - 10) / 40);
    const viewW = this.W / ts, viewH = this.H / ts;
    const tx = this.menu ? car.x + Math.min(viewW * 0.3, viewW / 2 - 2.5) : car.x + viewW * 0.12 + clamp(car.vx * 0.25, -2, 4);
    const ty = this.menu ? car.y - viewH * 0.02 : car.y - viewH * 0.08;
    if (snap) { cam.x = tx; cam.y = ty; cam.s = ts; return; }
    cam.x += (tx - cam.x) * (1 - Math.exp(-dt * 6));
    cam.y += (ty - cam.y) * (1 - Math.exp(-dt * 4));
    cam.s += (ts - cam.s) * (1 - Math.exp(-dt * 2));
  }

  // Перевод координат: мир (метры) ↔ экран (CSS-пиксели)
  worldToScreen(x, y) { const { cam, W, H } = this; return { x: (x - cam.x) * cam.s + W / 2, y: (y - cam.y) * cam.s + H / 2 }; }
  screenToWorld(sx, sy) { const { cam, W, H } = this; return { x: (sx - W / 2) / cam.s + cam.x, y: (sy - H / 2) / cam.s + cam.y }; }

  draw(world, look, t) {
    const { ctx, W, H, dpr, cam } = this;
    const s = cam.s;
    const bl = blendAt(cam.x);
    const view = {
      x0: cam.x - W / 2 / s - 2, x1: cam.x + W / 2 / s + 2,
      yTop: cam.y - H / 2 / s - 2, yBottom: cam.y + H / 2 / s + 2,
      s, W, H, cam, blend: bl, dpr,
    };
    this.view = view;
    const toWorld = () => ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 - cam.x * s), dpr * (H / 2 - cam.y * s));
    const toScreen = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.drawSky(bl, t);
    emit('render:sky', ctx, view, t);
    toScreen();
    this.drawLayer(bl, 0.2, 'far', t);
    this.drawLayer(bl, 0.45, 'near', t);

    // мир в метрах
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 - cam.x * s), dpr * (H / 2 - cam.y * s));
    const x0 = cam.x - W / 2 / s - 2, x1 = cam.x + W / 2 / s + 2;
    const yBottom = cam.y + H / 2 / s + 2;

    // украшения (основание прячется под землёй)
    for (let c = Math.floor((x0 - 4) / DECO_CELL); c <= Math.ceil((x1 + 4) / DECO_CELL); c++) {
      const d = decoAt(c);
      if (!d || d.type === 'crater') continue;
      drawDeco(ctx, d.type, d.x, groundY(d.x) + 0.2, d.s, d.flip, t);
    }
    this.drawArches(x0, x1, t, true);
    this.drawGround(x0, x1, yBottom, t);
    for (let c = Math.floor((x0 - 2) / DECO_CELL); c <= Math.ceil((x1 + 2) / DECO_CELL); c++) {
      const d = decoAt(c);
      if (d && d.type === 'crater') drawDeco(ctx, d.type, d.x, groundY(d.x) + 0.05, d.s, d.flip, t);
    }
    this.drawArches(x0, x1, t, false);
    emit('render:world-back', ctx, world, view, t);
    toWorld();

    // монетки и бонусы
    for (const it of world.items.values()) {
      for (const c of it.coins) if (!c.taken && c.x > x0 && c.x < x1) drawCoin(ctx, c.x, c.y, t, c.big);
      for (const p of it.pickups) if (!p.taken && p.x > x0 && p.x < x1) drawPickup(ctx, p.kind, p.x, p.y, t);
    }
    emit('render:world-items', ctx, world, view, t);
    toWorld();

    // магнит
    const car = world.car;
    if (world.magnet > 0) {
      const r = world.U ? world.U.magnetRange : 5;
      ctx.strokeStyle = `rgba(255,90,110,${0.12 + 0.08 * Math.sin(t * 8)})`;
      ctx.lineWidth = 0.06;
      ctx.setLineDash([0.25, 0.45]);
      ctx.lineDashOffset = -t * 2;
      ctx.beginPath(); ctx.arc(car.x, car.y - 0.3, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    drawCar(ctx, car, look, world.face(t));

    // щит-пузырь
    if (world.shield > 0) {
      const blink = world.shield < 3 && Math.sin(t * 20) > 0;
      if (!blink) {
        const g = ctx.createRadialGradient(car.x - 0.6, car.y - 1, 0.3, car.x, car.y - 0.3, 2.6);
        g.addColorStop(0, 'rgba(255,255,255,0.35)');
        g.addColorStop(0.75, 'rgba(120,210,255,0.12)');
        g.addColorStop(1, 'rgba(120,210,255,0.45)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(car.x, car.y - 0.3, 2.7, 2.1, car.a, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.06; ctx.stroke();
      }
    }

    this.drawParticles(world.particles, t);
    emit('render:world-front', ctx, world, view, t);
    toScreen();
    this.drawAmbient(bl, t);
    if (world.turbo > 0) this.drawSpeedLines(t);
    emit('render:screen', ctx, world, view, t);
    toScreen();
  }

  drawSky(bl, t) {
    const { ctx, W, H } = this;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix(bl.a.sky[0], bl.b.sky[0], bl.t));
    g.addColorStop(1, mix(bl.a.sky[1], bl.b.sky[1], bl.t));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const night = (bl.a.night ? 1 - bl.t : 0) + (bl.b.night ? bl.t : 0);
    const u = Math.min(W, H);
    if (night > 0.01) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 70; i++) {
        const x = hash2(i, 1) * W, y = hash2(i, 2) * H * 0.7;
        ctx.globalAlpha = night * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)));
        ctx.fillRect(x, y, 2, 2);
      }
      // Земля в небе
      ctx.globalAlpha = night;
      const ex = W * 0.8, ey = H * 0.2, er = u * 0.08;
      ctx.fillStyle = '#4fa8ff'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6fd37a';
      ctx.beginPath(); ctx.ellipse(ex - er * 0.3, ey - er * 0.2, er * 0.35, er * 0.25, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ex + er * 0.35, ey + er * 0.3, er * 0.3, er * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (night < 0.99) {
      // солнышко
      ctx.globalAlpha = 1 - night;
      const sx = W * 0.82, sy = H * 0.18, sr = u * 0.07;
      ctx.fillStyle = 'rgba(255,240,150,0.35)';
      ctx.beginPath(); ctx.arc(sx, sy, sr * (1.5 + 0.08 * Math.sin(t * 2)), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff09a';
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      // облака
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 6; i++) {
        const span = W + u * 0.8;
        const x = ((hash2(i, 5) * span - this.cam.x * 4 * (0.4 + hash2(i, 6) * 0.3) - t * 6) % span + span) % span - u * 0.4;
        const y = H * (0.08 + hash2(i, 7) * 0.3), r = u * (0.04 + hash2(i, 8) * 0.03);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.arc(x + r * 1.1, y - r * 0.4, r * 1.2, 0, Math.PI * 2);
        ctx.arc(x + r * 2.2, y, r * 0.9, 0, Math.PI * 2);
        ctx.rect(x, y - r * 0.2, r * 2.2, r * 1.0);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawLayer(bl, p, which, t) {
    const { ctx, W, H, cam } = this;
    const s = cam.s * (which === 'far' ? 0.55 : 0.75);
    const horizon = H * (which === 'far' ? 0.55 : 0.68) - cam.y * cam.s * p * 0.5;
    const col = mix(bl.a[which], bl.b[which], bl.t);
    const sea = which === 'far' && ((bl.a.sea && bl.t < 0.5) || (bl.b.sea && bl.t >= 0.5));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + 12; sx += 12) {
      const u = cam.x * p + (sx - W / 2) / s;
      let h;
      if (sea) h = 1.2 + Math.sin(u * 0.8 + t * 2) * 0.08;
      else if (which === 'far') h = 5 + 4 * noise(u / 18, 11) + 1.5 * noise(u / 6, 12);
      else h = 2.5 + 2.2 * noise(u / 10, 21) + 0.6 * noise(u / 3.5, 22);
      ctx.lineTo(sx, horizon - h * s);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    if (sea) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 14; i++) {
        const x = ((hash2(i, 31) * W - cam.x * p * s + t * 10) % W + W) % W;
        const y = horizon - 1.2 * s + 6 + hash2(i, 32) * H * 0.2;
        ctx.fillRect(x, y, 16, 3);
      }
    }
  }

  drawGround(x0, x1, yBottom, t) {
    const ctx = this.ctx;
    // разбиваем по границам уровней: у каждого мира свой цвет земли
    const segs = [];
    let a = x0;
    while (a < x1) {
      const reg = regionAt(a);
      if (reg) {
        const b = Math.min(x1, reg.x1);
        segs.push({ a, b, biome: reg.biome });
        a = b;
        continue;
      }
      const L = levelAt(a);
      const b = Math.min(x1, levelStart(L + 1));
      segs.push({ a, b, biome: biomeOf(L) });
      a = b;
    }
    for (const sg of segs) {
      const bm = sg.biome;
      const i0 = Math.floor(sg.a / STEP), i1 = Math.ceil(sg.b / STEP);
      const path = new Path2D();
      path.moveTo(sg.a, groundY(sg.a));
      for (let i = i0 + 1; i < i1; i++) path.lineTo(i * STEP, groundY(i * STEP));
      path.lineTo(sg.b, groundY(sg.b));
      const fill = new Path2D(path);
      fill.lineTo(sg.b + 0.02, yBottom);
      fill.lineTo(sg.a - 0.02, yBottom);
      fill.closePath();
      const g = ctx.createLinearGradient(0, this.cam.y - 6, 0, yBottom);
      g.addColorStop(0, bm.soil);
      g.addColorStop(1, bm.soilDark);
      ctx.fillStyle = g;
      ctx.fill(fill);

      // камушки в земле
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let c = Math.floor(sg.a / 1.7); c < sg.b / 1.7; c++) {
        const px = c * 1.7 + hash2(c, 3) * 1.2;
        const py = groundY(px) + 1.1 + hash2(c, 4) * 3.5;
        ctx.beginPath(); ctx.ellipse(px, py, 0.22 + hash2(c, 5) * 0.2, 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }

      // верхний слой (трава / снег / песок / глазурь)
      ctx.save();
      ctx.translate(0, 0.32);
      ctx.strokeStyle = bm.top;
      ctx.lineWidth = 0.66;
      ctx.lineJoin = 'round';
      ctx.stroke(path);
      ctx.translate(0, -0.26);
      ctx.strokeStyle = bm.topLight;
      ctx.lineWidth = 0.14;
      ctx.stroke(path);
      ctx.restore();

      // травинки / посыпка
      if (bm.id === 'meadow' || bm.id === 'autumn') {
        ctx.fillStyle = bm.topLight;
        for (let c = Math.floor(sg.a / 0.6); c < sg.b / 0.6; c++) {
          const px = c * 0.6 + hash2(c, 9) * 0.3, py = groundY(px);
          const hgt = 0.18 + hash2(c, 10) * 0.18;
          ctx.beginPath(); ctx.moveTo(px - 0.08, py + 0.05); ctx.lineTo(px + 0.02, py - hgt); ctx.lineTo(px + 0.1, py + 0.05); ctx.fill();
        }
      } else if (bm.id === 'candy') {
        const cols = ['#ffffff', '#ffe14d', '#6fd3ff', '#8be86a'];
        for (let c = Math.floor(sg.a / 0.5); c < sg.b / 0.5; c++) {
          const px = c * 0.5 + hash2(c, 9) * 0.3, py = groundY(px) + 0.15 + hash2(c, 11) * 0.35;
          ctx.save(); ctx.translate(px, py); ctx.rotate(hash2(c, 12) * 3);
          ctx.fillStyle = cols[c & 3]; ctx.fillRect(-0.09, -0.03, 0.18, 0.06);
          ctx.restore();
        }
      }
    }
  }

  // Финишные арки на границах уровней
  drawArches(x0, x1, t, back) {
    const ctx = this.ctx;
    let L = Math.max(1, levelAt(x0) - 1);
    for (; levelStart(L) < x1 + 6; L++) {
      const B = levelStart(L);
      if (B < x0 - 6 || regionAt(B)) continue;
      const gy = groundY(B);
      if (back) {
        // столбы, флажки и надпись-номер
        for (const d of [-3.4, 3.4]) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(B + d - 0.15, gy - 5.2, 0.3, 5.4);
          ctx.fillStyle = '#ff6fae';
          for (let k = 0; k < 5; k++) ctx.fillRect(B + d - 0.15, gy - 5.2 + k * 1.1, 0.3, 0.55);
          // воздушные шарики
          const cols = ['#ff6fae', '#ffd93b', '#6fd3ff'];
          for (let k = 0; k < 3; k++) {
            const bx = B + d + (k - 1) * 0.55 + Math.sin(t * 2 + k + d) * 0.1, by = gy - 6.1 - (k % 2) * 0.5;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.03;
            ctx.beginPath(); ctx.moveTo(B + d, gy - 5.2); ctx.lineTo(bx, by + 0.45); ctx.stroke();
            ctx.fillStyle = cols[k]; ctx.beginPath(); ctx.ellipse(bx, by, 0.36, 0.45, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(bx - 0.12, by - 0.15, 0.08, 0.13, -0.4, 0, Math.PI * 2); ctx.fill();
          }
        }
        // шахматный баннер
        const top = gy - 5.2, bh = 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(B - 3.55, top, 7.1, bh);
        ctx.fillStyle = '#2b2b33';
        for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) ctx.fillRect(B - 3.55 + i * (7.1 / 16), top + j * (bh / 2), 7.1 / 16, bh / 2);
        ctx.strokeStyle = '#ff6fae'; ctx.lineWidth = 0.08; ctx.strokeRect(B - 3.55, top, 7.1, bh);
        // табличка с номером следующего уровня
        const sx = B + 9, sy = groundY(sx);
        ctx.fillStyle = '#a8733d'; ctx.fillRect(sx - 0.1, sy - 2.2, 0.2, 2.4);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ff6fae'; ctx.lineWidth = 0.1;
        ctx.beginPath(); ctx.roundRect(sx - 0.9, sy - 3.3, 1.8, 1.25, 0.25); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(sx, sy - 2.62); ctx.scale(1 / 40, 1 / 40);
        ctx.fillStyle = '#ff4f9a'; ctx.font = '900 38px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(L + 1), 0, 2);
        ctx.restore();
      } else {
        // клетчатая полоса на земле
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = k % 2 ? '#2b2b33' : '#ffffff';
          ctx.fillRect(B - 0.6, gy + k * 0.18, 0.6, 0.18);
          ctx.fillStyle = k % 2 ? '#ffffff' : '#2b2b33';
          ctx.fillRect(B, gy + k * 0.18, 0.6, 0.18);
        }
      }
    }
  }

  drawParticles(ps, t) {
    const ctx = this.ctx;
    for (const p of ps) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      switch (p.type) {
        case 'dust':
          ctx.globalAlpha = a * 0.6;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        case 'spark': case 'star':
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const r = i % 2 ? p.size * 0.4 : p.size; const an = (i * Math.PI) / 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
          ctx.fill(); ctx.restore();
          break;
        case 'pop':
          ctx.strokeStyle = p.color; ctx.lineWidth = 0.08;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
          break;
        case 'flame': {
          const k = p.life / p.max;
          ctx.fillStyle = k > 0.6 ? '#fff4a3' : k > 0.3 ? '#ffb23f' : '#ff5f8a';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + k), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'confetti':
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 2));
          ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
          ctx.restore();
          break;
        case 'text':
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 / 40, 1 / 40);
          ctx.font = '900 34px system-ui, sans-serif'; ctx.textAlign = 'center';
          ctx.lineWidth = 6; ctx.strokeStyle = '#b8730a'; ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = '#ffe14d'; ctx.fillText(p.text, 0, 0);
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  // Снежинки, листья, искорки — в экранных координатах
  drawAmbient(bl, t) {
    const { ctx, W, H, cam } = this;
    const w = (id) => (bl.a.id === id ? 1 - bl.t : 0) + (bl.b.id === id ? bl.t : 0);
    const snow = w('snow'), leaves = w('autumn'), candy = w('candy');
    const n = 40;
    if (snow > 0.01) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < n; i++) {
        const x = ((hash2(i, 41) * W - cam.x * cam.s * 0.5 + Math.sin(t + i) * 20) % W + W) % W;
        const y = ((hash2(i, 42) * H + t * (30 + hash2(i, 43) * 40)) % H);
        ctx.globalAlpha = snow * 0.9;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + hash2(i, 44) * 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (leaves > 0.01) {
      const cols = ['#ff8a2b', '#ffc23f', '#e8573a'];
      for (let i = 0; i < 18; i++) {
        const x = ((hash2(i, 51) * W - cam.x * cam.s * 0.5 - t * 25) % W + W) % W;
        const y = ((hash2(i, 52) * H + t * (25 + hash2(i, 53) * 25)) % H);
        ctx.globalAlpha = leaves;
        ctx.fillStyle = cols[i % 3];
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i);
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    if (candy > 0.01) {
      for (let i = 0; i < 16; i++) {
        const x = ((hash2(i, 61) * W - cam.x * cam.s * 0.3) % W + W) % W;
        const y = H - ((hash2(i, 62) * H + t * (15 + hash2(i, 63) * 15)) % H);
        ctx.globalAlpha = candy * 0.55;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#ff8cc6';
        const r = 5 + hash2(i, 64) * 5;
        ctx.save(); ctx.translate(x, y);
        ctx.beginPath(); ctx.moveTo(0, r * 0.35);
        ctx.bezierCurveTo(-r * 1.1, -r * 0.35, -r * 0.45, -r * 1.05, 0, -r * 0.45);
        ctx.bezierCurveTo(r * 0.45, -r * 1.05, r * 1.1, -r * 0.35, 0, r * 0.35);
        ctx.fill(); ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawSpeedLines(t) {
    const { ctx, W, H } = this;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const y = hash2(i, 71) * H;
      const x = W - ((t * 1400 + hash2(i, 72) * W) % (W * 1.3));
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + hash2(i, 73) * 80, y); ctx.stroke();
    }
  }

  // Машина отдельно (для гаража и меню)
  static drawPreview(ctx, w, h, look, mood, t, scale) {
    const v = vehicleById(look.vehicle);
    const xs = v.hull.map((p) => p.x), pv = v.preview || {};
    // рамка рисунка: контур кузова или v.preview {x0, x1, y0}, если рисунок выступает (хвост, пламя)
    const minX = pv.x0 ?? Math.min(...xs), maxX = pv.x1 ?? Math.max(...xs), len = maxX - minX;
    const up = Math.max(0, -1.2 - (pv.y0 ?? Math.min(...v.hull.map((p) => p.y))));   // насколько выше пикапа
    const s = scale || Math.min(w / (len + 1.3), h / (3.4 + up));
    ctx.save();
    ctx.translate(w / 2, h * ((1.97 + up) / (3.4 + up)));
    ctx.scale(s, s);
    ctx.translate(-(minX + maxX) / 2, 0);
    const ph = v.phys;
    const wy = (a) => a.y + ph.rest - 0.07;                // колесо чуть «просело» под весом
    const y = 0.88 - (wy(ph.anchors[0]) + ph.wheelR);       // земля на y = 0.88
    const state = {
      x: 0, y, a: 0, vehicle: v,
      wheels: ph.anchors.map((a) => ({ x: a.x, y: y + wy(a), rot: t * 2 })),
    };
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    const hx0 = Math.min(...xs), hx1 = Math.max(...xs);
    ctx.beginPath(); ctx.ellipse((hx0 + hx1) / 2, 0.9, (hx1 - hx0) * 0.6, 0.14, 0, 0, Math.PI * 2); ctx.fill();
    drawCar(ctx, state, look, typeof mood === 'object' && mood ? { ...mood, t } : { mood, t });
    ctx.restore();
  }
}
