/* ECA Changeover Pilot service worker (Chunk 14).
   THIS FILE IS A TEMPLATE. scripts/make-sw.mjs writes dist/sw.js from it after every build and fills in the two values below:
   the cache name (app version + build fingerprint) and the list of ALL built files to precache.
   - Precached files are served cache-first. Every other request is left alone and never cached; the app fetches no network data.
   - Navigation to the app falls back to the cached index.html, so the app opens offline.
   - An update installs in the background and WAITS. It never replaces a running page; the page shows "new version ready, reload"
     and only the user's button sends SKIP_WAITING.
   - Old eca-pilot-* caches are deleted on activate. */
const CACHE = "eca-pilot-v0.18.0-2409a0a6";
const PRECACHE = ["./","./assets/app.css","./assets/app.js","./icon-192.png","./icon-512.png","./icon.svg","./index.html","./manifest.webmanifest"];
const PREFIX = "eca-pilot-";

if (CACHE.indexOf("__ECA_") === 0) {
  // Unbuilt template (for example under `vite dev`): do nothing and remove this worker.
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.registration.unregister()));
} else {
  const abs = (u) => new URL(u, self.registration.scope).href;
  const key = (u) => { const x = new URL(u); return x.origin + x.pathname; };
  const URLS = PRECACHE.map(abs);
  const KEYS = new Set(URLS.map(key));
  const INDEX = abs("./index.html");
  const ENTRY = new Set([key(abs("./")), key(INDEX)]);

  self.addEventListener("install", (e) => {
    // All-or-nothing: if any file cannot be fetched the install fails and the previous worker stays in charge. No skipWaiting here.
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(URLS.map((u) => new Request(u, { cache: "reload" })))));
  });

  self.addEventListener("activate", (e) => {
    e.waitUntil(
      caches.keys()
        .then((names) => Promise.all(names.filter((n) => n.indexOf(PREFIX) === 0 && n !== CACHE).map((n) => caches.delete(n))))
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener("message", (e) => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });

  self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (req.mode === "navigate") {
      e.respondWith(caches.open(CACHE).then(async (c) => {
        if (ENTRY.has(key(req.url))) { const hit = await c.match(INDEX); if (hit) return hit; }
        try { return await fetch(req); }
        catch (err) { const hit = await c.match(INDEX); if (hit) return hit; throw err; }
      }));
      return;
    }
    if (!KEYS.has(key(req.url))) return; // not precached: untouched and never stored
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(key(req.url))) || fetch(req)));
  });
}
