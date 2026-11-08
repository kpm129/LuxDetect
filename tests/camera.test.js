import test from 'node:test';import assert from 'node:assert/strict';
import {createCameraController} from '../src/camera.js';
function fixture({facing='environment',deferred=false}={}){
 let resolve,callback,requests=0,stops=0,options;const states=[],frames=[];
 const track={stop(){stops++;},getSettings:()=>({facingMode:facing,width:1280,height:720}),getCapabilities:()=>({}),addEventListener(){}};
 const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
 const video={currentTime:0,videoWidth:1280,videoHeight:720,setAttribute(){},play:async()=>{},pause(){},requestVideoFrameCallback(fn){callback=fn;return 1;},cancelVideoFrameCallback(){},srcObject:null};
 const mediaDevices={getUserMedia(opts){requests++;options=opts;return deferred?new Promise(r=>resolve=r):Promise.resolve(stream);}};
 const controller=createCameraController({video,mediaDevices,onFrame:f=>frames.push(f),onState:s=>states.push(s),now:()=>0,readFrame:()=>({rgba:new Uint8ClampedArray(4),width:1,height:1})});
 return {controller,video,states,frames,stream,resolve:()=>resolve(stream),fire:(at,time)=>callback(at,{mediaTime:time}),requests:()=>requests,stops:()=>stops,options:()=>options};
}
test('tap starts rear camera without audio; stop releases tracks',async()=>{
 const f=fixture();assert.equal(f.requests(),0);await f.controller.start();
 assert.equal(f.requests(),1);assert.equal(f.options().audio,false);assert.equal(f.options().video.facingMode.ideal,'environment');
 assert.equal(f.video.muted,true);assert.equal(f.video.playsInline,true);f.controller.stop();assert.equal(f.stops(),1);assert.equal(f.video.srcObject,null);
});
test('late permission after Stop is released and never attached',async()=>{
 const f=fixture({deferred:true});const pending=f.controller.start();f.controller.stop();f.resolve();await pending;
 assert.equal(f.stops(),1);assert.equal(f.video.srcObject,null);assert.equal(f.states.includes('live'),false);
});
test('front-camera fallback is rejected',async()=>{
 const f=fixture({facing:'user'});await f.controller.start();assert.equal(f.stops(),1);assert.equal(f.video.srcObject,null);assert.equal(f.states.at(-1).phase,'error');
});
test('duplicate decoded frames and post-stop callbacks cannot update output',async()=>{
 const f=fixture();await f.controller.start();f.fire(100,.1);f.fire(200,.1);f.fire(300,.3);
 assert.equal(f.frames.length,2);f.controller.stop();f.fire(400,.4);assert.equal(f.frames.length,2);
});
