/**
 * PRODUCT DETAIL PAGE
 * ------------------------------------------------------------------
 * Reads ?id= from the URL and pulls that product straight from
 * ProductStore — the same live catalog the homepage and admin panel
 * use. If the product was deleted or the id is invalid, shows a
 * friendly "not found" state instead of crashing.
 * ------------------------------------------------------------------
 */

let currentProduct = null;
let currentQty = 1;

function discountPct(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
function renderStars(rating) {
  const full = Math.round(rating || 0);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatCommentDate(ts) {
  // Firestore serverTimestamp() resolves a moment after the write — until
  // then the local echo has createdAt = null; show a friendly fallback.
  if (!ts || typeof ts.toDate !== "function") return "Vừa xong";
  return ts.toDate().toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Fades review/comment cards (or any `.reveal` section) in as they scroll
// into view. Re-usable: call again after each re-render since the list
// gets fresh DOM nodes each time.
function observeReveal(root, selector) {
  const items = root.querySelectorAll(selector);
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((el) => el.classList.add("reveal-visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
  items.forEach((el) => io.observe(el));
}

function initScrollReveal() {
  observeReveal(document, ".community-section.reveal");
}

function getProductIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

// ---------------- Gallery (multiple images) + videos ----------------

let currentGalleryImages = [];

function setMainImage(url, productId) {
  const img = document.getElementById("galleryMainImg");
  img.src = url;
  img.onerror = function () {
    this.onerror = null;
    this.src = `https://picsum.photos/seed/fallback${productId}/700/700`;
  };
}

function renderGallery(p) {
  // Older products only ever had a single `image` — fall back to that
  // as a one-image gallery so they still render fine.
  const images = p.images && p.images.length ? p.images : (p.image ? [p.image] : []);
  currentGalleryImages = images;
  document.getElementById("galleryMainImg").alt = p.name;
  setMainImage(images[0] || `https://picsum.photos/seed/fallback${p.id}/700/700`, p.id);

  const thumbsWrap = document.getElementById("galleryThumbs");
  if (images.length <= 1) {
    thumbsWrap.innerHTML = "";
    thumbsWrap.style.display = "none";
    return;
  }
  thumbsWrap.style.display = "flex";
  thumbsWrap.innerHTML = images
    .map(
      (url, i) => `
    <button type="button" class="gallery-thumb${i === 0 ? " active" : ""}" data-thumb-index="${i}" aria-label="Ảnh ${i + 1}">
      <img src="${url}" alt="" loading="lazy">
    </button>`
    )
    .join("");

  thumbsWrap.querySelectorAll("[data-thumb-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.thumbIndex);
      setMainImage(currentGalleryImages[idx], p.id);
      thumbsWrap.querySelectorAll(".gallery-thumb").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// Recognizes YouTube/Vimeo links and returns an embeddable URL, or null
// if `url` doesn't match either (treated as a direct video file instead).
function getYouTubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
  } catch (e) {}
  return null;
}
function getVimeoEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch (e) {}
  return null;
}
function renderVideoItem(url) {
  const yt = getYouTubeEmbedUrl(url);
  if (yt) {
    return `<div class="pd-video-item"><iframe src="${yt}" title="Video sản phẩm" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  const vm = getVimeoEmbedUrl(url);
  if (vm) {
    return `<div class="pd-video-item"><iframe src="${vm}" title="Video sản phẩm" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  // Not a recognized YouTube/Vimeo link — treat as a direct video file URL.
  return `<div class="pd-video-item"><video src="${escapeHtml(url)}" controls preload="metadata"></video></div>`;
}
function renderVideos(p) {
  const wrap = document.getElementById("pdVideos");
  const list = document.getElementById("pdVideoList");
  const videos = p.videos || [];
  if (videos.length === 0) {
    wrap.hidden = true;
    list.innerHTML = "";
    return;
  }
  wrap.hidden = false;
  list.innerHTML = videos.map(renderVideoItem).join("");
}

function renderProduct(p) {
  document.title = `${p.name} — Daily Mart`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && p.description) metaDesc.setAttribute("content", p.description.slice(0, 155));
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", `${p.name} — Daily Mart`);
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.setAttribute("content", p.image);

  document.getElementById("breadcrumbName").textContent = p.name;
  renderGallery(p);
  renderVideos(p);

  document.getElementById("pdCategory").textContent = p.category || "";
  document.getElementById("pdTitle").textContent = p.name;
  document.getElementById("pdStars").textContent = renderStars(p.rating);
  document.getElementById("pdRatingText").textContent = `${p.rating || 0} (${p.reviews || 0} đánh giá)`;
  document.getElementById("pdPriceCurrent").textContent = formatVND(p.price);

  const oldPriceEl = document.getElementById("pdPriceOld");
  const discountEl = document.getElementById("pdDiscountBadge");
  const discount = discountPct(p.price, p.oldPrice);
  if (p.oldPrice && discount) {
    oldPriceEl.textContent = formatVND(p.oldPrice);
    oldPriceEl.style.display = "inline";
    discountEl.textContent = `-${discount}%`;
    discountEl.style.display = "inline-block";
  } else {
    oldPriceEl.style.display = "none";
    discountEl.style.display = "none";
  }

  const descEl = document.getElementById("pdDescription");
  descEl.textContent = p.description || "";
  descEl.style.display = p.description ? "block" : "none";

  renderOptions(p);

  currentQty = 1;
  document.getElementById("qtyValue").textContent = currentQty;
}

// ---------------- Product options (size/color/etc, admin-defined label) ----------------

let selectedOption = null;

function renderOptions(p) {
  const wrap = document.getElementById("pdOptions");
  const labelEl = document.getElementById("pdOptionsLabel");
  const listEl = document.getElementById("pdOptionsList");
  const values = Array.isArray(p.optionValues) ? p.optionValues : [];

  selectedOption = null;

  if (!values.length) {
    wrap.hidden = true;
    listEl.innerHTML = "";
    return;
  }

  wrap.hidden = false;
  labelEl.textContent = p.optionLabel && p.optionLabel.trim() ? p.optionLabel.trim() : "Phân loại";

  listEl.innerHTML = values
    .map(
      (v, i) =>
        `<button type="button" class="pd-option-btn" data-option-index="${i}">${escapeHtml(v)}</button>`
    )
    .join("");

  listEl.querySelectorAll(".pd-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      listEl.querySelectorAll(".pd-option-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedOption = values[Number(btn.dataset.optionIndex)];
    });
  });
}


function renderViews() {
  if (!currentProduct) return;
  const el = document.getElementById("pdViews");
  if (!el) return;
  const count = window.ViewStore ? window.ViewStore.getCount(currentProduct.id) : 0;
  el.textContent = `· ${count.toLocaleString("vi-VN")} lượt xem`;
}

function renderReviewSummary() {
  const agg = window.ReviewStore ? window.ReviewStore.getAggregate() : { avg: 0, count: 0 };
  document.getElementById("reviewAvgScore").textContent = agg.count ? agg.avg.toFixed(1) : "0.0";
  document.getElementById("reviewAvgStars").textContent = renderStars(agg.avg);
  document.getElementById("reviewCountText").textContent = agg.count
    ? `${agg.count} đánh giá`
    : "Chưa có đánh giá nào — hãy là người đầu tiên!";
}

function renderReviewsList() {
  const wrap = document.getElementById("reviewsList");
  const reviews = window.ReviewStore ? window.ReviewStore.getAll() : [];
  if (reviews.length === 0) {
    wrap.innerHTML = `<p class="hint" style="margin:0;">Chưa có đánh giá nào cho sản phẩm này.</p>`;
  } else {
    wrap.innerHTML = reviews.map((r) => `
      <div class="review-card">
        <div class="review-card-top">
          <span class="review-card-name">${escapeHtml(r.name)}</span>
          <span class="review-card-date">${formatCommentDate(r.createdAt)}</span>
        </div>
        <div class="review-card-stars" aria-hidden="true">${"★".repeat(r.rating || 0)}${"☆".repeat(Math.max(0, 5 - (r.rating || 0)))}</div>
        ${r.message ? `<p class="review-card-msg">${escapeHtml(r.message)}</p>` : ""}
      </div>`).join("");
  }
  observeReveal(wrap, ".review-card");
}

function renderCommentsList() {
  const wrap = document.getElementById("commentsList");
  const countEl = document.getElementById("commentsCount");
  const comments = window.CommentStore ? window.CommentStore.getAll() : [];
  countEl.textContent = comments.length ? `(${comments.length})` : "";
  if (comments.length === 0) {
    wrap.innerHTML = `<p class="hint" style="margin:0;">Chưa có bình luận nào — hãy là người đầu tiên!</p>`;
  } else {
    wrap.innerHTML = comments.map((c) => `
      <div class="comment-card">
        <div class="comment-card-top">
          <span class="comment-card-name">${escapeHtml(c.name)}</span>
          <span class="comment-card-date">${formatCommentDate(c.createdAt)}</span>
        </div>
        <p class="comment-card-msg">${escapeHtml(c.message)}</p>
      </div>`).join("");
  }
  observeReveal(wrap, ".comment-card");
}

// ---------------- Review star picker + form ----------------

let selectedReviewRating = 0;

function renderStarPicker() {
  document.querySelectorAll("#reviewStarPicker button").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.star) <= selectedReviewRating);
  });
}

