/**
 * ADMIN PANEL
 * ------------------------------------------------------------------
 * Local-only admin UI for managing the ProductStore catalog. No
 * backend, no login — this page is meant to be used by you, the
 * store owner, directly in the browser. Every action here updates
 * localStorage immediately and the homepage / product page reflect
 * it instantly (live, or on next load in another tab).
 * ------------------------------------------------------------------
 */

let editingId = null; // null = "Add" mode, otherwise the id being edited
let adminSearchQuery = "";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function parseLines(text) {
  return String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function readForm() {
  return {
    name: document.getElementById("fName").value,
    price: document.getElementById("fPrice").value,
    oldPrice: document.getElementById("fOldPrice").value,
    images: parseLines(document.getElementById("fImages").value),
    videos: parseLines(document.getElementById("fVideos").value),
    category: document.getElementById("fCategory").value,
    optionLabel: document.getElementById("fOptionLabel").value,
    optionValues: parseLines(document.getElementById("fOptionValues").value),
    rating: document.getElementById("fRating").value,
    reviews: document.getElementById("fReviews").value,
    description: document.getElementById("fDescription").value
  };
}

function fillForm(p) {
  document.getElementById("fName").value = p.name || "";
  document.getElementById("fPrice").value = p.price ?? "";
  document.getElementById("fOldPrice").value = p.oldPrice ?? "";
  // Older products only ever had a single `image` field — fall back to
  // that as the one gallery line if `images` was never saved.
  const images = p.images && p.images.length ? p.images : (p.image ? [p.image] : []);
  document.getElementById("fImages").value = images.join("\n");
  document.getElementById("fVideos").value = (p.videos || []).join("\n");
  document.getElementById("fCategory").value = p.category || "";
  document.getElementById("fOptionLabel").value = p.optionLabel || "";
  document.getElementById("fOptionValues").value = (p.optionValues || []).join("\n");
  document.getElementById("fRating").value = p.rating ?? "";
  document.getElementById("fReviews").value = p.reviews ?? "";
  document.getElementById("fDescription").value = p.description || "";
}

function clearForm() {
  document.getElementById("productForm").reset();
}

function enterEditMode(id) {
  const p = ProductStore.getById(id);
  if (!p) return;
  editingId = id;
  fillForm(p);
  document.getElementById("formTitle").textContent = `Sửa sản phẩm #${id}`;
  document.getElementById("formSubmitBtn").textContent = "Cập nhật sản phẩm";
  document.getElementById("formCancelBtn").style.display = "inline-flex";
  document.getElementById("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  editingId = null;
  clearForm();
  document.getElementById("formTitle").textContent = "Thêm sản phẩm";
  document.getElementById("formSubmitBtn").textContent = "Thêm sản phẩm";
  document.getElementById("formCancelBtn").style.display = "none";
}

function updateCategoryDatalist() {
  const list = document.getElementById("categoryOptions");
  if (!list) return;
  list.innerHTML = ProductStore.getCategories()
    .filter((c) => c !== "All")
    .map((c) => `<option value="${escapeHtml(c)}"></option>`)
    .join("");
}

function renderCategoryManager() {
  const wrap = document.getElementById("categoryManageList");
  if (!wrap) return;

  const counts = {};
  ProductStore.getAll().forEach((p) => {
    const c = (p.category || "").trim();
    if (c) counts[c] = (counts[c] || 0) + 1;
  });
  const extra = CategoryStore.getAll();
  const names = [...new Set([...Object.keys(counts), ...extra])].sort((a, b) => a.localeCompare(b));

  if (names.length === 0) {
    wrap.innerHTML = `<p class="hint" style="margin:0;">Chưa có danh mục nào — thêm danh mục đầu tiên ở trên.</p>`;
    return;
  }

  wrap.innerHTML = names
    .map((name) => {
      const count = counts[name] || 0;
      const removable = count === 0;
      return `
        <span class="category-manage-chip">
          ${escapeHtml(name)} <span class="count">${count}</span>
          <button type="button" data-remove-category="${escapeHtml(name)}" ${removable ? "" : "disabled"}
            aria-label="Xoá danh mục ${escapeHtml(name)}"
            title="${removable ? "Xoá danh mục" : "Không thể xoá — vẫn còn sản phẩm dùng danh mục này"}">✕</button>
        </span>`;
    })
    .join("");
}

function renderAdminList() {
  const wrap = document.getElementById("adminList");
  const countEl = document.getElementById("adminCount");
  const all = ProductStore.getAll();
  const q = adminSearchQuery.trim().toLowerCase();
  const filtered = q
    ? all.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q))
    : all;

  countEl.textContent = `${all.length} sản phẩm trong danh mục${q ? ` — hiện ${filtered.length}` : ""}`;

  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="empty-state">${all.length === 0 ? "Chưa có sản phẩm nào. Thêm ở trên, hoặc nhập từ file JSON." : "Không có sản phẩm nào phù hợp với tìm kiếm."}</div>`;
    return;
  }

  wrap.innerHTML = filtered
    .map((p) => {
      const discount = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : null;
      return `
      <div class="admin-row" data-row-id="${p.id}">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy"
             onerror="this.onerror=null;this.src='https://picsum.photos/seed/fallback${p.id}/200/200';">
        <div class="admin-row-info">
          <p class="admin-row-name">${escapeHtml(p.name)} <span class="admin-row-id">#${p.id}</span></p>
          <p class="admin-row-meta">
            ${escapeHtml(p.category || "—")} · ${formatVND(p.price)}
            ${p.oldPrice ? ` <span class="admin-row-old">${formatVND(p.oldPrice)}</span>` : ""}
            ${discount ? ` <span class="admin-row-discount">-${discount}%</span>` : ""}
            · ★ ${p.rating || 0} (${p.reviews || 0})
          </p>
        </div>
        <div class="admin-row-actions">
          <a href="product.html?id=${p.id}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Xem</a>
          <button type="button" class="btn btn-secondary btn-sm" data-edit="${p.id}">Sửa</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete="${p.id}">Xoá</button>
        </div>
      </div>`;
    })
    .join("");
}

function refreshAdmin() {
  updateCategoryDatalist();
  renderAdminList();
  renderCategoryManager();
}

function showToast(message) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}

// ---------------- Payment settings ----------------

function populateBankSelect() {
  const select = document.getElementById("fBank");
  if (!select) return;
  select.innerHTML = VN_BANKS.map((b) => `<option value="${b.bin}">${escapeHtml(b.name)}</option>`).join("");
}

function fillPaymentForm() {
  const cfg = PaymentConfig.get();
  document.getElementById("fBank").value = cfg.bankBin;
  document.getElementById("fAccountNumber").value = cfg.accountNumber || "";
  document.getElementById("fAccountName").value = cfg.accountName || "";
}

function initPaymentSettings() {
  populateBankSelect();
  fillPaymentForm();

  document.getElementById("paymentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const bin = document.getElementById("fBank").value;
    const bank = VN_BANKS.find((b) => b.bin === bin);
    const accountNumber = document.getElementById("fAccountNumber").value.trim();
    const accountName = document.getElementById("fAccountName").value.trim();

    if (!accountNumber || !accountName) {
      showToast("Vui lòng nhập số tài khoản và tên chủ tài khoản.");
      return;
    }

    PaymentConfig.save({
      bankBin: bin,
      bankName: bank ? bank.name : "",
      accountNumber,
      accountName: accountName.toUpperCase()
    });
    showToast("Đã lưu cài đặt thanh toán.");
  });
}

// ---------------- Orders ----------------

const ORDER_STATUS_LABEL = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  cancelled: "Đã huỷ"
};
const ORDER_STATUS_CLASS = {
  pending: "order-status-pending",
  paid: "order-status-paid",
  cancelled: "order-status-cancelled"
};

function renderOrdersList() {
  const wrap = document.getElementById("ordersList");
  const countEl = document.getElementById("ordersCount");
  const badge = document.getElementById("ordersPendingBadge");
  if (!wrap) return;

  const orders = OrderStore.getAll();
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  countEl.textContent = `${orders.length} đơn hàng${pendingCount ? ` — ${pendingCount} chờ thanh toán` : ""}`;
  if (badge) {
    badge.style.display = pendingCount ? "inline-flex" : "none";
    badge.textContent = pendingCount;
  }

  if (orders.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có đơn hàng nào. Đơn sẽ hiện ở đây ngay khi khách hàng đặt hàng.</div>`;
    return;
  }

  wrap.innerHTML = orders.map((o) => {
    const itemsSummary = o.items.map((i) => `${escapeHtml(i.name)}${i.option ? ` (${escapeHtml(i.option)})` : ""} ×${i.qty}`).join(", ");
    const date = new Date(o.createdAt).toLocaleString();
    return `
      <div class="order-row" data-order-code="${o.code}">
        <div class="order-row-top">
          <span class="order-row-code">${o.code}</span>
          <span class="order-status-pill ${ORDER_STATUS_CLASS[o.status] || ""}">${ORDER_STATUS_LABEL[o.status] || o.status}</span>
        </div>
        <p class="order-row-customer"><strong>${escapeHtml(o.customer.name)}</strong> · ${escapeHtml(o.customer.phone)}</p>
        <p class="order-row-address">${escapeHtml(o.customer.address)}${o.customer.note ? ` — ${escapeHtml(o.customer.note)}` : ""}</p>
        <p class="order-row-items">${itemsSummary}</p>
        <p class="order-row-meta">${formatVND(o.totalVND)} · ${date}</p>
        <div class="admin-row-actions" style="margin-top:8px;">
          ${o.status !== "paid" ? `<button type="button" class="btn btn-primary btn-sm" data-order-paid="${o.code}">Đánh dấu đã thanh toán</button>` : ""}
          ${o.status !== "cancelled" ? `<button type="button" class="btn btn-secondary btn-sm" data-order-cancel="${o.code}">Huỷ đơn</button>` : ""}
          <button type="button" class="btn btn-danger btn-sm" data-order-delete="${o.code}">Xoá</button>
        </div>
      </div>`;
  }).join("");
}

