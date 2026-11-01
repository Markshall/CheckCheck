// Keeps CheckCheck working with no signal, as stockrooms often have none.
//
// The page comes from the network when it can, so a deploy shows up straight
// away, and from the cache when the network is down or too slow. Each time a
// fresh copy arrives, everything it needs is cached with it: the built CSS
// and JS it links to and the fonts that CSS loads. Built files have a content
// hash in their names and never change, so they're served from the cache
// first, and ones an older page used are deleted.
//
// This file isn't built by Vite, so it's plain JavaScript.

const CACHE = 'checkcheck';
const NETWORK_TIMEOUT = 3000;
const SCOPE = self.registration.scope;
const PAGE = SCOPE;
const ASSETS = new URL('assets/', SCOPE).href;
const STATIC = ['manifest.webmanifest', 'logo.png', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png']
  .map(path => new URL(path, SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(PAGE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Couldn't fetch the page: ${response.status}`);

    await savePage(response);
    const cache = await caches.open(CACHE);
    await cache.addAll(STATIC);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(page(event));
  } else if (request.url.startsWith(ASSETS)) {
    event.respondWith(asset(request));
  } else if (STATIC.includes(request.url)) {
    event.respondWith(staticFile(event));
  }
});

// The network's copy of the page, or the cached one if the network fails or
// takes longer than NETWORK_TIMEOUT.
async function page(event) {
  const network = fetch(event.request).then(response => {
    if (response.ok) event.waitUntil(savePage(response.clone()));
    return response;
  });
  network.catch(() => {});

  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT))
    .then(() => caches.match(PAGE))
    .then(cached => cached || network);

  try {
    return await Promise.race([network, timeout]);
  } catch (error) {
    const cached = await caches.match(PAGE);
    if (cached) return cached;
    throw error;
  }
}

async function asset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// From the cache straight away, updated in the background for next time.
async function staticFile(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then(async response => {
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  });

  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

// Caches the page and the built files it needs, and drops built files that
// only an older page used.
async function savePage(response) {
  const cache = await caches.open(CACHE);
  const queue = linkedAssets(await response.clone().text(), PAGE);
  const needed = new Set();

  while (queue.length) {
    const url = queue.shift();
    if (needed.has(url)) continue;
    needed.add(url);

    let file = await cache.match(url);
    if (!file) {
      file = await fetch(url);
      if (!file.ok) throw new Error(`Couldn't fetch ${url}: ${file.status}`);
      await cache.put(url, file.clone());
    }

    if (url.endsWith('.css')) {
      // Skip the .woff fallbacks: every browser with service workers reads woff2.
      queue.push(...linkedAssets(await file.text(), url).filter(link => !link.endsWith('.woff')));
    }
  }

  for (const request of await cache.keys()) {
    if (request.url.startsWith(ASSETS) && !needed.has(request.url)) await cache.delete(request);
  }

  await cache.put(PAGE, response);
}

// Built files linked from HTML (src="…", href="…") or CSS (url(…)).
function linkedAssets(text, base) {
  const urls = [];

  for (const match of text.matchAll(/(?:src|href)="([^"]+)"|url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const url = new URL(match[1] || match[2], base).href;
    if (url.startsWith(ASSETS)) urls.push(url);
  }

  return urls;
}
