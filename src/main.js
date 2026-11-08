import './styles.css';
import {measureFrame} from './luminance.js';
import {initialState,reduceApp} from './state.js';
import {createCameraController} from './camera.js';
import {buildReading} from './lux.js';
import {mountApp,renderApp} from './ui.js';
const root=document.querySelector('#app');mountApp(root);
let state=initialState();
const video=root.querySelector('video');
const camera=createCameraController({video,mediaDevices:navigator.mediaDevices,onState:status=>{
 if(typeof status==='object')dispatch({type:'camera-error',message:status.message});
 else if(status==='starting')dispatch({type:'start'});
 else if(status==='live')dispatch({type:'camera-ready'});
 else if(status==='stopped')dispatch({type:'camera-stopped'});
 },onFrame:frame=>dispatch({type:'frame',epoch:state.epoch,stats:measureFrame({...frame,mode:state.mode})})});
function dispatch(action){state=reduceApp(state,action);paint();}
function paint(){const brightness=state.history.length?state.history.reduce((sum,f)=>sum+f.brightness,0)/state.history.length:null;
 const reading=buildReading({phase:state.phase,stats:state.stats,prediction:null,brightness,frameAgeMs:performance.now()-(state.stats?.at??0),recoveryCount:state.recoveryCount});
 renderApp(root,{...state,reading},{start,toggle:()=>state.phase==='live'||state.phase==='starting'?camera.stop():start()});}
function start(){root.querySelector('#guide').hidden=true;camera.start();}
root.querySelector('#guide-link').onclick=()=>{root.querySelector('#guide').hidden=false;root.querySelector('#guide').scrollIntoView({behavior:'smooth'});};
root.querySelector('#close-guide').onclick=()=>root.querySelector('#guide').hidden=true;
root.querySelector('#theme').onchange=e=>document.documentElement.dataset.theme=e.target.checked?'dark':'light';
for(const radio of root.querySelectorAll('[name=mode]'))radio.onchange=e=>{if(state.phase==='starting')camera.stop();dispatch({type:'mode-change',mode:e.target.value});};
document.addEventListener('visibilitychange',()=>{if(document.hidden)camera.stop();});
window.addEventListener('pagehide',()=>camera.stop());
setInterval(paint,250);paint();
