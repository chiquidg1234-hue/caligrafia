"""Read-only personal handwriting profiles and a shared, millimetre-based print layout.

The source libraries are never imported into Store or rewritten. Screen and PDF
consume these exact outlines and positions, rather than separate font engines.
"""
import hashlib
import json
import math
import re
import unicodedata
import uuid
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

SOURCE = Path(__file__).resolve().parent.parent / 'mi-caligrafia'
PAPERS = {'A4': (210, 297), 'A5': (148, 210), 'Carta': (215.9, 279.4)}
NOTICE = 'Primera versión revisable extraída de fotos.'


def numeric(obj, key, default, low, high):
    try:
        value = float(obj.get(key, default))
    except (TypeError, ValueError):
        raise ValueError(f'Valor inválido: {key}.')
    if not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'{key}: usa un valor entre {low} y {high}.')
    return value


def options(values=None):
    if values is None:
        values = {}
    if not isinstance(values, dict):
        raise ValueError('Las opciones del papel no son válidas.')
    paper = values.get('paper', 'A4')
    if paper not in (*PAPERS, 'custom'):
        raise ValueError('Elige papel A4, A5, Carta o personalizado.')
    width, height = ((numeric(values, 'width', 210, 70, 420), numeric(values, 'height', 297, 70, 594))
                     if paper == 'custom' else PAPERS[paper])
    ruling = values.get('ruling', 'grid')
    if ruling not in ('grid', 'lines', 'none'):
        raise ValueError('Elige cuadrícula, renglones o papel físico sin líneas.')
    leading = numeric(values, 'leading', 10, 5, 15)
    if leading not in (5, 10, 15):
        raise ValueError('El renglón debe avanzar 5, 10 o 15 mm.')
    def color(key, default):
        c = values.get(key, default)
        if not isinstance(c, str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', c):
            raise ValueError('El color no es válido: ' + key + '.')
        return c
    ink = color('ink', '#193c66')
    legacy_margin = numeric(values, 'margin', 15, 5, 40)
    result = dict(paper=paper, width=width, height=height, ruling=ruling,
                  size=numeric(values, 'size', 14, 6, 36), leading=leading,
                  margin=legacy_margin,
                  offset_x=numeric(values, 'offset_x', 0, -25, 25),
                  offset_y=numeric(values, 'offset_y', 0, -25, 25),
                  seed=int(numeric(values, 'seed', 17, 0, 2147483647)), ink=ink)
    for key in ('marginLeft', 'marginRight', 'marginTop', 'marginBottom'):
        result[key] = numeric(values, key, legacy_margin, 0, 80)
    if result['marginLeft'] + result['marginRight'] > width - 10 or result['marginTop'] + result['marginBottom'] > height - 10:
        raise ValueError('Los márgenes dejan muy poco espacio para escribir.')
    for length, before, after, shift in ((width, result['marginLeft'], result['marginRight'], result['offset_x']),
                                         (height, result['marginTop'], result['marginBottom'], result['offset_y'])):
        if before + shift < 0 or length - after + shift > length:
            raise ValueError('El desplazamiento deja el texto fuera del papel. Aumenta el margen o reduce el desplazamiento.')
    result.update(gridMm=numeric(values, 'gridMm', 5, 2, 15),
                  gridOriginX=numeric(values, 'gridOriginX', 0, -25, 25),
                  gridOriginY=numeric(values, 'gridOriginY', 0, -25, 25),
                  gridColor=color('gridColor', '#dce6ef'), paperColor=color('paperColor', '#ffffff'),
                  marginLineColor=color('marginLineColor', '#cf8e96'),
                  marginLineX=numeric(values, 'marginLineX', result['marginLeft'], 0, width))
    if not isinstance(values.get('marginLine', False), bool):
        raise ValueError('La línea de margen debe estar activada o desactivada.')
    result['marginLine'] = values.get('marginLine', False)
    return result


def source_file(folder, filename):
    """Only a direct font or library child is downloadable; never a photo."""
    if not isinstance(filename, str) or not filename or '/' in filename or '\\' in filename:
        raise ValueError('Ruta no permitida.')
    if Path(filename).suffix.lower() not in ('.ttf', '.trazo'):
        raise ValueError('Solo están disponibles la fuente y la biblioteca de caligrafía.')
    root = Path(folder).resolve()
    target = (root / filename).resolve()
    if target.parent != root:
        raise ValueError('Ruta no permitida.')
    return target


def read_profiles(folder=SOURCE):
    folder = Path(folder)
    manifest = folder / 'perfiles.json'
    if not manifest.is_file():
        return {'version': 1, 'grid': 5, 'notice': NOTICE, 'profiles': [],
                'message': 'Todavía no hay perfiles personales. Aparecerán aquí cuando estén listos.'}
    try:
        data = json.loads(manifest.read_text(encoding='utf-8-sig'))
    except (OSError, ValueError) as exc:
        raise ValueError('No se pudo leer perfiles.json. Conserva tus archivos y vuelve a intentarlo.') from exc
    if not isinstance(data, dict) or data.get('version') != 1 or not isinstance(data.get('profiles'), list):
        raise ValueError('El manifiesto personal no tiene un formato compatible.')
    profiles = []
    seen = set()
    for raw in data['profiles']:
        if not isinstance(raw, dict):
            raise ValueError('Hay un perfil personal inválido.')
        pid = raw.get('id')
        if not isinstance(pid, str) or not re.fullmatch(r'[a-z0-9_-]{1,40}', pid) or pid in seen:
            raise ValueError('Hay un identificador de perfil inválido o repetido.')
        seen.add(pid)
        library = source_file(folder, raw.get('library'))
        font = source_file(folder, raw.get('font'))
        if library.suffix.lower() != '.trazo' or font.suffix.lower() != '.ttf':
            raise ValueError('El perfil debe enlazar una biblioteca .trazo y una fuente .ttf.')
        if not library.is_file() or not font.is_file():
            raise ValueError(f'Falta la fuente o la biblioteca del perfil «{pid}».')
        try:
            lib = json.loads(library.read_text(encoding='utf-8-sig'))
        except (OSError, ValueError) as exc:
            raise ValueError(f'No se pudo leer la biblioteca «{pid}».') from exc
        if not isinstance(lib, dict) or lib.get('type') != 'trazo-library' or lib.get('version') != 2 or not isinstance(lib.get('samples'), list):
            raise ValueError('La biblioteca personal debe usar el formato trazo-library versión 2.')
        samples = []
        ids = set()
        for index, item in enumerate(lib['samples']):
            if not isinstance(item, dict):
                raise ValueError('Una muestra personal no es válida.')
            char = unicodedata.normalize('NFC', str(item.get('char', '')))
            sid = str(item.get('id') or f'{pid}-{index}')
            paths = item.get('paths')
            if len(char) != 1 or char.isspace() or ord(char) < 32 or sid in ids or len(sid) > 160:
                raise ValueError('Una muestra tiene una letra o identificador inválido.')
            if not isinstance(paths, list) or not paths:
                raise ValueError('Una muestra no contiene contornos.')
            clean = []
            for path in paths:
                if not isinstance(path, list) or len(path) < 3:
                    raise ValueError('Un contorno personal no es válido.')
                points = []
                for point in path:
                    if not isinstance(point, (list, tuple)) or len(point) != 2:
                        raise ValueError('Un punto personal no es válido.')
                    try:
                        x, y = map(float, point)
                    except (ValueError, TypeError):
                        raise ValueError('Un punto personal no es válido.')
                    if not all(math.isfinite(v) and abs(v) <= 10000 for v in (x, y)):
                        raise ValueError('Un punto personal está fuera de escala.')
                    points.append([x, y])
                clean.append(points)
            advance = numeric(item, 'advance', 500, 20, 10000)
            samples.append({'id': sid, 'char': char, 'label': str(item.get('label', char))[:120],
                            'paths': clean, 'advance': advance})
            ids.add(sid)
        if not samples:
            raise ValueError(f'La biblioteca «{pid}» no contiene muestras.')
        characters = sorted({sample['char'] for sample in samples})
        profiles.append({'id': pid, 'name': str(raw.get('name', pid))[:100],
                         'font': font.name, 'library': library.name, 'characters': characters,
                         'count': len(samples), 'missing': raw.get('missing', []), 'samples': samples,
                         'font_url': '/personal/files/' + font.name,
                         'library_url': '/personal/files/' + library.name})
    return {'version': 1, 'grid': 5, 'notice': NOTICE, 'profiles': profiles}


def grid_lines(opts):
    """Paper geometry is independent of line advance; legacy documents use 5mm."""
    if opts['ruling'] == 'none':
        return {'vertical': [], 'horizontal': []}
    def positions(length, origin):
        step = opts['gridMm']; start = origin % step
        if abs(start) < 1e-9: start = step
        return [round(start + i * step, 6) for i in range(math.ceil(length / step) + 1) if start + i * step < length]
    return {'vertical': positions(opts['width'], opts['gridOriginX']) if opts['ruling'] == 'grid' else [],
            'horizontal': positions(opts['height'], opts['gridOriginY'])}


def styled_text(text, ranges, ink):
    if ranges is None: ranges = []
    if not isinstance(ranges, list) or len(ranges) > 12000:
        raise ValueError('El formato del texto no es válido.')
    styles = [dict(bold=False, italic=False, color=ink) for _ in text]
    for span in ranges:
        if not isinstance(span, dict): raise ValueError('Un rango de formato no es válido.')
        start, end = span.get('start'), span.get('end')
        if type(start) is not int or type(end) is not int or not 0 <= start <= end <= len(text):
            raise ValueError('El rango de formato está fuera del texto.')
        update = {}
        for flag in ('bold', 'italic'):
            if flag in span:
                if not isinstance(span[flag], bool): raise ValueError('El formato de letra no es válido.')
                update[flag] = span[flag]
        if 'color' in span:
            if not isinstance(span['color'], str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', span['color']):
                raise ValueError('El color del texto no es válido.')
            update['color'] = span['color']
        for index in range(start, end): styles[index].update(update)
    result, final = [], []
    i = 0
    while i < len(text):
        j = i + 1
        if text[i:i+2] == '\r\n': j += 1; value = '\n'
        elif text[i] == '\r': value = '\n'
        elif text[i] == '\t': value = '    '
        else:
            while j < len(text) and unicodedata.combining(text[j]): j += 1
            value = unicodedata.normalize('NFC', text[i:j])
        result.append(value); final.extend([dict(styles[i]) for _ in value]); i = j
    return ''.join(result), final


def make_layout(profile, text, values=None, styles=None):
    opts = options(values)
    if not isinstance(text, str) or len(text) > 12000:
        raise ValueError('Escribe un texto de hasta 12 000 caracteres.')
    text, character_styles = styled_text(text, styles, opts['ink'])
    variants = {}
    for sample in profile['samples']:
        variants.setdefault(sample['char'], []).append(sample)
    missing = sorted({char for char in text if char not in ' \n' and char not in variants})
    result = {'version': 1, 'profile': profile['id'], 'name': profile['name'],
              'options': opts, 'grid_mm': opts['gridMm'], 'grid': grid_lines(opts), 'missing': missing,
              'scale_mm': opts['size'] * 25.4 / 72 / 1000,
              'samples': [], 'pages': [{'glyphs': []}], 'characters': len(text)}
    if missing:
        return result
    scale = result['scale_mm']
    # Include descenders and side bearings when keeping the text on the sheet.
    cache = {}
    def geometry(sample, style):
        key = (sample['id'], style['bold'], style['italic'])
        if key not in cache:
            paths = [[[x + (y * .18 if style['italic'] else 0), y] for x, y in path] for path in sample['paths']]
            sid = sample['id'] + (f'-b{int(style["bold"])}i{int(style["italic"])}' if style['bold'] or style['italic'] else '')
            cache[key] = {**sample, 'id': sid, 'paths': paths}
        return cache[key]
    combos = {(s['bold'], s['italic']) for s in character_styles} or {(False, False)}
    allpoints = []
    for sample in profile['samples']:
        for bold, italic in combos:
            for path in geometry(sample, {'bold': bold, 'italic': italic})['paths']:
                for x, y in path:
                    radius = 24 if bold else 0
                    allpoints.extend(((x-radius, y-radius), (x+radius, y+radius)))
    ascent = max(0, max(p[1] for p in allpoints)) * scale
    descent = max(0, -min(p[1] for p in allpoints)) * scale
    left_bearing = min(0, min(p[0] for p in allpoints)) * scale
    start = opts['marginLeft'] + opts['offset_x'] - left_bearing
    right = opts['width'] - opts['marginRight'] + opts['offset_x']
    phase = opts['gridOriginY'] % opts['gridMm']
    first_y = phase + math.ceil((opts['marginTop'] + ascent - phase) / opts['gridMm']) * opts['gridMm'] + opts['offset_y']
    bottom = opts['height'] - opts['marginBottom'] + opts['offset_y']
    if first_y + descent > bottom:
        raise ValueError('El tamaño de letra y los márgenes no dejan espacio para escribir.')
    x, y, sequence = start, first_y, 0
    selected = {}
    pages = result['pages']
    space = 320 * scale
    previous_bottom, current_bottom = None, None

    def newline():
        nonlocal x, y, previous_bottom, current_bottom
        if current_bottom is not None: previous_bottom = current_bottom
        current_bottom = None
        x = start
        y += opts['leading']
        if y + descent > bottom + 1e-8:
            if len(pages) >= 200:
                raise ValueError('El texto supera 200 páginas. Reduce el texto o el tamaño de letra.')
            pages.append({'glyphs': []})
            y = first_y
            previous_bottom = None

    for match in re.finditer(r'\n| +|[^ \n]+', text):
        token = match.group()
        if token == '\n':
            newline()
            continue
        if token.isspace():
            x += len(token) * space
            continue
        run = []
        for position, char in enumerate(token, match.start()):
            choices = variants[char]
            digest = hashlib.sha256(f'{opts["seed"]}:{sequence}:{char}'.encode()).digest()
            sample = choices[int.from_bytes(digest[:8], 'big') % len(choices)]
            style = character_styles[position]
            sample = geometry(sample, style)
            sequence += 1
            max_x = max(point[0] for path in sample['paths'] for point in path) + (24 if style['bold'] else 0)
            run.append((char, sample, max(sample['advance'], max_x) * scale, style))
        word_width = sum(sample['advance'] * scale for _, sample, _, _ in run[:-1]) + run[-1][2]
        if x > start and x + word_width > right:
            newline()
        for char, sample, visual_width, style in run:
            if visual_width > right - start:
                raise ValueError(f'La muestra «{char}» no cabe. Reduce el tamaño o el margen.')
            if x > start and x + visual_width > right:
                newline()
            ys = [p[1] for path in sample['paths'] for p in path]
            radius = 24 if style['bold'] else 0
            ink_top = y - (max(ys) + radius) * scale
            ink_bottom = y - (min(ys) - radius) * scale
            if previous_bottom is not None and ink_top < previous_bottom - 1e-8:
                raise ValueError('Aumenta el interlineado del renglón o reduce el tamaño: las líneas se superponen.')
            current_bottom = max(current_bottom if current_bottom is not None else ink_bottom, ink_bottom)
            pages[-1]['glyphs'].append({'id': sample['id'], 'char': char, 'x_mm': x, 'y_mm': y,
                                       'style': dict(style), 'stroke_mm': 48 * scale if style['bold'] else 0})
            selected[sample['id']] = sample
            x += sample['advance'] * scale
    # A final line break never adds an empty printable sheet.
    if len(pages) > 1 and not pages[-1]['glyphs']:
        pages.pop()
    result['samples'] = list(selected.values())
    return result


def write_pdf(layout, target):
    if layout['missing']:
        raise ValueError('Faltan muestras para: ' + ' '.join(layout['missing']) + '. No se sustituyen por otra letra.')
    if not any(page['glyphs'] for page in layout['pages']):
        raise ValueError('Escribe al menos una letra con muestra para preparar el PDF.')
    opts = layout['options']
    width, height = opts['width'], opts['height']
    pdf = canvas.Canvas(str(target), pagesize=(width * mm, height * mm))
    pdf.setTitle('Trazo · ' + layout['name'])
    pdf.setAuthor('Trazo local')
    samples = {sample['id']: sample for sample in layout['samples']}
    for page in layout['pages']:
        pdf.setFillColor(HexColor(opts['paperColor']))
        pdf.rect(0, 0, width * mm, height * mm, stroke=0, fill=1)
        pdf.setStrokeColor(HexColor(opts['gridColor']))
        pdf.setLineWidth(.16 * mm)
        for x in layout['grid']['vertical']:
            pdf.line(x * mm, 0, x * mm, height * mm)
        for y in layout['grid']['horizontal']:
            pdf.line(0, (height - y) * mm, width * mm, (height - y) * mm)
        if opts['marginLine']:
            pdf.setStrokeColor(HexColor(opts['marginLineColor'])); pdf.setLineWidth(.25 * mm)
            pdf.line(opts['marginLineX'] * mm, 0, opts['marginLineX'] * mm, height * mm)
        pdf.setLineJoin(1); pdf.setLineCap(1)
        for glyph in page['glyphs']:
            color = HexColor(glyph.get('style', {}).get('color', opts['ink']))
            pdf.setFillColor(color); pdf.setStrokeColor(color)
            stroke = glyph.get('stroke_mm', 0)
            pdf.setLineWidth(max(stroke, .001) * mm)
            outline = pdf.beginPath()
            for points in samples[glyph['id']]['paths']:
                for index, (px, py) in enumerate(points):
                    x = (glyph['x_mm'] + px * layout['scale_mm']) * mm
                    y = (height - glyph['y_mm'] + py * layout['scale_mm']) * mm
                    (outline.moveTo if index == 0 else outline.lineTo)(x, y)
                outline.close()
            pdf.drawPath(outline, stroke=int(stroke > 0), fill=1, fillMode=0)
        pdf.showPage()
    pdf.save()


def write_calibration(target, values=None):
    opts = options(values)
    w, h = opts['width'], opts['height']
    pdf = canvas.Canvas(str(target), pagesize=(w * mm, h * mm))
    pdf.setTitle('Trazo · Prueba de impresión de 5 mm')
    title = 'Trazo - prueba de impresion'
    instructions = ('Imprime al 100 % o "Tamano real".',
                    'Desactiva "Ajustar a pagina" y mide con una regla.',
                    'El cuadrado debe medir 50 x 50 mm.',
                    'Cada lado contiene 10 celdas de 5 mm.')
    notes = ('Para papel ya cuadriculado: elige "Sin lineas" en Trazo.',
             'Ajusta X e Y para mover el texto sobre tu cuaderno.')
    text_x = min(20, (w - 50) / 2)
    text_width = (w - 2 * text_x) * mm
    titles = simpleSplit(title, 'Helvetica-Bold', 16, text_width)
    intro = [line for text in instructions for line in simpleSplit(text, 'Helvetica', 10, text_width)]
    footer = [line for text in notes for line in simpleSplit(text, 'Helvetica', 9, text_width)]
    intro_top = 35 + (len(titles) - 1) * 7
    top = max(75, intro_top + (len(intro) - 1) * 6 + 14)
    footer_top = max(155, top + 80)
    compact = footer_top + (len(footer) - 1) * 6 + 5 > h
    x = min(25, (w - 50) / 2)
    pdf.setFillColor(HexColor('#193c66'))
    if compact:
        # A 70 mm sheet still holds the full physical square and its label.
        # Move the instructions to a second sheet instead of scaling the ruler.
        top = 11
        pdf.setFont('Helvetica-Bold', 10)
        pdf.drawString(5 * mm, (h - 7) * mm, title)
    else:
        pdf.setFont('Helvetica-Bold', 16)
        for index, line in enumerate(titles):
            pdf.drawString(text_x * mm, (h - 25 - index * 7) * mm, line)
        pdf.setFont('Helvetica', 10)
        for index, line in enumerate(intro):
            pdf.drawString(text_x * mm, (h - intro_top - index * 6) * mm, line)
    pdf.setStrokeColor(HexColor('#193c66'))
    for index in range(11):
        pdf.setLineWidth((.35 if index in (0, 10) else .15) * mm)
        step = index * 5
        pdf.line((x + step) * mm, (h - top) * mm, (x + step) * mm, (h - top - 50) * mm)
        pdf.line(x * mm, (h - top - step) * mm, (x + 50) * mm, (h - top - step) * mm)
    pdf.setFont('Helvetica', 8 if compact else 9)
    pdf.drawString(x * mm, (h - top - (55 if compact else 58)) * mm, '50 mm = 10 celdas x 5 mm')
    if compact:
        pdf.showPage()
        pdf.setFillColor(HexColor('#193c66'))
        pdf.setFont('Helvetica-Bold', 10)
        pdf.drawString(5 * mm, (h - 7) * mm, 'Trazo - guia de impresion')
        pdf.setFont('Helvetica', 9)
        cursor = 15
        for index, text in enumerate((*instructions, *notes)):
            for line in simpleSplit(text, 'Helvetica', 9, (w - 10) * mm):
                pdf.drawString(5 * mm, (h - cursor) * mm, line)
                cursor += 4.2
            if index == len(instructions) - 1:
                cursor += 4
    else:
        pdf.setFont('Helvetica', 9)
        for index, line in enumerate(footer):
            pdf.drawString(text_x * mm, (h - footer_top - index * 6) * mm, line)
    pdf.save()


class PersonalStudio:
    def __init__(self, data_dir, source_dir=SOURCE):
        self.source = Path(source_dir)
        self.output = Path(data_dir) / 'personal-pages'

    def state(self):
        return read_profiles(self.source)

    def layout(self, obj):
        profile = next((p for p in self.state()['profiles'] if p['id'] == obj.get('profile')), None)
        if profile is None:
            raise ValueError('Elige un perfil personal disponible.')
        return make_layout(profile, obj.get('text', ''), obj.get('options'), obj.get('styles'))

    def compose(self, obj):
        layout = self.layout(obj)
        if layout['missing']:
            raise ValueError('Faltan muestras para: ' + ' '.join(layout['missing']) + '. No se sustituyen por otra letra.')
        if not any(p['glyphs'] for p in layout['pages']):
            raise ValueError('Escribe al menos una letra con muestra para preparar el PDF.')
        pid, target = self.new_page()
        write_pdf(layout, target)
        return {'layout': layout, 'pages': len(layout['pages']), 'url': f'/personal/pages/{pid}/pagina.pdf'}

    def new_page(self):
        pid = uuid.uuid4().hex
        folder = self.output / pid
        folder.mkdir(parents=True)
        return pid, folder / 'pagina.pdf'

    def calibration(self, obj):
        opts = options(obj.get('options'))
        pid, target = self.new_page()
        write_calibration(target, opts)
        return {'url': f'/personal/pages/{pid}/pagina.pdf', 'grid_mm': 5, 'square_mm': 50}

    def page_path(self, relative):
        if not re.fullmatch(r'[0-9a-f]{32}/pagina\.pdf', relative):
            raise ValueError('Ruta de impresión no permitida.')
        root = self.output.resolve()
        target = (root / relative).resolve()
        if not target.is_relative_to(root):
            raise ValueError('Ruta de impresión no permitida.')
        return target
