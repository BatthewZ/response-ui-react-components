import { type ComponentPropsWithRef, type CSSProperties, forwardRef } from "react";

import { cn, type SlotClassNames } from "../../util/style";
import { CopyButton } from "./CopyButton";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `CodeBlock.css` is gone — everything it drew is here. Each constant is one
 * flat string literal because the docs and focus guards resolve hoisted
 * constants textually and a composed one would not resolve; that is why the
 * mono family is spelled out three times rather than shared.
 *
 * **Not `font-mono`.** Measured: `font-mono` compiles to
 * `font-family: var(--font-mono)`, which is Tailwind's own system stack —
 * `response-ui-css` never maps that name, so the utility would silently swap
 * the theme's `--DEFAULT-MONO-FONT` for `ui-monospace, SFMono-Regular, …`.
 * **Not `font-[var(--DEFAULT-MONO-FONT)]` either**: `font-[…]` is ambiguous
 * between family and weight, and with a bare `var()` Tailwind resolves it to
 * `font-weight`. `font-[family-name:…]` is the spelling that emits
 * `font-family`, and it is the only one of the three the probe's OK is worth
 * anything on.
 */
/**
 * `min-w-0` lets the block shrink below its intrinsic content width inside a
 * flex or grid parent, so the `<pre>`'s own `overflow-x-auto` scrolls the long
 * lines instead of the whole card — and the page — overflowing.
 */
const rootClasses = "overflow-hidden min-w-0 rounded-md border border-border-default bg-surface-0";

const headerClasses =
  "flex items-center gap-r5 px-r5 py-r6 border-b border-border-default bg-surface-1";

const filenameClasses =
  "font-[family-name:var(--DEFAULT-MONO-FONT)] text-body-3 text-fg-secondary";

/**
 * Badge-style chip. `leading-none` beside `text-body-3` is not a source-order
 * gamble: `text-body-3` emits
 * `line-height: var(--tw-leading, var(--BodyText-3-line-height))` and
 * `leading-none` sets `--tw-leading: 1`, so the chip's tight line box holds
 * whichever way Tailwind sorts the two.
 */
const languageClasses =
  "inline-flex items-center rounded-sm px-r5 py-r6 bg-surface-2 font-[family-name:var(--DEFAULT-MONO-FONT)] text-body-3 font-semibold leading-none text-fg-secondary";

/**
 * The `<pre>` is the horizontal scrollport and carries `tabIndex=0` so a
 * keyboard user can reach and scroll it (WCAG 2.1.1). Nothing here resets the
 * UA outline; this only replaces it with the package's own ring, inset so it
 * paints inside the block's own border rather than over it.
 *
 * `[-moz-tab-size:2]` rides along with `[tab-size:2]` because Tailwind has no
 * `tab-size` utility to carry the prefix for it, and Firefox only understood
 * the unprefixed property from 91.
 */
/**
 * `relative` is the containing-block guard every scrollport in this library
 * carries — see `scripts/verify-scrollport-containing-block.mjs`. Nothing the
 * `<pre>` can hold today is absolutely positioned (its content is a `code`
 * STRING, rendered as in-flow line spans whose numbers are a `::before`
 * `inline-block`), so this changes nothing now. It is here because the rule that
 * catches the defect is "every scrollport, no exceptions" — the version with an
 * exemption list is the version that let `.table-wrapper` ship without it.
 */
const preClasses =
  "relative p-r5 overflow-x-auto font-[family-name:var(--DEFAULT-MONO-FONT)] text-body-3 leading-[1.6] text-fg-primary [tab-size:2] [-moz-tab-size:2] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus";

/**
 * `font-[inherit]` is `font-family: inherit` and nothing else — the shorthand
 * is `[font:inherit]`, which is a reset and would have to stay in a stylesheet.
 * The family is what is wanted: Preflight gives `code` its own mono stack, and
 * this hands it back to the `<pre>` above.
 */
const codeClasses = "font-[inherit] whitespace-pre [counter-reset:code-block-line]";

/**
 * Each rendered line is a counter row and the number is a pseudo-element, so it
 * is never part of the selectable or copyable text.
 *
 * The gutter is one box wide on every line so the code starts at the same
 * column. `--_code-block-gutter` is written inline on the `<pre>` and inherits
 * down to here; its read site is a `width`, which is a property a utility can
 * set, so the whole declaration converts and the fallback travels with it.
 */
