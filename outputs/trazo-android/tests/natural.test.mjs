import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {layoutText} from '../web/core.mjs';
import {composeFormula, isFormula, handStroke} from '../web/math.mjs';
import {planBundledLetters} from '../web/bundled.mjs';
import {pagesPDF} from '../web/exports.mjs';
import {createMap, renderMap} from '../web/maps.mjs';

const bundle = JSON.parse(fs.readFileSync(new URL('../web/personal-letter.json', import.meta.url)));
const natural = bundle.profiles.find(p => p.id === 'personal-natural-v1').samples;
const sample = (label, id = label, advance = 600, top = 500) => ({label, char: label, id, advance, paths: [[[40, 0], [40, top], [480, top], [480, 0]]], baseline: .78});
const letters = [...'abcdefghijklmnopqrstuvwxyz0123456789()+-=/.,'].flatMap(c => [sample(c, c + '1'), sample(c, c + '2')]);
const area = p => p.reduce((s, a, i) => {const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1];}, 0) / 2;
const baselines = layout => [...new Set(layout.pages[0].map(g => g.y))];

test('Natural profile: reviewed variants, own derived symbols, Spanish coverage and consistent winding', () => {
  const labels = new Set(natural.map(s => s.label));
  for (const c of 'abcdefghijklmnñopqrstuvwxyzABCDEFGHIJKLMNÑOPQRSTUVWXYZáéíóúüÁÉÍÓÚÜ0123456789¿?¡!.,;:') assert.ok(labels.has(c), c);
  for (const c of '×·<>≤≥±≠→∞°|−') assert.ok(labels.has(c), 'derived ' + c);
  assert.ok(natural.filter(s => s.label === 'a').length >= 2);
  assert.ok(natural.filter(s => s.label === 'ñ').length >= 2);
  assert.ok(natural.length <= 1600 && Math.max(...[...labels].map(l => natural.filter(s => s.label === l).length)) <= 15);
  // The j borrows the dot of the user's i: two separate contours.
  assert.ok(natural.filter(s => s.label === 'j').every(s => s.paths.length >= 2));
  // Largest contour of every sample is an outer one with negative winding.
  for (const s of natural) assert.ok(area(s.paths.reduce((a, b) => Math.abs(area(b)) > Math.abs(area(a)) ? b : a)) < 0, s.label);
});

test('a newly bundled Natural letter is selected once, then the user choice stays', () => {
  const b = {version: 1, profiles: [{id: 'personal-uniforme-v1', name: 'U', samples: [sample('a')]}, {id: 'personal-natural-v1', name: 'N', samples: [sample('a')]}]};
  const upgraded = planBundledLetters(b, {samples: [], profiles: [], activeProfileId: 'mine'}, ['personal-uniforme-v1']);
  assert.equal(upgraded.activeProfileId, 'personal-natural-v1');
  const later = planBundledLetters(b, {...upgraded, activeProfileId: 'personal-uniforme-v1'}, upgraded.installed);
  assert.equal(later.activeProfileId, 'personal-uniforme-v1');
});

test('renglón por medio leaves exactly one free line and keeps the grid pitch', () => {
  const text = 'a '.repeat(200), options = {width: 120, height: 200, margin: 10, size: 15, leading: 5, gridMm: 5};
  const plain = baselines(layoutText(text, letters, options)), skip = baselines(layoutText(text, letters, {...options, lineGap: 1}));
  assert.ok(Math.abs(plain[1] - plain[0] - 5) < 1e-9);
  assert.ok(Math.abs(skip[1] - skip[0] - 10) < 1e-9);
  assert.equal(skip.length, plain.length);
  assert.ok(Math.abs(skip.at(-1) - skip[0] - 2 * (plain.at(-1) - plain[0])) < 1e-9);
});

test('baselines sit on the grid lines and keep doing so on every page', () => {
  const layout = layoutText('a\n'.repeat(120), letters, {width: 120, height: 150, marginTop: 13, margin: 10, size: 15, leading: 5, gridMm: 5, gridOriginY: 1.5, snapToGrid: true});
  assert.ok(layout.pages.length > 1);
  for (const page of layout.pages) for (const g of page) {const k = (g.y - 13 - 1.5) / 5; assert.ok(Math.abs(k - Math.round(k)) < 1e-9, String(g.y));}
});

