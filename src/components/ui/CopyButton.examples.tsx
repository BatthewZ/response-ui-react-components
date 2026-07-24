import { CopyButton } from "./CopyButton";

const remoteUrl = "git@github.com:ada/response-ui.git";
const publishableKey = "pk_live_51H8fJqL2xQ";
const secretKey = "sk_live_9RtZ0aWmB4";
const inviteLink = "https://app.example.com/invite/7Qk3-Rm2A";
const trackCopyClick = () => {};

/** One required prop: the string that lands on the clipboard. */
export function Minimal() {
  return <CopyButton value="bun add @batthewz/response-ui-react-components" />;
}

/** Sit it beside the value — the button has no visible text, so the label next to it is the only thing naming what gets copied. */
export function BesideTheValue() {
  return (
    <div className="flex items-center gap-r6">
      <code className="text-body-3">{remoteUrl}</code>
      <CopyButton value={remoteUrl} />
    </div>
  );
}

/** `copiedLabel` is the confirmation wording; `timeout` is how long it holds, in milliseconds. */
export function CustomConfirmation() {
  return <CopyButton value={secretKey} copiedLabel="API key copied" timeout={5000} />;
}

/** Two copy buttons on one page otherwise both announce "Copy" — your own `aria-label` wins the spread and identifies the target. */
export function DistinctNames() {
  return (
    <>
      <CopyButton value={publishableKey} aria-label="Copy publishable key" />
      <CopyButton value={secretKey} aria-label="Copy secret key" />
    </>
  );
}

/** `data-copied` is on the element only while the confirmation shows — the one styling hook for the copied state. */
export function TintedConfirmation() {
  return <CopyButton value={inviteLink} className="data-copied:text-status-success" />;
}

/** `onClick` fires before the copy is attempted, and fires whether or not it succeeds — a click handler, not a success callback. */
export function TrackedClick() {
  return <CopyButton value={inviteLink} onClick={trackCopyClick} />;
}
