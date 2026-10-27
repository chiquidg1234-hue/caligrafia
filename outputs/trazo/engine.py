"""Local handwriting capture, TrueType generation and print production."""
import io, json, math, re, unicodedata, uuid
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageOps, UnidentifiedImageError
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import mm

CHARS='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZñÑáéíóúüÁÉÍÓÚÜ0123456789.,;:!?¿¡()-+=\"\'/'
PPM=6
Image.MAX_IMAGE_PIXELS=24_000_000

def number(options,key,default,low,high):
    try: v=float(options.get(key,default))
    except (ValueError,TypeError): raise ValueError(f'Valor inválido: {key}.')
    if not math.isfinite(v) or not low<=v<=high: raise ValueError(f'{key}: usa un valor entre {low} y {high}.')
    return v

def load_image(data):
    try:
        im=Image.open(io.BytesIO(data))
        if im.width*im.height>24_000_000: raise ValueError('La imagen supera 24 megapíxeles. Reduce su tamaño.')
        if im.width<4 or im.height<4: raise ValueError('La imagen es demasiado pequeña.')
        im=ImageOps.exif_transpose(im); im.load()
        return im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB')
    except (UnidentifiedImageError,OSError,Image.DecompressionBombError) as exc:
        raise ValueError('No se pudo leer la imagen. Usa PNG, JPG o WebP.') from exc

def white_rgb(im):
    if im.mode=='RGBA':
        bg=Image.new('RGBA',im.size,'white'); bg.alpha_composite(im); return bg.convert('RGB')
    return im.convert('RGB')

def ink_mask(im,threshold=190):
    return (np.asarray(white_rgb(im).convert('L'))<threshold).astype('uint8')*255

