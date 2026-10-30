import { Font, Glyph, Path } from './vendor/opentype.mjs';
import {normaliseText,normaliseStyles,styleAt,validColor,PENS} from './model.mjs';
import {composeFormula,isFormula,balanced} from './math.mjs';

export const CHARS='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZñÑáéíóúüÁÉÍÓÚÜ0123456789.,;:!?¿¡()-+=\"\'/';
const PPM=6, MAX_PIXELS=24_000_000, PT_MM=25.4/72;
const forbidden=new Set(['__proto__','prototype','constructor']);
function number(value,fallback,min,max,name) {
 const n=value===undefined?fallback:Number(value);
 if(!Number.isFinite(n)||n<min||n>max)throw new Error(`${name}: usa un valor entre ${min} y ${max}.`);
 return n;
}
function labelOf(value) {
 if(typeof value!=='string')throw new Error('Asigna una etiqueta de 1 a 12 caracteres sin espacios.');
 const label=value.normalize('NFC');
 if(!label||Array.from(label).length>12||/[\s\p{Cc}\p{Cf}]/u.test(label)||forbidden.has(label))throw new Error('Asigna una etiqueta de 1 a 12 caracteres sin espacios ni nombres reservados.');
 return label;
}
function imageSize(image) {
 const {width:w,height:h,data}=image||{};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w*h>MAX_PIXELS||!data||data.length!==w*h*4)throw new Error('Imagen inválida: usa una imagen de 4 píxeles como mínimo y hasta 24 megapíxeles.');
 return [w,h];
}
function luminance(image) {
 const [w,h]=imageSize(image),out=new Uint8Array(w*h);
 for(let i=0;i<out.length;i++) {const j=i*4,a=image.data[j+3]/255;out[i]=Math.round((.2126*image.data[j]+.7152*image.data[j+1]+.0722*image.data[j+2])*a+255*(1-a));}
 return out;
}
function components(mask,w,h,visit) {
 const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length);
 for(let start=0;start<mask.length;start++)if(mask[start]&&!seen[start]) {
  let end=1,head=0,x0=w,y0=h,x1=0,y1=0,sx=0,sy=0;queue[0]=start;seen[start]=1;
  while(head<end) {const p=queue[head++],x=p%w,y=(p-x)/w;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);sx+=x+.5;sy+=y+.5;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,n=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&mask[n]&&!seen[n]){seen[n]=1;queue[end++]=n;}}
  }
  visit({area:end,x0,y0,x1,y1,cx:sx/end,cy:sy/end},queue.subarray(0,end));
 }
}
function distanceSq(p,a,b) {const dx=b[0]-a[0],dy=b[1]-a[1],t=dx||dy?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))):0;return (p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;}
function simplifyOpen(points,tolerance) {
 if(points.length<=2)return points;const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack=[[0,points.length-1]],limit=tolerance*tolerance;
 while(stack.length){const [a,b]=stack.pop();let best=limit,index=-1;for(let i=a+1;i<b;i++){const d=distanceSq(points[i],points[a],points[b]);if(d>best){best=d;index=i;}}if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}}
 return points.filter((_,i)=>keep[i]);
}
function polygonArea(p) {let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return a/2;}
function simplifyClosed(p,tol) {
 const straight=p.filter((b,i)=>{const a=p[(i+p.length-1)%p.length],c=p[(i+1)%p.length];return (b[0]-a[0])*(c[1]-b[1])!==(b[1]-a[1])*(c[0]-b[0]);});
 if(straight.length<4||!tol)return straight;
 let far=1,best=0;for(let i=1;i<straight.length;i++){const d=(straight[i][0]-straight[0][0])**2+(straight[i][1]-straight[0][1])**2;if(d>best){far=i;best=d;}}
 const out=[...simplifyOpen(straight.slice(0,far+1),tol).slice(0,-1),...simplifyOpen([...straight.slice(far),straight[0]],tol).slice(0,-1)];
 return out.length>=3&&Math.sign(polygonArea(out))===Math.sign(polygonArea(straight))?out:straight;
}

