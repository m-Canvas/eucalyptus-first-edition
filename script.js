/*
  EUCALYPTUS — PDF STYLE READER

  75 pages:
  assets/magazine/page-01.webp
  ...
  assets/magazine/page-75.webp
*/


/* =========================
   CONFIG
========================= */

const TOTAL_PAGES = 75;


/*
  Connected Google Apps Script Web App.
*/
const REVIEW_API_URL =
  "https://script.google.com/macros/s/AKfycbyBRiG2zSJiflltSO2iUaeSy_tyiNYF7ASCsY05XhcqAOAndD3G_vsc6mHWqaaKgOG7/exec";


/* =========================
   ELEMENTS
========================= */

const viewer =
  document.getElementById("viewer");

const pdfArea =
  document.getElementById("pdfArea");

const pages =
  document.getElementById("pages");

const pageInput =
  document.getElementById("pageInput");

const previousPage =
  document.getElementById("previousPage");

const nextPage =
  document.getElementById("nextPage");

const zoomLabel =
  document.getElementById("zoomLabel");

let zoom = 1;


/* =========================
   PAGE PATH
========================= */

function getPagePath(page) {

  return (
    "assets/magazine/page-" +
    String(page).padStart(2, "0") +
    ".webp"
  );

}


/* =========================
   CREATE 75 PDF PAGES
========================= */

function createPages() {
  const fragment = document.createDocumentFragment();
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const wrapper = document.createElement("article");
    wrapper.className = "pdf-page"; wrapper.id = `page-${page}`; wrapper.dataset.page = page;
    const image = document.createElement("img");
    image.src = getPagePath(page); image.alt = `Eucalyptus — page ${page} of ${TOTAL_PAGES}`;
    image.loading = "eager"; image.decoding = "async"; image.fetchPriority = page <= 3 ? "high" : "auto"; image.draggable = false;
    image.onload = () => handlePageLoaded(page, image);
    image.onerror = () => { wrapper.classList.add("page-error"); wrapper.innerHTML = `<div class="page-placeholder"><strong>Page ${page}</strong><span>Could not be loaded</span></div>`; handlePageLoaded(page, null); };
    wrapper.appendChild(image); fragment.appendChild(wrapper);
  }
  pages.appendChild(fragment);
}

let loadedPages = 0;
let preloadFinished = false;
function handlePageLoaded(page, image) {
  loadedPages++;
  const count = document.getElementById("preloaderCount"); const bar = document.getElementById("preloaderBar");
  if (count) count.textContent = `${Math.min(loadedPages, TOTAL_PAGES)} / ${TOTAL_PAGES}`;
  if (bar) bar.style.width = `${Math.min(100, (loadedPages / TOTAL_PAGES) * 100)}%`;
  if (image && image.decode) image.decode().catch(() => {}).finally(checkPreloadComplete); else checkPreloadComplete();
}
function checkPreloadComplete() {
  if (preloadFinished || loadedPages < TOTAL_PAGES) return;
  preloadFinished = true; const preloader = document.getElementById("magazinePreloader"); if (!preloader) return;
  preloader.classList.add("ready"); preloader.setAttribute("aria-hidden", "true"); setTimeout(() => preloader.classList.add("hidden"), 320);
}
function waitForMagazineReady() {
  if (preloadFinished) return Promise.resolve();
  return new Promise(resolve => { const check = () => preloadFinished ? resolve() : requestAnimationFrame(check); check(); });
}

/* =========================
   OPEN / CLOSE
========================= */

let viewerHistoryState = false;
async function openViewer(pushHistory = true) {
  viewer.classList.add("active"); document.body.classList.add("viewer-open");
  if (pushHistory && !viewerHistoryState) { history.pushState({ eucalyptusViewer: true }, "", "#magazine"); viewerHistoryState = true; }
  await waitForMagazineReady(); requestAnimationFrame(() => { updateZoom(false); goToPage(1, false); });
}
async function closeViewer(fromPopState = false) {
  if (document.fullscreenElement === viewer) { try { await document.exitFullscreen(); } catch (_) {} }
  viewer.classList.remove("active"); document.body.classList.remove("viewer-open");
  if (!fromPopState && viewerHistoryState) { viewerHistoryState = false; history.back(); } else viewerHistoryState = false;
}

/* =========================
   PAGE NAVIGATION
========================= */

