import { Kbd } from "./Kbd";

/** One key, named inline in a sentence — the reason `<kbd>` exists. */
export function Minimal() {
  return (
    <p>
      Press <Kbd>Esc</Kbd> to close the dialog.
    </p>
  );
}

/** Kbd caps one key. A chord or a sequence is several of them with plain text between. */
export function Combinations() {
  return (
    <div className="flex flex-col gap-r5">
      <p>
        Open the command palette with <Kbd>⌘</Kbd> + <Kbd>K</Kbd>.
      </p>
      <p>
        Press <Kbd>G</Kbd> then <Kbd>I</Kbd> to jump to your issues.
      </p>
    </div>
  );
}

/** A `1.5em` min-width floor keeps a narrow glyph from rendering a visibly thinner cap. */
export function KeyWidths() {
  return (
    <div className="flex items-center gap-r5">
      <Kbd>I</Kbd>
      <Kbd>W</Kbd>
      <Kbd>1</Kbd>
      <Kbd>Shift</Kbd>
      <Kbd>Enter</Kbd>
    </div>
  );
}

/** Menu shape: label left, one cap holding the whole shortcut pushed right — how CommandPalette renders its `shortcut`. */
export function ShortcutRow() {
  return (
    <div className="flex flex-col gap-r5">
      <div className="flex items-center justify-between gap-r4">
        <span>Save changes</span>
        <Kbd>⌘ S</Kbd>
      </div>
      <div className="flex items-center justify-between gap-r4">
        <span>Toggle sidebar</span>
        <Kbd>⌘ B</Kbd>
      </div>
    </div>
  );
}

/** `className` goes through tailwind-merge, so a conflicting utility replaces the default instead of fighting it. */
export function Restyled() {
  return (
    <p>
      Hold <Kbd className="bg-surface-3 text-fg-primary">Alt</Kbd> to drag a copy.
    </p>
  );
}
