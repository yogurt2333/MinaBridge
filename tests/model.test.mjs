import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, cp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { build } from 'vite';

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

