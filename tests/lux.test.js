import test from 'node:test';import assert from 'node:assert/strict';
import {relativeIndex,buildReading} from '../src/lux.js';
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
