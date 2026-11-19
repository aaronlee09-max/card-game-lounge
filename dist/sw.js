const cacheName = 'moon-game-v27';
const core = ['./', './index.html', '/uno/icon-192.png', '/blackjack/icon-192.png', './site-language.js', './profile-download-ko.svg', './profile-download-en.svg', './mobileconfig-download.png', './lounge-install.html', './lounge.webmanifest', './lounge-192.png', './lounge-512.png', '/uno/', '/blackjack/', '/uno/manifest.webmanifest', '/blackjack/manifest.webmanifest', './moonring', './moon-install.html', './app.js', './full-moon.js', './moon.css', './install.js',
  './manifest.webmanifest', './moon-192.png', './moon-512.png', './moon-offline.html', './extra-games.js', './card-art.js', './online.html', './online-client.js', './duel-rules.js', './qr.js'];
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
