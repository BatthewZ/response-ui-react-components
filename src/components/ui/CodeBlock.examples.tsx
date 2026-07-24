import { CodeBlock } from "./CodeBlock";

/** One required prop. `copyable` defaults to true, so the header bar renders even
 *  with nothing in it but the copy button. */
export function Minimal() {
  return <CodeBlock code="bun add @batthewz/response-ui-react-components" />;
}

/** `filename` fills the left of the header and names the region; `language` is a
 *  lowercased chip beside it — a label only, never syntax highlighting. */
export function WithFilenameAndLanguage() {
  return (
    <CodeBlock
      filename="src/app/theme.ts"
      language="TypeScript"
      code={"export const theme = document.documentElement.dataset.theme ?? 'default';"}
    />
  );
}

/** `showLineNumbers` splits `code` on `\n` and numbers each line with a CSS counter,
 *  after dropping one trailing newline. */
export function LineNumbers() {
  return (
    <CodeBlock
      filename="scripts/release.sh"
      language="bash"
      showLineNumbers
      code={"bun run typecheck\nbun run test\nbun run build\nnpm publish --access public"}
    />
  );
}

/** `copyable={false}` with no `filename` and no `language` is the one combination
 *  that removes the header — and the only client component in the tree with it. */
export function StaticNoHeader() {
  return <CodeBlock code="GET /api/v1/teams/42/members" copyable={false} />;
}

/** The block sets `min-width: 0`, so in a flex or grid parent it shrinks to the
 *  column and scrolls the long line inside its own `<pre>` instead of widening the page. */
export function InsideAFlexParent() {
  return (
    <div className="flex max-w-md">
      <CodeBlock
        filename="query.sql"
        language="SQL"
        code={"select id, email from users where team_id = $1 order by created_at desc limit 50;"}
      />
    </div>
  );
}

/** Rest props are spread last, so your own `aria-label` replaces the region name
 *  CodeBlock derives from `filename`. */
export function NamedRegion() {
  return (
    <CodeBlock
      language="bash"
      aria-label="Install the CSS foundation"
      code="bun add @batthewz/response-ui-css"
    />
  );
}
