import { mkdir, writeFile } from 'node:fs/promises';
import { fft, pupil } from '../output/Optics.Cusp/index.js';

const samples = 8192,
  halfWidth = 3.5,
  frequency = 90;
const width = 768,
  height = 1024,
  aMin = -4.4,
  aMax = 1.2;
const step = (2 * halfWidth) / samples;
const bStep = Math.PI / (halfWidth * frequency);
const field = new Float32Array(width * height * 2);
for (let y = 0; y < height; y++) {
  const a = aMin + ((aMax - aMin) * y) / (height - 1);
  const input = Array.from({ length: samples }, (_, j) =>
    pupil(frequency)(a)(-halfWidth + j * step),
  );
  const output = fft(input);
  for (let x = 0; x < width; x++) {
    const k = x - width / 2;
    const z = output[(k + samples) % samples];
    const scale = step * (k % 2 === 0 ? 1 : -1);
    const offset = 2 * (y * width + x);
    field[offset] = z.re * scale;
    field[offset + 1] = z.im * scale;
  }
}
await mkdir('.build', { recursive: true });
await writeFile('.build/optics.bin', Buffer.from(field.buffer));
await writeFile(
  '.build/optics.json',
  JSON.stringify({
    width,
    height,
    aMin,
    aMax,
    bMin: (-width / 2) * bStep,
    bStep,
    frequency,
    samples,
    halfWidth,
  }),
);
console.log(`Cusp atlas: ${width} × ${height}, ${field.byteLength} bytes`);
