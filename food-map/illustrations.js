// 槺榔梧棲美食地圖：各類型的示意插圖（原創向量圖，非店家實景）
// 顏色使用 CSS 變數 --ill-bg（底色）、--ill-ink（線條）、--ill-steam（熱氣），會跟著深淺色主題切換；
// 食物本身的顏色固定，在兩種主題下都清楚。viewBox 統一為 320×140。
window.FOOD_ILLUSTRATIONS = (function () {
  const wrap = (body) =>
    '<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">' +
    '<rect width="320" height="140" fill="var(--ill-bg)"/>' + body + "</svg>";
  const steam = (x) =>
    '<g fill="none" stroke="var(--ill-steam)" stroke-width="4" stroke-linecap="round">' +
    `<path d="M${x - 22} 44c-8-10 8-16 0-26"/><path d="M${x} 40c-8-10 8-16 0-26"/><path d="M${x + 22} 44c-8-10 8-16 0-26"/></g>`;
  const bowl = (cx, w, color) =>
    `<path d="M${cx - w} 74h${w * 2}c0 34-${w * 0.55} 50-${w} 50s-${w}-16-${w}-50z" fill="${color}" stroke="var(--ill-ink)" stroke-width="3"/>` +
    `<rect x="${cx - w * 0.45}" y="122" width="${w * 0.9}" height="8" rx="4" fill="${color}" stroke="var(--ill-ink)" stroke-width="3"/>`;

  return {
    // 牛肉麵：深色湯頭、牛肉塊、青蔥、筷子
    "牛肉麵": wrap(
      steam(160) +
      '<g transform="rotate(-18 240 60)"><rect x="196" y="40" width="96" height="6" rx="3" fill="#b07a45" stroke="var(--ill-ink)" stroke-width="2"/><rect x="196" y="52" width="96" height="6" rx="3" fill="#b07a45" stroke="var(--ill-ink)" stroke-width="2"/></g>' +
      '<ellipse cx="160" cy="74" rx="70" ry="14" fill="#8a3b1c"/>' +
      '<g fill="none" stroke="#f1d29a" stroke-width="3" stroke-linecap="round"><path d="M110 74c12-6 24 6 36 0s24 6 36 0 18 4 24 0"/><path d="M116 80c12-5 24 5 36 0s24 5 36 0"/></g>' +
      '<g stroke="var(--ill-ink)" stroke-width="2"><rect x="120" y="62" width="26" height="16" rx="5" fill="#6b3a22"/><rect x="150" y="60" width="28" height="17" rx="5" fill="#7a4428"/><rect x="180" y="64" width="24" height="15" rx="5" fill="#6b3a22"/></g>' +
      '<g fill="#5fae4f"><circle cx="138" cy="70" r="3"/><circle cx="170" cy="72" r="3"/><circle cx="196" cy="69" r="3"/><circle cx="158" cy="80" r="3"/></g>' +
      bowl(160, 72, "#e9e2d0")
    ),
    // 麵食小吃：擀麵、肉燥、清湯
    "麵食小吃": wrap(
      steam(150) +
      '<ellipse cx="150" cy="74" rx="62" ry="12" fill="#e7c98f"/>' +
      '<g fill="none" stroke="#fff3d6" stroke-width="4" stroke-linecap="round"><path d="M100 72c14-8 26 8 40 0s26 8 40 0"/><path d="M106 78c14-6 26 6 40 0s26 6 40 0"/></g>' +
      '<ellipse cx="150" cy="70" rx="20" ry="7" fill="#8a4a24" stroke="var(--ill-ink)" stroke-width="2"/>' +
      '<g fill="#5fae4f"><circle cx="126" cy="74" r="3"/><circle cx="176" cy="73" r="3"/></g>' +
      bowl(150, 64, "#f3f1ea") +
      '<ellipse cx="258" cy="104" rx="38" ry="10" fill="#f3f1ea" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<g stroke="var(--ill-ink)" stroke-width="2"><ellipse cx="248" cy="96" rx="10" ry="6" fill="#b5663a"/><ellipse cx="266" cy="96" rx="10" ry="6" fill="#c7884f"/></g>'
    ),
    // 米糕：筒仔米糕倒扣、焢肉、肉鬆
    "米糕": wrap(
      steam(160) +
      '<ellipse cx="160" cy="118" rx="92" ry="12" fill="#f3f1ea" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<path d="M116 116c0-34 16-52 44-52s44 18 44 52z" fill="#7a4a2a" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<g fill="#a86b3f"><circle cx="138" cy="96" r="3"/><circle cx="160" cy="84" r="3"/><circle cx="182" cy="98" r="3"/><circle cx="150" cy="104" r="3"/><circle cx="172" cy="108" r="3"/></g>' +
      '<path d="M120 76c12-14 68-14 80 0l-8 10c-14-8-50-8-64 0z" fill="#9c4a2b" stroke="var(--ill-ink)" stroke-width="2.5"/>' +
      '<path d="M128 78c10-7 54-7 64 0" fill="none" stroke="#f3dcc0" stroke-width="3"/>' +
      '<path d="M146 64c4-6 24-6 28 0" fill="#e9b96e" stroke="var(--ill-ink)" stroke-width="2"/>' +
      '<g fill="#5fae4f"><circle cx="152" cy="62" r="2.5"/><circle cx="166" cy="61" r="2.5"/></g>'
    ),
    // 海鮮：魚、蝦、蛤蜊
    "海鮮": wrap(
      '<ellipse cx="160" cy="114" rx="120" ry="14" fill="#f3f1ea" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<path d="M70 90c26-34 92-34 118 0-26 34-92 34-118 0z" fill="#7fb0c9" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<path d="M188 90l26-20v40z" fill="#5f93ad" stroke="var(--ill-ink)" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="92" cy="84" r="5" fill="var(--ill-ink)"/>' +
      '<g fill="none" stroke="#5f93ad" stroke-width="3"><path d="M118 74c8 10 8 22 0 32"/><path d="M138 72c8 12 8 24 0 36"/></g>' +
      '<path d="M226 104c0-24 18-38 36-38 10 0 18 6 18 14 0 10-10 14-20 12 6 8 4 16-6 18z" fill="#f08a5d" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<g fill="none" stroke="#c2603a" stroke-width="2.5"><path d="M236 98c6-4 10-12 10-20"/><path d="M248 100c6-6 8-14 6-22"/></g>' +
      '<path d="M266 66l20-22M272 70l22-14" stroke="#c2603a" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M30 112c0-16 10-26 22-26s22 10 22 26z" fill="#e6d3a8" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<g stroke="#b99d63" stroke-width="2"><path d="M52 88v24"/><path d="M40 92l4 20"/><path d="M64 92l-4 20"/></g>'
    ),
    // 早午餐：肉桂捲、咖啡
    "早午餐": wrap(
      '<ellipse cx="130" cy="112" rx="86" ry="14" fill="#f3f1ea" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<circle cx="130" cy="86" r="40" fill="#d9a066" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<path d="M130 86m-6 0a6 6 0 1 1 12 0a14 14 0 1 1 -26 0a22 22 0 1 1 42 0a30 30 0 1 1 -58 0" fill="none" stroke="#9c5a2c" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M104 60c10 6 18 0 26 6s16-2 26 4" fill="none" stroke="#fffaf0" stroke-width="5" stroke-linecap="round"/>' +
      steam(250) +
      '<path d="M218 58h64v40c0 14-12 24-32 24s-32-10-32-24z" fill="#ffffff" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<path d="M282 68c14 0 18 18 0 22" fill="none" stroke="var(--ill-ink)" stroke-width="4"/>' +
      '<ellipse cx="250" cy="60" rx="30" ry="6" fill="#6b3f22"/>' +
      '<ellipse cx="250" cy="126" rx="44" ry="7" fill="#f3f1ea" stroke="var(--ill-ink)" stroke-width="3"/>'
    ),
    // 甜點冰品：芋冰、豆花
    "甜點冰品": wrap(
      '<path d="M86 80h76l-10 38c-2 6-6 8-12 8h-32c-6 0-10-2-12-8z" fill="#bcd8ea" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<circle cx="104" cy="70" r="18" fill="#b693c9" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<circle cx="138" cy="66" r="20" fill="#c9a8d8" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<circle cx="122" cy="50" r="16" fill="#a77fbd" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<g fill="#fff"><circle cx="134" cy="58" r="3"/><circle cx="104" cy="64" r="2.5"/></g>' +
      '<path d="M190 82h96c0 26-20 42-48 42s-48-16-48-42z" fill="#f3f1ea" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<ellipse cx="238" cy="82" rx="48" ry="10" fill="#e9c27a"/>' +
      '<path d="M212 80c6-6 14-6 20 0s14 6 20 0 12-4 16 0" fill="none" stroke="#fff7e6" stroke-width="5" stroke-linecap="round"/>' +
      '<g fill="#8a4a24"><circle cx="220" cy="84" r="3.5"/><circle cx="244" cy="86" r="3.5"/><circle cx="260" cy="82" r="3.5"/></g>' +
      '<g fill="#e7d27a"><circle cx="232" cy="78" r="4"/><circle cx="252" cy="78" r="4"/></g>'
    ),
    // 伴手禮：禮盒、蛋糕
    "伴手禮": wrap(
      '<rect x="66" y="62" width="104" height="62" rx="6" fill="#d9534f" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<rect x="60" y="50" width="116" height="20" rx="5" fill="#e46a5f" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<rect x="110" y="50" width="16" height="74" fill="#f6c94b" stroke="var(--ill-ink)" stroke-width="2.5"/>' +
      '<path d="M118 50c-12-20-34-14-24 0zM118 50c12-20 34-14 24 0z" fill="#f6c94b" stroke="var(--ill-ink)" stroke-width="2.5"/>' +
      '<path d="M200 124v-36c0-12 10-20 30-20h20c20 0 30 8 30 20v36z" fill="#f2d39b" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<path d="M200 96h80" stroke="#e8a24a" stroke-width="6"/>' +
      '<path d="M200 88c6 4 14-4 20 0s14-4 20 0 14-4 20 0 14-4 20 0" fill="none" stroke="#fff6e3" stroke-width="4"/>' +
      '<g fill="#c7682f"><circle cx="220" cy="108" r="3"/><circle cx="240" cy="112" r="3"/><circle cx="262" cy="108" r="3"/></g>'
    ),
    // 聚餐：鐵板、鍋鏟、牛排與蔬菜
    "聚餐": wrap(
      '<rect x="44" y="84" width="232" height="34" rx="6" fill="#55595e" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<rect x="56" y="76" width="208" height="12" rx="4" fill="#7b8087" stroke="var(--ill-ink)" stroke-width="2.5"/>' +
      '<path d="M86 76c0-14 16-22 38-22s38 8 38 22z" fill="#8a4128" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<g stroke="#5f2a18" stroke-width="3"><path d="M100 62l10 12"/><path d="M118 58l10 14"/><path d="M136 60l10 12"/></g>' +
      '<g stroke="var(--ill-ink)" stroke-width="2"><ellipse cx="190" cy="72" rx="12" ry="6" fill="#5fae4f"/><ellipse cx="212" cy="73" rx="10" ry="5" fill="#f2b33d"/><ellipse cx="232" cy="72" rx="11" ry="6" fill="#e05a47"/></g>' +
      '<g transform="rotate(-30 256 44)"><rect x="236" y="22" width="40" height="28" rx="3" fill="#c9ced4" stroke="var(--ill-ink)" stroke-width="2.5"/><rect x="252" y="50" width="8" height="34" rx="3" fill="#7a5233" stroke="var(--ill-ink)" stroke-width="2"/></g>' +
      steam(124)
    ),
    // 商場夜市：摩天輪與燈籠攤位
    "商場夜市": wrap(
      '<g stroke="var(--ill-ink)" stroke-width="2.5" fill="none"><circle cx="96" cy="66" r="46"/><circle cx="96" cy="66" r="6" fill="var(--ill-ink)"/>' +
      '<path d="M96 20v92M50 66h92M63 33l66 66M129 33l-66 66"/><path d="M96 66l-22 62M96 66l22 62"/></g>' +
      '<g stroke="var(--ill-ink)" stroke-width="2"><rect x="88" y="12" width="16" height="12" rx="3" fill="#f2b33d"/><rect x="134" y="58" width="16" height="12" rx="3" fill="#e05a47"/><rect x="42" y="58" width="16" height="12" rx="3" fill="#5fae4f"/><rect x="88" y="104" width="16" height="12" rx="3" fill="#7fb0c9"/><rect x="120" y="26" width="14" height="11" rx="3" fill="#b693c9"/><rect x="58" y="94" width="14" height="11" rx="3" fill="#f08a5d"/></g>' +
      '<path d="M176 128v-56h120v56" fill="#f3f1ea" stroke="var(--ill-ink)" stroke-width="3"/>' +
      '<path d="M168 72l12-20h112l12 20z" fill="#e05a47" stroke="var(--ill-ink)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M180 72v8M200 72v8M220 72v8M240 72v8M260 72v8M280 72v8" stroke="#fff" stroke-width="5"/>' +
      '<path d="M186 40c30 10 70 10 100 0" fill="none" stroke="var(--ill-ink)" stroke-width="2"/>' +
      '<g stroke="var(--ill-ink)" stroke-width="2"><ellipse cx="200" cy="46" rx="7" ry="9" fill="#f2b33d"/><ellipse cx="236" cy="50" rx="7" ry="9" fill="#e05a47"/><ellipse cx="272" cy="46" rx="7" ry="9" fill="#f2b33d"/></g>' +
      '<rect x="190" y="96" width="92" height="10" rx="3" fill="#b07a45" stroke="var(--ill-ink)" stroke-width="2"/>'
    ),
  };
})();
