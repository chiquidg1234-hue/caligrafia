import io,tarfile,urllib.request,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'outputs'/'trazo-android'/'web'/'vendor'
packages=[('opentype.js','1.3.4','dist/opentype.module.js','opentype.mjs'),('pdf-lib','1.17.1','dist/pdf-lib.min.js','pdf-lib.min.js')]
for name,version,member,target in packages:
    url=f'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz'
    data=urllib.request.urlopen(url,timeout=60).read()
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
        (root/target).write_bytes(archive.extractfile('package/'+member).read())
        licenses=[m for m in archive.getmembers() if m.name.lower() in ['package/license','package/license.md','package/license.txt']]
        if licenses:(root/(name+'-LICENSE.txt')).write_bytes(archive.extractfile(licenses[0]).read())
    print(name,version,(root/target).stat().st_size)
