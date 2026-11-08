import {config} from './config.js';
export const relativeIndex=b=>Math.round(Math.min(1,Math.max(0,b))*100);
export function buildReading({phase,stats,prediction,brightness,frameAgeMs,recoveryCount}){
 const empty=label=>({kind:'empty',value:null,label,unit:null,lightLevel:null});
 if(phase!=='live')return empty(phase==='starting'?'Opening camera…':'Camera is off');
 if(!stats||frameAgeMs>config.staleMs)return empty('Waiting for a fresh camera frame…');
 if(stats.issue)return empty(stats.issue==='too-bright'?'Too bright – no reading':stats.issue==='too-dark'?'Too dark – no reading':'Image unusable – no reading');
 if(recoveryCount<config.recoveryFrames||!Number.isFinite(brightness))return empty('Hold steady…');
 return {kind:'relative',value:relativeIndex(brightness),label:'Relative brightness (uncalibrated)',unit:null,lightLevel:null};
}
