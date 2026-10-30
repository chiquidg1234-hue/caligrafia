import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {layoutText, syllableBreaks} from '../web/core.mjs';
import {composeFormula} from '../web/math.mjs';
import {parseDocument, composeDocument, documentPDF, documentSVG, OFICIO_ESPIRAL, TRAPPER_TOP} from '../web/document.mjs';
import * as pdfBundle from '../web/vendor/pdf-lib.min.js';

const natural = JSON.parse(fs.readFileSync(new URL('../web/personal-letter.json', import.meta.url))).profiles.find(p => p.id === 'personal-natural-v1').samples;
const pick = c => natural.find(s => s.label === c) || null;
const hyphenated = w => {let out = '', at = 0; for (const k of syllableBreaks(w)) {out += w.slice(at, k) + '-'; at = k;} return out + w.slice(at);};

test('Spanish syllables keep inseparable pairs, diphthongs and hiatus', () => {
  assert.equal(hyphenated('guerra'), 'gue-rra');
  assert.equal(hyphenated('sindicalismo'), 'sin-di-ca-lis-mo');
  assert.equal(hyphenated('construcción'), 'cons-truc-ción');
  assert.equal(hyphenated('química'), 'quí-mi-ca');
  assert.equal(hyphenated('coordenadas'), 'co-or-de-na-das');
  assert.deepEqual(syllableBreaks('sol'), []);
});

test('long words are cut with a hyphen at a syllable and never leave the margin', () => {
  const text = 'Estados Unidos se enriqueció durante la guerra enviando suministros a los países aliados.';
  const layout = layoutText(text, natural, {width: 90, height: 120, margin: 10, size: 18, hyphenate: true});
  const lines = new Map(); for (const g of layout.pages[0]) lines.set(g.y, (lines.get(g.y) || '') + g.label);
  assert.ok([...lines.values()].some(l => l.endsWith('-')), 'at least one line ends with a hyphen');
  for (const g of layout.pages[0]) for (const p of g.paths) for (const [x] of p) assert.ok(g.x + x * g.scale <= 80 + 1e-6);
  const plain = layoutText(text, natural, {width: 90, height: 120, margin: 10, size: 18});
  assert.ok(![...new Set(plain.pages[0].map(g => g.y))].some(y => plain.pages[0].filter(g => g.y === y).at(-1).label === '-'));
});

test('formula grouping: 3/2x is three halves of x and 1/4(x-5) a quarter of (x-5)', () => {
  const width = t => composeFormula(t, pick).advance;
  assert.ok(width('3/2x') > width('3/(2x)'), 'x stays outside the fraction');
  assert.ok(width('1/4(x-5)') > width('1/(4(x-5))'));
  assert.ok(width('km/h.') > width('km/h'), 'final period is not part of the denominator');
  assert.deepEqual(composeFormula('P_{atm} = ρ·g·h ≈ 2π', pick).missing, []);
});

test('document format: blocks, columns, graphs and helpful errors', () => {
  const blocks = parseDocument('# Título\n\n### Ejercicio 1.-\nTexto\n[[columnas 12]]\n**Datos:**\n[[|]]\n!! x = 2\n[[fin]]\n[[grafica -2 4 -2 4]]\nrecta 1 -1 0 | y=x\npunto 1 1 | (1,1)\n[[fin]]\n---\n- viñeta');
  assert.deepEqual(blocks.map(b => b.type), ['title', 'blank', 'subheading', 'paragraph', 'columns', 'graph', 'page', 'bullet']);
  assert.equal(blocks[4].left, 12); assert.equal(blocks[4].columns[1][0].type, 'boxed');
  assert.deepEqual(blocks[5].lines[0], {a: 1, b: -1, c: 0, label: 'y=x'});
  assert.throws(() => parseDocument('[[columnas]]\nhola'), /fin/);
  assert.throws(() => parseDocument('[[grafica 1 2]]\n[[fin]]'), /xmin/);
  assert.throws(() => parseDocument('[[desconocido]]'), /renglón 1/);
});

