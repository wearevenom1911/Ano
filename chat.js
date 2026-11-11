/* ============================================================
   ANO Store — In-site Recommendation Chat Assistant
   Pure client-side. Uses the same `laptops` array loaded from
   laptops.xlsx by script.js. No server / no API key needed.
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
      <div class="anochat-input">
        <input id="anochat-input" type="text" placeholder="اكتب هنا... (مثلاً: جهاز للجامعة)" autocomplete="off">
        <button class="anochat-send" id="anochat-send" aria-label="إرسال">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  /* ---------- refs ---------- */
  const fab = root.querySelector("#anochat-fab");
  const panel = root.querySelector("#anochat-panel");
  const body = root.querySelector("#anochat-body");
  const input = root.querySelector("#anochat-input");
  const sendBtn = root.querySelector("#anochat-send");
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
  function scrollDown() {
    body.scrollTop = body.scrollHeight;
  }

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
    await sleep(delay || 650);
    t.remove();
    addMsg("bot", html);
  }

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
    const img = l.image || "";
    card.innerHTML = `
      <img src="${img}" alt="" onerror="this.style.visibility='hidden'">
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
    study:    { label: "دراسة / جامعة",     ram: 8,  cpuScore: 1, gpu: 0, storage: 256, size: 14, priceBias: -1 },
    office:   { label: "شغل مكتبي",         ram: 8,  cpuScore: 1, gpu: 0, storage: 256, size: 0,  priceBias: 0 },
    coding:   { label: "برمجة",             ram: 16, cpuScore: 2, gpu: 0, storage: 512, size: 0,  priceBias: 0 },
    design:   { label: "تصميم / مونتاج",    ram: 16, cpuScore: 2, gpu: 1, storage: 512, size: 15, priceBias: 0 },
    gaming:   { label: "جيمنج",             ram: 16, cpuScore: 2, gpu: 2, storage: 512, size: 15, priceBias: 0 },
    light:    { label: "استخدام خفيف",      ram: 8,  cpuScore: 0, gpu: 0, storage: 256, size: 0,  priceBias: -1 },
  };

  const CPU_SCORES = [
    { re: /i3|ryzen 3|7020u|gold/i,            s: 0 },
    { re: /i5|ryzen 5/i,                       s: 2 },
    { re: /i7|ryzen 7|xeon|9880h|10850h|9850h/i, s: 3 },
    { re: /i9|10885h/i,                        s: 4 },
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
    const m = (l.description || "").match(/(\d{2}(?:\.\d)?)"|(\d{2}(?:\.\d)?)\s*(?:"|بوصة)/);
    return m ? parseFloat(m[1] || m[2]) : 0;
  };

  function scoreLaptop(l, p) {
    let s = 0;
    const ram = ramNum(l);
    const cpu = (CPU_SCORES.find((c) => c.re.test(l.cpu)) || { s: 1 }).s;
    const gpu = gpuScore(l);
    const ssd = ssdNum(l);
    const size = screenNum(l);

    // RAM: reward meeting the need, penalize below
    s += ram >= p.ram ? 3 : (ram >= 8 ? 1 : -2);
    // CPU
    s += cpu >= p.cpuScore + 1 ? 3 : (cpu >= p.cpuScore ? 2 : 0);
    // GPU
    s += gpu >= p.gpu ? (p.gpu ? 3 : 1) : (gpu >= 1 ? 0 : -1);
    // storage
    s += ssd >= p.storage ? 2 : (ssd >= 256 ? 1 : 0);
    // screen size closeness
    if (p.size && size) s += Math.abs(size - p.size) <= 1 ? 2 : 0;
    // cheaper is a small plus for budget-conscious profiles
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
    const ranked = pool
      .map((l) => ({ l, s: scoreLaptop(l, p) }))
      .sort((a, b) => b.s - a.s || a.l.price - b.l.price)
      .slice(0, 3)
      .map((x) => x.l);
    return ranked;
  }

  /* ---------- conversation flow ---------- */
  async function askUsage() {
    state.step = "usage";
    await botSay("تمام! 👋 عشان أرشحلك أحسن جهاز — <b>هتستخدم اللابتوب في إيه؟</b>", 550);
    addChips(
      [
        { id: "study",  label: "🎓 دراسة / جامعة" },
        { id: "office", label: "💼 شغل مكتبي" },
        { id: "coding", label: "💻 برمجة" },
        { id: "design", label: "🎨 تصميم / مونتاج" },
        { id: "gaming", label: "🎮 جيمنج" },
        { id: "light",  label: "🌤 استخدام خفيف" },
      ],
      (c) => { state.usage = c.id; askBudget(); }
    );
  }

  async function askBudget() {
    state.step = "budget";
    await botSay("كويس! و<b>ميزانيتك تقريبًا كام؟</b> (بالجنيه المصري)", 550);
    addChips(
      [
        { id: "low",  label: "أقل من 20,000" },
        { id: "mid",  label: "20,000 – 28,000" },
        { id: "high", label: "28,000 – 36,000" },
        { id: "any",  label: "مهمش السعر، مهم الأفضل" },
      ],
      (c) => { state.budget = c.id; showResult(); }
    );
  }

  async function showResult() {
    state.step = "result";
    await botSay("ثانية واحدة… بحلل الكتالوج 🔍", 700);
    const recs = recommend();
    if (recs.length === 0) {
      await botSay("معلش، مش لاقي جهاز مناسب للأسف 😅 جرب تديني ميزانية تانية؟");
      state.step = "budget";
      addChips(
        [
          { id: "low",  label: "أقل من 20,000" },
          { id: "mid",  label: "20,000 – 28,000" },
          { id: "high", label: "28,000 – 36,000" },
          { id: "any",  label: "مهمش السعر" },
        ],
        (c) => { state.budget = c.id; showResult(); }
      );
      return;
    }
    await botSay("ده <b>أفضل جهاز ليك</b> حسب استخدامك 👇", 400);
    addProductCard(recs[0], "⭐ الأنسب ليك");
    if (recs[1]) await botSay("ولو عايز بدائل، دول برضه اختيارات ممتازة:", 600);
    recs.slice(1).forEach((l) => addProductCard(l));
    await botSay(
      "عايز حاجة تانية؟ 🤔<br>• دوس <b>↺ من الأول</b> فوق<br>• أو اسألني أي سؤال تحت 👇<br>• أو اطلب مباشرة من واتساب",
      600
    );
  }

  /* ---------- free text: simple intent matching ---------- */
  const INTENTS = [
    { re: /جامع|دراس|كلي|مدرس/,                        fn: () => pickUsage("study") },
    { re: /مكتبي|شغل مكت|اوفيس|office/,                fn: () => pickUsage("office") },
    { re: /برمج|كود|coding|code/,                      fn: () => pickUsage("coding") },
    { re: /مونتاج|تصميم|فوتوشوب|بريمير|اديت|design/,   fn: () => pickUsage("design") },
    { re: /جيم|جيمنج|العب|العاب|gaming|game/,          fn: () => pickUsage("gaming") },
    { re: /خفيف|بسيط|عادي/,                            fn: () => pickUsage("light") },
    { re: /ارخ|ارخص|اقل سعر|سعر اقل/,                  fn: showCheapest },
    { re: /اقوى|افضل|أقوى|أفضل|strongest|top/,         fn: showTop },
    { re: /شحن|توصيل|delivery/,                        fn: async () => { await botSay("التوصيل والتفاصيل بنرتبها مع بعض على الواتساب مباشرة 🚚 دوس زرار «تواصل معنا» في الهيدر أو زرار الطلب جنب أي جهاز."); } },
    { re: /ضمان|جارنتي|warranty/,                      fn: async () => { await botSay("تفاصيل الضمان والحالة بتاعت كل جهاز متاحة — اسأل عليها على الواتساب وهنرد عليك فورًا ✅"); } },
    { re: /تواصل|واتس|whats|رقم/,                      fn: async () => { await botSay('تواصل معنا على واتساب من <a href="' + contactUrl() + '" target="_blank" rel="noopener" style="color:var(--c-accent)">هنا ↗</a>'); } },
    { re: /سلام|شكرا|شكراً|تمام|كويس|OK|ok/,           fn: async () => { await botSay("العفو! 🌟 تحت أمرك في أي وقت — لو حبيت تبدأ تاني دوس ↺ من الأول"); } },
  ];

  function pickUsage(id) {
    state.usage = id;
    askBudget();
  }

  async function showCheapest() {
    await botSay("أرخص جهاز متاح حاليًا 👇", 600);
    const cheapest = laptops.filter((l) => l.inStock).sort((a, b) => a.price - b.price)[0];
    if (cheapest) addProductCard(cheapest, "💰 الأرخص");
    else await botSay("مش لاقي جهاز متاح حاليًا، جرب تاني بعد شوية 🙏");
  }

  async function showTop() {
    await botSay("أقوى جهاز في الكتالوج دلوقتي 💪👇", 600);
    const top = laptops.filter((l) => l.inStock).sort((a, b) => b.price - a.price)[0];
    if (top) addProductCard(top, "💪 الأقوى");
    else await botSay("مش لاقي جهاز متاح حاليًا، جرب تاني بعد شوية 🙏");
  }

  async function handleText(text) {
    const hit = INTENTS.find((i) => i.re.test(text));
    if (hit) { await hit.fn(); return; }
    await botSay("أنا بفهم الأسئلة عن <b>الاستخدام، الميزانية، الأسعار، الشحن، الضمان</b> 🙂<br>جرب: «جهاز للجامعة» أو «أرخص جهاز؟»");
  }

  /* ---------- wiring ---------- */
  function openChat() {
    root.classList.add("anochat-open");
    fab.querySelector(".anochat-fab-badge")?.remove();
    setTimeout(() => input.focus(), 250);
    if (state.step === "idle") {
      state.step = "started";
      waitForCatalog(() => {
        botSay(
          "أهلاً بيك في <b>ANO Store</b> 👋<br>أنا مساعدك الذكي — هساعدك تلاقي <b>الجهاز المناسب ليك</b> من الكتالوج.",
          500
        ).then(() => askUsage());
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

  async function onSend() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMsg("user", text.replace(/</g, "&lt;"));
    await handleText(text);
  }

  sendBtn.addEventListener("click", onSend);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSend();
  });
})();
