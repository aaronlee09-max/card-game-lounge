const scope = new URL(self.registration.scope);
const name = 'card-app-' + scope.pathname.split('/')[1] + '-9';
const pages = [
  scope.href,
  new URL('install.html',scope).href,
  new URL('online.html?game='+scope.pathname.split('/')[1]+'&mode=local',scope).href,
  ...['/moon.css','/extra-games.js','/card-art.js','/install.js','/qr.js','/duel-rules.js','/online-client.js','/full-moon.js']
    .map(path=>new URL(path,scope).href),
  ...['manifest.webmanifest','icon-192.png','icon-512.png'].map(path=>new URL(path,scope).href)
];
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
