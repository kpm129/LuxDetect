import test from 'node:test';import assert from 'node:assert/strict';
import {relativeIndex,buildReading,classifyLightLevel} from '../src/lux.js';
const usable={issue:null,clippedFraction:0,brightness:.42};
const input={phase:'live',stats:usable,prediction:null,brightness:.42,frameAgeMs:0,recoveryCount:3};
test('relative brightness is labelled honestly without lux or light categories',()=>{
 const r=buildReading(input);assert.equal(relativeIndex(.42),42);assert.equal(r.value,42);
 assert.equal(r.label,'Relative brightness (uncalibrated)');assert.equal(r.unit,null);assert.equal(r.lightLevel,null);
});
test('raw unusable frame, stale stream and recovery suppress a smoothed reading',()=>{
 assert.equal(buildReading({...input,stats:{...usable,issue:'too-bright'}}).label,'Too bright – no reading');
 for(const change of [{phase:'stopped'},{frameAgeMs:1001},{recoveryCount:2},{stats:{issue:'too-dark'}}])assert.equal(buildReading({...input,...change}).value,null);
 assert.equal(buildReading({...input,frameAgeMs:1000}).value,42);
});
test('light category endpoints and out-of-range estimate labels',()=>{
 for(const [value,label] of [[0,'Dark'],[49.99,'Dark'],[50,'Overcast'],[5000,'Shade'],[15000,'Daylight'],[50000,'Daylight'],[50001,'Bright sky']])assert.equal(classifyLightLevel(value),label);
 assert.equal(classifyLightLevel(NaN),null);
 const calibrated=buildReading({...input,prediction:{lux:12480,inRange:true}});assert.equal(calibrated.label,'Estimated lux (calibrated)');assert.equal(calibrated.lightLevel,'Shade');
 const outside=buildReading({...input,prediction:{lux:75000,inRange:false}});assert.equal(outside.label,'Outside calibrated range');assert.equal(outside.lightLevel,null);assert.equal(outside.kind,'outside');
});
