import { type ComponentPropsWithRef, type CSSProperties, forwardRef } from "react";

import { cn } from "../../util/style";
import { CopyButton } from "./CopyButton";

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
      className={cn("code-block", className)}
      {...props}
    >
      {showHeader && (
        <div className="code-block-header">
          {filename && <span className="code-block-filename">{filename}</span>}
          {language && <span className="code-block-language">{language.toLowerCase()}</span>}
          {copyable && (
            <CopyButton
              value={code}
              {...copyButtonProps}
              className={cn("code-block-copy", copyButtonProps?.className)}
            />
          )}
        </div>
      )}
      {/* The scrollport is the <pre>, so the <pre> is what a keyboard user must
          be able to reach and scroll — a `tabIndex` from the call site lands on
          the `overflow: hidden` root and does nothing (WCAG 2.1.1, #148). */}
      <pre
        className="code-block-pre"
        tabIndex={0}
        // Widen the gutter past its 2.5ch default once the line count needs
        // more, so line 100 no longer overflows the box into the padding and
        // eventually out of the block (#154).
        style={gutterWidth ? ({ "--_code-block-gutter": gutterWidth } as CSSProperties) : undefined}
      >
        <code className="code-block-code">
          {lines
            ? lines.map((line, index) => (
                <span key={`${index}-${line}`} className="code-block-line">
                  {line}
                </span>
              ))
            : text}
        </code>
      </pre>
    </div>
  );
});
