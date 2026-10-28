// Ballpoint ink. A letter traced from a photo has a ragged edge (the noise of
// the photo) and a perfectly flat fill: up close it reads as a printed copy.
// Here each letter is thinned to its centre lines, keeping the width of the
// real pen, and redrawn as a ballpoint writes: a clean edge, a steady width
// that breathes with the pressure, ink that pools where a stroke starts,
// darker where two strokes cross, and the small pale streaks of a ball that
// skips. Every letter comes out a little different. Units are millimetres
// on the page (y down).

const RES = 30; // pixels per millimetre for the centre lines (a 0.3 mm stroke is 9 px)

function rng(seed) {let s = (seed >>> 0) || 1; return () => {s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296;};}
const between = (random, a, b) => a + (b - a) * random();

// Nonzero fill, like the PDF and the SVG preview.
function rasterize(polys, res, grid = null) {
  let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
  for (const p of polys) for (const [x, y] of p) {l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);}
  const pad = 3, {x0, y0, w, h} = grid || {x0: l - pad / res, y0: t - pad / res, w: Math.ceil((r - l) * res) + 2 * pad + 1, h: Math.ceil((b - t) * res) + 2 * pad + 1}, data = new Uint8Array(w * h);
  const edges = [];
  for (const p of polys) for (let i = 0; i < p.length; i++) {const a = p[i], c = p[(i + 1) % p.length]; if (a[1] !== c[1]) edges.push(a[1] < c[1] ? [a[0], a[1], c[0], c[1], 1] : [c[0], c[1], a[0], a[1], -1]);}
  const cross = [], rows = Array.from({length: h}, () => []);
  for (const e of edges) {const from = Math.max(0, Math.ceil((e[1] - y0) * res - .5)), to = Math.min(h - 1, Math.ceil((e[3] - y0) * res - .5) - 1); for (let j = from; j <= to; j++) rows[j].push(e);}
  for (let j = 0; j < h; j++) {
    const y = y0 + (j + .5) / res; cross.length = 0;
    for (const [ax, ay, bx, by, dir] of rows[j]) if (ay <= y && y < by) cross.push([ax + (y - ay) * (bx - ax) / (by - ay), dir]);
    cross.sort((m, n) => m[0] - n[0]);
    let wind = 0;
    for (let k = 0; k < cross.length - 1; k++) {
      wind += cross[k][1]; if (!wind) continue;
      const from = Math.max(0, Math.ceil((cross[k][0] - x0) * res - .5)), to = Math.min(w - 1, Math.floor((cross[k + 1][0] - x0) * res - .5));
      for (let i = from; i <= to; i++) data[j * w + i] = 1;
    }
  }
  return {data, w, h, x0, y0};
}

// A photo leaves pinholes inside the ink and nicks along its edge; left in,
// they become false loops and twigs. Close by one pixel and fill the
// pinholes (not the eye of an «e» or the inside of an «o»).
function mend(raster, res) {
  const {w, h} = raster, src = raster.data, grow = new Uint8Array(w * h), data = new Uint8Array(w * h);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {const k = j * w + i; grow[k] = src[k] | src[k - 1] | src[k + 1] | src[k - w] | src[k + w] | src[k - w - 1] | src[k - w + 1] | src[k + w - 1] | src[k + w + 1];}
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {const k = j * w + i; data[k] = grow[k] & grow[k - 1] & grow[k + 1] & grow[k - w] & grow[k + w] & grow[k - w - 1] & grow[k - w + 1] & grow[k + w - 1] & grow[k + w + 1];}
  for (const hole of holes(data, w, h)) if (hole.length < .006 * res * res) for (const c of hole) data[c] = 1;
  return {...raster, data};
}
// Paper enclosed by ink (4-connected, away from the border).
function holes(data, w, h) {
  const mark = new Int32Array(w * h), stack = new Int32Array(w * h), found = [];
  const fill = (k, id) => {
    let top = 0; stack[top++] = k; mark[k] = id;
    const visit = m => {if (!data[m] && !mark[m]) {mark[m] = id; stack[top++] = m;}};
    while (top) {const c = stack[--top], i = c % w; if (i > 0) visit(c - 1); if (i < w - 1) visit(c + 1); if (c >= w) visit(c - w); if (c < w * h - w) visit(c + w);}
  };
  // The paper around the letter first, from the border.
  for (let i = 0; i < w; i++) for (const k of [i, (h - 1) * w + i]) if (!data[k] && !mark[k]) fill(k, 1);
  for (let j = 0; j < h; j++) for (const k of [j * w, j * w + w - 1]) if (!data[k] && !mark[k]) fill(k, 1);
  for (let k = 0; k < w * h; k++) if (!data[k] && !mark[k]) {const id = found.length + 2; fill(k, id); found.push(id);}
  if (!found.length) return [];
  const pixels = found.map(() => []);
  for (let k = 0; k < w * h; k++) if (mark[k] > 1) pixels[mark[k] - 2].push(k);
  return pixels;
}

