# LuxDetect web prototype design

Date: 8 November 2026

Status: proposed design; awaiting user approval before writing-plans

Primary device: iPhone 17, latest iOS Safari

Visual reference: [updated HTML mockups](../mockups/index.html)

## Intent

LuxDetect is a mobile-first web tool for exploring sky illumination using a
phone's rear camera. The first usable version is a static site on Netlify over
HTTPS. The user is a beginner: installation, controls, failure messages, and
documentation must use plain language. No backend, API keys, or framework.

The primary setup is a level, upward-facing phone with a translucent white
diffuser covering its rear lens. Calibration and subsequent readings must use
the same diffuser, lens, orientation, and processing. A homemade diffuser is
an approximation; it does not establish a lux meter's cosine response.

Safari generally supplies no usable exposure time, ISO, or exposure lock.
The primary measurement therefore learns an empirical relationship between
camera brightness and independently measured lux. Automatic exposure may make
that relationship impossible to learn. Honest failure is a successful product
outcome; no accuracy percentage is promised.

## Goals, boundaries, and constraints

- User-tap camera start; rear-camera request; stable live display; clear Stop.
- Two modes: **Sky + diffuser** (default) and **Sky – no diffuser** (secondary).
- Independent calibration and editable sample collections for each mode.
- Collect at least four reference samples over a wide light range, inspect
  quality, and retain useful samples after failures.
- Prefer a handheld lux meter up to 200,000 lx, level beside the phone and
  read at the same time. An Android ambient-light-sensor app is a rough interim
  reference. An iPhone camera-based app is not an independent reference.
- Pure, unit-tested math and calibration modules; vanilla HTML/CSS/JS, Vite
  for development/build, Node's built-in test runner.
- Persist on the device with localStorage; versioned JSON backup and restore.
- Work over Netlify HTTPS; no image upload, analytics, account, or server.

Native applications, indoor calibration, certified measurements, exposure-lock
controls, physical diffuser manufacture, offline/PWA installation, and automatic
sensor discovery in native apps are outside v1. GitHub Pages remains a possible
later static host; Netlify is the selected first deployment target. Indoor use
may point at a ceiling/window with the same diffuser, but the sky calibration is
not validated for it.

## Approaches and decisions

We considered a straight-line fit and a power-curve fit. The user selected the
power curve because it accommodates a wide lux span without a flexible curve
that can pass through every training point. The selected model is:

`lux = a × brightness^b`

Fit ordinary linear regression to `log10(lux)` against `log10(brightness)`:
intercept `A`, slope `b`, and `a = 10^A`. R² is measured in this log space.
There is no piecewise curve in v1; the model interface permits a future lookup
table without changing the reading UI.

The static mockups establish the approved visual direction: white background,
near-black text, forest-green controls, large values, compact camera preview,
and a matching dark theme. They contain synthetic data, not live measurements.
The updated HTML/screenshots supersede the initial generated concept board.

## Screens and flow

### Setup and camera lifecycle

Before the first reading, show one side-view illustration and three steps:
cover the rear camera, face straight up with sun out of frame, and tap Start
then hold steady. Explain that the screen faces down while the rear camera
faces up. This can make live viewing awkward; do not introduce audio feedback
or a separate remote screen in v1. The guide remains accessible afterward.
The no-diffuser variant tells the user to remove the diffuser and keep the
angle consistent; clouds, sky patch, and sun position affect results.

Start requests `getUserMedia` with `audio: false` and
`video: { facingMode: { ideal: 'environment' } }`. Set `playsinline`, `muted`,
and `autoplay` on the video element, then play the granted stream. Do not open
the camera on page load, mode switch, import, or guide dismissal without a
Start tap. Verify reported facing mode when available; if only the front camera
is supplied, stop and explain that the rear camera is required rather than
quietly taking measurements from it. If facing metadata is unavailable, ask
the user to verify the rear-camera preview before calibration.

Permission refusal, camera unavailable/in use, insecure context, and interrupted
playback have distinct plain-language messages and a retry action. Stop ends
all tracks and processing. On page backgrounding or track interruption, stop,
cancel sampling, and require another Start tap when returning. No background
measurement. A frame timeout longer than one second removes the live reading;
never present the last valid number as a fresh reading.