function initOrders() {
  renderOrdersList();

  document.getElementById("ordersList").addEventListener("click", (e) => {
    const paidCode = e.target.getAttribute?.("data-order-paid");
    const cancelCode = e.target.getAttribute?.("data-order-cancel");
    const delCode = e.target.getAttribute?.("data-order-delete");
    if (paidCode) {
      OrderStore.updateStatus(paidCode, "paid");
      showToast(`Đơn hàng ${paidCode} đã được đánh dấu là đã thanh toán.`);
    } else if (cancelCode) {
      OrderStore.updateStatus(cancelCode, "cancelled");
      showToast(`Đơn hàng ${cancelCode} đã bị huỷ.`);
    } else if (delCode) {
      if (confirm(`Xoá đơn hàng ${delCode}? Không thể hoàn tác.`)) {
        OrderStore.remove(delCode);
        showToast("Đã xoá đơn hàng.");
      }
    }
  });

  window.addEventListener("orders:changed", renderOrdersList);
}

// ---------------- Community: comments & reviews moderation ----------------

function formatAdminDate(ts) {
  if (!ts || typeof ts.toDate !== "function") return "Vừa xong";
  return ts.toDate().toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function productNameById(id) {
  const p = ProductStore.getById(id);
  return p ? p.name : `#${id}`;
}

function renderReviewsAdminList() {
  const wrap = document.getElementById("reviewsAdminList");
  const countEl = document.getElementById("reviewsAdminCount");
  if (!wrap) return;
  const reviews = ReviewStore.getAllForAdmin();
  const hiddenCount = reviews.filter((r) => r.hidden).length;
  countEl.textContent = `${reviews.length} đánh giá${hiddenCount ? ` — ${hiddenCount} đã ẩn` : ""}`;

  if (reviews.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có đánh giá nào.</div>`;
    return;
  }

  wrap.innerHTML = reviews.map((r) => `
    <div class="order-row mod-row ${r.hidden ? "mod-hidden" : ""}" data-review-id="${r.id}">
      <div class="order-row-top">
        <span class="order-row-code">${escapeHtml(r.name)} · ${"★".repeat(r.rating || 0)}${"☆".repeat(Math.max(0, 5 - (r.rating || 0)))}</span>
        ${r.hidden ? `<span class="mod-badge-hidden">Đã ẩn</span>` : ""}
      </div>
      <p class="mod-row-meta">${escapeHtml(productNameById(r.productId))} · ${formatAdminDate(r.createdAt)}</p>
      ${r.message ? `<p class="mod-row-msg">${escapeHtml(r.message)}</p>` : ""}
      <div class="admin-row-actions" style="margin-top:8px;">
        ${r.hidden
          ? `<button type="button" class="btn btn-secondary btn-sm" data-review-show="${r.id}">Hiện lại</button>`
          : `<button type="button" class="btn btn-secondary btn-sm" data-review-hide="${r.id}">Ẩn</button>`}
        <button type="button" class="btn btn-danger btn-sm" data-review-delete="${r.id}">Xoá</button>
      </div>
    </div>`).join("");
}

function renderCommentsAdminList() {
  const wrap = document.getElementById("commentsAdminList");
  const countEl = document.getElementById("commentsAdminCount");
  if (!wrap) return;
  const comments = CommentStore.getAllForAdmin();
  const hiddenCount = comments.filter((c) => c.hidden).length;
  countEl.textContent = `${comments.length} bình luận${hiddenCount ? ` — ${hiddenCount} đã ẩn` : ""}`;

  if (comments.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có bình luận nào.</div>`;
    return;
  }

  wrap.innerHTML = comments.map((c) => `
    <div class="order-row mod-row ${c.hidden ? "mod-hidden" : ""}" data-comment-id="${c.id}">
      <div class="order-row-top">
        <span class="order-row-code">${escapeHtml(c.name)}</span>
        ${c.hidden ? `<span class="mod-badge-hidden">Đã ẩn</span>` : ""}
      </div>
      <p class="mod-row-meta">${escapeHtml(productNameById(c.productId))} · ${formatAdminDate(c.createdAt)}</p>
      <p class="mod-row-msg">${escapeHtml(c.message)}</p>
      <div class="admin-row-actions" style="margin-top:8px;">
        ${c.hidden
          ? `<button type="button" class="btn btn-secondary btn-sm" data-comment-show="${c.id}">Hiện lại</button>`
          : `<button type="button" class="btn btn-secondary btn-sm" data-comment-hide="${c.id}">Ẩn</button>`}
        <button type="button" class="btn btn-danger btn-sm" data-comment-delete="${c.id}">Xoá</button>
      </div>
    </div>`).join("");
}

function initCommunityModeration() {
  ReviewStore.subscribeAllForAdmin();
  CommentStore.subscribeAllForAdmin();

  renderReviewsAdminList();
  renderCommentsAdminList();

  document.getElementById("reviewsAdminList").addEventListener("click", (e) => {
    const hideId = e.target.getAttribute?.("data-review-hide");
    const showId = e.target.getAttribute?.("data-review-show");
    const delId = e.target.getAttribute?.("data-review-delete");
    if (hideId) {
      ReviewStore.setHidden(hideId, true).then(() => showToast("Đã ẩn đánh giá."));
    } else if (showId) {
      ReviewStore.setHidden(showId, false).then(() => showToast("Đã hiện lại đánh giá."));
    } else if (delId) {
      if (confirm("Xoá đánh giá này? Không thể hoàn tác.")) {
        ReviewStore.remove(delId).then(() => showToast("Đã xoá đánh giá."));
      }
    }
  });

  document.getElementById("commentsAdminList").addEventListener("click", (e) => {
    const hideId = e.target.getAttribute?.("data-comment-hide");
    const showId = e.target.getAttribute?.("data-comment-show");
    const delId = e.target.getAttribute?.("data-comment-delete");
    if (hideId) {
      CommentStore.setHidden(hideId, true).then(() => showToast("Đã ẩn bình luận."));
    } else if (showId) {
      CommentStore.setHidden(showId, false).then(() => showToast("Đã hiện lại bình luận."));
    } else if (delId) {
      if (confirm("Xoá bình luận này? Không thể hoàn tác.")) {
        CommentStore.remove(delId).then(() => showToast("Đã xoá bình luận."));
      }
    }
  });

  window.addEventListener("reviews-admin:changed", renderReviewsAdminList);
  window.addEventListener("comments-admin:changed", renderCommentsAdminList);
  // Product names in the moderation rows depend on the catalog too.
  window.addEventListener("products:changed", () => {
    renderReviewsAdminList();
    renderCommentsAdminList();
  });
}

// ---------------- Product view stats ----------------

function renderViewsStats() {
  const wrap = document.getElementById("viewsStatsList");
  const totalEl = document.getElementById("viewsStatsTotal");
  if (!wrap) return;

  const ranked = ProductStore.getAll()
    .map((p) => ({ ...p, views: window.ViewStore ? window.ViewStore.getCount(p.id) : 0 }))
    .sort((a, b) => b.views - a.views);

  const totalViews = ranked.reduce((sum, p) => sum + p.views, 0);
  totalEl.textContent = ranked.length ? `${totalViews.toLocaleString("vi-VN")} lượt xem trên ${ranked.length} sản phẩm` : "";

  if (ranked.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có sản phẩm nào trong danh mục.</div>`;
    return;
  }

  const maxViews = ranked[0].views || 0;

  wrap.innerHTML = ranked.map((p, i) => `
    <div class="admin-row" data-row-id="${p.id}">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy"
           onerror="this.onerror=null;this.src='https://picsum.photos/seed/fallback${p.id}/200/200';">
      <div class="admin-row-info">
        <p class="admin-row-name">#${i + 1} · ${escapeHtml(p.name)} <span class="admin-row-id">${escapeHtml(p.category || "—")}</span></p>
        <div class="view-bar-track"><div class="view-bar-fill" style="width:${maxViews ? Math.max(3, (p.views / maxViews) * 100) : 0}%"></div></div>
      </div>
      <div class="admin-row-actions">
        <span class="view-count-badge">${p.views.toLocaleString("vi-VN")} lượt xem</span>
        <a href="product.html?id=${p.id}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Xem</a>
      </div>
    </div>`).join("");
}

function initViewsStats() {
  renderViewsStats();
  window.addEventListener("views:changed", renderViewsStats);
  window.addEventListener("products:changed", renderViewsStats);
}

function initAdminTabs() {
  const tabs = {
    catalog: { btn: document.getElementById("tabCatalogBtn"), panel: document.getElementById("panelCatalog") },
    orders: { btn: document.getElementById("tabOrdersBtn"), panel: document.getElementById("panelOrders") },
    community: { btn: document.getElementById("tabCommunityBtn"), panel: document.getElementById("panelCommunity") },
    stats: { btn: document.getElementById("tabStatsBtn"), panel: document.getElementById("panelStats") }
  };
  if (!tabs.catalog.btn) return;

  const activate = (tab) => {
    Object.keys(tabs).forEach((key) => {
      tabs[key].btn.classList.toggle("active", key === tab);
      tabs[key].panel.style.display = key === tab ? "block" : "none";
    });
  };

  Object.keys(tabs).forEach((key) => tabs[key].btn.addEventListener("click", () => activate(key)));
}

function initAdmin() {
  refreshAdmin();
  initPaymentSettings();
  initOrders();
  initCommunityModeration();
  initViewsStats();
  initAdminTabs();

  // Add / update category
  document.getElementById("categoryForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("fNewCategory");
    const name = input.value.trim();
    if (!name) return;
    CategoryStore.add(name);
    input.value = "";
    showToast(`Đã thêm danh mục "${name}".`);
    refreshAdmin();
  });

  document.getElementById("categoryManageList").addEventListener("click", (e) => {
    const name = e.target.getAttribute?.("data-remove-category");
    if (!name || e.target.disabled) return;
    CategoryStore.remove(name);
    showToast(`Đã xoá danh mục "${name}".`);
    refreshAdmin();
  });

  // Add / Update
  document.getElementById("productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = readForm();
    if (!data.name.trim()) {
      showToast("Vui lòng nhập tên sản phẩm.");
      return;
    }
    if (editingId) {
      ProductStore.update(editingId, data);
      showToast("Đã cập nhật sản phẩm.");
    } else {
      ProductStore.add(data);
      showToast("Đã thêm sản phẩm.");
    }
    exitEditMode();
    refreshAdmin();
  });

  document.getElementById("formCancelBtn").addEventListener("click", () => {
    exitEditMode();
  });

  // Edit / Delete (delegated)
  document.getElementById("adminList").addEventListener("click", (e) => {
    const editId = e.target.getAttribute?.("data-edit");
    const delId = e.target.getAttribute?.("data-delete");
    if (editId) {
      enterEditMode(Number(editId));
    } else if (delId) {
      const p = ProductStore.getById(Number(delId));
      if (p && confirm(`Xoá "${p.name}"? Không thể hoàn tác.`)) {
        ProductStore.remove(Number(delId));
        if (editingId === Number(delId)) exitEditMode();
        showToast("Đã xoá sản phẩm.");
        refreshAdmin();
      }
    }
  });

  // Admin list search
  document.getElementById("adminSearch").addEventListener("input", (e) => {
    adminSearchQuery = e.target.value;
    renderAdminList();
  });

  // Reset demo data
  document.getElementById("resetDemoBtn").addEventListener("click", () => {
    if (confirm("Đặt lại danh mục về 2 sản phẩm demo? Thao tác này sẽ xoá mọi sản phẩm bạn đã thêm.")) {
      ProductStore.reset();
      exitEditMode();
      showToast("Đã đặt lại danh mục về dữ liệu demo.");
      refreshAdmin();
    }
  });

  // Export
  document.getElementById("exportBtn").addEventListener("click", () => {
    const json = ProductStore.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Đã xuất sản phẩm.");
  });

  // Import
  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = ProductStore.importJSON(reader.result);
        showToast(`Đã nhập ${result.added} sản phẩm${result.skipped ? `, bỏ qua ${result.skipped}` : ""}.`);
        refreshAdmin();
      } catch (err) {
        showToast(err.message || "Nhập thất bại.");
      }
      e.target.value = ""; // allow re-selecting the same file later
    };
    reader.onerror = () => showToast("Không thể đọc file này.");
    reader.readAsText(file);
  });

  // Stay in sync if another tab changes the catalog
  window.addEventListener("products:changed", refreshAdmin);
  window.addEventListener("categories:changed", refreshAdmin);
}

// initAdmin() is no longer auto-run on DOMContentLoaded — js/admin-auth.js
// calls it manually, only after Firebase confirms the visitor is signed in.
window.initAdmin = initAdmin;
