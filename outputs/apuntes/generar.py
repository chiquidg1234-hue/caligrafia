import math, random, os, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
from gen2 import Ink, SC, TW, TH, NAME
from gen3 import pen, apply3
FONT='/home/user/caligrafia/outputs/mi-caligrafia/Mi-letra-Uniforme.ttf'
XS=np.load('hoja/xs.npy'); YS=np.load('hoja/ys_fit.npy')
NCOL=34              # columnas completas del recuadro
MC0,MC1=1,32         # texto solo en columnas 1..32 (un cuadrito libre a izquierda y derecha)
R0,R1=1,46           # filas 1..46 (una fila libre arriba y abajo)
CW=float(np.mean(np.diff(XS)))
CWM=0.45   # ancho de letra en el mapa: ~2 letras por cuadrito
def X(c): # c puede ser fraccionario
    i=int(math.floor(c)); i=max(0,min(NCOL-1,i)); return XS[i]+(XS[i+1]-XS[i])*(c-i)
def Y(r):
    i=int(math.floor(r)); i=max(0,min(len(YS)-2,i)); return YS[i]+(YS[i+1]-YS[i])*(r-i)

_fc={}
def getfont(px):
    k=int(px)
    if k not in _fc: _fc[k]=ImageFont.truetype(FONT,k)
    return _fc[k]

class Ink4(Ink):
    def put(s,c,ch,xc,yb,cap,maxw,jit=1.0,rot=2.2):
        """un carácter: centrado en xc, base en yb, altura de mayúscula = cap, ancho máx = maxw (px de plantilla)"""
        if ch==' ': return
        em=cap/0.51*SC; f=getfont(em)
        W=int(em*3); img=Image.new('L',(W,W),0); ImageDraw.Draw(img).text((em,em*2),ch,font=f,fill=255,anchor='ls')
        bb=img.getbbox()
        if not bb: return
        g=img.crop(bb); gw,gh=g.size; base=em*2-bb[1]
        lim=maxw*SC*0.95
        if gw>lim: g=g.resize((max(1,int(lim)),gh),Image.LANCZOS); gw=g.size[0]
        a=s.rnd.uniform(-rot,rot)
        g2=g.rotate(a,expand=True,resample=Image.BICUBIC); dx=(g2.size[0]-gw)/2; dy=(g2.size[1]-gh)/2
        x0=xc*SC-g2.size[0]/2+s.rnd.uniform(-jit,jit)*SC
        y0=yb*SC-(base+dy)+s.rnd.uniform(-jit,jit)*SC
        s.m[c].paste(255,(int(x0),int(y0)),g2)
    def cellline(s,c,txt,row,col0,jit=0.9):
        """texto de tamaño de cuadrito: una letra por cuadro, base en la línea inferior de la fila"""
        h=Y(row+1)-Y(row)
        for i,ch in enumerate(txt):
            col=col0+i
            assert col<=MC1, ('fuera del margen',txt,col)
            xc=(X(col)+X(col+1))/2; w=X(col+1)-X(col)
            if ch=='º':
                s.put(c,'o',xc-1,Y(row+1)-h*0.42,h*0.88*0.5,w,jit=0.5)
                s.line(c,(xc-w*0.22,Y(row+1)-h*0.33),(xc+w*0.2,Y(row+1)-h*0.33+s.rnd.uniform(-1,1)),w=2.6,amp=0.3)
            else: s.put(c,ch,xc,Y(row+1)+s.rnd.uniform(-0.6,0.6),h*0.88,w,jit=jit)
    def halfline(s,c,txt,rowline,col0,jit=0.7,k=None):
        """texto de mapa: k letras por cuadrito; la base va en la línea de cuadrícula 'rowline'"""
        cw=CWM; h=Y(rowline)-Y(rowline-1)
        for i,ch in enumerate(txt):
            col=col0+i*cw; xc=(X(col)+X(col+cw))/2; w=X(col+cw)-X(col)
            if ch==' ': continue
            s.put(c,ch,xc,Y(rowline)+s.rnd.uniform(-0.5,0.5),h*0.44,w,jit=jit,rot=3)
    # trazos a mano
    def curve(s,c,p0,p1,bend=8,w=3.8):
        mx=(p0[0]+p1[0])/2; my=(p0[1]+p1[1])/2
        dx,dy=p1[0]-p0[0],p1[1]-p0[1]; L=math.hypot(dx,dy) or 1
        b=s.rnd.uniform(-bend,bend); cx,cy=mx-dy/L*b,my+dx/L*b
        pts=[((1-t)**2*p0[0]+2*(1-t)*t*cx+t*t*p1[0],(1-t)**2*p0[1]+2*(1-t)*t*cy+t*t*p1[1]) for t in np.linspace(0,1,14)]
        s.stroke(c,pts,w,0.9)
        return pts
    def arrow2(s,c,p0,p1,bend=9,w=3.8):
        pts=s.curve(c,p0,p1,bend,w); a=pts[-2]; b=pts[-1]
        ang=math.atan2(b[1]-a[1],b[0]-a[0])
        for da in (148,-148):
            aa=ang+math.radians(da+s.rnd.uniform(-9,9)); L=s.rnd.uniform(15,23)
            s.stroke(c,[b,(b[0]+L*math.cos(aa),b[1]+L*math.sin(aa))],w,0.4)
    def rect(s,c,x0,y0,x1,y1,w=3.8):
        r=s.rnd; ov=lambda:r.uniform(-3,9); j=lambda:r.uniform(-2,2)
        s.stroke(c,[(x0-ov(),y0+j()),(x1+ov(),y0+j())],w,1.0)
        s.stroke(c,[(x1+j(),y0-ov()),(x1+j(),y1+ov())],w,1.0)
        s.stroke(c,[(x1+ov(),y1+j()),(x0-ov(),y1+j())],w,1.0)
        s.stroke(c,[(x0+j(),y1+ov()),(x0+j(),y0-ov())],w,1.0)

