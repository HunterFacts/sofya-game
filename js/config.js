// Все настройки игры в одном месте: физика, уровни, улучшения, косметика.

export const PHYS = {
  dt: 1 / 480,          // шаг физики (сек)
  g: 18,                // гравитация (м/с²), ось Y направлена вниз
  wheelMass: 1.1,       // масса колеса радиусом 0.5 м (размеры машины — в vehicles.js)
  kSusp: 900, cSusp: 45,
  kSide: 9000, cSide: 160,
  kStop: 25000, cStop: 220,
  reaction: 0.4,        // реактивный момент мотора на кузов
  brake: 45,
  revSpeed: 5,
};

// ---------- Улучшения ----------
export const UPGRADES = [
  { id: 'engine', icon: '🚀', name: 'Скорость', base: 80 },
  { id: 'grip', icon: '🛞', name: 'Колёса', base: 70 },
  { id: 'balance', icon: '🤸', name: 'Равновесие', base: 60 },
  { id: 'turbo', icon: '⚡', name: 'Турбо', base: 90 },
  { id: 'magnet', icon: '🧲', name: 'Магнит', base: 90 },
];
export const MAX_UP = 10;
export const upgradePrice = (u, lvl) => Math.round(u.base * Math.pow(1.45, lvl) / 5) * 5;

export function carParams(up, g, mult = { torque: 1, speed: 1, grip: 1, air: 1 }) {
  const e = up.engine, gr = up.grip, b = up.balance;
  return {
    g,
    torque: (16 + 3.2 * e) * mult.torque,
    maxSpeed: (11 + 1.5 * e) * mult.speed,
    grip: (1.05 + 0.09 * gr) * mult.grip,
    airTorque: (4 + 0.9 * b) * mult.air,
    assist: 1.6 + 0.8 * b,
    kSusp: PHYS.kSusp,
    turboForce: 85 + 10 * up.turbo,
    turboTime: 3 + 0.4 * up.turbo,
    magnetTime: 8 + 1 * up.magnet,
    magnetRange: 5.5 + 0.5 * up.magnet,
    shieldTime: 25,
    turbo: false,
  };
}

// ---------- Ускорялки ----------
export const BOOSTERS = [
  { id: 'turbo', icon: '⚡', price: 40 },
  { id: 'magnet', icon: '🧲', price: 40 },
  { id: 'shield', icon: '🛡️', price: 60 },
];

// ---------- Миры ----------
export const BIOMES = [
  {
    id: 'meadow', sky: ['#6ec3ff', '#d9f2ff'], far: '#a5d8a0', near: '#7fc777',
    top: '#5ecf3e', topLight: '#8be86a', soil: '#b77d47', soilDark: '#8a5a31', dust: '#cfae7c',
    deco: ['tree', 'flower', 'flower', 'bush', 'flower', 'rock', 'tree'], amp: 1, wl: 1, bump: 1, gravity: 1,
  },
  {
    id: 'candy', sky: ['#ff9fd6', '#ffe7f5'], far: '#ffc1e3', near: '#ff9bd0',
    top: '#ff6fb7', topLight: '#ffb3dc', soil: '#9c5a3c', soilDark: '#7a4029', dust: '#ffc6e3',
    deco: ['lollipop', 'cane', 'cupcake', 'lollipop', 'heart'], amp: 0.95, wl: 0.9, bump: 1.4, gravity: 1,
  },
  {
    id: 'desert', sky: ['#ffc56e', '#fff0c8'], far: '#f3c983', near: '#ebb466',
    top: '#f6d37c', topLight: '#fde6a6', soil: '#e2a659', soilDark: '#c8873f', dust: '#f1d39a',
    deco: ['cactus', 'rock', 'cactus', 'palm'], amp: 1.15, wl: 1.3, bump: 0.5, gravity: 1,
  },
  {
    id: 'snow', sky: ['#8fcaff', '#eef8ff'], far: '#dcecfa', near: '#c3dcf2',
    top: '#ffffff', topLight: '#ffffff', soil: '#b5cfe6', soilDark: '#8fb1d1', dust: '#ffffff',
    deco: ['pine', 'snowman', 'pine', 'pine'], amp: 1, wl: 1, bump: 0.8, gravity: 1,
  },
  {
    id: 'autumn', sky: ['#ffb27a', '#ffe7cf'], far: '#e9a66a', near: '#d98d4d',
    top: '#f2a03a', topLight: '#ffc36b', soil: '#8f5a2c', soilDark: '#6d421e', dust: '#e5b47a',
    deco: ['atree', 'mushroom', 'pumpkin', 'atree', 'atree'], amp: 1.1, wl: 1, bump: 1.1, gravity: 1,
  },
  {
    id: 'moon', sky: ['#0d1240', '#2f3680'], far: '#3c4178', near: '#565c98',
    top: '#d3d3e2', topLight: '#f0f0fa', soil: '#9898ad', soilDark: '#76768c', dust: '#e2e2ee',
    deco: ['crater', 'rocket', 'crater', 'moonrock'], amp: 1.4, wl: 1.1, bump: 0.9, gravity: 0.55, night: true,
  },
  {
    id: 'beach', sky: ['#5bc8ff', '#e3f7ff'], far: '#4aa8e8', near: '#f5dc9b', sea: true,
    top: '#ffe7a3', topLight: '#fff3cc', soil: '#e9c27a', soilDark: '#d1a35a', dust: '#fff0c4',
    deco: ['palm', 'shell', 'umbrella', 'palm', 'starfish'], amp: 0.85, wl: 1.1, bump: 0.6, gravity: 1,
  },
];

