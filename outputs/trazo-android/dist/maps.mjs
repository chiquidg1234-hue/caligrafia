import {layoutText} from './core.mjs';
import {normaliseText,restoreDraft,paperGuides,validColor} from './model.mjs';
import {svgPaths} from './exports.mjs';
import * as bundle from './vendor/pdf-lib.min.js';

const PDF=globalThis.PDFLib||bundle.default,MM=72/25.4,EPS=1e-7,INK='#193c66';
export const MAP_TYPES=Object.freeze([
  {id:'concept',label:'Mapa conceptual'},{id:'mind',label:'Mapa mental'},
  {id:'flow',label:'Diagrama de flujo'},{id:'tree',label:'Árbol jerárquico'},
  {id:'timeline',label:'Línea de tiempo'}
].map(Object.freeze));
const typeIds=new Set(MAP_TYPES.map(t=>t.id));
const color=(value,fallback=INK)=>validColor(value)?value.toLowerCase():fallback;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const finite=(value,fallback,min,max,name)=>{
  const n=value===undefined?fallback:value;
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(`${name}: usa un número entre ${min} y ${max}.`);
  return n;
};
function textValue(value,max,name){
  if(value!==undefined&&typeof value!=='string')throw Error(`${name}: usa texto.`);
  const text=normaliseText(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
  if(text.length>max)throw Error(`${name}: el límite es ${max} caracteres.`);
  return text;
}
function identity(value,name){
  if(typeof value!=='string'||!value.trim()||value.length>120||/[\p{Cc}\p{Cf}]/u.test(value))throw Error(`${name}: identificador inválido.`);
  return value;
}
function cleanPaper(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('El papel del mapa es inválido.');
  const margin=finite(input.margin,12,0,120,'Margen'),d=restoreDraft({width:297,height:210,margin,marginLeft:margin,marginRight:margin,marginTop:margin,marginBottom:margin,size:15,leading:8,...input});
  const p={};
  for(const [key,min,max] of [['width',70,420],['height',70,594],['margin',0,120],['marginLeft',0,120],['marginRight',0,120],['marginTop',0,120],['marginBottom',0,120],['size',6,48],['leading',3,30],['gridMm',2,20],['gridOriginX',-20,20],['gridOriginY',-20,20],['seed',-2147483648,4294967295]])p[key]=finite(d[key],undefined,min,max,'Papel: '+key);
  if(p.width-p.marginLeft-p.marginRight<24||p.height-p.marginTop-p.marginBottom<24)throw Error('Los márgenes dejan muy poco espacio para el mapa.');
  p.ink=color(d.ink);p.paperColor=color(d.paperColor,'#ffffff');p.gridColor=color(d.gridColor,'#dce7ef');p.marginLineColor=color(d.marginLineColor,'#dcaeb8');
  p.marginLine=!!d.marginLine;p.marginLineX=finite(d.marginLineX,p.marginLeft,0,p.width,'Línea de margen');
  p.ruling=['none','lines','grid'].includes(d.ruling)?d.ruling:'none';
  return p;
}

/** Validates a portable editable map. Coordinates are millimetres, without DOM state. */
export function validateMap(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1||!typeIds.has(input.type))throw Error('El archivo no es un mapa Trazo de versión 1 o tiene un tipo desconocido.');
  if(!Array.isArray(input.nodes)||input.nodes.length>60)throw Error('El mapa permite hasta 60 nodos.');
  if(!Array.isArray(input.edges)||input.edges.length>120)throw Error('El mapa permite hasta 120 conexiones.');
  const paper=cleanPaper(input.paper),ids=new Set(),edgeIds=new Set();
  const nodes=input.nodes.map((n,i)=>{
    if(!n||typeof n!=='object')throw Error('Nodo inválido.');
    const id=identity(n.id,'Nodo');if(ids.has(id))throw Error('Hay identificadores de nodo duplicados.');ids.add(id);
    if(!['box','ellipse','diamond'].includes(n.shape??'box'))throw Error('Forma de nodo desconocida.');
    return {id,text:textValue(n.text,2000,'Texto del nodo '+(i+1)),x:finite(n.x,12,-420,840,'Posición X'),y:finite(n.y,30,-594,1188,'Posición Y'),width:finite(n.width,54,12,420,'Ancho del nodo'),height:finite(n.height,26,10,594,'Alto del nodo'),shape:n.shape??'box',color:color(n.color,paper.ink),bold:!!n.bold,italic:!!n.italic};
  });
  const edges=input.edges.map(e=>{
    if(!e||typeof e!=='object')throw Error('Conexión inválida.');
    const id=identity(e.id,'Conexión');if(edgeIds.has(id))throw Error('Hay identificadores de conexión duplicados.');edgeIds.add(id);
    if(!ids.has(e.from)||!ids.has(e.to))throw Error('Una conexión apunta a un nodo que no existe.');
    if(e.from===e.to)throw Error('Conecta dos nodos diferentes.');
    return {id,from:e.from,to:e.to,label:textValue(e.label,200,'Rótulo de conexión')};
  });
  return {version:1,title:textValue(input.title,300,'Título'),type:input.type,nodes,edges,paper};
}
function contentBox(map){
  const p=map.paper,titleHeight=map.title.trim()?Math.max(15,p.size/MM*1.5+5):0;
  // Include the outline's half-width even when all user margins are zero.
  const left=Math.max(.3,p.marginLeft),right=Math.max(.3,p.marginRight),top=Math.max(.3,p.marginTop),bottom=Math.max(.3,p.marginBottom);
  return {x:left,y:top+titleHeight,width:p.width-left-right,height:p.height-top-bottom-titleHeight};
}
const overlap=(a,b,pad=0)=>a.x+a.width+pad>b.x+EPS&&b.x+b.width+pad>a.x+EPS&&a.y+a.height+pad>b.y+EPS&&b.y+b.height+pad>a.y+EPS;
const contains=(box,n)=>n.x>=box.x-EPS&&n.y>=box.y-EPS&&n.x+n.width<=box.x+box.width+EPS&&n.y+n.height<=box.y+box.height+EPS;
const roomError=()=>Error('No hay espacio suficiente para ordenar estos nodos. Amplía el papel, reduce los nodos o usa otro tipo de mapa.');
function checkNodeSpace(map){
  const box=contentBox(map);
  for(const n of map.nodes)if(!contains(box,n))throw Error(`El nodo «${n.text.slice(0,35)||n.id}» queda fuera del papel útil o invade el título. Mueve el nodo, ajusta los márgenes u ordena el mapa.`);
  for(let i=0;i<map.nodes.length;i++)for(let j=i+1;j<map.nodes.length;j++)if(overlap(map.nodes[i],map.nodes[j],1))throw Error('Hay nodos superpuestos o demasiado juntos. Sepáralos u ordena el mapa.');
}
function levelsFor(map){
  const children=new Map(map.nodes.map(n=>[n.id,[]])),indegree=new Map(map.nodes.map(n=>[n.id,0])),depth=new Map();
  for(const e of map.edges){children.get(e.from).push(e.to);indegree.set(e.to,indegree.get(e.to)+1);}
  const queue=map.nodes.filter(n=>!indegree.get(n.id)).map(n=>n.id);
  if(!queue.length&&map.nodes.length)queue.push(map.nodes[0].id);
  for(const id of queue)depth.set(id,0);
  // Breadth-first layers also keep cycles and disconnected components finite.
  const visit=()=>{for(let i=0;i<queue.length;i++)for(const id of children.get(queue[i]))if(!depth.has(id)){depth.set(id,depth.get(queue[i])+1);queue.push(id);}};
  visit();for(const n of map.nodes)if(!depth.has(n.id)){depth.set(n.id,0);queue.push(n.id);visit();}
  const result=[];for(const n of map.nodes){const level=depth.get(n.id);(result[level]??=[]).push(n);}return result;
}
function placeLayers(map,box,horizontal=false){
  const levels=levelsFor(map),major=horizontal?'width':'height',minor=horizontal?'height':'width',majorPos=horizontal?'x':'y',minorPos=horizontal?'y':'x',sizes=levels.map(ns=>Math.max(...ns.map(n=>n[major]))),sum=sizes.reduce((a,b)=>a+b,0),gap=levels.length>1?Math.min(horizontal?22:26,(box[major]-sum)/(levels.length-1)):0;
  if(gap<12||sum>box[major]){if(levels.length>1||sum>box[major])throw roomError();}
  let cursor=box[majorPos]+(box[major]-sum-gap*(levels.length-1))/2;
  levels.forEach((nodes,i)=>{
    const crossSum=nodes.reduce((a,n)=>a+n[minor],0),crossGap=nodes.length>1?Math.min(18,(box[minor]-crossSum)/(nodes.length-1)):0;
    if(crossSum>box[minor]||nodes.length>1&&crossGap<12)throw roomError();
    let cross=box[minorPos]+(box[minor]-crossSum-crossGap*(nodes.length-1))/2;
    for(const n of nodes){n[majorPos]=cursor+(sizes[i]-n[major])/2;n[minorPos]=cross;cross+=n[minor]+crossGap;}cursor+=sizes[i]+gap;
  });
}