/** Pixel boundaries, clockwise outer contours and counterclockwise holes in image coordinates. */
export function traceMask(mask,width,height,tolerance=.5) {
 if(!(mask instanceof Uint8Array)||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>MAX_PIXELS||mask.length!==width*height)throw new Error('Máscara inválida.');
 tolerance=number(tolerance,.5,0,4,'Tolerancia');
 const stride=width+1,edges=new Map();let edgeCount=0;
 function add(x,y,xx,yy,dir){const key=y*stride+x,list=edges.get(key)||[];list.push({end:yy*stride+xx,dir,used:false});edges.set(key,list);if(++edgeCount>1_500_000)throw new Error('Demasiados contornos. Reduce la imagen o limpia el fondo.');}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y*width+x]){if(y===0||!mask[(y-1)*width+x])add(x,y,x+1,y,0);if(x===width-1||!mask[y*width+x+1])add(x+1,y,x+1,y+1,1);if(y===height-1||!mask[(y+1)*width+x])add(x+1,y+1,x,y+1,2);if(x===0||!mask[y*width+x-1])add(x,y+1,x,y,3);}
 const result=[];let vertices=0;
 for(const [start,list] of edges)for(const first of list)if(!first.used){let key=start,edge=first;const points=[];
  do {points.push([key%stride,Math.floor(key/stride)]);edge.used=true;key=edge.end;if(key===start)break;const next=(edges.get(key)||[]).filter(e=>!e.used);if(!next.length)throw new Error('No se pudo cerrar un contorno.');next.sort((a,b)=>{const rank=d=>[1,0,3,2][(d-edge.dir+4)%4];return rank(a.dir)-rank(b.dir)});edge=next[0];}while(points.length<=edgeCount);
  const p=simplifyClosed(points,tolerance);if(p.length>=3&&Math.abs(polygonArea(p))>=.5){vertices+=p.length;if(vertices>350_000)throw new Error('Demasiados contornos. Reduce la imagen o limpia el fondo.');result.push(p);}
 }
 return result;
}

export function extractSampleRGBA(image,label,options={}) {
 label=labelOf(label);const [w,h]=imageSize(image),gray=luminance(image),threshold=number(options.threshold,190,40,250,'Umbral'),baseline=number(options.baseline,.78,.2,.98,'Línea base');
 const mask=new Uint8Array(w*h);let raw=0;for(let i=0;i<mask.length;i++)if(gray[i]<threshold){mask[i]=1;raw++;}
 const clean=new Uint8Array(mask.length),minArea=Math.max(2,Math.floor(mask.length*.00003));let count=0,removed=0,x0=w,x1=0,y0=h,y1=0;
 components(mask,w,h,(c,pixels)=>{if(c.area<minArea){removed+=c.area;return;}for(const p of pixels)clean[p]=1;count+=c.area;x0=Math.min(x0,c.x0);x1=Math.max(x1,c.x1);y0=Math.min(y0,c.y0);y1=Math.max(y1,c.y1);});
 if(count<6)throw new Error('No se detectaron trazos en esta muestra. Ajusta el recorte o el umbral.');
 const scale=options.template?50/PPM:1000/h;
 const paths=traceMask(clean,w,h,.3).map(p=>p.map(([x,y])=>[Math.round((x-x0)*scale+45),Math.round((h*baseline-y)*scale)]));
 if(!paths.length)throw new Error('No se detectaron trazos cerrados.');
 const inkHist=new Uint32Array(256),bgHist=new Uint32Array(256);for(let i=0;i<gray.length;i++)(clean[i]?inkHist:bgHist)[gray[i]]++;
 const quantile=(hist,total,q)=>{let n=0;for(let i=0;i<256;i++){n+=hist[i];if(n>=total*q)return i;}return 255;};
 const dark=quantile(inkHist,count,.5),light=quantile(bgHist,mask.length-count,.8),contrast=Math.max(0,light-dark)/255,warnings=[];
 if(contrast<.38)warnings.push('Contraste bajo: usa tinta más oscura y luz uniforme.');
 if(x0<=1||y0<=1||x1>=w-2||y1>=h-2)warnings.push('El trazo toca el borde y puede estar cortado. Amplía el recorte.');
 if(removed>Math.max(8,raw*.08))warnings.push('Se retiraron puntos muy pequeños del fondo; revisa tildes y puntos antes de guardar.');
 if(count/mask.length>.5)warnings.push('Hay mucha tinta o sombra en el recorte. Revisa el fondo y el umbral.');
 if(light-quantile(bgHist,mask.length-count,.15)>45)warnings.push('El fondo tiene luz desigual o sombras; revisa los contornos.');
 return {label,char:label,paths,advance:Math.round((x1-x0+1)*scale+100),baseline,quality:{warnings,contrast,inkFraction:count/(w*h)}};
}

