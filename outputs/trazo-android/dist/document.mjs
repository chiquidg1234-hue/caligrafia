// Whole homework documents in the user's hand: a plain-text format becomes
// notebook pages with a centred title, coloured headings, bullets, two
// columns (datos | resolución), hand-drawn coordinate graphs and boxed
// answers. Every line of writing sits on the 5 mm grid of the real sheet.
//
// Format (one block per line):
//   # Título                    centred, title colour, one free row below
//   ## Subtítulo / ### Ejercicio  left, title colour, one free row above
//   texto                        paragraph (formulas: x^2, a/b, raiz(x)…)
//   - viñeta                     «·» with hanging indent
//   !! respuesta                 answer framed by a hand-drawn box
//   **negrita** inside any line
//   (empty line)                 one free row
//   ---                          new page (next side of the sheet)
//   [[columnas 12]] … [[|]] … [[fin]]   left column 12 squares wide
//   [[grafica xmin xmax ymin ymax]]
//     recta a b c | etiqueta     the line a·x + b·y + c = 0
//     punto x y | etiqueta
//   [[fin]]
//   [[tamaño 18]]  [[renglon medio|seguido]]  [[espacio 2]]  [[color #hex]]  [[lapicero bic-negro]]
//   [[dibujo ancho alto]]        a freehand sketch, in squares from its top-left:
//     circulo x y r · linea x1 y1 x2 y2 · punto x y · texto x y | palabra
//   [[fin]]
//   [[tinta real|plana]]         ballpoint ink (ink.mjs) or the flat fill of the photo
//   [[grosor 0.14]]              line width in the PDF, mm (the printer adds ~0.2)
//   [[desorden 0.5]]             0–1: a less careful hand
//   [[letra bonita|intermedia|normal]]  the user's three hands (LETRAS)
//   [[titulos a mano|impresos]]  leave the space of titles and headings for a real pen
import {layoutText} from './core.mjs';
import {ballpoint, inkMode} from './ink.mjs';
import {handStroke} from './math.mjs';
import {svgPaths} from './exports.mjs';
import {PENS} from './model.mjs';
import * as bundle from './vendor/pdf-lib.min.js';

const PDF = globalThis.PDFLib || bundle.default, MM = 72 / 25.4;
export const OFICIO_ESPIRAL = Object.freeze({name: 'Oficio espiral', width: 211, height: 322, grid: 5, sides: [
  {name: 'anverso', left: 20, right: 16, top: 20, bottom: 17},
  {name: 'reverso', left: 16, right: 20, top: 22, bottom: 15},
]});
// Trapper «Top» sheet, 5 mm squares; the holes are on the left of the anverso.
// drop: on this sheet the Epson T50 prints 2.2 mm higher than on the Oficio
// (photo of 30/10: the writing sat half a square above the lines).
export const TRAPPER_TOP = Object.freeze({name: 'Trapper cuadriculada', width: 211, height: 280, grid: 5, drop: 2.2, sides: [
  {name: 'anverso', left: 30, right: 11, top: 20, bottom: 10},
  {name: 'reverso', left: 12, right: 29, top: 21, bottom: 10},
]});
export const PAPERS = Object.freeze({oficio: OFICIO_ESPIRAL, trapper: TRAPPER_TOP});
// Her three hands with the same letters: «bonita» when she takes her time,
// «normal» like her hurried notes (photo of 29/10: smaller letters, wide and
// uneven gaps, a looser line, lighter pressure) and «intermedia» between.
export const LETRAS = Object.freeze({
  bonita: {desorden: 0, tracking: 0, trackJitter: 0, escala: 1, grosor: .14},
  intermedia: {desorden: .4, tracking: .035, trackJitter: .6, escala: .96, grosor: .135},
  normal: {desorden: .8, tracking: .075, trackJitter: 1, escala: .92, grosor: .125},
});
// Pens for sketches; «tinta» is the pen of the text.
export const SKETCH_COLORS = Object.freeze({tinta: '', azul: '', rojo: '#b02a33', verde: '#2f7d46', morado: '#6b3290', negro: '#26262e'});
export const DOCUMENT_DEFAULTS = Object.freeze({
  paper: OFICIO_ESPIRAL, start: 0, insetLeft: 1, insetRight: 2, insetTop: 1, insetBottom: 1,
  size: 16, titleSize: 22, headingSize: 17, subheadingSize: 14.5, smallSize: 10,
  text: '#34405e', title: '#b02a33', graph: '#b02a33', ink: 'bic-azul', tinta: 'real', grosor: .14, desorden: 0, tracking: 0, trackJitter: 0, escala: 1, titulos: 'impresos', answer: 'rayitas', natural: .55, seed: 7, lineGap: 0, pen: .27,
  // Epson T50 measured on the first test: 5–6 mm to the left and 1 mm high.
  // With this correction the writing starts two squares inside the frame,
  // which the user prefers (third test print).
  offsets: {anverso: {x: 5, y: 1}, reverso: {x: 6, y: 1}},
});

function rng(seed) {let s = (seed >>> 0) || 1; return () => {s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296;};}
const between = (random, a, b) => a + (b - a) * random();

