/**
 * Service Worker - SAP BTP Portal de Logística & Estoque RF
 * Provê funcionamento offline, cache inteligente de assets e suporte PWA
 */

const CACHE_NAME = 'sap-estoque-rf-v1.0.3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/audio.js',
  './js/scanner.js',
  './js/offline-queue.js',
  './js/store.js',
  './js/gs1-parser.js',
  './js/label-printer.js',
  './js/cockpit-analytics.js',
  './js/pwa.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

// Instalação do Service Worker - Pré-carrega o Shell da aplicação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pré-carregando assets essenciais do portal...');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Aviso ao cachear assets iniciais:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Ativação - Limpa versões antigas do cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache obsoleto:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições de rede
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Chamadas OData SAP e APIs BTP -> Network First (Sempre tenta online primeiro)
  if (url.pathname.startsWith('/sap/') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({
            offline: true,
            error: 'Dispositivo sem conexão com o SAP BTP no momento.'
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 2. Arquivos de aplicação e fontes -> Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
