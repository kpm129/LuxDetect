import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,reduceApp} from '../src/state.js';
test('mode change clears history, does not start camera and rejects stale epochs',()=>{
 const s=initialState(),m=reduceApp({...s,history:[{at:0,brightness:.5}],stats:{}},{type:'mode-change',mode:'no-diffuser'});
 assert.equal(m.mode,'no-diffuser');assert.equal(m.phase,'stopped');assert.deepEqual(m.history,[]);assert.equal(m.stats,null);
 assert.equal(reduceApp(m,{type:'frame',epoch:s.epoch,stats:{at:1,brightness:.5,issue:null}}),m);
});
test('only live distinct frames count, smoothing resets on invalid data',()=>{
 let s=reduceApp(initialState(),{type:'start'});s=reduceApp(s,{type:'camera-ready'});
 for(let i=0;i<3;i++)s=reduceApp(s,{type:'frame',epoch:s.epoch,stats:{at:i*100,videoTime:i/10,brightness:.5,issue:null}});
 assert.equal(s.recoveryCount,3);assert.equal(s.history.length,3);
 const duplicate=reduceApp(s,{type:'frame',epoch:s.epoch,stats:{...s.stats}});assert.equal(duplicate,s);
 s=reduceApp(s,{type:'frame',epoch:s.epoch,stats:{at:400,videoTime:.4,issue:'too-bright'}});assert.equal(s.recoveryCount,0);assert.equal(s.history.length,0);
});
