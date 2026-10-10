// Общие «кисти» для рисования на канвасе (метры или единицы головы, ось Y вниз).
export const TAU = Math.PI * 2;

export function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
export function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); }
export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export function fillStroke(ctx, fill, stroke, lw) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
  ctx.closePath();
}

export function starPath(ctx, x, y, r, r2 = r * 0.45, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? r2 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// Волнистая линия от текущей точки (x0, y0) до (x1, y1): n «волн» высотой amp
export function wave(ctx, x0, y0, x1, y1, n, amp) {
  const dx = (x1 - x0) / n, dy = (y1 - y0) / n;
  const len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len;
  for (let i = 0; i < n; i++) {
    const k = i % 2 ? -amp : amp;
    ctx.quadraticCurveTo(x0 + dx * (i + 0.5) + px * k, y0 + dy * (i + 0.5) + py * k, x0 + dx * (i + 1), y0 + dy * (i + 1));
  }
}

// Вертикальный градиент краски кузова
export function paintFill(ctx, paint, top, bottom) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, paint.light);
  g.addColorStop(0.35, paint.body);
  g.addColorStop(1, paint.dark);
  return g;
}

// Узор раскраски (сердечки, звёзды, радуга, блеск) — рисуется внутри уже заданного clip
export function drawPattern(ctx, paint, t, box = { x0: -2.1, x1: 2.1, y0: -1.3, y1: 0.4 }) {
  if (!paint.pattern) return;
  const w = box.x1 - box.x0, h = box.y1 - box.y0;
  const at = (fx, fy) => [box.x0 + fx * w, box.y0 + fy * h];
  ctx.save();
  if (paint.pattern === 'hearts' || paint.pattern === 'stars') {
    ctx.fillStyle = paint.pattern === 'hearts' ? 'rgba(255,255,255,0.75)' : '#fff3a8';
    const spots = [[0.07, 0.68, 0.13], [0.33, 0.8, 0.1], [0.55, 0.68, 0.12], [0.86, 0.71, 0.11], [0.4, 0.27, 0.09], [0.2, 0.59, 0.07], [0.69, 0.8, 0.08], [0.15, 0.3, 0.08], [0.6, 0.2, 0.07]];
    for (const [fx, fy, s] of spots) {
      const [x, y] = at(fx, fy);
      if (paint.pattern === 'hearts') heartPath(ctx, x, y, s); else starPath(ctx, x, y, s);
      ctx.fill();
    }
  } else if (paint.pattern === 'rainbow') {
    const cols = ['#ff5a5a', '#ff9f43', '#ffd93b', '#5ee07a', '#4fb3ff', '#a97bff'];
    const band = h / cols.length;
    for (let i = 0; i < cols.length; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(box.x0, box.y0 + i * band, w, band + 0.01); }
  } else if (paint.pattern === 'shine') {
    const off = box.x0 + ((t * 0.6) % 3) / 3 * (w + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(off, box.y0); ctx.lineTo(off + 0.35, box.y0); ctx.lineTo(off - 0.5, box.y1); ctx.lineTo(off - 0.85, box.y1);
    ctx.fill();
  }
  ctx.restore();
}

// Колесо радиуса r (по умолчанию 0.5 м)
export function drawWheel(ctx, x, y, rot, rim, r = 0.5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(r / 0.5, r / 0.5);
  circle(ctx, 0, 0, 0.5);
  fillStroke(ctx, '#2f2b36', '#1c1a21', 0.04);
  ctx.fillStyle = '#423c4c';
  for (let i = 0; i < 14; i++) {
    ctx.save(); ctx.rotate((i * TAU) / 14); ctx.fillRect(-0.05, -0.53, 0.1, 0.09); ctx.restore();
  }
  circle(ctx, 0, 0, 0.29);
  fillStroke(ctx, '#f4f1f8', '#c9c2d6', 0.03);
  ctx.strokeStyle = rim;
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.08, Math.sin(a) * 0.08); ctx.lineTo(Math.cos(a) * 0.24, Math.sin(a) * 0.24); ctx.stroke();
  }
  circle(ctx, 0, 0, 0.09);
  fillStroke(ctx, rim, null);
  ctx.restore();
}

// Глаза для всех лиц: настроение меняет форму
export function drawEyes(ctx, mood, t, lx, rx, y, color, iris, size = 1) {
  const blink = (t % 3.7) < 0.12 && mood === 'normal';
  ctx.lineCap = 'round';
  for (const x of [lx, rx]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.1 * size;
    if (mood === 'happy') {
      ctx.beginPath(); ctx.arc(x, y + 0.08 * size, 0.15 * size, Math.PI + 0.3, -0.3); ctx.stroke();
    } else if (mood === 'turbo') {
      const d = x < (lx + rx) / 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x - 0.15 * size * d, y - 0.12 * size); ctx.lineTo(x + 0.12 * size * d, y); ctx.lineTo(x - 0.15 * size * d, y + 0.12 * size);
      ctx.stroke();
    } else if (mood === 'dizzy') {
      ctx.lineWidth = 0.07 * size;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = i * 0.55 + t * 8, r = (i / 24) * 0.18 * size;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.stroke();
    } else if (mood === 'scared') {
      circle(ctx, x, y, 0.2 * size); fillStroke(ctx, '#fff', color, 0.05 * size);
      circle(ctx, x, y, 0.07 * size); fillStroke(ctx, color, null);
    } else if (blink) {
      ctx.beginPath(); ctx.moveTo(x - 0.14 * size, y); ctx.lineTo(x + 0.14 * size, y); ctx.stroke();
    } else {
      ellipse(ctx, x, y, 0.17 * size, 0.22 * size);
      fillStroke(ctx, iris || color, null);
      if (iris) { ellipse(ctx, x, y + 0.02 * size, 0.08 * size, 0.15 * size); fillStroke(ctx, '#1d1d24', null); }
      circle(ctx, x + 0.06 * size, y - 0.08 * size, 0.06 * size); fillStroke(ctx, '#fff', null);
      circle(ctx, x - 0.05 * size, y + 0.07 * size, 0.03 * size); fillStroke(ctx, '#fff', null);
    }
  }
}
