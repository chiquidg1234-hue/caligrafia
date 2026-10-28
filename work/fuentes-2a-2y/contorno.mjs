// Contour helpers shared with curar_natural.mjs (same smoothing and winding rules).
export const area = p => {let a = 0; for (let i = 0; i < p.length; i++) {const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1];} return a / 2;};
export const perimeter = p => p.reduce((t, a, i) => {const b = p[(i + 1) % p.length]; return t + Math.hypot(b[0] - a[0], b[1] - a[1]);}, 0);
export function bounds(paths) {let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity]; for (const p of paths) for (const [x, y] of p) {lo = [Math.min(lo[0], x), Math.min(lo[1], y)]; hi = [Math.max(hi[0], x), Math.max(hi[1], y)];} return [lo, hi];}
export const map = (paths, f) => paths.map(p => p.map(([x, y]) => f(x, y)));

function inside([x, y], poly) {let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;} return c;}
// Outer contours negative (as the letters), holes positive, so overlapping
// pieces of formulas join under the non-zero fill rule instead of cancelling.
export function orient(paths) {
  return paths.map((p, i) => {const depth = paths.filter((q, j) => j !== i && Math.abs(area(q)) > Math.abs(area(p)) && inside(p[0], q)).length; const want = depth % 2 ? 1 : -1; return Math.sign(area(p)) === want ? p : [...p].reverse();});
}


export function smoothClosed(p, sigma) {
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
