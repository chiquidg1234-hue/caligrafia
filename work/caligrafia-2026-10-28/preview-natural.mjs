// Contact sheet: Uniforme (grey frame) next to every Natural variant.
import fs from 'fs';import {createRequire} from 'module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ROOT=new URL('../../',import.meta.url).pathname,b=JSON.parse(fs.readFileSync(ROOT+'outputs/trazo-android/web/personal-letter.json'));
const prof=id=>b.profiles.find(p=>p.id===id).samples,U=prof('personal-uniforme-v1'),N=prof('personal-natural-v1');
const path=ps=>ps.map(p=>'M'+p.map(([x,y])=>`${x},${-y}`).join('L')+'Z').join('');
const cell=(s,cls='')=>`<div class="cell ${cls}"><svg viewBox="-20 -720 760 1000"><line x1="-20" x2="900" y1="0" y2="0" stroke="#cde"/><line x1="-20" x2="900" y1="-340" y2="-340" stroke="#eef"/><path d="${path(s.paths)}" fill="#183d59"/></svg></div>`;
const labels=[...new Set(N.map(s=>s.label))];const out=process.argv[2];
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1500,height:800}});
const per=Math.ceil(labels.length/3);
for(let k=0;k<3;k++){
 const rows=labels.slice(k*per,(k+1)*per).map(l=>{const u=U.find(s=>s.label===l);return `<div class=row><b>${l}</b>${u?cell(u,'u'):'<div class="cell u"></div>'}${N.filter(s=>s.label===l).map(s=>cell(s)).join('')}</div>`;});
 const cols=[rows.slice(0,Math.ceil(rows.length/2)),rows.slice(Math.ceil(rows.length/2))];
 await page.setContent(`<style>body{margin:6px;font:14px sans-serif;display:flex;gap:30px}.row{display:flex;align-items:center;gap:4px;margin:2px}.row b{width:22px;font-size:18px}.cell{border:1px solid #ccd;width:120px;height:72px}.cell svg{width:120px;height:72px}.u{background:#eee}</style>${cols.map(c=>'<div>'+c.join('')+'</div>').join('')}`);
 await page.screenshot({path:`${out}/natural-${k+1}.png`,fullPage:true});
}
await browser.close();
