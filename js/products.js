/**
 * DEFAULT / DEMO PRODUCTS
 * ------------------------------------------------------------------
 * This is NOT the live catalog. It's just the starting seed data —
 * two sample products so the storefront isn't empty on first load,
 * and the source that "Reset Demo Products" (in admin.html) restores.
 *
 * The live, editable catalog lives in Firestore and is managed
 * entirely through js/store.js (ProductStore) — add, edit, delete,
 * import and export all happen there, never by hand-editing this file.
 *
 * Product schema:
 * {
 *   id: 1,                      // number, unique (auto-assigned by the admin panel)
 *   name: "Product name",
 *   price: 499000,             // number, VND (₫), no decimals
 *   oldPrice: 699000,           // number or null — omit/null if not on sale
 *   image: "https://...",       // cover image URL — kept in sync with images[0]
 *   images: ["https://...", "https://..."],  // gallery — one URL per line in Admin
 *   videos: ["https://..."],    // optional — YouTube/Vimeo links or direct .mp4 URLs
 *   category: "Fitness",        // free text — categories are derived from whatever you use
 *   sizes: ["S", "M", "L"],      // optional — free text list, comma-separated in Admin
 *   variants: ["Màu đen", "Màu trắng"], // optional — free text list, for products with multiple styles/colors
 *   rating: 4.8,                // 0–5
 *   reviews: 120,                // number of reviews
 *   description: "..."
 * }
 * ------------------------------------------------------------------
 */

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Sản phẩm mẫu Một",
    price: 499000,
    oldPrice: 699000,
    image: "https://picsum.photos/seed/storefront-demo-1/800/800",
    images: [
      "https://picsum.photos/seed/storefront-demo-1/800/800",
      "https://picsum.photos/seed/storefront-demo-1b/800/800",
      "https://picsum.photos/seed/storefront-demo-1c/800/800"
    ],
    videos: [],
    category: "Chung",
    rating: 4.8,
    reviews: 120,
    description:
      "Đây là sản phẩm demo để bạn xem giao diện thẻ sản phẩm và trang chi tiết trông như thế nào — bao gồm cả thư viện nhiều ảnh. Sửa hoặc xoá từ trang Quản trị, hoặc dùng làm điểm khởi đầu cho sản phẩm thật của bạn."
  },
  {
    id: 2,
    name: "Sản phẩm mẫu Hai",
    price: 850000,
    oldPrice: null,
    image: "https://picsum.photos/seed/storefront-demo-2/800/800",
    images: ["https://picsum.photos/seed/storefront-demo-2/800/800"],
    videos: [],
    category: "Chung",
    rating: 4.3,
    reviews: 45,
    description:
      "Sản phẩm demo thứ hai không giảm giá, để bạn so sánh cách hiển thị giá khi có và không có giá cũ. Thay thế bằng danh mục thật của bạn từ trang Quản trị."
  }
];

window.DEFAULT_PRODUCTS = DEFAULT_PRODUCTS;
