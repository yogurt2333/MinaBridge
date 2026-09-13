import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { convertTemplate, convertStyle } from './convert.js';
import { preparePaths } from './paths.js';
import { sourceReader, jsonObject, assertEmptyRegistration } from './source.js';
import { MigrationError } from './errors.js';

export const version = '0.1.0-dev.0';
export const targetDependencies = { vue: '2.7.16' };
export const targetDevDependencies = { vite: '7.3.6', '@vitejs/plugin-vue2': '2.3.4' };

export async function migrate(input: string, output: string) {
  const started = performance.now();
  ({ input, output } = await preparePaths(input, output));
  const reader = sourceReader(input);
  const { read } = reader;
  const config = jsonObject(await read('app.json'), 'app.json');
  if (!Array.isArray(config.pages) || !config.pages.length || !config.pages.every((route: unknown) => typeof route === 'string' && /^[a-zA-Z0-9_\-/]+$/.test(route) && !route.startsWith('/') && !route.split('/').some(p => !p || p === '..'))) throw new MigrationError('app.json: invalid page routes', 2);
  if (new Set(config.pages).size !== config.pages.length) throw new MigrationError('app.json: duplicate page routes', 2);
  if (config.subPackages || config.subpackages || config.tabBar || config.usingComponents && Object.keys(config.usingComponents as object).length) throw new MigrationError('app.json: unsupported subpackages, tabBar or global components');
  assertEmptyRegistration(await read('app.js'), 'App', 'app.js');
  const pages = [];
  const assets = new Map<string, string>();
  for (const [index, route] of config.pages.entries()) {
    assertEmptyRegistration(await read(`${route}.js`), 'Page', `${route}.js`);
    const pageConfig = jsonObject(await read(`${route}.json`), `${route}.json`);
    if (pageConfig.usingComponents && Object.keys(pageConfig.usingComponents as object).length) throw new MigrationError(`${route}: custom components unsupported`);
    const template = convertTemplate(await read(`${route}.wxml`), `${route}.wxml`, src => {
      if (!src || /^(https?:\/\/|data:image\/)/i.test(src)) return src;
      if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) throw new MigrationError(`${route}: unsupported image URL`);
      const file = posix.normalize(src.startsWith('/') ? src.slice(1) : posix.join(posix.dirname(route), src));
      const ext = posix.extname(file).toLowerCase();
      if (!['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'].includes(ext)) throw new MigrationError(`${file}: unsupported image format`);
      const name = `${createHash('sha256').update(file).digest('hex')}${ext}`;
      assets.set(file, `public/assets/${name}`);
      return `/assets/${name}`;
    });
    const style = convertStyle(await read(`${route}.wxss`), `${route}.wxss`);
    pages.push({ route, index, source: `<template>${template}</template>\n<script>export default {}</script>\n<style>${style}</style>\n` });
  }
  const globalStyle = convertStyle(await read('app.wxss', true), 'app.wxss');
  const files: Record<string, string | Buffer> = {};
  for (const [source, destination] of assets) files[destination] = await reader.bytes(source);
  Object.assign(files, {
    'package.json': JSON.stringify({ name: 'minabridge-output', private: true, type: 'module', scripts: { dev: 'vite --host 127.0.0.1', build: 'vite build', preview: 'vite preview --host 127.0.0.1' }, dependencies: targetDependencies, devDependencies: targetDevDependencies }, null, 2),
    'index.html': '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>',
    'vite.config.js': "import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue2';\nexport default defineConfig({ plugins: [vue()], base: './' });\n",
    'src/main.js': `${pages.map(p => `import Page${p.index} from './pages/${p.index}.vue';`).join('\n')}\nimport Vue from 'vue';\nimport './global.css';\nconst routes = {${pages.map(p => `${JSON.stringify(p.route)}: Page${p.index}`).join(',')}};\nnew Vue({ render: h => h(routes[location.hash.slice(2)] || Page0) }).$mount('#app');\n`,
    'src/global.css': globalStyle,
    'README.md': '# Generated Vue 2 project\n\nNode.js 24+ and npm required. Run npm install, npm run build, npm run dev.\n\nGeneration does not imply verification. See migration-report.json.\n',
  });
  for (const page of pages) files[`src/pages/${page.index}.vue`] = page.source;
  const report = { toolVersion: version, target: { framework: 'Vue', version: targetDependencies.vue }, sourceDigest: reader.digest(), pages: pages.map(p => ({ route: p.route, status: 'generated' })), generation: 'passed', verification: 'not-run', elapsedMs: Math.round(performance.now() - started) };
  files['migration-report.json'] = JSON.stringify(report, null, 2);
  files['migration-report.md'] = `# Migration report\n\nGeneration: passed\nVerification: not-run\nPages: ${pages.length}\nSource digest: ${report.sourceDigest}\n`;
  for (const [file, text] of Object.entries(files)) {
    const path = join(output, file);
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, text, { flag: 'wx' });
  }
  return report;
}
