import {config,MODES} from './config.js';
import {emptySavedState} from './storage.js';
import {SOURCES,validateSample} from './calibration.js';
export function initialState(){const saved=emptySavedState();return {...saved,phase:'stopped',mode:'diffuser',epoch:0,history:[],stats:null,recoveryCount:0,error:null,capture:null,undo:null,fitResults:{},clusterDismissed:{},captureError:null};}
const updateMode=(s,record)=>({...s,modes:{...s.modes,[s.mode]:record}});
export function reduceApp(s,a){
 switch(a.type){
 case 'start':return {...s,phase:'starting',epoch:s.epoch+1,error:null,history:[],stats:null,recoveryCount:0};
 case 'camera-ready':return {...s,phase:'live'};
 case 'camera-settings':{
  const m=s.modes[s.mode],previous=m.cameraSetup.cameraId;
  const setupMismatch=Boolean(previous&&a.cameraId&&previous!==a.cameraId);
  return {...(previous||!a.cameraId?s:updateMode(s,{...m,cameraSetup:{...m.cameraSetup,cameraId:a.cameraId}})),setupMismatch};
 }
 case 'camera-stopped':return {...s,phase:'stopped',epoch:s.epoch+1,history:[],stats:null,recoveryCount:0,capture:null};
 case 'camera-error':return {...s,phase:'error',error:a.message,epoch:s.epoch+1,history:[],stats:null,recoveryCount:0,capture:null};
 case 'mode-change':if(!MODES.includes(a.mode))return s;return {...s,mode:a.mode,preferences:{...s.preferences,lastMode:a.mode},epoch:s.epoch+1,history:[],stats:null,recoveryCount:0,capture:null,undo:null,captureError:null};
 case 'frame':{
  if(s.phase!=='live'||a.epoch!==s.epoch||a.stats.videoTime===s.stats?.videoTime)return s;
  const valid=!a.stats.issue&&Number.isFinite(a.stats.brightness);
  return {...s,stats:a.stats,recoveryCount:valid?s.recoveryCount+1:0,history:valid?[...s.history.filter(f=>a.stats.at-f.at<=config.smoothingMs),a.stats]:[],capture:s.capture?{...s.capture,frames:[...s.capture.frames,a.stats]}:null};
 }
 case 'sample-start':{
  const m=s.modes[s.mode];
  if(s.phase!=='live'||s.capture||!Number.isFinite(a.referenceLux)||a.referenceLux<=0||!SOURCES.includes(a.source)||m.draft.length>=config.maxSamples||s.setupMismatch)return s;
  return {...s,capture:{token:a.token,at:a.at,referenceLux:a.referenceLux,source:a.source,note:a.note??'',mode:s.mode,setupId:m.cameraSetup.setupId,frames:[]},captureError:null};
 }
 case 'sample-cancel':return {...s,capture:null};
 case 'sample-reject':if(s.capture?.token!==a.token)return s;return {...s,capture:null,captureError:a.message};
 case 'sample-complete':{
  if(s.capture?.token!==a.token||s.capture.mode!==s.mode)return s;
  if(!validateSample(a.sample)||a.sample.setupId!==s.capture.setupId||a.sample.referenceLux!==s.capture.referenceLux||a.sample.source!==s.capture.source)return {...s,capture:null,captureError:'Could not save that sample. Try again.'};
  return {...updateMode(s,{...s.modes[s.mode],draft:[...s.modes[s.mode].draft,a.sample]}),capture:null,captureError:null,fitResults:{...s.fitResults,[s.mode]:null},clusterDismissed:{...s.clusterDismissed,[s.mode]:false}};
 }
 case 'sample-delete':{
  if(s.capture)return s;const m=s.modes[s.mode],index=m.draft.findIndex(x=>x.id===a.id);if(index<0)return s;
  return {...updateMode(s,{...m,draft:m.draft.filter(x=>x.id!==a.id)}),undo:{sample:m.draft[index],index,mode:s.mode},fitResults:{...s.fitResults,[s.mode]:null},clusterDismissed:{...s.clusterDismissed,[s.mode]:false}};
 }
 case 'sample-undo':{
  if(!s.undo||s.undo.mode!==s.mode||s.capture||s.modes[s.mode].draft.length>=config.maxSamples)return s;
  const draft=[...s.modes[s.mode].draft];draft.splice(s.undo.index,0,s.undo.sample);
  return {...updateMode(s,{...s.modes[s.mode],draft}),undo:null,fitResults:{...s.fitResults,[s.mode]:null},clusterDismissed:{...s.clusterDismissed,[s.mode]:false}};
 }
 case 'calibration-check-result':return {...(a.result.ok?updateMode(s,{...s.modes[s.mode],active:a.result.model}):s),undo:a.result.ok?null:s.undo,fitResults:{...s.fitResults,[s.mode]:a.result},clusterDismissed:{...s.clusterDismissed,[s.mode]:false}};
 case 'setup-reset-confirmed':return {...updateMode(s,{...s.modes[s.mode],draft:[],cameraSetup:{setupId:a.setupId,cameraId:a.cameraId??null}}),capture:null,undo:null,setupMismatch:false,fitResults:{...s.fitResults,[s.mode]:null}};
 case 'dismiss-cluster':return {...s,clusterDismissed:{...s.clusterDismissed,[s.mode]:true}};
 case 'leave-calibration':return {...s,undo:null};
 case 'preferences-change':return {...s,preferences:{...s.preferences,...a.preferences}};
 case 'load-saved':return {...s,...a.savedState,mode:a.savedState.preferences.lastMode,phase:'stopped',capture:null};
 default:return s;
 }
}
