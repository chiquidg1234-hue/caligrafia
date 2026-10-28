# Numbered connected components of an ink mask, drawn on tiles for labelling.
# Usage: python3 componentes.py tinta.npz carpeta [filas columnas]
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
npz, outdir = sys.argv[1], sys.argv[2]
rows, cols = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (6, 2)
ink = np.load(npz)['ink']
h, w = ink.shape
# Union-find over horizontal runs (8-connectivity).
parent = []
def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]; i = parent[i]
    return i
runs_prev, runs = [], []
all_runs = []
for y in range(h):
    row = ink[y]
    d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
    starts, ends = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]
    runs = []
    j = 0
    for s, e in zip(starts, ends):
        idx = len(parent); parent.append(idx); runs.append((s, e, idx)); all_runs.append((y, s, e, idx))
        while j < len(runs_prev) and runs_prev[j][1] < s: j += 1
        k = j
        while k < len(runs_prev) and runs_prev[k][0] <= e:
            a, b = find(idx), find(runs_prev[k][2])
            if a != b: parent[max(a, b)] = min(a, b)
            k += 1
    runs_prev = runs
comps = {}
for y, s, e, idx in all_runs:
    r = find(idx); c = comps.setdefault(r, [10**9, 10**9, -1, -1, 0])
    c[0] = min(c[0], s); c[1] = min(c[1], y); c[2] = max(c[2], e - 1); c[3] = max(c[3], y); c[4] += e - s
labels = np.zeros((h, w), np.int32)
keep = []
for r, (x0, y0, x1, y1, area) in comps.items():
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    if area < 12: continue
    # grid remnants: long and only 1–4 px thick
    if (bw > 6 * bh and bh <= 5) or (bh > 6 * bw and bw <= 5): continue
    keep.append((r, x0, y0, x1, y1, area))
keep.sort(key=lambda c: (c[2] + c[4]) // 2 // 40 * 100000 + c[1])
info = []
for n, (r, x0, y0, x1, y1, area) in enumerate(keep, 1):
    info.append({'id': n, 'root': int(r), 'box': [int(x0), int(y0), int(x1), int(y1)], 'area': int(area)})
for y, s, e, idx in all_runs:
    r = find(idx)
    labels[y, s:e] = r
# map root -> id
ids = np.zeros(labels.max() + 1, np.int32)
for c in info: ids[c['root']] = c['id']
labels = ids[labels]
np.savez_compressed(f'{outdir}/componentes.npz', labels=labels)
json.dump(info, open(f'{outdir}/componentes.json', 'w'))
img = Image.fromarray(np.where(labels > 0, 60, 255).astype(np.uint8)).convert('RGB')
d = ImageDraw.Draw(img)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except Exception: font = ImageFont.load_default()
for c in info:
    x0, y0, x1, y1 = c['box']
    d.rectangle([x0, y0, x1, y1], outline=(0, 160, 255))
    d.text((x0, y0 - 18), str(c['id']), fill=(220, 0, 0), font=font)
th, tw = h // rows, w // cols
for i in range(rows):
    for j in range(cols):
        img.crop((j * tw, i * th, (j + 1) * tw + 40, (i + 1) * th + 40)).save(f'{outdir}/tile-{i}-{j}.png')
print(len(info), 'componentes')
