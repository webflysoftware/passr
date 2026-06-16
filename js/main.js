function gtag_report_conversion(url) {
  var callback = function () {
    if (typeof url !== "undefined") {
      window.location = url;
    }
  };

  if (typeof gtag !== "function") {
    window.location = url;
    return false;
  }

  gtag("event", "conversion", {
    send_to: "AW-17592266250/mGZbCOz21KAbEIrc0sRB",
    value: 1.0,
    currency: "CAD",
    event_callback: callback,
  });
  return false;
}

function initConversionLinks() {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    const link = e.target.closest('.article-body a[href*="triviarat.com"]');
    if (!link) return;

    e.preventDefault();
    gtag_report_conversion(link.href);
  });
}

function articleUrl(slug) {
  return `/article/${slug}`;
}

function buildLoginUrl(redirect) {
  const url = new URL("/login", window.location.origin);
  const target = redirect || `${window.location.pathname}${window.location.search}`;
  if (target && !target.startsWith("/login")) {
    url.searchParams.set("redirect", target);
  }
  return `${url.pathname}${url.search}`;
}

function redirectToLogin(redirect, options = {}) {
  if (options.pendingReply) {
    sessionStorage.setItem("passr_pending_reply", options.pendingReply);
  }
  window.location.href = buildLoginUrl(redirect);
}

function getArticleSlugFromPath() {
  return window.location.pathname.match(/^\/article\/([^/]+)\/?$/)?.[1] || null;
}

function renderArticleMeta(article) {
  const author = AUTHORS[article.author];
  return `
    <div class="article-meta">
      <span class="author">
        <img class="author-avatar" src="${author.avatar}" alt="${author.name}" width="28" height="28">
        ${author.name}
      </span>
      <span class="meta-dot">${formatDate(article.date)}</span>
      <span>${article.readTime}</span>
    </div>
  `;
}

