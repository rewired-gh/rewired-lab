# Rewired Lab

Source for [rewired.ac.cn](https://rewired.ac.cn).

A quiet identity page with an interactive optical front. Its evolving geometry and live finite-aperture diffraction field share one generating family. The implementation uses PureScript for the mathematical core and Fourier transform, TypeScript for browser effects, and native WebGPU/WGSL for both Fourier computation and rendering.

## Development

Use Node 22.13 or later.

```sh
npm ci
npm run setup
npm run dev
```

`npm run build:ci` installs locked PureScript dependencies, runs numerical tests, checks TypeScript and lint, and builds the static site. `npm run preview` serves the production build.

## Construction

[Derivation, numerical checks, and rendering limits](docs/construction.md).

The mathematics is established. This project does not claim a new theorem, physical discovery, or rendering research contribution. The name and domain are the only supplied identity information.

## Deployment

Public repository: [rewired-gh/rewired-lab](https://github.com/rewired-gh/rewired-lab).

Cloudflare Pages project **rewired-lab-site** connects directly to this repository. Pushes to **main** trigger production builds; other branches receive preview deployments. Build command: `npm ci && npm run build:ci`. Output directory: `dist`. `.node-version` selects Node 22. Cloudflare sets `SKIP_DEPENDENCY_INSTALL=true` to make `npm ci` the single dependency installation step.

A failing build does not replace the last successful deployment. The application module carries `data-cfasync="false"` because the custom domain has Cloudflare Rocket Loader enabled.

Credentials and local caches are excluded from Git. Dependencies are pinned in `package-lock.json` and `spago.lock`.
