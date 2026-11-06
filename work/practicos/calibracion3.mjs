// node calibracion3.mjs — verificación del anverso con la corrección medida + vernier del reverso (de la ronda 2).
import fs from 'fs';
import {createRequire} from 'module';
const WEB = new URL('../../outputs/trazo-android/web/', import.meta.url).pathname;
const {TRAPPER_TOP} = await import(WEB + 'document.mjs');
import * as bundle from '../../outputs/trazo-android/web/vendor/pdf-lib.min.js';
const PDF = globalThis.PDFLib || bundle.default, MM = 72 / 25.4;
const out = new URL('../../outputs/calibracion-trapper/', import.meta.url).pathname;
const cal = JSON.parse(fs.readFileSync(new URL('./calibracion-trapper.json', import.meta.url))).anverso;
const E = (x, y) => ({x: cal.ex0 - cal.theta * (y - cal.exRefY), y: cal.ey0 + cal.theta * (x - cal.eyRefX)});
const fix = (x, y) => { const e = E(x, y); return [x - e.x, y - e.y]; };   // dónde dibujar para que caiga en (x, y)
const doc = await PDF.PDFDocument.create(), font = await doc.embedFont(PDF.StandardFonts.Helvetica), bold = await doc.embedFont(PDF.StandardFonts.HelveticaBold);
const RED = PDF.rgb(.82, .08, .08), INK = PDF.rgb(.55, .05, .3), pageW = 215.9, pageH = 279.4;
const page = doc.addPage([pageW * MM, pageH * MM]), P = (x, y) => ({x: x * MM, y: (pageH - y) * MM});
const line = (a, b, t, color = RED) => page.drawLine({start: P(...a), end: P(...b), thickness: t * MM, color});
const text = (s, x, y, size, f = font, anchor = 'l') => { const w = f.widthOfTextAtSize(s, size); page.drawText(s, {...P(x - (anchor === 'c' ? w / MM / 2 : 0), y), size, font: f, color: INK}); };
const side = TRAPPER_TOP.sides[0], g = 5, x0 = side.left, y0 = side.top, cols = 34, rows = 50;
// Rejilla completa encima de la rejilla de la hoja, con la corrección aplicada (se corrige también por inclinación).
for (let j = 0; j <= rows; j++) line(fix(x0, y0 + j * g), fix(x0 + cols * g, y0 + j * g), .2);
for (let i = 0; i <= cols; i++) line(fix(x0 + i * g, y0), fix(x0 + i * g, y0 + rows * g), .2);
// Cruces absolutas y reglas, sin corregir.
for (const [n, x, y] of [['A', 10, 10], ['B', 201, 10], ['C', 10, 270], ['D', 201, 270]]) { line([x - 4, y], [x + 4, y], .15, INK); line([x, y - 4], [x, y + 4], .15, INK); text(n, x + 2, y - 2.5, 6, bold); }
text('ANVERSO · verificación (corrección aplicada) · Letter', 30, 5.6, 7, bold);
text('Si todo está bien, la cuadrícula roja TAPA la de la hoja y ves una sola línea en toda la hoja.', 30, 9, 5);
text('Mira las 4 esquinas y el centro: ¿una línea, o roja y gris separadas? ¿de qué lado queda la gris?', 30, 12, 5);
// Segunda página: vernier del reverso (ronda 2, sin corregir) para medirlo igual.
const src = await PDF.PDFDocument.load(fs.readFileSync(out + 'Calibracion2-Trapper-Letter.pdf'));
const [rev] = await doc.copyPages(src, [1]); doc.addPage(rev);
fs.writeFileSync(out + 'Calibracion3-Trapper-Letter.pdf', await doc.save());
console.log('listo; corrección en las esquinas (mm a restar):', [[x0, y0], [x0 + 170, y0], [x0, y0 + 250], [x0 + 170, y0 + 250]].map(([x, y]) => { const e = E(x, y); return `(${e.x.toFixed(2)}, ${e.y.toFixed(2)})`; }).join(' '));
