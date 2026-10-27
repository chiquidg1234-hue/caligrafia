import test from 'node:test';import assert from 'node:assert/strict';
import {layoutText} from '../web/core.mjs';
import {restoreDraft,paperGuides,normaliseText,normaliseStyles,applyTextStyle,styleAt,remapTextStyles} from '../web/model.mjs';
const sample=(label,id=label,advance=600)=>({label,char:label,id,advance,paths:[[[-50,-150],[-50,700],[500,700],[500,-150]]],baseline:.78});
const samples=[sample('a'),sample('b'),sample('ab','ligature',1100)];
test('legacy symmetric margin migrates to four independent editable margins',()=>{
  const d=restoreDraft({text:'a',margin:12,marginRight:23});
  assert.deepEqual([d.marginLeft,d.marginRight,d.marginTop,d.marginBottom],[12,23,12,12]);
  const layout=layoutText('a'.repeat(180),samples,{width:95,height:130,marginLeft:7,marginRight:13,marginTop:11,marginBottom:21,leading:10});
  for(const p of layout.pages)for(const g of p)for(const path of g.paths)for(const [x,y] of path){assert.ok(g.x+x*g.scale>=6.999);assert.ok(g.x+x*g.scale<=82.001);assert.ok(g.y-y*g.scale>=10.999);assert.ok(g.y-y*g.scale<=109.001);}
  assert.throws(()=>layoutText('a',samples,{width:70,marginLeft:40,marginRight:30}),/márgenes/);
});
test('custom guides use independent margins, 5 mm spacing, origin shifts, colors and margin line',()=>{
  const guides=paperGuides({width:100,height:150,marginLeft:7,marginRight:13,marginTop:11,marginBottom:21,ruling:'grid',gridMm:5,gridOriginX:2,gridOriginY:-1,gridColor:'#112233',marginLine:true,marginLineX:20,marginLineColor:'#aa3355'});
  assert.deepEqual(guides[0],{x1:7,y1:15,x2:87,y2:15,color:'#112233'});
  assert.equal(guides.find(g=>g.x1===g.x2).x1,9);assert.ok(guides.filter(g=>!g.margin).every(g=>g.x1>=7&&g.x2<=87&&g.y1>=11&&g.y2<=129));
  assert.deepEqual(guides.at(-1),{x1:20,y1:0,x2:20,y2:150,color:'#aa3355',margin:true});
  assert.deepEqual(paperGuides({ruling:'none'}),[]);
});
test('selection styling preserves surrounding text, removes formats and rejects unsafe colors',()=>{
  let styles=applyTextStyle([],6,1,4,{bold:true});styles=applyTextStyle(styles,6,2,5,{italic:true,color:'#ff0000'});
  assert.deepEqual(styleAt(styles,0),{bold:false,italic:false});assert.equal(styleAt(styles,1).bold,true);
  assert.deepEqual(styleAt(styles,2),{bold:true,italic:true,color:'#ff0000'});assert.deepEqual(styleAt(styles,4),{bold:false,italic:true,color:'#ff0000'});
  styles=applyTextStyle(styles,6,2,3,{bold:false,italic:false,color:null});assert.deepEqual(styleAt(styles,2),{bold:false,italic:false});
  assert.equal(normaliseStyles([{start:0,end:2,color:'url(javascript:bad)'}],6)[0].color,undefined);
});
test('editing remaps selection styles across inserted and removed text with NFC normalization',()=>{
  assert.equal(normaliseText('n\u0303\r\na\tb'),'ñ\na    b');
  const bold=[{start:1,end:3,bold:true}];
  const inserted=remapTextStyles('abcd','abXXcd',bold);assert.ok([1,2,3,4].every(i=>styleAt(inserted,i).bold));assert.equal(styleAt(inserted,5).bold,false);
  const removed=remapTextStyles('abcd','ad',bold);assert.equal(removed.length,0);
});
test('deleting the first repeated character moves the surviving second character style to zero',()=>{
  const styles=remapTextStyles('aaa','aa',[{start:1,end:2,bold:true}],{start:1,end:1,inputType:'deleteContentBackward'});
  assert.deepEqual([styleAt(styles,0).bold,styleAt(styles,1).bold],[true,false]);
});
test('forward deletion uses the actual caret among repeated characters',()=>{
  const styles=remapTextStyles('aaaa','aaa',[{start:2,end:3,italic:true}],{start:1,end:1,inputType:'deleteContentForward'});
  assert.deepEqual([0,1,2].map(i=>styleAt(styles,i).italic),[false,true,false]);
});
test('replacing repeated selected characters retains styles on the surviving suffix',()=>{
  const styles=remapTextStyles('aaaa','aaa',[{start:2,end:3,bold:true}],{start:0,end:2,inputType:'insertText'});
  assert.deepEqual([0,1,2].map(i=>styleAt(styles,i).bold),[false,true,false]);
});
test('inserting repeated text before a styled character shifts only the original character',()=>{
  const styles=remapTextStyles('aaa','aaaa',[{start:1,end:2,bold:true}],{start:0,end:0,inputType:'insertText'});
  assert.deepEqual([0,1,2,3].map(i=>styleAt(styles,i).bold),[false,false,true,false]);
});
test('replacing a repeated styled character with identical plain text removes its previous style',()=>{
  const styles=remapTextStyles('aaa','aaa',[{start:1,end:2,bold:true}],{start:1,end:2,inputType:'insertText'});
  assert.deepEqual([0,1,2].map(i=>styleAt(styles,i).bold),[false,false,false]);
});
test('stale composition ranges fall back to text differences and preserve NFC and line breaks',()=>{
  const old='n\na',next=normaliseText('n\u0303\r\na'),styles=remapTextStyles(old,next,[{start:0,end:1,bold:true},{start:2,end:3,italic:true}],{start:1,end:1,inputType:'insertCompositionText'});
  assert.equal(next,'ñ\na');assert.equal(styleAt(styles,0).bold,true);assert.equal(styleAt(styles,2).italic,true);
});
test('partial selection bypasses a ligature, whole-word matching styles retain it',()=>{
  const partial=layoutText('ab',samples,{styles:[{start:0,end:1,bold:true}]});assert.deepEqual(partial.pages[0].map(g=>g.sampleId),['a','b']);assert.equal(partial.pages[0][0].strokeWidth,48);assert.equal(partial.pages[0][1].strokeWidth,0);
  const whole=layoutText('ab',samples,{styles:[{start:0,end:2,bold:true}]});assert.equal(whole.pages[0][0].sampleId,'ligature');
});
test('italic shears actual contours and bold uses opaque stroke; bounds include both',()=>{
  const before=structuredClone(samples),options={width:70,height:90,marginLeft:9,marginRight:17,marginTop:8,marginBottom:15,size:20,leading:12,styles:[{start:0,end:120,bold:true,italic:true,color:'#cb2222'}]},r=layoutText('a'.repeat(120),samples,options);
  assert.deepEqual(samples,before);assert.deepEqual(r.pages[0][0].paths[0][1],[-50+700*.18,700]);
  for(const page of r.pages)for(const g of page){assert.equal(g.color,'#cb2222');assert.equal(g.strokeWidth,48);const pad=g.strokeWidth/2*g.scale;for(const p of g.paths)for(const [x,y] of p){assert.ok(g.x+x*g.scale-pad>=8.999);assert.ok(g.x+x*g.scale+pad<=53.001);assert.ok(g.y-y*g.scale-pad>=7.999);assert.ok(g.y-y*g.scale+pad<=75.001);}}
});
test('36 pt one-line titles allow 5 mm leading while multiple lines report overlap',()=>{
  assert.doesNotThrow(()=>layoutText('a',samples,{size:36,leading:5}));
  assert.throws(()=>layoutText('a\na',samples,{size:36,leading:5}),/interlineado/);
  assert.throws(()=>layoutText('a'.repeat(200),samples,{width:70,size:36,leading:5}),/interlineado/);
});
