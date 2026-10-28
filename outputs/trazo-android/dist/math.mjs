// Handwritten formulas: fractions, roots with index, powers and subscripts are
// composed from the user's own samples. Only the fraction bar and the radical
// are drawn here, as hand strokes with the measured width of the user's ink.
// Units are font units (1000 per em, y up, baseline 0).
//
//   x^2   x^{n+1}   x^(n+1)   v_0   log_2(x)   a/b   (x+1)/(x-1)   {2x}/3
//   raiz(x)   raiz[3](x+1)   √(x)   <=  >=  !=  +-  ->  *  (aliases)

const ALIASES = [['<=', '≤'], ['>=', '≥'], ['!=', '≠'], ['+-', '±'], ['->', '→'], ['*', '·']];
const OPERATORS = new Set([...'+-−=×·±<>≤≥≠→÷']), PUNCTUATION = new Set([...',;:.?!']);
const AXIS = 245, SCRIPT = .62, FRACTION = .9, INDEX = .52;

/** True when a word needs the formula composer instead of plain letters. */
export const isFormula = token => /[\^_/√]|raiz|<=|>=|!=|\+-|->|\*/.test(token);
export function balanced(token) {let depth = 0; for (const c of token) {if ('({['.includes(c)) depth++; else if (')}]'.includes(c)) depth--;} return depth <= 0;}

function rng(seed) {let s = seed >>> 0 || 1; return () => {s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296;};}
const area = p => {let a = 0; for (let i = 0; i < p.length; i++) {const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1];} return a / 2;};
function inside([x, y], poly) {let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;} return c;}
// Same winding for every outer contour, so touching pieces never cancel.
function orient(paths) {return paths.map((p, i) => {const depth = paths.filter((q, j) => j !== i && Math.abs(area(q)) > Math.abs(area(p)) && inside(p[0], q)).length, want = depth % 2 ? 1 : -1; return Math.sign(area(p)) === want ? p : [...p].reverse();});}
function extent(paths) {let lo = Infinity, hi = -Infinity, l = Infinity, r = -Infinity; for (const p of paths) for (const [x, y] of p) {lo = Math.min(lo, y); hi = Math.max(hi, y); l = Math.min(l, x); r = Math.max(r, x);} return paths.length ? {lo, hi, l, r} : {lo: 0, hi: 0, l: 0, r: 0};}
const box = (paths, width) => {const e = extent(paths); return {paths, width, ascent: Math.max(0, e.hi), descent: Math.max(0, -e.lo)};};
const move = (b, dx, dy, s = 1) => b.paths.map(p => p.map(([x, y]) => [x * s + dx, y * s + dy]));
const scaled = (b, s) => ({paths: move(b, 0, 0, s), width: b.width * s, ascent: b.ascent * s, descent: b.descent * s});
function row(boxes) {
  const paths = []; let x = 0, ascent = 0, descent = 0;
  for (const b of boxes) {const pad = b.operator ? 55 : 0; paths.push(...move(b, x + pad, 0)); x += b.width + 2 * pad; ascent = Math.max(ascent, b.ascent); descent = Math.max(descent, b.descent);}
  return {paths, width: x, ascent, descent};
}

/** A hand-drawn polyline: slightly wavy, slightly uneven, round ends. */
export function handStroke(points, width, random = Math.random) {
  const polys = [], phase = random() * 6.3, wave = width * .12, dots = [];
  const total = points.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0); let run = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(len / 45)), nx = -(by - ay) / len, ny = (bx - ax) / len;
    for (let k = 0; k <= n; k++) {const t = k / n, along = (run + len * t) / total, off = Math.sin(phase + along * 9) * wave + Math.sin(phase * 2 + along * 23) * wave * .4, w = width * (.92 + .16 * Math.sin(phase + along * 5)) / 2; dots.push([ax + (bx - ax) * t + nx * off, ay + (by - ay) * t + ny * off, w]);}
    run += len;
  }
  for (let i = 1; i < dots.length; i++) {
    const [ax, ay, aw] = dots[i - 1], [bx, by, bw] = dots[i], len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len;
    polys.push([[ax + nx * aw, ay + ny * aw], [bx + nx * bw, by + ny * bw], [bx - nx * bw, by - ny * bw], [ax - nx * aw, ay - ny * aw]]);
  }
  for (const [x, y, w] of dots) polys.push(Array.from({length: 12}, (_, k) => [x + Math.cos(k / 12 * 2 * Math.PI) * w, y + Math.sin(k / 12 * 2 * Math.PI) * w]));
  return polys.map(p => area(p) > 0 ? [...p].reverse() : p);
}

/**
 * Compose one formula word. `pick(label)` returns a sample or null.
 * Returns {paths, advance, missing}; paths are ready for the page composer.
 */
