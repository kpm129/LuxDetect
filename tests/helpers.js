export function makeSample(overrides={}){
 const brightness=overrides.brightness??.2;
 return {id:'sample-'+brightness,mode:'diffuser',setupId:'setup-1',processingVersion:1,
 referenceLux:100000*brightness**2,source:'lux-meter',note:'',createdAt:'2026-11-08T00:00:00.000Z',
 brightness,sd:.00001,minBrightness:brightness*.99,maxBrightness:brightness*1.01,
 frameCount:20,spanMs:1900,maxGapMs:100,worstClippedFraction:0,worstNearBlackFraction:0,minUsableFraction:1,...overrides};
}
export const perfectSamples=()=>[.01,.05,.2,.4,.7].map(brightness=>makeSample({brightness}));
export function makeFrames(values=Array(20).fill(.2),options={}){
 return values.map((brightness,i)=>({at:i*100,videoTime:i*.1,brightness,issue:null,clippedFraction:0,nearBlackFraction:0,usableFraction:1,...options}));
}
