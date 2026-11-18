import math, random, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
FONT='/home/user/caligrafia/outputs/mi-caligrafia/Mi-letra-Uniforme.ttf'
SC=2; TW,TH=2100,2840
X0,Y0,PX,PY=237.0,205.0,51.73,51.64
def gx(k): return X0+PX*k
def gy(k): return Y0+PY*k
FR=(237,205,1995,2720)
RED=(205,20,35); BLK=(22,22,28)
NAME='David Gael Rada Ayala'

class Ink:
    def __init__(s,seed):
        s.m={'r':Image.new('L',(TW*SC,TH*SC),0),'k':Image.new('L',(TW*SC,TH*SC),0)}
        s.d={k:ImageDraw.Draw(v) for k,v in s.m.items()}
        s.rnd=random.Random(seed)
    def dr(s,c): return s.d[c]
    def font(s,sz): return ImageFont.truetype(FONT,int(sz*SC))
    # ---- text
    def width(s,t,sz): return s.font(sz).getlength(t)/SC
    def text(s,c,x,y,t,sz,anchor='l',slope=None,jit=1.6):
        f=s.font(sz); w=f.getlength(t)/SC
        if anchor=='c': x=x-w/2
        elif anchor=='r': x=x-w
        if slope is None: slope=s.rnd.uniform(-0.008,0.008)
        x0=x; cx=x
        for i,wd in enumerate(t.split(' ')):
            if wd:
                yy=y+slope*(cx-x0)+s.rnd.uniform(-jit,jit)
                s.d[c].text((cx*SC,yy*SC),wd,font=f,fill=255,anchor='ls')
            cx+=f.getlength(wd+' ')/SC
        return w
    def wrap(s,t,sz,maxw):
        out=[];cur=''
        for w in t.split(' '):
            cc=(cur+' '+w).strip()
            if s.width(cc,sz)<=maxw: cur=cc
            else: out.append(cur); cur=w
        out.append(cur); return out
    # ---- strokes
    def _noise(s,n,amp,sm=8):
        a=np.array([s.rnd.uniform(-1,1) for _ in range(n//sm+3)]); 
        xs=np.linspace(0,len(a)-1.001,n); i=xs.astype(int); f=xs-i
        f=(1-np.cos(f*np.pi))/2
        return (a[i]*(1-f)+a[i+1]*f)*amp
    def stroke(s,c,pts,w=4.2,amp=1.8):
        P=np.array(pts,float)
        seg=np.hypot(*np.diff(P,axis=0).T); L=seg.sum(); n=max(4,int(L/10))
        t=np.concatenate([[0],np.cumsum(seg)])
        tt=np.linspace(0,L,n)
        xs=np.interp(tt,t,P[:,0]); ys=np.interp(tt,t,P[:,1])
        xs=xs+s._noise(n,amp); ys=ys+s._noise(n,amp)
        pp=[(x*SC,y*SC) for x,y in zip(xs,ys)]
        ww=w*SC*s.rnd.uniform(0.92,1.08)
        s.d[c].line(pp,fill=255,width=int(ww),joint='curve')
        for p in (pp[0],pp[-1]): s.d[c].ellipse([p[0]-ww/2,p[1]-ww/2,p[0]+ww/2,p[1]+ww/2],fill=255)
    def line(s,c,a,b,w=4.2,amp=1.5): s.stroke(c,[a,b],w,amp)
    def box(s,c,x0,y0,x1,y1,r=18,w=4.2,amp=2.0):
        r=min(r,(x1-x0)/3,(y1-y0)/3)
        def arc(cx,cy,a0,a1):
            return [(cx+r*math.cos(math.radians(a)),cy+r*math.sin(math.radians(a))) for a in np.linspace(a0,a1,6)]
        j=lambda: s.rnd.uniform(-3,3)
        pts=[(x0+r+8,y0+j())]+[(x1-r,y0+j())]+arc(x1-r,y0+r,-90,0)+[(x1+j(),y1-r)]+arc(x1-r,y1-r,0,90)+[(x0+r,y1+j())]+arc(x0+r,y1-r,90,180)+[(x0+j(),y0+r)]+arc(x0+r,y0+r,180,270)+[(x0+r+34,y0+s.rnd.uniform(1,5))]
        s.stroke(c,pts,w,amp)
    def underline(s,c,x0,x1,y,w=3.6):
        s.stroke(c,[(x0,y),((x0+x1)/2,y+s.rnd.uniform(-2,3)),(x1+s.rnd.uniform(-6,10),y+s.rnd.uniform(-2,2))],w,1.3)
    def arrow(s,c,a,b,w=4.2):
        mid=((a[0]+b[0])/2+s.rnd.uniform(-5,5),(a[1]+b[1])/2)
        s.stroke(c,[a,mid,b],w,1.5)
        ang=math.atan2(b[1]-a[1],b[0]-a[0])
        for da in (150,-150):
            aa=ang+math.radians(da+s.rnd.uniform(-8,8)); L=s.rnd.uniform(22,30)
            s.stroke(c,[b,(b[0]+L*math.cos(aa),b[1]+L*math.sin(aa))],w,0.6)
    # ---- compose
    def masks(s):
        return {k:np.asarray(v.resize((TW,TH),Image.LANCZOS),np.float32)/255 for k,v in s.m.items()}

def apply(bg,mR,mK,alpha=0.96):
    out=bg.astype(np.float32)
    for m,c in ((mR,RED),(mK,BLK)):
        c=np.array(c[::-1],np.float32)/255  # BGR
        out=out*(1-alpha*m[...,None]*(1-c[None,None,:]))
    return np.clip(out,0,255).astype(np.uint8)

def header(ink,title=None,tag=None):
    ink.text('k',240,76,NAME,44,jit=1)
    if title: ink.text('r',388,126,title,50,jit=1.2)
    if tag: ink.text('r',1975,gy(1)+2,tag,50,anchor='r')

# ---------------- page 1 (mapa conceptual) ----------------
def page1(seed=11):
    ink=Ink(seed); header(ink)
    rnd=ink.rnd; cx=(FR[0]+FR[2])/2
    y=gy(1)+60
    def titlebox(y,t,sz):
        w=ink.width(t,sz); ink.box('r',cx-w/2-45,y-sz*0.95,cx+w/2+45,y+sz*0.45,r=26,w=5,amp=2.5)
        ink.box('r',cx-w/2-40,y-sz*0.9,cx+w/2+40,y+sz*0.4,r=26,w=3,amp=3) if False else None
        ink.text('r',cx,y,t,sz,anchor='c')
        return y+sz*0.45
    def pill(y,t,sz=44):
        w=ink.width(t,sz); ink.box('r',cx-w/2-26,y-sz*0.95,cx+w/2+26,y+sz*0.4,r=22,w=4)
        ink.text('r',cx,y,t,sz,anchor='c'); return y+sz*0.4
    def arrow(y0,y1,x=None): ink.arrow('k',(cx+rnd.uniform(-5,5) if x is None else x,y0),(cx+rnd.uniform(-5,5) if x is None else x,y1))
    yb=titlebox(y+40,'Las artes visuales',98)
    arrow(yb+8,yb+58); yb=pill(yb+110,'son'); arrow(yb+8,yb+56)
    # definition
    sz=40; t='formas de expresión artística que utilizan elementos visuales, como imágenes, formas, colores y espacios, para comunicar ideas, emociones y mensajes.'
    lines=ink.wrap(t,sz,1300); top=yb+58; h=len(lines)*54+36
    ink.box('r',cx-720,top,cx+720,top+h,r=26,w=4.2)
    for i,l in enumerate(lines): ink.text('k',cx+rnd.uniform(-5,5),top+22+54*(i+1)-8,l,sz,anchor='c')
    yb=top+h; arrow(yb+6,yb+58); yb=pill(yb+110,'SE CARACTERIZAN POR')
    def row(y0,items):
        n=len(items); gap=24; m=40; bw=(FR[2]-FR[0]-2*m-gap*(n-1))/n
        hs,bs=38,36
        pre=[(ink.wrap(h,hs,bw-24),ink.wrap(b,bs,bw-30)) for h,b in items]
        hh=max(len(p[0]) for p in pre)*46+22; bh=max(len(p[1]) for p in pre)*46+26
        for i,(p,(h,b)) in enumerate(zip(pre,items)):
            x0=FR[0]+m+i*(bw+gap)+rnd.uniform(-5,5); yy=y0+rnd.uniform(-6,6); hgt=hh+bh+rnd.uniform(-6,10)
            ink.box('r',x0,yy,x0+bw+rnd.uniform(-8,8),yy+hgt,r=22,w=4.2)
            ink.line('r',(x0+4,yy+hh+rnd.uniform(-3,3)),(x0+bw-4,yy+hh+rnd.uniform(-3,3)),w=3.2)
            for k,l in enumerate(p[0]): ink.text('r',x0+bw/2,yy+8+46*(k+1)-4,l,hs,anchor='c')
            for k,l in enumerate(p[1]): ink.text('k',x0+bw/2+rnd.uniform(-3,3),yy+hh+10+46*(k+1)-4,l,bs,anchor='c')
        return y0+hh+bh+10
    yb=row(yb+55,[('LA EXPRESIÓN VISUAL','Comunican ideas, sentimientos y mensajes a través de imágenes, formas, colores y espacios.'),
                  ('LA CREATIVIDAD','Permiten expresar la imaginación y la forma única de ver el mundo de cada persona.'),
                  ('LA DIVERSIDAD DE TÉCNICAS','Utilizan diferentes materiales y procedimientos como pintura, dibujo, escultura, fotografía y artes digitales.'),
                  ('EL VALOR CULTURAL','Representan la historia, la identidad y las tradiciones de diferentes pueblos y épocas.')])
    arrow(yb+6,yb+58); yb=pill(yb+110,'PRINCIPALES TIPOS')
    yb=row(yb+55,[('PINTURA','Se realiza sobre superficies como tela, papel o muro, utilizando colores.'),
                  ('DIBUJO','Se crea con líneas y trazos sobre papel u otras superficies.'),
                  ('ESCULTURA','Obras tridimensionales que se elaboran con materiales como piedra, madera, metal o arcilla.'),
                  ('FOTOGRAFÍA','Captura imágenes de la realidad a través de una cámara.')])
    arrow(yb+6,yb+58); yb=pill(yb+110,'ES IMPORTANTE POR')
    yb=row(yb+55,[('DESARROLLA LA CREATIVIDAD','Estimula la imaginación y la capacidad de crear nuevas ideas.'),
                  ('FOMENTA LA OBSERVACIÓN','Ayuda a mirar el entorno con más atención y apreciar la belleza del mundo.'),
                  ('PRESERVA LA CULTURA','Contribuye a conocer, valorar y mantener la historia y las tradiciones de los pueblos.')])
    print('p1 end',yb,'/',FR[3]); return ink

# ---------------- notes pages ----------------
def notes(title,blocks,seed,tag=None,sz=62):
    for sz in range(sz,50,-2):
        ink=Ink(seed); header(ink,title,tag); k=3; left=gx(2.2); maxw=FR[2]-45-left; ok=True
        for kind,s,col in blocks:
            if kind=='gap': k+=1; continue
            if kind=='h':
                f=sz+6
                for l in ink.wrap(s,f,maxw+30):
                    w=ink.text('r',left-34,gy(k),l,f); ink.underline('r',left-34,left-34+w,gy(k)+12); k+=2
            elif kind=='b':
                for l in ink.wrap(s,sz,maxw): ink.text('k',left,gy(k),l,sz); k+=2
            elif kind=='blank':
                x=left
                for seg in s:
                    if seg is None:
                        ink.line('k',(x+6,gy(k)+4),(x+400,gy(k)+4),w=3.4,amp=1.2); x+=420
                    else:
                        for w in seg.split(' '):
                            if not w: continue
                            ww=ink.width(w+' ',sz)
                            if x+ww>left+maxw: k+=2; x=left
                            ink.text('k',x,gy(k),w,sz,slope=0,jit=1.2); x+=ww
                k+=2
        if k<=48: print(title,'size',sz,'ends k',k); return ink
    print('NO FIT',title); return ink

B='b'
def page2():
    bl=[('h','1. Museo de Arte Sacro Catedralicio','r'),
     (B,'Dentro de la catedral Metropolitana, plaza 24 de Septiembre','k'),
     (B,'Colección más importante del arte religioso del oriente Boliviano: piezas de platería, tallas en madera, vestimentas litúrgicas de los siglos XVII - XVIII.','k'),
     ('h','2. Museo de Arte Contemporáneo (MAC)','r'),(B,'Centro histórico','k'),
     (B,'Fundado en 1991: obras de arte moderno y actual de artistas Bolivianos y latinoamericanos. Varias salas, patios; entrada gratuita','k'),
     ('h','3. Museo de historia de Santa Cruz UAGRM','r'),
     (B,'Casa patrimonial de estilo Art Nouveau casa de (1915 - 1920)','k'),
     (B,'Exposiciones de arqueología, documentos coloniales, historia regional y cultural cruceña.','k'),
     ('h','4. Museo de Historia Natural Noel Kempff Mercado. Av. Irala','r'),
     (B,'Dedicado a biodiversidad, fauna, flora y paleontología de la región; incluye restos de mastodonte de más de 500,000 años','k'),
     ('h','5. Museo Histórico militar "Héroes de la guerra del Chaco"','r'),
     (B,'Exposiciones sobre la Guerra del Chaco: armas, uniformes, mapas, objetos históricos','k')]
    return notes('Museos de Santa Cruz',bl,21,tag='5to ABCD')
def page3():
    bl=[('h','Prehistoria (hace unos 10.000 años)','r'),
     (B,'Los primeros humanos descubrieron que la arcilla mojada podía darle forma que al secarse al sol se endurecía. Hacían vasijas para guardar alimentos y agua.','k'),
     ('h','Descubrimiento del fuego para cocerla (aprox. 6000 a.C.)','r'),
     (B,'Descubrieron que al pasarla por el fuego, la arcilla se hacía mucho más fuerte y ya no se deshacía con el agua. Nace la alfarería.','k'),
     ('h','Civilizaciones antiguas','r'),
     (B,'En Bolivia, la arcilla son muy importantes porque nos ayudan a conocer la historia y cultura de nuestros pueblos.','k'),
     ('gap',0,0),
     ('blank',['La arcilla es moldeable cuando está',None],'k'),
     ('blank',['Al cocerse en',None,'se convierte en un material duro y resistente.'],'k'),
     ('blank',['Los primeros descubrimientos del uso de la arcilla ocurrieron en la época',None],'k'),
     ('blank',['Los objetos de la arcilla son importantes porque nos ayudan a conocer la',None,'de nuestros antepasados.'],'k')]
    return notes('La Historia de la arcilla',bl,31)
def page4():
    bl=[('h','¿Qué es un busto?','r'),
     (B,'El busto es una escultura que representa solamente la cabeza, el cuello y una parte de los hombros y el pecho de una persona. No incluye el resto del cuerpo.','k'),
     (B,'Es una de las formas más antiguas y comunes de representación escultórica. Su nombre del latín bustum, que se refería a la parte superior del cuerpo.','k'),
     ('gap',0,0),
     ('h','Breve historia del busto.','r'),
     (B,'En la antigüedad Grecia y sobre todo en la Antigua Roma, los bustos eran muy populares. Se hacían para representar a dioses, emperadores, filósofos o antepasados. Los romanos los guardaban en sus casas como recuerdo de su familia.','k')]
    return notes('El busto en el arte',bl,41)

if __name__=='__main__':
    import os
    HN=np.load('hoja/Hn.npy'); flat=cv2.imread('hoja/flat2.png'); photo=cv2.imread('hoja/a.jpg')
    S=np.diag([SC,SC,1.0]); H2=S@HN
    out='/home/user/caligrafia/outputs/apuntes'; os.makedirs(out,exist_ok=True)
    inks=[page1(),page2(),page3(),page4()]
    flats=[];cams=[]
    for i,ink in enumerate(inks):
        m=ink.masks(); f=apply(flat,m['r'],m['k'])[30:2810,40:2080]; flats.append(f)
        cv2.imwrite(f'{out}/pagina{i+1}.png',f)
        mr=cv2.warpPerspective(np.asarray(ink.m['r'],np.float32)/255,H2,(3000,4000),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
        mk=cv2.warpPerspective(np.asarray(ink.m['k'],np.float32)/255,H2,(3000,4000),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
        mr=cv2.GaussianBlur(mr,(0,0),0.7); mk=cv2.GaussianBlur(mk,(0,0),0.7)
        c=apply(photo,mr,mk,0.93); c=cv2.resize(c,(2250,3000),interpolation=cv2.INTER_AREA); cams.append(c)
        cv2.imwrite(f'camara{i+1}.jpg',c,[cv2.IMWRITE_JPEG_QUALITY,88])
    def pdf(imgs,path,dpi,q):
        P=[Image.fromarray(cv2.cvtColor(x,cv2.COLOR_BGR2RGB)) for x in imgs]
        P[0].save(path,save_all=True,append_images=P[1:],resolution=dpi,quality=q)
    pdf(flats,f'{out}/Apuntes-David-Gael-Rada-Ayala.pdf',250,92)
    pdf(cams,f'{out}/Apuntes-David-Gael-Rada-Ayala-efecto-camara.pdf',280,85)
