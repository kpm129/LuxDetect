export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountApp(root){
 root.innerHTML=`<header class="app-header"><a class="brand" href="#reading">LuxDetect<span class="brand-dot"></span></a><label class="theme-toggle"><input id="theme" type="checkbox"> Dark</label></header>
 <nav class="tabs"><a href="#reading">Reading</a><a href="#calibration" id="calibration-nav" hidden>Calibration</a><button type="button" id="guide-link">Setup guide</button></nav>
 <section id="guide" class="guide"><div class="section-head"><h1>A little setup.<br>A better reading.</h1><button class="icon-button" id="close-guide" aria-label="Close setup guide">×</button></div><p class="muted">Sky mode · Approximate incident-light estimate</p>
 <svg class="setup-diagram" viewBox="0 0 320 175" role="img" aria-label="Side view of phone: rear lens and white dome diffuser face sky, screen faces down"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M45 15v35m-5-6 5 6 5-6M80 10v40m-5-6 5 6 5-6M115 15v35m-5-6 5 6 5-6" stroke="var(--accent)"/><path d="M35 100c0-50 90-50 90 0Z" fill="var(--soft)"/><rect x="30" y="105" width="260" height="20" rx="7" fill="var(--soft)"/><path d="M60 104v-6h35v6M60 128h200m-130-49 22-12h25m-42 74 20 14h30"/></g><g fill="currentColor" font-size="12" font-family="system-ui"><text x="180" y="71">White diffuser</text><text x="190" y="160">Screen down</text></g></svg>
 <ol class="setup-steps"><li><strong>Cover the rear camera.</strong><span>Secure translucent white tissue or a diffuser dome over the lens.</span></li><li><strong>Face straight up.</strong><span>Hold level with the screen down. Keep the sun out of frame.</span></li><li><strong>Start, then hold steady.</strong><span>Use the same lens, diffuser and angle for calibration and readings.</span></li></ol><p class="small muted">Without a diffuser, remove the cover and keep the same straight-up angle. Clouds and sun position affect readings. A homemade diffuser is approximate, not a certified lux-meter sensor.</p><button id="guide-start" class="primary">Start camera</button></section>
 <section id="reading" class="reading-panel"><div class="section-head"><h1>Sky reading</h1><span id="live-status" class="status">Camera off</span></div>
 <fieldset class="mode-control"><legend class="sr-only">Sky measurement mode</legend><label><input type="radio" name="mode" value="diffuser" checked><span>Sky + diffuser</span></label><label><input type="radio" name="mode" value="no-diffuser"><span>Sky – no diffuser</span></label></fieldset>
 <div class="reading"><div id="reading-value" class="reading-value">—</div><div id="reading-unit" class="reading-unit"></div><p id="reading-label" class="reading-label">Camera is off</p><p id="light-level" class="light-level" hidden></p></div>
 <div id="quality-line" class="quality-line"></div><div class="preview"><video id="camera-video" playsinline muted autoplay></video><div class="crop-overlay" id="crop-overlay"></div><span id="preview-caption">Rear camera · not started</span></div>
 <p class="notice" id="sun-warning">Keep sun out of frame. Hold the phone level, rear camera facing up.</p><div id="reading-notices"></div><p id="camera-error" class="notice failure" role="status" hidden></p>
 <button id="camera-toggle" class="primary">Start camera</button><a id="go-calibrate" class="secondary button" href="#calibration" hidden>Calibrate this mode</a><p class="footnote">Approximate readings · No photos are stored or uploaded</p><div id="debug-root"></div></section>
 <section id="calibration" class="calibration-panel" hidden></section><footer>Made for the open sky.<span>Local processing. Honest limits.</span></footer>`;
}
export function renderApp(root,state,handlers){
 const q=id=>root.querySelector('#'+id),r=state.reading;
 q('reading-value').textContent=r?.value==null?'—':(r.kind==='outside'?'~':'')+new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(r.value);
 q('reading-label').textContent=r?.label??'Camera is off';q('reading-unit').textContent=r?.kind==='relative'?'/ 100 · brightness index':r?.unit??'';
 q('light-level').textContent=r?.lightLevel??'';q('light-level').hidden=!r?.lightLevel;
 q('live-status').textContent=state.phase==='live'?'● Live':state.phase==='starting'?'Starting…':'Camera off';
 q('camera-toggle').textContent=state.phase==='live'||state.phase==='starting'?'Stop camera':'Start camera';
 q('camera-error').textContent=state.error??'';q('camera-error').hidden=!state.error;
 q('preview-caption').hidden=state.phase==='live';q('camera-video').classList.toggle('live',state.phase==='live');
 q('crop-overlay').style.setProperty('--crop',state.mode==='diffuser'?'40%':'25%');
 for(const radio of root.querySelectorAll('input[name=mode]'))radio.checked=radio.value===state.mode;
 q('camera-toggle').onclick=handlers.toggle;q('guide-start').onclick=handlers.start;
}