function getPageElement(page) {

  return document.getElementById(
    `page-${page}`
  );

}


function goToPage(page, smooth = true) {
  page = Math.max(1, Math.min(TOTAL_PAGES, Number(page) || 1));
  const target = getPageElement(page); if (!target) return;
  const areaRect = pdfArea.getBoundingClientRect(); const targetRect = target.getBoundingClientRect();
  const targetTop = pdfArea.scrollTop + (targetRect.top - areaRect.top) - 10;
  pdfArea.scrollTo({ top: Math.max(0, targetTop), behavior: smooth ? "smooth" : "auto" });
  currentDetectedPage = page; pageInput.value = page;
}

previousPage.addEventListener(
  "click",
  () => {

    const current =
      Number(pageInput.value) || 1;

    goToPage(current - 1);

  }
);


nextPage.addEventListener(
  "click",
  () => {

    const current =
      Number(pageInput.value) || 1;

    goToPage(current + 1);

  }
);


pageInput.addEventListener(
  "change",
  () => {

    goToPage(
      Number(pageInput.value) || 1
    );

  }
);


pageInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      goToPage(
        Number(pageInput.value) || 1
      );

      pageInput.blur();

    }

  }
);


/* =========================
   CURRENT PAGE DETECTION
========================= */

let currentDetectedPage = 1;
let detectionFrame = 0;
function updateCurrentPageFromScroll() {
  if (detectionFrame) return;
  detectionFrame = requestAnimationFrame(() => {
    detectionFrame = 0; const areaRect = pdfArea.getBoundingClientRect(); const centerY = areaRect.top + areaRect.height * 0.38;
    let closestPage = currentDetectedPage, closestDistance = Infinity;
    for (let page = 1; page <= TOTAL_PAGES; page++) { const element = getPageElement(page); if (!element) continue; const rect = element.getBoundingClientRect(); const distance = Math.abs((rect.top + rect.height / 2) - centerY); if (distance < closestDistance) { closestDistance = distance; closestPage = page; } }
    if (closestPage !== currentDetectedPage) { currentDetectedPage = closestPage; pageInput.value = closestPage; }
  });
}
pdfArea.addEventListener("scroll", updateCurrentPageFromScroll, { passive: true });

/* =========================
   ZOOM
========================= */

function getBasePageWidth() {
  const styles = getComputedStyle(pdfArea);
  const horizontalPadding =
    parseFloat(styles.paddingLeft || 0) +
    parseFloat(styles.paddingRight || 0);

  const availableWidth =
    Math.max(280, pdfArea.clientWidth - horizontalPadding);

  return Math.min(900, availableWidth);
}

function updateZoom(preservePage = true) {
  const currentPage = Number(pageInput.value) || 1;
  const width = Math.round(getBasePageWidth() * zoom);

  pages.style.width = `${width}px`;
  pages.style.maxWidth = "none";
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;

  if (preservePage) {
    requestAnimationFrame(() => goToPage(currentPage, false));
  }
}

function changeZoom(amount) {
  zoom = Math.max(0.75, Math.min(2, +(zoom + amount).toFixed(2)));
  updateZoom(true);
}


document
  .getElementById("zoomIn")
  .addEventListener(
    "click",
    () => changeZoom(.1)
  );


document
  .getElementById("zoomOut")
  .addEventListener(
    "click",
    () => changeZoom(-.1)
  );


/* =========================
   DIRECT PDF DOWNLOAD
========================= */

const downloadMagazineButton =
  document.getElementById("downloadMagazine");

const PDF_EXPORT_WIDTH = 1240;
const PDF_EXPORT_HEIGHT = 1754;
let pdfExportRunning = false;

