import type { ComponentType } from "react";
import { useEffect } from "react";

import { Markdown, ToastProvider } from "../src";
import type { ParsedDoc } from "./doc-parse";
import { ExampleBlock } from "./ExampleBlock";
import { useDocLinkInterceptor } from "./router";

/**
 * Renders one `docs/**` page: the author's prose exactly as written, with each
 * `<!-- example -->` block replaced by the component running above its own code.
 *
 * The prose goes through the library's own `Markdown`, so the documentation is itself a
 * specimen — tables are `Table`, fences are `CodeBlock`, and the whole page re-tints
 * with the theme switcher like everything else on it.
 */

/** Clears the sticky navbar (3.5rem) plus a little air when an anchor is jumped to. */
const ANCHOR_OFFSET = "scroll-mt-[5rem]";

function DocContents({ doc }: { doc: ParsedDoc }) {
  if (doc.toc.length < 2) return null;

  return (
    <nav aria-label="On this page" className="flex flex-col gap-r6">
      <span className="text-body-3 font-semibold uppercase tracking-wide text-fg-muted">
        On this page
      </span>
      {doc.toc.map((heading, index) => (
        <a
          key={`${heading.slug}-${index}`}
          href={`#${heading.slug}`}
          className={`text-body-3 text-fg-secondary hover:text-fg-primary ${
            heading.level === 3 ? "pl-r4" : ""
          }`}
        >
          {heading.title}
        </a>
      ))}
    </nav>
  );
}

const NO_EXAMPLES: Record<string, ComponentType> = {};

export function DocPage({
  doc,
  examples = NO_EXAMPLES,
}: {
  doc: ParsedDoc;
  examples?: Record<string, ComponentType>;
}) {
  const onClick = useDocLinkInterceptor();

  useEffect(() => {
    document.title = `${doc.title} — response-ui`;
  }, [doc.title]);

  // A cold load of /components/card#gotchas arrives before this content exists, so the
  // browser's own jump finds nothing. Repeat it once the page is on screen — `doc` alone
  // is the right key, because DocRoute holds this component back until the examples are
  // in hand too, so nothing mounts above the anchor after this runs.
  useEffect(() => {
    const { hash } = window.location;
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [doc]);

  return (
    <div className="flex flex-row-reverse justify-end gap-r2">
      <aside className="sticky top-[5rem] hidden h-fit w-[14rem] shrink-0 xl:flex">
        <DocContents doc={doc} />
      </aside>

      {/* The Toast examples call `useToast()` bare — a provider-free snippet is the
          point of that doc — so the page supplies the ambient provider an app mounts
          high in its tree. */}
      <ToastProvider>
        <article className="flex min-w-0 max-w-[52rem] flex-1 flex-col" onClick={onClick}>
          {doc.sections.map((section, index) => (
            <section
              key={section.heading?.slug || `section-${index}`}
              id={section.heading?.slug || undefined}
              className={ANCHOR_OFFSET}
            >
              {section.nodes.map((node, nodeIndex) => {
                if (node.kind === "prose") {
                  return <Markdown key={nodeIndex}>{node.md}</Markdown>;
                }
                if (node.kind === "example") {
                  return (
                    <ExampleBlock
                      key={nodeIndex}
                      name={node.name}
                      code={node.code}
                      language={node.language}
                      examples={examples}
                    />
                  );
                }
                return (
                  <p key={nodeIndex} className="text-body-3 text-status-error">
                    Malformed doc: {node.message}
                  </p>
                );
              })}
            </section>
          ))}
        </article>
      </ToastProvider>
    </div>
  );
}
