// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://zip.jamesventura.dev",
  output: "server",
  adapter: vercel(),
});
