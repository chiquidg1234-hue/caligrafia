import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'outputs/trazo/vendor'))
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
from explorar import mask_for
from extraer import groups_by_x
W=Path(__file__).resolve().parent
im=cv2.imread(str(W/'resumen-rect.png'));mask=mask_for(im,12)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
for key,a,b in [('vocales',118,180),('numeros',190,235),('signos',432,499),('signos2',529,580)]:
 sub=np.zeros_like(mask);sub[a:b]=mask[a:b];boxes=groups_by_x(sub)
 print(key,boxes)
 contact=Image.new('RGB',(1400,250),'white');d=ImageDraw.Draw(contact)
 for i,(l,r) in enumerate(boxes):
  if i>=24:break
  raw=Image.fromarray(cv2.cvtColor(im,cv2.COLOR_BGR2RGB)).crop((l,a,r,b));raw.thumbnail((50,100));contact.paste(raw,(i*58,30));clean=Image.fromarray(255-mask[a:b,l:r]).convert('RGB');clean.thumbnail((50,100));contact.paste(clean,(i*58,120));d.text((i*58,7),f'{i}:{l}',font=font,fill='black')
 contact.save(W/f'control-{key}.png')
