# Contact sheets: every candidate component highlighted inside its context.
# Usage: python3 miniaturas.py carpeta [min_area] [por_hoja]
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; min_area = int(sys.argv[2]) if len(sys.argv) > 2 else 120; per = int(sys.argv[3]) if len(sys.argv) > 3 else 60
labels = np.load(f'{d}/componentes.npz')['labels']; info = json.load(open(f'{d}/componentes.json'))
cands = [c for c in info if c['area'] >= min_area and c['box'][3] - c['box'][1] >= 10]
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
W, H, cols = 170, 120, 10
for k in range(0, len(cands), per):
    sheet = Image.new('RGB', (cols * W, ((min(per, len(cands) - k) + cols - 1) // cols) * H), 'white'); dr = ImageDraw.Draw(sheet)
    for n, c in enumerate(cands[k:k + per]):
        x0, y0, x1, y1 = c['box']; pad = 28
        X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(labels.shape[1], x1 + pad + 1), min(labels.shape[0], y1 + pad + 1)
        crop = labels[Y0:Y1, X0:X1]
        rgb = np.full(crop.shape + (3,), 255, np.uint8)
        rgb[crop > 0] = (190, 190, 190); rgb[crop == c['id']] = (10, 40, 140)
        im = Image.fromarray(rgb); s = min((W - 6) / im.width, (H - 22) / im.height, 2.0)
        im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
        cx, cy = (n % cols) * W, (n // cols) * H
        sheet.paste(im, (cx + 3, cy + 20)); dr.rectangle([cx, cy, cx + W - 1, cy + H - 1], outline=(200, 210, 220)); dr.text((cx + 4, cy + 2), str(c['id']), fill=(200, 0, 0), font=font)
    sheet.save(f'{d}/hoja-{k // per + 1}.png')
print(len(cands), 'candidatos,', (len(cands) + per - 1) // per, 'hojas')
