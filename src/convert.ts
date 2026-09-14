import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';
import { MigrationError } from './errors.js';
import { tags } from './template.js';
export { convertTemplate } from './template.js';

export function convertStyle(source: string, file: string, pageStyle = false): string {
  try {
  const css = postcss.parse(source, { from: file, map: { prev: false } });
  css.walkAtRules(rule => { if (rule.name === 'import') throw new MigrationError(`${file}: CSS imports are not supported yet`); });
  css.walkRules(rule => {
    rule.selector = selectorParser(selectors => {
      selectors.walkTags(tag => {
        if (tag.value === 'page' && pageStyle) tag.replaceWith(selectorParser.className({ value: 'minabridge-page' }));
        else tag.value = tag.value === 'page' ? 'body' : tags[tag.value] ?? tag.value;
      });
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
  } catch (error) {
    if (error instanceof MigrationError) throw error;
    throw new MigrationError(`${file}: invalid WXSS: ${error instanceof Error ? error.message : String(error)}`);
  }
}
