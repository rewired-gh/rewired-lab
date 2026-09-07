import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fft,
  pupil,
  aperture,
  phase,
  caustic,
  front,
} from '../output/Optics.Cusp/index.js';

const distance = (a, b) => Math.hypot(a.re - b.re, a.im - b.im);
test('Pure Fourier transform agrees with an independent direct DFT', () => {
  for (const n of [2, 8, 32, 128]) {
    const input = Array.from({ length: n }, (_, j) => ({
      re: Math.sin(j * 0.71),
      im: Math.cos(j * 0.31),
    }));
    const result = fft(input);
    for (let k = 0; k < n; k++) {
      const expected = input.reduce(
        (s, z, j) => {
          const angle = (2 * Math.PI * j * k) / n,
            c = Math.cos(angle),
            v = Math.sin(angle);
          return {
            re: s.re + z.re * c - z.im * v,
            im: s.im + z.re * v + z.im * c,
          };
        },
        { re: 0, im: 0 },
      );
      assert.ok(distance(result[k], expected) < 1e-10);
    }
  }
});
test('Discrete propagation preserves total spectral energy (Parseval)', () => {
  const input = Array.from({ length: 1024 }, (_, j) =>
    pupil(90)(-2)(-3.5 + (j * 7) / 1024),
  );
  const energy = (zs) => zs.reduce((s, z) => s + z.re * z.re + z.im * z.im, 0);
  assert.ok(
    Math.abs(energy(fft(input)) / input.length / energy(input) - 1) < 1e-12,
  );
});
test('Production frequency range converges when quadrature resolution doubles', () => {
  for (const a of [-4.4, -3, -1, 0, 1.2]) {
    const compute = (n) =>
      fft(
        Array.from({ length: n }, (_, j) => pupil(90)(a)(-3.5 + (j * 7) / n)),
      ).map((z) => ({ re: (z.re * 7) / n, im: (z.im * 7) / n }));
    const coarse = compute(4096),
      fine = compute(8192);
    for (let k = -384; k < 384; k++)
      assert.ok(
        distance(coarse[(k + 4096) % 4096], fine[(k + 8192) % 8192]) < 1e-10,
      );
  }
});
test('The sampled pupil follows the declared phase and finite aperture', () => {
  assert.ok(aperture(3.5) < 1e-35);
  for (const t of [-2, -0.6, 0, 0.6, 2]) {
    const z = pupil(90)(-0.7)(t),
      p = 90 * (t ** 4 / 4 - (0.7 * t * t) / 2);
    assert.ok(
      distance(z, {
        re: Math.exp(-((t / 2) ** 8)) * Math.cos(p),
        im: Math.exp(-((t / 2) ** 8)) * Math.sin(p),
      }) < 1e-13,
    );
    assert.equal(phase(-0.7)(0.2)(t), t ** 4 / 4 - (0.7 * t * t) / 2 + 0.2 * t);
  }
});
test('The caustic locus has coalescing stationary points', () => {
  for (const t of [-1.2, -0.5, 0, 0.5, 1.2]) {
    const { a, b } = caustic(t);
    assert.ok(Math.abs(t ** 3 + a * t + b) < 1e-14);
    assert.ok(Math.abs(3 * t * t + a) < 1e-14);
    assert.ok(Math.abs(4 * a ** 3 + 27 * b * b) < 1e-11);
  }
});

test('The critical-value surface satisfies the Legendrian contact identity', () => {
  const h = 1e-5;
  for (const a of [-4, -1, 0, 2])
    for (const t of [-1.3, -0.4, 0, 0.7, 1.5]) {
      const f = front(a)(t);
      assert.ok(Math.abs(phase(a)(f.b)(t) - f.value) < 1e-13);
      for (const axis of [0, 1]) {
        const plus = front(a + (axis === 0 ? h : 0))(t + (axis === 1 ? h : 0));
        const minus = front(a - (axis === 0 ? h : 0))(t - (axis === 1 ? h : 0));
        const ds = (plus.value - minus.value) / (2 * h),
          da = (plus.a - minus.a) / (2 * h),
          db = (plus.b - minus.b) / (2 * h);
        assert.ok(Math.abs(ds - f.pa * da - f.pb * db) < 1e-8);
      }
    }
});
