// Наряды Софьи: причёски, кофточки и украшения — вкладка гаража 👧.
// Рисование — в js/sofya.js (drawSofya), выбор хранится в save.look.sofya = {hair, outfit, acc}.
// Купленное — save.owned.sofyaHair / sofyaOutfit / sofyaAcc; всё это может выпасть и из сундука.
import { registerGarageTab, registerCosmetic } from '../ui.js';
import { addDefaults } from '../save.js';
import { drawSofya } from '../sofya.js';

addDefaults({ owned: { sofyaHair: ['long'], sofyaOutfit: ['pink'], sofyaAcc: ['heart', 'none'] } });

const DEF_LOOK = { hair: 'long', outfit: 'pink', acc: 'heart' };

// Группы вкладки. frame — как ставить Софью в карточке: центр головы (доля высоты) и масштаб (доля высоты)
const GROUPS = [
  {
    key: 'hair', type: 'sofyaHair', icon: 'comb', frame: { cy: 0.4, k: 0.2 },
    items: [
      { id: 'long', price: 0 }, { id: 'ponytail', price: 150 }, { id: 'braids', price: 250 },
      { id: 'buns', price: 400 }, { id: 'crown', price: 600 },
    ],
  },
  {
    key: 'outfit', type: 'sofyaOutfit', icon: '👗', frame: { cy: 0.34, k: 0.235 },
    items: [
      { id: 'pink', price: 0 }, { id: 'lilac', price: 150 }, { id: 'mint', price: 150 }, { id: 'sky', price: 150 },
      { id: 'yellow', price: 200 }, { id: 'red', price: 200 }, { id: 'hearts', price: 350 }, { id: 'stars', price: 400 },
      { id: 'rainbow', price: 550 }, { id: 'princess', price: 900 },
    ],
  },
  {
    key: 'acc', type: 'sofyaAcc', icon: '🎀', frame: { cy: 0.52, k: 0.27 },
    items: [
      { id: 'heart', price: 0 }, { id: 'bow', price: 150 }, { id: 'glasses', price: 250 }, { id: 'flowers', price: 300 },
      { id: 'headphones', price: 350 }, { id: 'cat', price: 450 }, { id: 'tiara', price: 700 }, { id: 'none', price: 0 },
    ],
  },
];

const lookOf = (save) => {
  if (!save.look.sofya || typeof save.look.sofya !== 'object') save.look.sofya = { ...DEF_LOOK };
  return save.look.sofya;
};
const ownedOf = (save, g) => {
  const o = save.owned;
  if (!Array.isArray(o[g.type])) o[g.type] = g.items.filter((it) => !it.price).map((it) => it.id);
  return o[g.type];
};

// Софья крупно в «окошке» карточки
function portrait(ctx, w, h, sofya, frame, t = 0.6, mood = 'normal', pose = null) {
  ctx.save();
  const x0 = w * 0.07, y0 = h * 0.03, ww = w * 0.86, hh = h * 0.96, r = h * 0.15;
  ctx.beginPath();
  ctx.roundRect(x0, y0, ww, hh, r);
  const g = ctx.createLinearGradient(0, y0, 0, y0 + hh);
  g.addColorStop(0, '#d2f0ff');
  g.addColorStop(1, '#93cdf1');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.translate(w / 2, h * frame.cy);
  ctx.scale(h * frame.k, h * frame.k);
  drawSofya(ctx, mood, t, sofya, pose);
  ctx.restore();
  // блик стекла
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0, y0, ww, hh, r);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (const [off, bw] of [[0.1, 0.07], [0.2, 0.03]]) {
    ctx.beginPath();
    ctx.moveTo(x0 + ww * off, y0); ctx.lineTo(x0 + ww * (off + bw), y0);
    ctx.lineTo(x0 + ww * (off + bw) - hh * 0.5, y0 + hh); ctx.lineTo(x0 + ww * off - hh * 0.5, y0 + hh);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(x0, y0, ww, hh, r);
  ctx.strokeStyle = 'rgba(255,111,174,0.35)';
  ctx.lineWidth = h * 0.02;
  ctx.stroke();
  ctx.restore();
}

