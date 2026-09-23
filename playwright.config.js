const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "npm run build && ./scripts/bend tests/progression.html -o dist && npm run serve",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30_000
  }
});
