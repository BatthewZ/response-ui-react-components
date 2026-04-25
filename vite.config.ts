import path from "node:path";

import react from "@vitejs/plugin-react";
import { glob } from "glob";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// Library mode build for @batthewz/response-ui-react-components.
// - ESM only (no CJS).
// - preserveModules so consumers can subpath-import individual components
//   (`@batthewz/response-ui-react-components/components/Button`) for tree-shaking.
// - All peer/non-bundled deps externalised.
// - vite-plugin-dts emits .d.ts files alongside.

const entries = Object.fromEntries(
  glob
    .sync("src/**/*.{ts,tsx}", {
      ignore: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
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
      exclude: ["src/**/*.test.*"],
      rollupTypes: false,
      entryRoot: "src",
      outDir: "dist",
    }),
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