/** Returns a new layout. It never shrinks handwriting or silently clips nodes. */
export function arrangeMap(input){
  const map=validateMap(input),box=contentBox(map),nodes=map.nodes;if(!nodes.length)return map;
  if(box.height<=0)throw roomError();
  if(map.type==='mind'){
    const [root,...rest]=nodes,cx=box.x+box.width/2,cy=box.y+box.height/2;
    root.x=cx-root.width/2;root.y=cy-root.height/2;
    const rx=(box.width-Math.max(...nodes.map(n=>n.width)))/2,ry=(box.height-Math.max(...nodes.map(n=>n.height)))/2;
    rest.forEach((n,i)=>{const angle=-Math.PI/2+2*Math.PI*i/rest.length;n.x=cx+rx*Math.cos(angle)-n.width/2;n.y=cy+ry*Math.sin(angle)-n.height/2;});
  }else if(map.type==='timeline'){
    const sum=nodes.reduce((a,n)=>a+n.width,0),gap=nodes.length>1?Math.min(16,(box.width-sum)/(nodes.length-1)):0;
    if(sum>box.width||nodes.length>1&&gap<10||nodes.some(n=>n.height>box.height))throw roomError();
    let x=box.x+(box.width-sum-gap*(nodes.length-1))/2;
    for(const n of nodes){n.x=x;n.y=box.y+(box.height-n.height)/2;x+=n.width+gap;}
  }else placeLayers(map,box,map.type==='tree');
  for(const n of nodes){if(!contains(box,n))throw roomError();n.x=Math.max(box.x,n.x);n.y=Math.max(box.y,n.y);}
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(overlap(nodes[i],nodes[j],4))throw roomError();
  return map;
}

