export const MAX_ACTIVE_SAMPLES=1600;
export const DEFAULT_PROFILE_ID='library-default';
export const sampleProfileId=sample=>sample.profileId||DEFAULT_PROFILE_ID;
export function profileSamples(samples,profileId,{trash=false}={}){
  return samples.filter(s=>sampleProfileId(s)===profileId&&(trash?!!s.deletedAt:!s.deletedAt));
}
// Legacy samples acquire an owner without changing their order, shapes or IDs.
export function restoreProfiles(samples,savedProfiles=[],savedActiveId,legacyName='Mi letra'){
  const profiles=[];
  for(const p of Array.isArray(savedProfiles)?savedProfiles:[]){
    if(typeof p?.id==='string'&&p.id&&!profiles.some(x=>x.id===p.id))profiles.push({id:p.id,name:String(p.name||'Mi biblioteca').slice(0,60),fontName:String(p.fontName||p.name||'Mi letra').slice(0,60)});
  }
  const migrated=samples.map(s=>s.profileId?s:{...s,profileId:DEFAULT_PROFILE_ID});
  if(!profiles.length||samples.some(s=>!s.profileId))if(!profiles.some(p=>p.id===DEFAULT_PROFILE_ID))profiles.unshift({id:DEFAULT_PROFILE_ID,name:'Mi biblioteca',fontName:String(legacyName||'Mi letra').slice(0,60)});
  for(const sample of migrated)if(!profiles.some(p=>p.id===sample.profileId))profiles.push({id:sample.profileId,name:'Biblioteca recuperada '+(profiles.length+1),fontName:'Mi letra'});
  return {samples:migrated,profiles,activeProfileId:profiles.some(p=>p.id===savedActiveId)?savedActiveId:profiles[0].id};
}
export function restoreDraft(saved={}){
  const margin=Number.isFinite(saved?.margin)?saved.margin:18;
  const draft={text:'',width:210,height:297,size:15,leading:10,margin:18,marginLeft:margin,marginRight:margin,marginTop:margin,marginBottom:margin,ink:'#193c66',paperColor:'#ffffff',gridColor:'#dce7ef',marginLine:false,marginLineX:margin,marginLineColor:'#dcaeb8',gridMm:5,gridOriginX:0,gridOriginY:0,ruling:'none',seed:17,styles:[],lineGap:0,snapToGrid:false,printOffsetX:0,printOffsetY:0,screenOnlyGuides:false,natural:.5,math:false,...saved};
  draft.text=normaliseText(draft.text);draft.styles=normaliseStyles(draft.styles,draft.text.length);return draft;
}
export const validColor=value=>typeof value==='string'&&/^#[a-f\d]{6}$/i.test(value);
export const normaliseText=value=>String(value??'').normalize('NFC').replace(/\r\n?/g,'\n').replace(/\t/g,'    ');
export function normaliseStyles(ranges,length){
  return (Array.isArray(ranges)?ranges:[]).filter(r=>r&&Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=0&&r.end>r.start&&r.start<length).map(r=>({start:r.start,end:Math.min(length,r.end),bold:!!r.bold,italic:!!r.italic,...(validColor(r.color)?{color:r.color.toLowerCase()}:{})})).sort((a,b)=>a.start-b.start);
}
export function styleAt(ranges,index){let style={bold:false,italic:false};for(const r of ranges){if(r.start>index)break;if(r.start<=index&&index<r.end)style={bold:r.bold,italic:r.italic,...(r.color?{color:r.color}:{})};}return style;}
const sameStyle=(a,b)=>a.bold===b.bold&&a.italic===b.italic&&a.color===b.color;
export function applyTextStyle(ranges,length,start,end,patch){
  start=Math.max(0,Math.min(length,start));end=Math.max(start,Math.min(length,end));
  const current=normaliseStyles(ranges,length),points=[...new Set([0,length,start,end,...current.flatMap(r=>[r.start,r.end])])].sort((a,b)=>a-b),result=[];
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],style=styleAt(current,a);if(a>=start&&a<end)Object.assign(style,patch);if(!validColor(style.color))delete style.color;if(!style.bold&&!style.italic&&!style.color)continue;const previous=result.at(-1);if(previous?.end===a&&sameStyle(previous,style))previous.end=b;else result.push({start:a,end:b,...style});}return result;
}
export function remapTextStyles(oldText,newText,ranges,edit){
  let start=edit?.start,oldEnd=edit?.end,newEnd;
  if(Number.isInteger(start)&&Number.isInteger(oldEnd)&&start>=0&&oldEnd>=start&&oldEnd<=oldText.length){
    const removed=Math.max(0,oldText.length-newText.length);
    if(start===oldEnd&&edit.inputType?.startsWith('delete')){
      if(edit.inputType.endsWith('Backward'))start=Math.max(0,start-removed);
      else if(edit.inputType.endsWith('Forward'))oldEnd=Math.min(oldText.length,oldEnd+removed);
    }
    newEnd=oldEnd+newText.length-oldText.length;
  }
  // IME changes and browsers without a reliable beforeinput range use a text diff.
  if(!Number.isInteger(newEnd)||newEnd<start||newEnd>newText.length||oldText.slice(0,start)!==newText.slice(0,start)||oldText.slice(oldEnd)!==newText.slice(newEnd)){
    start=0;while(start<oldText.length&&start<newText.length&&oldText[start]===newText[start])start++;
    oldEnd=oldText.length;newEnd=newText.length;while(oldEnd>start&&newEnd>start&&oldText[oldEnd-1]===newText[newEnd-1]){oldEnd--;newEnd--;}
  }
  const delta=newEnd-oldEnd,shifted=[];for(const r of normaliseStyles(ranges,oldText.length)){if(r.start<start)shifted.push({...r,end:Math.min(r.end,start)});if(r.end>oldEnd)shifted.push({...r,start:Math.max(r.start,oldEnd)+delta,end:r.end+delta});}
  if(newEnd>start){const inherited=styleAt(normaliseStyles(ranges,oldText.length),Math.max(0,start-1));if(inherited.bold||inherited.italic||inherited.color)shifted.push({start,end:newEnd,...inherited});}
  return normaliseStyles(shifted,newText.length);
}
export function prepareLibraryImport(backup,samples,profiles,activeProfileId,{merge=false,makeId=()=>crypto.randomUUID()}={}){
  const profile=merge?profiles.find(p=>p.id===activeProfileId):{id:makeId(),name:backup.name,fontName:backup.name};
  if(!profile)throw Error('No se encontró la biblioteca seleccionada.');
  const incoming=backup.samples.map(sample=>({...sample,id:makeId(),profileId:profile.id}));
  validateSampleChanges(samples,incoming);
  return {samples:incoming,profiles:merge?profiles:[...profiles,profile],activeProfileId:profile.id};
}
// Canvas and PDF consume the same guide segments, in millimetres.
export function paperGuides(options={}){
  const d=restoreDraft(options),{width,height,marginLeft:left,marginRight:right,marginTop:top,marginBottom:bottom,ruling}=d,step=Number(ruling==='grid'?d.gridMm:d.leading),lines=[];
  if(![width,height,left,right,top,bottom,step].every(Number.isFinite)||step<1||left<0||right<0||top<0||bottom<0||width<=left+right||height<=top+bottom)return lines;
  const shift=value=>((Number(value)||0)%step+step)%step;
  if(['lines','grid'].includes(ruling))for(let y=top+shift(d.gridOriginY);y<height-bottom;y+=step)lines.push({x1:left,y1:y,x2:width-right,y2:y,color:validColor(d.gridColor)?d.gridColor:'#dce7ef'});
  if(ruling==='grid')for(let x=left+shift(d.gridOriginX);x<width-right;x+=step)lines.push({x1:x,y1:top,x2:x,y2:height-bottom,color:validColor(d.gridColor)?d.gridColor:'#dce7ef'});
  if(d.marginLine&&Number.isFinite(d.marginLineX)&&d.marginLineX>=0&&d.marginLineX<=width)lines.push({x1:d.marginLineX,y1:0,x2:d.marginLineX,y2:height,color:validColor(d.marginLineColor)?d.marginLineColor:'#dcaeb8',margin:true});
  return lines;
}
export function normaliseLabel(value){
  const s=String(value??'').normalize('NFC').trim();
  if(!s||[...s].length>12||/[\s\p{C}]/u.test(s)||['__proto__','prototype','constructor'].includes(s))throw Error('Escribe una letra o una unión de hasta 12 caracteres, sin espacios.');
  return s;
}
export function collectGroups(samples){
  const groups=new Map();
  for(const sample of samples){if(sample.deletedAt)continue;const label=normaliseLabel(sample.label??sample.char);if(!groups.has(label))groups.set(label,{label,samples:[]});groups.get(label).samples.push(sample);}
  return [...groups.values()].sort((a,b)=>a.label.localeCompare(b.label,'es'));
}
export function validateSampleChanges(samples,changes){
  const changedIds=new Set(changes.map(s=>s.id).filter(Boolean));
  const combined=[...samples.filter(s=>!changedIds.has(s.id)),...changes].filter(s=>!s.deletedAt);
  const profiles=new Map();for(const sample of combined){const profileId=sampleProfileId(sample);if(!profiles.has(profileId))profiles.set(profileId,[]);profiles.get(profileId).push(sample);}
  for(const profile of profiles.values()){
    if(profile.length>MAX_ACTIVE_SAMPLES)throw Error('Puedes guardar hasta '+MAX_ACTIVE_SAMPLES+' muestras activas por biblioteca. Retira algunas antes de añadir o recuperar otras.');
    for(const group of collectGroups(profile))if(group.samples.length>15)throw Error('Ya tienes 15 variantes de «'+group.label+'» en esta biblioteca. Retira alguna antes de añadir o recuperar otra.');
  }
}
export function validateBackup(input){
  if(input?.type!=='trazo-library'||input.version!==2||!Array.isArray(input.samples)||!input.samples.length)throw Error('La copia no es una biblioteca Trazo válida o está vacía.');
  if(input.samples.length>MAX_ACTIVE_SAMPLES)throw Error('La copia supera el límite de '+MAX_ACTIVE_SAMPLES+' muestras activas.');
  let points=0;const counts=new Map();
  const samples=input.samples.map((s,i)=>{
    const label=normaliseLabel(s.label??s.char),n=(counts.get(label)||0)+1;counts.set(label,n);
    if(n>15)throw Error('La copia tiene más de 15 variantes para '+label+'.');
    if(!Array.isArray(s.paths)||!s.paths.length||s.paths.length>5000)throw Error('Muestra sin trazos válidos.');
    const paths=s.paths.map(path=>{if(!Array.isArray(path)||path.length<3)throw Error('Contorno incompleto.');return path.map(p=>{if(++points>1500000||!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>10000))throw Error('Coordenadas de trazo inválidas.');return [...p];});});
    if(!Number.isFinite(s.advance)||s.advance<1||s.advance>15000)throw Error('Ancho de letra inválido.');
    const baseline=Number.isFinite(s.baseline)?s.baseline:.78;if(baseline<.2||baseline>.98)throw Error('Línea base inválida.');
    return {id:'import-'+Date.now()+'-'+i,label,char:label,paths,advance:s.advance,baseline,created:Date.now(),quality:{warnings:[],contrast:0,inkFraction:0}};
  });
  return {type:'trazo-library',version:2,name:String(input.name||'Mi letra').slice(0,60),samples};
}
