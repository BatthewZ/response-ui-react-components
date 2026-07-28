/**
 * The theme names used by the worked examples in
 * `@batthewz/response-ui-css/examples/themes/`.
 *
 * Sample data, not API. It lives under `src/examples/` precisely so that the
 * library's own code contains no theme name at all — `scripts/verify-example-themes.mjs`
 * enforces that, and this file is the one place the names are allowed to appear.
 *
 * Exported for demos, docs sites and this repo's dev harness. Nothing in the
 * library reads it. Your app has its own themes; pass them to `useTheme`:
 *
 *     const APP_THEMES = ["default", "aurora"] as const;
 *     useTheme({ themes: APP_THEMES });
 *
 * The example theme CSS is not loaded by the foundation package's main entry, so
 * selecting one of these in an app that has not imported it yields an unstyled
 * page. Import them explicitly if you want them:
 *
 *     @import "@batthewz/response-ui-css/examples/themes/grimdark-fonts"; // must be first
 *     @import "@batthewz/response-ui-css";
 *     @import "@batthewz/response-ui-css/examples/themes/grimdark";
 *     @import "@batthewz/response-ui-react-components/styles";
 *     @import "@batthewz/response-ui-react-components/examples/theme-tuning";
 */
export const EXAMPLE_THEMES = ["default", "events", "grimdark", "tech"] as const;

export type ExampleTheme = (typeof EXAMPLE_THEMES)[number];
