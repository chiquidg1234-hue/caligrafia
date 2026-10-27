import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'outputs/trazo/vendor'))
import cv2,numpy as np
from PIL import Image,ImageDraw
W=Path(__file__).resolve().parent
def strength(rect):
 gray=cv2.cvtColor(rect,cv2.COLOR_BGR2GRAY).astype(np.float32)
 contrast=np.maximum(0,cv2.GaussianBlur(gray,(0,0),9)-gray)
 grid=np.zeros_like(contrast)
 for vertical in (False,True):
  for slope in (-3,-2,-1,0,1,2,3):
   kernel=np.zeros((7,45),np.uint8);cv2.line(kernel,(0,3-slope),(44,3+slope),1,1)
   if vertical:kernel=kernel.T
   grid=np.maximum(grid,cv2.morphologyEx(contrast,cv2.MORPH_OPEN,kernel))
 return np.maximum(0,contrast-grid*1.1)
def mask_for(im,threshold=14):
 s=strength(im);mask=(s>threshold).astype('uint8')*255
 n,cc,stats,_=cv2.connectedComponentsWithStats(mask,8)
 clean=np.zeros_like(mask)
 for i in range(1,n):
  x,y,w,h,a=stats[i]
  if a>=4 and w<80 and h<75:clean[cc==i]=255
 return clean
if __name__=='__main__':
 for key in ('alfabeto1','alfabeto2','resumen'):
  im=cv2.imread(str(W/f'{key}-rect.png'));s=strength(im)
  contact=Image.new('RGB',(1000,180*5),'#eee');d=ImageDraw.Draw(contact)
  for i,t in enumerate((10,14,18,22,26)):
   mask=mask_for(im,t);cv2.imwrite(str(W/f'{key}-clean-{t}.png'),255-mask)
   contact.paste(Image.fromarray(255-mask).convert('RGB').crop((0,0,1000,145)),(0,i*180+30));d.text((10,i*180+5),'Umbral '+str(t),fill='black')
  contact.save(W/f'{key}-umbrales.png')
