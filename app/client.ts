import './globals.css';
import { createRenderer } from '../lib/field';
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const fallback = document.querySelector<SVGElement>('svg')!;
const button = document.querySelector<HTMLButtonElement>('.motion-button')!;
const media = matchMedia('(prefers-reduced-motion: reduce)');
let paused = media.matches;
const updateControl = () => {
  button.setAttribute(
    'aria-label',
    paused ? 'Resume animation' : 'Pause animation',
  );
  button.setAttribute('aria-pressed', String(paused));
  button.querySelector('span')!.textContent = paused ? '▷' : 'Ⅱ';
};
// The static identity is already present; initialize its decorative enhancement
// below input work when the browser exposes prioritized task scheduling.
const scheduler = (
  globalThis as typeof globalThis & {
    scheduler?: {
      postTask<T>(
        task: () => Promise<T>,
        options: { priority: 'background' },
      ): Promise<T>;
    };
  }
).scheduler;
const initialize = () => createRenderer(canvas, paused);
const enhancement = scheduler
  ? scheduler.postTask(initialize, { priority: 'background' })
  : new Promise<void>((resolve) => setTimeout(resolve, 0)).then(initialize);
void enhancement
  .then((engine) => {
    if (!engine) return;
    canvas.classList.add('ready');
    fallback.classList.add('hidden');
    button.hidden = false;
    engine.pause(media.matches);
    paused = media.matches;
    updateControl();
    button.addEventListener('click', () => {
      paused = !paused;
      engine.pause(paused);
      updateControl();
    });
    media.addEventListener('change', () => {
      paused = media.matches;
      engine.pause(paused);
      updateControl();
    });
    window.addEventListener('pagehide', () => engine.pause(true));
    window.addEventListener('pageshow', () => engine.pause(paused));
  })
  .catch(() => {
    /* Keep the prerendered field when a rendering API is unavailable. */
  });
