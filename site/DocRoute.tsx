import type { ComponentType } from "react";

import { Alert, Skeleton } from "../src";
import { DocPage } from "./DocPage";
import type { ComponentEntry, GuideEntry } from "./registry";
import { useAsync, type AsyncState } from "./use-async";

/**
 * Loads a page's markdown — and, for a component, its example module — then renders it.
 *
 * Two loads rather than one because they fail independently and one is far larger: the
 * prose is the page and arrives first, while a broken example module should cost you the
 * live renders, not the documentation.
 */

function Loading() {
  return (
    <div className="flex max-w-[52rem] flex-col gap-r4">
      <Skeleton className="h-r1 w-2/5">Loading documentation</Skeleton>
      <Skeleton />
      <Skeleton className="w-4/5" />
      <Skeleton variant="rounded" className="h-[14rem]" />
    </div>
  );
}

function LoadFailed({ what, error }: { what: string; error: Error }) {
  return (
    <Alert variant="error">
      <strong>Could not load {what}.</strong> {error.message}
    </Alert>
  );
}

/** Module-level so the "not yet" value keeps one identity — DocPage's anchor effect is
    keyed on it, and a fresh object per render would re-scroll on every render. */
const NO_EXAMPLES: Record<string, ComponentType> = {};

/** Examples are optional to the page: a failure downgrades it, it does not blank it. */
function examplesOf(state: AsyncState<Record<string, ComponentType>>) {
  return state.status === "ready" ? state.value : NO_EXAMPLES;
}

export function ComponentRoute({ entry }: { entry: ComponentEntry }) {
  const doc = useAsync(entry.loadDoc, `doc:${entry.slug}`);
  const examples = useAsync(entry.loadExamples, `examples:${entry.slug}`);

  // Both, before anything renders. The prose and the examples are separate chunks and
  // either can win the race; showing the doc first means every `<!-- example -->` block
  // looks up a name in an empty map and renders its "no such example" error. Measured
  // with the examples chunk held back 1.5s: eleven red alerts on the DataTable page,
  // then a silent swap to the real components. Waiting costs the slower of two parallel
  // fetches, not the sum.
  if (doc.status === "loading" || examples.status === "loading") return <Loading />;
  if (doc.status === "failed") return <LoadFailed what={`the ${entry.name} docs`} error={doc.error} />;

  return (
    <>
      {examples.status === "failed" ? (
        <LoadFailed what={`${entry.name}'s examples`} error={examples.error} />
      ) : null}
      <DocPage doc={doc.value} examples={examplesOf(examples)} />
    </>
  );
}

export function GuideRoute({ entry }: { entry: GuideEntry }) {
  const doc = useAsync(entry.loadDoc, `doc:${entry.slug}`);

  if (doc.status === "loading") return <Loading />;
  if (doc.status === "failed") return <LoadFailed what={entry.slug} error={doc.error} />;
  return <DocPage doc={doc.value} />;
}
