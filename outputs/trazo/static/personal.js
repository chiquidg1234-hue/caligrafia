'use strict';
const $ = id => document.getElementById(id);
const DRAFT_KEY = 'trazo.personal-handwriting.v1';
const NOTEBOOK_KEY = 'trazo.personal-notebook.v1';
const optionFields = {
  paper:'personal-paper',width:'personal-width',height:'personal-height',size:'personal-size',leading:'personal-leading',ruling:'personal-ruling',
  marginLeft:'personal-margin-left',marginRight:'personal-margin-right',marginTop:'personal-margin-top',marginBottom:'personal-margin-bottom',
  offset_x:'personal-offset-x',offset_y:'personal-offset-y',ink:'personal-ink',gridMm:'personal-grid-mm',gridOriginX:'personal-grid-x',gridOriginY:'personal-grid-y',
  gridColor:'personal-grid-color',paperColor:'personal-paper-color',marginLineX:'personal-margin-line-x',marginLineColor:'personal-margin-line-color'
};
const numericFields = new Set(['width','height','size','leading','marginLeft','marginRight','marginTop','marginBottom','offset_x','offset_y','gridMm','gridOriginX','gridOriginY','marginLineX']);
const paperSizes = {A4:[210,297],A5:[148,210],Carta:[215.9,279.4]};
let catalog={profiles:[]},token='',layout=null,pageIndex=0,seed=17;
let requestNumber=0,previewTimer,previewAbort,pendingPreview=false,exporting=false,lastProfile='',restoredDraft=false,fontRequest=0;
let editorModel={text:'',styles:[]},editorSelection={start:0,end:0},typingStyle={bold:false,italic:false,color:null},typingOverride=null;
let editorRendering=false,editorComposing=false,editorUndo=[],editorRedo=[];