/** Parse the plain-text format into blocks. Unknown directives are reported. */
export function parseDocument(source) {
  const lines = String(source ?? '').normalize('NFC').replace(/\r\n?/g, '\n').split('\n'), stack = [{blocks: []}];
  const push = block => stack.at(-1).blocks.push(block);
  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n], line = raw.trim(), at = `renglón ${n + 1}`;
    const directive = line.match(/^\[\[\s*([^\]\s]+)\s*([^\]]*)\]\]$/u);
    if (directive) {
      const [, name, rest] = directive, args = rest.trim(), key = name.toLowerCase();
      if (key === 'columnas') {const block = {type: 'columns', left: Number(args) || 0, columns: [[], []]}; push(block); stack.push({blocks: block.columns[0], block, side: 0});}
      else if (key === '|') {const top = stack.at(-1); if (!top.block || top.block.type !== 'columns' || top.side) throw Error(`[[|]] sin [[columnas]] (${at}).`); top.side = 1; top.blocks = top.block.columns[1];}
      else if (key === 'grafica' || key === 'gráfica') {
        const range = args.split(/[\s,]+/).map(Number);
        if (range.length !== 4 || range.some(v => !Number.isFinite(v)) || range[0] >= range[1] || range[2] >= range[3]) throw Error(`Escribe [[grafica xmin xmax ymin ymax]] (${at}).`);
        const block = {type: 'graph', range, lines: [], points: []};
        for (n++; n < lines.length && !/^\[\[\s*fin\s*\]\]$/iu.test(lines[n].trim()); n++) {
          const [spec, label = ''] = lines[n].split('|'), words = spec.trim().split(/\s+/), kind = words[0]?.toLowerCase(), values = words.slice(1).map(Number);
          if (!spec.trim()) continue;
          if (kind === 'recta' && values.length === 3 && values.every(Number.isFinite) && (values[0] || values[1])) block.lines.push({a: values[0], b: values[1], c: values[2], label: label.trim()});
          else if (kind === 'punto' && values.length === 2 && values.every(Number.isFinite)) block.points.push({x: values[0], y: values[1], label: label.trim()});
          else throw Error(`Dentro de [[grafica]] usa «recta a b c | etiqueta» o «punto x y | etiqueta» (renglón ${n + 1}).`);
        }
        push(block);
      }
      else if (key === 'dibujo') {
        const size = args.split(/[\s,]+/).map(Number);
        if (size.length !== 2 || size.some(v => !(v > 0))) throw Error(`Escribe [[dibujo ancho alto]] en cuadritos (${at}).`);
        const block = {type: 'sketch', width: size[0], height: size[1], shapes: []}, need = {circulo: 3, arco: 5, elipse: 4, linea: 4, trazos: 4, punto: 2, sector: 5, segmento: 5, texto: 2, rotulo: 2, grueso: 1};
        for (n++; n < lines.length && !/^\[\[\s*fin\s*\]\]$/iu.test(lines[n].trim()); n++) {
          const [spec, label = ''] = lines[n].split('|'), words = spec.trim().split(/\s+/), kind = words[0]?.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''), values = words.slice(1).map(Number);
          if (!spec.trim()) continue;
          if (kind === 'color') {const name = words[1]?.toLowerCase(), c = name in SKETCH_COLORS ? SKETCH_COLORS[name] : /^#[\da-f]{6}$/i.test(name || '') ? name : null; if (c === null) throw Error(`Color de dibujo desconocido (renglón ${n + 1}). Usa: ${Object.keys(SKETCH_COLORS).join(', ')} o #hex.`); block.shapes.push({kind, color: c}); continue;}
          if (!need[kind] || values.length !== need[kind] || !values.every(Number.isFinite) || ((kind === 'texto' || kind === 'rotulo') && !label.trim())) throw Error(`Dentro de [[dibujo]] usa circulo, arco, elipse, linea, trazos, punto, sector, segmento, texto, rotulo, color o grueso (renglón ${n + 1}).`);
          block.shapes.push({kind, values, label: label.trim()});
        }
        push(block);
      }
      else if (key === 'fin') {if (stack.length < 2) throw Error(`[[fin]] sobra (${at}).`); stack.pop();}
      else if (key === 'tamaño' || key === 'tamano') push({type: 'set', key: 'size', value: Number(args)});
      else if (key === 'renglon' || key === 'renglón') push({type: 'set', key: 'lineGap', value: /medio/i.test(args) ? 1 : 0});
      else if (key === 'espacio') push({type: 'blank', rows: Math.max(1, Math.min(20, Math.round(Number(args) || 1)))});
      else if (key === 'color') {if (!/^#[\da-f]{6}$/i.test(args)) throw Error(`Color inválido (${at}).`); push({type: 'set', key: 'text', value: args.toLowerCase()});}
      else if (key === 'pagina' || key === 'página') push({type: 'page'});
      else if (key === 'lapicero') {if (!PENS[args] && args !== 'libre') throw Error(`Lapicero desconocido «${args}» (${at}). Usa: ${Object.keys(PENS).join(', ')} o libre.`); push({type: 'set', key: 'pen', value: args === 'libre' ? '' : args});}
      else if (key === 'letra') {const name = args.toLowerCase(); if (!LETRAS[name]) throw Error(`Escribe [[letra bonita]], [[letra intermedia]] o [[letra normal]] (${at}).`); push({type: 'option', key: 'letra', value: name});}
      else if (key === 'grosor' || key === 'desorden') {const v = Number(args.replace(',', '.')); if (!(v >= 0) || (key === 'grosor' ? v > 1 : v > 1)) throw Error(`Escribe [[${key} número]] (${at}).`); push({type: 'option', key, value: v});}
      else if (key === 'tinta') {const how = args.toLowerCase(); if (how !== 'real' && how !== 'plana') throw Error(`Escribe [[tinta real]] o [[tinta plana]] (${at}).`); push({type: 'set', key: 'tinta', value: how});}
      else if (key === 'titulos' || key === 'títulos') {const how = /mano/i.test(args) ? 'mano' : /impres/i.test(args) ? 'impresos' : ''; if (!how) throw Error(`Escribe [[titulos a mano]] o [[titulos impresos]] (${at}).`); push({type: 'set', key: 'titulos', value: how});}
      else if (key === 'respuesta') {const how = args.toLowerCase(); if (how !== 'rayitas' && how !== 'recuadro') throw Error(`Escribe [[respuesta rayitas]] o [[respuesta recuadro]] (${at}).`); push({type: 'set', key: 'answer', value: how});}
      else if (key === 'hoja') {const sheet = args.toLowerCase(); if (!PAPERS[sheet]) throw Error(`Hoja desconocida «${args}» (${at}). Usa: ${Object.keys(PAPERS).join(', ')}.`); if (stack[0].blocks.length) throw Error(`[[hoja]] va en el primer renglón (${at}).`); push({type: 'paper', value: sheet});}
      else if (key === 'graficas-por-hoja' || key === 'gráficas-por-hoja') push({type: 'set', key: 'graphsPerPage', value: Math.max(1, Number(args) || 3)});
      else throw Error(`No conozco [[${name}]] (${at}).`);
      continue;
    }
    if (!line) push({type: 'blank', rows: 1});
    else if (line === '---') push({type: 'page'});
    else if (/^#\s/.test(line)) push({type: 'title', text: line.slice(2).trim()});
    else if (/^##\s/.test(line)) push({type: 'heading', text: line.slice(3).trim()});
    else if (/^###\s/.test(line)) push({type: 'subheading', text: line.slice(4).trim()});
    else if (/^[-•·]\s/.test(line)) push({type: 'bullet', text: line.slice(2).trim()});
    else if (/^!!\s/.test(line)) push({type: 'boxed', text: line.slice(3).trim()});
    else push({type: 'paragraph', text: line});
  }
  if (stack.length > 1) throw Error('Falta un [[fin]] para cerrar [[columnas]] o [[grafica]].');
  return stack[0].blocks;
}
// **bold** spans become style ranges for the compositor.
function inline(text) {
  let plain = '', bold = false; const styles = [];
  for (const part of text.split('**')) {if (bold && part) styles.push({start: plain.length, end: plain.length + part.length, bold: true}); plain += part; bold = !bold;}
  return {text: plain, styles};
}

/**
 * Lay out a document. Returns {pages: [{side, items}], missing}; item
 * coordinates are millimetres on the sheet.
 */
export function composeDocument(source, samples, options = {}) {
  const o = {...DOCUMENT_DEFAULTS, ...options}, blocks = typeof source === 'string' ? parseDocument(source) : source;
  // [[grosor]] and [[desorden]] hold for the whole document.
  for (const b of blocks) if (b.type === 'option') {if (b.key === 'letra') Object.assign(o, LETRAS[b.value]); else o[b.key] = b.value;}
  // [[hoja trapper]] in the first line wins over the paper chosen in the app.
  const paper = blocks[0]?.type === 'paper' ? PAPERS[blocks[0].value] : o.paper, g = paper.grid;
  const area = paper.sides.map(s => ({...s, x0: s.left + o.insetLeft * g, rows: Math.floor((paper.height - s.top - s.bottom) / g + 1e-9)}));
  const width = paper.width - area[0].left - area[0].right - (o.insetLeft + o.insetRight) * g;
  const missing = new Set(); let seed = o.seed;
  const glyphs = (layout, dx = 0, dy = 0) => layout.pages[0].map(e => ({type: 'glyph', paths: e.paths, x: e.x + dx, y: e.y + dy, scale: e.scale, color: e.color, strokeWidth: e.strokeWidth, ...(e.sampleId === undefined ? {} : {sampleId: e.sampleId})}));
  const inkBox = items => {let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity; for (const it of items) {if (it.type === 'glyph') for (const p of it.paths) for (const [x, y] of p) {l = Math.min(l, it.x + x * it.scale); r = Math.max(r, it.x + x * it.scale); t = Math.min(t, it.y - y * it.scale); b = Math.max(b, it.y - y * it.scale);} else if (it.type === 'ink') for (const p of it.polys) for (const [x, y] of p) {l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);}} return {l, r, t, b};};

  // Text on the grid: baselines on lines, first line one row below the top.
  function write(text, w, state, extra = {}) {
    const {text: plain, styles} = inline(text), virtual = Math.max(70, w), color = extra.color || state.text;
    const layout = layoutText(plain, samples, {width: virtual, height: 594, margin: 0, marginRight: virtual - w, size: (extra.size || state.size) * o.escala, leading: g, lineGap: extra.lineGap ?? state.lineGap, natural: extra.natural ?? o.natural, messy: o.desorden, tracking: o.tracking, trackJitter: o.trackJitter, startSlack: 1, seed: seed++, pen: extra.ink === false ? '' : state.pen, snapToGrid: true, gridMm: g, ink: color, styles: [...styles.map(s => ({...s, color})), ...(extra.bold ? [{start: 0, end: plain.length, bold: true, color}] : [])], math: extra.math ?? true, hyphenate: extra.hyphenate ?? true});
    if (layout.missing.length) {for (const c of layout.missing) missing.add(c); return {items: [], rows: 1, baselines: []};}
    if (layout.pages.length > 1) throw Error(`Un párrafo es más alto que la hoja: «${plain.slice(0, 40)}…».`);
    const items = glyphs(layout), baselines = [...new Set(items.map(i => Math.round(i.y / g)))].sort((a, b) => a - b), last = baselines.at(-1) * g;
    const box = inkBox(items), hang = box.b - last;
    // rise: how far the first line climbs above its own row (tall fractions).
    // A messier hand dips a little lower: that is not a new row.
    const deep = 1.8 + .7 * o.desorden;
    return {items, baselines, rise: baselines[0] * g - box.t, hang: hang > deep ? 0 : hang, rows: baselines.at(-1) + (hang > deep ? Math.ceil((hang - .8 - .7 * o.desorden) / g) : 0) + (extra.lineGap ?? state.lineGap)};
  }
  const centre = (items, w) => {
    const lines = new Map(); for (const it of items) {const k = Math.round(it.y / g); if (!lines.has(k)) lines.set(k, []); lines.get(k).push(it);}
    for (const line of lines.values()) {const box = inkBox(line), dx = (w - (box.r - box.l)) / 2 - box.l; for (const it of line) it.x += dx;}
    return items;
  };
  const pen = (points, color, random, width = o.pen) => ({type: 'ink', polys: handStroke(points, width, random), color});
  // Four separate, slightly bowed strokes that overshoot or stop short.
  function handBox(l, t, r, b, color, random) {
    const j = () => between(random, -.7, .7), side = (a, z) => {const mid = [(a[0] + z[0]) / 2 + j() * .9, (a[1] + z[1]) / 2 + j() * .9]; return pen([a, mid, z], color, random);};
    return [side([l - .6 + j(), t + j() * .4], [r + .7 + j(), t + j() * .6]), side([r + j() * .4, t - .5 + j()], [r + j() * .5, b + .6 + j()]), side([r + .5 + j(), b + j() * .4], [l - .4 + j(), b + j() * .5]), side([l + j() * .4, b + .5 + j()], [l + j() * .3, t - .7 + j()])];
  }

  function graph(block, w, state) {
    const [xmin, xmax, ymin, ymax] = [Math.min(0, block.range[0]), Math.max(0, block.range[1]), Math.min(0, block.range[2]), Math.max(0, block.range[3])];
    const fits = k => (xmax - xmin) / k <= Math.floor(w / g) - 2 && (ymax - ymin) / k <= 10;
    const k = [1, 2, 4, 5, 10, 20, 50].find(fits);
    if (!k) throw Error('La gráfica no cabe: reduce el rango.');
    const random = rng(seed++), X = u => g + (u - xmin) / k * g, Y = v => g + (ymax - v) / k * g, items = [], ink = o.text;
    // Axes with open arrow heads and a tick on every square.
    items.push(pen([[X(xmin) - 1.2, Y(0) + between(random, -.15, .15)], [X(xmax) / 2 + X(xmin) / 2, Y(0) + between(random, -.2, .2)], [X(xmax) + 2.6, Y(0) + between(random, -.15, .15)]], ink, random));
    items.push(pen([[X(0) + between(random, -.15, .15), Y(ymin) + 1.2], [X(0) + between(random, -.2, .2), (Y(ymin) + Y(ymax)) / 2], [X(0) + between(random, -.15, .15), Y(ymax) - 2.6]], ink, random));
    items.push(pen([[X(xmax) + 1.3, Y(0) - 1.1], [X(xmax) + 2.7, Y(0)], [X(xmax) + 1.3, Y(0) + 1.1]], ink, random));
    items.push(pen([[X(0) - 1.1, Y(ymax) - 1.3], [X(0), Y(ymax) - 2.7], [X(0) + 1.1, Y(ymax) - 1.3]], ink, random));
    const every = (xmax - xmin) / k > 8 || (ymax - ymin) / k > 8 ? 2 : 1, small = {size: o.smallSize, natural: .25, math: false, hyphenate: false, lineGap: 0};
    const occupied = [], segments = [];
    const measure = (text, color, size) => {const r = write(text, 40, state, {...small, size, color}); return r.items.length ? {r, box: inkBox(r.items)} : null;};
    const place = (m, x, y, anchor) => {const {r, box} = m, dx = x - (anchor === 'center' ? (box.l + box.r) / 2 : anchor === 'right' ? box.r : box.l), dy = y - r.baselines[0] * g; for (const it of r.items) items.push({...it, x: it.x + dx, y: it.y + dy}); const placed = {l: box.l + dx - .4, r: box.r + dx + .4, t: box.t + dy - .4, b: box.b + dy + .4}; occupied.push(placed); return placed;};
    const label = (text, x, y, color = ink, size = o.smallSize, anchor = 'center') => {const m = measure(text, color, size); if (m) place(m, x, y, anchor);};
    // Free spot for a label: away from axes, lines, points and other labels.
    const hits = b => occupied.some(o => b.l < o.r && o.l < b.r && b.t < o.b && o.t < b.b) || segments.some(([p, q]) => {const step = .4 / Math.max(.4, Math.hypot(q[0] - p[0], q[1] - p[1])); for (let t = 0; t <= 1; t += step) {const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t; if (x > b.l - .3 && x < b.r + .3 && y > b.t - .3 && y < b.b + .3) return true;} return false;});
    const inside = b => b.l > -1.5 && b.r < Math.min(w, X(xmax) + g) && b.t > Y(ymax) - 4 && b.b < Y(ymin) + 3;
    const spot = (text, color, size, candidates, corners = true) => {
      const m = measure(text, color, size); if (!m) return;
      const w = m.box.r - m.box.l, h = m.box.b - m.box.t, base = m.r.baselines[0] * g - m.box.t;
      for (const [x, y, anchor] of candidates) {const l = anchor === 'right' ? x - w : anchor === 'center' ? x - w / 2 : x, b = {l: l - .4, r: l + w + .4, t: y - base - .4, b: y - base + h + .4}; if (inside(b) && !hits(b)) return place(m, x, y, anchor);}
      // No free spot near the line: write it in a corner of the graph.
      if (corners) for (const [x, y, anchor] of [[X(xmin) + .5, Y(ymax) - 1.5, 'left'], [X(xmax), Y(ymax) - 1.5, 'right'], [X(xmin) + .5, Y(ymin) + 4, 'left'], [X(xmax), Y(ymin) + 4, 'right']]) {const l = anchor === 'right' ? x - w : x, b = {l: l - .4, r: l + w + .4, t: y - base - .4, b: y - base + h + .4}; if (!hits(b)) return place(m, x, y, anchor);}
      const [x, y, anchor] = candidates[0]; place(m, x, y, anchor);
    };
    for (let u = Math.ceil(xmin / k) * k, i = 0; u <= xmax; u += k, i++) {if (!u) continue; items.push(pen([[X(u), Y(0) - .7], [X(u) + between(random, -.1, .1), Y(0) + .7]], ink, random, o.pen * .8)); if (!(Math.round(u / k) % every)) label(String(u), X(u), Y(0) + 3.4);}
    for (let v = Math.ceil(ymin / k) * k; v <= ymax; v += k) {if (!v) continue; items.push(pen([[X(0) - .7, Y(v)], [X(0) + .7, Y(v) + between(random, -.1, .1)]], ink, random, o.pen * .8)); if (!(Math.round(v / k) % every)) label(String(v), X(0) - 1.2, Y(v) + .8, ink, o.smallSize, 'right');}
    label('0', X(0) - 1.6, Y(0) + 3.2, ink, o.smallSize, 'right');
    label('x', X(xmax) + 2.4, Y(0) - 1.6, ink, o.smallSize + 2); label('y', X(0) + 2.6, Y(ymax) - 1.2, ink, o.smallSize + 2, 'left');
    segments.push([[X(xmin) - 1.2, Y(0)], [X(xmax) + 2.6, Y(0)]], [[X(0), Y(ymin) + 1.2], [X(0), Y(ymax) - 2.6]]);
    const pending = [];
    for (const line of block.lines) {
      // Clip a·x + b·y + c = 0 to the drawing area.
      const ends = [], add = (x, y) => {if (x >= xmin - 1e-9 && x <= xmax + 1e-9 && y >= ymin - 1e-9 && y <= ymax + 1e-9 && !ends.some(p => Math.hypot(p[0] - x, p[1] - y) < 1e-6)) ends.push([x, y]);};
      if (line.b) {add(xmin, -(line.a * xmin + line.c) / line.b); add(xmax, -(line.a * xmax + line.c) / line.b);}
      if (line.a) {add(-(line.b * ymin + line.c) / line.a, ymin); add(-(line.b * ymax + line.c) / line.a, ymax);}
      if (ends.length < 2) continue;
      const [p, q] = ends, a = [X(p[0]), Y(p[1])], b = [X(q[0]), Y(q[1])], mid = [(a[0] + b[0]) / 2 + between(random, -.25, .25), (a[1] + b[1]) / 2 + between(random, -.25, .25)];
      items.push(line.label ? pen([a, mid, b], o.graph, random, o.pen * 1.15) : pen([a, mid, b], ink, random, o.pen * .8)); segments.push([a, b]);
      if (line.label) pending.push(() => {
        const [l, r] = a[0] < b[0] ? [a, b] : [b, a], along = t => [l[0] + (r[0] - l[0]) * t, l[1] + (r[1] - l[1]) * t], spots = [];
        for (const t of [.85, .15, .7, .3, .5, .95, .05]) {const [x, y] = along(t); spots.push([x, y - 1.6, t > .5 ? 'right' : 'left'], [x, y + 4.2, t > .5 ? 'right' : 'left']);}
        spot(line.label, o.graph, o.smallSize + 1, spots);
      });
    }
    for (const p of block.points) {
      if (p.x < xmin || p.x > xmax || p.y < ymin || p.y > ymax) continue;
      const cx = X(p.x), cy = Y(p.y);
      items.push({type: 'ink', color: ink, polys: [Array.from({length: 10}, (_, i) => {const a = -i / 10 * 2 * Math.PI, r = .62 + between(random, -.08, .08); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];})]});
      occupied.push({l: cx - .9, r: cx + .9, t: cy - .9, b: cy + .9});
      if (p.label) pending.unshift(() => spot(p.label, ink, o.smallSize, [[cx + 1.2, cy - 1.3, 'left'], [cx - 1.2, cy - 1.3, 'right'], [cx + 1.2, cy + 3.6, 'left'], [cx - 1.2, cy + 3.6, 'right'], [cx + 2.2, cy + 1.2, 'left'], [cx - 2.2, cy + 1.2, 'right'], [cx, cy - 2.4, 'center'], [cx, cy + 4.6, 'center'], [cx + 1.5, cy - 3.2, 'left'], [cx - 1.5, cy - 3.2, 'right']], false));
    }
    for (const run of pending) run();
    return {items, rows: Math.ceil((Y(ymin) + g) / g)};
  }

  // A freehand sketch: circles that do not quite close, lines a little bowed.
  function sketch(block, w, state) {
    if (block.width * g > w + 1e-9) throw Error(`El dibujo mide ${block.width} cuadritos y solo caben ${Math.floor(w / g)}.`);
    const random = rng(seed++), items = [], j = a => between(random, -a, a), deg = Math.PI / 180;
    let ink = state.text, thick = 1;
    const stroke = points => {const it = pen(points, ink, random); if (thick !== 1) it.widthMm = o.grosor * thick; items.push(it);};
    // An arc or a whole circle drawn in one go: a little out of round, the end
    // stopping short or running past the start.
    const round = (cx, cy, rx, ry, from, sweep, closed) => {
      const tilt = j(Math.abs(rx - ry) > .5 ? .03 : .25), p1 = between(random, 0, 6.3), p2 = between(random, 0, 6.3), squash = 1 + j(.03), start = closed ? between(random, 0, 2 * Math.PI) : from, total = closed ? 2 * Math.PI + between(random, -.12, .3) : sweep;
      const n = Math.max(12, Math.round(Math.max(rx, ry) * Math.abs(total) * 1.2)), points = Array.from({length: n + 1}, (_, k) => {const a = start + total * k / n, wob = 1 + .025 * Math.sin(2 * a + p1) + .015 * Math.sin(3 * a + p2), x = Math.cos(a) * rx * wob * squash, y = -Math.sin(a) * ry * wob / squash; return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];});
      stroke(points);
    };
    const line = (a, b) => {const mid = [(a[0] + b[0]) / 2 + j(.3), (a[1] + b[1]) / 2 + j(.3)]; stroke([a, mid, b]);};
    for (const {kind, values = [], label, color} of block.shapes) {
      const v = values.map(x => x * g);
      if (kind === 'color') ink = color || state.text;
      else if (kind === 'grueso') thick = Math.max(.5, Math.min(6, values[0]));
      else if (kind === 'circulo') round(v[0], v[1], v[2], v[2], 0, 0, true);
      else if (kind === 'elipse') round(v[0], v[1], v[2], v[3], 0, 0, true);
      else if (kind === 'arco') round(v[0], v[1], v[2], v[2], values[3] * deg, (values[4] - values[3]) * deg, false);
      else if (kind === 'linea') line([v[0] + j(.25), v[1] + j(.25)], [v[2] + j(.25), v[3] + j(.25)]);
      else if (kind === 'trazos') {
        // Dashes of about 1.6 mm with gaps of 1 mm, never quite even.
        const [x1, y1, x2, y2] = v, len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        for (let t = 0; t < len - .4;) {const d = Math.min(len - t, 1.6 + j(.4)); line([x1 + ux * t + j(.1), y1 + uy * t + j(.1)], [x1 + ux * (t + d), y1 + uy * (t + d)]); t += d + 1 + j(.3);}
      } else if (kind === 'punto') {
        const cx = v[0] + j(.15), cy = v[1] + j(.15);
        items.push({type: 'ink', color: ink, polys: [Array.from({length: 10}, (_, i) => {const a = -i / 10 * 2 * Math.PI, r = .55 + j(.1); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];})]});
      } else if (kind === 'sector' || kind === 'segmento') {
        // Shading scribbled back and forth, as with a pen.
        const [cx, cy, r] = v, a = values[3] * deg, b = values[4] * deg, at = t => [cx + Math.cos(t) * r * .93, cy - Math.sin(t) * r * .93], zig = [];
        const n = Math.max(6, Math.round(Math.abs(b - a) * r / 1.1));
        for (let k = 0; k <= n; k++) {const t = a + (b - a) * k / n, edge = at(t + j(.03)); if (kind === 'sector') {const f = between(random, .05, .3); zig.push(k % 2 ? [cx + (edge[0] - cx) * f, cy + (edge[1] - cy) * f] : edge);} else {const p = at(a), q = at(b), f = k / n, chord = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; zig.push(k % 2 ? [chord[0] + j(.2), chord[1] + j(.2)] : edge);}}
        stroke(zig);
      } else {
        const r = write(label, 70, state, {size: kind === 'rotulo' ? state.size : o.smallSize + 1, color: ink, natural: .4, math: true, hyphenate: false, lineGap: 0});
        if (!r.items.length) continue;
        const box = inkBox(r.items), dx = v[0] - box.l + j(.3), dy = v[1] - r.baselines[0] * g + j(.2);
        for (const it of r.items) items.push({...it, x: it.x + dx, y: it.y + dy});
      }
    }
    return {items, rows: Math.ceil(block.height)};
  }

  // Measure one block at width w. Coordinates are relative to the block top-left.
  function render(block, w, state) {
    switch (block.type) {
      case 'title': {const r = write(block.text, w, state, {size: o.titleSize, color: o.title, lineGap: 0, hyphenate: false}); centre(r.items, w); return {...r, rows: r.rows + 1};}
      case 'heading': return write(block.text, w, state, {size: o.headingSize, color: o.title, lineGap: 0});
      case 'subheading': return write(block.text, w, state, {size: o.subheadingSize, color: o.title, lineGap: 0});
      case 'paragraph': return write(block.text, w, state);
      case 'bullet': {
        const r = write(block.text, w - 1.5 * g, state); for (const it of r.items) it.x += 1.5 * g;
        const dot = write('·', 40, state, {natural: 0, math: false, hyphenate: false, lineGap: 0});
        const box = inkBox(dot.items); for (const it of dot.items) {it.x += .6 * g - (box.l + box.r) / 2; it.y += (r.baselines[0] - dot.baselines[0]) * g;}
        return {...r, items: [...dot.items, ...r.items]};
      }
      case 'boxed': {
        // The answer ends with the two little slanted lines of her school;
        // the hand-drawn box only with [[respuesta recuadro]].
        if (state.answer !== 'recuadro') {
          const r = write(block.text, w - 5, state), random = rng(seed++), box = inkBox(r.items);
          const base = Math.max(...r.items.filter(i => i.type === 'glyph').map(i => i.y)), x = box.r + 1.8 + between(random, -.3, .3);
          const slash = dx => pen([[x + dx, base + .3 + between(random, -.2, .2)], [x + dx + .7, base - 1.4], [x + dx + 1.3 + between(random, -.2, .2), base - 3.1 + between(random, -.2, .2)]], state.text, random);
          return {...r, items: [...r.items, slash(0), slash(1.25 + between(random, -.15, .15))]};
        }
        const r = write(block.text, w - 2, state); for (const it of r.items) {it.x += 1; it.y += g;}
        const box = inkBox(r.items), random = rng(seed++);
        return {items: [...r.items, ...handBox(box.l - 1.6, box.t - 1.4, box.r + 1.6, box.b + 1.3, state.text, random).flat()], rows: r.rows + 2};
      }
      case 'graph': return graph(block, w, state);
      case 'sketch': return sketch(block, w, state);
      case 'columns': {
        const left = block.left ? block.left * g : Math.round(w / 2 / g) * g, sides = [flow(block.columns[0], left, {...state}), flow(block.columns[1], w - left - g, {...state})];
        for (const it of sides[1].items) shift(it, left + g, 0);
        return {items: [...sides[0].items, ...sides[1].items], rows: Math.max(sides[0].rows, sides[1].rows)};
      }
      default: return {items: [], rows: 0};
    }
  }
  // Denominators of the block above and numerators of the next one must not touch.
  const clash = (above, below) => above && below.rise !== undefined && (above.hang || 0) + below.rise > g + .3 - (below.rise > 4.2 || (above.hang || 0) > 2 ? .6 * o.desorden : 0);
  function shift(it, dx, dy) {if (it.type === 'glyph') {it.x += dx; it.y += dy;} else it.polys = it.polys.map(p => p.map(([x, y]) => [x + dx, y + dy]));}
  // A column: no paging, blocks stacked on rows.
  function flow(list, w, state) {
    const items = []; let row = 0, previous = null;
    for (const block of list) {
      if (block.type === 'set') {state[block.key] = block.value; if (block.key === 'pen' && PENS[block.value]) state.text = PENS[block.value].ink; continue;}
      if (block.type === 'blank') {row += block.rows; previous = null; continue;}
      if (block.type === 'page') throw Error('No se puede cambiar de página dentro de [[columnas]].');
      if ((block.type === 'heading' || block.type === 'subheading') && row) row++;
      const r = render(block, w, state); if (clash(previous, r)) row++;
      for (const it of r.items) {shift(it, 0, row * g); items.push(it);} row += r.rows; previous = r;
    }
    return {items, rows: row};
  }

  const graphs = b => b.type === 'graph' ? 1 : b.type === 'columns' ? b.columns.flat().reduce((n, c) => n + graphs(c), 0) : 0;
  const pages = [], state = {size: o.size, text: o.text, pen: o.ink, tinta: o.tinta, titulos: o.titulos, lineGap: o.lineGap, graphsPerPage: o.graphsPerPage ?? Infinity, answer: o.answer};
  let page = null, row = 0, previous = null;
  const newPage = () => {const side = area[(o.start + pages.length) % 2]; page = {side: side.name, items: [], graphs: 0}; pages.push(page); row = o.insetTop; previous = null;};
  const limit = () => area[(o.start + pages.length - 1) % 2].rows - o.insetBottom;
  newPage();
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === 'set') {state[block.key] = block.value; if (block.key === 'pen' && PENS[block.value]) state.text = PENS[block.value].ink; continue;}
    if (block.type === 'page') {newPage(); continue;}
    if (block.type === 'paper' || block.type === 'option') continue;
    if (block.type === 'blank') {if (row > o.insetTop) row += block.rows; previous = null; continue;}
    const heading = block.type === 'heading' || block.type === 'subheading';
    if (heading && row > o.insetTop && !(blocks[i - 1]?.type === 'blank')) row++;
    const r = render(block, width, state);
    // A heading stays with the beginning of what follows it.
    let need = r.rows, followers = [];
    // …and a statement stays with its datos | resolución columns.
    if (heading || block.type === 'title' || block.type === 'paragraph') {
      const after = blocks.slice(i + 1).filter(b => b.type !== 'set' && b.type !== 'option'), chain = [];
      for (const b of after) {if (b.type === 'blank' && chain.length && chain.length < 4) {chain.push(b); continue;} if (b.type === 'blank' || b.type === 'page' || b.type === 'heading' || b.type === 'subheading' || b.type === 'title') break; chain.push(b); if (b.type !== 'paragraph' || chain.length > 3) break;}
      followers = chain;
      const end = chain.filter(b => b.type !== 'blank').at(-1), solid = end && ['columns', 'graph', 'sketch', 'boxed'].includes(end.type);
      const rows = b => b.type === 'blank' ? b.rows : render(b, width, {...state}).rows;
      if (heading || block.type === 'title') {if (solid) need += chain.reduce((n, b) => n + rows(b), 1); else if (chain[0]) need += Math.min(rows(chain[0]), 4);}
      else if (solid) need += chain.reduce((n, b) => n + rows(b), 1);
      // A question stays with the beginning of its answer.
      else if (/\?\s*$/.test(block.text) && chain[0]) need += Math.min(rows(chain[0]), 4);
    }
    if (row > o.insetTop && clash(previous, r)) row++;
    // At most N graphs on one side of the sheet (the user's rule: three).
    const graphsHere = graphs(block) + followers.reduce((n, b) => n + graphs(b), 0);
    if (row > o.insetTop && graphsHere && page.graphs + graphsHere > state.graphsPerPage) newPage();
    if (row + need > limit() && row > o.insetTop) newPage();
    if (row + r.rows > limit() + 1e-9) throw Error(`Un bloque no cabe en una hoja entera: divídelo («${(block.text || block.type).slice(0, 30)}»).`);
    const side = area.find(s => s.name === page.side), top = side.top + row * g;
    const byHand = state.titulos === 'mano' && (block.type === 'title' || heading);
    for (const it of r.items) {shift(it, side.x0, top); it.tinta = state.tinta; it.pen = state.pen; if (byHand) it.hand = true; page.items.push(it);}
    row += r.rows; previous = r; page.graphs += graphs(block);
  }
  if (!pages.at(-1).items.length && pages.length > 1) pages.pop();
  // Ballpoint ink, once for the preview and the PDF.
  const byId = new Map(samples.map(s => [s.id, s])), real = pages.some(p => p.items.some(it => it.tinta === 'real')), mode = real ? inkMode(samples) : null; let n = o.seed * 7919;
  for (const p of pages) for (const it of p.items) if (it.tinta === 'real') Object.assign(it, ballpoint(it, {kind: PENS[it.pen]?.kind, seed: n++, natural: it.type === 'glyph' ? o.natural : 0, messy: it.type === 'glyph' ? o.desorden : 0, widthMm: it.widthMm ?? o.grosor, sample: byId.get(it.sampleId), mode: it.type === 'glyph' ? mode : 'lineas'}));
  return {pages, missing: [...missing].sort(), paper};
}

