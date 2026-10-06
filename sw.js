const CACHE = 'owners-4e7706bfb2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE && n !== NOTES).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
// A notification from the business laptop: someone clocked in or out. The message arrives encrypted and
// only this phone can read it, so the text is already here and nothing needs fetching to show it.
// Each notification is also written down on this phone for a week (Profile > Notifications shows the list), in a
// small cache of its own that survives app updates.
const NOTES = 'ninja-notes';
function remember(d) {
  return caches.open(NOTES).then(c => c.match('./__notes.json').then(r => r ? r.json() : []).catch(() => []).then(list => {
    const cut = Date.now() - 7 * 86400000;
    const next = [{ at: Date.now(), title: String(d.title || 'Ninja').slice(0, 120), body: String(d.body || '').slice(0, 400), tab: d.tab || 'Team' }].concat((Array.isArray(list) ? list : []).filter(n => n && n.at > cut)).slice(0, 300);
    return c.put('./__notes.json', new Response(JSON.stringify(next), { headers: { 'content-type': 'application/json' } }));
  })).catch(() => {});
}
self.addEventListener('push', e => {
  let d = { title: 'Ninja', body: '' };
  try { d = Object.assign(d, e.data ? e.data.json() : {}); } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(remember(d));
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: './icon-192.png', badge: './icon-192.png',
    tag: d.tag || 'ninja', renotify: true, data: { tab: d.tab || 'Team' },
  }));
});
// Tapping it brings the app forward rather than opening a second copy.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // backend calls go straight to Google
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
