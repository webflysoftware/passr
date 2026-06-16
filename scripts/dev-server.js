#!/usr/bin/env node
/**
 * Local static file server with /api proxy (mirrors nginx passr.net routing).
 * Used by PM2 as passr-fe.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.FE_PORT || 8080);
const API_TARGET = process.env.API_TARGET || "http://127.0.0.1:3010";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

function safeResolve(urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const normalized = pathname.replace(/\/+/g, "/") || "/";

  if (normalized === "/") {
    return path.join(ROOT, "index.html");
  }

  const articleMatch = normalized.match(/^\/article\/([a-z0-9-]+)\/?$/i);
  if (articleMatch) {
    const articleIndex = path.join(ROOT, "article", articleMatch[1], "index.html");
    if (fs.existsSync(articleIndex)) return articleIndex;
    const fallback = path.join(ROOT, "article.html");
    if (fs.existsSync(fallback)) return fallback;
    return null;
  }

  const relative = normalized.replace(/^\//, "");
  const candidates = [
    path.join(ROOT, relative),
    `${path.join(ROOT, relative)}.html`,
    path.join(ROOT, relative, "index.html"),
  ];

  for (const candidate of candidates) {
    if (!candidate.startsWith(ROOT)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function proxyApi(req, res) {
  const target = new URL(req.url, API_TARGET);
  const headers = { ...req.headers, host: target.host };

  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (err) => {
    console.error("[passr-fe] API proxy error:", err.message);
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("API unavailable — is passr-be running?");
  });

  req.pipe(proxyReq);
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal server error");
      return;
    }

    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": ext === ".html" || ext === ".js" || ext === ".css" ? "no-cache" : "public, max-age=3600",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  if (req.url.startsWith("/api")) {
    proxyApi(req, res);
    return;
  }

  const filePath = safeResolve(req.url);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  serveFile(filePath, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`passr-fe listening on http://127.0.0.1:${PORT} (API → ${API_TARGET})`);
});
