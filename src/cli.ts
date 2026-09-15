#!/usr/bin/env node
import { migrate, version } from './migrate.js';
import { MigrationError } from './errors.js';
import { modelConfiguration, rewriteWithModel } from './model.js';
import { verify } from './verify.js';

try {
  const args = process.argv.slice(2);
  const verification=args.includes('--verify');
  if(verification) args.splice(args.indexOf('--verify'),1);
  if (args.includes('--help') || args.length === 0) {
    console.log('mina-bridge migrate <input> --out <empty-directory> [--model <ollama-model>] [--verify]\nmina-bridge --version');
  } else if (args[0] === '--version') {
    console.log(version);
  } else {
    if (args[0] !== 'migrate' || ![4,6].includes(args.length) || args[2] !== '--out' || !args[1] || !args[3] || args.length===6 && (args[4]!=='--model' || !args[5])) throw new MigrationError('Usage: mina-bridge migrate <input> --out <empty-directory> [--model <ollama-model>] [--verify]', 2);
    const model = args[5] ? modelConfiguration(args[5]) : undefined;
    const report = await migrate(args[1], args[3]);
    if (model) await rewriteWithModel(args[1],args[3],model,report.pages);
    if (verification) { await verify(args[3]); report.verification='passed'; }
    console.log(JSON.stringify(report));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof MigrationError ? error.exitCode : 3;
}
