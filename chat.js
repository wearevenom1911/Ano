/* ============================================================
   ANO Store — Recommendation Chat (fully button-driven)
   No text input — user only clicks ready-made question chips.
   Uses `laptops` array from laptops.xlsx loaded by script.js.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- inject widget ---------- */
  const root = document.createElement("div");
  root.className = "anochat-root";
  root.innerHTML = `
    <button class="anochat-fab" id="anochat-fab" aria-label="مساعد ANO">
      <svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 2.9 5.6-.1 1-.5 2.6-1.6 3.6 0 0 2.9-.2 5.1-1.7.8.2 1.7.4 2.6.4.2 0 .4 0 .6 0C11.2 17.5 11 16.3 11 15c0-4.1 3.9-7.5 8.8-7.5.1 0 .2 0 .3 0C18.8 4.9 15.7 3 12 3zM7 9.5c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm5 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z"/><path d="M21.5 15c0-3.6-3.4-6.5-7.5-6.5S6.5 11.4 6.5 15s3.4 6.5 7.5 6.5c.9 0 1.7-.1 2.5-.4 1.7 1 3.9 1.2 3.9 1.2-.8-.8-1.1-1.9-1.2-2.7 1.4-1.1 2.3-2.7 2.3-4.6zM14 13.5c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zm4 0c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9z"/></svg>
      <span class="anochat-fab-badge"></span>
    </button>
    <div class="anochat-panel" id="anochat-panel" role="dialog" aria-label="مساعد ANO">
      <div class="anochat-head">
        <div class="anochat-avatar">A</div>
        <div class="anochat-head-txt">
          <b>مساعد ANO</b>
          <span>بيقولك الجهاز المناسب لك</span>
        </div>
        <button class="anochat-restart" id="anochat-restart">↺ من الأول</button>
      </div>
      <div class="anochat-body" id="anochat-body"></div>
    </div>
  `;
  document.body.appendChild(root);

  /* ---------- refs ---------- */
  const fab = root.querySelector("#anochat-fab");
  const body = root.querySelector("#anochat-body");
  const restartBtn = root.querySelector("#anochat-restart");

  let laptops = [];
  const state = { step: "idle", usage: null, budget: null };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* wait for script.js to finish loading the catalog */
  const waitForCatalog = (cb) => {
    const t = setInterval(() => {
      if (Array.isArray(window.laptops) && window.laptops.length > 0) {
        laptops = window.laptops;
        clearInterval(t);
        cb();
      }
    }, 400);
  };

  const contactUrl = () =>
    (typeof STORE_CONFIG !== "undefined" && STORE_CONFIG.contactUrl) || "#";

  const orderUrl = (name) => {
    const base = contactUrl();
    if (base === "#") return "#";
    return base + "?text=" + encodeURIComponent("أهلاً ANO Store 👋، عايز أستفسر عن: " + name);
  };

  /* ---------- chat primitives ---------- */
  function scrollDown() { body.scrollTop = body.scrollHeight; }

  function addMsg(role, html) {
    const el = document.createElement("div");
    el.className = "anochat-msg " + role;
    el.innerHTML = html;
    body.appendChild(el);
    scrollDown();
    return el;
  }

  function addTyping() {
    const el = document.createElement("div");
    el.className = "anochat-typing";
    el.innerHTML = "<i></i><i></i><i></i>";
    body.appendChild(el);
    scrollDown();
    return el;
  }

  async function botSay(html, delay) {
    const t = addTyping();
    await sleep(delay || 550);
    t.remove();
    addMsg("bot", html);
  }

  /* ready-made question buttons — the ONLY way to interact */
  function addChips(chips, onPick) {
    const wrap = document.createElement("div");
    wrap.className = "anochat-chips";
    chips.forEach((c) => {
      const b = document.createElement("button");
      b.className = "anochat-chip";
      b.textContent = c.label;
      b.addEventListener("click", () => {
        wrap.remove();
        addMsg("user", c.label);
        onPick(c);
      });
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    scrollDown();
  }

  function addProductCard(l, badge) {
    const card = document.createElement("div");
    card.className = "anochat-product";
    card.innerHTML = `
      <img src="${l.image || ""}" alt="" onerror="this.style.visibility='hidden'">
      <div class="anochat-product-body">
        <b>${l.name}</b>
        <div class="anochat-product-specs">${l.cpu || ""}<br>${l.ram || ""} • ${l.storage || ""}</div>
        <div class="anochat-product-foot">
          <span class="anochat-price">${l.price.toLocaleString("ar-EG")} ${STORE_CONFIG.currency}</span>
          <a class="anochat-order" href="${orderUrl(l.name)}" target="_blank" rel="noopener">اطلب من واتساب ↗</a>
        </div>
      </div>`;
    if (badge) {
      const b = document.createElement("span");
      b.className = "anochat-badge";
      b.textContent = badge;
      body.appendChild(b);
    }
    body.appendChild(card);
    scrollDown();
  }

  /* ---------- recommendation engine ---------- */
  const USAGE_PROFILES = {
    study:    { ram: 8,  cpuScore: 1, gpu: 0, storage: 256, size: 14, priceBias: -1 },
    office:   { ram: 8,  cpuScore: 1, gpu: 0, storage: 256, size: 0,  priceBias: 0 },
    coding:   { ram: 16, cpuScore: 2, gpu: 0, storage: 512, size: 0,  priceBias: 0 },
    design:   { ram: 16, cpuScore: 2, gpu: 1, storage: 512, size: 15, priceBias: 0 },
    gaming:   { ram: 16, cpuScore: 2, gpu: 2, storage: 512, size: 15, priceBias: 0 },
    light:    { ram: 8,  cpuScore: 0, gpu: 0, storage: 256, size: 0,  priceBias: -1 },
  };

  const CPU_SCORES = [
    { re: /i3|ryzen 3|7020u|gold/i,              s: 0 },
    { re: /i5|ryzen 5/i,                         s: 2 },
    { re: /i7|ryzen 7|xeon|9880h|10850h|9850h/i, s: 3 },
    { re: /i9|10885h/i,                          s: 4 },
  ];

  const gpuScore = (l) => {
    const t = (l.cpu + " " + (l.description || "")).toLowerCase();
    if (/rtx|quadro|gtx|firepro|w5500|radeon pro/i.test(t)) return 2;
    if (/iris xe|vega/i.test(t)) return 1;
    return 0;
  };

  const ramNum = (l) => parseInt(l.ram || "0", 10) || 0;
  const ssdNum = (l) => {
    const m = (l.storage || "").match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const screenNum = (l) => {
    const m = (l.description || "").match(/(\d{2}(?:\.\d)?)\s*(?:"|بوصة)/);
    return m ? parseFloat(m[1]) : 0;
  };

  function scoreLaptop(l, p) {
    let s = 0;
    const ram = ramNum(l);
    const cpu = (CPU_SCORES.find((c) => c.re.test(l.cpu)) || { s: 1 }).s;
    const gpu = gpuScore(l);
    const ssd = ssdNum(l);
    const size = screenNum(l);

    s += ram >= p.ram ? 3 : (ram >= 8 ? 1 : -2);
    s += cpu >= p.cpuScore + 1 ? 3 : (cpu >= p.cpuScore ? 2 : 0);
    s += gpu >= p.gpu ? (p.gpu ? 3 : 1) : (gpu >= 1 ? 0 : -1);
    s += ssd >= p.storage ? 2 : (ssd >= 256 ? 1 : 0);
    if (p.size && size) s += Math.abs(size - p.size) <= 1 ? 2 : 0;
    if (p.priceBias < 0) s -= l.price / 12000;
    else s -= l.price / 30000;

    return s;
  }

  function budgetRange(b) {
    if (b === "low")  return [0, 20000];
    if (b === "mid")  return [20000, 28000];
    if (b === "high") return [28000, 36000];
    return [0, Infinity];
  }

  function recommend() {
    const p = USAGE_PROFILES[state.usage];
    const [min, max] = budgetRange(state.budget);
    let pool = laptops.filter((l) => l.inStock && l.price >= min && l.price <= max);
    if (pool.length === 0) pool = laptops.filter((l) => l.inStock);
    return pool
      .map((l) => ({ l, s: scoreLaptop(l, p) }))
      .sort((a, b) => b.s - a.s || a.l.price - b.l.price)
      .slice(0, 3)
      .map((x) => x.l);
  }

  /* ---------- conversation flow (all buttons) ---------- */
  const USAGE_CHIPS = [
    { id: "study",  label: "🎓 دراسة / جامعة" },
    { id: "office", label: "💼 شغل مكتبي" },
    { id: "coding", label: "💻 برمجة" },
    { id: "design", label: "🎨 تصميم / مونتاج" },
    { id: "gaming", label: "🎮 جيمنج" },
    { id: "light",  label: "🌤 استخدام خفيف" },
  ];

  const BUDGET_CHIPS = [
    { id: "low",  label: "أقل من 20,000" },
    { id: "mid",  label: "20,000 – 28,000" },
    { id: "high", label: "28,000 – 36,000" },
    { id: "any",  label: "مهمش السعر، مهم الأفضل" },
  ];

  const START_CHIPS = [
    { id: "rec",   label: "ابدأ التوصية ✨" },
    { id: "cheap", label: "أرخص جهاز؟ 💰" },
    { id: "top",   label: "أقوى جهاز؟ 💪" },
    { id: "wa",    label: "تواصل واتساب ↗" },
  ];

  function startChips() {
    addChips(START_CHIPS, (c) => {
      if (c.id === "rec") askUsage();
      else if (c.id === "cheap") showCheapest();
      else if (c.id === "top") showTop();
      else window.open(contactUrl(), "_blank");
    });
  }

  async function askUsage() {
    state.step = "usage";
    await botSay("تمام! 👋 <b>هتستخدم اللابتوب في إيه؟</b>", 550);
    addChips(USAGE_CHIPS, (c) => { state.usage = c.id; askBudget(); });
  }

  async function askBudget() {
    state.step = "budget";
    await botSay("كويس! و<b>ميزانيتك تقريبًا كام؟</b> (بالجنيه المصري)", 550);
    addChips(BUDGET_CHIPS, (c) => { state.budget = c.id; showResult(); });
  }

  async function showResult() {
    state.step = "result";
    await botSay("ثانية واحدة… بحلل الكتالوج 🔍", 650);
    const recs = recommend();
    if (recs.length === 0) {
      await botSay("مش لاقي جهاز في الميزانية دي 😅 جرب تاني؟", 500);
      addChips(BUDGET_CHIPS, (c) => { state.budget = c.id; showResult(); });
      return;
    }
    await botSay("ده <b>أفضل جهاز ليك</b> حسب استخدامك 👇", 400);
    addProductCard(recs[0], "⭐ الأنسب ليك");
    if (recs[1]) await botSay("ولو عايز بدائل، دول برضه اختيارات ممتازة:", 600);
    recs.slice(1).forEach((l) => addProductCard(l));
    await botSay("عايز تعمل إيه دلوقتي؟", 550);
    addChips(
      [
        { id: "again", label: "🔁 جهاز تاني / من الأول" },
        { id: "budget", label: "💵 ميزانية تانية" },
        { id: "wa", label: "تواصل واتساب ↗" },
      ],
      (c) => {
        if (c.id === "again") { state.usage = null; state.budget = null; askUsage(); }
        else if (c.id === "budget") { state.budget = null; askBudget(); }
        else window.open(contactUrl(), "_blank");
      }
    );
  }

  async function showCheapest() {
    await botSay("أرخص جهاز متاح حاليًا 👇", 600);
    const cheapest = laptops.filter((l) => l.inStock).sort((a, b) => a.price - b.price)[0];
    if (cheapest) {
      addProductCard(cheapest, "💰 الأرخص");
      await botSay("عايز حاجة تانية؟", 500);
      startChips();
    } else {
      await botSay("مش لاقي جهاز متاح حاليًا، جرب تاني بعد شوية 🙏");
    }
  }

  async function showTop() {
    await botSay("أقوى جهاز في الكتالوج دلوقتي 💪👇", 600);
    const top = laptops.filter((l) => l.inStock).sort((a, b) => b.price - a.price)[0];
    if (top) {
      addProductCard(top, "💪 الأقوى");
      await botSay("عايز حاجة تانية؟", 500);
      startChips();
    } else {
      await botSay("مش لاقي جهاز متاح حاليًا، جرب تاني بعد شوية 🙏");
    }
  }

  /* ---------- wiring ---------- */
  function openChat() {
    root.classList.add("anochat-open");
    fab.querySelector(".anochat-fab-badge")?.remove();
    if (state.step === "idle") {
      state.step = "started";
      waitForCatalog(async () => {
        await botSay(
          "أهلاً بيك في <b>ANO Store</b> 👋<br>أنا مساعدك — هساعدك تلاقي <b>الجهاز المناسب ليك</b>.<br>اختار من الأسئلة الجاهزة تحت 👇",
          500
        );
        startChips();
      });
    }
  }

  fab.addEventListener("click", () => {
    if (root.classList.contains("anochat-open")) root.classList.remove("anochat-open");
    else openChat();
  });

  restartBtn.addEventListener("click", () => {
    body.innerHTML = "";
    state.step = "idle";
    state.usage = null;
    state.budget = null;
    openChat();
  });
})();
