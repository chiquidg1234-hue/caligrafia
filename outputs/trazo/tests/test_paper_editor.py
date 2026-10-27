import sys,unittest,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'vendor'),str(ROOT)]
import personal

def profile():
 return {'id':'original','name':'Personal','samples':[{'id':'a','char':'a','paths':[[[45,0],[450,0],[400,600],[45,600]]],'advance':550},{'id':'g','char':'g','paths':[[[40,-250],[400,-250],[400,400],[40,400]]],'advance':500}]}

class PaperEditorTests(unittest.TestCase):
 def test_four_independent_margins_and_custom_size(self):
  l=personal.make_layout(profile(),'ag\nag',{'paper':'custom','width':180,'height':250,'marginLeft':25,'marginRight':12,'marginTop':30,'marginBottom':18,'leading':10})
  self.assertEqual((l['options']['width'],l['options']['height']),(180,250));self.assertEqual(l['pages'][0]['glyphs'][0]['x_mm'],25)
  self.assertGreaterEqual(l['pages'][0]['glyphs'][0]['y_mm']-600*l['scale_mm'],30)
 def test_legacy_margin_remains_compatible(self):
  o=personal.options({'margin':21});self.assertTrue(all(o[k]==21 for k in ['marginLeft','marginRight','marginTop','marginBottom']))
 def test_grid_origin_color_and_spacing_are_independent_of_lines(self):
  o=personal.options({'gridMm':5,'gridOriginX':2,'gridOriginY':3,'leading':15,'gridColor':'#123456','paperColor':'#fdf5dd','marginLine':True,'marginLineX':17})
  g=personal.grid_lines(o);self.assertEqual(g['vertical'][:3],[2,7,12]);self.assertEqual(g['horizontal'][:3],[3,8,13]);self.assertEqual(o['gridColor'],'#123456')
 def test_bad_margins_dimensions_and_colors_rejected(self):
  for o in [{'paper':'custom','width':100,'height':200,'marginLeft':60,'marginRight':60},{'paperColor':'url(x)'},{'marginTop':float('nan')},{'gridMm':0}]:
   with self.assertRaises(ValueError):personal.options(o)
 def test_selected_bold_italic_and_color_have_shared_geometry(self):
  source=profile();l=personal.make_layout(source,'aa',{},[{'start':1,'end':2,'bold':True,'italic':True,'color':'#9a2045'}]);a,b=l['pages'][0]['glyphs'];samples={s['id']:s for s in l['samples']}
  self.assertEqual(a['stroke_mm'],0);self.assertGreater(b['stroke_mm'],0);self.assertEqual(b['style']['color'],'#9a2045');self.assertNotEqual(a['id'],b['id'])
  self.assertAlmostEqual(samples[b['id']]['paths'][0][2][0],400+600*.18);self.assertEqual(source['samples'][0]['paths'][0][2][0],400)
 def test_bad_style_ranges_never_export(self):
  for ranges in [[{'start':-1,'end':2,'bold':True}],[{'start':0,'end':9}],[{'start':0,'end':1,'color':'red;opacity:0'}]]:
   with self.assertRaises(ValueError):personal.make_layout(profile(),'a',{},ranges)
 def test_overlap_rejected_but_large_single_line_is_valid(self):
  personal.make_layout(profile(),'ag',{'size':36,'leading':5})
  with self.assertRaisesRegex(ValueError,'interlineado|renglón'):personal.make_layout(profile(),'ag\nag',{'size':36,'leading':5})
 def test_blank_line_can_make_large_text_fit(self):
  personal.make_layout(profile(),'ag\n\n\nag',{'size':36,'leading':5})
 def test_ruling_lines_has_no_vertical_grid(self):
  l=personal.make_layout(profile(),'a',{'ruling':'lines'});self.assertEqual(l['grid']['vertical'],[]);self.assertTrue(l['grid']['horizontal'])
 def test_calibration_square_and_readable_text_fit_every_paper_size(self):
  from pypdf import PdfReader
  from reportlab.lib.units import mm
  from reportlab.pdfbase.pdfmetrics import getAscentDescent,stringWidth
  sizes=[{'paper':p} for p in ('A4','A5','Carta')]+[
   {'paper':'custom','width':w,'height':h} for w,h in ((70,70),(70,150),(70,594),(420,70),(420,594))]
  with tempfile.TemporaryDirectory() as td:
   for values in sizes:
    with self.subTest(values=values):
     target=Path(td)/'calibration.pdf';personal.write_calibration(target,values)
     reader=PdfReader(target);squares=[];all_text=[]
     width,height=personal.PAPERS.get(values['paper'],(values.get('width'),values.get('height')))
     for page in reader.pages:
      self.assertAlmostEqual(float(page.mediabox.width)/mm,width,places=3)
      self.assertAlmostEqual(float(page.mediabox.height)/mm,height,places=3)
      fonts=page['/Resources']['/Font'];lines=[];texts=[];start=None
      for args,op in page.get_contents().operations:
       if op==b'm':start=tuple(float(v) for v in args)
       elif op==b'l':lines.append((*start,*(float(v) for v in args)))
       elif op==b'Tf':font=str(fonts[args[0]]['/BaseFont'])[1:];size=float(args[1])
       elif op==b'Tm':x,y=map(float,args[4:6])
       elif op==b'Tj':
        text=str(args[0]);ascent,descent=getAscentDescent(font,size)
        bounds=(x,y+descent,x+stringWidth(text,font,size),y+ascent);texts.append(bounds);all_text.append(text)
        self.assertGreaterEqual(size,8)
        self.assertGreaterEqual(min(bounds[0],bounds[1]),0)
        self.assertLessEqual(bounds[2],width*mm+.001);self.assertLessEqual(bounds[3],height*mm+.001)
      if lines:
       self.assertEqual(len(lines),22);squares.append(lines)
       xs=[v for line in lines for v in line[::2]];ys=[v for line in lines for v in line[1::2]]
       self.assertGreaterEqual(min(xs),0);self.assertGreaterEqual(min(ys),0)
       self.assertLessEqual(max(xs),width*mm+.001);self.assertLessEqual(max(ys),height*mm+.001)
       for line in lines:self.assertAlmostEqual((abs(line[2]-line[0])+abs(line[3]-line[1]))/mm,50,places=3)
       for positions in (sorted(set(round(x/mm,4) for x in xs)),sorted(set(round(y/mm,4) for y in ys))):
        self.assertEqual(len(positions),11)
        for a,b in zip(positions,positions[1:]):self.assertAlmostEqual(b-a,5,places=3)
       for left,bottom,right,top in texts:
        self.assertFalse(left<max(xs) and right>min(xs) and bottom<max(ys) and top>min(ys),'Text overlaps the measuring square')
     self.assertEqual(len(squares),1)
     content=' '.join(' '.join(all_text).split())
     for instruction in ('100 %','Tamano real','Ajustar a pagina','50 x 50 mm','10 celdas de 5 mm','Sin lineas','Ajusta X e Y'):
      self.assertIn(instruction,content)

if __name__=='__main__':unittest.main()
