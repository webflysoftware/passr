module.exports = {
  apps: [
    {
      name: "passr-api",
      script: "src/index.js",
      cwd: "/opt/passr-api",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
