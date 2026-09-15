#!/usr/bin/env node
import { migrate, version } from './migrate.js';
import { MigrationError } from './errors.js';
import { modelConfiguration, rewriteWithModel } from './model.js';

try {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    console.log('mina-bridge migrate <input> --out <empty-directory> [--model <ollama-model>]\nmina-bridge --version');
  } else if (args[0] === '--version') {
    console.log(version);
  } else {
    if (args[0] !== 'migrate' || ![4,6].includes(args.length) || args[2] !== '--out' || !args[1] || !args[3] || args.length===6 && (args[4]!=='--model' || !args[5])) throw new MigrationError('Usage: mina-bridge migrate <input> --out <empty-directory> [--model <ollama-model>]', 2);
    const model = args[5] ? modelConfiguration(args[5]) : undefined;
    const report = await migrate(args[1], args[3]);
    if (model) await rewriteWithModel(args[1],args[3],model,report.pages);
    console.log(JSON.stringify(report));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof MigrationError ? error.exitCode : 3;
}