// Euclidean distance from every inked pixel to the paper (Felzenszwalb).
function distance({data, w, h}) {
  const INF = 1e9, d = new Float64Array(w * h), n = Math.max(w, h), f = new Float64Array(n), z = new Float64Array(n + 1), v = new Int32Array(n), out = new Float64Array(n);
  for (let i = 0; i < w * h; i++) d[i] = data[i] ? INF : 0;
  const pass = len => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);}
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0; for (let q = 0; q < len; q++) {while (z[k + 1] < q) k++; out[q] = (q - v[k]) * (q - v[k]) + f[v[k]];}
  };
  for (let i = 0; i < w; i++) {for (let j = 0; j < h; j++) f[j] = d[j * w + i]; pass(h); for (let j = 0; j < h; j++) d[j * w + i] = out[j];}
  for (let j = 0; j < h; j++) {for (let i = 0; i < w; i++) f[i] = d[j * w + i]; pass(w); for (let i = 0; i < w; i++) d[j * w + i] = Math.sqrt(out[i]);}
  return d;
}

const DX = [0, 1, 1, 1, 0, -1, -1, -1], DY = [-1, -1, 0, 1, 1, 1, 0, -1];
// For each 8-neighbour mask: how many separate groups the neighbours form.
const GROUPS = Array.from({length: 256}, (_, mask) => {
  const on = k => mask >> (k & 7) & 1, seen = new Set(); let groups = 0;
  for (let k = 0; k < 8; k++) {
    if (!on(k) || seen.has(k)) continue; groups++; const stack = [k]; seen.add(k);
    while (stack.length) {const a = stack.pop(); for (let b = 0; b < 8; b++) {if (!on(b) || seen.has(b)) continue; const da = Math.abs(DX[a] - DX[b]), db = Math.abs(DY[a] - DY[b]); if (da <= 1 && db <= 1) {seen.add(b); stack.push(b);}}}
  }
  return groups;
});

// Zhang–Suen thinning (as lookup tables over the 8 neighbours), then corner
// pixels that do not hold the line together. The raster has a blank border.
const THIN = [0, 1].map(step => Uint8Array.from({length: 256}, (_, m) => {
  const p = k => m >> k & 1; let n = 0, a = 0;
  for (let k = 0; k < 8; k++) {n += p(k); if (!p(k) && p((k + 1) % 8)) a++;}
  if (n < 2 || n > 6 || a !== 1) return 0;
  return step === 0 ? !(p(0) * p(2) * p(4) || p(2) * p(4) * p(6)) : !(p(0) * p(2) * p(6) || p(0) * p(4) * p(6));
}));
function thin({data, w}) {
  const s = Uint8Array.from(data), off = DX.map((x, k) => DY[k] * w + x), mask = k => {let m = 0; for (let d = 0; d < 8; d++) if (s[k + off[d]]) m |= 1 << d; return m;};
  let live = []; for (let k = 0; k < s.length; k++) if (s[k]) live.push(k);
  for (let changed = true; changed;) {
    changed = false;
    for (const table of THIN) {
      const drop = live.filter(k => table[mask(k)]);
      for (const k of drop) s[k] = 0;
      if (drop.length) {changed = true; live = live.filter(k => s[k]);}
    }
  }
  for (const k of live) {const m = mask(k), n = BITS[m]; if (n >= 2 && n <= 3 && GROUPS[m] === 1) s[k] = 0;}
  return s;
}
const BITS = Uint8Array.from({length: 256}, (_, m) => [...Array(8).keys()].filter(k => m >> k & 1).length);

