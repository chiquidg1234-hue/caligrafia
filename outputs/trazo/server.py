"""Trazo local-only HTTP application. Run with the bundled Python runtime."""
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'vendor'))
import argparse,base64,binascii,io,json,mimetypes,os,secrets,threading,time,traceback,uuid
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlsplit,unquote,parse_qs
from PIL import Image,ImageDraw,ImageFont
import reportlab
import engine
import personal
from store import Store

def make_server(root=None,port=8767,personal_source=None):
    store=Store(root or ROOT/'data');token=secrets.token_urlsafe(32)
    personal_studio=personal.PersonalStudio(store.root,personal_source or personal.SOURCE)
    class Handler(BaseHTTPRequestHandler):
        server_version='Trazo/1.0'
        def log_message(self,fmt,*args):print(time.strftime('%H:%M:%S'),fmt%args,flush=True)
        def send(self,code,data,kind='application/json; charset=utf-8',filename=None):
            if isinstance(data,(dict,list)):data=json.dumps(data,ensure_ascii=False).encode()
            elif isinstance(data,str):data=data.encode()
            self.send_response(code);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)))
            self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store')
            self.send_header('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' blob:; script-src 'self'; connect-src 'self'; object-src 'self'; frame-src 'self'; frame-ancestors 'none'")
            if filename:self.send_header('Content-Disposition',f'attachment; filename="{filename}"')
            self.end_headers();self.wfile.write(data)
        def allowed(self):
            host=self.headers.get('Host','')
            return host in (f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}')
        def do_GET(self):
            if not self.allowed():return self.send(403,{'error':'Origen no permitido.'})
            path=unquote(urlsplit(self.path).path)
            try:
                if path=='/api/personal':return self.send(200,{'token':token,**personal_studio.state()})
                if path.startswith('/personal/files/'):
                    f=personal.source_file(personal_studio.source,path[len('/personal/files/'):])
                    if not f.is_file():return self.send(404,{'error':'Archivo personal no encontrado.'})
                    return self.send(200,f.read_bytes(),mimetypes.guess_type(f.name)[0] or 'application/octet-stream',f.name)
                if path.startswith('/personal/pages/'):
                    f=personal_studio.page_path(path[len('/personal/pages/'):])
                    if not f.is_file():return self.send(404,{'error':'PDF no encontrado.'})
                    return self.send(200,f.read_bytes(),'application/pdf','trazo-mi-caligrafia.pdf')
                if path=='/api/jobs':
                    query=parse_qs(urlsplit(self.path).query);offset=int(query.get('offset',['0'])[0])
                    return self.send(200,{'jobs':store.jobs(offset),'job_counts':store.job_counts(),'jobs_offset':offset})
                if path=='/api/state':
                    offset=int(parse_qs(urlsplit(self.path).query).get('jobs_offset',['0'])[0])
                    samples=store.samples();font=store.font()
                    visible=[{k:v for k,v in s.items() if k in ('id','char','preview')} for s in samples]
                    return self.send(200,{'token':token,'samples':visible,'font':font,'jobs':store.jobs(offset),'jobs_offset':offset,'job_counts':store.job_counts(),
                         **store.watch_settings(),'inbox':str(store.inbox),'watch_error':store.last_watch_error,
                         'characters':engine.CHARS,'demo':store.setting('demo',False)})
                if path=='/api/template.pdf':
                    f=store.root/'plantilla.pdf';engine.template_pdf(f);return self.send(200,f.read_bytes(),'application/pdf','plantilla-trazo.pdf')
                if path.startswith('/files/'):
                    f=store.output_path(path[7:])
                    if not f.is_file():return self.send(404,{'error':'Archivo no encontrado.'})
                    return self.send(200,f.read_bytes(),mimetypes.guess_type(f.name)[0] or 'application/octet-stream',f.name if urlsplit(self.path).query=='download' else None)
                asset=ROOT/'static'/('index.html' if path=='/' else path.lstrip('/'))
                if not asset.resolve().is_relative_to((ROOT/'static').resolve()) or not asset.is_file():return self.send(404,{'error':'Página no encontrada.'})
                self.send(200,asset.read_bytes(),mimetypes.guess_type(asset.name)[0] or 'application/octet-stream')
            except (ValueError,OSError) as exc:self.send(400,{'error':str(exc)})
        def decode(self,obj):
            try:
                data=obj.get('data','');data=data.split(',',1)[-1];raw=base64.b64decode(data,validate=True)
            except (ValueError,binascii.Error):raise ValueError('El archivo no se recibió correctamente.')
            if len(raw)>16*1024*1024:raise ValueError('Cada imagen debe pesar menos de 16 MB.')
            return raw
        def do_POST(self):
            origin=self.headers.get('Origin');valid_origins=(f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}')
            if not self.allowed() or (origin and origin not in valid_origins) or self.headers.get('X-Trazo-Key')!=token:
                return self.send(403,{'error':'Recarga la app para continuar.'})
            try:
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=100*1024*1024:raise ValueError('Carga demasiado grande. Añade menos archivos a la vez.')
                obj=json.loads(self.rfile.read(length));path=urlsplit(self.path).path
                if not isinstance(obj,dict):raise ValueError('Solicitud inválida.')
                if path=='/api/personal/layout':return self.send(200,personal_studio.layout(obj))
                if path=='/api/personal/compose':return self.send(200,personal_studio.compose(obj))
                if path=='/api/personal/calibration':return self.send(200,personal_studio.calibration(obj))
                if path=='/api/samples':
                    with store.lock:
                        if store.setting('demo',False):raise ValueError('Quita primero el ejemplo de prueba para no mezclarlo con tu letra.')
                        im=engine.load_image(self.decode(obj))
                        if obj.get('type')=='template':entries,info=engine.extract_template(im)
                        else:
                            crop=obj.get('crop')
                            if crop:
                                x,y,w,h=[float(v) for v in crop]
                                if min(x,y)<0 or min(w,h)<=0 or x+w>1.001 or y+h>1.001:raise ValueError('El recorte está fuera de la imagen.')
                                im=im.crop((round(x*im.width),round(y*im.height),round((x+w)*im.width),round((y+h)*im.height)))
                            entries=[engine.extract_sample(im,obj.get('char',''),float(obj.get('baseline',.78)))];info={}
                        count=store.add_samples(entries);return self.send(200,{'added':count,**info})
                if path=='/api/samples/delete':store.delete_sample(str(obj.get('id','')));return self.send(200,{'ok':True})
                if path=='/api/font':return self.send(200,store.create_font(obj.get('name','Mi letra')))
                if path=='/api/compose':
                    font=store.font()
                    if not font:raise ValueError('Crea tu fuente antes de componer una página.')
                    pid=uuid.uuid4().hex;folder=store.root/'pages'/pid;folder.mkdir()
                    result=engine.compose_pdf(obj.get('text',''),store.root/'fonts'/font['id']/'letra.ttf',font,folder/'pagina.pdf',obj.get('options',{}))
                    return self.send(200,{'url':f'/files/pages/{pid}/pagina.pdf',**result})
                if path=='/api/jobs':
                    files=obj.get('files',[])
                    if not files or len(files)>10:raise ValueError('Añade entre 1 y 10 imágenes a la vez.')
                    decoded=[(f.get('name','Imagen'),self.decode(f)) for f in files]
                    ids=[store.add_job(name,data,obj.get('mode','original'),obj.get('options',{})) for name,data in decoded]
                    return self.send(200,{'ids':ids})
                if path=='/api/jobs/retry':store.retry(str(obj.get('id','')));return self.send(200,{'ok':True})
                if path=='/api/watch':
                    mode=obj.get('mode','original')
                    if mode not in ('original','clean','vector'):raise ValueError('Modo inválido.')
                    options=obj.get('options',{});engine.page_options(options)
                    with store.connection() as db:
                        db.executemany('INSERT OR REPLACE INTO settings VALUES(?,?)',[(key,json.dumps(value)) for key,value in [('watch_mode',mode),('watch_options',options),('watch',bool(obj.get('enabled')))]])
                    return self.send(200,{'ok':True})
                if path=='/api/draft':store.save_setting('draft',obj.get('draft',{}));return self.send(200,{'ok':True})
                if path=='/api/demo':
                    with store.lock:
                        if store.samples():raise ValueError('El ejemplo solo se añade a una biblioteca vacía para no mezclarlo con tu letra.')
                        entries=[];font=ImageFont.truetype(str(Path(reportlab.__file__).parent/'fonts'/'Vera.ttf'),72)
                        for ch in engine.CHARS:
                            for variant in range(2):
                                im=Image.new('RGB',(120,130),'white');d=ImageDraw.Draw(im)
                                d.text((14+variant*3,10),ch,font=font,fill='black',stroke_width=variant)
                                try:entries.append(engine.extract_sample(im,ch,.78))
                                except ValueError:pass
                        store.add_samples(entries)
                        store.save_setting('demo_manifest',{'samples':[sample['id'] for sample in store.samples()],'fonts':[]})
                        store.save_setting('demo',True);return self.send(200,store.create_font('Ejemplo de prueba'))
                if path=='/api/demo/clear':
                    with store.lock:
                        if not store.setting('demo',False):raise ValueError('No hay una biblioteca de ejemplo.')
                        manifest=store.setting('demo_manifest',{})
                        # Older examples have no manifest; only their recorded sample IDs
                        # and fonts derived exclusively from them can be identified safely.
                        if not manifest:
                            latest=store.font()
                            if latest and latest.get('name')=='Ejemplo de prueba':
                                manifest={'samples':latest.get('sample_ids',[]),'fonts':[latest['id']]}
                        with store.connection() as db:
                            db.executemany('DELETE FROM samples WHERE id=?',[(sid,) for sid in manifest.get('samples',[])])
                            db.executemany('DELETE FROM fonts WHERE id=?',[(fid,) for fid in manifest.get('fonts',[])])
                        store.save_setting('demo',False);store.save_setting('demo_manifest',{})
                        return self.send(200,{'ok':True})
                self.send(404,{'error':'Acción no encontrada.'})
            except (ValueError,TypeError,KeyError) as exc:self.send(400,{'error':str(exc)})
            except Exception:
                traceback.print_exc();self.send(500,{'error':'No se pudo completar la operación. Tus muestras guardadas siguen disponibles.'})
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler);server.store=store;server.daemon_threads=True
    return server

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8767);parser.add_argument('--data');args=parser.parse_args()
    app=make_server(Path(args.data) if args.data else None,args.port)
    threading.Thread(target=app.store.worker,daemon=True).start()
    print(f'Trazo listo: http://127.0.0.1:{app.server_port}',flush=True)
    try:app.serve_forever()
    except KeyboardInterrupt:pass
    finally:app.store.stop.set();app.server_close()
