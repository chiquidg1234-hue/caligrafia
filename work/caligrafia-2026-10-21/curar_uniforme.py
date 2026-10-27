"""Reproducible, visually curated handwriting profile. Never mutates legacy profiles.

Selection numbers below are 1-based positions in each existing Original group.
Run `python curar_uniforme.py --review` to make all candidate contact sheets;
run without flags to build the selected library, font, proofs and audit report.
"""
import sys, json, math, hashlib, copy, unicodedata, argparse
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT/'outputs/trazo/vendor'), str(ROOT/'outputs/trazo')]
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
import engine

W = Path(__file__).resolve().parent
OUT = ROOT/'outputs/mi-caligrafia'
FONT = 'C:/Windows/Fonts/arial.ttf'
# All repeated alphabet characters were selected by visual comparison, not a medoid.
CHOICES = {
 'A':(2,'Arco centrado y travesaño limpio; evita la cima abultada de 6.'),
 'a':(2,'Óvalo cerrado y salida contenida; menos inclinación que 6.'),
 'B':(4,'Dos lóbulos definidos, unión continua y asta clara.'),
 'b':(2,'Óvalo redondo, unión limpia y asta poco inclinada.'),
 'C':(2,'Curva abierta continua, extremos claros y base estable.'),
 'c':(2,'Apertura clara y curva equilibrada; evita la compresión de 6.'),
 'D':(3,'Curva exterior redondeada; evita las variantes triangulares o abiertas.'),
 'd':(2,'Óvalo legible y asta casi vertical sin prolongación excesiva.'),
 'E':(1,'Tres barras separadas, horizontales y con longitudes claras.'),
 'e':(2,'Ojo visible y salida corta, sin mancha en el cruce.'),
 'F':(3,'Asta vertical continua y barras bien diferenciadas.'),
 'f':(4,'Asta recta, gancho suave y travesaño claro.'),
 'G':(1,'Curva circular clara y barra reconocible, sin cierre cuadrado.'),
 'g':(3,'Óvalo cerrado y descendente continuo con gancho reconocible.'),
 'H':(3,'Astas equilibradas y travesaño casi horizontal.'),
 'h':(2,'Arco redondo, asta continua y salida contenida.'),
 'I':(2,'Trazo simple y estrecho con mínima inclinación.'),
 'i':(2,'Punto separado y asta fina y continua.'),
 'J':(3,'Asta recta, gancho redondeado y barra superior clara.'),
 'j':(5,'Asta casi vertical y gancho redondeado; se conserva la j manuscrita sin punto recuperado.'),
 'K':(5,'Asta clara y diagonales separadas, con cruce central limpio.'),
 'k':(1,'Asta continua y dos brazos legibles; evita el cruce empastado de 4.'),
 'L':(3,'Asta clara y pie horizontal de longitud contenida.'),
 'l':(5,'Trazo alto casi vertical, sin la inclinación marcada de 1–2.'),
 'm':(2,'Dos arcos legibles de altura parecida y uniones continuas.'),
 'M':(4,'Astas y valle central equilibrados; menos deformación que 2 o 5.'),
 'N':(3,'Astas continuas y diagonal clara, sin el engrosamiento de 1.'),
 'n':(2,'Arco redondo y continuo con proporción compacta.'),
 'Ñ':(1,'Tilde realmente separada; 2 se descartó al ver que el contorno une la tilde al cuerpo.'),
 'ñ':(2,'Tilde separada y cuerpo claro; evita las tildes unidas de 3–4.'),
 'O':(3,'Óvalo cerrado, equilibrado y sin quiebre en la cima.'),
 'o':(1,'Óvalo claro y proporcionado, menos inclinado que 3 o 5.'),
 'P':(3,'Lóbulo realmente cerrado; 2 se descartó por la apertura del contorno recuperado.'),
 'Q':(2,'Óvalo legible y cola contenida, menos invasiva que 3 o 6.'),
 'q':(3,'Óvalo cerrado y descendente con terminación clara.'),
 'p':(5,'Lóbulo limpio y descendente continuo, sin el cruce grueso de 3.'),
 'R':(2,'Lóbulo y pierna diagonal distinguibles, con menos mancha central.'),
 'r':(1,'Hombro reconocible y asta separable, sin el bloque de tinta de 3.'),
 'S':(2,'Curvas superior e inferior reconocibles; menos angular que 3–5.'),
 's':(1,'Dos curvas legibles y distribución de tinta equilibrada.'),
 'T':(3,'Asta casi vertical y barra superior de longitud equilibrada.'),
 't':(4,'Asta casi vertical y travesaño limpio.'),
 'U':(1,'Curva inferior centrada y laterales equilibrados.'),
 'u':(2,'Curva limpia sin el gancho añadido de 3–4.'),
 'V':(3,'Vértice claro y diagonales equilibradas.'),
 'W':(4,'Dos valles claros y altura equilibrada.'),
 'v':(1,'Vértice centrado y diagonales finas y legibles.'),
 'w':(6,'Dos curvas continuas; evita el extremo izquierdo debilitado de 5.'),
 'X':(3,'Diagonales continuas y cruce centrado.'),
 'x':(4,'Cruce centrado, sin la prolongación superior de 1.'),
 'Y':(4,'Bifurcación abierta y descendente de mayúscula limpio.'),
 'y':(5,'Bifurcación clara y descendente continuo, sin mancha central.'),
 'Z':(6,'Barras superior e inferior completas; 3 se descartó porque la extracción pierde la barra superior.'),
 'z':(4,'Forma muy legible con base y diagonal claras.'),
 '0':(1,'Óvalo más redondo y menos romboidal que 2.'),
 '1':(1,'Bandera superior visible que lo diferencia de la l.'),
 '2':(1,'Curva superior y base claras, menos redondeada la diagonal que 2.'),
 '3':(2,'Dos lóbulos continuos y abiertos a la izquierda.'),
 '4':(2,'Cruce claro y asta recta, con menos inclinación.'),
 '5':(2,'Barra superior y curva inferior más diferenciadas.'),
 '6':(2,'Óvalo cerrado y curva de entrada más limpia.'),
 '7':(2,'Barra y diagonal reconocibles con el rasgo personal transversal.'),
 '9':(2,'Óvalo cerrado y descendente más recto.'),
}

