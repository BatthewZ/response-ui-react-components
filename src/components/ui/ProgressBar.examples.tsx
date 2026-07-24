import { Stack } from "../layout/Stack";

import { ProgressBar } from "./ProgressBar";

/** `value` drives the fill width. The bar has no name of its own — give it one. */
export function Minimal() {
  return <ProgressBar value={64} aria-label="Uploading design-system.zip" />;
}

/** `Label` and `Value` are siblings, not children — the bar itself takes no children. */
export function WithLabelAndValue() {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <ProgressBar.Label id="upload-label">Uploading design-system.zip</ProgressBar.Label>
        <ProgressBar.Value>64%</ProgressBar.Value>
      </div>
      <ProgressBar value={64} aria-labelledby="upload-label" />
    </div>
  );
}

/** Three track heights. Only `md` and `lg` grow at the 40rem breakpoint. */
export function Sizes() {
  return (
    <Stack gap="r5">
      <ProgressBar value={45} size="sm" aria-label="Sync progress, thin" />
      <ProgressBar value={45} size="md" aria-label="Sync progress, default" />
      <ProgressBar value={45} size="lg" aria-label="Sync progress, thick" />
    </Stack>
  );
}

/** Four fill colours. They change the hue only — nothing announced changes with them. */
export function Colors() {
  return (
    <Stack gap="r5">
      <ProgressBar value={60} color="accent" aria-label="Storage used" />
      <ProgressBar value={100} color="success" aria-label="Backup complete" />
      <ProgressBar value={88} color="warning" aria-label="Quota nearly full" />
      <ProgressBar value={96} color="error" aria-label="Over budget" />
    </Stack>
  );
}

/** `striped` textures whatever `color` painted; `gradient` replaces it with the accent ramp. */
export function Variants() {
  return (
    <Stack gap="r5">
      <ProgressBar value={70} variant="default" aria-label="Import, plain" />
      <ProgressBar value={70} variant="gradient" aria-label="Import, gradient" />
      <ProgressBar value={70} variant="striped" color="warning" aria-label="Import, striped" />
    </Stack>
  );
}

/** `max` rescales the fill — 3 of 5 steps is 60% wide, and `aria-valuemax` becomes 5. */
export function CustomMax() {
  return <ProgressBar value={3} max={5} color="success" aria-label="Onboarding steps" />;
}

/** `animate={false}` drops the width transition, so the fill jumps to each new value. */
export function NoAnimation() {
  return <ProgressBar value={82} animate={false} aria-label="Rendering frames" />;
}

/** Colour carries no meaning to assistive tech — `aria-valuetext` overrides the bare number. */
export function AnnouncedStatus() {
  return (
    <ProgressBar
      value={96}
      color="error"
      aria-label="Storage used"
      aria-valuetext="96 percent — over quota"
    />
  );
}