function initReviewForm() {
  const prefillName = localStorage.getItem("sf_commenter_name") || "";
  document.getElementById("reviewName").value = prefillName;

  document.getElementById("reviewToggleFormBtn").addEventListener("click", () => {
    const form = document.getElementById("reviewForm");
    form.hidden = !form.hidden;
    if (!form.hidden) document.getElementById("reviewName").focus();
  });

  document.getElementById("reviewStarPicker").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-star]");
    if (!btn) return;
    selectedReviewRating = Number(btn.dataset.star);
    renderStarPicker();
  });

  document.getElementById("reviewForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("reviewFormError");
    errorEl.style.display = "none";
    const submitBtn = document.getElementById("reviewSubmitBtn");

    if (!selectedReviewRating) {
      errorEl.textContent = "Vui lòng chọn số sao trước khi gửi.";
      errorEl.style.display = "block";
      return;
    }

    submitBtn.disabled = true;
    window.ReviewStore.add({
      productId: currentProduct.id,
      name: document.getElementById("reviewName").value,
      rating: selectedReviewRating,
      message: document.getElementById("reviewMessage").value,
      honeypot: document.getElementById("reviewWebsite").value
    }).then(() => {
      document.getElementById("reviewMessage").value = "";
      selectedReviewRating = 0;
      renderStarPicker();
      document.getElementById("reviewForm").hidden = true;
    }).catch((err) => {
      const messages = {
        cooldown: `Bạn vừa gửi đánh giá — vui lòng đợi ${window.ReviewStore.cooldownRemainingSec()} giây rồi thử lại.`,
        "invalid-fields": "Vui lòng nhập tên và chọn số sao hợp lệ.",
        "spam-detected": "Không thể gửi đánh giá này.",
        "no-database": "Không thể kết nối tới máy chủ — thử lại sau."
      };
      errorEl.textContent = messages[err.message] || "Có lỗi xảy ra, vui lòng thử lại.";
      errorEl.style.display = "block";
    }).finally(() => {
      submitBtn.disabled = false;
    });
  });
}

