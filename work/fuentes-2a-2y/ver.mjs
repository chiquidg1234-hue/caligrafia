// Contact sheet of a profile file: node ver.mjs perfil.json salida.png
import fs from 'fs';import {createRequire} from 'module';
const {chromium}=createRequire(import.meta.url)('playwright');
const [src,out]=process.argv.slice(2),p=JSON.parse(fs.readFileSync(src)),groups=new Map();
for(const s of p.samples){if(!groups.has(s.label))groups.set(s.label,[]);groups.get(s.label).push(s);}
const path=ps=>ps.map(q=>'M'+q.map(([x,y])=>`${x},${-y}`).join('L')+'Z').join('');
const rows=[...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([l,ss])=>`<div class=r><b>${l}</b>${ss.map(s=>`<svg viewBox="-20 -760 ${Math.max(600,s.advance+40)} 1050"><line x1="-20" x2="2000" y1="0" y2="0" stroke="#cde"/><line x1="-20" x2="2000" y1="-340" y2="-340" stroke="#eef"/><path d="${path(s.paths)}" fill="#1d2f6b"/></svg>`).join('')}</div>`).join('');
const b=await chromium.launch(),pg=await b.newPage({viewport:{width:1300,height:800}});
await pg.setContent(`<style>body{margin:6px;font:15px sans-serif;columns:2}.r{display:flex;align-items:center;gap:2px;break-inside:avoid}.r b{width:22px}svg{width:70px;height:58px;border:1px solid #e3e8ee}</style>${rows}`);
await pg.screenshot({path:out,fullPage:true});await b.close();
