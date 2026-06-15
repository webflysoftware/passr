export function notFoundHandler(_req, res) {
  res.status(404).json({ code: 404, message: "Not found" });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || "Internal server error";

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ code: status, message });
}
