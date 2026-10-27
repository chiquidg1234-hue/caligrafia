import sys,json,io,collections,hashlib,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'outputs/trazo/vendor'),str(ROOT/'outputs/trazo')]
from fontTools.ttLib import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from pypdf import PdfReader,PdfWriter
import personal
W=Path(__file__).resolve().parent;OUT=ROOT/'outputs/mi-caligrafia'
TEXT='''Mi caligrafía personal
El pingüino escribió: ¡Qué día tan increíble!
Mamá, papá, mínimo, mañana, lluvia y guitarra.
Queso, rápido, extraordinario, pequeño y conexión.
ABCDEFGHIJKLMNOPQRSTUVWXYZ Ñ
abcdefghijklmnopqrstuvwxyz ñ
Á É Í Ó Ú Ü   á é í ó ú ü
0123456789   9876543210
(8 + 4) x 3 = 36; 100 ÷ 5 = 20
2² = 4 y 5³ = 125; 157,50 $ y 20 €
¿Por qué? ¡Porque quiero escribir con mi letra!
[] {} @ # % & * / \\ _ ~ « »
Mis tareas, mis apuntes y mis ideas.
La cuadrícula tiene celdas de 5 x 5 mm.
Esta página usa un renglón cada dos celdas.
Conservo mi estilo; reviso lo que quiero mejorar.
'''
def main():
 profiles=personal.read_profiles()['profiles'];writer=PdfWriter();checks=[]
 for p in profiles:
  layout=personal.make_layout(p,TEXT,{'paper':'A4','size':17,'margin':20,'leading':10,'ruling':'grid','seed':17})
  assert not layout['missing'],layout['missing']
  temp=W/f'prueba-{p["id"]}.pdf';personal.write_pdf(layout,temp)
  for i,page in enumerate(PdfReader(temp).pages):
   overlay=io.BytesIO();c=canvas.Canvas(overlay,pagesize=(210*mm,297*mm));c.setFillColor(HexColor('#193c66'));c.setFont('Helvetica-Bold',11);c.drawString(20*mm,282*mm,p['name']+' - prueba de 5 mm');c.setFont('Helvetica',8);c.drawString(20*mm,9*mm,'Primera version revisable. Imprime al 100 %. No ajustar a pagina.');c.save();page.merge_page(PdfReader(overlay).pages[0]);writer.add_page(page)
  font=TTFont(OUT/p['font'],checkChecksums=2);cmap=font.getBestCmap();characters=p['characters'];assert all(ord(ch) in cmap for ch in characters)
  for ch in characters:assert font['glyf'][cmap[ord(ch)]].numberOfContours>0,(p['id'],ch)
  assert 'GSUB' in font
  checks.append({'profile':p['id'],'samples':p['count'],'characters':len(characters),'cmapComplete':True,'outlinesNonempty':True,'contextualVariants':'GSUB' in font,'previewPages':len(layout['pages']),'sha256':hashlib.sha256((OUT/p['font']).read_bytes()).hexdigest()})
 with (OUT/'Comparacion-mi-letra-5mm.pdf').open('wb') as f:writer.write(f)
 personal.write_calibration(OUT/'Calibracion-5mm.pdf',{'paper':'A4'})
 samples=json.loads((OUT/'Mi-letra-Original.trazo').read_text(encoding='utf-8'))['samples'];counts=collections.Counter(s['label'] for s in samples)
 observed=['×','−','≤','≥','≠','±','√','∞','“','”','‘','’']
 inventory={'date':'2026-10-21','photos':json.loads((W/'fuentes.json').read_text(encoding='utf-8')),'samplesPerProfile':len(samples),'characters':sorted(counts),'counts':dict(sorted(counts.items())),'notMapped':observed,'absentInPhotos':['×','≤','≥','≠','±','√','∞'],'ambiguousUnicode':['−','“','”','‘','’'],'needsMoreVariants':[k for k,v in sorted(counts.items()) if v<3],'validated':checks,'scope':'Fuente y compositor funcionales; parecido visual pendiente de revisión del usuario e impresión física.'}
 (OUT/'Inventario-y-validacion.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'profiles':checks,'pdfPages':len(PdfReader(OUT/'Comparacion-mi-letra-5mm.pdf').pages),'calibrationPages':len(PdfReader(OUT/'Calibracion-5mm.pdf').pages)},ensure_ascii=False))
if __name__=='__main__':main()