def wrapn(t,n):
    out=[];cur=''
    for w in t.split(' '):
        cc=(cur+' '+w).strip() if cur else w
        if len(cc)<=n: cur=cc
        else:
            if cur: out.append(cur)
            cur=w
    out.append(cur); return out

# ---------------- hojas de apuntes ----------------
def notes(title,items,seed):
    """items: ('h',texto) rojo subrayado | ('b',texto) | ('q',[segmentos]) ejercicio. Un cuadrito de margen por los cuatro lados."""
    L=[]
    for kind,s in items:
        if kind=='h':
            for l in wrapn(s,MC1-MC0+1): L.append(('h',l))
        elif kind=='b':
            for l in wrapn(s,MC1-MC0+1): L.append(('b',l))
        elif kind=='q':   # segmentos: str | ('_',respuesta)
            line=[];x=0;g0=len(L)
            for seg in s:
                if isinstance(seg,tuple):
                    n=max(8,len(seg[1])+2)
                    if x+n>MC1-MC0+1 and line: L.append(('q',line)); line=[]; x=0
                    line.append(('_',x,seg[1],n)); x+=n+1
                else:
                    for w in seg.split(' '):
                        if not w: continue
                        if x+len(w)>MC1-MC0+1 and line: L.append(('q',line)); line=[]; x=0
                        line.append(('w',x,w)); x+=len(w)+1
            L.append(('q',line))
            gs=len(L)-g0
            L[g0]=(L[g0][0],L[g0][1],gs)
    pages=[];i=0;n=0
    while i<len(L):
        ink=Ink4(seed+n); ink.cellline('k',NAME,1,MC0)
        tt=title+(f' ({n+1})' if n else ''); ink.cellline('r',tt,3,MC0)
        ink.underline('r',X(MC0)+2,X(MC0+len(tt)),Y(4)+9)
        r=5
        while i<len(L) and r<=45:
            kind,p=L[i][0],L[i][1]
            if kind=='q' and len(L[i])>2 and r+2*(L[i][2]-1)>45: break
            if kind=='h':
                ink.cellline('r',p,r,MC0); ink.underline('r',X(MC0)+2,X(MC0+len(p)),Y(r+1)+9)
            elif kind=='b': ink.cellline('k',p,r,MC0)
            else:
                for op in p:
                    if op[0]=='w': ink.cellline('k',op[2],r,MC0+op[1])
                    else:
                        c0=MC0+op[1]; ink.cellline('r',op[2],r,c0+1)
                        ink.line('k',(X(c0)+3,Y(r+1)+5),(X(c0+op[3])-3,Y(r+1)+5+ink.rnd.uniform(-1.5,1.5)),w=3.2,amp=0.8)
            r+=2; i+=1
        pages.append(ink); n+=1
    print(title,len(pages),'hoja(s); última usa hasta fila',r)
    return pages

def museos():
    return notes('Museos de Santa Cruz',[
     ('h','1º Museo de Arte Sacro Catedralicio'),
     ('b','Dentro de la catedral Metropolitana, plaza 24 de Septiembre'),
     ('b','Colección más importante del arte religioso del oriente Boliviano: piezas de platería, tallas en madera, vestimentas litúrgicas de los siglos XVII - XVIII.'),
     ('h','2º Museo de Arte Contemporáneo (MAC)'),('b','Centro histórico'),
     ('b','Fundado en 1991: obras de arte moderno y actual de artistas Bolivianos y latinoamericanos. Varias salas, patios; entrada gratuita'),
     ('h','3º Museo de historia de Santa Cruz UAGRM'),
     ('b','Casa patrimonial de estilo Art Nouveau casa de (1915 - 1920)'),
     ('b','Exposiciones de arqueología, documentos coloniales, historia regional y cultural cruceña.'),
     ('h','4º Museo de Historia Natural Noel Kempff Mercado. Av. Irala'),
     ('b','Dedicado a biodiversidad, fauna, flora y paleontología de la región; incluye restos de mastodonte de más de 500,000 años'),
     ('h','5º Museo Histórico militar "Héroes de la guerra del Chaco"'),
     ('b','Exposiciones sobre la Guerra del Chaco: armas, uniformes, mapas, objetos históricos')],21)
