import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MigrationError } from './errors.js';

export async function verify(output:string) {
  const started=performance.now();
  await writeFile(join(output,'verification-report.json'),JSON.stringify({status:'running',build:'not-run',behavior:'not-run',visual:'not-run',screenshots:[]}));
  const result=await new Promise<{code:number|null;timedOut:boolean;log:string}>(resolve=>{
    const child=spawn(process.execPath,[fileURLToPath(new URL('./verify-worker.js',import.meta.url)),output],{stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
    let log=''; let timedOut=false;
    const timer=setTimeout(()=>{
      timedOut=true;
      if(!child.pid) return;
      if(process.platform==='win32') {
        const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});
        killer.on('error',()=>child.kill());
      } else { try { process.kill(-child.pid,'SIGKILL'); } catch { child.kill(); } }
    },120000);
    const capture=(chunk:Buffer)=>{log=(log+chunk.toString()).slice(-16000);};
    child.stdout.on('data',capture);child.stderr.on('data',capture);
    child.on('error',()=>{clearTimeout(timer);resolve({code:3,timedOut:false,log:'Unable to start verification worker'});});
    child.on('close',code=>{clearTimeout(timer);resolve({code,timedOut,log});});
  });
  let report;
  try {report=JSON.parse(await readFile(join(output,'verification-report.json'),'utf8'));}
  catch {report={build:'not-run',behavior:'not-run',visual:'not-run',screenshots:[]};}
  if(result.timedOut || result.code !== 0 && report.status !== 'failed') {
    report.status='failed';report.failureKind='environment';report.error=result.timedOut?'Verification exceeded 120 seconds':'Verification worker failed';
    if(report.build==='running') report.build='failed';
    if(report.behavior==='running') report.behavior='failed';
  }
  report.elapsedMs=Math.round(performance.now()-started);
  await writeFile(join(output,'verification-report.json'),JSON.stringify(report,null,2));
  await writeFile(join(output,'verification-report.md'),`# Verification\n\nStatus: ${report.status}\nBuild: ${report.build}\nBehavior: ${report.behavior}\nVisual: ${report.visual}\nElapsed: ${report.elapsedMs} ms\n${report.error || ''}\n\n${report.screenshots.map((path:string)=>'- '+path).join('\n')}\n`);
  await writeFile(join(output,'verification.log'),result.log);
  const migration=JSON.parse(await readFile(join(output,'migration-report.json'),'utf8'));
  migration.verification=report.status;
  await writeFile(join(output,'migration-report.json'),JSON.stringify(migration,null,2));
  const markdown=await readFile(join(output,'migration-report.md'),'utf8');
  await writeFile(join(output,'migration-report.md'),markdown.replace(/Verification: .*/,`Verification: ${report.status} (see verification-report.md)`));
  if(report.status !== 'passed') throw new MigrationError(report.error || 'Verification failed',report.failureKind==='environment'?3:1);
  return report;
}
