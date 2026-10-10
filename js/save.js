// Прогресс хранится в браузере (localStorage), чтобы продолжать с того же места.
export const KEY = 'sofya-car-v1';

const BASE = () => ({
  v: 1,
  coins: 0,
  level: 0,          // текущий уровень (с него продолжаем и с него начинаем после аварии)
  maxLevel: 0,       // самый дальний открытый уровень
  stars: {},         // уровень → звёзды
  up: { engine: 0, grip: 0, balance: 0, turbo: 0, magnet: 0 },
  inv: { turbo: 1, magnet: 1, shield: 1 },
  chests: [],        // неоткрытые сундуки: 'wood' | 'silver' | 'gold'
  look: { paint: 'pink', animal: 'marissa', hat: 'none', vehicle: 'pickup', sofya: { hair: 'long', outfit: 'pink', acc: 'heart' } },
  owned: { paint: ['pink'], animal: ['marissa'], hat: ['none', 'bow'], vehicle: ['pickup'] },
  music: true,
  sound: true,
  run: null,         // {L, x, taken:[]} — место, где остановились
  seen: {},          // одноразовые подсказки
  t: 0,              // время последней записи (чтобы старая вкладка не затёрла свежий прогресс)
});

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Новые возможности добавляют свои поля сохранения (до первой загрузки — при импорте модуля).
// Пустой объект {} = свободный словарь (сохраняются любые ключи), как stars и seen.
const extra = {};
export function addDefaults(obj) { deepAssign(extra, obj); }
function deepAssign(dst, src) {
  for (const k of Object.keys(src)) {
    if (isObj(src[k]) && Object.keys(src[k]).length && isObj(dst[k])) deepAssign(dst[k], src[k]);
    else dst[k] = structuredClone(src[k]);
  }
  return dst;
}
const DEFAULT = () => deepAssign(BASE(), structuredClone(extra));

function merge(base, data) {
  for (const k of Object.keys(base)) {
    if (data[k] === undefined) continue;
    if (isObj(base[k]) && isObj(data[k])) {
      base[k] = Object.keys(base[k]).length ? merge(base[k], data[k]) : { ...data[k] };
    } else if (Array.isArray(base[k]) && !Array.isArray(data[k])) {
      continue; // испорченное поле — оставляем значение по умолчанию
    } else base[k] = data[k];
  }
  // поля, о которых эта версия не знает (сохранены более новой), не теряем
  for (const k of Object.keys(data)) if (!(k in base)) base[k] = data[k];
  return base;
}

// Старая версия игры, оставшаяся открытой в другой вкладке, при записи выбрасывает новые поля
// (котята, домик, наклейки…). Копия в отдельном ключе позволяет вернуть их.
function restoreDropped(data) {
  try {
    const x = JSON.parse(localStorage.getItem(KEY + '-x') || 'null');
    if (!isObj(x)) return data;
    for (const k of Object.keys(x)) {
      if (data[k] === undefined) data[k] = x[k];
      else if (isObj(data[k]) && isObj(x[k]) && (k === 'owned' || k === 'look')) {
        for (const kk of Object.keys(x[k])) if (data[k][kk] === undefined) data[k][kk] = x[k][kk];
      }
    }
  } catch (e) { /* нет копии */ }
  return data;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(DEFAULT(), restoreDropped(JSON.parse(raw)));
  } catch (e) { /* приватный режим или испорченные данные */ }
  return DEFAULT();
}

let timer = 0;
let onConflict = null;
// Вызывается, если другая копия игры (вкладка, иконка) уже записала более свежий прогресс
export function setConflictHandler(fn) { onConflict = fn; }
// отменить отложенную запись (прогресс только что заменён более свежим из другой копии)
export function cancelStore() { clearTimeout(timer); }

// force — осознанная перезапись (сброс, перенос прогресса): без проверки на «более свежий» прогресс
export function store(save, now = false, force = false) {
  clearTimeout(timer);
  const write = () => {
    if (!force) {
      try {
        const raw = localStorage.getItem(KEY);
        const stored = raw ? JSON.parse(raw).t || 0 : 0;
        if (stored > (save.t || 0)) { if (onConflict) onConflict(); return; }
      } catch (e) { /* испорченные данные — просто перезапишем */ }
    }
    save.t = Math.max(Date.now(), (save.t || 0) + 1);
    try {
      const json = JSON.stringify(save);
      localStorage.setItem(KEY, json);
      localStorage.setItem(KEY + '-x', json);
    } catch (e) { /* нет места */ }
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

// Чистое сохранение «как в первый раз» (для сброса прогресса)
export function freshSave() { return DEFAULT(); }