def arcilla():
    return notes('La Historia de la arcilla',[
     ('h','Prehistoria (hace unos 10.000 años)'),
     ('b','Los primeros humanos descubrieron que la arcilla mojada podía darle forma que al secarse al sol se endurecía. Hacían vasijas para guardar alimentos y agua.'),
     ('h','Descubrimiento del fuego para cocerla (aprox. 6000 a.C.)'),
     ('b','Descubrieron que al pasarla por el fuego, la arcilla se hacía mucho más fuerte y ya no se deshacía con el agua. Nace la alfarería.'),
     ('h','Civilizaciones antiguas'),
     ('b','En Bolivia, la arcilla son muy importantes porque nos ayudan a conocer la historia y cultura de nuestros pueblos.'),
     ('q',['La arcilla es moldeable cuando está',('_','mojada')]),
     ('q',['Al cocerse en',('_','el fuego'),'se convierte en un material duro y resistente.']),
     ('q',['Los primeros descubrimientos del uso de la arcilla ocurrieron en la época',('_','Prehistoria')]),
     ('q',['Los objetos de la arcilla son importantes porque nos ayudan a conocer la',('_','historia'),'de nuestros antepasados.'])],31)
def busto():
    return notes('Tema: El busto en el arte',[
     ('h','¿Qué es un busto?'),
     ('b','El busto es una escultura que representa solamente la cabeza, el cuello y una parte de los hombros y el pecho de una persona. No incluye el resto del cuerpo. Es una de las formas más antiguas y comunes de representación escultórica. Su nombre del latín bustum, que se refería a la parte superior del cuerpo.'),
     ('h','Breve historia del busto.'),
     ('b','En la antigüedad Grecia y sobre todo en la Antigua Roma, los bustos eran muy populares. Se hacían para representar a dioses, emperadores, filósofos o antepasados. Los romanos los guardaban en sus casas como recuerdo de su familia.')],41)

