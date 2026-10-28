// Contact sheets of every Optimizada variant, numbered as in the Original groups.
import fs from 'fs';
import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const ROOT=new URL('../../',import.meta.url).pathname;
const bundle=JSON.parse(fs.readFileSync(ROOT+'work/caligrafia-2026-10-21/bundled-letter.json'));
const opt=bundle.profiles.find(p=>p.id==='personal-optimizada-v1').samples;
const chosen=new Map(JSON.parse(fs.readFileSync(ROOT+'outputs/mi-caligrafia/Mi-letra-Uniforme-curacion.json')).selections.map(s=>[s.char,s.selectedVariantOneBased]));
const groups=new Map();for(const s of opt){if(!groups.has(s.label))groups.set(s.label,[]);groups.get(s.label).push(s);}
const path=ps=>ps.map(p=>'M'+p.map(([x,y])=>`${x},${-y}`).join('L')+'Z').join('');
const labels=[...groups.keys()].filter(l=>groups.get(l).length>1);
const out=process.argv[2]||'sheets';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1250,height:800}});
for(let k=0;k*12<labels.length;k++){
  const rows=labels.slice(k*12,k*12+12).map(l=>`<div class=row><b>${l}</b>`+groups.get(l).map((s,i)=>`<div class="cell ${chosen.get(l)===i+1?'sel':''}"><small>${i+1}</small><svg viewBox="-20 -720 ${Math.max(700,s.advance+40)} 1000"><line x1="-20" x2="2000" y1="0" y2="0" stroke="#cde"/><line x1="-20" x2="2000" y1="-340" y2="-340" stroke="#eef"/><path d="${path(s.paths)}" fill="#183d59"/></svg></div>`).join('')+'</div>').join('');
  await page.setContent(`<style>body{margin:8px;font:14px sans-serif}.row{display:flex;align-items:center;gap:6px;margin:3px}.row b{width:24px;font-size:22px}.cell{border:1px solid #ccd;width:180px;height:110px;position:relative}.cell svg{width:180px;height:110px}.cell small{position:absolute;left:3px;top:1px;color:#678}.sel{border:3px solid #2a8}</style>${rows}`);
  await page.screenshot({path:`${out}/variantes-${k+1}.png`,fullPage:true});
}
await browser.close();console.log(labels.length,'labels');
