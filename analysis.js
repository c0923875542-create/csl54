// 每日股市分析報告：資料正規化與分析（純函式，瀏覽器與 Node 都能用）
// 瀏覽器：window.StockAnalysis；Node：require("./analysis.js")
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.StockAnalysis = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 證交所數字常帶逗號、空白、"--"、"X0.00"（除權息註記）等，一律轉成數字或 null
  function num(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    let s = String(v).trim().replace(/,/g, "").replace(/^X/i, "");
    if (s === "" || s === "--" || s === "-" || s === "---") return null;
    s = s.replace(/^\+/, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function pick(obj, keys) {
    for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== "") return obj[k];
    return undefined;
  }

  // 民國日期 "1151116" / "115/11/16" 或西元 "20261116" / "2026-11-16" → "2026-11-16"
  function normDate(v) {
    if (!v) return null;
    const s = String(v).trim();
    let m = s.match(/^(\d{2,3})[\/.-]?(\d{2})[\/.-]?(\d{2})$/);
    if (m && m[1].length <= 3 && Number(m[1]) < 1000) {
      return `${Number(m[1]) + 1911}-${m[2]}-${m[3]}`;
    }
    m = s.match(/^(\d{4})[\/.-]?(\d{1,2})[\/.-]?(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    return null;
  }

  // 個股日成交資料 → { code, name, open, high, low, close, change, prevClose, pct, volume, value, trades }
  function normalizeStocks(rows) {
    if (!Array.isArray(rows)) throw new Error("個股資料格式不正確（應為陣列）");
    const out = [];
    for (const r of rows) {
      const code = String(pick(r, ["Code", "code", "證券代號", "代號"]) ?? "").trim();
      const name = String(pick(r, ["Name", "name", "證券名稱", "名稱"]) ?? "").trim();
      if (!code) continue;
      const close = num(pick(r, ["ClosingPrice", "close", "收盤價", "收盤"]));
      const change = num(pick(r, ["Change", "change", "漲跌價差", "漲跌"]));
      const s = {
        code, name: name || code,
        open: num(pick(r, ["OpeningPrice", "open", "開盤價", "開盤"])),
        high: num(pick(r, ["HighestPrice", "high", "最高價", "最高"])),
        low: num(pick(r, ["LowestPrice", "low", "最低價", "最低"])),
        close, change,
        volume: num(pick(r, ["TradeVolume", "volume", "成交股數"])) ?? 0,
        value: num(pick(r, ["TradeValue", "value", "成交金額"])) ?? 0,
        trades: num(pick(r, ["Transaction", "trades", "成交筆數"])),
        prevClose: null, pct: null,
      };
      if (close !== null && change !== null) {
        s.prevClose = +(close - change).toFixed(4);
        if (s.prevClose > 0) s.pct = (change / s.prevClose) * 100;
      }
      out.push(s);
    }
    return out;
  }

  // 大盤指數清單 → [{ name, close, change, pct }]；漲跌符號可能另放在「漲跌」欄
  function normalizeIndices(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => {
      const name = String(pick(r, ["指數", "Index", "name"]) ?? "").trim();
      const close = num(pick(r, ["收盤指數", "ClosingIndex", "close"]));
      let change = num(pick(r, ["漲跌點數", "Change", "change"]));
      let pct = num(pick(r, ["漲跌百分比", "ChangePercent", "pct"]));
      const sign = String(pick(r, ["漲跌", "Direction", "sign"]) ?? "").trim();
      if (sign === "-" || /green|下跌/.test(sign)) {
        if (change !== null) change = -Math.abs(change);
        if (pct !== null) pct = -Math.abs(pct);
      }
      return { name, close, change, pct, date: normDate(pick(r, ["日期", "Date"])) };
    }).filter((x) => x.name && x.close !== null);
  }

  // 每月每日市場成交 → [{ date, value, volume, trades, taiex, change }]（依日期排序）
  function normalizeDaily(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      date: normDate(pick(r, ["Date", "日期", "date"])),
      volume: num(pick(r, ["TradeVolume", "成交股數", "volume"])),
      value: num(pick(r, ["TradeValue", "成交金額", "value"])),
      trades: num(pick(r, ["Transaction", "成交筆數", "trades"])),
      taiex: num(pick(r, ["TAIEX", "發行量加權股價指數", "taiex"])),
      change: num(pick(r, ["Change", "漲跌點數", "change"])),
    })).filter((d) => d.date && d.taiex !== null).sort((a, b) => a.date.localeCompare(b.date));
  }

  // 只看一般股票（四碼數字代號），排除 ETF、權證等，避免排行被槓桿型商品洗版
  function isCommonStock(s) { return /^[1-9]\d{3}$/.test(s.code); }

  const LIMIT_PCT = 9.5; // 台股漲跌幅限制 10%，四捨五入到檔位後實際約 9.5% 以上即視為漲停／跌停

  // 漲跌幅分布：固定區間，0 單獨一格
  const BINS = [
    { key: "≤-7%", lo: -Infinity, hi: -7 }, { key: "-7~-3%", lo: -7, hi: -3 },
    { key: "-3~-1%", lo: -3, hi: -1 }, { key: "-1~0%", lo: -1, hi: 0 },
    { key: "平盤", lo: 0, hi: 0 },
    { key: "0~1%", lo: 0, hi: 1 }, { key: "1~3%", lo: 1, hi: 3 },
    { key: "3~7%", lo: 3, hi: 7 }, { key: "≥7%", lo: 7, hi: Infinity },
  ];
  function binOf(p) {
    if (p === 0) return 4;
    if (p < 0) { if (p <= -7) return 0; if (p <= -3) return 1; if (p <= -1) return 2; return 3; }
    if (p >= 7) return 8; if (p >= 3) return 7; if (p >= 1) return 6; return 5;
  }

  function analyze({ stocks, indices = [], daily = [], date = null, onlyCommon = true }) {
    const all = stocks || [];
    const pool = (onlyCommon ? all.filter(isCommonStock) : all);
    const traded = pool.filter((s) => s.pct !== null && s.volume > 0);
    if (!traded.length) throw new Error("沒有可分析的成交資料（可能是休市日或資料尚未更新）");

    const up = traded.filter((s) => s.change > 0).length;
    const down = traded.filter((s) => s.change < 0).length;
    const flat = traded.length - up - down;
    const limitUp = traded.filter((s) => s.pct >= LIMIT_PCT);
    const limitDown = traded.filter((s) => s.pct <= -LIMIT_PCT);
    const totalValue = all.reduce((a, s) => a + (s.value || 0), 0);

    const byPct = traded.slice().sort((a, b) => b.pct - a.pct);
    const gainers = byPct.filter((s) => s.pct > 0).slice(0, 10);
    const losers = byPct.filter((s) => s.pct < 0).reverse().slice(0, 10);
    const byValue = pool.slice().sort((a, b) => b.value - a.value).slice(0, 10);

    const bins = BINS.map((b) => ({ ...b, count: 0 }));
    for (const s of traded) bins[binOf(s.pct)].count++;

    const median = (() => {
      const p = traded.map((s) => s.pct).sort((a, b) => a - b);
      const m = p.length >> 1;
      return p.length % 2 ? p[m] : (p[m - 1] + p[m]) / 2;
    })();

    const taiex = indices.find((i) => /發行量加權股價指數/.test(i.name)) || null;
    const reportDate = date || (taiex && taiex.date) || (daily.length ? daily[daily.length - 1].date : null);

    // 量能：今日成交金額 vs 前 5 個交易日平均（取自每日市場成交資料）
    let volumeRatio = null;
    if (daily.length >= 2) {
      const idx = reportDate ? daily.findIndex((d) => d.date === reportDate) : daily.length - 1;
      const today = idx >= 0 ? daily[idx] : null;
      const prev = daily.slice(Math.max(0, (idx >= 0 ? idx : daily.length) - 5), idx >= 0 ? idx : daily.length);
      if (today && today.value && prev.length) {
        const avg = prev.reduce((a, d) => a + d.value, 0) / prev.length;
        if (avg > 0) volumeRatio = today.value / avg - 1;
      }
    }

    const breadth = (up + down) ? (up - down) / (up + down) : 0; // -1 ~ 1
    return {
      date: reportDate, count: traded.length, up, down, flat,
      limitUp, limitDown, totalValue, median, breadth, volumeRatio,
      gainers, losers, byValue, bins, taiex, indices, daily,
      summary: summarize({ taiex, up, down, flat, breadth, median, totalValue, volumeRatio, limitUp, limitDown, byValue, gainers, losers }),
    };
  }

  const fmtInt = (n) => Math.round(n).toLocaleString("zh-TW");
  const fmtPct = (n, d = 2) => (n > 0 ? "+" : "") + n.toFixed(d) + "%";
  const yi = (n) => (n / 1e8).toLocaleString("zh-TW", { maximumFractionDigits: 0 }) + " 億元";

  // 依規則產生的文字摘要（非投資建議）
  function summarize(a) {
    const lines = [];
    if (a.taiex && a.taiex.change !== null) {
      const dir = a.taiex.change > 0 ? "上漲" : a.taiex.change < 0 ? "下跌" : "持平";
      lines.push(`加權指數${dir} ${Math.abs(a.taiex.change).toFixed(2)} 點` +
        (a.taiex.pct !== null ? `（${fmtPct(a.taiex.pct)}）` : "") +
        `，收 ${a.taiex.close.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 點。`);
    }
    let mood;
    if (a.breadth >= 0.4) mood = "普漲，買盤廣泛";
    else if (a.breadth >= 0.1) mood = "偏多";
    else if (a.breadth > -0.1) mood = "漲跌互見，方向不明";
    else if (a.breadth > -0.4) mood = "偏空";
    else mood = "普跌，賣壓沉重";
    lines.push(`上漲 ${fmtInt(a.up)} 家、下跌 ${fmtInt(a.down)} 家、平盤 ${fmtInt(a.flat)} 家，市場氣氛${mood}；個股漲跌幅中位數 ${fmtPct(a.median)}。`);
    if (a.taiex && a.taiex.change !== null && Math.sign(a.taiex.change) !== Math.sign(a.up - a.down) && a.up !== a.down && a.taiex.change !== 0) {
      lines.push(a.taiex.change > 0
        ? "指數上漲但下跌家數較多，漲勢集中在少數權值股。"
        : "指數下跌但上漲家數較多，主要是權值股拖累，中小型股相對抗跌。");
    }
    let vol = `全市場成交金額約 ${yi(a.totalValue)}`;
    if (a.volumeRatio !== null) {
      const r = a.volumeRatio * 100;
      vol += Math.abs(r) < 5 ? "，與前 5 日均量相當" : `，較前 5 日均量${r > 0 ? "放大" : "萎縮"} ${Math.abs(r).toFixed(0)}%`;
    }
    lines.push(vol + "。");
    if (a.limitUp.length || a.limitDown.length) {
      lines.push(`漲停（≥${LIMIT_PCT}%）${a.limitUp.length} 檔、跌停 ${a.limitDown.length} 檔。`);
    }
    if (a.byValue.length) {
      lines.push(`成交值前三名：${a.byValue.slice(0, 3).map((s) => `${s.name}（${s.pct === null ? "—" : fmtPct(s.pct)}）`).join("、")}。`);
    }
    if (a.gainers.length) lines.push(`漲幅最大：${a.gainers[0].name} ${fmtPct(a.gainers[0].pct)}；` +
      (a.losers.length ? `跌幅最大：${a.losers[0].name} ${fmtPct(a.losers[0].pct)}。` : "無下跌個股。"));
    return lines;
  }

  // 簡易 CSV 解析（支援雙引號欄位），第一列為標題
  function parseCSV(text) {
    const rows = []; let row = [], cur = "", q = false;
    text = String(text).replace(/^﻿/, "");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.some((x) => x.trim() !== "")) rows.push(row);
        row = [];
      } else cur += c;
    }
    row.push(cur);
    if (row.some((x) => x.trim() !== "")) rows.push(row);
    if (rows.length < 2) throw new Error("CSV 至少要有標題列與一筆資料");
    const head = rows[0].map((h) => h.trim());
    const need = [["Code", "code", "證券代號", "代號"], ["ClosingPrice", "close", "收盤價", "收盤"], ["Change", "change", "漲跌價差", "漲跌"]];
    for (const alts of need) if (!alts.some((a) => head.includes(a))) throw new Error(`CSV 缺少欄位：${alts[2]}（或 ${alts[0]}）`);
    return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
  }

  function toMarkdown(a, sourceLabel) {
    const t = (list) => ["| 代號 | 名稱 | 收盤 | 漲跌幅 | 成交金額(億) |", "|---|---|---:|---:|---:|",
      ...list.map((s) => `| ${s.code} | ${s.name} | ${s.close ?? "—"} | ${s.pct === null ? "—" : fmtPct(s.pct)} | ${(s.value / 1e8).toFixed(2)} |`)].join("\n");
    return [`# 每日股市分析報告 ${a.date || ""}`, "", `資料來源：${sourceLabel}`, "",
      "## 市場摘要", "", ...a.summary.map((l) => "- " + l), "",
      "## 漲幅前 10", "", t(a.gainers), "", "## 跌幅前 10", "", t(a.losers), "",
      "## 成交值前 10", "", t(a.byValue), "",
      "> 本報告由程式依公開資料自動產生，僅供參考，不構成投資建議。", ""].join("\n");
  }

  return { num, normDate, normalizeStocks, normalizeIndices, normalizeDaily, isCommonStock, analyze, summarize, parseCSV, toMarkdown, LIMIT_PCT, fmtPct };
});
