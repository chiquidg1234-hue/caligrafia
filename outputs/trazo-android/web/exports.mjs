import * as bundle from './vendor/pdf-lib.min.js';
import {CHARS} from './core.mjs';
import {paperGuides,restoreDraft,validColor} from './model.mjs';
const PDF=globalThis.PDFLib||bundle.default, MM=72/25.4;
export function svgPaths(paths,flip=false){return paths.map(p=>'M'+p.map(([x,y])=>`${x.toFixed(3)},${(flip?-y:y).toFixed(3)}`).join('L')+'Z').join('');}
export async function templatePDF(copies=1){
  const doc=await PDF.PDFDocument.create(),font=await doc.embedFont(PDF.StandardFonts.Helvetica),bold=await doc.embedFont(PDF.StandardFonts.HelveticaBold);
  for(let sheet=0;sheet<copies;sheet++){
    const p=doc.addPage([210*MM,297*MM]),text=(s,x,y,size=9,f=font)=>p.drawText(s,{x:x*MM,y:(297-y)*MM,size,font:f,color:PDF.rgb(.1,.2,.32)});
    text('Tu letra empieza aquí.',15,16,20,bold);text(`Muestra ${sheet+1} · Imprime al 100 %. Escribe de forma natural.`,15,23);
    for(const [x,y,size] of [[10,30,6],[200,30,4],[10,280,4],[200,280,4]])p.drawRectangle({x:(x-size/2)*MM,y:(297-y-size/2)*MM,width:size*MM,height:size*MM,color:PDF.rgb(0,0,0)});
    [...CHARS].forEach((ch,i)=>{const x=15+i%10*18,y=42+Math.floor(i/10)*22;p.drawRectangle({x:x*MM,y:(297-y-22)*MM,width:18*MM,height:22*MM,borderWidth:.35,borderColor:PDF.rgb(.85,.88,.91)});text(ch,x+1,y+3.8,8);p.drawLine({start:{x:(x+1)*MM,y:(297-y-17.5)*MM},end:{x:(x+17)*MM,y:(297-y-17.5)*MM},thickness:.3,color:PDF.rgb(.91,.93,.96)});});
    text('Tinta oscura. Deja libres los bordes y conserva las cuatro marcas negras.',16,277,8);
  }return new Blob([await doc.save()],{type:'application/pdf'});
}
export async function pagesPDF(layout,options={}){
  if(layout.missing.length)throw Error('Faltan muestras: '+layout.missing.join(' '));if(!layout.pages.length)throw Error('Escribe un texto antes de exportar.');
  const d=restoreDraft(options),{width,height}=d,rgb=(value,fallback='#193c66')=>PDF.rgb(...(validColor(value)?value:fallback).slice(1).match(/../g).map(x=>parseInt(x,16)/255)),doc=await PDF.PDFDocument.create();
  for(const entries of layout.pages){const page=doc.addPage([width*MM,height*MM]);
    page.drawRectangle({x:0,y:0,width:width*MM,height:height*MM,color:rgb(d.paperColor,'#ffffff')});
    for(const guide of paperGuides(d))page.drawLine({start:{x:guide.x1*MM,y:(height-guide.y1)*MM},end:{x:guide.x2*MM,y:(height-guide.y2)*MM},color:rgb(guide.color,'#dce7ef'),thickness:guide.margin?.5:.35});
    page.pushOperators(PDF.setLineJoin(PDF.LineJoinStyle.Round));
    for(const item of entries){const color=rgb(item.color||d.ink),strokeWidth=Number.isFinite(item.strokeWidth)?Math.max(0,item.strokeWidth):0;page.drawSvgPath(svgPaths(item.paths,true),{x:item.x*MM,y:(height-item.y)*MM,scale:item.scale*MM,color,...(strokeWidth?{borderColor:color,borderWidth:strokeWidth}:{})});}
  }return new Blob([await doc.save()],{type:'application/pdf'});
}
export async function drawingPDF(png,width,height,paths=null){
  const doc=await PDF.PDFDocument.create(),p=doc.addPage([210*MM,297*MM]),scale=Math.min(180*MM/width,267*MM/height),x=(210*MM-width*scale)/2,y=(297*MM-height*scale)/2;
  if(paths)p.drawSvgPath(svgPaths(paths),{x,y:y+height*scale,scale,color:PDF.rgb(0,0,0)});
  else{const im=await doc.embedPng(await png.arrayBuffer());p.drawImage(im,{x,y,width:width*scale,height:height*scale});}
  return new Blob([await doc.save()],{type:'application/pdf'});
}
export async function saveFile(blob,name){
  if(globalThis.TrazoNative){
    const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
    return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{window.removeEventListener('trazo-file-saved',handler);reject(Error('El guardado sigue pendiente. Revisa el selector de archivos.'));},180000);function handler(e){if(e.detail.name!==name)return;clearTimeout(timeout);window.removeEventListener('trazo-file-saved',handler);e.detail.error?reject(Error(e.detail.error)):resolve();}window.addEventListener('trazo-file-saved',handler);try{TrazoNative.saveFile(base64,name,blob.type||'application/octet-stream');}catch(e){clearTimeout(timeout);window.removeEventListener('trazo-file-saved',handler);reject(e);}});
  }
  const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
