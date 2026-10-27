// Desktop Chromium compatibility check with the same virtual HTTPS origin and CSP.
// This does not run an Android WebView and cannot substitute for a device test.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('C:/Users/59172/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../../..');
const webRoot = path.resolve(__dirname, '../../web');
const work = path.join(root, 'work/trazo-android/toolchain');
const profile = path.join(work, 'virtual-origin-browser-profile-' + Date.now());
let activeContext;
(async () => {
  const native = await fs.readFile(path.resolve(__dirname, '../src/app/trazo/offline/MainActivity.java'), 'utf8');
  const csp = native.match(/headers.put\("Content-Security-Policy", "([^"]+)"\)/)[1];
  const mime = {'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webmanifest':'application/json','.png':'image/png','.svg':'image/svg+xml'};
  const errors = [], requests = [];
  async function open() {
    console.log('Launching isolated desktop Chrome...');
    const context = await chromium.launchPersistentContext(profile, {channel:'chrome', headless:true, chromiumSandbox:true, serviceWorkers:'block'});
    activeContext = context;
    console.log('Isolated Chrome launched.');
    await context.addInitScript(() => { globalThis.TrazoNative = {version:()=>'origin-check',setProcessing:()=>{}}; });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://trazo.local') return route.abort();
      const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
      if (relative.split('/').some(s=>s==='..'||s==='.') || relative.includes('\\')) return route.abort();
      requests.push(relative);
      try { await route.fulfill({status:200,contentType:(mime[path.extname(relative)]||'application/octet-stream')+'; charset=UTF-8', headers:{'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}, body:await fs.readFile(path.join(webRoot,relative))}); }
      catch { await route.fulfill({status:404,body:'Not Found'}); }
    });
    const page = context.pages()[0] || await context.newPage();
    page.on('pageerror', error=>errors.push(error.message));
    await page.goto('https://trazo.local/');
    console.log('Virtual HTTPS page loaded.');
    await page.waitForFunction(()=>document.querySelector('#main')?.textContent.includes('Tu estudio personal') || document.body.textContent.includes('Que siga siendo tu letra'));
    return {context,page};
  }
  let {context,page} = await open();
  const result = await page.evaluate(async()=>{
    const worker = await new Promise((resolve,reject)=>{
      const w = new Worker('./worker.mjs',{type:'module'});
      const timer=setTimeout(()=>{w.terminate();reject(Error('worker timeout'));},15000);
      w.onmessage=({data})=>{clearTimeout(timer);w.terminate();data.error?reject(Error(data.error)):resolve(data.result);};
      w.onerror=e=>{clearTimeout(timer);w.terminate();reject(Error(e.message));};
      w.postMessage({id:998,method:'coverage',args:[[]]});
    });
    if (worker.total!==92 || worker.covered!==0) throw Error('worker coverage mismatch');
    const canvas=document.createElement('canvas');canvas.width=2;canvas.height=3;
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const bitmap=await createImageBitmap(blob);
    const imageBitmap={width:bitmap.width,height:bitmap.height};bitmap.close();
    if(imageBitmap.width!==2||imageBitmap.height!==3)throw Error('bitmap mismatch');
    const db=await import('./db.mjs');await db.setSetting('native-origin-check','persisted');
    return {origin:location.origin,secureContext:isSecureContext,worker:{total:worker.total,covered:worker.covered},imageBitmap,indexedDBWrite:true};
  });
  await context.close();
  ({context,page}=await open());
  result.indexedDBAfterBrowserRestart = await page.evaluate(async()=> (await import('./db.mjs')).setting('native-origin-check','missing'));
  await context.close();
  if(result.indexedDBAfterBrowserRestart!=='persisted') throw Error('IndexedDB did not persist');
  if(errors.length)throw Error('page errors: '+errors.join('; '));
  const report={runtime:'Desktop Chrome, isolated profile; Android NOT tested',...result,pageErrors:errors,requestedAssets:[...new Set(requests)].sort(),csp};
  await fs.writeFile(path.join(work,'virtual-origin-check.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
})().catch(async error=>{try { await activeContext?.close(); } catch {} console.error(error);process.exitCode=1;});

