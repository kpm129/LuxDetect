/** Camera adapter. Generation checks prevent late permission/play callbacks reviving a stopped camera. */
export function createCameraController({video,mediaDevices,onFrame,onState,now=()=>performance.now(),readFrame}){
 let generation=0,stream=null,handle=null,lastTime=-1,lastObserved=-1,lastAt=-Infinity,canvas,context,observed=[],disposers=[];
 const emit=phase=>onState(phase);
 function stop(){
  generation++;
  disposers.forEach(dispose=>dispose());disposers=[];
  if(handle!==null){if(video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(handle);else clearTimeout(handle);handle=null;}
  stream?.getTracks().forEach(t=>t.stop());stream=null;
  video.pause();video.srcObject=null;lastTime=-1;observed=[];emit('stopped');
 }
 function schedule(token){
  if(token!==generation||!stream)return;
  const tick=(at,metadata)=>{
   if(token!==generation||!stream)return;
   const time=metadata?.mediaTime??video.currentTime;
   if(time!==lastTime&&video.videoWidth&&video.videoHeight){
    if(time!==lastObserved){observed.push(at);observed=observed.filter(t=>at-t<=1000);lastObserved=time;}
    if(at-lastAt>=99){
     lastAt=at;lastTime=time;
     try{
      let frame;
      if(readFrame)frame=readFrame();else{
       canvas??=document.createElement('canvas');context??=canvas.getContext('2d',{willReadFrequently:true});
       if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}
       context.drawImage(video,0,0);frame={rgba:context.getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height};
      }
      onFrame({...frame,at,videoTime:time});
     }catch(error){stop();emit({phase:'error',message:'Could not read the camera. Tap Start to try again.'});return;}
    }
   }
   schedule(token);
  };
  handle=video.requestVideoFrameCallback?video.requestVideoFrameCallback(tick):setTimeout(()=>tick(now()),50);
 }
 async function start(){
  stop();const token=generation;emit('starting');
  if(!mediaDevices?.getUserMedia){emit({phase:'error',message:'Camera access needs HTTPS and a supported browser.'});return;}
  try{
   const next=await mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   if(token!==generation){next.getTracks().forEach(t=>t.stop());return;}
   stream=next;
   if(stream.getVideoTracks()[0]?.getSettings?.().facingMode==='user')throw new Error('rear-required');
   video.muted=true;video.autoplay=true;video.playsInline=true;
   video.setAttribute('playsinline','');video.setAttribute('muted','');video.setAttribute('autoplay','');
   video.srcObject=stream;await video.play();
   if(token!==generation)return;
   const interrupted=()=>{if(token!==generation)return;stop();emit({phase:'error',message:'Camera was interrupted. Tap Start camera to try again.'});};
   const listen=(target,event)=>{target?.addEventListener?.(event,interrupted);disposers.push(()=>target?.removeEventListener?.(event,interrupted));};
   for(const event of ['ended','mute'])listen(stream.getVideoTracks()[0],event);
   for(const event of ['pause','error','stalled','waiting'])listen(video,event);
   lastAt=-Infinity;lastTime=-1;lastObserved=-1;emit('live');schedule(token);
  }catch(error){if(token!==generation)return;stop();emit({phase:'error',message:error.message==='rear-required'?'The rear camera is required. Please select the rear camera and try again.':error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in Safari settings, then try again.':error.name==='NotFoundError'?'No camera was found on this device.':'Camera unavailable or in use. Close other camera apps and try again.'});}
 }
 function getDiagnostics(){const track=stream?.getVideoTracks()[0];return {settings:track?.getSettings?.()??{},capabilities:track?.getCapabilities?.()??{},observedVideoFps:observed.length>1?(observed.length-1)*1000/(observed.at(-1)-observed[0]):null};}
 return {start,stop,getDiagnostics};
}
