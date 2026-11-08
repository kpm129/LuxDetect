import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,reduceApp} from '../src/state.js';
import {makeSample,perfectSamples} from './helpers.js';
import {fitPowerCalibration} from '../src/calibration.js';
test('mode change clears history, does not start camera and rejects stale epochs',()=>{
 const s=initialState(),m=reduceApp({...s,history:[{at:0,brightness:.5}],stats:{}},{type:'mode-change',mode:'no-diffuser'});
 assert.equal(m.mode,'no-diffuser');assert.equal(m.phase,'stopped');assert.deepEqual(m.history,[]);assert.equal(m.stats,null);
 assert.equal(reduceApp(m,{type:'frame',epoch:s.epoch,stats:{at:1,brightness:.5,issue:null}}),m);
});
test('failed fit preserves prior active model; deleting/undoing only changes draft',()=>{
 let s=initialState();const samples=perfectSamples(),active=fitPowerCalibration(samples,{mode:'diffuser',calibratedAt:'2026-11-08'}).model;
 s={...s,modes:{...s.modes,diffuser:{...s.modes.diffuser,draft:samples,active}}};
 const failed=reduceApp(s,{type:'calibration-check-result',result:{ok:false,reasons:[{code:'bad-fit',message:'failed'}],flags:[]}});
 assert.deepEqual(failed.modes.diffuser.active,active);
 const deleted=reduceApp(failed,{type:'sample-delete',id:samples[2].id});assert.equal(deleted.modes.diffuser.draft.length,4);assert.equal(deleted.modes.diffuser.active.samples.length,5);
 const restored=reduceApp(deleted,{type:'sample-undo'});assert.deepEqual(restored.modes.diffuser.draft,samples);
});
test('capture is frozen and late completion after mode switch cannot add a sample',()=>{
 let s=reduceApp(initialState(),{type:'camera-ready'});
 s=reduceApp(s,{type:'sample-start',token:'a',referenceLux:123,source:'lux-meter',at:0});assert.equal(s.capture.referenceLux,123);
 s=reduceApp(s,{type:'mode-change',mode:'no-diffuser'});assert.equal(s.capture,null);
 s=reduceApp(s,{type:'sample-complete',token:'a',sample:makeSample()});assert.equal(s.modes.diffuser.draft.length,0);
 assert.equal(reduceApp(initialState(),{type:'sample-start',token:'a',referenceLux:-1,source:'lux-meter',at:0}).capture,null);
});
test('setup change preserves old snapshot but never mixes setup samples; Undo expires',()=>{
 let s=initialState();s=reduceApp(s,{type:'setup-reset-confirmed',setupId:'new',cameraId:'new-camera'});
 assert.equal(s.modes.diffuser.cameraSetup.setupId,'new');assert.deepEqual(s.modes.diffuser.draft,[]);
 s=reduceApp(s,{type:'mode-change',mode:'no-diffuser'});assert.equal(s.undo,null);
});
test('known rear camera identity change blocks capture until explicit new setup',()=>{
 let s=reduceApp(initialState(),{type:'camera-settings',cameraId:'lens-a'});
 s=reduceApp(s,{type:'camera-ready'});s=reduceApp(s,{type:'camera-settings',cameraId:'lens-b'});
 assert.equal(s.setupMismatch,true);
 assert.equal(reduceApp(s,{type:'sample-start',token:'x',referenceLux:50,source:'lux-meter',at:0}).capture,null);
});
test('only live distinct frames count, smoothing resets on invalid data',()=>{
 let s=reduceApp(initialState(),{type:'start'});s=reduceApp(s,{type:'camera-ready'});
 for(let i=0;i<3;i++)s=reduceApp(s,{type:'frame',epoch:s.epoch,stats:{at:i*100,videoTime:i/10,brightness:.5,issue:null}});
 assert.equal(s.recoveryCount,3);assert.equal(s.history.length,3);
 const duplicate=reduceApp(s,{type:'frame',epoch:s.epoch,stats:{...s.stats}});assert.equal(duplicate,s);
 s=reduceApp(s,{type:'frame',epoch:s.epoch,stats:{at:400,videoTime:.4,issue:'too-bright'}});assert.equal(s.recoveryCount,0);assert.equal(s.history.length,0);
});
