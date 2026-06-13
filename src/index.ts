// @batthewz/response-ui-react-components — public barrel.
// Pairs with @batthewz/response-ui-css. Components are unstyled without that
// package's CSS imported in the consumer app.

// Components — ui
export * from "./components/ui";

// Components — form
export * from "./components/form";

// Components — data-display (dashboard primitives)
export * from "./components/data-display";

// Components — layout
export * from "./components/layout";

// Components — animation
export * from "./components/animation";

// Components — guards (headless)
export * from "./components/guards";

// Components — router adapter (Link, RouterAdapterProvider, useLink, usePathname)
export * from "./components/router";

// Hooks
export * from "./hooks";

// Util — cn(), mergeRefs, formatBytes
export * from "./util";

// Re-export the tailwind-merge extension helpers so consumers can extend it.
// `createCn` is the ergonomic path for apps with custom tokens; `mergeExtension`
// and `tailwindMergeExtension` are escape hatches for power users.
export { createCn, mergeExtension, tailwindMergeExtension, twMerge } from "./util/style";
