import shader from './front.wgsl?raw';
import dataURL from '../.build/optics.bin?url';
import atlas from '../.build/optics.json';

export async function createOptics(
  canvas: HTMLCanvasElement,
  initiallyPaused: boolean,
) {
  canvas.dataset.renderer = 'requesting-adapter';
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: 'high-performance',
  });
  if (!adapter) {
    canvas.dataset.renderer = 'unavailable';
    return null;
  }
  canvas.dataset.renderer = 'requesting-device';
  const device = await adapter.requestDevice();
  try {
    const context = canvas.getContext('webgpu');
    if (!context) {
      device.destroy();
      return null;
    }
    canvas.dataset.renderer = 'loading-atlas';
    const response = await fetch(dataURL);
    if (!response.ok) throw new Error('Optical atlas unavailable');
    const data = await response.arrayBuffer();
    if (data.byteLength !== atlas.width * atlas.height * 8)
      throw new Error('Optical atlas size mismatch');
    const texture = device.createTexture({
      size: [atlas.width, atlas.height],
      format: 'rg32float',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture },
      data,
      { bytesPerRow: atlas.width * 8 },
      [atlas.width, atlas.height],
    );
    canvas.dataset.renderer = 'compiling';
    const module = device.createShaderModule({ code: shader });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === 'error');
    if (errors.length) throw new Error(errors.map((m) => m.message).join('\n'));
    const format = navigator.gpu.getPreferredCanvasFormat();
    const pipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
      multisample: { count: 4 },
    });
    const uniform = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniform } },
        { binding: 1, resource: texture.createView() },
      ],
    });
    context.configure({ device, format, alphaMode: 'opaque' });
    let paused = initiallyPaused,
      destroyed = false,
      raf = 0,
      last = 0,
      time = 0;
    let target = [0, 0],
      pointer = [0, 0];
    let depth: GPUTexture, color: GPUTexture;
    const values = new Float32Array(8);
    const draw = () => {
      if (destroyed || !depth) return;
      values.set([canvas.width, canvas.height, time, 1, ...pointer, 0, 0]);
      device.queue.writeBuffer(uniform, 0, values);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: color.createView(),
            resolveTarget: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            clearValue: { r: 0.943, g: 0.923, b: 0.884, a: 1 },
            storeOp: 'discard',
          },
        ],
        depthStencilAttachment: {
          view: depth.createView(),
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'discard',
        },
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.draw(96 * 1024 * 6);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };
    const frame = (now: number) => {
      raf = 0;
      if (destroyed || paused || document.hidden) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      const t = 1 - Math.exp(-dt * 2.3);
      pointer = pointer.map((p, i) => p + (target[i] - p) * t);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };
    const start = () => {
      if (!paused && !destroyed && !document.hidden && !raf)
        raf = requestAnimationFrame(frame);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      depth?.destroy();
      color?.destroy();
      depth = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        sampleCount: 4,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      color = device.createTexture({
        size: [canvas.width, canvas.height],
        format,
        sampleCount: 4,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      draw();
    };
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target = [
        ((e.clientX - r.left) / r.width) * 2 - 1,
        ((e.clientY - r.top) / r.height) * 2 - 1,
      ];
    };
    const leave = () => {
      target = [0, 0];
    };
    const visibility = () => (document.hidden ? stop() : start());
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility);
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      stop();
      observer.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
      depth?.destroy();
      color?.destroy();
      texture.destroy();
      uniform.destroy();
      device.destroy();
    };
    void device.lost.then(() => {
      if (!destroyed) {
        destroy();
        canvas.classList.remove('ready');
        canvas.dataset.renderer = 'device-lost';
        const b = document.querySelector<HTMLButtonElement>('.motion-button');
        if (b) b.hidden = true;
      }
    });
    resize();
    start();
    canvas.dataset.renderer = 'ready';
    return {
      pause(value: boolean) {
        paused = value;
        if (paused) stop();
        else start();
      },
      destroy,
    };
  } catch (error) {
    canvas.dataset.renderer = 'failed';
    device.destroy();
    console.error(error);
    return null;
  }
}