### Reading

The mode chip becomes a two-option segmented control. Changing modes loads that
mode's active calibration and sample draft, resets smoothing/history/warnings,
cancels any capture, and clears the previous reading. It never reuses the other
mode's calibration. A running camera may remain running; switching modes must
not start a stopped camera. A reminder says to physically add/remove the
diffuser. Changing the diffuser itself requires recalibration.

Reading states, in priority order:

| Condition | Main display | Additional behavior |
| --- | --- | --- |
| Stopped, starting, denied, interrupted, stale frame | No number; explain state | Start/retry as appropriate |
| More than 25% clipped pixels | **Too bright – no reading** | No lux, index, or light-level label; block sample saving |
| Too dark or too few usable pixels | No number; explain image is too dark/unusable | Block sample saving |
| Valid image, no valid calibration for this mode/method/setup | Index 0–100; **Relative brightness (uncalibrated)** | No light-level label or lux unit |
| Valid calibration; estimate outside calibrated range | Large approximate value, e.g. **~75,000 lx**; **Outside calibrated range** | Explain extrapolation; hide light-level label |
| Valid calibration; estimate inside range | **Estimated lux (calibrated)**; value and lx | Show light-level label and quality/date |

More than 5% but at most 25% clipped adds **Near limit** above the main actions
without hiding an otherwise usable reading. Exactly 5% does not warn; exactly
25% still shows Near limit. More than 25% hides numbers immediately. Apply the
clipping override to the current raw frame before display smoothing, including
when a previous valid calibration exists. Recover after three consecutive
usable frames, reset smoothing, then resume readings.

Keep **Keep sun out of frame** visible while measuring. Show calibration badge
Good/Fair and its date with the reference provenance. A failed draft is labelled
**Failed attempt** separately from the still-active Good/Fair calibration.
Without a valid active calibration, the failed status may accompany the
uncalibrated reading but never a lux value.

Light-level constants are editable in one configuration module, not an in-app
threshold editor. Resolve shared endpoints as follows:

| Label | Lux interval |
| --- | --- |
| Dark | 0 ≤ lux < 50 |
| Overcast | 50 ≤ lux < 5,000 |
| Shade | 5,000 ≤ lux < 15,000 |
| Daylight | 15,000 ≤ lux ≤ 50,000 |
| Bright sky | lux > 50,000 |

These are brightness categories chosen by the user, not weather detection.
For example, 12,480 lx is **Shade**, not Daylight. Never assign these categories
to the uncalibrated index or to extrapolated estimates.

### Calibration editing and capture

Each mode has a draft sample list separate from its last valid calibration.
Each sample shows reference lux, source, camera brightness, and Delete. Enter
positive finite reference lux and pick **Lux meter**, **Phone light sensor**,
or **Other**. Phone sensor is visibly **rough reference**; Other has unknown
provenance and an optional note. Explain why camera-based lux apps should not
be used as independent references.

Save sample begins an approximately two-second capture after the tap, displaying
elapsed time/progress and **Hold steady**. Disable duplicate saves and freeze
the entered reference/source until capture finishes or is cancelled. Average
unsmoothed valid frame brightness over that window; the reference value should
be observed on the meter during the same interval.

Reject the whole capture, adding no sample, when any of these applies:

- A frame is saturated (>25% clipped), too dark, or otherwise unusable.
- `(maximum brightness − minimum brightness) / mean brightness > 0.10`.
  Show exactly **Light changed while sampling. Try again.** Exactly 10% passes.
- The camera stops, is backgrounded, switches modes/method/setup, or becomes
  stale during capture.
- There are fewer than ten distinct processed frames over at least 1.8 seconds
  of the two-second wall-clock window, or any inter-frame gap exceeds 400 ms.
  Explain that a stable camera reading could not be captured and offer retry.

Store accepted sample statistics, sources, timestamps, and capture quality.
Near-limit (5–25% clipping) is retained as a visible sample warning. Clipping
and darkness definitions below are shared between live and capture validation.

