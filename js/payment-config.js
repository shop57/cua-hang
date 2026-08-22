/**
 * PAYMENT CONFIG (Vietnam bank transfer)
 * ------------------------------------------------------------------
 * Store-wide bank transfer settings used at checkout to generate the
 * VietQR code and show the account details. Backed by Firestore
 * (document "settings/payment") so every customer sees the same bank
 * details you set in Admin — not just your own browser. Editable
 * from the "Cài đặt thanh toán" card on admin.html. No login, no
 * payment gateway, no PayPal — the customer transfers manually and
 * the store owner confirms the order once the money arrives.
 *
 * QR codes are generated client-side via the free VietQR.io image
 * API (https://img.vietqr.io) using the bank's NAPAS BIN code — no
 * API key required.
 * ------------------------------------------------------------------
 */

const PAYMENT_SETTINGS_DOC = "payment";

// Common Vietnamese banks and their NAPAS BIN codes (used by VietQR).
// Store owner picks one from this list in Admin; double-check the BIN
// against https://vietqr.io/danh-sach-ngan-hang before going live.
const VN_BANKS = [
  { bin: "970436", code: "VCB", name: "Vietcombank" },
  { bin: "970415", code: "ICB", name: "VietinBank" },
  { bin: "970418", code: "BIDV", name: "BIDV" },
  { bin: "970405", code: "AGR", name: "Agribank" },
  { bin: "970407", code: "TCB", name: "Techcombank" },
  { bin: "970422", code: "MB", name: "MB Bank" },
  { bin: "970416", code: "ACB", name: "ACB" },
  { bin: "970432", code: "VPB", name: "VPBank" },
  { bin: "970403", code: "STB", name: "Sacombank" },
  { bin: "970423", code: "TPB", name: "TPBank" },
  { bin: "970437", code: "HDB", name: "HDBank" },
  { bin: "970441", code: "VIB", name: "VIB" },
  { bin: "970443", code: "SHB", name: "SHB" },
  { bin: "970448", code: "OCB", name: "OCB" },
  { bin: "970426", code: "MSB", name: "MSB" },
  { bin: "970440", code: "SEAB", name: "SeABank" },
  { bin: "970431", code: "EIB", name: "Eximbank" },
  { bin: "970449", code: "LPB", name: "LPBank" },
  { bin: "970428", code: "NAB", name: "Nam A Bank" },
  { bin: "970425", code: "ABB", name: "ABBank" }
];

const DEFAULT_PAYMENT_CONFIG = {
  bankBin: "970436",
  bankName: "Vietcombank",
  accountNumber: "0123456789",
  accountName: "CUA HANG DEMO"
};

const PaymentConfig = {
  _cache: { ...DEFAULT_PAYMENT_CONFIG },

  get() {
    return this._cache;
  },

  save(patch) {
    this._cache = { ...this._cache, ...patch };
    window.dispatchEvent(new CustomEvent("payment-config:changed"));
    window.db.collection("settings").doc(PAYMENT_SETTINGS_DOC).set(this._cache, { merge: true })
      .catch((e) => console.error("PaymentConfig.save: lỗi lưu Firestore", e));
    return this._cache;
  },

  bankLabel() {
    const cfg = this.get();
    const known = VN_BANKS.find((b) => b.bin === cfg.bankBin);
    return known ? known.name : cfg.bankName;
  },

  // Converts to a rounded VND amount (nearest 1,000₫, the smallest
  // unit Vietnamese bank transfers commonly use). Kept for callers
  // that pass a raw computed total straight to the QR/amount fields.
  toVND(amount) {
    return Math.round(Number(amount || 0) / 1000) * 1000;
  },

  formatVND(amount) {
    return window.formatVND ? window.formatVND(amount) : Number(amount || 0).toLocaleString("vi-VN") + " ₫";
  },

  // Builds a VietQR.io image URL for a given amount + transfer content.
  qrImageUrl(amount, addInfo) {
    const cfg = this.get();
    const bin = encodeURIComponent(cfg.bankBin);
    const acc = encodeURIComponent(cfg.accountNumber);
    const name = encodeURIComponent(cfg.accountName);
    const info = encodeURIComponent(addInfo || "");
    return `https://img.vietqr.io/image/${bin}-${acc}-compact2.png?amount=${Math.round(amount)}&addInfo=${info}&accountName=${name}`;
  }
};

window.PaymentConfig = PaymentConfig;
window.VN_BANKS = VN_BANKS;

if (window.db) {
  window.db.collection("settings").doc(PAYMENT_SETTINGS_DOC).onSnapshot(
    (doc) => {
      PaymentConfig._cache = doc.exists ? { ...DEFAULT_PAYMENT_CONFIG, ...doc.data() } : { ...DEFAULT_PAYMENT_CONFIG };
      window.dispatchEvent(new CustomEvent("payment-config:changed"));
    },
    (err) => console.error("PaymentConfig: lỗi kết nối realtime tới Firestore", err)
  );
}