export function createMap(type='concept'){
  if(!typeIds.has(type))throw Error('Tipo de mapa desconocido.');
  const titles={concept:'Mapa conceptual',mind:'Mapa mental',flow:'Diagrama de flujo',tree:'Árbol de ideas',timeline:'Línea de tiempo'},nodes=[],edges=[];
  const node=(text,{width=54,height=26,shape='box',bold=false,color:ink=INK}={})=>{const id='n'+(nodes.length+1);nodes.push({id,text,x:12,y:30,width,height,shape,color:ink,bold,italic:false});return id;};
  const edge=(from,to,label='')=>edges.push({id:'e'+(edges.length+1),from,to,label});
  if(type==='concept'){
    const root=node('Tema central',{width:64,bold:true}),a=node('Primera idea'),b=node('Segunda idea'),c=node('Un ejemplo'),d=node('Otro ejemplo');edge(root,a,'incluye');edge(root,b,'incluye');edge(a,c,'por ejemplo');edge(b,d,'por ejemplo');
  }else if(type==='mind'){
    const root=node('Idea central',{width:70,height:34,shape:'ellipse',bold:true});
    for(const [text,ink] of [['Ideas','#365f91'],['Preguntas','#8b4d35'],['Recursos','#41684a'],['Acciones','#765095']])edge(root,node(text,{shape:'ellipse',width:58,height:32,color:ink}));
  }else if(type==='flow'){
    const a=node('Inicio',{shape:'ellipse',height:22}),b=node('Preparar',{height:22}),c=node('¿Listo?',{width:70,height:38,shape:'diamond'}),d=node('Revisar',{height:22}),e=node('Terminar',{shape:'ellipse',height:22});edge(a,b);edge(b,c);edge(c,d,'no');edge(c,e,'sí');
  }else if(type==='tree'){
    const a=node('Tema',{bold:true}),b=node('Grupo A'),c=node('Grupo B'),d=node('Detalle A'),e=node('Detalle B');edge(a,b);edge(a,c);edge(b,d);edge(c,e);
  }else{
    const ids=['Inicio\nDía 1','Explorar\nDía 2','Crear\nDía 3','Revisar\nDía 4'].map(text=>node(text,{width:50,height:30}));for(let i=1;i<ids.length;i++)edge(ids[i-1],ids[i]);
  }
  return arrangeMap({version:1,title:titles[type],type,nodes,edges,paper:{width:297,height:210,margin:12,size:15,leading:8}});
}

