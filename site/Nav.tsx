import { useMemo, useState } from "react";

import { AppShell, SearchInput } from "../src";
import { components, groupedComponents, guides } from "./registry";

/**
 * The sidebar: every component, grouped exactly as the source tree groups them.
 *
 * Nothing here is a list of pages — the groups and their contents come from the glob in
 * `registry.ts`, so a new component joins the nav by existing, not by being added. It is
 * also free: the glob's keys are known without loading a single document.
 *
 * A filter is not decoration at this length. 91 entries is well past what anyone scans,
 * and it matches on the component name only, because the summaries live behind the lazy
 * document loads and searching them would pull all 1.6MB of markdown into the sidebar.
 */
export function Nav() {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const sections = useMemo(
    () =>
      groupedComponents
        .map((section) => ({
          ...section,
          entries: needle
            ? section.entries.filter((entry) => entry.name.toLowerCase().includes(needle))
            : section.entries,
        }))
        .filter((section) => section.entries.length > 0),
    [needle],
  );

  return (
    <>
      <SearchInput
        size="sm"
        value={query}
        onChange={setQuery}
        onClear={() => setQuery("")}
        placeholder="Filter components"
        aria-label="Filter components"
      />

      <AppShell.SidebarSection title="Guide">
        <AppShell.SidebarLink to="/">Overview</AppShell.SidebarLink>
        {guides.map((guide) => (
          <AppShell.SidebarLink key={guide.slug} to={guide.path}>
            {guide.title}
          </AppShell.SidebarLink>
        ))}
      </AppShell.SidebarSection>

      {/* The hub heads the component listing rather than sitting among the guides:
          `SidebarLink` marks a link active for its whole sub-tree, so from
          /components/card this one is active too — which reads as a parent here and
          read as a second current page when it sat beside Overview. */}
      <AppShell.SidebarSection title="Components">
        <AppShell.SidebarLink to="/components">All {components.length} components</AppShell.SidebarLink>
      </AppShell.SidebarSection>

      {sections.map((section) => (
        <AppShell.SidebarSection key={section.group} title={section.title}>
          {section.entries.map((entry) => (
            <AppShell.SidebarLink key={entry.slug} to={entry.path}>
              {entry.name}
            </AppShell.SidebarLink>
          ))}
        </AppShell.SidebarSection>
      ))}

      {needle && sections.length === 0 ? (
        <p className="px-r4 text-body-3 text-fg-muted">
          No component matches “{query}”.
        </p>
      ) : null}
    </>
  );
}
