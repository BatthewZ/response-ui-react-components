import {
  Copy,
  FileText,
  GitCommit,
  MessageSquare,
  Settings,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { useState } from "react";

import {
  ActivityFeed,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapsible,
  CommandPalette,
  type CommandItem,
  ContextMenu,
  CopyButton,
  DataTable,
  DescriptionList,
  Dialog,
  Drawer,
  DropdownMenu,
  Field,
  HoverCard,
  Input,
  Kbd,
  Label,
  Meter,
  NumberInput,
  OTPInput,
  Popover,
  ProgressBar,
  ProgressRing,
  Radio,
  Rating,
  Select,
  Slider,
  Sparkline,
  Spinner,
  Stack,
  StatCard,
  Stepper,
  Switch,
  TagInput,
  Textarea,
  ThemeSwitcher,
  Timeline,
  Tooltip,
  type ColumnDef,
} from "../src";

/* ------------------------------------------------------------------ */
/*  Layout helpers (local to the gallery — not part of the library)    */
/* ------------------------------------------------------------------ */

/**
 * A component GROUP section. Each top-level <section> maps to a source group
 * (ui / form / layout / data-display) and has a stable `id` so screenshots can
 * target it directly (e.g. playwright-cli ... #group-form). To add a new
 * component to the gallery, drop a <Tile> (or a new <Group>) in the right
 * place — structure stays one-section-per-group.
 */
function Group({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-r4">
      <h2 className="text-h3 text-fg-primary border-b border-border-default pb-r5">{title}</h2>
      <div className="flex flex-wrap items-start gap-r4">{children}</div>
    </section>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-r5 rounded-md border border-border-default bg-surface-1 p-r4">
      <span className="text-body-3 font-semibold text-fg-muted uppercase tracking-wide">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-r4">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sample data (DataTable)                                            */
/* ------------------------------------------------------------------ */

type Person = { id: number; name: string; role: string; visits: number };

const PEOPLE: Person[] = [
  { id: 1, name: "Ada Lovelace", role: "Engineer", visits: 42 },
  { id: 2, name: "Grace Hopper", role: "Admiral", visits: 88 },
  { id: 3, name: "Alan Turing", role: "Researcher", visits: 17 },
  { id: 4, name: "Katherine Johnson", role: "Mathematician", visits: 63 },
  { id: 5, name: "Edsger Dijkstra", role: "Engineer", visits: 29 },
  { id: 6, name: "Barbara Liskov", role: "Professor", visits: 51 },
  { id: 7, name: "Donald Knuth", role: "Author", visits: 74 },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true, render: (r) => r.name },
  { key: "role", header: "Role", sortable: true, render: (r) => r.role },
  { key: "visits", header: "Visits", sortable: true, render: (r) => r.visits },
];

/* ------------------------------------------------------------------ */
/*  Viewport harness                                                   */
/* ------------------------------------------------------------------ */

const VIEWPORTS = {
  full: { label: "Full", width: undefined as string | undefined },
  desktop: { label: "Desktop (1024)", width: "1024px" },
  mobile: { label: "Mobile (375)", width: "375px" },
};
type ViewportKey = keyof typeof VIEWPORTS;

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export function App() {
  const [viewport, setViewport] = useState<ViewportKey>("full");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("a");
  const [switchOn, setSwitchOn] = useState(true);
  const [sliderValue, setSliderValue] = useState(40);
  const [numberValue, setNumberValue] = useState<number | null>(8);
  const [tags, setTags] = useState<string[]>(["react", "typescript"]);
  const [otp, setOtp] = useState("");
  const [rating, setRating] = useState(3);
  const [halfRating, setHalfRating] = useState(3.5);
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<"left" | "right" | "top" | "bottom">("right");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const maxWidth = VIEWPORTS[viewport].width;

  const openDrawer = (side: "left" | "right" | "top" | "bottom") => {
    setDrawerSide(side);
    setDrawerOpen(true);
  };

  const COMMANDS: CommandItem[] = [
    { id: "new-file", label: "New File", group: "Actions", icon: <FileText size={16} />, shortcut: "⌘N", keywords: ["create", "document"], onSelect: () => {} },
    { id: "copy", label: "Copy", group: "Actions", icon: <Copy size={16} />, shortcut: "⌘C", onSelect: () => {} },
    { id: "delete", label: "Delete", group: "Actions", icon: <Trash2 size={16} />, shortcut: "⌫", disabled: true, onSelect: () => {} },
    { id: "profile", label: "View Profile", group: "Navigation", icon: <User size={16} />, keywords: ["account", "me"], onSelect: () => {} },
    { id: "settings", label: "Open Settings", group: "Navigation", icon: <Settings size={16} />, shortcut: "⌘,", onSelect: () => {} },
    { id: "messages", label: "Messages", group: "Navigation", icon: <MessageSquare size={16} />, onSelect: () => {} },
  ];

  return (
    <div className="min-h-screen bg-surface-0 text-fg-primary">
      {/* Top bar: theme switcher (cycles default/events/grimdark/tech via the
          library's ThemeSwitcher, which is backed by useTheme) + a light/dark
          note + a viewport constraint toggle. */}
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-r4 border-b border-border-default bg-surface-1 px-r3 py-r4">
        <div className="flex flex-col gap-r6">
          <span className="text-h4 font-bold">response-ui gallery</span>
          <span className="text-body-3 text-fg-muted">
            Theme switches default / events / grimdark / tech. Light vs dark
            follows the OS color-scheme via the foundation tokens.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-r3">
          <ThemeSwitcher />
          <div className="flex items-center gap-r6 rounded-md border border-border-default p-r6">
            {(Object.keys(VIEWPORTS) as ViewportKey[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={viewport === key ? "primary" : "ghost"}
                onClick={() => setViewport(key)}
              >
                {VIEWPORTS[key].label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Preview area constrained by the chosen viewport width. */}
      <main
        className="mx-auto flex flex-col gap-r2 p-r3"
        style={{ maxWidth, transition: "max-width 150ms ease" }}
      >
        {/* ============================================================ */}
        {/*  GROUP: ui                                                   */}
        {/*  src/components/ui — buttons, feedback, overlays, etc.       */}
        {/* ============================================================ */}
        <Group id="group-ui" title="UI">
          <Tile label="Button — variants">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
          </Tile>
          <Tile label="Button — sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Tile>
          <Tile label="Button — disabled">
            <Button disabled>Primary</Button>
            <Button variant="secondary" disabled>
              Secondary
            </Button>
          </Tile>

          <Tile label="Card">
            <Card>
              <Stack gap="r5">
                <span className="text-h4">Card title</span>
                <span className="text-body-2 text-fg-secondary">
                  Surface container with padding + shadow tokens.
                </span>
                <Button variant="primary" size="sm">
                  Action
                </Button>
              </Stack>
            </Card>
          </Tile>

          <Tile label="Alert">
            <div className="flex flex-col gap-r5">
              <Alert variant="info">Informational message.</Alert>
              <Alert variant="success">Saved successfully.</Alert>
              <Alert variant="warning">Heads up — check this.</Alert>
              <Alert variant="error">Something went wrong.</Alert>
            </div>
          </Tile>
          <Tile label="Badge">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </Tile>
          <Tile label="Spinner">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </Tile>
          <Tile label="ProgressBar">
            <div className="flex w-64 flex-col gap-r4">
              <ProgressBar value={30} />
              <ProgressBar value={65} variant="gradient" />
              <ProgressBar value={90} variant="striped" />
            </div>
          </Tile>

          <Tile label="Dialog">
            <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
              <div className="flex flex-col gap-r4 p-r3">
                <h3 className="text-h4">Dialog title</h3>
                <p className="text-body-2 text-fg-secondary">
                  This is a native &lt;dialog&gt; rendered by the library.
                </p>
                <div className="flex justify-end gap-r5">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
                </div>
              </div>
            </Dialog>
          </Tile>
          <Tile label="Popover">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <Popover.Trigger asChild>
                <Button variant="secondary">Toggle popover</Button>
              </Popover.Trigger>
              <Popover.Content>
                <div className="flex flex-col gap-r5 p-r4">
                  <span className="text-body-2">Popover content</span>
                </div>
              </Popover.Content>
            </Popover>
          </Tile>
          <Tile label="DropdownMenu">
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary">Open menu</Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item index={0} onSelect={() => {}}>Profile</DropdownMenu.Item>
                <DropdownMenu.Item index={1} onSelect={() => {}}>Settings</DropdownMenu.Item>
                <DropdownMenu.Item index={2} onSelect={() => {}}>Sign out</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Tile>
          <Tile label="Tooltip">
            <Tooltip content="Helpful hint">
              <Button variant="ghost">Hover me</Button>
            </Tooltip>
          </Tile>

          {/* TODO (later phase): add ui components here as they land —
              e.g. Drawer, Combobox, Calendar. One <Tile> each. */}
          <Tile label="Rating">
            <div className="flex flex-col gap-r5">
              <Rating
                aria-label="Rate this product"
                value={rating}
                onValueChange={setRating}
              />
              <Rating
                aria-label="Rate this product (half steps)"
                allowHalf
                value={halfRating}
                onValueChange={setHalfRating}
              />
              <Rating aria-label="Average rating" value={4} readOnly />
            </div>
          </Tile>
          <Tile label="Kbd">
            <span className="flex items-center gap-r6 text-body-2 text-fg-secondary">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              <span>to search,</span>
              <Kbd>Esc</Kbd>
              <span>to close</span>
            </span>
          </Tile>
          <Tile label="CopyButton">
            <div className="flex items-center gap-r5">
              <code className="text-body-2 text-fg-secondary">npm i response-ui</code>
              <CopyButton value="npm i response-ui" />
            </div>
          </Tile>
          <Tile label="Collapsible">
            <Collapsible
              open={collapsibleOpen}
              onOpenChange={setCollapsibleOpen}
              className="w-64"
            >
              <Collapsible.Trigger className="flex w-full items-center justify-between rounded-md border border-border-default bg-surface-2 px-r4 py-r5 text-body-2 font-medium text-fg-primary">
                <span>What is response-ui?</span>
                <span className="text-fg-muted">{collapsibleOpen ? "−" : "+"}</span>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <p className="px-r4 py-r5 text-body-3 text-fg-secondary">
                  A themeable React component library built on design tokens and
                  Tailwind v4.
                </p>
              </Collapsible.Content>
            </Collapsible>
          </Tile>
          <Tile label="Drawer">
            <div className="flex flex-wrap gap-r5">
              <Button onClick={() => openDrawer("right")}>Right</Button>
              <Button variant="secondary" onClick={() => openDrawer("left")}>
                Left
              </Button>
              <Button variant="secondary" onClick={() => openDrawer("top")}>
                Top
              </Button>
              <Button variant="secondary" onClick={() => openDrawer("bottom")}>
                Bottom
              </Button>
            </div>
            <Drawer open={drawerOpen} side={drawerSide} onClose={() => setDrawerOpen(false)}>
              <div className="flex h-full flex-col gap-r4">
                <h3 className="text-h4">Drawer ({drawerSide})</h3>
                <p className="text-body-2 text-fg-secondary">
                  A side sheet built on the native &lt;dialog&gt;. Press Escape or
                  click the backdrop to dismiss.
                </p>
                <div className="mt-auto flex justify-end">
                  <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </Drawer>
          </Tile>

          <Tile label="ContextMenu">
            <ContextMenu>
              <ContextMenu.Trigger>
                <div className="flex h-24 w-48 items-center justify-center rounded-md border border-dashed border-border-default bg-surface-2 text-body-3 text-fg-muted">
                  right-click me
                </div>
              </ContextMenu.Trigger>
              <ContextMenu.Content>
                <ContextMenu.Label>Actions</ContextMenu.Label>
                <ContextMenu.Item index={0} icon={<Copy size={14} />} onSelect={() => {}}>
                  Copy
                </ContextMenu.Item>
                <ContextMenu.Item index={1} icon={<FileText size={14} />} onSelect={() => {}}>
                  Duplicate
                </ContextMenu.Item>
                <ContextMenu.Divider />
                <ContextMenu.Item index={2} icon={<Trash2 size={14} />} onSelect={() => {}}>
                  Delete
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu>
          </Tile>

          <Tile label="HoverCard">
            <HoverCard>
              <HoverCard.Trigger asChild>
                <Button variant="link">@ada</Button>
              </HoverCard.Trigger>
              <HoverCard.Content>
                <div className="flex gap-r4">
                  <Avatar name="Ada Lovelace" size="lg" />
                  <div className="flex flex-col gap-r6">
                    <span className="text-body-1 font-semibold text-fg-primary">
                      Ada Lovelace
                    </span>
                    <span className="text-body-3 text-fg-secondary">
                      First computer programmer. Writes about analytical engines
                      and Bernoulli numbers.
                    </span>
                  </div>
                </div>
              </HoverCard.Content>
            </HoverCard>
          </Tile>

          <Tile label="Stepper — horizontal">
            <div className="w-full min-w-72">
              <Stepper activeStep={1}>
                <Stepper.Step title="Account" description="Your details" />
                <Stepper.Step title="Plan" description="Pick a tier" />
                <Stepper.Step title="Confirm" description="Review & pay" />
              </Stepper>
            </div>
          </Tile>

          <Tile label="Stepper — vertical">
            <Stepper activeStep={2} orientation="vertical" className="w-56">
              <Stepper.Step title="Cart" description="2 items" />
              <Stepper.Step title="Shipping" description="Address entered" />
              <Stepper.Step title="Payment" description="Card details" />
              <Stepper.Step title="Done" description="Order placed" />
            </Stepper>
          </Tile>

          <Tile label="CommandPalette">
            <Button onClick={() => setPaletteOpen(true)}>Open command palette</Button>
            <span className="flex items-center gap-r6 text-body-3 text-fg-muted">
              or press <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
            <CommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              items={COMMANDS}
            />
          </Tile>
        </Group>

        {/* ============================================================ */}
        {/*  GROUP: form                                                 */}
        {/*  src/components/form                                         */}
        {/* ============================================================ */}
        <Group id="group-form" title="Form">
          <Tile label="Input">
            <Field>
              <Label>Email</Label>
              <Input placeholder="you@example.com" />
            </Field>
          </Tile>
          <Tile label="Input (error)">
            <Field>
              <Label>Email</Label>
              <Input error placeholder="you@example.com" defaultValue="not-an-email" />
            </Field>
          </Tile>
          <Tile label="Textarea">
            <Field>
              <Label>Notes</Label>
              <Textarea placeholder="Type here…" rows={3} />
            </Field>
          </Tile>
          <Tile label="Select">
            <Field>
              <Label>Role</Label>
              <Select defaultValue="engineer">
                <option value="engineer">Engineer</option>
                <option value="designer">Designer</option>
                <option value="manager">Manager</option>
              </Select>
            </Field>
          </Tile>
          <Tile label="Checkbox">
            <Label className="flex items-center gap-r5">
              <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              Subscribe
            </Label>
          </Tile>
          <Tile label="Radio">
            <Label className="flex items-center gap-r5">
              <Radio name="r" value="a" checked={radio === "a"} onChange={() => setRadio("a")} />
              Option A
            </Label>
            <Label className="flex items-center gap-r5">
              <Radio name="r" value="b" checked={radio === "b"} onChange={() => setRadio("b")} />
              Option B
            </Label>
          </Tile>

          {/* TODO (later phase): add form components here as they land. */}
          <Tile label="Switch">
            <div className="flex flex-col gap-r4">
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              <Switch defaultChecked={false} />
              <Switch size="sm" defaultChecked />
              <Switch defaultChecked disabled />
            </div>
          </Tile>
          <Tile label="Slider">
            <div className="flex w-64 flex-col gap-r4">
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                aria-label="Volume"
              />
              <span className="text-body-3 text-fg-muted">Value: {sliderValue}</span>
              <Slider defaultValue={75} step={5} aria-label="Brightness" disabled />
            </div>
          </Tile>
          <Tile label="NumberInput">
            <div className="flex w-48 flex-col gap-r4">
              <NumberInput
                value={numberValue}
                onValueChange={setNumberValue}
                min={0}
                max={20}
                step={1}
                aria-label="Quantity"
              />
              <span className="text-body-3 text-fg-muted">
                Value: {numberValue ?? "null"}
              </span>
            </div>
          </Tile>
          <Tile label="TagInput">
            <div className="w-64">
              <TagInput
                value={tags}
                onValueChange={setTags}
                placeholder="Add a tag…"
                maxTags={6}
                aria-label="Tags"
              />
            </div>
          </Tile>
          <Tile label="OTPInput">
            <div className="flex flex-col gap-r4">
              <OTPInput length={6} value={otp} onValueChange={setOtp} />
              <span className="text-body-3 text-fg-muted">Code: {otp || "—"}</span>
            </div>
          </Tile>
        </Group>

        {/* ============================================================ */}
        {/*  GROUP: layout                                               */}
        {/*  src/components/layout — Center, Container, Divider, Row,     */}
        {/*  Spacer, Stack                                               */}
        {/* ============================================================ */}
        <Group id="group-layout" title="Layout">
          <Tile label="Stack (gap=r3)">
            <Stack gap="r3" className="w-48">
              <div className="rounded-md bg-surface-2 p-r5 text-center text-body-3">One</div>
              <div className="rounded-md bg-surface-2 p-r5 text-center text-body-3">Two</div>
              <div className="rounded-md bg-surface-2 p-r5 text-center text-body-3">Three</div>
            </Stack>
          </Tile>
          <Tile label="Stack (gap=r6, tight)">
            <Stack gap="r6" className="w-48">
              <div className="rounded-md bg-surface-2 p-r5 text-center text-body-3">A</div>
              <div className="rounded-md bg-surface-2 p-r5 text-center text-body-3">B</div>
              <div className="rounded-md bg-surface-2 p-r5 text-center text-body-3">C</div>
            </Stack>
          </Tile>
        </Group>

        {/* ============================================================ */}
        {/*  GROUP: data-display                                         */}
        {/*  StatCard, Timeline, DataTable (+ dashboard primitives added */}
        {/*  in later phases: Sparkline, etc.)                           */}
        {/* ============================================================ */}
        <Group id="group-data-display" title="Data display">
          <div className="flex flex-wrap items-start gap-r4">
            <StatCard>
              <StatCard.Label>Revenue</StatCard.Label>
              <StatCard.Value>$48,250</StatCard.Value>
              <StatCard.Trend value={12} direction="up" />
            </StatCard>
            <StatCard>
              <StatCard.Label>Churn</StatCard.Label>
              <StatCard.Value animateValue to={3} format={(v) => `${Math.round(v)}%`} />
              <StatCard.Trend value={2} direction="down" />
            </StatCard>
            <StatCard>
              <StatCard.Label>Active users</StatCard.Label>
              <StatCard.Value>1,280</StatCard.Value>
              <StatCard.Trend value={0} direction="neutral" />
            </StatCard>
            {/* StatCard using the new .Sparkline slot + .Trend `format` */}
            <StatCard>
              <StatCard.Label>Sessions</StatCard.Label>
              <StatCard.Value>9,402</StatCard.Value>
              <StatCard.Trend value={8.4} direction="up" format={(v) => `+${v.toFixed(1)}% WoW`} />
              <StatCard.Sparkline
                direction="up"
                values={[4, 6, 5, 8, 7, 10, 9, 12]}
                variant="area"
              />
            </StatCard>
          </div>

          <Tile label="Sparkline">
            <div className="flex flex-col gap-r5">
              <Sparkline className="text-chart-1" values={[3, 7, 4, 9, 6, 11, 8, 13]} />
              <Sparkline
                className="text-trend-up"
                variant="area"
                values={[3, 7, 4, 9, 6, 11, 8, 13]}
              />
              <Sparkline
                className="text-trend-down"
                variant="bar"
                values={[13, 8, 11, 6, 9, 4, 7, 3]}
              />
              {/* Flat / edge case: all-equal values render a centreline with no NaN */}
              <Sparkline className="text-fg-muted" values={[5, 5, 5, 5, 5]} />
            </div>
          </Tile>

          <Tile label="ProgressRing">
            <ProgressRing value={25}>
              <span className="text-body-3 font-semibold text-fg-primary">25%</span>
            </ProgressRing>
            <ProgressRing value={66} color="success">
              <span className="text-body-3 font-semibold text-fg-primary">66%</span>
            </ProgressRing>
            <ProgressRing value={80} color="warning">
              <span className="text-body-3 font-semibold text-fg-primary">80%</span>
            </ProgressRing>
            <ProgressRing value={95} color="error">
              <span className="text-body-3 font-semibold text-fg-primary">95%</span>
            </ProgressRing>
          </Tile>

          <Tile label="Meter">
            <div className="flex w-64 flex-col gap-r4">
              <Meter value={35} warningAt={70} criticalAt={90} aria-label="Disk — ok" />
              <Meter value={78} warningAt={70} criticalAt={90} aria-label="Disk — warning" />
              <Meter value={94} warningAt={70} criticalAt={90} aria-label="Disk — critical" />
            </div>
          </Tile>

          <Tile label="DescriptionList — horizontal">
            <DescriptionList className="w-64">
              <DescriptionList.Term>Name</DescriptionList.Term>
              <DescriptionList.Detail>Ada Lovelace</DescriptionList.Detail>
              <DescriptionList.Term>Role</DescriptionList.Term>
              <DescriptionList.Detail>Engineer</DescriptionList.Detail>
              <DescriptionList.Term>Status</DescriptionList.Term>
              <DescriptionList.Detail>Active</DescriptionList.Detail>
            </DescriptionList>
          </Tile>

          <Tile label="DescriptionList — vertical">
            <DescriptionList layout="vertical" className="w-64">
              <DescriptionList.Term>Name</DescriptionList.Term>
              <DescriptionList.Detail>Grace Hopper</DescriptionList.Detail>
              <DescriptionList.Term>Role</DescriptionList.Term>
              <DescriptionList.Detail>Admiral</DescriptionList.Detail>
            </DescriptionList>
          </Tile>

          <Tile label="ActivityFeed">
            <ActivityFeed className="w-72">
              <ActivityFeed.Item
                avatar={<Avatar name="Ada Lovelace" size="sm" />}
                actor="Ada"
                action="commented on"
                target="PR #42"
                timestamp="2h ago"
              />
              <ActivityFeed.Item
                icon={<GitCommit size={10} />}
                actor="Grace"
                action="pushed to"
                target="main"
                timestamp="1h ago"
              />
              <ActivityFeed.Item
                icon={<UserPlus size={10} />}
                actor="Alan"
                action="joined the"
                target="project"
                timestamp="just now"
              >
                <MessageSquare className="inline-block" size={12} /> Welcome aboard!
              </ActivityFeed.Item>
            </ActivityFeed>
          </Tile>

          <div className="w-full">
            <DataTable<Person>
              data={PEOPLE}
              columns={COLUMNS}
              rowKey={(r) => r.id}
              defaultSort={{ key: "name", direction: "asc" }}
              pageSize={4}
            />
          </div>

          <div className="w-full max-w-xl">
            <Timeline>
              <Timeline.Item date="Mon" title="Order placed">
                Your order was received.
              </Timeline.Item>
              <Timeline.Item date="Tue" title="Shipped">
                Package left the warehouse.
              </Timeline.Item>
              <Timeline.Item date="Thu" title="Delivered">
                Left on the porch.
              </Timeline.Item>
            </Timeline>
          </div>

        </Group>
      </main>
    </div>
  );
}
