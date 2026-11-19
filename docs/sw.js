const cacheName = 'moon-game-v50';
const core = ['./', './index.html', '/uno/icon-192.png', '/blackjack/icon-192.png', './site-language.js', './profile-download-ko.svg', './profile-download-en.svg', './mobileconfig-download.png', './lounge-install.html', './lounge.webmanifest', './lounge-192.png', './lounge-512.png', '/uno/', '/blackjack/', '/uno/manifest.webmanifest', '/blackjack/manifest.webmanifest', './moonring', './moon-install.html', './app.js', './full-moon.js', './moon.css', './install.js',
  './manifest.webmanifest', './moon-192.png', './moon-512.png', './moon-offline.html', './extra-games.js', './card-art.js', './online.html', './online-client.js', './duel-rules.js', './qr.js'];
core.push(...["/locales/ko.json", "/locales/en.json", "/locales/ja.json", "/locales/zh-CN.json", "/locales/zh-TW.json", "/locales/ar.json", "/locales/az.json", "/locales/bg.json", "/locales/ca.json", "/locales/fr-CA.json", "/locales/cs.json", "/locales/de.json", "/locales/da.json", "/locales/et.json", "/locales/es.json", "/locales/es-MX.json", "/locales/fi.json", "/locales/fr.json", "/locales/el.json", "/locales/he.json", "/locales/zh-HK.json", "/locales/hr.json", "/locales/hu.json", "/locales/id.json", "/locales/hi.json", "/locales/it.json", "/locales/lt.json", "/locales/lv.json", "/locales/mt.json", "/locales/ms.json", "/locales/nl.json", "/locales/nb.json", "/locales/fil.json", "/locales/pl.json", "/locales/pt.json", "/locales/pt-BR.json", "/locales/ro.json", "/locales/ru.json", "/locales/sv.json", "/locales/sl.json", "/locales/sk.json", "/locales/th.json", "/locales/tr.json", "/locales/uk.json", "/locales/vi.json"]);
const startURL = new URL('./', self.location.href).href;
const coreURLs = new Set(core.map(path => new URL(path, startURL).href));

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(
    core.map(path => new Request(path, { cache: 'reload' }))
  )));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('moon-game-') && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const navigation = request.mode === 'navigate' && ['/', '/index.html', '/moonring', '/moon-install.html', '/lounge-install.html'].includes(url.pathname);
  const localGame = request.mode === 'navigate' && url.pathname === new URL('./online.html', startURL).pathname && url.searchParams.get('mode') === 'local';
  if (!navigation && !localGame && !coreURLs.has(url.origin+url.pathname)) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(request, {ignoreSearch:true})) || (navigation && await cache.match(startURL)) || Response.error();
  }));
});
