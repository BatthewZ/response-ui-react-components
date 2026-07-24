import { Text } from "./Text";

/** The default: `body-1` on a `<p>`, inked with the theme's primary text colour. */
export function Minimal() {
  return <Text>Your changes have been saved to the workspace.</Text>;
}

/** Nine steps. `h1`–`h6` render the matching heading element; the three body steps render a `<p>`. */
export function Variants() {
  return (
    <>
      <Text variant="h1">Release notes</Text>
      <Text variant="h2">Version 2.4.0</Text>
      <Text variant="h3">Breaking changes</Text>
      <Text variant="h4">Theme tokens</Text>
      <Text variant="h5">Migration steps</Text>
      <Text variant="h6">Deprecations</Text>
      <Text variant="body-1">Every colour now resolves through a theme variable.</Text>
      <Text variant="body-2">Run the codemod before you upgrade.</Text>
      <Text variant="body-3">Published 12 March 2026 by Ada Lovelace.</Text>
    </>
  );
}

/** `primary` and `secondary` are the inks meant to be read on a surface. `muted` is a hint
 *  ink — under 2.6:1 on every shipped surface, so it clears no WCAG contrast threshold. */
export function Colors() {
  return (
    <>
      <Text color="primary">Invoice #1042 is ready to send.</Text>
      <Text color="secondary">Issued to Northwind Traders on 3 March.</Text>
      <Text color="muted">Draft — not yet delivered.</Text>
    </>
  );
}

/** `inverse` and `on-primary` are background-specific inks — supply the background they expect. */
export function OnFilledBackground() {
  return (
    <div className="bg-primary p-r4">
      <Text variant="h4" color="on-primary">
        Upgrade to the team plan
      </Text>
      <Text variant="body-2" color="inverse">
        Unlimited workspaces and priority support.
      </Text>
    </div>
  );
}

/** `weight` opts into the theme's semibold/bold weight variables. Best kept to body text: on a
 *  heading it replaces the built-in 700, which is lighter or heavier depending on the theme. */
export function Weights() {
  return (
    <>
      <Text weight="semibold">Payment method</Text>
      <Text weight="bold">Visa ending 4242</Text>
    </>
  );
}

/** `variant` picks the type step, `as` picks the element — use both for heading size with no heading. */
export function VisualSizeOnly() {
  return (
    <Text variant="h3" as="p">
      2,481 active workspaces
    </Text>
  );
}

/** `as="span"` keeps a run of text inline so it can sit inside a sentence. */
export function InlineSpan() {
  return (
    <Text color="secondary">
      Signed in as{" "}
      <Text as="span" color="primary" weight="semibold">
        ada@lovelace.dev
      </Text>
    </Text>
  );
}

/** Everything Text doesn't own is spread onto the element — here `id` wires the heading to its section. */
export function LabelledSection() {
  return (
    <section aria-labelledby="billing-heading">
      <Text variant="h2" id="billing-heading">
        Billing
      </Text>
      <Text color="secondary">Your next invoice is due on 1 April 2026.</Text>
    </section>
  );
}
