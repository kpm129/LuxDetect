import test from 'node:test';import assert from 'node:assert/strict';
import {appendHistory,buildDebugInfo,formatCapabilities,copyDebugInfo} from '../src/debug.js';
test('history bounded by 10 seconds and 100 distinct observations; bad frames are gaps',()=>{
 let h=[];for(let i=0;i<150;i++)h=appendHistory(h,{at:i*100,videoTime:i/10,brightness:.2,issue:i===149?'too-bright':null});
 assert.equal(h.length,100);assert.equal(h.at(-1).brightness,null);assert.ok(h.every(f=>14900-f.at<=10000));
 assert.equal(appendHistory(h,{at:15000,videoTime:14.9,brightness:.2}),h);
});
test('diagnostics omit imagery/private IDs and distinguish capabilities from available settings',()=>{
 const info=buildDebugInfo({history:[],stats:null,model:null,draft:[],mode:'diffuser',cameraDiagnostics:{settings:{deviceId:'private-unique',width:1280,height:720,frameRate:30},capabilities:{exposureTime:{min:1,max:10}},observedVideoFps:null}});
 assert.equal(JSON.stringify(info).includes('private-unique'),false);assert.equal(info.video.observedFps,null);
 const c=formatCapabilities({exposureTime:{}},{exposureTime:5});assert.equal(c.exposureTime.status,'available');assert.equal(c.iso.status,'unsupported');
 assert.equal(formatCapabilities({exposureTime:{}},{}).exposureTime.status,'unavailable');
});
test('clipboard rejection offers selectable text instead of success',async()=>{
 const r=await copyDebugInfo({brightness:.2},async()=>{throw new Error('denied');});assert.equal(r.ok,false);assert.ok(r.text.includes('brightness'));
 assert.equal((await copyDebugInfo({},async()=>{})).ok,true);
});
