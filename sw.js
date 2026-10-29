// يجعل الموقع يعمل كتطبيق ويُفتح بسرعة؛ الصفحات تُجلب من الشبكة أولاً ليظهر أحدث محتوى
const CACHE = 'farjan-v4';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'data.js', 'icons.js', 'firebase-config.js', 'assets/logo.png', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Firebase ويوتيوب مباشرة
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
