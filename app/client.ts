import './globals.css';
import { createOptics } from '../lib/optics';
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const button = document.querySelector<HTMLButtonElement>('.motion-button')!;
const media = matchMedia('(prefers-reduced-motion: reduce)');
let paused = media.matches;
const updateControl = () => {
  button.setAttribute(
    'aria-label',
    paused ? 'Resume animation' : 'Pause animation',
  );
  button.setAttribute('aria-pressed', String(paused));
  button.querySelector('img')!.src = paused
    ? '/icons/play.svg'
    : '/icons/pause.svg';
};
// The artwork is the primary content: initialize immediately.
const enhancement = createOptics(canvas, paused);
void enhancement
  .then((engine) => {
    if (!engine) return;
    canvas.classList.add('ready');
    button.hidden = false;
    engine.pause(media.matches);
    if (import.meta.hot) import.meta.hot.dispose(() => engine.destroy());
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
  .catch((error) => {
    canvas.dataset.renderer = 'failed';
    console.error('Optical renderer initialization failed', error);
  });
