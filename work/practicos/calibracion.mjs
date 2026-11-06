// node calibracion.mjs [carpeta] — hoja de calibración Trapper (anverso + reverso).
// Dibuja con coordenadas «de hoja» (origen en la esquina superior izquierda del
// papel de 211×280 mm), SIN ninguna corrección, para medir cómo cae realmente.
// Pruebas: (1) reglas verniers: marcas que se corren 0,15 mm por columna / 0,1 mm
// por fila respecto a la cuadrícula impresa; la que quede tapando su línea da el
// corrimiento exacto; los verniers van arriba, abajo, izquierda y derecha para ver
// también inclinación y escala. (2) un círculo con punto en cada cuadro de la zona
// central: se ve el corrimiento local. (3) cruces a distancias conocidas para medir
// con regla (190 × 260 mm) y ver si la impresora escala la página.
import fs from 'fs';
import path from 'path';
const WEB = new URL('../../outputs/trazo-android/web/', import.meta.url).pathname;
const {TRAPPER_TOP, } = await import(WEB + 'document.mjs');
import * as bundle from '../../outputs/trazo-android/web/vendor/pdf-lib.min.js';
const PDF = globalThis.PDFLib || bundle.default, MM = 72 / 25.4;
const out = process.argv[2] || new URL('../../outputs/calibracion-trapper/', import.meta.url).pathname;
fs.mkdirSync(out, {recursive: true});
const RED = PDF.rgb(.82, .08, .08), BLACK = PDF.rgb(.1, .1, .1);
const SHEET = {w: TRAPPER_TOP.width, h: TRAPPER_TOP.height, g: TRAPPER_TOP.grid};