function solve(matrix,values) {
 const n=values.length,a=matrix.map((r,i)=>[...r,values[i]]);
 for(let col=0;col<n;col++){let pivot=col;for(let row=col+1;row<n;row++)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row;if(Math.abs(a[pivot][col])<1e-10)throw new Error('Las marcas no forman una plantilla completa.');[a[col],a[pivot]]=[a[pivot],a[col]];const d=a[col][col];for(let j=col;j<=n;j++)a[col][j]/=d;for(let row=0;row<n;row++)if(row!==col){const f=a[row][col];for(let j=col;j<=n;j++)a[row][j]-=f*a[col][j];}}
 return a.map(r=>r[n]);
}
function homography(from,to) {const rows=[],values=[];for(let i=0;i<4;i++){const [x,y]=from[i],[u,v]=to[i];rows.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);values.push(u,v);}return [...solve(rows,values),1];}
function crop(image,left,top,right,bottom) {const width=right-left,height=bottom-top,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)data.set(image.data.subarray(((y+top)*image.width+left)*4,((y+top)*image.width+right)*4),y*width*4);return {width,height,data};}

export function extractTemplateRGBA(image,options={}) {
 const [w,h]=imageSize(image),ratio=Math.min(1,1600/Math.max(w,h)),sw=Math.round(w*ratio),sh=Math.round(h*ratio),gray=luminance(image),mask=new Uint8Array(sw*sh);
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)mask[y*sw+x]=gray[Math.min(h-1,Math.floor((y+.5)/ratio))*w+Math.min(w-1,Math.floor((x+.5)/ratio))]<95?1:0;
 const candidates=[];components(mask,sw,sh,c=>{const cw=c.x1-c.x0+1,ch=c.y1-c.y0+1;if(c.area>sw*sh*.000025&&c.area<sw*sh*.008&&cw/ch>.55&&cw/ch<1.8&&c.area/(cw*ch)>.73&&Math.max(cw,ch)<Math.min(sw,sh)*.09)candidates.push(c);});
 const corners=[];for(const [right,bottom] of [[false,false],[true,false],[true,true],[false,true]]){const choices=candidates.filter(c=>(right?c.cx>sw*.70:c.cx<sw*.30)&&(bottom?c.cy>sh*.70:c.cy<sh*.30));if(!choices.length)throw new Error('No se encontraron las cuatro marcas. Fotografía la hoja completa y conserva sus cuatro marcas negras.');choices.sort((a,b)=>((right?1-a.cx/sw:a.cx/sw)+(bottom?1-a.cy/sh:a.cy/sh))-((right?1-b.cx/sw:b.cx/sw)+(bottom?1-b.cy/sh:b.cy/sh)));corners.push(choices[0]);}
 if(new Set(corners).size!==4)throw new Error('No se encontraron cuatro marcas diferentes.');
 const sizes=corners.map(c=>c.area),order=[0,1,2,3].sort((a,b)=>sizes[b]-sizes[a]);
 if(sizes[order[0]]<sizes[order[1]]*1.3)throw new Error('No se distingue la marca de orientación. Evita sombras y conserva la marca mayor.');
 const start=order[0],ordered=[0,1,2,3].map(i=>corners[(start+i)%4]),src=ordered.map(c=>[c.cx/ratio,c.cy/ratio]);
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),spans=src.map((p,i)=>dist(p,src[(i+1)%4]));
 if(Math.min(...spans)<Math.min(w,h)*.45||Math.max(spans[0],spans[2])/Math.min(spans[0],spans[2])>1.65||Math.max(spans[1],spans[3])/Math.min(spans[1],spans[3])>1.65||Math.max(...sizes)/Math.min(...sizes)>5.5)throw new Error('Las marcas tienen demasiada perspectiva o no forman una plantilla completa. Toma la foto más de frente.');
 const matrix=homography([[60,180],[1200,180],[1200,1680],[60,1680]],src),width=1260,height=1782,data=new Uint8ClampedArray(width*height*4);data.fill(255);
 const rgba=image.data;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const den=matrix[6]*x+matrix[7]*y+1,sx=(matrix[0]*x+matrix[1]*y+matrix[2])/den-.5,sy=(matrix[3]*x+matrix[4]*y+matrix[5])/den-.5,ix=Math.floor(sx),iy=Math.floor(sy);
  if(ix<0||iy<0||ix>=w-1||iy>=h-1)continue;
  const fx=sx-ix,fy=sy-iy,d=(y*width+x)*4,a=(iy*w+ix)*4,b=a+4,c=a+w*4,e=c+4;
  const wa=(1-fx)*(1-fy)*rgba[a+3]/255,wb=fx*(1-fy)*rgba[b+3]/255,wc=(1-fx)*fy*rgba[c+3]/255,we=fx*fy*rgba[e+3]/255,white=255*(1-wa-wb-wc-we);
  for(let k=0;k<3;k++)data[d+k]=white+rgba[a+k]*wa+rgba[b+k]*wb+rgba[c+k]*wc+rgba[e+k]*we;
 }
 const aligned={data,width,height},samples=[];
 for(let i=0;i<CHARS.length;i++){const x=15+i%10*18,y=42+Math.floor(i/10)*22;const cell=crop(aligned,Math.round((x+1.4)*6),Math.round((y+5)*6),Math.round((x+16.6)*6),Math.round((y+20.5)*6));try{samples.push(extractSampleRGBA(cell,CHARS[i],{...options,template:true,baseline:12.5/15.5}));}catch(e){if(!/No se detectaron trazos/.test(e.message))throw e;}}
 if(!samples.length)throw new Error('La plantilla no contiene trazos. Rellena las casillas con tinta oscura.');
 return {samples,info:{detected:samples.length,expected:CHARS.length,aligned:true},aligned};
}