function cleanStyle(style={}) {
  return {bold:style.bold===true,italic:style.italic===true,color:typeof style.color==='string'&&/^#[0-9a-f]{6}$/i.test(style.color)?style.color.toLowerCase():null};
}
function sameStyle(a,b) {return a.bold===b.bold&&a.italic===b.italic&&a.color===b.color;}
function expandedStyles(text,ranges=[]) {
  const values=Array.from({length:text.length},()=>cleanStyle());
  if(!Array.isArray(ranges))return values;
  for(const range of ranges) {
    if(!range||!Number.isInteger(range.start)||!Number.isInteger(range.end))continue;
    const style=cleanStyle(range);
    for(let i=Math.max(0,range.start);i<Math.min(text.length,range.end);i++)values[i]=style;
  }
  return values;
}
function packedStyles(text,values) {
  const ranges=[];
  for(let i=0;i<text.length;i++) {
    const style=cleanStyle(values[i]);const last=ranges[ranges.length-1];
    if(last&&sameStyle(last,style))last.end=i+1;else ranges.push({start:i,end:i+1,...style});
  }
  return ranges;
}
function normalizeEditor(text,ranges=[]) {
  text=String(text).replace(/\r\n?/g,'\n');
  const old=expandedStyles(text,ranges),chars=[],styles=[];
  const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('es',{granularity:'grapheme'}).segment(text)].map(s=>({text:s.segment,index:s.index})):[...text].map((s,index)=>({text:s,index}));
  for(const segment of segments) {
    const normalized=segment.text.normalize('NFC');chars.push(normalized);
    for(let i=0;i<normalized.length;i++)styles.push(old[segment.index]||cleanStyle());
  }
  const normalized=chars.join('').slice(0,12000);
  return {text:normalized,styles:packedStyles(normalized,styles)};
}
function currentProfile() {return catalog.profiles.find(p=>p.id===$('personal-profile').value);}
function readOptions() {
  const result={seed,marginLine:$('personal-margin-line').checked};
  for(const [key,id] of Object.entries(optionFields))result[key]=numericFields.has(key)?Number($(id).value):$(id).value;
  if(paperSizes[result.paper])[result.width,result.height]=paperSizes[result.paper];
  return result;
}
function requestBody() {
  const options=readOptions();
  // DOM selections use UTF-16; API ranges count Unicode characters. They agree
  // for the personal library's BMP glyphs, and missing emoji still get a clear error.
  const offsets=[0];let offset=0,count=0;
  for(const char of editorModel.text){for(let i=0;i<char.length;i++)offsets[offset+i]=count;offset+=char.length;offsets[offset]=++count;}
  return {profile:$('personal-profile').value,text:editorModel.text,
    styles:editorModel.styles.map(range=>({...range,start:offsets[range.start],end:offsets[range.end],color:range.color||options.ink})),options};
}
async function api(path,body,signal) {
  const response=await fetch(path,body===undefined?{signal}:{method:'POST',headers:{'Content-Type':'application/json','X-Trazo-Key':token},body:JSON.stringify(body),signal});
  let data;try{data=await response.json();}catch{throw new Error('No se pudo leer la respuesta de Trazo. Vuelve a cargar la página.');}
  if(!response.ok)throw new Error(data.error||'No se pudo completar la operación.');return data;
}
function applyPaperOptions(values={}) {
  const migrated={...values};
  if(migrated.margin!==undefined)for(const key of ['marginLeft','marginRight','marginTop','marginBottom'])if(migrated[key]===undefined)migrated[key]=migrated.margin;
  for(const [key,id] of Object.entries(optionFields))if(migrated[key]!==undefined)$(id).value=migrated[key];
  if(typeof migrated.marginLine==='boolean')$('personal-margin-line').checked=migrated.marginLine;
  updatePaperFields();
}
function saveDraft() {
  try {
    const draft={version:2,profile:$('personal-profile').value,text:editorModel.text,styles:editorModel.styles,options:readOptions()};
    localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));$('draft-status').textContent='Borrador guardado';
  }catch{$('draft-status').textContent='El navegador no pudo guardar el borrador';}
}
function restoreDraft() {
  try {
    const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(!saved||typeof saved!=='object')return;
    restoredDraft=true;if(typeof saved.text==='string')editorModel=normalizeEditor(saved.text.slice(0,12000),saved.styles);
    lastProfile=typeof saved.profile==='string'?saved.profile:'';
    if(saved.options&&typeof saved.options==='object') {
      applyPaperOptions(saved.options);
      if(Number.isInteger(saved.options.seed)&&saved.options.seed>=0&&saved.options.seed<=2147483647)seed=saved.options.seed;
    }
  }catch{/* A damaged draft never inserts HTML or prevents starting again. */}
}
function editorPoint(offset) {
  const editor=$('personal-text'),walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())) {if(offset<=node.length)return {node,offset};offset-=node.length;}
  return {node:editor,offset:editor.childNodes.length};
}
function selectEditor(start,end=start,focus=true) {
  const editor=$('personal-text');start=Math.max(0,Math.min(start,editorModel.text.length));end=Math.max(start,Math.min(end,editorModel.text.length));
  if(focus)editor.focus({preventScroll:true});
  const a=editorPoint(start),b=editorPoint(end),range=document.createRange();range.setStart(a.node,a.offset);range.setEnd(b.node,b.offset);
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);editorSelection={start,end};
}
function captureEditorSelection() {
  if(editorRendering||editorComposing)return;
  const editor=$('personal-text'),selection=window.getSelection();
  if(!selection||!selection.rangeCount||!editor.contains(selection.anchorNode)||!editor.contains(selection.focusNode))return;
  const range=selection.getRangeAt(0),before=document.createRange();before.selectNodeContents(editor);before.setEnd(range.startContainer,range.startOffset);
  const start=Math.min(editorModel.text.length,before.toString().length),end=Math.min(editorModel.text.length,start+range.toString().length);
  editorSelection={start,end};const values=expandedStyles(editorModel.text,editorModel.styles);
  if(start===end) {
    if(typingOverride&&typingOverride.at===start)typingStyle=typingOverride.style;
    else {typingOverride=null;typingStyle=cleanStyle(values[Math.max(0,start-1)]);}
  }else{typingOverride=null;typingStyle=cleanStyle(values[start]);}
  updateFormatToolbar();
}
function updateFormatToolbar() {
  const {start,end}=editorSelection,values=expandedStyles(editorModel.text,editorModel.styles),selected=end>start?values.slice(start,end):[typingStyle];
  $('format-bold').setAttribute('aria-pressed',String(selected.length>0&&selected.every(s=>s.bold)));
  $('format-italic').setAttribute('aria-pressed',String(selected.length>0&&selected.every(s=>s.italic)));
  $('format-color').value=(selected[0]&&selected[0].color)||$('personal-ink').value;
  $('format-auto').classList.toggle('selected',selected.every(s=>!s.color));
}
function renderEditor(selection=null,focus=true) {
  const editor=$('personal-text');editorRendering=true;const fragment=document.createDocumentFragment();
  for(const range of editorModel.styles) {
    const span=document.createElement('span');span.textContent=editorModel.text.slice(range.start,range.end);
    span.style.fontWeight=range.bold?'700':'400';span.style.fontStyle=range.italic?'italic':'normal';if(range.color)span.style.color=range.color;fragment.append(span);
  }
  editor.replaceChildren(fragment);editor.dataset.empty=String(!editorModel.text.length);if(selection)selectEditor(selection.start,selection.end,focus);
  editorRendering=false;updateFormatToolbar();
}
function historySnapshot() {return {text:editorModel.text,styles:editorModel.styles.map(s=>({...s})),selection:{...editorSelection}};}
function recordEditorHistory() {editorUndo.push(historySnapshot());if(editorUndo.length>100)editorUndo.shift();editorRedo=[];}
function editorHistory(direction) {
  const from=direction==='undo'?editorUndo:editorRedo,to=direction==='undo'?editorRedo:editorUndo;if(!from.length)return;
  to.push(historySnapshot());const state=from.pop();editorModel={text:state.text,styles:state.styles};typingOverride=null;
  renderEditor(state.selection);captureEditorSelection();queuePreview();
}
function replaceEditorText(start,end,value) {
  const room=12000-(editorModel.text.length-(end-start));value=String(value).replace(/\r\n?/g,'\n').slice(0,Math.max(0,room));if(start===end&&!value)return;
  recordEditorHistory();const old=expandedStyles(editorModel.text,editorModel.styles),text=editorModel.text.slice(0,start)+value+editorModel.text.slice(end);
  const styles=[...old.slice(0,start),...Array.from({length:value.length},()=>cleanStyle(typingStyle)),...old.slice(end)];
  editorModel=normalizeEditor(text,packedStyles(text,styles));const at=text.slice(0,start+value.length).normalize('NFC').length;
  typingOverride={at,style:cleanStyle(typingStyle)};renderEditor({start:at,end:at});queuePreview();
}
function applyFormat(key,value) {
  const {start,end}=editorSelection,values=expandedStyles(editorModel.text,editorModel.styles);
  if(value===undefined)value=!(end>start?values.slice(start,end).every(style=>style[key]):typingStyle[key]);
  if(end>start) {
    recordEditorHistory();for(let i=start;i<end;i++)values[i]=cleanStyle({...values[i],[key]:value});
    editorModel.styles=packedStyles(editorModel.text,values);typingStyle=cleanStyle(values[start]);renderEditor({start,end});queuePreview();
  }else{typingStyle=cleanStyle({...typingStyle,[key]:value});typingOverride={at:start,style:typingStyle};selectEditor(start);updateFormatToolbar();saveDraft();}
}
function deletionBoundary(position,direction,word=false) {
  const text=editorModel.text;
  if(word) {
    if(direction<0)return position-(text.slice(0,position).match(/\s*\S+\s*$/)?.[0].length||position);
    return position+(text.slice(position).match(/^\s*\S+\s*/)?.[0].length||text.length-position);
  }
  const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('es',{granularity:'grapheme'}).segment(text)].map(s=>s.index):Array.from({length:text.length+1},(_,i)=>i);
  if(direction<0)return segments.filter(index=>index<position).pop()??0;return segments.find(index=>index>position)??text.length;
}
function beforeEditorInput(event) {
  if(event.isComposing||event.inputType.includes('Composition'))return;
  captureEditorSelection();let {start,end}=editorSelection;const type=event.inputType;
  if(type==='formatBold'||type==='formatItalic'){event.preventDefault();applyFormat(type==='formatBold'?'bold':'italic');return;}
  if(type==='historyUndo'||type==='historyRedo'){event.preventDefault();editorHistory(type==='historyUndo'?'undo':'redo');return;}
  if(['insertText','insertReplacementText','insertParagraph','insertLineBreak'].includes(type)) {event.preventDefault();replaceEditorText(start,end,['insertParagraph','insertLineBreak'].includes(type)?'\n':event.data||'');return;}
  if(type.startsWith('delete')) {
    event.preventDefault();if(start===end){const backward=type.includes('Backward');if(backward)start=deletionBoundary(start,-1,type.includes('Word'));else end=deletionBoundary(end,1,type.includes('Word'));}
    replaceEditorText(start,end,'');return;
  }
  if(type.startsWith('format'))event.preventDefault();
}
function syncNativeEditor() {
  if(editorComposing||editorRendering)return;const editor=$('personal-text'),text=(editor.innerText||'').replace(/\r\n?/g,'\n');
  if(text===editorModel.text){renderEditor(editorSelection);return;}
  let start=0,suffix=0;while(start<text.length&&start<editorModel.text.length&&text[start]===editorModel.text[start])start++;
  while(suffix<text.length-start&&suffix<editorModel.text.length-start&&text[text.length-1-suffix]===editorModel.text[editorModel.text.length-1-suffix])suffix++;
  replaceEditorText(start,editorModel.text.length-suffix,text.slice(start,text.length-suffix));
}
function plainPaste(event) {
  event.preventDefault();captureEditorSelection();const data=event.clipboardData||event.dataTransfer;
  replaceEditorText(editorSelection.start,editorSelection.end,data?.getData('text/plain')||'');
}
async function loadEditorFont(profile) {
  const request=++fontRequest,editor=$('personal-text');editor.style.fontFamily='';if(!profile||typeof FontFace==='undefined')return;
  try{const family='TrazoPersonal'+profile.id.replace(/[^a-z0-9]/gi,'');const font=new FontFace(family,`url(${JSON.stringify(profile.font_url+'?updated='+Date.now())})`);await font.load();if(request!==fontRequest)return;document.fonts.add(font);editor.style.fontFamily=`"${family}", sans-serif`;}
  catch{/* The contour preview stays authoritative when a browser cannot load a font. */}
}
function setCatalogMessage(message,error=false) {$('catalog-message').hidden=!message;$('catalog-message').classList.toggle('error',error);$('catalog-message-text').textContent=message;}
async function loadProfiles() {
  $('reload-profiles').disabled=true;
  try {
    catalog=await api('/api/personal');token=catalog.token;const selector=$('personal-profile');selector.replaceChildren();
    for(const profile of catalog.profiles){const option=document.createElement('option');option.value=profile.id;option.textContent=profile.name;selector.append(option);}
    if(catalog.profiles.some(p=>p.id===lastProfile))selector.value=lastProfile;
    else if(catalog.profiles.some(p=>p.id==='optimizada'))selector.value='optimizada';
    selector.disabled=!catalog.profiles.length;
    if(!catalog.profiles.length){const option=document.createElement('option');option.textContent='Aún no hay perfiles personales';selector.append(option);}
    setCatalogMessage(catalog.profiles.length?'':catalog.message||'Todavía no hay perfiles personales disponibles.');$('calibration-button').disabled=false;updateProfile();
  }catch(error){token='';catalog={profiles:[]};$('personal-profile').disabled=true;$('calibration-button').disabled=true;setCatalogMessage(error.message+' Tu borrador se conserva.',true);updateProfile();}
  finally{$('reload-profiles').disabled=false;}
}
function updateProfile() {
  const profile=currentProfile();$('profile-files').hidden=!profile;$('vary-samples').disabled=!profile;
  if(profile) {
    lastProfile=profile.id;$('profile-summary').textContent=`${profile.count} muestras · ${profile.characters.length} caracteres. Cada variante procede de tu biblioteca.`;
    $('font-link').href=profile.font_url;$('library-link').href=profile.library_url;$('available-characters').textContent=profile.characters.join('  ');$('preview-description').textContent=profile.name;
  }else{$('profile-summary').textContent='La vista usará tus muestras cuando el perfil esté disponible.';$('available-characters').textContent='Aún no hay un perfil cargado.';$('preview-description').textContent='Contornos de tu biblioteca personal';}
  loadEditorFont(profile);queuePreview();
}
function missingCharacters() {
  const profile=currentProfile();if(!profile)return [];const allowed=new Set(profile.characters);
  return [...new Set([...editorModel.text.normalize('NFC')].filter(ch=>![' ','\t','\n','\r'].includes(ch)&&!allowed.has(ch)))].sort();
}
function showMissing(missing) {$('missing-characters').textContent=missing.length?`Faltan muestras para: ${missing.map(ch=>`«${ch}»`).join(' ')}. Revisa el texto o cambia de perfil; el PDF no sustituye estas letras.`:'';$('missing-characters').classList.remove('good');}
function enableExport() {$('personal-export').disabled=exporting||pendingPreview||!currentProfile()||!layout||layout.missing.length>0||!layout.pages.some(page=>page.glyphs.length);}
function clearResult() {$('personal-result').replaceChildren();$('personal-result').classList.remove('error');}
function queuePreview() {
  clearTimeout(previewTimer);if(previewAbort)previewAbort.abort();requestNumber++;saveDraft();clearResult();layout=null;pageIndex=0;
  $('text-count').textContent=`${[...editorModel.text].length.toLocaleString('es')} / 12 000`;showMissing(missingCharacters());pendingPreview=true;enableExport();drawPage();
  if(!currentProfile()||!token){pendingPreview=false;enableExport();$('preview-status').textContent='Carga un perfil personal para componer. Puedes preparar la prueba de escala.';return;}
  previewTimer=setTimeout(refreshPreview,250);
}
async function refreshPreview() {
  const current=++requestNumber;previewAbort=new AbortController();pendingPreview=true;enableExport();$('preview-status').textContent='Distribuyendo tu texto…';
  try {
    const result=await api('/api/personal/layout',requestBody(),previewAbort.signal);if(current!==requestNumber)return;
    layout=result;pageIndex=Math.min(pageIndex,layout.pages.length-1);showMissing(layout.missing);drawPage();
    $('preview-status').textContent=layout.missing.length?'Completa los caracteres que faltan para ver el texto y preparar el PDF.':`${layout.pages.length} ${layout.pages.length===1?'página':'páginas'} · Mismos contornos y posiciones en el PDF.`;
  }catch(error){if(current!==requestNumber||error.name==='AbortError')return;layout=null;drawPage();$('preview-status').textContent=error.message;}
  finally{if(current===requestNumber){pendingPreview=false;enableExport();}}
}
function gridPositions(length,step,origin) {
  const values=[];if(!Number.isFinite(step)||step<1)return values;let first=((origin%step)+step)%step;if(first<.00001)first=step;
  for(let value=first;value<length;value+=step)values.push(value);return values;
}
function blankLayout() {
  const opts=readOptions();opts.width=Number.isFinite(opts.width)&&opts.width>=70&&opts.width<=420?opts.width:210;opts.height=Number.isFinite(opts.height)&&opts.height>=70&&opts.height<=594?opts.height:297;
  const grid={vertical:[],horizontal:[]};if(opts.ruling!=='none')grid.horizontal=gridPositions(opts.height,opts.gridMm,opts.gridOriginY);if(opts.ruling==='grid')grid.vertical=gridPositions(opts.width,opts.gridMm,opts.gridOriginX);
  return {options:opts,grid,pages:[{glyphs:[]}],samples:[],missing:[],scale_mm:0};
}
function drawPage() {
  const view=layout||blankLayout(),opts=view.options,page=view.pages[pageIndex]||view.pages[0];
  const canvas=$('personal-canvas'),displayWidth=canvas.clientWidth||opts.width*3;
  const pxPerMm=Math.max(3,Math.min(6,displayWidth/opts.width*Math.min(Math.max(window.devicePixelRatio||1,1),2)));
  canvas.width=Math.round(opts.width*pxPerMm);canvas.height=Math.round(opts.height*pxPerMm);
  const ctx=canvas.getContext('2d');ctx.setTransform(pxPerMm,0,0,pxPerMm,0,0);ctx.fillStyle=opts.paperColor||'#ffffff';ctx.fillRect(0,0,opts.width,opts.height);
  ctx.strokeStyle=opts.gridColor||'#dce6ef';ctx.lineWidth=.16;ctx.beginPath();
  for(const x of view.grid.vertical){ctx.moveTo(x,0);ctx.lineTo(x,opts.height);}for(const y of view.grid.horizontal){ctx.moveTo(0,y);ctx.lineTo(opts.width,y);}ctx.stroke();
  if(opts.marginLine){ctx.strokeStyle=opts.marginLineColor||'#c86571';ctx.lineWidth=.25;ctx.beginPath();ctx.moveTo(opts.marginLineX,0);ctx.lineTo(opts.marginLineX,opts.height);ctx.stroke();}
  const samples=new Map(view.samples.map(sample=>[sample.id,sample]));ctx.lineJoin='round';ctx.lineCap='round';
  for(const glyph of page.glyphs) {
    const sample=samples.get(glyph.id);if(!sample)continue;ctx.fillStyle=glyph.style?.color||opts.ink;ctx.strokeStyle=ctx.fillStyle;ctx.beginPath();
    for(const path of glyph.paths||sample.paths){path.forEach(([x,y],index)=>{const px=glyph.x_mm+x*view.scale_mm,py=glyph.y_mm-y*view.scale_mm;(index===0?ctx.moveTo.bind(ctx):ctx.lineTo.bind(ctx))(px,py);});ctx.closePath();}
    ctx.fill('evenodd');if(glyph.stroke_mm>0){ctx.lineWidth=glyph.stroke_mm;ctx.stroke();}
  }
  $('personal-dimensions').textContent=`${opts.width} × ${opts.height} mm`;$('page-position').textContent=`Página ${pageIndex+1} de ${view.pages.length}`;
  canvas.setAttribute('aria-label',`Vista previa, página ${pageIndex+1} de ${view.pages.length}`);$('previous-page').disabled=pageIndex===0;$('next-page').disabled=pageIndex>=view.pages.length-1;
  const anyGlyph=view.pages.some(p=>p.glyphs.length);$('preview-empty').hidden=anyGlyph;
  $('empty-description').textContent=view.missing.length?'Revisa los caracteres que faltan.':(!currentProfile()?'Tu letra aparecerá al cargar una biblioteca real.':(pendingPreview&&editorModel.text.trim()?'Preparando tu página…':'Escribe un texto para ver tu caligrafía.'));
  const pill=typeof document!=='undefined'?document.querySelector('.personal-pill'):null;if(pill)pill.textContent=opts.ruling==='none'?'Hoja sin guías':`${opts.ruling==='lines'?'Renglones':'Cuadrícula'} de ${opts.gridMm||5} mm`;
}
function downloadResult(container,url,label,message) {
  container.replaceChildren();container.classList.remove('error');const a=document.createElement('a');a.className='button outline full';a.href=url;a.download='trazo-mi-caligrafia.pdf';a.textContent=label;
  const p=document.createElement('p');p.textContent=message;container.append(a,p);
}
async function exportPage() {
  if($('personal-export').disabled)return;const body=requestBody(),signature=JSON.stringify(body);exporting=true;enableExport();$('personal-export').textContent='Preparando PDF…';clearResult();
  try {
    const result=await api('/api/personal/compose',body);if(signature!==JSON.stringify(requestBody())){$('personal-result').textContent='El texto o la hoja cambió mientras se preparaba el PDF. Prepara uno nuevo con tu versión actual.';return;}
    layout=result.layout;pageIndex=Math.min(pageIndex,layout.pages.length-1);drawPage();downloadResult($('personal-result'),result.url,`Descargar PDF · ${result.pages} ${result.pages===1?'página':'páginas'}`,'Listo. Imprime al 100 % o en Tamaño real.');
  }catch(error){$('personal-result').textContent=error.message;$('personal-result').classList.add('error');}finally{exporting=false;enableExport();$('personal-export').textContent='Preparar PDF para imprimir';}
}
async function calibration() {
  const button=$('calibration-button');button.disabled=true;button.textContent='Preparando prueba…';$('calibration-result').replaceChildren();
  try{const result=await api('/api/personal/calibration',{options:readOptions()});downloadResult($('calibration-result'),result.url,'Descargar prueba de 50 mm','Mide el cuadro: debe medir exactamente 50 × 50 mm.');}
  catch(error){$('calibration-result').textContent=error.message;$('calibration-result').classList.add('error');}finally{button.disabled=!token;button.textContent='Prueba de impresión · 50 mm';}
}
function updatePaperFields() {$('personal-custom-paper').hidden=$('personal-paper').value!=='custom';$('personal-margin-line-x').max=readOptions().width;}
function paperOptionChanged(event) {
  if(event.target.id==='personal-paper'&&paperSizes[event.target.value]){const [w,h]=paperSizes[event.target.value];$('personal-width').value=w;$('personal-height').value=h;}
  updatePaperFields();$('personal-text').style.color=$('personal-ink').value;updateFormatToolbar();queuePreview();
}
function notebookAvailable() {try{return !!JSON.parse(localStorage.getItem(NOTEBOOK_KEY)||'null')?.options;}catch{return false;}}
function saveNotebook() {
  try{localStorage.setItem(NOTEBOOK_KEY,JSON.stringify({version:1,name:'Mi cuaderno',options:readOptions()}));$('load-notebook').disabled=false;$('notebook-status').textContent='Medidas y colores guardados en este navegador.';}
  catch{$('notebook-status').textContent='El navegador no pudo guardar estos ajustes.';}
}
function loadNotebook() {
  try{const saved=JSON.parse(localStorage.getItem(NOTEBOOK_KEY)||'null');if(!saved?.options)throw new Error();applyPaperOptions(saved.options);paperOptionChanged({target:{id:''}});$('notebook-status').textContent='Ajustes de Mi cuaderno aplicados. Tu texto se conserva.';}
  catch{$('notebook-status').textContent='No se pudieron leer los ajustes. Puedes guardarlos otra vez.';}
}
const editor=$('personal-text');
editor.addEventListener('beforeinput',beforeEditorInput);editor.addEventListener('input',syncNativeEditor);editor.addEventListener('paste',plainPaste);editor.addEventListener('drop',plainPaste);
editor.addEventListener('compositionstart',()=>{editorComposing=true;});editor.addEventListener('compositionend',()=>{editorComposing=false;syncNativeEditor();});
editor.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&!event.altKey){const key=event.key.toLowerCase();if(key==='b'||key==='i'){event.preventDefault();captureEditorSelection();applyFormat(key==='b'?'bold':'italic');}else if(key==='z'||key==='y'){event.preventDefault();editorHistory(key==='y'||event.shiftKey?'redo':'undo');}}
});
editor.addEventListener('cut',event=>{captureEditorSelection();const {start,end}=editorSelection;if(start===end)return;event.preventDefault();event.clipboardData.setData('text/plain',editorModel.text.slice(start,end));replaceEditorText(start,end,'');});
document.addEventListener('selectionchange',captureEditorSelection);
for(const id of ['format-bold','format-italic','format-auto'])$(id).addEventListener('mousedown',event=>{captureEditorSelection();event.preventDefault();});
$('format-bold').addEventListener('click',()=>applyFormat('bold'));$('format-italic').addEventListener('click',()=>applyFormat('italic'));
$('format-color').addEventListener('mousedown',captureEditorSelection);$('format-color').addEventListener('change',()=>applyFormat('color',$('format-color').value));$('format-auto').addEventListener('click',()=>applyFormat('color',null));
$('personal-profile').addEventListener('change',updateProfile);
for(const id of Object.values(optionFields))$(id).addEventListener('input',paperOptionChanged);$('personal-margin-line').addEventListener('change',paperOptionChanged);
$('rotate-paper').addEventListener('click',()=>{const options=readOptions();$('personal-paper').value='custom';$('personal-width').value=options.height;$('personal-height').value=options.width;updatePaperFields();queuePreview();});
$('save-notebook').addEventListener('click',saveNotebook);$('load-notebook').addEventListener('click',loadNotebook);
$('vary-samples').addEventListener('click',()=>{seed=(seed+1)%2147483647;queuePreview();});$('reload-profiles').addEventListener('click',loadProfiles);
$('personal-export').addEventListener('click',exportPage);$('calibration-button').addEventListener('click',calibration);
$('previous-page').addEventListener('click',()=>{if(pageIndex>0){pageIndex--;drawPage();}});$('next-page').addEventListener('click',()=>{if(layout&&pageIndex<layout.pages.length-1){pageIndex++;drawPage();}});
window.addEventListener('resize',drawPage);
restoreDraft();if(!restoredDraft)editorModel=normalizeEditor('Mi caligrafía personal.\nEl pingüino escribió: ¡Qué día tan increíble!\n1234567890 + 5 = 15');
renderEditor();editor.style.color=$('personal-ink').value;updatePaperFields();$('load-notebook').disabled=!notebookAvailable();drawPage();loadProfiles();