function waitForImageLoad(image) {
  if (image.complete && image.naturalWidth > 0) {
    return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
  }

  return new Promise(resolve => {
    const done = () => {
      image.removeEventListener("load", done);
      image.removeEventListener("error", done);
      resolve();
    };
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

function getExportCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = PDF_EXPORT_WIDTH;
  canvas.height = PDF_EXPORT_HEIGHT;
  return canvas;
}

function drawImageToA4Canvas(image, canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  const scale = Math.min(
    canvas.width / sourceWidth,
    canvas.height / sourceHeight
  );

  const drawWidth = Math.round(sourceWidth * scale);
  const drawHeight = Math.round(sourceHeight * scale);
  const x = Math.round((canvas.width - drawWidth) / 2);
  const y = Math.round((canvas.height - drawHeight) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  ctx.restore();
}

function showPdfExportState(message, progress) {
  let overlay = document.getElementById("pdfExportOverlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "pdfExportOverlay";
    overlay.className = "pdf-export-overlay";
    overlay.innerHTML = `
      <div class="pdf-export-card">
        <div class="pdf-export-spinner" aria-hidden="true"></div>
        <strong id="pdfExportTitle">Preparing PDF…</strong>
        <span id="pdfExportProgress">0 / ${TOTAL_PAGES}</span>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");

  const title = document.getElementById("pdfExportTitle");
  const progressText = document.getElementById("pdfExportProgress");

  if (title) title.textContent = message;
  if (progressText) progressText.textContent = progress;
}

function hidePdfExportState() {
  const overlay = document.getElementById("pdfExportOverlay");
  if (!overlay) return;

  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");

  setTimeout(() => {
    if (!overlay.classList.contains("open")) overlay.remove();
  }, 220);
}

async function downloadMagazinePdf() {
  if (pdfExportRunning) return;
  if (!window.EucalyptusPDF) {
    alert("The PDF generator could not be loaded. Please refresh the page and try again.");
    return;
  }

  pdfExportRunning = true;
  if (downloadMagazineButton) downloadMagazineButton.disabled = true;

  const oldOverflow = document.body.style.overflow;

  try {
    document.body.style.overflow = "hidden";
    showPdfExportState("Preparing PDF…", `0 / ${TOTAL_PAGES}`);

    const jpegPages = [];
    const canvas = getExportCanvas();

    // Use the exact 75 magazine images already created by the reader.
    for (let page = 1; page <= TOTAL_PAGES; page++) {
      const image = document.querySelector(`#page-${page} img`);

      if (!image) {
        throw new Error(`Magazine page ${page} is missing.`);
      }

      showPdfExportState("Preparing PDF…", `${page - 1} / ${TOTAL_PAGES}`);
      await waitForImageLoad(image);

      if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error(`Magazine page ${page} could not be loaded.`);
      }

      drawImageToA4Canvas(image, canvas);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      const base64 = dataUrl.substring(dataUrl.indexOf(",") + 1);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      jpegPages.push({
        bytes,
        width: canvas.width,
        height: canvas.height
      });

      showPdfExportState("Preparing PDF…", `${page} / ${TOTAL_PAGES}`);

      // Let the browser update the progress UI and release some work
      // between pages instead of blocking the UI for all 75 at once.
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    showPdfExportState("Creating PDF…", `${TOTAL_PAGES} / ${TOTAL_PAGES}`);
    await new Promise(resolve => setTimeout(resolve, 20));

    const pdfBytes = window.EucalyptusPDF.createPdf(jpegPages, {
      title: "Eucalyptus — First Edition"
    });

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Eucalyptus.pdf";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 5000);

    showPdfExportState("PDF ready", `${TOTAL_PAGES} / ${TOTAL_PAGES}`);
    await new Promise(resolve => setTimeout(resolve, 450));
  } catch (error) {
    console.error("Eucalyptus PDF export failed:", error);
    alert("Could not create the PDF. Please make sure all magazine pages have loaded and try again.");
  } finally {
    document.body.style.overflow = oldOverflow;
    hidePdfExportState();

    if (downloadMagazineButton) {
      downloadMagazineButton.disabled = false;
    }

    pdfExportRunning = false;
  }
}

if (downloadMagazineButton) {
  downloadMagazineButton.addEventListener("click", downloadMagazinePdf);
}

/* =========================
   HOMEPAGE COVER
========================= */

document
  .getElementById("enterMagazine")
  .addEventListener(
    "click",
    openViewer
  );


document
  .getElementById("closeViewer")
  .addEventListener(
    "click",
    closeViewer
  );


/* =========================
   KEYBOARD
========================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      !viewer.classList.contains("active")
    ) {
      return;
    }


    if (event.key === "Escape") {

      closeViewer();

      return;

    }


    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowRight"
    ) {

      const current =
        Number(pageInput.value) || 1;

      goToPage(current + 1);

    }


    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowLeft"
    ) {

      const current =
        Number(pageInput.value) || 1;

      goToPage(current - 1);

    }

  }
);


/* =========================
   REVIEWS
========================= */

const reviewModal =
  document.getElementById(
    "reviewModal"
  );

const reviewForm =
  document.getElementById(
    "reviewForm"
  );

const formMessage =
  document.getElementById(
    "formMessage"
  );

const ratingValue =
  document.getElementById(
    "ratingValue"
  );


let reviewHistoryState = false;

function openReview(pushHistory = true) {
  reviewModal.classList.add("open");
  reviewModal.setAttribute("aria-hidden", "false");
  if (pushHistory && !reviewHistoryState) {
    history.pushState({ eucalyptusReview: true }, "", "#share");
    reviewHistoryState = true;
  }
}

function closeReview(fromPopState = false) {
  reviewModal.classList.remove("open");
  reviewModal.setAttribute("aria-hidden", "true");
  if (!fromPopState && reviewHistoryState) {
    reviewHistoryState = false;
    history.back();
  } else {
    reviewHistoryState = false;
  }
}


document
  .getElementById("addReview")
  .addEventListener(
    "click",
    openReview
  );


document
  .getElementById("closeReview")
  .addEventListener(
    "click",
    closeReview
  );


document
  .querySelector("[data-close-review]")
  .addEventListener(
    "click",
    closeReview
  );


/* Rating */

document
  .querySelectorAll(
    "#ratingInput button"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const value =
          Number(
            button.dataset.rating
          );


        ratingValue.value =
          value;


        document
          .querySelectorAll(
            "#ratingInput button"
          )
          .forEach(
            (star, index) => {

              star.textContent =
                index < value
                  ? "★"
                  : "☆";

            }
          );

      }
    );

  });


