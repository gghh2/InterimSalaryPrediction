/**
 * Service Worker pour l'application Suivi Salaires Infirmier
 * Stratégie "Network First" pour toujours servir la dernière version quand
 * on est en ligne, avec repli sur le cache hors ligne.
 *
 * IMPORTANT : incrémenter le numéro de version à CHAQUE publication
 * pour purger l'ancien cache sur les appareils.
 */

const CACHE_NAME = 'nurse-salary-tracker-v1.1.0';

const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/data-manager.js',
  './js/salary-manager.js',
  './js/swipe-handler.js',
  './js/mobile-sticky.js',
  './js/google-drive-sync.js',
  './manifest.json',
  // Font Awesome (CDN)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Installation : pré-cache des fichiers + activation immédiate de la nouvelle version
self.addEventListener('install', event => {
  console.log('Service Worker: Installation', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // ne pas attendre la fermeture des onglets
      .catch(err => console.error('Service Worker: Erreur de mise en cache', err))
  );
});

// Activation : suppression des anciens caches + prise de contrôle immédiate
self.addEventListener('activate', event => {
  console.log('Service Worker: Activation', CACHE_NAME);

  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('Service Worker: Suppression ancien cache', name);
            return caches.delete(name);
          })
      ))
      .then(() => self.clients.claim()) // contrôler les pages déjà ouvertes
  );
});

// Interception réseau : Network First avec repli sur le cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre à jour le cache avec la réponse fraîche (réponses valides same-origin)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        // Hors ligne : servir depuis le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Repli ultime pour la navigation
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Permettre à l'app de forcer l'activation d'une nouvelle version
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