// Только что выбранная вещь: Софья в её карточке радуется и машет рукой
let waving = null;
function animateCard(cv, sofya, frame, until) {
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const step = () => {
    if (!cv.isConnected) return;
    const now = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (now >= until) { portrait(ctx, w, h, sofya, frame); return; }
    portrait(ctx, w, h, sofya, frame, now / 1000, 'happy', 'wave');
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Значок «причёски»: розовая расчёска и кудрявая прядка
function combIcon(cv) {
  const ctx = cv.getContext('2d');
  const k = cv.width / 2;
  ctx.setTransform(k * 0.92, 0, 0, k * 0.92, k * 0.96, k);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // прядка
  ctx.beginPath();
  ctx.moveTo(0.45, -0.75);
  ctx.bezierCurveTo(0.95, -0.45, 0.2, -0.1, 0.62, 0.2);
  ctx.bezierCurveTo(0.95, 0.45, 0.45, 0.75, 0.62, 0.85);
  ctx.strokeStyle = '#6f5538'; ctx.lineWidth = 0.34; ctx.stroke();
  ctx.strokeStyle = '#937452'; ctx.lineWidth = 0.22; ctx.stroke();
  ctx.strokeStyle = '#b8976b'; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.arc(0.6, -0.45, 0.1, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke();
  // расчёска
  ctx.save();
  ctx.translate(-0.18, 0.02);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#ff6fae';
  ctx.strokeStyle = '#d9468b';
  ctx.lineWidth = 0.07;
  ctx.beginPath(); ctx.roundRect(-0.62, -0.42, 1.24, 0.3, 0.14); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.roundRect(-0.53 + i * 0.145, -0.16, 0.08, 0.5, 0.04); ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.roundRect(-0.62, -0.42, 1.24, 0.3, 0.14); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.roundRect(-0.48, -0.36, 0.6, 0.07, 0.035); ctx.fill();
  ctx.restore();
}

function addStyle() {
  if (document.getElementById('sofya-dressup-css')) return;
  const st = document.createElement('style');
  st.id = 'sofya-dressup-css';
  st.textContent = `
.sofya-sep { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; padding: 2px 8px 0; pointer-events: none; }
.sofya-sep:first-child { padding-top: 0; }
.sofya-sep::before, .sofya-sep::after {
  content: ''; flex: 1; height: 6px; border-radius: 3px;
  background: radial-gradient(circle, #ff8cc6 3px, transparent 3.5px) center / 16px 6px space no-repeat;
}
.sofya-sep i {
  font-style: normal; width: 48px; height: 48px; border-radius: 50%; background: #fff;
  display: grid; place-items: center; font-size: 27px; line-height: 1;
  box-shadow: 0 4px 0 rgba(160, 60, 120, 0.22);
}
.sofya-sep i canvas { width: 40px; height: 40px; }`;
  document.head.appendChild(st);
}

export function init(api) {
  addStyle();

  // сундук: показываем Софью с выпавшей вещью
  for (const g of GROUPS) {
    registerCosmetic({
      type: g.type, w: 2, items: g.items,
      owned: (s) => ownedOf(s, g),
      preview: (ctx, w, h, id, save, t) => portrait(ctx, w, h, { ...lookOf(save), [g.key]: id }, g.frame, t || 0.6),
    });
  }

  registerGarageTab({
    id: 'sofya', icon: '👧', order: 10,
    render(box, G) {
      const s = G.save;
      for (const g of GROUPS) {
        const sep = G.el('div', 'sofya-sep', g.icon === 'comb' ? '<i><canvas width="80" height="80"></canvas></i>' : `<i>${g.icon}</i>`);
        if (g.icon === 'comb') combIcon(sep.querySelector('canvas'));
        sep.setAttribute('aria-hidden', 'true');
        box.appendChild(sep);
        G.collection({
          items: g.items,
          isOwned: (id) => ownedOf(s, g).includes(id),
          own: (id) => { const o = ownedOf(s, g); if (!o.includes(id)) o.push(id); },
          isSelected: (id) => (lookOf(s)[g.key] || DEF_LOOK[g.key]) === id,
          select: (id) => { lookOf(s)[g.key] = id; },
          onSelect: (id) => { waving = { key: g.key, id, until: performance.now() + 1700 }; },
          preview: (ctx, w, h, it) => {
            const look = { ...lookOf(s), [g.key]: it.id };
            portrait(ctx, w, h, look, g.frame);
            if (waving && waving.key === g.key && waving.id === it.id && performance.now() < waving.until) {
              animateCard(ctx.canvas, look, g.frame, waving.until);
            }
          },
        });
      }
    },
  });

  // Новый наряд — Софья машет рукой из окна, когда снова поехали
  const sig = () => { const l = lookOf(api.save); return `${l.hair}|${l.outfit}|${l.acc}`; };
  let shown = sig();
  api.on('app:state', (state) => {
    if (state !== 'play') return;
    const now = sig();
    if (now === shown) return;
    shown = now;
    api.world.react({ sofya: 'happy', pose: 'wave' }, 2.2);
  });
}