// Skeleton pixels → nodes (ends and crossings) and the chains between them.
function graph(s, w, h) {
  const nb = k => {const i = k % w, j = (k - i) / w, out = []; for (let d = 0; d < 8; d++) {const x = i + DX[d], y = j + DY[d]; if (x >= 0 && y >= 0 && x < w && y < h && s[y * w + x]) out.push(y * w + x);} return out;};
  const degree = new Map(); for (let k = 0; k < w * h; k++) if (s[k]) degree.set(k, nb(k).length);
  const node = new Map(), nodes = [];
  for (const [k, n] of degree) {
    if (node.has(k) || n === 2) continue;
    // A crossing is a small cluster of pixels with three or more neighbours.
    const id = nodes.length, pixels = [k]; node.set(k, id);
    if (n >= 3) for (let q = 0; q < pixels.length; q++) for (const m of nb(pixels[q])) if (!node.has(m) && degree.get(m) >= 3) {node.set(m, id); pixels.push(m);}
    nodes.push({pixels, end: n <= 1});
  }
  const edges = [], used = new Set(), linked = new Set();
  for (const [id, nd] of nodes.entries()) for (const p of nd.pixels) for (const q of nb(p)) {
    if (node.get(q) === id || used.has(q)) continue;
    if (node.has(q)) {const key = Math.min(id, node.get(q)) + ',' + Math.max(id, node.get(q)); if (!linked.has(key)) {linked.add(key); edges.push({a: id, b: node.get(q), px: []});} continue;}
    const px = []; let prev = p, cur = q, end = null;
    while (true) {
      px.push(cur); used.add(cur);
      const next = nb(cur).filter(m => m !== prev && (node.has(m) ? !(px.length === 1 && node.get(m) === id) : !used.has(m)));
      const stop = next.find(m => node.has(m));
      if (stop !== undefined) {end = node.get(stop); break;}
      if (!next.length) break;
      prev = cur; cur = next[0];
    }
    edges.push({a: id, b: end, px});
  }
  // Closed loops without a node (an «o»).
  for (const [k] of degree) {
    if (used.has(k) || node.has(k)) continue;
    const px = []; let prev = -1, cur = k;
    while (cur !== undefined && !used.has(cur)) {px.push(cur); used.add(cur); const next = nb(cur).filter(m => m !== prev && !used.has(m)); prev = cur; cur = next[0];}
    edges.push({a: null, b: null, px, closed: true});
  }
  return {nodes, edges};
}

const centroid = (pixels, w) => [pixels.reduce((a, k) => a + k % w, 0) / pixels.length, pixels.reduce((a, k) => a + Math.floor(k / w), 0) / pixels.length];
function smooth(values, sigma, closed, fixEnds) {
  if (values.length < 3 || sigma <= 0) return values.map(v => [...v]);
  const n = values.length, reach = Math.ceil(sigma * 2.5), weights = Array.from({length: 2 * reach + 1}, (_, k) => Math.exp(-((k - reach) ** 2) / (2 * sigma * sigma)));
  return values.map((v, i) => {
    if (fixEnds && !closed && (i === 0 || i === n - 1)) return [...v];
    const sum = v.map(() => 0); let total = 0;
    for (let k = -reach; k <= reach; k++) {
      let j = i + k; if (closed) j = (j % n + n) % n; else if (j < 0 || j >= n) continue;
      const wt = weights[k + reach]; total += wt; for (let c = 0; c < v.length; c++) sum[c] += values[j][c] * wt;
    }
    return sum.map(x => x / total);
  });
}

/**
 * Centre lines of filled outlines (mm, y down): [{points: [[x, y, r]], closed}].
 * r is the half-width of the stroke at that point.
 */