def bounds(paths):
    a=np.array([p for path in paths for p in path],float)
    return a.min(0),a.max(0)

def signed_area(p):
    a=np.asarray(p);b=np.roll(a,-1,axis=0)
    return float(np.sum(a[:,0]*b[:,1]-b[:,0]*a[:,1])/2)

def body_bounds(paths):
    # The largest contour is the principal body, not a dot, accent or counter.
    return bounds([max(paths,key=lambda p:abs(signed_area(p)))])

def lower_body_bounds(paths):
    lo,_=bounds(paths)
    candidates=[p for p in paths if bounds([p])[0][1]<lo[1]+80]
    return body_bounds(candidates)

def raster(paths,scale=.5,pad=12):
    lo,hi=bounds(paths)
    shape=np.ceil((hi-lo)*scale).astype(int)+2*pad+2
    a=np.zeros((shape[1],shape[0]),np.uint8)
    pp=[np.rint((np.asarray(p)-lo)*scale+pad).astype(np.int32) for p in paths]
    cv2.fillPoly(a,pp,255)
    return a

def topology(paths):
    a=raster(paths,1)
    cs,h=cv2.findContours(a,cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
    if h is None:return {'components':0,'holes':0}
    comp=holes=0
    for i,c in enumerate(cs):
        if abs(cv2.contourArea(c))<10:continue
        dep=0;p=h[0,i,3]
        while p>=0:dep+=1;p=h[0,p,3]
        if dep%2:holes+=1
        else:comp+=1
    return {'components':comp,'holes':holes}

def paste_glyph(canvas,sample,box,scale=.11,baseline=None,color=(29,52,73)):
    x,y,w,h=box;lo,hi=bounds(sample['paths'])
    scale=min(scale,(w-18)/(hi[0]-lo[0]),(h-22)/(hi[1]-lo[1]))
    px=x+(w-(hi[0]-lo[0])*scale)/2-lo[0]*scale
    py=baseline if baseline is not None else y+(h+(hi[1]+lo[1])*scale)/2
    # Supersampling preserves thin strokes and polygon counters.
    k=3;a=np.zeros((h*k,w*k),np.uint8)
    polys=[np.rint([[((px+xx*scale)-x)*k,((py-yy*scale)-y)*k] for xx,yy in p]).astype(np.int32) for p in sample['paths']]
    cv2.fillPoly(a,polys,255)
    mask=Image.fromarray(a).resize((w,h),Image.Resampling.LANCZOS)
    layer=Image.new('RGB',(w,h),color);canvas.paste(layer,(x,y),mask)

def groups(samples):
    g={}
    for s in samples:g.setdefault(s['char'],[]).append(s)
    return g

def review_sheets(original):
    g=groups(original);labels=list(g)
    f=ImageFont.truetype(FONT,18);small=ImageFont.truetype(FONT,12)
    for page in range(math.ceil(len(labels)/14)):
        subset=labels[page*14:(page+1)*14]
        im=Image.new('RGB',(1200,65+len(subset)*125),'#f3f5f6');d=ImageDraw.Draw(im)
        d.text((22,15),f'Original · candidatos {page+1} · número de variante dentro del carácter',font=f,fill='#183d59')
        for r,c in enumerate(subset):
            yy=60+r*125;d.text((18,yy+32),c,font=f,fill='#183d59')
            for j,s in enumerate(g[c]):
                xx=68+j*186;chosen=CHOICES.get(c,(1,''))[0]==j+1
                d.rounded_rectangle((xx,yy,xx+178,yy+119),7,fill='white',outline='#238476' if chosen else '#dce1e6',width=2 if chosen else 1)
                d.text((xx+6,yy+3),str(j+1)+(' · elegida' if chosen else ''),font=small,fill='#238476' if chosen else '#667784')
                d.line((xx+7,yy+92,xx+171,yy+92),fill='#d8e3eb')
                paste_glyph(im,s,(xx+20,yy+17,145,101),.08,yy+92)
        im.save(W/f'Uniforme-candidatos-{page+1}.png')

# Only letters with an identifiable vertical stem. Other characters keep their
# natural diagonal construction. A positive shear counteracts a left-leaning stem.
STEMS={'B':'left','D':'left','E':'left','F':'left','H':'left','K':'left',
       'L':'left','M':'left','N':'left','P':'left','R':'left','b':'left',
       'h':'left','k':'left','l':'center','I':'center','i':'center','t':'center',
       'd':'right','j':'right','p':'left','q':'right'}

def stem_slope(paths,side):
    lo,hi=lower_body_bounds(paths);width,height=hi-lo
    a=np.zeros((int(math.ceil(height))+5,int(math.ceil(width))+5),np.uint8)
    polys=[np.rint(np.asarray(p)-lo+2).astype(np.int32) for p in paths]
    cv2.fillPoly(a,polys,255)
    xy=[]
    for y in range(max(2,int(height*.30)),min(a.shape[0]-2,int(height*.82)),3):
        xs=np.where(a[y]>0)[0]
        if len(xs)==0:continue
        if side=='left':x=xs.min()
        elif side=='right':x=xs.max()
        else:x=np.median(xs)
        xy.append((y,x))
    slopes=[(b[1]-a[1])/(b[0]-a[0]) for i,a in enumerate(xy) for b in xy[i+1:] if b[0]-a[0]>height*.2]
    return float(np.median(slopes)) if slopes else 0.

def transform(s):
    c=s['char'];paths=s['paths'];lo,hi=bounds(paths)
    blo,bhi=lower_body_bounds(paths);sy=1.;dy=0.;deskew=0.;mode='posición manuscrita conservada'
    if c.isalpha() and c not in '²³':
        base=unicodedata.normalize('NFD',c)[0]
        if c in 'gpq':
            outer=max(paths,key=lambda p:abs(signed_area(p)));sgn=math.copysign(1,signed_area(outer))
            counters=[p for p in paths if signed_area(p)*sgn<0]
            counter=max(counters,key=lambda p:abs(signed_area(p)))
            dy=float(bounds([counter])[0][1]-45)
            current=hi[1]-dy;target=340;mode='base del óvalo alineada conservando el descendente'
        elif c in 'jy':
            current=hi[1];target=340;mode='descendente preservado; altura del cuerpo ajustada'
        else:
            dy=float(blo[1]);current=float(bhi[1]-blo[1])
            if c.isupper():target=510
            elif base in 'bdfhkl':target=510
            elif base=='t':target=470
            elif base=='i':target=300
            else:target=340
            mode='base del cuerpo alineada; puntos y acentos conservados'
        limit=.20 if c in 'ÁÉÍÓÚÜáéíóúüñÑ' else .12
        sy=float(np.clip(target/max(current,1),1-limit,1+limit))
    elif c.isdigit() and c not in '²³':
        dy=float(lo[1]);sy=float(np.clip(470/(hi[1]-lo[1]),.88,1.12));mode='cifras alineadas a la base y altura común'
    elif c in '!?¿¡':
        dy=float(lo[1]);sy=float(np.clip(620/(hi[1]-lo[1]),.80,1.12));mode='signo completo alineado; punto conservado'
    if c in STEMS:
        measured=stem_slope(paths,STEMS[c]);deskew=float(np.clip(-measured,-.085,.085))
        if abs(deskew)<.018:deskew=0.
    transformed=[[[float(x+deskew*(y-dy)),float((y-dy)*sy)] for x,y in p] for p in paths]
    # Optical centering for marks from different source sheets. Shape is unchanged.
    newlo,newhi=bounds(transformed)
    center_targets={'~':260,'«':280,'»':280,'+':240,'=':240,'÷':240,'-':240,'/':280,'\\':280}
    shift_y=0.
    if c in center_targets:
        shift_y=center_targets[c]-(newlo[1]+newhi[1])/2;mode='signo centrado en el eje de escritura'
    elif c=='_':shift_y=-85-(newlo[1]+newhi[1])/2;mode='subrayado colocado debajo de la base'
    # Stable, modest side bearings; no random advances in this profile.
    xshift=45-newlo[0]
    transformed=[[[round(x+xshift,2),round(y+shift_y,2)] for x,y in p] for p in transformed]
    newlo,newhi=bounds(transformed);advance=round(newhi[0]+65)
    return transformed,advance,{'scaleY':round(sy,6),'scaleX':1,'baselineSourceY':round(dy,3),
      'shearXPerY':round(deskew,6),'shearAngleDegrees':round(math.degrees(math.atan(deskew)),3),
      'opticalShiftY':round(shift_y,3),'alignment':mode}

def selection_sheet(selected,original):
    f=ImageFont.truetype(FONT,18);small=ImageFont.truetype(FONT,12);g=groups(original)
    im=Image.new('RGB',(1320,1500),'#f3f5f6');d=ImageDraw.Draw(im)
    d.text((24,15),'Mi letra Uniforme · las 111 formas elegidas · antes / después',font=f,fill='#183d59')
    for i,s in enumerate(selected):
        x=20+i%12*108;y=60+i//12*140
        d.rounded_rectangle((x,y,x+102,y+132),8,fill='white',outline='#dce3e8')
        number=CHOICES.get(s['char'],(1,''))[0]
        d.text((x+5,y+5),s['char']+' · '+str(number),font=small,fill='#183d59')
        paste_glyph(im,g[s['char']][number-1],(x+3,y+26,47,100),.085)
        paste_glyph(im,s,(x+52,y+26,47,100),.085)
    im.save(OUT/'Mi-letra-Uniforme-seleccion.png')

def proof(fontpath):
    im=Image.new('RGB',(1600,1150),'#fbfaf6');d=ImageDraw.Draw(im)
    title=ImageFont.truetype(FONT,30);label=ImageFont.truetype(FONT,18)
    d.text((65,40),'Mi letra Uniforme',font=title,fill='#173a52')
    d.text((65,88),'Una forma real por carácter · 111 caracteres · sin alternancia entre variantes',font=label,fill='#536779')
    f=ImageFont.truetype(str(fontpath),66)
    lines=['Hoy escribo con mi letra, más clara y uniforme.',
           'El pingüino llegó al jardín y pidió café con azúcar.',
           'Mañana revisaré mis apuntes de química y física.',
           'Una forma estable: letra letra letra.',
           'ÁÉÍÓÚÜ Ñ  áéíóúü ñ  0123456789',
           '¿Qué tal? ¡Muy bien! (a+b) = 12 ÷ 3; x² + y³.',
           'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
           'abcdefghijklmnopqrstuvwxyz',
           '.,;:!?¿¡ \" \' ( ) [ ] { } / \\ @ # $ % & * + = - _ ~ « » €']
    for i,line in enumerate(lines):
        yy=190+i*95;d.line((60,yy,1540,yy),fill='#d7e3e8',width=1)
        # Baseline anchor is important for checking all dots and descenders.
        d.text((65,yy),line,font=f,fill='#17374e',anchor='ls')
    d.text((65,1095),'Prueba digital: conserva irregularidades propias del trazo. No sustituye una prueba impresa.',font=label,fill='#536779')
    im.save(OUT/'Mi-letra-Uniforme-prueba.png')

def comparison():
    im=Image.new('RGB',(1600,820),'#fbfaf6');d=ImageDraw.Draw(im)
    title=ImageFont.truetype(FONT,28);label=ImageFont.truetype(FONT,19)
    d.text((65,35),'Tu letra · comparación a igual tamaño',font=title,fill='#173a52')
    lines=['Mañana escribiré mis apuntes de química.',
           'Letra letra letra, números 0123456789.']
    for i,name in enumerate(('Original','Optimizada','Uniforme')):
        yy=130+i*225
        d.text((65,yy),f'Mi letra {name}',font=label,fill='#536779')
        meta=json.loads((OUT/f'Mi-letra-{name}.json').read_text(encoding='utf-8'))
        f=ImageFont.truetype(str(OUT/f'Mi-letra-{name}.ttf'),64)
        seed=17
        for j,line in enumerate(lines):
            converted=[]
            for c in line:
                if c==' ':converted.append(c);continue
                seed=(seed*1664525+1013904223)&0xffffffff
                variants=meta['variants'][c]
                converted.append(variants[(seed*len(variants))//4294967296])
            y=yy+85+j*90
            d.line((60,y,1540,y),fill='#d7e3e8')
            d.text((65,y),''.join(converted),font=f,fill='#17374e',anchor='ls')
    im.save(OUT/'Mi-letra-Uniforme-comparacion.png')

def measured_metrics(og,pg,selected,audit):
    sg={s['char']:s for s in selected}
    def cv(vals):
        a=np.asarray(vals);return round(float(a.std()/a.mean()),6)
    def height(s):
        lo,hi=lower_body_bounds(s['paths']);return float(hi[1]-lo[1])
    cohorts={'capitalHeightCV':'ABCDEFGHIJKLMNOPQRSTUVWXYZ','lowercaseBodyHeightCV':'acemnorsuvwxz'}
    metrics={}
    for label,chars in cohorts.items():
        before=[height(pg[c][CHOICES[c][0]-1]) for c in chars]
        after=[height(sg[c]) for c in chars]
        metrics[label]={'beforeSelectedOptimized':cv(before),'afterUniform':cv(after),
          'characters':chars,'definition':'desviación estándar / media de la altura visible; menor = menor dispersión'}
    accented='ÁÉÍÓÚÜáéíóúüñÑ'
    metrics['accentedBodyBaselineMeanAbsoluteUnits']={
      'beforeSelectedOptimized':round(float(np.mean([abs(lower_body_bounds(pg[c][CHOICES.get(c,(1,''))[0]-1]['paths'])[0][1]) for c in accented])),3),
      'afterUniform':round(float(np.mean([abs(lower_body_bounds(sg[c]['paths'])[0][1]) for c in accented])),3),
      'characters':accented,'unitsPerEm':1000}
    metrics['variantCount']={'before':390,'after':111,'characters':111,
      'repeatedCharacterShapeVariationAfter':0,
      'note':'Una sola forma por carácter elimina la alternancia, por construcción; no es una puntuación de parecido.'}
    metrics['shearAppliedCharacters']=sum(a['adjustment']['shearXPerY']!=0 for a in audit)
    metrics['verticalScaleRange']=[min(a['adjustment']['scaleY'] for a in audit),max(a['adjustment']['scaleY'] for a in audit)]
    return metrics

def write_notes(report):
    m=report['metrics'];cap=m['capitalHeightCV'];low=m['lowercaseBodyHeightCV'];base=m['accentedBodyBaselineMeanAbsoluteUnits']
    content=f'''# Mi letra Uniforme

Contiene 111 muestras para los mismos 111 caracteres de Original y Optimizada: una forma real por carácter. La elección se hizo comparando visualmente las variantes de las fotos y sus contornos recuperados. No se eligió automáticamente la muestra más cercana a una media.

## Qué cambió

- Se revisaron las 390 muestras y se eligió una de cada carácter. Las 63 letras/cifras con alternativas tienen una justificación individual en `Mi-letra-Uniforme-curacion.json`; para los otros 48 caracteres solo había una muestra disponible.
- Se utiliza el contorno de Optimizada correspondiente a la variante elegida. Así se conserva su suavizado y ajuste de tinta previos. La nueva versión aplica solo transformaciones afines y espacio lateral estable; no redibuja letras ni combina partes de muestras distintas.
- Las alturas del cuerpo se acercan a 510 unidades para mayúsculas/ascendentes y 340 para minúsculas, con excepciones para i, t y cifras. El cambio vertical está limitado a ±12 % en letras ordinarias y ±20 % en caracteres con diacríticos. El signo ! se reduce un 20 % por su altura excepcional en el recorte.
- Se alinean los cuerpos de las letras acentuadas y las cifras con la base. En g, p y q se usa la base del óvalo para conservar el descendente. Se centran signos como +, =, ÷, ~ y comillas angulares.
- {m['shearAppliedCharacters']} astas verticales reciben una corrección horizontal moderada, medida sobre el contorno, de hasta {report['maxAbsoluteShearDegrees']:.3f} grados equivalentes. Las diagonales propias de V, W, X, Y y Z conservan su construcción.
- Hay una sola variante y no hay reglas de alternancia contextual. Por eso escribir la misma letra siempre utiliza el mismo contorno; tampoco varía el avance entre repeticiones.

## Comprobaciones

- 111 caracteres presentes tanto en la biblioteca como en el mapa Unicode de la fuente; 111 identificadores únicos.
- Todos los contornos, componentes y huecos de las muestras elegidas se conservan. También se revisaron puntos, acentos, diéresis y descendentes en la lámina y el texto de prueba.
- Coordenadas finitas, márgenes laterales positivos y todos los contornos dentro del intervalo vertical seguro de −350 a 1050 unidades (1000 unidades por em).
- Los seis archivos `.trazo`, `.ttf` y `.json` de Original y Optimizada permanecen idénticos byte por byte. Sus hashes SHA-256 están en el informe.
- `perfiles.json` añade Uniforme manteniendo intactos los datos de los perfiles anteriores.

La dispersión relativa de altura entre las mayúsculas seleccionadas pasa de {cap['beforeSelectedOptimized']:.4f} a {cap['afterUniform']:.4f}; en las minúsculas del conjunto `acemnorsuvwxz`, de {low['beforeSelectedOptimized']:.4f} a {low['afterUniform']:.4f}. Se compara la misma selección antes y después del ajuste, para no atribuir a la transformación el efecto de escoger otras variantes. La desviación media absoluta de la base de los cuerpos con diacríticos pasa de {base['beforeSelectedOptimized']:.2f} a {base['afterUniform']:.2f} unidades. Son medidas geométricas de consistencia, no una valoración estética ni un porcentaje de parecido.

## Decisiones de revisión

La revisión ampliada cambió cuatro elecciones iniciales: Ñ de 2 a 1 para conservar la tilde separada; P de 2 a 3 para tener un lóbulo cerrado; Z de 3 a 6 porque la extracción de 3 había perdido la barra superior; w de 5 a 6 por una entrada más continua. El informe conserva los identificadores exactos, la variante elegida y la razón de cada elección.

La j recuperada en estas muestras no tiene punto: se conserva así. La R y algunos signos mantienen aperturas o irregularidades del trazo fotografiado. No se ha calculado un porcentaje de parecido ni se ha validado una impresión física. El resultado conserva rasgos y pequeñas irregularidades de la escritura real.

## Archivos y reproducción

- `Mi-letra-Uniforme.trazo`: biblioteca editable.
- `Mi-letra-Uniforme.ttf`: fuente instalable; no se instala automáticamente.
- `Mi-letra-Uniforme-prueba.png`: prueba de texto, letras, cifras y signos.
- `Mi-letra-Uniforme-comparacion.png`: Original, Optimizada y Uniforme al mismo tamaño y con el mismo texto; las anteriores alternan variantes con la misma semilla.
- `Mi-letra-Uniforme-seleccion.png`: las 111 elecciones, antes/después.
- `Mi-letra-Uniforme-curacion.json`: selección auditable, medidas, hashes y límites.
- `work/caligrafia-2026-10-21/curar_uniforme.py`: script reproducible. Se ejecuta con el Python ya disponible y reutiliza las bibliotecas locales de Trazo. `--review` genera las ocho hojas de candidatos completas.
- `work/caligrafia-2026-10-21/bundled-letter.json`: tres perfiles derivados para integrar en la app; solo contiene `id`, `label`, `char`, `paths`, `advance` y `baseline` por muestra. No incluye fotos, rutas personales ni metadatos de captura.

No se instalaron recursos ni se subieron fotografías.
'''
    (OUT/'Mi-letra-Uniforme-LEEME.md').write_text(content,encoding='utf-8')

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def build(original):
    protected=[OUT/f'Mi-letra-{p}.{ext}' for p in ('Original','Optimizada') for ext in ('trazo','ttf','json')]
    before={p.name:sha(p) for p in protected}
    optimized=json.loads((OUT/'Mi-letra-Optimizada.trazo').read_text(encoding='utf-8'))['samples']
    og,pg=groups(original),groups(optimized);selected=[];audit=[]
    for c,ss in og.items():
        variant,rationale=CHOICES.get(c,(1,'Única muestra recuperada; se conserva la forma real y se revisan sus signos separados.'))
        old=ss[variant-1];src=pg[c][variant-1]
        assert old['source']['rectifiedBBox']==src['source']['rectifiedBBox']
        paths,advance,adjust=transform(src)
        entry={'id':f'uniforme-v1-U{ord(c):04X}','char':c,'label':c,'paths':paths,'advance':advance,'baseline':.78,
               'source':{'curation':'manual-v1','originalSampleId':old['id'],'optimizedSampleId':src['id'],
                         'variantOneBased':variant,'adjustment':adjust}}
        selected.append(entry)
        audit.append({'char':c,'sourceOriginalId':old['id'],'sourceOptimizedId':src['id'],
             'selectedVariantOneBased':variant,'availableVariants':len(ss),'visualRationale':rationale,
             'adjustment':adjust,'topologySource':topology(src['paths']),'topologyFinal':topology(paths),
             'contoursBefore':len(src['paths']),'contoursAfter':len(paths),
             'boundsBefore':[v.tolist() for v in bounds(src['paths'])],
             'boundsAfter':[v.tolist() for v in bounds(paths)]})
    lib={'type':'trazo-library','version':2,'name':'Mi letra Uniforme','samples':selected}
    (OUT/'Mi-letra-Uniforme.trazo').write_text(json.dumps(lib,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    fontpath=OUT/'Mi-letra-Uniforme.ttf';engine.build_font(selected,fontpath,'Mi letra Uniforme')
    # engine uses a random ID and current timestamps. Replace those for reproducibility.
    font=TTFont(fontpath,recalcTimestamp=False)
    for n in font['name'].names:
        if n.nameID==3:n.string='Trazo-MiLetraUniforme-v1'.encode(n.getEncoding())
    font['head'].created=font['head'].modified=3875472000
    font.save(fontpath)
    font=TTFont(fontpath);cmap=font.getBestCmap()
    assert len(selected)==111 and set(og)=={s['char'] for s in selected}
    assert len({s['id'] for s in selected})==111
    assert all(ord(c) in cmap for c in og)
    assert 'GSUB' not in font, 'Uniforme must have no contextual variant cycling'
    assert all(a['contoursBefore']==a['contoursAfter'] for a in audit)
    for s in selected:
        lo,hi=bounds(s['paths'])
        assert np.all(np.isfinite([lo,hi])) and lo[0]>=44.9 and hi[0]<s['advance']
        assert lo[1]>=-350 and hi[1]<=1050,(s['char'],lo,hi)
        assert font['glyf'][cmap[ord(s['char'])]].numberOfContours==len(s['paths'])
    assert before=={p.name:sha(p) for p in protected},'Legacy file was changed'
    # Keep all existing metadata entries intact; append/update just this new profile.
    metafile=OUT/'perfiles.json';meta=json.loads(metafile.read_text(encoding='utf-8'))
    entry={'id':'uniforme','name':'Mi letra Uniforme','font':fontpath.name,'library':'Mi-letra-Uniforme.trazo',
       'characters':sorted(og),'count':111,'missing':[],
       'notes':'Una variante real elegida visualmente por carácter; base, altura e inclinación moderadas. Sin alternancia de variantes.'}
    meta['profiles']=[p for p in meta['profiles'] if p['id']!='uniforme']+[entry]
    metafile.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    fields=('id','label','char','paths','advance','baseline')
    bundle={'version':1,'profiles':[{'id':pid,'name':name,'samples':[{k:s[k] for k in fields} for s in entries]}
      for pid,name,entries in [('personal-uniforme-v1','Mi letra Uniforme',selected),
        ('personal-original-v1','Mi letra Original',original),('personal-optimizada-v1','Mi letra Optimizada',optimized)]]}
    (W/'bundled-letter.json').write_text(json.dumps(bundle,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    review_sheets(original);selection_sheet(selected,original);proof(fontpath);comparison()
    topology_changes=[a['char'] for a in audit if a['topologySource']!=a['topologyFinal']]
    report={'name':'Mi letra Uniforme','characterCount':111,'sampleCount':111,'sourceSampleCount':390,
       'selectionMethod':'Revisión visual de las variantes reales; no selección automática por medoid.',
       'baseGeometry':'La variante correspondiente de Optimizada (contorno y tinta ya normalizados).',
       'legacyHashesUnchanged':before,'topologyRasterChanges':topology_changes,
       'contourCountsPreserved':True,'fontCmapComplete':True,'safeBounds':True,'contextualVariants':False,
       'maxAbsoluteShearDegrees':max(abs(a['adjustment']['shearAngleDegrees']) for a in audit),
       'manualOverridesAfterVectorReview':['Ñ: 2 → 1; tilde separada','P: 2 → 3; lóbulo cerrado','Z: 3 → 6; barra superior completa','w: 5 → 6; entrada continua'],
       'limitations':['La j recuperada no tiene punto; no se añade uno inventado.',
                     'Algunos contornos de R y de signos conservan aperturas del manuscrito.',
                     'La revisión es digital. No se ha impreso ni calculado un porcentaje de parecido.'],
       'metrics':measured_metrics(og,pg,selected,audit),'selections':audit}
    assert not topology_changes,'A component or counter changed during alignment'
    (OUT/'Mi-letra-Uniforme-curacion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    write_notes(report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('selections','legacyHashesUnchanged')},ensure_ascii=True))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--review',action='store_true');args=parser.parse_args()
    original=json.loads((OUT/'Mi-letra-Original.trazo').read_text(encoding='utf-8'))['samples']
    if args.review:
        review_sheets(original)
        print('Generated 8 candidate contact sheets.');return
    build(original)

if __name__=='__main__':main()
