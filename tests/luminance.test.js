import test from 'node:test';
import assert from 'node:assert/strict';
import { cropForMode, srgbToLinear, measureFrame } from '../src/luminance.js';
import { config } from '../src/config.js';

function image(values, mode='diffuser') {
  const rgba=new Uint8ClampedArray(values.flatMap(v=>[...v,255]));
  // 100% crop only in tests, isolating pixel math from crop geometry.
  return measureFrame({rgba,width:values.length,height:1,mode,at:0,videoTime:0},
    {...config,crops:{diffuser:1,'no-diffuser':1}});
}
test('mode crops use decoded resolution, including odd/small dimensions',()=>{
  assert.deepEqual(cropForMode(1280,720,'diffuser',config),{x:384,y:216,width:512,height:288});
  assert.deepEqual(cropForMode(1280,720,'no-diffuser',config),{x:480,y:270,width:320,height:180});
  for(const [w,h] of [[641,479],[1,1]]) {
    const c=cropForMode(w,h,'diffuser',config);
    assert.ok(c.width>=1&&c.height>=1&&c.x>=0&&c.y>=0&&c.x+c.width<=w&&c.y+c.height<=h);
  }
  assert.throws(()=>cropForMode(0,20,'diffuser',config));
  assert.throws(()=>cropForMode(20,20,'unknown',config));
});
test('standard sRGB conversion before luminance averaging',()=>{
  assert.equal(srgbToLinear(0),0); assert.equal(srgbToLinear(1),1);
  assert.ok(Math.abs(srgbToLinear(.5)-.21404114048223255)<1e-12);
  assert.ok(Math.abs(image([[128,128,128]]).brightness-srgbToLinear(128/255))<1e-12);
});
test('drop clipped and black pixels but count them in the full crop',()=>{
  const s=image([[250,60,60],[5,5,5],[128,128,128],[128,128,128]]);
  assert.equal(s.clippedFraction,.25);assert.equal(s.nearBlackFraction,.25);assert.equal(s.usableFraction,.5);
  assert.equal(s.issue,null);assert.ok(Math.abs(s.brightness-srgbToLinear(128/255))<1e-12);
});
test('clipping takes priority; no division by zero or manufactured brightness',()=>{
  assert.equal(image([[250,0,0]]).issue,'too-bright');
  assert.equal(image([[5,5,5]]).issue,'too-dark');
  assert.equal(image([[250,250,250],[128,128,128]]).brightness,null);
  assert.equal(image([[249,249,249]]).issue,null);
  assert.equal(image([[6,6,6]]).issue,null);
  assert.throws(()=>measureFrame({rgba:new Uint8ClampedArray(1),width:10,height:10,mode:'diffuser'},config));
});
