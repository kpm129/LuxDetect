# LuxDetect verification

Run `npm test` for the Node unit suite and `npm run build` for the static build.
These tests do not establish physical accuracy or iPhone camera behavior.

## iPhone 17 / Safari checklist (requires deployed HTTPS link)

- [ ] Camera is off on load; tap Start for permission and inline rear video.
- [ ] Deny permission and check the recovery instructions; allow and retry.
- [ ] Check the selected rear lens; hold level facing up with screen down.
- [ ] Check diffuser/no-diffuser crops; switching does not start an off camera.
- [ ] Live index says Relative brightness (uncalibrated), without lux/category.
- [ ] Stop turns off the camera; background/return requires another Start tap.
- [ ] Stale/unusable frames remove the number; no frozen reading looks live.
- [ ] Collect a stable reference sample over two seconds;
      changing light rejects it without adding a sample.
- [ ] Fit 4–5 independent levels spanning ≥10× lux; calibration may honestly fail
      if Safari flattens the image. No failed fit invents a lux value.
- [ ] Check mode separation, reload, Undo, previous-calibration retention.
- [ ] Export/open/import via iOS Files; inspect preview and cancel/confirm paths.
- [ ] Check clipping/range warnings, debug metrics, copy fallback and themes.
- [ ] Compare independent held-out meter readings with the same diffuser/lens.

Physical checks above are unrun until observed on the user's phone. An Android
light-sensor app is a rough reference; a camera-based iPhone app is not an
independent reference. Do not assert ±20–30% accuracy without measured evidence.
Injected-frame browser automation is optional, not an M1 requirement.

## Current local evidence

- Node unit/adapter suite: 57 tests passed after final review fixes (0 failures/skips). Includes a constant-frame rounding regression.
- Production Vite build passed.
- Browser plugin unavailable; Playwright with installed Chromium checked
  320/375/390/430 px mobile widths and 1280 px desktop, both themes, and no
  page errors or horizontal overflow.
- Optional browser integration used a canvas-backed synthetic camera only in
  the temporary QA browser context. Import preview/cancel/confirm, export,
  reload, sample Delete/Undo, mode separation, stable capture, unstable-light
  rejection, clipping/Near limit/stale-frame guards and crop diagnostics passed.
  Those synthetic frames and sample fixtures are not included in the app build.
- No physical iPhone/Safari sensor, actual iOS Files or reference-meter results
  have been observed. Netlify publication remains pending account access/manual
  upload. Software QA cannot substitute for these checks.

## Final review regressions

Regression checks also cover partial imports retaining unrelated camera-mismatch
protection, preserving unsupported/corrupt saved data on later ordinary saves,
quota failures never claiming Saved, interruption events requiring a fresh tap,
and blocking sample entry until the current image is usable and fresh. Nonfatal
outlier flags survive reload/import; diagnostics age and show frame gaps; actual
sample dimensions and document timestamps survive JSON roundtrips.

If existing saved data is unreadable or from another version, the app preserves
it and does not overwrite it with ordinary edits. New work stays in memory:
export a backup before closing. Do not clear original site data until you have
backed it up and decided it is safe to replace; there is no automatic migration.

## Review decisions

- Worked in the existing isolated cloud checkout on `work`; no worktree, merge
  or push was created. Remote skill helper scripts were unavailable as local
  executables, so a local per-task ledger recorded RED/GREEN and commit evidence.
  This changes bookkeeping only.
- The review's three lower-severity gaps were treated as functional work:
  persistent sample flags, elapsed-time debug gaps and capture/export metadata
  were fixed in the same regression pass. No review issues were deferred.
- Fit-result promotion remains synchronous for the currently selected mode;
  there is no reachable asynchronous fit-result race. A future asynchronous
  worker must validate mode/setup again before promotion.
- Software gates do not establish physical authenticity of imported measurements,
  camera metadata synchronization, extreme-input accuracy or real lux accuracy.
  Finite/version/quality gates and same-setup import confirmation remain active;
  the physical reference/device checklist is still required.
- Netlify and physical-device assertions remain pending. The user selected new
  site/manual upload, so the release artifact is concrete but no URL is claimed.