export function centerlines(polys, res = RES) {
  if (!polys.some(p => p.length > 2)) return Object.assign([], {fit: {over: 0, under: 0, loops: 0}});
  const raster = mend(rasterize(polys, res), res), {w, h, x0, y0} = raster, dist = distance(raster), skel = thin(raster);
  const {nodes, edges} = graph(skel, w, h), radius = k => Math.max(.5, dist[k] - .5) / res, toMm = ([i, j]) => [x0 + (i + .5) / res, y0 + (j + .5) / res];
  const ends = nodes.map(n => ({at: centroid(n.pixels, w), r: Math.min(...n.pixels.map(radius)), end: n.end, degree: 0}));
  for (const e of edges) {if (e.a !== null) ends[e.a].degree++; if (e.b !== null) ends[e.b].degree++;}
  // Short twigs from a crossing to a free end are bumps of the photo, not strokes.
  let live = edges.slice();
  for (let round = 0; round < 3; round++) {
    const before = live.length;
    live = live.filter(e => {
      if (e.closed) return true;
      const [free, other] = ends[e.b]?.end ? [e.b, e.a] : ends[e.a]?.end ? [e.a, e.b] : [null, null];
      if (free === null || other === null || ends[other].end || ends[other].degree < 3) return true;
      if (e.px.length + 1 > ends[other].r * res * 1.6 + 2) return true;
      ends[other].degree--; return false;
    });
    // A crossing left with two strokes is just a bend: join them.
    for (const [id, n] of ends.entries()) {
      if (n.end || n.degree !== 2) continue;
      const pair = live.filter(e => e.a === id || e.b === id); if (pair.length !== 2 && !(pair.length === 1 && pair[0].a === id && pair[0].b === id)) continue;
      const nodePx = nodes[id].pixels[0];
      if (pair.length === 1) {Object.assign(pair[0], {a: null, b: null, closed: true, px: [nodePx, ...pair[0].px]}); n.degree = 0; n.joined = true; continue;}
      const [p, q] = pair, pa = p.b === id ? p.px : [...p.px].reverse(), qa = q.a === id ? q.px : [...q.px].reverse();
      const joined = {a: p.b === id ? p.a : p.b, b: q.a === id ? q.b : q.a, px: [...pa, nodePx, ...qa]};
      live = live.filter(e => e !== p && e !== q); live.push(joined); n.degree = 0; n.joined = true;
    }
    if (live.length === before) break;
  }
  // Each separate blot of ink: its area tells the true width of its lines.
  const blot = new Int32Array(w * h).fill(-1), areas = [];
  for (let k = 0; k < w * h; k++) {
    if (!raster.data[k] || blot[k] >= 0) continue;
    const id = areas.length, stack = [k]; let n = 0, sx = 0, sy = 0; blot[k] = id;
    while (stack.length) {const q = stack.pop(), i = q % w, j = (q - i) / w; n++; sx += i; sy += j; for (let d = 0; d < 8; d++) {const m = q + DY[d] * w + DX[d]; if (raster.data[m] && blot[m] < 0) {blot[m] = id; stack.push(m);}}}
    areas.push({area: n / (res * res), at: [sx / n, sy / n], strokes: []});
  }
  for (const e of live) {
    const points = e.px.map(k => [...toMm([k % w, Math.floor(k / w)]), radius(k)]), first = e.px[0] ?? nodes[e.a ?? e.b].pixels[0];
    if (!e.closed) {
      if (e.a !== null && !ends[e.a].joined) points.unshift([...toMm(ends[e.a].at), ends[e.a].r]);
      if (e.b !== null && !ends[e.b].joined) points.push([...toMm(ends[e.b].at), ends[e.b].r]);
    }
    if (!points.length) continue;
    const xy = smooth(points.map(p => [p[0], p[1]]), .11 * res, e.closed, true), r = smooth(points.map(p => [p[2]]), .2 * res, e.closed, false);
    areas[blot[first]]?.strokes.push({points: xy.map((p, i) => [p[0], p[1], r[i][0]]), closed: !!e.closed});
  }
  for (const [id, n] of ends.entries()) if (!n.joined && n.degree === 0 && !live.some(e => e.a === id || e.b === id)) areas[blot[nodes[id].pixels[0]]]?.strokes.push({points: [[...toMm(n.at), radius(nodes[id].pixels[0])]], closed: false});
  // The edge of a photographed letter is ragged and the distance to it runs
  // short. Solve area = 2·h·length + π·h² for the half-width h; a blot no
  // longer than it is wide is a dot, drawn round with the same area.
  const strokes = [], biggest = Math.max(...areas.map(a => a.area));
  for (const a of areas) {
    if (a.area < .012 && biggest > 4 * a.area) continue; // a speck of the photo
    const long = a.strokes.reduce((t, s) => t + length(s.points) + (s.closed ? Math.hypot(s.points[0][0] - s.points.at(-1)[0], s.points[0][1] - s.points.at(-1)[1]) : 0), 0), round = Math.sqrt(a.area / Math.PI);
    if (!a.strokes.length || long < 2 * round) {strokes.push({points: [[...toMm(a.at), round]], closed: false}); continue;}
    const all = a.strokes.flatMap(s => s.points.map(p => p[2])).sort((m, n) => m - n), median = all[all.length >> 1], half = Math.min((-long + Math.sqrt(long * long + Math.PI * a.area)) / Math.PI, median * 1.6);
    for (const s of a.strokes) strokes.push({...s, points: s.points.map(p => [p[0], p[1], p[2] * half / median])});
  }
  const result = strokes.map(s => ({...s, points: simplify(s.points, .006)}));
  // How well the lines rebuild the letter: ink where the photo had paper
  // (a closed loop) or paper where it had ink (a blot).
  const again = rasterize(result.flatMap(s => band(s.points, s.closed)), res, raster);
  let over = 0, under = 0;
  for (let k = 0; k < again.data.length; k++) {if (again.data[k] && !raster.data[k]) over++; else if (!again.data[k] && raster.data[k]) under++;}
  const inked = areas.reduce((t, a) => t + a.area, 0) * res * res, loops = d => holes(d, w, h).filter(q => q.length >= .006 * res * res).length;
  result.fit = {over: over / inked, under: under / inked, loops: loops(again.data) - loops(raster.data)};
  return result;
}

