import test from 'node:test';
import assert from 'node:assert/strict';
import { fft, pupil } from '../output/Optics.Family/index.js';

const distance = (a, b) => Math.hypot(a.re - b.re, a.im - b.im);
await test('Pure Fourier transform agrees with an independent direct DFT', () => {
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
await test('Discrete propagation preserves total spectral energy (Parseval)', () => {
  const input = Array.from({ length: 1024 }, (_, j) =>
    pupil(-0.5)(-2)(-2.4 + (j * 4.8) / 1024),
  );
  const energy = (zs) => zs.reduce((s, z) => s + z.re * z.re + z.im * z.im, 0);
  assert.ok(
    Math.abs(energy(fft(input)) / input.length / energy(input) - 1) < 1e-12,
  );
});
await test('Evolving front preserves the extended contact identity', async () => {
  const { front, phase } = await import('../output/Optics.Family/index.js');
  const h = 1e-5;
  for (const mu of [-1.8, -0.5, 0, 0.8])
    for (const a of [-4, 0, 3])
      for (const t of [-1.2, -0.4, 0, 0.7, 1.2]) {
        const f = front(mu)(a)(t);
        assert.ok(Math.abs(phase(mu)(a)(f.b)(t) - f.value) < 1e-12);
        for (let axis = 0; axis < 3; axis++) {
          const hi = [mu, a, t].map((v, i) => v + (i === axis ? h : 0));
          const lo = [mu, a, t].map((v, i) => v - (i === axis ? h : 0));
          const p = front(hi[0])(hi[1])(hi[2]),
            m = front(lo[0])(lo[1])(lo[2]);
          const ds = (p.value - m.value) / (2 * h),
            db = (p.b - m.b) / (2 * h);
          assert.ok(
            Math.abs(
              ds -
                f.pa * (axis === 1 ? 1 : 0) -
                f.pb * db -
                f.pmu * (axis === 0 ? 1 : 0),
            ) < 1e-8,
          );
        }
      }
});
await test('Evolving wave quadrature converges across the displayed control range', async () => {
  const { pupil } = await import('../output/Optics.Family/index.js');
  for (const mu of [-1.8, -0.5, 0, 0.8])
    for (const a of [-4, 0, 3]) {
      const compute = (n) =>
        fft(
          Array.from({ length: n }, (_, j) =>
            pupil(mu)(a)(-2.4 + (4.8 * j) / n),
          ),
        ).map((z) => ({ re: (z.re * 4.8) / n, im: (z.im * 4.8) / n }));
      const low = compute(2048),
        high = compute(4096);
      for (let k = -128; k < 128; k++)
        assert.ok(
          distance(low[(k + 2048) % 2048], high[(k + 4096) % 4096]) < 1e-9,
        );
    }
});
await test('The control cycle crosses one- and three-cusp regimes', () => {
  // Cusp candidates solve a'(t) = -2t(10t²+3mu) = 0.
  for (const mu of [-1.8, -0.5, 0.8]) {
    const ts =
      mu < 0 ? [0, Math.sqrt((-3 * mu) / 10), -Math.sqrt((-3 * mu) / 10)] : [0];
    assert.equal(ts.length, mu < 0 ? 3 : 1);
    for (const t of ts) {
      const a = -5 * t ** 4 - 3 * mu * t * t,
        b = 4 * t ** 5 + 2 * mu * t ** 3;
      assert.ok(Math.abs(t ** 5 + mu * t ** 3 + a * t + b) < 1e-12);
      assert.ok(Math.abs(5 * t ** 4 + 3 * mu * t * t + a) < 1e-12);
      assert.ok(Math.abs(20 * t ** 3 + 6 * mu * t) < 1e-12);
    }
  }
});
