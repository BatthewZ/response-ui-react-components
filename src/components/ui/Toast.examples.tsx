import { useState } from "react";

import { Button } from "./Button";
import { Toast } from "./Toast";
import { ToastProvider, useToast } from "./ToastContext";

const Dashboard = () => <p>Everything under the provider can call useToast().</p>;
const dismissStorageWarning = () => {};

/** The 30-second path: pull `toast` off `useToast()` and fire it from any handler. */
export function Minimal() {
  const { toast } = useToast();

  return (
    <Button onClick={() => toast("Deployment finished", { variant: "success" })}>
      Deploy to production
    </Button>
  );
}

/** Mount the provider once, above everything that fires a toast. */
export function MountTheProvider() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}

/** `variant` sets the tint, the leading glyph and the announcement — `error` alone is
 *  assertive. */
export function Variants() {
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-r5">
      <Button onClick={() => toast("Invoice #4021 was sent.", { variant: "success" })}>
        Send invoice
      </Button>
      <Button onClick={() => toast("A new dashboard layout is available.")}>
        Show what's new
      </Button>
      <Button onClick={() => toast("Your API key expires in 7 days.", { variant: "warning" })}>
        Check API key
      </Button>
      <Button onClick={() => toast("We couldn't reach the payment provider.", { variant: "error" })}>
        Retry payment
      </Button>
    </div>
  );
}

/** `title` renders as a bold line above the message. It is not the HTML `title` attribute. */
export function WithTitle() {
  const { toast } = useToast();

  return (
    <Button
      onClick={() =>
        toast("Remove files or upgrade your plan.", {
          variant: "warning",
          title: "Storage almost full",
        })
      }
    >
      Check storage
    </Button>
  );
}

/** `duration: 0` skips the auto-dismiss timer, so the toast stays until something removes it. */
export function Persistent() {
  const { toast } = useToast();

  return (
    <Button onClick={() => toast("Syncing 1,204 records.", { duration: 0 })}>Start sync</Button>
  );
}

/** `toast()` returns the id; `dismiss(id)` retires one toast and `dismissAll()` clears the stack. */
export function DismissingEarly() {
  const { toast, dismiss, dismissAll } = useToast();
  const [uploadId, setUploadId] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap gap-r5">
      <Button onClick={() => setUploadId(toast("Uploading report.csv…", { duration: 0 }))}>
        Start upload
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          if (uploadId) dismiss(uploadId);
          setUploadId(null);
        }}
      >
        Upload finished
      </Button>
      <Button variant="ghost" onClick={dismissAll}>
        Clear notifications
      </Button>
    </div>
  );
}

/** Rendering `Toast` yourself: you own placement and `onDismiss`, and there is no portal. */
export function Standalone() {
  return (
    <Toast variant="warning" title="Storage almost full" onDismiss={dismissStorageWarning}>
      You're using 9.4 GB of your 10 GB quota.
    </Toast>
  );
}