const polyPath = polys => polys.map(q => 'M' + q.map(v => v.map(n => n.toFixed(2)).join(',')).join('L') + 'Z').join('');
// Font units to 0.1 (0.0006 mm at 16 pt): a third of the PDF size, same ink.
const glyphPath = paths => paths.map(p => 'M' + p.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(-y * 10) / 10}`).join('L') + 'Z').join('');
/** SVG preview of one page; the grid is drawn only for the screen. */
export function documentSVG(page, paper = OFICIO_ESPIRAL, {grid = true, scale = 4} = {}) {
  const side = paper.sides.find(s => s.name === page.side), g = paper.grid, parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width * scale}" height="${paper.height * scale}" viewBox="0 0 ${paper.width} ${paper.height}"><rect width="${paper.width}" height="${paper.height}" fill="#fffdf8"/>`];
  if (grid) {
    const w = paper.width - side.left - side.right, h = paper.height - side.top - side.bottom;
    for (let y = 0; y <= h + 1e-9; y += g) parts.push(`<path d="M${side.left},${side.top + y}h${w}" stroke="#bcd3e4" stroke-width=".18"/>`);
    for (let x = 0; x <= w + 1e-9; x += g) parts.push(`<path d="M${side.left + x},${side.top}v${h}" stroke="#bcd3e4" stroke-width=".18"/>`);
    parts.push(`<rect x="${side.left}" y="${side.top}" width="${w}" height="${h}" fill="none" stroke="#e4a6b6" stroke-width=".35"/>`);
  }
  // Titles left for the pen show faintly, only on screen.
  for (const it of page.items) parts.push(it.hand ? `<g opacity=".25">` : '', it.layers ? it.layers.map(l => `<path d="${polyPath(l.polys)}" fill="${l.color}"${l.opacity < 1 ? ` fill-opacity="${l.opacity}"` : ''}/>`).join('') : it.type === 'glyph' ? `<path d="${svgPaths(it.paths, true)}" transform="translate(${it.x} ${it.y}) scale(${it.scale})" fill="${it.color}"${it.strokeWidth ? ` stroke="${it.color}" stroke-width="${it.strokeWidth}" stroke-linejoin="round"` : ''}/>` : `<path d="${polyPath(it.polys)}" fill="${it.color}"/>`, it.hand ? '</g>' : '');
  return parts.join('') + '</svg>';
}