test('natural mode is deterministic, never leaves the margins and never repeats a shape twice in a row', () => {
  const options = {width: 100, height: 120, margin: 12, size: 15, leading: 6, natural: 1, seed: 9};
  const a = layoutText('aaaaaa aaaa aaa aaaaa '.repeat(12), letters, options), b = layoutText('aaaaaa aaaa aaa aaaaa '.repeat(12), letters, options);
  assert.deepEqual(a, b);
  for (const g of a.pages[0]) for (const p of g.paths) for (const [x] of p) assert.ok(g.x + x * g.scale >= 12 - 1e-6 && g.x + x * g.scale <= 88 + 1e-6);
  const ids = a.pages[0].map(g => g.sampleId);
  for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1]);
  const exact = layoutText('aaaa', letters, {...options, natural: 0});
  assert.ok(exact.pages[0].every(g => g.paths === letters.find(s => s.id === g.sampleId).paths));
});

test('formulas: detection, fractions, roots with index, scripts and missing symbols', () => {
  assert.ok(isFormula('x^2') && isFormula('a/b') && isFormula('raiz(x)') && isFormula('<=') && !isFormula('hola'));
  const pick = c => letters.find(s => s.label === c) || null;
  const fraction = composeFormula('(x+1)/(x-1)', pick), flat = composeFormula('x+1', pick);
  const top = r => Math.max(...r.paths.flat().map(p => p[1])), bottom = r => Math.min(...r.paths.flat().map(p => p[1]));
  assert.deepEqual(fraction.missing, []);
  assert.ok(top(fraction) > top(flat) && bottom(fraction) < 0, 'numerator above, denominator below the baseline');
  const root = composeFormula('raiz[3](27)', pick), plain = composeFormula('raiz(27)', pick);
  assert.ok(root.advance > plain.advance, 'the index takes room');
  const power = composeFormula('x^2', pick);
  assert.ok(top(power) > top(composeFormula('x', pick)));
  assert.deepEqual(composeFormula('x^π', pick).missing, ['π']);
  // Trailing punctuation is not part of a denominator.
  assert.ok(composeFormula('km/h.', pick).advance > composeFormula('km/h', pick).advance);
  // Hand strokes share the letters' winding, so overlaps join.
  assert.ok(handStroke([[0, 0], [100, 50], [200, 0]], 40).every(p => area(p) < 0));
});

test('math mode lays out formulas with the user letters and gives tall lines extra rows', () => {
  const options = {width: 120, height: 150, margin: 10, size: 15, leading: 5, gridMm: 5, math: true, snapToGrid: true};
  const short = layoutText('x = (a+b)/(c+d)\nfin', letters, options), tall = layoutText('(a+b)/(c+d)\n(e+f)/(g+h)', letters, options);
  assert.deepEqual(short.missing, []);
  const [a, b] = baselines(short), [c, d] = baselines(tall);
  assert.ok(Math.abs(b - a - 5) < 1e-9, 'a short next line stays on the next row');
  assert.ok(Math.abs(d - c - 10) < 1e-9, 'two stacked fractions take one more row');
  assert.throws(() => layoutText('x = (a+b)/(c+d)\nfin', letters, {...options, math: false, snapToGrid: false, leading: 3, size: 30}), /interlineado/);
  assert.deepEqual(layoutText('y^π', letters, options).missing, ['π']);
});

test('printer correction moves only the PDF and screen-only guides are not printed', async () => {
  const layout = layoutText('ab', letters, {width: 120, height: 150, margin: 10}), base = {width: 120, height: 150, margin: 10, ruling: 'grid'};
  const bytes = async options => new Uint8Array(await (await pagesPDF(layout, {...base, ...options})).arrayBuffer());
  assert.notDeepEqual(await bytes({}), await bytes({printOffsetX: 2}));
  assert.deepEqual(layout, layoutText('ab', letters, {width: 120, height: 150, margin: 10}), 'the layout itself never moves');
  assert.ok((await bytes({screenOnlyGuides: true})).length < (await bytes({})).length);
});

test('hand-drawn maps replace straight outlines in SVG and PDF geometry', () => {
  const samples = [...'abcdefghijklmnopqrstuvwxyzáéíóúñTPUSOLAIDGRE¿?'].map(c => sample(c));
  const map = createMap('concept'), plain = createMap('concept');plain.paper = {...plain.paper, handDrawn: false};
  assert.equal(map.paper.handDrawn, true, 'new maps are hand drawn by default');
  const straight = renderMap(plain, samples), drawn = renderMap(map, samples);
  assert.ok(!straight.geometry.nodes[0].ink && drawn.geometry.nodes[0].ink.length > 10);
  assert.ok(drawn.geometry.edges.every(e => e.ink.length > 0));
  assert.ok(!/stroke-width="0.45"/.test(drawn.svg) && /stroke-width="0.45"/.test(straight.svg));
});
