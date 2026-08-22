/**
 * VIEW STORE — lượt xem sản phẩm
 * ------------------------------------------------------------------
 * Mỗi sản phẩm có một bộ đếm lượt xem riêng, lưu trong collection
 * Firestore "productViews" (tách khỏi "products" để không cần mở
 * quyền ghi công khai lên toàn bộ dữ liệu sản phẩm — khách chỉ được
 * phép TĂNG bộ đếm đúng 1 đơn vị mỗi lần, theo Security Rules, không
 * thể sửa hay đặt lại về một giá trị tuỳ ý).
 *
 * Chống tăng ảo khi refresh liên tục: mỗi trình duyệt chỉ được tính
 * 1 lượt xem cho cùng một sản phẩm trong mỗi khoảng VIEW_THROTTLE_MS
 * (ghi dấu bằng localStorage). Đây là biện pháp cơ bản phía trình
 * duyệt — không chống được người cố tình xoá localStorage, nhưng đủ
 * để số liệu không bị tăng vô nghĩa khi khách vô tình bấm F5 nhiều lần.
 * ------------------------------------------------------------------
 */

const VIEWS_COLLECTION = "productViews";
const VIEW_THROTTLE_MS = 30 * 60 * 1000; // 30 phút / sản phẩm / trình duyệt

const ViewStore = {
  _cache: {}, // { [productId]: count }

  getCount(id) {
    return this._cache[String(id)] || 0;
  },

  // Ghi nhận một lượt xem cho sản phẩm `id`, có chống spam refresh.
  recordView(id) {
    const key = String(id);
    const throttleKey = `sf_viewed_${key}`;
    const last = Number(localStorage.getItem(throttleKey) || 0);
    const now = Date.now();
    if (now - last < VIEW_THROTTLE_MS) return; // vừa xem gần đây rồi, bỏ qua
    localStorage.setItem(throttleKey, String(now));

    // Cập nhật cache ngay để giao diện phản hồi tức thì...
    this._cache[key] = (this._cache[key] || 0) + 1;
    window.dispatchEvent(new CustomEvent("views:changed"));

    // ...rồi ghi lên Firestore ở nền. set+merge với increment() sẽ tự
    // tạo document nếu chưa có (count bắt đầu từ 1).
    if (!window.db) return;
    window.db.collection(VIEWS_COLLECTION).doc(key)
      .set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true })
      .catch((e) => console.error("ViewStore.recordView: lỗi Firestore", e));
  }
};

window.ViewStore = ViewStore;

if (window.db) {
  window.db.collection(VIEWS_COLLECTION).onSnapshot(
    (snapshot) => {
      const map = {};
      snapshot.forEach((doc) => { map[doc.id] = doc.data().count || 0; });
      ViewStore._cache = map;
      window.dispatchEvent(new CustomEvent("views:changed"));
    },
    (err) => console.error("ViewStore: lỗi kết nối realtime tới Firestore", err)
  );
}
