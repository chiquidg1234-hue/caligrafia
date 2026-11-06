// node calibracion5.mjs — prueba 5, SIN corrección (posiciones crudas, comparables entre hojas).
// Rango amplio (±2,4 mm, pasos de 0,2) para que ninguna franja quede «sin marca». Incluye una regla de límite
// de impresión abajo, para ver hasta qué altura imprime realmente la impresora.
import fs from 'fs';
const WEB = new URL('../../outputs/trazo-android/web/', import.meta.url).pathname;
const {TRAPPER_TOP} = await import(WEB + 'document.mjs');
import * as bundle from '../../outputs/trazo-android/web/vendor/pdf-lib.min.js';
const PDF = globalThis.PDFLib || bundle.default, MM = 72 / 25.4;
const out = new URL('../../outputs/calibracion-trapper/', import.meta.url).pathname;
const doc = await PDF.PDFDocument.create(), font = await doc.embedFont(PDF.StandardFonts.Helvetica), bold = await doc.embedFont(PDF.StandardFonts.HelveticaBold);
const RED = PDF.rgb(.82, .08, .08), INK = PDF.rgb(.55, .05, .3), pageW = 215.9, pageH = 279.4, g = 5;
const tenths = v => (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(Math.round(v * 10));
for (const side of TRAPPER_TOP.sides) {
  const page = doc.addPage([pageW * MM, pageH * MM]), P = (x, y) => ({x: x * MM, y: (pageH - y) * MM});
  const line = (a, b, t, color = RED) => page.drawLine({start: P(...a), end: P(...b), thickness: t * MM, color});
  const text = (s, x, y, size, f = font, anchor = 'l') => { const w = f.widthOfTextAtSize(s, size) / MM; page.drawText(s, {...P(anchor === 'c' ? x - w / 2 : anchor === 'r' ? x - w : x, y), size, font: f, color: INK}); };
  const x0 = side.left, y0 = side.top, cols = 34, rows = Math.floor((TRAPPER_TOP.height - side.top - side.bottom) / g);
  const sOf = m => (m - 12) * .2;
  const xBands = [['X-A', 1], ['X-B', 5], ['X-C', 36], ['X-D', 40]];
  for (const [name, row] of xBands) {
    const yTop = y0 + row * g + .5; text(name, x0 + 7, yTop + 4, 8, bold, 'r');
    for (let m = 0; m <= 24; m++) { const s = sOf(m), x = x0 + (m + 2) * g + s; line([x, yTop], [x, yTop + 8], .22); if (m % 2 === 0) text(tenths(s), x, yTop + 11, 6, font, 'c'); }
  }
  const yBands = [['Y-A', 1], ['Y-B', 5], ['Y-C', 22], ['Y-D', 26]];
  for (const [name, col] of yBands) {
    const xl = x0 + col * g + .5; text(name, xl, y0 + 9 * g - 3, 8, bold);
    for (let m = 0; m <= 24; m++) { const s = sOf(m), y = y0 + (m + 10) * g + s; line([xl, y], [xl + 9, y], .22); if (m % 2 === 0) text(tenths(s), xl + 10.5, y + 1.1, 6); }
  }
  // Regla de límite de impresión: una barra cada 5 mm de y=150 a y=275, con la altura escrita cada 10.
  for (let y = 200; y <= 275; y += 5) { line([x0 + 146, y], [x0 + 160, y], .25); if (y % 10 === 0) text(String(y), x0 + 162, y + 1, 6); }
  text('límite: ¿hasta qué número llegó?', x0 + 130, 196, 6);
  for (const [n, x, y] of [['A', 10, 10], ['B', 201, 10], ['C', 10, 268], ['D', 201, 268]]) { line([x - 4, y], [x + 4, y], .15, INK); line([x, y - 4], [x, y + 4], .15, INK); text(n, x + 2, y - 2.5, 6, bold); }
  text(`${side.name.toUpperCase()} · prueba 5 (sin corrección) · Letter`, 30, 5.6, 7, bold);
  text('Marca roja que TAPA su línea en cada franja (números en décimas de mm; si ninguna, escribe N y el lado hacia el que se acerca).', 30, 9, 4.6);
  text('X-A ____ X-B ____ X-C ____ X-D ____', x0 + 92, y0 + 80, 7.5, bold, 'c'); text('Y-A ____ Y-B ____ Y-C ____ Y-D ____', x0 + 92, y0 + 92, 7.5, bold, 'c'); text('límite ____', x0 + 92, y0 + 104, 7.5, bold, 'c');
}
fs.writeFileSync(out + 'Calibracion5-Trapper-Letter.pdf', await doc.save()); console.log('ok');
