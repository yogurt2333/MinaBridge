import { Parser } from 'htmlparser2';
import { parseExpression } from '@babel/parser';
import { MigrationError } from './errors.js';

export const tags: Record<string, string> = { view: 'div', text: 'span', image: 'img', input: 'input', 'scroll-view': 'div', block: 'template', button: 'button' };
const attrs = new Set(['class', 'id', 'style', 'src', 'alt', 'title', 'value', 'placeholder', 'type', 'disabled', 'maxlength']);
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function expression(value: string, file: string): string {
  const chunks: string[] = [];
  let cursor = 0;
  for (const match of value.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    if (match.index! > cursor) chunks.push(JSON.stringify(value.slice(cursor, match.index)));
    const text = match[1]!.trim();
    try { parseExpression(text); } catch { throw new MigrationError(`${file}: invalid binding ${text}`); }
    chunks.push(`(${text})`);
    cursor = match.index! + match[0].length;
  }
  if (cursor < value.length) chunks.push(JSON.stringify(value.slice(cursor)));
  return chunks.length ? chunks.join(' + ') : JSON.stringify(value);
}

export function convertTemplate(source: string, file: string, imageSource: (src: string) => string): string {
  let output = '';
  const parser = new Parser({
    onopentag(name, attributes) {
      const tag = tags[name];
      if (!tag) throw new MigrationError(`${file}:${parser.startIndex}: unsupported element <${name}>`);
      if (name === 'block' && attributes['wx:for'] && attributes['wx:key']) throw new MigrationError(`${file}:${parser.startIndex}: keyed block loops are unsupported; use a real view element`);
      const emitted: string[] = [];
      const styles: string[] = [];
      const dataset = Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, val]) => `${JSON.stringify(key.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))}: ${expression(val, file)}`).join(',');
      const bind = (key: string, value: string) => emitted.push(` ${key}="${escape(value)}"`);
      if (attributes['wx:for']) {
        const item = attributes['wx:for-item'] || 'item';
        const index = attributes['wx:for-index'] || 'index';
        if (!/^[A-Za-z_$][\w$]*$/.test(item) || !/^[A-Za-z_$][\w$]*$/.test(index)) throw new MigrationError(`${file}: invalid loop alias`);
        bind('v-for', `(${item}, ${index}) in ${expression(attributes['wx:for'], file)}`);
        const key = attributes['wx:key'];
        if (key) bind(':key', key === '*this' ? item : key.includes('{{') ? expression(key, file) : `${item}[${JSON.stringify(key)}]`);
      }
      for (const [key, raw] of Object.entries(attributes)) {
        if (['wx:for', 'wx:for-item', 'wx:for-index', 'wx:key'].includes(key)) continue;
        if (key === 'wx:if' || key === 'wx:elif') { bind(key === 'wx:if' ? 'v-if' : 'v-else-if', expression(raw, file)); continue; }
        if (key === 'wx:else') { emitted.push(' v-else'); continue; }
        const event = /^(bind|catch):?(tap|input|confirm|change)$/.exec(key);
        if (event) {
          if (!/^[A-Za-z_$][\w$]*$/.test(raw)) throw new MigrationError(`${file}: unsupported event handler ${raw}`);
          const action = event[2] === 'tap' ? 'click' : event[2] === 'confirm' ? 'keydown.enter' : event[2];
          bind(`@${action}${event[1] === 'catch' ? '.stop' : ''}`, `${raw}($minaEvent($event, {${dataset}}))`);
          continue;
        }
        if (key.startsWith('data-')) { bind(`:${key}`, expression(raw, file)); continue; }
        if (name === 'scroll-view' && (key === 'scroll-x' || key === 'scroll-y')) { styles.push(`(${expression(raw || '{{true}}', file)} ? ${JSON.stringify(`overflow-${key.slice(-1)}:auto;`)} : '')`); continue; }
        if (key === 'style') { styles.push(expression(raw, file)); continue; }
        if (!attrs.has(key)) throw new MigrationError(`${file}:${parser.startIndex}: unsupported attribute ${key}`);
        if (raw.includes('{{')) bind(`:${key}`, expression(raw, file));
        else bind(key, key === 'src' ? imageSource(raw) : raw);
      }
      if (styles.length) bind(':style', `$minaStyle(${styles.join(" + ';' + ")})`);
      output += `<${tag}${emitted.join('')}>`;
    },
    ontext(text) { expression(text, `${file}:${parser.startIndex}`); output += escape(text); },
    onclosetag(name) { if (!['img', 'input'].includes(tags[name]!)) output += `</${tags[name]}>`; },
  }, { xmlMode: true, decodeEntities: true });
  parser.end(source);
  return `<div class="minabridge-page">${output}</div>`;
}
