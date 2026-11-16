// 每日股市資料抓取：由 GitHub Actions 定時執行，整理成 data/latest.json 給網頁讀取。
// 證交所與公開資訊觀測站都不允許網頁直接跨站讀取，所以改在伺服器端先抓好。
// 用法：node scripts/fetch-data.mjs [輸出路徑，預設 data/latest.json]
// 每個資料來源各自獨立，失敗只記在 errors，不讓整份報告中斷；只有個股行情抓不到才算失敗。
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const A = require("../analysis.js");

const WWW = "https://www.twse.com.tw/rwd/zh/";
const OPENAPI = "https://openapi.twse.com.tw/v1/";
const MOPS = "https://mopsov.twse.com.tw/mops/web/";
const UA = "Mozilla/5.0 (compatible; daily-stock-report/1.0)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastWww = 0;

// 證交所主站有頻率限制（約每 5 秒 3 次），連續請求之間至少間隔 2.5 秒；失敗重試 3 次
async function get(url, { type = "json", method = "GET", body, headers = {} } = {}) {
  if (url.startsWith(WWW)) {
    const wait = lastWww + 2500 - Date.now();
    if (wait > 0) await sleep(wait);
    lastWww = Date.now();
  }
  let err;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        method, body, signal: AbortSignal.timeout(45000),
        headers: { "user-agent": UA, accept: type === "json" ? "application/json" : "*/*", ...headers },
      });
      const text = await res.text();
      if (/FOR SECURITY REASONS/i.test(text)) { const e = new Error("公開資訊觀測站因安全性考量拒絕查詢（短時間查詢太多次，稍後會解除）"); e.noRetry = true; throw e; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (type !== "json") return text;
      try { return JSON.parse(text); } catch { throw new Error("回應不是 JSON：" + text.slice(0, 80)); }
    } catch (e) {
      err = e;
      if (e.noRetry) break; // 被擋時重試只會擋更久
      await sleep(3000 * (i + 1));
    }
  }
  throw new Error(`${url.replace(/\?.*/, "")}：${err.message}`);
}

const stripTags = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
const clean = (s) => String(s ?? "").replace(/,/g, "").trim();
const tw = (d = new Date()) => new Date(d.getTime() + 8 * 3600e3); // 台北時間（無日光節約）
const ymd = (d) => d.toISOString().slice(0, 10);

// ---------- 轉換：主站「每日收盤行情（全部）」→ 個股、指數、全市場成交金額 ----------
export function convertMiIndexAll(json) {
  if (!json || json.stat !== "OK" || !Array.isArray(json.tables)) throw new Error("每日收盤行情：" + (json && json.stat || "格式不正確"));
  const date = A.normDate(json.date);
  const find = (re) => json.tables.find((t) => t && t.title && re.test(t.title));
  const quote = find(/每日收盤行情/);
  if (!quote || !quote.data || !quote.data.length) throw new Error("每日收盤行情：沒有個股資料（可能尚未收盤或休市）");
  const f = quote.fields.map((x) => x.trim());
  const col = (name) => f.findIndex((x) => x.startsWith(name));
  const c = { code: col("證券代號"), name: col("證券名稱"), vol: col("成交股數"), trades: col("成交筆數"), value: col("成交金額"),
    open: col("開盤價"), high: col("最高價"), low: col("最低價"), close: col("收盤價"), sign: col("漲跌(+/-)"), diff: col("漲跌價差") };
  if (Object.values(c).some((i) => i < 0)) throw new Error("每日收盤行情：欄位名稱有變動 " + f.join(","));
  const stocks = quote.data.map((r) => {
    const sign = stripTags(r[c.sign]);
    const diff = clean(r[c.diff]);
    return {
      Code: r[c.code].trim(), Name: r[c.name].trim(),
      TradeVolume: clean(r[c.vol]), TradeValue: clean(r[c.value]), Transaction: clean(r[c.trades]),
      OpeningPrice: clean(r[c.open]), HighestPrice: clean(r[c.high]), LowestPrice: clean(r[c.low]), ClosingPrice: clean(r[c.close]),
      Change: sign === "-" && diff && Number(diff) !== 0 ? "-" + diff : diff, // "X"（除權息）視為以參考價計算的漲跌
    };
  });
  const idx = find(/價格指數\(臺灣證券交易所\)/);
  const indices = (idx && idx.data || []).map((r) => ({
    日期: date, 指數: stripTags(r[0]), 收盤指數: clean(r[1]), 漲跌: stripTags(r[2]), 漲跌點數: clean(r[3]), 漲跌百分比: clean(r[4]).replace(/^-/, ""),
  }));
  const stat = find(/大盤統計資訊/);
  const total = stat && (stat.data || []).find((r) => /^總計/.test(r[0]));
  return { date, stocks, indices, totalValue: total ? Number(clean(total[1])) : null };
}

