/**
 * REVIEW STORE — đánh giá sao sản phẩm
 * ------------------------------------------------------------------
 * Backed by Firestore (collection "reviews"). Cấu trúc và quyền y
 * hệt CommentStore (xem js/comments.js) — khách chỉ tạo được, không
 * sửa/xoá của ai; chỉ admin ẩn/xoá được.
 *
 * Điểm trung bình và tổng số lượt đánh giá được TÍNH TỰ ĐỘNG từ danh
 * sách đánh giá thật đang có trong Firestore (getAggregate()) — không
 * có số liệu giả hay nhập tay.
 * ------------------------------------------------------------------
 */

const REVIEWS_COLLECTION = "reviews";
const REVIEW_COOLDOWN_MS = 20 * 1000;
const REVIEW_NAME_MAX = 60;
const REVIEW_MESSAGE_MAX = 500;

function reviewSortByDateDesc(list) {
  return list.slice().sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

const ReviewStore = {
  _cache: [],
  _unsub: null,
  _adminCache: [],
  _adminUnsub: null,

  getAll() {
    return this._cache;
  },

  getAllForAdmin() {
    return this._adminCache;
  },

  // Điểm trung bình + tổng số đánh giá, tính trực tiếp từ dữ liệu thật
  // hiện có (chỉ những đánh giá không bị ẩn — this._cache đã được
  // Security Rules lọc sẵn cho khách công khai).
  getAggregate() {
    const list = this._cache;
    const count = list.length;
    if (!count) return { avg: 0, count: 0 };
    const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return { avg: sum / count, count };
  },

  cooldownRemainingSec() {
    const last = Number(localStorage.getItem("sf_last_review_ts") || 0);
    const remain = REVIEW_COOLDOWN_MS - (Date.now() - last);
    return remain > 0 ? Math.ceil(remain / 1000) : 0;
  },

  // productId: number, name: string, rating: 1-5, message: string (optional), honeypot: string
  add({ productId, name, rating, message, honeypot }) {
    if (honeypot) {
      return Promise.reject(new Error("spam-detected"));
    }
    const cleanName = String(name || "").trim().slice(0, REVIEW_NAME_MAX);
    const cleanRating = Math.round(Number(rating));
    const cleanMessage = String(message || "").trim().slice(0, REVIEW_MESSAGE_MAX);
    if (!cleanName || !cleanRating || cleanRating < 1 || cleanRating > 5) {
      return Promise.reject(new Error("invalid-fields"));
    }
    if (this.cooldownRemainingSec() > 0) {
      return Promise.reject(new Error("cooldown"));
    }
    if (!window.db) {
      return Promise.reject(new Error("no-database"));
    }

    localStorage.setItem("sf_last_review_ts", String(Date.now()));
    try { localStorage.setItem("sf_commenter_name", cleanName); } catch (e) {}

    return window.db.collection(REVIEWS_COLLECTION).add({
      productId: Number(productId),
      name: cleanName,
      rating: cleanRating,
      message: cleanMessage,
      hidden: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  setHidden(id, hidden) {
    return window.db.collection(REVIEWS_COLLECTION).doc(id).update({ hidden: !!hidden });
  },

  remove(id) {
    return window.db.collection(REVIEWS_COLLECTION).doc(id).delete();
  },

  subscribeToProduct(productId) {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    this._cache = [];
    if (!window.db) return;
    this._unsub = window.db.collection(REVIEWS_COLLECTION)
      .where("productId", "==", Number(productId))
      .onSnapshot(
        (snapshot) => {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          this._cache = reviewSortByDateDesc(list);
          window.dispatchEvent(new CustomEvent("reviews:changed"));
        },
        (err) => console.error("ReviewStore: lỗi kết nối realtime tới Firestore", err)
      );
  },

  subscribeAllForAdmin(limitCount = 300) {
    if (this._adminUnsub || !window.db) return;
    this._adminUnsub = window.db.collection(REVIEWS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .onSnapshot(
        (snapshot) => {
          this._adminCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          window.dispatchEvent(new CustomEvent("reviews-admin:changed"));
        },
        (err) => console.error("ReviewStore(admin): lỗi kết nối realtime tới Firestore", err)
      );
  }
};

window.ReviewStore = ReviewStore;