def outlines(mask,tolerance=0.35):
    contours,_=cv2.findContours(mask,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    result=[]
    for contour in contours:
        if abs(cv2.contourArea(contour))<1: continue
        pts=cv2.approxPolyDP(contour,float(tolerance),True).reshape(-1,2)
        if len(pts)>=3: result.append(pts.tolist())
    return result

def page_options(options):
    w=number(options,'width',210,70,420); h=number(options,'height',297,70,594)
    margin=number(options,'margin',18,5,60)
    if 2*margin>=min(w,h)-10: raise ValueError('Los márgenes dejan muy poco espacio para imprimir.')
    return w,h,margin

def image_pdf(im,target,options):
    w,h,margin=page_options(options); c=canvas.Canvas(str(target),pagesize=(w*mm,h*mm))
    c.setTitle('Trazo · Dibujo para imprimir')
    availw=(w-2*margin)*mm; availh=(h-2*margin)*mm
    scale=min(availw/im.width,availh/im.height)
    c.drawImage(ImageReader(im),(w*mm-im.width*scale)/2,(h*mm-im.height*scale)/2,
                width=im.width*scale,height=im.height*scale,mask='auto')
    c.save()
    return round(im.width*25.4/(im.width*scale/mm),1)

def process_drawing(data,target,mode='original',options=None):
    options=options or {}; target=Path(target); target.mkdir(parents=True,exist_ok=True)
    if mode not in ('original','clean','vector'): raise ValueError('Modo de dibujo desconocido.')
    im=load_image(data)
    result={'mode':mode,'width':im.width,'height':im.height,'image':'imagen.png','pdf':'imprimir.pdf'}
    if mode=='original':
        result['note']='Píxeles conservados tras orientar la foto. La impresión depende del papel y la impresora.'
    else:
        mask=ink_mask(im,int(number(options,'threshold',190,40,250)))
        if not np.any(mask): raise ValueError('No se detectaron trazos oscuros. Prueba otro umbral o el modo Fiel.')
        im=Image.fromarray(255-mask)
        result['note']='Conversión a blanco y negro; cambia el color y la textura del original.'
        if mode=='vector':
            paths=outlines(mask,number(options,'tolerance',0.35,0,4))
            if sum(len(p) for p in paths)>350_000: raise ValueError('Demasiados contornos. Usa una imagen más pequeña o el modo Fiel.')
            d=' '.join('M'+' L'.join(f'{x},{y}' for x,y in p)+' Z' for p in paths)
            svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{im.width}" height="{im.height}" viewBox="0 0 {im.width} {im.height}"><path fill="black" fill-rule="evenodd" d="{d}"/></svg>'
            (target/'trazos.svg').write_text(svg,encoding='utf-8'); result['svg']='trazos.svg'
            result['contours']=len(paths); result['note']='Contornos editables en blanco y negro; no recupera trazos ocultos ni el orden del dibujo.'
    im.save(target/'imagen.png')
    result['dpi']=image_pdf(im,target/'imprimir.pdf',options)
    return result

def extract_sample(im,char,baseline=0.78,template=False):
    char=unicodedata.normalize('NFC',str(char))
    if len(char)!=1 or char.isspace() or ord(char)<32: raise ValueError('Asigna exactamente una letra, número o signo.')
    im=ImageOps.exif_transpose(im)
    if im.width*im.height>24_000_000: raise ValueError('La muestra es demasiado grande.')
    mask=ink_mask(im)
    count,labels,stats,_=cv2.connectedComponentsWithStats(mask,8)
    clean=np.zeros_like(mask)
    for i in range(1,count):
        if stats[i,cv2.CC_STAT_AREA]>=max(3,mask.size*0.00010): clean[labels==i]=255
    ys,xs=np.where(clean>0)
    if len(xs)<10: raise ValueError('No se detectaron trazos en esta muestra.')
    baseline=float(baseline)
    if not 0.2<=baseline<=0.98: raise ValueError('La línea base debe estar entre el 20 % y el 98 %.')
    x0,x1=int(xs.min()),int(xs.max())
    # Template crops have a known physical scale; individual crops use their original height.
    scale=50/PPM if template else 1000/im.height
    paths=outlines(clean,0.25)
    transformed=[[[round((x-x0)*scale+45),round((im.height*baseline-y)*scale)] for x,y in p] for p in paths]
    if not transformed: raise ValueError('No se detectaron trazos cerrados en esta muestra.')
    preview=Image.fromarray(255-clean); preview.thumbnail((160,180)); b=io.BytesIO(); preview.save(b,format='PNG')
    import base64
    return {'char':char,'paths':transformed,'advance':round((x1-x0+1)*scale+100),
            'preview':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode(),
            'baseline':baseline}

def template_image():
    im=Image.new('RGB',(210*PPM,297*PPM),'white'); d=ImageDraw.Draw(im)
    for x,y in [(10,30),(200,30),(10,280),(200,280)]:
        r=3 if (x,y)==(10,30) else 2
        d.rectangle(((x-r)*PPM,(y-r)*PPM,(x+r)*PPM,(y+r)*PPM),fill='black')
    for i,ch in enumerate(CHARS):
        x=15+(i%10)*18; y=42+(i//10)*22
        d.rectangle((x*PPM,y*PPM,(x+18)*PPM,(y+22)*PPM),outline='#bbbbbb',width=1)
        d.text(((x+1)*PPM,(y+.5)*PPM),ch,fill='black',font=ImageFont.load_default(size=18))
        d.line(((x+1)*PPM,(y+17.5)*PPM,(x+17)*PPM,(y+17.5)*PPM),fill='#d9e5ef',width=1)
    return im

def template_pdf(target):
    c=canvas.Canvas(str(target),pagesize=(210*mm,297*mm)); c.setTitle('Trazo · Plantilla de caligrafía')
    c.setFont('Helvetica-Bold',20); c.drawString(15*mm,281*mm,'Tu letra empieza aquí.')
    c.setFont('Helvetica',9); c.drawString(15*mm,274*mm,'Imprime al 100 %. Una letra por casilla. Repite la hoja para añadir variantes.')
    for x,y in [(10,30),(200,30),(10,280),(200,280)]:
        r=3 if (x,y)==(10,30) else 2
        c.rect((x-r)*mm,(297-y-r)*mm,2*r*mm,2*r*mm,fill=1,stroke=0)
    for i,ch in enumerate(CHARS):
        x=15+(i%10)*18; y=42+(i//10)*22
        c.setStrokeColorRGB(.75,.78,.8); c.setLineWidth(.3)
        c.rect(x*mm,(297-y-22)*mm,18*mm,22*mm,fill=0)
        c.setFillColorRGB(.15,.24,.36); c.setFont('Helvetica',8); c.drawString((x+1)*mm,(297-y-3.8)*mm,ch)
        c.setStrokeColorRGB(.85,.91,.96); c.line((x+1)*mm,(297-y-17.5)*mm,(x+17)*mm,(297-y-17.5)*mm)
    c.setFillColorRGB(.25,.3,.4); c.setFont('Helvetica',8)
    c.drawString(16*mm,20*mm,'Usa tinta oscura, evita tocar los bordes y conserva las cuatro marcas negras.')
    c.save()

def align_template(im,oriented=False):
    im=white_rgb(im); work=im.copy(); work.thumbnail((2200,2200))
    mask=ink_mask(work,90); contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    candidates=[]; area=work.width*work.height
    for contour in contours:
        x,y,w,h=cv2.boundingRect(contour); a=cv2.contourArea(contour)
        if area*.00005<a<area*.008 and max(w,h)<min(work.size)*.045 and .65<w/h<1.5 and a/(w*h)>.78 and cv2.countNonZero(mask[y:y+h,x:x+w])/(w*h)>.80:
            candidates.append((x+w/2,y+h/2,a))
    corners=[]
    for right,bottom in [(False,False),(True,False),(False,True),(True,True)]:
        choices=[p for p in candidates if (p[0]>work.width*.82 if right else p[0]<work.width*.18)
                 and (p[1]>work.height*.82 if bottom else p[1]<work.height*.18)]
        if not choices: raise ValueError('No se encontraron las cuatro marcas. Fotografía la hoja completa, derecha y sin sombras, o usa un recorte individual.')
        # Registration marks sit outside the writing grid. Prefer the exterior
        # candidate, never a heavier letter inside a corner cell.
        corners.append(min(choices,key=lambda p:(1-p[0]/work.width if right else p[0]/work.width)+(1-p[1]/work.height if bottom else p[1]/work.height)))
    tl,tr,bl,br=np.asarray([[x,y] for x,y,_ in corners])
    spans=[np.linalg.norm(tr-tl),np.linalg.norm(br-bl),np.linalg.norm(bl-tl),np.linalg.norm(br-tr)]
    sizes=sorted(p[2] for p in corners)
    if (min(spans)<min(work.size)*.55 or max(spans[:2])/min(spans[:2])>1.35
            or max(spans[2:])/min(spans[2:])>1.35 or sizes[2]/sizes[0]>1.7
            or sizes[3]/sizes[1]>3.8 or max(math.sqrt(p[2]) for p in corners)>min(spans)*.055):
        raise ValueError('Las marcas no forman una plantilla completa. Fotografía la hoja completa y conserva sus cuatro marcas.')
    if not oriented:
        sizes=[p[2] for p in corners];big=int(np.argmax(sizes));sorted_sizes=sorted(sizes,reverse=True)
        if sorted_sizes[0]<sorted_sizes[1]*1.35:
            raise ValueError('No se distingue la marca de orientación. Usa una plantilla de Trazo completa y evita sombras sobre las marcas.')
        rotation={1:Image.Transpose.ROTATE_90,2:Image.Transpose.ROTATE_270,3:Image.Transpose.ROTATE_180}.get(big)
        if rotation is not None:return align_template(im.transpose(rotation),True)
    src=np.float32([[x*im.width/work.width,y*im.height/work.height] for x,y,_ in corners])
    dst=np.float32([[10*PPM,30*PPM],[200*PPM,30*PPM],[10*PPM,280*PPM],[200*PPM,280*PPM]])
    matrix=cv2.getPerspectiveTransform(src,dst)
    return Image.fromarray(cv2.warpPerspective(np.asarray(im),matrix,(210*PPM,297*PPM),borderValue=(255,255,255)))

def extract_template(im):
    aligned=align_template(im); entries=[]
    for i,ch in enumerate(CHARS):
        x=15+(i%10)*18; y=42+(i//10)*22
        crop=aligned.crop((round((x+1.4)*PPM),round((y+5)*PPM),round((x+16.6)*PPM),round((y+20.5)*PPM)))
        # The pale printed baseline is above the luminance threshold.
        try: entries.append(extract_sample(crop,ch,(17.5-5)/15.5,True))
        except ValueError as exc:
            if 'trazos' not in str(exc): raise
    if not entries: raise ValueError('La plantilla no contiene trazos. Rellena las casillas con tinta oscura.')
    return entries,{'detected':len(entries),'expected':len(CHARS),'aligned':True}

def build_font(entries,target,name='Mi letra'):
    if not entries: raise ValueError('Añade muestras antes de crear tu fuente.')
    if len(entries)>1200: raise ValueError('El límite es 1200 muestras por fuente.')
    counts={}
    for entry in entries:
        ch=entry['char'];counts[ch]=counts.get(ch,0)+1
        if counts[ch]>15:raise ValueError(f'El límite es 15 muestras por carácter. «{ch}» tiene más de 15; elimina las sobrantes para crear la fuente. Tus muestras siguen guardadas.')
    glyphs={}; metrics={}; cmap={32:'space'}; variants={}; code=0xE000
    pen=TTGlyphPen(None); pen.moveTo((60,0)); pen.lineTo((60,650)); pen.lineTo((450,650)); pen.lineTo((450,0)); pen.closePath()
    pen.moveTo((100,40)); pen.lineTo((410,40)); pen.lineTo((410,610)); pen.lineTo((100,610)); pen.closePath()
    glyphs['.notdef']=pen.glyph(); metrics['.notdef']=(520,60)
    glyphs['space']=TTGlyphPen(None).glyph(); metrics['space']=(320,0)
    names={}
    for entry in entries:
        ch=entry['char']; idx=len(variants.get(ch,[])); gn=f'uni{ord(ch):04X}'+(f'.v{idx}' if idx else '')
        pen=TTGlyphPen(None)
        for path in entry['paths']:
            pen.moveTo(tuple(path[0]))
            for point in path[1:]: pen.lineTo(tuple(point))
            pen.closePath()
        glyphs[gn]=pen.glyph(); metrics[gn]=(max(100,min(2500,int(entry['advance']))),45)
        if not idx: cmap[ord(ch)]=gn
        cmap[code]=gn; variants.setdefault(ch,[]).append(chr(code)); names.setdefault(ch,[]).append(gn); code+=1
    fb=FontBuilder(1000,isTTF=True); fb.setupGlyphOrder(list(glyphs)); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics); fb.setupHorizontalHeader(ascent=1050,descent=-350)
    family=(str(name).strip() or 'Mi letra')[:60]; ps=re.sub('[^A-Za-z0-9]','',unicodedata.normalize('NFKD',family)) or 'MiLetra'
    fb.setupNameTable({'familyName':family,'styleName':'Regular','uniqueFontIdentifier':f'Trazo-{uuid.uuid4().hex}',
                      'fullName':family,'psName':ps+'-Regular','version':'Version 1.000'})
    fb.setupOS2(sTypoAscender=1050,sTypoDescender=-350,usWinAscent=1400,usWinDescent=500,fsType=0)
    fb.setupPost(); fb.setupMaxp()
    # Contextual cycling is available in compatible text apps. The compositor explicitly chooses samples.
    multi={ch:gs for ch,gs in names.items() if len(gs)>1}
    if multi:
        allbase=' '.join(gs[0] for gs in names.values()); features=['languagesystem DFLT dflt;',f'@base = [{allbase}];']
        rules=[]
        for ch,gs in multi.items():
            for i in range(len(gs)):
                prev=' '.join(v[min(i,len(v)-1)] for v in multi.values())
                rules.append(f'sub [{prev}] {gs[0]}\' by {gs[(i+1)%len(gs)]};')
        features.append('feature calt { '+ ' '.join(rules)+' } calt;')
        addOpenTypeFeaturesFromString(fb.font,'\n'.join(features))
    target=Path(target); fb.save(target)
    meta={'name':family,'characters':len(variants),'samples':sum(len(v) for v in variants.values()),'variants':variants,
          'advances':{chr(code):metrics[glyph][0] for code,glyph in cmap.items()}}
    target.with_suffix('.json').write_text(json.dumps(meta,ensure_ascii=False),encoding='utf-8')
    return meta

def compose_pdf(text,font_path,meta,target,options=None):
    options=options or {}; text=unicodedata.normalize('NFC',str(text)).replace('\r\n','\n').replace('\r','\n').replace('\t','    ')
    if not text.strip(): raise ValueError('Escribe un texto para imprimir.')
    if len(text)>100_000: raise ValueError('El texto supera 100000 caracteres. Divídelo en partes.')
    missing=sorted(set(text)-set(meta['variants'])-{' ','\n'})
    if missing: raise ValueError('Falta una muestra de: '+' '.join(missing))
    w,h,margin=page_options(options); size=number(options,'size',15,6,48); leading=number(options,'leading',8,3,20)*mm
    if leading<size*.85: raise ValueError('Aumenta el interlineado para evitar que se superpongan las letras.')
    key='Trazo'+uuid.uuid4().hex; registered=TTFont(key,str(font_path))
    # ReportLab otherwise aliases different files sharing their PostScript name,
    # including older exports made before the user's font was rebuilt.
    registered.face.name=key.encode('ascii');pdfmetrics.registerFont(registered)
    c=canvas.Canvas(str(target),pagesize=(w*mm,h*mm)); c.setTitle(meta['name']+' · Trazo')
    # Same unsigned 32-bit LCG and call order as the browser preview.
    seed=int(options.get('seed',17))&0xffffffff
    def choose(variants):
        nonlocal seed
        seed=(seed*1664525+1013904223)&0xffffffff
        return variants[(seed*len(variants))//4294967296]
    x=margin*mm; top=(h-margin)*mm-size*.9; y=top; pages=1
    ruling=options.get('ruling','none'); ink=options.get('ink','#193c66')
    if not re.fullmatch(r'#[0-9a-fA-F]{6}',ink): raise ValueError('Color de tinta inválido.')
    def page():
        if ruling in ('lines','grid'):
            c.setStrokeColorRGB(.83,.89,.94); c.setLineWidth(.35)
            yy=top-2
            while yy>=margin*mm:
                c.line(margin*mm,yy,(w-margin)*mm,yy); yy-=leading
            if ruling=='grid':
                xx=margin*mm
                while xx<=(w-margin)*mm: c.line(xx,margin*mm,xx,(h-margin)*mm); xx+=leading
        c.setFillColor(ink); c.setFont(key,size)
    def newline():
        nonlocal x,y,pages
        x=margin*mm; y-=leading
        if y-size*.35<margin*mm:
            c.showPage(); pages+=1; y=top; page()
    page()
    for token in re.findall(r'\n| +|[^ \n]+',text):
        if token=='\n': newline(); continue
        chars=[choose(meta['variants'][ch]) if ch!=' ' else ' ' for ch in token]
        word=''.join(chars); width=pdfmetrics.stringWidth(word,key,size)
        if x>margin*mm and x+width>(w-margin)*mm: newline()
        for ch in chars:
            cw=pdfmetrics.stringWidth(ch,key,size)
            if x+cw>(w-margin)*mm:
                if x<=margin*mm: raise ValueError('Una letra no cabe en el ancho. Reduce su tamaño o el margen.')
                newline()
            if ch==' ' and x==margin*mm: continue
            c.drawString(x,y,ch); x+=cw
    c.save(); return {'pages':pages,'width':w,'height':h,'note':'Variantes elegidas de tus muestras; no son letras inventadas.'}
