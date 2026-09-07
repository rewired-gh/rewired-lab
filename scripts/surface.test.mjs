import test from 'node:test';
import assert from 'node:assert/strict';
import { sample } from '../output/Geometry.Associate/index.js';
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const points = Array.from({ length: 81 }, (_, i) => [
  -1 + (i % 9) / 4,
  -1 + Math.floor(i / 9) / 4,
]);
test('Complex jets agree with independent central differences', () => {
  const h = 1e-5;
  for (const [u, v] of points) {
    const s = sample(u)(v),
      xp = sample(u + h)(v),
      xm = sample(u - h)(v),
      yp = sample(u)(v + h),
      ym = sample(u)(v - h);
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(s[i].du - (xp[i].re - xm[i].re) / (2 * h)) < 1e-7);
      assert.ok(Math.abs(s[i].dv - (yp[i].re - ym[i].re) / (2 * h)) < 1e-7);
    }
  }
});
test('Immersion is regular and conformal across the parameter domain', () => {
  for (const [u, v] of points) {
    const s = sample(u)(v),
      a = s.map((x) => x.du),
      b = s.map((x) => x.dv);
    assert.ok(dot(a, a) > 0.99);
    assert.ok(Math.abs(dot(a, b)) < 1e-10);
    assert.ok(Math.abs(dot(a, a) - dot(b, b)) < 1e-10);
  }
});
test('Associate phase preserves the first fundamental form', () => {
  for (const [u, v] of points) {
    const s = sample(u)(v),
      a = s.map((x) => x.du),
      b = s.map((x) => x.dv);
    for (const phase of [-0.24, 0, 0.24, 1.2]) {
      const du = a.map((x, i) => x * Math.cos(phase) + b[i] * Math.sin(phase)),
        dv = b.map((x, i) => x * Math.cos(phase) - a[i] * Math.sin(phase));
      assert.ok(Math.abs(dot(a, a) - dot(du, du)) < 1e-10);
      assert.ok(Math.abs(dot(a, b) - dot(du, dv)) < 1e-10);
    }
  }
});
test('Coordinate functions are harmonic under an independent finite-difference Laplacian', () => {
  const h = 1e-3;
  for (const [u, v] of points) {
    const s = sample(u)(v),
      neighbors = [
        sample(u + h)(v),
        sample(u - h)(v),
        sample(u)(v + h),
        sample(u)(v - h),
      ];
    for (let i = 0; i < 3; i++)
      assert.ok(
        Math.abs(
          (neighbors.reduce((a, x) => a + x[i].re, 0) - 4 * s[i].re) / (h * h),
        ) < 1e-5,
      );
  }
});