function nodeTextBox(n){
  const factor=n.shape==='diamond'?.5:n.shape==='ellipse'?Math.SQRT1_2:1,pad=n.shape==='diamond'?2:3;
  const width=n.width*factor-pad*2,height=n.height*factor-pad*2;
  return {x:n.x+(n.width-width)/2,y:n.y+(n.height-height)/2,width,height};
}
function boundsOf(glyphs){
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const g of glyphs){const pad=g.strokeWidth*g.scale/2;for(const p of g.paths)for(const [x,y] of p){left=Math.min(left,g.x+x*g.scale-pad);right=Math.max(right,g.x+x*g.scale+pad);top=Math.min(top,g.y-y*g.scale-pad);bottom=Math.max(bottom,g.y-y*g.scale+pad);}}
  return glyphs.length?{x:left,y:top,width:right-left,height:bottom-top}:{x:0,y:0,width:0,height:0};
}
function handwriting(text,box,samples,paper,{bold=false,italic=false,color:ink=paper.ink,seed=paper.seed,kind,id}={}){
  const result={kind,id,text,box,glyphs:[],bounds:{x:box.x,y:box.y,width:0,height:0},missing:[]};text=text.trim();if(!text)return result;
  if(box.width<=1||box.height<=1)throw Error('El texto no cabe en el '+(kind==='node'?'nodo':'rótulo')+'. Amplía su tamaño.');
  let layout;
  try{
    const width=Math.max(70,box.width),height=Math.max(70,box.height);
    // The prose layout has a 10 mm minimum text area. A narrow diagram label
    // uses that staging area, then checks the actual ink against its own box.
    layout=layoutText(text,samples,{width,height,margin:0,marginLeft:0,marginTop:0,marginRight:width-Math.max(11,box.width),marginBottom:height-Math.max(11,box.height),size:paper.size,leading:paper.leading,ink,seed,styles:[{start:0,end:text.length,bold,italic,color:ink}]});
  }catch(e){throw Error(`El texto ${kind==='node'?'del nodo':'del rótulo'} «${text.slice(0,28)}» no cabe: ${e.message}`);}
  if(layout.missing.length){result.missing=layout.missing;return result;}
  if(layout.pages.length!==1)throw Error(`El texto ${kind==='node'?'del nodo':'del rótulo'} «${text.slice(0,28)}» no cabe. Amplía el nodo, reduce el tamaño de letra o acorta el texto.`);
  const glyphs=layout.pages[0].map(g=>({...g})),bounds=boundsOf(glyphs),lines=new Map();
  for(const g of glyphs){const line=lines.get(g.y)||[];line.push(g);lines.set(g.y,line);}
  const dy=box.y+(box.height-bounds.height)/2-bounds.y;
  for(const line of lines.values()){const b=boundsOf(line),dx=box.x+(box.width-b.width)/2-b.x;for(const g of line){g.x+=dx;g.y+=dy;}}
  result.glyphs=glyphs;result.bounds=boundsOf(glyphs);
  if(!contains(box,result.bounds))throw Error('Los trazos no caben en el rótulo. Amplía el espacio o reduce la letra.');
  return result;
}
const center=n=>[n.x+n.width/2,n.y+n.height/2];
function boundary(n,toward){
  const [cx,cy]=center(n),dx=toward[0]-cx,dy=toward[1]-cy,rx=n.width/2,ry=n.height/2;
  const divisor=n.shape==='ellipse'?Math.hypot(dx/rx,dy/ry):n.shape==='diamond'?Math.abs(dx/rx)+Math.abs(dy/ry):Math.max(Math.abs(dx/rx),Math.abs(dy/ry));
  if(!divisor)throw Error('Dos nodos tienen el mismo centro. Sepáralos.');return [cx+dx/divisor,cy+dy/divisor];
}
function segmentHits(a,b,n){
  // Intersections with the open rectangle; exact boundary contact is allowed.
  const low=[n.x+EPS,n.y+EPS],high=[n.x+n.width-EPS,n.y+n.height-EPS];let t0=0,t1=1;
  for(let k=0;k<2;k++){const d=b[k]-a[k];if(Math.abs(d)<EPS){if(a[k]<=low[k]||a[k]>=high[k])return false;}else{let u=(low[k]-a[k])/d,v=(high[k]-a[k])/d;if(u>v)[u,v]=[v,u];t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>t1)return false;}}
  return t0<t1-EPS;
}
function compact(points){return points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>EPS);}
function connect(a,b,nodes,box){
  const s=center(a),t=center(b),candidates=[[s,t],[s,[s[0],t[1]],t],[s,[t[0],s[1]],t]];
  const xs=[(s[0]+t[0])/2,box.x+2,box.x+box.width-2,...nodes.flatMap(n=>[n.x-4,n.x+n.width+4])],ys=[(s[1]+t[1])/2,box.y+2,box.y+box.height-2,...nodes.flatMap(n=>[n.y-4,n.y+n.height+4])];
  for(const x of xs)if(x>box.x&&x<box.x+box.width)candidates.push([s,[x,s[1]],[x,t[1]],t]);
  for(const y of ys)if(y>box.y&&y<box.y+box.height)candidates.push([s,[s[0],y],[t[0],y],t]);
  for(const candidate of candidates){const p=compact(candidate);if(p.length<2)continue;p[0]=boundary(a,p[1]);p[p.length-1]=boundary(b,p.at(-2));if(!p.every(([x,y])=>x>=box.x-EPS&&x<=box.x+box.width+EPS&&y>=box.y-EPS&&y<=box.y+box.height+EPS))continue;
    let blocked=false;for(let i=1;i<p.length&&!blocked;i++)for(const n of nodes){if(n===a&&i===1||n===b&&i===p.length-1)continue;if(segmentHits(p[i-1],p[i],n)){blocked=true;break;}}
    if(!blocked)return p;
  }
  throw Error('No hay espacio para trazar una conexión sin cruzar un nodo. Separa los nodos u ordena el mapa.');
}
function arrowFor(points){const b=points.at(-1),a=points.at(-2),length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length,size=Math.min(2.6,length*.4);return [b,[b[0]-ux*size-uy*size*.45,b[1]-uy*size+ux*size*.45],[b[0]-ux*size+uy*size*.45,b[1]-uy*size-ux*size*.45]];}
function labelPosition(label,points,nodes,occupied,box){
  const width=Math.max(3,label.bounds.width)+4,height=Math.max(2,label.bounds.height)+3;
  const midpoints=[];for(let i=1;i<points.length;i++)for(const t of [.5,.25,.75])midpoints.push([points[i-1][0]*(1-t)+points[i][0]*t,points[i-1][1]*(1-t)+points[i][1]*t]);
  for(const [cx,cy] of midpoints)for(const [dx,dy] of [[0,0],[0,-height],[0,height],[-width/2,0],[width/2,0],[0,-height*2],[0,height*2]]){
    const candidate={x:cx+dx-width/2,y:cy+dy-height/2,width,height};if(contains(box,candidate)&&!nodes.some(n=>overlap(n,candidate,1))&&!occupied.some(b=>overlap(b,candidate,1))){const x=candidate.x+(candidate.width-label.bounds.width)/2-label.bounds.x,y=candidate.y+(candidate.height-label.bounds.height)/2-label.bounds.y;label.glyphs=label.glyphs.map(g=>({...g,x:g.x+x,y:g.y+y}));label.bounds={...label.bounds,x:label.bounds.x+x,y:label.bounds.y+y};label.box=candidate;occupied.push(candidate);return;}
  }
  throw Error(`No hay espacio para el rótulo «${label.text.slice(0,25)}». Acórtalo o separa los nodos conectados.`);
}
function shapePath(n){
  const {x,y,width:w,height:h}=n;
  if(n.shape==='diamond')return `M${x+w/2},${y}L${x+w},${y+h/2}L${x+w/2},${y+h}L${x},${y+h/2}Z`;
  if(n.shape==='ellipse'){const cx=x+w/2,cy=y+h/2,rx=w/2,ry=h/2,k=.5522847498307936;return `M${x+w},${cy}C${x+w},${cy+ry*k} ${cx+rx*k},${y+h} ${cx},${y+h}C${cx-rx*k},${y+h} ${x},${cy+ry*k} ${x},${cy}C${x},${cy-ry*k} ${cx-rx*k},${y} ${cx},${y}C${cx+rx*k},${y} ${x+w},${cy-ry*k} ${x+w},${cy}Z`;}
  return `M${x},${y}H${x+w}V${y+h}H${x}Z`;
}
const polygonPath=points=>'M'+points.map(p=>p.join(',')).join('L')+'Z';
const glyphSVG=g=>`<path d="${svgPaths(g.paths,true)}" transform="translate(${g.x} ${g.y}) scale(${g.scale})" fill="${g.color}"${g.strokeWidth?` stroke="${g.color}" stroke-width="${g.strokeWidth}" stroke-linejoin="round"`:''}/>`;

