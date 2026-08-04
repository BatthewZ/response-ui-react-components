import { useEffect } from "react";

import { Card, Markdown, Skeleton } from "../src";
import { components, type ComponentEntry, groupedComponents } from "./registry";
import { SiteLink } from "./router";
import { useAsync } from "./use-async";

/**
 * The index of every component, summarised by each doc's own lead paragraph.
 *
 * This is the one page that wants every document at once, so it is the one page that
 * fetches them all — per component, filling the grid in as they land, rather than making
 * the whole page wait on the slowest of 91.
 */

function ComponentCard({ entry }: { entry: ComponentEntry }) {
  const doc = useAsync(entry.loadDoc, `hub:${entry.slug}`);

  return (
    <Card padding="r4" className="flex-1 basis-[18rem]">
      <SiteLink
        to={entry.path}
        className="text-h5 text-accent underline underline-offset-2 hover:text-accent-hover"
      >
        {entry.name}
      </SiteLink>
      {doc.status === "ready" ? (
        <>
          <Markdown className="text-body-3 text-fg-secondary">{doc.value.summary}</Markdown>
          <p className="text-body-3 text-fg-muted">
            {doc.value.exampleNames.length} example
            {doc.value.exampleNames.length === 1 ? "" : "s"}
          </p>
        </>
      ) : (
        <Skeleton>Loading summary</Skeleton>
      )}
    </Card>
  );
}

export function ComponentsHub() {
  useEffect(() => {
    document.title = "Components — response-ui";
  }, []);

  return (
    <div className="flex max-w-[60rem] flex-col gap-r2">
      <header className="flex flex-col gap-r5">
        <h1 className="text-h1 text-fg-primary">Components</h1>
        <p className="text-body-1 text-fg-secondary">
          One page per component: the component running, its props, the theme tokens it
          reads, and the sharp edges. {components.length} components in all.
        </p>
      </header>

      {groupedComponents.map((section) => (
        <section key={section.group} className="flex flex-col gap-r4">
          <h2 className="text-h3 text-fg-primary border-b border-border-default pb-r5">
            {section.title}
          </h2>
          <div className="flex flex-wrap gap-r4">
            {section.entries.map((entry) => (
              <ComponentCard key={entry.slug} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
