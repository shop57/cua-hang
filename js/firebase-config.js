/**
 * FIREBASE CONFIG — ĐIỀN THÔNG TIN DỰ ÁN FIREBASE CỦA BẠN VÀO ĐÂY
 * ------------------------------------------------------------------
 * 1. Vào https://console.firebase.google.com → tạo một dự án mới
 *    (miễn phí).
 * 2. Trong dự án, vào "Project settings" (biểu tượng bánh răng) →
 *    cuộn xuống "Your apps" → bấm biểu tượng </> để tạo một Web App.
 * 3. Firebase sẽ đưa ra một đoạn cấu hình dạng:
 *      const firebaseConfig = { apiKey: "...", authDomain: "...", ... };
 *    Copy các giá trị đó vào đúng vị trí bên dưới.
 * 4. Xem file HUONG_DAN_FIREBASE.md ở thư mục gốc để biết đầy đủ các
 *    bước còn lại (bật Firestore, bật Đăng nhập, tạo tài khoản admin,
 *    dán Security Rules).
 * ------------------------------------------------------------------
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBoB2TW3BgZfngmVzjTvpTX8NY9jVSjaYM",
  authDomain: "shop-3e271.firebaseapp.com",
  projectId: "shop-3e271",
  storageBucket: "shop-3e271.firebasestorage.app",
  messagingSenderId: "136656133752",
  appId: "1:136656133752:web:54824f5dec3ec546d3d78d"
};

window.FIREBASE_CONFIG = FIREBASE_CONFIG;
