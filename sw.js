// Painel de Controle — service worker: abre sem internet e mostra as notificações dos lembretes.
const CACHE = 'painel-v2.11';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './badge-96.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;            // Supabase, fontes e bibliotecas: direto na rede
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = {title: 'Painel de Controle', body: e.data ? e.data.text() : ''}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Painel de Controle', {
    body: d.body || '', icon: 'icon-192.png', badge: 'badge-96.png', tag: d.tag || undefined, renotify: !!d.tag,
    requireInteraction: d.kind === 'lembrete', data: {url: d.url || './#planner', task: d.task || null}
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const task = e.notification.data && e.notification.data.task;
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    const c = list.find(w => w.url.startsWith(self.registration.scope));
    if (c) { if (task) c.postMessage({type: 'open-task', id: task}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
