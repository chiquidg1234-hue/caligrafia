// node work/practicos/snoopy.mjs  ->  outputs/practicos-trapper/fuentes/dibujo-snoopy.txt
// «Dibujo libre» (Snoopy, plano de coordenadas): página 1 el dibujo, página 2 todos los puntos.
// Datos del PDF original. Tres puntos de la lista tenían un dígito perdido y se
// corrigieron por el patrón de la fila de dientes (picos cada 3 en x, a y = -17):
//   (-8,-1) -> (-8,-17) · (1,-1) -> (1,-17) · (14,-17) -> (4,-17)
import fs from 'fs';
const S = {
  1: [[-10,-17],[-10,-9],[-13,-9],[-14,-8],[-14,-6],[-13,0],[-12,5],[-11,9],[-9,9],[-10,10],[-10,11],[-9,13],[-9,15],[-8,17],[-6,19],[-6,20],[-5,20],[-5,19],[-3,17],[-2,13],[-1,13],[0,14],[2,14],[4,12],[5,12],[4,13],[4,15],[5,16],[6,16],[7,15],[7,9],[8,9],[9,5],[10,0],[11,-6],[11,-8],[10,-9],[7,-9],[7,-20],[8,-18],[8,-20],[-11,-20],[-10,-17],[-10,-20],[-9,-18],
    [-9,-20],[-8,-17],[-8,-20],[-7,-18],[-7,-20],[-6,-18],[-6,-20],[-5,-17],[-5,-20],[-4,-18],[-4,-20],[-3,-18],[-3,-20],[-2,-17],[-2,-20],[-1,-18],[-1,-20],[0,-18],[0,-20],[1,-17],[1,-20],[2,-18],[2,-20],[3,-18],[3,-20],[4,-17],[4,-20],[5,-18],[5,-20],[6,-18],[6,-20],[7,-17]],
  2: [[-6,19],[-5,19]],
  3: [[-9,9],[-6,9],[-7,6],[-7,3],[-6,2],[-5,2],[-4,3],[-4,6],[-5,9],[0,9],[1,8],[2,8],[3,9],[7,9]],
  4: [[-8,12],[-8,13],[-7,13],[-7,12],[-8,12]],
  5: [[-2,9],[-2,13]], 6: [[-1,9],[-1,13]], 7: [[2,8],[2,9]], 8: [[3,9],[3,10],[2,11],[0,11]],
  9: [[7,14],[6,14]], 10: [[7,15],[6,15]], 11: [[-11,4],[-7,4]], 12: [[-4,4],[8,4]], 13: [[-12,-2],[9,-2]],
  14: [[-14,-8],[11,-8]], 15: [[-10,-9],[7,-9]], 16: [[-9,-12],[6,-12]], 17: [[-9,-15],[6,-15]],
};
const pt = ([x, y]) => `(${x},${y})`;
const out = ['[[hoja trapper]]', '[[letra bonita]]', '[[filas-grafica 44]]', '# Dibujo libre: Snoopy', '[[grafica -14 14 -20 20]]'];
for (const pts of Object.values(S)) out.push('forma ' + pts.map(p => p.join(' ')).join(' '));
out.push('[[fin]]', '---', '[[tamaño 14]]', '# Puntos del dibujo', '');
for (const [n, pts] of Object.entries(S)) {
  const per = 6, rows = []; for (let i = 0; i < pts.length; i += per) rows.push(pts.slice(i, i + per).map(pt).join('  '));
  rows[0] = `Figura ${n}:  ` + rows[0]; out.push(...rows);
  if (pts.length > 6 && n < 17) out.push('');
}
fs.writeFileSync(new URL('../../outputs/practicos-trapper/fuentes/dibujo-snoopy.txt', import.meta.url), out.join('\n') + '\n');
console.log('figuras', Object.keys(S).length, 'puntos', Object.values(S).flat().length);
