/**
 * PRODUCT STORE
 * ------------------------------------------------------------------
 * The single source of truth for the LIVE catalog — now backed by
 * Firestore (collection "products") instead of localStorage, so
 * every visitor sees the same catalog, on any device or browser.
 *
 * Everything reads and writes through this object — the homepage
 * grid, the product page, and admin.html. js/products.js only
 * supplies the initial seed (DEFAULT_PRODUCTS), used when you hit
 * "Đặt lại sản phẩm demo" in Admin.
 *
 * ProductStore.getAll()/getById()/getCategories() read from an
 * in-memory cache that's kept live by a Firestore realtime listener
 * (onSnapshot) — so the cache may be briefly empty on first page
 * load, then fills in automatically. add()/update()/remove()/reset()
 * update the cache immediately (optimistic) AND write to Firestore
 * in the background; a "products:changed" event on `window` fires
 * every time the cache changes, exactly like before, so existing
 * pages that listen for it keep working unmodified.
 *
 * Writing to the "products" collection is restricted to signed-in
 * admins by Firestore Security Rules (see HUONG_DAN_FIREBASE.md) —
 * this file doesn't enforce that, the server does.
 * ------------------------------------------------------------------
 */

const PRODUCTS_COLLECTION = "products";

// Shared VND formatter — used across every page (product cards, cart,
// checkout, admin). Prices are stored as plain VND numbers, no decimals.
function formatVND(amount) {
  return Math.round(Number(amount) || 0).toLocaleString("vi-VN") + " ₫";
}
window.formatVND = formatVND;

