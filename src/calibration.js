import {config as defaults,MODES} from './config.js';
export const SOURCES=['lux-meter','phone-light-sensor','other'];
const positive=n=>Number.isFinite(n)&&n>0;
const fraction=n=>Number.isFinite(n)&&n>=0&&n<=1;
const reason=(code,message)=>({code,message});
const cluster=code=>reason(code,'Samples too similar – camera may be flattening brightness.');
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const tolerance=1e-12;
export function classifyResidual(residual){return residual>.3?'fail':residual>.2?'check-sample':'none';}
export function qualityForFit(r2,sources,config=defaults){
 if(!Number.isFinite(r2)||r2<config.minR2)return null;
 return r2>=config.goodR2&&sources.includes('lux-meter')?'Good':'Fair';
}
export function validateSample(s,config=defaults){
 if(!s||!MODES.includes(s.mode)||s.processingVersion!==config.processingVersion||!SOURCES.includes(s.source)||typeof s.id!=='string'||!s.id||typeof s.setupId!=='string'||!s.setupId||!positive(s.referenceLux)||!positive(s.brightness)||s.brightness>1)return false;
 if(![s.sd,s.minBrightness,s.maxBrightness,s.frameCount,s.spanMs,s.maxGapMs].every(Number.isFinite)||s.sd<0||s.minBrightness<=0||s.minBrightness>s.brightness||s.maxBrightness<s.brightness||s.maxBrightness>1)return false;
 return Number.isInteger(s.frameCount)&&s.frameCount>=config.minFrames&&s.spanMs>=config.minCaptureSpanMs&&s.spanMs<=config.captureMs&&s.maxGapMs>=0&&s.maxGapMs<=config.maxGapMs&&
 [s.worstClippedFraction,s.worstNearBlackFraction,s.minUsableFraction].every(fraction)&&s.worstClippedFraction<=config.clipLimit&&s.worstNearBlackFraction<=config.blackLimit&&s.minUsableFraction>=config.minUsable&&
 (s.maxBrightness-s.minBrightness)/s.brightness<=config.maxVariation+tolerance;
}
/** No clock reads: callers provide the completed window and monotonic times. */
export function summarizeCapture(frames,{startedAt,endedAt,config=defaults}){
 const fail=message=>({ok:false,reason:reason('capture',message)});
 if(!Number.isFinite(startedAt)||!Number.isFinite(endedAt)||endedAt-startedAt<config.captureMs)return fail('Could not capture two seconds of steady light. Try again.');
 const seen=new Set();const unique=frames.filter(f=>f.at>=startedAt&&f.at<=endedAt&&!seen.has(f.videoTime)&&seen.add(f.videoTime)).sort((a,b)=>a.at-b.at);
 if(unique.some(f=>f.issue||!positive(f.brightness)||f.brightness>1||!fraction(f.clippedFraction)||!fraction(f.nearBlackFraction)||!fraction(f.usableFraction)||f.clippedFraction>config.clipLimit||f.nearBlackFraction>config.blackLimit||f.usableFraction<config.minUsable))return fail('The image was too bright, too dark or unusable. Adjust the setup and try again.');
 const spanMs=unique.length?unique.at(-1).at-unique[0].at:0;
 const maxGapMs=Math.max(0,...unique.slice(1).map((f,i)=>f.at-unique[i].at));
 if(unique.length<config.minFrames||spanMs<config.minCaptureSpanMs||maxGapMs>config.maxGapMs)return fail('Could not capture a steady camera reading. Hold still and try again.');
 const values=unique.map(f=>f.brightness),brightness=mean(values),minBrightness=Math.min(...values),maxBrightness=Math.max(...values);
 if((maxBrightness-minBrightness)/brightness>config.maxVariation+tolerance)return fail('Light changed while sampling. Try again.');
 return {ok:true,statistics:{brightness,minBrightness,maxBrightness,sd:Math.sqrt(values.reduce((sum,x)=>sum+(x-brightness)**2,0)/(values.length-1)),frameCount:unique.length,spanMs,maxGapMs,
 worstClippedFraction:Math.max(...unique.map(f=>f.clippedFraction)),worstNearBlackFraction:Math.max(...unique.map(f=>f.nearBlackFraction)),minUsableFraction:Math.min(...unique.map(f=>f.usableFraction))}};
}
export function fitPowerCalibration(samples,{mode,calibratedAt,config=defaults}){
 const reasons=[],flags=[];const fail=()=>({ok:false,reasons,flags});
 if(!Array.isArray(samples)||samples.length<config.minSamples){reasons.push(reason('too-few','Add at least four usable samples.'));return fail();}
 if(samples.length>config.maxSamples||!MODES.includes(mode)||samples.some(s=>!validateSample(s,config)||s.mode!==mode)||new Set(samples.map(s=>s.id)).size!==samples.length||new Set(samples.map(s=>s.setupId)).size!==1){reasons.push(reason('invalid-input','Some samples are invalid or belong to a different setup. Check them and try again.'));return fail();}
 const brightnesses=samples.map(s=>s.brightness),luxes=samples.map(s=>s.referenceLux);
 const min=Math.min(...brightnesses),max=Math.max(...brightnesses),luxMin=Math.min(...luxes),luxMax=Math.max(...luxes);
 if(luxMax/luxMin<config.minLuxSpan-tolerance)reasons.push(reason('reference-span','Your reference readings need a range of at least 10×. Add darker and brighter light.'));
 if(max/min<config.minBrightnessRatio-tolerance)reasons.push(cluster('brightness-span'));
 const ordered=[...samples].sort((a,b)=>a.brightness-b.brightness);let groups=1,anchor=ordered[0].brightness;
 for(const s of ordered.slice(1))if(s.brightness>=anchor*config.groupRatio-tolerance){groups++;anchor=s.brightness;}
 if(groups<config.minSamples)reasons.push(cluster('brightness-groups'));
 if(max-min<=config.noiseMultiplier*Math.hypot(ordered[0].sd,ordered.at(-1).sd))reasons.push(cluster('brightness-noise'));
 const byLux=[...samples].sort((a,b)=>a.referenceLux-b.referenceLux);
 if(byLux.slice(1).some((s,i)=>s.referenceLux>byLux[i].referenceLux&&s.brightness<byLux[i].brightness*(1-config.reversalTolerance)-tolerance))reasons.push(reason('reversal','A brighter reference gave a lower camera reading. Check these samples.'));
 const x=brightnesses.map(Math.log10),y=luxes.map(Math.log10),mx=mean(x),my=mean(y),xx=x.reduce((sum,v)=>sum+(v-mx)**2,0),yy=y.reduce((sum,v)=>sum+(v-my)**2,0);
 const b=x.reduce((sum,v,i)=>sum+(v-mx)*(y[i]-my),0)/xx,A=my-b*mx,a=10**A;
 const residuals=x.map((v,i)=>Math.abs(y[i]-(A+b*v))),r2=1-residuals.reduce((sum,r)=>sum+r*r,0)/yy;
 if(!positive(a)||!positive(b)||!Number.isFinite(r2)||xx===0||yy===0||r2<config.minR2)reasons.push(reason('bad-fit','The curve does not match these samples well enough. Check the readings and add more light levels.'));
 residuals.forEach((residual,i)=>{if(residual>config.flagResidual)flags.push({sampleId:samples[i].id,code:'check-sample',residual});});
 if(residuals.some(r=>r>config.failResidual))reasons.push(reason('outlier','One sample does not match the curve. Check this sample and take another reading.'));
 if(reasons.length)return fail();
 return {ok:true,model:{type:'power-v1',processingVersion:config.processingVersion,mode,setupId:samples[0].setupId,a,b,r2,quality:qualityForFit(r2,samples.map(s=>s.source),config),luxRange:[luxMin,luxMax],brightnessRange:[min,max],sampleCount:samples.length,samples:structuredClone(samples),flags,calibratedAt}};
}
export function predictLux(model,brightness,config=defaults){
 if(!model||model.type!=='power-v1'||model.processingVersion!==config.processingVersion||!positive(model.a)||!positive(model.b)||!positive(brightness)||brightness>1||![model.luxRange,model.brightnessRange].every(r=>Array.isArray(r)&&r.length===2&&r.every(positive)&&r[0]<=r[1]))return null;
 const lux=model.a*brightness**model.b;if(!positive(lux))return null;
 const inside=(n,[min,max])=>n>=min-config.rangeTolerance*Math.max(1,Math.abs(min))&&n<=max+config.rangeTolerance*Math.max(1,Math.abs(max));
 return {lux,inRange:inside(lux,model.luxRange)&&inside(brightness,model.brightnessRange)};
}
