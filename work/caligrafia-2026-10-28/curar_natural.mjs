// Builds «Mi letra Natural»: 2–3 visually reviewed variants per letter, the same
// moderate normalisation as Uniforme, smoothed ink edges, lighter signs and a
// few symbols assembled only from the user's own strokes. Never edits the
// Original, Optimizada or Uniforme profiles.
//
//   node curar_natural.mjs            -> writes bundle + report
//   node curar_natural.mjs --dry-run  -> report only
import fs from 'fs';
import {traceMask} from '../../outputs/trazo-android/web/core.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const HERE = new URL('./', import.meta.url).pathname;
const SOURCE = ROOT + 'work/caligrafia-2026-10-21/bundled-letter.json';
const TARGETS = ['outputs/trazo-android/web/personal-letter.json', 'outputs/trazo-android/dist/personal-letter.json', 'work/caligrafia-2026-10-21/bundled-letter.json'];
const PROFILE = {id: 'personal-natural-v1', name: 'Mi letra Natural'};

// 1-based positions inside each Optimizada group (same numbering as the
// Uniforme contact sheets). The first one is the Uniforme choice.
const VARIANTS = {
  A:[2,3,5], a:[2,1,5], B:[4,2,5], b:[2,5,6], C:[2,5,6], c:[2,1,5], D:[3,5], d:[2,3,5],
  E:[1,3], e:[2,1,4], F:[3,1], f:[4,2,5], G:[1,3,5], g:[3,4,6], H:[3,1], h:[2,3,6],
  I:[2,3,4], i:[2,1,3], J:[3,2,6], j:[5,2,3], K:[5,2,6], k:[1,3], L:[3,2,4], l:[5,4,2],
  m:[2,1,5], M:[4,1,3], N:[3,2,4], n:[2,5,6], 'Ñ':[1,3], 'ñ':[2,1,5], O:[3,6], o:[1,4,6],
  P:[3], Q:[2,1,4], q:[3,2], p:[5,1,6], R:[2,6], r:[1,5,6], S:[2,1,3], s:[1,2,4],
  T:[3,5], t:[4,1,5], U:[1,2,5], u:[2,5,6], V:[3,2,5], W:[4,2,3], v:[1,2,4], w:[6,2,3],
  X:[3,4], x:[4,2,3], Y:[4,1,2], y:[5,2,3], Z:[6,1], z:[4,3,1],
  0:[1,2], 1:[1], 2:[1,2], 3:[2,1], 4:[2,1], 5:[2,1], 6:[2,1], 7:[2,1], 9:[2,1],
};
const STEMS = {B:'left',D:'left',E:'left',F:'left',H:'left',K:'left',L:'left',M:'left',N:'left',P:'left',R:'left',b:'left',
  h:'left',k:'left',l:'center',I:'center',i:'center',t:'center',d:'right',j:'right',p:'left',q:'right'};
const ACCENTED = 'ÁÉÍÓÚÜáéíóúüñÑ';
const SMOOTH = 7;          // Gaussian sigma in font units: removes photo pixel bumps, keeps the hand.
const SIGN_WIDTH = 44;     // target stroke width for punctuation and symbols.

// ---------- geometry ----------
const area = p => {let a = 0; for (let i = 0; i < p.length; i++) {const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1];} return a / 2;};
const perimeter = p => p.reduce((t, a, i) => {const b = p[(i + 1) % p.length]; return t + Math.hypot(b[0] - a[0], b[1] - a[1]);}, 0);
function bounds(paths) {let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity]; for (const p of paths) for (const [x, y] of p) {lo = [Math.min(lo[0], x), Math.min(lo[1], y)]; hi = [Math.max(hi[0], x), Math.max(hi[1], y)];} return [lo, hi];}
const map = (paths, f) => paths.map(p => p.map(([x, y]) => f(x, y)));
const strokeWidth = paths => 2 * Math.abs(paths.reduce((t, p) => t + area(p), 0)) / paths.reduce((t, p) => t + perimeter(p), 0);
const body = paths => [paths.reduce((a, b) => Math.abs(area(b)) > Math.abs(area(a)) ? b : a)];
function lowerBody(paths) {const [lo] = bounds(paths); return body(paths.filter(p => bounds([p])[0][1] < lo[1] + 80));}
function inside([x, y], poly) {let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;} return c;}
// Outer contours negative (as the letters), holes positive, so overlapping
// pieces of formulas join under the non-zero fill rule instead of cancelling.
function orient(paths) {
  return paths.map((p, i) => {const depth = paths.filter((q, j) => j !== i && Math.abs(area(q)) > Math.abs(area(p)) && inside(p[0], q)).length; const want = depth % 2 ? 1 : -1; return Math.sign(area(p)) === want ? p : [...p].reverse();});
}

