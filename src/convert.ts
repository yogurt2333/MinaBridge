import { Parser } from 'htmlparser2';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';
import { MigrationError } from './errors.js';

const tags: Record<string, string> = { view: 'div', text: 'span', image: 'img' };
const attributes = new Set(['class', 'id', 'style', 'src', 'alt', 'title']);
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function convertTemplate(source: string, file: string, imageSource: (src: string) => string): string {
  let result = '';
  const parser = new Parser({
    onopentag(name, attrs) {
      const tag = tags[name];
      if (!tag) throw new MigrationError(`${file}: unsupported element <${name}>`);
      const rendered = Object.entries(attrs).map(([key, value]) => {
        if (!attributes.has(key) || value.includes('{{')) throw new MigrationError(`${file}: unsupported attribute ${key}`);
        if (key === 'src') value = imageSource(value);
        if (key === 'style') value = convertStyle(value, file);
        return ` ${key}="${escape(value)}"`;
      }).join('');
      result += `<${tag}${rendered}>`;
    },
    ontext(text) {
      if (text.includes('{{')) throw new MigrationError(`${file}: data bindings are not supported in the static milestone`);
      result += escape(text);
    },
    onclosetag(name) { if (tags[name] !== 'img') result += `</${tags[name]}>`; },
  }, { xmlMode: true, decodeEntities: true });
  parser.end(source);
  return `<div>${result}</div>`;
}

export function convertStyle(source: string, file: string): string {
  const css = postcss.parse(source, { from: file });
  css.walkAtRules(rule => { if (rule.name === 'import') throw new MigrationError(`${file}: CSS imports are not supported yet`); });
  css.walkRules(rule => {
    rule.selector = selectorParser(selectors => {
      selectors.walkTags(tag => { tag.value = tag.value === 'page' ? 'body' : tags[tag.value] ?? tag.value; });
    }).processSync(rule.selector);
  });
  css.walkDecls(decl => {
    const value = valueParser(decl.value);
    value.walk(node => {
      if (node.type === 'function' && node.value.toLowerCase() === 'url') throw new MigrationError(`${file}: CSS url assets are not supported yet`);
      if (node.type === 'word' && /^-?\d*\.?\d+rpx$/.test(node.value)) node.value = `${Number(node.value.slice(0, -3)) / 7.5}vw`;
    });
    decl.value = value.toString();
  });
  return css.toString();
}