function getArticlePageUrl(article) {
  return window.location.origin + articleUrl(article.slug);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function renderArticleShare(article) {
  const url = getArticlePageUrl(article);
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(url)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return `
    <div class="article-share" data-share-root>
      <button type="button" class="share-toggle" aria-expanded="false" aria-controls="article-share-panel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8.59 13.51 15.42 17.49M15.41 6.51 8.59 10.49M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/></svg>
        Share
      </button>
      <div class="share-panel" id="article-share-panel" hidden>
        <div class="share-actions">
          <button type="button" class="share-action" data-share="copy">Copy link</button>
          <button type="button" class="share-action" data-share="email">Email</button>
          <button type="button" class="share-action" data-share="native" hidden>Share…</button>
          <a class="share-action" href="${linkedIn}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a class="share-action" href="${twitter}" target="_blank" rel="noopener noreferrer">X</a>
          <a class="share-action" href="${facebook}" target="_blank" rel="noopener noreferrer">Facebook</a>
          <button type="button" class="share-action" data-share="embed">Embed</button>
        </div>
        <div class="share-embed-panel" hidden>
          <label class="share-embed-label" for="share-embed-code">Embed this article</label>
          <textarea id="share-embed-code" class="share-embed-code" readonly rows="3"></textarea>
          <button type="button" class="share-action share-action-secondary" data-share="copy-embed">Copy embed code</button>
        </div>
        <p class="share-feedback" hidden aria-live="polite"></p>
      </div>
    </div>
  `;
}

function initArticleShare(article, root) {
  const shareRoot = root.querySelector("[data-share-root]");
  if (!shareRoot) return;

  const toggle = shareRoot.querySelector(".share-toggle");
  const panel = shareRoot.querySelector(".share-panel");
  const feedback = shareRoot.querySelector(".share-feedback");
  const embedPanel = shareRoot.querySelector(".share-embed-panel");
  const embedTextarea = shareRoot.querySelector("#share-embed-code");
  const nativeBtn = shareRoot.querySelector('[data-share="native"]');
  const url = getArticlePageUrl(article);
  const embedCode = `<iframe src="${url}" title="${escapeHtml(article.title)}" width="100%" height="480" frameborder="0" loading="lazy"></iframe>`;

  if (embedTextarea) embedTextarea.value = embedCode;
  if (navigator.share && nativeBtn) {
    nativeBtn.hidden = false;
  }

  function showFeedback(message) {
    feedback.textContent = message;
    feedback.hidden = false;
    window.setTimeout(() => {
      feedback.hidden = true;
    }, 2200);
  }

  function closePanel() {
    toggle.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  }

  function openPanel() {
    toggle.setAttribute("aria-expanded", "true");
    panel.hidden = false;
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) closePanel();
    else openPanel();
  });

  document.addEventListener("click", (e) => {
    if (!shareRoot.contains(e.target)) closePanel();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });

  shareRoot.querySelector('[data-share="copy"]')?.addEventListener("click", async () => {
    await copyTextToClipboard(url);
    showFeedback("Link copied");
  });

  shareRoot.querySelector('[data-share="email"]')?.addEventListener("click", () => {
    const subject = encodeURIComponent(article.title);
    const body = encodeURIComponent(`${article.excerpt}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  shareRoot.querySelector('[data-share="embed"]')?.addEventListener("click", () => {
    embedPanel.hidden = !embedPanel.hidden;
  });

  shareRoot.querySelector('[data-share="copy-embed"]')?.addEventListener("click", async () => {
    await copyTextToClipboard(embedCode);
    showFeedback("Embed code copied");
  });

  nativeBtn?.addEventListener("click", async () => {
    try {
      await navigator.share({
        title: article.title,
        text: article.excerpt,
        url,
      });
    } catch (err) {
      if (err?.name !== "AbortError") showFeedback("Share unavailable");
    }
  });
}

function renderArticleInner(article, heroAlt) {
  const author = AUTHORS[article.author];
  const alt = heroAlt || article.title;

  return `
    <header class="article-header">
      <a href="/topic.html?category=${article.category}" class="tag">${getCategoryLabel(article.category)}</a>
      <h1>${article.title}</h1>
      <p class="subtitle">${article.subtitle}</p>
      ${renderArticleMeta(article)}
    </header>
    <figure class="hero-image">
      <img src="${article.image}" alt="${escapeHtml(alt)}" width="1200" height="640">
    </figure>
    <div class="article-body">${article.body}</div>
    <footer class="article-footer">
      <div class="author-bio">
        <img class="author-avatar" src="${author.avatar}" alt="${author.name}" width="56" height="56">
        <div>
          <h4>${author.name}</h4>
          <p>${author.bio}</p>
        </div>
      </div>
      ${renderArticleShare(article)}
    </footer>
  `;
}

function mountArticlePage(slug, options) {
  const article = getArticle(slug);
  const innerEl = document.getElementById("article-inner");
  const footerTopics = document.getElementById("footer-topics");

  if (footerTopics) {
    footerTopics.innerHTML = CATEGORIES.map(
      (c) => `<li><a href="/topic.html?category=${c.slug}">${c.label}</a></li>`
    ).join("");
  }

  if (!innerEl) return null;

  if (!article) {
    innerEl.innerHTML = `
      <div class="empty-state">
        <h1>Article not found</h1>
        <p style="margin-top:12px;"><a href="/" style="color:var(--accent);">Return home</a></p>
      </div>
    `;
    document.title = "Not found — PASSR";
    return null;
  }

  const ssgPrerendered = innerEl.dataset.ssgPrerendered === "true";

  if (!ssgPrerendered && typeof applyArticleSeo === "function") {
    applyArticleSeo(article);
  }

  if (!ssgPrerendered) {
    innerEl.innerHTML = renderArticleInner(article, options?.heroAlt);
  }

  initArticleShare(article, innerEl);

  const related = getRelatedArticles(slug, 3);
  const relatedSection = document.getElementById("related-section");
  const relatedGrid = document.getElementById("related-grid");

  if (related.length && relatedSection && relatedGrid) {
    relatedSection.hidden = false;
    relatedGrid.innerHTML = related.map(renderArticleCard).join("");
  } else if (relatedSection) {
    relatedSection.hidden = true;
  }

  initComments(slug);

  return article;
}

function renderArticleCard(article) {
  const author = AUTHORS[article.author];
  return `
    <article class="article-card">
      <a href="${articleUrl(article.slug)}" class="card-image">
        <img src="${article.image.replace("w=1400", "w=800").replace("w=1200", "w=800")}" alt="" loading="lazy" width="800" height="500">
      </a>
      <span class="tag">${getCategoryLabel(article.category)}</span>
      <h3><a href="${articleUrl(article.slug)}">${article.title}</a></h3>
      <p class="excerpt">${article.excerpt}</p>
      <div class="article-meta">
        <span class="author">
          <img class="author-avatar" src="${author.avatar}" alt="" width="28" height="28">
          ${author.name}
        </span>
        <span class="meta-dot">${formatDate(article.date)}</span>
      </div>
    </article>
  `;
}

function initMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const close = document.querySelector(".mobile-nav-close");
  const nav = document.querySelector(".mobile-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => nav.classList.add("open"));
  close.addEventListener("click", () => nav.classList.remove("open"));
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
}

function setActiveNav(page) {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === page);
  });
}

function initCategoryFilters(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const grid = document.querySelector("[data-articles-grid]");
  if (!grid) return;

  container.addEventListener("click", (e) => {
    const pill = e.target.closest(".category-pill");
    if (!pill) return;

    container.querySelectorAll(".category-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");

    const category = pill.dataset.category || "";
    const articles = getArticlesByCategory(category);
    grid.innerHTML = articles.map(renderArticleCard).join("");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initConversionLinks();
  initSubscribe();
  initContactForm();
  initProfileFeatures();
  initAdminFeatures();
  initSessionUI();
});

function renderSubscribeModal() {
  if (document.getElementById("subscribe-modal")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="modal-overlay" id="subscribe-modal">
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="subscribe-modal-title">
        <button type="button" class="modal-close" aria-label="Close subscribe dialog">&times;</button>
        <h2 id="subscribe-modal-title">Subscribe to PASSR</h2>
        <p class="modal-lead">Get new articles by email. No digests, no sponsored content.</p>
        <form id="subscribe-form" class="passr-form" novalidate>
          <label class="form-field">
            <span class="form-label">Email address</span>
            <input type="email" name="email" autocomplete="email" required placeholder="you@company.com">
          </label>
          <p class="form-feedback" id="subscribe-feedback" hidden aria-live="polite"></p>
          <button type="submit" class="btn btn-primary btn-block">Subscribe</button>
        </form>
      </div>
    </div>
  `
  );
}

function initSubscribe() {
  renderSubscribeModal();

  const modal = document.getElementById("subscribe-modal");
  const form = document.getElementById("subscribe-form");
  const feedback = document.getElementById("subscribe-feedback");
  if (!modal || !form) return;

  const openModal = () => {
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    form.reset();
    feedback.hidden = true;
    form.querySelector('input[name="email"]')?.focus();
  };

  const closeModal = () => {
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
  };

  document.querySelectorAll(".subscribe-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });
  });

  modal.querySelector(".modal-close")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.hidden = true;

    const emailInput = form.querySelector('input[name="email"]');
    const email = emailInput?.value.trim();
    if (!email) {
      feedback.textContent = "Please enter your email address.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Subscribing…";

    try {
      await subscribeToPassr(email);
      feedback.textContent = "You are subscribed. Watch your inbox for the next article.";
      feedback.className = "form-feedback form-feedback-success";
      feedback.hidden = false;
      form.reset();
    } catch (err) {
      feedback.textContent = err.message || "Could not subscribe. Please try again.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Subscribe";
    }
  });
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const feedback = document.getElementById("contact-feedback");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.hidden = true;

    const name = form.querySelector('input[name="name"]')?.value.trim() || "";
    const email = form.querySelector('input[name="email"]')?.value.trim() || "";
    const message = form.querySelector('textarea[name="message"]')?.value.trim() || "";

    if (!email) {
      feedback.textContent = "Please enter your email address.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
      return;
    }
    if (!message) {
      feedback.textContent = "Please enter a message.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      await sendPassrContact({ name, email, message });
      feedback.textContent = "Message sent. We will get back to you soon.";
      feedback.className = "form-feedback form-feedback-success";
      feedback.hidden = false;
      form.reset();
    } catch (err) {
      feedback.textContent = err.message || "Could not send your message. Please try again.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send message";
    }
  });
}

