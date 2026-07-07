/* 서비스워커: 오프라인에서도 앱이 열리도록 파일을 캐시한다.
   파일을 수정하면 아래 CACHE 버전을 올려야 새로 반영됨. */
const CACHE = 'ets-toeic-v3';
const ASSETS = [
  './', './index.html', './style.css', './sound.js', './app.js', './words.js',
  './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 외부(CDN 글꼴 등)는 네트워크에 맡김
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
