/**
 * CART
 * ------------------------------------------------------------------
 * localStorage-backed cart, shared across every page, under the key
 * "storefront_cart_v1". Looks up product info (name/price/image) via
 * ProductStore, so it always reflects the current live catalog —
 * if a product is edited or deleted in admin.html, the cart updates
 * to match (a deleted product's line is dropped automatically).
 * ------------------------------------------------------------------
 */

const CART_STORAGE_KEY = "storefront_cart_v1";

const Cart = {
  items: [], // [{ id, qty }]

  load() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      this.items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Cart: could not read localStorage, starting empty.", e);
      this.items = [];
    }
    this._pruneDeleted();
    return this.items;
  },

  // Drop any cart line whose product no longer exists in the catalog.
  _pruneDeleted() {
    // ProductStore's Firestore data arrives asynchronously — right after
    // a page load its cache can still be empty. Treating "not loaded
    // yet" the same as "deleted" would wipe out (and persist!) an empty
    // cart before the real catalog ever arrives. Wait until the first
    // snapshot has actually come back before pruning anything.
    if (!window.ProductStore || !ProductStore.ready) return;
    const before = this.items.length;
    this.items = this.items.filter((i) => ProductStore.getById(i.id));
    if (this.items.length !== before) this.save();
  },

  save() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn("Cart: could not write to localStorage.", e);
    }
  },

  add(productId, qty = 1) {
    const existing = this.items.find((i) => i.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({ id: productId, qty });
    }
    this.save();
    this.renderAll();
  },

  setQty(productId, qty) {
    const item = this.items.find((i) => i.id === productId);
    if (!item) return;
    item.qty = qty;
    if (item.qty <= 0) {
      this.remove(productId);
      return;
    }
    this.save();
    this.renderAll();
  },

  remove(productId) {
    this.items = this.items.filter((i) => i.id !== productId);
    this.save();
    this.renderAll();
  },

  clear() {
    this.items = [];
    this.save();
    this.renderAll();
  },

  totalCount() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  totalPrice() {
    return this.items.reduce((sum, i) => {
      const p = ProductStore.getById(i.id);
      return p ? sum + p.price * i.qty : sum;
    }, 0);
  },

  // ---- UI ----

  renderAll() {
    this.renderBadge();
    this.renderDrawer();
  },

  renderBadge() {
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      const count = this.totalCount();
      el.textContent = count;
      el.style.display = count > 0 ? "flex" : "none";
    });
  },

  renderDrawer() {
    const body = document.getElementById("cartDrawerBody");
    const footer = document.getElementById("cartDrawerFooter");
    if (!body) return; // drawer not present on this page

    this._pruneDeleted();

    if (this.items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <p>Giỏ hàng của bạn đang trống.</p>
          <a href="index.html" class="btn btn-primary">Xem sản phẩm</a>
        </div>`;
      if (footer) footer.style.display = "none";
      return;
    }

    if (footer) footer.style.display = "block";

    body.innerHTML = this.items
      .map((item) => {
        const p = ProductStore.getById(item.id);
        if (!p) return "";
        return `
          <div class="cart-line" data-line-id="${p.id}">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" width="64" height="64">
            <div class="cart-line-info">
              <p class="cart-line-name">${escapeHtml(p.name)}</p>
              <p class="cart-line-price">${formatVND(p.price)}</p>
              <div class="qty-control qty-control-sm">
                <button type="button" aria-label="Giảm số lượng" data-cart-dec="${p.id}">−</button>
                <span>${item.qty}</span>
                <button type="button" aria-label="Tăng số lượng" data-cart-inc="${p.id}">+</button>
              </div>
            </div>
            <button type="button" class="cart-line-remove" aria-label="Xoá ${escapeHtml(p.name)}" data-cart-remove="${p.id}">✕</button>
          </div>`;
      })
      .join("");

    const totalEl = document.getElementById("cartDrawerTotal");
    if (totalEl) totalEl.textContent = formatVND(this.totalPrice());
  },
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Global drawer open/close + delegated events ----

function initCartUI() {
  Cart.load();
  Cart.renderAll();

  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  const openBtns = document.querySelectorAll("[data-cart-open]");
  const closeBtns = document.querySelectorAll("[data-cart-close]");

  const openDrawer = () => {
    if (!drawer) return;
    drawer.classList.add("open");
    overlay?.classList.add("open");
    document.body.classList.add("no-scroll");
  };
  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove("open");
    overlay?.classList.remove("open");
    document.body.classList.remove("no-scroll");
  };

  openBtns.forEach((btn) => btn.addEventListener("click", openDrawer));
  closeBtns.forEach((btn) => btn.addEventListener("click", closeDrawer));
  overlay?.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  const body = document.getElementById("cartDrawerBody");
  body?.addEventListener("click", (e) => {
    const incId = e.target.getAttribute?.("data-cart-inc");
    const decId = e.target.getAttribute?.("data-cart-dec");
    const remId = e.target.getAttribute?.("data-cart-remove");
    if (incId) {
      const item = Cart.items.find((i) => i.id === Number(incId));
      if (item) Cart.setQty(item.id, item.qty + 1);
    } else if (decId) {
      const item = Cart.items.find((i) => i.id === Number(decId));
      if (item) Cart.setQty(item.id, item.qty - 1);
    } else if (remId) {
      Cart.remove(Number(remId));
    }
  });

  document.getElementById("cartClearBtn")?.addEventListener("click", () => {
    if (confirm("Xoá tất cả sản phẩm khỏi giỏ hàng?")) Cart.clear();
  });

  // Keep the cart in sync if products change (e.g. a deleted product's line should disappear)
  window.addEventListener("products:changed", () => Cart.renderAll());
}

document.addEventListener("DOMContentLoaded", initCartUI);
