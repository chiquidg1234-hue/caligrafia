// node work/practicos/letra-mixta.mjs
// Crea «Mi letra + 2A» (personal-mixta-v1): para cada carácter junta las muestras de
// Mi letra Natural y las de Fuente 2A. La app turna las versiones de cada letra, así que
// una misma palabra mezcla las dos manos, como una letra propia con rasgos de otra.
import fs from 'fs';
const files = ['outputs/trazo-android/web/personal-letter.json', 'outputs/trazo-android/dist/personal-letter.json', 'work/caligrafia-2026-10-21/bundled-letter.json'];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8')), nat = j.profiles.find(p => p.id === 'personal-natural-v1'), a2 = j.profiles.find(p => p.id === 'personal-2a-v1');
  const mixed = {id: 'personal-mixta-v1', name: 'Mi letra + 2A', samples: [...nat.samples.map(s => ({...s, id: 'mx-n-' + s.id})), ...a2.samples.map(s => ({...s, id: 'mx-a-' + s.id}))]};
  j.profiles = j.profiles.filter(p => p.id !== mixed.id); j.profiles.splice(j.profiles.indexOf(a2), 0, mixed); // antes de 2A y 2Y
  fs.writeFileSync(f, JSON.stringify(j));
}
console.log('listo');
