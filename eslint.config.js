import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Deliberately narrow: three rules, each tied to a defect class in `bugs/LEDGER.md`
 * or in `memory/gates.md`.
 * The recommended presets (typescript-eslint, react/recommended) are not enabled —
 * they would bury these signals under hundreds of stylistic findings.
 *
 * Scope is `src/` and `site/`; `dev/` is a scratch harness and `scripts/` is plain Node.
 * `site/` is in because it is published — it builds the documentation site from `../src`,
 * and it maps over ~90 components, which is the shape `jsx-key` exists to catch.
 */
export default tseslint.config(
  // The project rule is "never suppress, only fix". `noInlineConfig` enforces it
  // mechanically: an `eslint-disable` comment cannot silence anything, and ESLint
  // reports the dead directive, so `--max-warnings 0` rejects it.
  { linterOptions: { noInlineConfig: true } },
  { ignores: ["dist/**", "node_modules/**", "dev/**", "scripts/**"] },
  {
    files: ["src/**/*.{ts,tsx}", "site/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      // Missing keys in an iterator: ledger #138, #179, #254, #272.
      "react/jsx-key": ["error", { checkFragmentShorthand: true }],
      // A profiling bypass — `return …; // TEMP-AB-BYPASS` on the first line of a
      // memoizing helper — shipped in `util/date.ts`, making the whole cache body
      // unreachable. Nothing caught it: the tests assert output and a bypassed
      // cache returns identical output, `tsc` treats unreachable code as an editor
      // suggestion rather than an error, and it survived human review by falling in
      // the seam between two windowed reads of the diff. This is the cheapest gate
      // that would have, it needs no configuration, and unreachable code is a
      // defect rather than a style opinion — so it earns its place under this
      // file's own rule, one entry per defect class that actually occurred.
      "no-unreachable": "error",
      // ~80 components built on useEffect/useCallback/useMemo; a conditional hook
      // corrupts hook order for every render after it.
      "react-hooks/rules-of-hooks": "error",
      // NOT enabled: react-hooks/exhaustive-deps. Its only two findings here are
      // false positives whose suggested fix introduces a bug — `version` in
      // use-form.tsx:271 is the cache-buster that keeps context consumers live, and
      // use-virtual-rows.ts:59 is a deliberately dep-less reconciliation effect.
      // Re-enabling it needs both call sites restructured, not a disable comment.
    },
  },
);
