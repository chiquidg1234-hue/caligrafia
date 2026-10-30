// node work/calibracion/altura-trapper.mjs carpeta
// A Trapper sheet to find, without a photo, how far the printer puts the
// writing above or below the lines. Each lettered row is moved down by a
// different amount on top of the current correction; she reports the row
// whose letters sit on the line (anverso and reverso).
import fs from 'fs';
import path from 'path';
const WEB = new URL('../../outputs/trazo-android/web/', import.meta.url).pathname;
const {composeDocument, documentPDF} = await import(WEB + 'document.mjs');
const samples = JSON.parse(fs.readFileSync(WEB + 'personal-letter.json')).profiles.find(p => p.id === 'personal-natural-v1').samples;
const out = process.argv[2] || 'calibracion';
const steps = [-1, -.5, 0, .5, 1, 1.5, 2, 2.5, 3, 3.5], letters = 'ABCDEFGHIJ';
const side = (label, start) => [`### ${label}`, 'Cada fila está corrida un poco distinto. Busca la fila cuyas letras se apoyan justo en la línea.', '', ...steps.flatMap((d, i) => [`${letters[i]}) mamá une ocho manos en una mesa`, ''])];
const source = ['[[hoja trapper]]', '[[letra bonita]]', '# Prueba de altura', ...side('Anverso'), '---', ...side('Reverso')].join('\n');
const result = composeDocument(source, samples);
// Move every lettered row by its amount (mm, down), ink and letters alike.
for (const page of result.pages) {
  const rows = [...new Set(page.items.filter(i => i.type === 'glyph').map(i => Math.round(i.y / 5)))].sort((a, b) => a - b);
  const lettered = rows.slice(-steps.length);
  for (const it of page.items) {
    const k = lettered.indexOf(Math.round(it.y / 5)); if (k < 0) continue;
    const d = steps[k]; it.y += d;
    for (const layer of it.layers || []) layer.polys = layer.polys.map(q => q.map(([x, y]) => [x, y + d]));
  }
}
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'Prueba-altura-Trapper.pdf'), await documentPDF(result));
fs.writeFileSync(path.join(out, 'Prueba-altura-Trapper-1-anverso.pdf'), await documentPDF(result, {select: 'anverso'}));
fs.writeFileSync(path.join(out, 'Prueba-altura-Trapper-2-reverso.pdf'), await documentPDF(result, {select: 'reverso'}));
console.log(steps.map((d, i) => `${letters[i]} = ${d > 0 ? '+' : ''}${d} mm`).join(' · '), '·', result.pages.length, 'páginas');
