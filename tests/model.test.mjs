import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, cp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { build } from 'vite';
import { pathToFileURL } from 'node:url';

async function run(args, env) {
  return new Promise((yes,no) => {
    const child = spawn(process.execPath, [resolve('dist/cli.js'), ...args], {env:{...process.env,...env}});
    let stderr=''; child.stderr.on('data', data=>stderr+=data);
    child.on('error',no); child.on('close',code=>yes({code,stderr}));
  });
}

test('CLI sends page context and applies a validated Ollama response to a buildable project', async () => {
  await mkdir('.test-output',{recursive:true});
  const output=join(await mkdtemp(resolve('.test-output/model-')),'h5');
  const input=output+'-source';
  await cp(resolve('samples/static-menu'),input,{recursive:true});
  await writeFile(join(input,'.env'),'TEST_SECRET=do-not-send-fixture');
  await writeFile(join(input,'project.private.config.json'),'{"secret":"do-not-send-fixture"}');
  let requests=0;
  const server=createServer(async (req,res)=>{
    let text=''; for await(const chunk of req) text+=chunk;
    const body=JSON.parse(text); requests++;
    assert.ok(!text.includes('do-not-send-fixture'));
    assert.equal(req.url,'/api/chat');
    assert.equal(body.model,'test-model');
    const context=JSON.parse(body.messages[1].content);
    assert.ok(context.source.wxml.includes('<view'));
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({done:true,message:{content:JSON.stringify({path:context.path,content:context.generated.replace('<template>','<template><!-- model reviewed -->')})},prompt_eval_count:123,eval_count:-1}));
  });
  await new Promise(yes=>server.listen(0,'127.0.0.1',yes));
  try {
    const result=await run(['migrate',input,'--out',output,'--model','test-model'],{MINABRIDGE_OLLAMA_URL:`http://127.0.0.1:${server.address().port}`});
    assert.equal(result.code,0,result.stderr);
    assert.ok(requests>0);
    assert.match(await readFile(join(output,'src/pages/0.vue'),'utf8'),/model reviewed/);
    const report=JSON.parse(await readFile(join(output,'model-report.json'),'utf8'));
    assert.equal(report.status,'passed');
    assert.equal(report.calls[0].inputTokens,123);
    assert.equal(report.calls[0].outputTokens,null);
    await build({root:output,logLevel:'silent'});
  } finally { await new Promise(yes=>server.close(yes)); }
});

test('invalid model endpoint is a configuration error',async()=>{
  const result=await run(['migrate',resolve('samples/static-menu'),'--out','.test-output/invalid-config','--model','test-model'],{MINABRIDGE_OLLAMA_URL:'not-a-url'});
  assert.equal(result.code,2,result.stderr);
  assert.match(result.stderr,/endpoint URL/);
});

test('repair does not reuse a previous code failure when the next verifier cannot start',async()=>{
  const root=await mkdtemp(resolve('.test-output/repair-startup-'));const output=join(root,'h5');
  const marker=join(root,'fail');const preload=join(root,'preload.mjs');
  await writeFile(preload,`import {existsSync} from 'node:fs'; if(process.argv[1]?.endsWith('verify-worker.js') && existsSync(${JSON.stringify(marker)})) throw new Error('simulated worker startup failure');`);
  let calls=0;
  const server=createServer(async(req,res)=>{
    let text='';for await(const chunk of req)text+=chunk;
    const context=JSON.parse(JSON.parse(text).messages[1].content);calls++;
    if(calls===2)await writeFile(marker,'fail');
    res.end(JSON.stringify({done:true,message:{content:JSON.stringify({path:context.path,content:context.generated.replaceAll('vw','rpx')})}}));
  });
  await new Promise(yes=>server.listen(0,'127.0.0.1',yes));
  try {
    const result=await run(['migrate',resolve('samples/static-menu'),'--out',output,'--model','test-model','--verify'],{MINABRIDGE_OLLAMA_URL:`http://127.0.0.1:${server.address().port}`,NODE_OPTIONS:`--import=${pathToFileURL(preload).href}`});
    assert.equal(result.code,3,result.stderr);assert.equal(calls,2);
  } finally {server.closeAllConnections();await new Promise(yes=>server.close(yes));}
});

