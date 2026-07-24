import { promises as fs } from "node:fs";
import path from "node:path";

import react from "@vitejs/plugin-react";
import { glob } from "glob";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";

// Copy plain CSS files from src/ to dist/ at the same relative path.
// Vite's lib mode only emits JS for the glob'd .ts/.tsx entries; per-component
// CSS (Accordion.css, etc.) and the aggregator (styles.css) need to ship too.
function copyCssAssets(): Plugin {
  return {
    name: "copy-css-assets",
    apply: "build",
    async closeBundle() {
      const files = await glob("src/**/*.css");
      await Promise.all(
        files.map(async (file) => {
          const dest = path.join("dist", path.relative("src", file));
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(file, dest);
        }),
      );
    },
  };
}

// Library mode build for @batthewz/response-ui-react-components.
// - ESM only (no CJS).
// - preserveModules so consumers can subpath-import individual components
//   (`@batthewz/response-ui-react-components/components/Button`) for tree-shaking.
// - All peer/non-bundled deps externalised.
// - vite-plugin-dts emits .d.ts files alongside.

const entries = Object.fromEntries(
  glob
    .sync("src/**/*.{ts,tsx}", {
      ignore: ["src/**/*.test.{ts,tsx}", "src/**/*.examples.{ts,tsx}", "src/**/*.d.ts"],
    })
    .map((file) => [
      // entry name = path relative to src, without extension
      path.relative("src", file.slice(0, file.length - path.extname(file).length)),
      path.resolve(file),
    ]),
);

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src/**/*"],
      exclude: ["src/**/*.test.*", "src/**/*.examples.*"],
      rollupTypes: false,
      entryRoot: "src",
      outDir: "dist",
      // .d.ts.map files let consumers' go-to-definition land in the real
      // source — `src/` ships in the npm package alongside `dist/`.
      compilerOptions: { declarationMap: true },
    }),
    copyCssAssets(),
  ],
  build: {
    lib: {
      entry: entries,
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        /^@floating-ui\/.+/,
        /^lucide-react($|\/)/,
        "clsx",
        "tailwind-merge",
        /^@batthewz\/response-ui-tw-merge($|\/)/,
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    minify: false,
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
});
