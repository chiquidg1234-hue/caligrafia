import json,urllib.request,io,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'outputs/trazo/vendor'),str(ROOT/'outputs/trazo')]
from pypdf import PdfReader
BASE='http://127.0.0.1:8767';state=json.load(urllib.request.urlopen(BASE+'/api/personal'))
text='Mi cuaderno personal.\nMárgenes a mi medida; tinta uniforme.\nPuedo usar negrita, cursiva y color.\nEl pingüino escribió: ¡Qué día tan increíble!'
start=text.index('cursiva');red=text.index('color')
body={'profile':'optimizada','text':text,'styles':[{'start':0,'end':11,'bold':True,'color':'#193c66'},{'start':start,'end':start+7,'italic':True},{'start':red,'end':red+5,'bold':True,'italic':True,'color':'#ad3650'}],
'options':{'paper':'custom','width':180,'height':250,'marginLeft':25,'marginRight':12,'marginTop':30,'marginBottom':18,'gridMm':5,'gridOriginX':2,'gridOriginY':3,'gridColor':'#c4d8ed','paperColor':'#fffaf0','marginLine':True,'marginLineX':18,'marginLineColor':'#ce8794','size':20,'leading':10,'ink':'#203751'}}
request=urllib.request.Request(BASE+'/api/personal/compose',json.dumps(body).encode(),{'Content-Type':'application/json','X-Trazo-Key':state['token'],'Origin':BASE})
result=json.load(urllib.request.urlopen(request));layout=result['layout'];assert not layout['missing']
assert layout['grid']['vertical'][:3]==[2,7,12]
assert any(g['stroke_mm']>0 for p in layout['pages'] for g in p['glyphs'])
assert any(g['style']['italic'] for p in layout['pages'] for g in p['glyphs'])
pdf=urllib.request.urlopen(BASE+result['url']).read();reader=PdfReader(io.BytesIO(pdf))
assert abs(float(reader.pages[0].mediabox.width)-180*72/25.4)<.001
operators=reader.pages[0].get_contents().get_data();assert b'.96 w' in operators
out=ROOT/'work/caligrafia-2026-10-21';(out/'editor-estilos.pdf').write_bytes(pdf)
(out/'editor-estilos.json').write_text(json.dumps({'body':body,'layout':layout},ensure_ascii=False),encoding='utf-8')
print({'pages':len(reader.pages),'customPaperMM':[180,250],'gridMM':5,'styledGlyphs':sum(g['style']['bold'] or g['style']['italic'] for p in layout['pages'] for g in p['glyphs']),'boldStrokePDFpt':.96,'previewLayoutShared':True})