function raster(paths, pad = 6) {
  const [lo, hi] = bounds(paths), w = Math.ceil(hi[0] - lo[0]) + 2 * pad, h = Math.ceil(hi[1] - lo[1]) + 2 * pad, mask = new Uint8Array(w * h);
  for (let row = 0; row < h; row++) {
    const y = hi[1] + pad - row - .5, xs = [];
    for (const p of paths) for (let i = 0; i < p.length; i++) {const a = p[i], b = p[(i + 1) % p.length]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));}
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let col = Math.max(0, Math.ceil(xs[k] - lo[0] + pad - .5)); col < Math.min(w, xs[k + 1] - lo[0] + pad - .5); col++) mask[row * w + col] = 1;
  }
  return {mask, w, h, x0: lo[0] - pad, y1: hi[1] + pad};
}
function erode({mask, w, h, ...rest}, radius) {
  const d = new Float32Array(w * h).fill(1e9);
  for (let i = 0; i < d.length; i++) if (!mask[i]) d[i] = 0;
  const pass = (y, x, dy, dx, c) => {const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w) d[y * w + x] = Math.min(d[y * w + x], d[yy * w + xx] + c);};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {pass(y, x, -1, 0, 1); pass(y, x, 0, -1, 1); pass(y, x, -1, -1, 1.4142); pass(y, x, -1, 1, 1.4142);}
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {pass(y, x, 1, 0, 1); pass(y, x, 0, 1, 1); pass(y, x, 1, 1, 1.4142); pass(y, x, 1, -1, 1.4142);}
  const out = new Uint8Array(w * h); for (let i = 0; i < out.length; i++) out[i] = d[i] > radius ? 1 : 0;
  return {mask: out, w, h, ...rest};
}
const vectorise = r => traceMask(r.mask, r.w, r.h, .5).map(p => p.map(([x, y]) => [x + r.x0, r.y1 - y]));

function smoothClosed(p, sigma) {
  // Uniform resampling, then a circular Gaussian filter along the contour.
  const total = perimeter(p), n = Math.max(12, Math.round(total / 3)), step = total / n, pts = [];
  for (let i = 0, acc = 0, k = 0; i < p.length && k < n; i++) {
    const a = p[i], b = p[(i + 1) % p.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (k < n && k * step <= acc + len) {const t = len ? (k * step - acc) / len : 0; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); k++;}
    acc += len;
  }
  const m = pts.length, s = sigma / step, r = Math.min(Math.ceil(3 * s), m >> 1), wts = Array.from({length: 2 * r + 1}, (_, i) => Math.exp(-((i - r) ** 2) / (2 * s * s))), sum = wts.reduce((a, b) => a + b, 0);
  const out = pts.map((_, i) => {let x = 0, y = 0; for (let k = -r; k <= r; k++) {const q = pts[((i + k) % m + m) % m]; x += q[0] * wts[k + r]; y += q[1] * wts[k + r];} return [x / sum, y / sum];});
  return simplify(out, .6);
}
function simplify(p, tol) {
  const keep = new Uint8Array(p.length), far = p.reduce((b, q, i) => Math.hypot(q[0] - p[0][0], q[1] - p[0][1]) > Math.hypot(p[b][0] - p[0][0], p[b][1] - p[0][1]) ? i : b, 0);
  const dp = (a, b) => {let best = tol, idx = -1; const [ax, ay] = p[a], [bx, by] = p[b % p.length]; for (let i = a + 1; i < b; i++) {const [x, y] = p[i % p.length], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, d = Math.abs((x - ax) * dy - (y - ay) * dx) / len; if (d > best) {best = d; idx = i;}} if (idx >= 0) {keep[idx % p.length] = 1; dp(a, idx); dp(idx, b);}};
  keep[0] = keep[far] = 1; dp(0, far); dp(far, p.length);
  return p.filter((_, i) => keep[i]).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}
