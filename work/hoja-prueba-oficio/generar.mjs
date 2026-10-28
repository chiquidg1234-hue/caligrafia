// Two-sided test sheet for the measured Oficio spiral notebook (5 mm squares).
// Everything is composed with the app's own engine (layoutText, formulas, maps)
// so what passes here is what the app prints.
//
//   node generar.mjs   -> outputs/hoja-prueba-oficio/*.pdf, *.png
import fs from 'fs';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const ROOT = new URL('../../', import.meta.url).pathname, WEB = ROOT + 'outputs/trazo-android/web/', OUT = ROOT + 'outputs/hoja-prueba-oficio/';
const {layoutText} = await import(WEB + 'core.mjs');
const {svgPaths} = await import(WEB + 'exports.mjs');
const {createMap, renderMap} = await import(WEB + 'maps.mjs');
const {handStroke} = await import(WEB + 'math.mjs');
const PDF = (await import(WEB + 'vendor/pdf-lib.min.js')).default;
const MM = 72 / 25.4, GRID = 5, SHEET = {width: 211, height: 322};
const bundle = JSON.parse(fs.readFileSync(WEB + 'personal-letter.json'));
const LETTERS = Object.fromEntries(bundle.profiles.map(p => [p.id.replace(/^personal-|-v\d+$/g, ''), p.samples]));
const SIDES = {
  // Measured margins marked «≈» are adjusted so that the writing area is exactly
  // 35 × 57 squares (17,5 × 28,5 cm) on a 21,1 × 32,2 cm sheet.
  anverso: {left: 20, right: 16, top: 20, bottom: 17},
  reverso: {left: 16, right: 20, top: 22, bottom: 15},
};
const INK = '#193c66', NOTE = '#66788a';
fs.mkdirSync(OUT, {recursive: true});

function sheet(name) {
  const m = SIDES[name], page = {name, ...m, width: SHEET.width - m.left - m.right, rows: Math.round((SHEET.height - m.top - m.bottom) / GRID), items: [], row: 0};
  if (Math.abs(page.width - 175) > .01 || page.rows !== 57) throw Error('Las medidas no coinciden con el área útil 17,5 × 28,5 cm.');
  return page;
}
// One block of handwriting starting on a grid row; returns the rows it used.
function write(page, text, {profile = 'natural', size = 15, leading = 5, natural = .6, math = false, lineGap = 0, color = INK, styles = [], seed = 17, x = 0, width = page.width, rowGap = 0} = {}) {
  // Start below the ink of the block above (descenders and denominators may
  // share up to 1 mm with the next ascenders, like consecutive written lines).
  const rowLine = page.top + page.row * GRID, offset = x === 0 ? Math.max(0, (page.inkBottom || 0) - 1 - rowLine) : 0;
  const height = 300, layout = layoutText(text, LETTERS[profile], {width, height, margin: 0, marginTop: offset, size, leading, lineGap, natural, math, snapToGrid: true, gridMm: GRID, gridOriginY: -offset, ink: color, styles, seed});
  if (layout.missing.length) throw Error(`Faltan ${layout.missing.join(' ')} en ${profile}: «${text.slice(0, 40)}»`);
  if (layout.pages.length > 1) throw Error('El bloque no cabe: ' + text.slice(0, 40));
  const top = rowLine; let bottom = 0, ink = 0;
  for (const e of layout.pages[0]) {
    page.items.push({type: 'glyph', paths: e.paths, x: page.left + x + e.x, y: top + e.y, scale: e.scale, color: e.color, strokeWidth: e.strokeWidth});
    bottom = Math.max(bottom, e.y);
    for (const p of e.paths) for (const [, y] of p) ink = Math.max(ink, e.y - y * e.scale);
  }
  // A block ends on its last baseline: the next block writes on the next line,
  // exactly as consecutive lines of one paragraph.
  const used = Math.round(bottom / GRID) + rowGap;
  if (x === 0) {page.row += used; page.inkBottom = top + ink;}
  if (process.env.DEBUG) console.log(page.name, page.row, used, text.slice(0, 30));
  if (page.row > page.rows && !process.env.DEBUG) throw Error(`La hoja ${page.name} se pasa del área útil (${page.row} de ${page.rows} renglones).`);
  return used;
}
const label = (page, text) => write(page, text, {size: 11, color: NOTE, natural: .3});
const mark = (page, d, width = .18, color = INK) => page.items.push({type: 'line', ...d, width, color});
// Printer check: corners of the writing area and a 50 mm ruler in the top margin.
function calibration(page) {
  const l = page.left, t = page.top, r = page.left + page.width, b = page.top + page.rows * GRID;
  for (const [x, y, sx, sy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]]) {mark(page, {x1: x, y1: y, x2: x + 4 * sx, y2: y}); mark(page, {x1: x, y1: y, x2: x, y2: y + 4 * sy});}
  const y = t - 7; mark(page, {x1: l, y1: y, x2: l + 50, y2: y});
  for (let k = 0; k <= 10; k++) mark(page, {x1: l + k * 5, y1: y - (k % 2 ? 1 : 2), x2: l + k * 5, y2: y});
}
function rect(page, x, y, w, h, color) {page.items.push({type: 'rect', x: page.left + x, y: page.top + y, w, h, color});}
function box(page, x, y, w, h, color = '#9fb2c4') {const X = page.left + x, Y = page.top + y; for (const d of [[X, Y, X + w, Y], [X + w, Y, X + w, Y + h], [X + w, Y + h, X, Y + h], [X, Y + h, X, Y]]) mark(page, {x1: d[0], y1: d[1], x2: d[2], y2: d[3]}, .15, color);}

