// Run with TRAZO_TEST_URL and PLAYWRIGHT_PACKAGE set when the local paths differ.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/59172/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.TRAZO_TEST_URL||'http://127.0.0.1:8893';
let failures=0;
async function check(name,fn){
  const context=await browser.newContext({viewport:{width:412,height:915}}),page=await context.newPage();
  try{await page.goto(base+'/#home');await page.locator('[data-go="maps"]').waitFor();await fn(page);console.log('PASS '+name);}
  catch(e){failures++;console.error('FAIL '+name+': '+e.message);}
  finally{await context.close();}
}
async function maps(page){await page.goto(base+'/#maps');await page.locator('#mapTitle').waitFor();}
async function saved(page){return page.evaluate(async()=>{const {setting}=await import('./db.mjs');return setting('mapWorkspace',null);});}
try{
  await check('title and node edits survive an immediate reload in the same event',async page=>{
    await maps(page);
    await page.waitForFunction(async()=>!!(await (await import('./db.mjs')).setting('mapWorkspace',null)));
    for(const [selector,text] of [['#mapTitle','Persistencia inmediata'],['#nodeText','Idea conservada']]){
      await Promise.all([page.waitForEvent('load'),page.evaluate(({selector,text})=>{const input=document.querySelector(selector);input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));location.reload();},{selector,text})]);
      await page.locator(selector).waitFor();assert.equal(await page.locator(selector).inputValue(),text);
    }
    assert.equal(await page.locator('#mapTitle').inputValue(),'Persistencia inmediata');
  });
  await check('copy paper includes every page field and rejects invalid settings atomically',async page=>{
    await maps(page);
    const paper={width:297,height:210,marginLeft:13,marginRight:14,marginTop:15,marginBottom:16,ruling:'grid',gridMm:6,gridColor:'#c0c0c0',paperColor:'#fff5dc',size:14,leading:9,gridOriginX:2,gridOriginY:3,marginLine:true,marginLineX:25,marginLineColor:'#bb8899',ink:'#552211'};
    await page.evaluate(async paper=>(await import('./db.mjs')).setSetting('draft',paper),paper);
    await page.getByText('Organizar y personalizar hoja',{exact:true}).click();await page.locator('#usePagePaper').click();
    await page.waitForFunction(async()=>{const s=await (await import('./db.mjs')).setting('mapWorkspace',null);return s?.maps.find(m=>m.id===s.activeId)?.map.paper.width===297&&s?.maps.find(m=>m.id===s.activeId)?.map.paper.marginLeft===13;});
    const stored=await saved(page),actual=stored.maps.find(m=>m.id===stored.activeId).map.paper;
    for(const [key,value] of Object.entries(paper))assert.equal(actual[key],value,'paper.'+key);
    await page.evaluate(async paper=>(await import('./db.mjs')).setSetting('draft',{...paper,width:70,marginLeft:60,marginRight:60}),paper);
    await page.getByText('Organizar y personalizar hoja',{exact:true}).click();await page.locator('#usePagePaper').click();
    await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('márgenes'));
    const rejected=await saved(page);assert.deepEqual(rejected.maps.find(m=>m.id===rejected.activeId).map.paper,actual);
  });
  await check('100-map limit can be freed with accessible confirmation; other maps survive',async page=>{
    await page.evaluate(async()=>{const {setSetting}=await import('./db.mjs'),{createMap}=await import('./maps.mjs');const maps=Array.from({length:100},(_,i)=>({id:'saved-'+i,map:{...createMap(),title:'Mapa '+i}}));await setSetting('mapWorkspace',{version:1,activeId:'saved-0',maps});});
    await maps(page);const initial=(await saved(page)).maps;
    await page.locator('#deleteMap').click({timeout:2000});
    const prompt=page.getByRole('alertdialog',{name:'Eliminar mapa'});await prompt.waitFor();
    assert.equal(await page.locator('#cancelDeleteMap').evaluate(el=>el===document.activeElement),true);
    await page.locator('#cancelDeleteMap').click();assert.equal(await page.locator('#savedMap option').count(),100);
    await page.locator('#deleteMap').click();
    await mkdir(new URL('../../../output/playwright/',import.meta.url),{recursive:true});
    await page.screenshot({path:new URL('../../../output/playwright/map-delete-confirmation.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
    await page.locator('#confirmDeleteMap').click();assert.equal(await page.locator('#savedMap option').count(),99);
    await page.locator('#createMap').click();assert.equal(await page.locator('#savedMap option').count(),100);
    await page.reload();await page.locator('#mapTitle').waitFor();
    const after=(await saved(page)).maps;assert.equal(after.length,100);assert.ok(!after.some(m=>m.id==='saved-0'));
    for(const entry of initial.slice(1))assert.deepEqual(after.find(m=>m.id===entry.id),entry);
    await page.locator('#deleteMap').click();await page.locator('#confirmDeleteMap').click();
    await page.getByText('Guardar copia o importar',{exact:true}).click();
    await page.locator('#mapFile').setInputFiles({name:'recovered.trazomap',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({type:'trazo-map',version:1,map:{...initial[0].map,title:'Mapa recuperado'}}))});
    await page.waitForFunction(()=>document.querySelector('#mapTitle')?.value==='Mapa recuperado');assert.equal(await page.locator('#savedMap option').count(),100);
    await page.reload();await page.locator('#mapTitle').waitFor();assert.equal(await page.locator('#mapTitle').inputValue(),'Mapa recuperado');
  });
}finally{await browser.close();}
if(failures)process.exitCode=1;
