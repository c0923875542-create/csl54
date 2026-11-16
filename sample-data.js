// 示範資料：全部為虛構公司與數字，只用來在抓不到證交所資料時展示畫面。
// 以固定亂數種子產生，每次開啟結果相同。格式與證交所 OpenAPI 相同，走同一套分析流程。
(function (root) {
  "use strict";
  function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const r = rng(20261116);
  const pre = ["晨光", "青嶺", "海灣", "銀河", "松濤", "雲杉", "北辰", "金穗", "藍鯨", "曉風", "星野", "白鷺", "長堤", "楓林", "遠帆", "石泉", "東籬", "翠谷", "明湖", "鳴沙"];
  const suf = ["電子", "半導體", "光電", "精密", "化工", "鋼鐵", "航運", "生技", "金控", "紡織", "食品", "電機", "網通", "材料", "營造"];
  const tick = (p) => (p < 10 ? 0.01 : p < 50 ? 0.05 : p < 100 ? 0.1 : p < 500 ? 0.5 : p < 1000 ? 1 : 5);
  const round = (p) => { const t = tick(p); return Math.round(p / t) * t; };

  const stocks = [];
  let code = 1101;
  for (let i = 0; i < 120; i++) {
    code += 1 + Math.floor(r() * 70);
    const prev = round(8 + Math.pow(r(), 2.2) * 900);
    // 整體略偏多，少數個股大漲大跌
    let pct = (r() - 0.42) * 4 + (r() < 0.06 ? (r() < 0.6 ? 7 : -7) : 0);
    pct = Math.max(-10, Math.min(10, pct));
    const close = round(prev * (1 + pct / 100));
    const open = round(prev * (1 + (r() - 0.5) * 0.02));
    const high = Math.max(open, close, round(Math.max(open, close) * (1 + r() * 0.015)));
    const low = Math.min(open, close, round(Math.min(open, close) * (1 - r() * 0.015)));
    const volume = Math.round((200 + Math.pow(r(), 3) * 60000) * 1000);
    stocks.push({
      Code: String(code), Name: pre[i % pre.length] + suf[Math.floor(r() * suf.length)],
      TradeVolume: String(volume), TradeValue: String(Math.round(volume * (high + low) / 2)),
      OpeningPrice: open.toFixed(2), HighestPrice: high.toFixed(2), LowestPrice: low.toFixed(2),
      ClosingPrice: close.toFixed(2), Change: (close - prev >= 0 ? "+" : "") + (close - prev).toFixed(2),
      Transaction: String(Math.round(volume / 1800)),
    });
  }
  // 每日市場成交（20 個交易日，民國日期）
  const daily = [];
  let taiex = 21800;
  const d = new Date(Date.UTC(2026, 10, 16));
  const dates = [];
  while (dates.length < 20) { if (d.getUTCDay() % 6 !== 0) dates.unshift(new Date(d)); d.setUTCDate(d.getUTCDate() - 1); }
  for (const dt of dates) {
    const ch = +((r() - 0.47) * 300).toFixed(2);
    taiex = +(taiex + ch).toFixed(2);
    const roc = `${dt.getUTCFullYear() - 1911}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
    daily.push({ Date: roc, TradeVolume: String(Math.round(5e9 + r() * 3e9)), TradeValue: String(Math.round(3.2e11 + r() * 1.4e11)), Transaction: String(Math.round(2.5e6 + r() * 1e6)), TAIEX: taiex.toFixed(2), Change: ch.toFixed(2) });
  }
  // 讓每日成交金額與個股加總一致（最後一天＝個股加總，前幾天在其上下 15%）
  const total = stocks.reduce((a, s) => a + Number(s.TradeValue), 0);
  daily.forEach((x, i) => { x.TradeValue = String(Math.round(i === daily.length - 1 ? total : total * (0.85 + r() * 0.3))); });
  const last = daily[daily.length - 1];
  const lastCh = Number(last.Change);
  const indices = [{ 日期: last.Date, 指數: "發行量加權股價指數", 收盤指數: last.TAIEX, 漲跌: lastCh < 0 ? "-" : "+", 漲跌點數: Math.abs(lastCh).toFixed(2), 漲跌百分比: Math.abs(lastCh / (Number(last.TAIEX) - lastCh) * 100).toFixed(2) }];

  root.STOCK_SAMPLE = { stocks, daily, indices };
})(globalThis);
