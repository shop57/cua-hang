/**
 * HOMEPAGE
 * ------------------------------------------------------------------
 * Renders the product grid straight from ProductStore (the live,
 * editable catalog) — not from a fixed list. Category chips are
 * derived from whatever categories currently exist in the catalog,
 * so the framework adapts automatically as products are added,
 * edited, deleted, or imported from admin.html.
 * ------------------------------------------------------------------
 */

let currentCategory = "All";
let currentQuery = "";

function renderStars(rating) {
  const full = Math.round(rating || 0);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

function discountPercent(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function escapeAttr(str) {
  return String(str ?? "").replace(/"/g, "&quot;");
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function productCardHTML(p) {
  const discount = discountPercent(p.price, p.oldPrice);
  const outOfStock = p.stock === "out_of_stock";
  return `
    <article class="product-card${outOfStock ? " product-card-outofstock" : ""}" data-id="${p.id}">
      <a href="product.html?id=${p.id}" class="product-thumb" aria-label="Xem ${escapeAttr(p.name)}">
        ${discount && !outOfStock ? `<span class="discount-badge">-${discount}%</span>` : ""}
        ${outOfStock ? `<span class="outofstock-badge">Hết hàng</span>` : ""}
        <img src="${p.image}" alt="${escapeAttr(p.name)}" loading="lazy" width="400" height="400"
             onerror="this.onerror=null;this.src='https://picsum.photos/seed/fallback${p.id}/400/400';">
      </a>
      <div class="product-info">
        <span class="product-category">${escapeAttr(p.category)}</span>
        <h3 class="product-name"><a href="product.html?id=${p.id}">${escapeAttr(p.name)}</a></h3>
        <div class="rating-row">
          <span class="stars" aria-hidden="true">${renderStars(p.rating)}</span>
          <span>${(p.rating || 0)} (${p.reviews || 0})</span>
        </div>
        <div class="price-row">
          <span class="price-current">${formatVND(p.price)}</span>
          ${p.oldPrice ? `<span class="price-old">${formatVND(p.oldPrice)}</span>` : ""}
        </div>
        <div class="product-card-actions">
          <a href="product.html?id=${p.id}" class="btn btn-secondary">Xem</a>
          ${outOfStock
            ? `<button type="button" class="btn btn-primary" disabled>Hết hàng</button>`
            : `<button type="button" class="btn btn-primary" data-add-to-cart="${p.id}">Thêm vào giỏ</button>`}
        </div>
      </div>
    </article>`;
}

function getFilteredProducts() {
  return ProductStore.getAll().filter((p) => {
    const matchesCategory = currentCategory === "All" || p.category === currentCategory;
    const q = currentQuery.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });
}

function renderGrid() {
  const grid = document.getElementById("productGrid");
  const countEl = document.getElementById("resultCount");
  if (!grid) return;

  const filtered = getFilteredProducts();

  if (countEl) {
    countEl.textContent = `${filtered.length} sản phẩm`;
  }

  if (filtered.length === 0) {
    const total = ProductStore.getAll().length;
    grid.innerHTML = total === 0
      ? `<div class="empty-state">
           <p>Danh mục của bạn đang trống.</p>
           <a href="admin.html" class="btn btn-primary">Thêm sản phẩm đầu tiên</a>
         </div>`
      : `<div class="empty-state"><p>Không có sản phẩm nào phù hợp với tìm kiếm.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(productCardHTML).join("");
}

function renderCategoryChips() {
  const list = document.getElementById("categoryList");
  if (!list) return;
  const categories = ProductStore.getCategories();
  if (!categories.includes(currentCategory)) currentCategory = "All";
  list.innerHTML = categories
    .map((cat) => `<button type="button" class="category-chip${cat === currentCategory ? " active" : ""}" data-category="${escapeAttr(cat)}">${escapeAttr(cat)}</button>`)
    .join("");
}

function refreshHomepage() {
  renderCategoryChips();
  renderGrid();
}

function initHomepage() {
  refreshHomepage();

  document.getElementById("categoryList")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    currentCategory = btn.getAttribute("data-category");
    refreshHomepage();
    const grid = document.getElementById("productGrid");
    if (grid) window.scrollTo({ top: grid.offsetTop - 90, behavior: "smooth" });
  });

  const searchInputs = document.querySelectorAll("[data-search-input]");
  searchInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      currentQuery = e.target.value;
      searchInputs.forEach((other) => { if (other !== e.target) other.value = currentQuery; });
      renderGrid();
    });
  });
  document.querySelectorAll("[data-search-form]").forEach((form) => {
    form.addEventListener("submit", (e) => e.preventDefault());
  });

  document.getElementById("productGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-to-cart]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-add-to-cart"));
    Cart.add(id, 1);
    flashButton(btn);
  });

  // Live-refresh if products change in another tab (e.g. admin.html)
  window.addEventListener("products:changed", refreshHomepage);
  window.addEventListener("categories:changed", refreshHomepage);
}

function flashButton(btn) {
  const original = btn.textContent;
  btn.textContent = "Đã thêm ✓";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 900);
}

document.addEventListener("DOMContentLoaded", initHomepage);
