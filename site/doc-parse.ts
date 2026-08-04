/**
 * Turns a `docs/**` markdown file into the ordered nodes the site renders.
 *
 * The docs are the source, unmodified — this module reads them, it never asks an
 * author to write anything site-shaped. Three transforms:
 *
 *   1. `<!-- example:Name -->` blocks split out, so the fence `scripts/gen-docs.mjs`
 *      injected can be shown next to a LIVE render of the same module.
 *   2. Headings become section boundaries carrying a GitHub-compatible `id`, because
 *      the docs link to their own `#anchor`s and `<Markdown>` emits no ids.
 *   3. Relative `.md` links become site routes; everything else relative becomes a
 *      link to the file on GitHub.
 */

/**
 * GitHub's heading slugger. Mirrors `scripts/verify-component-docs.mjs`, which is
 * what proves the `#anchor`s in the docs resolve — a different algorithm here would
 * make ids the gate has approved unreachable. Runs of spaces are NOT collapsed, and
 * that is the part that diverges if anyone "tidies" it.
 */
export const slugify = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s/g, "-");

/** GitHub's collision rule: `x`, then `x-1`, `x-2`. An empty slug still gets a target. */
function uniqueSlug(base: string, used: Set<string>): string {
  const root = base || "section";
  if (!used.has(root)) return root;
  let n = 1;
  while (used.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

export type Heading = { level: number; title: string; slug: string };

export type DocNode =
  | { kind: "prose"; md: string }
  | { kind: "example"; name: string; code: string; language: string }
  | { kind: "error"; message: string };

export type DocSection = { heading: Heading | null; nodes: DocNode[] };

export type ParsedDoc = {
  /** The `# H1`, used for the nav label and `document.title`. */
  title: string;
  /**
   * The lead paragraph as markdown — the same sentence `scripts/gen-docs.mjs` puts in the
   * generated hub table, read from the same place so the two cannot disagree. Still
   * markdown, not text: 30 of these open with an inline `` `prop` ``, and flattening them
   * would put backticks on the page.
   */
  summary: string;
  sections: DocSection[];
  /** `##` and `###` headings, in document order — the on-page contents rail. */
  toc: Heading[];
  /** Every example name the page references, in order. */
  exampleNames: string[];
};

/**
 * An example block is its opening marker through the FIRST `<!-- /example -->` after
 * it. Copied deliberately from `scripts/gen-docs.mjs`, whose header records why the
 * body must stay lazy and unconstrained (AUDIT #479): a pattern that can grow past a
 * close marker swallows the prose between two blocks. Here that would only mis-render
 * a page rather than destroy a file, but the two must agree about where a block ends
 * or the site shows something the doc does not say.
 */
const EXAMPLE_BLOCK = /<!-- example:(\w+) -->\n([\s\S]*?)<!-- \/example -->/g;

/** The fence gen-docs writes into a block: ```` ```tsx … ``` ````. */
const FENCE = /^\s*(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n?\1\s*$/;

function splitExamples(md: string): DocNode[] {
  const nodes: DocNode[] = [];
  let cursor = 0;

  for (const match of md.matchAll(EXAMPLE_BLOCK)) {
    const [whole, name, body] = match;
    const start = match.index;
    if (start > cursor) nodes.push({ kind: "prose", md: md.slice(cursor, start) });
    cursor = start + whole.length;

    // A nested opening marker means the block above never closed, so this match spans two
    // blocks and its body is not one example's code. Say so — and then emit the body as
    // prose, because everything the over-long match swallowed is real documentation and
    // the cursor has already moved past it. Reporting the error and dropping the span
    // loses whole sections while naming only the upstream block, which is the shape of
    // the failure gen-docs records as AUDIT #479.
    if (body.includes("<!-- example:")) {
      nodes.push({
        kind: "error",
        message: `example "${name}" is not closed before the next <!-- example: --> marker`,
      });
      nodes.push({ kind: "prose", md: body });
      continue;
    }

    const fence = FENCE.exec(body);
    if (!fence) {
      nodes.push({ kind: "error", message: `example "${name}" has no code fence` });
      continue;
    }
    nodes.push({
      kind: "example",
      name,
      code: fence[3],
      language: fence[2].trim().split(/\s+/)[0] || "tsx",
    });
  }

  if (cursor < md.length) nodes.push({ kind: "prose", md: md.slice(cursor) });
  return nodes;
}

/**
 * Line-by-line fence state, shared by every pass that walks prose. Returns true while
 * a line is a fence delimiter or sits inside one — the two passes below both need to
 * leave those lines completely alone, for different reasons, and a second copy of this
 * state machine is a second chance for them to disagree about where a fence ends.
 */
function createFenceTracker(): (line: string) => boolean {
  let char: string | null = null;
  let length = 0;

  return (line) => {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!fence) return char !== null;

    const [, run, rest] = fence;
    if (char === null) {
      // A backtick info string may not itself contain a backtick — that rule is what
      // keeps a paragraph of `` `inline code` `` from opening a fence.
      if (run[0] !== "~" && rest.includes("`")) return false;
      char = run[0];
      length = run.length;
    } else if (run[0] === char && run.length >= length && rest.trim() === "") {
      char = null;
    }
    return true;
  };
}

/**
 * Splits prose at heading lines, ignoring anything inside a fence — `## ` in a code
 * sample is code, and treating it as a heading would cut the fence in half and leave
 * two unterminated blocks on the page.
 */
function splitHeadings(md: string): { heading: Heading | null; md: string }[] {
  const chunks: { heading: Heading | null; lines: string[] }[] = [{ heading: null, lines: [] }];
  const inFence = createFenceTracker();

  for (const line of md.split("\n")) {
    if (inFence(line)) {
      chunks[chunks.length - 1].lines.push(line);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const title = heading[2].trim();
      chunks.push({
        heading: { level: heading[1].length, title, slug: slugify(title) },
        lines: [line],
      });
    } else {
      chunks[chunks.length - 1].lines.push(line);
    }
  }

  return chunks
    .map((chunk) => ({ heading: chunk.heading, md: chunk.lines.join("\n") }))
    .filter((chunk) => chunk.heading || chunk.md.trim());
}

/**
 * The containment property `EXAMPLE_BLOCK` exists to guarantee, asserted on every load.
 *
 * It lives here rather than in a test file for the same reason `gen-docs.mjs` carries its
 * twin inline: `vitest.config.ts` includes only `src/**`, so a test written for `site/`
 * would not run with the suite, and a guard nobody runs is how the bug this defends
 * against survived long enough to eat two documentation pages. The fixtures are the shapes
 * that actually broke it, kept literal so a future "simplify the regex" edit fails here
 * instead of quietly rendering one example's prose under another's name.
 */
function assertMarkerCannotSpanBlocks() {
  const page = (body: string[]) =>
    ["<!-- example:First -->", ...body, "<!-- /example -->", "", "## Prose", "",
     "<!-- example:Second -->", "```tsx", "const x = 1;", "```", "<!-- /example -->"].join("\n");
  const bodies: Record<string, string[]> = {
    "empty fence": ["```tsx", "```"],
    "no fence": [],
    "normal fence": ["```tsx", "const y = 2;", "```"],
    "fence quoting a fence": ["```tsx", 'const s = "```";', "```"],
  };
  for (const [label, body] of Object.entries(bodies)) {
    const names = [...page(body).matchAll(EXAMPLE_BLOCK)].map((m) => m[1]);
    if (names.join(",") !== "First,Second") {
      throw new Error(
        `doc-parse: EXAMPLE_BLOCK self-check failed for "${label}" — matched [${names}], ` +
          `expected [First,Second]. The pattern is spanning example blocks and would show ` +
          `one example's documentation under another's name.`,
      );
    }
  }
}
assertMarkerCannotSpanBlocks();

export function parseDoc(markdown: string, rewriteLink: (target: string) => string): ParsedDoc {
  const sections: DocSection[] = [{ heading: null, nodes: [] }];
  const toc: Heading[] = [];
  const exampleNames: string[] = [];
  const usedSlugs = new Set<string>();
  let title = "";

  for (const node of splitExamples(markdown)) {
    if (node.kind !== "prose") {
      if (node.kind === "example") exampleNames.push(node.name);
      sections[sections.length - 1].nodes.push(node);
      continue;
    }

    for (const chunk of splitHeadings(rewriteLinks(node.md, rewriteLink))) {
      if (chunk.heading) {
        // A repeated heading is disambiguated the way GitHub disambiguates it: the first
        // keeps the bare slug, the next becomes `slug-1`. So a doc's own `#anchor` still
        // lands on the occurrence the link checker approved — it only ever names the bare
        // form — and the later section is still addressable.
        //
        // Dropping the id instead (the first attempt) looked safe and was not: the ToC is
        // built from these headings, so the second `## AvatarGroup` in `avatar.md` became
        // a live "On this page" entry pointing at `href="#"`, which jumps to the top of
        // the page. A link to nowhere is worse than a slightly ugly one.
        const heading = { ...chunk.heading, slug: uniqueSlug(chunk.heading.slug, usedSlugs) };
        usedSlugs.add(heading.slug);
        if (heading.level === 1 && !title) title = heading.title;
        if (heading.level === 2 || heading.level === 3) toc.push(heading);
        sections.push({ heading, nodes: [] });
      }
      if (chunk.md.trim()) {
        sections[sections.length - 1].nodes.push({ kind: "prose", md: chunk.md });
      }
    }
  }

  const kept = sections.filter((section) => section.heading || section.nodes.length);
  return { title, summary: leadParagraph(kept), sections: kept, toc, exampleNames };
}

/**
 * The first paragraph under the `# H1`.
 *
 * Taken from the parsed sections rather than the raw file so its links have already been
 * rewritten — two of these summaries carry one, and read from the source they would point
 * at a `.md` path that is not a page here.
 */
function leadParagraph(sections: DocSection[]): string {
  const title = sections.find((section) => section.heading?.level === 1);
  const prose = title?.nodes.find((node) => node.kind === "prose");
  if (!prose || prose.kind !== "prose") return "";

  const paragraph: string[] = [];
  for (const line of prose.md.split("\n")) {
    if (line.startsWith("#")) continue;
    if (!line.trim()) {
      if (paragraph.length) break;
      continue;
    }
    paragraph.push(line.trim());
  }
  return paragraph.join(" ");
}

/**
 * Rewrites the destination of every inline link, leaving the label untouched.
 *
 * Only the `[text](dest)` form exists in these docs — reference links are outside the
 * subset `Markdown` renders, so there are no link definitions to rewrite.
 *
 * Fenced blocks are skipped. Today that guard is genuinely unexercised — the only link
 * destination inside any fence in any routed doc is an `https://` one in `markdown.md`,
 * which the scheme test below would skip anyway — so this is precaution, not a fix, and
 * saying otherwise would overstate it. It is cheap precaution against a specific and
 * likely future: `markdown.md` documents a markdown renderer by quoting markdown source,
 * and the next relative link written into one of those samples would be rewritten into a
 * snippet the reader is invited to copy.
 *
 * Two narrower cases are NOT handled, stated so the hole is not silent: an indented
 * (4-space) code block, and an inline `` `[label](target.md)` `` code span. Neither occurs
 * in the docs, and the second is how you would spell link syntax in prose — so if either
 * ever appears, it is this function that has to learn about it.
 */
function rewriteLinks(md: string, rewriteLink: (target: string) => string): string {
  const inFence = createFenceTracker();

  return md
    .split("\n")
    .map((line) =>
      inFence(line)
        ? line
        : line.replace(/(\]\()([^)\s]+)/g, (whole, open: string, dest: string) =>
            dest.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(dest)
              ? whole
              : open + rewriteLink(dest),
          ),
    )
    .join("\n");
}