function validateSamples(samples) {
 if(!Array.isArray(samples)||samples.length>1600)throw new Error('Biblioteca inválida o demasiado grande.');
 const groups=new Map();let vertices=0;
 for(const s of samples){if(!s||typeof s!=='object')throw new Error('Muestra inválida.');const label=labelOf(s.label??s.char);if(s.label&&s.char&&s.label.normalize('NFC')!==s.char.normalize('NFC'))throw new Error('La etiqueta y el carácter de la muestra no coinciden.');
  if(!Number.isFinite(s.advance)||s.advance<1||s.advance>15000)throw new Error('El avance de la muestra es inválido.');
  if(!Array.isArray(s.paths)||!s.paths.length||s.paths.length>10000)throw new Error('La muestra no tiene contornos válidos.');
  for(const p of s.paths){if(!Array.isArray(p)||p.length<3)throw new Error('Contorno inválido.');vertices+=p.length;if(vertices>2_000_000)throw new Error('La biblioteca tiene demasiados contornos.');for(const point of p)if(!Array.isArray(point)||point.length!==2||!point.every(n=>Number.isFinite(n)&&Math.abs(n)<=20000))throw new Error('Punto de contorno inválido.');}
  const group=groups.get(label)||[];group.push(s);if(group.length>15)throw new Error(`El límite es 15 variantes por etiqueta. «${label}» tiene más de 15.`);groups.set(label,group);
 }
 return groups;
}
export function coverage(samples,goal=6) {
 goal=number(goal,6,1,15,'Objetivo de muestras');const groups=validateSamples(samples),counts=Object.create(null);for(const [label,ss] of groups)counts[label]=ss.length;
 const chars=Array.from(CHARS),missing=chars.filter(c=>!groups.has(c));return {total:chars.length,covered:chars.length-missing.length,ready:chars.filter(c=>(counts[c]||0)>=goal).length,counts,missing};
}
function fontPath(paths) {const path=new Path();for(const polygon of paths){path.moveTo(...polygon[0]);for(let i=1;i<polygon.length;i++)path.lineTo(...polygon[i]);path.close();}return path;}
export function buildFont(samples,name='Mi letra') {
 const groups=validateSamples(samples);if(!groups.size)throw new Error('Añade muestras antes de crear tu fuente.');
 const family=(String(name).trim()||'Mi letra').slice(0,60),notdef=fontPath([[[60,0],[60,700],[500,700],[500,0]],[[100,40],[460,40],[460,660],[100,660]]]);
 const glyphs=[new Glyph({name:'.notdef',advanceWidth:550,path:notdef}),new Glyph({name:'space',unicode:32,advanceWidth:320,path:new Path()})],indices=new Map(),variants=Object.create(null);let privateCode=0xe000;
 for(const [label,ss] of groups){const ids=[];variants[label]=ss.length;for(let i=0;i<ss.length;i++){const s=ss[i],glyph=new Glyph({name:`trazo${glyphs.length}`,unicode:privateCode++,advanceWidth:Math.round(s.advance),path:fontPath(s.paths)});if(Array.from(label).length===1&&!i)glyph.addUnicode(label.codePointAt(0));ids.push(glyphs.length);glyphs.push(glyph);}indices.set(label,ids);}
 let maxY=1000,minY=-250;for(const s of samples)for(const p of s.paths)for(const [,y] of p){maxY=Math.max(maxY,y);minY=Math.min(minY,y);}
 const font=new Font({familyName:family,styleName:'Regular',unitsPerEm:1000,ascender:Math.ceil(maxY),descender:Math.floor(minY),glyphs});
 for(const [label,ids] of indices){const chars=Array.from(label);if(chars.length>1&&chars.every(c=>indices.has(c))){font.substitution.add('liga',{sub:chars.map(c=>indices.get(c)[0]),by:ids[0]});}if(ids.length>1)font.substitution.add('aalt',{sub:ids[0],by:ids.slice(1)});}
 const buffer=font.toArrayBuffer();return {buffer,meta:{name:family,characters:[...groups.keys()].filter(c=>Array.from(c).length===1).length,samples:samples.length,variants}};
}

