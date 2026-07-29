import { useState } from "react";

import { AnimatePresence } from "./AnimatePresence";

/** Toggle a boolean and the children mount with a fade-in and unmount after a fade-out. */
export function Minimal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen((v) => !v)}>Toggle summary</button>
      <AnimatePresence show={open}>
        <p>Your changes are saved automatically.</p>
      </AnimatePresence>
    </>
  );
}

/** Swap the default `fade-in`/`fade-out` for any animation class from response-ui-css. */
export function CustomAnimation() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button onClick={() => setOpen((v) => !v)}>Toggle</button>
      <AnimatePresence show={open} enterClass="fade-up" exitClass="fade-out">
        <p>Slides up as it fades in.</p>
      </AnimatePresence>
    </>
  );
}

/** Every `div` prop lands on the wrapper — style the box and give it a live region here. */
export function WrapperProps() {
  const [saved, setSaved] = useState(false);

  return (
    <>
      <button onClick={() => setSaved(true)}>Save settings</button>
      <AnimatePresence show={saved} role="status" className="rounded-md bg-surface-2 p-r3">
        Settings saved.
      </AnimatePresence>
    </>
  );
}