const smooth = paths => paths.map(p => smoothClosed(p, Math.abs(area(p)) < 2500 ? SMOOTH * .6 : SMOOTH)).filter(p => p.length >= 3 && Math.abs(area(p)) > 40);

function stemSlope(paths, side) {
  const [lo, hi] = bounds(lowerBody(paths)), r = raster(paths, 2), height = hi[1] - lo[1], xy = [];
  for (let y = Math.max(2, height * .3); y < height * .82; y += 3) {
    const row = Math.round(r.y1 - (lo[1] + y)); if (row < 0 || row >= r.h) continue;
    const xs = []; for (let c = 0; c < r.w; c++) if (r.mask[row * r.w + c]) xs.push(c);
    if (!xs.length) continue;
    xs.sort((a, b) => a - b);
    xy.push([y, side === 'left' ? xs[0] : side === 'right' ? xs.at(-1) : xs[xs.length >> 1]]);
  }
  const slopes = []; for (let i = 0; i < xy.length; i++) for (let j = i + 1; j < xy.length; j++) if (xy[j][0] - xy[i][0] > height * .2) slopes.push((xy[j][1] - xy[i][1]) / (xy[j][0] - xy[i][0]));
  slopes.sort((a, b) => a - b); return slopes.length ? slopes[slopes.length >> 1] : 0;
}
// Same rules as curar_uniforme.py transform(), ported for the extra variants.
function normalise(char, paths) {
  const [lo, hi] = bounds(paths), [blo, bhi] = bounds(lowerBody(paths)); let sy = 1, dy = 0, deskew = 0;
  const isLetter = /\p{L}/u.test(char), base = char.normalize('NFD')[0];
  if (isLetter) {
    let current, target;
    if ('gpq'.includes(char)) {
      const outer = body(paths)[0], sgn = Math.sign(area(outer)), counters = paths.filter(p => area(p) * sgn < 0);
      const counter = counters.reduce((a, b) => Math.abs(area(b)) > Math.abs(area(a)) ? b : a);
      dy = bounds([counter])[0][1] - 45; current = hi[1] - dy; target = 340;
    } else if ('jy'.includes(char)) {current = hi[1]; target = 340;}
    else {dy = blo[1]; current = bhi[1] - blo[1]; target = char === char.toUpperCase() || 'bdfhkl'.includes(base) ? 510 : base === 't' ? 470 : base === 'i' ? 300 : 340;}
    const limit = char === 'ü' ? .35 : ACCENTED.includes(char) ? .2 : .12;
    sy = Math.min(1 + limit, Math.max(1 - limit, target / Math.max(current, 1)));
  } else if (/\d/.test(char)) {dy = lo[1]; sy = Math.min(1.12, Math.max(.88, 470 / (hi[1] - lo[1])));}
  if (STEMS[char]) {deskew = Math.min(.085, Math.max(-.085, -stemSlope(paths, STEMS[char]))); if (Math.abs(deskew) < .018) deskew = 0;}
  return map(paths, (x, y) => [x + deskew * (y - dy), (y - dy) * sy]);
}
function place(paths, lsb = 45, rsb = 65) {const [lo, hi] = bounds(paths), dx = lsb - lo[0]; return {paths: map(paths, (x, y) => [Math.round((x + dx) * 10) / 10, Math.round(y * 10) / 10]), advance: Math.round(hi[0] + dx + rsb)};}
function fit(paths, {height, width, bottom, centerY}) {
  const [lo, hi] = bounds(paths), s = height ? height / (hi[1] - lo[1]) : width / (hi[0] - lo[0]), cy = (lo[1] + hi[1]) / 2;
  return map(paths, (x, y) => [(x - lo[0]) * s, centerY !== undefined ? (y - cy) * s + centerY : (y - lo[1]) * s + bottom]);
}
const shift = (paths, dx, dy) => map(paths, (x, y) => [x + dx, y + dy]);
// Horizontal strokes keep their thickness when only their length changes.
function stretch(paths, width, centerY) {const [lo, hi] = bounds(paths), s = width / (hi[0] - lo[0]), cy = (lo[1] + hi[1]) / 2; return map(paths, (x, y) => [(x - lo[0]) * s, y - cy + centerY]);}
function lighten(paths) {
  const w = strokeWidth(paths); if (w <= SIGN_WIDTH + 2) return paths;
  return vectorise(erode(raster(paths), (w - SIGN_WIDTH) / 2));
}

