export function navigationRuntime(namespace: string) { return `
let host;
let routes;
const storagePrefix = ${JSON.stringify('minabridge:' + namespace + ':')};
let nextId = 0;
const instances = new Map();
export function registerPage(id, instance) { instances.set(id, instance); }
export function unregisterPage(id) { instances.delete(id); }
function entry(url) {
  const current = host && host.stack[host.stack.length - 1];
  const base = 'https://minabridge.local/' + (current ? current.route : '');
  const parsed = new URL(url, base);
  const route = parsed.pathname.slice(1);
  if (parsed.origin !== 'https://minabridge.local' || !Object.hasOwn(routes, route)) throw new Error('Unknown page: ' + url);
  return { id: nextId++, route, query: Object.fromEntries(parsed.searchParams) };
}
function current() { return instances.get(host.stack[host.stack.length - 1].id); }
function hook(page, name) { if (page && page[name]) page[name](); }
function updateUrl() {
  const top = host.stack[host.stack.length - 1];
  history.replaceState(null, '', '#/' + top.route + '?' + new URLSearchParams(top.query));
}
export const wx = {
  navigateTo({url}) {
    const next = entry(url);
    hook(current(), 'onHide');
    host.stack.push(next);
    updateUrl();
  },
  navigateBack({delta = 1} = {}) {
    if (!Number.isInteger(delta) || delta < 1) throw new Error('Invalid navigation delta');
    if (host.stack.length === 1) return;
    hook(current(), 'onHide');
    host.stack.splice(Math.max(1, host.stack.length - delta));
    updateUrl();
    host.$nextTick(() => hook(current(), 'onShow'));
  },
  reLaunch({url}) {
    const next = entry(url);
    hook(current(), 'onHide');
    host.stack = [next];
    updateUrl();
  },
  getStorageSync(key) {
    const value = localStorage.getItem(storagePrefix + String(key));
    return value === null ? '' : JSON.parse(value);
  },
  setStorageSync(key, value) {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('Storage value must be JSON serializable');
    localStorage.setItem(storagePrefix + String(key), encoded);
  },
  removeStorageSync(key) { localStorage.removeItem(storagePrefix + String(key)); },
  getWindowInfo() { return { windowWidth: innerWidth, windowHeight: innerHeight, screenWidth: screen.width, screenHeight: screen.height, pixelRatio: devicePixelRatio, statusBarHeight: 0, safeArea: {top:0,left:0,right:innerWidth,bottom:innerHeight,width:innerWidth,height:innerHeight} }; },
  getSystemInfoSync() { return wx.getWindowInfo(); },
  getMenuButtonBoundingClientRect() { return { top:0,bottom:0,left:0,right:0,width:0,height:0 }; },
  showToast({title, duration = 1500}) {
    const toast = document.createElement('div');
    toast.setAttribute('role','status');
    toast.textContent = String(title);
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px;background:#222;color:white;z-index:9999';
    document.body.append(toast);
    setTimeout(() => toast.remove(), duration);
  }
};
export function getCurrentPages() { return host.stack.map(item => instances.get(item.id)).filter(Boolean); }
export function mountPages(Vue, pageRoutes) {
  routes = pageRoutes;
  const initial = entry(location.hash.slice(1) || '/' + Object.keys(routes)[0]);
  host = new Vue({
    data: { stack: [initial] },
    render(h) {
      return h('div', {class:'minabridge-stack'}, this.stack.map((item, index) => h(routes[item.route], {
        key: item.id, ref: 'page' + item.id, props: { minaQuery: item.query, minaId:item.id },
        style: { display: index === this.stack.length - 1 ? '' : 'none' }
      })));
    }
  });
  host.$mount('#app');
}
`; }