test('CLI repairs a failed verification with feedback and preserves both rounds',async()=>{
  const output=join(await mkdtemp(resolve('.test-output/repair-')),'h5');
  let calls=0;let original='';
  const server=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    const context=JSON.parse(JSON.parse(body).messages[1].content);calls++;
    if(calls===1)original=context.generated;
    else assert.match(context.feedback,/rpx/);
    res.end(JSON.stringify({done:true,message:{content:JSON.stringify({path:context.path,content:calls===1?original.replaceAll('vw','rpx'):original})}}));
  });
  await new Promise(yes=>server.listen(0,'127.0.0.1',yes));
  try {
    const result=await run(['migrate',resolve('samples/static-menu'),'--out',output,'--model','test-model','--verify'],{MINABRIDGE_OLLAMA_URL:`http://127.0.0.1:${server.address().port}`});
    assert.equal(result.code,0,result.stderr);assert.equal(calls,2);
    const report=JSON.parse(await readFile(join(output,'repair-report.json'),'utf8'));
    assert.equal(report.status,'passed');assert.equal(report.repairs,1);
    assert.equal(JSON.parse(await readFile(join(output,'rounds/0/verification-report.json'),'utf8')).status,'failed');
    assert.equal(JSON.parse(await readFile(join(output,'rounds/1/verification-report.json'),'utf8')).status,'passed');
  } finally {server.closeAllConnections();await new Promise(yes=>server.close(yes));}
});

test('repair stops at its budget or on environment and invalid model failures',async()=>{
  for(const mode of ['exhausted','disabled','environment','invalid','timeout']) {
    const output=join(await mkdtemp(resolve('.test-output/repair-stop-')),'h5');let calls=0;
    const server=createServer(async(req,res)=>{
      let text='';for await(const chunk of req)text+=chunk;
      const context=JSON.parse(JSON.parse(text).messages[1].content);calls++;
      if(mode==='timeout' && calls>1)return;
      res.end(JSON.stringify({done:true,message:{content:JSON.stringify({path:mode==='invalid'&&calls>1?'../outside.vue':context.path,content:context.generated.replaceAll('vw','rpx')})}}));
    });
    await new Promise(yes=>server.listen(0,'127.0.0.1',yes));
    try {
      const args=['migrate',resolve('samples/static-menu'),'--out',output,'--model','test-model','--verify'];
      if(mode==='disabled')args.push('--max-repairs','0');
      const env={MINABRIDGE_OLLAMA_URL:`http://127.0.0.1:${server.address().port}`,MINABRIDGE_MODEL_TIMEOUT_MS:'1000'};
      if(mode==='environment')env.PLAYWRIGHT_BROWSERS_PATH=join(output,'missing');
      // Environment scenario must reach browser launch rather than the CSS guard.
      if(mode==='environment')server.removeAllListeners('request').on('request',async(req,res)=>{
        let text='';for await(const chunk of req)text+=chunk;
        const context=JSON.parse(JSON.parse(text).messages[1].content);calls++;
        res.end(JSON.stringify({done:true,message:{content:JSON.stringify({path:context.path,content:context.generated})}}));
      });
      const result=await run(args,env);
      assert.equal(result.code,['environment','timeout'].includes(mode)?3:1,result.stderr);
      assert.equal(calls,mode==='exhausted'?3:['disabled','environment'].includes(mode)?1:2);
      const report=JSON.parse(await readFile(join(output,'repair-report.json'),'utf8'));
      assert.equal(report.status,'failed');assert.equal(report.repairs,calls-1);
    } finally {server.closeAllConnections();await new Promise(yes=>server.close(yes));}
  }
});

