# Construction

The composition joins two views of the same generating family. It is an artistic
rendering of established mathematics, not a claim of a new physical effect.

## Generating family and front

Let

\[
S(t;a,b)=\frac{t^4}{4}+\frac{a t^2}{2}+bt.
\]

Stationarity in the internal variable gives \(t^3+at+b=0\). Parameterizing this
critical set by \((a,t)\) yields

\[
b=-t^3-at,\qquad s=S|_{S_t=0}=-\frac34t^4-\frac12at^2.
\]

Before scaling and rotation, two triangular shears set the composition:
\(A=a+0.22b^2\), \(B=b+0.035A^2\). Their composition is invertible with
Jacobian determinant one. The displayed front uses \((A,B,s)\); its normals
include the chain rule for this coordinate change. The contact calculation
below is in the original \((a,b)\) chart.

The front is not an
embedded smooth surface everywhere. Its cuspidal edges occur when
\(a+3t^2=0\). Their projection into the control plane is
\((a,b)=(-3t^2,2t^3)\), satisfying \(4a^3+27b^2=0\).

In the first jet space of the control plane, augment the front with
\(p_a=t^2/2\) and \(p_b=t\). Direct differentiation gives

\[
ds=p_a\,da+p_b\,db.
\]

Thus the pullback of the contact form \(ds-p_a da-p_b db\) vanishes. The lift is
regular even where its front projection is singular: its \(a\) and \(p_b\)
coordinates are the independent parameters. Forgetting \(s\) gives an exact
Lagrangian immersion. These identities are algebraic; the finite-difference
tests provide a separate check of their implementation, not their proof.

## Wave field

The scalar field used in the surface appearance is

\[
U(a,b)=\int_{-3.5}^{3.5}
\exp[-(t/2)^8]\exp[90iS(t;a,b)]\,dt.
\]

The smooth finite aperture is part of this model. **This is not the unwindowed
canonical Pearcey integral.** The pupil amplitude at either integration endpoint
is below \(10^{-35}\). A positive-sign, unnormalised radix-2 Fourier transform
evaluates the sampled integral across the linear control parameter \(b\).
The phase associated with the shifted sampling origin and the integration step
are both included. PureScript represents complex numbers as a ring and implements
each butterfly stage as a pure array transformation.

The build samples 8,192 pupil points per row and creates a 768 × 1,024 complex
atlas. The control interval is \(-4.4\le a\le1.2\); the frequency spacing is
\(\Delta b=\pi/(3.5\cdot90)\). GPU sampling uses bilinear interpolation of
32-bit complex amplitudes. This adds interpolation and quantization errors beyond
the quadrature error tested below. The atlas is a rendering resource, not a
certified numerical table for arbitrary scientific calculations.

## Rendering choices

WebGPU generates the front procedurally from its parameter grid and uses depth
testing and four-sample multisampling. At a cuspidal edge the front's parameter
derivative degenerates; the shader uses the limiting tangent plane after factoring
out the vanishing scalar. The lighting does not assert smoothness across the front
singularity.

Fine lines are level sets of the linear parameter coordinate \(900t+90a\). Their derivative-based filter,
studio shading, highlighted folds, graphite palette, chromatic accents, and edge
fade are artistic transfer functions. They are not a spectral simulation,
measured material, physically computed shadow, or a photograph of an optical
experiment. The finite-aperture intensity modulates the appearance within the
atlas domain. Pointer movement changes the observer's view; the slow camera drift
can be paused. No claim of a changing physical wave solution is attached to the
camera motion.

The loading poster is a browser capture of this renderer. Devices without
WebGPU retain that frame. The poster is a raster asset, not an alternative
mathematical construction.

## Checks and ablation

The tests compare the pure FFT with an independently written direct DFT, check
Parseval's identity, double the quadrature resolution across the production
frequency range, check the pupil against its explicit definition, and verify
stationarity, the caustic discriminant, and the contact identity.

At the tested control rows, doubling the pupil sample count from 4,096 to 8,192
changes complex amplitudes by less than \(10^{-10}\), the asserted tolerance.
This does not bound GPU interpolation error or establish convergence everywhere.

Visual exploration compared a flat intensity field, a field with a coherent
reference wave, and the critical-value front. The flat views made the cusp readable
but produced a diagram-like composition. The front was retained for its depth and
layer separation. The reference-wave experiment was discarded; it is not part of
the deployed model. This was a design comparison, not a controlled audience study.

## Sources

1. T. Pearcey (1946), “The structure of an electromagnetic field in the neighbourhood
   of a cusp of a caustic,” _Philosophical Magazine_, series 7, **37**(268), 311–317.
   [doi:10.1080/14786444608561335](https://doi.org/10.1080/14786444608561335).
2. M. V. Berry and C. Upstill (1980), “Catastrophe optics: morphologies of caustics
   and their diffraction patterns,” _Progress in Optics_, **18**, 257–346.
   [doi:10.1016/S0079-6638(08)70215-4](<https://doi.org/10.1016/S0079-6638(08)70215-4>).

Canonical-integral conventions can also be checked against the
[NIST Digital Library of Mathematical Functions, §36.2](https://dlmf.nist.gov/36.2).
