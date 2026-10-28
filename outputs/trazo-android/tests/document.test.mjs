import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {layoutText, syllableBreaks} from '../web/core.mjs';
import {composeFormula} from '../web/math.mjs';
import {parseDocument, composeDocument, documentPDF, documentSVG, OFICIO_ESPIRAL} from '../web/document.mjs';
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