export function composeFormula(source, pick, {ink = 42, seed = 1} = {}) {
  let text = source; for (const [a, b] of ALIASES) text = text.split(a).join(b);
  const random = rng(seed), missing = new Set(), chars = [...text]; let i = 0;
  const atom = c => {const s = pick(c); if (!s) {missing.add(c); return {paths: [], width: 300, ascent: 0, descent: 0};} const b = box(orient(s.paths), s.advance); b.operator = OPERATORS.has(c); b.punctuation = PUNCTUATION.has(c); b.char = c; return b;};
  const stroke = points => handStroke(points, ink, random);
  const tallParen = (c, inner) => {
    const b = atom(c), need = Math.max(inner.ascent + 40, 560), low = Math.max(inner.descent + 40, 120), have = b.ascent + b.descent;
    if (!b.paths.length || inner.ascent + inner.descent <= have * .92) return b;
    const s = (need + low) / have, e = extent(b.paths);
    return box(b.paths.map(p => p.map(([x, y]) => [x * Math.min(1.25, Math.sqrt(s)), (y - e.lo) * s - low])), b.width * Math.min(1.25, Math.sqrt(s)));
  };
  const fraction = (num, den) => {
    num = scaled(num, FRACTION); den = scaled(den, FRACTION);
    const width = Math.max(num.width, den.width) + 90, gap = ink / 2 + 70;
    const paths = [...move(num, (width - num.width) / 2, AXIS + gap + num.descent), ...move(den, (width - den.width) / 2, AXIS - gap - den.ascent), ...stroke([[25, AXIS + 6], [width / 2, AXIS - 4], [width - 25, AXIS + 3]])];
    return box(paths, width + 30);
  };
  const root = (inner, index) => {
    const top = Math.max(inner.ascent, 340) + 90, bottom = -Math.max(inner.descent, 0) - 25, idx = index ? scaled(index, INDEX) : null;
    const lead = idx ? Math.max(0, idx.width - 95) : 0, x0 = lead, sign = [[x0, top * .42], [x0 + 55, top * .5], [x0 + 135, bottom], [x0 + 225, top], [x0 + 260 + inner.width + 30, top + 8]];
    const paths = [...stroke(sign), ...move(inner, x0 + 260, 0)];
    if (idx) paths.push(...move(idx, x0 + 120 - idx.width, top * .5 + 30 + idx.descent));
    return box(paths, x0 + 260 + inner.width + 70);
  };
  // Grammar: expr := item* with "/" binding the neighbouring operand runs.
  function expr(stop) {
    const items = [];
    while (i < chars.length && !stop.includes(chars[i])) {
      // «//» is a plain slash on the line (units: g//mol), not a fraction.
      if (chars[i] === '/' && chars[i + 1] === '/') {i += 2; items.push(atom('/')); continue;}
      if (chars[i] === '/') {i++; items.push('/'); continue;}
      items.push(postfix(primary()));
    }
    // Operands of "/" are the runs of non-operator items next to it.
    let k;
    while ((k = items.indexOf('/')) >= 0) {
      const stops = item => item === '/' || item.operator || item.punctuation;
      let a = k; while (a > 0 && !stops(items[a - 1])) a--;
      // A denominator is one term: 1/4(x-5) is a quarter times (x-5).
      // …and 3/2x is three halves times x: a numeric denominator ends with its digits.
      const numeric = /\d/.test(items[k + 1]?.char || '');
      let b = k + 1; while (b < items.length && !stops(items[b]) && !(b > k + 1 && items[b].group) && !(numeric && !/[\d.,]/.test(items[b].char || ''))) b++;
      const strip = list => list.length === 1 && list[0].group ? list[0].group : row(list);
      const num = items.slice(a, k), den = items.slice(k + 1, b);
      if (!num.length || !den.length) {items.splice(k, 1, atom('/')); continue;}
      items.splice(a, b - a, fraction(strip(num), strip(den)));
    }
    return row(items);
  }
  function argument() {
    const c = chars[i];
    if (c === '{') {i++; const e = expr('}'); i++; return e;}
    if (c === '(') {i++; const e = expr(')'); i++; return e;}
    if (c === '-' || c === '−') {i++; return row([{...atom('-'), operator: false}, argument()]);}
    let j = i; if (/\d/.test(c)) {while (j < chars.length && /[\d.,]/.test(chars[j])) j++; if (/[.,]/.test(chars[j - 1])) j--;} else j = i + 1;
    const run = chars.slice(i, j); i = j; return row(run.map(atom).map(b => ({...b, operator: false})));
  }
  function postfix(base) {
    let sup = null, sub = null;
    while (i < chars.length && (chars[i] === '^' || chars[i] === '_')) {const c = chars[i++]; if (i >= chars.length) break; const arg = scaled(argument(), SCRIPT); if (c === '^') sup = arg; else sub = arg;}
    if (!sup && !sub) return base;
    const paths = [...base.paths]; let width = base.width;
    const x = base.width - 25;
    if (sup) {const up = Math.max(250, base.ascent - sup.ascent * .5); paths.push(...move(sup, x, up));}
    if (sub) {paths.push(...move(sub, x, -135 - Math.max(0, sub.ascent - 220)));}
    width = x + Math.max(sup?.width || 0, sub?.width || 0) + 15;
    return box(paths, width);
  }
  function primary() {
    const c = chars[i];
    if (c === '{') {i++; const e = expr('}'); i++; return {...e, group: e};}
    if (c === '(' || c === '[') {const close = c === '(' ? ')' : ']'; i++; const e = expr(close); i++; const l = tallParen(c, e), r = tallParen(close, e); return {...row([l, e, r]), group: e};}
    if (c === '√' || text.startsWith('raiz', utf16(i))) {
      i += c === '√' ? 1 : 4; let index = null;
      if (chars[i] === '[') {i++; index = expr(']'); i++;}
      else if (/\d/.test(chars[i] || '') && c !== '√') {index = atom(chars[i++]);}
      const inner = chars[i] === '(' || chars[i] === '{' ? argument() : argument();
      return root(inner, index);
    }
    i++; if (c === ' ') return {paths: [], width: 90, ascent: 0, descent: 0, operator: true};
    const b = atom(c); if ((c === '.' || c === ',') && /\d/.test(chars[i - 2] || '') && /\d/.test(chars[i] || '')) b.punctuation = false;
    return b;
  }
  const utf16 = n => chars.slice(0, n).join('').length;
  const result = expr('');
  return {paths: result.paths, advance: Math.max(1, result.width), missing: [...missing]};
}
