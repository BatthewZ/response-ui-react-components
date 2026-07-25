import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Deliberately narrow: two rules, each tied to a defect class in `bugs/LEDGER.md`.
 * The recommended presets (typescript-eslint, react/recommended) are not enabled —
 * they would bury these signals under hundreds of stylistic findings.
 *
 * Scope is `src/` only; `dev/` is a scratch harness and `scripts/` is plain Node.
 */
export default tseslint.config(
  // The project rule is "never suppress, only fix". `noInlineConfig` enforces it
  // mechanically: an `eslint-disable` comment cannot silence anything, and ESLint
  // reports the dead directive, so `--max-warnings 0` rejects it.
  { linterOptions: { noInlineConfig: true } },
  { ignores: ["dist/**", "node_modules/**", "dev/**", "scripts/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
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