async function build({pageW, pageH, title}) {
  const doc = await PDF.PDFDocument.create(), font = await doc.embedFont(PDF.StandardFonts.Helvetica), bold = await doc.embedFont(PDF.StandardFonts.HelveticaBold);
  doc.setTitle('Trazo · calibración Trapper'); doc.setCreator('Trazo');
  for (const side of TRAPPER_TOP.sides) {
    const page = doc.addPage([pageW * MM, pageH * MM]);
    const X = x => x * MM, Y = y => (pageH - y) * MM;
    const line = (x1, y1, x2, y2, t = .18, color = RED) => page.drawLine({start: {x: X(x1), y: Y(y1)}, end: {x: X(x2), y: Y(y2)}, thickness: t * MM, color});
    const text = (s, x, y, size = 5, f = font, anchor = 'l') => { const w = f.widthOfTextAtSize(s, size); page.drawText(s, {x: X(x) - (anchor === 'r' ? w : anchor === 'c' ? w / 2 : 0), y: Y(y), size, font: f, color: BLACK}); };
    const g = SHEET.g, x0 = side.left, y0 = side.top, w = SHEET.w - side.left - side.right, h = SHEET.h - side.top - side.bottom;
    const cols = Math.floor(w / g + 1e-9), rows = Math.floor(h / g + 1e-9);
    const sx = m => (m - cols / 2) * .15, sy = m => (m - rows / 2) * .1; // desplazamientos del vernier (mm)
    const fmt = v => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(2);
    // 1) verniers de X (marcas verticales) arriba y abajo; el de abajo va en orden inverso.
    for (const [band, yTop, sgn] of [['arriba', y0 + 1.5, 1], ['abajo', y0 + rows * g - 12.5, -1]]) {
      for (let m = 0; m <= cols; m++) {
        const s = sgn * sx(m), x = x0 + m * g + s;
        line(x, yTop, x, yTop + 8.5, .2);
        if (m % 2 === 0) text(fmt(s), x, yTop + 11.2, 4, font, 'c');
        if (m === cols / 2 || (cols % 2 && m === Math.round(cols / 2))) line(x - 1.2, yTop - .6, x + 1.2, yTop - .6, .3);
      }
      text(`X ${band}`, x0 + w / 2 + 12, yTop - 1.2, 5, bold);
    }
    // vernier de Y (marcas horizontales) a la izquierda y a la derecha.
    for (const [band, xl, sgn] of [['izq', x0 + 1.2, 1], ['der', x0 + cols * g - 10.2, -1]]) {
      for (let m = 0; m <= rows; m++) {
        const s = sgn * sy(m), y = y0 + m * g + s;
        line(xl, y, xl + 8.4, y, .2);
        if (m % 2 === 0) text(fmt(s), band === 'izq' ? xl + 9.2 : xl - .8, y + 1.2, 4, font, band === 'izq' ? 'l' : 'r');
      }
    }
    // 2) círculo con punto en cada cuadro de la zona central.
    for (let j = 3; j <= rows - 4; j++) for (let i = 3; i <= cols - 4; i++) {
      const cx = x0 + (i + .5) * g, cy = y0 + (j + .5) * g;
      page.drawCircle({x: X(cx), y: Y(cy), size: 1.7 * MM, borderColor: RED, borderWidth: .15 * MM});
      page.drawCircle({x: X(cx), y: Y(cy), size: .2 * MM, color: RED});
    }
    // cruces de 6 mm sobre intersecciones nominales: esquinas de la zona y centro.
    for (const [i, j] of [[3, 3], [cols - 3, 3], [3, rows - 3], [cols - 3, rows - 3], [Math.round(cols / 2), Math.round(rows / 2)]]) {
      const cx = x0 + i * g, cy = y0 + j * g; line(cx - 3, cy, cx + 3, cy, .15); line(cx, cy - 3, cx, cy + 3, .15);
    }
    // 3) cruces absolutas en las cuatro esquinas del papel (10 mm del borde) y centro.
    const marks = [['A', 10, 10], ['B', SHEET.w - 10, 10], ['C', 10, SHEET.h - 10], ['D', SHEET.w - 10, SHEET.h - 10], ['E', SHEET.w / 2, SHEET.h / 2]];
    for (const [n, x, y] of marks) {
      line(x - 4, y, x + 4, y, .15, BLACK); line(x, y - 4, x, y + 4, .15, BLACK);
      page.drawCircle({x: X(x), y: Y(y), size: 1 * MM, borderColor: BLACK, borderWidth: .12 * MM});
      text(n, x + 2, y - 2.5, 6, bold);
    }
    // reglas milimétricas en los márgenes blancos (arriba y a la derecha o izquierda según la cara).
    const rx = x0 > 20 ? SHEET.w - 4 : x0 - 3; // columna de la regla vertical, en el margen más ancho
    const ry = 17.5;
    for (let mm = 0; mm <= 190; mm++) { const x = 10 + mm, len = mm % 10 === 0 ? 3.5 : mm % 5 === 0 ? 2.5 : 1.4; line(x, ry, x, ry - len, .1, BLACK); if (mm % 20 === 0) text(String(mm), x, ry - 4.4, 4.5, font, 'c'); }
    text('regla X (mm desde la cruz A)', 105, ry + 3, 4.5, font, 'c');
    // texto de cabecera
    text(`${side.name.toUpperCase()} · calibración 1 · ${title}`, 30, 5.2, 7, bold);
    text('Imprime al 100 %, sin ajustar a la página. Marcas negras = distancias absolutas; rojas = comparación con la cuadrícula.', 30, 8, 4.6);
    text(`cuadrícula nominal: x ${x0}…${x0 + cols * g} mm · y ${y0}…${y0 + rows * g} mm · ${cols}×${rows} cuadros`, 30, 277, 4.8);
  }
  return doc.save();
}
const variants = [
  ['Calibracion-Trapper-Letter', {pageW: 215.9, pageH: 279.4, title: 'página Letter (lo que usa la Mac)'}],
  ['Calibracion-Trapper-211x280', {pageW: 211, pageH: 280, title: 'página 211 × 280 mm'}],
];
for (const [name, v] of variants) { fs.writeFileSync(path.join(out, name + '.pdf'), await build(v)); console.log('escrito', name + '.pdf'); }
