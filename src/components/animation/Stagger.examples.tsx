import { Stagger } from "./Stagger";

type Step = { id: string; label: string };

const steps: Step[] = [
  { id: "clone", label: "Clone the repository" },
  { id: "install", label: "Install dependencies" },
  { id: "run", label: "Start the dev server" },
];

/** Wrap a set of siblings; each one enters a delay-step after the one before it. */
export function Minimal() {
  return (
    <Stagger>
      <p>Deploys are 40% faster.</p>
      <p>Zero-downtime migrations.</p>
      <p>One-click rollbacks.</p>
    </Stagger>
  );
}

/** `Children.toArray` flattens mapped output, so an array of items works directly. */
export function FromData() {
  return (
    <Stagger>
      {steps.map((step) => (
        <p key={step.id}>{step.label}</p>
      ))}
    </Stagger>
  );
}

/** `className` lands on the outer element; the `.stagger-item` wrappers are its direct
 *  children, so lay the container out around them, not around your own nodes. */
export function Layout() {
  return (
    <Stagger className="flex gap-r4">
      <a href="/features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/docs">Docs</a>
    </Stagger>
  );
}

/** `as` swaps only the outer wrapper; every item is still a `<div class="stagger-item">`. */
export function AsElement() {
  return (
    <Stagger as="section">
      <p>Realtime collaboration.</p>
      <p>Audit-ready history.</p>
    </Stagger>
  );
}