Delete changes only the draft and immediately saves it locally. Show
**Sample deleted. Undo**. Builder default: one-step Undo has no timer, remains
until the next deletion, leaving calibration editing, or promoting a new fit;
it restores the sample in its original position and mode. It does not survive
a reload. Undo never changes an unrelated mode or silently changes the active
calibration. No automatic outlier deletion.

Coverage shows which reference-lux bins contain samples, using the same five
intervals as light labels. A filled bin requires an actual accepted sample;
do not fill every bin between the min/max. Also show min/max lux and span.
Suggest dusk, heavy overcast, light overcast, open shade under sky, or bright
clear sky (sun excluded), prioritizing missing darker/brighter ranges. Weather
names are suggestions, not guaranteed numerical lux levels.

### Check calibration and quality

Check calibration runs the pure validator against the current mode/method's
draft. It must reject:

1. Fewer than four usable samples; invalid/nonpositive/nonfinite values; mixed
   modes, incompatible processing versions, camera setup, or estimator method.
2. Reference span `maximum lux / minimum lux < 10`.
3. Brightnesses too similar: normalized span `(max−min)/mean ≤ 0.10`, or fewer
   than four distinct brightness groups (group values less than 1% apart).
   Endpoints must also differ by more than three times their combined within-
   sample standard deviation. These are conservative builder defaults, not
   a claim of physical measurement accuracy.
4. Any saturated, too-dark, or unstable sample. Imported records need sufficient
   capture statistics to apply the same checks.
5. Undefined/degenerate regression, nonfinite parameters, `a ≤ 0`, `b ≤ 0`
   for the power model (or `C ≤ 0` for the optional exposure model), or R²
   below 0.8. R² denominator zero is a failure, not a perfect fit.
6. Inconsistent direction: after ordering samples by reference lux, a higher
   reference produces a lower mean brightness by more than 1% (builder noise
   tolerance). A positive fitted slope alone must not hide such a reversal.
7. A severe outlier: any sample's absolute log10 residual exceeds 0.30
   (approximately a factor of two error). Flag the sample for review, retain
   it, and ask the user to repeat/delete it; do not silently trim and refit.

Quality after all mandatory checks pass:

- **Good**: R² ≥ 0.9.
- **Fair**: 0.8 ≤ R² < 0.9.
- Any accepted calibration composed entirely of rough-reference phone-sensor
  samples is capped at Fair, regardless of R². Builder default: Other is also
  treated as unverified/rough for the cap; adding an unverified label cannot
  upgrade all-rough data to Good. Mixed meter/rough data shows a **Mixed
  references** note; Good is a fit badge, not an accuracy guarantee.
- **Failed**: any mandatory check fails. This supersedes the earlier discussion
  where R² below 0.9 would fail: the user's later 0.8 threshold takes precedence.

Successful Check calibration promotes an immutable snapshot of the validated
draft to active calibration, saves it, and shows a/b/R², min/max lux, sample
count, provenance, and date. Failed checks preserve both the editable samples
and the previous active calibration. Show all independent failure reasons with
one primary reason and actionable next steps. If an older valid calibration
exists, say **Using previous calibration from <date>** and continue using it.
Without one, stay uncalibrated. The draft's Failed badge must not replace the
active calibration's Good/Fair badge.

## Measurement pipeline and pure math

### Image brightness

Request an ideal 1280×720 stream without making that resolution mandatory.
Process at a target of 10 distinct frames/second using video-frame timestamps,
not repeated reads of the same frame. Use `requestVideoFrameCallback` where
available and a timestamp-aware fallback. Report observed rates, not requests.

Measure a centered rectangle 25% of the decoded video width and height (e.g.
320×180 for 1280×720). Clamp pixel boundaries consistently. No canvas downscale
before computing clipping percentages; process the actual crop. Preview the
measurement area. No stored or uploaded images.

Builder defaults, all versioned editable constants:

- An 8-bit pixel is clipped if **any** RGB channel is ≥250; it is near-black
  if **all** channels are ≤5. Calculate percentages over all crop pixels before
  dropping pixels. Exclude clipped and near-black pixels from mean luminance.
- Convert each normalized sRGB channel `c` to linear light: `c/12.92` when
  `c ≤ 0.04045`, otherwise `((c+0.055)/1.055)^2.4`.
