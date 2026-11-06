// node work/practicos/investigacion.mjs -> outputs/investigaciones-trapper/fuentes/investigacion-circunferencia-natural.txt
// 25 preguntas (rojo) con su respuesta (azul) y 25 gráficas con compás y regla (con un dejo de mano):
// dos por fila, mismo tamaño, cada una con su título en rojo y todo el espacio que necesita.
import fs from 'fs';
const preguntas = [
  ['¿Qué es una circunferencia y cómo se define geométricamente?', 'Línea curva cerrada cuyos puntos están a la misma distancia del centro.'],
  ['¿Diferencia entre circunferencia y círculo?', 'La circunferencia es el borde y el círculo es la superficie interior.'],
  ['¿Cuáles son sus elementos?', 'Centro, radio, diámetro, cuerda, arco, secante y tangente.'],
  ['¿Qué es el radio?', 'Es el segmento que une el centro con un punto de la circunferencia.'],
  ['¿Qué es el diámetro?', 'Es el segmento que pasa por el centro y mide el doble del radio.'],
  ['¿Qué es una cuerda?', 'Es un segmento que une dos puntos de la circunferencia.'],
  ['¿Qué es un arco?', 'Es una parte de la circunferencia delimitada por dos puntos.'],
  ['¿Qué es una semicircunferencia?', 'Es la mitad de una circunferencia delimitada por un diámetro.'],
  ['¿Qué es un sector circular?', 'Es la región limitada por dos radios y un arco.'],
  ['¿Qué es un segmento circular?', 'Es la región limitada por una cuerda y un arco.'],
  ['¿Cuál es la ecuación ordinaria?', '(x - h)^2 + (y - k)^2 = r^2'],
  ['¿Qué representan h, k y r?', 'h y k son las coordenadas del centro y r es el radio.'],
  ['¿Cómo se deduce la ecuación general de una circunferencia a partir de su ecuación ordinaria?', 'Desarrollando la ecuación ordinaria y ordenando sus términos.'],
  ['¿Qué información se puede obtener al comparar las ecuaciones de dos circunferencias?', 'Sus centros, radios y posiciones relativas.'],
  ['¿Qué sucede con la ecuación de una circunferencia si el radio es igual a cero?', 'Se reduce a un solo punto.'],
  ['¿Qué condición debe cumplir una ecuación cuadrática?', 'Los términos x^2 e y^2 deben tener iguales coeficientes y no existir término xy.'],
  ['¿Cómo se determina el centro y el radio a partir de una ecuación general?', 'Completando cuadrados.'],
  ['¿Qué representa el radio negativo en una ecuación de circunferencia?', 'No representa una circunferencia real, porque el radio no puede ser negativo.'],
  ['¿Por qué el radio de una circunferencia siempre debe ser un número positivo?', 'Porque representa una distancia.'],
  ['¿Qué ocurre con una circunferencia cuyo centro coincide con el origen del plano?', 'La ecuación es x^2 + y^2 = r^2'],
  ['¿Qué se entiende por tangente a una circunferencia?', 'Es una recta que toca la circunferencia en un solo punto.'],
  ['¿Qué condición debe cumplir una recta para ser tangente a una circunferencia?', 'Es perpendicular al radio en el punto de contacto.'],
  ['¿Qué diferencia hay entre una secante y una tangente?', 'La secante corta en dos puntos y la tangente toca en uno.'],
  ['¿Qué ocurre si la distancia entre los centros de dos circunferencias es mayor que la suma de sus radios?', 'Las circunferencias no se intersectan.'],
  ['¿Por qué se dice que la circunferencia es un caso particular de cónica?', 'Porque se obtiene al cortar un cono con un plano perpendicular a su eje.'],
];
const f = n => +n.toFixed(2), deg = Math.PI / 180;
const pt = (cx, cy, r, a) => [f(cx + r * Math.cos(a * deg)), f(cy - r * Math.sin(a * deg))];
const C = (x, y, r) => `circulo ${f(x)} ${f(y)} ${f(r)}`, D = (x, y) => `punto ${f(x)} ${f(y)}`, T = (x, y, s) => `texto ${f(x)} ${f(y)} | ${s}`;
const L = (a, b) => `linea ${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])}`, Z = (a, b) => `trazos ${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])}`;
const col = (name, ...lines) => [`color ${name}`, ...lines, 'color tinta'], thick = (n, ...lines) => [`grueso ${n}`, ...lines, 'grueso 1'];
const arc = (cx, cy, r, a, b) => `arco ${f(cx)} ${f(cy)} ${f(r)} ${a} ${b}`;
const arrow = (a, b) => {const t = Math.atan2(b[1] - a[1], b[0] - a[0]), h = [-.9, .9].map(s => [b[0] - Math.cos(t + s * .5) * .9, b[1] - Math.sin(t + s * .5) * .9]); return [L(a, b), L(h[0], b), L(h[1], b)];};
const title = (n, ox) => col('rojo', `rotulo ${ox} 1 | Gráfica ${n}`);
const hatch = (cx, cy, R, step) => {const o = []; for (let s = -R + step; s < R - .3; s += step) {const h = Math.sqrt(R * R - s * s) * .88, c = [cx + s / Math.SQRT2, cy + s / Math.SQRT2], d = [h / Math.SQRT2, -h / Math.SQRT2]; o.push(L([c[0] - d[0], c[1] - d[1]], [c[0] + d[0], c[1] + d[1]]));} return o;};
const axes = (ox, cx, cy) => [...arrow([ox + .6, 10], [ox + 14.4, 10]), ...arrow([ox + 1.2, 10.6], [ox + 1.2, 2.2]), T(ox + 14, 9.4, 'x'), T(ox + 1.7, 3, 'y')];
const cross = (cx, cy, r) => [...arrow([cx - r - 1.4, cy], [cx + r + 1.4, cy]), ...arrow([cx, cy + r + 1], [cx, cy - r - 1])];