function simplify(points, eps) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(), [ax, ay] = points[a], [bx, by] = points[b], len = Math.hypot(bx - ax, by - ay) || 1e-9; let worst = -1, far = 0;
    for (let i = a + 1; i < b; i++) {const [x, y, r] = points[i], d = Math.max(Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / len, Math.abs(r - (points[a][2] + (points[b][2] - points[a][2]) * (i - a) / (b - a))) * .5); if (d > far) {far = d; worst = i;}}
    if (far > eps) {keep[worst] = 1; stack.push([a, worst], [worst, b]);}
  }
  return points.filter((_, i) => keep[i]);
}

const circle = (x, y, r, n = 14) => Array.from({length: n}, (_, k) => [x + Math.cos(-k / n * 2 * Math.PI) * r, y + Math.sin(-k / n * 2 * Math.PI) * r]);
const signedArea = p => {let a = 0; for (let i = 0; i < p.length; i++) {const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1];} return a / 2;};
const facing = (p, sign) => Math.sign(signedArea(p)) === sign ? p : [...p].reverse();

// One stroke as a filled band with round ends; the two sides may have
// different half-widths (a skipping ball inks one side less).
function band(points, closed) {
  const n = points.length;
  if (n === 1) return [circle(points[0][0], points[0][1], points[0][2])];
  const left = [], right = [], joints = [];
  for (let i = 0; i < n; i++) {
    const p = points[i], a = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    // The miter is limited; a disc fills sharp turns.
    let turn = 0;
    if (closed || (i > 0 && i < n - 1)) {const u = Math.atan2(p[1] - a[1], p[0] - a[0]), v = Math.atan2(b[1] - p[1], b[0] - p[0]); turn = Math.abs(((v - u) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);}
    const miter = 1 / Math.max(.6, Math.cos(turn / 2)), [x, y, r] = p, rr = p[3] ?? r;
    left.push([x - ty * r * miter, y + tx * r * miter]); right.push([x + ty * rr * miter, y - tx * rr * miter]);
    if (turn > .7) joints.push(circle(x, y, Math.max(r, rr)));
  }
  if (closed) {
    const [outer, inner] = Math.abs(signedArea(left)) >= Math.abs(signedArea(right)) ? [left, right] : [right, left];
    return [facing(outer, -1), facing(inner, 1), ...joints.map(j => facing(j, -1))];
  }
  const outline = [...left, ...right.reverse()], sign = Math.sign(signedArea(outline)) || -1;
  return [outline, ...joints.map(j => facing(j, sign)), ...[points[0], points[n - 1]].map(p => facing(circle(p[0], p[1], Math.min(p[2], p[3] ?? p[2])), sign))];
}

// The same sample turns up again and again, only moved, turned or slanted:
// its centre lines (and softened outline) are found once and carried along.
const SEEN = new Map();
function affine(from, to) {
  // Least squares for x' = a·x + b·y + c and y' = d·x + e·y + f.
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], vx = [0, 0, 0], vy = [0, 0, 0];
  for (let i = 0; i < from.length; i++) {const u = [from[i][0], from[i][1], 1]; for (let r = 0; r < 3; r++) {for (let c = 0; c < 3; c++) m[r][c] += u[r] * u[c]; vx[r] += u[r] * to[i][0]; vy[r] += u[r] * to[i][1];}}
  const det = q => q[0][0] * (q[1][1] * q[2][2] - q[1][2] * q[2][1]) - q[0][1] * (q[1][0] * q[2][2] - q[1][2] * q[2][0]) + q[0][2] * (q[1][0] * q[2][1] - q[1][1] * q[2][0]), d = det(m);
  if (Math.abs(d) < 1e-12) return null;
  const solve = v => [0, 1, 2].map(k => det(m.map((row, r) => row.map((x, c) => c === k ? v[r] : x))) / d);
  const [a, b, c] = solve(vx), [dd, e, f] = solve(vy), worst = from.reduce((w, p, i) => Math.max(w, Math.hypot(a * p[0] + b * p[1] + c - to[i][0], dd * p[0] + e * p[1] + f - to[i][1])), 0);
  return worst < 1e-3 ? [a, b, c, dd, e, f] : null;
}
function shapeOf(sample, polys) {
  const flat = polys.flat(), source = sample?.paths?.flat(), T = source && source.length === flat.length && source.length >= 3 ? affine(source, flat) : null;
  if (!T) {const strokes = centerlines(polys); let soft = null; return {strokes, fit: strokes.fit, outline: () => soft ??= softOutline(polys)};}
  const det = T[0] * T[4] - T[1] * T[3], scale = Math.sqrt(Math.abs(det)), map = ([x, y, r = 0]) => [T[0] * x + T[1] * y + T[2], T[3] * x + T[4] * y + T[5], r * scale], inv = ([x, y, r = 0]) => {const u = x - T[2], v = y - T[5]; return [(T[4] * u - T[1] * v) / det, (-T[3] * u + T[0] * v) / det, r / scale];};
  const key = `${sample.id}|${source.length}|${source[0]}|${source.at(-1)}`;
  let entry = SEEN.get(key);
  if (!entry) {const found = centerlines(polys); entry = {strokes: found.map(s => ({...s, points: s.points.map(inv)})), fit: found.fit}; if (SEEN.size > 4000) SEEN.clear(); SEEN.set(key, entry);}
  return {strokes: entry.strokes.map(s => ({...s, points: s.points.map(map)})), fit: entry.fit, outline: () => (entry.outline ??= softOutline(polys).map(p => p.map(inv))).map(p => p.map(q => map(q).slice(0, 2)))};
}
function fingerprint(paths) {let h = 2166136261; for (const p of paths) for (const [x, y] of p) {h = Math.imul(h ^ Math.round(x * 10), 16777619); h = Math.imul(h ^ Math.round(y * 10), 16777619);} return (h >>> 0).toString(36) + paths.length;}
const rebuilt = fit => fit.over <= .22 && fit.under <= .22 && !fit.loops;

