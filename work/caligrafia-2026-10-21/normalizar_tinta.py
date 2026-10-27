"""Equalize recovered stroke widths locally, preserving original library untouched."""
import sys,json,hashlib,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'outputs/trazo/vendor'),str(ROOT/'outputs/trazo')]
import cv2,numpy as np
import engine
W=Path(__file__).resolve().parent;OUT=ROOT/'outputs/mi-caligrafia';UNIT=2.
def raster(paths):
 pts=np.array([p for path in paths for p in path],dtype=float);lo=pts.min(0)-30;hi=pts.max(0)+30
 mask=np.zeros(tuple((np.ceil((hi-lo)/UNIT).astype(int)+2)[::-1]),np.uint8)
 polygons=[np.rint((np.array(path)-lo)/UNIT).astype(np.int32) for path in paths]
 cv2.fillPoly(mask,polygons,255);return mask,lo
def measure(mask):
 d=cv2.distanceTransform(mask,cv2.DIST_L2,cv2.DIST_MASK_PRECISE)
 ridge=(d>=cv2.dilate(d,np.ones((3,3),np.uint8))-.00001)&(d>1.4)
 values=d[ridge]
 return float(np.median(values)*2*UNIT) if len(values) else 0
def equalize(paths,target):
 mask,lo=raster(paths);before=measure(mask)
 if before<=0:return paths,before,before
 delta=float(np.clip((target-before)/2,-12,12))
 inside=cv2.distanceTransform(mask,cv2.DIST_L2,cv2.DIST_MASK_PRECISE)
 outside=cv2.distanceTransform(255-mask,cv2.DIST_L2,cv2.DIST_MASK_PRECISE)
 normalized=((inside-outside)>-delta/UNIT).astype('uint8')*255
 if cv2.countNonZero(normalized)<10:return paths,before,before
 contours,_=cv2.findContours(normalized,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
 result=[]
 for c in contours:
  if abs(cv2.contourArea(c))<2:continue
  p=cv2.approxPolyDP(c,.75,True).reshape(-1,2)
  if len(p)>=3:result.append([[round(float(x)*UNIT+lo[0],2),round(float(y)*UNIT+lo[1],2)] for x,y in p])
 if not result:return paths,before,before
 return result,before,measure(raster(result)[0])
def main():
 original_hash=hashlib.sha256((OUT/'Mi-letra-Original.ttf').read_bytes()).hexdigest()
 before_file=W/'Optimizada-antes-tinta.trazo'
 if not before_file.exists():shutil.copy2(OUT/'Mi-letra-Optimizada.trazo',before_file)
 lib=json.loads(before_file.read_text(encoding='utf-8'));samples=lib['samples']
 widths=[measure(raster(s['paths'])[0]) for s in samples if s['label'].isalpha() and len(s['label'])==1]
 target=float(np.median(widths));stats=[]
 for s in samples:
  paths,before,after=equalize(s['paths'],target)
  # Deliberately tiny punctuation retains its original visual proportions.
  if s['label'].isalnum():
   s['paths']=paths;s.setdefault('source',{})['inkNormalization']={'targetUnits':round(target,3),'beforeUnits':round(before,3),'afterUnits':round(after,3),'maxBoundaryShiftUnits':12}
   stats.append({'label':s['label'],'before':before,'after':after})
 (OUT/'Mi-letra-Optimizada.trazo').write_text(json.dumps(lib,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 engine.build_font(samples,OUT/'Mi-letra-Optimizada.ttf','Mi letra Optimizada')
 assert hashlib.sha256((OUT/'Mi-letra-Original.ttf').read_bytes()).hexdigest()==original_hash
 before=np.array([x['before'] for x in stats]);after=np.array([x['after'] for x in stats])
 report={'targetStrokeUnits':target,'samplesNormalized':len(stats),'originalFontUnchanged':True,'strokeCoefficientOfVariationBefore':float(before.std()/before.mean()),'strokeCoefficientOfVariationAfter':float(after.std()/after.mean()),'samples':stats,'note':'Stroke-width proxy, not a score of handwriting identity.'}
 (W/'validacion-tinta.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print({k:v for k,v in report.items() if k!='samples'})
if __name__=='__main__':main()
