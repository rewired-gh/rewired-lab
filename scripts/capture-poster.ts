import '../app/globals.css';
import { createOptics } from '../lib/optics';
const canvas = document.querySelector('canvas')!;
const controller = new AbortController();
void createOptics(canvas, true, controller.signal).then((engine) => {
  if (engine) canvas.classList.add('ready');
  window.addEventListener(
    'pagehide',
    () => {
      controller.abort();
      engine?.destroy();
    },
    { once: true },
  );
});
