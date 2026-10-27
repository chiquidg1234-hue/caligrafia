import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARS, traceMask, extractSampleRGBA, extractTemplateRGBA, buildFont, layoutText, coverage } from '../web/core.mjs';
import { parse } from '../web/vendor/opentype.mjs';

const image = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) });
function rect(im,x,y,w,h,c=0) { for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) { const i=(yy*im.width+xx)*4;im.data[i]=im.data[i+1]=im.data[i+2]=c; } return im; }
function area(p) { return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2; }
const sample=(label,id=label,advance=600)=>({label,char:label,id,advance,paths:[[[40,0],[40,700],[480,700],[480,0]]],baseline:.78});
const template=()=>{const im=image(1260,1782);for(const [x,y,r] of [[60,180,18],[1200,180,12],[60,1680,12],[1200,1680,12]])rect(im,x-r,y-r,2*r,2*r);rect(im,110,306,25,60);rect(im,115,315,15,35,255);return im;};
function rotate(im) { const out=image(im.height,im.width);for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const src=(y*im.width+x)*4,dst=(x*out.width+out.width-1-y)*4;out.data.set(im.data.subarray(src,src+4),dst);}return out; }
// Inverse of x'=(x+40)/(.0001*x+1), y'=(.9*y+40)/(.0001*x+1).
function perspective(im) {const out=image(1260,1700);for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){const xx=(x-40)/(1-.0001*x),yy=(y*(.0001*xx+1)-40)/.9,ix=Math.floor(xx),iy=Math.floor(yy);if(ix>=0&&iy>=0&&ix<im.width&&iy<im.height)out.data.set(im.data.subarray((iy*im.width+ix)*4,(iy*im.width+ix+1)*4),(y*out.width+x)*4);}return out;}

