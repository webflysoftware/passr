#!/usr/bin/env node
/**
 * Static site generation for PASSR articles.
 * Generates pre-rendered HTML, LLM-readable JSON sidecars, sitemap, and catalog index.
 *
 * Usage: node scripts/build-ssg.js [--version=20260614j]
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://passr.net";
const BUILD_VERSION = process.argv.find((a) => a.startsWith("--version="))?.split("=")[1] || "20260614j";

const HERO_ALTS = {
  "end-of-vibe-coding": "Developer at a laptop with AI-generated code on screen",
  "top-trivia-hosting-platforms-2026": "People playing trivia at a live event",
  "top-digital-voting-platforms-2026": "Hand placing a ballot into a voting box",
};

function loadSiteVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  if (!pkg.version) {
    throw new Error("package.json is missing a version field");
  }
  return pkg.version;
}

function footerBottomHtml(siteVersion) {
  return `<div class="footer-bottom">&copy; 2026 PASSR. All rights reserved. <span class="site-version">v${escapeHtml(siteVersion)}</span></div>`;
}

const STATIC_PAGES = [
  "index.html",
  "about.html",
  "contact.html",
  "topic.html",
  "article.html",
  "login.html",
  "forgot-password.html",
  "reset-password.html",
  "profile.html",
];
const FOOTER_BOTTOM_RE = /<div class="footer-bottom">&copy; 2026 PASSR\. All rights reserved\.(?:\s*<span class="site-version">v[^<]+<\/span>)?<\/div>/;

function syncStaticPageFooters(siteVersion) {
  const footerHtml = footerBottomHtml(siteVersion);
  for (const file of STATIC_PAGES) {
    const filePath = path.join(ROOT, file);
    const html = fs.readFileSync(filePath, "utf8");
    if (!FOOTER_BOTTOM_RE.test(html)) {
      throw new Error(`Could not update footer in ${file}`);
    }
    fs.writeFileSync(filePath, html.replace(FOOTER_BOTTOM_RE, footerHtml));
  }
}

function loadCatalog() {
  const code = fs.readFileSync(path.join(ROOT, "js/articles.js"), "utf8");
  return new Function(`${code}\nreturn { ARTICLES, AUTHORS, CATEGORIES, getCategoryLabel, formatDate };`)();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function readTimeMinutes(readTime) {
  const match = String(readTime || "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function isoDuration(readTime) {
  const minutes = readTimeMinutes(readTime);
  return minutes ? `PT${minutes}M` : undefined;
}

function absoluteUrl(relativePath) {
  if (!relativePath) return `${SITE_URL}/`;
  if (relativePath.startsWith("http")) return relativePath;
  return SITE_URL + (relativePath.startsWith("/") ? relativePath : `/${relativePath}`);
}

function extractHeadings(html) {
  const headings = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let match;
  while ((match = re.exec(html))) {
    const text = stripHtml(match[1]);
    if (text) headings.push(text);
  }
  return headings;
}

function generateKeywords(article, categoryLabel) {
  const fromSlug = article.slug.split("-").filter((w) => w.length > 2);
  const fromTitle = article.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["with", "that", "this", "from", "your", "what", "when", "they", "have", "into"].includes(w));
  const base = [categoryLabel.toLowerCase(), ...fromSlug, ...fromTitle];
  return [...new Set(base.map((k) => k.trim()).filter(Boolean))].slice(0, 14);
}

function generateAbstract(article, bodyText, existingAbstract) {
  if (existingAbstract) return existingAbstract;
  const excerpt = article.excerpt.trim();
  const extra = bodyText.slice(0, 600);
  const combined = `${excerpt} ${extra}`.trim();
  if (combined.length <= 520) return combined;
  const cut = combined.slice(0, 520);
  const lastPeriod = cut.lastIndexOf(". ");
  return (lastPeriod > 200 ? cut.slice(0, lastPeriod + 1) : cut.trim()) + (cut.endsWith(".") ? "" : "…");
}

function loadExistingSidecar(slug) {
  const filePath = path.join(ROOT, "data/articles", `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getExistingBlogPosting(sidecar) {
  if (!sidecar?.["@graph"]) return null;
  return sidecar["@graph"].find((node) => node["@type"] === "BlogPosting") || null;
}

function renderArticleMeta(article, author, formatDate) {
  return `
    <div class="article-meta">
      <span class="author">
        <img class="author-avatar" src="${author.avatar}" alt="${escapeAttr(author.name)}" width="28" height="28">
        ${escapeHtml(author.name)}
      </span>
      <span class="meta-dot">${formatDate(article.date)}</span>
      <span>${escapeHtml(article.readTime)}</span>
    </div>
  `;
}

function renderArticleShare(article) {
  const url = absoluteUrl(`/article/${article.slug}`);
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

function renderArticleInner(article, author, getCategoryLabel, formatDate) {
  const heroAlt = HERO_ALTS[article.slug] || article.title;
  return `
    <header class="article-header">
      <a href="/topic.html?category=${article.category}" class="tag">${escapeHtml(getCategoryLabel(article.category))}</a>
      <h1>${escapeHtml(article.title)}</h1>
      <p class="subtitle">${escapeHtml(article.subtitle)}</p>
      ${renderArticleMeta(article, author, formatDate)}
    </header>
    <figure class="hero-image">
      <img src="${escapeAttr(article.image)}" alt="${escapeAttr(heroAlt)}" width="1200" height="640">
    </figure>
    <div class="article-body">${article.body.trim()}</div>
    <footer class="article-footer">
      <div class="author-bio">
        <img class="author-avatar" src="${author.avatar}" alt="${escapeAttr(author.name)}" width="56" height="56">
        <div>
          <h4>${escapeHtml(author.name)}</h4>
          <p>${escapeHtml(author.bio)}</p>
        </div>
      </div>
      ${renderArticleShare(article)}
    </footer>
  `.trim();
}

function buildArticleJson(article, author, getCategoryLabel) {
  const existingSidecar = loadExistingSidecar(article.slug);
  const existingPosting = getExistingBlogPosting(existingSidecar);
  const categoryLabel = getCategoryLabel(article.category);
  const articleUrl = `${SITE_URL}/article/${article.slug}`;
  const jsonUrl = `${SITE_URL}/data/articles/${article.slug}.json`;
  const imageUrl = absoluteUrl(article.image);
  const bodyText = stripHtml(article.body);
  const minutes = readTimeMinutes(article.readTime);
  const abstract = generateAbstract(article, bodyText, existingPosting?.abstract);
  const keywords = existingPosting?.keywords || generateKeywords(article, categoryLabel);
  const outline = extractHeadings(article.body);

  const blogPosting = {
    "@type": "BlogPosting",
    "@id": `${articleUrl}#article`,
    headline: article.title,
    alternativeHeadline: article.subtitle,
    description: article.excerpt,
    abstract,
    url: articleUrl,
    image: imageUrl,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: "en-US",
    articleSection: categoryLabel,
    articleBody: bodyText,
    wordCount: wordCount(bodyText),
    author: {
      "@type": "Person",
      name: author.name,
      jobTitle: author.role,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    isPartOf: { "@id": `${SITE_URL}/#blog` },
    keywords,
  };

  if (minutes) blogPosting.timeRequired = isoDuration(article.readTime);

  for (const field of ["about", "mentions", "hasPart", "mainEntity", "recommendationSummary"]) {
    if (existingPosting?.[field]) blogPosting[field] = existingPosting[field];
  }

  if (!blogPosting.about) {
    blogPosting.about = [{ "@type": "Thing", name: categoryLabel }];
  }

  const sidecar = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "PASSR",
        url: `${SITE_URL}/`,
      },
      blogPosting,
    ],
    llm: {
      version: 1,
      contentUrl: jsonUrl,
      htmlUrl: articleUrl,
      articleBodyHtml: article.body.trim(),
      articleBodyText: bodyText,
      outline,
      readingTimeMinutes: minutes,
      excerpt: article.excerpt,
      category: categoryLabel,
      author: author.name,
    },
  };

  return { sidecar, blogPosting, heroAlt: HERO_ALTS[article.slug] || article.title };
}

function buildInlineJsonLd(blogPosting) {
  const inline = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "PASSR",
        url: `${SITE_URL}/`,
      },
      {
        "@type": "BlogPosting",
        "@id": blogPosting["@id"],
        headline: blogPosting.headline,
        alternativeHeadline: blogPosting.alternativeHeadline,
        description: blogPosting.description,
        url: blogPosting.url,
        image: blogPosting.image,
        datePublished: blogPosting.datePublished,
        dateModified: blogPosting.dateModified,
        inLanguage: blogPosting.inLanguage,
        articleSection: blogPosting.articleSection,
        author: blogPosting.author,
        publisher: blogPosting.publisher,
        isPartOf: blogPosting.isPartOf,
        keywords: blogPosting.keywords,
      },
    ],
  };
  return JSON.stringify(inline, null, 2);
}

function buildArticleHtml(article, author, getCategoryLabel, formatDate, innerHtml, blogPosting, heroAlt, siteVersion) {
  const pageUrl = `${SITE_URL}/article/${article.slug}`;
  const imageUrl = absoluteUrl(article.image);
  const jsonSidecar = `/data/articles/${article.slug}.json`;
  const heroAltJson = JSON.stringify(heroAlt);
  const mountOptions = HERO_ALTS[article.slug]
    ? `\n        heroAlt: ${heroAltJson},`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17592266250"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-17592266250');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(article.title)} — PASSR</title>
  <meta name="description" content="${escapeAttr(article.excerpt)}" />
  <meta name="robots" content="index, follow">
  <meta name="author" content="${escapeAttr(author.name)}">
  <meta name="theme-color" content="#1c1c1c">
  <link rel="canonical" href="${pageUrl}">
  <link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/images/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="PASSR">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="${escapeAttr(article.title)}">
  <meta property="og:description" content="${escapeAttr(article.excerpt)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="article:published_time" content="${article.date}">
  <meta property="article:author" content="${escapeAttr(author.name)}">
  <meta property="article:section" content="${escapeAttr(getCategoryLabel(article.category))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(article.title)}">
  <meta name="twitter:description" content="${escapeAttr(article.excerpt)}">
  <meta name="twitter:image" content="${imageUrl}">
  <link rel="alternate" type="application/json" href="${jsonSidecar}" title="Article structured data for machines">
  <script type="application/ld+json">
  ${buildInlineJsonLd(blogPosting)}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css?v=${BUILD_VERSION}">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="/" class="logo">PASS<span>R</span></a>
      <nav class="site-nav">
        <a href="/" data-nav="home">Home</a>
        <a href="/topic.html" data-nav="topics">Topics</a>
        <a href="/about.html" data-nav="about">About</a>
        <a href="/contact" data-nav="contact">Contact</a>
      </nav>
      <div class="header-actions">
        <button type="button" class="btn btn-primary subscribe-trigger">Subscribe</button>
        <button class="menu-toggle" aria-label="Open menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </div>
  </header>

  <nav class="mobile-nav" aria-hidden="true">
    <div class="mobile-nav-header">
      <a href="/" class="logo">PASS<span>R</span></a>
      <button class="mobile-nav-close" aria-label="Close menu">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="mobile-nav-links">
      <a href="/">Home</a>
      <a href="/topic.html">Topics</a>
      <a href="/about.html">About</a>
      <a href="/contact">Contact</a>
      <button type="button" class="mobile-nav-subscribe subscribe-trigger">Subscribe</button>
    </div>
  </nav>

  <main id="article-content">
    <article class="article-page">
      <div class="container-narrow" id="article-inner" data-ssg-prerendered="true">
${innerHtml.split("\n").map((line) => (line ? `        ${line}` : "")).join("\n")}
      </div>

      <div class="container-narrow" id="comments-container">
        <section class="comments-section" id="comments-section">
          <h3>Discussion<span class="comment-count" id="comment-count"></span></h3>
          <div class="comment-form-wrapper">
            <form class="comment-form" id="comment-form" onsubmit="return false;">
              <textarea id="comment-body" placeholder="Share your thoughts…" maxlength="2000"></textarea>
              <div class="comment-form-footer">
                <span class="char-count" id="comment-char-count">0 / 2000</span>
                <button type="button" class="comment-submit-btn" id="comment-submit-btn">Post Comment</button>
              </div>
            </form>
          </div>
          <div id="comments-list" class="comments-list"></div>
        </section>
      </div>
    </article>
    <section class="related" id="related-section" hidden>
      <div class="container">
        <div class="section-header">
          <h2>More in this topic</h2>
        </div>
        <div class="article-grid" id="related-grid"></div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="logo">PASS<span>R</span></a>
          <p>Practical engineering writing for teams building reliable systems.</p>
        </div>
        <div class="footer-col">
          <h4>Topics</h4>
          <ul id="footer-topics"></ul>
        </div>
        <div class="footer-col">
          <h4>Publication</h4>
          <ul>
            <li><a href="/about.html">About</a></li>
            <li><a href="/contact">Contact</a></li>
            <li><a href="#">Write for PASSR</a></li>
            <li><a href="#">RSS Feed</a></li>
          </ul>
        </div>
      </div>
      ${footerBottomHtml(siteVersion)}
    </div>
  </footer>

  <script src="/js/articles.js?v=${BUILD_VERSION}"></script>
  <script src="/js/seo.js?v=${BUILD_VERSION}"></script>
  <script src="/js/api.js?v=${BUILD_VERSION}"></script>
  <script src="/js/main.js?v=${BUILD_VERSION}"></script>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      mountArticlePage("${article.slug}", {${mountOptions}
      });
    });
  </script>
</body>
</html>
`;
}

function buildSitemap(articles) {
  const latestDate = articles.reduce((max, a) => (a.date > max ? a.date : max), "2026-06-01");
  const staticPages = [
    { loc: `${SITE_URL}/`, lastmod: latestDate, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/about.html`, lastmod: latestDate, changefreq: "monthly", priority: "0.5" },
    { loc: `${SITE_URL}/contact`, changefreq: "monthly", priority: "0.6" },
    { loc: `${SITE_URL}/topic.html`, lastmod: latestDate, changefreq: "weekly", priority: "0.6" },
    { loc: `${SITE_URL}/login`, changefreq: "monthly", priority: "0.3" },
  ];

  const articleUrls = [...articles]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((article) => ({
      loc: `${SITE_URL}/article/${article.slug}`,
      lastmod: article.date,
      changefreq: "monthly",
      priority: "0.8",
    }));

  const urls = [...staticPages, ...articleUrls];
  const body = urls
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : "";
      return `  <url>
    <loc>${entry.loc}</loc>${lastmod}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function buildArticlesIndex(articles, getCategoryLabel) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "PASSR Articles",
    url: `${SITE_URL}/data/articles/`,
    description: "Machine-readable catalog of PASSR engineering articles with JSON sidecars for each post.",
    isPartOf: { "@id": `${SITE_URL}/#blog` },
    numberOfItems: articles.length,
    hasPart: [...articles]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((article) => ({
        "@type": "BlogPosting",
        "@id": `${SITE_URL}/article/${article.slug}#article`,
        headline: article.title,
        url: `${SITE_URL}/article/${article.slug}`,
        datePublished: article.date,
        articleSection: getCategoryLabel(article.category),
        contentUrl: `${SITE_URL}/data/articles/${article.slug}.json`,
      })),
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  const siteVersion = loadSiteVersion();
  const { ARTICLES, AUTHORS, getCategoryLabel, formatDate } = loadCatalog();
  const dataArticlesDir = path.join(ROOT, "data/articles");
  ensureDir(dataArticlesDir);

  console.log(`Building ${ARTICLES.length} articles (version ${BUILD_VERSION}, site v${siteVersion})…`);

  for (const article of ARTICLES) {
    const author = AUTHORS[article.author];
    if (!author) {
      throw new Error(`Missing author "${article.author}" for ${article.slug}`);
    }

    const innerHtml = renderArticleInner(article, author, getCategoryLabel, formatDate);
    const { sidecar, blogPosting } = buildArticleJson(article, author, getCategoryLabel);
    const html = buildArticleHtml(article, author, getCategoryLabel, formatDate, innerHtml, blogPosting, HERO_ALTS[article.slug] || article.title, siteVersion);

    const articleDir = path.join(ROOT, "article", article.slug);
    ensureDir(articleDir);
    fs.writeFileSync(path.join(articleDir, "index.html"), html);
    fs.writeFileSync(path.join(dataArticlesDir, `${article.slug}.json`), `${JSON.stringify(sidecar, null, 2)}\n`);

    console.log(`  ✓ ${article.slug}`);
  }

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), buildSitemap(ARTICLES));
  fs.writeFileSync(
    path.join(dataArticlesDir, "index.json"),
    `${JSON.stringify(buildArticlesIndex(ARTICLES, getCategoryLabel), null, 2)}\n`
  );

  syncStaticPageFooters(siteVersion);

  console.log(`Done. Generated ${ARTICLES.length} pages, ${ARTICLES.length} JSON sidecars, sitemap, and catalog index.`);
}

main();