- Linear luminance is `0.2126R + 0.7152G + 0.0722B`. Average the retained pixels.
- More than 90% near-black, fewer than 50% retained pixels, or nonpositive/
  nonfinite mean makes the image unusable. This check has lower display priority
  than the >25% clipping state.
- The uncalibrated index is `100 × linear brightness`, rounded for display;
  retain the unrounded fraction for samples and fitting. It is explicitly
  camera-image brightness, not physical light intensity.
- Smooth the live display with the last one second of usable brightness samples;
  sample capture/stability and guardrails use unsmoothed data. Clear windows on
  stop, mode/method change, interruption, or invalid-image recovery.

Because Safari also applies tone mapping and other processing, even linearized
sRGB is not guaranteed to be linear sensor irradiance. Keep this limitation in
the guide/calibration help and do not imply that fitting removes it.

### Model boundary and optional exposure path

Pure `calibration.js` accepts samples and configuration, returns either a
versioned model plus quality/range metadata or structured failure reasons.
Prediction returns an estimate and in/out-of-range status. Rendering never
implements the formula. Its interface dispatches by model type; a future
`piecewise-v1` model can share it with `power-v1`. Store both min/max reference
lux and min/max training brightness. In range requires both brightness and
predicted lux to lie within their stored bounds, inclusive, allowing only
floating-point rounding tolerance.

Pure `lux.js` also contains the README exposure formula:

`EV100 = log2(N² / t) + log2(100 / ISO)`

`lux = C × 2^EV100 × (linear luminance / 0.18)`

Do not infer ISO from an arbitrary gain, guess aperture, or treat capability
support as current settings. Normalize verified exposure units to seconds,
ISO to photographic ISO, and aperture to f-number. Exposure lock is informational
only and not required for this path; no manual exposure controls in v1.

Proposed builder decision to reconcile the optional Android path with the
no-uncalibrated-lux rule: activate the exposure formula only with complete,
verified frame-corresponding metadata and a valid calibration for that method.
Use the same reference capture UI; store exposure metadata with each frame/
sample. Calibrate C as the geometric mean of `reference lux / exposure predictor`,
where the predictor is the formula with C=1; calculate log-space R² against
that fixed-exponent model and apply the same sample/span/stability/outlier/
quality safeguards to its predictor. This produces `exposure-v1`, stored
separately from `power-v1` within each physical mode. Never label a formula
using guessed inputs or the README's initial C≈2.5 as calibrated.

Safari always uses the primary power curve. Prefer the exposure path on capable
browsers once its calibration is valid. If complete metadata is absent or a
verified frame-aligned adapter is unavailable, remain on the brightness path;
report why in capabilities. A browser reporting exposure support alone does
not establish reliable per-frame synchronization. Switching paths clears live
windows and only uses that path's compatible calibration; it never applies a
brightness calibration to an exposure predictor. Android hardware verification
is optional for the first iPhone release, and unverified adapters stay disabled.

## Auto-exposure warning

Never infer auto-exposure from constant brightness alone: a stable scene should
be stable. This is a heuristic warning, not proof and not an exposure lock.

Two independent triggers surface a warning on the reading screen, not just debug:

- **Samples cluster**: a draft fails the brightness-separation check while its
  reference readings span at least 10×. Say **The camera may be hiding light
  changes. Your samples cluster at almost the same brightness. Try darker and
  brighter light; calibration may not work on this phone.** Narrow reference
  span alone instead asks for broader reference lighting.
- **View changed, mean did not**: over a rolling ten-second window, compare
  coarse 8×8 spatial/chromatic descriptors from retained pixels. A scene-change
  event is mean absolute change >0.08 in normalized chromaticity or normalized
  spatial luminance pattern relative to the preceding one-second baseline,
  for at least 0.5 seconds. Two distinct events (at least one second apart) in
  ten seconds with raw brightness span ≤3% of mean trigger the warning.
  Suppress this detector on unusable/near-limit images and very dark means
  (≤0.01), where filtering/noise can create misleading descriptors. Say
  **The camera may be hiding light changes. Brightness barely changed even
  though the view changed. This estimate may be unreliable.**

