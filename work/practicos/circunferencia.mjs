// Práctico de Circunferencia (19 ejercicios, todos con su gráfica) en formato Trazo.
import fs from 'fs';
const OUT = new URL('../../outputs/practicos-trapper/fuentes/practico-circunferencia.txt', import.meta.url).pathname;
const n = v => String(v).replace('.', ',').replace(/^-/, '-');
const pt = (x, y) => `(${n(x)},${n(y)})`;
const sx = (v, s) => v === 0 ? s : v > 0 ? `(${s} - ${n(v)})` : `(${s} + ${n(-v)})`;
function graph(h, k, r, extra = []) {
  const pts = [[h - r, k - r], [h + r, k + r], ...extra];
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const range = [Math.floor(Math.min(0, ...xs) - 1), Math.ceil(Math.max(0, ...xs) + 1), Math.floor(Math.min(0, ...ys) - 1), Math.ceil(Math.max(0, ...ys) + 1)];
  return range.join(' ');
}
function block(title, statement, h, k, r, steps, opts = {}) {
  const extra = opts.points || [];
  return `### ${title}
${statement}
[[columnas 17]]
[[grafica ${graph(h, k, r, extra.map(p => [p[0], p[1]]))}]]
circulo ${h} ${k} ${r}
${(opts.dashes || []).map(d => `trazos ${d.join(' ')}`).join('\n')}
punto ${h} ${k} | C${pt(h, k)}
${extra.map(p => `punto ${p[0]} ${p[1]} | ${p[2]}${pt(p[0], p[1])}`).join('\n')}
[[fin]]
[[|]]
${steps.join('\n')}
[[fin]]
`.replace(/\n\n+/g, '\n');
}
const ord = [[-2, 3, 5], [4, 6, 6], [2, -1, 4], [4, 1, 3], [-3, 4, 6], [7, -4, 2]];
let s = `[[hoja trapper]]
[[letra intermedia]]
[[graficas-por-hoja 4]]
# Práctico de Circunferencia
`;
ord.forEach(([h, k, r], i) => {
  s += '\n' + block(`Ejercicio ${i + 1}.-`, `Hallar la ecuación de la circunferencia si C${pt(h, k)} y el r=${r}. Graficar.`, h, k, r, [
    `Datos: C${pt(h, k)}  r = ${r}`, '(x - h)^2 + (y - k)^2 = r^2', `${sx(h, 'x')}^2 + ${sx(k, 'y')}^2 = ${r}^2`, `!! ${sx(h, 'x')}^2 + ${sx(k, 'y')}^2 = ${r * r}`]);
});
[[4, 'radio igual a 4', null], [7, 'radio igual a 7', null], [6, 'Diámetro igual a 12', 12], [3, 'Diámetro igual a 6', 6]].forEach(([r, txt, D], i) => {
  s += '\n' + block(`Ejercicio ${i + 7}.-`, `Hallar la ecuación de la circunferencia de centro en el origen y ${txt}. Graficar.`, 0, 0, r, [
    `Datos: C(0,0)  ${D ? `D = ${D}` : `r = ${r}`}`, ...(D ? [`r = D/2 = ${D}/2`, `r = ${r}`] : []), 'x^2 + y^2 = r^2', `x^2 + y^2 = ${r}^2`, `!! x^2 + y^2 = ${r * r}`], {dashes: D ? [[-r, 0, r, 0]] : [[0, 0, r * .7071, r * .7071]]});
});
s += '\n' + block('Ejercicio 11.-', 'Hallar la ecuación de la circunferencia que pasa por el punto P(5,2) y cuyo centro es C(-1,3). Graf.', -1, 3, Math.sqrt(37), [
  'r = raiz((x_2 - x_1)^2 + (y_2 - y_1)^2)', 'r = raiz((5 + 1)^2 + (2 - 3)^2)', 'r = raiz(36 + 1) = raiz(37)', 'r^2 = 37', '!! (x + 1)^2 + (y - 3)^2 = 37'], {points: [[5, 2, 'P']], dashes: [[-1, 3, 5, 2]]});
s += '\n' + block('Ejercicio 12.-', 'Hallar la ecuación de la circunferencia cuyo diámetro son los puntos A(-3,-1) y B(5,5). Graf.', 1, 2, 5, [
  'h = (-3 + 5)/2 = 1', 'k = (-1 + 5)/2 = 2', 'D = raiz((5 + 3)^2 + (5 + 1)^2)', 'D = raiz(64 + 36) = 10', 'r = 10/2 = 5', '!! (x - 1)^2 + (y - 2)^2 = 25'], {points: [[-3, -1, 'A'], [5, 5, 'B']], dashes: [[-3, -1, 5, 5]]});
s += `
13. La ecuación general de la circunferencia puede ser expresada como:
[[tamaño 18]]
x^2 + y^2 + Dx + Ey + F = 0
[[tamaño 16]]
`;
const gen = [
  ['x^2 + y^2 - 6x - 2y - 39 = 0', 3, 1, 7, ['(x^2 - 6x + 9) + (y^2 - 2y + 1)', '= 39 + 9 + 1', '(x - 3)^2 + (y - 1)^2 = 49']],
  ['x^2 + y^2 + 4x - 2y - 4 = 0', -2, 1, 3, ['(x^2 + 4x + 4) + (y^2 - 2y + 1)', '= 4 + 4 + 1', '(x + 2)^2 + (y - 1)^2 = 9']],
  ['x^2 + y^2 - 4x - 6y - 12 = 0', 2, 3, 5, ['(x^2 - 4x + 4) + (y^2 - 6y + 9)', '= 12 + 4 + 9', '(x - 2)^2 + (y - 3)^2 = 25']],
  ['x^2 + y^2 - 4x + 10y + 4 = 0', 2, -5, 5, ['(x^2 - 4x + 4) + (y^2 + 10y + 25)', '= -4 + 4 + 25', '(x - 2)^2 + (y + 5)^2 = 25']],
  ['(x - 2)^2 + (y + 5)^2 = 7', 2, -5, Math.sqrt(7), ['Ya está en forma ordinaria.']],
  ['x^2 + y^2 = 25', 0, 0, 5, ['Centro en el origen.']],
  ['x^2 + y^2 - 36 = 0', 0, 0, 6, ['x^2 + y^2 = 36']],
];
gen.forEach(([eq, h, k, r, steps], i) => {
  const rr = Number.isInteger(r) ? `r = ${r}` : 'r = raiz(7) ≈ 2,65';
  s += '\n' + block(`${i + 1}.-`, `Dada la ecuación de la circunferencia ${eq} ; hallar sus elementos y graficar.`, h, k, r, [...steps, `!! C${pt(h, k)}`, `!! ${rr}`], {dashes: [[h, k, h + r, k]]});
});
fs.mkdirSync(new URL('.', 'file://' + OUT).pathname, {recursive: true});
fs.writeFileSync(OUT, s);
console.log(OUT);
