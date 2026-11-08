import {config as defaults,MODES} from './config.js';

export function cropForMode(width,height,mode,config=defaults){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!MODES.includes(mode)) throw new Error('Invalid video dimensions or mode.');
  const w=Math.min(width,Math.max(1,Math.floor(width*config.crops[mode])));
  const h=Math.min(height,Math.max(1,Math.floor(height*config.crops[mode])));
  return {x:Math.floor((width-w)/2),y:Math.floor((height-h)/2),width:w,height:h};
}
export const srgbToLinear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
const linear=Array.from({length:256},(_,n)=>srgbToLinear(n/255));

/** Pure measurement. Percentages always use the entire crop before exclusion. */
export function measureFrame({rgba,width,height,mode,at,videoTime},config=defaults){
  const crop=cropForMode(width,height,mode,config);
  if(!rgba||rgba.length!==width*height*4) throw new Error('Incomplete video frame.');
  let clipped=0,black=0,usable=0,sum=0;
  for(let y=crop.y;y<crop.y+crop.height;y++) for(let x=crop.x;x<crop.x+crop.width;x++){
    const i=(y*width+x)*4,r=rgba[i],g=rgba[i+1],b=rgba[i+2];
    if(Math.max(r,g,b)>=config.clippedChannel){clipped++;continue;}
    if(Math.max(r,g,b)<=config.blackChannel){black++;continue;}
    sum+=.2126*linear[r]+.7152*linear[g]+.0722*linear[b];usable++;
  }
  const total=crop.width*crop.height;
  const clippedFraction=clipped/total,nearBlackFraction=black/total,usableFraction=usable/total;
  const issue=clippedFraction>config.clipLimit?'too-bright':nearBlackFraction>config.blackLimit?'too-dark':usableFraction<config.minUsable||usable===0?'unusable':null;
  return {at,videoTime,videoWidth:width,videoHeight:height,crop,clippedFraction,nearBlackFraction,usableFraction,brightness:issue?null:sum/usable,issue};
}
