import {validateBackup} from './model.mjs';

// Stable IDs make first-run provisioning retryable without touching user libraries.
export function planBundledLetters(bundle, current, installed=[]) {
  if(bundle?.version!==1||!Array.isArray(bundle.profiles)||!bundle.profiles.length)throw Error('No se encontró tu letra incluida.');
  const done=new Set(Array.isArray(installed)?installed:[]),profiles=[...current.profiles],samples=[...current.samples],added=[];
  for(const entry of bundle.profiles){
    if(!/^personal-[a-z-]+-v\d+$/.test(entry.id))throw Error('Identificador de letra incluida inválido.');
    if(done.has(entry.id))continue;
    const library=validateBackup({type:'trazo-library',version:2,name:entry.name,samples:entry.samples});
    // Existing records with this ID belong to the user; never reset edits or trash.
    if(!profiles.some(p=>p.id===entry.id)){
      profiles.push({id:entry.id,name:library.name,fontName:library.name});
      const incoming=library.samples.map((s,i)=>({...s,id:entry.id+'-'+i,profileId:entry.id}));
      if(incoming.some(s=>samples.some(old=>old.id===s.id)))throw Error('No se pudo añadir tu letra sin reemplazar una muestra.');
      samples.push(...incoming);added.push(...incoming);
    }
    done.add(entry.id);
  }
  // A newly bundled Natural letter is selected once; afterwards the user's choice stays.
  const preferred=bundle.profiles.find(p=>p.id.startsWith('personal-natural-'))||bundle.profiles.find(p=>p.id.startsWith('personal-uniforme-'));
  const firstUse=preferred&&!(Array.isArray(installed)?installed:[]).includes(preferred.id);
  return {samples,profiles,added,installed:[...done],activeProfileId:firstUse?preferred.id:current.activeProfileId};
}