/* =========================
   LOAD REVIEWS
========================= */

const REVIEW_CACHE_KEY = "eucalyptus_reviews_v1";
function getCachedReviews() { try { const raw = sessionStorage.getItem(REVIEW_CACHE_KEY); const parsed = raw ? JSON.parse(raw) : null; return Array.isArray(parsed) ? parsed : null; } catch (_) { return null; } }
function setCachedReviews(reviews) { try { sessionStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(reviews)); } catch (_) {} }
async function loadReviews({ background = false } = {}) {
  const list = document.getElementById("reviewsList");
  const viewAll = document.getElementById("viewAllReviews");
  const cached = getCachedReviews();

  // Never expose the "View all reviews" action while the review count
  // is still unknown. The CSS also enforces this for the hidden state.
  if (viewAll) viewAll.hidden = true;

  // Cached reviews are rendered immediately, while the network request
  // refreshes the data in the background.
  if (cached) {
    renderReviews(cached, false);
  } else if (!background) {
    list.classList.add("is-loading");
    list.innerHTML = `<div class="review-state review-loading-state"><span class="inline-spinner" aria-hidden="true"></span><span>Loading reflections…</span></div>`;
  }

  try {
    const response = await fetch(`${REVIEW_API_URL}?t=${Date.now()}`, {
      cache: "no-store",
      priority: "high"
    });
    if (!response.ok) throw new Error("Request failed");

    const data = await response.json();
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];

    setCachedReviews(reviews);
    renderReviews(reviews, true);
  } catch (_) {
    if (!cached && !background) {
      list.classList.remove("is-loading");
      list.innerHTML = `<div class="review-state">Reflections are temporarily unavailable.</div>`;
    }
  }
}

/* =========================
   RENDER REVIEWS
========================= */

function sortReviewsLatestFirst(reviews) {
  return [...reviews].sort((a, b) => {
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return db - da;
    return 0;
  });
}

function renderReviewCard(review) {
  const card = document.createElement("article");
  card.className = "review-card";

  const top = document.createElement("div");
  top.className = "review-top";

  const name = document.createElement("div");
  name.className = "review-name";
  name.textContent = review.name || "Anonymous";

  const stars = document.createElement("div");
  stars.className = "review-stars";
  const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
  stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);

  const text = document.createElement("p");
  text.className = "review-text";
  text.textContent = review.review || "";

  top.append(name, stars);
  card.append(top, text);
  return card;
}

