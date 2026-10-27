import {readFile,writeFile} from 'node:fs/promises';
import {MAP_TYPES,createMap,renderMap,mapPDF} from '../../../outputs/trazo-android/web/maps.mjs';
const backup=JSON.parse(await readFile(new URL('../../../outputs/mi-caligrafia/Mi-letra-Optimizada.trazo',import.meta.url),'utf8'));
const results=[];
for(const {id,label} of MAP_TYPES){
  const map=createMap(id),render=renderMap(map,backup.samples);
  if(render.missing.length)throw Error(label+': missing '+render.missing.join(' '));
  await writeFile(new URL(id+'.svg',import.meta.url),render.svg);
  const pdf=await mapPDF(render,map);
  await writeFile(new URL(id+'.pdf',import.meta.url),Buffer.from(await pdf.arrayBuffer()));
  await writeFile(new URL(id+'.trazomap',import.meta.url),JSON.stringify({type:'trazo-map',version:1,map},null,2));
  results.push({type:id,sampleLibrary:backup.name,samples:backup.samples.length,nodes:map.nodes.length,edges:map.edges.length,glyphs:render.geometry.labels.reduce((sum,l)=>sum+l.glyphs.length,0),missing:render.missing,pdfBytes:pdf.size,pageMm:[map.paper.width,map.paper.height]});
}
await writeFile(new URL('proof-results.json',import.meta.url),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
