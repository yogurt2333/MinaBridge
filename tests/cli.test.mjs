import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build, preview } from 'vite';
import { chromium } from 'playwright';

const cli = resolve('dist/cli.js');
async function sample(label = '第一杯茶') {
  await mkdir('.test-output', { recursive: true });
  const root = await mkdtemp(resolve('.test-output/中文 sample-'));
  const input = join(root, 'source');
  await mkdir(join(input, 'pages/home'), { recursive: true });
  const files = {
    'app.json': JSON.stringify({ pages: ['pages/home/index'] }),
    'app.js': 'App({})',
    'app.wxss': 'page { background: #fff; }',
    'pages/home/index.json': '{}',
    'pages/home/index.js': 'Page({})',
    'pages/home/index.wxml': `<view class="menu"><text>${label}</text></view>`,
    'pages/home/index.wxss': '.menu { padding: 20rpx; }',
  };
  for (const [path, content] of Object.entries(files)) await writeFile(join(input, path), content);
  return { root, input, output: join(root, 'h5') };
}
function run(...args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 30_000 });
}

test('CLI converts input content to a standalone Vue 2 project with unverified report', async () => {
  const { input, output } = await sample();
  const result = run('migrate', input, '--out', output);
  assert.equal(result.status, 0, result.stderr);
  const pkg = JSON.parse(await readFile(join(output, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies.vue, '2.7.16');
  const page = await readFile(join(output, 'src/pages/0.vue'), 'utf8');
  assert.match(page, /第一杯茶/);
  assert.match(page, /<div class="menu">/);
  const report = JSON.parse(await readFile(join(output, 'migration-report.json'), 'utf8'));
  assert.equal(report.generation, 'passed');
  assert.equal(report.verification, 'not-run');
  assert.equal(report.pages.length, 1);
  assert.match(report.sourceDigest, /^[a-f0-9]{64}$/);
  const readable = await readFile(join(output, 'migration-report.md'), 'utf8');
  assert.match(readable, /0\.1\.0-dev\.0/);
  assert.match(readable, /2\.7\.16/);
  assert.match(readable, /pages\/home\/index.*generated/);
  assert.match(readable, /Elapsed: \d+ ms/);
  const second = await sample('第二个不同内容');
  assert.equal(run('migrate', second.input, '--out', second.output).status, 0);
  assert.match(await readFile(join(second.output, 'src/pages/0.vue'), 'utf8'), /第二个不同内容/);
});

test('malformed WXSS is a conversion error, not an environment error', async () => {
  const { input, output } = await sample();
  await writeFile(join(input, 'pages/home/index.wxss'), '.menu {');
  const result = run('migrate', input, '--out', output);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /index\.wxss/);
});

test('each page keeps its own styles above global defaults', async () => {
  const { input, output } = await sample();
  await mkdir(join(input, 'pages/second'));
  await writeFile(join(input, 'app.json'), JSON.stringify({ pages: ['pages/home/index', 'pages/second/index'] }));
  await writeFile(join(input, 'app.wxss'), '.menu { color: green; }');
  await writeFile(join(input, 'pages/home/index.wxss'), 'page { background: rgb(255, 255, 0); } .menu { color: red; }');
  for (const [ext, content] of Object.entries({ js: 'Page({})', json: '{}', wxml: '<view class="menu">第二页</view>', wxss: '.menu { color: blue; }' })) {
    await writeFile(join(input, `pages/second/index.${ext}`), content);
  }
  assert.equal(run('migrate', input, '--out', output).status, 0);
  await build({ root: output, logLevel: 'silent' });
  const server = await preview({ root: output, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(server.resolvedUrls.local[0]);
    assert.equal(await page.locator('.menu').evaluate(e => getComputedStyle(e).color), 'rgb(255, 0, 0)');
    await page.goto(server.resolvedUrls.local[0] + '#/pages/second/index');
    await page.reload();
    assert.equal(await page.locator('.menu').innerText(), '第二页');
    assert.equal(await page.locator('.menu').evaluate(e => getComputedStyle(e).color), 'rgb(0, 0, 255)');
  } finally {
    await browser?.close();
    await new Promise((yes, no) => server.httpServer.close(error => error ? no(error) : yes()));
  }
});

test('generated static project builds and shows source content, styles and local image in a browser', async () => {
  const { input, output } = await sample();
  await mkdir(join(input, 'assets'));
  await writeFile(join(input, 'assets/tea.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="green"/></svg>');
  await writeFile(join(input, 'pages/home/index.wxml'), '<view class="text"><text>本地绿茶</text><image src="../../assets/tea.svg" /></view>');
  await writeFile(join(input, 'pages/home/index.wxss'), '.text { color: rgb(0, 128, 0); padding: 15rpx; }');
  const result = run('migrate', input, '--out', output);
  assert.equal(result.status, 0, result.stderr);
  await build({ root: output, logLevel: 'silent' });
  const server = await preview({ root: output, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(server.resolvedUrls.local[0]);
    assert.equal(await page.locator('.text').innerText(), '本地绿茶');
    assert.equal(await page.locator('.text').evaluate(e => getComputedStyle(e).color), 'rgb(0, 128, 0)');
    assert.equal(await page.locator('.text').evaluate(e => getComputedStyle(e).paddingTop), '7.5px');
    await page.waitForFunction(() => document.querySelector('img')?.naturalWidth === 10, null, { timeout: 5000 });
    await page.screenshot({ path: join(output, 'browser-smoke.png') });
  } finally {
    await browser?.close();
    await new Promise((yes, no) => server.httpServer.close(error => error ? no(error) : yes()));
  }
});

test('CLI rejects missing and escaping source pages without executing source scripts', async () => {
  const missing = await sample();
  await rm(join(missing.input, 'pages/home/index.js'));
  assert.equal(run('migrate', missing.input, '--out', missing.output).status, 2);
  const escaping = await sample();
  await writeFile(join(escaping.input, 'app.json'), JSON.stringify({ pages: ['../outside'] }));
  const escaped = run('migrate', escaping.input, '--out', escaping.output);
  assert.equal(escaped.status, 2);
  assert.match(escaped.stderr, /outside|escape|route/i);
  const code = await sample();
  await writeFile(join(code.input, 'pages/home/index.js'), `require('node:fs').writeFileSync(${JSON.stringify(join(code.root, 'executed'))}, 'bad');Page({});`);
  assert.equal(run('migrate', code.input, '--out', code.output).status, 1);
  assert.ok(!(await readdir(code.root)).includes('executed'));
});

test('CLI refuses unsafe output locations and preserves existing files', async () => {
  const { root, input, output } = await sample();
  await mkdir(output);
  await writeFile(join(output, 'keep.txt'), 'owned by user');
  for (const location of [output, input, join(input, 'nested'), root]) {
    const result = run('migrate', input, '--out', location);
    assert.equal(result.status, 2, result.stderr);
  }
  assert.equal(await readFile(join(output, 'keep.txt'), 'utf8'), 'owned by user');
  assert.deepEqual(await readdir(output), ['keep.txt']);
});
