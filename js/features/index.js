// Подключение новых возможностей игры. Каждая — отдельный файл с функцией init(api).
// api описан в js/main.js (раздел «API для новых возможностей»), события — в js/hooks.js.
import * as kittens from './kittens.js';
import * as house from './house.js';
import * as dressup from './dressup.js';
import * as garageVehicles from './garage-vehicles.js';
import * as flips from './flips.js';
import * as horn from './horn.js';
import * as weather from './weather.js';
import * as bonus from './bonus.js';
import * as daily from './daily.js';
import * as stickers from './stickers.js';
import * as photo from './photo.js';
import * as animalsExtra from './animals-extra.js';

const FEATURES = { animalsExtra, kittens, house, dressup, garageVehicles, flips, horn, weather, bonus, daily, stickers, photo };

export function initFeatures(api) {
  for (const [name, f] of Object.entries(FEATURES)) {
    try { if (f.init) f.init(api); } catch (e) { console.error(`feature ${name}:`, e); }
  }
}
