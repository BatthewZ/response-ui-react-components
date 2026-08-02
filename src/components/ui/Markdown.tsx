import { type ComponentPropsWithRef, forwardRef, Fragment, type ReactNode, useMemo } from "react";

import { cn, type SlotClassNames } from "../../util/style";
import { CodeBlock } from "./CodeBlock";
import {
  type BlockNode,
  type InlineNode,
  parseBlocks,
  type TableAlign,
} from "./markdown-parse";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "./Table";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * Bare `h1`–`h6` and `p` already carry the responsive type scale: the element
 * rules in `@batthewz/response-ui-css` set font-size, the paired line-height,
 * the weight and `--HEADING-FONT` on the tags themselves. So nothing here
 * restates the scale — measured, a bare `<h1>` renders 64px/72px/700 at the
 * wide breakpoint with no class at all.
 *
 * What the tags do NOT get is everything Preflight flattened and the foundation
 * deliberately never restored: list markers, blockquote indent, a link colour,
 * table borders, and rhythm between blocks (`p { margin: 0 }` is correct for a
 * component library and wrong for a document). That gap is `Markdown.css`, and
 * it is the whole reason this component carries a stylesheet.
 */
const rootClasses = "text-fg-primary";

const codeClasses =
  "font-[family-name:var(--DEFAULT-MONO-FONT)] text-[0.9em] rounded-sm px-r6 py-[0.1em] bg-surface-2 text-fg-primary";

/**
 * `text-accent`, matching `Button variant="link"` and `FileUpload`'s replace
 * affordance — a markdown link should not look different from every other link
 * in the system.
 *
 * **Not `text-primary`.** That was the first spelling and the `grimdark` example
 * theme proved it wrong: `--C-PRIMARY` is a *fill* token, so the contrast
 * contract guarantees it against `--C-TEXT-ON-PRIMARY` and never against a
 * surface. Measured there, `--C-PRIMARY` is `oklch(0.2178)` on a
 * `oklch(0.2046)` sheet — a lightness gap of 0.013, and the link was invisible.
 * `--C-ACCENT` is a fill token too and carries the same caveat in principle;
 * the underline is the non-colour affordance that survives it.
 *
 * `break-words` and not `truncate`: a URL pasted as its own link text is the
 * common case in generated prose, and it is longer than any column it lands in.
 */
const linkClasses =
  "text-accent underline underline-offset-2 break-words hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";

const imageClasses = "max-w-full h-auto rounded-md";

const alignClasses: Record<Exclude<TableAlign, null>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

type Slots = SlotClassNames<
  | "heading"
  | "paragraph"
  | "list"
  | "listItem"
  | "blockquote"
  | "code"
  | "codeBlock"
  | "link"
  | "image"
  | "table"
  | "hr"
>;

/** Everything the recursive renderers need that is not the node itself. */
type RenderContext = {
  classNames: Slots | undefined;
  codeBlockProps: MarkdownProps["codeBlockProps"];
};

function renderInline(nodes: InlineNode[], ctx: RenderContext, keyPrefix: string): ReactNode {
  const classNames = ctx.classNames;
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "text":
        // A plain string child. React escapes it, which is what makes a raw
        // `<script>` in the source render as five visible characters rather
        // than an element — the property this component is built around.
        return <Fragment key={key}>{node.value}</Fragment>;
      case "code":
        return (
          <code key={key} className={cn("markdown-code", codeClasses, classNames?.code)}>
            {node.value}
          </code>
        );
      case "strong":
        return <strong key={key}>{renderInline(node.children, ctx, key)}</strong>;
      case "em":
        return <em key={key}>{renderInline(node.children, ctx, key)}</em>;
      case "del":
        return <del key={key}>{renderInline(node.children, ctx, key)}</del>;
      case "break":
        return <br key={key} />;
      case "link":
        return (
          <a
            key={key}
            href={node.href}
            title={node.title}
            className={cn("markdown-link", linkClasses, classNames?.link)}
          >
            {renderInline(node.children, ctx, key)}
          </a>
        );
      case "image":
        return (
          <img
            key={key}
            src={node.src}
            alt={node.alt}
            title={node.title}
            className={cn("markdown-image", imageClasses, classNames?.image)}
          />
        );
    }
  });
}

/**
 * A list item holding exactly one paragraph renders that paragraph's inlines
 * directly — the tight-list rule, and only for a tight list. A loose one (an
 * author left a blank line between items) keeps its paragraphs, which is what
 * gives it the looser rhythm the blank line asked for. Without it every `- one` in a simple list
 * gets a block-level `<p>` and the list acquires paragraph rhythm between its
 * bullets, which reads as a spacing bug rather than as markdown.
 */
function renderItemChildren(
  children: BlockNode[],
  loose: boolean,
  ctx: RenderContext,
  key: string
): ReactNode {
  if (!loose && children.length === 1 && children[0].type === "paragraph") {
    return renderInline(children[0].children, ctx, key);
  }
  return renderBlocks(children, ctx, key);
}

