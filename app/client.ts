import './globals.css';
import { createOptics } from '../lib/optics';
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const button = document.querySelector<HTMLButtonElement>('.motion-button')!;
const media = matchMedia('(prefers-reduced-motion: reduce)');
let paused = media.matches;
let engine: Awaited<ReturnType<typeof createOptics>> = null;
let controller: AbortController | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let pending = false;
function updateControl() {
  button.hidden = pending;
  button.setAttribute(
    'aria-label',
    engine
      ? paused
        ? 'Resume animation'
        : 'Pause animation'
      : 'Start animation',
  );
  button.setAttribute('aria-pressed', String(engine ? paused : false));
  button.querySelector('img')!.src =
    engine && !paused ? '/icons/pause.svg' : '/icons/play.svg';
}
function release() {
  clearTimeout(timer);
  controller?.abort();
  controller = null;
  engine?.destroy();
  engine = null;
  pending = false;
  canvas.classList.remove('ready');
}
async function start() {
  release();
  const attempt = new AbortController();
  controller = attempt;
  pending = true;
  updateControl();
  timer = setTimeout(() => {
    attempt.abort();
    pending = false;
    canvas.dataset.renderer = 'retry';
    updateControl();
  }, 8000);
  try {
    const result = await createOptics(canvas, paused, attempt.signal);
    if (attempt.signal.aborted) {
      result?.destroy();
      return;
    }
    engine = result;
    if (engine) {
      canvas.classList.add('ready');
      void engine.lost.then(() => {
        if (engine === result) {
          engine = null;
          canvas.classList.remove('ready');
          updateControl();
        }
      });
    }
  } catch (error) {
    if (!attempt.signal.aborted) {
      canvas.dataset.renderer = 'failed';
      console.error('Optical renderer initialization failed', error);
    }
  } finally {
    if (controller === attempt) {
      clearTimeout(timer);
      pending = false;
      updateControl();
    }
  }
}
const click = () => {
  if (engine) {
    paused = !paused;
    engine.pause(paused);
    updateControl();
  } else {
    paused = false;
    void start();
  }
};
const preference = () => {
  paused = media.matches;
  engine?.pause(paused);
  updateControl();
};
const restore = (event: PageTransitionEvent) => {
  if (event.persisted) void start();
};
button.addEventListener('click', click);
media.addEventListener('change', preference);
window.addEventListener('pagehide', release);
window.addEventListener('pageshow', restore);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    release();
    button.removeEventListener('click', click);
    media.removeEventListener('change', preference);
    window.removeEventListener('pagehide', release);
    window.removeEventListener('pageshow', restore);
  });
void start();
