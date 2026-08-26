/**
 * FILE UPLOAD — kéo-thả hoặc chọn ảnh/video từ máy, tự động tải lên
 * Firebase Storage, rồi tự điền link công khai vào ô tương ứng
 * ("fImages" cho ảnh, "fVideos" cho video).
 * ------------------------------------------------------------------
 * Yêu cầu: đã đăng nhập (window.auth có currentUser) — Storage Rules
 * chỉ cho phép người đã đăng nhập ghi (write) vào products/ và
 * product-videos/.
 * ------------------------------------------------------------------
 */

(function () {
  function setupDropZone({ zoneId, fileInputId, textareaId, progressId, storagePath, accept, maxSizeMB }) {
    const dropZone = document.getElementById(zoneId);
    const fileInput = document.getElementById(fileInputId);
    const textarea = document.getElementById(textareaId);
    const progressEl = document.getElementById(progressId);
    if (!dropZone || !fileInput || !textarea) return;

    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragging");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragging");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragging");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files.length) {
        handleFiles(fileInput.files);
        fileInput.value = "";
      }
    });

    function appendLink(url) {
      const current = textarea.value.split("\n").map((s) => s.trim()).filter(Boolean);
      current.push(url);
      textarea.value = current.join("\n");
    }

    async function handleFiles(fileList) {
      const files = Array.from(fileList).filter((f) => f.type.startsWith(accept + "/"));
      if (!files.length) return;

      if (!window.storage) {
        alert("Chưa kết nối được Firebase Storage. Kiểm tra lại cấu hình Firebase.");
        return;
      }
      if (!window.auth || !window.auth.currentUser) {
        alert("Bạn cần đăng nhập admin trước khi tải file lên.");
        return;
      }

      progressEl.style.display = "block";

      for (const file of files) {
        if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
          alert(`File "${file.name}" vượt quá ${maxSizeMB}MB — bỏ qua.`);
          continue;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${storagePath}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
        const ref = window.storage.ref().child(path);

        progressEl.textContent = `Đang tải lên: ${file.name}...`;

        try {
          const task = ref.put(file);
          await new Promise((resolve, reject) => {
            task.on(
              "state_changed",
              (snap) => {
                const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                progressEl.textContent = `Đang tải lên ${file.name}: ${pct}%`;
              },
              reject,
              resolve
            );
          });
          const url = await ref.getDownloadURL();
          appendLink(url);
          progressEl.textContent = `Đã tải lên: ${file.name}`;
        } catch (err) {
          console.error("Lỗi tải file lên:", err);
          alert(`Không tải được file "${file.name}": ${err.message || err}`);
        }
      }

      setTimeout(() => {
        progressEl.style.display = "none";
      }, 2000);
    }
  }

  function init() {
    setupDropZone({
      zoneId: "imageDropZone",
      fileInputId: "fImageFile",
      textareaId: "fImages",
      progressId: "imageUploadProgress",
      storagePath: "products",
      accept: "image",
      maxSizeMB: 8,
    });

    setupDropZone({
      zoneId: "videoDropZone",
      fileInputId: "fVideoFile",
      textareaId: "fVideos",
      progressId: "videoUploadProgress",
      storagePath: "product-videos",
      accept: "video",
      maxSizeMB: 100,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