export function mountCalibration(root){
 root.querySelector('#calibration').hidden=false;root.querySelector('#calibration-nav').hidden=false;root.querySelector('#go-calibrate').hidden=false;
 root.querySelector('#calibration').innerHTML=`<div class="section-head"><h2>Calibration</h2><a href="#reading">Reading</a></div><p class="small muted" id="calibration-mode"></p><p class="small muted" style="margin-top:12px">Place your reference meter level beside the phone. Keep the same diffuser, lens and angle.</p>
 <form id="sample-form"><label class="field">Reference lux<input id="reference-lux" type="number" inputmode="decimal" min="0.000001" step="any" placeholder="e.g. 12500" required></label><label class="field">Reference source<select id="reference-source"><option value="lux-meter">Lux meter</option><option value="phone-light-sensor">Phone light sensor · rough reference</option><option value="other">Other · unverified reference</option></select></label><label class="field">Note <span class="muted">(optional)</span><input id="sample-note" type="text" maxlength="500" placeholder="e.g. open shade"></label><button id="save-sample" class="primary">Save sample</button></form>
 <p class="small muted" id="capture-hint">Start the camera to save a sample. Averages about two seconds after your tap.</p><div id="capture-status" role="status"></div><progress id="capture-progress" max="2000" value="0" hidden></progress><div id="capture-error" role="status"></div>
 <div class="section-head section"><h3>Your samples</h3><span id="sample-count" class="small muted"></span></div><ul class="sample-list" id="sample-list"></ul><div id="undo-notice"></div>
 <div class="section"><h3>Light range coverage</h3><div id="coverage"></div></div><button id="check-calibration" class="secondary" type="button">Check calibration</button><div id="fit-result" role="status"></div>
 <div class="paired"><button id="export-calibration" class="secondary" type="button" hidden>Export calibration JSON</button><button id="import-calibration" class="secondary" type="button" hidden>Import calibration JSON</button></div><div id="transfer-root"></div><button type="button" id="reset-setup" class="text-button">Changed diffuser or lens? Start a new setup</button><p class="small muted">A handheld lux meter is best. Phone ambient-light sensors are rough references; do not use a camera-based lux app.</p>`;
}
export const sourceLabel=s=>({'lux-meter':'Lux meter','phone-light-sensor':'Phone light sensor · rough reference',other:'Other · unverified reference'}[s]??'Unknown');
export const dateLabel=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Unknown date';};
export function renderCalibration(root,state,handlers){
 const q=id=>root.querySelector('#'+id),m=state.modes[state.mode],result=state.fitResults[state.mode];
 q('calibration-mode').textContent=state.mode==='diffuser'?'Sky + diffuser · Saved separately on this device':'Sky – no diffuser · Saved separately on this device';
 const busy=Boolean(state.capture);
 for(const field of q('sample-form').elements)field.disabled=busy;
 q('save-sample').disabled=busy||state.phase!=='live'||m.draft.length>=200||Boolean(state.setupMismatch);
 q('check-calibration').disabled=busy;q('reset-setup').disabled=busy;
 q('import-calibration').disabled=busy;q('export-calibration').disabled=busy;
 q('capture-status').textContent=busy?`Hold steady… ${Math.min(2,(state.now-state.capture.at)/1000).toFixed(1)} / 2 s`:'';
 q('capture-progress').hidden=!busy;q('capture-progress').value=busy?Math.min(2000,state.now-state.capture.at):0;
 q('capture-error').textContent=state.captureError??'';q('capture-error').className=state.captureError?'notice failure':'';
 q('capture-hint').textContent=state.setupMismatch?'The rear camera changed. Start a new setup before sampling.':m.draft.length>=200?'Sample list full. Export a backup or delete a sample.':state.phase==='live'?'Tap Save sample and hold steady for two seconds.':'Start the camera to save a sample.';
 const sampleKey=JSON.stringify([m.draft,result,busy,state.undo]);
 if(q('sample-list').dataset.key!==sampleKey){
  q('sample-list').dataset.key=sampleKey;
  const flags=result?.flags??result?.model?.flags??[];
  q('sample-list').innerHTML=m.draft.length?m.draft.map(s=>`<li><div><strong>${escapeHtml(new Intl.NumberFormat().format(s.referenceLux))} lx</strong><span>${escapeHtml(sourceLabel(s.source))}</span><span>Brightness ${s.brightness.toFixed(4)}${s.worstClippedFraction>.05?' · Near limit':''}</span>${s.note?`<span>${escapeHtml(s.note)}</span>`:''}${flags.some(f=>f.sampleId===s.id)?'<span class="sample-flag">check this sample</span>':''}</div><button type="button" class="delete" data-delete="${escapeHtml(s.id)}" ${busy?'disabled':''}>Delete</button></li>`).join(''):'<li class="muted small">No samples yet. Aim for dusk, shade, overcast and bright sky.</li>';
  q('sample-count').textContent=m.draft.length+' saved';
  q('undo-notice').innerHTML=state.undo?'<div class="notice neutral row"><span>Sample deleted.</span><button type="button" class="text-button" id="undo-sample">Undo</button></div>':'';
  q('undo-sample')?.addEventListener('click',handlers.undo);
  const bands=[['Dark',0,50],['Overcast',50,5000],['Shade',5000,15000],['Daylight',15000,50000],['Bright sky',50000,Infinity]];
  const covered=bands.map(([,min,max],i)=>m.draft.some(s=>s.referenceLux>=min&&(i===3?s.referenceLux<=max:i===4?s.referenceLux>min:s.referenceLux<max)));
  const lux=m.draft.map(s=>s.referenceLux),min=Math.min(...lux),max=Math.max(...lux);
  q('coverage').innerHTML=`<div class="coverage">${bands.map(([label],i)=>`<div><span class="coverage-cell ${covered[i]?'covered':''}" aria-label="${label}: ${covered[i]?'covered':'missing'}"></span><span>${label}</span></div>`).join('')}</div><p class="small muted">${lux.length?`${min.toLocaleString()}–${max.toLocaleString()} lx · ${(max/min).toFixed(1)}× span.`:'At least four samples over a 10× reference-lux span are required.'}</p><p class="small muted">${covered.every(Boolean)?'All light ranges have a sample.':'Missing: '+bands.filter((_,i)=>!covered[i]).map(b=>b[0]).join(', ')+'. Try dusk, heavy/light overcast, open shade or clear sky.'}</p>`;
  q('fit-result').innerHTML=!result?'':result.ok?`<div class="notice neutral"><span class="badge ${result.model.quality==='Fair'?'fair':''}">${result.model.quality}</span><h3>Calibration saved.</h3><p>${escapeHtml(dateLabel(result.model.calibratedAt))} · ${result.model.sampleCount} samples</p><dl class="stats"><div><dt>a</dt><dd>${result.model.a.toPrecision(5)}</dd></div><div><dt>b</dt><dd>${result.model.b.toFixed(4)}</dd></div><div><dt>R² · log scale</dt><dd>${result.model.r2.toFixed(4)}</dd></div><div><dt>Range (lx)</dt><dd>${result.model.luxRange.map(x=>Math.round(x).toLocaleString()).join('–')}</dd></div></dl>${result.model.flags.length?'<p>Some samples are flagged. Check the sample list.</p>':''}</div>`:`<div class="notice failure"><span class="badge failed">Failed attempt</span><ul>${result.reasons.map(r=>`<li>${escapeHtml(r.message)}</li>`).join('')}</ul><p>Keep useful samples, delete bad ones and add more. You do not need to start over.</p></div>`;
 }
 q('sample-form').onsubmit=e=>{e.preventDefault();handlers.save();};
 q('sample-list').onclick=e=>{const button=e.target.closest('[data-delete]');if(button)handlers.delete(button.dataset.delete);};
 q('check-calibration').onclick=handlers.check;q('reset-setup').onclick=handlers.reset;
}
export function renderImportPreview(root,prepared,handlers){
 const holder=root.querySelector('#transfer-root');
 holder.innerHTML=`<div class="notice neutral"><h3>Review imported calibration</h3><ul>${prepared.summary.map(s=>`<li><strong>${s.mode==='diffuser'?'Sky + diffuser':'Sky – no diffuser'}</strong><br>${s.quality??'No active calibration'} · ${s.sampleCount} editable samples${s.calibratedAt?' · '+escapeHtml(dateLabel(s.calibratedAt)):''}${s.range?'<br>'+s.range.map(x=>Math.round(x).toLocaleString()).join('–')+' lx':''}<br>${escapeHtml(s.sources.map(sourceLabel).join(', '))}</li>`).join('')}</ul><p>Only these modes will be replaced. Existing data stays unchanged until you confirm.</p><label class="confirm-setup"><input type="checkbox" id="confirm-import-setup"> I am using the same phone, rear lens and diffuser setup as these measurements.</label><button type="button" id="confirm-import" class="primary" disabled>Import and replace these modes</button><button type="button" id="cancel-import" class="secondary">Cancel</button></div>`;
 holder.querySelector('#confirm-import-setup').onchange=e=>holder.querySelector('#confirm-import').disabled=!e.target.checked;
 holder.querySelector('#confirm-import').onclick=()=>{if(holder.querySelector('#confirm-import-setup').checked)handlers.confirm();};
 holder.querySelector('#cancel-import').onclick=handlers.cancel;
 holder.scrollIntoView({behavior:'smooth',block:'center'});
}
