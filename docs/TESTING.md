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
- [ ] Later milestones: collect a stable reference sample over two seconds;
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
