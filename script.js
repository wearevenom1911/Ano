const EXCEL_PATH = "laptops.xlsx";

const statusEl = document.getElementById("status");
const gridEl = document.getElementById("product-grid");
const searchEl = document.getElementById("search");
const brandEl = document.getElementById("brand-filter");
const sortEl = document.getElementById("sort-by");
const stockCountEl = document.getElementById("stock-count");
const heroStockEl = document.getElementById("hero-stock");
const catalogCountEl = document.getElementById("catalog-count");
const overlayEl = document.getElementById("detail-overlay");
const detailContentEl = document.getElementById("detail-content");
const detailCloseEl = document.getElementById("detail-close");
const contactLinkEl = document.getElementById("contact-link");

if (typeof STORE_CONFIG !== "undefined" && contactLinkEl) {
  contactLinkEl.href = STORE_CONFIG.contactUrl;
}

let laptops = [];

function normalizeRow(row) {
  const price = Number(row["Price"]);
  if (!row["Name"] || !Number.isFinite(price)) return null; // skips the legend/example-guidance row and blanks

  return {
    name: String(row["Name"]).trim(),
    brand: String(row["Brand"] || "").trim(),
    cpu: String(row["CPU"] || "").trim(),
    ram: String(row["RAM"] || "").trim(),
    storage: String(row["Storage"] || "").trim(),
    price,
    image: String(row["Image URL"] || "").trim(),
    inStock: String(row["InStock"] || "").trim().toLowerCase() !== "no",
    description: String(row["Description"] || "").trim(),
  };
}

async function loadLaptops() {
  try {
    const res = await fetch(EXCEL_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error("file not found");
    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    laptops = rows.map(normalizeRow).filter(Boolean);

    if (laptops.length === 0) {
      statusEl.textContent = "لسه معملتش إضافة أي لابتوب في ملف الإكسل. ضيف صف جديد تحت مثال البيانات وارفع الملف.";
      statusEl.classList.add("error");
      return;
    }

    populateBrandFilter();
    render();
    statusEl.hidden = true;
    gridEl.hidden = false;
  } catch (err) {
    statusEl.textContent = "مقدرش أقرأ ملف laptops.xlsx. اتأكد إنه موجود في نفس مجلد الموقع وإنك بتفتح الموقع من سيرفر (مش بفتح الملف مباشرة).";
    statusEl.classList.add("error");
    console.error(err);
  }
}

function populateBrandFilter() {
  const brands = [...new Set(laptops.map((l) => l.brand).filter(Boolean))].sort();
  for (const b of brands) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    brandEl.appendChild(opt);
  }
}

function getFiltered() {
  const query = searchEl.value.trim().toLowerCase();
  const brand = brandEl.value;
  const sortBy = sortEl.value;

  let list = laptops.filter((l) => {
    const matchesQuery = !query || l.name.toLowerCase().includes(query) || l.brand.toLowerCase().includes(query);
    const matchesBrand = !brand || l.brand === brand;
    return matchesQuery && matchesBrand;
  });

  if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (sortBy === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return list;
}

function render() {
  const list = getFiltered();
  const availableCount = laptops.filter((l) => l.inStock).length;
  stockCountEl.textContent = availableCount;
  if (heroStockEl) heroStockEl.textContent = availableCount;
  if (catalogCountEl) catalogCountEl.textContent = `${laptops.length} جهاز في الكتالوج`;

  if (list.length === 0) {
    gridEl.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px 0;">مفيش نتائج مطابقة للبحث.</p>`;
    return;
  }

  gridEl.innerHTML = list
    .map((l, i) => {
      const idx = laptops.indexOf(l);
      return `
      <article class="card" data-index="${idx}">
        <div class="card-img"><img src="${l.image || fallbackImage()}" alt="${l.name}" loading="lazy" onerror="this.src='${fallbackImage()}'"></div>
        <div class="card-body">
          <span class="card-brand">${l.brand}</span>
          <h3 class="card-name">${l.name}</h3>
          <div class="spec-chips">
            ${l.cpu ? `<span class="chip">${l.cpu}</span>` : ""}
            ${l.ram ? `<span class="chip">${l.ram}</span>` : ""}
            ${l.storage ? `<span class="chip">${l.storage}</span>` : ""}
          </div>
          <div class="card-footer">
            <span class="price">${l.price.toLocaleString("ar-EG")} ${STORE_CONFIG.currency}</span>
            ${!l.inStock ? `<span class="out-of-stock">نفدت الكمية</span>` : ""}
          </div>
        </div>
      </article>`;
    })
    .join("");

  gridEl.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => openDetail(Number(card.dataset.index)));
  });
}

function fallbackImage() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#23272e'/><text x='50%' y='50%' fill='#8b909b' font-size='16' text-anchor='middle' dominant-baseline='middle'>لا توجد صورة</text></svg>`
  );
}

function openDetail(index) {
  const l = laptops[index];
  detailContentEl.innerHTML = `
    <img src="${l.image || fallbackImage()}" alt="${l.name}" onerror="this.src='${fallbackImage()}'">
    <span class="card-brand">${l.brand}</span>
    <h2>${l.name}</h2>
    <div class="spec-chips">
      ${l.cpu ? `<span class="chip">${l.cpu}</span>` : ""}
      ${l.ram ? `<span class="chip">${l.ram}</span>` : ""}
      ${l.storage ? `<span class="chip">${l.storage}</span>` : ""}
    </div>
    ${l.description ? `<p>${l.description}</p>` : ""}
    <span class="price">${l.price.toLocaleString("ar-EG")} ${STORE_CONFIG.currency}</span>
    ${
      l.inStock
        ? `<a class="detail-buy" href="${STORE_CONFIG.contactUrl}" target="_blank" rel="noopener">اطلب عن طريق واتساب</a>`
        : `<span class="out-of-stock">نفدت الكمية حالياً</span>`
    }
  `;
  overlayEl.hidden = false;
}

detailCloseEl.addEventListener("click", () => (overlayEl.hidden = true));
overlayEl.addEventListener("click", (e) => {
  if (e.target === overlayEl) overlayEl.hidden = true;
});

searchEl.addEventListener("input", render);
brandEl.addEventListener("change", render);
sortEl.addEventListener("change", render);

loadLaptops();
