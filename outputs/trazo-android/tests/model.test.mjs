import test from 'node:test';import assert from 'node:assert/strict';
import {validateBackup,normaliseLabel,collectGroups,validateSampleChanges} from '../web/model.mjs';
import {coverage} from '../web/core.mjs';
const sample={id:'test-a',label:'a',paths:[[[0,0],[500,0],[250,600]]],advance:600,baseline:.78,quality:{warnings:[],contrast:200,inkFraction:.2}};
test('backup retains real shapes while ignoring untrusted image preview',()=>{const b=validateBackup({type:'trazo-library',version:2,name:'Mía',samples:[{...sample,preview:'javascript:bad'}]});assert.deepEqual(b.samples[0].paths,sample.paths);assert.equal(b.samples[0].preview,undefined);});
test('backup refuses non-finite coordinates and unsafe labels',()=>{assert.throws(()=>validateBackup({type:'trazo-library',version:2,samples:[{...sample,paths:[[[0,0],[Infinity,2],[2,0]]]}]}));assert.throws(()=>normaliseLabel('__proto__'));});
test('a foreign JSON never clears an existing library',()=>{assert.throws(()=>validateBackup({samples:[]}));assert.throws(()=>validateBackup({type:'trazo-library',version:2,samples:[]}));});
test('backup rejects advances below one without mutating its input',()=>{
  const input={type:'trazo-library',version:2,samples:[{...structuredClone(sample),advance:.5}]},before=structuredClone(input);
  assert.throws(()=>validateBackup(input),/Ancho/);
  assert.deepEqual(input,before);
});
test('backup accepts both advance boundaries and the engine consumes them',()=>{
  for(const advance of [1,15000]){const b=validateBackup({type:'trazo-library',version:2,samples:[{...sample,advance}]});assert.equal(b.samples[0].advance,advance);assert.doesNotThrow(()=>coverage(b.samples));}
  assert.throws(()=>validateBackup({type:'trazo-library',version:2,samples:[{...sample,advance:15000.1}]}),/Ancho/);
});
test('groups preserve variants and exclude trash',()=>{const g=collectGroups([sample,{...sample,id:'second'},{...sample,id:'trash',deletedAt:1}]);assert.equal(g.length,1);assert.equal(g[0].samples.length,2);});
test('labels normalise combined accents and allow actual cursive words',()=>{assert.equal(normaliseLabel('n\u0303'),'ñ');assert.equal(normaliseLabel('que'),'que');assert.throws(()=>normaliseLabel('demasiadolargoparaunaligadura'));});
const library=(count,offset=0)=>Array.from({length:count},(_,i)=>({...sample,id:'sample-'+(offset+i),label:'g'+(offset+i)}));
test('backups at 1600 samples remain usable by the engine and 1601 are refused',()=>{
  const backup=validateBackup({type:'trazo-library',version:2,samples:library(1600)});
  assert.equal(backup.samples.length,1600);assert.doesNotThrow(()=>coverage(backup.samples));
  assert.throws(()=>validateBackup({type:'trazo-library',version:2,samples:library(1601)}),/1600/);
});
test('combined imports and captures stop at 1600 active samples without changing data',()=>{
  const current=library(1599),incoming=library(1,1599);
  assert.doesNotThrow(()=>validateSampleChanges(current,incoming));
  assert.throws(()=>validateSampleChanges([...current,...incoming],library(1,1600)),/1600/);
  assert.equal(current.length,1599);assert.equal(incoming.length,1);
});
test('trash does not use active capacity and restoring a sample checks the combined limit',()=>{
  const current=library(1600),trash=library(20,1600).map(s=>({...s,deletedAt:123}));
  assert.doesNotThrow(()=>validateSampleChanges([...current,...trash],[]));
  assert.throws(()=>validateSampleChanges([...current,...trash],[{...trash[0],deletedAt:null}]),/1600/);
  assert.doesNotThrow(()=>validateSampleChanges([...current.slice(1),...trash],[{...trash[0],deletedAt:null}]));
  assert.equal(trash[0].deletedAt,123);
});
test('combining or restoring samples also enforces 15 variants of each label',()=>{
  const current=library(15).map(s=>({...s,label:'a'})),newSample={...sample,id:'new-a'};
  assert.doesNotThrow(()=>validateSampleChanges(current.slice(1),[newSample]));
  assert.throws(()=>validateSampleChanges(current,[newSample]),/15/);
  const retired={...newSample,deletedAt:123};
  assert.throws(()=>validateSampleChanges([...current,retired],[{...retired,deletedAt:null}]),/15/);
});
