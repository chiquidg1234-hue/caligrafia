import hashlib,json,zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'outputs/mi-caligrafia'
inventory_path=OUT/'Inventario-y-validacion.json'
inventory=json.loads(inventory_path.read_text(encoding='utf-8'))
inventory['inkUniformity']={
 'scope':'Optimizada: letras y cifras; Original y signos conservados.',
 'method':'Ajuste moderado del grosor a partir de contornos rasterizados; tinta opaca en vista y PDF.',
 'strokeWidthCoefficientOfVariationBefore':0.1804289,
 'strokeWidthCoefficientOfVariationAfter':0.0576942,
 'warning':'Medida técnica del grosor de contorno, no porcentaje de parecido ni garantía perceptual.'
}
inventory['paperEditorValidation']={
 'fourIndependentMargins':True,'customPaper':True,'independentGridSpacing':True,
 'selectedBoldItalicColor':True,'previewPDFSharedGeometry':True,
 'multilineOverlapBlocked':True,'smallPaper50mmCalibration':True,
 'physicalPrintTested':False,'androidDeviceTested':False
}
inventory_path.write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
files=['Mi-letra-Original.ttf','Mi-letra-Optimizada.ttf',
       'Mi-letra-Original.trazo','Mi-letra-Optimizada.trazo',
       'Comparacion-mi-letra-5mm.pdf','Calibracion-5mm.pdf',
       'LEEME.md','Inventario-y-validacion.json']
for name in files:assert (OUT/name).is_file(),name
for name in files[:4]:
 if name.endswith('.ttf'):
  profile='original' if 'Original' in name else 'optimizada'
  expected=next(v['sha256'] for v in inventory['validated'] if v['profile']==profile)
  assert hashlib.sha256((OUT/name).read_bytes()).hexdigest()==expected
 else:
  lib=json.loads((OUT/name).read_text(encoding='utf-8'))
  assert len(lib['samples'])==390 and len({s['label'] for s in lib['samples']})==111
target=OUT/'Mi-caligrafia-para-Trazo.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for name in files:archive.write(OUT/name,name)
with zipfile.ZipFile(target) as archive:
 assert archive.testzip() is None
 assert sorted(archive.namelist())==sorted(files)
 for name in files:assert archive.read(name)==(OUT/name).read_bytes()
print(json.dumps({'file':str(target),'files':len(files),'bytes':target.stat().st_size,
 'sha256':hashlib.sha256(target.read_bytes()).hexdigest()},ensure_ascii=False))
