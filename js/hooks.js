// Шина событий: новые возможности игры подключаются здесь, не переписывая основной код.
// Ошибка в одной возможности не должна ломать всю игру — поэтому каждый обработчик в try/catch.
//
// Список событий (все координаты «мира» — в метрах, ось Y вниз):
//
// Игровой мир (world.js)
//   'world:start'   (world, L, x)          — заезд начат/перезапущен на уровне L
//   'world:items'   (L, items)             — сгенерированы предметы уровня; можно добавить свои поля в items
//   'world:update'  (world, dt, U, input)  — каждый кадр после физики (только когда игра идёт)
//   'world:level'   (world, e)             — уровень пройден, e = {L, got, total, stars, chest}
//   'world:crash'   (world)                — машина перевернулась (щит не спас)
//
// Отрисовка (render.js), view = {x0, x1, yTop, yBottom, s, W, H, cam, blend}
//   'render:sky'          (ctx, view, t)          — экранные координаты, сразу после неба
//   'render:world-back'   (ctx, world, view, t)   — координаты мира, после земли, до монет
//   'render:world-items'  (ctx, world, view, t)   — координаты мира, вместе с монетками
//   'render:world-front'  (ctx, world, view, t)   — координаты мира, поверх машины и частиц
//   'render:screen'       (ctx, world, view, t)   — экранные координаты, самым верхним слоем
//
// Машина (art.js, drawCar), координаты машины: центр кузова (0,0), вперёд +X, вниз +Y
//   'car:back'      (ctx, car)   — за кузовом (пламя, шлейфы)
//   'car:cargo'     (ctx, car)   — грузовое место (кузов пикапа / багажник): котята и т.п.
//   'car:stickers'  (ctx, car)   — наклейки; ctx уже обрезан по краске кузова (вызывается для кабины и низа)
//   'car:front'     (ctx, car)   — поверх машины (свет фар и т.п.)
//   где car = {state, look, face, vehicle, part}
//
// Интерфейс (main.js)
//   'app:init'      (api)                   — всё готово, можно регистрировать кнопки и экраны
//   'app:state'     (state, api)            — смена экрана: menu | play | pause | crash
//   'app:frame'     (dt, api)               — каждый кадр (любой экран)
//   'app:levelDone' (e, api)                — после награды за уровень (e как в 'world:level')
//   'hud:update'    (world, hud)            — после обновления HUD, hud = {fill, dot, level}
//   'menu:tap'      (x, y, api)             — тап по картинке в меню (экранные координаты)

const handlers = new Map();

export function on(name, fn) {
  if (!handlers.has(name)) handlers.set(name, []);
  handlers.get(name).push(fn);
  return () => off(name, fn);
}

export function off(name, fn) {
  const list = handlers.get(name);
  if (!list) return;
  const i = list.indexOf(fn);
  if (i >= 0) list.splice(i, 1);
}

export function emit(name, ...args) {
  const list = handlers.get(name);
  if (!list) return;
  for (const fn of list.slice()) {
    try { fn(...args); } catch (e) { console.error(`[${name}]`, e); }
  }
}

export const has = (name) => !!(handlers.get(name) && handlers.get(name).length);
