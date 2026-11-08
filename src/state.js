import {config,MODES} from './config.js';
export function initialState(){return {phase:'stopped',mode:'diffuser',epoch:0,history:[],stats:null,recoveryCount:0,error:null};}
export function reduceApp(s,a){
 switch(a.type){
 case 'start':return {...s,phase:'starting',epoch:s.epoch+1,error:null,history:[],stats:null,recoveryCount:0};
 case 'camera-ready':return {...s,phase:'live'};
 case 'camera-stopped':return {...s,phase:'stopped',epoch:s.epoch+1,history:[],stats:null,recoveryCount:0};
 case 'camera-error':return {...s,phase:'error',error:a.message,epoch:s.epoch+1,history:[],stats:null,recoveryCount:0};
 case 'mode-change':if(!MODES.includes(a.mode))return s;return {...s,mode:a.mode,epoch:s.epoch+1,history:[],stats:null,recoveryCount:0};
 case 'frame':{
  if(s.phase!=='live'||a.epoch!==s.epoch||a.stats.videoTime===s.stats?.videoTime)return s;
  const valid=!a.stats.issue&&Number.isFinite(a.stats.brightness);
  return {...s,stats:a.stats,recoveryCount:valid?s.recoveryCount+1:0,history:valid?[...s.history.filter(f=>a.stats.at-f.at<=config.smoothingMs),a.stats]:[]};
 }
 default:return s;
 }
}
