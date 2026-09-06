const CACHE_NAME = 'agent-3d-builder-v28-force';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  // บังคับให้ Service Worker ตัวใหม่เปิดทำงานทันทีโดยไม่ต้องรอปิดแท็บ
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // ล้างแคชเวอร์ชันเก่าทิ้งทั้งหมดทันที
          if (key !== CACHE_NAME) {
            console.log('Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // เข้าควบคุมทุกหน้าเว็บทันที
  );
});

self.addEventListener('fetch', (event) => {
  // ไม่แตะต้องคำสั่งเรียก Gemini API
  if (event.request.url.includes('googleapis.com') || event.request.method !== 'GET') {
    return;
  }

  const isHtml = event.request.mode === 'navigate' || 
                 event.request.url.endsWith('index.html') || 
                 event.request.url.endsWith('/') ||
                 (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  if (isHtml) {
    // ใช้ Network-First สำหรับหน้าเว็บ เพื่อดึงไฟล์สดล่าสุดจากเซิร์ฟเวอร์ก่อนเสมอ
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ทรัพยากรอื่น ๆ ใช้ Cache-First พร้อมสำรอง Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {})
  );
});
