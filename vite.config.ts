import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import {
  SEO_PAGES,
  buildRobotsTxt,
  buildSitemapXml,
  prerenderPage,
} from "./src/lib/seo";

/**
 * Writes one HTML file per indexable page, with its own metadata and text
 * already in place, plus robots.txt and sitemap.xml. Crawlers get real content
 * without running the app.
 */
function seoPages(): Plugin {
  return {
    name: "ferjetider-seo-pages",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (!index || index.type !== "asset" || typeof index.source !== "string") {
        throw new Error("seo-pages: built index.html not found");
      }
      const template = index.source;

      for (const page of SEO_PAGES) {
        const html = prerenderPage(template, page);
        if (page.path === "/") {
          index.source = html;
        } else {
          this.emitFile({
            type: "asset",
            fileName: `${page.path.slice(1)}/index.html`,
            source: html,
          });
        }
      }

      const buildDate = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: buildSitemapXml(buildDate) });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: buildRobotsTxt() });
    },
  };
}

export default defineConfig({
  plugins: [react(), seoPages()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}", "api/**/*.ts"],
    },
  },
});
