import test from 'node:test';
import assert from 'node:assert/strict';
import * as pdfBundle from '../web/vendor/pdf-lib.min.js';
import {CHARS} from '../web/core.mjs';
const engine = await import('../web/maps.mjs').catch(() => null);
const sample=(label,id=label)=>({id,label,advance:600,paths:[[[-50,-150],[-50,700],[500,700],[500,-150]]],baseline:.78});
const samples=[...CHARS].map(c=>sample(c));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} is not ${b}`);
const node=(id,text='a',x=30,y=40,width=54,height=26,shape='box')=>({id,text,x,y,width,height,shape,color:'#193c66',bold:false,italic:false});
const fixture=()=>({version:1,type:'concept',title:'Mapa',nodes:[node('a','ab',30,40),node('b','ba',180,110)],edges:[{id:'e',from:'a',to:'b',label:'a'}],paper:{width:297,height:210,margin:12,size:15,leading:8}});
test('map rendering engine is available',()=>assert.ok(engine,'The map rendering engine has not been implemented.'));
const check=(name,fn)=>test(name,{skip:!engine},fn);

check('all five map templates arrange inside print margins without overlapping nodes',()=>{
  assert.deepEqual(engine.MAP_TYPES.map(t=>t.id),['concept','mind','flow','tree','timeline']);
  for(const {id} of engine.MAP_TYPES){
    const initial=engine.createMap(id),original=structuredClone(initial),map=engine.arrangeMap(initial);
    assert.deepEqual(initial,original);assert.ok(map.nodes.length>=3);assert.ok(map.nodes.length<=6);
    const {marginLeft:l,marginRight:r,marginTop:t,marginBottom:b,width:w,height:h}=map.paper;
    for(const n of map.nodes){assert.ok(n.x>=l&&n.y>=t);assert.ok(n.x+n.width<=w-r&&n.y+n.height<=h-b);}
    for(let i=0;i<map.nodes.length;i++)for(let j=i+1;j<map.nodes.length;j++){const a=map.nodes[i],b=map.nodes[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${id}: ${a.id}/${b.id} overlap`);}
    const result=engine.renderMap(map,samples);assert.deepEqual(result.missing,[]);assert.ok(result.geometry.labels.some(l=>l.kind==='node'));
  }
});
check('validation clones, normalizes text and safe colors, and drops unknown input fields',()=>{
  const input=fixture();input.title='n\u0303\r\na';input.nodes[0].text='n\u0303\r\na\tb';input.nodes[0].color='url(javascript:bad)';input.nodes[1].color='#AABBCC';input.secret='no';input.paper.evil='no';
  const map=engine.validateMap(input);assert.equal(map.title,'ñ\na');assert.equal(map.nodes[0].text,'ñ\na    b');assert.equal(map.nodes[0].color,'#193c66');assert.equal(map.nodes[1].color,'#aabbcc');assert.equal(map.secret,undefined);assert.equal(map.paper.evil,undefined);
  map.nodes[0].text='changed';assert.equal(input.nodes[0].text,'n\u0303\r\na\tb');
});
check('validation rejects nonfinite dimensions, invalid paper and duplicate/dangling identities',()=>{
  for(const mutate of [m=>m.nodes[0].x=NaN,m=>m.nodes[0].width=-1,m=>m.nodes[0].height=Infinity,m=>m.paper.width=0,m=>m.paper.marginLeft=NaN,m=>m.paper.marginRight=290,m=>m.nodes[1].id='a',m=>m.edges.push({...m.edges[0]}),m=>m.edges[0].to='absent',m=>m.edges[0].to='a',m=>m.type='other',m=>m.version=2]){const m=fixture();mutate(m);assert.throws(()=>engine.validateMap(m));}
  const many=fixture();many.nodes=Array.from({length:61},(_,i)=>node('n'+i));many.edges=[];assert.throws(()=>engine.validateMap(many),/60/);
  const edges=fixture();edges.edges=Array.from({length:121},(_,i)=>({id:'e'+i,from:'a',to:'b',label:''}));assert.throws(()=>engine.validateMap(edges),/120/);
});
check('layout reports insufficient physical space and renderer refuses off-page nodes',()=>{
  const m=engine.createMap('mind');m.paper.width=70;m.paper.height=70;assert.throws(()=>engine.arrangeMap(m),/espacio|caben|cabe/i);
  const out=fixture();out.nodes[0].x=290;assert.throws(()=>engine.renderMap(out,samples),/margen|papel|fuera/i);
  out.nodes[0].x=NaN;assert.throws(()=>engine.arrangeMap(out));
});
check('handwriting is vector-only, deterministic and carries actual bold italic ink styles',()=>{
  const m=fixture();m.nodes[0].bold=true;m.nodes[0].italic=true;m.nodes[0].color='#cc2222';m.title='';
  const ss=[...samples,sample('a','a2')];ss.at(-1).paths[0][1][0]=-70;
  const before=structuredClone(ss),r=engine.renderMap(m,ss),again=engine.renderMap(m,ss),label=r.geometry.labels.find(l=>l.id==='a'&&l.kind==='node');
  assert.equal(r.svg,again.svg);assert.deepEqual(ss,before);assert.doesNotMatch(r.svg,/<text\b|<image\b/);assert.match(r.svg,/width="297mm" height="210mm"/);assert.match(r.svg,/viewBox="0 0 297 210"/);assert.match(r.svg,/data-node-id="a"/);
  assert.ok(label.glyphs.length);assert.ok(label.glyphs.every(g=>g.color==='#cc2222'&&g.strokeWidth===48&&g.italic));
  const g=label.glyphs.find(g=>g.label==='b');assert.equal(g.paths[0][1][0],76);
  for(const l of r.geometry.labels){assert.ok(l.bounds.x>=l.box.x-1e-7);assert.ok(l.bounds.y>=l.box.y-1e-7);assert.ok(l.bounds.x+l.bounds.width<=l.box.x+l.box.width+1e-7);assert.ok(l.bounds.y+l.bounds.height<=l.box.y+l.box.height+1e-7);}
});
check('missing handwriting is reported across title, nodes and connectors and cannot export',async()=>{
  const m=fixture();m.title='¿';m.nodes[0].text='añ';m.edges[0].label='é';const r=engine.renderMap(m,[sample('a'),sample('b')]);assert.deepEqual(new Set(r.missing),new Set(['¿','ñ','é']));assert.doesNotMatch(r.svg,/<text\b/);await assert.rejects(()=>engine.mapPDF(r,m),/muestras/i);
});
check('long text never silently exports a clipped or multipage node',()=>{
  const m=fixture();m.nodes[0].text='a '.repeat(500);assert.throws(()=>engine.renderMap(m,samples),/texto|cabe|nodo/i);
});
check('connector endpoints touch shape boundaries and labels stay inside the page',()=>{
  for(const shape of ['box','ellipse','diamond']){
    const m=fixture();m.nodes[0].shape=shape;m.nodes[1].shape=shape;const r=engine.renderMap(m,samples),e=r.geometry.edges[0];
    for(const [n,p] of [[m.nodes[0],e.points[0]],[m.nodes[1],e.points.at(-1)]]){const dx=Math.abs((p[0]-(n.x+n.width/2))/(n.width/2)),dy=Math.abs((p[1]-(n.y+n.height/2))/(n.height/2));if(shape==='ellipse')close(dx*dx+dy*dy,1);else if(shape==='diamond')close(dx+dy,1);else close(Math.max(dx,dy),1);}
    const l=r.geometry.labels.find(l=>l.kind==='edge');assert.ok(l.box.x>=0&&l.box.y>=0&&l.box.x+l.box.width<=297&&l.box.y+l.box.height<=210);
  }
});
check('untrusted title/id strings are safely escaped inside SVG attributes and metadata',()=>{
  const m=fixture();m.title='<script>alert(1)</script>';m.nodes[0].id='x" onload="bad';m.edges[0].from=m.nodes[0].id;m.nodes[0].text='a';
  const r=engine.renderMap(m,samples);assert.doesNotMatch(r.svg,/<script>|data-node-id="x" onload=/);assert.match(r.svg,/data-node-id="x&amp;quot;|data-node-id="x&quot;/);assert.match(r.svg,/&lt;script&gt;/);
});
check('PDF preserves physical paper size and vector geometry, with no font or raster fallback',async()=>{
  const m=fixture();m.title='';m.paper.width=300;m.paper.height=220;m.paper.paperColor='#fff5dc';m.paper.ruling='grid';m.nodes[0].bold=true;m.nodes[0].italic=true;m.nodes[0].color='#ff0000';
  const r=engine.renderMap(m,samples),blob=await engine.mapPDF(r,m),PDF=pdfBundle.default,doc=await PDF.PDFDocument.load(await blob.arrayBuffer()),page=doc.getPages()[0];
  assert.equal(blob.type,'application/pdf');assert.equal(doc.getPageCount(),1);close(page.getWidth(),300*72/25.4);close(page.getHeight(),220*72/25.4);
  const stream=doc.context.lookup(page.node.Contents().get(0)),ops=new TextDecoder().decode(PDF.decodePDFRawStream(stream).decode());
  assert.match(ops,/48 w/);assert.match(ops,/1 0 0 rg/);assert.match(ops,/1 0 0 RG/);assert.doesNotMatch(ops,/\bBT\b|\bDo\b/);
  const vertices=[...ops.matchAll(/([\d.-]+) ([\d.-]+) [ml]\b/g)].map(m=>[Number(m[1]),Number(m[2])]);
  for(const edge of r.geometry.edges)for(const [x,y] of edge.points)assert.ok(vertices.some(v=>Math.abs(v[0]-x*72/25.4)<1e-6&&Math.abs(v[1]-(220-y)*72/25.4)<1e-6),'edge vertex must use the same physical coordinates');
});
check('zero margins still protect full outline stroke from the physical paper edge',()=>{
  const m=fixture();m.title='';m.paper.margin=0;m.nodes[0].x=0;m.edges=[];
  assert.throws(()=>engine.renderMap(m,samples),/papel|fuera|borde/i);
  const arranged=engine.arrangeMap({...m,type:'mind'});
  for(const n of arranged.nodes){assert.ok(n.x-.225>=0);assert.ok(n.y-.225>=0);assert.ok(n.x+n.width+.225<=297);assert.ok(n.y+n.height+.225<=210);}
});
check('a connection routes around a third node instead of crossing its text',()=>{
  const m=fixture();m.title='';m.nodes=[node('a','a',20,80,40,24),node('b','b',200,80,40,24),node('c','a',100,70,50,44)];m.edges[0].label='';
  const r=engine.renderMap(m,samples),points=r.geometry.edges[0].points;
  assert.ok(points.length>2);
  for(let i=1;i<points.length;i++)for(let t=0;t<=1;t+=.01){const x=points[i-1][0]*(1-t)+points[i][0]*t,y=points[i-1][1]*(1-t)+points[i][1]*t;assert.ok(!(x>100&&x<150&&y>70&&y<114));}
});
check('layout retains cyclic and disconnected graph edges without mutating inputs',()=>{
  const m=fixture();m.nodes.push(node('c','a'));m.edges.push({id:'back',from:'b',to:'a',label:''});const before=structuredClone(m),r=engine.arrangeMap(m);
  assert.deepEqual(m,before);assert.deepEqual(r.edges,m.edges);assert.equal(r.nodes.length,3);assert.doesNotThrow(()=>engine.renderMap(r,samples));
});
check('PDF refuses geometry from a previous edit rather than exporting stale content',async()=>{
  const m=fixture(),r=engine.renderMap(m,samples);m.nodes[0].text='Changed';await assert.rejects(()=>engine.mapPDF(r,m),/cambió|actualiza/i);
});
