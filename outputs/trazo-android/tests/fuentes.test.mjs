import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planBundledLetters} from '../web/bundled.mjs';
import {composeDocument} from '../web/document.mjs';

const bundle = JSON.parse(fs.readFileSync(new URL('../web/personal-letter.json', import.meta.url)));
const area = p => p.reduce((s, a, i) => {const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1];}, 0) / 2;

for (const [id, name] of [['personal-2a-v1', 'Fuente 2A'], ['personal-2y-v1', 'Fuente 2Y']]) {
  test(`${name}: complete Spanish set, few variants per letter and consistent winding`, () => {
    const profile = bundle.profiles.find(p => p.id === id);
    assert.equal(profile.name, name);
    const labels = new Set(profile.samples.map(s => s.label));
    for (const c of 'abcdefghijklmnñopqrstuvwxyzABCDEFGHIJKLMNÑOPQRSTUVWXYZáéíóúÁÉÍÓÚ0123456789¿?¡!.,;:()+-=') assert.ok(labels.has(c), c);
    assert.ok(Math.max(...[...labels].map(l => profile.samples.filter(s => s.label === l).length)) <= 14);
    for (const s of profile.samples) assert.ok(area(s.paths.reduce((a, b) => Math.abs(area(b)) > Math.abs(area(a)) ? b : a)) < 0, s.label);
  });

  test(`${name}: writes a homework without missing characters`, () => {
    const samples = bundle.profiles.find(p => p.id === id).samples;
    const doc = composeDocument('# Unidad 5\n### Ejercicio 1.-\nJesús fundó una sola iglesia, ¿por qué?\n[[columnas 12]]\nF = 50 N\n[[|]]\nP = F/A = raiz(49) + x^2\n!! P = 125 000 Pa\n[[fin]]', samples);
    assert.deepEqual(doc.missing, []);
    assert.equal(doc.pages.length, 1);
  });
}

test('the photo fonts install next to the others and Natural stays the first choice', () => {
  const plan = planBundledLetters(bundle, {samples: [], profiles: [], activeProfileId: null});
  assert.deepEqual(plan.profiles.map(p => p.id).slice(-2), ['personal-2a-v1', 'personal-2y-v1']);
  assert.equal(plan.activeProfileId, 'personal-natural-v1');
});
