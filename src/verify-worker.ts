import { build, preview, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue2';
import { chromium, type Page } from 'playwright';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

const output=resolve(process.argv[2]!);
const migration=JSON.parse(await readFile(join(output,'migration-report.json'),'utf8'));
const runDir=await mkdtemp(join(output,'verify-'));
const report={status:'running',scenario:'smoke',build:'not-run',behavior:'not-run',visual:'not-run',screenshots:[] as string[],pages:migration.pages,buildMs:0,behaviorMs:0,sourceDigest:migration.sourceDigest,toolVersion:migration.toolVersion,target:migration.target,failureKind:'',error:''};
let stageStarted=performance.now();
const saveReport=()=>writeFile(join(output,'verification-report.json'),JSON.stringify(report,null,2));
function environmentError(error:unknown):boolean {
  if(!error || typeof error!=='object') return false;
  const value=error as {code?:string;cause?:unknown};
  return ['EACCES','EPERM','ENOSPC','EMFILE','ENFILE','ENOENT','ENOMEM','EADDRINUSE','ERR_MODULE_NOT_FOUND'].includes(value.code || '') || environmentError(value.cause);
}
let browser;
let server:Awaited<ReturnType<typeof preview>>|undefined;
async function screenshot(page:Page,name:string) {
  const path=join(runDir,name+'.png');await page.screenshot({path});report.screenshots.push(relative(output,path).replaceAll('\\','/'));
}
try {
  report.build='running';
  await saveReport();
  const vuePlugin=vue as unknown as () => Plugin;
  await build({root:output,configFile:false,plugins:[vuePlugin()],base:'./',logLevel:'warn',build:{outDir:join(runDir,'build'),emptyOutDir:false}});
  report.build='passed';
  report.buildMs=Math.round(performance.now()-stageStarted);stageStarted=performance.now();
  report.behavior='running';
  await saveReport();
  // Browser silently drops unknown CSS units; reject remaining rpx dimensions explicitly.
  for(const [index] of migration.pages.entries()) {
    const sfc=await readFile(join(output,`src/pages/${index}.vue`),'utf8');
    for(const match of sfc.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
      postcss.parse(match[1]!).walkDecls(decl=>{
        valueParser(decl.value).walk(node=>{if(node.type==='word' && /^-?\d*\.?\d+rpx$/.test(node.value)) throw new Error(`Unsupported browser CSS unit rpx in page ${index}`);});
      });
    }
  }
  try { browser=await chromium.launch({headless:true,timeout:30000}); }
  catch { report.failureKind='environment';throw new Error('Chromium unavailable; run npx playwright install chromium --only-shell'); }
  server=await preview({root:output,configFile:false,logLevel:'warn',build:{outDir:join(runDir,'build')},preview:{host:'127.0.0.1',port:0}});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.resolvedUrls!.local[0]!);
  const coffee=migration.pages.some((p:{route:string})=>p.route==='packageWeStoreCoffee/pages/sku-picker/sku-picker');
  if(coffee) {
    report.scenario='coffee';
    assert.equal(await page.locator('.md-item').count(),35);
    await page.locator('.md-tab').filter({hasText:'奶茶'}).click();
    await page.locator('.md-item').filter({hasText:'抹茶脑袋'}).click();
    await page.locator('.sp-option').filter({hasText:/^大杯/}).click();
    await page.locator('.sp-option').filter({hasText:'珍珠'}).click();
    assert.equal(await page.locator('.sp-summary-price').innerText(),'¥22');
    await screenshot(page,'sku');
    await page.locator('.sp-confirm:visible').click();
    assert.equal(await page.locator('.ck-fee-total-num').innerText(),'¥22');
    const order=new URLSearchParams(page.url().split('?')[1]).get('orderId');assert.ok(order);
    assert.match(await page.locator('.ck-goods-spec').innerText(),/大杯/);
    assert.match(await page.locator('.ck-goods-spec').innerText(),/珍珠/);
    await page.locator('.ck-page .nav-back').click();
    await page.locator('.sp-confirm:visible').click();
    assert.equal(new URLSearchParams(page.url().split('?')[1]).get('orderId'),order);
    assert.equal(await page.locator('.ck-fee-total-num').innerText(),'¥44');
    assert.equal(await page.locator('.ck-goods-qty').innerText(),'x2');
    assert.match(await page.locator('.ck-pay-btn').innerText(),/支付未接入/);
    assert.match(await page.locator('.ck-addr-empty').innerText(),/地址未接入/);
    await screenshot(page,'checkout');
  } else {
    assert.ok(await page.locator('.minabridge-page').isVisible());
    assert.ok((await page.locator('body').innerText()).trim().length>0);
    await screenshot(page,'smoke');
  }
  assert.deepEqual(errors,[]);
  report.behavior='passed';report.visual='pending-review';report.status='passed';
} catch(error) {
  report.status='failed';report.failureKind ||= environmentError(error)?'environment':'code';
  if(report.build==='running') report.build='failed';
  if(report.behavior==='running') report.behavior='failed';
  report.error=error instanceof Error?error.message:String(error);
  process.exitCode=report.failureKind==='environment'?3:1;
} finally {
  if(report.build==='failed') report.buildMs=Math.round(performance.now()-stageStarted);
  else report.behaviorMs=Math.round(performance.now()-stageStarted);
  await saveReport();
  try { await browser?.close(); }
  catch { report.status='failed';report.failureKind='environment';report.error+=' Browser cleanup failed';process.exitCode=3; }
  if(server) await new Promise<void>(resolve=>server!.httpServer.close(error=>{
    if(error) {report.status='failed';report.failureKind='environment';report.error+=' Preview cleanup failed';process.exitCode=3;}
    resolve();
  }));
  await saveReport();
}
