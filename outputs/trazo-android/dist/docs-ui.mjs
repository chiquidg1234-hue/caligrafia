// «Tareas»: write a whole homework in the plain-text format, see every page
// in your hand and download the PDF for the anverso/reverso of the sheet.
import {composeDocument, documentSVG, documentPDF, DOCUMENT_DEFAULTS, PAPERS} from './document.mjs';
import {setting, setSetting} from './db.mjs';
import {saveFile} from './exports.mjs';
import {PENS} from './model.mjs';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const EXAMPLE = `# Práctico de Física

### Ejercicio 1.-
Calcular la presión que ejerce una fuerza de 50 N sobre una superficie de 4 cm^2.

[[columnas 12]]
**Datos:**
F = 50 N
A = 4 cm^2
P = ?
[[|]]
[[tamaño 17]]
P = F/A
A = 4/10000 = 0,0004 m^2
P = (50 N)/(0,0004 m^2)
!! P = 125 000 Pa
[[fin]]

### Ejercicio 2.-
Encuentra la ecuación de la recta que pasa por (5, 7) y (9, 6).

[[columnas 13]]
[[grafica -2 10 -2 10]]
recta 1 4 -33 | x+4y-33=0
punto 5 7 | (5,7)
punto 9 6 | (9,6)
[[fin]]
[[|]]
m = (6 - 7)/(9 - 5) = -1/4
y - 7 = -1/4(x - 5)
!! x + 4y - 33 = 0
[[fin]]
`;
export const FORMAT_HELP = `<ul class="doc-help">
<li><code># Título</code> centrado y en color · <code>## Subtítulo</code> · <code>### Ejercicio 1.-</code></li>
<li>Una línea = un párrafo. Una línea vacía deja un renglón libre. <code>---</code> pasa a la otra cara.</li>
<li><code>- texto</code> viñeta · <code>!! respuesta</code> termina con dos rayitas // (con <code>[[respuesta recuadro]]</code>, encerrada) · <code>**negrita**</code></li>
<li>Fórmulas: <code>x^2</code> <code>v_0</code> <code>P_{atm}</code> <code>a/b</code> <code>(x+1)/(x-1)</code> <code>3/2x</code> <code>raiz(x)</code> <code>raiz[3](8)</code> <code>&lt;= &gt;= != +- -&gt;</code> <code>π ρ Δ ≈ ·</code></li>
<li>Datos a la izquierda y resolución a la derecha: <code>[[columnas 12]]</code> … <code>[[|]]</code> … <code>[[fin]]</code> (12 = cuadritos de ancho).</li>
<li>Coordenadas: <code>[[grafica xmin xmax ymin ymax]]</code>, luego <code>recta a b c | etiqueta</code> (a·x + b·y + c = 0) y <code>punto x y | (x,y)</code>, y <code>[[fin]]</code>.</li>
<li><code>[[hoja trapper]]</code> u <code>[[hoja oficio]]</code> en el primer renglón elige la hoja · <code>[[tamaño 18]]</code> · <code>[[renglon medio]]</code> / <code>[[renglon seguido]]</code> · <code>[[espacio 2]]</code> · <code>[[graficas-por-hoja 3]]</code></li>
<li><code>[[tinta real]]</code> dibuja cada trazo como un bolígrafo; <code>[[tinta plana]]</code> vuelve al relleno parejo de antes. <code>[[titulos a mano]]</code> deja libre el lugar de los títulos para escribirlos con tu lapicero.</li>
</ul>`;

