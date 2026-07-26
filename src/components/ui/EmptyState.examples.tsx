import { FolderOpen, Inbox, SearchX } from "lucide-react";

import { Button } from "./Button";
import { Card } from "./Card";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "./EmptyState";

/** Five sibling imports, not `EmptyState.Icon`. The icon slot sizes the glyph itself, so a lucide icon follows the root's `size` with or without `size="1em"`. */
export function Minimal() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <Inbox size="1em" />
      </EmptyStateIcon>
      <EmptyStateTitle>No messages yet</EmptyStateTitle>
      <EmptyStateDescription>
        When a teammate sends you something, it lands here.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button type="button">Compose message</Button>
      </EmptyStateActions>
    </EmptyState>
  );
}

/** `size` steps the root's padding and gap, the title's type scale, and the icon — three distinct icon sizes, one per step. */
export function Sizes() {
  return (
    <>
      <EmptyState size="sm">
        <EmptyStateIcon>
          <Inbox size="1em" />
        </EmptyStateIcon>
        <EmptyStateTitle>No drafts</EmptyStateTitle>
      </EmptyState>
      <EmptyState size="md">
        <EmptyStateIcon>
          <Inbox size="1em" />
        </EmptyStateIcon>
        <EmptyStateTitle>No drafts</EmptyStateTitle>
      </EmptyState>
      <EmptyState size="lg">
        <EmptyStateIcon>
          <Inbox size="1em" />
        </EmptyStateIcon>
        <EmptyStateTitle>No drafts</EmptyStateTitle>
      </EmptyState>
    </>
  );
}

/** Every part is optional and order is yours — a root plus a title is a complete empty state. */
export function TitleOnly() {
  return (
    <EmptyState size="sm">
      <EmptyStateTitle>No saved filters</EmptyStateTitle>
    </EmptyState>
  );
}

/** `EmptyStateActions` is a centred flex row that wraps, so a recovery action can sit beside the primary one. */
export function TwoActions() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <SearchX size="1em" />
      </EmptyStateIcon>
      <EmptyStateTitle>No invoices match those filters</EmptyStateTitle>
      <EmptyStateDescription>
        Widen the date range, or clear the filters to see every invoice again.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button type="button" variant="secondary">
          Clear filters
        </Button>
        <Button type="button">Create invoice</Button>
      </EmptyStateActions>
    </EmptyState>
  );
}

/** The root paints no background, border, or radius — nest it in whatever panel it stands in for. */
export function InCard() {
  return (
    <Card padding="r2">
      <EmptyState>
        <EmptyStateIcon>
          <FolderOpen size="1em" />
        </EmptyStateIcon>
        <EmptyStateTitle>This project has no files</EmptyStateTitle>
        <EmptyStateDescription>
          Upload a file or connect a repository to get started.
        </EmptyStateDescription>
        <EmptyStateActions>
          <Button type="button">Upload a file</Button>
        </EmptyStateActions>
      </EmptyState>
    </Card>
  );
}

/** When the empty state stands in for a page's main content, `as` puts its title in the heading outline. */
export function TitleAsHeading() {
  return (
    <EmptyState size="lg">
      <EmptyStateIcon>
        <FolderOpen size="1em" />
      </EmptyStateIcon>
      <EmptyStateTitle as="h2">This workspace is empty</EmptyStateTitle>
      <EmptyStateDescription>
        Create your first project and it will show up here.
      </EmptyStateDescription>
    </EmptyState>
  );
}

/** The root forwards every `div` prop, so `role="status"` turns a search result into a live region. */
export function Announced() {
  return (
    <EmptyState role="status" size="sm">
      <EmptyStateTitle>No results for “oklch”</EmptyStateTitle>
      <EmptyStateDescription>
        Check the spelling, or search for a broader term.
      </EmptyStateDescription>
    </EmptyState>
  );
}
