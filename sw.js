// 鍛錬寺 service worker — オフライン対応（簡易キャッシュ）
const CACHE = 'tanrenji-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// Firebase SDK はバージョン固定のURLなので、キャッシュ優先で持っておく（電波がなくても起動できるように）
const SDK_HOST = 'www.gstatic.com';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === SDK_HOST && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }))
    );
    return;
  }
  // 他のサイト（Firebaseの通信・Googleログインなど）には触らない
  if (url.origin !== self.location.origin) return;
  // ネット優先・失敗時キャッシュ（更新をすぐ反映しつつオフラインでも動く）
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
