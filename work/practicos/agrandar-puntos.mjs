// node work/practicos/agrandar-puntos.mjs
// En Fuente 2A y 2Y el punto y los dos puntos salían tan chicos que, con tinta real,
// casi no se veían. Los agranda 1,8 veces alrededor de su centro (en Mi letra Natural ya se ven).
import fs from 'fs';
const files = ['outputs/trazo-android/web/personal-letter.json', 'outputs/trazo-android/dist/personal-letter.json', 'work/caligrafia-2026-10-21/bundled-letter.json'], K = 1.8;
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const p of j.profiles) if (p.id === 'personal-2a-v1' || p.id === 'personal-2y-v1') for (const s of p.samples) if (s.char === '.' || s.char === ':') {
    if (s.dotScaled) continue;
    for (const path of s.paths) {
      const cx = path.reduce((a, q) => a + q[0], 0) / path.length, cy = path.reduce((a, q) => a + q[1], 0) / path.length;
      for (const q of path) {q[0] = +(cx + (q[0] - cx) * K).toFixed(1); q[1] = +(cy + (q[1] - cy) * K).toFixed(1);}
    }
    s.dotScaled = K;
  }
  fs.writeFileSync(f, JSON.stringify(j));
}
console.log('listo');