function initCommentForm() {
  document.getElementById("commentName").value = localStorage.getItem("sf_commenter_name") || "";

  document.getElementById("commentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("commentFormError");
    errorEl.style.display = "none";
    const submitBtn = document.getElementById("commentSubmitBtn");
    submitBtn.disabled = true;

    window.CommentStore.add({
      productId: currentProduct.id,
      name: document.getElementById("commentName").value,
      message: document.getElementById("commentMessage").value,
      honeypot: document.getElementById("commentWebsite").value
    }).then(() => {
      document.getElementById("commentMessage").value = "";
    }).catch((err) => {
      const messages = {
        cooldown: `Bạn vừa bình luận — vui lòng đợi ${window.CommentStore.cooldownRemainingSec()} giây rồi thử lại.`,
        "empty-fields": "Vui lòng nhập tên và nội dung bình luận.",
        "spam-detected": "Không thể gửi bình luận này.",
        "no-database": "Không thể kết nối tới máy chủ — thử lại sau."
      };
      errorEl.textContent = messages[err.message] || "Có lỗi xảy ra, vui lòng thử lại.";
      errorEl.style.display = "block";
    }).finally(() => {
      submitBtn.disabled = false;
    });
  });
}

function initCommunitySections(productId) {
  initReviewForm();
  initCommentForm();

  window.ViewStore?.recordView(productId);
  window.CommentStore?.subscribeToProduct(productId);
  window.ReviewStore?.subscribeToProduct(productId);

  window.addEventListener("views:changed", renderViews);
  window.addEventListener("comments:changed", renderCommentsList);
  window.addEventListener("reviews:changed", () => {
    renderReviewSummary();
    renderReviewsList();
  });

  renderViews();
  renderReviewSummary();
  renderReviewsList();
  renderCommentsList();
  initScrollReveal();
}

