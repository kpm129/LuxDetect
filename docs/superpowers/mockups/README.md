# LuxDetect static mockups

Open **[index.html](index.html)** for the full review. It is one self-contained
HTML file with inline CSS and an inline setup illustration. No installation,
external fonts, internet requests, JavaScript, or application code is required.

To review over HTTPS on your iPhone, this directory can be uploaded as a static
site using Netlify's manual deployment. No deployment has been made by this task.
Screenshots are also provided for direct image review:

- [Setup guide and stopped camera](setup-overview.png)
- [Reading states, including saturation](readings-overview.png)
- [Calibration samples, success and failure](calibration-overview.png)
- [Expanded debug panel](debug-overview.png)
- [Light reading screen](reading-light.png)
- [Dark reading screen](reading-dark.png)

The [generated concept board](concept-board.png) records the initial visual
direction. The HTML and its screenshots are the detailed proposal for feedback;
they correct the concept image's illustrative sample-table content and replace
the imaginary sky preview behind a diffuser with an explicit placeholder.

Only the theme checkbox, section links, mode-selection styling, source dropdown,
and Debug disclosure operate. Mode selection does not load data in these static
mockups. Camera, sampling, fitting, persistence, deletion/Undo, import/export and
copy-debug controls are static examples.
Every measurement, fit statistic, date and progress indicator is illustrative.

Checked using Playwright with Chromium (Browser plugin unavailable): desktop at
1280 px, mobile widths 320/375/390/430 px, overflow, theme switching, disclosure,
navigation, mode selection, source selection, no scripts, and inert measurement controls. No
iPhone/Safari, camera, calibration accuracy, or sunlight readability validation
has been performed. The proposed [design spec](../specs/2026-11-08-luxdetect-design.md)
is written and awaiting approval; no implementation plan or product logic has
been written.

The revised proposal includes separate per-mode persistence, import beside
export, auto-exposure warnings on the reading screen, unstable-sample rejection,
Near limit clipping warnings, Undo, and the expanded debug diagnostics. Screen E
omits the category outside the range; screen F says “Too bright – no reading”.
The 12,480 lx example is correctly labelled Shade under the approved boundaries.

Please review the updated mockups and design spec before writing-plans.
