import { readFile, writeFile } from 'node:fs/promises';
const template = await readFile('dist/index.html', 'utf8');
const fallback = await readFile('.build/surface.svg', 'utf8');
await writeFile(
  'dist/index.html',
  template
    .replace('<!--surface-->', fallback)
    .replace(
      '<script type="module"',
      '<script data-cfasync="false" type="module"',
    ),
);