/** SVG and PDF share this immutable-by-convention geometry; no system-font fallback. */
export function renderMap(input,samples){
  const map=validateMap(input);checkNodeSpace(map);
  const p=map.paper,box=contentBox(map),labels=[],missing=new Set(),nodes=map.nodes.map(n=>({...n,path:shapePath(n)})),edges=[],byId=new Map(map.nodes.map(n=>[n.id,n]));
  const addLabel=l=>{labels.push(l);for(const c of l.missing)missing.add(c);return l;};
  if(map.title.trim())addLabel(handwriting(map.title,{x:p.marginLeft,y:p.marginTop,width:p.width-p.marginLeft-p.marginRight,height:box.y-p.marginTop-3},samples,p,{bold:true,kind:'title',id:'map-title'}));
  for(const n of nodes)addLabel(handwriting(n.text,nodeTextBox(n),samples,p,{...n,kind:'node',seed:p.seed}));
  const occupied=[];
  for(const e of map.edges){
    const points=connect(byId.get(e.from),byId.get(e.to),map.nodes,box),edge={...e,points,arrow:arrowFor(points),color:p.ink};
    if(edge.arrow.some(([x,y])=>x<0||y<0||x>p.width||y>p.height))throw Error('Una flecha queda fuera del papel. Aumenta los márgenes o separa la conexión del borde.');
    edges.push(edge);
    if(e.label.trim()){
      const label=addLabel(handwriting(e.label,{x:0,y:0,width:Math.min(80,box.width),height:Math.min(30,box.height)},samples,p,{kind:'edge',id:e.id}));
      if(!label.missing.length)labelPosition(label,points,map.nodes,occupied,box);
    }
  }
  const guides=paperGuides(p),geometry={nodes,edges,labels,guides},parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}mm" height="${p.height}mm" viewBox="0 0 ${p.width} ${p.height}" role="img" aria-label="${escape(map.title||'Mapa manuscrito')}"><title>${escape(map.title||'Mapa manuscrito')}</title>`,`<rect width="${p.width}" height="${p.height}" fill="${p.paperColor}"/>`];
  for(const g of guides)parts.push(`<path d="M${g.x1},${g.y1}L${g.x2},${g.y2}" fill="none" stroke="${g.color}" stroke-width="${(g.margin?.5:.35)/MM}"/>`);
  for(const e of edges)parts.push(`<g data-edge-id="${escape(e.id)}"><path d="M${e.points.map(p=>p.join(',')).join('L')}" fill="none" stroke="${e.color}" stroke-width="0.45" stroke-linejoin="round"/><path d="${polygonPath(e.arrow)}" fill="${e.color}"/></g>`);
  for(const n of nodes){parts.push(`<g data-node-id="${escape(n.id)}" role="group" aria-label="${escape(n.text)}"><path d="${n.path}" fill="${p.paperColor}" stroke="${n.color}" stroke-width="0.45"/>`);parts.push(...labels.find(l=>l.kind==='node'&&l.id===n.id).glyphs.map(glyphSVG));parts.push('</g>');}
  for(const l of labels.filter(l=>l.kind!=='node')){if(l.kind==='edge'&&!l.missing.length)parts.push(`<rect x="${l.box.x}" y="${l.box.y}" width="${l.box.width}" height="${l.box.height}" fill="${p.paperColor}"/>`);parts.push(...l.glyphs.map(glyphSVG));}
  parts.push('</svg>');return {svg:parts.join(''),missing:[...missing].sort(),width:p.width,height:p.height,map,geometry};
}

