# Ink mask of a notebook photo: dark/blue pen strokes without the light grid,
# the pink margin lines or the paper. Usage: python3 tinta.py foto.jpg salida.png [rotar]
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
if len(sys.argv) > 3: im = im.rotate(float(sys.argv[3]), expand=True)
a = np.asarray(im).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
# Local paper level: blur of the image at a coarse scale (uneven light in photos).
small = im.resize((im.width // 32, im.height // 32), Image.BILINEAR).resize(im.size, Image.BILINEAR)
p = np.asarray(small).astype(np.float32).mean(2)
lum = (r + g + b) / 3
dark = p - lum                       # how much darker than the paper around it
blue = b - (r + g) / 2               # pen ink is bluish; grid lines are grey-blue and light
pink = r - g                         # margin lines
mask = ((dark > 38) | ((dark > 22) & (blue > 18))) & (pink < 35)
np.save(out.replace('.png', '.npy'), mask)
Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).save(out)
print(im.size, mask.mean())