/**
 * 'lineas' when the centre lines rebuild a letter set well (a clean photo);
 * 'contorno' for a noisy one, whose letters keep their softened outline.
 */
export function inkMode(samples) {
  const list = samples.filter(s => s.paths?.length), step = Math.max(1, Math.floor(list.length / 80)), scale = 16 * 25.4 / 72 / 1000;
  const tried = list.filter((_, i) => i % step === 0).map(s => shapeOf(s, s.paths.map(p => p.map(([x, y]) => [x * scale, -y * scale]))).fit);
  return tried.filter(f => !rebuilt(f)).length > tried.length * .04 ? 'contorno' : 'lineas';
}

const length = points => points.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
const hex = c => c.slice(1).match(/../g).map(v => parseInt(v, 16));
const css = rgb => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const tone = (c, t) => css(hex(c).map(v => t > 0 ? v + (255 - v) * t : v * (1 + t)));
// The colour that, laid at this opacity on white paper, looks like `c`.
function under(c, opacity) {const rgb = hex(c), raw = rgb.map(v => (v - (1 - opacity) * 255) / opacity); return raw.every(v => v >= 0) ? {color: css(raw), opacity} : {color: c, opacity: 1};}

// How each kind of pen lays ink (see PENS in model.mjs).
export const INKS = Object.freeze({
  boligrafo: {opacity: .86, blob: .3, skip: .4, wobble: 1, steady: .55},
  gel: {opacity: .93, blob: .12, skip: .1, wobble: .6, steady: .7},
  lapiz: {opacity: .8, blob: 0, skip: .9, wobble: 1.2, steady: .5},
});

