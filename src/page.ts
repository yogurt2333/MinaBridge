import { parse } from '@babel/parser';
import { MigrationError } from './errors.js';

export function convertPage(source: string, file: string): string {
  let ast;
  try { ast = parse(source, { sourceType: 'module' }); }
  catch { throw new MigrationError(`${file}: invalid JavaScript`); }
  const statements = ast.program.body.filter(n => n.type !== 'EmptyStatement');
  const registrations = statements.filter(n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.callee.type === 'Identifier' && n.expression.callee.name === 'Page');
  const statement = registrations[0];
  if (registrations.length !== 1 || statement?.type !== 'ExpressionStatement' || statement.expression.type !== 'CallExpression' || statements.some(n => n !== statement && !['VariableDeclaration', 'FunctionDeclaration', 'ImportDeclaration'].includes(n.type))) throw new MigrationError(`${file}: expected one Page registration with local declarations`);
  const call = statement.expression;
  if (call.callee.type !== 'Identifier' || call.callee.name !== 'Page' || call.arguments.length !== 1 || call.arguments[0]?.type !== 'ObjectExpression') throw new MigrationError(`${file}: expected Page({...})`);
  const replacements: { start: number; end: number; text: string }[] = [];
  function walk(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    const node = value as Record<string, any>;
    if (node.type === 'MemberExpression' && node.object.type === 'ThisExpression' && !node.computed) {
      if (node.property.name === 'data') replacements.push({ start: node.start, end: node.end, text: 'this.$data' });
      if (node.property.name === 'setData') replacements.push({ start: node.start, end: node.end, text: 'this.$minaSetData' });
    }
    for (const [key, child] of Object.entries(node)) if (!['loc', 'start', 'end', 'comments', 'tokens'].includes(key)) walk(child);
  }
  walk(call.arguments[0]);
  function render(start: number, end: number) {
    let text = source.slice(start, end);
    for (const edit of replacements.filter(e => e.start >= start && e.end <= end).sort((a, b) => b.start - a.start)) {
      text = text.slice(0, edit.start - start) + edit.text + text.slice(edit.end - start);
    }
    return text;
  }
  let data = '{}';
  const methods: string[] = [];
  const names = new Set<string>();
  for (const property of call.arguments[0].properties) {
    if (property.type === 'SpreadElement' || property.computed) throw new MigrationError(`${file}: computed/spread Page members unsupported`);
    const name = property.key.type === 'Identifier' ? property.key.name : property.key.type === 'StringLiteral' ? property.key.value : '';
    if (!name || name.startsWith('$') || ['__proto__', 'constructor', 'prototype'].includes(name) || names.has(name)) throw new MigrationError(`${file}: invalid or duplicate Page member ${name}`);
    names.add(name);
    if (name === 'data') {
      if (property.type !== 'ObjectProperty' || property.value.type !== 'ObjectExpression') throw new MigrationError(`${file}: Page data must be an object`);
      data = render(property.value.start!, property.value.end!);
    } else if (property.type === 'ObjectMethod' && property.kind === 'method' || property.type === 'ObjectProperty' && property.value.type === 'FunctionExpression') {
      methods.push(render(property.start!, property.end!));
    } else throw new MigrationError(`${file}: unsupported Page member ${name}`);
  }
  const declarations = statements.filter(n => n !== statement).map(n => source.slice(n.start!, n.end!)).join('\n');
  return `import { setData, event, style } from '../runtime.js';\nimport { wx, getCurrentPages } from '../navigation.js';\n${declarations}\nexport default { props: ['minaQuery'], data() { return ${data}; }, mounted() { if(this.onLoad) this.onLoad(this.minaQuery || {}); if(this.onShow) this.onShow(); }, beforeDestroy() { if(this.onUnload) this.onUnload(); }, methods: { $minaSetData: setData, $minaEvent: event, $minaStyle: style, ${methods.join(',\n')} } };`;
}

export const pageRuntime = `
export function setData(patch, callback) {
  for (const [path, value] of Object.entries(patch)) {
    if (!/^[A-Za-z_$][\\w$]*(?:(?:\\.[A-Za-z_$][\\w$]*)|(?:\\[\\d+\\]))*$/.test(path)) throw new Error('Unsupported setData path: ' + path);
    const parts = path.replace(/\\[(\\d+)\\]/g, '.$1').split('.');
    if (parts.some(key => ['__proto__', 'prototype', 'constructor'].includes(key))) throw new Error('Unsafe setData path');
    let target = this.$data;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (target[key] == null) this.$set(target, key, /^\\d+$/.test(parts[i + 1]) ? [] : {});
      target = target[key];
    }
    this.$set(target, parts[parts.length - 1], value);
  }
  if (callback) this.$nextTick(callback);
}
export function event(original, dataset) {
  return { type: original.type, timeStamp: original.timeStamp, currentTarget: { dataset }, target: { dataset }, detail: { value: original.target && original.target.value }, originalEvent: original };
}
export function style(value) {
  return String(value == null ? '' : value).replace(/"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|url\\([^)]*\\)|(-?\\d*\\.?\\d+)rpx\\b/gi, (token, n) => n === undefined ? token : Number(n) / 7.5 + 'vw');
}
`;
