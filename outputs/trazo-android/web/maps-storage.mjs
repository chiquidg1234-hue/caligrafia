import {setting,setSetting} from './db.mjs';

export const MAP_MIRROR_KEY='trazo-map-workspace-pending-v1';

/** Keep the last edit durable before returning, then commit snapshots in order.
 * The pending mirror is cleared only by its own successful database write.
 * One shared instance also orders writes across route unmounts/remounts.
 */
export function createMapPersistence({read=()=>setting('mapWorkspace',null),write=value=>setSetting('mapWorkspace',value),storage}={}){
  let queue=Promise.resolve(),revision=0;
  const local=()=>storage??globalThis.localStorage;
  const stamp=value=>Number.isSafeInteger(value?.revision)?value.revision:0;
  return {
    async load(){
      await queue;
      const saved=await read();let raw;
      try{raw=local()?.getItem(MAP_MIRROR_KEY);}catch{}
      let pending;
      if(raw){
        try{pending=JSON.parse(raw);if(pending?.version!==1||!Array.isArray(pending.maps))throw Error();}
        catch{throw Error('No se pudo leer el último guardado de mapas. Sus datos siguen conservados.');}
      }
      revision=Math.max(revision,stamp(saved),stamp(pending));
      return pending&&stamp(pending)>=stamp(saved)?pending:saved;
    },
    save(value){
      revision=Math.max(Date.now(),revision+1);
      const snapshot=structuredClone({...value,revision}),serialized=JSON.stringify(snapshot);
      let durable=false;
      try{local().setItem(MAP_MIRROR_KEY,serialized);durable=true;}catch{}
      const done=queue.then(()=>write(snapshot)).then(()=>{
        try{if(local()?.getItem(MAP_MIRROR_KEY)===serialized)local().removeItem(MAP_MIRROR_KEY);}catch{}
      });
      // A failed transaction must not poison later saves. Its mirror remains.
      queue=done.catch(()=>{});
      return {durable,done};
    },
    flush(){return queue;}
  };
}

export const mapPersistence=createMapPersistence();