# ---------------- mapa conceptual ----------------
def mapa(seed=11):
    ink=Ink4(seed); rnd=ink.rnd
    ink.cellline('k',NAME,1,MC0)
    T='Las artes visuales'; c0=MC0+(MC1-MC0+1-len(T))//2+1
    ink.cellline('r',T,3,c0); ink.underline('r',X(c0)+2,X(c0+len(T)),Y(4)+9)
    cx=(X(MC0)+X(MC1+1))/2
    def txt(c,t,line,col): ink.halfline(c,t,line,col)
    def ctr(c,t,line):   # centrado en columnas (2 letras por cuadro)
        n=len(t); col=(MC0+MC1+1)/2-n*CWM/2+rnd.uniform(-0.4,0.4); ink.halfline(c,t,line,col)
    ink.arrow2('k',(cx+rnd.uniform(-4,4),Y(4.35)),(cx+rnd.uniform(-6,6),Y(5.55)),bend=10)
    ink.halfline('r','son',5.1,(MC0+MC1+1)/2+0.7)
    # definición
    d='formas de expresión artística que utilizan elementos visuales, como imágenes, formas, colores y espacios, para comunicar ideas, emociones y mensajes.'
    cl,cr=MC0+1,MC1; n=int((cr-cl+1-0.5)/CWM); ls=wrapn(d,n); T0=6
    ink.rect('r',X(cl),Y(T0),X(cr+1),Y(T0+len(ls)+1))
    for i,l in enumerate(ls): txt('k',l,T0+1+i,cl+0.25)
    bottom=T0+len(ls)+1
    def best(items,tot,mn):
        import itertools
        k=len(items); bestc=None
        rng=range(mn,tot-mn*(k-1)+1)
        for ws in itertools.product(rng,repeat=k):
            if sum(ws)!=tot: continue
            hl=max(len(wrapn(h.upper(),int((w-0.6)/CWM))) for (h,_),w in zip(items,ws))
            bl=max(len(wrapn(b,int((w-0.6)/CWM))) for (_,b),w in zip(items,ws))
            if any(max(len(x) for x in h.upper().split(' '))>int((w-0.6)/CWM) or max(len(x) for x in b.split(' '))>int((w-0.6)/CWM) for (h,b),w in zip(items,ws)): continue
            cost=(hl+bl,max(ws)-min(ws))
            if bestc is None or cost<bestc[0]: bestc=(cost,ws)
        return list(bestc[1])
    def section(r0,label,items,widths):
        widths=best(items,32,6) if len(items)==4 else best(items,32,9); print('anchos',widths)
        ctr('r',label,r0+1)
        # columnas
        cols=[];c=MC0
        for w in widths: cols.append((c,w)); c+=w
        n_l=[wrapn(h.upper(),int((w-0.6)/CWM)) for (h,_),(c,w) in zip(items,cols)]; hl=max(len(x) for x in n_l)
        tops=r0+3+hl-1
        T=tops+1
        bottoms=[]
        for (h,b),(c,w),hls in zip(items,cols,n_l):
            cc=c+w/2
            ink.arrow2('k',(cx+(cc-(MC0+MC1+1)/2)*CW*0.18,Y(r0+1.28)),(X(cc)+rnd.uniform(-5,5),Y(r0+2.1)),bend=12)
            for i,l in enumerate(hls): ink.halfline('r',l,r0+3+i,cc-len(l)*CWM/2)
            ink.arrow2('k',(X(cc)+rnd.uniform(-4,4),Y(tops+0.22)),(X(cc)+rnd.uniform(-4,4),Y(T-0.1)),bend=5)
            ls=wrapn(b,int((w-0.6)/CWM))
            ink.rect('r',X(c)+10,Y(T),X(c+w)-10,Y(T+len(ls)+1))
            for i,l in enumerate(ls): ink.halfline('k',l,T+1+i,c+0.4)
            bottoms.append(T+len(ls)+1)
        return max(bottoms)
    b=section(bottom,'SE CARACTERIZAN POR',[('La expresión visual','Comunican ideas, sentimientos y mensajes a través de imágenes, formas, colores y espacios.'),
        ('La creatividad','Permiten expresar la imaginación y la forma única de ver el mundo de cada persona.'),
        ('La diversidad de técnicas','Utilizan diferentes materiales y procedimientos como pintura, dibujo, escultura, fotografía y artes digitales.'),
        ('El valor cultural','Representan la historia, la identidad y las tradiciones de diferentes pueblos y épocas.')],[8,7,10,7]); print('s1 fin fila',b)
    b=section(b,'PRINCIPALES TIPOS',[('Pintura','Se realiza sobre superficies como tela, papel o muro, utilizando colores.'),
        ('Dibujo','Se crea con líneas y trazos sobre papel u otras superficies.'),
        ('Escultura','Obras tridimensionales que se elaboran con materiales como piedra, madera, metal o arcilla.'),
        ('Fotografía','Captura imágenes de la realidad a través de una cámara.')],[8,7,10,7]); print('s2 fin fila',b)
    b=section(b,'ES IMPORTANTE POR',[('Desarrolla la creatividad','Estimula la imaginación y la capacidad de crear nuevas ideas.'),
        ('Fomenta la observación','Ayuda a mirar el entorno con más atención y apreciar la belleza del mundo.'),
        ('Preserva la cultura','Contribuye a conocer, valorar y mantener la historia y las tradiciones de los pueblos.')],[11,10,11]); print('s3 fin fila',b,'(máx 47)')
    return ink

if __name__=='__main__':
    HN=np.load('hoja/Hn.npy'); photo=cv2.imread('hoja/a.jpg')
    H2=np.diag([SC,SC,1.0])@HN
    inks=[mapa()]+museos()+arcilla()+busto()
    cams=[]
    for i,ink in enumerate(inks):
        R=pen(np.asarray(ink.m['r'],np.float32)/255,i*2+1); K=pen(np.asarray(ink.m['k'],np.float32)/255,i*2+2)
        mr=cv2.warpPerspective(R,H2,(3000,4000),flags=cv2.INTER_AREA|cv2.WARP_INVERSE_MAP)
        mk=cv2.warpPerspective(K,H2,(3000,4000),flags=cv2.INTER_AREA|cv2.WARP_INVERSE_MAP)
        mr=cv2.GaussianBlur(mr,(0,0),0.6); mk=cv2.GaussianBlur(mk,(0,0),0.6)
        c=apply3(photo,mr,mk); c=cv2.resize(c,(2250,3000),interpolation=cv2.INTER_AREA)
        cv2.imwrite(f'v4_{i+1}.jpg',c,[cv2.IMWRITE_JPEG_QUALITY,90]); cams.append(c)
    P=[Image.fromarray(cv2.cvtColor(x,cv2.COLOR_BGR2RGB)) for x in cams]
    out='/home/user/caligrafia/outputs/apuntes'
    P[0].save(f'{out}/Apuntes-David-Gael-Rada-Ayala.pdf',save_all=True,append_images=P[1:],resolution=280,quality=88)
    print(len(P),'páginas')
