import test from 'node:test';
import assert from 'node:assert/strict';
import {planBundledLetters} from '../web/bundled.mjs';
const sample={label:'a',paths:[[[0,0],[300,0],[300,400]]],advance:400};
const bundle={version:1,profiles:[{id:'personal-uniforme-v1',name:'Mi letra Uniforme',samples:[sample]}]};
const current={samples:[{...sample,id:'old',profileId:'mine'}],profiles:[{id:'mine',name:'Mía'}],activeProfileId:'mine'};
test('bundled personal letter is usable on first launch, retaining old samples and selection only changes once',()=>{
 const old=structuredClone(current),first=planBundledLetters(bundle,current);assert.deepEqual(current,old);assert.equal(first.samples.length,2);assert.equal(first.activeProfileId,'personal-uniforme-v1');
 const next=planBundledLetters(bundle,{...first,activeProfileId:'mine'},first.installed);assert.equal(next.samples.length,2);assert.equal(next.added.length,0);assert.equal(next.activeProfileId,'mine');
});
test('bundled upgrade never restores removed samples or overwrites user-edited personal profile',()=>{
 const first=planBundledLetters(bundle,current);first.samples.at(-1).deletedAt=123;first.profiles.at(-1).name='Editada';
 const next=planBundledLetters(bundle,first,[]);assert.equal(next.samples.at(-1).deletedAt,123);assert.equal(next.profiles.at(-1).name,'Editada');assert.equal(next.added.length,0);
});
test('malformed bundle fails before mutation',()=>{const before=structuredClone(current);assert.throws(()=>planBundledLetters({...bundle,profiles:[{...bundle.profiles[0],samples:[{...sample,advance:0}]}]},current));assert.deepEqual(current,before);});
