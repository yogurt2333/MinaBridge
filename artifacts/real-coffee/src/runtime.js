
export function hover(event, classes, active) {
  for (const name of String(classes || '').split(/\s+/).filter(name => name && name !== 'none')) event.currentTarget.classList.toggle(name, active);
}
export function setData(patch, callback) {
  for (const [path, value] of Object.entries(patch)) {
    if (!/^[A-Za-z_$][\w$]*(?:(?:\.[A-Za-z_$][\w$]*)|(?:\[\d+\]))*$/.test(path)) throw new Error('Unsupported setData path: ' + path);
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    if (parts.some(key => ['__proto__', 'prototype', 'constructor'].includes(key))) throw new Error('Unsafe setData path');
    let target = this.$data;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (target[key] == null) this.$set(target, key, /^\d+$/.test(parts[i + 1]) ? [] : {});
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
  return String(value == null ? '' : value).replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\([^)]*\)|(-?\d*\.?\d+)rpx\b/gi, (token, n) => n === undefined ? token : Number(n) / 7.5 + 'vw');
}
