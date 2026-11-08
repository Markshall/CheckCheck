// Keeps CheckCheck working with no signal, as stockrooms often have none.
//
// The pages (the app, and the labels page its print button opens) come from
// the network when they can, so a deploy shows up straight away, and from the
// cache when the network is down or too slow. Each time a fresh copy of one
// arrives, everything it needs is cached with it: the built CSS and JS it
// links to and the fonts that CSS loads. Built files have a content
// hash in their names and never change, so they're served from the cache
// first, and ones that only older pages used are deleted.
//
// This file isn't built by Vite, so it's plain JavaScript.

const CACHE = 'checkcheck';
const NETWORK_TIMEOUT = 3000;
const SCOPE = self.registration.scope;
const PAGE = SCOPE;
const LABELS = new URL('labels.html', SCOPE).href;
const PAGES = [PAGE, LABELS];
const ASSETS = new URL('assets/', SCOPE).href;
const STATIC = ['manifest.webmanifest', 'logo.png', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png']
  .map(path => new URL(path, SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    for (const url of PAGES) {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Couldn't fetch ${url}: ${response.status}`);
      await savePage(url, response);
    }
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

// Which page a navigation is for: the labels page, or the app for anything
// else (./, ./index.html, ./?utm_source=…).
function pageFor(url) {
  return new URL(url).pathname === new URL(LABELS).pathname ? LABELS : PAGE;
}

// The network's copy of the page, or the cached one if the network fails or
// takes longer than NETWORK_TIMEOUT.
async function page(event) {
  const key = pageFor(event.request.url);
  const network = fetch(event.request).then(response => {
    if (response.ok) event.waitUntil(savePage(key, response.clone()));
    return response;
  });
  network.catch(() => {});

  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT))
    .then(() => caches.match(key))
    .then(cached => cached || network);

  try {
    return await Promise.race([network, timeout]);
  } catch (error) {
    const cached = await caches.match(key);
    if (cached) return cached;
    throw error;
  }
}

// Cached copies are matched on their URL alone. The page asks for its CSS
// and JS with an Origin header (Vite adds crossorigin to their tags), but
// they were cached without one, so a server that sends Vary: Origin (like
// vite preview) would otherwise never match them and break the app offline.
// They never change at the same URL, so the Vary header doesn't matter.
const MATCH = { ignoreVary: true };

async function asset(request) {
  const cached = await caches.match(request, MATCH);
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
  const cached = await cache.match(event.request, MATCH);
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

// Caches a page (PAGE or LABELS) and the built files it needs, and drops
// built files that neither cached page uses any more.
async function savePage(key, response) {
  const cache = await caches.open(CACHE);
  await cacheAssets(cache, await response.clone().text(), key, true);
  await cache.put(key, response);

  const needed = new Set();
  for (const url of PAGES) {
    const cached = await cache.match(url);
    if (cached) for (const asset of await cacheAssets(cache, await cached.text(), url, false)) needed.add(asset);
  }

  for (const request of await cache.keys()) {
    if (request.url.startsWith(ASSETS) && !needed.has(request.url)) await cache.delete(request);
  }
}

// The built files a page needs, and the ones its CSS needs in turn. With
// fetchMissing, any that aren't cached yet are fetched and cached.
async function cacheAssets(cache, html, base, fetchMissing) {
  const queue = linkedAssets(html, base);
  const needed = new Set();

  while (queue.length) {
    const url = queue.shift();
    if (needed.has(url)) continue;
    needed.add(url);

    let file = await cache.match(url);
    if (!file && fetchMissing) {
      file = await fetch(url);
      if (!file.ok) throw new Error(`Couldn't fetch ${url}: ${file.status}`);
      await cache.put(url, file.clone());
    }

    if (file && url.endsWith('.css')) {
      // Skip the .woff fallbacks: every browser with service workers reads woff2.
      queue.push(...linkedAssets(await file.text(), url).filter(link => !link.endsWith('.woff')));
    }
  }

  return needed;
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
