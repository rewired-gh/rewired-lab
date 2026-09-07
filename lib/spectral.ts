import source from './spectral.wgsl?raw';
export const spectralSize = { width: 256, height: 128 };
export async function createSpectralField(
  device: GPUDevice,
  uniform: GPUBuffer,
) {
  const texture = device.createTexture({
    size: [spectralSize.width, spectralSize.height],
    format: 'rg32float',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.COPY_SRC,
  });
  const module = device.createShaderModule({ code: source });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === 'error');
  if (errors.length) throw new Error(errors.map((m) => m.message).join('\n'));
  const pipeline = await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module, entryPoint: 'compute' },
  });
  const group = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniform } },
      { binding: 1, resource: texture.createView() },
    ],
  });
  return {
    texture,
    encode(encoder: GPUCommandEncoder) {
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(spectralSize.height);
      pass.end();
    },
  };
}