// Spanish syllable boundaries (indices where a hyphen may go), keeping at
// least two letters on each side: «gue-rra», «sindi-ca-lismo».
const VOWELS='aeiouáéíóúü',STRONG='aeoáéíóú',INSEPARABLE=new Set(['bl','br','cl','cr','dl','dr','fl','fr','gl','gr','kl','kr','pl','pr','tl','tr','ch','ll','rr']);
export function syllableBreaks(word){
 const w=Array.from(word.toLowerCase()),vowel=i=>VOWELS.includes(w[i])&&!(w[i]==='u'&&/[qg]/.test(w[i-1]||'')&&/[eéií]/.test(w[i+1]||'')),nuclei=[];
 for(let i=0;i<w.length;i++){if(!vowel(i))continue;const last=nuclei.at(-1),hiatus=last&&last[1]===i&&(STRONG.includes(w[i])&&STRONG.includes(w[i-1])||'íú'.includes(w[i])||'íú'.includes(w[i-1]));if(last&&last[1]===i&&!hiatus)last[1]=i+1;else nuclei.push([i,i+1]);}
 const breaks=[];
 for(let k=1;k<nuclei.length;k++){const end=nuclei[k-1][1],start=nuclei[k][0],run=w.slice(end,start).join('');let at;
  if(run.length<=1)at=end;else if(run.length===2)at=INSEPARABLE.has(run)?end:end+1;else if(run.length===3)at=INSEPARABLE.has(run.slice(1))?end+1:end+2;else at=end+2;
  if(at>=2&&w.length-at>=2)breaks.push(at);}
 return breaks;
}

// Deterministic small-step generator for the natural mode; separate from the
// variant choice so that turning naturalness on keeps the same text wrapping
// decisions as close as possible.
function wobble(seed) {let s=(seed^0x9e3779b9)>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296*2-1;};}
function transformPaths(paths,{angle=0,scale=1,cx=0}){
 if(!angle&&scale===1)return paths;const c=Math.cos(angle)*scale,s=Math.sin(angle)*scale;
 return paths.map(p=>p.map(([x,y])=>[cx+(x-cx)*c-y*s,(x-cx)*s+y*c]));
}

