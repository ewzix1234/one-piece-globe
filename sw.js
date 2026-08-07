/**
 * Service worker : le globe doit rester consultable sans réseau.
 * Tout est pré-chargé à l'installation ; aucune ressource n'est distante.
 */
const CACHE = "blue-star-v4";

const ASSETS = [
  ".",
  "index.html",
  "manifest.webmanifest",
  "src/style.css",
  "src/app.js",
  "src/texture.js",
  "vendor/globe.gl.min.js",
  "data/islands.json",
  "icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll échoue en bloc si une seule ressource manque : on tolère
      // les absences pour ne pas rendre l'installation impossible.
      .then((cache) =>
        Promise.all(
          ASSETS.map((url) =>
            cache.add(url).catch((err) => console.warn("non mis en cache :", url, err)),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ??
        fetch(event.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(event.request, copy));
            }
            return res;
          })
          .catch(() => caches.match("index.html")),
    ),
  );
});
