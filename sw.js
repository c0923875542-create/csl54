// 每日股市分析報告：離線快取（只快取網頁本身；證交所資料不經此快取，改由頁面存上次結果）
// 更新網頁內容時，請把 CACHE 的版本號加 1，讓使用者拿到新版。
const CACHE = "stock-report-v4";
const ASSETS = [
  "./", "./index.html", "./analysis.js", "./sample-data.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("stock-report-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 同一個網站底下還有其他獨立的網頁（例如 food-map/ 美食地圖），它們有自己的離線程式。
// 這裡只處理股市報告自己的檔案，其他子資料夾一律不攔截，避免離線時被換成股市報告。
const OTHER_APPS = ["food-map/", "reports/"];
const BASE = new URL("./", self.location).pathname;            // 例如 /csl54/
const isOtherApp = (path) => OTHER_APPS.some((dir) => path.startsWith(BASE + dir));
const isReportPage = (path) => path === BASE || path === BASE + "index.html";

// 只處理股市報告的 GET：先試網路拿最新版，失敗再用自己的快取
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || isOtherApp(url.pathname)) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() =>
        caches.open(CACHE).then((c) => c.match(req)).then((hit) => {
          if (hit) return hit;
          // 只有股市報告自己的頁面離線時才退回報告首頁；其他網址照實回報失敗
          if (req.mode === "navigate" && isReportPage(url.pathname)) return caches.match("./index.html", { cacheName: CACHE });
          return Response.error();
        })
      )
  );
});
