每日股市分析報告
依臺灣證券交易所與公開資訊觀測站資料，自動產生每日台股市場分析報告：大盤、漲跌家數、量能、漲跌幅分布、排行、三大法人買賣超、重大訊息、月營收、除權息預告與自選股。
可安裝為 PWA，介面可離線開啟；抓不到資料時可改看上次快取、虛構示範資料，或匯入 CSV。

資料由 GitHub Actions 在每個交易日 14:47、16:23、21:17（台北時間）自動抓取，存成 [data/latest.json](data/latest.json)。
也可以到 GitHub 的 Actions 頁面，選「更新每日股市資料」→ Run workflow 手動更新。

- 入口：[index.html](index.html)（需透過網址開啟，例如 GitHub Pages；直接雙擊檔案無法使用）
- 分析邏輯：[analysis.js](analysis.js)（純函式，瀏覽器與 Node 皆可載入）
- 抓資料程式：[scripts/fetch-data.mjs](scripts/fetch-data.mjs)；排程：[.github/workflows/update-data.yml](.github/workflows/update-data.yml)
- 示範資料：[sample-data.js](sample-data.js)（全部虛構）

本頁由程式自動產生，僅供參考，不構成任何投資建議。

槺榔梧棲美食地圖（PWA，另一個示範）：[food-map/](food-map/)
