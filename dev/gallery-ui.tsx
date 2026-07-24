import type { ReactNode } from "react";

/**
 * Presentation shared by the two dev views: the curated gallery (App.tsx) and the
 * generated examples gallery (ExamplesGallery.tsx). Kept here so the tile/section
 * look has one definition rather than one per view.
 */

/**
 * A component GROUP section. Each maps to a source group (ui / form / layout /
 * data-display / …) and has a stable `id` so screenshots can target it directly
 * (e.g. playwright-cli … #group-form).
 */
export function Group({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-r4">
      <h2 className="text-h3 text-fg-primary border-b border-border-default pb-r5">{title}</h2>
      <div className="flex flex-wrap items-start gap-r4">{children}</div>
    </section>
  );
}

export function Tile({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="flex flex-col gap-r5 rounded-md border border-border-default bg-surface-1 p-r4"
    >
      <span className="text-body-3 font-semibold text-fg-muted uppercase tracking-wide">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-r4">{children}</div>
    </div>
  );
}
