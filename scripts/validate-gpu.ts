import { createSpectralField, spectralSize } from '../lib/spectral';
import { fft, pupil } from '../output/Optics.Family/index.js';
const report = document.querySelector('pre')!;
async function validate() {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error('GPU unavailable');
  const device = await adapter.requestDevice();
  try {
    const uniform = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const field = await createSpectralField(device, uniform);
    const bytesPerRow = spectralSize.width * 8;
    const readback = device.createBuffer({
      size: bytesPerRow * spectralSize.height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    let maximum = 0,
      samples = 0;
    for (const mu of [-1.8, -0.5, 0, 0.8]) {
      device.queue.writeBuffer(
        uniform,
        0,
        new Float32Array([1280, 720, 0, mu, 0, 0, 0, 0]),
      );
      const encoder = device.createCommandEncoder();
      field.encode(encoder);
      encoder.copyTextureToBuffer(
        { texture: field.texture },
        { buffer: readback, bytesPerRow },
        [spectralSize.width, spectralSize.height],
      );
      device.queue.submit([encoder.finish()]);
      await readback.mapAsync(GPUMapMode.READ);
      const gpu = new Float32Array(readback.getMappedRange());
      for (const row of [0, 32, 64, 96, 127]) {
        const a = -4 + (7 * row) / 127;
        const cpu = fft(
          Array.from({ length: 2048 }, (_, j) =>
            pupil(mu)(a)(-2.4 + (4.8 * j) / 2048),
          ),
        );
        for (let x = 0; x < 256; x++) {
          const k = x - 128,
            z = cpu[(k + 2048) % 2048],
            scale = (4.8 / 2048) * (x % 2 ? -1 : 1);
          const offset = 2 * (row * 256 + x);
          maximum = Math.max(
            maximum,
            Math.hypot(
              gpu[offset] - z.re * scale,
              gpu[offset + 1] - z.im * scale,
            ),
          );
          samples++;
        }
      }
      readback.unmap();
    }
    if (maximum > 2e-4) throw Error(`GPU discrepancy ${maximum}`);
    report.textContent = JSON.stringify(
      {
        status: 'passed',
        samples,
        maximumAbsoluteComplexError: maximum,
        tolerance: 2e-4,
      },
      null,
      2,
    );
    field.texture.destroy();
    uniform.destroy();
    readback.destroy();
  } finally {
    device.destroy();
  }
}
validate().catch((error) => {
  report.textContent = 'FAILED: ' + error;
  console.error(error);
});
