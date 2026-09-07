# Construction and verification

This is an evolving computational composition. It implements established
singularity theory and finite-aperture scalar diffraction. It does **not** claim
a new theorem, a new wave-optics method, or research-frontier performance.

## One family, two representations

The generating family is

\[
S(t;\mu,a,b)=t^6/6+\mu t^4/4+a t^2/2+bt.
\]

It is a three-control slice of the degree-six cuspoid family, with its cubic
coefficient fixed at zero. It is not a full miniversal unfolding. The cycle
\(\mu(\tau)=-0.5+1.3\sin(0.35\tau)\) changes the generating family, not just the
camera. This parameter path is an artistic choice, not a physical time-evolution
law for an electromagnetic field.

Stationarity gives \(t^5+\mu t^3+at+b=0\). The rendered critical-value front is
parameterized by \((a,t)\):

\[
b=-t^5-\mu t^3-at,\qquad
s=-5t^6/6-3\mu t^4/4-at^2/2.
\]

The caustic in the control plane has
\(a=-5t^4-3\mu t^2\), \(b=4t^5+2\mu t^3\).
Its cusp candidates satisfy \(t(10t^2+3\mu)=0\): three real candidates when
\(\mu<0\), one when \(\mu>0\), and a higher degeneracy at zero.
This provides an observable change in singular structure during the cycle.

## Contact identity

Set \(p_a=t^2/2\), \(p_b=t\), and \(p_\mu=t^4/4\).
On the critical set, the chain rule and \(S_t=0\) give exactly

\[
ds=p_a\,da+p_b\,db+p_\mu\,d\mu.
\]

For fixed \(\mu\), the lift into the first jet space is Legendrian. It is regular
because \((a,p_b)=(a,t)\) supplies independent coordinates, even where its front
projection is singular. Forgetting \(s\) yields an exact Lagrangian immersion.
The numerical tests check the implementation against this algebraic derivation;
they are not a proof by sampling.

Two invertible triangular chart shears, \(A=a+0.22b^2\) and
\(B=b+0.035A^2\), set the composition. Their Jacobian determinant is one.
The displayed coordinates are scaled and rotated \((A,B,s)\). Shader normals
include the chart derivatives and use the limiting tangent plane obtained by
factoring the vanishing derivative at a cuspidal edge.

## Live wave calculation

Every rendered frame computes

\[
U(\mu,a,b)=\int_{-2.4}^{2.4}
e^{-(t/1.3)^8}e^{30iS(t;\mu,a,b)}\,dt.
\]

The finite smooth aperture is part of the model. This is not the unwindowed
canonical integral. A WebGPU compute workgroup evaluates each row with a
2,048-point positive-sign radix-2 FFT. Each workgroup uses 256 lanes and 16 KiB of
shared storage. Disjoint butterflies and a barrier between stages prevent
cross-stage read/write races. Both the integration step and the phase from the
shifted sampling origin are included.

The output is a 256 × 128 complex `rg32float` texture, recomputed before the
surface draw in the same command encoder. Geometry and diffraction use the same
uniform parameter. There is no downloaded or precomputed wave atlas.
The sampled interval is \(-4\le a\le3\), with
\(b_k=k\pi/(2.4\cdot30)\), \(-128\le k<128\).

Intensity modulates the surface inside the atlas domain. Fine engraved lines
are a separate artistic coordinate foliation, not diffraction fringes. Their
six-harmonic Fourier expansion is filtered with a Gaussian pixel-footprint
approximation. Studio lighting, fold highlights, edge fading, and color mapping
are artistic transfer functions, not measured optical material properties.
The surface is not a physically fabricated object.

## Reproducible checks

Run `npm run build:ci` for the CPU checks and production build.
For the independent GPU comparison, run `npm run dev`, then open
`/scripts/validate-gpu.html`. This developer page is not a production build entry.
It reads the computed texture back and compares complex amplitudes with the
separate PureScript FFT implementation.

The CPU suite checks direct-DFT agreement, Parseval's identity, the extended
contact identity, the cusp regimes, and quadrature convergence when doubling
2,048 to 4,096 samples at twelve parameter combinations across the rendered range.
The asserted quadrature tolerance is \(10^{-9}\).

The GPU check covers 5,120 complex values at four values of \(\mu\) and five
control rows, including the range boundaries. On the development browser GPU,
the maximum absolute complex-amplitude discrepancy was
\(1.31\times10^{-6}\), below the preset \(2\times10^{-4}\) tolerance.
This is a measured sample result, not a uniform bound across devices or controls.
Texture interpolation and the finite surface mesh add errors not bounded by that
comparison. No scientific reference-table accuracy is claimed.

Motion verification compares separated rendered frames and checks that pause
holds the frame. Reduced-motion preferences start the renderer paused. If GPU
initialization stalls, the page offers a Start animation control to retry; a
captured frame remains visible. Leaving the page releases the GPU device.

## Research context and limits

The previous composition used a fixed quartic front, a precomputed atlas and
barely perceptible camera drift. Those choices did not satisfy visible dynamism.
The new version changes the singular structure and recalculates the wave field.
This is an implementation improvement, not evidence of a research contribution.

Contemporary work such as Zeng et al., _Designing and Fabricating Color BRDFs with
Differentiable Wave Optics_ (SIGGRAPH Asia 2025), couples optical simulation,
optimization, and physical fabrication validation. This website does not
reproduce that work or claim comparable scope. See the
[authors' project](https://vclab.kaist.ac.kr/siggraphasia2025p1/index.html).
A genuine research claim would need a specific unsolved problem, a new result,
reproducible baselines, and evidence beyond an attractive rendering.

## Mathematical references

1. M. V. Berry and C. Upstill (1980), “Catastrophe optics: morphologies of caustics
   and their diffraction patterns,” _Progress in Optics_, **18**, 257–346.
   [DOI](<https://doi.org/10.1016/S0079-6638(08)70215-4>).
2. NIST Digital Library of Mathematical Functions, §36.2,
   [“Catastrophes and Canonical Integrals”](https://dlmf.nist.gov/36.2).
