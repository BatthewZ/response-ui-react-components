import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";
import { CopyButton } from "./CopyButton";

type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  copyable?: boolean;
} & Omit<ComponentPropsWithRef<"div">, "children">;

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  { code, language, filename, showLineNumbers = false, copyable = true, className, ...props },
  ref
) {
  const showHeader = Boolean(filename) || Boolean(language) || copyable;
  const label = filename ?? "Code block";

  // Strip a single trailing newline so a code string ending in "\n" doesn't
  // render a phantom empty final line (with its own line number).
  const lines = showLineNumbers ? code.replace(/\n$/, "").split("\n") : null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      className={cn("code-block", className)}
      {...props}
    >
      {showHeader && (
        <div className="code-block-header">
          {filename && <span className="code-block-filename">{filename}</span>}
          {language && <span className="code-block-language">{language.toLowerCase()}</span>}
          {copyable && <CopyButton value={code} className="code-block-copy" />}
        </div>
      )}
      <pre className="code-block-pre">
        <code className="code-block-code">
          {lines
            ? lines.map((line, index) => (
                <span key={`${index}-${line}`} className="code-block-line">
                  {line}
                </span>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
});
