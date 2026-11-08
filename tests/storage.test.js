import test from 'node:test';import assert from 'node:assert/strict';
import {loadState,saveState,emptySavedState} from '../src/storage.js';
import {fitPowerCalibration} from '../src/calibration.js';
import {perfectSamples} from './helpers.js';
export function memory(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
function saved(){const s=emptySavedState();s.modes.diffuser.draft=perfectSamples();s.modes.diffuser.active=fitPowerCalibration(perfectSamples(),{mode:'diffuser',calibratedAt:'2026-11-08T00:00:00.000Z'}).model;s.modes.diffuser.cameraSetup.setupId='setup-1';return s;}
test('storage roundtrip refits coefficient fields, keeps independent modes and active date',()=>{
 const store=memory(),s=saved();s.modes.diffuser.active.a=999;assert.equal(saveState(store,s).ok,true);
 const loaded=loadState(store);assert.equal(loaded.warning,null);assert.ok(Math.abs(loaded.savedState.modes.diffuser.active.a-100000)<1e-6);
 assert.equal(loaded.savedState.modes.diffuser.active.calibratedAt,'2026-11-08T00:00:00.000Z');assert.equal(loaded.savedState.modes['no-diffuser'].active,null);
});
test('malformed, unsupported and blocked storage recover honestly',()=>{
 const store=memory();store.setItem('luxdetect:v1','broken');assert.ok(loadState(store).warning);
 store.setItem('luxdetect:v1',JSON.stringify({...saved(),schemaVersion:2}));assert.ok(loadState(store).warning);
 assert.equal(saveState({setItem(){throw new Error('quota');}},saved()).ok,false);
 assert.ok(loadState({getItem(){throw new Error('blocked');}}).warning);
});
