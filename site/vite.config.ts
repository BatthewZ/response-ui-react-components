import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// The PUBLIC documentation site. Separate from dev/, which is a scratch harness
// and stays private: this one is built, deployed, and linked to.
//
// Like dev/, it imports the library from SOURCE (../src) rather than a build, so
// what the site renders is what the repo currently is. Nothing here ships to npm —
// package.json's `files` allowlist names dist/src/docs, not site/.

const root = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = fileURLToPath(new URL("../site-dist", import.meta.url));

// GitHub Pages serves a project site under /<repo>/, so assets and routes are
// prefixed. `SITE_BASE=/ bun run site:build` targets a root-hosted deploy instead.
const base = process.env.SITE_BASE ?? "/response-ui-react-components/";

/**
 * Clean URLs on a static host. GitHub Pages has no rewrite rules, so a direct hit
 * on /components/card looks for a file that was never emitted and 404s. Pages serves
 * 404.html for every miss, so a byte copy of index.html there boots the app at the
 * requested path — the router reads location and renders the right page.
 *
 * .nojekyll stops Pages running the built output through Jekyll, which would drop
 * any future underscore-prefixed asset without saying so.
 */
function githubPagesFallback(): Plugin {
  return {
    name: "site-github-pages-fallback",
    apply: "build",
    closeBundle() {
      copyFileSync(join(outDir, "index.html"), join(outDir, "404.html"));
      writeFileSync(join(outDir, ".nojekyll"), "");
    },
  };
}

export default defineConfig({
  root,
  base,
  plugins: [react(), tailwindcss(), githubPagesFallback()],
  build: { outDir, emptyOutDir: true },
  server: {
    port: 5180,
    strictPort: true,
    // root is site/; allow reading ../src, ../docs and the sibling css package.
    fs: { allow: [repoRoot, fileURLToPath(new URL("../..", import.meta.url))] },
  },
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { exclude: ["@batthewz/response-ui-react-components"] },
});