/**
 * The centre lines of one page for a pen plotter: one path per stroke, in
 * millimetres from the top-left corner of the sheet, without the printer
 * correction (the plotter holds the sheet itself). Only [[tinta real]].
 */
export function plotterSVG(page, paper = OFICIO_ESPIRAL) {
  const lines = page.items.filter(it => !it.hand).flatMap(it => (it.lines || []).map(l => ({l, color: it.color}))).filter(({l}) => l.length);
  const d = l => 'M' + l.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join('L') + (l.length === 1 ? 'h0.01' : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}mm" height="${paper.height}mm" viewBox="0 0 ${paper.width} ${paper.height}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width=".3">` + lines.map(({l, color}) => `<path d="${d(l)}" stroke="${color}"/>`).join('') + '</svg>';
}

/** PDF with only the writing (the sheet already has its grid). */
export async function documentPDF(result, {offsets = DOCUMENT_DEFAULTS.offsets, select = 'all', grid = false} = {}) {
  if (result.missing?.length) throw Error('Faltan muestras: ' + result.missing.join(' '));
  const paper = result.paper, doc = await PDF.PDFDocument.create(), H = paper.height, rgb = hex => PDF.rgb(...hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255));
  doc.setTitle('Trazo · documento'); doc.setCreator('Trazo');
  // select: 'all', a side name ('anverso' / 'reverso') to print each side in one pass.
  const chosen = result.pages.filter(p => select === 'all' || p.side === select);
  for (const p of chosen) {
    const page = doc.addPage([paper.width * MM, H * MM]), off = offsets?.[p.side] || {x: 0, y: 0}, dx = (Number(off.x) || 0) * MM, dy = -((Number(off.y) || 0) + (grid ? 0 : paper.drop || 0)) * MM;
    if (grid) {
      const side = paper.sides.find(s => s.name === p.side), g = paper.grid, w = paper.width - side.left - side.right, h = H - side.top - side.bottom;
      for (let y = 0; y <= h + 1e-9; y += g) page.drawLine({start: {x: side.left * MM + dx, y: (H - side.top - y) * MM + dy}, end: {x: (side.left + w) * MM + dx, y: (H - side.top - y) * MM + dy}, thickness: .35, color: rgb('#bcd3e4')});
      for (let x = 0; x <= w + 1e-9; x += g) page.drawLine({start: {x: (side.left + x) * MM + dx, y: (H - side.top) * MM + dy}, end: {x: (side.left + x) * MM + dx, y: (H - side.top - h) * MM + dy}, thickness: .35, color: rgb('#bcd3e4')});
    }
    page.pushOperators(PDF.setLineJoin(PDF.LineJoinStyle.Round));
    for (const it of p.items) {
      const color = rgb(it.color);
      if (it.hand) continue;
      if (it.layers) for (const l of it.layers) page.drawSvgPath(polyPath(l.polys), {x: dx, y: H * MM + dy, scale: MM, color: rgb(l.color), ...(l.opacity < 1 ? {opacity: l.opacity} : {})});
      else if (it.type === 'glyph') page.drawSvgPath(glyphPath(it.paths), {x: it.x * MM + dx, y: (H - it.y) * MM + dy, scale: it.scale * MM, color, ...(it.strokeWidth ? {borderColor: color, borderWidth: it.strokeWidth} : {})});
      else page.drawSvgPath(polyPath(it.polys), {x: dx, y: H * MM + dy, scale: MM, color});
    }
  }
  return doc.save();
}
