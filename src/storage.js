import {config as defaults,MODES} from './config.js';
import {validateSample,fitPowerCalibration} from './calibration.js';
export const STORAGE_KEY='luxdetect:v1';
export function emptySavedState(){return {schemaVersion:1,processingVersion:1,preferences:{theme:'light',lastMode:'diffuser',guideSeen:false},modes:Object.fromEntries(MODES.map(mode=>[mode,{draft:[],active:null,cameraSetup:{setupId:mode+'-setup',cameraId:null}}]))};}
const validDate=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const sampleFields=['id','mode','setupId','processingVersion','referenceLux','source','note','createdAt','brightness','sd','minBrightness','maxBrightness','frameCount','spanMs','maxGapMs','worstClippedFraction','worstNearBlackFraction','minUsableFraction'];
function cleanSamples(samples,mode,config){
 if(!Array.isArray(samples)||samples.length>config.maxSamples)throw new Error('A sample collection is missing or exceeds 200 samples.');
 const cleaned=samples.map(s=>{
  if(!validateSample(s,config)||s.mode!==mode||!validDate(s.createdAt)||typeof s.note!=='string')throw new Error('A sample has invalid values or missing capture statistics.');
  return Object.fromEntries(sampleFields.map(k=>[k,s[k]]));
 });
 if(new Set(cleaned.map(s=>s.id)).size!==cleaned.length)throw new Error('Sample identifiers must be unique.');
 return cleaned;
}
function cleanMode(record,mode,config){
 if(!record||typeof record!=='object')throw new Error('Invalid mode record.');
 const draft=cleanSamples(record.draft,mode,config);let active=null;
 if(record.active){
  if(record.active.type!=='power-v1'||record.active.processingVersion!==1||record.active.mode!==mode||!validDate(record.active.calibratedAt))throw new Error('Unsupported or invalid calibration version.');
  const samples=cleanSamples(record.active.samples,mode,config),fit=fitPowerCalibration(samples,{mode,calibratedAt:record.active.calibratedAt,config});
  if(!fit.ok)throw new Error('An active calibration failed validation: '+fit.reasons.map(r=>r.message).join(' '));
  active=fit.model;
 }
 const setupId=record.cameraSetup?.setupId??active?.setupId??draft[0]?.setupId??mode+'-setup';
 if(typeof setupId!=='string'||!setupId)throw new Error('Missing setup identifier.');
 return {draft,active,cameraSetup:{setupId,cameraId:typeof record.cameraSetup?.cameraId==='string'?record.cameraSetup.cameraId:null}};
}
function cleanDocument(data,config=defaults,{partial=false}={}){
 if(!data||data.schemaVersion!==config.schemaVersion||data.processingVersion!==config.processingVersion||!data.modes||typeof data.modes!=='object')throw new Error('Unsupported file version. Version 1 is required; migrations are not supported.');
 const modes={};
 if(Object.keys(data.modes).some(k=>!MODES.includes(k)))throw new Error('Unknown sky mode.');
 for(const mode of MODES){
  if(Object.hasOwn(data.modes,mode))modes[mode]=cleanMode(data.modes[mode],mode,config);
  else if(!partial)throw new Error('A sky mode is missing.');
 }
 if(!Object.keys(modes).length)throw new Error('No calibration modes were found.');
 const pref=data.preferences;
 return {schemaVersion:1,processingVersion:1,preferences:{theme:pref?.theme==='dark'?'dark':'light',lastMode:MODES.includes(pref?.lastMode)?pref.lastMode:'diffuser',guideSeen:pref?.guideSeen===true},modes};
}
export function loadState(storage,config=defaults){
 try{const raw=storage.getItem(STORAGE_KEY);return {savedState:raw?cleanDocument(JSON.parse(raw),config):emptySavedState(),warning:null};}
 catch{return {savedState:emptySavedState(),warning:'Saved calibration could not be read. It was not used. Import a compatible backup or recalibrate.'};}
}
export function saveState(storage,savedState){
 try{const {schemaVersion,processingVersion,preferences,modes}=savedState;storage.setItem(STORAGE_KEY,JSON.stringify({schemaVersion,processingVersion,preferences,modes}));return {ok:true,reason:null};}
 catch{return {ok:false,reason:'Calibration could not be saved on this device. Export a backup before closing.'};}
}
