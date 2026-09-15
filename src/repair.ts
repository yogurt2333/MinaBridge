import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { rewriteWithModel, type modelConfiguration } from './model.js';
import { verify } from './verify.js';
import { MigrationError } from './errors.js';

export async function rewriteAndVerifyWithRepair(input:string,output:string,config:ReturnType<typeof modelConfiguration>,pages:{route:string}[],maxRepairs:number) {
  const report={status:'running',maxRepairs,repairs:0,rounds:[] as {round:number;status:string;error?:string;elapsedMs:number}[]};
  let feedback='';
  try {
    for(let round=0;round<=maxRepairs;round++) {
      report.repairs=round;
      const started=performance.now();
      const entry:{round:number;status:string;error?:string;elapsedMs:number}={round,status:'running',elapsedMs:0};report.rounds.push(entry);
      const directory=join(output,'rounds',String(round));await mkdir(directory,{recursive:true});
      try {
        try { await rewriteWithModel(input,output,config,pages,feedback); }
        finally {
          await copyFile(join(output,'model-report.json'),join(directory,'model-report.json'));
          for(const [index] of pages.entries()) await copyFile(join(output,`src/pages/${index}.vue`),join(directory,`${index}.vue`));
        }
        let verificationError:unknown;
        try {await verify(output);}
        catch(error) {verificationError=error;}
        await copyFile(join(output,'verification-report.json'),join(directory,'verification-report.json'));
        await copyFile(join(output,'verification.log'),join(directory,'verification.log'));
        if(!verificationError) {entry.status='passed';report.status='passed';return report;}
        entry.status='failed';entry.error=verificationError instanceof Error?verificationError.message:String(verificationError);
        if(!(verificationError instanceof MigrationError) || verificationError.exitCode!==1 || round===maxRepairs) throw verificationError;
        const verification=JSON.parse(await readFile(join(directory,'verification-report.json'),'utf8'));
        feedback=JSON.stringify({build:verification.build,behavior:verification.behavior,error:verification.error}).slice(0,8000);
      } catch(error) {entry.status='failed';entry.error=error instanceof Error?error.message:String(error);throw error;}
      finally {entry.elapsedMs=Math.round(performance.now()-started);}
    }
  } catch(error) {report.status='failed';throw error;}
  finally {
    await writeFile(join(output,'repair-report.json'),JSON.stringify(report,null,2));
    await writeFile(join(output,'repair-report.md'),`# Repair run\n\nStatus: ${report.status}\nRepairs: ${report.repairs}/${maxRepairs}\n\n${report.rounds.map(round=>`- Round ${round.round}: ${round.status}, ${round.elapsedMs} ms; ${round.error || ''}`).join('\n')}\n`);
  }
  return report;
}
