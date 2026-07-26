import { type CSSProperties, useState } from "react";

import { Button } from "../ui/Button";

import { ColorPicker } from "./ColorPicker";
import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { useForm } from "./use-form";

/** Controlled: hold the hex in `const [brandColor, setBrandColor] = useState("#3366cc")`.
 *  The picker renders the swatch, the readout, and the whole editing panel. */
export function Minimal() {
  const [brandColor, setBrandColor] = useState("#3366cc");

  return (
    <ColorPicker
      aria-label="Brand color"
      value={brandColor}
      onValueChange={setBrandColor}
    />
  );
}

/** Uncontrolled: `defaultValue` seeds it and it keeps the hex itself. The mode is locked on
 *  the first render, so a `value` that starts out `undefined` stays uncontrolled for good. */
export function Uncontrolled() {
  return <ColorPicker aria-label="Highlight color" defaultValue="#ffb300" />;
}

/** Every name inside the panel is a prop. They are accessible names, not visible text, so a
 *  translated app has to pass all six or a screen-reader user hears English. */
export function Translated() {
  return (
    <ColorPicker
      aria-label="Couleur de la marque"
      defaultValue="#3366cc"
      panelLabel="Sélecteur de couleur"
      areaLabel="Saturation et luminosité"
      saturationLabel="Saturation"
      brightnessLabel="Luminosité"
      hueLabel="Teinte"
      hexLabel="Valeur hexadécimale"
    />
  );
}

/** `presets` adds a swatch grid under the panel. The grid is always eight columns wide, and
 *  each entry is normalised before it is compared to the current value. */
export function Presets() {
  const [labelColor, setLabelColor] = useState("#e53935");

  return (
    <ColorPicker
      aria-label="Label color"
      value={labelColor}
      onValueChange={setLabelColor}
      presets={[
        "#e53935",
        "#fb8c00",
        "#fdd835",
        "#43a047",
        "#00acc1",
        "#3949ab",
        "#8e24aa",
        "#6d4c41",
      ]}
    />
  );
}

/** The trigger appends the current hex to `aria-label` itself — pass only the subject. */
export function NamedWithValue() {
  const [accentColor, setAccentColor] = useState("#3949ab");

  return (
    <ColorPicker
      aria-label="Accent color"
      value={accentColor}
      onValueChange={setAccentColor}
    />
  );
}

/** `placement` is the preferred side only — the panel still flips and shifts to stay on
 *  screen. Open a picker near the bottom of a page upward. */
export function Placement() {
  return (
    <ColorPicker
      aria-label="Canvas background"
      defaultValue="#0f172a"
      placement="top-end"
    />
  );
}

/** Inside a `Field` the trigger inherits `aria-invalid` and `aria-describedby` from the
 *  field's error. `id` does reach the trigger, but `aria-label` outranks a `<label for>` in
 *  the name computation, so the label text is repeated here rather than wired with `htmlFor`. */
export function InField() {
  const [badgeColor, setBadgeColor] = useState("#fff59d");

  return (
    <Field error="Contrast against white text is below 4.5:1.">
      <Label>Badge color</Label>
      <ColorPicker
        aria-label="Badge color"
        value={badgeColor}
        onValueChange={setBadgeColor}
      />
      <FieldError />
    </Field>
  );
}

/** Wiring the store by hand, off
 *  `const form = useForm({ defaultValues: { brandColor: "#3366cc" } })`. The advertised
 *  `{...form.field("brandColor")}` spread works too; reach for this shape when the value
 *  needs transforming on its way in or out. */
export function InFormStore() {
  const form = useForm({ defaultValues: { brandColor: "#3366cc" } });

  return (
    <ColorPicker
      aria-label="Brand color"
      value={form.getValues().brandColor}
      onValueChange={(hex) => form.setValue("brandColor", hex)}
    />
  );
}

/** Standalone, `error` reddens the trigger's border and sets `aria-invalid`. With no `Field`
 *  there is no `aria-describedby`, so pair it with your own visible message. */
export function ErrorState() {
  return (
    <>
      <ColorPicker aria-label="Chart series color" error defaultValue="#fafafa" />
      <p className="text-body-3 text-fg-secondary">
        Series colors need to stay distinguishable on a white background.
      </p>
    </>
  );
}

/** `disabled` blocks the trigger and greys it to `surface-3`, so the panel cannot be opened
 *  and the current hex reads as a static swatch. */
export function Disabled() {
  return <ColorPicker aria-label="Brand color" disabled defaultValue="#3366cc" />;
}

/** A picked hex is user data, not a design token — the way it reaches the UI is by being
 *  written onto one. Overriding `--C-PRIMARY` on a wrapper re-tints every descendant that
 *  reads it, live, with no rebuild. */
export function TintATokenLive() {
  const [primary, setPrimary] = useState("#3366cc");

  return (
    <div style={{ "--C-PRIMARY": primary } as CSSProperties}>
      <ColorPicker
        aria-label="Primary color"
        value={primary}
        onValueChange={setPrimary}
        presets={["#3366cc", "#0f766e", "#b91c1c", "#7c3aed"]}
      />
      <Button>Save changes</Button>
    </div>
  );
}
