// node work/practicos/arreglar-D.mjs
// La «D» de Mi letra Natural traía un rizo (circulito) en la esquina del palo. Se reemplazan sus
// dos muestras por una «D» limpia: palo recto y barriga redonda, con grosor fino (36), para que no se cierre el hueco cuando la letra va chica y
// la misma altura que la original; la segunda es un poco más ancha y torcida, como a mano.
import fs from 'fs';
const files = ['outputs/trazo-android/web/personal-letter.json', 'outputs/trazo-android/dist/personal-letter.json', 'work/caligrafia-2026-10-21/bundled-letter.json'];
const T = 24, r = n => +n.toFixed(1);
// Centro del trazo: polígono cerrado y convexo; el contorno exterior y el interior salen de desplazarlo ±T.
function ring(center) {
  const n = center.length, area = center.reduce((a, p, i) => a + (p[0] * center[(i + 1) % n][1] - center[(i + 1) % n][0] * p[1]), 0), sign = area > 0 ? 1 : -1, out = [[], []];
  for (let i = 0; i < n; i++) {
    const a = center[(i + n - 1) % n], b = center[i], c = center[(i + 1) % n];
    const norm = (p, q) => {const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [dy / l * sign, -dx / l * sign];};
    const n1 = norm(a, b), n2 = norm(b, c); let nx = n1[0] + n2[0], ny = n1[1] + n2[1]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const k = T / Math.max(.5, nx * n1[0] + ny * n1[1]);
    out[0].push([r(b[0] + nx * k), r(b[1] + ny * k)]); out[1].push([r(b[0] - nx * k), r(b[1] - ny * k)]);
  }
  // Como en las muestras originales: primero el contorno interior (antihorario), luego el exterior (horario), con puntos cada ~10.
  const dense = a => {const o = []; for (let i = 0; i < a.length; i++) {const p = a[i], q = a[(i + 1) % a.length], m = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 10)); for (let k = 0; k < m; k++) o.push([r(p[0] + (q[0] - p[0]) * k / m), r(p[1] + (q[1] - p[1]) * k / m)]);} return o;};
  const ar = a => a.reduce((t, q, i) => t + q[0] * a[(i + 1) % a.length][1] - a[(i + 1) % a.length][0] * q[1], 0);
  let outer = dense(out[0]), inner = dense(out[1]); if (ar(inner) < 0) inner.reverse(); if (ar(outer) > 0) outer.reverse();
  return [inner, outer];
}
// Bowl: half-ellipse from top of the stem to its bottom, plus the straight stem.
function dShape({x0 = 75, x1 = 535, top = 480, bot = 30, tilt = 0, belly = .5}) {
  const pts = [], cy = (top + bot) / 2, ry = (top - bot) / 2, rx = x1 - x0;
  pts.push([x0, top]);
  for (let i = 0; i <= 16; i++) {const a = Math.PI / 2 - Math.PI * i / 16; pts.push([x0 + rx * (belly * (1 - Math.cos(a) * 0) * 0 + Math.max(0, Math.cos(a)) * (1 - belly) + belly * Math.max(0, Math.cos(a)) ** .6), cy + Math.sin(a) * ry]);}
  pts.push([x0, bot]);
  return pts.map(([x, y]) => [x + tilt * (y - bot) / (top - bot), y]); // inclinación: todo el trazo se inclina junto, sin quiebres
}
const versions = [dShape({tilt: 3, belly: .6}), dShape({x1: 548, top: 486, bot: 26, tilt: -6, belly: .6})];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const p of j.profiles) if (p.id === 'personal-natural-v1' || p.id === 'personal-mixta-v1') {
    const ds = p.samples.filter(s => s.char === 'D');
    ds.forEach((s, i) => {s.paths = ring(versions[i % 2]); s.advance = 630 + 15 * (i % 2);});
  }
  fs.writeFileSync(f, JSON.stringify(j));
}
console.log('D corregida');
