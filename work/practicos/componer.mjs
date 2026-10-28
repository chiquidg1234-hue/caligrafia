// node componer.mjs fuente.txt carpeta-salida [nombre]
// Composes a document in the Trazo format with «Mi letra Natural» and writes
// the PDF (all pages, odd = anversos, even = reversos), a reference PDF with
// the grid for white paper, and PNG previews of every page.
import fs from 'fs';
import path from 'path';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const WEB = new URL('../../outputs/trazo-android/web/', import.meta.url).pathname;
const {composeDocument, documentSVG, documentPDF} = await import(WEB + 'document.mjs');
const [source, out, name = path.basename(source, '.txt')] = process.argv.slice(2);
const samples = JSON.parse(fs.readFileSync(WEB + 'personal-letter.json')).profiles.find(p => p.id === 'personal-natural-v1').samples;
const started = Date.now(), result = composeDocument(fs.readFileSync(source, 'utf8'), samples);
if (result.missing.length) {console.error('Faltan:', result.missing.join(' ')); process.exit(1);}
fs.mkdirSync(out, {recursive: true});
for (const file of fs.readdirSync(out)) if (file.startsWith(`${name}-pagina-`)) fs.unlinkSync(path.join(out, file));
fs.writeFileSync(path.join(out, `${name}.pdf`), await documentPDF(result));
if (result.pages.length > 1) {
  fs.writeFileSync(path.join(out, `${name}-1-anversos.pdf`), await documentPDF(result, {select: 'odd'}));
  fs.writeFileSync(path.join(out, `${name}-2-reversos.pdf`), await documentPDF(result, {select: 'even'}));
}
fs.writeFileSync(path.join(out, `${name}-hoja-blanca-con-cuadricula.pdf`), await documentPDF(result, {grid: true, offsets: {}}));
if (!process.argv.includes('--sin-png')) {
  const {chromium} = require('playwright'), browser = await chromium.launch(), tab = await browser.newPage({viewport: {width: 211 * 4, height: 322 * 4}});
  for (const [i, page] of result.pages.entries()) {await tab.setContent(`<style>body{margin:0}</style>${documentSVG(page, result.paper)}`); await tab.screenshot({path: path.join(out, `${name}-pagina-${i + 1}-${page.side}.png`)});}
  await browser.close();
}
console.log(`${name}: ${result.pages.length} páginas en ${((Date.now() - started) / 1000).toFixed(1)} s`);