test('pages alternate anverso/reverso, sit on the grid and respect the inner margins', () => {
  const source = Array.from({length: 40}, (_, i) => `Renglón número ${i + 1} con algo de texto para llenar la hoja.`).join('\n');
  const doc = composeDocument(source, natural, {natural: 0});
  assert.deepEqual(doc.missing, []);
  assert.ok(doc.pages.length >= 2);
  assert.deepEqual(doc.pages.slice(0, 2).map(p => p.side), ['anverso', 'reverso']);
  for (const page of doc.pages) {
    const side = OFICIO_ESPIRAL.sides.find(s => s.name === page.side), left = side.left + 5, right = OFICIO_ESPIRAL.width - side.right - 10;
    for (const g of page.items.filter(i => i.type === 'glyph')) {
      const k = (g.y - side.top) / 5; assert.ok(Math.abs(k - Math.round(k)) < 1e-6, 'baseline on a grid line');
      for (const p of g.paths) for (const [x] of p) assert.ok(g.x + x * g.scale >= left - 1e-6 && g.x + x * g.scale <= right + 1e-6);
    }
  }
});

test('at most N graphs per side and a statement never stays alone at the bottom', () => {
  const exercise = n => `### Ejercicio ${n}.-\nEnunciado del ejercicio ${n}.\n\n[[columnas 12]]\n[[grafica -4 4 -4 4]]\nrecta 1 -1 0 | y=x\n[[fin]]\n[[|]]\ny = x\n!! y = x\n[[fin]]\n`;
  const doc = composeDocument('[[graficas-por-hoja 2]]\n' + Array.from({length: 5}, (_, i) => exercise(i + 1)).join('\n'), natural);
  assert.deepEqual(doc.missing, []);
  assert.equal(doc.pages.length, 3);
  // Each page starts with a heading in the title colour.
  for (const page of doc.pages) {const [r, , b] = page.items.find(i => i.type === 'glyph').color.slice(1).match(/../g).map(v => parseInt(v, 16)); assert.ok(r > b * 1.5, 'heading in red ink');}
});

test('pen ink varies the tone of each letter around the pen colour', () => {
  const plain = composeDocument('Hola hola hola', natural, {ink: ''}), pen = composeDocument('Hola hola hola', natural, {ink: 'bic-azul'});
  assert.equal(new Set(plain.pages[0].items.map(i => i.color)).size, 1);
  assert.ok(new Set(pen.pages[0].items.map(i => i.color)).size > 3);
});

test('PDF applies the printer correction per side and can print one side only', async () => {
  const doc = composeDocument('# Hoja\nuno\n---\ndos', natural);
  const all = await documentPDF(doc), anversos = await documentPDF(doc, {select: 'anverso'}), moved = await documentPDF(doc, {offsets: {anverso: {x: 3, y: 0}, reverso: {x: 0, y: 0}}});
  const pages = async bytes => (await pdfBundle.default.PDFDocument.load(bytes)).getPageCount();
  assert.equal(await pages(all), 2); assert.equal(await pages(anversos), 1);
  assert.notDeepEqual(all, moved);
  assert.match(documentSVG(doc.pages[0]), /^<svg/);
  await assert.rejects(() => documentPDF({...doc, missing: ['π']}), /Faltan/);
});

test('line starts vary like a hand (1–3 mm) but stay inside the free squares', () => {
  const source = Array.from({length: 30}, (_, i) => `Renglón ${i + 1}: texto corto.`).join('\n');
  const page = composeDocument(source, natural).pages[0], side = OFICIO_ESPIRAL.sides.find(s => s.name === page.side), lines = new Map();
  for (const g of page.items.filter(i => i.type === 'glyph')) {const x = Math.min(...g.paths.flat().map(p => g.x + p[0] * g.scale)); const k = Math.round(g.y / 5); lines.set(k, Math.min(lines.get(k) ?? Infinity, x));}
  const starts = [...lines.values()], spread = Math.max(...starts) - Math.min(...starts);
  assert.ok(spread >= 1 && spread <= 3.5, `spread ${spread.toFixed(2)} mm`);
  assert.ok(Math.min(...starts) >= side.left + 3, 'never closer than 3 mm to the frame');
});

