import { Card, CodeBlock } from "../src";
import { components, groupedComponents, guides } from "./registry";
import { SiteLink } from "./router";

/**
 * The landing page. It leads with what a reader can do next — install it, or pick a
 * component — rather than restating the README at them.
 */

const INSTALL = `bun add @batthewz/response-ui-react-components \\
  @batthewz/response-ui-css \\
  react react-dom @floating-ui/react lucide-react`;

const WIRE_CSS = `/* app.css — order matters: the foundation defines the tokens
   the component styles read. */
@import "@batthewz/response-ui-css";
@import "@batthewz/response-ui-react-components/styles";`;

export function HomePage() {
  return (
    <div className="flex max-w-[52rem] flex-col gap-r2">
      <header className="flex flex-col gap-r5">
        <h1 className="text-h1 text-fg-primary">response-ui</h1>
        <p className="text-body-1 text-fg-secondary">
          A token-driven React 19 component library. Every colour, size, radius and shadow
          resolves to a CSS custom property, so a theme is one file overriding ~30 variables —
          switch the theme in the header and every example on this site re-tints, with no
          rebuild and no component edits.
        </p>
        <p className="text-body-2 text-fg-muted">
          {components.length} components. Every example here runs above the snippet that
          produced it — both come from one module the typechecker compiles — so nothing on
          this site can drift from the source it documents.
        </p>
      </header>

      <section className="flex flex-col gap-r4">
        <h2 className="text-h3 text-fg-primary">Install</h2>
        <CodeBlock code={INSTALL} language="bash" />
        <CodeBlock code={WIRE_CSS} language="css" filename="app.css" />
        <p className="text-body-3 text-fg-muted">
          The CSS foundation releases separately and ships zero JavaScript — take it alone
          from Astro, Rails, Phoenix or plain HTML if you only want the design language.
        </p>
      </section>

      <section className="flex flex-col gap-r4">
        <h2 className="text-h3 text-fg-primary">Browse</h2>
        <div className="flex flex-wrap gap-r4">
          {groupedComponents.map((section) => (
            <Card key={section.group} padding="r4" className="flex-1 basis-[15rem]">
              <h3 className="text-h5 text-fg-primary">{section.title}</h3>
              <p className="text-body-3 text-fg-muted">
                {section.entries.length} component{section.entries.length === 1 ? "" : "s"}
              </p>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-r3">
          <SiteLink to="/components" className="text-body-2 text-accent underline underline-offset-2 hover:text-accent-hover">
            All {components.length} components →
          </SiteLink>
          {guides.map((page) => (
            <SiteLink
              key={page.slug}
              to={page.path}
              className="text-body-2 text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              {page.title} →
            </SiteLink>
          ))}
        </div>
      </section>
    </div>
  );
}
