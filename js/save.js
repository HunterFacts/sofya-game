// Прогресс хранится в браузере (localStorage), чтобы продолжать с того же места.
export const KEY = 'sofya-car-v1';

const DEFAULT = () => ({
  v: 1,
  coins: 0,
  level: 0,          // текущий уровень (с него продолжаем и с него начинаем после аварии)
  maxLevel: 0,       // самый дальний открытый уровень
  stars: {},         // уровень → звёзды
  up: { engine: 0, grip: 0, balance: 0, turbo: 0, magnet: 0 },
  inv: { turbo: 1, magnet: 1, shield: 1 },
  chests: [],        // неоткрытые сундуки: 'wood' | 'silver' | 'gold'
  look: { paint: 'pink', animal: 'marissa', hat: 'none' },
  owned: { paint: ['pink'], animal: ['marissa'], hat: ['none', 'bow'] },
  music: true,
  sound: true,
  run: null,         // {L, x, taken:[]} — место, где остановились
  seen: {},          // одноразовые подсказки
  t: 0,              // время последней записи (чтобы старая вкладка не затёрла свежий прогресс)
});

function merge(base, data) {
  for (const k of Object.keys(base)) {
    if (data[k] === undefined) continue;
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && data[k] && typeof data[k] === 'object') {
      base[k] = merge(base[k], data[k]);
      if (k === 'stars' || k === 'seen') base[k] = { ...data[k] };
    } else base[k] = data[k];
  }
  return base;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(DEFAULT(), JSON.parse(raw));
  } catch (e) { /* приватный режим или испорченные данные */ }
  return DEFAULT();
}

let timer = 0;
let onConflict = null;
// Вызывается, если другая копия игры (вкладка, иконка) уже записала более свежий прогресс
export function setConflictHandler(fn) { onConflict = fn; }

export function store(save, now = false) {
  clearTimeout(timer);
  const write = () => {
    try {
      const raw = localStorage.getItem(KEY);
      const stored = raw ? JSON.parse(raw).t || 0 : 0;
      if (stored > (save.t || 0)) { if (onConflict) onConflict(); return; }
    } catch (e) { /* испорченные данные — просто перезапишем */ }
    save.t = Math.max(Date.now(), (save.t || 0) + 1);
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* нет места */ }
  };
  if (now) write(); else timer = setTimeout(write, 300);
}

// Подменить содержимое объекта сохранения (ссылки на него в гараже и сундуках остаются рабочими)
export function replaceSave(save, fresh) {
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, fresh);
}

// Можно ли вообще сохранять (приватный режим, запрет cookie, встроенные браузеры)
export function storageOK() {
  try {
    localStorage.setItem(KEY + '-test', '1');
    localStorage.removeItem(KEY + '-test');
    return true;
  } catch (e) { return false; }
}

// Код для переноса прогресса (например, из Safari в игру с иконки на iPhone)
const CODE_PREFIX = 'SOFYA1:';
export function exportCode(save) {
  const bytes = new TextEncoder().encode(JSON.stringify(save));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return CODE_PREFIX + btoa(bin);
}
export function parseCode(text) {
  const m = /SOFYA1:([A-Za-z0-9+/=]+)/.exec(String(text || '').replace(/\s+/g, ''));
  if (!m) return null;
  try {
    const bin = atob(m[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || typeof data.coins !== 'number') return null;
    return merge(DEFAULT(), data);
  } catch (e) { return null; }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* */ }
}