// ── Comments ────────────────────────────────────────────────────────────────

let _currentUser = null;
let _currentSlug = null;
let _pendingReplyParentId = null;

async function initComments(slug) {
  _currentSlug = slug;
  try {
    _currentUser = await getCurrentUser();
  } catch (_) {
    _currentUser = getStoredUser();
  }

  const charCountEl = document.getElementById("comment-char-count");
  const bodyEl = document.getElementById("comment-body");
  if (charCountEl && bodyEl) {
    bodyEl.addEventListener("input", () => updateCharCount(bodyEl, charCountEl));
  }

  const submitBtn = document.getElementById("comment-submit-btn");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => handleCommentSubmit(slug));
  }

  await refreshComments(slug);

  const pendingReply = sessionStorage.getItem("passr_pending_reply");
  if (pendingReply && _currentUser) {
    sessionStorage.removeItem("passr_pending_reply");
    openReplyForm(pendingReply);
  }
}

function updateCharCount(textarea, counterEl) {
  const len = textarea.value.length;
  counterEl.textContent = `${len} / 2000`;
  counterEl.className = "char-count" + (len > 1800 ? (len > 1950 ? " at-limit" : " near-limit") : "");
}

async function refreshComments(slug) {
  try {
    const { comments, total } = await getComments(slug);
    const countEl = document.getElementById("comment-count");
    if (countEl) countEl.textContent = total > 0 ? ` (${total})` : "";
    renderComments(comments);
  } catch (err) {
    console.error("Failed to load comments:", err);
    renderComments([]);
  }
}

function updateCommentForm() {
  const anonFields = document.getElementById("comment-anonymous-fields");
  if (!_currentUser) {
    if (anonFields) anonFields.style.display = "grid";
  } else {
    if (anonFields) anonFields.style.display = "none";
  }
}

function getCommentId(comment) {
  return String(comment.id || comment._id);
}

function buildCommentTree(comments) {
  const nodes = new Map();
  const roots = [];

  comments.forEach((comment) => {
    nodes.set(getCommentId(comment), { ...comment, replies: [] });
  });

  nodes.forEach((node) => {
    const parentKey = node.parentId ? String(node.parentId) : null;
    if (parentKey && nodes.has(parentKey)) {
      nodes.get(parentKey).replies.push(node);
    } else if (!parentKey) {
      roots.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortAsc = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
  const sortDesc = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

  roots.sort(sortDesc);
  const sortReplies = (node) => {
    node.replies.sort(sortAsc);
    node.replies.forEach(sortReplies);
  };
  roots.forEach(sortReplies);

  return roots;
}

function formatCommentDate(value) {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function renderCommentItem(comment) {
  const id = getCommentId(comment);
  const date = formatCommentDate(comment.createdAt);
  const repliesHtml = comment.replies?.length
    ? `<div class="comment-replies">${comment.replies.map(renderCommentItem).join("")}</div>`
    : "";

  return `
    <div class="comment-item" data-comment-id="${escapeHtml(id)}">
      ${renderCommentAvatarHtml(comment)}
      <div class="comment-body">
        <div class="comment-meta">
          ${renderCommentAuthorHtml(comment)}
          <span class="comment-date">${date}</span>
        </div>
        <p class="comment-text">${escapeHtml(comment.body)}</p>
        <button type="button" class="comment-reply-btn" data-parent-id="${escapeHtml(id)}">Reply</button>
        ${renderCommentAdminControls(comment)}
        <div class="comment-reply-form" hidden>
          <textarea maxlength="2000" placeholder="Write a reply…"></textarea>
          <div class="comment-form-footer">
            <span class="char-count">0 / 2000</span>
            <div class="comment-reply-actions">
              <button type="button" class="comment-reply-cancel">Cancel</button>
              <button type="button" class="comment-submit-btn">Post Reply</button>
            </div>
          </div>
        </div>
        ${repliesHtml}
      </div>
    </div>`;
}

function renderComments(comments) {
  const listEl = document.getElementById("comments-list");
  if (!listEl) return;

  if (!comments || comments.length === 0) {
    listEl.innerHTML = '<p class="no-comments">No comments yet. Be the first to share your thoughts.</p>';
    return;
  }

  const tree = buildCommentTree(comments);
  _commentsById = new Map();
  indexCommentsForAdmin(tree);
  listEl.innerHTML = tree.map(renderCommentItem).join("");
  bindCommentInteractions(listEl);
}

function bindCommentInteractions(listEl) {
  listEl.querySelectorAll(".comment-reply-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentId = btn.dataset.parentId;
      if (!_currentUser) {
        _pendingReplyParentId = parentId;
        redirectToLogin(undefined, { pendingReply: parentId });
        return;
      }
      openReplyForm(parentId);
    });
  });

  listEl.querySelectorAll(".comment-profile-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showPublicProfileModal(btn.dataset.userId);
    });
  });

  bindAdminCommentInteractions(listEl);

  listEl.querySelectorAll(".comment-reply-form").forEach((form) => {
    const textarea = form.querySelector("textarea");
    const counter = form.querySelector(".char-count");
    const cancelBtn = form.querySelector(".comment-reply-cancel");
    const submitBtn = form.querySelector(".comment-submit-btn");
    const parentId = form.closest(".comment-item")?.dataset.commentId;

    if (textarea && counter) {
      textarea.addEventListener("input", () => updateCharCount(textarea, counter));
    }

    cancelBtn?.addEventListener("click", () => closeReplyForm(form));

    submitBtn?.addEventListener("click", () => {
      if (!parentId) return;
      handleReplySubmit(_currentSlug, parentId, form, textarea, submitBtn);
    });
  });
}

