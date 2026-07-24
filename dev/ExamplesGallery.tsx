import { Component, type ComponentType, type ReactNode } from "react";

import { Group, Tile } from "./gallery-ui";

/**
 * Every `*.examples.tsx` in the library, rendered automatically.
 *
 * The curated gallery in App.tsx is a designed showcase; this is its exhaustive
 * counterpart. It globs the same example modules the docs are generated from, so a
 * component appears here the moment its examples file lands — with no edit to this
 * file, or any other. That is the point: dev/ is the one file every component would
 * otherwise have to touch, which would make it a permanent merge-conflict surface
 * while docs are written in parallel batches.
 *
 * Because the same modules feed `scripts/gen-docs.mjs`, what renders here is exactly
 * what the docs show — a visual check on top of the typecheck the examples already get.
 */

const modules = import.meta.glob<Record<string, unknown>>("../src/components/*/*.examples.tsx", {
  eager: true,
});

const GROUP_TITLES: Record<string, string> = {
  ui: "UI",
  form: "Form",
  "data-display": "Data display",
  layout: "Layout",
  animation: "Animation",
  guards: "Guards",
  router: "Router",
};

type Entry = { group: string; component: string; examples: [string, ComponentType][] };

/** Examples are always zero-arg `export function Name()`, so any function export is one. */
const isExample = (v: unknown): v is ComponentType => typeof v === "function";

const entries: Entry[] = Object.entries(modules)
  .map(([path, mod]): Entry => {
    const m = /\/components\/([^/]+)\/(.+)\.examples\.tsx$/.exec(path);
    return {
      group: m?.[1] ?? "unknown",
      component: m?.[2] ?? path,
      examples: Object.entries(mod).filter((pair): pair is [string, ComponentType] =>
        isExample(pair[1]),
      ),
    };
  })
  .filter((e) => e.examples.length > 0)
  .sort((a, b) => a.group.localeCompare(b.group) || a.component.localeCompare(b.component));

const groups = [...new Set(entries.map((e) => e.group))];
const exampleCount = entries.reduce((n, e) => n + e.examples.length, 0);

/**
 * Per-tile error isolation. The library's own ErrorBoundary is a page-level component
 * with a fixed full-screen fallback; rendering ~90 components blind needs a tile-sized
 * one, so a single throwing example degrades to a marker instead of blanking the page.
 */
class ExampleBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <span className="text-body-3 text-status-error">threw: {this.state.error.message}</span>
      );
    }
    return this.props.children;
  }
}

export function ExamplesGallery() {
  return (
    <main className="mx-auto flex flex-col gap-r2 p-r3">
      <p className="text-body-3 text-fg-secondary">
        {exampleCount} examples across {entries.length} components, globbed from
        <code> src/components/*/*.examples.tsx</code> — the same modules the docs are
        generated from. Nothing to wire: add an examples file and it shows up here.
      </p>

      {groups.map((group) => (
        <Group key={group} id={`examples-${group}`} title={GROUP_TITLES[group] ?? group}>
          {entries
            .filter((e) => e.group === group)
            .flatMap((e) =>
              e.examples.map(([name, Example]) => (
                <Tile key={`${e.component}.${name}`} label={`${e.component} — ${name}`}>
                  <ExampleBoundary>
                    <Example />
                  </ExampleBoundary>
                </Tile>
              )),
            )}
        </Group>
      ))}
    </main>
  );
}