// When the lines cannot rebuild a letter (a thick hand that nearly closes
// its loops), the photo shape is kept, redrawn from a softened copy so the
// pixel steps of the photo are gone: blur, then the contour at half ink.
export function softOutline(polys, res = RES, sigma = .05) {
  const {data, w, h, x0, y0} = mend(rasterize(polys, res), res), reach = Math.ceil(sigma * res * 3), kernel = Array.from({length: 2 * reach + 1}, (_, k) => Math.exp(-((k - reach) ** 2) / (2 * (sigma * res) ** 2))), sum = kernel.reduce((a, b) => a + b, 0);
  const tmp = new Float32Array(w * h), v = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {let a = 0; for (let k = -reach; k <= reach; k++) {const x = i + k; if (x >= 0 && x < w) a += data[j * w + x] * kernel[k + reach];} tmp[j * w + i] = a / sum;}
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {let a = 0; for (let k = -reach; k <= reach; k++) {const y = j + k; if (y >= 0 && y < h) a += tmp[y * w + i] * kernel[k + reach];} v[j * w + i] = a / sum;}
  // Marching squares; each crossing is named by the pixel edge it sits on.
  const at = new Map(), links = new Map(), point = (kind, i, j) => {
    const key = kind + (j * w + i); if (at.has(key)) return key;
    const a = v[j * w + i], b = kind === 'h' ? v[j * w + i + 1] : v[(j + 1) * w + i], t = (.5 - a) / (b - a);
    at.set(key, [x0 + (i + .5 + (kind === 'h' ? t : 0)) / res, y0 + (j + .5 + (kind === 'v' ? t : 0)) / res]); return key;
  };
  const link = (a, b) => {for (const [p, q] of [[a, b], [b, a]]) {if (!links.has(p)) links.set(p, []); links.get(p).push(q);}};
  for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
    const tl = v[j * w + i] >= .5, tr = v[j * w + i + 1] >= .5, br = v[(j + 1) * w + i + 1] >= .5, bl = v[(j + 1) * w + i] >= .5, code = tl * 8 + tr * 4 + br * 2 + bl;
    if (!code || code === 15) continue;
    const top = () => point('h', i, j), bottom = () => point('h', i, j + 1), left = () => point('v', i, j), right = () => point('v', i + 1, j);
    const centre = (v[j * w + i] + v[j * w + i + 1] + v[(j + 1) * w + i + 1] + v[(j + 1) * w + i]) / 4 >= .5;
    switch (code) {
      case 1: case 14: link(left(), bottom()); break;
      case 2: case 13: link(bottom(), right()); break;
      case 3: case 12: link(left(), right()); break;
      case 4: case 11: link(top(), right()); break;
      case 6: case 9: link(top(), bottom()); break;
      case 7: case 8: link(left(), top()); break;
      case 5: if (centre) {link(left(), top()); link(bottom(), right());} else {link(left(), bottom()); link(top(), right());} break;
      case 10: if (centre) {link(left(), bottom()); link(top(), right());} else {link(left(), top()); link(bottom(), right());} break;
    }
  }
  const loops = [], done = new Set();
  for (const start of links.keys()) {
    if (done.has(start)) continue;
    const loop = []; let prev = null, cur = start;
    while (cur && !done.has(cur)) {done.add(cur); loop.push(at.get(cur)); const next = links.get(cur).find(n => n !== prev && !done.has(n)); prev = cur; cur = next;}
    if (loop.length > 2) loops.push(simplify(loop.map(p => [...p, 0]), .004).map(p => [p[0], p[1]]));
  }
  // Outer contours one way, holes the other, for the nonzero fill.
  return loops.map((p, i) => {const depth = loops.filter((q, k) => k !== i && Math.abs(signedArea(q)) > Math.abs(signedArea(p)) && inside(p[0], q)).length; return facing(p, depth % 2 ? 1 : -1);});
}
function inside([x, y], poly) {let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;} return c;}

/**
 * Redraw one item ({paths, x, y, scale} letter or {polys} stroke) as ink.
 * Returns {layers: [{polys, color, opacity}], lines: [[x, y]...][]} where
 * lines are the centre lines (for a pen plotter).
 */
