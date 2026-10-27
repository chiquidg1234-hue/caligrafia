import sys,io,json,tempfile,threading,unittest,http.client,base64,time
from unittest.mock import patch
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'vendor'),str(ROOT)]
from PIL import Image,ImageDraw
from server import make_server
import engine

class ServerTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.server=make_server(Path(self.tmp.name),0)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.port=self.server.server_port;self.token=self.request('GET','/api/state')[1]['token']
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join();self.tmp.cleanup()
    def request(self,method,path,obj=None,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.port,timeout=15)
        data=json.dumps(obj) if obj is not None else None
        conn.request(method,path,body=data,headers=headers or {});res=conn.getresponse();raw=res.read();status=res.status;conn.close()
        try:return status,json.loads(raw)
        except ValueError:return status,raw
    def post(self,path,obj,headers=None):
        return self.request('POST',path,obj,headers or {'X-Trazo-Key':self.token,'Content-Type':'application/json'})
    def test_other_origin_and_missing_token_are_blocked(self):
        self.assertEqual(self.post('/api/watch',{'enabled':True},{'Origin':'https://example.org','X-Trazo-Key':self.token})[0],403)
        self.assertEqual(self.request('POST','/api/watch',{'enabled':True})[0],403)
    def test_file_traversal_and_database_download_are_blocked(self):
        self.assertEqual(self.request('GET','/files/../database.sqlite')[0],400)
        self.assertEqual(self.request('GET','/files/database.sqlite')[0],400)
    def test_invalid_image_shows_recoverable_error(self):
        status,result=self.post('/api/samples',{'type':'crop','char':'a','data':'YWJj'})
        self.assertEqual(status,400);self.assertIn('imagen',result['error'])
        self.assertEqual(self.request('GET','/api/state')[0],200)
    def test_template_download_is_a_real_pdf(self):
        status,data=self.request('GET','/api/template.pdf');self.assertEqual(status,200);self.assertTrue(data.startswith(b'%PDF'))
    def test_demo_cannot_mix_with_real_samples(self):
        self.assertEqual(self.post('/api/demo',{})[0],200)
        status,result=self.post('/api/samples',{'type':'crop','char':'a','data':'YWJj'})
        self.assertEqual(status,400);self.assertIn('ejemplo',result['error'])
        self.assertEqual(self.post('/api/demo/clear',{})[0],200)
        self.assertEqual(len(self.request('GET','/api/state')[1]['samples']),0)
    def test_demo_and_real_sample_import_are_serialized(self):
        started=threading.Event();release=threading.Event();responses={}
        original=engine.extract_sample
        def pause_demo(*args,**kwargs):
            if args[1]=='a' and not started.is_set():started.set();release.wait(8)
            return original(*args,**kwargs)
        im=Image.new('RGB',(80,90),'white');ImageDraw.Draw(im).rectangle((20,20,50,60),fill='black')
        raw=io.BytesIO();im.save(raw,format='PNG')
        with patch.object(engine,'extract_sample',side_effect=pause_demo):
            demo_thread=threading.Thread(target=lambda:responses.setdefault('demo',self.post('/api/demo',{})))
            demo_thread.start();self.assertTrue(started.wait(5))
            sample_thread=threading.Thread(target=lambda:responses.setdefault('sample',self.post('/api/samples',{'char':'@','data':base64.b64encode(raw.getvalue()).decode()})))
            sample_thread.start();time.sleep(.15);release.set();demo_thread.join(12);sample_thread.join(12)
        self.assertEqual(responses['demo'][0],200)
        self.assertEqual(responses['sample'][0],400)
        self.assertNotIn('@',[s['char'] for s in self.server.store.samples()])
    def test_demo_spanish_glyph_is_not_missing_box(self):
        self.assertEqual(self.post('/api/demo',{})[0],200)
        samples=self.server.store.samples()
        accented=next(s for s in samples if s['char']=='\u00e1')
        # An unsupported character is drawn as the font's .notdef box.
        from PIL import ImageFont
        missing=Image.new('RGB',(120,130),'white')
        ImageDraw.Draw(missing).text((14,10),'\u0378',font=ImageFont.load_default(size=72),fill='black')
        box=engine.extract_sample(missing,'?')
        self.assertNotEqual(accented['paths'],box['paths'])

    def test_clear_demo_preserves_unrelated_library_records(self):
        self.assertEqual(self.post('/api/demo',{})[0],200)
        external={'char':'@','paths':[[[0,0],[20,0],[20,20]]],'advance':100,'preview':''}
        with self.server.store.connection() as db:
            db.execute('INSERT INTO samples VALUES(?,?,?)',('external',json.dumps(external),1))
            db.execute('INSERT INTO fonts VALUES(?,?,?)',('external-font',json.dumps({'name':'Otra','sample_ids':['external']}),1))
        self.assertEqual(self.post('/api/demo/clear',{})[0],200)
        self.assertEqual([s['id'] for s in self.server.store.samples()],['external'])
        self.assertEqual(self.server.store.font()['id'],'external-font')
    def test_state_returns_watch_settings_after_reload(self):
        self.assertEqual(self.post('/api/watch',{'enabled':True,'mode':'vector','options':{'threshold':222}})[0],200)
        state=self.request('GET','/api/state')[1]
        self.assertEqual(state.get('watch_mode'),'vector')
        self.assertEqual(state.get('watch_options'),{'threshold':222})
    def test_jobs_pagination_and_global_counts(self):
        with self.server.store.connection() as db:
            db.executemany('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?)',[(str(i),'old.png','original','{}','pending' if i<2 else 'done',None,None,float(i)) for i in range(152)])
        state=self.request('GET','/api/state')[1]
        self.assertEqual(state.get('job_counts'),{'total':152,'pending':2,'running':0,'done':150,'error':0})
        self.assertEqual(len(state['jobs']),150)
        older=self.request('GET','/api/jobs?offset=150')[1]
        self.assertEqual([j['id'] for j in older['jobs']],['1','0'])

if __name__=='__main__':unittest.main()