// ---------------- Anverso: letra, renglones, perfiles, tamaños ----------------
const front = sheet('anverso');
calibration(front);
write(front, 'Hoja de prueba · anverso', {size: 19, natural: .4});
label(front, 'Oficio 21,1 × 32,2 cm · área útil 17,5 × 28,5 cm · cuadritos de 5 mm');
label(front, 'A · Renglón seguido: un renglón cada 5 mm · letra Natural · naturalidad 60 %');
write(front, 'Hoy probamos mi letra en una hoja de verdad. Quiero que se vea bonita, clara y con ritmo, pero no perfecta: que cada palabra tenga pequeñas diferencias, como cuando escribo a mano en clase. El viejo pingüino llegó al jardín y pidió café con azúcar; mañana repasaré química, física y lenguaje.', {seed: 3});
label(front, 'B · Renglón por medio: escribo uno y dejo uno libre');
write(front, 'En las materias donde dejo un renglón libre, el texto respira más y se lee mejor. Puedo elegir esta opción para cada cuaderno o materia y guardarla con su nombre.', {lineGap: 1, seed: 5});
label(front, 'C · La misma frase con cada perfil');
for (const [profile, name, natural] of [['natural', 'Natural 60 %', .6], ['uniforme', 'Uniforme 60 %', .6], ['uniforme', 'Uniforme 0 %', 0], ['original', 'Original 0 %', 0], ['optimizada', 'Optimizada 0 %', 0]])
  write(front, `${name}: Mañana escribiré mis apuntes de química, 2026.`, {profile, natural, seed: 11});
