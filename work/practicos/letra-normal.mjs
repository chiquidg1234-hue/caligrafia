// node work/practicos/letra-normal.mjs
// Crea «Mi letra normal» (personal-normal-v1) a partir de Mi letra Natural, pero que no se note que es la misma:
// cada muestra se inclina hacia adelante (distinto cada vez), se angosta un poco, se estira o aplasta
// y se tuerce con una ondulación suave y propia. Los signos chiquitos (punto, coma…) solo cambian de tamaño.
// La letra queda un poco más apurada y desprolija que la original.
import fs from 'fs';
const files = ['outputs/trazo-android/web/personal-letter.json', 'outputs/trazo-android/dist/personal-letter.json', 'work/caligrafia-2026-10-21/bundled-letter.json'];
const hash = s => {let h = 2166136261; for (const c of s) {h ^= c.charCodeAt(0); h = Math.imul(h, 16777619);} return h >>> 0;};
const rng = seed => {let s = seed || 1; return () => {s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 * 2 - 1;};};
const r1 = n => +n.toFixed(1);
function make(sample) {
  const random = rng(hash(sample.id) + 12345), pts = sample.paths.flat(), ys = pts.map(p => p[1]), height = Math.max(...ys) - Math.min(...ys), small = height < 160;
  const shear = small ? 0 : .2 + random() * .06, sx = (small ? 1 : .88) * (1 + random() * .05), sy = 1 + random() * .05, A = small ? 0 : 12 + 5 * Math.abs(random());
  const f1 = .008 + .006 * Math.abs(random()), f2 = .008 + .006 * Math.abs(random()), p1 = random() * 6.3, p2 = random() * 6.3, mid = 250, left = Math.min(...pts.map(p => p[0]));
  const paths = sample.paths.map(path => path.map(([x, y]) => {
    let nx = left + (x - left) * sx + shear * (y - mid), ny = y * sy;
    nx += A * Math.sin(y * f1 + p1); ny += A * .7 * Math.sin(x * f2 + p2);
    return [r1(nx), r1(ny)];
  }));
  return {...sample, id: 'nm-' + sample.id, paths, advance: Math.round(sample.advance * sx * (1 + random() * .04))};
}
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8')), nat = j.profiles.find(p => p.id === 'personal-natural-v1');
  const normal = {id: 'personal-normal-v1', name: 'Mi letra normal', samples: nat.samples.map(make)};
  j.profiles = j.profiles.filter(p => p.id !== normal.id); j.profiles.splice(j.profiles.findIndex(p => p.id === 'personal-2a-v1'), 0, normal);
  fs.writeFileSync(f, JSON.stringify(j));
}
console.log('listo');
