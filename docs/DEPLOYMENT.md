# Deploy LuxDetect to Netlify

The site is entirely static: no backend, API keys or environment secrets.

## Build

Use Node 20.19+ in the Node 20 series. From the repository root:

```sh
npm ci
npm test
npm run build
```

The deployable site is the **contents of `dist/`**, not the source repository.
Netlify Git-connected builds use `netlify.toml`: `npm run build`, publish `dist`,
Node 20. Node 20.19+ is required by the pinned Vite version. The npm lockfile is
committed so `npm ci` installs the same dependency versions.

## First HTTPS test on iPhone

1. Sign in to your Netlify account and choose a manual deployment / drag-and-drop
   deployment. Upload the built `dist` folder (or unzip the supplied deployment ZIP and upload its extracted folder).
2. Open the resulting `https://…netlify.app` address in iPhone Safari.
3. Follow [the test checklist](TESTING.md). Camera access starts only after a tap.

Use the same site address for updates: localStorage belongs to that origin.
A different site/browser or cleared site data will not share calibration.

## Deployment evidence

- Deployment URL: **pending**.
- Netlify access: no connected deployment tool, Netlify environment credential
  binding or saved Netlify CLI login was present during initial setup.
- Real iPhone camera/Files/lux-reference checks: **pending user device testing**.

A local build or desktop screenshot does not establish Netlify publication or
iPhone camera behavior. Supply credentials only through secure environment
settings if using a CLI/API deployment; never paste a token into chat.

## Selected release route

Use GitHub repository `kpm129/LuxDetect`, branch `main`, as the deployment source:
in Netlify choose **Import from Git**, connect that repository, and deploy its
`main` branch. `netlify.toml` supplies the build command, publish directory and
Node 20 version. `package-lock.json` is committed and the build uses `npm ci`.

This replaces the earlier ZIP/manual-upload route because the cloud ZIP could
not be downloaded. The manual instructions above remain an optional alternative.
Send the resulting HTTPS URL for remote checks; the physical Safari checklist
still needs the actual phone.
