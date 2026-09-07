# Rewired Lab

A sculptural identity page for [rewired.ac.cn](https://rewired.ac.cn/). The supplied name is the only identity claim. Two methodological sources open through a native References popover.

## Run

Node 22.13+. Run `npm ci`, `npm run setup`, then `npm run dev`. `npm run build` compiles the PureScript core, generates the surface mesh and vector poster, and emits static assets into `dist`. `npm run preview` serves that exact build.

## Deployment

Public source: [rewired-gh/rewired-lab](https://github.com/rewired-gh/rewired-lab).
Cloudflare Pages project: `rewired-lab-site`, production branch: `main`, output: `dist`.
The native GitHub integration builds each push with `npm ci && npm run build:ci`.
`build:ci` installs the locked PureScript dependencies, runs the geometry tests,
checks TypeScript and lint, then produces the static site. Failed builds do not
replace the last successful deployment. Preview branches receive separate URLs.
Cloudflare sets `SKIP_DEPENDENCY_INSTALL=true` so dependency installation runs
once through `npm ci`; `.node-version` selects Node 22.
Credentials, dependency caches, and generated output are excluded from Git.

## Geometry and rendering

The build-time PureScript core defines rings of complex numbers and first-order complex jets. The product rule propagates analytic derivatives through the same polynomial that defines the immersion. For z = u + iv, the holomorphic curve is W = (z − z⁵/5, i(z + z⁵/5), 2z³/3). The rendered surface is Re(exp(iθ) W), restricted to a disk. Its associate phase preserves the first fundamental form. This homogeneous generalized Enneper family is congruent under domain reparameterization and ambient rotation; the animation is not evidence of a noncongruent isometric deformation. The surface is a minimal immersion; embeddedness is not asserted.

WebGPU renders 24,384 triangles with depth testing and 4× multisampling. An analytic studio environment, a GGX highlight, and a three-band Airy approximation produce the material. Parameter-space engravings use screen-space derivatives for filtering. Pointer motion changes orientation; the slow associate phase and orientation motion remain optional.

This is an original art direction built from established mathematics. The appearance model is an artistic RGB approximation, not full spectral transport, trained neural rendering, a complete implementation of the cited iridescence paper, or a claimed research breakthrough.

The runtime uses native HTML/CSS, a small TypeScript effect boundary, WGSL, and a precomputed binary mesh. No framework hydration, tracking, external fonts, or remote visual assets. Background-priority initialization uses the Task Scheduling API where available. The native popover needs no custom dialog code.

Motion respects reduced-motion preferences, pause controls, page visibility, and viewport intersection. GPU loss releases resources and restores the shaded vector poster. Devices without WebGPU see that static poster. Pixel density is bounded at 1.75; the mesh uses 16-bit indices. Existing Cloudflare protection can inject managed scripts and robots.txt rules; the application module carries the Rocket Loader exemption.

## Checks

`npm test` independently checks analytic derivatives against central differences, regularity and conformality, preservation of the first fundamental form, and a finite-difference Laplacian. `npm run typecheck`, `npm run lint`, and `npm run build` validate integration. Visual review checks material, motion, text separation, narrow viewports, and the citations panel.

The previous particle renderer, transport solver, worker, tests, and study artifact were retired together. They no longer describe this implementation.

## Sources

- Matthias Weber, [Classical Minimal Surfaces in Euclidean Space](https://www.math.uci.edu/~vmm/Surface/Minimal_Surfaces_2011_Matthias_Weber.pdf): Weierstrass representation and associate families.
- Laurent Belcour and Pascal Barla, [A Practical Extension to Microfacet Theory for the Modeling of Varying Iridescence](https://belcour.github.io/blog/research/publication/2017/05/01/brdf-thin-film.html), SIGGRAPH 2017: thin-film appearance. Our simpler three-band model does not reproduce their spectral antialiasing method.

North Star: perceptual clarity, mathematical integrity, expressive restraint. The visual result should reward attention before its implementation is explained.
