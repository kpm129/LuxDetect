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
 q('reading-value').textContent=r?.value==null?'—':new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(r.value);
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