const lineClasses =
  "block [counter-increment:code-block-line] before:content-[counter(code-block-line)] before:inline-block before:w-[var(--_code-block-gutter,2.5ch)] before:mr-r5 before:text-right before:text-fg-muted before:select-none";

type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  copyable?: boolean;
  /**
   * Props for the header's [CopyButton]. One bag rather than a prop each,
   * because everything that button accepts — `aria-label`, `copiedLabel`,
   * `timeout`, `onCopyError` — is otherwise unreachable, and mirroring them one
   * by one would mean adding a CodeBlock prop every time CopyButton gains one.
   * Same shape as `Spotlight`'s `imgProps` and `Swimlane`'s `viewAllProps`.
   *
   * `value` is not accepted: the button copies `code`, which is the whole point
   * of the block. `className` is merged onto `code-block-copy`, not replacing it.
   */
  copyButtonProps?: Omit<ComponentPropsWithRef<typeof CopyButton>, "value">;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * root, so these reach the header row and the `<pre>`/`<code>` pair beneath it,
   * none of which a caller can otherwise address. The copy button is not here —
   * it is another component, so it takes the `copyButtonProps` bag above.
   *
   * `line` lands on **every** numbered line, since `showLineNumbers` generates
   * them and no key can name one. The union is written out so an unknown key is a
   * type error rather than a silently ignored one.
   */
  classNames?: SlotClassNames<
    "header" | "filename" | "language" | "pre" | "code" | "line"
  >;
} & Omit<ComponentPropsWithRef<"div">, "children">;

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code,
    language,
    filename,
    showLineNumbers = false,
    copyable = true,
    copyButtonProps,
    className,
    classNames,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...props
  },
  ref
) {
  const showHeader = Boolean(filename) || Boolean(language) || copyable;

  // A landmark with no name is noise in the landmark list, and `filename=""`
  // used to produce exactly that (`??` keeps the empty string). Only a named
  // block becomes a region (#149, #153).
  const label = ariaLabel ?? (filename || undefined);
  const isRegion = Boolean(label ?? ariaLabelledBy);

  // Normalise CRLF/CR before anything measures or splits the text: a `\r` left
  // in a line's text node is junk to the reader and to the clipboard (#150).
  // Then strip a single trailing newline so a string ending in "\n" doesn't
  // render a phantom empty final line — in BOTH modes, since a `<pre>` renders
  // that line with or without line numbers (#151).
  const text = code.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  const lines = showLineNumbers ? text.split("\n") : null;

  const digits = lines ? String(lines.length).length : 0;
  const gutterWidth = digits > 2 ? `${digits}ch` : null;

  return (
    <div
      ref={ref}
      role={isRegion ? "region" : undefined}
      aria-label={label}
      aria-labelledby={ariaLabelledBy}
      className={cn("code-block", rootClasses, className)}
      {...props}
    >
      {showHeader && (
        <div className={cn("code-block-header", headerClasses, classNames?.header)}>
          {filename && (
            <span className={cn("code-block-filename", filenameClasses, classNames?.filename)}>
              {filename}
            </span>
          )}
          {language && (
            <span className={cn("code-block-language", languageClasses, classNames?.language)}>
              {language.toLowerCase()}
            </span>
          )}
          {copyable && (
            <CopyButton
              value={code}
              {...copyButtonProps}
              className={cn("code-block-copy ml-auto", copyButtonProps?.className)}
            />
          )}
        </div>
      )}
      {/* The scrollport is the <pre>, so the <pre> is what a keyboard user must
          be able to reach and scroll — a `tabIndex` from the call site lands on
          the `overflow: hidden` root and does nothing (WCAG 2.1.1, #148). */}
      <pre
        className={cn("code-block-pre", preClasses, classNames?.pre)}
        tabIndex={0}
        // Widen the gutter past its 2.5ch default once the line count needs
        // more, so line 100 no longer overflows the box into the padding and
        // eventually out of the block (#154).
        style={gutterWidth ? ({ "--_code-block-gutter": gutterWidth } as CSSProperties) : undefined}
      >
        <code className={cn("code-block-code", codeClasses, classNames?.code)}>
          {lines
            ? lines.map((line, index) => (
                <span
                  key={`${index}-${line}`}
                  className={cn("code-block-line", lineClasses, classNames?.line)}
                >
                  {line}
                </span>
              ))
            : text}
        </code>
      </pre>
    </div>
  );
});
