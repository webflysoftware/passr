import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeDb, connectDb } from "./db.js";

const app = createApp();

async function start() {
  await connectDb();

  const server = app.listen(config.port, config.host, () => {
    console.log(`passr-api listening on http://${config.host}:${config.port}`);
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
