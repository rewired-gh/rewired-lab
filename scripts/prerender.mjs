import { readFile, writeFile } from 'node:fs/promises';
const template = await readFile('dist/index.html', 'utf8');
await writeFile(
  'dist/index.html',
  template.replace(
    '<script type="module"',
    '<script data-cfasync="false" type="module"',
  ),
);
