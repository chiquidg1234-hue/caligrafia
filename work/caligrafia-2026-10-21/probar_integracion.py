import sys,json,urllib.request,urllib.error,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'outputs/trazo/vendor'),str(ROOT/'outputs/trazo')]
from pypdf import PdfReader
import io,personal
BASE='http://127.0.0.1:8767'
def get(path):
 with urllib.request.urlopen(BASE+path) as r:return r.read()
state=json.loads(get('/api/personal'));token=state.pop('token');results=[]
def post(path,obj):
 request=urllib.request.Request(BASE+path,json.dumps(obj).encode(),{'Content-Type':'application/json','X-Trazo-Key':token,'Origin':BASE})
 with urllib.request.urlopen(request) as r:return json.load(r)
for profile in state['profiles']:
 assert len(profile['characters'])==111
 text='¡Qué día tan increíble! El pingüino escribió: 100 ÷ 5 = 20.\n'+('Mamá y papá; pequeño, conexión y tecnología.\n'*80)
 body={'profile':profile['id'],'text':text,'options':{'size':17,'leading':10,'paper':'A5','ruling':'grid'}}
 preview=post('/api/personal/layout',body);pdf=post('/api/personal/compose',body)
 assert not preview['missing'] and preview==pdf['layout']
 assert preview['grid']['vertical'][:3]==[5,10,15]
 data=get(pdf['url']);pages=len(PdfReader(io.BytesIO(data)).pages);assert pages==len(preview['pages']) and pages>1
 font=get(profile['font_url']);assert font== (ROOT/'outputs/mi-caligrafia'/profile['font']).read_bytes()
 results.append({'profile':profile['id'],'samples':profile['count'],'characters':len(profile['characters']),'pages':pages,'previewEqualsPDFLayout':True,'fontDownloadSha256':hashlib.sha256(font).hexdigest()})
bad=post('/api/personal/layout',{'profile':'original','text':'Falta: ≤ √ ∞','options':{}});assert set(bad['missing'])==set('≤√∞')
try:post('/api/personal/compose',{'profile':'original','text':'≤','options':{}});raise AssertionError('Missing glyph exported')
except urllib.error.HTTPError as e:assert e.code==400
none=post('/api/personal/layout',{'profile':'original','text':'a\na','options':{'ruling':'none','leading':15}});assert none['grid']=={'vertical':[],'horizontal':[]}
old=json.loads(get('/api/state'));assert old['samples']==[] and old['font'] is None
report={'profiles':results,'missingBlocksExport':True,'physicalPaperHasNoPrintedGrid':True,'existingLibraryPreserved':True}
(ROOT/'work/caligrafia-2026-10-21/integracion.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
