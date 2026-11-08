# Deploy LuxDetect to Netlify

The site is entirely static: no backend, API keys or environment secrets.

## Build

Use Node 24. From the repository root:

```sh
npm ci
npm test
npm run build
```

The deployable site is the **contents of `dist/`**, not the source repository.
Netlify Git-connected builds use `netlify.toml`: `npm run build`, publish `dist`,
Node 24. No push to a shared branch is necessary for a manual deployment.

## First HTTPS test on iPhone

1. Sign in to your Netlify account and choose a manual deployment / drag-and-drop
   deployment. Upload the built `dist` folder (or the supplied deployment ZIP).
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
