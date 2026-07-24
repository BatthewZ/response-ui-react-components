import { useRef, useState } from "react";

import { useFocusTrap } from "../../hooks/use-focus-trap";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Card } from "./Card";
import { Portal } from "./Portal";

/** Children mount at the end of `<body>`, clear of every clipping and stacking ancestor. */
export function Minimal() {
  return (
    <Portal>
      <div className="fixed right-r4 bottom-r4 z-50">
        <Alert variant="success">Changes saved</Alert>
      </div>
    </Portal>
  );
}

/**
 * The Portal is written inside a clipping ancestor and its output still escapes: Card is
 * `overflow-hidden`, so the same menu rendered inline would be cut off at the card edge.
 */
export function EscapeClipping() {
  return (
    <Card padding="r4">
      <h3>Q3 revenue</h3>
      <Button variant="ghost">Export…</Button>
      <Portal>
        <div className="fixed top-r3 right-r3 z-50 rounded-md bg-surface-0 p-r5 shadow-lg">
          <Button variant="ghost">Download CSV</Button>
          <Button variant="ghost">Download XLSX</Button>
        </div>
      </Portal>
    </Card>
  );
}

/**
 * Aim it at a mount node you render yourself: capture the element in state with a callback
 * ref, then gate the Portal on it so the children never start out in `<body>`.
 */
export function CustomContainer() {
  const [overlayRoot, setOverlayRoot] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div id="overlay-root" ref={setOverlayRoot} />
      {overlayRoot && (
        <Portal container={overlayRoot}>
          <Alert variant="info">Deploying Acme Marketing to production…</Alert>
        </Portal>
      )}
    </>
  );
}

/** There is no `open` prop — mount the Portal to show the overlay, unmount it to remove it. */
export function ToggleOverlay() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Keyboard shortcuts</Button>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 grid place-items-center bg-(--OVERLAY-SCRIM-COLOR)">
            <Card padding="r3">
              <h2>Keyboard shortcuts</h2>
              <p>Press ⌘K to open the command palette.</p>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
            </Card>
          </div>
        </Portal>
      )}
    </>
  );
}

/**
 * Portal only moves the node. The scrim, the dialog semantics and the focus trap are still
 * yours — `useFocusTrap(dialogRef, true)` sits above this return.
 */
export function ModalOverlay() {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-(--OVERLAY-SCRIM-COLOR)" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-workspace-title"
        className="fixed inset-0 z-50 m-auto h-fit w-fit rounded-lg bg-surface-0 p-r3 shadow-lg"
      >
        <h2 id="delete-workspace-title">Delete workspace?</h2>
        <p>Every project in Acme Marketing goes with it. This cannot be undone.</p>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">Delete workspace</Button>
      </div>
    </Portal>
  );
}
