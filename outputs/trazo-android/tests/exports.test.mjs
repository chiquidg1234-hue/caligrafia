import test from 'node:test';import assert from 'node:assert/strict';import {templatePDF,pagesPDF,drawingPDF} from '../web/exports.mjs';
import * as pdfBundle from '../web/vendor/pdf-lib.min.js';
import {paperGuides} from '../web/model.mjs';
import {layoutText} from '../web/core.mjs';
test('six capture sheets are a real multipage PDF',async()=>{const b=await templatePDF(6);const s=await b.text();assert.ok(s.startsWith('%PDF-'));assert.ok(b.size>3000);});
test('PDF refuses text that would silently omit missing glyphs',async()=>{await assert.rejects(()=>pagesPDF({pages:[],missing:['ñ']}));});
test('glyph outlines and drawing outlines export as PDF',async()=>{const paths=[[[0,0],[500,0],[250,600]]];const b=await pagesPDF({pages:[[{paths,x:20,y:30,scale:.006}]],missing:[]});assert.ok(b.size>500);const d=await drawingPDF(null,500,600,paths);assert.ok(d.size>500);});
test('exported PDF draws the same 5 mm guide coordinates as the canvas at every line spacing',async()=>{
  const PDF=pdfBundle.default,MM=72/25.4,layout={pages:[[]],missing:[]};
  let previous;
  for(const leading of [5,8,10,15]){
    const options={width:148,height:210,margin:18,ruling:'grid',gridMm:5,leading};
    const blob=await pagesPDF(layout,options),doc=await PDF.PDFDocument.load(await blob.arrayBuffer());
    const contents=doc.getPages()[0].node.Contents(),stream=doc.context.lookup(contents.get(0));
    const commands=new TextDecoder().decode(PDF.decodePDFRawStream(stream).decode());
    const points=[...commands.matchAll(/([-\d.]+) ([-\d.]+) m\n(?:[-\d.]+ [-\d.]+ m\n)?([-\d.]+) ([-\d.]+) l\nS/g)].flatMap(m=>[[+m[1],+m[2]],[+m[3],+m[4]]]);
    const expected=paperGuides(options).flatMap(g=>[[g.x1*MM,(210-g.y1)*MM],[g.x2*MM,(210-g.y2)*MM]]);
    assert.equal(points.length,expected.length);
    points.forEach((point,i)=>point.forEach((value,j)=>assert.ok(Math.abs(value-expected[i][j])<.000001)));
    if(previous)assert.equal(commands,previous);previous=commands;
  }
});
test('custom paper, guides, per-selection colors and opaque bold are actual PDF operators',async()=>{
  const PDF=pdfBundle.default,options={width:165,height:235,marginLeft:12,marginRight:17,marginTop:14,marginBottom:20,paperColor:'#fff5dc',gridColor:'#98bddd',ruling:'grid',marginLine:true,marginLineX:22,marginLineColor:'#d999aa',styles:[{start:0,end:1,bold:true,italic:true,color:'#ff0000'}]},sample={label:'a',advance:600,paths:[[[0,0],[0,700],[500,700],[500,0]]]},layout=layoutText('aa',[sample],options),blob=await pagesPDF(layout,options),doc=await PDF.PDFDocument.load(await blob.arrayBuffer()),page=doc.getPages()[0],contents=page.node.Contents(),commands=new TextDecoder().decode(PDF.decodePDFRawStream(doc.context.lookup(contents.get(0))).decode());
  assert.ok(Math.abs(page.getWidth()-165*72/25.4)<.00001);assert.ok(Math.abs(page.getHeight()-235*72/25.4)<.00001);
  assert.match(commands,/48 w/);assert.match(commands,/1 0 0 rg/);assert.match(commands,/1 0 0 RG/);assert.match(commands,/1 j/);
  assert.match(commands,/1 0\.9607843137254902 0\.8627450980392157 rg/);
  assert.equal(layout.pages[0][0].paths[0][1][0],126);assert.equal(layout.pages[0][1].paths[0][1][0],0);
});
