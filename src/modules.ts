import { parse } from '@babel/parser';
import { posix } from 'node:path';
import { createHash } from 'node:crypto';
import { MigrationError } from './errors.js';

export function moduleCompiler(read: (file: string) => Promise<string>) {
  const files: Record<string, string> = {};
  const pending = new Set<string>();
  async function transform(source: string, file: string): Promise<string> {
    let ast;
    try { ast = parse(source, { sourceType: 'script' }); }
    catch { throw new MigrationError(`${file}: invalid JavaScript`); }
    const calls: {start:number;end:number;path:string}[] = [];
    function walk(value: unknown) {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(walk); return; }
      const node = value as Record<string, any>;
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'require') {
        const arg = node.arguments[0];
        if (node.arguments.length !== 1 || arg?.type !== 'StringLiteral' || !arg.value.startsWith('.')) throw new MigrationError(`${file}:${node.start}: only literal relative require paths are supported`);
        let path = posix.normalize(posix.join(posix.dirname(file), arg.value));
        if (!posix.extname(path)) path += '.js';
        if (posix.extname(path) !== '.js') throw new MigrationError(`${file}:${node.start}: only JavaScript modules are supported`);
        calls.push({ start:node.start, end:node.end, path });
      }
      for (const [key, child] of Object.entries(node)) if (!['loc','comments'].includes(key)) walk(child);
    }
    walk(ast.program);
    const imports: string[] = [];
    const edits: {start:number;end:number;text:string}[] = [];
    for (const [index, call] of calls.entries()) {
      const name = createHash('sha256').update(call.path).digest('hex');
      const destination = `src/modules/${name}.js`;
      if (pending.has(call.path)) throw new MigrationError(`${file}: cyclic CommonJS dependencies unsupported`);
      if (!files[destination]) {
        pending.add(call.path);
        const converted = await transform(await read(call.path), call.path);
        pending.delete(call.path);
        files[destination] = "import { wx, getCurrentPages } from '../navigation.js';\n" + converted.replace('// MINABRIDGE_MODULE_BODY', 'const module = { exports: {} }; const exports = module.exports;') + '\nexport default module.exports;';
      }
      const binding = `__minaDependency${index}`;
      if (source.includes(binding)) throw new MigrationError(`${file}: reserved generated identifier ${binding}`);
      imports.push(`import ${binding} from '../modules/${name}.js';`);
      edits.push({start:call.start,end:call.end,text:binding});
    }
    for (const edit of edits.sort((a,b) => b.start-a.start)) source = source.slice(0,edit.start)+edit.text+source.slice(edit.end);
    return imports.join('\n') + '\n// MINABRIDGE_MODULE_BODY\n' + source;
  }
  return { transform, files };
}
