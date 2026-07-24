import { Input } from "../form/Input";
import { Label } from "../form/Label";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

import { Center } from "./Center";
import { Stack } from "./Stack";

const createWorkspace = () => {};

/** One column, one themed gap between every pair of children — `gap` defaults to `r4`. */
export function Minimal() {
  return (
    <Stack>
      <h2 className="text-h4">Notification settings</h2>
      <p className="text-fg-secondary">Choose how we reach you about account activity.</p>
      <p className="text-fg-secondary">Security alerts are always delivered, whatever you pick.</p>
    </Stack>
  );
}

/** Nest Stacks to build a page's rhythm — a wide `r1` between sections, a tight `r5`
 *  inside each. The scale is inverted: `r1` is the largest step and `r6` the smallest. */
export function NestedRhythm() {
  return (
    <Stack gap="r1">
      <Stack gap="r5">
        <h2 className="text-h4">Billing</h2>
        <p className="text-fg-secondary">Manage your plan and payment method.</p>
      </Stack>
      <Stack gap="r5">
        <h2 className="text-h4">Team</h2>
        <p className="text-fg-secondary">Invite teammates and set their roles.</p>
      </Stack>
    </Stack>
  );
}

/** Children stretch to the Stack's full width by default. There is no `align` prop, so
 *  a child that should size to its content needs a `className` on the Stack. */
export function CrossAxisAlignment() {
  return (
    <Stack className="items-start">
      <p>Deleting a workspace removes every project and integration inside it.</p>
      <Button variant="danger">Delete workspace</Button>
    </Stack>
  );
}

/** `as` swaps the element and re-types `…rest`, so on `as="form"` the form's own props —
 *  `onSubmit` here — pass straight through to the rendered element. */
export function AsForm() {
  return (
    <Stack as="form" gap="r5" onSubmit={createWorkspace}>
      <Label htmlFor="workspace-name">Workspace name</Label>
      <Input id="workspace-name" defaultValue="Acme HQ" />
      <Button type="submit">Create workspace</Button>
    </Stack>
  );
}

/** Center lays its children out in a row, so hand it a single Stack to centre a column. */
export function CenteredColumn() {
  return (
    <Center className="min-h-screen">
      <Stack gap="r5" className="items-center">
        <Spinner />
        <p className="text-fg-secondary">Restoring your session…</p>
      </Stack>
    </Center>
  );
}
