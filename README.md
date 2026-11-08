# LuxDetect

> The v1 web app is now implemented. Netlify publication and physical iPhone
> verification are still pending; a local build is not proof of camera accuracy.

Estimate sky illumination with a rear-camera image and independent calibration.
The primary target is iPhone Safari. Without a valid calibration, the app shows
**Relative brightness (uncalibrated)**, never a made-up lux value.

## Run the app

Install Node 24, then run these commands in this repository:

```sh
npm ci
npm run dev
```

The terminal prints the local development address. For a phone test, deploy
over HTTPS—an HTTP address on another computer does not enable Safari camera
access. See [Netlify deployment](docs/DEPLOYMENT.md).

```sh
npm test        # mandatory pure math, state, storage and camera-adapter tests
npm run build  # static site in dist/
npm run preview
```

## First reading

1. Cover the rear lens with a translucent white diffuser and hold the phone
   level, facing up with the screen down. Keep the sun out of the frame.
2. Open the HTTPS site in Safari and tap **Start camera**. The app does not
   request access or start recording on page load. Stop/background ends access.
3. Use the same lens, diffuser and angle for readings and calibration.

**Sky + diffuser** measures the center 40%×40% of the video. The secondary
**Sky – no diffuser** mode uses 25%×25% and its own calibration. A homemade
diffuser is approximate; the app is not a certified incident-light meter.

## Calibrate

Place a handheld lux meter level beside the phone. Enter its lux reading,
select the reference source, and tap **Save sample** for a two-second average.
Changing light rejects the capture. An Android ambient-light-sensor app may
provide a rough reference; an iPhone camera-based app is not independent.

Collect at least four usable light levels with a 10× reference-lux span. The
camera brightness must span at least 1.5×, with four distinguishable groups.
The pure calibration module fits `lux = a × brightness^b` in log10 space.
Good requires R² ≥0.9; Fair requires ≥0.8, and all-rough references cap at Fair.
Poor fits, reversed trends, noisy/clustered data and severe outliers fail.

Camera auto-exposure can flatten the signal even with a diffuser. Calibration
may correctly fail on a particular phone. Samples remain editable and a failed
attempt never replaces the last valid calibration. The app never promises a
specific accuracy percentage. Compare fresh held-out readings with your meter.

Valid estimates inside the calibrated range say **Estimated lux (calibrated)**.
Outside it, a `~` value says **Outside calibrated range** and has no light-level
category. More than 5% clipped pixels warns **Near limit**; more than 25% shows
**Too bright – no reading**, without a number.

## Your data

Both modes save independently in this browser's localStorage. Export a JSON
backup before clearing browser/site data, changing devices or changing site
address. Import validates the exact v1 schema, refits raw samples, previews the
result, and requires confirmation before replacement. There are no migrations.

No images, audio or video are stored or uploaded. No backend, accounts, API
keys or analytics are required. Debug shows camera/frame/crop statistics and
sample/fit data; exposure metadata is informational only. There is no live
scene-change detector or exposure-based lux calculation in v1.

## Design and verification

- [Approved design](docs/superpowers/specs/2026-11-08-luxdetect-design.md)
- [Milestone plan](docs/superpowers/plans/2026-11-08-luxdetect-v1.md)
- [Static visual mockups](docs/superpowers/mockups/index.html)
- [Device checklist and test limits](docs/TESTING.md)

---

The original project proposal is retained below as history. The approved design
and implementation above supersede its proposed exposure formula, support and
accuracy claims.

<details>
<summary>Original proposal (historical)</summary>

Estimate ambient light intensity (**lux**) using a mobile phone camera — tested first as a web link, native app later.

> Status: 🚧 Phase 1 – Web prototype (in development)

---

## 🎯 Goal

Build a simple, mobile-first web app that opens the phone's rear camera, analyses the live image and exposure data, and shows an **estimated lux reading** in real time.

## ✨ Planned Features (Phase 1 – Web)

- Live rear-camera feed (HTTPS required)
- Live lux estimate with smoothing (moving average)
- Light-level label: Dark / Indoor / Office / Daylight / Sunlight
- Capability panel – shows what the browser supports (exposure time, ISO, exposure lock)
- Fallback mode – "Relative brightness" when exposure data is unavailable (clearly labelled)
- Calibration screen – enter reference lux-meter readings to fit a device-specific constant
- Export calibration as JSON

## 🧮 How It Works

1. Capture frames from the rear camera via `getUserMedia`.
2. Read exposure settings (exposure time, ISO) where the browser supports them (best on Android Chrome).
3. Compute average luminance of a centre region of the frame.
4. Estimate lux:

   ```
   EV100 = log2(N² / t) + log2(100 / ISO)
   Lux   ≈ C × 2^EV100 × (pixel luminance ÷ mid-grey)
   ```

   - `N` = aperture (f-number), `t` = exposure time (s), `ISO` = sensor gain
   - `C` = calibration constant (starts ≈ 2.5, refined via calibration)

5. If exposure data is unavailable → show relative brightness only.

> ⚠️ Accuracy: expect roughly ±20–30% after calibration. Indicative use only — not a certified light meter.

## 🛠️ Tech Stack

- HTML, CSS, vanilla JavaScript (or Vite – lightweight)
- No backend, no API keys
- Unit tests for the lux math module
- Hosting: Netlify or GitHub Pages (HTTPS)

## 📁 Proposed Structure

```
luxdetect/
├── index.html
├── src/
│   ├── camera.js        # camera access & capabilities
│   ├── luminance.js     # frame → average luminance
│   ├── lux.js           # pure lux math (unit-tested)
│   ├── calibration.js   # fit & store constant C
│   └── ui.js            # display & labels
├── tests/
│   └── lux.test.js
├── docs/superpowers/    # specs & plans generated by Superpowers
└── README.md
```

## 🚀 Run Locally

```bash
npm install
npm run dev      # open the https/local URL on your phone
npm test         # run unit tests
```

> Camera access needs HTTPS (or localhost). Use the deployed link to test on a phone.

## 🌐 Deploy

1. Push to `main`.
2. Connect the repo to Netlify (or enable GitHub Pages).
3. Open the HTTPS link on your phone → allow camera access.

## 📱 Browser Support

| Browser | Camera | Exposure data | Mode |
|---|---|---|---|
| Android Chrome | ✅ | ✅ (most devices) | Lux estimate |
| iOS Safari | ✅ | ❌ limited | Relative brightness |
| Desktop | ✅ (webcam) | Varies | Testing only |

## 🧭 Development Workflow

Built with the **Superpowers** skills workflow:
brainstorming → spec → writing-plans → test-driven development → verification → deploy.

## 🗺️ Roadmap

- [ ] Phase 1 – Web prototype (lux estimate + fallback)
- [ ] Phase 2 – Calibration against reference lux meter
- [ ] Phase 3 – Native app (Flutter/Kotlin) using camera exposure + ambient light sensor

## 📄 License

MIT

</details>
