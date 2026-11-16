# 工作資料夾指引

## 專案背景
- 本資料夾主要內容是「每日股市分析報告」網頁 App（PWA），位於根目錄；`food-map/` 是另一個獨立示範。
- 原本的「報修／問題登記系統」示範已依使用者要求移除，需要時可從 git 歷史取回。
- 溝通與交付內容預設使用繁體中文。
- 示範資料（`sample-data.js`）必須是虛構公司與數字，勿加入真實公司名稱。
- 真實行情只放在 `data/latest.json`，由 GitHub Actions 自動抓取更新；不要手動編輯或放入其他真實資料檔。

## 技術與結構
- 純靜態網頁，無建置步驟與套件：`index.html`（介面）、`analysis.js`（資料正規化與分析，純函式）、`sample-data.js`、`sw.js`（離線快取）、`manifest.webmanifest`、`icons/`。
- 證交所與公開資訊觀測站都不允許網頁跨站讀取，所以由 `scripts/fetch-data.mjs`（Node 22，無套件）在 GitHub Actions（`.github/workflows/update-data.yml`，交易日 14:47、15:30、21:17）抓好，寫入 `data/latest.json`，網頁只讀這個同站檔案。
- 資料來源：證交所主站 `afterTrading/MI_INDEX`（全部收盤行情）、`afterTrading/FMTQIK`、`fund/BFI82U`、`fund/T86`；OpenAPI `STOCK_DAY_ALL`、`MI_INDEX`（備援）、`opendata/t187ap05_L`（月營收）、`exchangeReport/TWT48U_ALL`（除權息）、`opendata/t187ap04_L`（重大訊息備援）；公開資訊觀測站 `mopsov.twse.com.tw/mops/web/ajax_t05sr01_1`（即時重大訊息）。欄位名稱可能變動，解析時要容錯。
- 證交所主站有頻率限制（請求間隔至少 2.5 秒）；公開資訊觀測站短時間查詢太多次會暫時封鎖，被擋時不要重試。
- 每個資料來源各自獨立，失敗記在 `errors`，只有個股行情全部失敗才算抓取失敗。
- 排行與家數只計四碼普通股；漲停／跌停依前日收盤 ±10% 按升降單位取價判斷。
- 修改網頁檔案後，把 `sw.js` 的 `CACHE` 版本號加 1。
- 不得把任何 API 金鑰或機密放進前端或版本控制。

## 工作與驗證
- 修改 `analysis.js` 或 `scripts/fetch-data.mjs` 後，用 Node 測試數字解析、日期轉換、漲跌家數、漲跌停、CSV 解析、各來源轉換與錯誤處理；可用真實回應存檔當測試資料。
- 在雲端工作階段執行抓取程式時，Node 需加 `NODE_USE_ENV_PROXY=1` 才會走代理。
- 介面修改後，用瀏覽器（Playwright）確認：真實資料顯示（含三大法人、重大訊息、月營收、除權息）、資料檔不存在與連線失敗提示、快取、示範資料、CSV 匯入、手機寬度無水平捲動、深色模式。
- 連線若在當前環境被擋，應如實說明，並以存下的真實回應或模擬回應測試。
- 報告內容須保留「僅供參考，不構成投資建議」的聲明。