test('CLI verify preserves build success when the browser environment is missing',async()=>{
  const output=join(await mkdtemp(resolve('.test-output/verify-environment-')),'h5');
  const result=await run(['migrate',resolve('samples/static-menu'),'--out',output,'--verify'],{PLAYWRIGHT_BROWSERS_PATH:join(output,'missing-browser')});
  assert.equal(result.code,3,result.stderr);
  const report=JSON.parse(await readFile(join(output,'verification-report.json'),'utf8'));
  assert.equal(report.build,'passed');assert.equal(report.failureKind,'environment');
  assert.match(report.error,/Chromium unavailable/);
});

test('CLI verify distinguishes build failure from a browser CSS regression',async()=>{
  for(const mode of ['build','behavior','runtime']) {
    const output=join(await mkdtemp(resolve('.test-output/verify-failure-')),'h5');
    const server=createServer(async(req,res)=>{
      let text='';for await(const chunk of req)text+=chunk;
      const context=JSON.parse(JSON.parse(text).messages[1].content);
      const content=mode==='build'?'<template><div></div></template><script>export default {</script>':mode==='runtime'?context.generated.replace('MinaBridge 茶饮菜单','{{missing.field}}'):context.generated.replaceAll('vw','rpx');
      res.end(JSON.stringify({done:true,message:{content:JSON.stringify({path:context.path,content})}}));
    });
    await new Promise(yes=>server.listen(0,'127.0.0.1',yes));
    try {
      const result=await run(['migrate',resolve('samples/static-menu'),'--out',output,'--model','test-model','--verify'],{MINABRIDGE_OLLAMA_URL:`http://127.0.0.1:${server.address().port}`});
      assert.equal(result.code,1,result.stderr);
      const report=JSON.parse(await readFile(join(output,'verification-report.json'),'utf8'));
      assert.equal(report[mode==='runtime'?'behavior':mode],'failed');
      assert.equal(report.build,mode==='build'?'failed':'passed');
      assert.equal(report.visual,'not-run');
      assert.equal(JSON.parse(await readFile(join(output,'migration-report.json'),'utf8')).verification,'failed');
    } finally {server.closeAllConnections();await new Promise(yes=>server.close(yes));}
  }
});

test('CLI preserves generated files when model paths, service or deadline fail', async () => {
  for (const scenario of ['escape','service','timeout','invalid-json','null']) {
    const output=join(await mkdtemp(resolve('.test-output/model-error-')),'h5');
    const server=createServer(async(req,res)=>{
      let text=''; for await(const chunk of req) text+=chunk;
      if(scenario==='timeout') return;
      if(scenario==='null') {res.end('null');return;}
      if(scenario==='service') {res.writeHead(503);res.end('unavailable');return;}
      const context=JSON.parse(JSON.parse(text).messages[1].content);
      res.end(JSON.stringify({done:true,message:{content:scenario==='invalid-json'?'not json':JSON.stringify({path:'../../outside.txt',content:context.generated})}}));
    });
    await new Promise(yes=>server.listen(0,'127.0.0.1',yes));
    try {
      const result=await run(['migrate',resolve('samples/static-menu'),'--out',output,'--model','test-model'],{MINABRIDGE_OLLAMA_URL:`http://127.0.0.1:${server.address().port}`,MINABRIDGE_MODEL_TIMEOUT_MS:scenario==='timeout'?'100':'10000'});
      assert.equal(result.code,['service','timeout'].includes(scenario)?3:1,result.stderr);
      const report=JSON.parse(await readFile(join(output,'model-report.json'),'utf8'));
      assert.equal(report.status,'failed');
      assert.equal(report.calls.length,1);
      assert.match(await readFile(join(output,'src/pages/0.vue'),'utf8'),/<template>/);
    } finally { server.closeAllConnections(); await new Promise(yes=>server.close(yes)); }
  }
});
