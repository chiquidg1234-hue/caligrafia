"""Curated row labels + measured contours. No OCR substitution or synthetic glyphs."""
import sys,json,math,uuid,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'outputs/trazo/vendor'))
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
from explorar import mask_for
W=Path(__file__).resolve().parent;OUT=ROOT/'outputs/mi-caligrafia';OUT.mkdir(exist_ok=True)
ROWS={
'alfabeto1':list(zip(['A','a','B','b','C','c','D','d','E','e','F','f','G','g','H','h','I','i','J','j','K','k','L','l','m','M','N','n'],[37,95,148,207,260,315,372,426,480,538,593,650,705,760,815,875,930,985,1040,1105,1152,1205,1262,1320,1370,1417,1472,1522],[38,92,146,207,252,307,365,414,468,528,578,631,693,743,800,852,910,960,1009,1070,1121,1177,1229,1285,1340,1383,1435,1494])),
'alfabeto2':list(zip(['Ñ','ñ','O','o','P','Q','q','p','R','r','S','s','T','t','U','u','V','W','v','w','X','x','Y','y','Z','z'],[46,104,162,221,276,334,397,457,504,556,610,670,725,780,833,891,941,994,1050,1102,1158,1218,1267,1324,1371,1422],[41,98,155,211,264,320,381,441,489,537,591,646,699,751,806,858,915,970,1020,1077,1130,1185,1237,1290,1345,1397]))}
def rowmask(mask,rows,index):
 row=rows[index];H,WW=mask.shape;out=np.zeros_like(mask)
 for x in range(8,WW-8):
  c=row[1]+(row[2]-row[1])*x/(WW-1)
  prev=(rows[index-1][1]+(rows[index-1][2]-rows[index-1][1])*x/(WW-1)) if index else c-55
  nxt=(rows[index+1][1]+(rows[index+1][2]-rows[index+1][1])*x/(WW-1)) if index+1<len(rows) else c+55
  a=max(8,round((prev+c)/2));b=min(H-8,round((c+nxt)/2))
  out[a:b,x]=mask[a:b,x]
 return out
def groups_by_x(mask):
 hist=(mask>0).sum(axis=0);active=hist>1
 # Fill short gaps within a letter, preserving gaps between repeats.
 active=cv2.morphologyEx(active.astype('uint8')[None,:],cv2.MORPH_CLOSE,np.ones((1,9),np.uint8))[0]>0
 groups=[];start=None
 for x,v in enumerate(active):
  if v and start is None:start=x
  if (not v or x==len(active)-1) and start is not None:
   if x-start>=2:groups.append((max(0,start-3),min(mask.shape[1],x+3)))
   start=None
 return groups
def clean_crop(mask):
 n,labels,stats,_=cv2.connectedComponentsWithStats(mask,8)
 pieces=[tuple(map(int,stats[i]))+(i,) for i in range(1,n) if stats[i,4]>=3]
 if not pieces:return None
 largest=max(pieces,key=lambda p:p[4]);x,y,w,h,a,_=largest
 # Keep components near the principal stroke, including i/j dots and ñ accents.
 keep=[p for p in pieces if p[4]>=max(3,a*.035) and p[0]+p[2]>=x-5 and p[0]<=x+w+5 and p[1]+p[3]>=y-20 and p[1]<=y+h+5]
 out=np.zeros_like(mask)
 for p in keep:out[labels==p[5]]=255
 ys,xs=np.where(out>0)
 if len(xs)<12:return None
 return out,(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)),len(keep)
def contours_for(mask,x0,baseline,scale=20):
 contours,_=cv2.findContours(mask,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE);paths=[]
 for c in contours:
  if abs(cv2.contourArea(c))<.6:continue
  poly=cv2.approxPolyDP(c,.28,True).reshape(-1,2)
  if len(poly)>=3:paths.append([[round((float(x)-x0)*scale+45,2),round((baseline-float(y))*scale,2)] for x,y in poly])
 return paths