function renderNotFound() {
  document.getElementById("productDetailWrap").innerHTML = `
    <div class="empty-state" style="padding:80px 20px;">
      <h1 style="margin-bottom:10px;">Không tìm thấy sản phẩm</h1>
      <p style="margin-bottom:20px;">Sản phẩm này có thể đã bị xoá khỏi danh mục.</p>
      <a href="index.html" class="btn btn-primary">Quay lại cửa hàng</a>
    </div>`;
}

function renderLoading() {
  document.getElementById("productDetailWrap").innerHTML = `
    <div class="empty-state" style="padding:80px 20px;">
      <p>Đang tải sản phẩm...</p>
    </div>`;
}

function loadAndRender() {
  const id = getProductIdFromURL();
  currentProduct = ProductStore.getById(id);
  if (!currentProduct) {
    // Data may just not have arrived from Firestore yet — only show
    // "not found" once the first snapshot has actually come back.
    if (ProductStore.ready) {
      renderNotFound();
    } else {
      renderLoading();
    }
    return false;
  }
  renderProduct(currentProduct);
  return true;
}

function attachInteractionHandlers() {
  document.getElementById("qtyDec").addEventListener("click", () => {
    currentQty = Math.max(1, currentQty - 1);
    document.getElementById("qtyValue").textContent = currentQty;
  });
  document.getElementById("qtyInc").addEventListener("click", () => {
    currentQty += 1;
    document.getElementById("qtyValue").textContent = currentQty;
  });

  document.getElementById("addToCartBtn").addEventListener("click", (e) => {
    if (!confirmOptionSelected()) return;
    Cart.add(currentProduct.id, currentQty, selectedOption || "");
    const btn = e.currentTarget;
    const original = btn.textContent;
    btn.textContent = "Đã thêm vào giỏ ✓";
    setTimeout(() => (btn.textContent = original), 1000);
  });

  document.getElementById("buyNowBtn").addEventListener("click", () => {
    if (!confirmOptionSelected()) return;
    // "Mua ngay" skips the shared cart entirely — it stashes just this
    // one product/qty for checkout.html to pick up, so it never mixes
    // with (or clears) whatever the customer already has in their cart.
    try {
      sessionStorage.setItem(
        "storefront_buynow_v1",
        JSON.stringify({ id: currentProduct.id, qty: currentQty, option: selectedOption || "" })
      );
    } catch (e) {}
    window.location.href = "checkout.html";
  });
}

function confirmOptionSelected() {
  const values = currentProduct && Array.isArray(currentProduct.optionValues) ? currentProduct.optionValues : [];
  if (values.length && !selectedOption) {
    const wrap = document.getElementById("pdOptions");
    if (wrap) wrap.classList.add("pd-options-required");
    return false;
  }
  return true;
}

function initProductPage() {
  const wrap = document.getElementById("productDetailWrap");
  // Snapshot of the real markup (gallery, info, reviews, comments) — the
  // loading/not-found states below temporarily replace wrap.innerHTML, so
  // we need this to restore it once the product actually arrives.
  const skeletonHTML = wrap.innerHTML;

  // Product data streams in from Firestore, so the very first render
  // may just be a loading state — attach the button handlers only
  // once the product has actually rendered (they need its DOM to exist).
  if (loadAndRender()) {
    attachInteractionHandlers();
    initCommunitySections(currentProduct.id);
  }

  // Reflect live changes: the product loading in for the first time,
  // being edited elsewhere, or being deleted, all fire this event.
  window.addEventListener("products:changed", () => {
    const stillExists = ProductStore.getById(getProductIdFromURL());
    if (stillExists) {
      const isFirstRender = !currentProduct;
      if (isFirstRender) wrap.innerHTML = skeletonHTML; // undo loading/not-found markup
      currentProduct = stillExists;
      renderProduct(currentProduct);
      if (isFirstRender) {
        attachInteractionHandlers();
        initCommunitySections(currentProduct.id);
      }
    } else if (ProductStore.ready) {
      currentProduct = null;
      renderNotFound();
    }
  });
}

document.addEventListener("DOMContentLoaded", initProductPage);
