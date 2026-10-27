"""Measured extraction from supplied photos; never invents missing characters."""
import sys,json,hashlib,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'outputs/trazo/vendor'))
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
WORK=Path(__file__).resolve().parent
SOURCE=[
('resumen',Path('C:/Users/59172/Downloads/WhatsApp Image 2026-10-21 at 21.21.55.jpeg')),
('texto',Path('C:/Users/59172/Downloads/WhatsApp Image 2026-10-21 at 21.21.44.jpeg')),
('apuntes',Path('C:/Users/59172/AppData/Local/Temp/WhatsApp Image 2026-10-21 at 20.41.49.jpeg')),
('alfabeto2',Path('C:/Users/59172/AppData/Local/Temp/WhatsApp Image 2026-10-21 at 20.41.49 (1).jpeg')),
('alfabeto1',Path('C:/Users/59172/AppData/Local/Temp/WhatsApp Image 2026-10-21 at 20.41.50.jpeg'))]
QUADS={
 'alfabeto1':[[132,60],[1082,79],[1057,1545],[108,1563]],
 'alfabeto2':[[132,178],[1031,200],[1054,1599],[108,1599]],
 'resumen':[[32,389],[837,369],[883,1510],[40,1540]],
 'texto':[[50,233],[766,244],[795,1445],[28,1453]],
 'apuntes':[[132,132],[992,124],[1009,1565],[106,1586]]}
def prepare():
 (WORK/'originales').mkdir(parents=True,exist_ok=True)
 manifest=[]
 for key,p in SOURCE:
  b=p.read_bytes();copy=WORK/'originales'/f'{key}.jpeg'
  if not copy.exists():copy.write_bytes(b)
  im=cv2.imdecode(np.frombuffer(b,np.uint8),cv2.IMREAD_COLOR)
  manifest.append({'id':key,'source':str(p),'sha256':hashlib.sha256(b).hexdigest(),'width':im.shape[1],'height':im.shape[0],'bytes':len(b)})
  quad=np.float32(QUADS[key]);w=1000;h=round((np.linalg.norm(quad[2]-quad[1])+np.linalg.norm(quad[3]-quad[0]))/(np.linalg.norm(quad[1]-quad[0])+np.linalg.norm(quad[2]-quad[3]))*w)
  mat=cv2.getPerspectiveTransform(quad,np.float32([[0,0],[w-1,0],[w-1,h-1],[0,h-1]]))
  rect=cv2.warpPerspective(im,mat,(w,h),flags=cv2.INTER_CUBIC,borderValue=(255,255,255))
  cv2.imwrite(str(WORK/f'{key}-rect.png'),rect)
  gray=cv2.cvtColor(rect,cv2.COLOR_BGR2GRAY).astype(np.float32)
  bg=cv2.GaussianBlur(gray,(0,0),9)
  contrast=np.maximum(0,bg-gray)
  mask=(contrast>11).astype('uint8')*255
  # Grid lines are much longer than isolated handwritten glyph strokes.
  lines=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((65,1),np.uint8))|cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((1,65),np.uint8))
  mask[cv2.dilate(lines,np.ones((1,1),np.uint8))>0]=0
  mask[:8,:]=mask[-8:,:]=0;mask[:,:8]=mask[:,-8:]=0
  cv2.imwrite(str(WORK/f'{key}-mask.png'),255-mask)
  smooth=np.convolve((mask>0).sum(axis=1),np.ones(5)/5,'same')
  rows=[];start=None
  for y,value in enumerate(smooth):
   if value>24 and start is None:start=y
   if (value<=24 or y==len(smooth)-1) and start is not None:
    if y-start>=5:rows.append([start,y,int(smooth[start:y].max())])
    start=None
  (WORK/f'{key}-rows.json').write_text(json.dumps(rows))
  print(key,im.shape[:2],'rect',rect.shape[:2],'rows',rows)
 (WORK/'fuentes.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':prepare()
