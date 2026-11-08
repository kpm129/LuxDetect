import {config} from './config.js';
export function appendHistory(history,frame,{windowMs=config.historyMs,maxPoints=config.maxHistory}={}){
 if(!Number.isFinite(frame.at)||frame.at<history.at(-1)?.at||frame.videoTime===history.at(-1)?.videoTime)return history;
 return [...history.filter(f=>frame.at-f.at<=windowMs),{at:frame.at,videoTime:frame.videoTime,brightness:frame.issue?null:frame.brightness}].slice(-maxPoints);
}
export function formatCapabilities(capabilities={},settings={}){
 return Object.fromEntries(['exposureTime','iso','aperture','exposureMode'].map(key=>[key,{status:settings[key]!=null?'available':Object.hasOwn(capabilities,key)?'unavailable':'unsupported',value:settings[key]??null}]));
}
export function buildDebugInfo({history,stats,model,draft,cameraDiagnostics={},mode}){
 const settings=cameraDiagnostics.settings??{},recent=history.filter(f=>history.at(-1).at-f.at<=1000);
 return {mode,method:'power-v1 (calibrated brightness only)',brightness:stats?.brightness??null,clippedPercent:stats?stats.clippedFraction*100:null,nearBlackPercent:stats?stats.nearBlackFraction*100:null,usablePercent:stats?stats.usableFraction*100:null,
 video:{width:settings.width??null,height:settings.height??null,observedFps:cameraDiagnostics.observedVideoFps??null,processedFps:recent.length>1?(recent.length-1)*1000/(recent.at(-1).at-recent[0].at):null,measurementArea:stats?.crop??null},
 fit:model?{a:model.a,b:model.b,r2:model.r2,quality:model.quality,range:model.luxRange,sampleCount:model.sampleCount}:null,
 capabilities:formatCapabilities(cameraDiagnostics.capabilities,settings),metadataNote:'Exposure metadata is diagnostic only. Units are browser-defined; no exposure formula is used.',
 samples:draft.map(s=>({referenceLux:s.referenceLux,brightness:s.brightness,source:s.source})),history};
}
export async function copyDebugInfo(info,writeText){
 const text=JSON.stringify(info,null,2);try{await writeText(text);return {ok:true,text};}catch{return {ok:false,text};}
}
