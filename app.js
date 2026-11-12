// 報修登記：新增表單與最近 20 筆清單
(function () {
  "use strict";

  const TABLE = "repair_requests";
  const LIST_LIMIT = 20;
  const CATEGORIES = ["設備", "網路", "環境", "其他"];
  const URGENCIES = ["低", "中", "高"];
  // 與 supabase/schema.sql 的 CHECK 限制一致
  const LIMITS = { reporter_name: 50, location: 100, description: 1000 };

  const form = document.getElementById("repair-form");
  const submitBtn = document.getElementById("submit-btn");
  const formMsg = document.getElementById("form-message");
  const listEl = document.getElementById("repair-list");
  const listMsg = document.getElementById("list-message");
  const refreshBtn = document.getElementById("refresh-btn");
  const descEl = document.getElementById("description");
  const descCount = document.getElementById("description-count");

  // ---------- 訊息顯示 ----------
  function showMessage(el, type, text) {
    el.className = "message " + type;
    el.textContent = text;
    el.hidden = false;
  }
  function hideMessage(el) {
    el.hidden = true;
    el.textContent = "";
  }

  // ---------- 建立 Supabase 連線 ----------
  function createSupabase() {
    const cfg = window.APP_CONFIG || {};
    const url = (cfg.supabaseUrl || "").trim();
    const key = (cfg.supabasePublishableKey || "").trim();
    if (!url || !key) {
      throw new Error("尚未設定 Supabase 網址或 publishable key（請檢查 config.js）。");
    }
    // 防呆：前端絕對不能使用 secret / service_role 金鑰
    if (key.startsWith("sb_secret_") || /service_role/.test(decodeJwtRole(key))) {
      throw new Error("config.js 放的是機密金鑰，已停止連線。請改用 publishable key，並立即到 Supabase 撤換該金鑰。");
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("無法載入 Supabase 程式庫，請檢查網路連線後重新整理頁面。");
    }
    return window.supabase.createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  function decodeJwtRole(key) {
    const parts = key.split(".");
    if (parts.length !== 3) return "";
    try {
      const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      return String(JSON.parse(json).role || "");
    } catch (e) {
      return "";
    }
  }

  // ---------- 錯誤訊息轉換 ----------
  function friendlyError(error) {
    if (!error) return "發生未知錯誤，請稍後再試。";
    const code = error.code || "";
    const msg = String(error.message || "");
    if (code === "42501") return "沒有權限執行這個動作（資料庫存取規則拒絕）。";
    if (code === "23514") return "資料不符合規則，請檢查各欄位內容與長度。";
    if (code === "23502") return "有必填欄位沒有填寫。";
    if (code === "42P01" || code === "PGRST205") return "找不到報修資料表，請先在 Supabase 執行 supabase/schema.sql。";
    if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(msg)) return "無法連線到伺服器，請檢查網路後再試一次。";
    if (/Invalid API key|apikey/i.test(msg)) return "Supabase 金鑰無效，請檢查 config.js。";
    return "發生錯誤：" + msg;
  }

  // ---------- 表單驗證 ----------
  function setFieldError(name, text) {
    const input = form.elements[name];
    const err = document.getElementById(name + "-error");
    if (text) {
      input.setAttribute("aria-invalid", "true");
      err.textContent = text;
    } else {
      input.removeAttribute("aria-invalid");
      err.textContent = "";
    }
  }

  function readAndValidate() {
    const data = {
      reporter_name: form.elements.reporter_name.value.trim(),
      location: form.elements.location.value.trim(),
      category: form.elements.category.value,
      description: form.elements.description.value.trim(),
      urgency: form.elements.urgency.value,
    };
    const errors = {};
    if (!data.reporter_name) errors.reporter_name = "請填寫報修人。";
    else if (data.reporter_name.length > LIMITS.reporter_name) errors.reporter_name = "報修人最多 " + LIMITS.reporter_name + " 個字。";

    if (!data.location) errors.location = "請填寫地點或部門。";
    else if (data.location.length > LIMITS.location) errors.location = "地點或部門最多 " + LIMITS.location + " 個字。";

    if (!CATEGORIES.includes(data.category)) errors.category = "請選擇類別。";
    if (!URGENCIES.includes(data.urgency)) errors.urgency = "請選擇緊急程度。";

    if (!data.description) errors.description = "請填寫問題說明。";
    else if (data.description.length > LIMITS.description) errors.description = "問題說明最多 " + LIMITS.description + " 個字。";

    ["reporter_name", "location", "category", "urgency", "description"].forEach(function (n) {
      setFieldError(n, errors[n] || "");
    });
    return { data: data, errors: errors };
  }

  // ---------- 清單 ----------
  const timeFormat = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text; // 一律用 textContent，避免插入 HTML
    return node;
  }

  function renderList(rows) {
    listEl.replaceChildren();
    if (!rows.length) {
      listEl.appendChild(el("li", "empty", "目前還沒有報修資料。"));
      return;
    }
    rows.forEach(function (r) {
      const li = el("li", "repair-item");
      const top = el("div", "item-top");
      top.appendChild(el("span", "tag", r.category));
      top.appendChild(el("span", "tag urgency urgency-" + r.urgency, "緊急：" + r.urgency));
      top.appendChild(el("span", "tag", r.status));
      li.appendChild(top);
      li.appendChild(el("p", "item-desc", r.description));
      const when = r.created_at ? timeFormat.format(new Date(r.created_at)) : "";
      li.appendChild(el("p", "item-meta", r.reporter_name + "・" + r.location + "・" + when));
      listEl.appendChild(li);
    });
  }

  async function loadList(client) {
    listEl.setAttribute("aria-busy", "true");
    refreshBtn.disabled = true;
    showMessage(listMsg, "info", "載入中…");
    try {
      const res = await client
        .from(TABLE)
        .select("id, created_at, reporter_name, location, category, description, urgency, status")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT);
      if (res.error) throw res.error;
      hideMessage(listMsg);
      renderList(res.data || []);
    } catch (e) {
      showMessage(listMsg, "error", "清單載入失敗：" + friendlyError(e));
    } finally {
      listEl.setAttribute("aria-busy", "false");
      refreshBtn.disabled = false;
    }
  }

  // ---------- 初始化 ----------
  descEl.addEventListener("input", function () {
    descCount.textContent = descEl.value.length + " / " + LIMITS.description;
  });

  let client;
  try {
    client = createSupabase();
  } catch (e) {
    showMessage(formMsg, "error", e.message);
    showMessage(listMsg, "error", e.message);
    submitBtn.disabled = true;
    refreshBtn.disabled = true;
    listEl.setAttribute("aria-busy", "false");
    return;
  }

  refreshBtn.addEventListener("click", function () { loadList(client); });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    hideMessage(formMsg);

    const result = readAndValidate();
    const firstError = Object.keys(result.errors)[0];
    if (firstError) {
      showMessage(formMsg, "error", "請修正標示的欄位後再送出。");
      form.elements[firstError].focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "送出中…";
    try {
      // 只送使用者填寫的五個欄位；不送 status（由資料庫預設為「待處理」）
      const res = await client.from(TABLE).insert(result.data);
      if (res.error) throw res.error;
      form.reset();
      descCount.textContent = "0 / " + LIMITS.description;
      showMessage(formMsg, "success", "已送出報修，狀態為「待處理」。");
      loadList(client);
    } catch (e) {
      showMessage(formMsg, "error", "送出失敗：" + friendlyError(e));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "送出報修";
    }
  });

  loadList(client);
})();
