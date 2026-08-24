/**
 * COMMENT STORE — bình luận sản phẩm
 * ------------------------------------------------------------------
 * Backed by Firestore (collection "comments"). Mỗi bình luận gắn với
 * một productId. Khách (chưa đăng nhập) chỉ được TẠO bình luận mới —
 * không thể sửa/xoá bình luận của người khác (hay của chính mình),
 * theo Security Rules. Chỉ admin đã đăng nhập mới ẩn/xoá được.
 *
 * Bình luận bị ẩn (hidden: true) chỉ admin nhìn thấy — Security Rules
 * lọc chúng khỏi kết quả đọc công khai ở tầng server, không phải chỉ
 * ẩn bằng giao diện.
 *
 * Chống spam cơ bản (phía trình duyệt, không cần Cloud Functions):
 *  - Honeypot: một ô ẩn mà người dùng thật không thấy/không điền —
 *    nếu có giá trị, coi là bot và huỷ gửi.
 *  - Giới hạn tần suất: mỗi trình duyệt chỉ gửi được 1 bình luận mỗi
 *    COMMENT_COOLDOWN_MS.
 *  - Firestore Rules kiểm tra độ dài tên/nội dung và đúng cấu trúc.
 * ------------------------------------------------------------------
 */

const COMMENTS_COLLECTION = "comments";
const COMMENT_COOLDOWN_MS = 20 * 1000; // 20 giây giữa 2 lần gửi / trình duyệt
const COMMENT_NAME_MAX = 60;
const COMMENT_MESSAGE_MAX = 500;

function commentSortByDateAsc(list) {
  // Oldest first, newest last — so a fresh comment appears at the
  // bottom of the thread instead of jumping to the top.
  return list.slice().sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
}

const CommentStore = {
  _cache: [],       // bình luận của sản phẩm đang xem (product.html)
  _unsub: null,
  _adminCache: [],  // tất cả bình luận gần đây, chỉ dùng ở admin.html
  _adminUnsub: null,

  getAll() {
    return this._cache;
  },

  getAllForAdmin() {
    return this._adminCache;
  },

  // Kiểm tra tần suất gửi phía trình duyệt — trả về số giây còn phải
  // chờ (0 nếu được phép gửi ngay).
  cooldownRemainingSec() {
    const last = Number(localStorage.getItem("sf_last_comment_ts") || 0);
    const remain = COMMENT_COOLDOWN_MS - (Date.now() - last);
    return remain > 0 ? Math.ceil(remain / 1000) : 0;
  },

  // productId: number, name/message: string, honeypot: string (phải rỗng)
  add({ productId, name, message, honeypot }) {
    if (honeypot) {
      return Promise.reject(new Error("spam-detected"));
    }
    const cleanName = String(name || "").trim().slice(0, COMMENT_NAME_MAX);
    const cleanMessage = String(message || "").trim().slice(0, COMMENT_MESSAGE_MAX);
    if (!cleanName || !cleanMessage) {
      return Promise.reject(new Error("empty-fields"));
    }
    if (this.cooldownRemainingSec() > 0) {
      return Promise.reject(new Error("cooldown"));
    }
    if (!window.db) {
      return Promise.reject(new Error("no-database"));
    }

    localStorage.setItem("sf_last_comment_ts", String(Date.now()));
    try { localStorage.setItem("sf_commenter_name", cleanName); } catch (e) {}

    return window.db.collection(COMMENTS_COLLECTION).add({
      productId: Number(productId),
      name: cleanName,
      message: cleanMessage,
      hidden: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  setHidden(id, hidden) {
    return window.db.collection(COMMENTS_COLLECTION).doc(id).update({ hidden: !!hidden });
  },

  remove(id) {
    return window.db.collection(COMMENTS_COLLECTION).doc(id).delete();
  },

  // Gọi khi khách mở trang chi tiết sản phẩm.
  subscribeToProduct(productId) {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    this._cache = [];
    if (!window.db) return;
    this._unsub = window.db.collection(COMMENTS_COLLECTION)
      .where("productId", "==", Number(productId))
      .onSnapshot(
        (snapshot) => {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          this._cache = commentSortByDateAsc(list);
          window.dispatchEvent(new CustomEvent("comments:changed"));
        },
        (err) => console.error("CommentStore: lỗi kết nối realtime tới Firestore", err)
      );
  },

  // Gọi một lần sau khi admin đăng nhập — danh sách bình luận mới nhất
  // trên toàn bộ cửa hàng (kể cả bình luận đã ẩn), để kiểm duyệt.
  subscribeAllForAdmin(limitCount = 300) {
    if (this._adminUnsub || !window.db) return;
    this._adminUnsub = window.db.collection(COMMENTS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .onSnapshot(
        (snapshot) => {
          this._adminCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          window.dispatchEvent(new CustomEvent("comments-admin:changed"));
        },
        (err) => console.error("CommentStore(admin): lỗi kết nối realtime tới Firestore", err)
      );
  }
};

window.CommentStore = CommentStore;
