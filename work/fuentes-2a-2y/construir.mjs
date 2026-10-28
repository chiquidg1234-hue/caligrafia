// Glyph masks (muestras.py) -> a Trazo handwriting profile.
//   node construir.mjs muestras.json id "Nombre" salida.json
// Shapes are kept as written («normal, promedio»): only the scale (x-height
// = 340 units, like the other profiles), the baseline of each text line and a
// light smoothing of the photo's pixel edges.
import fs from 'fs';
import {traceMask} from '../../outputs/trazo-android/web/core.mjs';
import {area, bounds, map, orient, smoothClosed} from './contorno.mjs';
const [src, id, name, out] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(src)), s = 340 / data.xheight, groups = new Map();
for (const it of data.items) {
  const bytes = Buffer.from(it.bits, 'base64'), mask = new Uint8Array(it.w * it.h);
  for (let i = 0; i < mask.length; i++) mask[i] = (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  let paths = traceMask(mask, it.w, it.h, .5).map(p => p.map(([x, y]) => [x * s, (it.baseline - y) * s]));
  paths = paths.map(p => smoothClosed(p, 6)).filter(p => p.length >= 3 && Math.abs(area(p)) > 300);
  if (!paths.length) continue;
  // Vertical placement by kind of character (photo lines mix sub- and superscripts).
  const [lo, hi] = bounds(paths), c = it.char, h = hi[1] - lo[1];
  let dy = 0;
  if ('pqgy'.includes(c)) dy = 340 - hi[1];                 // body on the x-height, tail below
  else if (c === 'j') dy = -Math.min(lo[1], 0) - h * .3 - lo[1] + Math.min(lo[1], 0);
  else if (',;'.includes(c)) dy = 90 - hi[1];
  else if ('()[]{}|'.includes(c)) dy = 250 - (lo[1] + hi[1]) / 2;
  else if ('+-=±×·÷~'.includes(c)) dy = 240 - (lo[1] + hi[1]) / 2;
  else dy = -lo[1];                                          // sits on the baseline
  if (c === 'j') dy = 340 - (hi[1] - h * .2) ;
  // A dot the photo lost (pale ink): a small hand-made blob over the stem.
  if (c === 'i' && !paths.some(p => bounds([p])[0][1] + dy > 360)) {
    const cx = (lo[0] + hi[0]) / 2 + 18, cy = 470 - dy, r = 26;
    paths.push(Array.from({length: 10}, (_, k) => {const a = -k / 10 * 2 * Math.PI, q = r * (1 + .18 * Math.sin(3 * a + it.ids[0]));
      return [cx + q * Math.cos(a) * 1.15, cy + q * Math.sin(a)];}));
  }
  const placed = map(orient(paths), (x, y) => [Math.round((x - lo[0] + 45) * 10) / 10, Math.round((y + dy) * 10) / 10]);
  if (!groups.has(it.char)) groups.set(it.char, []);
  groups.get(it.char).push({paths: placed, advance: Math.round(hi[0] - lo[0] + 110), height: hi[1] - lo[1], ids: it.ids});
}
// Up to 8 variants per character: the ones closest to its usual height.
const samples = [], report = {};
for (const [char, list] of groups) {
  const median = list.map(v => v.height).sort((a, b) => a - b)[list.length >> 1];
  const chosen = list.filter(v => Math.abs(v.height / median - 1) < .25).sort((a, b) => Math.abs(a.height / median - 1) - Math.abs(b.height / median - 1)).slice(0, 8);
  report[char] = {found: list.length, kept: chosen.length, components: chosen.map(v => v.ids)};
  chosen.forEach((v, i) => samples.push({id: `${id}-${samples.length}`, label: char, char, paths: v.paths, advance: v.advance, baseline: .78}));
}
fs.writeFileSync(out, JSON.stringify({id, name, samples, report}));
console.log(name, samples.length, 'muestras ·', groups.size, 'caracteres:', [...groups.keys()].sort().join(''));
