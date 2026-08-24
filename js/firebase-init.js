/**
 * FIREBASE INIT
 * ------------------------------------------------------------------
 * Khởi tạo Firebase App, Firestore (dữ liệu dùng chung cho mọi
 * khách truy cập) và Auth (đăng nhập cho riêng bạn ở trang admin).
 * Mọi file khác (store.js, categories.js, payment-config.js,
 * orders.js, admin-auth.js) dùng chung window.db và window.auth
 * được tạo ở đây.
 * ------------------------------------------------------------------
 */

(function () {
  if (!window.firebase) {
    console.error("Firebase SDK chưa được tải — kiểm tra lại các thẻ <script> firebase-*-compat.js trong file HTML.");
    return;
  }
  if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === "DÁN_API_KEY_VÀO_ĐÂY") {
    console.warn(
      "⚠️ Bạn chưa điền cấu hình Firebase trong js/firebase-config.js — " +
      "sản phẩm/đơn hàng sẽ KHÔNG được lưu dùng chung cho tới khi bạn điền đầy đủ. " +
      "Xem HUONG_DAN_FIREBASE.md để biết cách lấy cấu hình."
    );
  }

  firebase.initializeApp(window.FIREBASE_CONFIG);
  window.db = firebase.firestore();
  window.auth = firebase.auth();
  window.storage = firebase.storage();
})();
