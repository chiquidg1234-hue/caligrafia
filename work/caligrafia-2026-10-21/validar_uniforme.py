"""Independent release checks, including a byte-identical second build."""
import json,hashlib,subprocess,sys
from pathlib import Path
from PIL import ImageFont
W=Path(__file__).resolve().parent;ROOT=W.parents[1];OUT=ROOT/'outputs/mi-caligrafia'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
paths=[OUT/'Mi-letra-Uniforme.trazo',OUT/'Mi-letra-Uniforme.ttf',OUT/'Mi-letra-Uniforme.json',W/'bundled-letter.json']
before={str(p.relative_to(ROOT)):digest(p) for p in paths}
result=subprocess.run([sys.executable,str(W/'curar_uniforme.py')],capture_output=True,text=True)
assert result.returncode==0,result.stderr
after={str(p.relative_to(ROOT)):digest(p) for p in paths}
assert before==after,'Build is not byte reproducible'
lib=json.loads((OUT/'Mi-letra-Uniforme.trazo').read_text(encoding='utf-8'))
font=ImageFont.truetype(str(OUT/'Mi-letra-Uniforme.ttf'),80)
chars={s['char'] for s in lib['samples']}
assert len(chars)==111 and len(lib['samples'])==111
assert all(font.getmask(c).getbbox() for c in chars),'Blank glyph'
bundle=json.loads((W/'bundled-letter.json').read_text(encoding='utf-8'))
assert [p['id'] for p in bundle['profiles']]==['personal-uniforme-v1','personal-original-v1','personal-optimizada-v1']
assert [len(p['samples']) for p in bundle['profiles']]==[111,390,390]
for profile in bundle['profiles']:
    assert {s['char'] for s in profile['samples']}==chars
    assert all(set(s)=={'id','label','char','paths','advance','baseline'} for s in profile['samples'])
report=json.loads((OUT/'Mi-letra-Uniforme-curacion.json').read_text(encoding='utf-8'))
assert not report['topologyRasterChanges']
assert all(digest(OUT/name)==sha for name,sha in report['legacyHashesUnchanged'].items())
checks={'status':'passed','byteIdenticalRebuild':True,'all111GlyphsRenderNonblank':True,
        'sanitizedBundleProfiles':3,'bundleSampleCounts':[111,390,390],
        'legacyFilesUnchanged':6,'contoursComponentsAndHolesPreserved':True,
        'sha256':after}
(OUT/'Mi-letra-Uniforme-validacion.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(json.dumps(checks,ensure_ascii=True))
