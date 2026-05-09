/* IntelliCrash Service Worker v3 — Full PWA + Offline Mode */
const CACHE_V = "intellicrash-v3.2";
const STATIC  = ["/", "/index.html", "/navigation", "/predict", "/sos", "/about", "/trips"];

// Static risk data for offline prediction (HP defaults)
const OFFLINE_RISK_CACHE = {
  default: { score: 50, label: "MEDIUM", note: "Offline estimate — RF model unavailable" }
};

// HP hospitals for offline SOS
const OFFLINE_HOSPITALS = [
  { name:"IGMC Shimla",  phone:"0177-2804251", lat:31.1048, lon:77.1734 },
  { name:"Zonal Mandi",  phone:"01905-222170", lat:31.7088, lon:76.9330 },
  { name:"HP Ambulance", phone:"108",          lat:31.1048, lon:77.1734 },
  { name:"HP Police",    phone:"100",          lat:31.1048, lon:77.1734 },
  { name:"HP Emergency", phone:"112",          lat:31.1048, lon:77.1734 },
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_V).then(cache => {
      // Cache static pages
      return cache.addAll(STATIC).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_V).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = e.request.url;

  // Never cache API calls
  if (url.includes("/api/")) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Offline fallback for specific API calls
        if (url.includes("/api/predict")) {
          return e.request.clone().json().then(body => {
            let score = 45;
            if (body.speed > 60) score += 15;
            if (body.criticalZone === "1") score += 20;
            if (body.weather !== "0") score += 10;
            // Add slight randomness based on string length to differentiate routes
            const variation = (JSON.stringify(body).length % 10) - 5;
            return new Response(JSON.stringify({ severity:"2", score: Math.min(100, Math.max(0, score + variation)), xai_explanation:"Offline mode — local estimate", model_used:"Offline" }), { headers:{"Content-Type":"application/json"} });
          }).catch(() => {
            return new Response(JSON.stringify({ severity:"2", score:50, xai_explanation:"Offline mode — using default estimate", model_used:"Offline" }), { headers:{"Content-Type":"application/json"} });
          });
        }
        if (url.includes("/api/contacts")) {
          return new Response(JSON.stringify({ contacts:[{id:1,name:"HP Emergency",phone:"112",email:"",relation:"Emergency"},{id:2,name:"HP Ambulance",phone:"108",email:"",relation:"Medical"},{id:3,name:"Admin",phone:"9015162007",email:"",relation:"Admin"}] }), { headers:{"Content-Type":"application/json"} });
        }
        if (url.includes("/api/health")) {
          return new Response(JSON.stringify({ status:"offline", rf_model:false, note:"No internet connection" }), { headers:{"Content-Type":"application/json"} });
        }
        return new Response(JSON.stringify({ error:"offline", message:"No internet connection. Some features unavailable." }), { status:503, headers:{"Content-Type":"application/json"} });
      })
    );
    return;
  }

  // Cache-first for map tiles
  if (url.includes("tile") || url.includes("openstreetmap") || url.includes("carto")) {
    e.respondWith(
      caches.open(CACHE_V + "-tiles").then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Network-first for app pages, cache fallback
  e.respondWith(
    fetch(e.request).then(res => {
      const resClone = res.clone();
      caches.open(CACHE_V).then(cache => cache.put(e.request, resClone));
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached => cached || caches.match("/index.html"))
    )
  );
});

// Push notifications
self.addEventListener("push", e => {
  const data = e.data?.json() || { title:"⚠️ IntelliCrash Alert", body:"Risk zone detected" };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    "/favicon.ico",
      badge:   "/favicon.ico",
      vibrate: [200, 100, 200, 100, 200],
      tag:     "intellicrash-alert",
      renotify:true,
      data:    data,
      actions: [
        { action:"navigate", title:"🗺️ Open Map" },
        { action:"sos",      title:"🚨 SOS" },
        { action:"dismiss",  title:"Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "navigate") e.waitUntil(clients.openWindow("/navigation"));
  else if (e.action === "sos") e.waitUntil(clients.openWindow("/sos"));
  else e.waitUntil(clients.openWindow("/"));
});

// Background sync for offline reports
self.addEventListener("sync", e => {
  if (e.tag === "sync-reports") {
    e.waitUntil(syncOfflineReports());
  }
});

async function syncOfflineReports() {
  try {
    const db = await openDB();
    const reports = await getOfflineReports(db);
    for (const r of reports) {
      try {
        await fetch("/api/reports", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(r) });
        await deleteOfflineReport(db, r.id);
      } catch {}
    }
  } catch {}
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("intellicrash-offline", 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore("reports", { keyPath:"id", autoIncrement:true });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e);
  });
}
function getOfflineReports(db) { return new Promise((res,rej) => { const tx=db.transaction("reports","readonly"); const store=tx.objectStore("reports"); const req=store.getAll(); req.onsuccess=()=>res(req.result); req.onerror=rej; }); }
function deleteOfflineReport(db, id) { return new Promise((res,rej) => { const tx=db.transaction("reports","readwrite"); tx.objectStore("reports").delete(id); tx.oncomplete=res; tx.onerror=rej; }); }
