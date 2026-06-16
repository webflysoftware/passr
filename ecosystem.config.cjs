const path = require("path");

const root = __dirname;
const fePort = process.env.FE_PORT || 8080;
const bePort = process.env.PORT || 3010;

module.exports = {
  apps: [
    {
      name: "passr-be",
      script: "src/index.js",
      cwd: path.join(root, "server"),
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "development",
        PORT: String(bePort),
        HOST: "127.0.0.1",
      },
    },
    {
      name: "passr-fe",
      script: "scripts/dev-server.js",
      cwd: root,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "128M",
      merge_logs: true,
      time: true,
      env: {
        FE_PORT: String(fePort),
        API_TARGET: `http://127.0.0.1:${bePort}`,
      },
    },
  ],
};
