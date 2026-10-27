import sys, io, tempfile, unittest, json, subprocess
from unittest.mock import patch
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'vendor'),str(ROOT)]
from PIL import Image, ImageDraw
import numpy as np
import engine

def sample(kind='o'):
    im=Image.new('RGB',(120,160),'white'); d=ImageDraw.Draw(im)
    if kind=='o': d.ellipse((20,40,95,120),outline='black',width=8)
    else: d.line([(25,110),(50,40),(90,115)],fill='black',width=7)
    return im

class EngineTests(unittest.TestCase):
    def test_original_keeps_pixels_including_alpha(self):
        im=Image.new('RGBA',(31,27),(12,42,90,128)); b=io.BytesIO(); im.save(b,format='PNG')
        with tempfile.TemporaryDirectory() as td:
            result=engine.process_drawing(b.getvalue(),Path(td),'original',{})
            out=Image.open(Path(td)/result['image'])
            self.assertEqual(out.mode,'RGBA'); self.assertTrue(np.array_equal(im,out))

    def test_svg_preserves_hole(self):
        b=io.BytesIO(); sample().save(b,format='PNG')
        with tempfile.TemporaryDirectory() as td:
            result=engine.process_drawing(b.getvalue(),Path(td),'vector',{})
            svg=(Path(td)/result['svg']).read_text()
            self.assertIn('fill-rule="evenodd"',svg); self.assertGreaterEqual(svg.count('M'),2)

    def test_blank_sample_rejected(self):
        with self.assertRaisesRegex(ValueError,'trazos'):
            engine.extract_sample(Image.new('RGB',(100,100),'white'),'a')

    def test_font_has_spanish_cmap_and_alternates(self):
        from fontTools.ttLib import TTFont
        entries=[engine.extract_sample(sample(),'ñ'),engine.extract_sample(sample('a'),'ñ')]
        with tempfile.TemporaryDirectory() as td:
            info=engine.build_font(entries,Path(td)/'letra.ttf','Prueba')
            f=TTFont(Path(td)/'letra.ttf'); self.assertIn(241,f.getBestCmap()); self.assertIn('GSUB',f)
            self.assertEqual(len(info['variants']['ñ']),2)
            render=Image.new('L',(160,160),255)
            from PIL import ImageFont
            font=ImageFont.truetype(str(Path(td)/'letra.ttf'),100)
            ImageDraw.Draw(render).text((0,0),'ñ',font=font,fill=0)
            self.assertLess(np.asarray(render).min(),100)

    def test_template_extracts_only_filled_cells(self):
        im=engine.template_image()
        # First character is a, cell x15..33mm/y42..64mm at 6px/mm.
        d=ImageDraw.Draw(im); d.ellipse((112,296,171,348),outline='black',width=7)
        entries,info=engine.extract_template(im)
        self.assertEqual([e['char'] for e in entries],['a'])

    def test_rotated_template_still_assigns_correct_letter(self):
        for rotation in [Image.Transpose.ROTATE_90,Image.Transpose.ROTATE_180,Image.Transpose.ROTATE_270]:
            im=engine.template_image();d=ImageDraw.Draw(im)
            d.ellipse((112,296,171,348),outline='black',width=7)
            entries,_=engine.extract_template(im.transpose(rotation))
            self.assertEqual([e['char'] for e in entries],['a'])

    def test_large_solid_letter_does_not_replace_corner_marker(self):
        im=engine.template_image();d=ImageDraw.Draw(im)
        # A heavy first letter is bigger than the registration square.
        d.rectangle((106,289,173,351),fill='black')
        entries,_=engine.extract_template(im)
        self.assertEqual([e['char'] for e in entries],['a'])
        for rotation in [Image.Transpose.ROTATE_90,Image.Transpose.ROTATE_180,Image.Transpose.ROTATE_270]:
            rotated,_=engine.extract_template(im.transpose(rotation))
            self.assertEqual([e['char'] for e in rotated],['a'])

    def test_font_rejects_sixteenth_variant_without_writing_partial_font(self):
        entry=engine.extract_sample(sample(),'o')
        with tempfile.TemporaryDirectory() as td:
            target=Path(td)/'font.ttf'
            with self.assertRaisesRegex(ValueError,'15.*o|o.*15'):
                engine.build_font([entry]*16,target,'Test')
            self.assertFalse(target.exists())

    def test_pdf_variant_sequence_matches_browser_preview(self):
        with tempfile.TemporaryDirectory() as td:
            entries=[engine.extract_sample(sample(),'o'),engine.extract_sample(sample('a'),'o')]
            meta=engine.build_font(entries,Path(td)/'font.ttf','Test')
            text='oo oo\nooooo'
            # Record the actual glyphs emitted by the PDF compositor.
            actual=[]
            from reportlab.pdfgen.canvas import Canvas
            original=Canvas.drawString
            def record(canvas,x,y,value,*args,**kwargs):
                actual.append(value);return original(canvas,x,y,value,*args,**kwargs)
            with patch.object(Canvas,'drawString',record):
                engine.compose_pdf(text,Path(td)/'font.ttf',meta,Path(td)/'p.pdf',{'seed':17})
            script=(ROOT/'static'/'app.js').read_text(encoding='utf-8')
            start=script.index('function drawPage()');end=script.index('function saveDraft()',start)
            harness=r"""
const vm=require('node:vm');const draws=[];
const options={width:210,height:297,size:15,leading:8,margin:18,ruling:'none',ink:'#193c66',seed:17};
const context={seed:17,loadedFont:'font',state:{font:{variants:{o:['\ue000','\ue001']}}},pageOptions:()=>options,
 $:id=>id==='text'?{value:'oo oo\nooooo'}:id==='page-canvas'?canvas:{},
};const ctx={fillRect(){},fillText(v){draws.push(v)},measureText(v){return {width:v.length*20}}};
const canvas={getContext:()=>ctx};vm.createContext(context);vm.runInContext(SOURCE+';drawPage();',context);process.stdout.write(JSON.stringify(draws));
""".replace('SOURCE',json.dumps(script[start:end]))
            preview=json.loads(subprocess.check_output(['node','-e',harness],text=True,encoding='utf-8'))
            self.assertEqual(actual,preview)

    def test_preview_wrapping_and_baselines_match_first_pdf_page(self):
        from reportlab.pdfgen.canvas import Canvas
        from fontTools.ttLib import TTFont
        with tempfile.TemporaryDirectory() as td:
            old_entry=engine.extract_sample(sample(),'o');old_entry['advance']=900
            old_path=Path(td)/'old.ttf';old_meta=engine.build_font([old_entry],old_path,'LayoutComparison')
            engine.compose_pdf('o',old_path,old_meta,Path(td)/'old.pdf')
            font_path=Path(td)/'font.ttf'
            meta=engine.build_font([engine.extract_sample(sample(),'o'),engine.extract_sample(sample('a'),'o')],font_path,'LayoutComparison')
            font=TTFont(font_path);cmap=font.getBestCmap()
            widths={chr(code):font['hmtx'].metrics[name][0] for code,name in cmap.items()}
            options={'width':70,'height':70,'margin':5,'size':15,'leading':8,'seed':17,'ruling':'none','ink':'#193c66'}
            text='oo\roo oooooooooooooooo oo oo\r\noo\tooooooo\noo oo'
            actual=[];page=[0];draw=Canvas.drawString;show=Canvas.showPage
            def record(c,x,y,ch,*args,**kwargs):
                if page[0]==0:actual.append([ch,x*25.4/72*3,210-y*25.4/72*3])
                return draw(c,x,y,ch,*args,**kwargs)
            def next_page(c):page[0]+=1;return show(c)
            with patch.object(Canvas,'drawString',record),patch.object(Canvas,'showPage',next_page):
                engine.compose_pdf(text,font_path,meta,Path(td)/'page.pdf',options)
            source=(ROOT/'static'/'app.js').read_text(encoding='utf-8')
            source=source[source.index('function drawPage()'):source.index('function saveDraft()')]
            harness=r"""
const vm=require('node:vm');const draws=[];const options=OPTIONS;const widths=WIDTHS;
const ctx={fillRect(){},fillText(ch,x,y){draws.push([ch,x,y])},measureText(v){return {width:[...v].reduce((n,ch)=>n+(widths[ch]||0)*options.size*25.4/72*3/1000,0)}}};
const canvas={getContext:()=>ctx};const context={seed:17,loadedFont:'font',state:{font:META},pageOptions:()=>options,$:id=>id==='text'?{value:TEXT}:id==='page-canvas'?canvas:{}};
vm.createContext(context);vm.runInContext(SOURCE+';drawPage();',context);process.stdout.write(JSON.stringify(draws));
"""
            for key,value in [('OPTIONS',options),('WIDTHS',widths),('META',meta),('TEXT',text),('SOURCE',source)]:harness=harness.replace(key,json.dumps(value))
            preview=json.loads(subprocess.check_output(['node','-e',harness],encoding='utf-8'))
            self.assertEqual([r[0] for r in actual],[r[0] for r in preview])
            for printed,screen in zip(actual,preview):
                self.assertAlmostEqual(printed[1],screen[1],places=5)
                self.assertAlmostEqual(printed[2],screen[2],places=5)

    def test_compose_rejects_missing_glyph(self):
        with tempfile.TemporaryDirectory() as td:
            entries=[engine.extract_sample(sample(),'o')]
            meta=engine.build_font(entries,Path(td)/'font.ttf','Test')
            with self.assertRaisesRegex(ValueError,'muestra'):
                engine.compose_pdf('hola',Path(td)/'font.ttf',meta,Path(td)/'p.pdf',{})

    def test_compose_long_text_creates_multiple_pages(self):
        from pypdf import PdfReader
        with tempfile.TemporaryDirectory() as td:
            meta=engine.build_font([engine.extract_sample(sample(),'o')],Path(td)/'font.ttf','Test')
            result=engine.compose_pdf(('ooo ooo\n'*120),Path(td)/'font.ttf',meta,Path(td)/'p.pdf',{'ruling':'lines'})
            reader=PdfReader(Path(td)/'p.pdf'); self.assertGreater(len(reader.pages),1)
            self.assertEqual(result['pages'],len(reader.pages))
            self.assertAlmostEqual(float(reader.pages[0].mediabox.width),595.2756,places=2)

    def test_invalid_image_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaises(ValueError): engine.process_drawing(b'not an image',Path(td),'original',{})

if __name__=='__main__': unittest.main()
