import { mkdir, writeFile } from 'node:fs/promises';
import { sample } from '../output/Geometry.Associate/index.js';
const radial = 64,
  angular = 192;
const vertices = [],
  indices = [];
for (let i = 0; i <= radial; i++)
  for (let j = 0; j <= angular; j++) {
    const r = (1.13 * i) / radial,
      theta = (2 * Math.PI * j) / angular;
    const u = r * Math.cos(theta),
      v = r * Math.sin(theta),
      s = sample(u)(v);
    const a = s.map((x) => x.re),
      b = s.map((x) => x.im),
      du = s.map((x) => x.du),
      dv = s.map((x) => x.dv);
    const n = [
      du[1] * dv[2] - du[2] * dv[1],
      du[2] * dv[0] - du[0] * dv[2],
      du[0] * dv[1] - du[1] * dv[0],
    ];
    const length = Math.hypot(...n);
    vertices.push(...a, ...b, ...n.map((x) => x / length), u, v);
    if (i < radial && j < angular) {
      const k = i * (angular + 1) + j;
      if (i > 0) indices.push(k, k + 1, k + angular + 1);
      indices.push(k + 1, k + angular + 2, k + angular + 1);
    }
  }
const header = new Uint32Array([vertices.length / 11, indices.length]);
const data = Buffer.concat([
  Buffer.from(header.buffer),
  Buffer.from(new Float32Array(vertices).buffer),
  Buffer.from(new Uint16Array(indices).buffer),
]);
await mkdir('.build', { recursive: true });
await writeFile('.build/surface.bin', data);
console.log(
  `${vertices.length / 11} vertices; ${indices.length / 3} triangles`,
);

// A lightweight, shaded vector poster keeps the composition available without GPU.
const turn = ([x, y, z]) => {
  const az = -0.24,
    ax = -0.58,
    ay = 0.32;
  const a = [
    x * Math.cos(az) - y * Math.sin(az),
    x * Math.sin(az) + y * Math.cos(az),
    z,
  ];
  const b = [
    a[0],
    a[1] * Math.cos(ax) - a[2] * Math.sin(ax),
    a[1] * Math.sin(ax) + a[2] * Math.cos(ax),
  ];
  return [
    b[0] * Math.cos(ay) + b[2] * Math.sin(ay),
    b[1],
    -b[0] * Math.sin(ay) + b[2] * Math.cos(ay),
  ];
};
const points = [];
const R = 32,
  A = 96;
const phase = 0.24 * Math.sin(0.55);
for (let i = 0; i <= R; i++)
  for (let j = 0; j <= A; j++) {
    const r = (1.13 * i) / R,
      t = (j / A) * Math.PI * 2,
      s = sample(r * Math.cos(t))(r * Math.sin(t));
    const p = turn(
      s.map((x) => x.re * Math.cos(phase) - x.im * Math.sin(phase)),
    );
    const du = s.map((x) => x.du),
      dv = s.map((x) => x.dv),
      n = turn([
        du[1] * dv[2] - du[2] * dv[1],
        du[2] * dv[0] - du[0] * dv[2],
        du[0] * dv[1] - du[1] * dv[0],
      ]);
    const norm = Math.hypot(...n);
    const light =
      0.22 + 0.65 * Math.abs(n[2] / norm) + 0.13 * Math.max(0, n[1] / norm);
    points.push({
      x: 500 + (p[0] * 960) / (3.65 - p[2]),
      y: 500 - (p[1] * 960 + 160) / (3.65 - p[2]),
      z: p[2],
      light,
    });
  }
const faces = [];
for (let i = 0; i < R; i++)
  for (let j = 0; j < A; j++) {
    const k = i * (A + 1) + j;
    for (const ids of [
      [k, k + 1, k + A + 1],
      [k + 1, k + A + 2, k + A + 1],
    ]) {
      const q = ids.map((i) => points[i]);
      const light = q.reduce((a, p) => a + p.light, 0) / 3;
      const rgb = [182, 173, 151].map((x) => Math.round(x * light));
      faces.push({
        z: q.reduce((a, p) => a + p.z, 0) / 3,
        path: `<path d="M${q.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join('L')}Z" fill="rgb(${rgb.join(',')})"/>`,
      });
    }
  }
await writeFile(
  '.build/surface.svg',
  faces
    .sort((a, b) => a.z - b.z)
    .map((x) => x.path)
    .join(''),
);
