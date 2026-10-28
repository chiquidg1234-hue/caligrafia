// node componer.mjs fuente.txt carpeta-salida [nombre] [--perfil personal-2a-v1] [--sin-png] [--ploter]
// Composes a document in the Trazo format with «Mi letra Natural» (or the
// bundled letter named with --perfil) and writes
// the PDF (all pages, odd = anversos, even = reversos), a reference PDF with
// the grid for white paper, and PNG previews of every page. --ploter also
// writes one SVG of centre lines per page, for a pen plotter.
import fs from 'fs';
import path from 'path';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const WEB = new URL('../../outputs/trazo-android/web/', import.meta.url).pathname;
const {composeDocument, documentSVG, documentPDF, plotterSVG} = await import(WEB + 'document.mjs');
const args = process.argv.slice(2), flag = args.indexOf('--perfil'), profile = flag >= 0 ? args.splice(flag, 2)[1] : 'personal-natural-v1';
const [source, out, name = path.basename(source, '.txt')] = args.filter(a => !a.startsWith('--'));
const samples = JSON.parse(fs.readFileSync(WEB + 'personal-letter.json')).profiles.find(p => p.id === profile).samples;
const started = Date.now(), result = composeDocument(fs.readFileSync(source, 'utf8'), samples);
if (result.missing.length) {console.error('Faltan:', result.missing.join(' ')); process.exit(1);}
fs.mkdirSync(out, {recursive: true});
for (const file of fs.readdirSync(out)) if (file.startsWith(`${name}-pagina-`) || file.startsWith(`${name}-ploter-`)) fs.unlinkSync(path.join(out, file));
if (process.argv.includes('--ploter')) for (const [i, page] of result.pages.entries()) fs.writeFileSync(path.join(out, `${name}-ploter-${i + 1}-${page.side}.svg`), plotterSVG(page, result.paper));
fs.writeFileSync(path.join(out, `${name}.pdf`), await documentPDF(result));
if (result.pages.length > 1) {
  fs.writeFileSync(path.join(out, `${name}-1-anversos.pdf`), await documentPDF(result, {select: 'anverso'}));
  fs.writeFileSync(path.join(out, `${name}-2-reversos.pdf`), await documentPDF(result, {select: 'reverso'}));
}
fs.writeFileSync(path.join(out, `${name}-hoja-blanca-con-cuadricula.pdf`), await documentPDF(result, {grid: true, offsets: {}}));
if (!process.argv.includes('--sin-png')) {
  const {chromium} = require('playwright'), browser = await chromium.launch(), tab = await browser.newPage({viewport: {width: result.paper.width * 4, height: result.paper.height * 4}});
  for (const [i, page] of result.pages.entries()) {await tab.setContent(`<style>body{margin:0}</style>${documentSVG(page, result.paper)}`); await tab.screenshot({path: path.join(out, `${name}-pagina-${i + 1}-${page.side}.png`)});}
  await browser.close();
}
console.log(`${name}: ${result.pages.length} páginas en ${((Date.now() - started) / 1000).toFixed(1)} s`);
