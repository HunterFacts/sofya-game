// Софья: тёмно-русые, слегка кудрявые, очень длинные волосы.
// style = save.look.sofya ({hair, outfit, acc}); pose — 'wave' и т.п. (необязательно)
import { ellipse, circle, fillStroke, heartPath, wave, drawEyes } from './draw-utils.js';

const HAIR = '#937452', HAIR_D = '#6f5538', HAIR_L = '#b8976b', SKIN = '#ffdcc6', SKIN_D = '#f1bfa3';

// Прядь перед плечом: от виска вниз за край окна
function hairLock(ctx, d, sway) {
  const ox = 1.02 * d, ix = 0.74 * d;
  ctx.beginPath();
  ctx.moveTo(ox, -0.15);
  wave(ctx, ox, -0.15, (1.42 + sway) * d, 3.0, 7, 0.13 * d);
  ctx.lineTo((0.98 + sway) * d, 3.0);
  wave(ctx, (0.98 + sway) * d, 3.0, ix, 0.35, 6, 0.11 * d);
  ctx.quadraticCurveTo(0.78 * d, 0.05, ox, -0.15);
  ctx.closePath();
  fillStroke(ctx, HAIR, HAIR_D, 0.06);
  // завитки-блики
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.07;
  for (const [y, r] of [[0.55, 0.13], [1.25, 0.15], [1.95, 0.14], [2.6, 0.13]]) {
    const x = (1.0 + sway * (y / 3) + y * 0.07) * d;
    ctx.beginPath();
    ctx.arc(x, y, r, d > 0 ? Math.PI * 0.9 : -Math.PI * 0.1, d > 0 ? Math.PI * 2.3 : Math.PI * 1.3);
    ctx.stroke();
  }
}

// Софья: тёмно-русые, слегка кудрявые длинные волосы (до колен — уходят за край окна)
export function drawSofya(ctx, mood, t, style = {}, pose = null) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const sway = Math.sin(t * 3) * 0.06 + (mood === 'turbo' ? -0.12 : 0);
  // копна волос сзади
  ctx.beginPath();
  ctx.moveTo(-0.2, -1.14);
  ctx.quadraticCurveTo(-1.25, -1.12, -1.22, -0.1);
  wave(ctx, -1.22, -0.1, -1.75 + sway, 3.2, 8, 0.12);
  ctx.lineTo(1.75 + sway, 3.2);
  wave(ctx, 1.75 + sway, 3.2, 1.22, -0.1, 8, 0.12);
  ctx.quadraticCurveTo(1.25, -1.12, 0.2, -1.14);
  ctx.closePath();
  fillStroke(ctx, HAIR, HAIR_D, 0.08);
  // плечи и кофточка
  ellipse(ctx, 0, 1.6, 1.12, 0.62);
  fillStroke(ctx, '#ff8cc6', '#e0609f', 0.08);
  ellipse(ctx, 0, 1.05, 0.25, 0.2);
  ctx.fillStyle = SKIN_D; ctx.fill();
  // лицо
  ellipse(ctx, 0, 0.1, 0.9, 0.92);
  fillStroke(ctx, SKIN, SKIN_D, 0.06);
  // длинные пряди спереди, на плечах
  hairLock(ctx, -1, sway);
  hairLock(ctx, 1, sway);
  // макушка и кудрявая чёлка
  ctx.beginPath();
  ctx.moveTo(-1.02, 0.02);
  ctx.quadraticCurveTo(-1.02, -1.1, 0, -1.12);
  ctx.quadraticCurveTo(1.02, -1.1, 1.04, 0.02);
  ctx.quadraticCurveTo(0.95, -0.2, 0.82, -0.22);
  wave(ctx, 0.82, -0.22, -0.82, -0.22, 5, 0.17);
  ctx.quadraticCurveTo(-0.95, -0.2, -1.02, 0.02);
  fillStroke(ctx, HAIR, HAIR_D, 0.07);
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.08;
  ctx.beginPath(); ctx.moveTo(-0.5, -0.86); ctx.quadraticCurveTo(-0.1, -1.0, 0.3, -0.92); ctx.stroke();
  ctx.beginPath(); ctx.arc(-0.62, -0.5, 0.12, Math.PI * 0.8, Math.PI * 2.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(0.5, -0.62, 0.11, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke();
  // розовая заколка-сердечко
  heartPath(ctx, 0.72, -0.62, 0.2);
  fillStroke(ctx, '#ff5fa8', '#d63d86', 0.05);
  // щёчки
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  ellipse(ctx, -0.52, 0.38, 0.18, 0.11); ctx.fill();
  ellipse(ctx, 0.52, 0.38, 0.18, 0.11); ctx.fill();
  drawEyes(ctx, mood, t, -0.36, 0.36, 0.08, '#4a3426', false, 0.7);
  drawHumanMouth(ctx, mood, 0, 0.55);
}

function drawHumanMouth(ctx, mood, x, y) {
  ctx.strokeStyle = '#a64a4a';
  ctx.lineWidth = 0.08;
  if (mood === 'scared') {
    ellipse(ctx, x, y + 0.05, 0.13, 0.17); fillStroke(ctx, '#a63b4a', null);
  } else if (mood === 'happy' || mood === 'turbo') {
    ctx.beginPath(); ctx.moveTo(x - 0.25, y - 0.04); ctx.quadraticCurveTo(x, y + 0.4, x + 0.25, y - 0.04); ctx.closePath();
    fillStroke(ctx, '#c4475c', '#a64a4a', 0.06);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 0.17, y - 0.03, 0.34, 0.07);
  } else if (mood === 'dizzy') {
    ctx.beginPath(); ctx.moveTo(x - 0.22, y + 0.08);
    ctx.quadraticCurveTo(x - 0.11, y - 0.05, x, y + 0.08); ctx.quadraticCurveTo(x + 0.11, y + 0.2, x + 0.22, y + 0.08); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(x, y - 0.1, 0.2, 0.35, Math.PI - 0.35); ctx.stroke();
  }
}

// Глаза для всех: настроение меняет форму
