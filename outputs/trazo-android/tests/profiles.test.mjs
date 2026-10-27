import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreProfiles,profileSamples,validateSampleChanges,validateBackup,prepareLibraryImport,restoreDraft,paperGuides,DEFAULT_PROFILE_ID} from '../web/model.mjs';
const sample={id:'legacy-a',label:'a',paths:[[[0,0],[400,0],[200,600]]],advance:500,baseline:.78};
const backup=name=>validateBackup({type:'trazo-library',version:2,name,samples:[sample,{...sample,id:'second'}]});
let serial=0;const makeId=()=>`test-${++serial}`;

test('legacy migration retains every sample, order, geometry, trash and original font name',()=>{
  const before=[{...sample,id:'z'},{...sample,id:'a',deletedAt:123}],snapshot=structuredClone(before);
  const r=restoreProfiles(before,[],null,'Nombre anterior');
  assert.deepEqual(before,snapshot);assert.deepEqual(r.samples.map(s=>s.id),['z','a']);
  assert.equal(r.profiles[0].name,'Mi biblioteca');assert.equal(r.profiles[0].fontName,'Nombre anterior');
  assert.equal(r.activeProfileId,DEFAULT_PROFILE_ID);assert.equal(r.samples[1].deletedAt,123);
  assert.deepEqual(r.samples[0].paths,before[0].paths);
  assert.deepEqual(restoreProfiles(r.samples,r.profiles,r.activeProfileId),r);
});
test('existing profile IDs survive missing metadata and selected profile survives restart',()=>{
  const r=restoreProfiles([{...sample,profileId:'separate'}],[{id:'base',name:'Base'}],'separate');
  assert.equal(r.activeProfileId,'separate');assert.equal(r.profiles.length,2);
  assert.equal(r.samples[0].profileId,'separate');
});
test('successive Original and Optimizada imports create independent libraries by default',()=>{
  const base=restoreProfiles([sample]),original=prepareLibraryImport(backup('Mi letra Original'),base.samples,base.profiles,base.activeProfileId,{makeId});
  const all=[...base.samples,...original.samples],optimized=prepareLibraryImport(backup('Mi letra Optimizada'),all,original.profiles,original.activeProfileId,{makeId});
  assert.equal(optimized.profiles.length,3);assert.notEqual(original.activeProfileId,optimized.activeProfileId);
  assert.equal(profileSamples([...all,...optimized.samples],base.activeProfileId).length,1);
  assert.equal(profileSamples([...all,...optimized.samples],original.activeProfileId).length,2);
  assert.equal(profileSamples([...all,...optimized.samples],optimized.activeProfileId).length,2);
  assert.equal(base.samples.length,1);assert.equal(original.profiles.length,2);
});
test('only explicit merge combines variants and retains destination name',()=>{
  const base=restoreProfiles([sample]),plan=prepareLibraryImport(backup('Otra'),base.samples,base.profiles,base.activeProfileId,{merge:true,makeId});
  assert.equal(plan.profiles.length,1);assert.equal(plan.activeProfileId,base.activeProfileId);
  assert.equal(plan.profiles[0].name,'Mi biblioteca');assert.equal(profileSamples([...base.samples,...plan.samples],base.activeProfileId).length,3);
});
test('limits count samples and variants per profile and restoring trash affects its owner',()=>{
  const first=Array.from({length:1600},(_,i)=>({...sample,id:'p1-'+i,label:'g'+i,profileId:'one'}));
  const second=Array.from({length:1600},(_,i)=>({...sample,id:'p2-'+i,label:'g'+i,profileId:'two'}));
  assert.doesNotThrow(()=>validateSampleChanges(first,second));
  assert.throws(()=>validateSampleChanges([...first,...second],[{...sample,id:'extra',profileId:'two'}]),/1600/);
  const variants=Array.from({length:15},(_,i)=>({...sample,id:'v-'+i,profileId:'one'}));
  assert.doesNotThrow(()=>validateSampleChanges(variants,[{...sample,id:'other',profileId:'two'}]));
  assert.throws(()=>validateSampleChanges(variants,[{...sample,id:'extra',profileId:'one'}]),/15/);
  const trash={...sample,id:'retired',profileId:'two',deletedAt:1};
  assert.equal(profileSamples([...variants,trash],'one',{trash:true}).length,0);
  assert.equal(profileSamples([...variants,trash],'two',{trash:true}).length,1);
  assert.doesNotThrow(()=>validateSampleChanges([...variants,trash],[{...trash,deletedAt:null}]));
});
test('new profile import succeeds when existing profile is full; merge reports capacity without mutation',()=>{
  const full=Array.from({length:1600},(_,i)=>({...sample,id:'full-'+i,label:'g'+i,profileId:'full'})),profiles=[{id:'full',name:'Llena'}],b=backup('Nueva');
  assert.doesNotThrow(()=>prepareLibraryImport(b,full,profiles,'full',{makeId}));
  assert.throws(()=>prepareLibraryImport(b,full,profiles,'full',{merge:true,makeId}),/1600/);
  assert.equal(full.length,1600);assert.equal(profiles.length,1);assert.equal(b.samples.length,2);
});
test('backup permits punctuation and Unicode while discarding imported profile and source metadata',()=>{
  const b=validateBackup({type:'trazo-library',version:2,name:'Signos',samples:['¿','!','—','ñ'].map(label=>({...sample,label,profileId:'foreign',source:'https://invalid.example',preview:'javascript:bad'}))});
  assert.deepEqual(b.samples.map(s=>s.label),['¿','!','—','ñ']);
  assert.ok(b.samples.every(s=>s.profileId===undefined&&s.source===undefined&&s.preview===undefined&&s.baseline===.78));
});
test('drafts from the previous version retain text and interline spacing while adopting 5 mm grid',()=>{
  const draft=restoreDraft({text:'Prueba',leading:8,ruling:'grid'});
  assert.equal(draft.text,'Prueba');assert.equal(draft.leading,8);assert.equal(draft.gridMm,5);
  assert.equal(restoreDraft().leading,10);assert.equal(restoreDraft({gridMm:12}).gridMm,12);
});
test('5 mm grid is identical for 5, 8, 10 and 15 mm line spacing and stays within paper',()=>{
  const options={width:148,height:210,margin:18,ruling:'grid'},expected=paperGuides({...options,leading:5});
  for(const leading of [5,8,10,15])assert.deepEqual(paperGuides({...options,leading}),expected);
  const horizontal=expected.filter(g=>g.y1===g.y2),vertical=expected.filter(g=>g.x1===g.x2);
  assert.equal(horizontal[1].y1-horizontal[0].y1,5);assert.equal(vertical[1].x1-vertical[0].x1,5);
  assert.ok(expected.every(g=>g.x1>=18&&g.x2<=130&&g.y1>=18&&g.y2<=192));
  assert.deepEqual(paperGuides({...options,ruling:'none'}),[]);
  assert.equal(paperGuides({...options,ruling:'lines',leading:10})[1].y1,28);
});
