/**
 * ORDER STORE
 * ------------------------------------------------------------------
 * Orders placed at checkout.html — customer info, item snapshot, and
 * the bank-transfer amount/content, saved to Firestore (collection
 * "orders") so YOU (the admin) can see every order from any device,
 * not just the browser the customer used.
 *
 * Every order starts as "pending" (chờ xác nhận thanh toán). The
 * store owner manually flips it to "paid" or "cancelled" in Admin —
 * there is no payment gateway wired up to auto-confirm it.
 *
 * Customers (not logged in) can only CREATE orders — Firestore
 * Security Rules block them from reading, listing, updating, or
 * deleting the orders collection. Only the signed-in admin can list
 * orders, which is why subscribe() below is called explicitly by
 * admin.js after a successful login, not automatically on every page.
 * ------------------------------------------------------------------
 */

const ORDERS_COLLECTION = "orders";

const OrderStore = {
  _cache: [],

  getAll() {
    return this._cache;
  },

  getByCode(code) {
    return this._cache.find((o) => o.code === code) || null;
  },

  _emit() {
    window.dispatchEvent(new CustomEvent("orders:changed"));
  },

  _genCode() {
    const rand = Math.floor(100 + Math.random() * 900); // 3 digits
    return `DH${Date.now().toString().slice(-7)}${rand}`;
  },

  /**
   * data: { customer: {name, phone, address, note}, items: [{id,name,price,qty}],
   *         totalVND, bank: {bankName, bankBin, accountNumber, accountName} }
   */
  add(data) {
    const order = {
      code: data.code || this._genCode(),
      createdAt: new Date().toISOString(),
      status: "pending", // pending -> paid | cancelled
      customer: {
        name: (data.customer?.name || "").trim(),
        phone: (data.customer?.phone || "").trim(),
        address: (data.customer?.address || "").trim(),
        note: (data.customer?.note || "").trim()
      },
      items: (data.items || []).map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, option: i.option || "" })),
      totalVND: Number(data.totalVND) || 0,
      bank: { ...data.bank }
    };
    this._cache.unshift(order);
    this._emit();
    window.db.collection(ORDERS_COLLECTION).doc(order.code).set(order)
      .catch((e) => console.error("OrderStore.add: lỗi lưu Firestore", e));
    return order;
  },

  updateStatus(code, status) {
    const order = this.getByCode(code);
    if (!order) return null;
    order.status = status;
    this._emit();
    window.db.collection(ORDERS_COLLECTION).doc(code).update({ status })
      .catch((e) => console.error("OrderStore.updateStatus: lỗi lưu Firestore", e));
    return order;
  },

  remove(code) {
    this._cache = this._cache.filter((o) => o.code !== code);
    this._emit();
    window.db.collection(ORDERS_COLLECTION).doc(code).delete()
      .catch((e) => console.error("OrderStore.remove: lỗi xoá Firestore", e));
  },

  // Called by admin.js once the admin is signed in — starts the
  // realtime listener that keeps _cache full of every order.
  subscribe() {
    if (!window.db || this._subscribed) return;
    this._subscribed = true;
    window.db.collection(ORDERS_COLLECTION).orderBy("createdAt", "desc").onSnapshot(
      (snapshot) => {
        this._cache = snapshot.docs.map((d) => d.data());
        this._emit();
      },
      (err) => console.error("OrderStore: lỗi kết nối realtime tới Firestore", err)
    );
  }
};

window.OrderStore = OrderStore;