test('[[hoja trapper]] lays out on the Trapper sheet and the PDF has its size', async () => {
  const doc = composeDocument('[[hoja trapper]]\n# Química\n' + Array.from({length: 60}, (_, i) => `Renglón ${i + 1}`).join('\n'), natural);
  assert.equal(doc.paper, TRAPPER_TOP);
  for (const page of doc.pages) {
    const side = TRAPPER_TOP.sides.find(s => s.name === page.side);
    for (const g of page.items.filter(i => i.type === 'glyph')) assert.ok(g.y <= TRAPPER_TOP.height - side.bottom - 5 + 1e-6 && g.x >= side.left);
  }
  const pdf = await pdfBundle.default.PDFDocument.load(await documentPDF(doc));
  assert.deepEqual(pdf.getPage(0).getSize().height.toFixed(1), (280 * 72 / 25.4).toFixed(1));
  assert.throws(() => parseDocument('hola\n[[hoja trapper]]'), /primer renglón/);
  assert.throws(() => parseDocument('[[hoja carta]]'), /oficio, trapper/);
});

test('«//» writes units on the line instead of a fraction', () => {
  const tall = t => {const ys = composeFormula(t, pick).paths.flat().map(p => p[1]); return Math.max(...ys) - Math.min(...ys);};
  assert.ok(tall('32g//mol') < tall('32g/mol') * .75);
  assert.deepEqual(composeFormula('R = 8,314 J//(mol·K)', pick).missing, []);
});

test('answers end with two little lines; the box only with [[respuesta recuadro]]', () => {
  const ink = src => composeDocument(src, natural).pages[0].items.filter(i => i.type === 'ink').length;
  assert.equal(ink('!! x = 2'), 2);
  assert.equal(ink('[[respuesta recuadro]]\n!! x = 2'), 4);
  assert.throws(() => parseDocument('[[respuesta circulo]]'), /rayitas/);
});

test('a question never stays alone at the bottom of a sheet', () => {
  const source = Array.from({length: 40}, (_, i) => `${i + 1}. ¿Pregunta número ${i + 1} sobre la circunferencia?\nRespuesta corta de la pregunta ${i + 1}.\n`).join('\n');
  for (const page of composeDocument(source, natural).pages) {
    const rows = [...new Set(page.items.map(i => Math.round(i.y / 5)))].sort((a, b) => a - b), last = page.items.filter(i => Math.round(i.y / 5) === rows.at(-1));
    assert.ok(!last.some(i => i.label === '?') || page === undefined, 'a question ends the page');
  }
});

test('[[dibujo]] draws a freehand sketch that takes its rows and reports bad lines', () => {
  const doc = composeDocument('[[dibujo 10 6]]\ncirculo 5 3 2\nlinea 1 1 9 5\npunto 5 3\ntexto 1 6 | radio\n[[fin]]\nHola', natural);
  const ink = doc.pages[0].items.filter(i => i.type === 'ink');
  assert.ok(ink.length >= 3);
  assert.throws(() => composeDocument('[[dibujo 10 6]]\ncuadrado 1 1\n[[fin]]', natural), /circulo, arco/);
  const more = composeDocument('[[dibujo 12 8]]\ncolor rojo\narco 5 4 3 20 160\nelipse 5 4 3 1\ntrazos 1 1 9 1\nsector 5 4 3 0 60\nsegmento 5 4 3 30 150\ngrueso 3\nlinea 1 7 9 7\nrotulo 1 2 | Gráfica 1\n[[fin]]', natural);
  const drawn = more.pages[0].items.filter(i => i.type === 'ink');
  assert.ok(drawn.length >= 8 && drawn.some(i => i.color === '#b02a33') && drawn.some(i => i.widthMm > .3));
});