export function ballpoint(item, {kind = 'boligrafo', seed = 1, natural = .55, sample = null, mode = 'lineas'} = {}) {
  const ink = INKS[kind] || INKS.boligrafo, random = rng(seed * 2654435761 + 17), polys = item.polys || item.paths.map(p => p.map(([x, y]) => [item.x + x * item.scale, item.y - y * item.scale]));
  const extra = item.strokeWidth && item.scale ? item.strokeWidth * item.scale / 2 : 0, color = item.color;
  // A formula has no sample of its own: its shape names it.
  const shape = shapeOf(sample || (item.paths && {id: 'f' + fingerprint(item.paths), paths: item.paths}), polys), strokes = shape.strokes, contour = mode === 'contorno' || !rebuilt(shape.fit);
  const radii = strokes.flatMap(s => s.points.length > 1 ? s.points.map(p => p[2]) : []).sort((a, b) => a - b), median = radii[radii.length >> 1] || .15, base = median + extra;
  // A slow, smooth bend of the whole letter: no two letters are the same.
  const amp = .035 * natural * ink.wobble, f = Array.from({length: 4}, () => between(random, .18, .38)), ph = Array.from({length: 4}, () => between(random, 0, 6.3));
  const warp = ([x, y, r]) => [x + amp * Math.sin(f[0] * 2 * Math.PI * x + f[1] * 2 * Math.PI * y + ph[0]), y + amp * Math.sin(f[2] * 2 * Math.PI * x - f[3] * 2 * Math.PI * y + ph[1]), r];
  const layers = [], lines = [];
  // The outline itself, when the lines do not rebuild this letter: the ink
  // texture below still follows its strokes.
  if (contour) {
    const outline = shape.outline().map(p => p.map(q => warp([...q, 0]).slice(0, 2)));
    layers.push({polys: extra ? [...outline, ...strokes.map(s => band(s.points.map(p => warp([p[0], p[1], p[2] + extra])), s.closed)).flat()] : outline, ...under(tone(color, between(random, -.04, .04)), ink.opacity)});
  }
  for (const s of strokes) {
    const pressure = 1 + between(random, -.07, .07), phase = between(random, 0, 6.3), wave = between(random, 1.2, 2.4);
    let run = 0;
    const points = s.points.map((p, i) => {
      if (i) run += Math.hypot(p[0] - s.points[i - 1][0], p[1] - s.points[i - 1][1]);
      // A dot keeps its own size; lines keep near the width of the pen.
      const measured = Math.max(.8 * median, Math.min(1.2 * median, p[2])), r = s.points.length === 1 ? (p[2] + extra) * pressure : (base * ink.steady + (measured + extra) * (1 - ink.steady)) * pressure * (1 + .06 * Math.sin(phase + run / wave * 2 * Math.PI));
      return warp([p[0], p[1], r]);
    });
    lines.push(points.map(p => [p[0], p[1]]));
    if (!contour) layers.push({polys: band(points, s.closed), ...under(tone(color, between(random, -.05, .05)), ink.opacity)});
    const total = length(points);
    // Ink pools where the ball touches down: usually the top or left end.
    if (!s.closed && points.length > 1 && total > .5 && random() < ink.blob) {
      const [a, z] = [points[0], points.at(-1)], start = a[0] + a[1] * .7 <= z[0] + z[1] * .7 ? 0 : points.length - 1, p = points[start], q = points[start ? start - 1 : 1];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, along = Math.min(.35 * p[2], d * .5), cx = p[0] + (q[0] - p[0]) / d * along, cy = p[1] + (q[1] - p[1]) / d * along;
      layers.push({polys: [circle(cx, cy, p[2] * between(random, 1.08, 1.25), 16)], ...under(tone(color, -.12), ink.opacity)});
    }
    // A pale streak where the ball skipped, along the stroke.
    if (total > 1 && random() < ink.skip) {
      const from = between(random, .15, .6) * total, span = Math.min(total * .4, between(random, .35, .9)), side = between(random, -.35, .35), streak = [];
      let at = 0;
      for (let i = 1; i < points.length; i++) {
        const [ax, ay, ar] = points[i - 1], [bx, by] = points[i], seg = Math.hypot(bx - ax, by - ay) || 1e-9;
        for (let t = 0; t < seg; t += .03) {
          const u = at + t; if (u < from || u > from + span) continue;
          const k = (u - from) / span, nx = -(by - ay) / seg, ny = (bx - ax) / seg, x = ax + (bx - ax) * t / seg, y = ay + (by - ay) * t / seg;
          streak.push([x + nx * side * ar, y + ny * side * ar, Math.max(.028, .14 * ar) * Math.sin(Math.PI * k)]);
        }
        at += seg;
      }
      if (streak.length > 3) layers.push({polys: band(streak.map(p => [p[0], p[1], p[2]]), false), color: '#ffffff', opacity: kind === 'lapiz' ? .45 : between(random, .45, .7)});
    }
  }
  return {layers, lines};
}