// OpenAPI 個股日成交（備援，通常隔天清晨才更新）
export function convertOpenApiStocks(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("OpenAPI 個股資料為空");
  const keys = ["Code", "Name", "TradeVolume", "TradeValue", "Transaction", "OpeningPrice", "HighestPrice", "LowestPrice", "ClosingPrice", "Change"];
  return { date: A.normDate(rows[0].Date), stocks: rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? ""]))) };
}

// 主站每月市場成交資訊 → [{ Date, TradeValue, TAIEX, Change }]
export function convertFmtqik(json) {
  if (!json || json.stat !== "OK" || !Array.isArray(json.data)) return [];
  return json.data.map((r) => ({ Date: A.normDate(r[0]), TradeVolume: clean(r[1]), TradeValue: clean(r[2]), Transaction: clean(r[3]), TAIEX: clean(r[4]), Change: clean(r[5]) }));
}

// 三大法人買賣金額（元）
export function convertBfi82u(json) {
  if (!json || json.stat !== "OK" || !Array.isArray(json.data)) throw new Error("三大法人買賣金額：" + (json && json.stat || "格式不正確"));
  const net = (re) => json.data.filter((r) => re.test(r[0])).reduce((a, r) => a + Number(clean(r[3])), 0);
  const foreign = net(/^外資及陸資/), trust = net(/^投信/), dealer = net(/^自營商/);
  return { date: A.normDate(json.date), summary: { foreign, trust, dealer, total: foreign + trust + dealer } };
}

// 三大法人個股買賣超（股）→ [代號, 名稱, 外資, 投信, 自營商, 合計]
export function convertT86(json) {
  if (!json || json.stat !== "OK" || !Array.isArray(json.data)) throw new Error("三大法人個股：" + (json && json.stat || "格式不正確"));
  const f = json.fields.map((x) => x.trim());
  const col = (re) => f.findIndex((x) => re.test(x));
  const c = { code: col(/^證券代號/), name: col(/^證券名稱/), foreign: col(/^外陸資買賣超股數/), trust: col(/^投信買賣超股數/), dealer: col(/^自營商買賣超股數$/), total: col(/^三大法人買賣超股數/) };
  if (Object.values(c).some((i) => i < 0)) throw new Error("三大法人個股：欄位名稱有變動");
  const n = (v) => Number(clean(v)) || 0;
  return { date: A.normDate(json.date), stocks: json.data.map((r) => [r[c.code].trim(), r[c.name].trim(), n(r[c.foreign]), n(r[c.trust]), n(r[c.dealer]), n(r[c.total])]) };
}

// 公開資訊觀測站「即時重大訊息」HTML 表格 → [{ code, name, date, time, subject }]
export function parseMopsNews(html) {
  if (/FOR SECURITY REASONS|查詢過量|頁面無法執行/i.test(html)) throw new Error("公開資訊觀測站拒絕查詢（可能查詢太頻繁）");
  const items = [];
  for (const tr of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []) {
    const tds = (tr.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []).map((td) =>
      stripTags(td).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim());
    if (tds.length >= 5 && /^\d{4,6}[A-Z]?$/.test(tds[0]) && /^\d{2,3}\/\d{2}\/\d{2}$/.test(tds[2])) {
      items.push({ code: tds[0], name: tds[1], date: A.normDate(tds[2]), time: tds[3], subject: tds[4] });
    }
  }
  return items;
}

