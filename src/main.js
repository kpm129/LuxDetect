import './styles.css';
import {config} from './config.js';
import {measureFrame} from './luminance.js';
import {initialState,reduceApp} from './state.js';
import {createCameraController} from './camera.js';
import {buildReading} from './lux.js';
import {fitPowerCalibration,predictLux,summarizeCapture} from './calibration.js';
import {loadState,saveState} from './storage.js';
import {mountApp,renderApp,mountCalibration,renderCalibration,escapeHtml,dateLabel} from './ui.js';

const root=document.querySelector('#app');mountApp(root);mountCalibration(root);
let storage;try{storage=window.localStorage;}catch{}
const loaded=loadState(storage);
let state=reduceApp(initialState(),{type:'load-saved',savedState:loaded.savedState});
let storageWarning=loaded.warning,captureTimer=null,rearVerified=false;
for(const mode of ['diffuser','no-diffuser'])if(!state.modes[mode].draft.length&&!state.modes[mode].active)state.modes[mode].cameraSetup.setupId=crypto.randomUUID();
document.documentElement.dataset.theme=state.preferences.theme;
root.querySelector('#theme').checked=state.preferences.theme==='dark';
root.querySelector('#guide').hidden=state.preferences.guideSeen;
const video=root.querySelector('video');
const camera=createCameraController({video,mediaDevices:navigator.mediaDevices,onState:status=>{
 if(typeof status==='object')dispatch({type:'camera-error',message:status.message});
 else if(status==='starting'){rearVerified=false;dispatch({type:'start'});}
 else if(status==='live'){dispatch({type:'camera-ready'});checkCameraSetup();}
 else if(status==='stopped')dispatch({type:'camera-stopped'});
 },onFrame:frame=>dispatch({type:'frame',epoch:state.epoch,stats:measureFrame({...frame,mode:state.mode})})});
const persisted=new Set(['sample-complete','sample-delete','sample-undo','calibration-check-result','setup-reset-confirmed','preferences-change','mode-change','camera-settings']);
function persist(){const result=saveState(storage,state);storageWarning=result.ok?null:result.reason;}
function dispatch(action){state=reduceApp(state,action);if(!state.capture&&captureTimer){clearTimeout(captureTimer);captureTimer=null;}if(persisted.has(action.type))persist();paint();}
function checkCameraSetup(){dispatch({type:'camera-settings',cameraId:camera.getDiagnostics().settings.deviceId??null});}
function activeModel(){const m=state.modes[state.mode];return !state.setupMismatch&&m.active?.setupId===m.cameraSetup.setupId?m.active:null;}
function paint(){
 const brightness=state.history.length?state.history.reduce((sum,f)=>sum+f.brightness,0)/state.history.length:null;
 const model=activeModel(),prediction=brightness?predictLux(model,brightness):null;
 const reading=buildReading({phase:state.phase,stats:state.stats,prediction,brightness,frameAgeMs:performance.now()-(state.stats?.at??0),recoveryCount:state.recoveryCount});
 renderApp(root,{...state,reading},{start,toggle:()=>state.phase==='live'||state.phase==='starting'?camera.stop():start()});
 renderCalibration(root,{...state,now:performance.now()},{save:saveSample,delete:id=>dispatch({type:'sample-delete',id}),undo:()=>dispatch({type:'sample-undo'}),check:checkFit,reset:resetSetup});
 const quality=root.querySelector('#quality-line');
 quality.innerHTML=model?`<span class="badge ${model.quality==='Fair'?'fair':''}">${model.quality}</span><span>${escapeHtml(dateLabel(model.calibratedAt))} · ${model.samples.every(s=>s.source==='lux-meter')?'Lux meter':model.samples.some(s=>s.source==='lux-meter')?'Mixed references':'Rough reference'}</span>`:'<span>No valid calibration for this mode/setup</span>';
 const notices=[];
 if(storageWarning)notices.push(storageWarning);
 if(state.setupMismatch)notices.push('The rear camera changed. Start a new setup before calibration.');
 if(model&&state.fitResults[state.mode]?.ok===false)notices.push('Using previous calibration from '+dateLabel(model.calibratedAt)+'. The new attempt did not replace it.');
 if(reading.kind==='outside')notices.push(`Beyond your tested range (${model.luxRange.map(n=>Math.round(n).toLocaleString()).join('–')} lx). This extrapolated estimate is unverified. Add a reference sample in this light.`);
 root.querySelector('#reading-notices').innerHTML=notices.map(n=>`<p class="notice neutral">${escapeHtml(n)}</p>`).join('');
}
function start(){root.querySelector('#guide').hidden=true;dispatch({type:'preferences-change',preferences:{guideSeen:true}});camera.start();}
function saveSample(){
 const settings=camera.getDiagnostics().settings;
 if(!settings.facingMode&&!rearVerified){if(!confirm('Please check the preview: is this the rear camera, facing the sky?'))return;rearVerified=true;}
 if(!settings.deviceId&&!confirm('Use the same rear lens and diffuser as your other samples. Continue?'))return;
 const referenceLux=Number(root.querySelector('#reference-lux').value),source=root.querySelector('#reference-source').value,note=root.querySelector('#sample-note').value;
 const token=crypto.randomUUID();dispatch({type:'sample-start',token,referenceLux,source,note,at:performance.now()});
 if(state.capture?.token!==token)return;
 captureTimer=setTimeout(()=>{
  captureTimer=null;const capture=state.capture;if(capture?.token!==token)return;
  const result=summarizeCapture(capture.frames,{startedAt:capture.at,endedAt:capture.at+config.captureMs});
  if(!result.ok){dispatch({type:'sample-reject',token,message:result.reason.message});return;}
  const sample={...result.statistics,id:crypto.randomUUID(),processingVersion:1,mode:capture.mode,setupId:capture.setupId,referenceLux:capture.referenceLux,source:capture.source,note:capture.note,createdAt:new Date().toISOString()};
  dispatch({type:'sample-complete',token,sample});
 },config.captureMs);
}
function checkFit(){dispatch({type:'calibration-check-result',result:fitPowerCalibration(state.modes[state.mode].draft,{mode:state.mode,calibratedAt:new Date().toISOString()})});}
function resetSetup(){if(confirm('Start a new setup? This replaces this mode’s editable samples. Export a backup first if you need them. The old calibration is kept but will not be used for the changed setup.'))dispatch({type:'setup-reset-confirmed',setupId:crypto.randomUUID(),cameraId:camera.getDiagnostics().settings.deviceId??null});}
root.querySelector('#guide-link').onclick=()=>{root.querySelector('#guide').hidden=false;root.querySelector('#guide').scrollIntoView({behavior:'smooth'});};
root.querySelector('#close-guide').onclick=()=>{root.querySelector('#guide').hidden=true;dispatch({type:'preferences-change',preferences:{guideSeen:true}});};
root.querySelector('#theme').onchange=e=>{const theme=e.target.checked?'dark':'light';document.documentElement.dataset.theme=theme;dispatch({type:'preferences-change',preferences:{theme}});};
for(const radio of root.querySelectorAll('[name=mode]'))radio.onchange=e=>{if(state.phase==='starting')camera.stop();dispatch({type:'mode-change',mode:e.target.value});if(state.phase==='live')checkCameraSetup();};
window.addEventListener('hashchange',()=>{if(location.hash!=='#calibration')dispatch({type:'leave-calibration'});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)camera.stop();});
window.addEventListener('pagehide',()=>camera.stop());
setInterval(paint,250);paint();
