// Writes the font files of the photo fonts for outputs/fuentes-2a-2y.
//   node entregar.mjs informe-2a.json informe-2y.json
import fs from 'fs';
import {buildFont} from '../../outputs/trazo-android/web/core.mjs';
const root = new URL('../../', import.meta.url).pathname, out = root + 'outputs/fuentes-2a-2y/';
const bundle = JSON.parse(fs.readFileSync(root + 'outputs/trazo-android/web/personal-letter.json'));
fs.mkdirSync(out, {recursive: true});
for (const [id, report] of [['personal-2a-v1', process.argv[2]], ['personal-2y-v1', process.argv[3]]]) {
  const {name, samples} = bundle.profiles.find(p => p.id === id), file = out + name.replace(' ', '-');
  fs.writeFileSync(file + '.otf', Buffer.from(buildFont(samples, name).buffer));
  fs.writeFileSync(file + '.trazo', JSON.stringify({type: 'trazo-library', version: 2, name, samples: samples.map(({label, char, paths, advance, baseline}) => ({label, char, paths, advance, baseline}))}));
  fs.copyFileSync(report, file + '-origen.json');
  console.log(name, samples.length, 'muestras');
}
