"use client";
import { X } from "lucide-react";
import {
  type ComponentPropsWithRef,
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { focusRingWithin, focusRingWithinError } from "../../util/focus";
import { mergeProps } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import { Badge } from "../ui/Badge";

import { useFieldError } from "./Field";

type TagInputProps = {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (tags: string[]) => void;
  /**
   * Called with the committed tags — the same payload as `onValueChange`, not a
   * DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<string[]>("tags")}` binding
   * works: a JSX spread performs no excess-property check, so `Omit`ting
   * `onChange` never stopped `field()` delivering it — it only stopped
   * TypeScript reporting it.
   */
  onChange?: (tags: string[]) => void;
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
      onChange,
      name,
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
      onChange: (next) => {
        onValueChange?.(next);
        onChange?.(next);
      },
    });
    const [draft, setDraft] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const messageId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    // `RegExp.prototype.test` advances `lastIndex` on a `g`/`y` regex, so
    // testing the caller's own object would leave it half-consumed and make the
    // next call answer differently. Work from a flagless copy instead.
    const splitter = useMemo(
      () =>
        /[gy]/.test(delimiter.flags)
          ? new RegExp(delimiter.source, delimiter.flags.replace(/[gy]/g, ""))
          : delimiter,
      [delimiter]
    );

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

    /**
     * Commit every delimited segment of `text` in turn, stopping at the first
     * one the rules reject. Returns the tags to hold and the text that was NOT
     * consumed — the trailing segment, or everything from the rejected segment
     * on — so nothing the user typed is ever dropped on the floor.
     *
     * `commitTail` decides what happens to the text after the last delimiter:
     * typing keeps it as the live draft, pasting commits it.
     */
    function consume(
      text: string,
      current: string[],
      commitTail: boolean
    ): { next: string[]; rest: string; message: string | null } {
      // A fresh `g` copy per call: the scan is stateful, so it must not be
      // shared between calls (or with the caller's own RegExp).
      const scanner = new RegExp(
        splitter.source,
        `${splitter.flags.replace(/g/g, "")}g`
      );
      const next = [...current];
      let cursor = 0;
      let match: RegExpExecArray | null;
      while ((match = scanner.exec(text)) !== null) {
        if (match[0] === "") {
          scanner.lastIndex += 1;
          continue;
        }
        const segment = text.slice(cursor, match.index);
        const { tag, message: msg } = evaluate(segment, next);
        if (tag != null) {
          next.push(tag);
        } else if (segment.trim() !== "") {
          // Rejected: hand the rest back untouched rather than eating it.
          return { next, rest: text.slice(cursor), message: msg };
        }
        cursor = match.index + match[0].length;
      }
      const tail = text.slice(cursor);
      if (!commitTail || tail.trim() === "") {
        return { next, rest: commitTail ? "" : tail, message: null };
      }
      const { tag, message: msg } = evaluate(tail, next);
      if (tag != null) {
        next.push(tag);
        return { next, rest: "", message: null };
      }
      return { next, rest: tail, message: msg };
    }

    function commitDraft() {
      const { tag, message: msg } = evaluate(draft, tags);
      setMessage(msg);
      if (tag != null) {
        setTags([...tags, tag]);
        setDraft("");
        return;
      }
      // Nothing was committed. Clearing here would destroy the user's typing
      // for a duplicate, the `maxTags` cap or a `validateTag` refusal — keep it
      // so they can correct it. Only blank text has nothing worth keeping.
      if (draft.trim() === "") setDraft("");
    }

    function removeTag(index: number) {
      setTags(tags.filter((_, i) => i !== index));
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      if (!splitter.test(raw)) {
        setDraft(raw);
        return;
      }
      const { next, rest, message: msg } = consume(raw, tags, false);
      setMessage(msg);
      if (next.length !== tags.length) setTags(next);
      setDraft(rest);
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
      if (!splitter.test(text)) {
        onPaste?.(e);
        return;
      }
      e.preventDefault();
      // The pasted text lands after whatever is already half-typed, so the
      // pending draft is part of the first segment rather than something to
      // throw away.
      const { next, rest, message: msg } = consume(draft + text, tags, true);
      setMessage(msg);
      if (next.length !== tags.length) setTags(next);
      setDraft(rest);
      onPaste?.(e);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      commitDraft();
      onBlur?.(e);
    }

    const hasError = invalid || message != null;
    // aria-invalid tracks the full visual error state (Field/error prop + local
    // message). The local validation message is a second description alongside
    // any Field error element, so both ids travel together.
    const describedBy =
      [ariaProps["aria-describedby"], message != null ? messageId : undefined]
        .filter(Boolean)
        .join(" ") || undefined;
    const fieldErrorProps = {
      ...ariaProps,
      "aria-describedby": describedBy,
      "aria-invalid": hasError ? ("true" as const) : undefined,
    };

    return (
      <div>
        <div
          className={cn(
            "flex flex-wrap items-center gap-r6",
            "w-full px-r4 py-r5 bg-surface-0 border rounded-md",
            "border-border-strong duration-fast",
            focusRingWithin,
            hasError && focusRingWithinError,
            disabled && "bg-surface-3 cursor-not-allowed",
            className
          )}
          // The bordered box is the control's hit area, not just its frame:
          // clicking its padding must reach the text input the way it does in
          // a plain <input>. Guarded so a click on a chip's remove button (or
          // the input itself) is left alone.
          onMouseDown={(event) => {
            if (disabled) return;
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          {tags.map((tag, index) => (
            <Badge key={`${index}:${tag}`} className="gap-r6">
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
            </Badge>
          ))}
          <input
            ref={mergeRefs(ref, inputRef)}
            type="text"
            value={draft}
            disabled={disabled}
            placeholder={tags.length === 0 ? placeholder : undefined}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={handleBlur}
            className={cn(
              "flex-1 min-w-[6rem] bg-transparent outline-none text-body-2 text-fg-primary placeholder:text-fg-muted",
              "disabled:cursor-not-allowed"
            )}
            // `field()` always emits the KEY `aria-invalid`, valued `undefined`
            // when the field is valid — a plain spread would therefore erase the
            // state computed above. Merging keeps ours when we have an opinion
            // and the caller's when we do not; swapping the spread order would
            // just mirror the bug.
            {...mergeProps(props, fieldErrorProps)}
          />
          {/* Native form participation: one hidden input per committed tag, so
              `new FormData(form)` yields the tags rather than whatever is
              half-typed in the visible field. Same shape as DatePicker and
              Switch. `name` is deliberately kept off the draft input. */}
          {name !== undefined &&
            tags.map((tag, index) => (
              <input key={`${index}:${tag}`} type="hidden" name={name} value={tag} />
            ))}
        </div>
        <p
          id={messageId}
          aria-live="polite"
          className={cn("mt-r6 text-body-3 text-status-error", message == null && "sr-only")}
        >
          {message}
        </p>
      </div>
    );
  }
);