The second detector will often have little evidence under a uniform diffuser;
absence of a warning is not evidence of reliable lux measurement. Do not claim
scene-change detection can establish actual incident-light change.

Builder defaults: show the live warning for at least five seconds after a
trigger, then clear after a full ten-second window without evidence. Cluster
warnings remain until the draft is repaired/dismissed; switching modes clears
live history and reevaluates the selected draft. Warnings do not delete an
active calibration or override a clipping/no-reading state. A valid existing
estimate may remain visible with the warning; failed new fits cannot activate.
All heuristic thresholds are tunable constants and need real-device evaluation.

## Persistence, JSON, and privacy

Use one versioned localStorage document, `luxdetect:v1`, containing preferences
(theme, last mode, guide seen), and a record per physical mode. Each mode has
draft samples and active calibrations keyed by estimator method. Keep the
validated active sample snapshot separate from the draft. Persist on accepted
sample, delete/undo, successful fit/import, mode/theme change, and guide finish.
Timestamp records in UTC ISO format; show dates in the device's locale/timezone.

Include schema/processing/model versions, physical mode, method, a/b or C,
log-space R², quality, reference-lux range, predictor range, sample count,
created/updated/calibrated timestamps, reference provenance per sample, notes,
sample stability and clipping/darkness statistics, and available camera setup
metadata. Record the rear camera identifier locally when supplied; if a known
identifier changes, require recalibration rather than silently reusing its fit.
If identity cannot be established, remind the user to use the same lens/setup.
Changing the crop, luminance algorithm, or processing constants that affect
calibration increments its processing version and requires compatible data or
recalibration. Video resolution/frame rate can differ; keep the same normalized
crop and record actual capture dimensions for diagnosis.

Catch storage read/parse/write/quota failures. Corrupt or incompatible records
must not produce lux. Show **Calibration could not be saved on this device.
Export a backup before closing.** Continue in memory, without claiming it is
persisted. Clearing site data, private browsing, a different browser, or a
different Netlify origin may lose/separate storage. A new visit never restarts
the camera automatically.

**Export calibration JSON** and **Import calibration JSON** sit together in
calibration. Export one versioned bundle containing both modes' compatible
active calibration snapshots and drafts, plus non-sensitive processing metadata.
Exclude images, video, transient debug history, and raw camera device IDs from
portable exports. Preserve per-sample reference source and all data needed to
revalidate a fit. State that files may reveal measurement dates/notes.

Import is a deliberate file selection, limited to 1 MB and 200 samples per
mode/method (builder limits). Validate schema/version, enum values, finite
numbers, sample quality, positivity, counts and compatibility. Refit from raw
samples; never trust imported a/b/C, R², badge or range. Unsupported future
models are rejected safely. Show a preview naming modes, dates, provenance,
quality and ranges; explicitly confirm using the same phone/lens/diffuser and
**Import and replace these modes** before replacing compatible records. Import
is a user operation in the future app, not approval needed for this design.
Validate the entire import before changing anything. Invalid/incompatible
imports preserve all current state; show reasons without executing or injecting
file content into HTML. Replace only the modes present in a confirmed bundle;
preserve absent modes. Empty/failed drafts may be imported with warnings, but
only validated models can become active. An exported draft must never silently
replace its separately saved valid active model during import.

No backend, uploads or API keys. Math works locally. Do not retain frames. JSON
import cannot establish a different phone or diffuser's physical equivalence;
user confirmation and a physical reference check remain necessary.

## Debug panel

A collapsed-by-default disclosure contains raw unsmoothed linear brightness,
clipped %, near-black %, usable %, a/b (or C for exposure method), log-space R²,
sample count/list with sources, range, active mode/method, relevant capability
support and actual metadata availability. Show measured video FPS, processed
FPS, decoded resolution, and measurement crop size in pixels. Show **Unavailable**
when an observed value cannot be measured; do not present requested FPS as actual.

A ten-second brightness sparkline uses a bounded timestamped buffer and labels
its units/time axis. Invalid periods appear as gaps, never interpolated valid
readings. Reset on mode change/stop. **Copy debug info** copies a plain-text/
JSON diagnostic summary including the numerical ten-second history and sample
sources, excluding imagery and camera IDs. Give success/failure feedback; if
clipboard permission fails, offer selectable text for manual copying. No
network transmission. The UI should remain usable with the panel closed.

