import { Spacer } from "./Spacer";

/** Drop a Spacer into a flex row and it swallows the free space, shoving everything after it to the far end. */
export function Minimal() {
  return (
    <div className="flex items-center">
      <strong>Inbox</strong>
      <Spacer />
      <button>Archive</button>
      <button>Compose</button>
    </div>
  );
}

/** Two Spacers split the leftover space equally, so the middle item lands dead centre between the two ends. */
export function Centered() {
  return (
    <div className="flex items-center">
      <button>Back</button>
      <Spacer />
      <strong>Account settings</strong>
      <Spacer />
      <button>Save</button>
    </div>
  );
}

/** The growth axis follows the parent: in a `flex-col` container the Spacer grows vertically and pins the footer to the bottom — the parent must have a height to give away. */
export function Vertical() {
  return (
    <div className="flex flex-col h-64">
      <strong>Storage</strong>
      <p>8.2 GB of 15 GB used</p>
      <Spacer />
      <button>Upgrade plan</button>
    </div>
  );
}
