import { useState } from "react";

import { Checkbox } from "../form/Checkbox";
import { FormActions } from "../form/FormActions";
import { Input } from "../form/Input";
import { Label } from "../form/Label";
import { Button } from "./Button";
import { Popover } from "./Popover";

/** Click the trigger to open. Clicking outside or pressing Escape closes it again. */
export function Minimal() {
  return (
    <Popover>
      <Popover.Trigger>Deploy details</Popover.Trigger>
      <Popover.Content aria-label="Deploy details">
        <p>Deployed to production 20 minutes ago by Ada Lovelace.</p>
        <Button type="button" variant="link">
          View build log
        </Button>
      </Popover.Content>
    </Popover>
  );
}

/** `placement` is the preferred side; `offset` is the gap from the trigger, in pixels. */
export function Placement() {
  return (
    <Popover placement="right-start" offset={16}>
      <Popover.Trigger>Columns</Popover.Trigger>
      <Popover.Content aria-label="Visible columns">
        <Checkbox id="column-author" defaultChecked />
        <Label htmlFor="column-author">Author</Label>
        <Checkbox id="column-duration" />
        <Label htmlFor="column-duration">Duration</Label>
      </Popover.Content>
    </Popover>
  );
}

/** Pass `open` and `onOpenChange` to hold the state yourself — then the panel can close itself. */
export function Controlled() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger>Filter deploys</Popover.Trigger>
      <Popover.Content aria-label="Filter deploys">
        <p>Showing failed deploys from the last 7 days.</p>
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Apply filters
          </Button>
        </FormActions>
      </Popover.Content>
    </Popover>
  );
}

/** `asChild` merges the trigger wiring onto your own element instead of wrapping it in a button. */
export function AsChild() {
  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button type="button" variant="secondary">
          Share report
        </Button>
      </Popover.Trigger>
      <Popover.Content aria-label="Share report">
        <p>Anyone with the link can view Q3 revenue.</p>
        <Button type="button" variant="link">
          Copy link
        </Button>
      </Popover.Content>
    </Popover>
  );
}

/** Inside a form the trigger needs `type="button"`, and a portalled field needs `form`. */
export function InsideAForm() {
  return (
    <form id="deploy-settings">
      <Label htmlFor="branch">Branch</Label>
      <Input id="branch" name="branch" defaultValue="main" />
      <Popover>
        <Popover.Trigger type="button">Advanced options</Popover.Trigger>
        <Popover.Content aria-label="Advanced options">
          <Label htmlFor="retries">Retry attempts</Label>
          <Input
            id="retries"
            name="retries"
            type="number"
            defaultValue={3}
            form="deploy-settings"
          />
        </Popover.Content>
      </Popover>
      <FormActions>
        <Button type="submit">Save changes</Button>
      </FormActions>
    </form>
  );
}

/** `arrow` draws a pointer back at the trigger; `classNames.arrow` resizes it. */
export function Arrow() {
  return (
    <Popover placement="top">
      <Popover.Trigger>Build status</Popover.Trigger>
      <Popover.Content arrow classNames={{ arrow: "size-r4" }} aria-label="Build status">
        <p>All 412 checks passed on 4f21a9c.</p>
      </Popover.Content>
    </Popover>
  );
}

/** The panel is a `dialog` with no name of its own — point `aria-labelledby` at its heading. */
export function NamedByHeading() {
  return (
    <Popover placement="bottom-end">
      <Popover.Trigger>Notifications</Popover.Trigger>
      <Popover.Content aria-labelledby="notifications-title">
        <h3 id="notifications-title">Notifications</h3>
        <p>Ada Lovelace approved Pull request #42.</p>
        <p>The nightly deploy to staging failed.</p>
      </Popover.Content>
    </Popover>
  );
}
