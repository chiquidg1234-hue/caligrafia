// Completes a photo font so it can write a whole homework:
//   1. Accents and ñ are added by hand over its own vowels and n.
//   2. Characters the photo does not have come from the other photo font,
//      then from «Mi letra Natural». The report says which ones.
//   node completar.mjs propia.json otra.json salida.json informe.json
import fs from 'fs';
import {area, bounds, map, orient} from './contorno.mjs';
const [ownFile, otherFile, out, reportFile] = process.argv.slice(2);
const own = JSON.parse(fs.readFileSync(ownFile)), other = JSON.parse(fs.readFileSync(otherFile));
const bundle = JSON.parse(fs.readFileSync(new URL('../../outputs/trazo-android/web/personal-letter.json', import.meta.url)));
const natural = bundle.profiles.find(p => p.id === 'personal-natural-v1').samples;
const perimeter = p => p.reduce((t, a, i) => {const b = p[(i + 1) % p.length]; return t + Math.hypot(b[0] - a[0], b[1] - a[1]);}, 0);
const width = ss => {let a = 0, l = 0; for (const s of ss) for (const p of s.paths) {a += Math.abs(area(p)); l += perimeter(p);} return 2 * a / l;};
const pen = Math.max(24, Math.min(60, width(own.samples.filter(s => /[a-z]/.test(s.label)))));
let seed = 11; const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - .5;
// A short pen stroke along a polyline, as a closed outline.
function stroke(points, w = pen) {
  const left = [], right = [];
  points.forEach(([x, y], i) => {
    const [ax, ay] = points[Math.max(0, i - 1)], [bx, by] = points[Math.min(points.length - 1, i + 1)], len = Math.hypot(bx - ax, by - ay) || 1;
    const t = w / 2 * (i === 0 || i === points.length - 1 ? .75 : 1), nx = -(by - ay) / len * t, ny = (bx - ax) / len * t;
    left.push([x + nx, y + ny]); right.unshift([x - nx, y - ny]);
  });
  return [...left, ...right];
}
const acute = (cx, base) => {const dx = 22 + random() * 10, dy = 50 + random() * 14, x = cx + 8 + random() * 14, y = base + 70 + random() * 20; return stroke([[x - dx, y - dy / 2], [x, y + random() * 4], [x + dx, y + dy / 2]]);};
const tilde = (x0, x1, y) => {const n = 9; return stroke(Array.from({length: n}, (_, i) => {const t = i / (n - 1); return [x0 + (x1 - x0) * t, y + 24 * Math.sin(t * 2 * Math.PI + .3) * (1 + random() * .3)];}));};
const round = paths => map(paths, (x, y) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
// Photo lines mix sizes (big capitals, tall t and l): each character keeps its
// shape but its height stays between 0.85 and 1.2 times the one in Natural
// (1.1 for capitals, which the photos write very big, and 1.05 for long tails
// that would push the next line down).
const height = s => {const [lo, hi] = bounds(s.paths); return hi[1] - lo[1];}, median = v => v.sort((a, b) => a - b)[v.length >> 1];
function normalise(list) {
  return [...new Set(list.map(s => s.label))].flatMap(c => {
    const mine = byLabel(list, c), ref = byLabel(natural, c);
    if (!ref.length) return mine;
    const top = /\p{Lu}/u.test(c) ? 1.1 : 'pqgyj'.includes(c) ? 1.05 : 1.2, r = median(mine.map(height)) / median(ref.map(height)), k = r > top ? top / r : r < .85 ? .85 / r : 1;
    if (k === 1) return mine;
    // Descenders keep their body on the x-height; brackets and signs stay centred.
    const y0 = 'pqgyj'.includes(c) ? 300 : '()[]{}|+-=±'.includes(c) ? 250 : 0;
    return mine.map(s => {const [lo] = bounds(s.paths); return {...s, paths: round(map(s.paths, (x, y) => [lo[0] + (x - lo[0]) * k, y0 + (y - y0) * k])), advance: Math.round(s.advance - (1 - k) * (s.advance - 110))};});
  });
}
const byLabel = (list, c) => list.filter(s => s.label === c);
// Tails below the line stay as deep as Natural's (about 270 units), or the
// next line would need a free row under it.
const tails = list => list.map(s => {
  const low = Math.min(...s.paths.flat().map(p => p[1]));
  return 'pqgyj'.includes(s.label) && low < -270 ? {...s, paths: round(map(s.paths, (x, y) => [x, y < 0 ? y * 270 / -low : y]))} : s;
});
own.samples = tails(normalise(own.samples)); other.samples = tails(normalise(other.samples));
const samples = own.samples.map(s => ({...s})), report = {pen: Math.round(pen), derived: {}, fromOther: [], fromNatural: [], missing: []};
const add = (label, paths, advance) => samples.push({id: '', label, char: label, paths: round(orient(paths)), advance: Math.round(advance), baseline: .78});
// Everything Natural writes, minus what this font already has: first from the other photo.
const have = () => new Set(samples.map(s => s.label));
for (const c of [...new Set(natural.map(s => s.label))]) {
  if (have().has(c)) continue;
  const mine = byLabel(other.samples, c);
  if (mine.length) {for (const s of mine.slice(0, 5)) samples.push({...s}); report.fromOther.push(c);}
}
// Periods and colons are just pen dots.
const dot = (x, y) => {const r = pen * .62; return Array.from({length: 9}, (_, k) => {const t = -k / 9 * 2 * Math.PI, q = r * (1 + random() * .25); return [x + q * Math.cos(t), y + q * Math.sin(t)];});};
for (let k = 0; k < 4; k++) {add('.', [dot(70, 30)], 150); add(':', [dot(70, 30), dot(74, 250)], 155);}
for (const [base, accented] of [['a', 'á'], ['e', 'é'], ['o', 'ó'], ['u', 'ú'], ['i', 'í'], ['n', 'ñ']]) {
  if (byLabel(own.samples, accented).length >= 3) continue;
  const list = byLabel(samples, base).slice(0, 5);
  for (const s of list) {
    // The i loses its dot first; the accent goes where the dot was.
    let paths = s.paths;
    if (base === 'i') paths = paths.filter(p => bounds([p])[0][1] < 360);
    const [lo, hi] = bounds(paths), cx = (lo[0] + hi[0]) / 2, h = Math.max(hi[1], 300);
    add(accented, [...paths, base === 'n' ? tilde(lo[0] + 10, hi[0] - 5, h + 90) : acute(cx, h)], s.advance);
  }
  if (list.length) report.derived[accented] = `${base} + ${base === 'n' ? 'virgulilla' : 'tilde'} a mano`;
}
// μ (rozamiento): its own u with a tail down on the left.
for (const u of byLabel(samples, 'u').slice(0, 4)) {
  const [lo, hi] = bounds(u.paths), x = lo[0] + pen * .45 + random() * 6;
  add('μ', [...u.paths, stroke([[x, Math.min(hi[1], 330)], [x - 4 + random() * 6, 120], [x - 10 + random() * 8, -170]])], u.advance);
}
if (byLabel(samples, 'u').length) report.derived['μ'] = 'u + palito hacia abajo';
for (const c of [...new Set(natural.map(s => s.label))]) {
  if (have().has(c)) continue;
  for (const s of byLabel(natural, c).slice(0, 4)) samples.push({...s});
  report.fromNatural.push(c);
}
samples.forEach((s, i) => {s.id = `${own.id}-${i}`;});
fs.writeFileSync(out, JSON.stringify({id: own.id, name: own.name, samples}));
fs.writeFileSync(reportFile, JSON.stringify({own: [...new Set(own.samples.map(s => s.label))].join(''), ...report}, null, 1));
console.log(own.name, samples.length, 'muestras · propias', own.samples.length, '· de la otra foto:', report.fromOther.join(''), '· de Natural:', report.fromNatural.join(''));
