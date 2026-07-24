import { Center } from "./Center";

/** Centres its children on both axes — give it a height so there is room to centre into. */
export function Minimal() {
  return (
    <Center className="min-h-64">
      <p>Loading your dashboard…</p>
    </Center>
  );
}

/** A height of `min-h-screen` turns Center into a full-page canvas — a 404 or a splash loader. */
export function FullPage() {
  return (
    <Center className="min-h-screen">
      <p>404 — we couldn’t find that page.</p>
    </Center>
  );
}

/** With no height of its own, Center shrinks to its content: you still get horizontal
 *  centring, but there is nothing to centre against vertically. */
export function HorizontalOnly() {
  return (
    <Center>
      <p>Centred left-to-right, but not top-to-bottom.</p>
    </Center>
  );
}

/** Center is a flex row, so several children sit side by side — wrap them to stack instead. */
export function MultipleChildren() {
  return (
    <Center className="min-h-64 gap-r3">
      <button>Cancel</button>
      <button>Confirm</button>
    </Center>
  );
}
