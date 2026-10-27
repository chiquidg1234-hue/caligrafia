import sys,json,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'outputs/trazo/vendor'));sys.path.insert(0,str(ROOT/'outputs/trazo'))
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
import engine
from explorar import mask_for
from extraer import contours_for
W=Path(__file__).resolve().parent;OUT=ROOT/'outputs/mi-caligrafia';OUT.mkdir(exist_ok=True)
def supplement():
 im=cv2.imread(str(W/'resumen-rect.png'));mask=mask_for(im,12);photo='resumen';samples=[];cuts=[]
 def add(label,l,t,r,b,baseline,variant=0):
  sub=mask[t:b,l:r].copy();n,cc,stats,_=cv2.connectedComponentsWithStats(sub,8);clean=np.zeros_like(sub)
  for i in range(1,n):
   if stats[i,4]>=2:clean[cc==i]=255
  ys,xs=np.where(clean>0)
  if len(xs)<3:raise ValueError('Sin tinta '+label)
  # Retain all dots, accents and detached strokes inside the manually inspected region.
  x0=int(xs.min());x1=int(xs.max()+1);y0=int(ys.min());y1=int(ys.max()+1)
  paths=contours_for(clean,x0,baseline-t)
  if not paths:raise ValueError('Sin contorno '+label)
  s={'id':str(uuid.uuid4()),'char':label,'label':label,'paths':paths,'advance':round((x1-x0)*20+110),'baseline':.78,'created':1792620000000,'quality':{'warnings':['Pocas repeticiones disponibles; revisar en prueba impresa.'],'contrast':0,'inkFraction':round(len(xs)/clean.size,3)},'source':{'photo':photo,'rectifiedBBox':[l+x0,t+y0,l+x1,t+y1],'manualRegion':[l,t,r,b],'threshold':12,'variant':variant}}
  samples.append(s);cuts.append((label,Image.fromarray(cv2.cvtColor(im[t:b,l:r],cv2.COLOR_BGR2RGB)),Image.fromarray(255-clean)))
 for label,l,r in [('Á',21,52),('É',74,105),('Í',138,167),('Ó',190,231),('Ú',255,285),('Ü',304,343),('á',496,528),('é',560,590),('í',625,645),('ó',677,707),('ú',735,765),('ü',798,829)]:add(label,l,128 if label=='Ü' else 126 if label=='Ó' else 118,r,178,164)
 first=[(24,53),(56,78),(81,105),(105,132),(134,162),(164,186),(186,208),(208,232),(234,258),(258,284)]
 second=[(603,630),(584,601),(562,584),(539,562),(514,539),(488,512),(459,483),(434,454),(406,429),(374,400)]
 for variant,boxes in enumerate((first,second)):
  for label,(l,r) in zip('0123456789',boxes):
   if label=='8' and variant==0:continue # The first photo crop loses the left loop; prefer the intact second sample.
   add(label,l,192,r,235,225,variant)
 boxes=[('(',28,45),(')',47,66),('[',84,111),(']',114,143),('{',164,181),('}',190,213),('¿',233,255),('?',260,281),('¡',301,316),('!',328,344),('.',364,380),(',',388,406),(':',423,439),(';',452,470),('"',490,514),("'",621,634),('/',702,723),('\\',726,752),('@',774,812),('#',827,873),('$',891,921)]
 for label,l,r in boxes:add(label,l,432,r,499,482)
 add('-',421,139,463,169,166)
 for label,l,r in [('%',23,62),('&',91,122),('*',161,190),('+',217,245),('=',271,297)]:add(label,l,529,r,580,567)
 # The underscore is its own visible mark, below the ordinary writing line.
 add('_',670,456,691,490,476)
 im=cv2.imread(str(W/'texto-rect.png'));mask=mask_for(im,12);photo='texto'
 for label,l,t,r,b,baseline in [('÷',414,1140,449,1187,1180),('²',804,1128,829,1162,1180),('³',56,1200,83,1230,1246),('€',285,1251,335,1308,1301),('~',841,1253,876,1290,1301),('«',395,1083,431,1124,1122),('»',945,1080,978,1121,1122)]:add(label,l,t,r,b,baseline)
 atlas=Image.new('RGB',(1000,((len(cuts)+9)//10)*130),'#eef2f6');d=ImageDraw.Draw(atlas);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
 for i,(label,raw,clean) in enumerate(cuts):
  x=i%10*100;y=i//10*130;d.text((x+7,y+5),label,fill='#193c66',font=font);raw.thumbnail((42,75));atlas.paste(raw,(x+3,y+34));clean=clean.convert('RGB');clean.thumbnail((44,75));atlas.paste(clean,(x+51,y+34))
 atlas.save(W/'control-signos-extraidos.png');return samples
def smooth(paths):
 out=[]
 for path in paths:
  if len(path)<6:out.append(path);continue
  p=[]
  for i,a in enumerate(path):
   b=path[(i+1)%len(path)];p.extend([[round(.8*a[0]+.2*b[0],2),round(.8*a[1]+.2*b[1],2)],[round(.2*a[0]+.8*b[0],2),round(.2*a[1]+.8*b[1],2)]])
  out.append(p)
 return out
def bounds(sample):
 p=np.array([p for path in sample['paths'] for p in path]);return p.min(0),p.max(0)
def generate():
 original=json.loads((W/'muestras-repetidas.json').read_text(encoding='utf-8'))+supplement()
 # Discard the one isolated grid sliver next to the sixth E, preserving its real contour.
 for s in original:
  if s['label']=='E':
   s['paths']=[p for p in s['paths'] if max(x for x,y in p)-min(x for x,y in p)>28]
 groups={}
 for s in original:groups.setdefault(s['label'],[]).append(s)
 targets={label:np.median([bounds(s)[1]-bounds(s)[0] for s in ss],axis=0) for label,ss in groups.items()}
 optimized=[]
 for sample in original:
  s=json.loads(json.dumps(sample));s['id']=str(uuid.uuid4());lo,hi=bounds(s);tw,th=targets[s['label']];width,height=hi-lo
  # Same recovered character, with at most 10% scale correction per axis.
  sx=float(np.clip(tw/max(width,1),.9,1.1));sy=float(np.clip(th/max(height,1),.9,1.1))
  s['paths']=smooth([[[round(45+(x-lo[0])*sx,2),round(y*sy,2)] for x,y in p] for p in s['paths']]);s['advance']=round(tw+120);s['source']['optimization']={'scaleX':round(sx,4),'scaleY':round(sy,4),'smoothing':'one Chaikin pass at 20%','spacing':'median width per character +120 units'}
  optimized.append(s)
 profiles=[]
 for key,label,entries in [('Original','Original',original),('Optimizada','Optimizada',optimized)]:
  filename=f'Mi-letra-{key}';name='Mi letra '+label
  (OUT/f'{filename}.trazo').write_text(json.dumps({'type':'trazo-library','version':2,'name':name,'samples':entries},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
  meta=engine.build_font(entries,OUT/f'{filename}.ttf',name)
  chars=sorted(groups.keys());missing=[c for c in engine.CHARS if c not in groups]
  profiles.append({'id':key.lower(),'name':name,'font':filename+'.ttf','library':filename+'.trazo','characters':chars,'count':len(entries),'missing':missing,'notes':'Extraída de fotos reales; primera versión revisable. '+('Normalización moderada de altura, espaciado y contorno.' if key=='Optimizada' else 'Conserva las variaciones de los trazos recuperables.')})
 (OUT/'perfiles.json').write_text(json.dumps({'version':1,'grid':5,'profiles':profiles},ensure_ascii=False,indent=2),encoding='utf-8')
 (W/'muestras-original.json').write_text(json.dumps(original,ensure_ascii=False),encoding='utf-8')
 print(json.dumps({'profiles':[{k:p[k] for k in ['id','count','missing']} for p in profiles],'characters':len(groups),'counts':{k:len(v) for k,v in groups.items()}},ensure_ascii=False))
if __name__=='__main__':generate()
