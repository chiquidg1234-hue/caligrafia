// Writes the source of the mathematics practical in the Trazo document format.
// The equations come from the resolution the user provided; the graph ranges
// are computed so that every point and the answer line are visible.
import fs from 'fs';
const OUT = new URL('../../outputs/practicos/fuentes/practico-matematicas.txt', import.meta.url).pathname;

const theory = `# Práctico de Matemáticas

## 1. Explica los siguientes conceptos:

### a. La recta.
La recta es una línea formada por infinitos puntos que se extiende en ambos sentidos y no tiene principio ni fin. En geometría analítica se puede representar mediante una ecuación y dibujar en el plano cartesiano.

### b. Pendiente de una recta.
La pendiente de una recta indica su inclinación respecto al eje horizontal. Se representa con la letra m y se calcula con la fórmula:
[[tamaño 18]]
m = (y_2 - y_1)/(x_2 - x_1)
[[tamaño 16]]
Donde (x_1, y_1) y (x_2, y_2) son dos puntos de la recta.

### c. Rectas paralelas. Escribe dos ejemplos.
Las rectas paralelas son aquellas que mantienen siempre la misma distancia entre sí y nunca se cruzan. Tienen la misma pendiente.
Ejemplos:
- y = 2x + 3   y   y = 2x - 4
- y = -3x + 1   y   y = -3x + 5

### d. Rectas perpendiculares. Escribe dos ejemplos.
Las rectas perpendiculares son aquellas que se cruzan formando un ángulo de 90°. Sus pendientes son inversas y de signo contrario, cuando ambas pendientes están definidas.
Ejemplos:
- y = 2x + 1   y   y = -1/2x + 3
- y = 3x - 2   y   y = -1/3x + 4

### e. La diferencia entre una recta mediana y mediatriz.
La mediana de un triángulo es el segmento que une un vértice con el punto medio del lado opuesto.
La mediatriz es una recta perpendicular a un segmento que pasa por su punto medio.
Diferencia principal: la mediana parte de un vértice del triángulo, mientras que la mediatriz pasa por el punto medio de un lado y forma un ángulo de 90° con él.
`;

