# Labelled components -> glyph masks with baseline and a common scale.
# Usage: python3 muestras.py carpeta etiquetas.txt salida.json
import sys, json, base64, re, numpy as np
d, lab_file, out = sys.argv[1:4]
labels = np.load(f'{d}/componentes.npz')['labels']; info = {c['id']: c for c in json.load(open(f'{d}/componentes.json'))}
pairs = []
for line in open(lab_file, encoding='utf-8'):
    line = line.split('#')[0]
    for tok in line.split():
        ids, ch = tok.rsplit(':', 1) if tok.count(':') == 1 or not tok.endswith(':') else (tok[:-2], ':')
        pairs.append(([int(v) for v in ids.split('+')], ch))
X_SET, BASE_SET = set('acemnorsuvwxz'), set('acemnorsuvwxz0123456789')
box = lambda ids: [min(info[i]['box'][0] for i in ids), min(info[i]['box'][1] for i in ids), max(info[i]['box'][2] for i in ids), max(info[i]['box'][3] for i in ids)]
items = [{'ids': ids, 'char': ch, 'box': box(ids)} for ids, ch in pairs]
xh = float(np.median([it['box'][3] - it['box'][1] + 1 for it in items if it['char'] in X_SET]))
# Text lines: cluster by vertical centre.
items.sort(key=lambda it: (it['box'][1] + it['box'][3]) / 2)
lines, cur = [], []
for it in items:
    c = (it['box'][1] + it['box'][3]) / 2
    if cur and c - np.mean([(i['box'][1] + i['box'][3]) / 2 for i in cur]) > xh * 1.1: lines.append(cur); cur = []
    cur.append(it)
lines.append(cur)
used = set(i for it in items for i in it['ids'])
small = [c for c in info.values() if c['id'] not in used and c['area'] < xh * xh * .35]
MARK_ABOVE, MARK_BELOW = set('ijíóúáéü¿!:;=ñ'), set('?!;:')
out_items = []
for line in lines:
    base_cands = [it['box'][3] for it in line if it['char'] in BASE_SET]
    for it in line:
        ids = list(it['ids']); x0, y0, x1, y1 = it['box']; h = y1 - y0 + 1
        # dots and accents that belong to this character
        if it['char'] in MARK_ABOVE | MARK_BELOW:
            for m in small:
                mx = (m['box'][0] + m['box'][2]) / 2
                if x0 - .5 * xh <= mx <= x1 + .5 * xh:
                    above = m['box'][3] < y0 + .2 * h and y0 - m['box'][3] < 1.3 * xh
                    below = m['box'][1] > y1 - .3 * h and m['box'][1] - y1 < .8 * xh
                    if (above and it['char'] in MARK_ABOVE) or (below and it['char'] in MARK_BELOW): ids.append(m['id'])
        X0, Y0, X1, Y1 = box(ids)
        crop = np.isin(labels[Y0:Y1 + 1, X0:X1 + 1], ids)
        # baseline: median bottom of base-line letters in this line, else the glyph bottom
        near = [b for b in base_cands]
        baseline = float(np.median(near)) if near else float(y1)
        packed = np.packbits(crop.astype(np.uint8).ravel())
        out_items.append({'char': it['char'], 'w': int(crop.shape[1]), 'h': int(crop.shape[0]), 'bits': base64.b64encode(packed.tobytes()).decode(), 'baseline': baseline - Y0, 'ids': ids})
json.dump({'xheight': xh, 'items': out_items}, open(out, 'w'))
print(len(out_items), 'muestras · altura x', xh, 'px ·', len(lines), 'renglones')
