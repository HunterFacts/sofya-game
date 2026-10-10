// Прогресс хранится в браузере (localStorage), чтобы продолжать с того же места.
const KEY = 'sofya-car-v1';

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
export function store(save, now = false) {
  clearTimeout(timer);
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* нет места */ } };
  if (now) write(); else timer = setTimeout(write, 300);
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* */ }
}