// [statement, points, reference line or null, answer line [a,b,c], answer text, steps]
const two = [
  ['Pasa por los puntos: (5, 7) y (9, 6).', [[5, 7], [9, 6]], null, [1, 4, -33], 'x + 4y - 33 = 0', ['Datos: P_1 = (5, 7)   P_2 = (9, 6)', 'm = (6 - 7)/(9 - 5) = -1/4', 'y - 7 = -1/4(x - 5)', 'Multiplicamos por 4:', '4y - 28 = -x + 5']],
  ['Pasa por los puntos: (-4, -6) y (0, 8).', [[-4, -6], [0, 8]], null, [7, -2, 16], '7x - 2y + 16 = 0', ['Datos: P_1 = (-4, -6)   P_2 = (0, 8)', 'm = (8 - (-6))/(0 - (-4)) = 14/4 = 7/2', 'y - 8 = 7/2(x - 0)', 'Multiplicamos por 2:', '2y - 16 = 7x']],
  ['Pasa por los puntos: (10, 4) y (-7, -9).', [[10, 4], [-7, -9]], null, [13, -17, -62], '13x - 17y - 62 = 0', ['Datos: P_1 = (10, 4)   P_2 = (-7, -9)', 'm = (-9 - 4)/(-7 - 10) = (-13)/(-17) = 13/17', 'y - 4 = 13/17(x - 10)', 'Multiplicamos por 17:', '17y - 68 = 13x - 130']],
  ['Pasa por los puntos: (0, 7) y (-3, 5).', [[0, 7], [-3, 5]], null, [2, -3, 21], '2x - 3y + 21 = 0', ['Datos: P_1 = (0, 7)   P_2 = (-3, 5)', 'm = (5 - 7)/(-3 - 0) = (-2)/(-3) = 2/3', 'y - 7 = 2/3(x - 0)', 'Multiplicamos por 3:', '3y - 21 = 2x']],
  ['Pasa por los puntos: (0, 7) y (-3, 0).', [[0, 7], [-3, 0]], null, [7, -3, 21], '7x - 3y + 21 = 0', ['Datos: P_1 = (0, 7)   P_2 = (-3, 0)', 'm = (0 - 7)/(-3 - 0) = (-7)/(-3) = 7/3', 'y - 7 = 7/3(x - 0)', 'Multiplicamos por 3:', '3y - 21 = 7x']],
];
const parallel = [
  ['Pasa por el punto: (3, 5) y es paralela a la recta: -x + 2y - 4 = 0.', [[3, 5]], [-1, 2, -4], [1, -2, 7], 'x - 2y + 7 = 0', ['Datos: P = (3, 5)', 'Despejamos y: 2y = x + 4', 'y = 1/2x + 2   m = 1/2', 'y - 5 = 1/2(x - 3)', 'Multiplicamos por 2:', '2y - 10 = x - 3']],
  ['Pasa por el punto: (-4, 3) y es paralela a la recta: 3x - 2y + 5 = 0.', [[-4, 3]], [3, -2, 5], [3, -2, 18], '3x - 2y + 18 = 0', ['Datos: P = (-4, 3)', 'Despejamos y: -2y = -3x - 5', 'y = 3/2x + 5/2   m = 3/2', 'y - 3 = 3/2(x + 4)', 'Multiplicamos por 2:', '2y - 6 = 3x + 12']],
  ['Pasa por el punto: (5, -4) y es paralela a la recta: 3x + 5y + 7 = 0.', [[5, -4]], [3, 5, 7], [3, 5, 5], '3x + 5y + 5 = 0', ['Datos: P = (5, -4)', 'Despejamos y: 5y = -3x - 7', 'y = -3/5x - 7/5   m = -3/5', 'y + 4 = -3/5(x - 5)', 'Multiplicamos por 5:', '5y + 20 = -3x + 15']],
  ['Pasa por el punto: (6, 3) y es paralela a la recta: 4x - 3y - 12 = 0.', [[6, 3]], [4, -3, -12], [4, -3, -15], '4x - 3y - 15 = 0', ['Datos: P = (6, 3)', 'Despejamos y: -3y = -4x + 12', 'y = 4/3x - 4   m = 4/3', 'y - 3 = 4/3(x - 6)', 'Multiplicamos por 3:', '3y - 9 = 4x - 24']],
  ['Pasa por el punto: (-8, -2) y es paralela a la recta: 5x + 2y + 10 = 0.', [[-8, -2]], [5, 2, 10], [5, 2, 44], '5x + 2y + 44 = 0', ['Datos: P = (-8, -2)', 'Despejamos y: 2y = -5x - 10', 'y = -5/2x - 5   m = -5/2', 'y + 2 = -5/2(x + 8)', 'Multiplicamos por 2:', '2y + 4 = -5x - 40']],
];
const perpendicular = [
  ['Pasa por el punto: (3, 5) y es perpendicular a la recta: -5x + 2y - 4 = 0.', [[3, 5]], [-5, 2, -4], [2, 5, -31], '2x + 5y - 31 = 0', ['Datos: P = (3, 5)', '2y = 5x + 4   m_1 = 5/2', 'm_2 = -1/m_1 = -2/5', 'y - 5 = -2/5(x - 3)', 'Multiplicamos por 5:', '5y - 25 = -2x + 6']],
  ['Pasa por el punto: (4, 3) y es perpendicular a la recta: 3x + y + 5 = 0.', [[4, 3]], [3, 1, 5], [1, -3, 5], 'x - 3y + 5 = 0', ['Datos: P = (4, 3)', 'y = -3x - 5   m_1 = -3', 'm_2 = -1/m_1 = 1/3', 'y - 3 = 1/3(x - 4)', 'Multiplicamos por 3:', '3y - 9 = x - 4']],
  ['Pasa por el punto: (7, -4) y es perpendicular a la recta: 3x + 5y + 7 = 0.', [[7, -4]], [3, 5, 7], [5, -3, -47], '5x - 3y - 47 = 0', ['Datos: P = (7, -4)', '5y = -3x - 7   m_1 = -3/5', 'm_2 = -1/m_1 = 5/3', 'y + 4 = 5/3(x - 7)', 'Multiplicamos por 3:', '3y + 12 = 5x - 35']],
  ['Pasa por el punto: (4, 3) y es perpendicular a la recta: 4x + 5y - 12 = 0.', [[4, 3]], [4, 5, -12], [5, -4, -8], '5x - 4y - 8 = 0', ['Datos: P = (4, 3)', '5y = -4x + 12   m_1 = -4/5', 'm_2 = -1/m_1 = 5/4', 'y - 3 = 5/4(x - 4)', 'Multiplicamos por 4:', '4y - 12 = 5x - 20']],
  ['Pasa por el punto: (8, -2) y es perpendicular a la recta: -5x + 2y + 10 = 0.', [[8, -2]], [-5, 2, 10], [2, 5, -6], '2x + 5y - 6 = 0', ['Datos: P = (8, -2)', '2y = 5x - 10   m_1 = 5/2', 'm_2 = -1/m_1 = -2/5', 'y + 2 = -2/5(x - 8)', 'Multiplicamos por 5:', '5y + 10 = -2x + 16']],
];

