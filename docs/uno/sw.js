const scope = new URL(self.registration.scope);
const name = 'card-app-' + scope.pathname.split('/')[1] + '-50';
const pages = [
  scope.href,
  new URL('install.html',scope).href,
  new URL('online.html?game='+scope.pathname.split('/')[1]+'&mode=local',scope).href,
  ...['/moon.css','/extra-games.js','/card-art.js','/install.js','/qr.js','/duel-rules.js','/online-client.js','/full-moon.js']
    .map(path=>new URL(path,scope).href),
  ...['manifest.webmanifest','icon-192.png','icon-512.png'].map(path=>new URL(path,scope).href)
];
pages.push(...["/locales/ko.json", "/locales/en.json", "/locales/ja.json", "/locales/zh-CN.json", "/locales/zh-TW.json", "/locales/ar.json", "/locales/az.json", "/locales/bg.json", "/locales/ca.json", "/locales/fr-CA.json", "/locales/cs.json", "/locales/de.json", "/locales/da.json", "/locales/et.json", "/locales/es.json", "/locales/es-MX.json", "/locales/fi.json", "/locales/fr.json", "/locales/el.json", "/locales/he.json", "/locales/zh-HK.json", "/locales/hr.json", "/locales/hu.json", "/locales/id.json", "/locales/hi.json", "/locales/it.json", "/locales/lt.json", "/locales/lv.json", "/locales/mt.json", "/locales/ms.json", "/locales/nl.json", "/locales/nb.json", "/locales/fil.json", "/locales/pl.json", "/locales/pt.json", "/locales/pt-BR.json", "/locales/ro.json", "/locales/ru.json", "/locales/sv.json", "/locales/sl.json", "/locales/sk.json", "/locales/th.json", "/locales/tr.json", "/locales/uk.json", "/locales/vi.json"]);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(name).then(cache=>cache.addAll(pages.map(url=>new Request(url,{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  const prefix='card-app-' + scope.pathname.split('/')[1] + '-';
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key.startsWith(prefix)&&key!==name)
    .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!pages.includes(event.request.url)) return;
  event.respondWith(fetch(event.request).catch(async()=>{
    const cache=await caches.open(name);
    return (await cache.match(event.request))||Response.error();
  }));
});