function openReplyForm(parentId) {
  document.querySelectorAll(".comment-reply-form").forEach((form) => {
    form.hidden = true;
    const textarea = form.querySelector("textarea");
    if (textarea) textarea.value = "";
  });

  const item = document.querySelector(`.comment-item[data-comment-id="${parentId}"]`);
  const form = item?.querySelector(".comment-reply-form");
  if (!form) return;

  form.hidden = false;
  form.querySelector("textarea")?.focus();
}

function closeReplyForm(form) {
  form.hidden = true;
  const textarea = form.querySelector("textarea");
  const counter = form.querySelector(".char-count");
  if (textarea) textarea.value = "";
  if (counter) counter.textContent = "0 / 2000";
}

async function handleCommentSubmit(slug) {
  const bodyEl = document.getElementById("comment-body");
  const submitBtn = document.getElementById("comment-submit-btn");

  await submitComment({
    slug,
    body: bodyEl?.value.trim() || "",
    parentId: null,
    onSuccess: () => {
      if (bodyEl) bodyEl.value = "";
      const charCountEl = document.getElementById("comment-char-count");
      if (charCountEl) charCountEl.textContent = "0 / 2000";
    },
    submitBtn,
    defaultLabel: "Post Comment",
    loadingLabel: "Posting…",
    requireAuthCallback: () => redirectToLogin(),
  });
}

async function handleReplySubmit(slug, parentId, form, textarea, submitBtn) {
  await submitComment({
    slug,
    body: textarea?.value.trim() || "",
    parentId,
    onSuccess: () => closeReplyForm(form),
    submitBtn,
    defaultLabel: "Post Reply",
    loadingLabel: "Posting…",
    requireAuthCallback: () => redirectToLogin(undefined, { pendingReply: parentId }),
  });
}

async function submitComment({ slug, body, parentId, onSuccess, submitBtn, defaultLabel, loadingLabel, requireAuthCallback }) {
  if (!body) {
    alert("Please write a comment first.");
    return;
  }

  if (body.length > 2000) {
    alert("Comment must be 2000 characters or fewer.");
    return;
  }

  if (!_currentUser) {
    requireAuthCallback();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = loadingLabel;
  }

  try {
    await postComment({
      articleSlug: slug,
      body,
      parentId: parentId || undefined,
    });

    onSuccess?.();
    await refreshComments(slug);
  } catch (err) {
    if (err.message.includes("401") || err.message.toLowerCase().includes("auth")) {
      requireAuthCallback();
    } else {
      alert(err.message || "Failed to post comment. Please try again.");
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = defaultLabel;
    }
  }
}



// ── Passr Super Admin ───────────────────────────────────────────────────────

let _commentsById = new Map();
let _adminEditingCommentId = null;
let _adminSelectedUser = null;

function indexCommentsForAdmin(comments) {
  comments.forEach((comment) => {
    _commentsById.set(getCommentId(comment), comment);
    if (comment.replies?.length) indexCommentsForAdmin(comment.replies);
  });
}

