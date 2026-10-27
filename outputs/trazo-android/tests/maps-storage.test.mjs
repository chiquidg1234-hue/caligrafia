import test from 'node:test';
import assert from 'node:assert/strict';
const engine=await import('../web/maps-storage.mjs').catch(()=>null);
test('map workspace persistence is available',()=>assert.ok(engine));
const check=(name,fn)=>test(name,{skip:!engine},fn);
function fixture(){
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  let stored={version:1,activeId:'a',maps:[{id:'a',map:{title:'Original'}}]};
  return {storage,read:async()=>structuredClone(stored),write:async value=>{stored=structuredClone(value);},value:()=>stored};
}
const workspace=title=>({version:1,activeId:'a',maps:[{id:'a',map:{title}}]});
check('synchronous journal recovers the final edit before any asynchronous database commit',async()=>{
  const db=fixture();let release;const gate=new Promise(resolve=>release=resolve);
  const persistence=engine.createMapPersistence({...db,write:async value=>{await gate;await db.write(value);}});
  const saved=persistence.save(workspace('Última idea'));
  assert.equal(saved.durable,true);
  const reloaded=engine.createMapPersistence(db);assert.equal((await reloaded.load()).maps[0].map.title,'Última idea');
  release();await saved.done;
});
check('an older completion cannot erase a newer journal or overwrite the final import',async()=>{
  const db=fixture();let release;const gate=new Promise(resolve=>release=resolve);
  const persistence=engine.createMapPersistence({...db,write:async value=>{if(value.maps.length===1)await gate;await db.write(value);}});
  const first=persistence.save(workspace('Anterior'));
  const imported={version:1,activeId:'b',maps:[...workspace('Nuevo').maps,{id:'b',map:{title:'Importado'}}]};
  const latest=persistence.save(imported);imported.maps[1].map.title='Cambio externo';
  assert.equal((await engine.createMapPersistence(db).load()).maps[1].map.title,'Importado');
  release();await first.done;await latest.done;
  assert.equal(db.value().maps[0].map.title,'Nuevo');assert.equal(db.value().maps[1].map.title,'Importado');
  assert.equal(db.storage.getItem(engine.MAP_MIRROR_KEY),null);
});
check('existing IndexedDB workspaces without a revision still load unchanged',async()=>{
  const db=fixture();assert.deepEqual(await engine.createMapPersistence(db).load(),db.value());
});
check('a failed write retains recoverable data and does not block a later save',async()=>{
  const db=fixture();let fail=true;
  const persistence=engine.createMapPersistence({...db,write:async value=>{if(fail){fail=false;throw Error('DB unavailable');}await db.write(value);}});
  await assert.rejects(persistence.save(workspace('Recuperable')).done,/unavailable/);
  assert.equal((await engine.createMapPersistence(db).load()).maps[0].map.title,'Recuperable');
  await persistence.save(workspace('Recuperado')).done;assert.equal(db.value().maps[0].map.title,'Recuperado');
});
check('unavailable localStorage falls back to an immediate database save',async()=>{
  const db=fixture(),persistence=engine.createMapPersistence({...db,storage:{getItem:()=>null,setItem:()=>{throw Error('Quota');},removeItem:()=>{}}});
  const result=persistence.save(workspace('Sin espejo'));assert.equal(result.durable,false);await result.done;
  assert.equal(db.value().maps[0].map.title,'Sin espejo');
});
check('a stale journal cannot replace a newer database workspace',async()=>{
  const db=fixture();await db.write({...workspace('Nuevo'),revision:200});
  db.storage.setItem(engine.MAP_MIRROR_KEY,JSON.stringify({...workspace('Viejo'),revision:100}));
  assert.equal((await engine.createMapPersistence(db).load()).maps[0].map.title,'Nuevo');
});
