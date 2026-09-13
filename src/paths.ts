import { realpath, readdir, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { MigrationError } from './errors.js';

export function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

async function canonical(path: string): Promise<string> {
  try { return await realpath(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || dirname(path) === path) throw error;
    return resolve(await canonical(dirname(path)), basename(path));
  }
}

export async function preparePaths(input: string, output: string) {
  input = await canonical(resolve(input));
  output = await canonical(resolve(output));
  if (isWithin(input, output) || isWithin(output, input)) throw new MigrationError('Input and output directories must not overlap', 2);
  try { if (!(await stat(input)).isDirectory()) throw new Error('not a directory'); }
  catch { throw new MigrationError(`Input directory does not exist: ${input}`, 2); }
  try {
    if ((await readdir(output)).length) throw new MigrationError('Output directory must be empty', 2);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      if (error instanceof MigrationError) throw error;
      throw new MigrationError('Output must be an empty directory', 2);
    }
  }
  return { input, output };
}
