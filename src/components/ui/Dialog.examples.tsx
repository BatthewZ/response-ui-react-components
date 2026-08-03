import { useState } from "react";

import { Field } from "../form/Field";
import { FormActions } from "../form/FormActions";
import { Input } from "../form/Input";
import { Label } from "../form/Label";
import { Button } from "./Button";
import { Dialog, DialogBody, DialogHeader } from "./Dialog";

/** Fully controlled: `open` drives `showModal()`, and `onClose` is your cue to flip it back. */
export function Minimal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Invite teammates
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="invite-title">
        <h2 id="invite-title">Invite teammates</h2>
        <p>Everyone you invite joins Acme Marketing with the Editor role.</p>
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Send invites
          </Button>
        </FormActions>
      </Dialog>
    </>
  );
}

/**
 * A destructive confirmation. Nothing here is built in — the heading, the two actions and the
 * `aria-labelledby` that names the panel are all yours to supply.
 */
export function DestructiveConfirm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Delete workspace
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="delete-workspace-title"
        aria-describedby="delete-workspace-body"
      >
        <h2 id="delete-workspace-title">Delete Acme Marketing?</h2>
        <p id="delete-workspace-body">
          Every project, deploy history and invite link goes with it. This cannot be undone.
        </p>
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Keep workspace
          </Button>
          <Button type="button" variant="danger" onClick={() => setOpen(false)}>
            Delete workspace
          </Button>
        </FormActions>
      </Dialog>
    </>
  );
}

/**
 * Close from your own submit handler. A `<form method="dialog">` would close the element behind
 * React's back and leave `open` stuck at `true`.
 */
export function WithForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Rename project
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="rename-title">
        <h2 id="rename-title">Rename project</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          <Field>
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" name="name" defaultValue="Acme Marketing" />
          </Field>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </FormActions>
        </form>
      </Dialog>
    </>
  );
}

/**
 * `lightDismiss` closes on a press that both begins and ends on the scrim. Right for a panel you
 * are reading; leave it off for one holding a decision or a half-finished form.
 */
export function LightDismiss() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Keyboard shortcuts
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} lightDismiss aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <p>Press Command-K to open the command palette, or Escape to close this dialog.</p>
      </Dialog>
    </>
  );
}

/** `className` merges over the defaults, so one utility retargets the 40rem cap. */
export function CustomWidth() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Export report
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="max-w-[24rem]"
        aria-labelledby="export-title"
      >
        <h2 id="export-title">Export Q3 revenue</h2>
        <p>A CSV lands in your inbox as soon as the export finishes.</p>
        <FormActions>
          <Button type="button" onClick={() => setOpen(false)}>
            Start export
          </Button>
        </FormActions>
      </Dialog>
    </>
  );
}

/**
 * Long content: the panel is a column, `DialogBody` is the only part of it that scrolls, and the
 * title and the actions stay put either side. On a phone that is the difference between a
 * dismissal you can reach and one you have to go and find.
 */
export function ScrollingBody() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Review terms
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="terms-title">
        <DialogHeader onClose={() => setOpen(false)}>
          <h2 id="terms-title">Terms of service</h2>
        </DialogHeader>
        <DialogBody>
          <p>Acme Marketing processes your deploy logs to render the activity feed.</p>
          <p>Logs are retained for 90 days, then deleted from primary and backup storage.</p>
        </DialogBody>
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Decline
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Accept terms
          </Button>
        </FormActions>
      </Dialog>
    </>
  );
}