// ---------- build ----------
const bundle = JSON.parse(fs.readFileSync(SOURCE));
const get = id => bundle.profiles.find(p => p.id === id).samples;
const groups = new Map(); for (const s of get('personal-optimizada-v1')) {if (!groups.has(s.label)) groups.set(s.label, []); groups.get(s.label).push(s);}
const uniform = new Map(get('personal-uniforme-v1').map(s => [s.label, s]));
const report = {profile: PROFILE, generated: 'work/caligrafia-2026-10-28/curar_natural.mjs', smoothingSigmaUnits: SMOOTH, signStrokeWidthTarget: SIGN_WIDTH, characters: {}, derived: {}, limits: []};
const out = [];
const add = (label, paths, note, extra = {}) => {const placed = place(orient(paths)); out.push({id: `${PROFILE.id}-${out.length}`, label, char: label, ...placed, baseline: .78}); (report.characters[label] ||= []).push({note, ...extra});};

for (const [label, ss] of groups) {
  const picks = VARIANTS[label];
  if (picks) {
    for (const n of picks) {
      const s = ss[n - 1];
      let paths = smooth(n === picks[0] ? uniform.get(label).paths : normalise(label, s.paths));
      if (label === 'j') {
        // The recovered j has no dot: borrow the dot of the user's own i.
        const i = uniform.get('i').paths, dot = i.reduce((a, b) => Math.abs(area(b)) < Math.abs(area(a)) ? b : a);
        const [dlo, dhi] = bounds([dot]), top = paths.flat().reduce((a, b) => b[1] > a[1] ? b : a);
        paths = [...paths, ...smooth(shift([dot], top[0] - (dlo[0] + dhi[0]) / 2 + 10, 400 - dlo[1]))];
      }
      add(label, paths, n === picks[0] ? 'forma de Uniforme' : 'variante alternativa revisada', {variant: n, sourceId: s.id, strokeWidth: Math.round(strokeWidth(paths))});
    }
  } else {
    // Single-sample characters (accents, signs): start from the Uniforme shape.
    let paths = uniform.get(label).paths;
    if (label === 'ü') paths = normalise('ü', paths);
    if (!/[\p{L}\d]/u.test(label)) paths = lighten(paths);
    if (label === '-') paths = stretch(paths, 330, 240);
    if (label === '²' || label === '³') paths = fit(paths, {height: 250, bottom: 330});
    add(label, smooth(paths), 'forma única', {strokeWidth: Math.round(strokeWidth(paths))});
  }
}
for (const label of uniform.keys()) if (!out.some(s => s.label === label)) throw Error('Falta ' + label);