label(front, 'D · Naturalidad 0 % · 30 % · 60 % · 100 %');
for (const natural of [0, .3, .6, 1]) write(front, `${Math.round(natural * 100)} %: letra letra letra, palabra palabra palabra.`, {natural, seed: 23});
label(front, 'E · Tamaños 13 · 15 · 18 · 22 pt');
for (const size of [13, 15, 18, 22]) write(front, `${size} pt: Tamaño de mi letra en la cuadrícula.`, {size, seed: 29});
label(front, 'F · Todas mis letras y signos');
write(front, 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ  abcdefghijklmnñopqrstuvwxyz\nÁÉÍÓÚÜ  áéíóúü  0123456789  . , ; : ¿? ¡! ( ) [ ] { } " \' / \\\n@ # $ % & * + = - _ ~ « » € ÷ ² ³   nuevos: × · < > ≤ ≥ ± ≠ → ∞ ° |', {seed: 31});
label(front, 'G · Variantes: cada letra varias veces');
write(front, 'aaa eee ooo sss nnn rrr lll ttt ddd mmm ccc uuu ppp ggg yyy jjj ñññ', {seed: 37});
label(front, 'H · Negrita, cursiva y color');
{const t = 'Normal, negrita, cursiva y una palabra en rojo.'; write(front, t, {seed: 41, styles: [{start: t.indexOf('negrita'), end: t.indexOf('negrita') + 7, bold: true}, {start: t.indexOf('cursiva'), end: t.indexOf('cursiva') + 7, italic: true}, {start: t.indexOf('rojo'), end: t.indexOf('rojo') + 4, color: '#b3261e'}]});}
label(front, 'I · Una tarea de lenguaje, con título en color');
{const t = 'Tarea de Lenguaje\n1. Subraya el sujeto: «Mi hermana canta en el coro.»\n2. ¿Qué es un sustantivo? Es la palabra que nombra personas, animales, cosas o ideas.'; write(front, t, {seed: 71, styles: [{start: 0, end: 17, bold: true, color: '#b3261e'}]});}
label(front, 'J · Signos dentro de frases');
write(front, '¿Cómo estás? ¡Muy bien! Son las 10:30; compré 3,5 kg de papas con 50 % de descuento (oferta) y escribí a correo@ejemplo.com.', {seed: 73});
label(front, 'K · Escribe tú a mano, en los dos renglones de abajo, la misma frase:');
write(front, 'El pingüino escribió una canción.', {seed: 43});
front.row += 2;

// ---------------- Reverso: matemáticas, física, mapa, colores ----------------
const back = sheet('reverso');
calibration(back);
write(back, 'Hoja de prueba · reverso', {size: 19, natural: .4});
label(back, 'J · Ecuaciones y fracciones');
const formula = (text, extra = {}) => write(back, text, {math: true, seed: 47 + back.row, ...extra});
formula('Ecuación: 2x + 3 = 11 -> 2x = 8 -> x = 8/2 = 4');
formula('Fracciones: 1/2 + 3/4 = (2+3)/4 = 5/4');
formula('Cuadrática: x^2 - 5x + 6 = 0   x = (5 +- raiz(25 - 24))/2   x_1 = 3   x_2 = 2');
label(back, 'K · Potencias, raíces con índice y logaritmos');
formula('2^3 = 8   x^(n+1)   10^-3   raiz(49) = 7   raiz[3](27) = 3   raiz[4](16) = 2   raiz(x^2) = |x|');
formula('log_2(8) = 3   log(100) = 2   ln(e) = 1   log_b(x·y) = log_b(x) + log_b(y)');
label(back, 'L · Física');
formula('v = d/t = (120 m)/(4 s) = 30 m/s   F = m·a = 5 kg · 2 m/s^2 = 10 N');
formula('E_c = (1/2)·m·v^2   x = x_0 + v_0·t + (a·t^2)/2   0 <= x < 5   a != b   25 °C');
label(back, 'L2 · Un problema completo, como en el examen');
formula('Problema 1. Un auto recorre 150 km en 2 h. ¿Cuál es su rapidez?\nDatos: d = 150 km   t = 2 h   v = ?\nv = d/t = (150 km)/(2 h) = 75 km/h\nRespuesta: la rapidez del auto es 75 km/h.');

// Concept map, hand-drawn outlines.
label(back, 'M · Mapa conceptual con cajas y flechas a mano');
{
  const rows = 14, map = createMap('concept'), W = back.width, H = rows * GRID;
  map.title = '';
  map.paper = {...map.paper, width: W, height: H, margin: 0, marginLeft: 0, marginRight: 0, marginTop: 0, marginBottom: 0, size: 12, leading: 5, ink: INK, handDrawn: true, ruling: 'none', seed: 7};
  const [root, a, b, c, d] = map.nodes;
  Object.assign(root, {text: 'La energía', x: W / 2 - 22, y: 1, width: 46, height: 13});
  Object.assign(a, {text: 'Cinética', x: W / 2 - 68, y: 26, width: 44, height: 13});
  Object.assign(b, {text: 'Potencial', x: W / 2 + 28, y: 26, width: 44, height: 13});
  Object.assign(c, {text: 'Movimiento', x: W / 2 - 73, y: 52, width: 54, height: 14, shape: 'ellipse'});
  Object.assign(d, {text: 'Altura', x: W / 2 + 23, y: 52, width: 54, height: 14, shape: 'ellipse'});
  map.edges[0].label = 'puede ser'; map.edges[1].label = 'puede ser'; map.edges[2].label = 'depende del'; map.edges[3].label = 'depende de la';
  const r = renderMap(map, LETTERS.natural);
  if (r.missing.length) throw Error('Faltan letras en el mapa: ' + r.missing.join(' '));
  const ox = back.left, oy = back.top + back.row * GRID;
  for (const part of [...r.geometry.nodes, ...r.geometry.edges]) page(back).push({type: 'ink', polys: part.ink.map(p => p.map(([x, y]) => [x + ox, y + oy])), color: INK});
  for (const l of r.geometry.labels) if (l.kind === 'edge') back.items.push({type: 'rect', x: l.box.x + ox, y: l.box.y + oy, w: l.box.width, h: l.box.height, color: '#ffffff'});
  for (const l of r.geometry.labels) for (const g of l.glyphs) back.items.push({type: 'glyph', paths: g.paths, x: g.x + ox, y: g.y + oy, scale: g.scale, color: g.color, strokeWidth: g.strokeWidth});
  back.row += rows;
}

// Ink colours: a solid bar plus the same handwriting in each colour.
label(back, 'N · Colores de tinta: marca los que se ven bien');
const COLORS = [
  ['Negro', '#000000'], ['Gris oscuro', '#3a3a3a'], ['Azul bolígrafo', '#1f3a93'], ['Azul marino', '#193c66'], ['Azul oscuro', '#0d2a5c'],
  ['Azul medio', '#2c5aa0'], ['Celeste', '#3b8fd9'], ['Turquesa', '#138d90'], ['Verde oscuro', '#1e5631'],
  ['Verde', '#2e8b57'], ['Rojo', '#c0392b'], ['Granate', '#7b1e2b'], ['Morado', '#5b2c83'], ['Violeta', '#8e44ad'],
  ['Marrón', '#6b4226'], ['Naranja', '#d35400'], ['Rosado', '#d63384'], ['Amarillo', '#d4a800'],
];
{
  const half = Math.ceil(COLORS.length / 2), start = back.row;
  COLORS.forEach(([name, hex], i) => {
    const col = i < half ? 0 : 1, rowIndex = start + (i % half), x = col * 88;
    rect(back, x, rowIndex * GRID + 1.2, 9, 2.6, hex);
    back.row = rowIndex; write(back, `${name} ${hex}`, {x: x + 11, width: 76, size: 12, color: hex, seed: 53 + i, natural: .4});
  });
  back.row = start + half;
}
label(back, 'O · Diagnóstico de cabezal: cian · magenta · amarillo · negro · negro RGB · gris');
{
  const swatches = [['C', {cmyk: [1, 0, 0, 0]}], ['M', {cmyk: [0, 1, 0, 0]}], ['Y', {cmyk: [0, 0, 1, 0]}], ['K', {cmyk: [0, 0, 0, 1]}], ['RGB', {color: '#000000'}], ['50 %', {color: '#808080'}], ['C+M', {cmyk: [1, 1, 0, 0]}], ['C+Y', {cmyk: [1, 0, 1, 0]}], ['M+Y', {cmyk: [0, 1, 1, 0]}]];
  swatches.forEach(([name, c], i) => back.items.push({type: 'rect', x: back.left + i * 19.5, y: back.top + back.row * GRID + .5, w: 15, h: 9, ...c}));
  back.row += 2; const start = back.row;
  swatches.forEach(([n], i) => {back.row = start; write(back, n, {x: i * 19.5, width: 70, size: 10, color: NOTE, natural: 0, seed: 61 + i});});
  back.row = start + 1; back.inkBottom = 0;
}
label(back, 'P · Escribe tú a mano estos símbolos (aún no están en tu letra):');
{
  const names = ['pi', 'delta', 'theta', 'alfa', 'beta', 'lambda', 'mu', 'omega', 'integral'], start = back.row;
  names.forEach((name, i) => {back.row = start; write(back, name, {x: i * 19.5, width: 19.5 < 70 ? 70 : 19.5, size: 10, color: NOTE, natural: 0, seed: 67 + i}); box(back, i * 19.5, (start + 1) * GRID, 15, 10);});
  back.row = start + 3;
}
function page(p) {return p.items;}

// ---------------- Output ----------------
function svg(p, {grid}) {
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET.width * 6}" height="${SHEET.height * 6}" viewBox="0 0 ${SHEET.width} ${SHEET.height}"><rect width="${SHEET.width}" height="${SHEET.height}" fill="#fffdf8"/>`];
  if (grid) {
    for (let k = 0; k <= p.rows; k++) parts.push(`<path d="M${p.left},${p.top + k * GRID}h${p.width}" stroke="#b9d3e6" stroke-width=".18"/>`);
    for (let k = 0; k <= 35; k++) parts.push(`<path d="M${p.left + k * GRID},${p.top}v${p.rows * GRID}" stroke="#b9d3e6" stroke-width=".18"/>`);
  }
  for (const it of p.items) {
    if (it.type === 'glyph') parts.push(`<path d="${svgPaths(it.paths, true)}" transform="translate(${it.x} ${it.y}) scale(${it.scale})" fill="${it.color}"${it.strokeWidth ? ` stroke="${it.color}" stroke-width="${it.strokeWidth}" stroke-linejoin="round"` : ''}/>`);
    else if (it.type === 'ink') parts.push(`<path d="${it.polys.map(q => 'M' + q.map(v => v.join(',')).join('L') + 'Z').join('')}" fill="${it.color}"/>`);
    else if (it.type === 'line') parts.push(`<path d="M${it.x1},${it.y1}L${it.x2},${it.y2}" stroke="${it.color}" stroke-width="${it.width}"/>`);
    else if (it.type === 'rect') {const c = it.cmyk ? `rgb(${it.cmyk.slice(0, 3).map(v => Math.round(255 * (1 - v) * (1 - it.cmyk[3]))).join(',')})` : it.color; parts.push(`<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${c}"/>`);}
  }
  return parts.join('') + '</svg>';
}
async function pdf(pages, {grid}) {
  const doc = await PDF.PDFDocument.create(), H = SHEET.height, rgb = hex => PDF.rgb(...hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255));
  doc.setTitle('Trazo · hoja de prueba Oficio'); doc.setCreator('Trazo');
  for (const p of pages) {
    const pg = doc.addPage([SHEET.width * MM, H * MM]);
    if (grid) {
      for (let k = 0; k <= p.rows; k++) pg.drawLine({start: {x: p.left * MM, y: (H - p.top - k * GRID) * MM}, end: {x: (p.left + p.width) * MM, y: (H - p.top - k * GRID) * MM}, thickness: .35, color: rgb('#b9d3e6')});
      for (let k = 0; k <= 35; k++) pg.drawLine({start: {x: (p.left + k * GRID) * MM, y: (H - p.top) * MM}, end: {x: (p.left + k * GRID) * MM, y: (H - p.top - p.rows * GRID) * MM}, thickness: .35, color: rgb('#b9d3e6')});
    }
    pg.pushOperators(PDF.setLineJoin(PDF.LineJoinStyle.Round));
    for (const it of p.items) {
      if (it.type === 'glyph') {const color = rgb(it.color); pg.drawSvgPath(svgPaths(it.paths, true), {x: it.x * MM, y: (H - it.y) * MM, scale: it.scale * MM, color, ...(it.strokeWidth ? {borderColor: color, borderWidth: it.strokeWidth} : {})});}
      else if (it.type === 'ink') pg.drawSvgPath(it.polys.map(q => 'M' + q.map(v => v.join(',')).join('L') + 'Z').join(''), {x: 0, y: H * MM, scale: MM, color: rgb(it.color)});
      else if (it.type === 'line') pg.drawLine({start: {x: it.x1 * MM, y: (H - it.y1) * MM}, end: {x: it.x2 * MM, y: (H - it.y2) * MM}, thickness: it.width * MM, color: rgb(it.color)});
      else if (it.type === 'rect') pg.drawRectangle({x: it.x * MM, y: (H - it.y - it.h) * MM, width: it.w * MM, height: it.h * MM, color: it.cmyk ? PDF.cmyk(...it.cmyk) : rgb(it.color)});
    }
  }
  return doc.save();
}
const pages = [front, back];
for (const p of pages) console.log(`${p.name}: ${p.row} de ${p.rows} renglones usados`);
fs.writeFileSync(OUT + 'Prueba-Oficio-anverso.pdf', await pdf([front], {grid: false}));
fs.writeFileSync(OUT + 'Prueba-Oficio-reverso.pdf', await pdf([back], {grid: false}));
fs.writeFileSync(OUT + 'Prueba-Oficio-2-caras.pdf', await pdf(pages, {grid: false}));
fs.writeFileSync(OUT + 'Prueba-Oficio-con-cuadricula-hoja-blanca.pdf', await pdf(pages, {grid: true}));
const {chromium} = require('playwright'), browser = await chromium.launch(), tab = await browser.newPage({viewport: {width: SHEET.width * 6, height: SHEET.height * 6}});
for (const p of pages) {await tab.setContent(`<style>body{margin:0}</style>${svg(p, {grid: true})}`); await tab.screenshot({path: `${OUT}Vista-${p.name}.png`});}
await browser.close();
