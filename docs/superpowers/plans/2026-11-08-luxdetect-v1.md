# LuxDetect v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver LuxDetect in three reviewable milestones: an iPhone camera brightness tool on Netlify, independently calibrated lux with local backup/restore, then warnings, diagnostics and outdoor usability polish.

**Architecture:** A vanilla JavaScript static site built with Vite; camera and DOM adapters surround pure pixel, reading-state and calibration functions. Each physical mode owns its crop, draft samples and immutable active calibration. All measurement data stays on the device; Safari starts with relative brightness until a valid matching calibration exists.

**Tech Stack:** HTML, CSS, ES modules, Vite, Node's built-in `node:test` / `node:assert/strict`, localStorage, Netlify static hosting. Use the environment's Node 24 toolchain; lock the selected compatible Vite version at implementation time.

**Spec:** [Approved LuxDetect design](../specs/2026-11-08-luxdetect-design.md). Its Approved values table is authoritative; earlier mockup example numbers do not override it.

**Status:** Approved and implemented locally. Final clean install, 57 unit/adapter tests, production build and browser software-camera flows pass. Netlify manual upload and actual iPhone/reference-meter acceptance remain pending. Checkboxes below distinguish local work from blocked external checks.

## Global Constraints

- Primary test target: iPhone 17, latest iOS Safari, over a real Netlify HTTPS URL.
- Vanilla HTML/CSS/JS only; no backend, API keys, analytics, camera uploads, React or UI framework.
- Use the existing `/workspace/LuxDetect` checkout. Cloud tasks are already isolated; do not create a worktree unless the user requests it. Preserve unrelated changes.
- Camera starts only after Start; `audio: false`, `facingMode: { ideal: 'environment' }`, video `playsinline`, `muted`, `autoplay`. Stop all tracks on Stop/background/interruption.
- Modes are `diffuser` / `no-diffuser`; crops are centered **40%×40%** / **25%×25%** respectively. Ideal stream **1280×720**; target processing **10 distinct frames/s**.
- Linearize sRGB before luminance averaging. Clipped pixel: any channel **≥250**; near-black: all channels **≤5**; exclude both from the mean. Percentage denominators are all pixels in the crop.
- Image guards: **>25%** clipped means **Too bright – no reading**; **>90%** near-black or **<50%** usable also hides the number. Near limit at **>5%** clipped is added to the UI in M3. Recover after **3 usable frames**; stale after **>1 s**.
- Relative index is **100×linear brightness**, rounded; smooth the display over **1 s**, never sample-quality guards. No lux units or light category without a valid calibration.
- Capture: **2 s**, **≥10** distinct frames spanning **≥1.8 s**, gaps **≤400 ms**; reject variation `(max−min)/mean >10%` with **Light changed while sampling. Try again.**
- Calibration gates: **≥4 samples**, **≥10× reference-lux span**, brightness ratio **≥1.5×**, **≥4 brightness groups at ≥1.10× anchors**, endpoint difference **>3×sqrt(sd_min²+sd_max²)**, reversal tolerance **1%**, positive a/b, finite regression.
- Fit `lux = a × brightness^b` by regression of log10(lux) on log10(brightness). R² ≥0.9 Good; 0.8–<0.9 Fair; <0.8 fails. Entirely rough/Other references cap at Fair.
- Absolute log10 residual **>0.20** flags **check this sample**; **>0.30** fails. Exact endpoints: 0.20 unflagged, 0.30 flag-only. Do not discard flagged samples automatically.
- **Samples too similar – camera may be flattening brightness.** is the cluster failure message. No live scene-change detector, descriptor, threshold or warning timer in v1.
- One active `power-v1` calibration and independent draft per mode. A failed attempt never replaces the active calibration. Persist with localStorage; portable JSON includes sample sources and raw statistics, never video/images or raw camera IDs.
- Import: validate → refit raw samples → preview → confirm → replace. Schema/processing version **1** only; reject unknown versions, no migrations. Limit **1 MiB** and **200 samples per mode per collection**.
- Undo: **1 deletion**, no countdown; expires on next deletion, leaving editing, successful fit or reload. Only changes the draft.
- Light labels: Dark <50; Overcast 50–<5,000; Shade 5,000–<15,000; Daylight 15,000–50,000 inclusive; Bright sky >50,000 lx. Hide labels for uncalibrated and outside-range readings.
- Exposure metadata is detected/displayed in debug only; no exposure formula, correction constant or alternate lux estimator.
- Mandatory pure unit tests use TDD. Injected-frame browser smoke tests are optional, not an M1 gate. Do not substitute those tests for real iPhone camera evidence.
- No production code until this plan is approved. No claims of device/accuracy/deployment verification without observed evidence; optional/unrun checks stay distinct.