export function layoutText(text,samples,options={}) {
 const groups=validateSamples(samples);text=normaliseText(text);
 if(!text.trim())throw new Error('Escribe un texto para imprimir.');if(text.length>100000)throw new Error('El texto supera 100000 caracteres. Divídelo en partes.');
 const width=number(options.width,210,70,420,'Ancho'),height=number(options.height,297,70,594,'Alto'),margin=number(options.margin,18,0,120,'Margen'),left=number(options.marginLeft,margin,0,120,'Margen izquierdo'),right=number(options.marginRight,margin,0,120,'Margen derecho'),top=number(options.marginTop,margin,0,120,'Margen superior'),bottomMargin=number(options.marginBottom,margin,0,120,'Margen inferior'),size=number(options.size,15,6,48,'Tamaño'),leading=number(options.leading,10,3,30,'Interlineado'),scale=size*25.4/72/1000;
 if(left+right>=width-10||top+bottomMargin>=height-10)throw new Error('Los márgenes dejan muy poco espacio para imprimir.');
 const gridMm=number(options.gridMm,5,2,20,'Cuadrícula'),gridOriginY=number(options.gridOriginY,0,-20,20,'Origen vertical');number(options.gridOriginX,0,-20,20,'Origen horizontal');if(options.marginLine)number(options.marginLineX,left,0,width,'Línea de margen');
 const hyphenate=!!options.hyphenate,natural=number(options.natural,0,0,1,'Naturalidad'),lineGap=Math.round(number(options.lineGap,0,0,3,'Renglones libres')),snap=!!options.snapToGrid,math=!!options.math;
 // Flexible lines: a tall formula takes as many extra rows as it needs.
 const flexible=math||snap;
 const styles=normaliseStyles(options.styles,text.length),baseColor=validColor(options.ink)?options.ink:'#193c66',styleKey=s=>[s.bold,s.italic,s.color||baseColor].join('|');
 let seed=number(options.seed,17,-2147483648,4294967295,'Semilla')>>>0;const initialSeed=seed,last=new Map();
 const choose=(ss,label)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;let pick=ss[Math.floor(seed/4294967296*ss.length)];
  // Natural writing never repeats the very same shape twice in a row.
  if(natural&&ss.length>1&&pick===last.get(label))pick=ss[(ss.indexOf(pick)+1+Math.floor(seed/4294967296*(ss.length-1)))%ss.length];last.set(label,pick);return pick;};
 const labels=[...groups.keys()].sort((a,b)=>b.length-a.length),missing=new Set(),tokens=[];
 // tracking: extra room after each letter (part of an em), uneven by trackJitter, as in a hurried hand.
 const spread=wobble(initialSeed*13+5),tracking=Math.max(0,Math.min(.4,Number(options.tracking)||0)),trackJitter=Math.max(0,Math.min(1,Number(options.trackJitter)||0)),track=()=>tracking?tracking*1000*scale*Math.max(0,1+trackJitter*spread()):0;
 const unitOf=(label,sample,style,paths=sample.paths)=>{if(style.italic)paths=paths.map(p=>p.map(([x,y])=>[x+y*.18,y]));const strokeWidth=style.bold?48:0,pad=strokeWidth/2*scale;let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of paths)for(const [x,y] of p){minX=Math.min(minX,x*scale-pad);maxX=Math.max(maxX,x*scale+pad);minY=Math.min(minY,y*scale-pad);maxY=Math.max(maxY,y*scale+pad);}return {label,sample,paths,style,strokeWidth,minX,maxX,minY,maxY,advance:sample.advance*scale+track()};};
 const words=[];for(const match of text.matchAll(/\n| +|[^ \n]+/gu)){const previous=words.at(-1);
  // Formulas may contain spaces inside their brackets: keep them together.
  if(math&&previous&&previous.open&&match[0]!=='\n'){previous.token+=match[0];previous.open=!balanced(previous.token);continue;}
  words.push({token:match[0],offset:match.index,open:math&&match[0]!=='\n'&&!/^ +$/.test(match[0])&&!balanced(match[0])});}
 // Bracketed groups that are not formulas, like «(5, 7)», stay ordinary words.
 for(let i=words.length-1;i>=0;i--){const {token,offset}=words[i];if(token.includes(' ')&&!isFormula(token))words.splice(i,1,...[...token.matchAll(/ +|[^ ]+/gu)].map(m=>({token:m[0],offset:offset+m.index})));}
 const ink=(()=>{const o=groups.get('o')?.[0]||groups.get('l')?.[0];if(!o)return 42;let a=0,p=0;for(const c of o.paths){for(let i=0;i<c.length;i++){const q=c[(i+1)%c.length];a+=c[i][0]*q[1]-q[0]*c[i][1];p+=Math.hypot(q[0]-c[i][0],q[1]-c[i][1]);}}return Math.min(70,Math.max(25,Math.abs(a)/p));})();
 for(const {token,offset} of words){if(token==='\n'||/^ +$/.test(token)){tokens.push(token);continue;}const units=[];
  if(math&&isFormula(token)){const style=styleAt(styles,offset),formula=composeFormula(token,label=>groups.has(label)?choose(groups.get(label),label):null,{ink,seed:(initialSeed+offset*7919)>>>0});for(const c of formula.missing)missing.add(c);if(!formula.missing.length)units.push({...unitOf(token,{paths:formula.paths,advance:formula.advance},style),formula:true});tokens.push(units);continue;}
  for(let i=0;i<token.length;){const style=styleAt(styles,offset+i),key=styleKey(style),label=labels.find(l=>token.startsWith(l,i)&&Array.from({length:l.length},(_,k)=>k).every(k=>styleKey(styleAt(styles,offset+i+k))===key));if(label){const sample=choose(groups.get(label),label);units.push(unitOf(label,sample,style));i+=label.length;}else{const char=String.fromCodePoint(token.codePointAt(i));missing.add(char);i+=char.length;}}tokens.push(units);}
 if(missing.size)return {pages:[],missing:[...missing].sort()};
 let ascent=0,descent=0;for(const token of tokens)if(Array.isArray(token))for(const unit of token){ascent=Math.max(ascent,unit.maxY);descent=Math.max(descent,-unit.minY);}
 const lineTop=top+ascent,bottom=height-bottomMargin-descent;if(!flexible&&lineTop>bottom)throw new Error('El tamaño de los trazos no cabe en el alto del papel.');
 // 1. Break into lines. 2. Give each line its baseline and page.
 const available=width-left-right,lines=[[]],jitter=wobble(initialSeed);let x=left;
 const hyphenAt=(token,room,span)=>{
  if(!groups.has('-')||token.some(u=>u.formula||Array.from(u.label).length!==1))return null;
  const word=token.map(u=>u.label).join(''),letters=word.match(/^[^\p{L}]*(\p{L}+)/u);if(!letters||letters[1].length<5)return null;
  const lead=word.indexOf(letters[1]),style=token[0].style,hyphen=unitOf('-',choose(groups.get('-'),'-'),style),cuts=syllableBreaks(letters[1]).map(k=>k+lead).reverse();
  for(const at of cuts){const used=token.slice(0,at).reduce((a,u)=>a+span(u),0);if(used+span(hyphen)<=room+1e-8)return {at,hyphen};}
  return null;
 };
 const breakLine=()=>{lines.push([]);x=left;};
 for(let token of tokens){if(token==='\n'){breakLine();continue;}if(typeof token==='string'){const space=320*scale*(1+natural*.14*jitter())+tracking*1500*scale;for(let i=0;i<token.length;i++){if(x===left)continue;if(x+space>width-right)breakLine();else x+=space;}continue;}
  const span=u=>Math.max(u.advance,u.maxX)-Math.min(0,u.minX),wordWidth=token.reduce((a,u)=>a+span(u),0);
  if(x>left&&x+wordWidth>width-right){
   // Split long words at a Spanish syllable with a hyphen, as on paper.
   const split=hyphenate&&hyphenAt(token,width-right-x,span);
   if(split){for(const unit of token.slice(0,split.at)){const drawX=x-Math.min(0,unit.minX);lines.at(-1).push({unit,x:drawX});x=drawX+span(unit)+Math.min(0,unit.minX);}const drawX=x-Math.min(0,split.hyphen.minX);lines.at(-1).push({unit:split.hyphen,x:drawX});breakLine();token=token.slice(split.at);}
   else breakLine();
  }
  for(const unit of token){const {label,maxX,minX,advance}=unit;
   if(Math.max(advance,maxX)-Math.min(0,minX)>available+1e-8)throw new Error(`La muestra «${label}» no cabe en el ancho. Reduce el tamaño o el margen.`);
   if(x+Math.max(advance,maxX)-Math.min(0,minX)>width-right+1e-8)breakLine();const drawX=x-Math.min(0,minX);lines.at(-1).push({unit,x:drawX});x=drawX+Math.max(advance,maxX);
  }
 }
 const step=snap?Math.max(1,Math.ceil(leading/gridMm-1e-9))*gridMm:leading,pitch=step*(1+lineGap),rows=snap?gridMm:pitch;
 const guide=y=>{if(!snap)return y;const origin=top+((gridOriginY%gridMm)+gridMm)%gridMm;return origin+Math.ceil((y-origin)/gridMm-1e-9)*gridMm;};
 const extentOf=line=>line.reduce((e,{unit})=>[Math.max(e[0],unit.maxY),Math.max(e[1],-unit.minY)],[0,0]);
 if(!flexible&&lines.length>1&&leading+1e-8<ascent+descent)throw new Error('Aumenta el interlineado: los trazos de tus muestras se superponen entre líneas.');
 const pages=[[]],lineHasFormula=line=>line.some(({unit})=>unit.formula&&(unit.maxY>640*scale||-unit.minY>260*scale));let y=null,previousDescent=0,previousFormula=false,previousLine=[];
 // Lines only move down when real strokes would touch: an accent above a gap
 // between descenders stays on the next row, as on paper.
 const collides=(a,ay,b,by,clear)=>a.some(({unit:u,x:ux})=>b.some(({unit:v,x:vx})=>ux+u.minX<vx+v.maxX&&vx+v.minX<ux+u.maxX&&ay-u.minY+clear>by-v.maxY));
 for(const line of lines){
  const [up,down]=flexible?extentOf(line):[ascent,descent];
  if(flexible&&top+up>height-bottomMargin-down+1e-8)throw new Error('El tamaño de los trazos no cabe en el alto del papel.');
  if(y===null)y=guide(top+up);else{const previous=y;y+=pitch;if(flexible){const clear=lineHasFormula(line)||previousFormula?rows*.12+.8*Math.max(0,Math.min(1,Number(options.messy)||0)):-rows*.04;while(collides(previousLine,previous,line,y,clear))y+=rows;}
   if(flexible?y+down>height-bottomMargin+1e-8:y>bottom+1e-8){pages.push([]);y=guide(top+up);}}
  previousDescent=down;previousFormula=lineHasFormula(line);previousLine=line;
  for(const {unit,x} of line){const {label,sample,paths,style,strokeWidth}=unit;pages.at(-1).push({...(sample.id===undefined?{}:{sampleId:sample.id}),label,paths,x,y,scale,color:style.color||baseColor,strokeWidth,bold:style.bold,italic:style.italic});}
 }
 if(natural)naturalise(pages,{natural,messy:Math.max(0,Math.min(1,Number(options.messy)||0)),scale,seed:initialSeed,right:width-right,left,slack:number(options.startSlack,0,0,5,'Holgura del inicio')});
 // Pen ink: each letter a little lighter or darker, gel ink a little fuller.
 const pen=PENS[options.pen];
 if(pen){const random=wobble(initialSeed*7+3),tone=(hex,t)=>'#'+hex.slice(1).match(/../g).map(v=>{const c=parseInt(v,16),n=t>0?c+(255-c)*t:c*(1+t);return Math.round(Math.max(0,Math.min(255,n))).toString(16).padStart(2,'0');}).join('');
  for(const page of pages)for(const g of page){const r=random();g.color=tone(g.color,r>0?r*pen.variation:r*pen.variation*.5);if(pen.weight)g.strokeWidth=(g.strokeWidth||0)+pen.weight;}}
 return {pages,missing:[]};
}

