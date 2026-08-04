import type { ComponentType } from "react";

import { parseDoc, type ParsedDoc } from "./doc-parse";

/**
 * Every page on this site, discovered rather than declared.
 *
 * A component appears here the moment it has `src/components/<group>/<Name>.examples.tsx`
 * and `docs/components/<name>.md` — both of which `scripts/gen-docs.mjs` already makes
 * mandatory, and neither of which is written for this site. There is no per-component
 * registration, no ordering file and no nav to edit: adding one to this file is the
 * failure mode, because it is the one edit ~90 parallel doc branches would all collide on.
 *
 * The same example modules feed the typechecker (they are inside `tsconfig.json`'s
 * `include`), the doc fences (gen-docs injects their JSX), and the live renders — so a
 * snippet on this page cannot drift from the component it demonstrates.
 *
 * The globs are deliberately NOT eager. `import.meta.glob` resolves its keys at build
 * time and its values on demand, so the navigation — every name, every group, every
 * route — costs nothing to build, while the 1.6MB of markdown behind it arrives one page
 * at a time. Making these eager is a one-word change that puts all 91 documents and all
 * 567 examples into the first response.
 */

const exampleModules = import.meta.glob<Record<string, unknown>>(
  "../src/components/*/*.examples.tsx",
);

const componentDocs = import.meta.glob<string>("../docs/components/*.md", {
  query: "?raw",
  import: "default",
});

const guideDocs = import.meta.glob<string>("../docs/*.md", { query: "?raw", import: "default" });

/**
 * Reading order for the groups that exist today, and nothing more.
 *
 * It is an ORDER, not a whitelist, and the difference is the bug it was written to fix.
 * Filtering the listing through a hand-kept map meant a new `src/components/<group>/`
 * directory produced pages that no nav or index ever linked to, while the heading above
 * still counted them — the exact "renders 91 of 92 and looks complete" failure this site's
 * gate exists to prevent. Unknown groups now sort to the end with a title derived from the
 * directory name, so the tree stays the source of truth and a new group is visible before
 * anyone remembers this file.
 */
const GROUP_ORDER = ["ui", "form", "data-display", "layout", "animation", "guards", "router"];

const GROUP_TITLES: Record<string, string> = { ui: "UI" };

/** `data-display` → `Data display`; the acronym above is the only one worth spelling out. */
const groupTitle = (group: string) =>
  GROUP_TITLES[group] ?? group.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

/** `MediaCard` → `media-card`, matching what gen-docs names the doc file. */
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const REPO_BLOB = "https://github.com/BatthewZ/response-ui-react-components/blob/main";

export const BASE = import.meta.env.BASE_URL;

/** An app path (`/components/card`) as the browser should see it, under the deploy base. */
export const href = (path: string) => BASE + path.replace(/^\//, "");

export type ComponentEntry = {
  slug: string;
  /** The component's exported name, taken from the examples module's filename. */
  name: string;
  group: string;
  path: string;
  loadDoc: () => Promise<ParsedDoc>;
  loadExamples: () => Promise<Record<string, ComponentType>>;
};

export type GuideEntry = {
  slug: string;
  /** Derived from the filename, so a nav label exists before the document is fetched. */
  title: string;
  path: string;
  loadDoc: () => Promise<ParsedDoc>;
};

/**
 * Turns a link destination written relative to a doc into something the site can honour.
 *
 * Docs link to each other (`media-card.md`, `../theme-contract.md#surfaces`) and
 * occasionally to source (`../src/tokens.css`). The first kind becomes an in-site route;
 * the second becomes the file on GitHub, because a docs site that silently drops a link
 * to a real file is worse than one that sends you to where the file lives.
 *
 * `dir` is the doc's own directory relative to `docs/`. What makes the mapping total is the
 * pair of gates around it, not this function: `verify-component-docs.mjs` has already
 * rejected any target that is not a real file, and `verify-site.mjs` rejects any real file
 * this cannot route to a page.
 *
 * The two resolvers are not identical, and the difference is deliberate. This one clamps
 * `..` at the docs root; the gate's `path.relative` lets it escape, so a target above
 * `docs/` fails there and routes to a Not-found here. The gate is the stricter of the two,
 * which is the safe direction: nothing reaches a reader that the gate has not seen.
 */
function resolveDocLink(dest: string, dir: string): string {
  const [target, anchor] = dest.split("#");
  const resolved: string[] = [];
  for (const segment of `${dir}/${target}`.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") resolved.pop();
    else resolved.push(segment);
  }
  const path = resolved.join("/");
  const hash = anchor ? `#${anchor}` : "";

  // Paths here are relative to `docs/`; a `..` that escapes it names a repo file.
  if (!path.endsWith(".md")) return `${REPO_BLOB}/${path.replace(/^\.\.\//, "")}`;
  if (path === "components/README.md") return href("/components") + hash;
  if (path.startsWith("components/")) {
    return href(`/components/${path.slice("components/".length, -".md".length)}`) + hash;
  }
  if (!path.includes("/")) return href(`/${path.slice(0, -".md".length)}`) + hash;
  return `${REPO_BLOB}/docs/${path}${hash}`;
}

const isExample = (value: unknown): value is ComponentType => typeof value === "function";

function buildComponents(): ComponentEntry[] {
  const entries: ComponentEntry[] = [];

  for (const [modulePath, loadModule] of Object.entries(exampleModules)) {
    const match = /\/components\/([^/]+)\/(.+)\.examples\.tsx$/.exec(modulePath);
    if (!match) continue;
    const [, group, name] = match;
    const slug = kebab(name);

    const loadMarkdown = componentDocs[`../docs/components/${slug}.md`];
    // gen-docs fails the build on a missing doc, so this is unreachable in a green tree.
    // Skipping rather than throwing keeps the other 90 pages readable while it is fixed.
    if (!loadMarkdown) continue;

    entries.push({
      slug,
      name,
      group,
      path: `/components/${slug}`,
      loadDoc: async () =>
        parseDoc(await loadMarkdown(), (dest) => resolveDocLink(dest, "components")),
      loadExamples: async () => {
        const module = await loadModule();
        const examples: Record<string, ComponentType> = {};
        for (const [exportName, value] of Object.entries(module)) {
          if (isExample(value)) examples[exportName] = value;
        }
        return examples;
      },
    });
  }

  // An unknown group sorts after every known one rather than before all of them, which
  // `indexOf` returning -1 would otherwise do.
  const rank = (group: string) => {
    const index = GROUP_ORDER.indexOf(group);
    return index === -1 ? GROUP_ORDER.length : index;
  };
  return entries.sort(
    (a, b) =>
      rank(a.group) - rank(b.group) ||
      a.group.localeCompare(b.group) ||
      a.name.localeCompare(b.name),
  );
}

function buildGuides(): GuideEntry[] {
  return Object.entries(guideDocs)
    .map(([modulePath, loadMarkdown]) => {
      const slug = modulePath.slice("../docs/".length, -".md".length);
      return {
        slug,
        title: slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()),
        path: `/${slug}`,
        loadDoc: async () => parseDoc(await loadMarkdown(), (dest) => resolveDocLink(dest, "")),
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export const components = buildComponents();
export const guides = buildGuides();

export const componentsBySlug = new Map(components.map((entry) => [entry.slug, entry]));
export const guidesBySlug = new Map(guides.map((entry) => [entry.slug, entry]));

/** Derived from what the tree actually contains — `components` is already in group order. */
export const groupedComponents = [...new Set(components.map((entry) => entry.group))].map(
  (group) => ({
    group,
    title: groupTitle(group),
    entries: components.filter((entry) => entry.group === group),
  }),
);
