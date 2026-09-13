#!/usr/bin/env node
import { migrate, version } from './migrate.js';
import { MigrationError } from './errors.js';

try {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    console.log('mina-bridge migrate <input> --out <empty-directory>\nmina-bridge --version');
  } else if (args[0] === '--version') {
    console.log(version);
  } else {
    if (args[0] !== 'migrate' || args.length !== 4 || args[2] !== '--out' || !args[1] || !args[3]) throw new MigrationError('Usage: mina-bridge migrate <input> --out <empty-directory>', 2);
    const report = await migrate(args[1], args[3]);
    console.log(JSON.stringify(report));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof MigrationError ? error.exitCode : 3;
}