def repeated():
 samples=[];candidates=[];display=[]
 for key,rows in ROWS.items():
  im=cv2.imread(str(W/f'{key}-rect.png'));mask=mask_for(im,11 if key=='alfabeto2' else 13)
  for i,(label,yL,yR) in enumerate(rows):
   row=rowmask(mask,rows,i);crops=[]
   for x1,x2 in groups_by_x(row):
    sub=row[:,x1:x2];result=clean_crop(sub)
    if result is None:continue
    clean,(l,t,r,b),pieces=result;width=r-l;height=b-t
    if height<9 or width>50 or height>55 or x1+l<12 or x1+r>980:continue
    crop=clean[t:b,l:r];area=cv2.countNonZero(crop)
    # Each repeated row is labelled by observation. Avoid far-edge/grid fragments.
    if label not in ('I','i','l') and width<5:continue
    if label in ('I','i','l') and width>24:continue
    if area<17:continue
    center=(x1+l+x1+r)/2;expected=yL+(yR-yL)*center/999
    crops.append({'label':label,'key':key,'row':i,'bbox':[x1+l,t,x1+r,b],'width':width,'height':height,'pieces':pieces,'area':area,'expected':expected,'mask':crop})
   if not crops:print('MISSING',key,label);continue
   heights=np.array([c['height'] for c in crops]);med=float(np.median(heights));widthmed=float(np.median([c['width'] for c in crops]));baselines=[]
   for c in crops:
    # Strip descenders only for baseline estimation; keep every contour in export.
    b=c['bbox'][3];base=b-1
    if label in 'gjpqy':base-=c['height']*.32
    c['baseline']=base
    c['score']=abs(c['height']-med)/max(med,1)+abs(c['width']-widthmed)/max(widthmed,1)+max(0,c['pieces']-(2 if label in 'ijñÑ' else 1))*.13+(.25 if c['bbox'][0]<60 or c['bbox'][2]>920 else 0)
   # Rank for a usable first set. Retain original coordinates and all candidates for audit.
   chosen=sorted(crops,key=lambda c:c['score'])[:6]
   display.append((label,crops,chosen))
   for c in chosen:
    x,t,r,b=c['bbox'];pad=np.pad(c['mask'],3);paths=contours_for(pad,3,c['baseline']-t+3)
    if not paths:continue
    source={'photo':key,'rectifiedBBox':c['bbox'],'row':i+1,'threshold':11 if key=='alfabeto2' else 13,'rankScore':round(c['score'],3)}
    sample={'id':str(uuid.uuid4()),'label':label,'char':label,'paths':paths,'advance':round(c['width']*20+110),'baseline':.78,'created':1792620000000,'quality':{'warnings':['Extracción de foto con cuadrícula; revisar con el original.'],'contrast':0,'inkFraction':round(c['area']/(c['width']*c['height']),3)},'source':source}
    samples.append(sample)
   candidates.extend([{k:v for k,v in c.items() if k!='mask'} for c in crops])
  print(key,'labels',len(rows),'samples',sum(s['source']['photo']==key for s in samples))
 # Audit atlas pairs each source cutout with the cleaned vectorization input.
 font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
 for page in range(2):
  subset=display[page*27:(page+1)*27];atlas=Image.new('RGB',(1080,len(subset)*80),'#eff2f5');d=ImageDraw.Draw(atlas)
  for row,(label,crops,chosen) in enumerate(subset):
   d.text((10,row*80+25),label,font=font,fill='#193c66')
   for j,c in enumerate(chosen):
    im=Image.open(W/f'{c["key"]}-rect.png');x,t,r,b=c['bbox'];raw=im.crop((x-3,t-3,r+3,b+3));raw.thumbnail((68,62));atlas.paste(raw,(52+j*170,row*80+7));clean=Image.fromarray(255-c['mask']).convert('RGB');clean=clean.resize((clean.width*2,clean.height*2));clean.thumbnail((70,62));atlas.paste(clean,(126+j*170,row*80+7))
  atlas.save(W/f'control-alfabeto-{page+1}.png')
 (W/'candidatos.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2),encoding='utf-8')
 (W/'muestras-repetidas.json').write_text(json.dumps(samples,ensure_ascii=False),encoding='utf-8')
 print('TOTAL',len(samples),'chars',len(set(s['label'] for s in samples)))
if __name__=='__main__':repeated()
