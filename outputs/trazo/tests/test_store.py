import sys,tempfile,unittest,io,threading,time
from unittest.mock import patch
from contextlib import contextmanager
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'vendor'),str(ROOT)]
from PIL import Image
from store import Store

class StoreTests(unittest.TestCase):
    def image(self):
        b=io.BytesIO();Image.new('RGB',(20,30),'navy').save(b,format='PNG');return b.getvalue()
    def test_queue_survives_reopen_and_finishes(self):
        with tempfile.TemporaryDirectory() as td:
            store=Store(Path(td));jid=store.add_job('foto.png',self.image(),'original',{})
            reopened=Store(Path(td));self.assertEqual(reopened.jobs()[0]['status'],'pending')
            self.assertTrue(reopened.run_next());job=reopened.jobs()[0]
            self.assertEqual(job['status'],'done');self.assertTrue((Path(td)/'jobs'/jid/'imprimir.pdf').exists())
    def test_bad_job_fails_without_blocking_next(self):
        with tempfile.TemporaryDirectory() as td:
            store=Store(Path(td));store.add_job('mala.png',b'invalid','original',{})
            store.add_job('buena.png',self.image(),'original',{});store.run_next();store.run_next()
            self.assertEqual({j['status'] for j in store.jobs()},{'done','error'})
    def test_recover_incomplete_job(self):
        with tempfile.TemporaryDirectory() as td:
            s=Store(Path(td));j=s.add_job('x.png',self.image(),'original',{})
            s.set_status(j,'running');s2=Store(Path(td));self.assertEqual(s2.jobs()[0]['status'],'pending')
    def test_watcher_deduplicates_same_file(self):
        with tempfile.TemporaryDirectory() as td:
            s=Store(Path(td));(s.inbox/'imagen.png').write_bytes(self.image())
            self.assertEqual(s.scan_inbox(),0)
            with patch('store.time.monotonic',return_value=time.monotonic()+2):
                self.assertEqual(s.scan_inbox(),1);self.assertEqual(s.scan_inbox(),0)
            self.assertEqual(len(s.jobs()),1)
    def test_watcher_isolates_invalid_file_and_continues(self):
        with tempfile.TemporaryDirectory() as td:
            s=Store(Path(td))
            for name in ['a.png','b.png']:(s.inbox/name).write_bytes(self.image())
            s.scan_inbox();original=s.add_job
            def accept(name,*args):
                if name=='a.png':raise ValueError('La imagen supera 16 MB.')
                return original(name,*args)
            with patch('store.time.monotonic',return_value=time.monotonic()+2),patch.object(s,'add_job',side_effect=accept):
                self.assertEqual(s.scan_inbox(),1)
            self.assertEqual([j['name'] for j in s.jobs()],['b.png'])
            self.assertIn('a.png',s.last_watch_error)

    def test_watcher_defers_file_changed_during_read(self):
        with tempfile.TemporaryDirectory() as td:
            s=Store(Path(td));image=s.inbox/'imagen.png';image.write_bytes(self.image());s.scan_inbox()
            original=Path.open
            @contextmanager
            def growing(path,*args,**kwargs):
                with original(path,*args,**kwargs) as source:
                    if path==image and args and args[0]=='rb':
                        class Reader:
                            def read(self,limit):
                                data=source.read(limit)
                                with original(path,'ab') as destination:destination.write(b'new bytes')
                                return data
                        yield Reader()
                    else:yield source
            with patch('store.time.monotonic',return_value=time.monotonic()+2),patch.object(Path,'open',growing):
                self.assertEqual(s.scan_inbox(),0)
            self.assertEqual(s.jobs(),[])

    def test_worker_survives_watcher_validation_error(self):
        with tempfile.TemporaryDirectory() as td:
            s=Store(Path(td));s.save_setting('watch',True)
            s.add_job('valid.png',self.image(),'original',{})
            with patch.object(s,'scan_inbox',side_effect=ValueError('Carga todavia creciendo')):
                worker=threading.Thread(target=s.worker,daemon=True);worker.start()
                deadline=time.monotonic()+3
                while time.monotonic()<deadline and s.jobs()[0]['status']=='pending':time.sleep(.02)
                s.stop.set();worker.join(3)
            self.assertEqual(s.jobs()[0]['status'],'done')
            self.assertIn('creciendo',s.last_watch_error)

    def test_paths_cannot_escape_store(self):
        with tempfile.TemporaryDirectory() as td:
            s=Store(Path(td))
            with self.assertRaises(ValueError):s.output_path('../secreto')
            with self.assertRaises(ValueError):s.output_path('database.sqlite')

if __name__=='__main__':unittest.main()
