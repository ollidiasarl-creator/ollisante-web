/*
 * Ollisanté : fonctionnement hors connexion et réseau lent (servi à la racine : /sw.js).
 * - Pages : réseau d'abord (4 s maximum), sinon la dernière version enregistrée.
 * - Fichiers du site (/site/assets/, noms changés à chaque version) : enregistrés une fois, servis depuis le téléphone.
 * - Informations publiques de l'API (pays, spécialités, médecins, structures, actualités, aide) : réseau d'abord,
 *   sinon les dernières reçues. Ce sont des listes publiques ; rien de personnel (compte, rendez-vous) n'est enregistré.
 */
const VERSION = 'ollisante-v1';
// Le serveur ajoute « Vary: Origin » : sans cette option, une copie enregistrée ne correspondrait pas aux appels du site.
const MATCH = { ignoreVary: true };
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;
const PUBLIC_API = /^\/api\/v1\/(countries|specialties|app-config|news|faq|practitioners|facilities)(\/|\?|$)/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // La page et les fichiers qu'elle charge : le site s'ouvre ensuite même sans réseau.
      const res = await fetch('/', { cache: 'no-store' });
      await cache.put('/', res.clone());
      const html = await res.text();
      const files = [...html.matchAll(/(?:src|href)="(\/site\/[^"]+)"/g)].map((m) => m[1]);
      await cache.addAll([...new Set(files)]).catch(() => undefined);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.startsWith(VERSION)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

/** Réseau d'abord, mais sans attendre plus de `ms` : au-delà, la copie enregistrée (le réseau la met à jour ensuite). */
async function networkFirst(request, cacheName, key, ms) {
  const cache = await caches.open(cacheName);
  const network = fetch(request).then((res) => {
    if (res.ok) cache.put(key, res.clone());
    return res;
  });
  const saved = await cache.match(key, MATCH);
  if (!saved) return network;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(saved), ms));
  return Promise.race([network.catch(() => saved), timeout]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages du site (une seule page, la navigation se fait après le #).
  if (req.mode === 'navigate' && (url.pathname === '/' || url.pathname.startsWith('/site'))) {
    event.respondWith(networkFirst(req, SHELL, '/', 4000).catch(() => caches.match('/', MATCH)));
    return;
  }
  // Fichiers du site : leur nom change à chaque version, la copie enregistrée est donc toujours la bonne.
  if (url.pathname.startsWith('/site/assets/') || url.pathname.startsWith('/media/')) {
    event.respondWith(
      caches.match(req, MATCH).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }
  // Informations publiques (les mêmes pour tous) : enregistrées pour être lues sans réseau.
  if (PUBLIC_API.test(url.pathname + url.search)) {
    event.respondWith(networkFirst(req, DATA, req.url, 5000));
  }
});