// ---------- Косметика ----------
export const PAINTS = [
  { id: 'pink', body: '#ff6fae', dark: '#d9468b', light: '#ffb0d2', price: 0 },
  { id: 'lilac', body: '#b98cff', dark: '#8d5fe0', light: '#dcc6ff', price: 150 },
  { id: 'mint', body: '#46d3b0', dark: '#23a587', light: '#a6f0dc', price: 150 },
  { id: 'sky', body: '#4fb3ff', dark: '#2a86d6', light: '#a9dbff', price: 150 },
  { id: 'sun', body: '#ffc83a', dark: '#e09a12', light: '#ffe79c', price: 200 },
  { id: 'red', body: '#ff5252', dark: '#d42f3a', light: '#ffa1a1', price: 200 },
  { id: 'white', body: '#f6f3fb', dark: '#c8c1d8', light: '#ffffff', price: 250 },
  { id: 'hearts', body: '#ff7fbf', dark: '#de4f96', light: '#ffc2e0', pattern: 'hearts', price: 400 },
  { id: 'stars', body: '#7a5cff', dark: '#5236d1', light: '#b6a6ff', pattern: 'stars', price: 450 },
  { id: 'rainbow', body: '#ff6fae', dark: '#c8478c', light: '#ffffff', pattern: 'rainbow', price: 700 },
  { id: 'gold', body: '#f6c544', dark: '#c3901b', light: '#fff1b8', pattern: 'shine', price: 900 },
];

export const ANIMALS = [
  { id: 'marissa', name: 'Марисса', price: 0 },
  { id: 'dog', name: 'Собачка', price: 400 },
  { id: 'bunny', name: 'Зайка', price: 500 },
  { id: 'panda', name: 'Панда', price: 600 },
  { id: 'fox', name: 'Лисичка', price: 700 },
  { id: 'bear', name: 'Мишка', price: 800 },
  { id: 'penguin', name: 'Пингвин', price: 900 },
  { id: 'unicorn', name: 'Единорог', price: 1500 },
];

export const HATS = [
  { id: 'none', price: 0 },
  { id: 'bow', price: 150 },
  { id: 'flower', price: 200 },
  { id: 'party', price: 250 },
  { id: 'cap', price: 300 },
  { id: 'glasses', price: 350 },
  { id: 'headphones', price: 400 },
  { id: 'crown', price: 600 },
  { id: 'tiara', price: 700 },
];

// ---------- Сундуки ----------
export const CHESTS = {
  wood: { coins: [30, 60], boosters: 1, cosmetic: 0.1 },
  silver: { coins: [70, 130], boosters: 2, cosmetic: 0.35 },
  gold: { coins: [160, 260], boosters: 3, cosmetic: 1 },
};
// Сундук за уровень L (0-based)
export const chestForLevel = (L) => (L % 5 === 4 ? 'gold' : L % 2 === 1 ? 'silver' : 'wood');