// Small, bounded imperfections of a hand: a line that drifts a little, letters
// that sit a hair above or below the base, turn a degree or two and vary their
// size and spacing. Preview and PDF share the result; nothing leaves the margins.
// messy (0–1): a less careful hand; letters turn, grow and jump more.
function naturalise(pages,{natural,messy=0,scale,seed,right,left,slack=0}){
 const loose=1+7*messy,wander=1+2*messy;
 const random=wobble(seed*31+7);
 for(const page of pages){
  const lines=new Map();for(const g of page){if(!lines.has(g.y))lines.set(g.y,[]);lines.get(g.y).push(g);}
  for(const line of lines.values()){
   const slope=random()*.004*natural*(1+messy),lift=Math.max(-.3,Math.min(.3,random()*.18*natural*loose)),start=line[0].x;
   // Each line begins a little further in or out (about ±1 mm at 55 %), as by
   // hand. Lines only start left of the margin when the caller allows it
   // (startSlack, the free squares of a notebook); otherwise they move inwards.
   // The last letter never passes the right margin.
   const room=Math.max(0,right-Math.max(...line.map(g=>g.x+Math.max(...g.paths.flat().map(p=>p[0]))*g.scale))),out=Math.min(slack,1.8*natural),centre=Math.max(0,1.3*natural-out);
   let drift=Math.max(-out,Math.min(room,centre+natural*(2.4*random()+(Math.abs(random())>.8?Math.sign(random()):0))));const base=drift;
   for(const g of line){
    drift=Math.max(-out,Math.min(room,Math.max(base-.6*wander,Math.min(base+.6*wander,drift+random()*.07*natural*loose))));
    const minX=Math.min(...g.paths.flat().map(p=>p[0])),maxX=Math.max(...g.paths.flat().map(p=>p[0]));
    const cx=(minX+maxX)/2,size=1+random()*.03*natural*loose,angle=random()*.028*natural*loose;
    g.paths=transformPaths(g.paths,{angle,scale:size,cx});
    const ink=Math.max(...g.paths.flat().map(p=>p[0]))*g.scale,inkLeft=Math.min(...g.paths.flat().map(p=>p[0]))*g.scale;
    g.x=Math.max(left-out-inkLeft,Math.min(right-ink,g.x+drift));
    // Letters stay on their line: a hand on squared paper wanders only a little.
    g.y+=(g.x-start)*slope+lift+Math.max(-.25,Math.min(.25,random()*.1*natural*loose));
   }
  }
 }
}
