# Ink mask without the notebook grid. Usage:
#   python3 preparar.py foto.jpg salida.npz rotacion "x0,y0,x1,y1" [excluir "x0,y0,x1,y1;..."]
# The grid is removed as long, thin straight runs; pen strokes that cross a
# grid line are reconnected with a small closing.
import sys, numpy as np
from PIL import Image, ImageFilter
src, out, rot, box = sys.argv[1], sys.argv[2], float(sys.argv[3]), [int(v) for v in sys.argv[4].split(',')]
excl = [[int(v) for v in b.split(',')] for b in sys.argv[5].split(';')] if len(sys.argv) > 5 and sys.argv[5] else []
im = Image.open(src).convert('RGB')
if rot: im = im.rotate(rot, expand=True)
im = im.crop(box)
a = np.asarray(im).astype(np.float32)
lum = a.mean(2)
bg = np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.BoxBlur(25))).astype(np.float32)
dark = bg - lum
blue = a[..., 2] - (a[..., 0] + a[..., 1]) / 2
pink = a[..., 0] - a[..., 1]
T = float(sys.argv[6]) if len(sys.argv) > 6 else 30
mask = (dark > T) & (pink < 30)
def runs(m, L, axis):
    # pixels inside a straight run of at least L along axis
    m2 = np.moveaxis(m, axis, -1).astype(np.int32)
    c = np.cumsum(np.pad(m2, [(0, 0), (1, 0)]), -1)
    full = (c[..., L:] - c[..., :-L]) == L
    hit = np.zeros_like(m2, bool)
    idx = np.nonzero(full)
    for k in range(L):  # dilate back over the window
        hit[idx[0], idx[1] + k] = True
    return np.moveaxis(hit, -1, axis)
# Allow 1 px of tilt by OR-ing neighbours before looking for runs.
grow_v = mask | np.roll(mask, 1, 0) | np.roll(mask, -1, 0) | np.roll(mask, 2, 0) | np.roll(mask, -2, 0)
grow_h = mask | np.roll(mask, 1, 1) | np.roll(mask, -1, 1) | np.roll(mask, 2, 1) | np.roll(mask, -2, 1)
L = int(sys.argv[7]) if len(sys.argv) > 7 else 70
grid = runs(grow_v, L, 1) | runs(grow_h, L, 0)
# thicken grid band by 1 px so its anti-aliased edges go too
grid = grid | np.roll(grid, 1, 0) | np.roll(grid, -1, 0) | np.roll(grid, 1, 1) | np.roll(grid, -1, 1)
ink = mask & ~grid
# strong ink inside grid band (pen crossing a line) is kept
R = float(sys.argv[8]) if len(sys.argv) > 8 else T * 1.8
ink |= mask & grid & (dark > R)
for x0, y0, x1, y1 in excl: ink[y0:y1, x0:x1] = False
np.savez_compressed(out, ink=ink, dark=dark.astype(np.float16))
Image.fromarray(np.where(ink, 0, 255).astype(np.uint8)).save(out.replace('.npz', '.png'))
print(im.size, round(ink.mean(), 4))
