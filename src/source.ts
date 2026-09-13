import { readFile, realpath } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';
import { isWithin } from './paths.js';
import { MigrationError } from './errors.js';

export function jsonObject(text: string, file: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('expected object');
    return value as Record<string, unknown>;
  } catch { throw new MigrationError(`${file}: invalid JSON object`, 2); }
}

export function assertEmptyRegistration(text: string, kind: 'Page' | 'App', file: string) {
  let ast;
  try { ast = parse(text, { sourceType: 'script' }); }
  catch { throw new MigrationError(`${file}: invalid JavaScript`, 1); }
  const statements = ast.program.body.filter(node => node.type !== 'EmptyStatement');
  const node = statements[0];
  if (statements.length !== 1 || node?.type !== 'ExpressionStatement' || node.expression.type !== 'CallExpression') throw new MigrationError(`${file}: only empty ${kind} registration is supported in this milestone`);
  const call = node.expression;
  const arg = call.arguments[0];
  if (call.callee.type !== 'Identifier' || call.callee.name !== kind || call.arguments.length !== 1 || arg?.type !== 'ObjectExpression' || arg.properties.length) throw new MigrationError(`${file}: non-static ${kind} registration is unsupported`);
}

export function sourceReader(root: string) {
  const hash = createHash('sha256');
  async function bytes(file: string, optional = false): Promise<Buffer> {
      if (isAbsolute(file) || file.includes('\\') || file.includes(':') || !isWithin(root, resolve(root, file))) throw new MigrationError(`${file}: source path escapes input`, 2);
      let content: Buffer;
      try {
        const path = await realpath(resolve(root, file));
        if (!isWithin(root, path)) throw new MigrationError(`${file}: source path escapes input`, 2);
        content = await readFile(path);
      } catch (error) {
        if (optional && (error as NodeJS.ErrnoException).code === 'ENOENT') return Buffer.alloc(0);
        if (error instanceof MigrationError) throw error;
        throw new MigrationError(`${file}: cannot read source file`, 2);
      }
      hash.update(file).update('\0').update(content).update('\0');
      return content;
  }
  return {
    digest: () => hash.digest('hex'),
    bytes,
    read: async (file: string, optional = false) => (await bytes(file, optional)).toString('utf8'),
  };
}