## Structure and accessibility

Proposed modules, responsibilities only (no implementation in this document):

- `camera.js`: permission, lifecycle, capabilities, decoded-frame timestamps.
- `luminance.js`: pure pixel linearization, crop statistics, clipping/dark checks.
- `lux.js`: pure exposure math and light-level classification.
- `calibration.js`: pure capture validation, fit/quality checks and prediction
  dispatch; no DOM, camera, localStorage or clock reads.
- `storage.js`: schema, migration/rejection, local persistence, import/export.
- `ui.js` and a small entry module: screen/state coordination and rendering.
- `config.js`: versioned thresholds and limits; unit tests import these values.

Use labelled controls, a real radio group for modes, keyboard-visible focus,
44 px minimum primary touch targets, high contrast, and semantic tables/lists.
Do not announce ten live values per second to screen readers; announce mode,
capture completion, errors and warnings politely. Respect reduced motion.
Light theme is the outdoors default; persist an explicit dark-theme choice.
Prefer system fonts and no downloaded UI library. Native file selection,
disclosure and form controls reduce complexity.

## Validation and release evidence

Use TDD when implementation is approved: failing meaningful tests first, then
the smallest implementation, then refactor. Do not write product code until
this design is approved and an implementation plan has been written.

Pure tests must cover perfect synthetic power curves; noisy Good/Fair data;
too few samples; reference span just below/at 10×; clustered brightness;
degenerate regression; nonpositive values; negative slopes; monotonic reversals;
a single severe outlier; rough-reference caps; finite outputs and range edges;
sRGB conversion; clipped/near-black exclusion; >5% and >25% boundaries;
too-dark/unusable images; exactly/above 10% stability; incomplete capture windows;
label boundaries at 50/5,000/15,000/50,000; and exposure units/formula/invalid data.

Test persistence and import with fixtures: independent modes/methods, reload,
failed fit retaining a previous model, delete/undo, corrupted/quota-limited
storage, missing/invalid sources, invalid/oversized/incompatible JSON, recompute
instead of trusting coefficients, partial-mode replacement, and cancelled import.
Test auto-exposure heuristics with timestamped fixtures: unchanged scenes do
not warn; changed descriptors with constant brightness can warn; dark/clipped
images do not feed the detector. No synthetic test establishes physical accuracy.

Browser smoke checks use synthetic/injected camera frames where practical to
verify labels and state transitions, permission denial, Stop releasing tracks,
background cancellation, stale frames, mode switching, clipping suppression,
source capture, failure recovery, Undo, import/export and copy fallback. Check
mobile widths and both themes. Keep automated data sources out of real-device
measurement mode.

Build with Vite and deploy its static `dist` output to Netlify (build command
`npm run build`; dependency lockfile committed during implementation). Verify
the actual HTTPS deployment on iPhone 17 Safari: tap-to-start, inline rear video,
screen orientation and correct lens, interruption recovery, performance, two-
second capture, export/import via iOS Files, localStorage across reloads, and
warnings in sunlight. Test four or five physical light levels beside the meter
with the same diffuser. Report calibration failures honestly and compare fresh
holdout reference readings, not just fitted samples. The first release may
honestly show only relative brightness if Safari flattens the signal. Android
Chrome hardware checks are optional and must be reported as unrun if unavailable.

## Decisions made here for approval

The user explicitly supplied mode separation, storage/import, power fitting,
latest R² bands, clipping/stability thresholds, light categories and debug
requirements. Builder choices proposed here include exact pixel cutoffs,
brightness separation/noise checks, outlier tolerance, crop and frame cadence,
one-step Undo lifetime, import safety/limits, auto-exposure heuristics, and the
calibrated exposure-path reconciliation. These are adjustable design decisions,
not claims of user agreement or proven sensor performance.

Next gate: user reviews this design document. Wait for explicit approval before
invoking `superpowers:writing-plans`. No implementation or deployment is
authorized by approval of the earlier visual direction alone.

Builder check: a fresh software-engineer reviewer read this design and reported
no important unanswered questions preventing planning. This review does not
replace user approval or real-device validation.
