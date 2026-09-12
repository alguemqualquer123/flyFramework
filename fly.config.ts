import { defineConfig } from "./src/core/config.ts";

export default defineConfig({
  appDir: new URL("./examples/app", import.meta.url).pathname,
  siteUrl: "https://fly.dev",
  adapter: "node",
});