function renderAdminModals() {
  if (document.getElementById("admin-comment-modal")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="modal-overlay" id="admin-comment-modal" role="dialog" aria-modal="true" aria-labelledby="admin-comment-title">
      <div class="modal-box profile-modal-box">
        <button type="button" class="modal-close" id="admin-comment-close" aria-label="Close">&times;</button>
        <h2 class="modal-title" id="admin-comment-title">Edit comment</h2>
        <p class="modal-subtitle">Super admin moderation</p>
        <form class="profile-form" id="admin-comment-form" onsubmit="return false;">
          <label class="form-field">
            <span class="form-label">Comment</span>
            <textarea id="admin-comment-body" maxlength="2000" rows="5"></textarea>
          </label>
          <label class="form-field">
            <span class="form-label">Assigned user</span>
            <input type="search" id="admin-comment-user-search" placeholder="Search users by name or email" autocomplete="off">
            <div id="admin-comment-user-results" class="admin-user-results"></div>
            <p class="admin-selected-user" id="admin-comment-selected-user" hidden></p>
            <button type="button" class="comment-reply-cancel" id="admin-comment-clear-user" hidden>Clear assigned user</button>
          </label>
          <div id="admin-comment-anonymous-fields" class="anonymous-fields" hidden>
            <input type="text" id="admin-comment-author-name" placeholder="Display name">
            <input type="email" id="admin-comment-author-email" placeholder="Email">
          </div>
          <p class="form-feedback" id="admin-comment-feedback" hidden aria-live="polite"></p>
          <button type="submit" class="modal-submit" id="admin-comment-save-btn">Save changes</button>
        </form>
      </div>
    </div>
  `
  );
}

function initAdminModals() {
  renderAdminModals();

  document.getElementById("admin-comment-close")?.addEventListener("click", hideAdminCommentModal);
  document.getElementById("admin-comment-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "admin-comment-modal") hideAdminCommentModal();
  });
  document.getElementById("admin-comment-clear-user")?.addEventListener("click", () => {
    _adminSelectedUser = null;
    updateAdminCommentUserUI();
  });
  document.getElementById("admin-comment-user-search")?.addEventListener("input", (e) => {
    window.clearTimeout(_adminSearchTimer);
    _adminSearchTimer = window.setTimeout(() => searchAdminUsers(e.target.value.trim()), 250);
  });
  document.getElementById("admin-comment-form")?.addEventListener("submit", handleAdminCommentSave);
}

let _adminSearchTimer = null;

async function searchAdminUsers(query) {
  const resultsEl = document.getElementById("admin-comment-user-results");
  if (!resultsEl) return;

  if (!query) {
    resultsEl.innerHTML = "";
    return;
  }

  try {
    const { users } = await adminSearchUsers(query, 8);
    if (!users.length) {
      resultsEl.innerHTML = '<p class="admin-user-empty">No users found.</p>';
      return;
    }
    resultsEl.innerHTML = users.map((user) => `
      <button type="button" class="admin-user-option" data-user-id="${escapeHtml(user.id)}" data-display-name="${escapeHtml(user.displayName)}" data-email="${escapeHtml(user.email)}">
        <strong>${escapeHtml(user.displayName)}</strong>
        <span>${escapeHtml(user.email)}</span>
      </button>
    `).join("");
    resultsEl.querySelectorAll(".admin-user-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        _adminSelectedUser = {
          id: btn.dataset.userId,
          displayName: btn.dataset.displayName,
          email: btn.dataset.email,
        };
        updateAdminCommentUserUI();
        resultsEl.innerHTML = "";
        const searchEl = document.getElementById("admin-comment-user-search");
        if (searchEl) searchEl.value = "";
      });
    });
  } catch (err) {
    resultsEl.innerHTML = `<p class="admin-user-empty">${escapeHtml(err.message || "Search failed")}</p>`;
  }
}

function updateAdminCommentUserUI() {
  const selectedEl = document.getElementById("admin-comment-selected-user");
  const clearBtn = document.getElementById("admin-comment-clear-user");
  const anonFields = document.getElementById("admin-comment-anonymous-fields");

  if (_adminSelectedUser) {
    if (selectedEl) {
      selectedEl.hidden = false;
      selectedEl.textContent = `${_adminSelectedUser.displayName} (${_adminSelectedUser.email})`;
    }
    if (clearBtn) clearBtn.hidden = false;
    if (anonFields) anonFields.hidden = true;
  } else {
    if (selectedEl) selectedEl.hidden = true;
    if (clearBtn) clearBtn.hidden = true;
    if (anonFields) anonFields.hidden = false;
  }
}

function showAdminCommentModal(commentId) {
  const comment = _commentsById.get(String(commentId));
  if (!comment) return;

  _adminEditingCommentId = String(commentId);
  _adminSelectedUser = comment.userId
    ? {
        id: String(comment.userId),
        displayName: getCommentDisplayName(comment),
        email: comment.authorEmail || "",
      }
    : null;

  const bodyEl = document.getElementById("admin-comment-body");
  const nameEl = document.getElementById("admin-comment-author-name");
  const emailEl = document.getElementById("admin-comment-author-email");
  const feedback = document.getElementById("admin-comment-feedback");
  const resultsEl = document.getElementById("admin-comment-user-results");

  if (bodyEl) bodyEl.value = comment.body || "";
  if (nameEl) nameEl.value = comment.authorName || "";
  if (emailEl) emailEl.value = comment.authorEmail || "";
  if (feedback) feedback.hidden = true;
  if (resultsEl) resultsEl.innerHTML = "";

  updateAdminCommentUserUI();
  document.getElementById("admin-comment-modal")?.classList.add("open");
}

function hideAdminCommentModal() {
  _adminEditingCommentId = null;
  _adminSelectedUser = null;
  document.getElementById("admin-comment-modal")?.classList.remove("open");
}

async function handleAdminCommentSave(e) {
  e.preventDefault();
  if (!_adminEditingCommentId) return;

  const body = document.getElementById("admin-comment-body")?.value.trim() || "";
  const feedback = document.getElementById("admin-comment-feedback");
  const saveBtn = document.getElementById("admin-comment-save-btn");

  if (!body) {
    if (feedback) {
      feedback.textContent = "Comment text is required.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
    }
    return;
  }

  const payload = { body };
  if (_adminSelectedUser) {
    payload.userId = _adminSelectedUser.id;
  } else {
    const authorName = document.getElementById("admin-comment-author-name")?.value.trim() || "";
    const authorEmail = document.getElementById("admin-comment-author-email")?.value.trim() || "";
    if (!authorName || !authorEmail) {
      if (feedback) {
        feedback.textContent = "Assign a user or provide a display name and email.";
        feedback.className = "form-feedback form-feedback-error";
        feedback.hidden = false;
      }
      return;
    }
    payload.userId = null;
    payload.authorName = authorName;
    payload.authorEmail = authorEmail;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
  }

  try {
    await updateCommentAdmin(_adminEditingCommentId, payload);
    hideAdminCommentModal();
    if (_currentSlug) await refreshComments(_currentSlug);
  } catch (err) {
    if (feedback) {
      feedback.textContent = err.message || "Could not save comment.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save changes";
    }
  }
}

async function handleAdminDeleteComment(commentId) {
  if (!window.confirm("Delete this comment and all replies?")) return;
  try {
    await deleteCommentAdmin(commentId);
    if (_currentSlug) await refreshComments(_currentSlug);
  } catch (err) {
    alert(err.message || "Could not delete comment.");
  }
}

function renderCommentAdminControls(comment) {
  if (!isPassrSuperAdmin(_currentUser)) return "";
  const id = getCommentId(comment);
  return `
    <div class="comment-admin-actions">
      <button type="button" class="comment-admin-btn" data-action="edit" data-comment-id="${escapeHtml(id)}">Edit</button>
      <button type="button" class="comment-admin-btn comment-admin-btn-danger" data-action="delete" data-comment-id="${escapeHtml(id)}">Delete</button>
    </div>`;
}

function bindAdminCommentInteractions(listEl) {
  if (!isPassrSuperAdmin(_currentUser)) return;

  listEl.querySelectorAll(".comment-admin-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const commentId = btn.dataset.commentId;
      if (btn.dataset.action === "edit") showAdminCommentModal(commentId);
      else if (btn.dataset.action === "delete") handleAdminDeleteComment(commentId);
    });
  });
}

function renderAdminProfileSection() {
  const profileForm = document.getElementById("profile-form");
  if (!profileForm || document.getElementById("profile-admin-section")) return;

  profileForm.insertAdjacentHTML(
    "afterend",
    `
    <div class="profile-admin-section" id="profile-admin-section" hidden>
      <div class="profile-admin-divider"></div>
      <h3 class="profile-admin-title">Admin</h3>
      <p class="modal-subtitle">Create discussion accounts for PASSR readers.</p>
      <div id="admin-create-user-form" class="profile-form">
        <label class="form-field">
          <span class="form-label">Full name</span>
          <input type="text" id="admin-create-name" required maxlength="80" placeholder="Jane Doe">
        </label>
        <label class="form-field">
          <span class="form-label">Email</span>
          <input type="email" id="admin-create-email" required placeholder="jane@example.com">
        </label>
        <label class="form-field">
          <span class="form-label">Password</span>
          <input type="password" id="admin-create-password" required placeholder="Min 8 chars, letter + number">
        </label>
        <label class="form-field">
          <span class="form-label">Display name (optional)</span>
          <input type="text" id="admin-create-display-name" maxlength="80" placeholder="Shown in comments">
        </label>
        <p class="form-feedback" id="admin-create-feedback" hidden aria-live="polite"></p>
        <button type="button" class="modal-submit" id="admin-create-submit">Create user</button>
      </div>
    </div>
  `
  );

  document.getElementById("admin-create-submit")?.addEventListener("click", handleAdminCreateUser);
}

function updateAdminProfileSectionVisibility() {
  renderAdminProfileSection();
  const section = document.getElementById("profile-admin-section");
  if (section) section.hidden = !isPassrSuperAdmin(_currentUser);
}

async function handleAdminCreateUser() {
  if (!isPassrSuperAdmin(_currentUser)) return;

  const name = document.getElementById("admin-create-name")?.value.trim() || "";
  const email = document.getElementById("admin-create-email")?.value.trim() || "";
  const password = document.getElementById("admin-create-password")?.value || "";
  const displayName = document.getElementById("admin-create-display-name")?.value.trim() || "";
  const feedback = document.getElementById("admin-create-feedback");
  const submitBtn = document.getElementById("admin-create-submit");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating…";
  }

  try {
    await adminCreateUser({
      name,
      email,
      password,
      ...(displayName ? { displayName } : {}),
    });
    if (feedback) {
      feedback.textContent = `Created ${email}.`;
      feedback.className = "form-feedback form-feedback-success";
      feedback.hidden = false;
    }
    document.getElementById("admin-create-name").value = "";
    document.getElementById("admin-create-email").value = "";
    document.getElementById("admin-create-password").value = "";
    document.getElementById("admin-create-display-name").value = "";
  } catch (err) {
    if (feedback) {
      feedback.textContent = err.message || "Could not create user.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create user";
    }
  }
}

function initAdminFeatures() {
  initAdminModals();
  renderAdminProfileSection();
}

// ── Session & Profile ───────────────────────────────────────────────────────

function getUserDisplayName(user) {
  return (user?.passrProfile?.displayName || user?.name || "").trim() || "Reader";
}

function getUserAvatarUrl(user) {
  return user?.passrProfile?.avatarUrl || null;
}

function getCommentDisplayName(comment) {
  return comment.authorProfile?.displayName || comment.authorName || "?";
}

function getCommentUserId(comment) {
  return comment.userId || comment.authorProfile?.userId || null;
}

function renderCommentAvatarHtml(comment) {
  const name = getCommentDisplayName(comment);
  const avatarUrl = comment.authorProfile?.avatarUrl;
  const userId = getCommentUserId(comment);
  const avatarInner = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="">`
    : escapeHtml((name || "?")[0].toUpperCase());
  const avatarClass = avatarUrl ? "comment-avatar comment-avatar-image" : "comment-avatar";

  if (userId) {
    return `<button type="button" class="${avatarClass} comment-profile-trigger" data-user-id="${escapeHtml(String(userId))}" aria-label="View ${escapeHtml(name)} profile">${avatarInner}</button>`;
  }
  return `<div class="${avatarClass}">${avatarInner}</div>`;
}

function renderCommentAuthorHtml(comment) {
  const name = getCommentDisplayName(comment);
  const userId = getCommentUserId(comment);
  if (userId) {
    return `<button type="button" class="comment-author comment-profile-trigger" data-user-id="${escapeHtml(String(userId))}">${escapeHtml(name)}</button>`;
  }
  return `<span class="comment-author">${escapeHtml(name)}</span>`;
}

function renderPublicProfileModal() {
  if (document.getElementById("public-profile-modal")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="modal-overlay" id="public-profile-modal" role="dialog" aria-modal="true" aria-labelledby="public-profile-name">
      <div class="modal-box profile-view-box">
        <button type="button" class="modal-close" id="public-profile-close" aria-label="Close">&times;</button>
        <div class="profile-view-header">
          <div class="profile-view-avatar" id="public-profile-avatar"></div>
          <div>
            <h2 class="modal-title" id="public-profile-name"></h2>
            <p class="profile-view-meta" id="public-profile-meta"></p>
          </div>
        </div>
        <p class="profile-view-bio" id="public-profile-bio"></p>
      </div>
    </div>
  `
  );
}

let _profileAvatarDataUrl = null;
let _profileRemoveAvatar = false;

function initProfileFeatures() {
  renderPublicProfileModal();

  document.getElementById("public-profile-close")?.addEventListener("click", hidePublicProfileModal);
  document.getElementById("public-profile-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "public-profile-modal") hidePublicProfileModal();
  });

  initProfileFormEvents();
}

function initProfileFormEvents() {
  const form = document.getElementById("profile-form");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  document.getElementById("profile-avatar-input")?.addEventListener("change", handleProfileAvatarSelect);
  document.getElementById("profile-remove-avatar")?.addEventListener("click", () => {
    _profileAvatarDataUrl = null;
    _profileRemoveAvatar = true;
    renderProfileAvatarPreview(_currentUser);
    document.getElementById("profile-remove-avatar").hidden = true;
  });

  const bioEl = document.getElementById("profile-bio");
  const bioCount = document.getElementById("profile-bio-count");
  bioEl?.addEventListener("input", () => {
    if (bioCount) bioCount.textContent = `${bioEl.value.length} / 280`;
  });

  form.addEventListener("submit", handleProfileSave);
  document.getElementById("profile-sign-out-btn")?.addEventListener("click", handleSignOut);
}

function populateProfileForm(user) {
  _currentUser = user;
  _profileAvatarDataUrl = null;
  _profileRemoveAvatar = false;

  const displayNameEl = document.getElementById("profile-display-name");
  const bioEl = document.getElementById("profile-bio");
  const feedback = document.getElementById("profile-feedback");
  const removeBtn = document.getElementById("profile-remove-avatar");

  if (displayNameEl) displayNameEl.value = getUserDisplayName(user);
  if (bioEl) {
    bioEl.value = (user.passrProfile?.bio || "").trim();
    const bioCount = document.getElementById("profile-bio-count");
    if (bioCount) bioCount.textContent = `${bioEl.value.length} / 280`;
  }
  if (feedback) feedback.hidden = true;
  if (removeBtn) removeBtn.hidden = !getUserAvatarUrl(user);

  renderProfileAvatarPreview(user);
  updateAdminProfileSectionVisibility();
}

function renderProfileAvatarPreview(user, previewUrl) {
  const preview = document.getElementById("profile-avatar-preview");
  if (!preview) return;

  const url = previewUrl || getUserAvatarUrl(user);
  const name = getUserDisplayName(user);
  if (url && !_profileRemoveAvatar) {
    preview.innerHTML = `<img src="${escapeHtml(url)}" alt="">`;
    preview.classList.add("has-image");
  } else {
    preview.textContent = (name || "?")[0].toUpperCase();
    preview.classList.remove("has-image");
  }
}

function showProfileModal() {
  window.location.href = "/profile";
}

async function showPublicProfileModal(userId) {
  if (!userId) return;

  const overlay = document.getElementById("public-profile-modal");
  const nameEl = document.getElementById("public-profile-name");
  const metaEl = document.getElementById("public-profile-meta");
  const bioEl = document.getElementById("public-profile-bio");
  const avatarEl = document.getElementById("public-profile-avatar");

  if (nameEl) nameEl.textContent = "Loading…";
  if (metaEl) metaEl.textContent = "";
  if (bioEl) bioEl.textContent = "";
  if (avatarEl) avatarEl.textContent = "…";
  overlay?.classList.add("open");

  try {
    const profile = await getPassrPublicProfile(userId);
    if (nameEl) nameEl.textContent = profile.displayName || "Reader";
    if (metaEl) {
      const joined = profile.memberSince
        ? `Member since ${new Date(profile.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
        : "";
      metaEl.textContent = joined;
    }
    if (bioEl) {
      bioEl.textContent = profile.bio || "This reader has not added a bio yet.";
      bioEl.classList.toggle("is-empty", !profile.bio);
    }
    if (avatarEl) {
      if (profile.avatarUrl) {
        avatarEl.innerHTML = `<img src="${escapeHtml(profile.avatarUrl)}" alt="">`;
        avatarEl.classList.add("has-image");
      } else {
        avatarEl.textContent = (profile.displayName || "?")[0].toUpperCase();
        avatarEl.classList.remove("has-image");
      }
    }
  } catch (err) {
    if (nameEl) nameEl.textContent = "Profile unavailable";
    if (bioEl) bioEl.textContent = err.message || "Could not load this profile.";
  }
}

function hidePublicProfileModal() {
  document.getElementById("public-profile-modal")?.classList.remove("open");
}

function handleProfileAvatarSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 512 * 1024) {
    alert("Please choose an image 512KB or smaller.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    _profileAvatarDataUrl = reader.result;
    _profileRemoveAvatar = false;
    renderProfileAvatarPreview(_currentUser, _profileAvatarDataUrl);
    const removeBtn = document.getElementById("profile-remove-avatar");
    if (removeBtn) removeBtn.hidden = false;
  };
  reader.readAsDataURL(file);
}

async function handleProfileSave(e) {
  e.preventDefault();
  const displayName = document.getElementById("profile-display-name")?.value.trim();
  const bio = document.getElementById("profile-bio")?.value.trim() || "";
  const feedback = document.getElementById("profile-feedback");
  const saveBtn = document.getElementById("profile-save-btn");

  if (!displayName) {
    if (feedback) {
      feedback.textContent = "Display name is required.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
    }
    return;
  }

  const payload = { displayName, bio };
  if (_profileRemoveAvatar) payload.removeAvatar = true;
  else if (_profileAvatarDataUrl) payload.avatarDataUrl = _profileAvatarDataUrl;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
  }

  try {
    const user = await updatePassrProfile(payload);
    _currentUser = user;
    setStoredUser(user);
    await refreshSessionUI();
    if (_currentSlug) await refreshComments(_currentSlug);
    if (feedback) {
      feedback.textContent = "Profile saved.";
      feedback.className = "form-feedback form-feedback-success";
      feedback.hidden = false;
    }
  } catch (err) {
    if (feedback) {
      feedback.textContent = err.message || "Could not save profile.";
      feedback.className = "form-feedback form-feedback-error";
      feedback.hidden = false;
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save profile";
    }
  }
}