function renderReviews(reviews, fresh = true) {
  const list = document.getElementById("reviewsList");
  if (!list) return;

  const allReviews = sortReviewsLatestFirst(reviews);
  const latestReviews = allReviews.slice(0, 5);

  list.classList.remove("is-loading");
  list.innerHTML = "";

  if (!allReviews.length) {
    list.innerHTML = `<div class="review-state">Be the first to leave a reflection.</div>`;
  } else {
    latestReviews.forEach(review => list.appendChild(renderReviewCard(review)));
  }

  const viewAll = document.getElementById("viewAllReviews");
  if (viewAll) {
    viewAll.hidden = allReviews.length <= 5;
  }
}

const reviewSubmitOverlay = document.getElementById("reviewSubmitOverlay");
const reviewSubmitTitle = document.getElementById("reviewSubmitTitle");
const reviewSubmitText = document.getElementById("reviewSubmitText");
const submitButton = reviewForm.querySelector(".submit-review");

function setReviewSubmitting(isSubmitting) {
  // Keep the form controls locked while the request is running.
  // The old full-card overlay is intentionally no longer used.
  if (reviewSubmitOverlay) {
    reviewSubmitOverlay.classList.remove("open");
    reviewSubmitOverlay.setAttribute("aria-hidden", "true");
  }

  submitButton.disabled = isSubmitting;
  reviewForm
    .querySelectorAll("input, textarea, #ratingInput button")
    .forEach(control => {
      control.disabled = isSubmitting;
    });
}

function showReviewPublishState(message = "Publishing your reflection…", success = false) {
  const list = document.getElementById("reviewsList");
  if (!list) return;

  list.classList.add("is-loading", "is-publishing");
  list.innerHTML = `
    <div class="review-state review-publish-state ${success ? "is-success" : ""}">
      ${success ? "" : '<span class="inline-spinner" aria-hidden="true"></span>'}
      <span>${message}</span>
    </div>
  `;
}

/* =========================
   SUBMIT REVIEW
========================= */

reviewForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (submitButton.disabled) return;

  formMessage.textContent = "";

  const formData = new FormData(reviewForm);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    rating: Number(formData.get("rating") || 5),
    review: String(formData.get("review") || "").trim()
  };

  if (!payload.name || !payload.review) {
    formMessage.textContent = "Please complete the form.";
    return;
  }

  setReviewSubmitting(true);
  closeReview();

  // Show a compact one-line state in the homepage Reviews section
  // instead of covering the entire review form with a loader.
  showReviewPublishState();

  try {
    await fetch(REVIEW_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    try {
      sessionStorage.removeItem(REVIEW_CACHE_KEY);
    } catch (_) {}

    reviewForm.reset();
    ratingValue.value = 5;
    document.querySelectorAll("#ratingInput button")
      .forEach(star => star.textContent = "★");

    showReviewPublishState("Reflection submitted", true);

    await new Promise(resolve => setTimeout(resolve, 650));

    setReviewSubmitting(false);
    await loadReviews({ background: true });
  } catch (_) {
    setReviewSubmitting(false);

    showReviewPublishState(
      "Could not publish. Please try again.",
      true
    );

    setTimeout(() => {
      loadReviews({ background: true });
    }, 1400);
  }
});

/* =========================
   VIEWPORT / MOBILE RESIZE
========================= */

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (viewer.classList.contains("active")) updateZoom(true);
  }, 100);
}, { passive: true });

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    if (viewer.classList.contains("active")) updateZoom(true);
  }, 250);
}, { passive: true });


/* =========================
   ANTI-SELECTION / LONG-PRESS
========================= */

// Prevent accidental text selection, long-press selection and the
// mobile context menu everywhere except inside the review form.
document.addEventListener("selectstart", event => {
  if (!event.target.closest("#reviewForm")) event.preventDefault();
});

document.addEventListener("contextmenu", event => {
  if (!event.target.closest("#reviewForm")) event.preventDefault();
});

document.addEventListener("dragstart", event => {
  if (!event.target.closest("#reviewForm")) event.preventDefault();
});

/* =========================
   INITIALIZE
========================= */

// Start the review request first. The 75 magazine images remain
// eager-loaded exactly as before, but the review API gets a head start
// instead of waiting for createPages() to finish.
loadReviews();

createPages();
updateZoom(false);

for (
  let page = 1;
  page <= TOTAL_PAGES;
  page++
) {

  const element =
    getPageElement(page);


  if (element) {

    observer.observe(element);

  }

}


loadReviews();
