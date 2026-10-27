import http.client
import json
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'vendor'), str(ROOT)]
import personal
from server import make_server
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas


def fixture_profile():
    return {'id': 'original', 'name': 'Mi letra Original', 'samples': [
        {'id': 'a-1', 'char': 'a', 'paths': [[[20, 0], [220, 650], [450, 0]], [[140, 100], [210, 300], [270, 100]]], 'advance': 500},
        {'id': 'a-2', 'char': 'a', 'paths': [[[30, 0], [270, 600], [480, 0]]], 'advance': 530},
        {'id': 'g-1', 'char': 'g', 'paths': [[[-20, 400], [300, 400], [280, -270], [90, -270]]], 'advance': 420},
        {'id': 'acute-1', 'char': 'á', 'paths': [[[20, 0], [220, 800], [450, 0]]], 'advance': 500},
    ]}


def write_fixture(folder):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'Original.ttf').write_bytes(b'fixture-font-not-for-rendering')
    (folder / 'Original.trazo').write_text(json.dumps({'type': 'trazo-library', 'version': 2,
        'name': 'Mi letra Original', 'samples': fixture_profile()['samples']}), encoding='utf-8')
    (folder / 'perfiles.json').write_text(json.dumps({'version': 1, 'grid': 5,
        'profiles': [{'id': 'original', 'name': 'Mi letra Original', 'font': 'Original.ttf',
                      'library': 'Original.trazo', 'characters': ['a', 'g', 'á'], 'count': 4, 'missing': ['z']}]}), encoding='utf-8')


