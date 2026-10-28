// Puts the finished photo fonts into the letters bundled with the app.
//   node integrar.mjs perfil-2a.json perfil-2y.json
import fs from 'fs';
const root = new URL('../../', import.meta.url).pathname;
const targets = ['outputs/trazo-android/web/personal-letter.json', 'outputs/trazo-android/dist/personal-letter.json', 'work/caligrafia-2026-10-21/bundled-letter.json'].map(f => root + f);
const bundle = JSON.parse(fs.readFileSync(targets[0]));
for (const file of process.argv.slice(2)) {
  const {id, name, samples} = JSON.parse(fs.readFileSync(file)), at = bundle.profiles.findIndex(p => p.id === id);
  if (at >= 0) bundle.profiles[at] = {id, name, samples}; else bundle.profiles.push({id, name, samples});
}
const text = JSON.stringify(bundle);
for (const t of targets) fs.writeFileSync(t, text);
console.log(bundle.profiles.map(p => `${p.name}: ${p.samples.length}`).join(' · '));
