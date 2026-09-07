import shader from './sculpture.wgsl?raw';
import geometryURL from '../.build/surface.bin?url';
export async function createRenderer(
  canvas: HTMLCanvasElement,
  initialPaused: boolean,
) {
  if (!navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'low-power',
  });
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  try {
    const context = canvas.getContext('webgpu');
    if (!context) {
      device.destroy();
      return null;
    }
    let destroyed = false,
      paused = initialPaused,
      visible = true,
      raf = 0,
      last = 0,
      time = 0;
    let pointer = [0, 0],
      smooth = [0, 0];
    const response = await fetch(geometryURL);
    if (!response.ok) {
      device.destroy();
      return null;
    }
    const data = await response.arrayBuffer(),
      header = new Uint32Array(data, 0, 2);
    const vertices = new Float32Array(data, 8, header[0] * 11),
      indices = new Uint16Array(data, 8 + vertices.byteLength, header[1]);
    const module = device.createShaderModule({ code: shader });
    const info = await module.getCompilationInfo();
    if (info.messages.some((x) => x.type === 'error')) {
      device.destroy();
      return null;
    }
    const format = navigator.gpu.getPreferredCanvasFormat();
    const pipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vs',
        buffers: [
          {
            arrayStride: 44,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 12, format: 'float32x3' },
              { shaderLocation: 2, offset: 24, format: 'float32x3' },
              { shaderLocation: 3, offset: 36, format: 'float32x2' },
            ],
          },
        ],
      },
      fragment: { module, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
      multisample: { count: 4 },
    });
    const vb = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vb, 0, vertices);
    const ib = device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(ib, 0, indices);
    const ub = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: ub } }],
    });
    context.configure({ device, format, alphaMode: 'premultiplied' });
    let color: GPUTexture, depth: GPUTexture;
    const uniform = new Float32Array(4);
    const draw = () => {
      if (destroyed || !color) return;
      uniform.set([time, canvas.width / canvas.height, smooth[0], smooth[1]]);
      device.queue.writeBuffer(ub, 0, uniform);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: color.createView(),
            resolveTarget: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
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
      pass.setVertexBuffer(0, vb);
      pass.setIndexBuffer(ib, 'uint16');
      pass.drawIndexed(indices.length);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };
    const frame = (now: number) => {
      raf = 0;
      if (destroyed || paused || document.hidden || !visible) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      const t = 1 - Math.exp(-dt * 3);
      smooth = smooth.map((v, i) => v + (pointer[i] - v) * t);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };
    const start = () => {
      if (!destroyed && !paused && !document.hidden && visible && !raf)
        raf = requestAnimationFrame(frame);
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      color?.destroy();
      depth?.destroy();
      color = device.createTexture({
        size: [canvas.width, canvas.height],
        format,
        sampleCount: 4,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      depth = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        sampleCount: 4,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      draw();
    };
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer = [
        ((e.clientX - r.left) / r.width) * 2 - 1,
        ((e.clientY - r.top) / r.height) * 2 - 1,
      ];
    };
    const leave = () => {
      pointer = [0, 0];
    };
    const visibility = () => (document.hidden ? stop() : start());
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) start();
      else stop();
    });
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', visibility);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      stop();
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      color?.destroy();
      depth?.destroy();
      vb.destroy();
      ib.destroy();
      ub.destroy();
      device.destroy();
    };
    void device.lost.then(() => {
      if (!destroyed) {
        destroy();
        canvas.classList.remove('ready');
        canvas.parentElement?.querySelector('svg')?.classList.remove('hidden');
        const button =
          document.querySelector<HTMLButtonElement>('.motion-button');
        if (button) button.hidden = true;
      }
    });
    resize();
    start();
    return {
      pause(value: boolean) {
        paused = value;
        if (paused) stop();
        else start();
      },
      destroy,
    };
  } catch {
    device.destroy();
    return null;
  }
}
