import test from 'node:test';import assert from 'node:assert/strict';
import {loadState,saveState,emptySavedState,exportCalibration,prepareImport,applyImport} from '../src/storage.js';
import {fitPowerCalibration} from '../src/calibration.js';
import {perfectSamples} from './helpers.js';
export function memory(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
function saved(){const s=emptySavedState();s.modes.diffuser.draft=perfectSamples();s.modes.diffuser.active=fitPowerCalibration(perfectSamples(),{mode:'diffuser',calibratedAt:'2026-11-08T00:00:00.000Z'}).model;s.modes.diffuser.cameraSetup.setupId='setup-1';return s;}
test('storage roundtrip refits coefficient fields, keeps independent modes and active date',()=>{
 const store=memory(),s=saved();s.modes.diffuser.active.a=999;assert.equal(saveState(store,s).ok,true);
 const loaded=loadState(store);assert.equal(loaded.warning,null);assert.ok(Math.abs(loaded.savedState.modes.diffuser.active.a-100000)<1e-6);
 assert.equal(loaded.savedState.modes.diffuser.active.calibratedAt,'2026-11-08T00:00:00.000Z');assert.equal(loaded.savedState.modes['no-diffuser'].active,null);
});
test('portable roundtrip preserves sources, refits models and excludes private camera IDs',()=>{
 const s=saved();s.modes.diffuser.cameraSetup.cameraId='private-camera-unique';const json=exportCalibration(s);
 assert.equal(json.includes('private-camera-unique'),false);
 const data=JSON.parse(json);data.modes.diffuser.active.a=999;data.modes.diffuser.active.quality='Fake';
 const prepared=prepareImport(JSON.stringify(data));assert.equal(prepared.ok,true);
 assert.ok(Math.abs(prepared.proposal.modes.diffuser.active.a-100000)<1e-6);
 assert.equal(prepared.proposal.modes.diffuser.active.samples[0].source,'lux-meter');
 const result=applyImport(emptySavedState(),prepared.proposal);assert.equal(result.modes.diffuser.active.quality,'Good');
});
test('imports reject unknown versions, malformed/oversized and invalid active snapshots atomically',()=>{
 for(const mutate of [d=>{d.schemaVersion=2;},d=>{d.modes.diffuser.active.type='exposure-v1';},d=>{d.modes.diffuser.active.samples[0].source='fake';},d=>{delete d.modes.diffuser.active.samples[0].sd;},d=>{d.modes.diffuser.active.samples[0].referenceLux=0;}]){
  const original=saved(),before=structuredClone(original),data=JSON.parse(exportCalibration(original));mutate(data);
  assert.equal(prepareImport(JSON.stringify(data)).ok,false);assert.deepEqual(original,before);
 }
 assert.equal(prepareImport('{').ok,false);
 assert.equal(prepareImport(' '.repeat(1048577)).ok,false);
 const data=JSON.parse(exportCalibration(saved()));data.modes.diffuser.draft=Array.from({length:201},(_,i)=>({...data.modes.diffuser.draft[0],id:'x'+i}));
 assert.equal(prepareImport(JSON.stringify(data)).ok,false);
});
test('partial mode import leaves unrelated mode intact and preview is non-mutating',()=>{
 const original=saved(),before=structuredClone(original),data=JSON.parse(exportCalibration(emptySavedState()));delete data.modes.diffuser;
 const prepared=prepareImport(JSON.stringify(data));assert.equal(prepared.ok,true);assert.deepEqual(original,before);
 const after=applyImport(original,prepared.proposal);assert.deepEqual(after.modes.diffuser,original.modes.diffuser);
 assert.deepEqual(original,before);
});
test('malformed, unsupported and blocked storage recover honestly',()=>{
 const store=memory();store.setItem('luxdetect:v1','broken');assert.ok(loadState(store).warning);
 store.setItem('luxdetect:v1',JSON.stringify({...saved(),schemaVersion:2}));assert.ok(loadState(store).warning);
 assert.equal(saveState({setItem(){throw new Error('quota');}},saved()).ok,false);
 assert.ok(loadState({getItem(){throw new Error('blocked');}}).warning);
});
