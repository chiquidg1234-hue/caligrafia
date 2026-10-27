let connection;
export async function database(){
  if(connection)return connection;
  connection=await new Promise((resolve,reject)=>{const r=indexedDB.open('trazo-estudio-v2',1);r.onupgradeneeded=()=>{for(const name of ['samples','jobs','settings'])r.result.createObjectStore(name,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return connection;
}
export async function all(store){const db=await database();return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function putMany(store,items){const db=await database();return new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');for(const item of items)t.objectStore(store).put(item);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('No se pudo guardar.'));});}
export async function setting(id,fallback){return (await all('settings')).find(x=>x.id===id)?.value??fallback;}
export async function setSetting(id,value){await putMany('settings',[{id,value}]);}
export async function commitBundledLetters(plan){
  const db=await database();
  await new Promise((resolve,reject)=>{
    const t=db.transaction(['samples','settings'],'readwrite');
    for(const sample of plan.added)t.objectStore('samples').put(sample);
    for(const [id,value] of [['profiles',plan.profiles],['activeProfileId',plan.activeProfileId],['bundledLetters',plan.installed]])t.objectStore('settings').put({id,value});
    t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('No se pudo guardar tu letra incluida.'));
  });
}
