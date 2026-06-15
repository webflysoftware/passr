const SITE = {
  name: "PASSR",
  url: "https://passr.net",
  tagline: "Engineering writing on systems, APIs, and infrastructure",
  description:
    "PASSR publishes practical engineering writing on backend systems, databases, security, infrastructure, and the tools teams use in production.",
  locale: "en_US",
  themeColor: "#1c1c1c",
};

function absoluteUrl(path) {
  if (!path) return SITE.url + "/";
  if (path.startsWith("http")) return path;
  return SITE.url + (path.startsWith("/") ? path : "/" + path);
}

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function applySiteIcons() {
  upsertLink("icon", "/images/favicon.svg");
  upsertLink("icon", "/images/favicon-32.png");
  upsertLink("apple-touch-icon", "/images/apple-touch-icon.png");
  upsertLink("manifest", "/site.webmanifest");
}

function applyArticleSeo(article) {
  if (!article) return;

  const author = AUTHORS[article.author];
  const url = absoluteUrl("/article/" + article.slug);
  const image = absoluteUrl(article.image);
  const pageTitle = `${article.title} — PASSR`;

  document.title = pageTitle;
  upsertMeta("name", "description", article.excerpt);
  upsertMeta("name", "robots", "index, follow");
  upsertLink("canonical", url);

  upsertMeta("property", "og:type", "article");
  upsertMeta("property", "og:site_name", SITE.name);
  upsertMeta("property", "og:locale", SITE.locale);
  upsertMeta("property", "og:title", article.title);
  upsertMeta("property", "og:description", article.excerpt);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "article:published_time", article.date);
  upsertMeta("property", "article:author", author.name);
  upsertMeta("property", "article:section", getCategoryLabel(article.category));

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", article.title);
  upsertMeta("name", "twitter:description", article.excerpt);
  upsertMeta("name", "twitter:image", image);

  upsertJsonLd("jsonld-article", {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: [image],
    datePublished: article.date,
    dateModified: article.date,
    author: {
      "@type": "Person",
      name: author.name,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  });
}

function getArticleSlugFromLocation() {
  const querySlug = new URLSearchParams(window.location.search).get("slug");
  if (querySlug) return querySlug;
  return window.location.pathname.match(/^\/article\/([^/]+)\/?$/)?.[1] || null;
}

function initArticleSeo() {
  applySiteIcons();
  const slug = getArticleSlugFromLocation();
  if (slug) applyArticleSeo(getArticle(slug));
}

if (typeof module !== "undefined") module.exports = { SITE, absoluteUrl, applyArticleSeo, applySiteIcons, initArticleSeo };