// Range around the points, the origin and where the answer line crosses the axes.
function range(points, [a, b, c]) {
  const xs = [0, ...points.map(p => p[0])], ys = [0, ...points.map(p => p[1])];
  if (a) xs.push(-c / a); if (b) ys.push(-c / b);
  const keep = v => Math.abs(v) <= 14;
  const lo = v => Math.floor(Math.min(...v.filter(keep)) - 2), hi = v => Math.ceil(Math.max(...v.filter(keep)) + 2);
  return [lo(xs), hi(xs), lo(ys), hi(ys)];
}
function exercise(n, [statement, points, reference, answer, answerText, steps]) {
  const [xmin, xmax, ymin, ymax] = range(points, answer);
  return `
### ${n}. ${statement}
[[columnas 13]]
[[grafica ${xmin} ${xmax} ${ymin} ${ymax}]]
${reference ? `recta ${reference.join(' ')}\n` : ''}recta ${answer.join(' ')} | ${answerText.replace(/ /g, '')}
${points.map(p => `punto ${p[0]} ${p[1]} | (${p[0]},${p[1]})`).join('\n')}
[[fin]]
[[|]]
[[tamaño 17]]
${steps.join('\n')}
Ordenamos:
!! ${answerText}
[[tamaño 16]]
[[fin]]
`;
}
let count = 0;
const section = (title, intro, list) => `\n## ${title}\n${intro}` + list.map((e, i) => exercise(i + 1, e)).join('');
const source = theory + '---\n[[graficas-por-hoja 3]]\n'
  + section('2. Encuentra la ecuación de las rectas que cumplen las condiciones indicadas y graficar cada una.', '[[tamaño 17]]\nm = (y_2 - y_1)/(x_2 - x_1)      y - y_1 = m(x - x_1)\n[[tamaño 16]]\n', two)
  + section('3. Encuentra la ecuación de las rectas que cumplen las condiciones indicadas y grafica cada una.', 'Regla: las rectas paralelas tienen la misma pendiente.\n', parallel)
  + section('4. Encuentra la ecuación de las rectas que cumplen las condiciones indicadas y graficar cada una.', 'Regla: las rectas perpendiculares tienen pendientes inversas y de signo contrario.\n', perpendicular);
fs.writeFileSync(OUT, source);
console.log(OUT);