export async function mountDocuments(root, {samples, toast}) {
  const saved = await setting('documentDraft', null), d = {source: EXAMPLE, paper: 'oficio', start: 0, pen: DOCUMENT_DEFAULTS.ink, tinta: DOCUMENT_DEFAULTS.tinta, titulos: DOCUMENT_DEFAULTS.titulos, size: DOCUMENT_DEFAULTS.size, natural: DOCUMENT_DEFAULTS.natural, text: DOCUMENT_DEFAULTS.text, title: DOCUMENT_DEFAULTS.title, offsets: structuredClone(DOCUMENT_DEFAULTS.offsets), ...(saved || {})};
  let result = null, timer, sequence = 0, worker = null;
  // Long homework takes seconds: compose in the background so the page stays responsive.
  try {worker = new Worker(new URL('./worker.mjs', import.meta.url), {type: 'module'});} catch {worker = null;}
  const background = (source, opts) => worker ? new Promise((resolve, reject) => {const id = 'doc-' + Date.now() + Math.random(); const listen = ({data}) => {if (data.id !== id) return; worker.removeEventListener('message', listen); data.error ? reject(Error(data.error)) : resolve(data.result);}; worker.addEventListener('message', listen); worker.postMessage({id, method: 'composeDocument', args: [source, samples, opts]});}) : Promise.resolve().then(() => composeDocument(source, samples, opts));
  const num = (label, id, value, min, max, step) => `<label>${label}<input id="${id}" type="number" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  root.innerHTML = `<style>.doc-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}.doc-source{width:100%;min-height:420px;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace;padding:12px;border:1px solid #c9d6e2;border-radius:10px;resize:vertical;box-sizing:border-box}.doc-pages{display:grid;gap:18px}.doc-page{background:#fff;border:1px solid #d6e0ea;border-radius:8px;overflow:hidden}.doc-page svg{display:block;width:100%;height:auto}.doc-page p{margin:6px 10px;font-size:13px;color:#5a6b7b}.doc-help{font-size:13px;line-height:1.6;padding-left:18px}.doc-help code{background:#eef3f8;border-radius:4px;padding:0 4px}@media(max-width:860px){.doc-grid{grid-template-columns:1fr}}</style>
  <div class="doc-grid"><section class="card"><h2>Tu tarea en texto</h2>
  <textarea id="docSource" class="doc-source" spellcheck="false" aria-label="Texto de la tarea">${esc(d.source)}</textarea>
  <details class="spaced"><summary>Cómo escribir el formato</summary>${FORMAT_HELP}<p class="fine">También puedes pedirle a otra IA que escriba la tarea en este formato: copia la guía «Formato Trazo» de la carpeta outputs/practicos.</p></details>
  <details class="paper-settings" open><summary>Hoja · tinta · impresora</summary><div class="fields">
  <label>Hoja<select id="docPaper">${Object.entries(PAPERS).map(([k, p]) => `<option value="${k}" ${d.paper === k ? 'selected' : ''}>${esc(p.name)} · ${(p.width / 10).toLocaleString('es')} × ${(p.height / 10).toLocaleString('es')} cm</option>`).join('')}</select></label>
  <label>La primera página va en<select id="docStart"><option value="0" ${d.start ? '' : 'selected'}>Anverso</option><option value="1" ${d.start ? 'selected' : ''}>Reverso</option></select></label>
  <label>Lapicero<select id="docPen"><option value="">Color libre (sin variación)</option>${Object.entries(PENS).map(([k, p]) => `<option value="${k}" ${d.pen === k ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
  <label>Tinta<select id="docTinta"><option value="real" ${d.tinta === 'plana' ? '' : 'selected'}>Real: cada trazo como un bolígrafo</option><option value="plana" ${d.tinta === 'plana' ? 'selected' : ''}>Plana: relleno parejo, como antes</option></select></label>
  <label>Títulos<select id="docTitulos"><option value="impresos" ${d.titulos === 'mano' ? '' : 'selected'}>Impresos</option><option value="mano" ${d.titulos === 'mano' ? 'selected' : ''}>A mano: el PDF deja su lugar libre</option></select></label>
  ${num('Tamaño de letra (pt)', 'docSize', d.size, 12, 24, .5)}
  <label>Naturalidad · ${Math.round(d.natural * 100)} %<input id="docNatural" type="range" min="0" max="1" step="0.05" value="${d.natural}"></label>
  <label>Color del texto<input id="docText" type="color" value="${esc(d.text)}"></label>
  <label>Color de títulos y rectas<input id="docTitle" type="color" value="${esc(d.title)}"></label>
  ${num('Anverso: mover → (mm)', 'offAX', d.offsets.anverso.x, -15, 15, .5)}${num('Anverso: mover ↓ (mm)', 'offAY', d.offsets.anverso.y, -15, 15, .5)}
  ${num('Reverso: mover → (mm)', 'offRX', d.offsets.reverso.x, -15, 15, .5)}${num('Reverso: mover ↓ (mm)', 'offRY', d.offsets.reverso.y, -15, 15, .5)}
  </div><p class="fine">La corrección viene medida de tu primera prueba en la Epson T50: 5–6 mm a la derecha y 1 mm hacia abajo. Solo mueve el PDF; la vista previa muestra dónde cae sobre tu hoja.</p></details>
  <div id="docError" class="error" role="status"></div>
  <div class="actions"><button class="btn primary" id="docAll">PDF completo</button><button class="btn" id="docOdd">Solo anversos</button><button class="btn" id="docEven">Solo reversos</button><button class="btn" id="docGrid">Hoja blanca con cuadrícula</button><button class="text-btn" id="docExample">Cargar ejemplo</button></div>
  <p class="fine spaced">Para imprimir: tamaño real 100 %, papel definido por el usuario del tamaño de la hoja (Oficio 211 × 322 mm, Trapper 211 × 280 mm). Imprime «Solo anversos», da vuelta las hojas y luego «Solo reversos». Empuja la hoja contra la guía derecha y cierra la guía izquierda sin apretar.</p></section>
  <section><div class="section-top"><h2>Así queda</h2><span class="fine" id="docStatus"></span></div><div id="docPages" class="doc-pages"></div></section></div>`;
  const $ = s => root.querySelector(s);
  const read = () => {
    d.paper = $('#docPaper').value; d.pen = $('#docPen').value; d.tinta = $('#docTinta').value; d.titulos = $('#docTitulos').value; d.source = $('#docSource').value; d.start = Number($('#docStart').value); d.size = Number($('#docSize').value) || DOCUMENT_DEFAULTS.size; d.natural = Number($('#docNatural').value); d.text = $('#docText').value; d.title = $('#docTitle').value;
    d.offsets = {anverso: {x: Number($('#offAX').value) || 0, y: Number($('#offAY').value) || 0}, reverso: {x: Number($('#offRX').value) || 0, y: Number($('#offRY').value) || 0}};
    setSetting('documentDraft', d).catch(() => {});
  };
  const options = () => ({paper: PAPERS[d.paper] || PAPERS.oficio, ink: d.pen, tinta: d.tinta === 'plana' ? 'plana' : 'real', titulos: d.titulos === 'mano' ? 'mano' : 'impresos', start: d.start, size: d.size, natural: d.natural, text: d.text, title: d.title, graph: d.title});
  function compose() {
    const mine = ++sequence; $('#docStatus').textContent = 'Escribiendo con tu letra…';
    setTimeout(async () => {
      if (mine !== sequence || !root.isConnected) return;
      try {
        const composed = await background(d.source, options()); if (mine !== sequence || !root.isConnected) return; result = composed;
        $('#docError').textContent = result.missing.length ? 'Faltan muestras para: ' + result.missing.join(' ') + ' · Añádelas en Mi letra o cambia esos signos.' : '';
        $('#docPages').innerHTML = result.pages.map((p, i) => `<figure class="doc-page">${documentSVG(p, result.paper, {scale: 1})}<p>Página ${i + 1} · ${p.side}</p></figure>`).join('');
        $('#docStatus').textContent = result.pages.length + (result.pages.length === 1 ? ' página' : ' páginas') + ' · ' + Math.ceil(result.pages.length / 2) + (result.pages.length > 2 ? ' hojas' : ' hoja');
      } catch (e) {if (mine !== sequence) return; result = null; $('#docError').textContent = e.message; $('#docStatus').textContent = '';}
    }, 30);
  }
  const later = () => {read(); clearTimeout(timer); timer = setTimeout(compose, 700);};
  root.querySelectorAll('textarea,input,select').forEach(el => el.addEventListener('input', later));
  $('#docPen').addEventListener('input', () => {const pen = PENS[$('#docPen').value]; if (pen) $('#docText').value = pen.ink; later();});
  const exportAs = (select, name, grid = false) => async () => {
    try {read(); if (!result) {toast('Espera a que termine la vista previa.'); return;} const bytes = await documentPDF(result, {offsets: grid ? {} : d.offsets, select, grid}); await saveFile(new Blob([bytes], {type: 'application/pdf'}), name); toast('PDF listo.');}
    catch (e) {toast(e.message);}
  };
  $('#docAll').onclick = exportAs('all', 'Tarea.pdf'); $('#docOdd').onclick = exportAs('anverso', 'Tarea-anversos.pdf'); $('#docEven').onclick = exportAs('reverso', 'Tarea-reversos.pdf'); $('#docGrid').onclick = exportAs('all', 'Tarea-hoja-blanca.pdf', true);
  $('#docExample').onclick = () => {$('#docSource').value = EXAMPLE; later();};
  compose();
  return () => {sequence++; clearTimeout(timer); worker?.terminate();};
}