class LayoutTests(unittest.TestCase):
    def test_grid_stays_five_mm_when_line_advance_changes(self):
        layouts = [personal.make_layout(fixture_profile(), 'a\na', {'leading': leading}) for leading in (5, 10, 15)]
        for leading, layout in zip((5, 10, 15), layouts):
            self.assertEqual(layout['grid_mm'], 5)
            self.assertEqual(layout['grid']['vertical'][:4], [5, 10, 15, 20])
            self.assertEqual(layout['grid']['horizontal'][:4], [5, 10, 15, 20])
            self.assertEqual(layout['pages'][0]['glyphs'][1]['y_mm'] - layout['pages'][0]['glyphs'][0]['y_mm'], leading)
        self.assertEqual(layouts[0]['grid'], layouts[2]['grid'])

    def test_descenders_stay_below_baseline_and_inside_bottom_margin(self):
        layout = personal.make_layout(fixture_profile(), 'g\n' * 100, {'paper': 'A5', 'margin': 15, 'leading': 5})
        scale = layout['scale_mm']
        for page in layout['pages']:
            for glyph in page['glyphs']:
                self.assertGreater(glyph['y_mm'] - (-270) * scale, glyph['y_mm'])
                self.assertLessEqual(glyph['y_mm'] + 270 * scale, 195 + 1e-8)
                self.assertGreaterEqual(glyph['x_mm'] - 20 * scale, 15 - 1e-8)

    def test_pdf_and_canvas_use_the_same_outlines_positions_and_evenodd_fill(self):
        layout = personal.make_layout(fixture_profile(), 'aga', {'seed': 9})
        source = (ROOT / 'static' / 'personal.js').read_text(encoding='utf-8')
        draw = source[source.index('function drawPage()'):source.index('function downloadResult(')]
        harness = r"""
const vm=require('node:vm'),points=[],fills=[],nodes={};
const ctx={setTransform(){},fillRect(){},beginPath(){},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},closePath(){},stroke(){},fill(mode){fills.push(mode);}};
const canvas={getContext:()=>ctx,setAttribute(){}};
const $=id=>id==='personal-canvas'?canvas:(nodes[id]||(nodes[id]={}));
const layout=LAYOUT;layout.grid={vertical:[],horizontal:[]};
const context={layout,pageIndex:0,$,window:{devicePixelRatio:1},pendingPreview:false,currentProfile:()=>({})};
vm.createContext(context);vm.runInContext(SOURCE+';drawPage();',context);
process.stdout.write(JSON.stringify({points,fills}));
""".replace('LAYOUT', json.dumps(layout)).replace('SOURCE', json.dumps(draw))
        screen = json.loads(subprocess.check_output(['node', '-e', harness], encoding='utf-8'))
        printed, modes = [], []
        original = Canvas.drawPath

        def record(pdf, path, *args, **kwargs):
            printed.append(path.getCode())
            modes.append(kwargs.get('fillMode'))
            return original(pdf, path, *args, **kwargs)
        with tempfile.TemporaryDirectory() as td, patch.object(Canvas, 'drawPath', record):
            personal.write_pdf(layout, Path(td) / 'page.pdf')
        import re
        coords = []
        for code in printed:
            coords.extend([[float(x) / mm, layout['options']['height'] - float(y) / mm]
                           for x, y in re.findall(r'(-?[\d.]+) (-?[\d.]+) [ml]', code)])
        self.assertEqual(len(coords), len(screen['points']))
        for actual, expected in zip(coords, screen['points']):
            for a, b in zip(actual, expected):
                self.assertAlmostEqual(a, b, places=4)
        self.assertEqual(set(modes), {0})
        self.assertEqual(set(screen['fills']), {'evenodd'})

    def test_variants_are_deterministic_and_seed_changes_them(self):
        first = personal.make_layout(fixture_profile(), 'a' * 200, {'seed': 17})
        again = personal.make_layout(fixture_profile(), 'a' * 200, {'seed': 17})
        changed = personal.make_layout(fixture_profile(), 'a' * 200, {'seed': 18})
        self.assertEqual(first, again)
        self.assertNotEqual(first['pages'], changed['pages'])
        self.assertEqual(set(g['id'] for p in first['pages'] for g in p['glyphs']), {'a-1', 'a-2'})

    def test_missing_characters_block_pdf_without_fallback(self):
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / 'missing.pdf'
            layout = personal.make_layout(fixture_profile(), 'az🙂')
            self.assertEqual(layout['missing'], ['z', '🙂'])
            self.assertEqual(layout['samples'], [])
            with self.assertRaisesRegex(ValueError, 'Faltan muestras'):
                personal.write_pdf(layout, target)
            self.assertFalse(target.exists())

    def test_normalized_accents_and_whitespace_are_supported(self):
        layout = personal.make_layout(fixture_profile(), 'a\tga\r\na\u0301')
        self.assertFalse(layout['missing'])
        self.assertEqual(''.join(g['char'] for p in layout['pages'] for g in p['glyphs']), 'agaá')

    def test_multiple_pages_and_actual_pdf_media_size_match(self):
        from pypdf import PdfReader
        layout = personal.make_layout(fixture_profile(), 'ag ag\n' * 100, {'paper': 'A5', 'leading': 10})
        self.assertGreater(len(layout['pages']), 1)
        with tempfile.TemporaryDirectory() as td:
            file = Path(td) / 'multipage.pdf'; personal.write_pdf(layout, file)
            pdf = PdfReader(file)
            self.assertEqual(len(pdf.pages), len(layout['pages']))
            self.assertAlmostEqual(float(pdf.pages[0].mediabox.width) / mm, 148, places=4)
            self.assertAlmostEqual(float(pdf.pages[0].mediabox.height) / mm, 210, places=4)

    def test_no_lines_and_offsets_only_move_text(self):
        first = personal.make_layout(fixture_profile(), 'ag', {'margin': 20})
        shifted = personal.make_layout(fixture_profile(), 'ag', {'margin': 20, 'offset_x': 2.5, 'offset_y': -1.5})
        for old, new in zip(first['pages'][0]['glyphs'], shifted['pages'][0]['glyphs']):
            self.assertAlmostEqual(new['x_mm'] - old['x_mm'], 2.5)
            self.assertAlmostEqual(new['y_mm'] - old['y_mm'], -1.5)
        self.assertEqual(first['grid'], shifted['grid'])
        self.assertEqual(personal.make_layout(fixture_profile(), 'a', {'ruling': 'none'})['grid'], {'vertical': [], 'horizontal': []})

    def test_invalid_print_values_are_rejected(self):
        for values in ({'leading': 7}, {'size': float('nan')}, {'paper': 'huge'}, {'offset_x': -25}, {'ink': 'red'}):
            with self.subTest(values=values), self.assertRaises(ValueError):
                personal.make_layout(fixture_profile(), 'a', values)


class SourceTests(unittest.TestCase):
    def test_no_profile_shows_empty_state_without_invented_samples(self):
        with tempfile.TemporaryDirectory() as td:
            self.assertEqual(personal.read_profiles(td)['profiles'], [])

    def test_library_is_read_without_rewriting_source_and_real_coverage_wins(self):
        with tempfile.TemporaryDirectory() as td:
            folder = Path(td); write_fixture(folder)
            before = {f.name: f.read_bytes() for f in folder.iterdir()}
            data = personal.read_profiles(folder)
            self.assertEqual(data['profiles'][0]['count'], 4)
            self.assertEqual(data['profiles'][0]['characters'], ['a', 'g', 'á'])
            self.assertEqual(before, {f.name: f.read_bytes() for f in folder.iterdir()})

    def test_only_direct_font_and_library_paths_are_allowed(self):
        with tempfile.TemporaryDirectory() as td:
            folder = Path(td)
            for invalid in ('../secret.ttf', '..\\secret.ttf', 'sub/font.ttf', 'photo.jpg', 'perfiles.json', '/font.ttf', 'C:\\font.ttf'):
                with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                    personal.source_file(folder, invalid)
            self.assertEqual(personal.source_file(folder, 'Original.ttf'), folder / 'Original.ttf')
            self.assertEqual(personal.source_file(folder, 'Original.trazo'), folder / 'Original.trazo')

    def test_symlink_outside_source_is_blocked_if_supported(self):
        with tempfile.TemporaryDirectory() as td:
            folder = Path(td) / 'source'; folder.mkdir()
            outside = Path(td) / 'outside.ttf'; outside.write_bytes(b'x')
            try:
                (folder / 'link.ttf').symlink_to(outside)
            except OSError:
                self.skipTest('This Windows account cannot create symlinks.')
            with self.assertRaises(ValueError):
                personal.source_file(folder, 'link.ttf')

    def test_calibration_is_exactly_ten_cells_of_five_mm(self):
        calls = []
        original = Canvas.line
        def record(pdf, x1, y1, x2, y2):
            calls.append([v / mm for v in (x1, y1, x2, y2)])
            return original(pdf, x1, y1, x2, y2)
        with tempfile.TemporaryDirectory() as td, patch.object(Canvas, 'line', record):
            personal.write_calibration(Path(td) / 'scale.pdf', {'paper': 'A5'})
        self.assertEqual(len(calls), 22)
        vertical = calls[::2]
        self.assertEqual([round(line[0], 6) for line in vertical], list(range(25, 76, 5)))
        for line in calls:
            self.assertAlmostEqual(abs(line[2] - line[0]) + abs(line[3] - line[1]), 50)


class PersonalServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.source = Path(cls.tmp.name) / 'source'; write_fixture(cls.source)
        cls.server = make_server(Path(cls.tmp.name) / 'data', 0, cls.source)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()
        cls.port = cls.server.server_port
        cls.token = cls.request('GET', '/api/personal')[1]['token']

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join(); cls.tmp.cleanup()

    @classmethod
    def request(cls, method, path, obj=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', cls.port, timeout=15)
        body = json.dumps(obj) if obj is not None else None
        connection.request(method, path, body=body, headers=headers or {})
        response = connection.getresponse(); data = response.read(); status = response.status; connection.close()
        try:
            return status, json.loads(data)
        except ValueError:
            return status, data

    def post(self, path, body):
        return self.request('POST', path, body, {'X-Trazo-Key': self.token, 'Content-Type': 'application/json'})

    def test_local_auth_host_and_origin_protect_personal_actions(self):
        self.assertEqual(self.request('POST', '/api/personal/compose', {})[0], 403)
        self.assertEqual(self.request('GET', '/api/personal', headers={'Host': 'example.org'})[0], 403)
        self.assertEqual(self.request('POST', '/api/personal/calibration', {}, {'X-Trazo-Key': self.token, 'Origin': 'https://example.org'})[0], 403)

    def test_composition_uses_separate_unique_outputs_and_preview_matches(self):
        body = {'profile': 'original', 'text': 'ag ag', 'options': {'seed': 42}}
        previous = len(list((Path(self.tmp.name) / 'data' / 'personal-pages').glob('*/pagina.pdf')))
        status, preview = self.post('/api/personal/layout', body); self.assertEqual(status, 200)
        status, result = self.post('/api/personal/compose', body); self.assertEqual(status, 200)
        self.assertEqual(result['layout'], preview)
        self.assertTrue(self.request('GET', result['url'])[1].startswith(b'%PDF'))
        again = self.post('/api/personal/compose', body)[1]
        self.assertNotEqual(again['url'], result['url'])
        self.assertEqual(len(list((Path(self.tmp.name) / 'data' / 'personal-pages').glob('*/pagina.pdf'))), previous + 2)
        self.assertEqual(self.server.store.samples(), [])

    def test_missing_text_creates_no_output(self):
        before = list((Path(self.tmp.name) / 'data' / 'personal-pages').glob('*/pagina.pdf'))
        status, result = self.post('/api/personal/compose', {'profile': 'original', 'text': 'z'})
        self.assertEqual(status, 400); self.assertIn('Faltan muestras', result['error'])
        self.assertEqual(before, list((Path(self.tmp.name) / 'data' / 'personal-pages').glob('*/pagina.pdf')))

    def test_source_downloads_allow_font_and_library_but_block_photos_and_traversal(self):
        self.assertEqual(self.request('GET', '/personal/files/Original.ttf')[0], 200)
        self.assertEqual(self.request('GET', '/personal/files/Original.trazo')[0], 200)
        for url in ('/personal/files/../perfiles.json', '/personal/files/photo.png', '/personal/files/sub/Original.ttf', '/personal/pages/../database.sqlite'):
            self.assertEqual(self.request('GET', url)[0], 400)

    def test_new_page_and_calibration_are_accessible(self):
        self.assertEqual(self.request('GET', '/personal.html')[0], 200)
        status, result = self.post('/api/personal/calibration', {'options': {'paper': 'A5'}})
        self.assertEqual(status, 200); self.assertEqual(result['square_mm'], 50)
        self.assertTrue(self.request('GET', result['url'])[1].startswith(b'%PDF'))


if __name__ == '__main__':
    unittest.main()
