import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// DEV-ONLY gallery harness. This config is intentionally separate from the
// repo-root vite.config.ts, which is LIBRARY mode (no dev server). Here we run
// a normal Vite app that imports the library from SOURCE (../src) so edits are
// reflected live without a build step.
//
// Nothing in dev/ ships to npm — the package.json `files` allowlist only
// includes dist/src/docs/etc., not dev/.

const root = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  root,
  plugins: [
    react(),
    // Tailwind v4. Content scanning is driven by the `@source` directives in
    // dev/styles.css (the gallery's own files) plus the self-relative `@source`
    // inside ../src/styles.css (the library's sources), so every utility class
    // used in either the gallery or the components is generated.
    tailwindcss(),
  ],
  server: {
    port: 5179,
    strictPort: true,
    fs: {
      // root is dev/; allow reading the library source and css deps one level up.
      allow: [repoRoot],
    },
  },
  resolve: {
    // Single React copy across the linked source + the host app.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // The library is consumed as raw source TSX, not a pre-bundled dep.
    exclude: ["@batthewz/response-ui-react-components"],
  },
});