## Review Focus

The following implied failure cases receive explicit tests in the owning tasks:

1. **Permission resolves after Stop or a mode change:** no resurrected camera or stale-mode sample; Task 2's deferred-permission test and Task 5's cancelled-capture test.
2. **Different camera resolution or very small frame:** crop stays centered/in bounds, denominators stay correct; Task 1's odd/small-dimension tests.
3. **One bad frame hidden by otherwise stable averages:** never save a saturated sample or display a smoothed stale reading; Task 2's raw-frame guard and Task 4's contaminated-window tests.
4. **Bad import beside an existing good calibration:** malformed/forged/unsupported input cannot erase the good model; Task 6's atomic-import tests.
5. **Safari storage/download/clipboard restrictions:** no false Saved/Copied/Exported success; Tasks 5–7's unavailable-adapter tests and real-device checklist.

## File map and contracts

The repository currently contains a README and design/mockup documents, with no app, manifest or tests. Create only the following runtime pieces as their tasks require them:

| File | Responsibility | First task |
| --- | --- | --- |
| `package.json`, `package-lock.json`, `.gitignore` | ES modules; `dev`, `build`, `preview`, `test` scripts; ignore dependencies/builds | 1 |
| `src/config.js` | Approved constants, processing/schema versions and mode IDs | 1 |
| `src/luminance.js` | Pure mode crop, pixel conversion and image quality | 1 |
| `src/lux.js` | Pure relative index, reading priority and eventual lux categories | 2 |
| `src/camera.js` | Camera lifecycle, distinct-frame scheduling, capture canvas, track diagnostics | 2 |
| `src/state.js` | Pure application transitions, per-mode state, cancellation identities | 2 |
| `index.html`, `src/main.js`, `src/ui.js`, `src/styles.css` | Accessible page, small orchestration layer, DOM rendering, visual system | 2 |
| `netlify.toml`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`, `README.md` | Reproducible build, actual deployment evidence, beginner instructions | 3 |
| `src/calibration.js` | Pure capture summaries, power fitting, gates, flags and prediction | 4 |
| `src/storage.js` | Strict saved-state parsing, persistence, portable export and staged import | 5–6 |
| `src/debug.js` | Bounded numeric history, diagnostic serialization and capability formatting | 7 |
| `tests/*.test.js`, `tests/helpers.js` | Node unit tests and deterministic fixtures | Owning task |

Use JSDoc for records and public signatures; no TypeScript toolchain. Keep these names consistent across tasks:

- `Mode`: `'diffuser' | 'no-diffuser'`.
- `Crop`: `{x,y,width,height}` in decoded video pixels. Fractional width/height are floored, minimum 1 px; center offsets are floored, all bounds clamped.
- `FrameStats`: `{at, videoTime, brightness, clippedFraction, nearBlackFraction, usableFraction, crop, issue}`. Brightness is a positive unrounded linear fraction or null. Fractions are 0–1; `issue` is null, `'too-bright'`, `'too-dark'` or `'unusable'`. `at` is monotonic milliseconds; `videoTime` identifies distinct decoded frames.
- `Sample`: `{id, mode, setupId, processingVersion, referenceLux, source, note, createdAt, brightness, sd, minBrightness, maxBrightness, frameCount, spanMs, maxGapMs, worstClippedFraction, worstNearBlackFraction, minUsableFraction,videoWidth,videoHeight,cropWidth,cropHeight}`. `source` is `'lux-meter' | 'phone-light-sensor' | 'other'`; timestamps for stored records are ISO strings, not monotonic times. `setupId` is an opaque setup identifier, not a raw camera ID; different setups cannot form one fit. It may travel in JSON to preserve grouping without exposing camera identity.
- `Flag`: `{sampleId, code:'check-sample', residual}`; residual is absolute log10 error.
- `PowerModel`: `{type:'power-v1', processingVersion:1, mode, setupId, a,b,r2,quality,luxRange,brightnessRange,sampleCount,samples,flags,calibratedAt}`. Both ranges are `[min,max]`; `quality` is `'Good'|'Fair'`. Retain a separate copy of the active samples.
- `FitResult`: `{ok:true, model}` or `{ok:false, reasons, flags}`; reasons have a stable code and plain-language message. Numerical functions take configuration/timestamps as inputs, never read DOM, storage or the clock.
- `SavedState`: `{schemaVersion:1, processingVersion:1, createdAt, updatedAt, preferences, modes}`; preferences contain `theme`, `lastMode`, `guideSeen`; `modes.diffuser` and `modes['no-diffuser']` each have `{draft,active,cameraSetup}`. Active may be null. `cameraSetup` contains its opaque `setupId` and a private raw camera ID when known; the raw ID never appears in portable exports.
- `AppState` additionally contains transient camera phase, mode, frame history, reading, capture token/state, one undo record and notices. Those transient fields are never persisted.

---

## M1 — iPhone camera, relative brightness and Netlify HTTPS

### Task 1: Tested pixel measurement foundation

**Files:** Create `package.json`, `package-lock.json`, `.gitignore`, `src/config.js`, `src/luminance.js`, `tests/luminance.test.js`.

**Interfaces:**
- Produces `cropForMode(width,height,mode,config) -> Crop`.
- Produces `srgbToLinear(channel01) -> number`.
- Produces `measureFrame({rgba,width,height,mode,at,videoTime},config) -> FrameStats`; input pixels use unscaled decoded-video dimensions.

- [x] **Step 1 — Prepare only the test runner scaffolding.** Set `type: module`, `test: node --test`, use Node 24 and add generated-output ignores. Do not add a camera library or UI framework. Vite/build files arrive with Task 2 so this task remains a pure measurement unit.
- [x] **Step 2 — Write failing pixel tests.** Include the exact assertions below, a 4-pixel mixture where clipped/black pixels are excluded, cutoff equality at 250/5, and odd/small decoded dimensions (e.g. 641×479 and 1×1). Assert 0/invalid dimensions fail cleanly and retained-pixel denominators never divide by zero.

```js
assert.deepEqual(cropForMode(1280,720,'diffuser',config),
  {x:384,y:216,width:512,height:288});
assert.deepEqual(cropForMode(1280,720,'no-diffuser',config),
  {x:480,y:270,width:320,height:180});
assert.equal(srgbToLinear(0), 0);
assert.equal(srgbToLinear(1), 1);
assert.ok(Math.abs(srgbToLinear(0.5)-0.21404114048223255)<1e-12);
```

- [x] **Step 3 — Run RED:** `node --test tests/luminance.test.js`. Expect failure from missing measurement exports, not a broken runner.
- [x] **Step 4 — Implement the three interfaces** with the approved sRGB coefficients, mode crops, all-crop percentage denominators and exclusion rules. Read the full image region without resampling; classify >25% clipped, >90% black and <50% usable in spec priority order. Test exact percentage endpoints using controlled pixels.
- [x] **Step 5 — Run GREEN:** `node --test tests/luminance.test.js`; expect a nonzero test count, all passing. Refactor only while green.
- [x] **Step 6 — Commit** only the task's files: `feat: add tested linear brightness measurement`.

### Task 2: Tap-to-start camera and honest live brightness

**Files:** Create `src/camera.js`, `src/lux.js`, `src/state.js`, `src/main.js`, `src/ui.js`, `src/styles.css`, `index.html`, `tests/camera.test.js`, `tests/lux.test.js`, `tests/state.test.js`; modify `package.json`, `package-lock.json`.

**Interfaces:**
- Consumes Task 1's `measureFrame` and crop configuration.
- Produces `createCameraController({video,mediaDevices,onFrame,onState,now}) -> {start,stop,getDiagnostics}`. `start() -> Promise<void>`, `stop() -> void`; `onFrame` receives Task 1's raw input record. Inject platform adapters in Node tests; no browser fake-camera infrastructure is needed.
- Produces `relativeIndex(brightness) -> number`; `buildReading({phase,stats,prediction,brightness,frameAgeMs,recoveryCount}) -> {kind,value,label,unit,lightLevel}`. Prediction is null in M1; later `{lux,inRange}` from Task 4.
- Produces `initialState() -> AppState`, `reduceApp(state,action) -> AppState`; action types start, camera-ready/error/stopped, frame and mode-change. Main owns I/O; the reducer never opens a camera.
- Produces `renderApp(root,state,handlers) -> void` with handlers for Start, Stop, mode and guide. Render DOM text safely; use native labelled controls.

- [x] **Step 1 — Write failing lifecycle/reading tests.** Mock deferred `getUserMedia`, tracks and callbacks. Assert no request before Start; rear/no-audio constraints; front camera rejection; Stop releases all tracks; Stop before permission resolves releases the late stream rather than attaching it. Background/interruption stops and needs a new tap. Old frame callbacks after stop/mode change cannot update readings. Duplicate `videoTime` is never processed twice.

```js
assert.equal(relativeIndex(0.42), 42);
const reading=buildReading({phase:'live',stats:usableStats,prediction:null,
  brightness:0.42,frameAgeMs:0,recoveryCount:3});
assert.equal(reading.label,'Relative brightness (uncalibrated)');
assert.equal(reading.unit,null);
assert.equal(reading.lightLevel,null);
```

Also assert a single >25%-clipped raw frame suppresses even a previously smoothed number, a >1,000 ms stale frame removes it, and three usable frames are needed for recovery. The current mode determines its crop; changing modes clears live history and never starts a stopped camera.
- [x] **Step 2 — Run RED:** `node --test tests/camera.test.js tests/lux.test.js tests/state.test.js`; expect the targeted absent interfaces to fail.
- [x] **Step 3 — Implement the public interfaces and M1 UI.** Use `requestVideoFrameCallback` where available; fallback must check decoded-frame advancement. Process at most 10 distinct frames/s and use a monotonic clock for smoothing/staleness. Configure the video attributes before attaching the stream. Include the setup illustration/three steps, mode segmented control, Start/Stop, preview measurement area and uncalibrated index. Permission/unavailable/insecure/stopped/stale/unusable states have no stale number. No calibration or exposure-based estimate exists yet.
- [x] **Step 4 — Add Vite without a framework.** At execution, install the current Node-24-compatible stable Vite as an exact dev dependency; commit the lockfile. Add `dev: vite --host 0.0.0.0`, `build: vite build`, `preview: vite preview --host 0.0.0.0`. Local HTTP development does not establish camera access from a separate iPhone; use HTTPS deployment for that check.
- [x] **Step 5 — Run GREEN:** `npm test` and `npm run build`. Start the dev server, inspect the nonblank UI at 390 px and desktop width, and check console/overflow. Desktop camera absence may exercise a useful error state; it cannot verify the iPhone camera. Test lifecycle adapters with Node mocks; injected browser frames remain optional.
- [x] **Step 6 — Commit:** `feat: add rear camera and relative brightness UI`.

### Task 3: Publish a testable Netlify link and verify M1

**Files:** Create `netlify.toml`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`; modify `README.md`.

**Interfaces:**
- Consumes Task 2's `npm run build` → `dist/` contract and M1 UI.
- Produces an actual deployed HTTPS URL, build/HTTP evidence and an iPhone checklist with observed results. A localhost link or unpublished deploy configuration is not the deliverable.

- [x] **Step 1 — Configure the static build.** `netlify.toml` uses build command `npm run build`, publish directory `dist`, Node major 24. No backend/functions or blanket CSP that breaks the inline-free app. Deployment instructions explain `npm ci`, local development, tests, build and the Netlify HTTPS camera requirement in plain language.
- [x] **Step 2 — Verify reproducibility:** run `npm ci`, `npm test`, `npm run build`; inspect the built entry and assets. This static config does not need a test mirroring its fields. Record actual counts and outcomes in the execution report.
- [ ] **Step 3 — Deploy through available authorized Netlify tooling.** First inspect connected tools and credential presence/status, never values. Reuse an existing site when explicitly selected; otherwise create a review deployment through the authorized route. Do not install backend credentials in the browser or push to main just to trigger deployment. If account access is missing, finish the tested build and provide the concrete `dist/` artifact/manual Netlify upload steps; record deployment as pending until a real URL is supplied and checked. Continue independent M2 work if useful, without claiming M1 deployment complete.
- [ ] **Step 4 — Verify the real HTTPS site:** expected title/content and built assets return successfully, browser console has no relevant errors, and Start is initially required. Record the actual URL in deployment notes after it exists; do not invent one.
- [ ] **Step 5 — Ask the user to perform the physical-device checklist** once that URL exists: iPhone Safari permission, rear preview, inline playback, live index, both mode crops, Stop, deny/retry, background/return. Explain this is needed because desktop emulation cannot establish iPhone camera behavior. Record user-observed results; no unanswered test is a pass.
- [x] **Step 6 — Commit** reproducible config/documentation: `docs: document and verify Netlify brightness milestone`.

**M1 acceptance:** mandatory pure/lifecycle tests and build pass; a real Netlify HTTPS link serves the app; the iPhone smoke check is observed. The UI shows relative brightness only. Deployment or physical checks still pending means M1 is not yet fully verified.

---

## M2 — Calibration, fitted lux, local persistence and JSON

### Task 4: Pure capture validation and power-curve calibration

**Files:** Create `src/calibration.js`, `tests/calibration.test.js`, `tests/helpers.js`; extend `src/lux.js`, `tests/lux.test.js` and config as needed.

**Interfaces:**
- Consumes `FrameStats`, `Sample`, modes and approved config from earlier tasks.
- Produces `summarizeCapture(frames,{startedAt,endedAt,config}) -> {ok:true,statistics} | {ok:false,reason}`; statistics contain every numerical Sample field needed for capture quality, including sample SD of distinct-frame brightness.
- Produces `fitPowerCalibration(samples,{mode,calibratedAt,config}) -> FitResult`.
- Cluster reason codes are `brightness-span`, `brightness-groups`, and `brightness-noise`; `clusterNotice` in Task 7 consumes only those codes. Other failures keep their own actionable messages.
- Produces `predictLux(model,brightness,config) -> {lux,inRange} | null`; reject incompatible/invalid models and nonpositive/nonfinite inputs.
- Produces `classifyLightLevel(lux) -> string | null`; `buildReading` now uses a valid prediction, range and image priority. In-range requires both stored brightness and lux bounds, with approved rounding tolerance.
- Test fixtures `makeSample(overrides)` and `makeFrames(values,options)` create complete valid sample/capture records; default monotonic times, positive finite lux, correct mode/version and known safe pixel statistics.

- [x] **Step 1 — Write failing fit tests.** Test a perfect curve `a=100000,b=2` at brightness `[0.01,0.05,0.2,0.4,0.7]`; expect correct parameters/R²/ranges. Add deterministic noisy Good/Fair/Failed fixtures, all-rough/Other caps and mixed provenance. Cover <4, reference span just below/exactly 10×, brightness ratio just below/exactly 1.5×, grouping just below/exactly 1.10×, endpoint-noise threshold, positive/negative/zero slopes, reversal >1%, invalid values/versions/modes, constant log values and nonfinite results. Isolate boundary gates in tests so an unrelated gate cannot hide the expected failure reason.

```js
assert.equal(result.ok,true); // perfect fixture result
assert.ok(Math.abs(result.model.a-100000)<1e-6);
assert.ok(Math.abs(result.model.b-2)<1e-12);
assert.equal(result.model.quality,'Good');
assert.equal(clustered.reasons.some(r =>
  r.message==='Samples too similar – camera may be flattening brightness.'),true);
```

Test residual boundary decisions with exact residual inputs through a pure exported `classifyResidual(residual) -> 'none'|'check-sample'|'fail'`, then fit a real single-outlier fixture to prove integration: 0.20 none, just above 0.20 flag, 0.30 flag, >0.30 failure. All original samples remain in the result. Nonfatal flags do not change the R² badge.
- [x] **Step 2 — Write failing capture/range tests.** Exactly 10% variation passes, >10% rejects with exact copy; one saturated frame rejects even when average brightness appears stable; insufficient unique frames, short span, >400 ms gap and invalid-image frames reject. Include finite two-second windows and valid ten-frame sparse captures. Assert all light-category endpoints, uncalibrated/outside-range category suppression, and prediction at both range bounds.
- [x] **Step 3 — Run RED:** `node --test tests/calibration.test.js tests/lux.test.js` and confirm intended missing behavior fails.
- [x] **Step 4 — Implement the pure interfaces.** Fit two-parameter linear regression in log10 space; retain residual flags; evaluate the full gate set and structured reasons without silently filtering samples. Use sample standard deviation and explicit supplied timestamps. Select `power-v1` by model type, with no second model implementation. No DOM/storage/camera/clock reads.
- [x] **Step 5 — Run GREEN:** targeted tests, then `npm test` and `npm run build`; retain zero-test/skip/fail counts accurately. No physical-accuracy claim follows from synthetic fits.
- [x] **Step 6 — Commit:** `feat: add validated power calibration and range-aware lux`.

### Task 5: Capture/edit workflow and separate saved calibration per mode

**Files:** Create `src/storage.js`, `tests/storage.test.js`; extend `src/state.js`, `src/main.js`, `src/ui.js`, `src/styles.css`, `tests/state.test.js`, `docs/TESTING.md`.

**Interfaces:**
- Consumes Task 4's capture/fit/prediction functions and Task 2's camera frames.
- Produces `loadState(storage,config) -> {savedState,warning}` and `saveState(storage,savedState) -> {ok,reason}` using `getItem/setItem` adapters and key `luxdetect:v1`. Local saved active models are validated/refitted from their own snapshots, not trusted coefficient fields. Unknown versions are rejected; no migration.
- Extends reducer actions: sample-start/cancel/complete/reject, sample-delete/undo, calibration-check-result, setup-reset-confirmed, dismiss-cluster, preferences-change and load-saved. Each capture freezes mode/setup/source/reference and uses a unique token; cancelled/old tokens cannot append samples.
- `renderApp` adds sample entry/source/notes/list, progress, coverage, failure reasons, quality/provenance/date, per-sample flags, Check calibration, and Delete/Undo.

- [x] **Step 1 — Write failing state/storage tests.** Per-mode draft/active separation, compatible reload, failed fit retaining the older active snapshot/date, mode switch cancelling capture, and late sample completion ignored. Delete/Undo restores position but never mutates active samples; expiry rules match the spec. Reject additions above 200 samples. Invalid lux/source entries cannot start capture.

```js
assert.deepEqual(afterFailedFit.modes.diffuser.active,before.modes.diffuser.active);
assert.equal(afterModeSwitch.capture,null);
assert.equal(afterLateCompletion.modes.diffuser.draft.length,beforeDraftLength);
assert.deepEqual(afterUndo.modes.diffuser.draft,beforeDelete.modes.diffuser.draft);
```

Also test malformed local JSON, unknown version, forged coefficient fields, known camera-ID mismatch, missing ID reminder, blocked/quota-limited storage, and no automatic camera start after reload. Storage failure keeps usable state in memory and shows the backup warning; it must not report Saved.
- [x] **Step 2 — Run RED:** `node --test tests/state.test.js tests/storage.test.js` and confirm the new transitions/adapters fail for the intended reason.
- [x] **Step 3 — Implement storage and reducer additions.** Store active snapshots independently from drafts, retain source/quality statistics, persist accepted edits/preferences, and clear Undo at specified boundaries. If local camera identity is known to differ, invalidate calibration for use without deleting the active snapshot; do not append captures to the old setup's draft. A Change setup/recalibrate action confirms replacement of the draft, assigns a new opaque setupId, and leaves the old active snapshot incompatible until replaced by a valid new fit. Cancelling the action preserves everything. This also supports physically changing the diffuser. Test setup mismatch, rejected mixed-setup fits and cancellation. Frame-resolution changes alone do not change normalized crop fractions.
- [x] **Step 4 — Connect the calibration UI.** During the two-second capture freeze inputs, disable duplicate Save and reflect real progress; reject unstable windows without appending. Check calibration promotes only a passing model, renders flags and all relevant reasons, and leaves a failing draft editable. Coverage marks actual sampled category bins, not the entire min/max interval. Show the short cluster error in calibration now; its persistent reading-screen banner is polished in M3. The reading path loads only the current mode's compatible active model.
- [x] **Step 5 — Run GREEN:** targeted tests then `npm test`, `npm run build`. Inspect the mobile calibration layout with deterministic development fixtures only when clearly marked; no fake successful data in real measurement mode. Actual sampling is verified on the HTTPS phone checklist, not by static screenshots.
- [x] **Step 6 — Commit:** `feat: add per-mode calibration editing and persistence`.

### Task 6: Version-checked portable export and staged import

**Files:** Extend `src/storage.js`, `src/main.js`, `src/ui.js`, `tests/storage.test.js`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`.

**Interfaces:**
- Produces `exportCalibration(savedState) -> string` (JSON, both modes, draft and active raw samples; no private identifiers).
- Produces `prepareImport(jsonText,{byteLength,config}) -> {ok:true,proposal,summary} | {ok:false,reasons}`. Proposal contains independently refitted active snapshots and retained draft samples, without touching current state.
- Produces `applyImport(savedState,proposal) -> SavedState`, called only after explicit app-user confirmation; replace included modes atomically, preserve absent modes and preferences. Exported dates remain the calibration dates when valid, not overwritten by import time.

- [x] **Step 1 — Write failing import/export tests.** Round-trip both modes; preserve source/flags/statistics and distinguish active samples from draft. Reject >1,048,576 bytes, >200 samples per collection, unsupported schema/processing/model, invalid enums/nonfinite numbers, missing required capture stats and malformed JSON. Recompute rather than trust a/b/R²/ranges/quality. Revalidate active snapshots independently; invalid drafts cannot become active by import. Supported invalid drafts can remain editable with warnings. Test forged markup/prototype-like keys as inert data, using explicit field construction rather than merging arbitrary objects.
- [x] **Step 2 — Assert atomicity and cancellation:** a valid mode plus an invalid active model in another mode rejects the entire import and leaves current state unchanged; partial-mode imports preserve the other mode; cancelling preview changes nothing. Private IDs are absent from serialized output, and confirmed imports require a physical same-setup confirmation before activation.
- [x] **Step 3 — Run RED:** `node --test tests/storage.test.js` and confirm targeted new tests fail.
- [x] **Step 4 — Implement prepare/confirm/apply.** Check File.size before reading, parse once, validate, refit, build summary, show names/dates/provenance/quality/ranges, then require **Import and replace these modes** plus same-phone/lens/diffuser confirmation. No migrations, converters or exposure path. Bind a confirmed portable calibration to the current known camera setup only after that confirmation; if unknown, keep the reminder.
- [x] **Step 5 — Implement adjacent Export/Import controls** with Blob download/native file input; show honest download preparation/read errors. Test serialization with Node fixtures and manually verify actual Files save/open on iPhone. A clicked anchor alone does not prove an iOS file was saved.
- [ ] **Step 6 — Run GREEN:** `npm test`, `npm run build`; update the Netlify deployment, check actual HTTPS content, and perform the M2 checklist: samples, fit success/failure, reload, mode separation, old calibration preservation, Undo, JSON download/import/preview/cancel/confirm.
- [x] **Step 7 — Commit:** `feat: add validated calibration JSON backup and restore`.

**M2 acceptance:** pure fitting/capture/state/storage tests pass; the phone can collect a stable sample or explain a rejection, fit valid independent references, retain an older calibration after failure, reload each mode correctly, and round-trip a calibration via iOS Files. Lack of distinguishable camera brightness is an honest failed calibration, not a reason to bypass gates or invent lux.

---

## M3 — Warnings, debug and polish

### Task 7: Reading warnings, useful diagnostics and accessible outdoor UI

**Files:** Create `src/debug.js`, `tests/debug.test.js`; extend `src/lux.js`, `src/state.js`, `src/camera.js`, `src/ui.js`, `src/main.js`, `src/styles.css`, `tests/lux.test.js`, `tests/state.test.js`, `docs/TESTING.md`.

**Interfaces:**
- Consumes existing FrameStats, PowerModel, AppState and camera diagnostics.
- Produces `nearLimit(clippedFraction) -> boolean` and `clusterNotice(fitResult,{dismissed}) -> {code,message} | null` in `lux.js`; reducer stores dismissal per selected draft and reevaluates after edits/mode change. Stop/invalid-frame reading priority remains unchanged.
- Produces `appendHistory(history,frame,{windowMs,maxPoints}) -> history` in `debug.js` with window 10,000 ms and max 100 observations; issue frames remain null gaps.
- Produces `buildDebugInfo({history,stats,model,draft,cameraDiagnostics,mode}) -> object` with no imagery or camera IDs. `formatCapabilities(capabilities,settings)` distinguishes support from available values; never enables another estimator.

- [x] **Step 1 — Write failing warning/history/serialization tests.** Exact 5% clipped has no Near limit; >5% through 25% warns; >25% still hides all numbers. Cluster span/group/noise failures warn for the current draft and survive a failed fit while previous calibration remains in use; repaired/dismissed/other-mode drafts do not reuse the warning. No detector based on ongoing scene changes exists.

```js
assert.equal(nearLimit(0.05),false);
assert.equal(nearLimit(0.05001),true);
assert.equal(nearLimit(0.25),true);
assert.ok(history.length<=100);
assert.ok(history.every(p => now-p.at<=10000));
assert.equal(JSON.stringify(debugInfo).includes(privateCameraId),false);
```

Also test null gaps, mode/stop reset, observed rather than requested FPS, unavailable exposure metadata, absent video-frame callbacks and clipboard-adapter rejection with selectable-text fallback.
- [x] **Step 2 — Run RED:** `node --test tests/debug.test.js tests/lux.test.js tests/state.test.js` and confirm the new behavior fails.
- [x] **Step 3 — Implement warnings and diagnostics.** Complete the reading-screen Near limit/cluster notices, **Using previous calibration from <date>**, outlier flags and explanatory range text. Add debug toggle with raw linear brightness, clip/dark/usable %, a/b/R², sample table/sources, observed FPS, decoded resolution and actual mode-specific crop size, ten-second sparkline with labelled axes/gaps, and Copy debug info with success/failure/selectable fallback. Exposure support and settings are informational only. No descriptor, live flattening detector, detector thresholds or timer.
- [x] **Step 4 — Polish the approved visual direction.** Apply the updated mockups' hierarchy and contrast, retaining the spec's final values. Persist light/dark preference; use ≥44×44 px primary targets, visible keyboard focus, labelled radio groups/inputs and no category for uncalibrated/outside-range readings. Screen E is a large approximate number plus **Outside calibrated range** with no category; screen F says **Too bright – no reading**. Announce discrete status changes, not every frame.
- [x] **Step 5 — Run GREEN:** `npm test`, `npm run build`. Inspect 320/375/390/430 px and desktop, both themes, debug open/closed, long failures and sample sources. Use the Browser plugin if available; otherwise Playwright with the reason recorded. Injected camera frames are optional; theme/navigation/disclosure/console/overflow checks do not require them. Save QA screenshots outside source unless explicitly requested as artifacts.
- [x] **Step 6 — Commit:** `feat: add calibration warnings and camera diagnostics`.

### Task 8: Verify the release and document its limits

**Files:** Update `README.md`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`; application files only if a reproduced issue requires a fix with its regression test.

**Interfaces:**
- Consumes M1/M2/M3 artifacts and all recorded verification results.
- Produces the final actual Netlify HTTPS URL, reproducible instructions, complete test outcomes and a clear account of what the camera can and cannot measure.

- [x] **Step 1 — Run required checks:** `npm ci`, `npm test`, `npm run build`. Record the executed suite and counts; do not count skips/zero tests as verification. Recheck imports, warnings and version documentation against the spec; no migration or exposure estimator may appear.
- [ ] **Step 2 — Publish the verified static build through the authorized Netlify route**, then make a fresh HTTPS request and inspect the deployed browser UI/assets. Update the recorded URL/deploy evidence. An unavailable deployment account is a concrete blocker; do not substitute localhost or claim publication.
- [ ] **Step 3 — Complete the iPhone Safari checklist** with user-observed physical results: guide, correct rear lens, Start/Stop, foreground/background, both crops, sample stability, mode-specific reload, import/export via Files, clipping behavior where safely observed, debug frame/crop metrics, copy fallback, and readability in daylight in both themes. Unavailable tests stay unrun.
- [ ] **Step 4 — Validate the measurement honestly.** Using the same diffuser, gather 4–5 light levels beside the handheld meter, or clearly marked rough Android sensor references. Check independent held-out readings within and beyond the calibrated range. Record the reference source, failures and limitations; do not promise the README's former ±20–30% accuracy without evidence. Optional Android Chrome checks are labelled unrun if no device exists.
- [x] **Step 5 — Fix only reproduced issues**, add meaningful failing regression tests to their owning modules, rerun affected checks and the required build. Do not add deferred live scene detection, exposure formulas, schema migration or native app work.
- [x] **Step 6 — Commit** the final documentation and verified fixes: `docs: record LuxDetect release checks and measurement limits`.

**M3 acceptance:** required suites/build pass; warnings and debug match the approved spec; actual HTTPS and phone results are recorded, and remaining unrun checks/limitations are explicit. A device that cannot support calibration remains usable as clearly labelled relative brightness.

## Self-review and execution handoff

- Spec coverage checked: lifecycle/crops/linear pixels → Tasks 1–2; deployment → 3; fit/capture/gates → 4; per-mode samples/storage/Undo → 5; strict import/export → 6; warnings/debug/theme/accessibility → 7; physical evidence/docs → 8.
- The five Review Focus cases each have named tests in their owning task. Public records and signatures are defined once and reused. All behavioral work has RED/GREEN steps; static deployment/documentation checks use build and functional evidence rather than trivial mirrored tests.
- Optional injected-frame browser automation is not hidden in any mandatory M1 step. The live detector, exposure estimator and migration path are absent. No test/build/deployment/device result in this plan has been executed or claimed as passing.
- Recommended execution method: implement task-by-task in this session using `superpowers:executing-plans`, keeping the shared interfaces and milestone evidence visible. User may choose subagent-driven execution instead. In either case, wait for explicit plan approval first; do not launch implementation agents now.

Current next action: user-selected manual upload of the verified static ZIP to a new Netlify site, then HTTPS and physical iPhone checks. No merge or push has been performed.
