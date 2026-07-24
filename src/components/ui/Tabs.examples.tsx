import { useState } from "react";

import { Tabs } from "./Tabs";

/** Every `Tab` needs a `Panel` with the same `value` — that string is the only binding. */
export function Minimal() {
  return (
    <Tabs defaultValue="overview">
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="usage">Usage</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">How the component works.</Tabs.Panel>
      <Tabs.Panel value="usage">How to wire it up.</Tabs.Panel>
    </Tabs>
  );
}

/** Pass `value` + `onValueChange` to drive selection yourself. `defaultValue` is still required. */
export function Controlled() {
  const [tab, setTab] = useState("overview");

  return (
    <Tabs defaultValue="overview" value={tab} onValueChange={setTab}>
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="usage">Usage</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">Selected: {tab}</Tabs.Panel>
      <Tabs.Panel value="usage">Selected: {tab}</Tabs.Panel>
    </Tabs>
  );
}

/** Three looks. The sliding indicator is positioned by `Tabs.List` in all of them. */
export function Enclosed() {
  return (
    <Tabs defaultValue="a" variant="enclosed">
      <Tabs.List>
        <Tabs.Tab value="a">First</Tabs.Tab>
        <Tabs.Tab value="b">Second</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">First panel.</Tabs.Panel>
      <Tabs.Panel value="b">Second panel.</Tabs.Panel>
    </Tabs>
  );
}

/** A disabled tab stays in the tab order for screen readers but cannot be selected. */
export function DisabledTab() {
  return (
    <Tabs defaultValue="a">
      <Tabs.List>
        <Tabs.Tab value="a">Available</Tabs.Tab>
        <Tabs.Tab value="b" disabled>
          Coming soon
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">Available panel.</Tabs.Panel>
      <Tabs.Panel value="b">Never reachable by click.</Tabs.Panel>
    </Tabs>
  );
}
