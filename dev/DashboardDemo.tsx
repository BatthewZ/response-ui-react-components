import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  GitCommit,
  Info,
  LayoutDashboard,
  LifeBuoy,
  Plus,
  Receipt,
  Rocket,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityFeed,
  Alert,
  AppShell,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  CommandPalette,
  type CommandItem,
  Container,
  DataTable,
  type ColumnDef,
  DateRangePicker,
  type DateRange,
  DescriptionList,
  Divider,
  DropdownMenu,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Grid,
  HoverCard,
  IconButton,
  Kbd,
  Label,
  Meter,
  Popover,
  ProgressBar,
  ProgressRing,
  Row,
  RouterAdapterProvider,
  type RouterLinkProps,
  SearchInput,
  Select,
  Skeleton,
  Sparkline,
  Stack,
  StatCard,
  Switch,
  Tabs,
  ThemeSwitcher,
  Timeline,
  ToastProvider,
  Tooltip,
  useToast,
  cn,
  EXAMPLE_THEMES,
} from "../src";

/* ------------------------------------------------------------------ */
/*  Demo router                                                        */
/* ------------------------------------------------------------------ */

/**
 * A router in ~15 lines, so the sidebar's `aria-current` and active styling are
 * real rather than hard-coded, and the mobile drawer's close-on-navigate fires.
 * An app passes its own framework's Link + location hook here instead.
 */
const DemoRouterContext = createContext<{ pathname: string; navigate: (to: string) => void }>({
  pathname: "/overview",
  navigate: () => {},
});

function useDemoPathname() {
  return useContext(DemoRouterContext).pathname;
}

const DemoLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(function DemoLink(
  { to, replace: _replace, children, onClick, ...rest },
  ref,
) {
  const { navigate } = useContext(DemoRouterContext);
  return (
    <a
      ref={ref}
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
});

/* ------------------------------------------------------------------ */
/*  Sample data                                                        */
/* ------------------------------------------------------------------ */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdExact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const NAV = {
  "/overview": "Overview",
  "/revenue": "Revenue",
  "/reliability": "Reliability",
  "/customers": "Customers",
  "/billing": "Billing",
  "/team": "Team",
  "/settings": "Settings",
  "/support": "Support",
};
type NavPath = keyof typeof NAV;

type Channel = { name: string; total: number; share: number; tint: string; series: number[] };

/**
 * `chart-1..5` are the design system's categorical ramp. Naming the token rather
 * than a colour is what lets a consumer's theme re-key the whole panel.
 */
const CHANNELS: Channel[] = [
  {
    name: "Direct",
    total: 61400,
    share: 48,
    tint: "text-chart-1",
    series: [28, 31, 30, 35, 34, 39, 42, 41, 46, 48, 52, 57],
  },
  {
    name: "Marketplace",
    total: 38200,
    share: 30,
    tint: "text-chart-2",
    series: [22, 24, 21, 26, 29, 27, 31, 33, 30, 34, 36, 35],
  },
  {
    name: "Partners",
    total: 18900,
    share: 15,
    tint: "text-chart-3",
    series: [9, 11, 10, 12, 11, 14, 13, 16, 15, 17, 18, 18],
  },
  {
    name: "Referral",
    total: 9920,
    share: 7,
    tint: "text-chart-4",
    series: [6, 5, 7, 6, 8, 7, 9, 8, 9, 10, 9, 11],
  },
];

type OrderStatus = "fulfilled" | "processing" | "disputed";

type Order = {
  id: string;
  customer: string;
  handle: string;
  company: string;
  channel: string;
  region: string;
  status: OrderStatus;
  total: number;
  placed: string;
};

const STATUS_BADGE: Record<OrderStatus, { variant: "success" | "info" | "error"; label: string }> = {
  fulfilled: { variant: "success", label: "Fulfilled" },
  processing: { variant: "info", label: "Processing" },
  disputed: { variant: "error", label: "Disputed" },
};

const ORDERS: Order[] = [
  { id: "ORD-4821", customer: "Ada Lovelace", handle: "@ada", company: "Analytical Engine Co.", channel: "Direct", region: "eu-west-2", status: "fulfilled", total: 4820.0, placed: "12 Jul" },
  { id: "ORD-4820", customer: "Grace Hopper", handle: "@grace", company: "Harvard Systems", channel: "Marketplace", region: "us-east-1", status: "processing", total: 1290.5, placed: "12 Jul" },
  { id: "ORD-4818", customer: "Alan Turing", handle: "@alan", company: "Bletchley Labs", channel: "Direct", region: "eu-west-2", status: "fulfilled", total: 940.0, placed: "11 Jul" },
  { id: "ORD-4815", customer: "Katherine Johnson", handle: "@katherine", company: "Orbital Dynamics", channel: "Partners", region: "us-west-2", status: "disputed", total: 3110.75, placed: "11 Jul" },
  { id: "ORD-4814", customer: "Barbara Liskov", handle: "@barbara", company: "Substitution Ltd", channel: "Direct", region: "us-east-1", status: "fulfilled", total: 2260.0, placed: "10 Jul" },
  { id: "ORD-4811", customer: "Edsger Dijkstra", handle: "@edsger", company: "Shortest Path BV", channel: "Referral", region: "eu-west-2", status: "processing", total: 615.2, placed: "10 Jul" },
  { id: "ORD-4809", customer: "Margaret Hamilton", handle: "@margaret", company: "Apollo Guidance", channel: "Marketplace", region: "us-west-2", status: "fulfilled", total: 7480.0, placed: "9 Jul" },
  { id: "ORD-4806", customer: "Donald Knuth", handle: "@donald", company: "Literate Press", channel: "Partners", region: "ap-south-1", status: "fulfilled", total: 1875.0, placed: "9 Jul" },
  { id: "ORD-4802", customer: "Radia Perlman", handle: "@radia", company: "Spanning Tree Inc", channel: "Direct", region: "us-east-1", status: "disputed", total: 520.4, placed: "8 Jul" },
  { id: "ORD-4799", customer: "Frances Allen", handle: "@frances", company: "Optimising Compilers", channel: "Marketplace", region: "eu-west-2", status: "fulfilled", total: 3340.0, placed: "8 Jul" },
];

const REGIONS = ["All regions", "us-east-1", "us-west-2", "eu-west-2", "ap-south-1"];

/* ------------------------------------------------------------------ */
/*  Panel — the one section shell every card on the page shares        */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  caption,
  actions,
  className,
  children,
}: {
  title: string;
  caption?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="r2" className={cn("flex flex-col gap-r3", className)}>
      <Row justify="between" align="start" gap="r4" wrap>
        <Stack gap="r6">
          <h2 className="text-h5 text-fg-primary">{title}</h2>
          {caption && <p className="text-body-3 text-fg-muted">{caption}</p>}
        </Stack>
        {actions}
      </Row>
      {children}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

function DashboardNavbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { toast } = useToast();

  return (
    <AppShell.Navbar>
      <AppShell.Toggle />
      <AppShell.Brand>
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-fg-on-primary">
          <Activity size={14} aria-hidden="true" />
        </span>
        Meridian
      </AppShell.Brand>

      <AppShell.NavbarActions>
        {/* The palette's own trigger: a button that looks like a search field and
            advertises its shortcut, which is how a real console opens one. */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden items-center gap-r5 rounded-md border border-border-default bg-surface-1 px-r5 py-r6 text-body-3 text-fg-muted hover:bg-surface-2 sm:flex"
        >
          <Search size={14} aria-hidden="true" />
          Search or jump to…
          <Kbd>⌘ K</Kbd>
        </button>

        <Popover placement="bottom-end">
          <Popover.Trigger asChild>
            <IconButton type="button" aria-label="Notifications, 3 unread">
              <span className="relative">
                <Bell size={18} aria-hidden="true" />
                <span className="absolute -top-r6 -right-r6 size-2 rounded-full bg-status-error" />
              </span>
            </IconButton>
          </Popover.Trigger>
          <Popover.Content aria-label="Notifications">
            <Stack gap="r5" className="w-72">
              <Row justify="between">
                <span className="text-body-2 font-semibold text-fg-primary">Notifications</span>
                <Badge variant="info">3 new</Badge>
              </Row>
              <Divider />
              <ActivityFeed>
                <ActivityFeed.Item
                  icon={<Rocket />}
                  actor="Deploy bot"
                  action="released"
                  target="v4.12.0"
                  timestamp="9m ago"
                />
                <ActivityFeed.Item
                  icon={<ShieldCheck />}
                  actor="Security"
                  action="rotated keys for"
                  target="eu-west-2"
                  timestamp="1h ago"
                />
                <ActivityFeed.Item
                  icon={<Receipt />}
                  actor="Billing"
                  action="issued"
                  target="INV-2043"
                  timestamp="3h ago"
                />
              </ActivityFeed>
              <Button
                variant="link"
                size="sm"
                className="self-start"
                onClick={() => toast("Nothing left to catch up on.", { variant: "success" })}
              >
                Mark all as read
              </Button>
            </Stack>
          </Popover.Content>
        </Popover>

        {/* The navbar is a fixed-height, no-wrap flex row, so a wide control has
            to leave rather than reflow; the harness bar above keeps one either way.
            The `hidden` goes on a wrapper because `.theme-switcher`'s own
            `display: inline-flex` is unlayered and outranks the utility. */}
        <span className="hidden md:block">
          <ThemeSwitcher themes={EXAMPLE_THEMES} />
        </span>

        <DropdownMenu placement="bottom-end">
          <DropdownMenu.Trigger asChild>
            <button type="button" aria-label="Account menu for Ada Lovelace">
              <Avatar name="Ada Lovelace" size="sm" status="online" statusLabel="Online" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Label>ada@meridian.example</DropdownMenu.Label>
            <DropdownMenu.Item index={0} icon={<Users aria-hidden="true" />}>
              Profile
            </DropdownMenu.Item>
            <DropdownMenu.Item index={1} icon={<Settings aria-hidden="true" />}>
              Preferences
            </DropdownMenu.Item>
            <DropdownMenu.Divider />
            <DropdownMenu.Item index={2}>Sign out</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </AppShell.NavbarActions>
    </AppShell.Navbar>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

function DashboardSidebar() {
  return (
    <AppShell.Sidebar className="group">
      <AppShell.SidebarSection title="Analyse">
        <AppShell.SidebarLink to="/overview" icon={LayoutDashboard}>
          Overview
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/revenue" icon={BarChart3}>
          Revenue
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/reliability" icon={Activity}>
          Reliability
        </AppShell.SidebarLink>
      </AppShell.SidebarSection>

      <AppShell.SidebarSection title="Operate">
        <AppShell.SidebarLink to="/customers" icon={Building2}>
          Customers
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/billing" icon={CreditCard}>
          Billing
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/team" icon={Users}>
          Team
        </AppShell.SidebarLink>
      </AppShell.SidebarSection>

      <AppShell.SidebarSection title="Account">
        <AppShell.SidebarLink to="/settings" icon={Settings}>
          Settings
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/support" icon={LifeBuoy}>
          Support
        </AppShell.SidebarLink>
      </AppShell.SidebarSection>

      {/* The collapsed rail is 4rem wide and hides link labels, so a text card has
          to go with them. AppShell puts `data-collapsed` on the sidebar itself,
          which is why that element carries `group`. */}
      <div className="mt-auto pt-r4 group-data-collapsed:hidden">
        <Card padding="r5" shadow="sm" className="flex flex-col gap-r5">
          <span className="text-body-3 font-semibold text-fg-primary">Trial · 9 days left</span>
          <ProgressBar value={9} max={30} size="sm" aria-label="Trial days remaining" />
          <Button size="sm">Upgrade plan</Button>
        </Card>
      </div>
    </AppShell.Sidebar>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI row                                                            */
/* ------------------------------------------------------------------ */

function KpiRow() {
  return (
    <Grid columns={{ base: 1, sm: 2, xl: 4 }} gap="r4">
      <StatCard>
        <StatCard.Icon>
          <Wallet size={20} aria-hidden="true" />
        </StatCard.Icon>
        <StatCard.Label>Net revenue</StatCard.Label>
        <StatCard.Value animateValue to={128420} format={usd.format} />
        <StatCard.Trend value={12.5} direction="up" format={(v) => `+${v.toFixed(1)}% vs. prior 30d`} />
        <StatCard.Sparkline
          direction="up"
          aria-hidden
          values={[62, 68, 65, 74, 79, 76, 88, 92, 97, 104, 118, 128]}
        />
      </StatCard>

      <StatCard>
        <StatCard.Icon>
          <Building2 size={20} aria-hidden="true" />
        </StatCard.Icon>
        <StatCard.Label>Active workspaces</StatCard.Label>
        <StatCard.Value animateValue to={3912} format={(v) => Math.round(v).toLocaleString("en-US")} />
        <StatCard.Trend value={4.2} direction="up" format={(v) => `+${v.toFixed(1)}% vs. prior 30d`} />
        <StatCard.Sparkline
          direction="up"
          aria-hidden
          values={[3410, 3452, 3488, 3501, 3560, 3612, 3644, 3701, 3755, 3808, 3870, 3912]}
        />
      </StatCard>

      <StatCard>
        <StatCard.Icon>
          <Receipt size={20} aria-hidden="true" />
        </StatCard.Icon>
        <StatCard.Label>Trial conversion</StatCard.Label>
        <StatCard.Value>18.4%</StatCard.Value>
        <StatCard.Trend value={2.1} direction="down" format={(v) => `−${v.toFixed(1)}pt vs. prior 30d`} />
        <StatCard.Sparkline
          direction="down"
          aria-hidden
          values={[22, 21.4, 21.8, 20.9, 20.5, 20.6, 19.8, 19.4, 19.1, 18.9, 18.6, 18.4]}
        />
      </StatCard>

      <StatCard>
        <StatCard.Icon>
          <ShieldCheck size={20} aria-hidden="true" />
        </StatCard.Icon>
        <StatCard.Label>Uptime (30d)</StatCard.Label>
        <StatCard.Value>99.98%</StatCard.Value>
        <StatCard.Trend value={0} direction="neutral" format={() => "Meeting the 99.95% SLO"} />
        {/* A line against the SLO band, not bars. Bars measure from zero, so a
            99.8–100% series is twelve identical full-height columns — honest but
            unreadable. The explicit domain puts the dips against the floor that
            actually matters. */}
        <StatCard.Sparkline
          direction="neutral"
          aria-hidden
          min={99.5}
          max={100}
          values={[100, 100, 99.9, 100, 100, 99.8, 100, 100, 100, 99.95, 100, 100]}
        />
      </StatCard>
    </Grid>
  );
}

/* ------------------------------------------------------------------ */
/*  Revenue by channel                                                 */
/* ------------------------------------------------------------------ */

function ChannelPanel() {
  const [grain, setGrain] = useState("weekly");
  const total = CHANNELS.reduce((sum, c) => sum + c.total, 0);

  return (
    <Panel
      title="Revenue by channel"
      caption="Rolling 12 periods · updated 4 minutes ago"
      className="lg:col-span-2"
      actions={
        <Row gap="r5">
          <Tooltip content="Attribution is last-touch; refunds are netted off on settlement.">
            <IconButton type="button" aria-label="How this is calculated">
              <Info size={16} aria-hidden="true" />
            </IconButton>
          </Tooltip>
          <Select
            aria-label="Granularity"
            value={grain}
            onChange={(event) => setGrain(event.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </Row>
      }
    >
      <Row gap="r4" align="baseline">
        <span className="text-h3 font-bold text-fg-primary tabular-nums">{usd.format(total)}</span>
        <span className="text-body-3 text-trend-up">+12.5% vs. prior period</span>
      </Row>

      {/* flex-1 + justify-between: the Grid makes this cell as tall as the health
          panel beside it, so the rows spread over that height instead of
          stranding it as whitespace. */}
      <Stack gap="r4" className="flex-1 justify-between">
        {CHANNELS.map((channel) => (
          <div key={channel.name} className="flex items-center gap-r4">
            <span className="flex min-w-0 flex-1 items-center gap-r5 sm:flex-none sm:basis-36">
              <span className={cn("size-2 shrink-0 rounded-full bg-current", channel.tint)} />
              <span className="truncate text-body-2 text-fg-primary">{channel.name}</span>
            </span>
            <Sparkline
              className={cn("hidden h-12 min-w-0 flex-1 sm:block", channel.tint)}
              variant="area"
              width={360}
              height={48}
              values={channel.series}
              aria-label={`${channel.name} revenue, rolling 12 periods`}
            />
            <span className="w-20 shrink-0 text-right text-body-2 text-fg-primary tabular-nums">
              {usd.format(channel.total)}
            </span>
            <span className="w-10 shrink-0 text-right text-body-3 text-fg-muted tabular-nums">
              {channel.share}%
            </span>
          </div>
        ))}
      </Stack>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Service health                                                     */
/* ------------------------------------------------------------------ */

function HealthPanel() {
  return (
    <Panel title="Service health" caption="Live, 60s resolution">
      <Row justify="center" className="py-r5">
        <ProgressRing value={82} size={128} thickness={10} color="success" aria-label="Error budget remaining">
          <div className="text-center">
            <div className="text-h4 font-semibold text-fg-primary tabular-nums">82%</div>
            <div className="text-body-3 text-fg-secondary">error budget</div>
          </div>
        </ProgressRing>
      </Row>

      <Stack gap="r4">
        {[
          { label: "API p95 latency", readout: "248 ms", value: 41 },
          { label: "Database connections", readout: "742 / 900", value: 82 },
          { label: "Object storage", readout: "9.1 TB / 10 TB", value: 91 },
        ].map((row) => (
          <Stack key={row.label} gap="r6">
            <Row justify="between">
              <span className="text-body-3 text-fg-secondary">{row.label}</span>
              <span className="text-body-3 text-fg-primary tabular-nums">{row.readout}</span>
            </Row>
            <Meter value={row.value} warningAt={70} criticalAt={90} aria-label={row.label} />
          </Stack>
        ))}
      </Stack>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Orders table                                                       */
/* ------------------------------------------------------------------ */

const OPTIONAL_COLUMNS = [
  { key: "channel", label: "Channel" },
  { key: "region", label: "Region" },
  { key: "placed", label: "Placed" },
] as const;

const ORDER_TABS = [
  { value: "all", label: "All" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "processing", label: "Processing" },
  { value: "disputed", label: "Disputed" },
] as const;

function OrdersPanel() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [highValueOnly, setHighValueOnly] = useState(false);
  // "Placed" starts hidden: eight columns overflow a sidebar-narrowed page, and
  // starting with one box unticked is also what makes the Columns popover legible.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set(["placed"]));
  const [selection, setSelection] = useState<Set<string | number>>(new Set());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ORDERS.filter((order) => {
      if (tab !== "all" && order.status !== tab) return false;
      if (highValueOnly && order.total < 2000) return false;
      if (!q) return true;
      return [order.id, order.customer, order.company, order.channel, order.region].some((field) =>
        field.toLowerCase().includes(q),
      );
    });
  }, [query, tab, highValueOnly]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setTab("all");
    setHighValueOnly(false);
  }, []);

  const columns = useMemo<ColumnDef<Order>[]>(() => {
    const all: (ColumnDef<Order> & { optionalKey?: string })[] = [
      {
        key: "id",
        header: "Order",
        sortable: true,
        render: (order) => (
          <span className="font-semibold whitespace-nowrap tabular-nums">{order.id}</span>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        sortable: true,
        render: (order) => (
          <HoverCard>
            <HoverCard.Trigger asChild>
              <a
                href={`/customers/${order.handle.slice(1)}`}
                className="inline-flex items-center gap-r5 whitespace-nowrap"
              >
                <Avatar name={order.customer} size="xs" aria-hidden="true" />
                {order.customer}
              </a>
            </HoverCard.Trigger>
            <HoverCard.Content aria-label={order.customer}>
              <Row gap="r5" align="start">
                <Avatar name={order.customer} />
                <Stack gap="r6">
                  <span className="text-body-2 font-semibold text-fg-primary">{order.customer}</span>
                  <span className="text-body-3 text-fg-secondary">
                    {order.handle} · {order.company}
                  </span>
                  <span className="text-body-3 text-fg-muted">
                    Billed from {order.region} · customer since 2023
                  </span>
                </Stack>
              </Row>
            </HoverCard.Content>
          </HoverCard>
        ),
      },
      { key: "channel", optionalKey: "channel", header: "Channel", sortable: true },
      {
        key: "region",
        optionalKey: "region",
        header: "Region",
        render: (order) => (
          <span className="whitespace-nowrap text-fg-secondary tabular-nums">{order.region}</span>
        ),
      },
      {
        key: "placed",
        optionalKey: "placed",
        header: "Placed",
        sortable: true,
        render: (order) => <span className="whitespace-nowrap">{order.placed}</span>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (order) => (
          <Badge variant={STATUS_BADGE[order.status].variant}>{STATUS_BADGE[order.status].label}</Badge>
        ),
      },
      {
        key: "total",
        header: "Total",
        align: "right",
        sortable: true,
        render: (order) => <span className="tabular-nums">{usdExact.format(order.total)}</span>,
      },
    ];
    return all
      .filter((col) => !col.optionalKey || !hidden.has(col.optionalKey))
      .map(({ optionalKey: _optionalKey, ...col }) => col);
  }, [hidden]);

  const table = (
    <DataTable<Order>
      data={rows}
      columns={columns}
      rowKey={(order) => order.id}
      rowLabel={(order) => `Select order ${order.id}`}
      defaultSort={{ key: "id", direction: "desc" }}
      selectable
      selectedKeys={selection}
      onSelectionChange={setSelection}
      pageSize={5}
      density="comfortable"
      emptyContent={
        <EmptyState size="sm">
          <EmptyStateIcon>
            <Search size="1em" />
          </EmptyStateIcon>
          <EmptyStateTitle>No orders match these filters</EmptyStateTitle>
          <EmptyStateDescription>
            Widen the search, or clear the filters to see all {ORDERS.length} orders again.
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
              <RotateCcw size={14} aria-hidden="true" />
              Clear filters
            </Button>
          </EmptyStateActions>
        </EmptyState>
      }
    />
  );

  return (
    <Panel
      title="Recent orders"
      caption={`${rows.length} of ${ORDERS.length} orders${selection.size > 0 ? ` · ${selection.size} selected` : ""}`}
      actions={
        <Row gap="r5" wrap justify="end" className="ml-auto">
          {/* `.search-input` is `width: 100%` in unlayered CSS, which outranks a
              Tailwind width utility on the same element — so the cap goes on a
              wrapper, not on the control. */}
          <div className="w-56">
            <SearchInput
              size="sm"
              value={query}
              onChange={setQuery}
              placeholder="Order or customer"
            />
          </div>
          <Popover placement="bottom-end">
            <Popover.Trigger asChild>
              <Button type="button" variant="secondary" size="sm">
                <SlidersHorizontal size={14} aria-hidden="true" />
                Columns
              </Button>
            </Popover.Trigger>
            <Popover.Content aria-label="Visible columns">
              <Stack gap="r5" className="w-48">
                {OPTIONAL_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-r5 text-body-2">
                    <Checkbox
                      checked={!hidden.has(col.key)}
                      onChange={(event) => {
                        const next = new Set(hidden);
                        if (event.target.checked) next.delete(col.key);
                        else next.add(col.key);
                        setHidden(next);
                      }}
                    />
                    {col.label}
                  </label>
                ))}
              </Stack>
            </Popover.Content>
          </Popover>
          <Row gap="r6">
            <Label htmlFor="high-value-only" className="text-body-3">
              Over $2k
            </Label>
            <Switch
              id="high-value-only"
              size="sm"
              checked={highValueOnly}
              onCheckedChange={setHighValueOnly}
            />
          </Row>
        </Row>
      }
    >
      <Tabs defaultValue="all" value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <Tabs.List>
          {ORDER_TABS.map((t) => (
            <Tabs.Tab key={t.value} value={t.value}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {/* One Panel per Tab, not one Panel bound to the active value: on a
            switch, Tabs marks the OUTGOING value as exiting and waits for that
            panel's animationend to clear the flag. With a single panel there is
            no outgoing element, so nothing ever reports the exit and the panel
            stays unrendered for good. Only the active one mounts, so the table
            below is built once and handed to whichever panel is showing. */}
        {ORDER_TABS.map((t) => (
          <Tabs.Panel key={t.value} value={t.value}>
            {table}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity / deployments / account                                   */
/* ------------------------------------------------------------------ */

function ActivityPanel({ loading }: { loading: boolean }) {
  return (
    <Panel title="Team activity" caption="Everyone in the Platform workspace">
      {loading ? (
        <div role="status" className="flex flex-col gap-r3">
          <span className="sr-only">Loading team activity</span>
          {[0, 1, 2, 3].map((i) => (
            <Row key={i} gap="r5" align="start">
              <Skeleton aria-hidden variant="circular" width={32} height={32} />
              <Stack gap="r6" className="flex-1">
                <Skeleton aria-hidden width="55%" />
                <Skeleton aria-hidden width="30%" />
              </Stack>
            </Row>
          ))}
        </div>
      ) : (
        <ActivityFeed>
          <ActivityFeed.Item
            avatar={<Avatar name="Ada Lovelace" size="sm" />}
            actor="Ada"
            action="approved the refund on"
            target="ORD-4815"
            timestamp="12m ago"
          />
          <ActivityFeed.Item
            icon={<GitCommit />}
            actor="Grace"
            action="pushed 3 commits to"
            target="billing-service"
            timestamp="48m ago"
          />
          <ActivityFeed.Item
            icon={<Rocket />}
            actor="Deploy bot"
            action="released"
            target="v4.12.0"
            timestamp="1h ago"
          >
            Rolled out to 4 regions with no error-budget spend.
          </ActivityFeed.Item>
          <ActivityFeed.Item
            avatar={<Avatar name="Katherine Johnson" size="sm" />}
            actor="Katherine"
            action="invited 2 teammates to"
            target="Platform"
            timestamp="3h ago"
          />
        </ActivityFeed>
      )}
      <Button variant="link" size="sm" className="mt-auto self-start">
        View all activity
      </Button>
    </Panel>
  );
}

function DeploymentsPanel() {
  return (
    <Panel title="Deployments" caption="billing-service · production">
      <Timeline align="left" density="dense">
        <Timeline.Item icon={<CheckCircle2 size={20} aria-hidden="true" />} date="14:02" title="v4.12.0 live">
          4 regions · 0 rollbacks
        </Timeline.Item>
        <Timeline.Item icon={<Rocket size={20} aria-hidden="true" />} date="13:51" title="Canary promoted">
          Error rate held at 0.02%.
        </Timeline.Item>
        <Timeline.Item icon={<ShieldCheck size={20} aria-hidden="true" />} date="13:44" title="Checks passed">
          1,284 tests · no retries
        </Timeline.Item>
        <Timeline.Item icon={<GitCommit size={20} aria-hidden="true" />} date="13:30" title="Build queued" />
      </Timeline>
    </Panel>
  );
}

function AccountPanel() {
  return (
    <Panel
      title="Plan & usage"
      caption="Scale · renews 1 Aug"
      actions={<Badge variant="info">Annual</Badge>}
    >
      <Stack gap="r5">
        <Row justify="between">
          <span className="text-body-3 text-fg-secondary">Seats used</span>
          <span className="text-body-3 text-fg-primary tabular-nums">18 / 25</span>
        </Row>
        <ProgressBar value={18} max={25} aria-label="Seats used" />
        <AvatarGroup max={5} size="sm">
          <Avatar name="Ada Lovelace" />
          <Avatar name="Grace Hopper" />
          <Avatar name="Alan Turing" />
          <Avatar name="Katherine Johnson" />
          <Avatar name="Barbara Liskov" />
          <Avatar name="Donald Knuth" />
          <Avatar name="Radia Perlman" />
        </AvatarGroup>
      </Stack>

      <Divider />

      <DescriptionList layout="vertical">
        <DescriptionList.Term>Billing contact</DescriptionList.Term>
        <DescriptionList.Detail>ada@meridian.example</DescriptionList.Detail>
        <DescriptionList.Term>Next invoice</DescriptionList.Term>
        <DescriptionList.Detail>
          <span className="tabular-nums">{usdExact.format(4800)}</span> on 1 August
        </DescriptionList.Detail>
        <DescriptionList.Term>Payment method</DescriptionList.Term>
        <DescriptionList.Detail>Visa ending 4242</DescriptionList.Detail>
      </DescriptionList>

      {/* mt-auto: the Grid stretches every cell to the tallest panel, so the
          closing action sits on the floor rather than leaving one below it. */}
      <Button variant="secondary" size="sm" className="mt-auto self-start">
        <CreditCard size={14} aria-hidden="true" />
        Manage billing
      </Button>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function DashboardPage() {
  const { toast } = useToast();
  const pathname = useDemoPathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [region, setRegion] = useState(REGIONS[0]);
  const [range, setRange] = useState<DateRange>({
    start: new Date(2026, 5, 12),
    end: new Date(2026, 6, 12),
  });
  const [loading, setLoading] = useState(false);

  // ⌘K / Ctrl-K, the shortcut the navbar's trigger advertises.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setPaletteOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const { navigate } = useContext(DemoRouterContext);
  const commands = useMemo<CommandItem[]>(
    () => [
      ...(Object.keys(NAV) as NavPath[]).map((path) => ({
        id: path,
        label: `Go to ${NAV[path]}`,
        group: "Navigation",
        icon: <LayoutDashboard size={16} />,
        onSelect: () => navigate(path),
      })),
      {
        id: "export-csv",
        label: "Export orders as CSV",
        group: "Actions",
        icon: <FileSpreadsheet size={16} />,
        shortcut: "⌘ E",
        keywords: ["download", "spreadsheet"],
        onSelect: () => toast("Export queued — we'll email the file.", { variant: "success" }),
      },
      {
        id: "invite",
        label: "Invite a teammate",
        group: "Actions",
        icon: <Users size={16} />,
        onSelect: () => toast("Invitation sent.", { variant: "success" }),
      },
    ],
    [navigate, toast],
  );

  const pageTitle = pathname in NAV ? NAV[pathname as NavPath] : "Overview";

  return (
    <AppShell>
      <DashboardNavbar onOpenPalette={() => setPaletteOpen(true)} />
      <DashboardSidebar />

      <AppShell.Main>
        <Container size="xl" className="flex flex-col gap-r3 py-r3">
          {/* ── Page header ── */}
          <Stack gap="r4">
            <Breadcrumbs>
              <Breadcrumbs.Item href="/overview">Meridian</Breadcrumbs.Item>
              {/* No href and not current: a level with no page of its own. */}
              <Breadcrumbs.Item>Platform</Breadcrumbs.Item>
              <Breadcrumbs.Item current>{pageTitle}</Breadcrumbs.Item>
            </Breadcrumbs>

            <Row justify="between" align="end" gap="r4" wrap>
              <Stack gap="r6">
                <Row gap="r5">
                  <h1 className="text-h4 text-fg-primary">{pageTitle}</h1>
                  <Badge variant="success" role="status">
                    All systems normal
                  </Badge>
                </Row>
                <p className="text-body-2 text-fg-secondary">
                  Revenue, reliability and workspace activity for the selected period.
                </p>
              </Stack>

              {/* ml-auto, not the parent's justify: once the parent wraps, its
                  `space-between` puts this block at the start of its own line. */}
              <Row gap="r5" wrap justify="end" className="ml-auto">
                <DateRangePicker
                  className="w-full sm:w-80"
                  value={range}
                  onValueChange={setRange}
                  startPlaceholder="From"
                  endPlaceholder="To"
                />
                <Select
                  aria-label="Region"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
                <DropdownMenu placement="bottom-end">
                  <DropdownMenu.Trigger asChild>
                    <Button type="button" variant="secondary">
                      <Download size={16} aria-hidden="true" />
                      Export
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Label>Download</DropdownMenu.Label>
                    <DropdownMenu.Item
                      index={0}
                      icon={<FileSpreadsheet aria-hidden="true" />}
                      onSelect={() => toast("Export queued — we'll email the file.", { variant: "success" })}
                    >
                      Orders (CSV)
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      index={1}
                      icon={<FileText aria-hidden="true" />}
                      onSelect={() => toast("Building the PDF summary…", { duration: 0 })}
                    >
                      Summary (PDF)
                    </DropdownMenu.Item>
                    <DropdownMenu.Divider />
                    <DropdownMenu.Item index={2} disabled>
                      Raw events — Enterprise only
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
                <Button
                  type="button"
                  onClick={() => toast("Report scheduled for Monday 09:00.", { variant: "success" })}
                >
                  <Plus size={16} aria-hidden="true" />
                  New report
                </Button>
              </Row>
            </Row>
          </Stack>

          <Alert variant="warning">
            <div className="flex flex-1 flex-wrap items-center justify-between gap-r5">
              <span>
                <strong>Elevated latency in eu-west-2.</strong> p95 is 40% above baseline since
                13:20 UTC. No customer impact recorded yet.
              </span>
              <Button variant="link" size="sm">
                View incident
              </Button>
            </div>
          </Alert>

          <KpiRow />

          <Grid columns={{ base: 1, lg: 3 }} gap="r4">
            <ChannelPanel />
            <HealthPanel />
          </Grid>

          <OrdersPanel />

          <Grid columns={{ base: 1, lg: 3 }} gap="r4">
            <ActivityPanel loading={loading} />
            <DeploymentsPanel />
            <AccountPanel />
          </Grid>

          {/* The loading switch drives the activity panel's skeletons — a real
              state of the page, not a separate specimen of Skeleton. */}
          <Row justify="between" gap="r4" wrap className="pb-r3">
            <span className="text-body-3 text-fg-muted">
              Meridian · demo data · press <Kbd>⌘ K</Kbd> for the command palette
            </span>
            <Row gap="r6">
              <Label htmlFor="simulate-loading" className="text-body-3">
                Simulate loading
              </Label>
              <Switch
                id="simulate-loading"
                size="sm"
                checked={loading}
                onCheckedChange={setLoading}
              />
            </Row>
          </Row>
        </Container>
      </AppShell.Main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={commands}
        placeholder="Search pages and actions…"
      />
    </AppShell>
  );
}

/**
 * A realistic admin console assembled only from this library — the counterpart to
 * the per-component tiles in the other dev views. If a component looks right in a
 * tile but wrong beside its neighbours, this is where that shows up.
 */
export function DashboardDemo() {
  const [pathname, setPathname] = useState("/overview");
  const router = useMemo(() => ({ pathname, navigate: setPathname }), [pathname]);
  const adapter = useMemo(() => ({ Link: DemoLink, usePathname: useDemoPathname }), []);

  return (
    <DemoRouterContext.Provider value={router}>
      <RouterAdapterProvider value={adapter}>
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>
      </RouterAdapterProvider>
    </DemoRouterContext.Provider>
  );
}