// Cada gráfica: (ox) -> líneas. Centro estándar (ox + 7.5, 6.4), radio 3.4.
const G = {};
const std = ox => ({cx: ox + 7.5, cy: 6.4, r: 3.4});
G[1] = ox => {const {cx, cy, r} = std(ox); return [C(cx, cy, r), D(cx, cy), T(cx - 1.4, cy + 1.2, 'O')];};
G[2] = ox => [C(ox + 3.7, 6.3, 2.9), C(ox + 11.3, 6.3, 2.9), ...hatch(ox + 11.3, 6.3, 2.9, .7), T(ox + 2.3, 10.7, 'borde'), T(ox + 9.2, 10.7, 'superficie')];
G[4] = ox => {const {cx, cy, r} = std(ox), p = pt(cx, cy, r, 35); return [C(cx, cy, r), ...col('rojo', L([cx, cy], p)), D(cx, cy), D(...p), T(cx - 1.4, cy + 1.2, 'O'), T(p[0] + .5, p[1] - .3, 'A'), T((cx + p[0]) / 2 - .2, (cy + p[1]) / 2 + 1.3, 'r')];};
G[5] = ox => {const {cx, cy, r} = std(ox); return [C(cx, cy, r), L([cx - r, cy], [cx + r, cy]), D(cx - r, cy), D(cx + r, cy), D(cx, cy), T(cx - r - 1.2, cy + .3, 'A'), T(cx + r + .5, cy + .3, 'B'), T(cx - .3, cy - .9, 'O'), T(cx - 1.4, cy + r + 1.4, 'd = 2r')];};
G[6] = ox => {const {cx, cy, r} = std(ox), a = pt(cx, cy, r, 205), b = pt(cx, cy, r, 335); return [C(cx, cy, r), ...col('verde', L(a, b)), D(...a), D(...b), T(a[0] - 1.1, a[1] + .8, 'A'), T(b[0] + .5, b[1] + .8, 'B'), ...col('verde', T(cx - 1.2, a[1] - .8, 'cuerda'))];};
G[7] = ox => {const {cx, cy, r} = std(ox), a = pt(cx, cy, r, 30), b = pt(cx, cy, r, 150); return [C(cx, cy, r), ...col('morado', ...thick(3, arc(cx, cy, r, 30, 150))), D(...a), D(...b), T(a[0] + .5, a[1] - .3, 'B'), T(b[0] - 1.1, b[1] - .3, 'A'), ...col('morado', T(cx - .9, cy - r - .6, 'arco'))];};
G[8] = ox => {const {cx, cy, r} = std(ox); return [C(cx, cy, r), L([cx - r, cy], [cx + r, cy]), ...col('morado', ...thick(3, arc(cx, cy, r, 180, 360))), D(cx - r, cy), D(cx + r, cy), D(cx, cy), T(cx - .3, cy - .9, 'O'), T(cx - 4.4, cy + r + 1.6, 'semicircunferencia')];};
G[9] = ox => {const {cx, cy, r} = std(ox), a = pt(cx, cy, r, 15), b = pt(cx, cy, r, 80); return [C(cx, cy, r), L([cx, cy], a), L([cx, cy], b), arc(cx, cy, r * .35, 15, 80), arc(cx, cy, r * .62, 15, 80), arc(cx, cy, r * .88, 15, 80), D(cx, cy), T(cx - 1.4, cy + 1.2, 'O'), T(cx - 3.6, cy + r + 1.6, 'sector circular')];};
G[10] = ox => {const {cx, cy, r} = std(ox), a = pt(cx, cy, r, 30), b = pt(cx, cy, r, 150), lines = []; for (let y = a[1] - .55; y > cy - r + .35; y -= .55) {const h = Math.sqrt(r * r - (cy - y) ** 2) * .9; lines.push(L([cx - h, y], [cx + h, y]));} return [C(cx, cy, r), ...col('morado', L(b, a), ...thick(3, arc(cx, cy, r, 30, 150))), ...lines, T(cx - 3.8, cy + r + 1.6, 'segmento circular')];};
G[11] = ox => {const cx = ox + 8, cy = 6.2; return [...axes(ox), C(cx, cy, 3), D(cx, cy), Z([cx, cy], [cx + 3, cy]), T(cx + 1.2, cy - .6, 'r'), T(cx - 3.4, cy + 1.3, '(h, k)'), T(ox + 1.5, 12.2, '(x - h)^2 + (y - k)^2 = r^2')];};
G[12] = ox => {const cx = ox + 8, cy = 6.2, p = pt(cx, cy, 3, 40); return [...axes(ox), C(cx, cy, 3), D(cx, cy), ...col('rojo', L([cx, cy], p)), T(cx + .6, cy - 1.6, 'r'), T(cx - 3.4, cy + 1.3, '(h, k)')];};
G[13] = ox => [T(ox + .8, 4.4, '(x - h)^2 + (y - k)^2 = r^2'), ...arrow([ox + 5, 5.6], [ox + 5, 8.2]), T(ox + 6.2, 7.3, 'desarrollar'), T(ox + .8, 10.8, 'x^2 + y^2 + Dx + Ey + F = 0')];
G[14] = ox => [C(ox + 5.3, 6.3, 3.3), C(ox + 10, 6.3, 2.5), D(ox + 5.3, 6.3), D(ox + 10, 6.3), Z([ox + 5.3, 6.3], [ox + 10, 6.3]), T(ox + 4.2, 7.9, 'O_1'), T(ox + 9, 7.9, 'O_2'), T(ox + 7.3, 5.6, 'd')];
G[15] = ox => [D(ox + 7.5, 6.4), `punto ${f(ox + 7.5)} 6.4`, T(ox + 6.1, 7.9, 'O'), T(ox + 4.4, 10.4, 'r = 0 (un punto)')];
G[16] = ox => [T(ox + .8, 4.2, 'x^2 + y^2 + Dx + Ey + F = 0'), T(ox + .8, 7, 'coeficientes de x^2 e y^2 iguales'), T(ox + .8, 9.6, 'sin término xy')];
G[17] = ox => [T(ox + .8, 4, 'x^2 + y^2 + Dx + Ey + F = 0'), ...arrow([ox + 3, 5], [ox + 3, 7.4]), T(ox + 4.2, 6.5, 'completar cuadrados'), T(ox + .8, 10, '(x - h)^2 + (y - k)^2 = r^2')];
G[18] = ox => {const {cx, cy, r} = std(ox), o = []; for (let a = 0; a < 360; a += 30) o.push(arc(cx, cy, r, a, a + 20)); return [...o, ...col('rojo', L([cx - 1.2, cy - 1.2], [cx + 1.2, cy + 1.2]), L([cx - 1.2, cy + 1.2], [cx + 1.2, cy - 1.2])), T(cx - 1.2, cy - r - .6, 'r < 0'), T(cx - 4.8, cy + r + 1.6, 'no es circunferencia')];};
G[19] = ox => {const {cx, cy, r} = std(ox), p = pt(cx, cy, r, 25); return [C(cx, cy, r), ...col('rojo', L([cx, cy], p)), D(cx, cy), T(cx - 1.4, cy + 1.2, 'O'), T(cx - 1.3, cy - r - .6, 'r > 0')];};
G[20] = ox => {const {cx, cy, r} = std(ox), p = pt(cx, cy, r, 40); return [...cross(cx, cy, r), C(cx, cy, r), ...col('rojo', L([cx, cy], p)), D(cx, cy), T(cx + .4, cy + 1.2, 'O'), T((cx + p[0]) / 2 + .2, (cy + p[1]) / 2 - .5, 'r'), T(cx - 2.2, 12.3, 'x^2 + y^2 = r^2')];};
G[21] = ox => {const {cx, cy, r} = std(ox), a = 40, p = pt(cx, cy, r, a), u = [Math.sin(a * deg), Math.cos(a * deg)]; return [C(cx, cy, r), L([cx, cy], p), ...col('rojo', L([p[0] - u[0] * 3.3, p[1] - u[1] * 3.3], [p[0] + u[0] * 3.3, p[1] + u[1] * 3.3])), D(cx, cy), D(...p), T(cx - 1.4, cy + 1.2, 'O'), T(p[0] + .5, p[1] - .6, 'P'), T(p[0] + 1.8, p[1] + 2.8, 'tangente')];};
G[22] = ox => {const {cx, cy, r} = std(ox), px = cx + r; return [C(cx, cy, r), L([cx, cy], [px, cy]), ...col('rojo', L([px, cy - 3.4], [px, cy + 3.4])), L([px - .8, cy], [px - .8, cy - .8]), L([px - .8, cy - .8], [px, cy - .8]), D(cx, cy), D(px, cy), T(cx - 1.4, cy + 1.2, 'O'), T(cx + 1.4, cy + 1.3, 'r'), T(px + .5, cy + .3, 'P'), T(px - 2.6, cy - 1.2, '90°'), T(px - 1.4, cy - 4, 'tangente')];};
G[23] = ox => {const cx = ox + 7.5, cy = 6, r = 3.2; return [C(cx, cy, r), ...col('morado', L([ox + 1.4, 2.7], [ox + 11, 8.5])), ...col('rojo', L([ox + 2.8, cy + r], [ox + 12.2, cy + r])), D(cx, cy + r), T(ox + 1, 2.2, 'secante'), T(ox + 9.5, cy + r + 1.8, 'tangente')];};
G[24] = ox => {const a = ox + 3.8, b = ox + 11.7, y = 6.3; return [C(a, y, 2.6), C(b, y, 2.3), D(a, y), D(b, y), ...col('rojo', L([a, y], [a + 2.6, y]), L([b - 2.3, y], [b, y])), Z([a + 2.6, y], [b - 2.3, y]), T(a + .9, y - .7, 'r_1'), T(b - 1.8, y - .7, 'r_2'), T(a - .4, y + 1.5, 'O_1'), T(b - .4, y + 1.5, 'O_2'), T((a + b) / 2 - .3, y - .9, 'd'), T(ox + 2.6, 10.8, 'd > r_1 + r_2')];};
const cone = () => [C(0, 0, .01)].slice(1).concat([
  'elipse 15 14.8 7 1.6', L([15, 1.8], [8, 14.8]), L([15, 1.8], [22, 14.8]), Z([15, 1.8], [15, 14.8]),
  ...col('rojo', L([5.4, 8.1], [24, 8.1]), L([24, 8.1], [22.2, 11]), L([22.2, 11], [3.6, 11]), L([3.6, 11], [5.4, 8.1]), 'elipse 15 9.5 4.2 .9'),
  T(14.6, 1.4, 'V'), T(.6, 9.8, 'plano'), ...arrow([20.2, 6.6], [18.2, 9]), T(20.4, 6, 'circunferencia')]);