function renderBlocks(nodes: BlockNode[], ctx: RenderContext, keyPrefix: string): ReactNode {
  const { classNames, codeBlockProps } = ctx;
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "heading": {
        const Tag = `h${node.level}` as const;
        return (
          <Tag key={key} className={cn("markdown-heading", classNames?.heading)}>
            {renderInline(node.children, ctx, key)}
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={key} className={cn("markdown-paragraph", classNames?.paragraph)}>
            {renderInline(node.children, ctx, key)}
          </p>
        );
      case "code":
        // The library's own block, so a fenced block in a document is the same
        // artifact as a hand-written `<CodeBlock>` — the scrollable `<pre>`, the
        // language chip, the copy button and their accessibility come with it
        // rather than being restated here.
        return (
          <CodeBlock
            key={key}
            {...codeBlockProps}
            code={node.value}
            language={node.lang}
            className={cn("markdown-codeblock", classNames?.codeBlock, codeBlockProps?.className)}
          />
        );
      case "list": {
        const Tag = node.ordered ? "ol" : "ul";
        return (
          <Tag
            key={key}
            className={cn("markdown-list", classNames?.list)}
            start={node.ordered && node.start !== 1 ? node.start : undefined}
          >
            {node.items.map((item, itemIndex) => (
              <li
                key={`${key}-${itemIndex}`}
                className={cn("markdown-list-item", classNames?.listItem)}
              >
                {renderItemChildren(item.children, node.loose, ctx, `${key}-${itemIndex}`)}
              </li>
            ))}
          </Tag>
        );
      }
      case "blockquote":
        return (
          <blockquote key={key} className={cn("markdown-blockquote", classNames?.blockquote)}>
            {renderBlocks(node.children, ctx, key)}
          </blockquote>
        );
      case "hr":
        return <hr key={key} className={cn("markdown-hr", classNames?.hr)} />;
      case "table":
        // Same reasoning as the code fence: `Table` is the design system's
        // table. Restyling one in `Markdown.css` would be a second source of
        // truth for how a table looks, which is the trade this repo refuses.
        //
        // The PARTS are imported by name rather than dotted off `Table`.
        // `Table.tsx` is `"use client"`, and dotting into a client module from
        // a directive-neutral one throws under RSC the moment a document
        // contains a table — proven with a real flight render, not inferred.
        return (
          <Table key={key} className={cn("markdown-table", classNames?.table)}>
            <TableHead>
              <TableRow>
                {node.header.map((cell, cellIndex) => (
                  <TableHeaderCell
                    key={`${key}-h-${cellIndex}`}
                    // slot:(a) the class IS the mechanism — it carries the
                    // alignment the document's delimiter row asked for, which is
                    // the author's instruction and not a styling choice a caller
                    // is owed a route to. Restyling cells as a class goes on
                    // `classNames.table` and reaches these by descent.
                    className={alignOf(node.align, cellIndex)}
                  >
                    {renderInline(cell, ctx, `${key}-h-${cellIndex}`)}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {node.rows.map((row, rowIndex) => (
                <TableRow key={`${key}-r-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={`${key}-r-${rowIndex}-${cellIndex}`}
                      // slot:(a) as above — the document's alignment, not a
                      // caller's choice, and no key could name one cell of many.
                      className={alignOf(node.align, cellIndex)}
                    >
                      {renderInline(cell, ctx, `${key}-r-${rowIndex}-${cellIndex}`)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
    }
  });
}

/**
 * The alignment class for one column, from the delimiter row. `undefined` for a
 * column the row did not declare — which happens on a ragged row, and those are
 * rendered rather than dropped: losing a cell silently is worse than an
 * unaligned one, and a generated table is exactly where an off-by-one shows up.
 */
function alignOf(align: TableAlign[], index: number): string | undefined {
  const value = align[index];
  return value ? alignClasses[value] : undefined;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type MarkdownProps = {
  /**
   * The markdown source. A string and not `ReactNode`, because this component
   * parses rather than composes — `<Markdown>{`# Hi`}</Markdown>`.
   */
  children: string;
  /**
   * Class overrides for the elements this component generates. Every one of
   * them is produced by the parser from the document's own content, so there is
   * no other route to them — a `heading` class lands on **every** heading, a
   * `listItem` on every item, and no key can name one.
   */
  classNames?: Slots;
  /**
   * Props for the [CodeBlock] each fenced block becomes. `code` and `language`
   * are the document's, not the caller's — they are the fence. The bag exists
   * mostly for `copyable={false}`: the block defaults it to `true`, and a page
   * of prose with a copy button on every snippet is a different design decision
   * than a reference page, which only the caller can make.
   *
   * Same shape as `CodeBlock`'s own `copyButtonProps` and `Swimlane`'s
   * `viewAllProps`.
   */
  codeBlockProps?: Omit<ComponentPropsWithRef<typeof CodeBlock>, "code" | "language">;
} & Omit<ComponentPropsWithRef<"div">, "children">;

/**
 * Renders a documented subset of Markdown as real components.
 *
 * The subset is the contract, and `docs/components/markdown.md` is where it is
 * written down. It is deliberately closed: no reference links, no setext
 * headings, no lazy continuation, no indented code blocks, no footnotes, no
 * task lists, and no raw HTML.
 *
 * Nothing here ever builds an HTML string. The parser produces an AST and this
 * renders React elements from it, so `dangerouslySetInnerHTML` appears nowhere
 * and there is no sanitizer to configure wrongly. URLs are the one place
 * untrusted input still reaches an attribute, and `safeUrl` gates both `href`
 * and `src`.
 */
export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(function Markdown(
  { children, className, classNames, codeBlockProps, ...props },
  ref
) {
  // Memoised because parsing is the expensive half and a re-render that did not
  // change the source would otherwise re-pay it in full.
  const blocks = useMemo(() => parseBlocks(children), [children]);

  return (
    <div ref={ref} className={cn("markdown", rootClasses, className)} {...props}>
      {renderBlocks(blocks, { classNames, codeBlockProps }, "md")}
    </div>
  );
});

export type { MarkdownProps };
