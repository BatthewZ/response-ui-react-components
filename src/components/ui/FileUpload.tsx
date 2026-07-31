"use client";
import {
  type ComponentPropsWithRef,
  type DragEvent,
  forwardRef,
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { matchesAccept } from "../../util/accept";
import { formatBytes } from "../../util/format";
import { composeEventHandlers } from "../../util/merge-props";
import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `FileUpload.css` is gone; everything this component draws is here. Each
 * constant is one flat string literal because `verify:component-docs` and
 * `verify:focus-affordance` resolve hoisted constants textually and a composed
 * one would not resolve.
 *
 * **Every state is a conditional string, not a variant.** The stylesheet had six
 * `.file-upload--*` modifiers over one base rule on the same element — the shape
 * a partial conversion inverts, because a lone base declaration in
 * `@layer utilities` starts beating a modifier left in `@layer components`. It
 * also had four descendant rules keyed off those modifiers. None of that needs a
 * `data-*` variant: this component computes every one of those states in JS, so
 * each is passed as a later argument to `cn()` and tailwind-merge resolves the
 * pair at the call site. The argument order below reproduces the stylesheet's
 * source order exactly — `--has-files` last, because it is what let a populated
 * dropzone override the drag-over border and the disabled cursor.
 *
 * The `--modifier` class names are kept as declaration-free markers: they are
 * selectors a consumer stylesheet may already target, and the mirrored `data-*`
 * attributes remain the Tailwind-variant route from `className`.
 *
 * **`all: unset` did not need enumerating; it needed deleting.** It sat on the
 * two action buttons, and what it bought over Tailwind Preflight was nothing
 * this component wants: Preflight already gives a `<button>` `font: inherit`,
 * `color: inherit`, `background-color: transparent`, `border: 0 solid`,
 * `border-radius: 0`, `margin`, `padding` and `box-sizing` — which is exactly
 * what `Button.tsx` relies on while carrying no reset of its own. What `all:
 * unset` ADDED was `outline-style: none`, so those two buttons had no visible
 * focus indicator at all and no gate here could see it (`verify:focus-affordance`
 * reads `outline*` declarations, not `all`). Dropping the reset restores the UA
 * outline. The one behavioural difference left is the UA's `text-align: center`
 * and `display: inline-block`, and both are moot: the buttons are flex items in
 * `actionsClasses` with a single text run.
 *
 * `hover:` compiles to `@media (hover: hover) { &:hover }`, so the hover tints
 * no longer fire on a coarse pointer. That matches the rest of the package.
 */
const dropzoneClasses =
  "relative flex flex-col items-center justify-center gap-r5 w-full min-h-40 p-r3 border-2 border-dashed border-border-default rounded-md bg-surface-2 cursor-pointer transition-[border-color,background-color] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 focus-visible:rounded-md";

const iconClasses =
  "text-fg-muted transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none";

const textClasses = "text-center text-body-2 text-fg-muted";
const textEmphasisClasses = "font-semibold text-accent";
const hintClasses = "text-body-3 text-fg-muted text-center";
const errorClasses = "text-body-3 text-status-error text-center font-semibold";
const successClasses = "text-body-3 text-status-success text-center font-semibold";

/** Inset the three message slots take only inside the preview state. */
const messageInsetClasses = "px-r4 pb-r5";

const previewClasses = "flex flex-col w-full";

const mediaLargeClasses =
  "relative flex items-center justify-center h-40 bg-surface-2 rounded-t-md overflow-hidden";
const mediaLargeContentClasses = "max-w-full max-h-full object-contain";
const mediaRemoveClasses =
  "absolute top-r5 right-r5 z-1 flex items-center justify-center size-7 rounded-full bg-surface-0 text-fg-muted cursor-pointer shadow-[0_1px_3px_rgb(0_0_0/0.15)] transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none hover:bg-status-error-bg hover:text-status-error disabled:cursor-not-allowed disabled:opacity-50";
const mediaCaptionClasses = "flex items-baseline gap-r5 px-r4 py-r5";

const mediaGridClasses =
  "grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-0.5";
/** `group` is load-bearing: the cell's remove button reveals on cell hover, and
 *  the first cell's thumbnail takes the container's top-left radius. */
const mediaGridItemClasses = "group relative flex flex-col overflow-hidden";
const mediaGridContentClasses =
  "w-full aspect-square object-cover bg-surface-2 group-first:rounded-tl-[calc(var(--RADIUS-MD)-2px)]";
const mediaGridRemoveClasses =
  "absolute top-r6 right-r6 z-1 flex items-center justify-center size-6 rounded-full bg-surface-0 text-fg-muted cursor-pointer shadow-[0_1px_3px_rgb(0_0_0/0.15)] transition-[opacity,background-color,color] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none hover:bg-status-error-bg hover:text-status-error";
const mediaGridNameClasses =
  "text-body-3 text-fg-muted px-r5 py-r6 overflow-hidden text-ellipsis whitespace-nowrap";

const previewListClasses = "flex flex-col";
const previewItemClasses =
  "flex items-center gap-r4 p-r4 not-first:border-t not-first:border-border-default";
const previewThumbClasses =
  "size-10 shrink-0 object-cover rounded-sm border border-border-default bg-surface-2";
const previewFileIconClasses =
  "flex items-center justify-center shrink-0 size-10 rounded-sm bg-surface-2 text-fg-muted";
const previewInfoClasses = "flex flex-col gap-0.5 min-w-0 flex-1";
const previewNameClasses =
  "text-body-2 text-fg-primary font-semibold overflow-hidden text-ellipsis whitespace-nowrap";
const previewSizeClasses = "text-body-3 text-fg-muted";
const previewRemoveClasses =
  "flex items-center justify-center shrink-0 size-7 rounded-full text-fg-muted cursor-pointer transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none hover:bg-status-error-bg hover:text-status-error disabled:cursor-not-allowed disabled:opacity-50";

const actionsClasses =
  "flex items-center gap-r4 px-r4 py-r5 border-t border-border-default";
const actionButtonClasses =
  "text-body-3 font-semibold cursor-pointer rounded-sm px-1 py-0.5 transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50";
const replaceClasses = "text-accent hover:underline";
const clearClasses = "text-fg-muted hover:text-status-error";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Why `accept` / `maxSize` turned a file away. */
export type FileUploadRejection = {
  file: File;
  reason: "type" | "size";
};

/** Every fixed word FileUpload renders. See {@link DEFAULT_FILE_UPLOAD_LABELS}. */
export type FileUploadLabels = {
  /** Text before the browse affordance in the empty dropzone. */
  prompt?: string;
  /** The emphasised word inside the prompt that reads as the click target. */
  browse?: string;
  /** Replaces the prompt, and captions the preview, while `uploading`. */
  uploading?: string;
  /** Re-opens the picker from the preview. */
  replace?: string;
  /** Clears every file. Only rendered when `onClear` is given. */
  clearAll?: string;
  /** Accessible name of the empty dropzone. */
  dropzone?: string;
};

export const DEFAULT_FILE_UPLOAD_LABELS: Required<FileUploadLabels> = {
  prompt: "Drag & drop or",
  browse: "browse",
  uploading: "Uploading...",
  replace: "Replace",
  clearAll: "Clear all",
  dropzone: "Upload file",
};

const defaultRemoveFileLabel = (file: File) => `Remove ${file.name}`;

/**
 * One file, with everything the built-in previews are rendered from — the
 * argument of {@link FileUploadProps.renderFile} and, with `layout`, of
 * {@link FileUploadProps.renderPreview}.
 */
export type FileUploadPreviewItem = {
  file: File;
  /**
   * Object URL for an image or video. Absent for a non-media file, and for the
   * first paint after a selection: the URL is minted in an effect.
   */
  previewUrl?: string;
  /** Position in the `files` prop, which is what `onRemoveFile` is called with. */
  index: number;
  /**
   * Removes this file. Absent unless `onRemoveFile` was given — the built-in
   * previews render no remove control in that case, and neither should yours.
   */
  remove?: () => void;
  /** Accessible name for the remove control, from `removeFileLabel`. */
  removeLabel: string;
  /** True while `uploading`. The built-in remove controls disable on it. */
  disabled: boolean;
};

/** {@link FileUploadPreviewItem} plus the branch the preview dispatch took. */
export type FileUploadMediaPreviewItem = FileUploadPreviewItem & {
  /**
   * `"large"` for a lone image or video, `"grid"` when there are several. The
   * choice is made from the file list and `previewMode`, so a renderer that
   * cares has to be told rather than guess.
   */
  layout: "large" | "grid";
};

type FileUploadProps = {
  /**
   * Accepted file rules, in the same grammar as the input's `accept` attribute
   * this array also feeds: exact MIME (`image/png`), wildcard MIME (`image/*`),
   * or extension (`.pdf`). A file with no `type` matches only an extension rule.
   */
  accept?: string[];
  /** Maximum file size in bytes. */
  maxSize?: number;
  /** Allow selecting multiple files. */
  multiple?: boolean;
  /** Called when files are selected (via drop or browse). */
  onFilesSelected?: (files: File[]) => void;
  /**
   * Called with every file `accept` / `maxSize` turned away, on the same drop or
   * browse that reports the accepted ones. Without it a rejection still shows an
   * internal message; with it the caller can render its own.
   */
  onFilesRejected?: (rejections: FileUploadRejection[]) => void;
  /** Called when the user clears / removes all files via the built-in preview. */
  onClear?: () => void;
  /**
   * Called when the user removes a single file by index. Without it no per-file
   * remove control renders at all — falling back to `onClear` would drop every
   * file when the user asked for one.
   */
  onRemoveFile?: (index: number) => void;
  /** Currently selected files — pass these to enable the built-in preview. */
  files?: File[];
  /**
   * How to render file previews.
   * - `"auto"` (default): images/videos get large previews, other files get compact rows.
   * - `"compact"`: all files render as compact rows regardless of type.
   */
  previewMode?: "auto" | "compact";
  /** Disable the dropzone. */
  disabled?: boolean;
  /** Hint text shown below the main prompt. */
  hint?: string;
  /** Error message to display (overrides the internal rejection message). */
  error?: string | null;
  /** Success message to display. */
  success?: string | null;
  /** Whether the component is in an uploading state. */
  uploading?: boolean;
  /**
   * Overrides for the component's own fixed words. Any key you leave out keeps
   * its English default; `""` renders an empty string rather than the default.
   * `labels.dropzone` is a *default* accessible name — a caller's own
   * `aria-label` arrives in the rest props, which are spread last, and wins.
   */
  labels?: FileUploadLabels;
  /**
   * Accessible name of a file's remove button. A function rather than a `labels`
   * key because the file's name is interpolated into it — the same shape
   * `TagInput` and `Repeater` use for their announcements.
   * @default (file) => `Remove ${file.name}`
   */
  removeFileLabel?: (file: File) => string;
  /**
   * Replaces the built-in preview for an image or video.
   *
   * A render prop rather than slots, because which preview renders is decided
   * from the file list: one media file gets a large preview, several get grid
   * cells, and `previewMode="compact"` produces neither. A flat class map would
   * be a window onto element trees that may not render at all, so the whole
   * subtree is handed over instead — `layout` tells you which branch you are in.
   *
   * The grid container around your nodes stays this component's, so
   * `classNames.list` still reaches it.
   */
  renderPreview?: (item: FileUploadMediaPreviewItem) => ReactNode;
  /**
   * Replaces the built-in compact row. Receives every non-media file, and —
   * under `previewMode="compact"` — every file.
   *
   * The list container around your rows stays this component's, so
   * `classNames.list` still reaches it.
   */
  renderFile?: (item: FileUploadPreviewItem) => ReactNode;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * dropzone root — where the `--drag-over`, `--uploading`, `--error`,
   * `--success`, `--disabled` and `--has-files` modifiers ride, each mirrored as
   * a `data-*` attribute so a `data-drag-over:` variant works from `className`.
   * The union is written out here so an unknown key is a type error rather than
   * a silently ignored one.
   *
   * These reach the dropzone chrome only. The previews are `renderPreview` and
   * `renderFile`, for the reason given on those props. `hint`, `error`, `success`
   * and `text` each address **both** the empty state's element and the preview
   * state's; `list` addresses both the media grid and the compact row list.
   */
  classNames?: SlotClassNames<
    | "preview"
    | "list"
    | "hint"
    | "actions"
    | "replace"
    | "clear"
    | "error"
    | "success"
    | "icon"
    | "text"
    | "textEmphasis"
  >;
} & Omit<ComponentPropsWithRef<"div">, "children">;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildAcceptString(accept?: string[]): string | undefined {
  return accept && accept.length > 0 ? accept.join(",") : undefined;
}

function describeRejections(
  rejections: FileUploadRejection[],
  maxSize?: number,
): string {
  if (rejections.length > 1) {
    return `${rejections.length} files were not accepted.`;
  }
  const { file, reason } = rejections[0];
  if (reason === "size") {
    const limit = maxSize != null ? ` The maximum is ${formatBytes(maxSize)}.` : "";
    return `"${file.name}" is too large (${formatBytes(file.size)}).${limit}`;
  }
  return `"${file.name}" is not an accepted file type.`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  File-type icon (inline SVG to avoid extra deps)                    */
/* ------------------------------------------------------------------ */

function FileIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

/** Stable identity for the "no previews yet" render. Never mutated. */
const EMPTY_PREVIEWS: ReadonlyMap<File, string> = new Map();

/* ------------------------------------------------------------------ */
/*  Large media preview (single image/video)                           */
/* ------------------------------------------------------------------ */

function MediaPreviewLarge({
  file,
  previewUrl,
  removeLabel,
  onRemove,
  disabled,
}: {
  file: File;
  /** Absent for the first paint after selection: the URL is minted in an effect. */
  previewUrl?: string;
  removeLabel: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const isVideo = file.type.startsWith("video/");

  return (
    <div
      // slot:(e) this whole subtree is `renderPreview`'s, with `layout: "large"`.
      // Which of the three preview components renders is chosen from the file
      // list and `previewMode`, so a class key here would name elements a given
      // caller may never see; the content channel is the honest one.
      className={cn("file-upload__media-large", mediaLargeClasses)}
    >
      {onRemove && (
        <button
          type="button"
          // slot:(e) inside `MediaPreviewLarge` — replaced wholesale by
          // `renderPreview`, which is handed `remove` and `removeLabel` to build
          // its own control from.
          className={cn("file-upload__media-remove", mediaRemoveClasses)}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel}
        >
          <CloseIcon />
        </button>
      )}

      {previewUrl != null &&
        (isVideo ? (
          <video
            src={previewUrl}
            // slot:(e) inside `MediaPreviewLarge`, and one of a video/image pair
            // no key could tell apart — `renderPreview` gets `previewUrl` and
            // the `file`, and decides what to draw with them.
            className={cn("file-upload__media-large-content", mediaLargeContentClasses)}
            controls
            muted
          />
        ) : (
          <img
            src={previewUrl}
            alt={file.name}
            // slot:(e) inside `MediaPreviewLarge` — the image half of the pair
            // above, replaced by `renderPreview` along with it.
            className={cn("file-upload__media-large-content", mediaLargeContentClasses)}
          />
        ))}

      <div
        // slot:(e) inside `MediaPreviewLarge` — replaced wholesale by
        // `renderPreview`, which receives the `file` this caption is built from.
        className={cn("file-upload__media-caption", mediaCaptionClasses)}
      >
        <span
          // slot:(e) inside `MediaPreviewLarge` — replaced wholesale by
          // `renderPreview`; the name comes from `file.name`.
          className={cn("file-upload__preview-name", previewNameClasses)}
          title={file.name}
        >
          {file.name}
        </span>
        <span
          // slot:(e) inside `MediaPreviewLarge` — replaced wholesale by
          // `renderPreview`; the size comes from `file.size`.
          className={cn("file-upload__preview-size", previewSizeClasses)}
        >
          {formatBytes(file.size)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Media grid item (multiple images/videos)                           */
/* ------------------------------------------------------------------ */

function MediaPreviewGrid({
  file,
  previewUrl,
  removeLabel,
  onRemove,
  disabled,
}: {
  file: File;
  /** Absent for the first paint after selection: the URL is minted in an effect. */
  previewUrl?: string;
  removeLabel: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const isVideo = file.type.startsWith("video/");

  return (
    <div
      // slot:(e) this whole subtree is `renderPreview`'s, with `layout: "grid"`.
      // It is `.map`ped over the media files, so no slot key could address one
      // cell; what a caller wants here is different content in the cell, which
      // is what the render prop hands them. The grid container around it keeps
      // `classNames.list`.
      className={cn("file-upload__media-grid-item", mediaGridItemClasses)}
    >
      {onRemove && (
        <button
          type="button"
          // slot:(e) inside `MediaPreviewGrid` — replaced wholesale by
          // `renderPreview`, which is handed `remove` and `removeLabel`.
          className={cn(
            "file-upload__media-grid-remove",
            mediaGridRemoveClasses,
            // A disabled cell control stays visible at half strength rather
            // than only on hover — the reason it is unavailable has to be
            // readable without a pointer. The stylesheet got this from its
            // `:disabled` rule out-ranking the item-hover rule at equal
            // specificity by source order; here the branch says it outright.
            disabled ? "opacity-50 cursor-not-allowed" : "opacity-0 group-hover:opacity-100"
          )}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel}
        >
          <CloseIcon />
        </button>
      )}

      {previewUrl != null &&
        (isVideo ? (
          <video
            src={previewUrl}
            // slot:(e) inside `MediaPreviewGrid`, and one of a video/image pair
            // no key could tell apart — `renderPreview` gets `previewUrl` and
            // the `file`, and decides what to draw with them.
            className={cn("file-upload__media-grid-content", mediaGridContentClasses)}
            muted
          />
        ) : (
          <img
            src={previewUrl}
            alt={file.name}
            // slot:(e) inside `MediaPreviewGrid` — the image half of the pair
            // above, replaced by `renderPreview` along with it.
            className={cn("file-upload__media-grid-content", mediaGridContentClasses)}
          />
        ))}

      <span
        // slot:(e) inside `MediaPreviewGrid` — replaced wholesale by
        // `renderPreview`; the name comes from `file.name`.
        className={cn("file-upload__media-grid-name", mediaGridNameClasses)}
        title={file.name}
      >
        {file.name}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact file row (all file types)                                  */
/* ------------------------------------------------------------------ */

function FilePreviewItem({
  file,
  previewUrl,
  removeLabel,
  onRemove,
  disabled,
}: {
  file: File;
  previewUrl?: string | null;
  removeLabel: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const isImage = file.type.startsWith("image/");

  return (
    <div
      // slot:(e) this whole subtree is `renderFile`'s. It is `.map`ped over the
      // non-media files — and over every file under `previewMode="compact"` — so
      // no slot key could address one row. The list container around it keeps
      // `classNames.list`.
      className={cn("file-upload__preview-item", previewItemClasses)}
    >
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          // slot:(e) inside `FilePreviewItem`, and one of a thumbnail/glyph pair
          // chosen from the file's MIME type — `renderFile` gets both `file` and
          // `previewUrl` and makes the same choice itself.
          className={cn("file-upload__preview-thumb", previewThumbClasses)}
        />
      ) : (
        <span
          // slot:(e) inside `FilePreviewItem` — the glyph half of the pair above,
          // replaced by `renderFile` along with it.
          className={cn("file-upload__preview-file-icon", previewFileIconClasses)}
        >
          <FileIcon />
        </span>
      )}

      <div
        // slot:(e) inside `FilePreviewItem` — replaced wholesale by `renderFile`,
        // which receives the `file` this block is built from.
        className={cn("file-upload__preview-info", previewInfoClasses)}
      >
        <span
          // slot:(e) inside `FilePreviewItem` — replaced wholesale by
          // `renderFile`; the name comes from `file.name`.
          className={cn("file-upload__preview-name", previewNameClasses)}
          title={file.name}
        >
          {file.name}
        </span>
        <span
          // slot:(e) inside `FilePreviewItem` — replaced wholesale by
          // `renderFile`; the size comes from `file.size`.
          className={cn("file-upload__preview-size", previewSizeClasses)}
        >
          {formatBytes(file.size)}
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          // slot:(e) inside `FilePreviewItem` — replaced wholesale by
          // `renderFile`, which is handed `remove` and `removeLabel`.
          className={cn("file-upload__preview-remove", previewRemoveClasses)}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(function FileUpload(
  {
    accept,
    maxSize,
    multiple = false,
    onFilesSelected,
    onFilesRejected,
    onClear,
    onRemoveFile,
    files: filesProp,
    previewMode = "auto",
    disabled = false,
    hint,
    error,
    success,
    uploading = false,
    labels,
    removeFileLabel = defaultRemoveFileLabel,
    renderPreview,
    renderFile,
    className,
    classNames,
    onClick,
    onKeyDown,
    onDragOver,
    onDragLeave,
    onDrop,
    ...props
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const text = { ...DEFAULT_FILE_UPLOAD_LABELS, ...labels };

  const hasFiles = filesProp != null && filesProp.length > 0;

  /* ---- Object URLs for media previews ---- */

  // Minting belongs in an effect, not in a memo (#416). A memo runs during
  // render, so StrictMode's double render minted two URLs per media file and
  // committed only the second map — the first set leaked for the page's life.
  // The ref is the live set: it is keyed by `File` identity rather than by the
  // `files` array's identity, so an inline `files={[file]}` re-render finds the
  // same File objects and reuses their URLs instead of churning through a fresh
  // mint/revoke pair every time the parent renders.
  const liveUrlsRef = useRef(new Map<File, string>());
  // Seeded from a shared empty map rather than from the ref, so render never
  // reads the mutable set (DataTable's EMPTY_SELECTION, same reason).
  const [previewUrls, setPreviewUrls] = useState<ReadonlyMap<File, string>>(EMPTY_PREVIEWS);

  useEffect(() => {
    const live = liveUrlsRef.current;
    const wanted = new Set((filesProp ?? []).filter(isMediaFile));

    let changed = false;
    for (const file of wanted) {
      if (!live.has(file)) {
        live.set(file, URL.createObjectURL(file));
        changed = true;
      }
    }
    for (const [file, url] of live) {
      if (!wanted.has(file)) {
        URL.revokeObjectURL(url);
        live.delete(file);
        changed = true;
      }
    }
    // A new map only when the contents moved: an unchanged set keeps the same
    // object, so `<img src>` stays byte-identical and the image is not re-decoded.
    if (changed) setPreviewUrls(new Map(live));
  }, [filesProp]);

  // Unmount only — and it is what makes StrictMode's simulated unmount release
  // the first pass's URLs before the effect above re-mints them.
  useEffect(() => {
    const live = liveUrlsRef.current;
    return () => {
      for (const url of live.values()) URL.revokeObjectURL(url);
      live.clear();
    };
  }, []);

  /* ---- Partition files into media vs non-media ---- */

  const useCompact = previewMode === "compact";

  const { mediaFiles, otherFiles } = useMemo(() => {
    if (!filesProp || useCompact) return { mediaFiles: [] as File[], otherFiles: filesProp ?? [] as File[] };
    const media: File[] = [];
    const other: File[] = [];
    for (const file of filesProp) {
      if (isMediaFile(file)) media.push(file);
      else other.push(file);
    }
    return { mediaFiles: media, otherFiles: other };
  }, [filesProp, useCompact]);

  // One shape for both render props and for the built-in previews, so a custom
  // renderer is given exactly what the default one had — including the `index`
  // `onRemoveFile` is called with, which is otherwise not derivable from a
  // partitioned list.
  const previewItem = useCallback(
    (file: File): FileUploadPreviewItem => {
      const index = filesProp ? filesProp.indexOf(file) : -1;
      return {
        file,
        previewUrl: previewUrls.get(file),
        index,
        remove: onRemoveFile ? () => onRemoveFile(index) : undefined,
        removeLabel: removeFileLabel(file),
        disabled: uploading,
      };
    },
    [filesProp, previewUrls, onRemoveFile, removeFileLabel, uploading],
  );

  /* ---- Validation ---- */

  const validateFiles = useCallback(
    (files: File[]): { accepted: File[]; rejected: FileUploadRejection[] } => {
      const accepted: File[] = [];
      const rejected: FileUploadRejection[] = [];
      for (const file of files) {
        if (accept && !matchesAccept(file, accept)) {
          rejected.push({ file, reason: "type" });
        } else if (maxSize != null && file.size > maxSize) {
          rejected.push({ file, reason: "size" });
        } else {
          accepted.push(file);
        }
      }
      return { accepted, rejected };
    },
    [accept, maxSize],
  );

  /* ---- Handlers ---- */

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const { accepted, rejected } = validateFiles(Array.from(fileList));

      // A rejection used to be entirely silent: no callback, no message, no state.
      setRejectionMessage(rejected.length > 0 ? describeRejections(rejected, maxSize) : null);
      if (rejected.length > 0) {
        onFilesRejected?.(rejected);
      }

      if (accepted.length > 0) {
        onFilesSelected?.(multiple ? accepted : [accepted[0]]);
      }
    },
    [validateFiles, maxSize, onFilesRejected, onFilesSelected, multiple],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !uploading) setDragOver(true);
    },
    [disabled, uploading],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (disabled || uploading) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, uploading, handleFiles],
  );

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) inputRef.current?.click();
  }, [disabled, uploading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled, uploading],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be re-selected.
      e.target.value = "";
    },
    [handleFiles],
  );

  /* ---- Hint text ---- */

  const computedHint = hint ?? (maxSize ? `Max file size: ${formatBytes(maxSize)}` : undefined);

  /* ---- Messages ---- */

  // The `error` prop overrides the internal rejection state, as its doc says.
  const shownError = error ?? rejectionMessage;

  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const successId = `${baseId}-success`;
  // The hint only renders alongside the prompt, so it can only be referenced there.
  const showHint = computedHint != null && !hasFiles && !shownError && !success;
  const describedBy =
    [showHint && hintId, shownError && errorId, success && successId]
      .filter(Boolean)
      .join(" ") || undefined;

  /* ---- Render ---- */

  return (
    <div
      ref={ref}
      // With a preview on screen the dropzone holds real buttons, and ARIA makes
      // every descendant of a `button` presentational — so it is only a button
      // in the empty state, where it is the one thing to press.
      role={hasFiles ? undefined : "button"}
      tabIndex={hasFiles ? undefined : disabled ? -1 : 0}
      aria-label={hasFiles ? undefined : text.dropzone}
      aria-disabled={disabled || undefined}
      aria-busy={uploading || undefined}
      aria-describedby={describedBy}
      // The six `--modifier` classes below, mirrored as attributes. A modifier
      // class is a selector for a consumer stylesheet; a `data-*` attribute is
      // also a Tailwind variant, so `className="data-drag-over:ring-2"` works
      // from the one prop that already reaches this element. The classes are
      // retained as the CSS hooks they have always been.
      data-has-files={hasFiles || undefined}
      data-drag-over={dragOver || undefined}
      data-uploading={uploading || undefined}
      data-success={Boolean(success) || undefined}
      data-error={Boolean(shownError) || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        "file-upload",
        dropzoneClasses,
        !disabled && "hover:border-border-focus",
        dragOver && "file-upload--drag-over border-border-focus bg-surface-3",
        // The controls carry `disabled`, which a keyboard also respects;
        // `pointer-events: none` only ever hid the reason from the mouse.
        uploading && "file-upload--uploading cursor-progress",
        success && "file-upload--success border-status-success bg-status-success-bg",
        shownError && "file-upload--error border-status-error bg-status-error-bg",
        disabled && "file-upload--disabled opacity-50 cursor-not-allowed pointer-events-none",
        // Last, and that is the stylesheet's own order: a populated dropzone
        // draws a solid border and no inset whatever else is going on.
        hasFiles &&
          "file-upload--has-files border-solid border-border-default cursor-default min-h-auto p-0",
        hasFiles && !disabled && "hover:border-border-default",
        className,
      )}
      onClick={composeEventHandlers(onClick, handleClick)}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
      onDragOver={composeEventHandlers(onDragOver, handleDragOver)}
      onDragLeave={composeEventHandlers(onDragLeave, handleDragLeave)}
      onDrop={composeEventHandlers(onDrop, handleDrop)}
      {...props}
    >
      {hasFiles ? (
        /* ---- Preview state ---- */
        <div
          className={cn("file-upload__preview", previewClasses, classNames?.preview)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {/* Single media file — large preview */}
          {mediaFiles.length === 1 &&
            (renderPreview ? (
              renderPreview({ ...previewItem(mediaFiles[0]), layout: "large" })
            ) : (
              <MediaPreviewLarge
                file={mediaFiles[0]}
                previewUrl={previewUrls.get(mediaFiles[0])}
                removeLabel={removeFileLabel(mediaFiles[0])}
                onRemove={
                  onRemoveFile ? () => onRemoveFile(filesProp.indexOf(mediaFiles[0])) : undefined
                }
                disabled={uploading}
              />
            ))}

          {/* Multiple media files — grid */}
          {mediaFiles.length > 1 && (
            <div className={cn("file-upload__media-grid", mediaGridClasses, classNames?.list)}>
              {mediaFiles.map((file, i) => (
                <Fragment key={`${file.name}-${file.size}-${i}`}>
                  {renderPreview ? (
                    renderPreview({ ...previewItem(file), layout: "grid" })
                  ) : (
                    <MediaPreviewGrid
                      file={file}
                      previewUrl={previewUrls.get(file)}
                      removeLabel={removeFileLabel(file)}
                      onRemove={
                        onRemoveFile ? () => onRemoveFile(filesProp.indexOf(file)) : undefined
                      }
                      disabled={uploading}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          )}

          {/* Non-media / compact files — rows */}
          {otherFiles.length > 0 && (
            <div
              className={cn(
                "file-upload__preview-list",
                previewListClasses,
                // Separator where the rows follow a media preview, large or grid.
                mediaFiles.length > 0 && "border-t border-border-default",
                classNames?.list,
              )}
            >
              {otherFiles.map((file, i) => (
                <Fragment key={`${file.name}-${file.size}-${i}`}>
                  {renderFile ? (
                    renderFile(previewItem(file))
                  ) : (
                    <FilePreviewItem
                      file={file}
                      previewUrl={previewUrls.get(file)}
                      removeLabel={removeFileLabel(file)}
                      onRemove={
                        onRemoveFile ? () => onRemoveFile(filesProp.indexOf(file)) : undefined
                      }
                      disabled={uploading}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          )}

          {/* Uploading — otherwise the disabled actions below say nothing */}
          {uploading && (
            <p
              className={cn(
                "file-upload__hint",
                hintClasses,
                messageInsetClasses,
                classNames?.hint,
              )}
              role="status"
            >
              {text.uploading}
            </p>
          )}

          <div className={cn("file-upload__preview-actions", actionsClasses, classNames?.actions)}>
            <button
              type="button"
              className={cn(
                "file-upload__preview-replace",
                actionButtonClasses,
                replaceClasses,
                classNames?.replace,
              )}
              disabled={uploading || disabled}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              {text.replace}
            </button>
            {onClear && (
              <button
                type="button"
                className={cn(
                  "file-upload__preview-clear",
                  actionButtonClasses,
                  clearClasses,
                  classNames?.clear,
                )}
                disabled={uploading || disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              >
                {text.clearAll}
              </button>
            )}
          </div>

          {/* Error message */}
          {shownError && (
            <p
              id={errorId}
              role="alert"
              className={cn(
                "file-upload__error",
                errorClasses,
                messageInsetClasses,
                classNames?.error,
              )}
            >
              {shownError}
            </p>
          )}

          {/* Success message */}
          {success && (
            <p
              id={successId}
              role="status"
              className={cn(
                "file-upload__success",
                successClasses,
                messageInsetClasses,
                classNames?.success,
              )}
            >
              {success}
            </p>
          )}
        </div>
      ) : (
        /* ---- Empty / prompt state ---- */
        <>
          {/* Icon */}
          <span
            className={cn(
              "file-upload__icon",
              iconClasses,
              dragOver && "text-border-focus",
              success && "text-status-success",
              shownError && "text-status-error",
              classNames?.icon,
            )}
            aria-hidden="true"
          >
            <UploadIcon />
          </span>

          {/* Main text */}
          {uploading ? (
            <p className={cn("file-upload__text", textClasses, classNames?.text)}>{text.uploading}</p>
          ) : (
            <p className={cn("file-upload__text", textClasses, classNames?.text)}>
              {text.prompt}{" "}
              <span
                className={cn(
                  "file-upload__text-emphasis",
                  textEmphasisClasses,
                  classNames?.textEmphasis,
                )}
              >
                {text.browse}
              </span>
            </p>
          )}

          {/* Hint / constraints */}
          {showHint && (
            <p
              id={hintId}
              className={cn("file-upload__hint", hintClasses, classNames?.hint)}
            >
              {computedHint}
            </p>
          )}

          {/* Error message */}
          {shownError && (
            <p
              id={errorId}
              role="alert"
              className={cn("file-upload__error", errorClasses, classNames?.error)}
            >
              {shownError}
            </p>
          )}

          {/* Success message */}
          {success && (
            <p
              id={successId}
              role="status"
              className={cn("file-upload__success", successClasses, classNames?.success)}
            >
              {success}
            </p>
          )}
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={buildAcceptString(accept)}
        multiple={multiple}
        disabled={disabled || uploading}
        onChange={handleInputChange}
        // Programmatic click() bubbles back to the dropzone and re-enters its handlers.
        onClick={(e) => e.stopPropagation()}
        // slot:(a) the real file input. `sr-only` is what keeps it off screen
        // while leaving it clickable programmatically; anything else either
        // reveals a raw file control inside the dropzone or takes it out of the
        // accessibility tree. `accept`, `multiple` and `disabled` are the props
        // that configure it.
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
});
