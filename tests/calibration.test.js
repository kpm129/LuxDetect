import test from 'node:test';import assert from 'node:assert/strict';
import {fitPowerCalibration,predictLux,summarizeCapture,classifyResidual,qualityForFit,validateSample} from '../src/calibration.js';
import {makeSample,perfectSamples,makeFrames} from './helpers.js';
const options={mode:'diffuser',calibratedAt:'2026-11-08T00:00:00.000Z'};
const fit=s=>fitPowerCalibration(s,options);
const has=(r,code)=>!r.ok&&r.reasons.some(e=>e.code===code);
test('constant-frame floating point average remains within measured extrema and can be saved',()=>{
 const r=summarizeCapture(makeFrames(Array(20).fill(.21586050011389926)),{startedAt:0,endedAt:2000});
 assert.equal(r.ok,true);assert.equal(validateSample(makeSample(r.statistics)),true);
});
test('perfect power data, immutable sample snapshot and bounded prediction',()=>{
 const samples=perfectSamples(),r=fit(samples);assert.equal(r.ok,true);
 assert.ok(Math.abs(r.model.a-100000)<1e-6);assert.ok(Math.abs(r.model.b-2)<1e-12);assert.equal(r.model.quality,'Good');
 assert.deepEqual(r.model.luxRange,[10,48999.99999999999]);assert.equal(predictLux(r.model,.01).inRange,true);
 assert.equal(predictLux(r.model,.7).inRange,true);assert.equal(predictLux(r.model,.9).inRange,false);
 samples[0].referenceLux=999;assert.equal(r.model.samples[0].referenceLux,10);
 assert.equal(predictLux({...r.model,type:'unknown'},.2),null);assert.equal(predictLux(r.model,NaN),null);
});
test('deterministic noisy data fits; quality endpoints and rough caps',()=>{
 const s=perfectSamples().map((s,i)=>({...s,referenceLux:s.referenceLux*[1,1.1,.9,1.05,1][i]}));assert.equal(fit(s).ok,true);
 assert.equal(qualityForFit(.9,['lux-meter']),'Good');assert.equal(qualityForFit(.8999,['lux-meter']),'Fair');assert.equal(qualityForFit(.8,['lux-meter']),'Fair');assert.equal(qualityForFit(.7999,['lux-meter']),null);
 for(const source of ['phone-light-sensor','other'])assert.equal(fit(perfectSamples().map(s=>({...s,source}))).model.quality,'Fair');
});
test('reject too few samples and reference lux span below exactly 10x',()=>{
 assert.ok(has(fit(perfectSamples().slice(0,3)),'too-few'));
 const s=[.1,.15,.2,.3].map(brightness=>makeSample({brightness}));assert.ok(has(fit(s),'reference-span'));
 const b=Math.log(10)/Math.log(3),r=fit(s.map(s=>({...s,referenceLux:100*(s.brightness/.1)**b})));
 assert.equal(has(r,'reference-span'),false);
});
test('calibration brightness span uses ratio 1.5, with 1.10x anchored groups',()=>{
 const xs=[.2,.22,.25,.3],b=Math.log(10)/Math.log(1.5);
 const sampleSet=xs.map(brightness=>makeSample({brightness,referenceLux:100*(brightness/.2)**b}));
 assert.equal(has(fit(sampleSet),'brightness-span'),false);assert.equal(has(fit(sampleSet),'brightness-groups'),false);
 assert.ok(has(fit(sampleSet.map((s,i)=>i===3?{...s,brightness:.299}:s)),'brightness-span'));
 assert.ok(has(fit(sampleSet.map((s,i)=>i===1?{...s,brightness:.2199,minBrightness:.2177,maxBrightness:.222}:s)),'brightness-groups'));
 const flat=fit(perfectSamples().map(s=>({...s,brightness:.4,minBrightness:.399,maxBrightness:.401})));
 assert.ok(flat.reasons.some(r=>r.message==='Samples too similar – camera may be flattening brightness.'));
});
test('negative/zero slope, reversals, noise and a single outlier cannot hide behind regression',()=>{
 assert.ok(has(fit(perfectSamples().map(s=>({...s,referenceLux:1/s.brightness}))),'bad-fit'));
 const reversal=perfectSamples();reversal[2].referenceLux=50000;assert.ok(has(fit(reversal),'reversal'));
 const outlier=perfectSamples();outlier[2].referenceLux*=100;assert.equal(fit(outlier).ok,false);
 const noisy=[.2,.22,.25,.3].map(brightness=>makeSample({brightness,sd:.03,referenceLux:100*(brightness/.2)**6}));assert.ok(has(fit(noisy),'brightness-noise'));
});
for(const [value,expected] of [[.2,'none'],[.20001,'check-sample'],[.3,'check-sample'],[.30001,'fail']])test('residual '+value+' is '+expected,()=>assert.equal(classifyResidual(value),expected));
for(const patch of [{brightness:0},{brightness:NaN},{referenceLux:-1},{source:'fake'},{processingVersion:2},{mode:'no-diffuser'},{frameCount:2},{setupId:'other-setup'}])test('invalid record rejected '+JSON.stringify(patch),()=>{
 const s=perfectSamples();s[2]={...s[2],...patch};assert.equal(fit(s).ok,false);
});
test('capture stable window, contamination and completeness',()=>{
 const capture=frames=>summarizeCapture(frames,{startedAt:0,endedAt:2000});
 assert.equal(capture(makeFrames()).ok,true);assert.equal(capture(makeFrames()).statistics.frameCount,20);
 const varying=makeFrames([.19,.21,...Array(18).fill(.2)]);assert.equal(capture(varying).ok,true);
 varying[0].brightness=.189;assert.equal(capture(varying).reason.message,'Light changed while sampling. Try again.');
 const clipped=makeFrames();clipped[10].issue='too-bright';clipped[10].clippedFraction=.26;assert.equal(capture(clipped).ok,false);
 assert.equal(capture(makeFrames().slice(0,9)).ok,false);assert.equal(capture(makeFrames().map(f=>({...f,videoTime:0}))).ok,false);
 assert.equal(capture(makeFrames().map((f,i)=>({...f,at:i<10?f.at:f.at+500}))).ok,false);
});
