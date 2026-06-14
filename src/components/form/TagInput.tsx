"use client";
import { X } from "lucide-react";
import {
  type ComponentPropsWithRef,
  forwardRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { cn } from "../../util/style";

import { useFieldError } from "./Field";

type TagInputProps = {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (tags: string[]) => void;
  maxTags?: number;
  validateTag?: (tag: string) => boolean | string;
  delimiter?: RegExp;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
} & Omit<
  ComponentPropsWithRef<"input">,
  "value" | "defaultValue" | "onChange"
>;

export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(
  function TagInput(
    {
      value,
      defaultValue,
      onValueChange,
      maxTags,
      validateTag,
      delimiter = /[,\n]/,
      placeholder,
      error,
      disabled,
      className,
      onKeyDown,
      onPaste,
      onBlur,
      ...props
    },
    ref
  ) {
    const [tags, setTags] = useControllableState<string[]>({
      value,
      defaultValue: defaultValue ?? [],
      onChange: onValueChange,
    });
    const [draft, setDraft] = useState("");
    const [message, setMessage] = useState<string | null>(null);

    // Drive the visual error state from the same source as Input/Select: an
    // explicit `error` prop OR the surrounding Field's invalid state, plus any
    // local tag-validation message. Without the Field fallback the border would
    // stay neutral inside a <Field> even when the form marks it invalid.
    const { invalid, ariaProps } = useFieldError(error);

    /**
     * Validate + dedupe a single candidate against the live set. Pure — no
     * state writes. `tag` is the value to add (null = reject); `message` is a
     * validation message to surface (only set when validateTag returns string).
     */
    function evaluate(
      candidate: string,
      current: string[]
    ): { tag: string | null; message: string | null } {
      const tag = candidate.trim();
      if (tag === "") return { tag: null, message: null };
      if (current.includes(tag)) return { tag: null, message: null };
      if (maxTags !== undefined && current.length >= maxTags) {
        return { tag: null, message: null };
      }
      if (validateTag) {
        const result = validateTag(tag);
        if (result === false) return { tag: null, message: null };
        if (typeof result === "string") return { tag: null, message: result };
      }
      return { tag, message: null };
    }

    function commitDraft() {
      const { tag, message: msg } = evaluate(draft, tags);
      setMessage(msg);
      if (tag != null) {
        setTags([...tags, tag]);
      }
      // Keep the draft only when a validation message asks the user to fix it.
      if (msg == null) setDraft("");
    }

    function removeTag(index: number) {
      setTags(tags.filter((_, i) => i !== index));
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      if (delimiter.test(raw)) {
        // A delimiter char was typed — commit the segment before it.
        const segment = raw.split(delimiter)[0] ?? "";
        const { tag, message: msg } = evaluate(segment, tags);
        setMessage(msg);
        if (tag != null) {
          setTags([...tags, tag]);
        }
        setDraft("");
        return;
      }
      setDraft(raw);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitDraft();
      } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
        e.preventDefault();
        removeTag(tags.length - 1);
      }
      onKeyDown?.(e);
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
      const text = e.clipboardData.getData("text");
      if (!delimiter.test(text)) {
        onPaste?.(e);
        return;
      }
      e.preventDefault();
      setMessage(null);
      const next = [...tags];
      for (const part of text.split(delimiter)) {
        const { tag } = evaluate(part, next);
        if (tag != null) next.push(tag);
      }
      if (next.length !== tags.length) setTags(next);
      setDraft("");
      onPaste?.(e);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      commitDraft();
      onBlur?.(e);
    }

    const hasError = invalid || message != null;
    // aria-invalid tracks the full visual error state (Field/error prop + local
    // message); aria-describedby keeps pointing at the Field's error element.
    const fieldErrorProps = {
      ...ariaProps,
      "aria-invalid": hasError ? ("true" as const) : undefined,
    };

    return (
      <div>
        <div
          className={cn(
            "flex flex-wrap items-center gap-r6",
            "w-full px-r4 py-r5 bg-surface-0 border rounded-md",
            "border-border-strong duration-fast",
            "focus-within:ring-2 focus-within:ring-border-focus focus-within:border-border-focus",
            hasError &&
              "border-status-error focus-within:ring-status-error",
            disabled && "bg-surface-3 cursor-not-allowed",
            className
          )}
        >
          {tags.map((tag, index) => (
            <span
              key={tag}
              className="inline-flex items-center gap-r6 rounded-sm px-r5 py-r6 text-body-3 font-semibold bg-surface-2 text-fg-secondary"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                disabled={disabled}
                onClick={() => removeTag(index)}
                className="inline-flex items-center justify-center rounded-sm text-fg-muted hover:text-fg-primary disabled:cursor-not-allowed cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            ref={ref}
            type="text"
            value={draft}
            disabled={disabled}
            placeholder={tags.length === 0 ? placeholder : undefined}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={handleBlur}
            {...fieldErrorProps}
            className={cn(
              "flex-1 min-w-[6rem] bg-transparent outline-none text-body-2 text-fg-primary placeholder:text-fg-muted",
              "disabled:cursor-not-allowed"
            )}
            {...props}
          />
        </div>
        <p
          aria-live="polite"
          className={cn("mt-r6 text-body-3 text-status-error", message == null && "sr-only")}
        >
          {message}
        </p>
      </div>
    );
  }
);
