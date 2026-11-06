// node calibracion4.mjs — prueba final del anverso: verniers finos (±1,0 mm) YA corregidos con el modelo medido
// (si el modelo es bueno, la marca que tapa la línea es la «0» en todas las franjas), más un parche pequeño
// de líneas sobre la cuadrícula. La página 2 es el vernier del reverso sin corregir (ronda 2).
import fs from 'fs';
const WEB = new URL('../../outputs/trazo-android/web/', import.meta.url).pathname;
const {TRAPPER_TOP} = await import(WEB + 'document.mjs');
import * as bundle from '../../outputs/trazo-android/web/vendor/pdf-lib.min.js';
const PDF = globalThis.PDFLib || bundle.default, MM = 72 / 25.4;
const out = new URL('../../outputs/calibracion-trapper/', import.meta.url).pathname;
const cal = JSON.parse(fs.readFileSync(new URL('./calibracion-trapper.json', import.meta.url))).anverso;
const E = (x, y) => ({x: cal.ex0 - cal.theta * (y - cal.exRefY), y: cal.ey0 + cal.theta * (x - cal.eyRefX)});
const fix = (x, y) => { const e = E(x, y); return [x - e.x, y - e.y]; };
const doc = await PDF.PDFDocument.create(), font = await doc.embedFont(PDF.StandardFonts.Helvetica), bold = await doc.embedFont(PDF.StandardFonts.HelveticaBold);
const RED = PDF.rgb(.82, .08, .08), INK = PDF.rgb(.55, .05, .3), pageW = 215.9, pageH = 279.4;
const page = doc.addPage([pageW * MM, pageH * MM]), P = (x, y) => ({x: x * MM, y: (pageH - y) * MM});
const line = (a, b, t, color = RED) => page.drawLine({start: P(...a), end: P(...b), thickness: t * MM, color});
const text = (s, x, y, size, f = font, anchor = 'l') => { const w = f.widthOfTextAtSize(s, size) / MM; page.drawText(s, {...P(anchor === 'c' ? x - w / 2 : anchor === 'r' ? x - w : x, y), size, font: f, color: INK}); };
const side = TRAPPER_TOP.sides[0], g = 5, x0 = side.left, y0 = side.top, cols = 34, rows = 50;
const tenths = v => (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(Math.round(v * 10));
// Franjas X: marca vertical en la columna c con desplazamiento s; se dibuja en nominal+s corregido.
for (const [name, row] of [['X-A', 1], ['X-B', 5], ['X-C', 42], ['X-D', 46]]) {
  const yTop = y0 + row * g + 1; text(name, x0 + 6, yTop + 4, 8, bold, 'r');
  for (let m = 0; m <= 20; m++) {
    const s = (m - 10) / 10, xn = x0 + (m + 2) * g, [xa, ya] = fix(xn, yTop + 4.5);
    line([xa + s, ya - 4.5], [xa + s, ya + 4.5], .22);
    text(tenths(s), xa + s, ya + 8.4, 6.5, font, 'c');
  }
}
// Franjas Y: marca horizontal en la fila r con desplazamiento s.
for (const [name, col] of [['Y-A', 1], ['Y-B', 5], ['Y-C', 26], ['Y-D', 30]]) {
  const xl = x0 + col * g + 1; text(name, xl, y0 + 10 * g - 4, 8, bold);
  for (let m = 0; m <= 20; m++) {
    const s = (m - 10) / 10, yn = y0 + (m + 11) * g, [xa, ya] = fix(xl + 5, yn);
    line([xa - 5, ya + s], [xa + 5, ya + s], .22);
    text(tenths(s), xa + 6.5, ya + s + 1.2, 6.5);
  }
}
// Parche central de 9×6 cuadros con las líneas dibujadas encima de las de la hoja (no toda la hoja).
const px = x0 + 12 * g, py = y0 + 21 * g;
for (let j = 0; j <= 6; j++) line(fix(px, py + j * g), fix(px + 9 * g, py + j * g), .2);
for (let i = 0; i <= 9; i++) line(fix(px + i * g, py), fix(px + i * g, py + 6 * g), .2);
text('parche: la roja debe tapar la línea de la hoja', px + 22.5, py - 2, 6, font, 'c');
for (const [n, x, y] of [['A', 10, 10], ['B', 201, 10], ['C', 10, 270], ['D', 201, 270]]) { line([x - 4, y], [x + 4, y], .15, INK); line([x, y - 4], [x, y + 4], .15, INK); text(n, x + 2, y - 2.5, 6, bold); }
text('ANVERSO · prueba 4 (corregida) · Letter', 30, 5.6, 7, bold);
text('Busca en cada franja la marca roja que TAPA su línea. Con la corrección bien puesta debe ser la «0» en todas.', 30, 9, 5);
text('X-A X-B X-C X-D ____ ____ ____ ____    Y-A Y-B Y-C Y-D ____ ____ ____ ____', 115, 205, 7.5, bold, 'c');
const src = await PDF.PDFDocument.load(fs.readFileSync(out + 'Calibracion2-Trapper-Letter.pdf'));
const [rev] = await doc.copyPages(src, [1]); doc.addPage(rev);
fs.writeFileSync(out + 'Calibracion4-Trapper-Letter.pdf', await doc.save());
console.log('ok');
