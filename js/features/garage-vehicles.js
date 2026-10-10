// Вкладка гаража «Машины»: пикап, школьный автобус, фургон с мороженым, машина-единорог, ракета.
// Машины покупают только за монеты (из сундуков не выпадают). Выбранная машина — save.look.vehicle,
// купленные — save.owned.vehicle; при закрытии гаража main.js пересаживает Софью в новую машину.
import { registerGarageTab, registerCosmetic } from '../ui.js';
import { Renderer } from '../render.js';
import { VEHICLES } from '../vehicles.js';

const preview = (ctx, w, h, id, save, t = 0.5) => Renderer.drawPreview(ctx, w, h, { ...save.look, vehicle: id }, 'happy', t);

// «Привет» от машины при выборе: короткая мелодия-гудок у каждой своя
const HELLO = {
  pickup: [[523, 0, 0.12], [659, 0.13, 0.16]],
  bus: [[392, 0, 0.13], [392, 0.17, 0.2]],
  icecream: [[784, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.25]],
  unicorn: [[1047, 0, 0.1], [1319, 0.08, 0.1], [1568, 0.16, 0.1], [2093, 0.24, 0.22]],
};
function hello(sound, id) {
  if (!sound || !sound.tone) return;
  if (id === 'rocket') {
    sound.tone(180, 0.45, 'sawtooth', 0.04, 0.05, undefined, 900);
    sound.noise(0.45, 0.12, 400, 2500, 0.05);
    return;
  }
  for (const [f, when, dur] of HELLO[id] || HELLO.pickup) sound.tone(f, dur, 'triangle', 0.13, when + 0.15);
}

export function init(api) {
  // Машины не выпадают из сундуков: rare: 0
  registerCosmetic({ type: 'vehicle', w: 1, rare: 0, items: VEHICLES, owned: (s) => s.owned.vehicle, preview });

  registerGarageTab({
    id: 'vehicles',
    icon: '🚗',
    order: 20,
    render(box, G) {
      const s = G.save;
      if (!Array.isArray(s.owned.vehicle)) s.owned.vehicle = ['pickup'];
      if (!s.owned.vehicle.includes('pickup')) s.owned.vehicle.unshift('pickup');
      G.collection({
        items: VEHICLES,
        isOwned: (id) => s.owned.vehicle.includes(id),
        own: (id) => { if (!s.owned.vehicle.includes(id)) s.owned.vehicle.push(id); },
        isSelected: (id) => (s.look.vehicle || 'pickup') === id,
        select: (id) => { s.look.vehicle = id; },
        onSelect: (id) => hello(G.sound, id),
        preview: (ctx, w, h, it) => preview(ctx, w, h, it.id, s),
      });
    },
  });
}
