import { type RefObject, useEffect, useRef, useState } from "react";

import { Button } from "./Button";
import { Drawer } from "./Drawer";

/**
 * Mirrors the native `close` event back into React state. Drawer only listens for `cancel`
 * (Escape), so anything else that closes the element leaves `open` stranded at `true`.
 */
function useNativeCloseSync(
  ref: RefObject<HTMLDialogElement | null>,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const sync = () => setOpen(false);
    dialog.addEventListener("close", sync);
    return () => dialog.removeEventListener("close", sync);
  }, [ref, setOpen]);
}

/** Fully controlled: `open` drives `showModal()`/`close()`, and `onClose` fires when Escape is pressed. */
export function Minimal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Edit profile</Button>
      <Drawer open={open} onClose={() => setOpen(false)} aria-labelledby="edit-profile-title">
        <h2 id="edit-profile-title">Edit profile</h2>
        <p>Changes apply to your Acme Marketing workspace immediately.</p>
        <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </Drawer>
    </>
  );
}

/** `side` pins the panel to one viewport edge and decides which axis it stretches across. */
export function Sides() {
  const [side, setSide] = useState<"left" | "right" | "top" | "bottom" | null>(null);
  return (
    <>
      <Button onClick={() => setSide("left")}>Navigation</Button>
      <Button onClick={() => setSide("right")}>Details</Button>
      <Button onClick={() => setSide("top")}>Announcement</Button>
      <Button onClick={() => setSide("bottom")}>Share sheet</Button>
      <Drawer
        open={side !== null}
        onClose={() => setSide(null)}
        side={side ?? "right"}
        aria-label="Panel placement"
      >
        <p>Pinned to the {side} edge.</p>
        <Button variant="secondary" type="button" onClick={() => setSide(null)}>
          Close
        </Button>
      </Drawer>
    </>
  );
}

/**
 * The panel's height is fixed, so overflowing content scrolls the panel itself — padding
 * included. A full-height flex child with one scrolling region keeps the title and the action
 * still instead.
 */
export function ScrollingPanel() {
  const [open, setOpen] = useState(true);
  return (
    <Drawer open={open} onClose={() => setOpen(false)} aria-labelledby="notifications-title">
      <div className="flex h-full flex-col gap-r4">
        <h2 id="notifications-title" className="shrink-0">
          Notifications
        </h2>
        <ul className="flex-1 overflow-y-auto">
          {[
            "Ada Lovelace approved Pull request #42",
            "Grace Hopper deployed v2.4.0 to production",
            "Katherine Johnson commented on Add OKLCH theming",
            "Build #1183 finished in 4m 12s",
            "Two new members joined Acme Marketing",
          ].map((notification) => (
            <li key={notification}>{notification}</li>
          ))}
        </ul>
        <Button
          variant="secondary"
          type="button"
          className="shrink-0"
          onClick={() => setOpen(false)}
        >
          Mark all as read
        </Button>
      </div>
    </Drawer>
  );
}

/**
 * Clicking the scrim does nothing on a native `<dialog>`. Scrim clicks land on the dialog
 * element itself, so a hit test against its box adds the dismissal.
 */
export function DismissOnScrimClick() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open cart</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const insidePanel =
            event.clientX >= box.left &&
            event.clientX <= box.right &&
            event.clientY >= box.top &&
            event.clientY <= box.bottom;
          if (!insidePanel) setOpen(false);
        }}
        aria-labelledby="cart-title"
      >
        <h2 id="cart-title">Your cart</h2>
        <p>2 items · $148.00</p>
      </Drawer>
    </>
  );
}

/**
 * A `<form method="dialog">` submit closes the element and fires only `close`, which Drawer
 * ignores — `useNativeCloseSync(drawerRef, setOpen)` above the return listens for it so `open`
 * cannot desync.
 */
export function CloseFromNativeForm() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  useNativeCloseSync(drawerRef, setOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Shipping address</Button>
      <Drawer
        ref={drawerRef}
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="shipping-title"
      >
        <h2 id="shipping-title">Shipping address</h2>
        <p>Ada Lovelace · 12 Analytical Way, London</p>
        <form method="dialog">
          <Button type="submit">Done</Button>
        </form>
      </Drawer>
    </>
  );
}