const rows = [[1, 2], [3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24], [25]];
const heights = {1: 11.4, 2: 11.4, 3: 12.6, 4: 11.4, 6: 11.4, 8: 11.4, 10: 11.4, 11: 13, 12: 13, 13: 12, 14: 11.4, 16: 11.4, 18: 11.4, 20: 13, 21: 12.6, 22: 12, 24: 11, 25: 16.6};
const normal = process.argv.includes('--normal');   // letra «normal» (la fea): node investigacion.mjs --normal
const out = ['[[hoja trapper]]', ...(normal ? ['[[letra normal]]', '[[desorden 0.85]]'] : ['[[letra intermedia]]']), '[[renglon seguido]]', '# Investigación sobre circunferencia', 'Para 5to de secundaria', ''];
preguntas.forEach(([q, a], i) => out.push(`?? ${i + 1}-${q}`, `-${a}`, ''));
out.push('---', '# Gráficas', '');
const g3 = () => {
  const cx = 9, cy = 6.9, r = 4.4, pr = pt(cx, cy, r, 40), pc1 = pt(cx, cy, r, 205), pc2 = pt(cx, cy, r, 335), L0 = [];
  L0.push(...title(3, 0), C(cx, cy, r), L([cx - r, cy], [cx + r, cy]), D(cx, cy), T(cx + .3, cy + 1.2, 'O'),
    ...col('rojo', L([cx, cy], pr)), ...col('verde', L(pc1, pc2)), ...col('morado', ...thick(3, arc(cx, cy, r, 100, 160)), L([cx - 6.3, cy - 3.3], [cx + 6.3, cy - 3.3])), ...col('negro', L([cx + r, cy - 3.4], [cx + r, cy + 3.4])));
  const items = [['rojo', 'radio'], ['tinta', 'diámetro'], ['verde', 'cuerda'], ['morado', 'arco'], ['morado', 'secante'], ['negro', 'tangente']];
  items.forEach(([c, t], i) => {const y = 3 + i * 1.7; L0.push(...col(c, ...(t === 'arco' ? thick(3, L([17, y - .3], [19.6, y - .3])) : [L([17, y - .3], [19.6, y - .3])])), T(20.4, y, t));});
  return L0;
};
const row = cells => {
  const H = Math.max(...cells.map(n => heights[n] || 12)), b = [`[[dibujo 30 ${H} prolijo]]`];
  cells.forEach((n, i) => {const ox = cells.length === 1 ? 0 : i * 15.5; b.push(...(n === 3 ? g3() : n === 25 ? [...title(25, 0), ...cone().map(s => s)] : [...title(n, ox), ...G[n](ox)]));});
  b.push('[[fin]]'); return b;
};
for (const cells of rows) out.push(...row(cells));
fs.writeFileSync(new URL(`../../outputs/investigaciones-trapper/fuentes/investigacion-circunferencia-${normal ? 'normal' : 'natural'}.txt`, import.meta.url), out.join('\n') + '\n');
console.log('listo', rows.length, 'filas');
