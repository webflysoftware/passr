import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import passrRoutes from "./routes/passr.routes.js";
import commentsRoutes from "./routes/comments.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

function requestLogger(req, res, next) {
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  const started = Date.now();
  res.on("finish", () => {
    console.info(
      "[http]",
      JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - started,
      })
    );
  });

  next();
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "passr-api" });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/passr", passrRoutes);
  app.use("/api/v1/comments", commentsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
