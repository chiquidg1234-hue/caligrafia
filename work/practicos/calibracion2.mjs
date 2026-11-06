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
const RED = PDF.rgb(.82, .08, .08), BLACK = PDF.rgb(.55, .05, .3);
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
    // Verniers GRANDES para leer a ojo sobre el papel: 26 marcas por banda, cada una
    // corrida 0,1 mm más que la anterior. Dos bandas por eje (de -2,5 a 0 y de 0 a +2,5).
    // Rótulo = décimas de mm (-13 = -1,3 mm). La marca que TAPA su línea verde es la respuesta.
    const tenths = v => (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(Math.round(v * 10));
    const xBands = [['A', y0 + 2, -25], ['B', y0 + 22, 0], ['C', y0 + (rows - 8) * g + 2, -25], ['D', y0 + (rows - 4) * g + 2, 0]];
    for (const [name, yTop, base] of xBands) {
      text(`X-${name}`, x0 - 2.2, yTop + 4, 8, bold, 'r');
      for (let m = 0; m <= 25; m++) {
        const s = (base + m) / 10, x = x0 + (m + 2) * g + s;
        line(x, yTop, x, yTop + 9, .22);
        text(tenths(s), x, yTop + 12.4, 7, font, 'c');
      }
    }
    const yBands = [['A', x0 + 1, -25, 'l'], ['B', x0 + 20, 0, 'l'], ['C', x0 + cols * g - 36, -25, 'r'], ['D', x0 + cols * g - 17, 0, 'r']];
    for (const [name, xl, base] of yBands) {
      text(`Y-${name}`, xl, y0 + 8 * g - 3.2, 8, bold);
      for (let m = 0; m <= 25; m++) {
        const s = (base + m) / 10, y = y0 + (m + 9) * g + s;
        line(xl, y, xl + 10, y, .22);
        text(tenths(s), xl + 11, y + 1.2, 7, font);
      }
    }
    // Instrucciones en el centro.
    const cx = x0 + w / 2, cy = y0 + h / 2 - 20;
    ['Mira cada banda (X-A…X-D arriba/abajo, Y-A…Y-D a los lados).', 'En cada una, busca la marca roja que TAPA por completo su línea verde:',
      'se ve como UNA sola línea. Los números están en décimas de mm', '(-13 = -1,3 mm; +7 = +0,7 mm). Si dos marcas vecinas tapan igual,', 'anota el promedio. Si ninguna tapa, dímelo.'].forEach((t, i) => text(t, cx, cy + i * 6, 6.4, i ? font : bold, "c"));
    page.drawRectangle({x: X(cx - 42), y: Y(cy + 62), width: 84 * MM, height: 26 * MM, borderColor: RED, borderWidth: .25 * MM});
    ['X-A ____   X-B ____   X-C ____   X-D ____', 'Y-A ____   Y-B ____   Y-C ____   Y-D ____'].forEach((t, i) => text(t, cx, cy + 46 + i * 9, 8, bold, 'c'));
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
    text(`${side.name.toUpperCase()} · calibración 2 · ${title}`, 30, 5.2, 7, bold);
    text('Imprime al 100 %, sin ajustar a la página. Marcas negras = distancias absolutas; rojas = comparación con la cuadrícula.', 30, 8, 4.6);
    text(`cuadrícula nominal: x ${x0}…${x0 + cols * g} mm · y ${y0}…${y0 + rows * g} mm · ${cols}×${rows} cuadros`, 30, 277, 4.8);
  }
  return doc.save();
}
const variants = [
  ['Calibracion2-Trapper-Letter', {pageW: 215.9, pageH: 279.4, title: 'página Letter (lo que usa la Mac)'}],
  ['Calibracion2-Trapper-211x280', {pageW: 211, pageH: 280, title: 'página 211 × 280 mm'}],
];
for (const [name, v] of variants) { fs.writeFileSync(path.join(out, name + '.pdf'), await build(v)); console.log('escrito', name + '.pdf'); }