// Symbols assembled from the user's own strokes. Each records its parts.
const U = l => out.find(s => s.label === l).paths;
const comp = (paths, n) => {const sorted = [...paths].sort((a, b) => bounds([a])[0][0] - bounds([b])[0][0]); return [sorted[n]];};
const left = fit(comp(U('«'), 0), {height: 280, centerY: 240}), right = fit(comp(U('»'), 1), {height: 280, centerY: 240});
const bar = width => stretch(U('-'), width, 0);
const derive = (label, paths, parts) => {add(label, smooth(paths), 'derivado de tus trazos', {parts}); report.derived[label] = parts;};
derive('×', fit(U('x'), {height: 250, centerY: 240}), 'x reducida');
derive('·', fit(U('.'), {height: 95, centerY: 240}), 'punto centrado');
derive('<', left, 'primer ángulo de «');
derive('>', right, 'segundo ángulo de »');
derive('≤', [...fit(left, {height: 250, bottom: 150}), ...shift(bar(bounds(left)[1][0] - bounds(left)[0][0] + 20), 0, 60)], '< y guion');
derive('≥', [...fit(right, {height: 250, bottom: 150}), ...shift(bar(bounds(right)[1][0] - bounds(right)[0][0] + 20), 0, 60)], '> y guion');
derive('±', [...fit(U('+'), {height: 300, bottom: 130}), ...shift(bar(300), 0, 50)], '+ y guion');
{const eq = U('='), [elo, ehi] = bounds(eq), sl = fit(U('/'), {height: 380, centerY: (elo[1] + ehi[1]) / 2}), [slo, shi] = bounds(sl); derive('≠', [...eq, ...shift(sl, (elo[0] + ehi[0]) / 2 - (slo[0] + shi[0]) / 2, 0)], '= y /');}
{const line = shift(bar(380), 0, 240), tip = fit(right, {height: 200, centerY: 240}), [tlo] = bounds(tip); derive('→', [...line, ...shift(tip, 380 - tlo[0] - 120, 0)], 'guion y ángulo de »');}
derive('∞', fit(map(U('8'), (x, y) => [-y, x]), {height: 230, centerY: 210}), '8 girado');
derive('°', fit(U('o'), {height: 150, bottom: 400}), 'o pequeña');
derive('|', fit(U('l'), {height: 640, bottom: -70}), 'trazo de l');
derive('−', U('-'), 'guion como signo menos');
// Greek letters used in physics, assembled from the user's own strokes until
// real samples are captured (see the symbol boxes of the test sheet).
{const legs = fit(U('l'), {height: 300, bottom: 0}), [llo, lhi] = bounds(legs), w = lhi[0] - llo[0], top = stretch(U('-'), 330, 315);
 derive('π', [...top, ...shift(legs, 55 - llo[0], 0), ...shift(map(legs, (x, y) => [x + (300 - y) * .06, y]), 245 - llo[0], 0)], 'barra del guion y dos trazos de l');}
{const o = fit(U('o'), {height: 330, bottom: 0}), [olo] = bounds(o), stem = fit(U('l'), {height: 400, bottom: -235}), [slo, shi] = bounds(stem);
 // The stem leaves the bowl and curls a little to the left, so ρ never reads as p.
 const curl = map(stem, (x, y) => [x - Math.max(0, -y) ** 2 / 900, y]);
 derive('ρ', [...map(o, (x, y) => [x * 1.08, y]), ...shift(curl, olo[0] * 1.08 - slo[0] - (shi[0] - slo[0]) * .1, 0)], 'o y trazo curvo de l');}
{const up = fit(U('/'), {height: 500, bottom: 20}), down = fit(U('\\'), {height: 500, bottom: 20}), [ulo, uhi] = bounds(up), [dlo, dhi] = bounds(down), width = uhi[0] - ulo[0];
 derive('Δ', [...up, ...shift(down, width - 45 - dlo[0], 0), ...shift(stretch(U('-'), width * 2 - 40, 0), 10, 30)], 'barras / \\ y guion');}
derive('≈', [...fit(U('~'), {height: 95, centerY: 300}), ...fit(U('~'), {height: 95, centerY: 175})], 'dos ~');
report.limits.push('π, ρ y Δ son provisionales, armados con tus trazos de l, o, / y \\ y guion; θ, α, β, λ, μ, ω, Ω y ∫ siguen sin muestras.', 'La raíz cuadrada y la raya de fracción se dibujan al componer, con el grosor medido de tu trazo.');
report.sampleCount = out.length; report.characterCount = new Set(out.map(s => s.label)).size;

const strokeLetters = out.filter(s => /\p{Ll}/u.test(s.label)).map(s => strokeWidth(s.paths)).sort((a, b) => a - b);
report.medianLetterStrokeWidth = Math.round(strokeLetters[strokeLetters.length >> 1]);
console.log(`${report.sampleCount} muestras · ${report.characterCount} caracteres · trazo mediano ${report.medianLetterStrokeWidth}`);
if (!process.argv.includes('--dry-run')) {
  const next = {...bundle, profiles: [...bundle.profiles.filter(p => p.id !== PROFILE.id), {...PROFILE, samples: out}]};
  const text = JSON.stringify(next);
  for (const t of TARGETS) fs.writeFileSync(ROOT + t, text);
  fs.writeFileSync(ROOT + 'outputs/mi-caligrafia/Mi-letra-Natural-curacion.json', JSON.stringify(report, null, 1));
}

// Font and portable library for use outside the bundled app profile.
if (!process.argv.includes('--dry-run')) {
  const {buildFont} = await import('../../outputs/trazo-android/web/core.mjs');
  const {buffer} = buildFont(out, PROFILE.name);
  fs.writeFileSync(ROOT + 'outputs/mi-caligrafia/Mi-letra-Natural.otf', Buffer.from(buffer));
  fs.writeFileSync(ROOT + 'outputs/mi-caligrafia/Mi-letra-Natural.trazo', JSON.stringify({type: 'trazo-library', version: 2, name: PROFILE.name, samples: out.map(({label, char, paths, advance, baseline}) => ({label, char, paths, advance, baseline}))}));
}
