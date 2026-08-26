/**
 * CATEGORY STORE
 * ------------------------------------------------------------------
 * Lets the store owner create a category from admin.html before any
 * product uses it. Backed by Firestore (collection "categories") so
 * it's shared with every visitor, just like products.
 *
 * Categories that already have at least one product are always
 * derived automatically from ProductStore (see
 * ProductStore.getCategories() in store.js) — this store only tracks
 * *extra* categories that don't have a product yet.
 * ------------------------------------------------------------------
 */

const CATEGORIES_COLLECTION = "categories";

const CategoryStore = {
  _cache: [],

  getAll() {
    return this._cache;
  },

  _emit() {
    window.dispatchEvent(new CustomEvent("categories:changed"));
  },

  add(name) {
    const clean = String(name || "").trim();
    if (!clean) return null;
    const exists = this._cache.some((c) => c.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      this._cache.push(clean);
      this._emit();
      window.db.collection(CATEGORIES_COLLECTION).doc(clean).set({ name: clean })
        .catch((e) => console.error("CategoryStore.add: lỗi lưu Firestore", e));
    }
    return clean;
  },

  remove(name) {
    const clean = String(name || "");
    this._cache = this._cache.filter((c) => c.toLowerCase() !== clean.toLowerCase());
    this._emit();
    window.db.collection(CATEGORIES_COLLECTION).doc(clean).delete()
      .catch((e) => console.error("CategoryStore.remove: lỗi xoá Firestore", e));
  }
};

window.CategoryStore = CategoryStore;

if (window.db) {
  window.db.collection(CATEGORIES_COLLECTION).onSnapshot(
    (snapshot) => {
      CategoryStore._cache = snapshot.docs.map((d) => d.data().name);
      window.dispatchEvent(new CustomEvent("categories:changed"));
    },
    (err) => console.error("CategoryStore: lỗi kết nối realtime tới Firestore", err)
  );
}