async function handleSignOut() {
  await logoutUser();
  _currentUser = null;
  if (document.body.dataset.page === "profile") {
    window.location.href = "/";
    return;
  }
  await refreshSessionUI();
  if (_currentSlug) await refreshComments(_currentSlug);
}

async function refreshSessionUI() {
  const headerActions = document.querySelector(".header-actions");
  const mobileLinks = document.querySelector(".mobile-nav-links");
  if (!headerActions) return;

  let user = _currentUser;
  if (!user) {
    try {
      user = await getCurrentUser();
    } catch (_) {
      user = getStoredUser();
    }
  }
  _currentUser = user;

  document.getElementById("header-auth-slot")?.remove();
  document.getElementById("mobile-profile-link")?.remove();
  document.getElementById("mobile-sign-in-link")?.remove();

  if (user) {
    const slot = document.createElement("div");
    slot.id = "header-auth-slot";
    slot.className = "header-auth-slot";
    const avatarUrl = getUserAvatarUrl(user);
    const name = getUserDisplayName(user);
    const avatarMarkup = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="" class="header-profile-avatar">`
      : `<span class="header-profile-initial">${escapeHtml(name[0].toUpperCase())}</span>`;
    slot.innerHTML = `
      <a href="/profile" class="header-profile-btn" id="header-profile-btn">
        ${avatarMarkup}
        <span class="header-profile-label">My Profile</span>
      </a>
    `;
    headerActions.insertBefore(slot, headerActions.firstChild);

    if (mobileLinks) {
      const mobileProfile = document.createElement("a");
      mobileProfile.href = "/profile";
      mobileProfile.id = "mobile-profile-link";
      mobileProfile.className = "mobile-nav-profile";
      mobileProfile.textContent = "My Profile";
      mobileProfile.addEventListener("click", () => {
        document.querySelector(".mobile-nav")?.classList.remove("open");
      });
      mobileLinks.insertBefore(mobileProfile, mobileLinks.firstChild);
    }
  } else {
    const slot = document.createElement("div");
    slot.id = "header-auth-slot";
    slot.className = "header-auth-slot";
    slot.innerHTML = `<a href="/login" class="btn btn-ghost header-sign-in-btn">Sign in</a>`;
    headerActions.insertBefore(slot, headerActions.firstChild);

    if (mobileLinks) {
      const mobileSignIn = document.createElement("a");
      mobileSignIn.href = "/login";
      mobileSignIn.id = "mobile-sign-in-link";
      mobileSignIn.className = "mobile-nav-sign-in";
      mobileSignIn.textContent = "Sign in";
      mobileSignIn.addEventListener("click", () => {
        document.querySelector(".mobile-nav")?.classList.remove("open");
      });
      mobileLinks.insertBefore(mobileSignIn, mobileLinks.firstChild);
    }
  }

  updateCommentForm();
  updateAdminProfileSectionVisibility();
  if (_currentSlug && document.getElementById("comments-list")) {
    refreshComments(_currentSlug);
  }
}

async function initSessionUI() {
  await refreshSessionUI();
}
