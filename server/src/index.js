import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeDb, connectDb } from "./db.js";

const app = createApp();

async function start() {
  await connectDb();

  const server = app.listen(config.port, config.host, () => {
    console.info(
      "[passr-api] listening",
      JSON.stringify({
        url: `http://${config.host}:${config.port}`,
        pid: process.pid,
        mailProvider: config.postmarkApiToken ? "postmark" : config.smtpHost ? "smtp" : "none",
        mailFrom: config.mailFrom,
        siteUrl: config.siteUrl,
      })
    );
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down…`);
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("Failed to start passr-api:", err);
  process.exit(1);
});