const ProductStore = {
  _cache: [],
  ready: false, // true once the first Firestore snapshot has arrived

  getAll() {
    return this._cache;
  },

  getById(id) {
    return this._cache.find((p) => p.id === Number(id)) || null;
  },

  getCategories() {
    const fromProducts = this._cache.map((p) => (p.category || "").trim()).filter(Boolean);
    const fromExtra = window.CategoryStore ? window.CategoryStore.getAll() : [];
    const cats = new Set([...fromProducts, ...fromExtra]);
    return ["All", ...[...cats].sort((a, b) => a.localeCompare(b))];
  },

  _nextId() {
    return this._cache.length ? Math.max(...this._cache.map((p) => p.id)) + 1 : 1;
  },

  _docRef(id) {
    return window.db.collection(PRODUCTS_COLLECTION).doc(String(id));
  },

  _emit() {
    window.dispatchEvent(new CustomEvent("products:changed"));
  },

  // Cleans a raw images/videos array from the admin form: strings only,
  // trimmed, empty ones dropped.
  _sanitizeUrlList(list) {
    return Array.isArray(list) ? list.map((u) => String(u || "").trim()).filter(Boolean) : [];
  },

  add(productData) {
    const images = this._sanitizeUrlList(productData.images);
    const product = {
      id: this._nextId(),
      name: (productData.name || "").trim() || "Untitled product",
      price: Math.round(Number(productData.price)) || 0,
      oldPrice: productData.oldPrice !== "" && productData.oldPrice != null ? Math.round(Number(productData.oldPrice)) : null,
      // `image` (singular) stays in sync with the first gallery entry so
      // every existing page (home cards, cart, checkout, admin list —
      // none of which know about `images`) keeps working unmodified.
      image: images[0] || "https://picsum.photos/seed/placeholder/800/800",
      images,
      videos: this._sanitizeUrlList(productData.videos),
      category: (productData.category || "").trim() || "General",
      sizes: this._sanitizeUrlList(productData.sizes),
      rating: productData.rating !== "" && productData.rating != null ? Number(productData.rating) : 0,
      reviews: productData.reviews !== "" && productData.reviews != null ? Number(productData.reviews) : 0,
      description: (productData.description || "").trim()
    };
    this._cache.push(product);
    this._emit();
    this._docRef(product.id).set(product).catch((e) => console.error("ProductStore.add: lỗi lưu Firestore", e));
    return product;
  },

  update(id, patch) {
    const product = this.getById(id);
    if (!product) return null;
    if (patch.name !== undefined) product.name = String(patch.name).trim() || product.name;
    if (patch.price !== undefined) product.price = Math.round(Number(patch.price)) || 0;
    if (patch.oldPrice !== undefined) product.oldPrice = patch.oldPrice === "" || patch.oldPrice === null ? null : Math.round(Number(patch.oldPrice));
    if (patch.images !== undefined) {
      product.images = this._sanitizeUrlList(patch.images);
      // Keep the legacy single `image` field pointed at the cover photo.
      product.image = product.images[0] || product.image;
    }
    if (patch.videos !== undefined) product.videos = this._sanitizeUrlList(patch.videos);
    if (patch.category !== undefined) product.category = String(patch.category).trim() || product.category;
    if (patch.sizes !== undefined) product.sizes = this._sanitizeUrlList(patch.sizes);
    if (patch.rating !== undefined) product.rating = patch.rating === "" || patch.rating === null ? 0 : Number(patch.rating);
    if (patch.reviews !== undefined) product.reviews = patch.reviews === "" || patch.reviews === null ? 0 : Number(patch.reviews);
    if (patch.description !== undefined) product.description = String(patch.description).trim();
    this._emit();
    this._docRef(id).set(product).catch((e) => console.error("ProductStore.update: lỗi lưu Firestore", e));
    return product;
  },

  remove(id) {
    this._cache = this._cache.filter((p) => p.id !== Number(id));
    this._emit();
    this._docRef(id).delete().catch((e) => console.error("ProductStore.remove: lỗi xoá Firestore", e));
  },

  reset() {
    const previous = this._cache;
    const seed = JSON.parse(JSON.stringify(window.DEFAULT_PRODUCTS || []));
    this._cache = seed;
    this._emit();

    const batch = window.db.batch();
    previous.forEach((p) => batch.delete(this._docRef(p.id)));
    seed.forEach((p) => batch.set(this._docRef(p.id), p));
    batch.commit().catch((e) => console.error("ProductStore.reset: lỗi ghi Firestore", e));
  },

  exportJSON() {
    return JSON.stringify(this._cache, null, 2);
  },

  /**
   * Imports an array of product-like objects, appending them to the
   * current catalog (existing products are never overwritten). Each
   * imported item is assigned a fresh unique id to avoid collisions.
   * Returns { added, skipped } counts.
   */
  importJSON(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error("That file isn't valid JSON.");
    }
    if (!Array.isArray(parsed)) {
      throw new Error("Expected a JSON array of products.");
    }

    let added = 0;
    let skipped = 0;
    const batch = window.db.batch();

    parsed.forEach((item) => {
      if (!item || typeof item !== "object" || !item.name) {
        skipped++;
        return;
      }
      const images = this._sanitizeUrlList(item.images && item.images.length ? item.images : (item.image ? [item.image] : []));
      const product = {
        id: this._nextId(),
        name: String(item.name).trim(),
        price: Math.round(Number(item.price)) || 0,
        oldPrice: item.oldPrice !== undefined && item.oldPrice !== null && item.oldPrice !== "" ? Math.round(Number(item.oldPrice)) : null,
        image: images[0] || "https://picsum.photos/seed/placeholder/800/800",
        images,
        videos: this._sanitizeUrlList(item.videos),
        category: item.category ? String(item.category).trim() : "General",
        sizes: this._sanitizeUrlList(item.sizes),
        rating: item.rating !== undefined && item.rating !== null ? Number(item.rating) : 0,
        reviews: item.reviews !== undefined && item.reviews !== null ? Number(item.reviews) : 0,
        description: item.description ? String(item.description).trim() : ""
      };
      this._cache.push(product);
      batch.set(this._docRef(product.id), product);
      added++;
    });

    this._emit();
    batch.commit().catch((e) => console.error("ProductStore.importJSON: lỗi ghi Firestore", e));
    return { added, skipped };
  }
};

window.ProductStore = ProductStore;

// Realtime listener — keeps the cache (and every open tab/device) in
// sync automatically whenever the catalog changes anywhere.
if (window.db) {
  window.db.collection(PRODUCTS_COLLECTION).onSnapshot(
    (snapshot) => {
      ProductStore._cache = snapshot.docs.map((d) => d.data());
      ProductStore.ready = true;
      window.dispatchEvent(new CustomEvent("products:changed"));
    },
    (err) => console.error("ProductStore: lỗi kết nối realtime tới Firestore", err)
  );
}
