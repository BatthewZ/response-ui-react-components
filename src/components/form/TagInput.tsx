"use client";
import { X } from "lucide-react";
import {
  type ComponentPropsWithRef,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { focusRingWithin, focusRingWithinError } from "../../util/focus";
import { mergeProps } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";
import { Badge } from "../ui/Badge";

import { useFieldError } from "./Field";

/** Why a candidate was refused. `invalid` covers a `validateTag` refusal. */
type TagRejection = "duplicate" | "max" | "invalid";

/** A refusal paired with the text that was refused, ready to be announced. */
type Rejection = { reason: TagRejection; tag: string };

const rejectionOf = (
  reason: TagRejection | null,
  candidate: string
): Rejection | null => (reason == null ? null : { reason, tag: candidate.trim() });

const defaultAddAnnouncement = (added: string[], count: number) =>
  `Added ${added.join(", ")}. ${count} ${count === 1 ? "tag" : "tags"}.`;

const defaultRemoveAnnouncement = (tag: string, count: number) =>
  `Removed ${tag}. ${count} ${count === 1 ? "tag" : "tags"}.`;

const defaultRejectAnnouncement = (reason: TagRejection, tag: string) => {
  if (reason === "duplicate") return `${tag} is already in the list.`;
  if (reason === "max") return `${tag} was not added. Tag limit reached.`;
  return `${tag} was not added.`;
};

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
  /**
   * Sentence announced in the component's one polite live region after tags are
   * committed. Takes the whole batch because a single paste commits several, and
   * one region write per commit is one announcement. Return `""` to say nothing.
   * @default (added, count) => `Added react, redux. 4 tags.`
   */
  addAnnouncement?: (added: string[], count: number) => string;
  /** @default (tag, count) => `Removed react. 3 tags.` */
  removeAnnouncement?: (tag: string, count: number) => string;
  /**
   * Announced when a candidate is refused, so a silent rejection is not also an
   * invisible one. `count` is the number of tags held, unchanged by the refusal.
   *
   * Not called when `validateTag` returned a string: that message renders in its
   * own live region already, and announcing it twice is worse than once.
   * @default (reason, tag) => `react is already in the list.`
   */
  rejectAnnouncement?: (
    reason: TagRejection,
    tag: string,
    count: number
  ) => string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * outermost element — the block holding the field, the validation message and
   * the announcer — so these reach the three parts inside it that no prop
   * otherwise addresses.
   *
   * - `control` — the bordered field box. The same word `Select`, `NumberInput`,
   *   `DatePicker` and `MultiSelect` spend on the same element
   *   (`docs/project-docs/slot-vocabulary.md` §6, §7.1). It is where `className` used to land.
   * - `input` — the text `<input>` a tag is typed into.
   * - `tagRemove` — a chip's remove button.
   *
   * `tagRemove` lands on **every** chip's button — the chips are generated from
   * `value` and no key can name the third one. The chip itself is a `Badge`, so
   * it takes `badgeProps` below rather than a slot.
   */
  classNames?: SlotClassNames<"control" | "input" | "tagRemove">;
  /**
   * Props for each chip's `Badge`. A chip is a bare `Badge` — this component
   * adds no class of its own to it — so a class string slot would have no base
   * to merge with and nothing else would reach the chip at all. A prop bag is
   * the route instead, and it carries `variant`, `title` and the rest of
   * `Badge`'s own surface with it.
   *
   * Applied to **every** chip; the chips are generated from `value`, so no key
   * can name the third one. `children` is `Omit`ted because the chip's content
   * is the tag, and `role` is set after the spread because a `list` owns only
   * `listitem`s.
   */
  badgeProps?: Omit<ComponentPropsWithRef<typeof Badge>, "children">;
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
      addAnnouncement = defaultAddAnnouncement,
      removeAnnouncement = defaultRemoveAnnouncement,
      rejectAnnouncement = defaultRejectAnnouncement,
      placeholder,
      error,
      disabled,
      className,
      classNames,
      badgeProps,
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
    const [announcement, setAnnouncement] = useState("");
    const messageId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const removeRefs = useRef<(HTMLButtonElement | null)[]>([]);
    // Set when a chip removes itself: its remove button is about to unmount, so
    // the successor has to be named before React drops it, or focus falls to
    // <body>. Backspace deliberately leaves it null — nothing the keyboard was
    // pointing at went away there, and chasing the chip would throw the user
    // out of the field mid-type.
    const pendingFocus = useRef<number | null>(null);

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
    ): { tag: string | null; message: string | null; reason: TagRejection | null } {
      const tag = candidate.trim();
      // Blank is not a rejection: nothing was asked for, so nothing is announced.
      if (tag === "") return { tag: null, message: null, reason: null };
      if (current.includes(tag)) {
        return { tag: null, message: null, reason: "duplicate" };
      }
      if (maxTags !== undefined && current.length >= maxTags) {
        return { tag: null, message: null, reason: "max" };
      }
      if (validateTag) {
        const result = validateTag(tag);
        if (result === false) return { tag: null, message: null, reason: "invalid" };
        if (typeof result === "string") {
          return { tag: null, message: result, reason: "invalid" };
        }
      }
      return { tag, message: null, reason: null };
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
    ): {
      next: string[];
      rest: string;
      message: string | null;
      rejection: Rejection | null;
    } {
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
        const { tag, message: msg, reason } = evaluate(segment, next);
        if (tag != null) {
          next.push(tag);
        } else if (segment.trim() !== "") {
          // Rejected: hand the rest back untouched rather than eating it.
          return {
            next,
            rest: text.slice(cursor),
            message: msg,
            rejection: rejectionOf(reason, segment),
          };
        }
        cursor = match.index + match[0].length;
      }
      const tail = text.slice(cursor);
      if (!commitTail || tail.trim() === "") {
        return {
          next,
          rest: commitTail ? "" : tail,
          message: null,
          rejection: null,
        };
      }
      const { tag, message: msg, reason } = evaluate(tail, next);
      if (tag != null) {
        next.push(tag);
        return { next, rest: "", message: null, rejection: null };
      }
      return { next, rest: tail, message: msg, rejection: rejectionOf(reason, tail) };
    }

    /**
     * One announcement per commit, whichever path produced it. An added batch
     * and a refusal can both come out of the same paste, so they compose into a
     * single region write rather than racing each other.
     */
    function announceCommit(
      before: string[],
      next: string[],
      msg: string | null,
      rejection: Rejection | null
    ) {
      const added = next.slice(before.length);
      const parts: string[] = [];
      if (added.length > 0) parts.push(addAnnouncement(added, next.length));
      // A `validateTag` string is already announced by the message element
      // below; a second channel for it would only say everything twice.
      if (rejection != null && msg == null) {
        parts.push(
          rejectAnnouncement(rejection.reason, rejection.tag, next.length)
        );
      }
      setAnnouncement(parts.filter(Boolean).join(" "));
    }

    function commitDraft() {
      const { tag, message: msg, reason } = evaluate(draft, tags);
      setMessage(msg);
      const next = tag != null ? [...tags, tag] : tags;
      announceCommit(tags, next, msg, rejectionOf(reason, draft));
      if (tag != null) {
        setTags(next);
        setDraft("");
        return;
      }
      // Nothing was committed. Clearing here would destroy the user's typing
      // for a duplicate, the `maxTags` cap or a `validateTag` refusal — keep it
      // so they can correct it. Only blank text has nothing worth keeping.
      if (draft.trim() === "") setDraft("");
    }

    function removeTag(index: number) {
      const tag = tags[index];
      if (tag === undefined) return;
      const next = tags.filter((_, i) => i !== index);
      setTags(next);
      setAnnouncement(removeAnnouncement(tag, next.length));
    }

    // The same successor rule Repeater settled on (#257): the control now
    // sitting at the vacated index, else the one before it, else the
    // container-level control that puts entries back — Add there, the text
    // input here. Focus moving *in* fires no blur, so the commit-on-blur path
    // is not on this route and the draft is untouched.
    useEffect(() => {
      const index = pendingFocus.current;
      if (index == null) return;
      pendingFocus.current = null;
      const buttons = removeRefs.current;
      const successor = buttons[index] ?? buttons[index - 1];
      const target = successor && !successor.disabled ? successor : inputRef.current;
      target?.focus();
    }, [tags]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      if (!splitter.test(raw)) {
        setDraft(raw);
        return;
      }
      const { next, rest, message: msg, rejection } = consume(raw, tags, false);
      setMessage(msg);
      if (next.length !== tags.length) setTags(next);
      setDraft(rest);
      announceCommit(tags, next, msg, rejection);
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
      const {
        next,
        rest,
        message: msg,
        rejection,
      } = consume(draft + text, tags, true);
      setMessage(msg);
      if (next.length !== tags.length) setTags(next);
      setDraft(rest);
      announceCommit(tags, next, msg, rejection);
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
      <div
        // The outermost element, per the house rule: it covers the field box,
        // the validation message and the announcer, so a margin or a width meant
        // for the whole control has somewhere to land. No base class, still
        // merged — see `cn`'s docblock in util/style.
        className={cn(className)}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-r6",
            "w-full px-r4 py-r5 bg-surface-0 border rounded-md",
            "border-border-strong duration-fast",
            focusRingWithin,
            hasError && focusRingWithinError,
            disabled && "bg-surface-3 cursor-not-allowed",
            classNames?.control
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
          {/* The chips are a list, so a screen reader can say how many there are
              and which one it is on — but a `list` owns only `listitem`s, and the
              text input and hidden inputs are siblings of the chips. `contents`
              drops the wrapper's own box, so the chips stay flex items of the
              bordered field exactly as before (measured identical in Firefox 146
              and Chrome) while the role survives (both engines expose it). */}
          {tags.length > 0 && (
            <div
              role="list"
              // slot:(a) `contents` is the mechanism, not a style: it removes
              // this element's own box so the chips stay flex items of the
              // bordered field while the `list` role survives. Any class a
              // caller could set here restores a box and re-lays out the chips,
              // which is the layout this element exists to avoid.
              className="contents"
            >
              {tags.map((tag, index) => (
                <Badge
                  key={`${index}:${tag}`}
                  {...badgeProps}
                  // After the bag, not before: `list` owns only `listitem`s, so
                  // this is the one prop the chip is not the caller's to change.
                  // Everything else — including `className`, which `Badge` merges
                  // with its own base classes — is theirs.
                  role="listitem"
                >
                  {tag}
                  <button
                    type="button"
                    ref={(node) => {
                      removeRefs.current[index] = node;
                    }}
                    aria-label={`Remove ${tag}`}
                    disabled={disabled}
                    onClick={() => {
                      pendingFocus.current = index;
                      removeTag(index);
                    }}
                    className={cn(
                      "inline-flex items-center justify-center rounded-sm text-fg-muted hover:text-fg-primary disabled:cursor-not-allowed cursor-pointer",
                      classNames?.tagRemove
                    )}
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
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
              "disabled:cursor-not-allowed",
              classNames?.input
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
          // slot:(a) a live region that is mounted whether or not it holds text,
          // and whose `sr-only` half is the mechanism that keeps the empty case
          // out of the visual flow. A class route here lets a caller drop
          // `sr-only` and reserve a permanent blank line under every field, or
          // hide the refusal text a sighted user is meant to read.
          className={cn("mt-r6 text-body-3 text-status-error", message == null && "sr-only")}
        >
          {message}
        </p>
        {/* One region for the whole control, mounted whether or not it holds
            anything: a region created in the same commit as its first text is
            not reliably announced. Every add, removal and refusal writes here,
            so N chips never become N live regions. */}
        <div
          // slot:(a) `sr-only` is the whole point of this element: it is the
          // component's one polite announcer, and a caller who could restyle it
          // could unhide it and print every add, removal and refusal on screen.
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          {announcement}
        </div>
      </div>
    );
  }
);
