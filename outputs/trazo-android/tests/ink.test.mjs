import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {centerlines, ballpoint, inkMode, softOutline} from '../web/ink.mjs';
import {composeDocument, documentPDF, documentSVG, plotterSVG} from '../web/document.mjs';

const profiles = JSON.parse(fs.readFileSync(new URL('../web/personal-letter.json', import.meta.url))).profiles;
const letters = id => profiles.find(p => p.id === id).samples;
const natural = letters('personal-natural-v1');
const ring = (cx, cy, r, n = 48) => Array.from({length: n}, (_, k) => [cx + Math.cos(k / n * 2 * Math.PI) * r, cy + Math.sin(k / n * 2 * Math.PI) * r]);
const length = l => l.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - l[i][0], p[1] - l[i][1]), 0);

test('a bar becomes one line with its width; a ring becomes one closed loop', () => {
  const [bar] = centerlines([[[1, 1], [5, 1], [5, 1.3], [1, 1.3]]]);
  assert.equal(bar.closed, false);
  assert.ok(Math.abs(length(bar.points) - 3.7) < .25, `length ${length(bar.points)}`);
  for (const [, y, r] of bar.points) {assert.ok(Math.abs(y - 1.15) < .03); assert.ok(Math.abs(r - .15) < .03, `half-width ${r}`);}
  const loops = centerlines([ring(3, 3, 1.15), ring(3, 3, .85).reverse()]);
  assert.equal(loops.length, 1); assert.equal(loops[0].closed, true);
  for (const [x, y, r] of loops[0].points) {assert.ok(Math.abs(Math.hypot(x - 3, y - 3) - 1) < .05); assert.ok(Math.abs(r - .15) < .04);}
});

test('the lines rebuild almost every letter of Mi letra Natural', () => {
  const scale = 16 * 25.4 / 72 / 1000, poor = natural.filter(s => {const {fit} = centerlines(s.paths.map(p => p.map(([x, y]) => [x * scale, -y * scale]))); return fit.over > .22 || fit.under > .22 || fit.loops;});
  assert.ok(poor.length <= natural.length * .03, `${poor.length} poor: ${poor.map(s => s.label).join('')}`);
});

test('ballpoint ink: same seed same ink, another seed another letter', () => {
  const sample = natural.find(s => s.label === 'a'), item = {type: 'glyph', paths: sample.paths, x: 20, y: 30, scale: .0056, color: '#283a7c'};
  const one = ballpoint(item, {seed: 4, sample}), again = ballpoint(item, {seed: 4, sample}), other = ballpoint(item, {seed: 5, sample});
  assert.deepEqual(one, again); assert.notDeepEqual(one.lines, other.lines);
  assert.ok(one.layers.length >= 1 && one.lines.length >= 1);
  for (const l of one.layers) {assert.match(l.color, /^#[\da-f]{6}$/); assert.ok(l.opacity > 0 && l.opacity <= 1); assert.ok(l.polys.every(p => p.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))));}
  // Still where the letter was.
  const xs = one.lines.flat().map(p => p[0]), ys = one.lines.flat().map(p => p[1]), box = {l: Math.min(...sample.paths.flat().map(p => 20 + p[0] * .0056)), r: Math.max(...sample.paths.flat().map(p => 20 + p[0] * .0056))};
  assert.ok(Math.min(...xs) >= box.l - .1 && Math.max(...xs) <= box.r + .1 && ys.every(y => y < 31 && y > 25));
});

test('a clean letter set is redrawn by lines; noisy photos keep their softened outline', () => {
  assert.equal(inkMode(natural), 'lineas');
  assert.equal(inkMode(letters('personal-2y-v1')), 'contorno');
  // The softened outline keeps the eye of an «o».
  const o = letters('personal-2y-v1').find(s => s.label === 'o'), scale = .0056, soft = softOutline(o.paths.map(p => p.map(([x, y]) => [x * scale, -y * scale])));
  assert.ok(soft.length >= 2, 'outline and hole');
});

test('documents use real ink by default; [[tinta plana]] keeps the flat fill', async () => {
  const real = composeDocument('# Hoja\nHola, ¿qué tal? x^2 = 4', natural), flat = composeDocument('[[tinta plana]]\n# Hoja\nHola', natural);
  assert.ok(real.pages[0].items.every(it => it.layers?.length));
  assert.ok(flat.pages[0].items.every(it => !it.layers));
  assert.match(documentSVG(real.pages[0]), /fill-opacity/);
  assert.ok((await documentPDF(real)).length > 1000);
  const svg = plotterSVG(real.pages[0], real.paper);
  assert.match(svg, /^<svg[^>]+width="211mm"/); assert.ok((svg.match(/<path /g) || []).length > 10);
  assert.throws(() => composeDocument('[[tinta brillante]]', natural), /tinta real/);
});

test('[[titulos a mano]] leaves the titles out of the PDF and shows them faintly on screen', async () => {
  const source = '# Práctico\n### Ejercicio 1.-\nHola', printed = composeDocument(source, natural), byHand = composeDocument('[[titulos a mano]]\n' + source, natural);
  assert.ok(!printed.pages[0].items.some(it => it.hand));
  const hand = byHand.pages[0].items.filter(it => it.hand);
  assert.ok(hand.length >= 'PrácticoEjercicio1.-'.length - 2 && hand.length < byHand.pages[0].items.length);
  assert.match(documentSVG(byHand.pages[0]), /<g opacity="\.25">/);
  assert.ok((await documentPDF(byHand)).length < (await documentPDF(printed)).length);
  assert.ok((plotterSVG(byHand.pages[0]).match(/<path /g) || []).length < (plotterSVG(printed.pages[0]).match(/<path /g) || []).length);
});
