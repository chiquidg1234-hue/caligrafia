// Comprueba que la letra de cada hoja cae sobre los renglones de la cuadrícula.
// Para cada renglón de texto toma la mediana de la base de sus letras (así las potencias, los
// subíndices y las fracciones no cuentan) y la compara con la línea de la cuadrícula más cercana.
// alineacion(result) -> {ok, max, lines, problems[]}.  Si no es ok, no se debe entregar el PDF.
export function alineacion(result, {tol = .5} = {}) {
  const g = result.paper.grid, problems = []; let max = 0, lines = 0;
  for (const [n, page] of result.pages.entries()) {
    const side = result.paper.sides.find(s => s.name === page.side), rows = new Map();
    for (const it of page.items) if (it.type === 'glyph' && !it.free) {const k = Math.round((it.y - side.top) / g); if (!rows.has(k)) rows.set(k, []); rows.get(k).push((it.y - side.top) / g - k);}
    for (const [k, list] of rows) {
      if (list.length < 3) continue;
      list.sort((a, b) => a - b); const dev = list[list.length >> 1] * g; lines++; max = Math.max(max, Math.abs(dev));
      if (Math.abs(dev) > tol) problems.push(`página ${n + 1}, renglón ${k}: la letra queda ${dev.toFixed(2)} mm fuera del renglón`);
    }
  }
  return {ok: !problems.length, max, lines, problems};
}