export async function mapPDF(renderResult,input=renderResult?.map){
  if(!renderResult?.geometry||!Array.isArray(renderResult.missing))throw Error('Genera una vista previa del mapa antes de exportar.');
  if(renderResult.missing.length)throw Error('Faltan muestras: '+renderResult.missing.join(' '));
  const map=validateMap(input),p=map.paper;if(JSON.stringify(map)!==JSON.stringify(renderResult.map))throw Error('El mapa cambió. Actualiza la vista previa antes de exportar.');
  const {nodes,edges,labels,guides}=renderResult.geometry,doc=await PDF.PDFDocument.create(),page=doc.addPage([p.width*MM,p.height*MM]),rgb=c=>PDF.rgb(...c.slice(1).match(/../g).map(n=>parseInt(n,16)/255));
  const path=(d,options={})=>page.drawSvgPath(d,{x:0,y:p.height*MM,scale:MM,...options});
  page.drawRectangle({x:0,y:0,width:p.width*MM,height:p.height*MM,color:rgb(p.paperColor)});page.pushOperators(PDF.setLineJoin(PDF.LineJoinStyle.Round));
  for(const g of guides)page.drawLine({start:{x:g.x1*MM,y:(p.height-g.y1)*MM},end:{x:g.x2*MM,y:(p.height-g.y2)*MM},color:rgb(g.color),thickness:g.margin?.5:.35});
  for(const e of edges){for(let i=1;i<e.points.length;i++)page.drawLine({start:{x:e.points[i-1][0]*MM,y:(p.height-e.points[i-1][1])*MM},end:{x:e.points[i][0]*MM,y:(p.height-e.points[i][1])*MM},color:rgb(e.color),thickness:.45*MM});path(polygonPath(e.arrow),{color:rgb(e.color)});}
  const drawGlyph=g=>{const c=rgb(g.color);page.drawSvgPath(svgPaths(g.paths,true),{x:g.x*MM,y:(p.height-g.y)*MM,scale:g.scale*MM,color:c,...(g.strokeWidth?{borderColor:c,borderWidth:g.strokeWidth}:{})});};
  for(const n of nodes){path(n.path,{color:rgb(p.paperColor),borderColor:rgb(n.color),borderWidth:.45});for(const g of labels.find(l=>l.kind==='node'&&l.id===n.id).glyphs)drawGlyph(g);}
  for(const l of labels.filter(l=>l.kind!=='node')){if(l.kind==='edge')page.drawRectangle({x:l.box.x*MM,y:(p.height-l.box.y-l.box.height)*MM,width:l.box.width*MM,height:l.box.height*MM,color:rgb(p.paperColor)});for(const g of l.glyphs)drawGlyph(g);}
  doc.setTitle(map.title||'Mapa manuscrito');doc.setCreator('Trazo');return new Blob([await doc.save()],{type:'application/pdf'});
}
