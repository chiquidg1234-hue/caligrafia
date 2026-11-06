// node calibracion6.mjs — prueba 6, CON la corrección de calibracion-trapper.json (anverso medido, reverso estimado).
// Rango amplio (±2,4 mm, pasos de 0,2) para que ninguna franja quede «sin marca». Incluye una regla de límite
// de impresión abajo, para ver hasta qué altura imprime realmente la impresora.
import fs from 'fs';
const WEB = new URL('../../outputs/trazo-android/web/', import.meta.url).pathname;
const {TRAPPER_TOP} = await import(WEB + 'document.mjs');
import * as bundle from '../../outputs/trazo-android/web/vendor/pdf-lib.min.js';
const PDF = globalThis.PDFLib || bundle.default, MM = 72 / 25.4;
const out = new URL('../../outputs/calibracion-trapper/', import.meta.url).pathname;
const cal = JSON.parse(fs.readFileSync(new URL('./calibracion-trapper.json', import.meta.url)));
const doc = await PDF.PDFDocument.create(), font = await doc.embedFont(PDF.StandardFonts.Helvetica), bold = await doc.embedFont(PDF.StandardFonts.HelveticaBold);
const RED = PDF.rgb(.82, .08, .08), INK = PDF.rgb(.55, .05, .3), pageW = 215.9, pageH = 279.4, g = 5;
const tenths = v => (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(Math.round(v * 10));
for (const side of TRAPPER_TOP.sides) {
  const c = cal[side.name], step = side.name === 'anverso' ? .1 : .2, E = (x, y) => [c.ex0 + c.bx * (y - c.exRefY), c.ey0 + c.by * (x - c.eyRefX)], fx = (x, y) => x - E(x, y)[0], fy = (x, y) => y - E(x, y)[1];
  const page = doc.addPage([pageW * MM, pageH * MM]), P = (x, y) => ({x: x * MM, y: (pageH - y) * MM});
  const line = (a, b, t, color = RED) => page.drawLine({start: P(...a), end: P(...b), thickness: t * MM, color});
  const text = (s, x, y, size, f = font, anchor = 'l') => { const w = f.widthOfTextAtSize(s, size) / MM; page.drawText(s, {...P(anchor === 'c' ? x - w / 2 : anchor === 'r' ? x - w : x, y), size, font: f, color: INK}); };
  const x0 = side.left, y0 = side.top, cols = 34, rows = Math.floor((TRAPPER_TOP.height - side.top - side.bottom) / g);
  const sOf = m => (m - 12) * step;
  const xBands = [['X-A', 1], ['X-B', 5], ['X-C', 36], ['X-D', 40]];
  for (const [name, row] of xBands) {
    const yTop = y0 + row * g + .5; text(name, x0 + 7, yTop + 4, 8, bold, 'r');
    for (let m = 0; m <= 24; m++) { const s = sOf(m), xn = x0 + (m + 2) * g, x = fx(xn, yTop + 4) + s, dy = fy(xn, yTop + 4) - (yTop + 4); line([x, yTop + dy], [x, yTop + 8 + dy], .22); if (m % 2 === 0) text(tenths(s), x, yTop + 11 + dy, 6, font, 'c'); }
  }
  const yBands = [['Y-A', 1], ['Y-B', 5], ['Y-C', 22], ['Y-D', 26]];
  for (const [name, col] of yBands) {
    const xl = x0 + col * g + .5; text(name, xl, y0 + 9 * g - 3, 8, bold);
    for (let m = 0; m <= 24; m++) { const s = sOf(m), yn = y0 + (m + 10) * g, y = fy(xl + 4.5, yn) + s, dx = fx(xl + 4.5, yn) - (xl + 4.5); line([xl + dx, y], [xl + 9 + dx, y], .22); if (m % 2 === 0) text(tenths(s), xl + 10.5 + dx, y + 1.1, 6); }
  }
  // Regla de límite de impresión: una barra cada 5 mm de y=150 a y=275, con la altura escrita cada 10.
  for (let y = 200; y <= 275; y += 5) { line([x0 + 146, y], [x0 + 160, y], .25); if (y % 10 === 0) text(String(y), x0 + 162, y + 1, 6); }
  text('límite: ¿hasta qué número llegó?', x0 + 130, 196, 6);
  for (const [n, x, y] of [['A', 10, 10], ['B', 201, 10], ['C', 10, 268], ['D', 201, 268]]) { line([x - 4, y], [x + 4, y], .15, INK); line([x, y - 4], [x, y + 4], .15, INK); text(n, x + 2, y - 2.5, 6, bold); }
  const x1 = x0 + cols * g, y1 = y0 + rows * g; for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { const cx = fx(x, y), cy = fy(x, y); line([cx - 2.2, cy], [cx + 2.2, cy], .2); line([cx, cy - 2.2], [cx, cy + 2.2], .2); }
  text(`${side.name.toUpperCase()} · prueba (corregida) · Letter`, 30, 5.6, 7, bold);
  text('Marca roja que TAPA su línea en cada franja. Con la corrección bien puesta debe ser la «0» (anverso: pasos de 0,1 mm; reverso: de 0,2 mm). Si ninguna tapa: N y hacia dónde se acerca.', 30, 9, 4.6);
  text('X-A ____ X-B ____ X-C ____ X-D ____', x0 + 92, y0 + 80, 7.5, bold, 'c'); text('Y-A ____ Y-B ____ Y-C ____ Y-D ____', x0 + 92, y0 + 92, 7.5, bold, 'c'); text('límite ____', x0 + 92, y0 + 104, 7.5, bold, 'c');
}
fs.writeFileSync(out + (process.argv[2] || 'Calibracion6') + '-Trapper-Letter.pdf', await doc.save()); console.log('ok');
