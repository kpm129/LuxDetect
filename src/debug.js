import {config} from './config.js';
export function appendHistory(history,frame,{windowMs=config.historyMs,maxPoints=config.maxHistory}={}){
 if(!Number.isFinite(frame.at)||frame.at<history.at(-1)?.at||frame.videoTime===history.at(-1)?.videoTime)return history;
 const gap=history.length&&frame.at-history.at(-1).at>config.maxGapMs?{at:history.at(-1).at+1,videoTime:null,brightness:null}:null;
 return [...history,...(gap?[gap]:[]),{at:frame.at,videoTime:frame.videoTime,brightness:frame.issue?null:frame.brightness}].filter(f=>frame.at-f.at<=windowMs).slice(-maxPoints);
}
export function formatCapabilities(capabilities={},settings={}){
 return Object.fromEntries(['exposureTime','iso','aperture','exposureMode'].map(key=>[key,{status:settings[key]!=null?'available':Object.hasOwn(capabilities,key)?'unavailable':'unsupported',value:settings[key]??null}]));
}
export function buildDebugInfo({history,stats,model,draft,cameraDiagnostics={},mode,now=stats?.at??history.at(-1)?.at??0}){
 const settings=cameraDiagnostics.settings??{},visible=history.filter(f=>now-f.at<=config.historyMs),recent=visible.filter(f=>now-f.at<=1000&&f.videoTime!==null);
 const lastAt=stats?.at??history.at(-1)?.at,frameAgeMs=Number.isFinite(lastAt)?Math.max(0,now-lastAt):null,stale=frameAgeMs>config.staleMs;
 return {mode,now,frameAgeMs,method:'power-v1 (calibrated brightness only)',brightness:stale?null:stats?.brightness??null,clippedPercent:stats?stats.clippedFraction*100:null,nearBlackPercent:stats?stats.nearBlackFraction*100:null,usablePercent:stats?stats.usableFraction*100:null,
 video:{width:settings.width??null,height:settings.height??null,observedFps:stale?0:cameraDiagnostics.observedVideoFps??null,processedFps:stale?0:recent.length>1?(recent.length-1)*1000/(recent.at(-1).at-recent[0].at):null,measurementArea:stats?.crop??null},
 fit:model?{a:model.a,b:model.b,r2:model.r2,quality:model.quality,range:model.luxRange,sampleCount:model.sampleCount}:null,
 capabilities:formatCapabilities(cameraDiagnostics.capabilities,settings),metadataNote:'Exposure metadata is diagnostic only. Units are browser-defined; no exposure formula is used.',
 samples:draft.map(s=>({referenceLux:s.referenceLux,brightness:s.brightness,source:s.source})),history:visible};
}
export async function copyDebugInfo(info,writeText){
 const text=JSON.stringify(info,null,2);try{await writeText(text);return {ok:true,text};}catch{return {ok:false,text};}
}
