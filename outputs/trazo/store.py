"""Durable local library and single-worker drawing queue."""
import hashlib,json,sqlite3,threading,time,uuid
from contextlib import contextmanager
from pathlib import Path
import engine

class Store:
    def __init__(self,root):
        self.root=Path(root).resolve();self.root.mkdir(parents=True,exist_ok=True)
        self.inbox=self.root/'entrada-dibujos';self.inbox.mkdir(exist_ok=True)
        for d in ['jobs','fonts','pages']: (self.root/d).mkdir(exist_ok=True)
        self.db=self.root/'database.sqlite';self.lock=threading.RLock();self.stop=threading.Event();self.last_watch_error='';self.inbox_seen={}
        with self.connection() as db:
            db.executescript('''PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS samples(id TEXT PRIMARY KEY,payload TEXT,created REAL);
            CREATE TABLE IF NOT EXISTS fonts(id TEXT PRIMARY KEY,payload TEXT,created REAL);
            CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,name TEXT,mode TEXT,options TEXT,status TEXT,result TEXT,error TEXT,created REAL);
            CREATE TABLE IF NOT EXISTS watched(path TEXT PRIMARY KEY,hash TEXT);
            CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);''')
            db.execute("UPDATE jobs SET status='pending' WHERE status='running'")
    @contextmanager
    def connection(self):
        db=sqlite3.connect(self.db,timeout=15);db.row_factory=sqlite3.Row
        try:
            with db:yield db
        finally:db.close()
    def setting(self,key,default=None):
        with self.connection() as db: row=db.execute('SELECT value FROM settings WHERE key=?',(key,)).fetchone()
        return json.loads(row['value']) if row else default
    def save_setting(self,key,value):
        with self.connection() as db: db.execute('INSERT OR REPLACE INTO settings VALUES(?,?)',(key,json.dumps(value)))
    def watch_settings(self):
        settings={'watch':False,'watch_mode':'original','watch_options':{}}
        with self.connection() as db:rows=db.execute("SELECT key,value FROM settings WHERE key IN ('watch','watch_mode','watch_options')").fetchall()
        settings.update({row['key']:json.loads(row['value']) for row in rows})
        return settings
    def samples(self):
        with self.connection() as db: rows=db.execute('SELECT id,payload FROM samples ORDER BY created,id').fetchall()
        return [{'id':r['id'],**json.loads(r['payload'])} for r in rows]
    def add_samples(self,entries):
        with self.lock,self.connection() as db:
            current=db.execute('SELECT count(*) FROM samples').fetchone()[0]
            if current+len(entries)>1200: raise ValueError('El límite es 1200 muestras. Elimina algunas antes de añadir más.')
            for entry in entries:
                db.execute('INSERT INTO samples VALUES(?,?,?)',(uuid.uuid4().hex,json.dumps(entry,ensure_ascii=False),time.time()))
        return len(entries)
    def delete_sample(self,sid):
        with self.lock,self.connection() as db: db.execute('DELETE FROM samples WHERE id=?',(sid,))
    def font(self):
        with self.connection() as db: row=db.execute('SELECT id,payload FROM fonts ORDER BY created DESC LIMIT 1').fetchone()
        return {'id':row['id'],**json.loads(row['payload'])} if row else None
    def create_font(self,name):
        with self.lock:
            entries=self.samples();fid=uuid.uuid4().hex;target=self.root/'fonts'/fid;target.mkdir()
            meta=engine.build_font(entries,target/'letra.ttf',name)
            meta['sample_ids']=[e['id'] for e in entries]
            with self.connection() as db:db.execute('INSERT INTO fonts VALUES(?,?,?)',(fid,json.dumps(meta,ensure_ascii=False),time.time()))
            if self.setting('demo',False):
                manifest=self.setting('demo_manifest',{})
                if set(meta['sample_ids']).issubset(set(manifest.get('samples',[]))):
                    manifest.setdefault('fonts',[]).append(fid);self.save_setting('demo_manifest',manifest)
            return {'id':fid,**meta}
    def add_job(self,name,data,mode,options):
        if len(data)>16*1024*1024:raise ValueError('Cada imagen debe pesar menos de 16 MB.')
        if mode not in ('original','clean','vector'):raise ValueError('Modo de dibujo desconocido.')
        # Validate all print values before accepting a job.
        engine.page_options(options);jid=uuid.uuid4().hex;target=self.root/'jobs'/jid;target.mkdir()
        (target/'source.bin').write_bytes(data)
        name=Path(str(name).replace('\\','/')).name[:160] or 'Imagen'
        with self.connection() as db:db.execute('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?)',
            (jid,name,mode,json.dumps(options),'pending',None,None,time.time()))
        return jid
    def jobs(self,offset=0,limit=150):
        if offset<0 or not 1<=limit<=150:raise ValueError('Página de trabajos inválida.')
        with self.connection() as db:rows=db.execute('SELECT * FROM jobs ORDER BY created DESC,id DESC LIMIT ? OFFSET ?',(limit,offset)).fetchall()
        result=[]
        for row in rows:
            d=dict(row);d['options']=json.loads(d['options']);d['result']=json.loads(d['result']) if d['result'] else None;result.append(d)
        return result
    def job_counts(self):
        counts={'total':0,'pending':0,'running':0,'done':0,'error':0}
        with self.connection() as db:rows=db.execute('SELECT status,count(*) AS n FROM jobs GROUP BY status').fetchall()
        for row in rows:
            counts[row['status']]=row['n'];counts['total']+=row['n']
        return counts
    def set_status(self,jid,status,result=None,error=None):
        with self.connection() as db:db.execute('UPDATE jobs SET status=?,result=?,error=? WHERE id=?',
            (status,json.dumps(result,ensure_ascii=False) if result else None,error,jid))
    def run_next(self):
        with self.lock,self.connection() as db:
            row=db.execute("SELECT * FROM jobs WHERE status='pending' ORDER BY created LIMIT 1").fetchone()
            if not row:return False
            db.execute("UPDATE jobs SET status='running' WHERE id=?",(row['id'],))
        try:
            target=self.root/'jobs'/row['id'];result=engine.process_drawing((target/'source.bin').read_bytes(),target,row['mode'],json.loads(row['options']))
            self.set_status(row['id'],'done',result)
        except Exception as exc:self.set_status(row['id'],'error',error=str(exc)[:400] or 'Error al procesar la imagen.')
        return True
    def retry(self,jid):
        with self.connection() as db:db.execute("UPDATE jobs SET status='pending',error=NULL WHERE id=? AND status='error'",(jid,))
    def scan_inbox(self):
        count=0;errors=[];now=time.monotonic();present=set()
        for path in sorted(self.inbox.iterdir()):
            if path.suffix.lower() not in ('.png','.jpg','.jpeg','.webp','.bmp','.tif','.tiff'):continue
            present.add(path.name)
            try:
                if not path.is_file():continue
                stat=path.stat();signature=(stat.st_size,stat.st_mtime_ns)
                if stat.st_size>16*1024*1024:raise ValueError('Supera 16 MB.')
                previous=self.inbox_seen.get(path.name)
                if previous is None or previous[0]!=signature:
                    self.inbox_seen[path.name]=(signature,now);continue
                if now-previous[1]<1:continue
                # Observe stability across scans and across the actual read.
                with path.open('rb') as source:data=source.read(16*1024*1024+1)
                after=path.stat()
                if len(data)>16*1024*1024:raise ValueError('Supera 16 MB.')
                if (after.st_size,after.st_mtime_ns)!=signature or len(data)!=stat.st_size:
                    self.inbox_seen[path.name]=((after.st_size,after.st_mtime_ns),now);continue
                digest=hashlib.sha256(data).hexdigest()
                with self.connection() as db:row=db.execute('SELECT hash FROM watched WHERE path=?',(path.name,)).fetchone()
                if row and row['hash']==digest:continue
                settings=self.watch_settings()
                self.add_job(path.name,data,settings['watch_mode'],settings['watch_options'])
                with self.connection() as db:db.execute('INSERT OR REPLACE INTO watched VALUES(?,?)',(path.name,digest))
                count+=1
            except (OSError,ValueError,TypeError) as exc:errors.append(f'{path.name}: {exc}')
        self.inbox_seen={name:value for name,value in self.inbox_seen.items() if name in present}
        self.last_watch_error=' · '.join(errors)[:600]
        return count
    def worker(self):
        last=0
        while not self.stop.is_set():
            if self.setting('watch',False) and time.monotonic()-last>5:
                try:self.scan_inbox()
                except Exception as exc:self.last_watch_error=str(exc)[:200]
                last=time.monotonic()
            if not self.run_next():self.stop.wait(.6)
    def output_path(self,relative):
        path=(self.root/relative).resolve()
        try:rel=path.relative_to(self.root)
        except ValueError:raise ValueError('Ruta no permitida.')
        if len(rel.parts)<3 or rel.parts[0] not in ('jobs','fonts','pages') or path.suffix.lower() not in ('.png','.svg','.pdf','.ttf'):
            raise ValueError('Archivo no disponible.')
        return path