// OpenAPI 上市公司每日重大訊息（備援：只有上市公司，且為前一個工作天）
export function convertOpenApiNews(rows) {
  if (!Array.isArray(rows)) throw new Error("重大訊息資料格式不正確");
  const pick = (r, k) => { const key = Object.keys(r).find((x) => x.trim() === k); return key ? r[key] : ""; };
  return rows.map((r) => {
    const t = String(pick(r, "發言時間")).trim().padStart(6, "0");
    return { code: String(pick(r, "公司代號")).trim(), name: String(pick(r, "公司名稱")).trim(), date: A.normDate(pick(r, "發言日期")),
      time: `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`, subject: String(pick(r, "主旨")).replace(/\s+/g, " ").trim() };
  }).filter((n) => n.code && n.subject).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

// OpenAPI 上市公司每月營收 → { ym, items: [代號, 名稱, 產業, 當月營收(千元), 年增%, 月增%, 累計年增%] }
export function convertRevenue(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("月營收資料為空");
  const r1 = (v) => { const n = A.num(v); return n === null ? null : Math.round(n * 10) / 10; };
  const yms = rows.map((r) => String(r["資料年月"] || "")).filter(Boolean).sort();
  const latest = yms[yms.length - 1];
  const ym = latest ? `${Number(latest.slice(0, -2)) + 1911}-${latest.slice(-2)}` : null;
  const items = rows.filter((r) => String(r["資料年月"]) === latest).map((r) => [
    String(r["公司代號"]).trim(), String(r["公司名稱"]).trim(), String(r["產業別"] || "").trim(),
    A.num(r["營業收入-當月營收"]), r1(r["營業收入-去年同月增減(%)"]), r1(r["營業收入-上月比較增減(%)"]), r1(r["累計營業收入-前期比較增減(%)"]),
  ]);
  return { ym, items };
}

// OpenAPI 除權除息預告表 → [{ date, code, name, type, cash }]
export function convertDividends(rows) {
  if (!Array.isArray(rows)) throw new Error("除權息資料格式不正確");
  return { items: rows.map((r) => ({
    date: A.normDate(r.Date), code: String(r.Code).trim(), name: String(r.Name).trim(),
    type: String(r.Exdividend || "").trim(), cash: A.num(r.CashDividend),
  })).filter((d) => d.date && d.code) };
}

// ---------- 主流程 ----------
export async function fetchAll(now = new Date()) {
  const errors = [];
  const attempt = async (source, fn) => {
    try { return await fn(); } catch (e) { errors.push({ source, message: e.message }); console.error(`[${source}] ${e.message}`); return null; }
  };
  const out = { version: 1, fetchedAt: now.toISOString(), errors };

  // 1. 個股＋指數：主站當天收盤後即有資料；抓不到改用 OpenAPI
  let market = await attempt("每日收盤行情（主站）", async () => convertMiIndexAll(await get(WWW + "afterTrading/MI_INDEX?type=ALLBUT0999&response=json")));
  if (!market) {
    market = await attempt("個股日成交（OpenAPI）", async () => {
      const s = convertOpenApiStocks(await get(OPENAPI + "exchangeReport/STOCK_DAY_ALL"));
      const idx = await get(OPENAPI + "exchangeReport/MI_INDEX").catch(() => []);
      return { ...s, indices: idx, totalValue: null };
    });
  }
  if (!market) throw new Error("個股行情全部來源都失敗：" + errors.map((e) => e.message).join("；"));

  // 2. 近兩個月每日成交與加權指數（走勢圖與量能比較）
  const t = tw(now);
  const thisMonth = `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, "0")}01`;
  const p = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1));
  const prevMonth = `${p.getUTCFullYear()}${String(p.getUTCMonth() + 1).padStart(2, "0")}01`;
  const daily = [];
  for (const m of [prevMonth, thisMonth]) {
    const d = await attempt(`每月成交資訊 ${m.slice(0, 6)}`, async () => convertFmtqik(await get(`${WWW}afterTrading/FMTQIK?date=${m}&response=json`)));
    if (d) daily.push(...d);
  }
  // 每月成交資訊常比收盤行情晚更新：若缺當天，用收盤行情的加權指數與總成交金額補上
  const taiex = market.indices.find((i) => /發行量加權股價指數/.test(i["指數"]));
  if (taiex && market.date && !daily.some((d) => d.Date === market.date)) {
    const ch = Number(taiex["漲跌點數"]) * (taiex["漲跌"] === "-" ? -1 : 1);
    daily.push({ Date: market.date, TradeValue: market.totalValue === null ? "" : String(market.totalValue), TAIEX: taiex["收盤指數"], Change: String(ch) });
  }
  out.market = { date: market.date, stocks: market.stocks, indices: market.indices, daily: daily.filter((d) => d.Date).slice(-25) };

  // 3. 三大法人（買賣金額與個股買賣超），以行情日期為準
  //    當天通常 15:00 後才公布；還沒出來時改抓最近一個交易日（畫面會標出日期）
  const dq = market.date ? market.date.replace(/-/g, "") : "";
  const sameDayOrLatest = async (sameDay, latest, convert) => {
    try { return convert(await get(sameDay)); }
    catch (e) { if (!/沒有符合條件/.test(e.message)) throw e; return convert(await get(latest)); }
  };
  const bfi = await attempt("三大法人買賣金額", () => sameDayOrLatest(
    `${WWW}fund/BFI82U?type=day&dayDate=${dq}&response=json`, `${WWW}fund/BFI82U?response=json`, convertBfi82u));
  const t86 = bfi && await attempt("三大法人個股買賣超", () => sameDayOrLatest(
    `${WWW}fund/T86?date=${dq}&selectType=ALLBUT0999&response=json`,
    `${WWW}fund/T86?date=${bfi.date.replace(/-/g, "")}&selectType=ALLBUT0999&response=json`, convertT86));
  if (bfi) out.institutional = { date: bfi.date, summary: bfi.summary, stocks: t86 && t86.date === bfi.date ? t86.stocks : [] };

  // 4. 公開資訊觀測站：即時重大訊息（上市、上櫃、興櫃）
  const news = await attempt("即時重大訊息（公開資訊觀測站）", async () => {
    const html = await get(MOPS + "ajax_t05sr01_1", {
      type: "text", method: "POST", body: "encodeURIComponent=1&step=0&firstin=1&off=1&TYPEK=all",
      headers: { "content-type": "application/x-www-form-urlencoded", referer: MOPS + "t05sr01_1" },
    });
    return parseMopsNews(html);
  });
  if (news) out.news = { date: ymd(t), source: "公開資訊觀測站即時重大訊息（上市、上櫃、興櫃）", items: news };
  else {
    const backup = await attempt("上市公司每日重大訊息（OpenAPI 備援）", async () => convertOpenApiNews(await get(OPENAPI + "opendata/t187ap04_L")));
    if (backup) out.news = { date: backup.length ? backup[0].date : null, source: "證交所 OpenAPI 上市公司每日重大訊息（前一工作天，備援）", items: backup };
  }

  // 5. 月營收、除權息預告（OpenAPI，資料源自公開資訊觀測站）
  const rev = await attempt("上市公司月營收", async () => convertRevenue(await get(OPENAPI + "opendata/t187ap05_L")));
  if (rev) out.revenue = rev;
  const div = await attempt("除權除息預告", async () => convertDividends(await get(OPENAPI + "exchangeReport/TWT48U_ALL")));
  if (div) out.dividends = div;

  return out;
}

// 只有資料內容改變才覆寫（忽略 fetchedAt），避免每次都產生無意義的提交
export async function writeIfChanged(path, data) {
  const strip = (o) => JSON.stringify({ ...o, fetchedAt: undefined, errors: undefined });
  try {
    const old = JSON.parse(await readFile(path, "utf8"));
    if (strip(old) === strip(data)) return false;
  } catch { /* 沒有舊檔 */ }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data) + "\n");
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = resolve(process.argv[2] || "data/latest.json");
  try {
    const data = await fetchAll();
    const changed = await writeIfChanged(path, data);
    console.log(`行情日期 ${data.market.date}，個股 ${data.market.stocks.length} 檔；` +
      `三大法人 ${data.institutional ? data.institutional.date : "無"}；重大訊息 ${data.news ? data.news.items.length : "無"} 則；` +
      `月營收 ${data.revenue ? data.revenue.ym : "無"}；除權息 ${data.dividends ? data.dividends.items.length : "無"} 筆；` +
      `失敗來源 ${data.errors.length} 個。${changed ? "已更新 " + path : "資料沒有變化，未覆寫"}`);
  } catch (e) {
    console.error("抓取失敗：" + e.message);
    process.exit(1);
  }
}