test('contornos conservan huecos y no unen componentes diagonales',()=>{
 const mask=new Uint8Array(100);for(let y=1;y<9;y++)for(let x=1;x<9;x++)mask[y*10+x]=1;for(let y=3;y<7;y++)for(let x=3;x<7;x++)mask[y*10+x]=0;
 const paths=traceMask(mask,10,10,0);assert.equal(paths.length,2);assert.equal(paths.reduce((s,p)=>s+area(p),0),48);assert.ok(paths.every(p=>p.length===4));
 assert.equal(traceMask(Uint8Array.from([1,0,0,1]),2,2,0).length,2);
});
test('captura escala a 1000em con línea base y conserva puntos separados',()=>{
 const im=rect(rect(image(100,100),30,40,20,40),35,20,5,5);const s=extractSampleRGBA(im,'i');
 assert.equal(s.label,'i');assert.equal(s.paths.length,2);assert.equal(s.advance,300);assert.equal(Math.max(...s.paths.flat().map(p=>p[1])),580);assert.equal(Math.min(...s.paths.flat().map(p=>p[1])),-20);
 assert.throws(()=>extractSampleRGBA(image(30,30),'a'),/trazos/);assert.throws(()=>extractSampleRGBA(im,'__proto__'),/etiqueta/);
});
test('avisa de tinta cortada y contraste bajo, sin inventar calidad de identidad',()=>{
 const im=rect(image(80,80),0,15,20,45,175);const s=extractSampleRGBA(im,'a');assert.ok(s.quality.warnings.some(x=>/borde|cortad/i.test(x)));assert.ok(s.quality.warnings.some(x=>/contraste/i.test(x)));assert.ok(s.quality.contrast>=0&&s.quality.contrast<=1);
});
test('plantilla reconoce sus cuatro orientaciones y omite casillas vacías',()=>{
 let im=template();for(let i=0;i<4;i++){const r=extractTemplateRGBA(im);assert.equal(r.info.expected,92);assert.equal(r.samples.length,1);assert.equal(r.samples[0].label,'a');assert.equal(r.samples[0].paths.length,2);assert.deepEqual([r.aligned.width,r.aligned.height],[1260,1782]);im=rotate(im);}
 assert.throws(()=>extractTemplateRGBA(image(300,400)),/marcas/);
});
test('plantilla corrige perspectiva moderada y rechaza orientación ambigua',()=>{
 const r=extractTemplateRGBA(perspective(template()));assert.equal(r.samples.length,1);assert.equal(r.samples[0].label,'a');assert.equal(r.samples[0].paths.length,2);
 const im=template();rect(im,42,162,36,36,255);rect(im,48,168,24,24);assert.throws(()=>extractTemplateRGBA(im),/orientación/);
});
test('cobertura cuenta caracteres españoles y evita contaminación del prototipo',()=>{
 const c=coverage([sample('a'),sample('a','a2'),sample('hola')],2);assert.equal(c.total,92);assert.equal(c.covered,1);assert.equal(c.ready,1);assert.equal(c.counts.a,2);assert.equal(Object.getPrototypeOf(c.counts),null);assert.ok(c.missing.includes('ñ'));assert.throws(()=>coverage([sample('__proto__')]),/etiqueta/);assert.equal(CHARS.length,92);
});
test('fuente exporta CFF OpenType real con ligadura y variantes accesibles',()=>{
 const out=buildFont([sample('a'),sample('a','a2'),sample('b'),sample('ab')],'Prueba Trazo');const bytes=new Uint8Array(out.buffer);assert.equal(String.fromCharCode(...bytes.slice(0,4)),'OTTO');const font=parse(out.buffer);assert.equal(font.unitsPerEm,1000);assert.equal(font.stringToGlyphs('ab').length,1);assert.ok(font.charToGlyph('a').path.commands.length>0);assert.equal(out.meta.samples,4);assert.equal(out.meta.characters,2);assert.throws(()=>buildFont(Array.from({length:16},(_,i)=>sample('a',String(i)))),/15/);assert.throws(()=>buildFont([{...sample('a'),advance:NaN}]),/avance|advance/);
});
test('compositor elige unión más larga, normaliza y repite semilla sin cambiar geometría',()=>{
 const samples=[sample('a','a1'),sample('a','a2'),sample('b'),sample('ab','lig',1100),sample('á')];const a=layoutText('ab a\r\na\u0301\tba',samples),b=layoutText('ab a\n á    ba'.replace('\n ','\n'),samples);assert.equal(a.missing.length,0);assert.equal(a.pages[0][0].sampleId,'lig');assert.deepEqual(a,b);assert.equal(a.pages[0][0].scale,15*25.4/72/1000);assert.deepEqual(a.pages[0][0].paths,samples[3].paths);assert.deepEqual(layoutText('c',samples),{pages:[],missing:['c']});
});
test('compositor corta palabras largas, pagina y valida límites de papel',()=>{
 const samples=[sample('a')];const r=layoutText('a'.repeat(3000),samples,{width:70,height:70,margin:10,size:15,leading:8});assert.ok(r.pages.length>1);for(const p of r.pages)for(const g of p){assert.ok(g.x>=10&&g.x+480*g.scale<=60.001);assert.ok(g.y-700*g.scale>=9.999&&g.y<=60.001);}
 assert.throws(()=>layoutText('a',samples,{margin:40,width:70}),/márgen|margen/);assert.doesNotThrow(()=>layoutText('a',samples,{leading:3,size:48}));assert.throws(()=>layoutText('a\na',samples,{leading:3,size:48}),/interlineado/);assert.throws(()=>layoutText('a',[sample('a','a',12000)],{width:70}),/cabe|ancho/);
});
test('compositor respeta contornos negativos y detecta trazos que superponen líneas',()=>{
 const neg={...sample('a','a',500),paths:[[[-100,0],[-100,700],[600,700],[600,0]]]};const r=layoutText('a'.repeat(22),[neg],{width:71,height:70,margin:10});for(const p of r.pages)for(const g of p){assert.ok(g.x-100*g.scale>=9.999);assert.ok(g.x+600*g.scale<=61.001);}
 const tall={...sample('a'),paths:[[[0,-500],[0,1700],[500,1700],[500,-500]]]};assert.throws(()=>layoutText('a\na',[tall]),/interlineado/);
});
test('validación rechaza datos importados dañados sin crear una fuente vacía',()=>{
 assert.throws(()=>buildFont([]),/muestras/);assert.throws(()=>buildFont([{...sample('a'),paths:[[[0,0],[1,0],[NaN,2]]]}]),/Punto/);assert.throws(()=>layoutText('a',[{...sample('a'),label:'b'}]),/coinciden/);assert.throws(()=>coverage([sample(' ')]),/etiqueta/);assert.throws(()=>extractSampleRGBA(image(20,20),'a',{threshold:NaN}),/Umbral/);
 const out=buildFont([sample('ñ')],'José · Mi letra');assert.ok(parse(out.buffer).charToGlyph('ñ').path.commands.length>0);
});
