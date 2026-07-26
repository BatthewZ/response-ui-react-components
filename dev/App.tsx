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
  Calendar,
  Card,
  Carousel,
  Checkbox,
  CodeBlock,
  Collapsible,
  ColorPicker,
  Combobox,
  CommandPalette,
  type CommandItem,
  ContextMenu,
  CopyButton,
  DataTable,
  DatePicker,
  type DateRange,
  DateRangePicker,
  DescriptionList,
  Dialog,
  Drawer,
  DropdownMenu,
  Field,
  FieldError,
  type FormApi,
  FormActions,
  FormProvider,
  HoverCard,
  Input,
  Kbd,
  Label,
  MediaCard,
  Meter,
  MultiSelect,
  type MultiSelectOption,
  NumberInput,
  OTPInput,
  Pagination,
  Popover,
  ProgressBar,
  ProgressRing,
  Radio,
  RangeCalendar,
  RangeSlider,
  type RangeSliderValue,
  Rating,
  Repeater,
  SearchInput,
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
  VirtualizedDataTable,
  Wizard,
  type WizardStep,
  type ColumnDef,
  useFieldArray,
  useFieldState,
  useForm,
  type StandardSchemaV1,
} from "../src";
// A few doc examples rendered inline in the curated view, so the showcase and the docs
// agree on the components it highlights. The "Examples" tab covers ALL of them.
import * as ButtonExamples from "../src/components/ui/Button.examples";
import * as TabsExamples from "../src/components/ui/Tabs.examples";
import { ExamplesGallery } from "./ExamplesGallery";
import { Group, Tile } from "./gallery-ui";

/* ------------------------------------------------------------------ */
/*  Layout helpers (local to the gallery — not part of the library)    */
/* ------------------------------------------------------------------ */

/* Group and Tile live in ./gallery-ui so the generated examples gallery shares them.
   To add a component to THIS curated view, drop a <Tile> (or a new <Group>) in the
   right place — structure stays one-section-per-group. */

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

/* 10,000-row dataset to exercise VirtualizedDataTable. */
const ROLES = ["Engineer", "Researcher", "Professor", "Author", "Admiral"];
const BIG_PEOPLE: Person[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Person ${i}`,
  role: ROLES[i % ROLES.length],
  visits: (i * 37) % 500,
}));

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
/*  Forms demo (separate tab) — exercises the headless useForm         */
/* ------------------------------------------------------------------ */

type FormDemoValues = {
  email: string;
  username: string;
  role: string;
  skills: string[];
  interests: string[];
  brandColor: string;
  budget: RangeSliderValue;
  links: { url: string }[];
  contacts: { name: string; email: string }[];
};

/**
 * A hand-rolled Standard Schema validator — proves the zero-dependency path
 * (no Zod/Valibot needed). A real app would pass a Zod/Valibot/ArkType schema
 * here instead; they all conform to this same `~standard` contract.
 */
const formDemoSchema: StandardSchemaV1<unknown, FormDemoValues> = {
  "~standard": {
    version: 1,
    vendor: "dev-demo",
    validate(value) {
      const v = (value ?? {}) as Partial<FormDemoValues>;
      const issues: { message: string; path: (string | number)[] }[] = [];
      if (!v.email) issues.push({ message: "Email is required", path: ["email"] });
      else if (!String(v.email).includes("@"))
        issues.push({ message: "Enter a valid email address", path: ["email"] });
      if (!v.username || String(v.username).length < 3)
        issues.push({ message: "Username needs at least 3 characters", path: ["username"] });
      if (!v.role) issues.push({ message: "Pick a role", path: ["role"] });
      if (!v.skills || v.skills.length === 0)
        issues.push({ message: "Add at least one skill", path: ["skills"] });
      if (!v.interests || v.interests.length === 0)
        issues.push({ message: "Select at least one interest", path: ["interests"] });
      if (!v.brandColor || !/^#[0-9a-f]{6}$/i.test(String(v.brandColor)))
        issues.push({ message: "Pick a brand colour", path: ["brandColor"] });
      if (!Array.isArray(v.budget) || v.budget[1] < 100)
        issues.push({ message: "Maximum budget must be at least 100", path: ["budget"] });
      (v.links ?? []).forEach((link, i) => {
        if (!link?.url || !String(link.url).startsWith("http"))
          issues.push({ message: "Links must start with http", path: ["links", i, "url"] });
      });
      if (!v.contacts || v.contacts.length === 0)
        issues.push({ message: "Add at least one contact", path: ["contacts"] });
      (v.contacts ?? []).forEach((contact, i) => {
        if (!contact?.name || String(contact.name).trim().length === 0)
          issues.push({ message: "Contact name is required", path: ["contacts", i, "name"] });
        if (!contact?.email || !String(contact.email).includes("@"))
          issues.push({ message: "Enter a valid email", path: ["contacts", i, "email"] });
      });
      if (issues.length > 0) return { issues };
      return { value: v as FormDemoValues };
    },
  },
};

const ROLE_OPTIONS = [
  { value: "", label: "Choose a role…" },
  { value: "engineer", label: "Engineer" },
  { value: "designer", label: "Designer" },
  { value: "pm", label: "Product Manager" },
];

const SKILL_OPTIONS: MultiSelectOption[] = [
  { value: "react", label: "React" },
  { value: "typescript", label: "TypeScript" },
  { value: "css", label: "CSS" },
  { value: "node", label: "Node.js" },
  { value: "graphql", label: "GraphQL" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go", disabled: true },
];

const COLOR_PRESETS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
];

const WIZARD_STEPS: WizardStep[] = [
  {
    title: "Account",
    description: "Your details",
    content: (
      <p className="text-body-2 text-fg-secondary">
        Step 1 — tell us who you are. In a real flow this panel would host the
        account fields.
      </p>
    ),
  },
  {
    title: "Plan",
    description: "Pick a tier",
    content: (
      <p className="text-body-2 text-fg-secondary">
        Step 2 — choose a subscription plan. Back is enabled now; completed steps
        in the header are clickable.
      </p>
    ),
  },
  {
    title: "Confirm",
    description: "Review & pay",
    content: (
      <p className="text-body-2 text-fg-secondary">
        Step 3 — review everything. The primary button now reads “Finish”.
      </p>
    ),
  },
];

/** Repeater demo — needs its own headless form, like FormsDemo. */
type RepeaterDemoValues = { contacts: { name: string; email: string }[] };

function RepeaterDemo() {
  const form = useForm<RepeaterDemoValues>({
    defaultValues: {
      contacts: [{ name: "Ada Lovelace", email: "ada@example.com" }],
    },
  });
  return (
    <FormProvider form={form}>
      <Repeater
        form={form}
        name="contacts"
        defaultItem={() => ({ name: "", email: "" })}
        addLabel="Add contact"
        min={1}
        max={4}
        reorderable
      >
        {({ name }) => (
          <div className="flex flex-1 flex-wrap gap-r5">
            <Field name={`${name}.name`} className="flex-1 min-w-[8rem]">
              <Input placeholder="Name" {...form.field(`${name}.name`)} />
            </Field>
            <Field name={`${name}.email`} className="flex-1 min-w-[10rem]">
              <Input placeholder="email@example.com" {...form.field(`${name}.email`)} />
            </Field>
          </div>
        )}
      </Repeater>
    </FormProvider>
  );
}

/**
 * Bind a controlled component (the `value` / `onValueChange` shape that
 * ColorPicker / MultiSelect / RangeSlider expose) to a useForm field. Mirrors
 * the watch/setValue pattern, plus surfaces the field's error and re-validates
 * on change so the form stays live.
 */
function useControlledField<V>(form: FormApi<FormDemoValues>, name: string) {
  const state = useFieldState(form, name);
  return {
    value: state.value as V,
    error: state.error !== undefined,
    onValueChange: (next: V) => {
      form.setValue(name, next, { shouldTouch: true });
      void form.trigger();
    },
  };
}

function FormsDemo() {
  const [submitted, setSubmitted] = useState<FormDemoValues | null>(null);
  const form = useForm<FormDemoValues>({
    schema: formDemoSchema,
    mode: "onBlur",
    defaultValues: {
      email: "",
      username: "",
      role: "",
      skills: [],
      interests: [],
      brandColor: "#3366cc",
      budget: [200, 800],
      links: [{ url: "" }],
      contacts: [{ name: "", email: "" }],
    },
    onSubmit: (values) => setSubmitted(values),
  });
  const links = useFieldArray({ form, name: "links" });
  const skills = (form.watch("skills") as string[]) ?? [];

  const interests = useControlledField<string[]>(form, "interests");
  const brandColor = useControlledField<string>(form, "brandColor");
  const budget = useControlledField<RangeSliderValue>(form, "budget");

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-r3 p-r3">
      <div className="flex flex-col gap-r6">
        <h2 className="text-h3 text-fg-primary">Sign-up form</h2>
        <p className="text-body-3 text-fg-muted">
          Headless <code>useForm</code> + a hand-rolled Standard Schema validator. Mode is{" "}
          <code>onBlur</code> (re-validates on change after the first submit). Submit empty to
          see errors surface, focus jump to the first invalid field, and the live state below.
        </p>
      </div>

      <FormProvider form={form}>
        <form {...form.props} className="flex flex-col gap-r3">
          <Field name="email">
            <Label htmlFor="fd-email">Email</Label>
            <Input id="fd-email" placeholder="you@example.com" {...form.field("email")} />
            <FieldError />
          </Field>

          <Field name="username">
            <Label htmlFor="fd-username">Username</Label>
            <Input id="fd-username" placeholder="at least 3 chars" {...form.field("username")} />
            <FieldError />
          </Field>

          <Field name="role">
            <Label htmlFor="fd-role">Role</Label>
            <Select id="fd-role" {...form.field("role")}>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <FieldError />
          </Field>

          <Field name="skills">
            <Label>Skills (controlled TagInput, bound via watch/setValue)</Label>
            <TagInput
              id="fd-skills"
              placeholder="type a skill, press Enter"
              value={skills}
              onValueChange={(next) => form.setValue("skills", next, { shouldTouch: true })}
            />
            <FieldError />
          </Field>

          <Field name="interests">
            <Label>Interests (MultiSelect, bound via watch/setValue)</Label>
            <MultiSelect
              options={SKILL_OPTIONS}
              placeholder="Pick a few interests…"
              aria-label="Interests"
              value={interests.value}
              onValueChange={interests.onValueChange}
              error={interests.error}
            />
            <FieldError />
          </Field>

          <Field name="brandColor">
            <Label>Brand colour (ColorPicker)</Label>
            <ColorPicker
              presets={COLOR_PRESETS}
              aria-label="Brand colour"
              value={brandColor.value}
              onValueChange={brandColor.onValueChange}
              error={brandColor.error}
            />
            <FieldError />
          </Field>

          <Field name="budget">
            <Label>
              Budget range (RangeSlider) — {budget.value[0]}–{budget.value[1]}
            </Label>
            <RangeSlider
              min={0}
              max={1000}
              step={50}
              minDistance={50}
              minLabel="Minimum budget"
              maxLabel="Maximum budget"
              value={budget.value}
              onValueChange={budget.onValueChange}
              error={budget.error}
            />
            <FieldError />
          </Field>

          <div className="flex flex-col gap-r5">
            <Label>Links (useFieldArray)</Label>
            {links.fields.map((f, i) => (
              <div key={f.id} className="flex items-start gap-r5">
                <Field name={`${f.name}.url`} className="flex-1">
                  <Input placeholder="https://…" {...form.field(`${f.name}.url`)} />
                  <FieldError />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => links.remove(i)}
                  disabled={links.fields.length === 1}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div>
              <Button type="button" variant="secondary" onClick={() => links.append({ url: "" })}>
                Add link
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-r5">
            <Label>Contacts (Repeater)</Label>
            <Repeater
              form={form}
              name="contacts"
              defaultItem={() => ({ name: "", email: "" })}
              addLabel="Add contact"
              min={1}
              max={4}
              reorderable
            >
              {({ name }) => (
                <div className="flex flex-1 flex-wrap gap-r5">
                  <Field name={`${name}.name`} className="flex-1 min-w-[8rem]">
                    <Input placeholder="Name" {...form.field(`${name}.name`)} />
                    <FieldError />
                  </Field>
                  <Field name={`${name}.email`} className="flex-1 min-w-[10rem]">
                    <Input placeholder="email@example.com" {...form.field(`${name}.email`)} />
                    <FieldError />
                  </Field>
                </div>
              )}
            </Repeater>
          </div>

          <FormActions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.reset();
                setSubmitted(null);
              }}
            >
              Reset
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Submitting…" : "Create account"}
            </Button>
          </FormActions>
        </form>
      </FormProvider>

      <div className="flex flex-col gap-r6 rounded-md border border-border-default bg-surface-1 p-r4">
        <span className="text-body-3 font-semibold uppercase tracking-wide text-fg-muted">
          Live form state
        </span>
        <pre className="overflow-x-auto text-body-3 text-fg-secondary">
          {JSON.stringify(
            {
              isValid: form.formState.isValid,
              isDirty: form.formState.isDirty,
              isSubmitted: form.formState.isSubmitted,
              submitCount: form.formState.submitCount,
              values: form.watch(),
            },
            null,
            2,
          )}
        </pre>
      </div>

      {submitted && (
        <Alert variant="success">
          <div className="flex flex-col gap-r6">
            <strong>Submitted ✓</strong>
            <pre className="overflow-x-auto text-body-3">
              {JSON.stringify(submitted, null, 2)}
            </pre>
          </div>
        </Alert>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Wizard + useForm demo (separate Forms-tab example)                 */
/* ------------------------------------------------------------------ */

type WizardFormValues = { fullName: string; email: string; plan: string };

const wizardFormSchema: StandardSchemaV1<unknown, WizardFormValues> = {
  "~standard": {
    version: 1,
    vendor: "dev-demo",
    validate(value) {
      const v = (value ?? {}) as Partial<WizardFormValues>;
      const issues: { message: string; path: (string | number)[] }[] = [];
      if (!v.fullName || String(v.fullName).trim().length === 0)
        issues.push({ message: "Name is required", path: ["fullName"] });
      if (!v.email || !String(v.email).includes("@"))
        issues.push({ message: "Enter a valid email address", path: ["email"] });
      if (!v.plan) issues.push({ message: "Choose a plan", path: ["plan"] });
      if (issues.length > 0) return { issues };
      return { value: v as WizardFormValues };
    },
  },
};

const PLAN_OPTIONS = [
  { value: "", label: "Choose a plan…" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Team" },
];

/**
 * Drives a multi-step <Wizard> from a single headless useForm: each step hosts
 * its own fields, and pressing "Finish" on the last step submits the form
 * (surfacing validation if anything across the steps is invalid).
 */
function WizardFormDemo() {
  const [submitted, setSubmitted] = useState<WizardFormValues | null>(null);
  const form = useForm<WizardFormValues>({
    schema: wizardFormSchema,
    mode: "onBlur",
    defaultValues: { fullName: "", email: "", plan: "" },
    onSubmit: (values) => setSubmitted(values),
  });

  const steps: WizardStep[] = [
    {
      title: "Account",
      description: "Who you are",
      content: (
        <div className="flex flex-col gap-r3">
          <Field name="fullName">
            <Label htmlFor="wf-name">Full name</Label>
            <Input id="wf-name" placeholder="Ada Lovelace" {...form.field("fullName")} />
            <FieldError />
          </Field>
          <Field name="email">
            <Label htmlFor="wf-email">Email</Label>
            <Input id="wf-email" placeholder="you@example.com" {...form.field("email")} />
            <FieldError />
          </Field>
        </div>
      ),
    },
    {
      title: "Plan",
      description: "Pick a tier",
      content: (
        <Field name="plan">
          <Label htmlFor="wf-plan">Plan</Label>
          <Select id="wf-plan" {...form.field("plan")}>
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <FieldError />
        </Field>
      ),
    },
    {
      title: "Confirm",
      description: "Review & finish",
      content: (
        <div className="flex flex-col gap-r5">
          <p className="text-body-2 text-fg-secondary">
            Review your details, then press <strong>Finish</strong> to submit. If anything
            is missing the form re-validates and the offending field's error surfaces.
          </p>
          <pre className="overflow-x-auto text-body-3 text-fg-secondary">
            {JSON.stringify(form.watch(), null, 2)}
          </pre>
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-r3 p-r3">
      <div className="flex flex-col gap-r6">
        <h2 className="text-h3 text-fg-primary">Wizard + useForm</h2>
        <p className="text-body-3 text-fg-muted">
          A multi-step <code>Wizard</code> whose steps host fields from one headless{" "}
          <code>useForm</code>. <strong>Finish</strong> submits and validates across every step.
        </p>
      </div>

      <FormProvider form={form}>
        <Wizard
          steps={steps}
          onComplete={() => {
            void form.handleSubmit()();
          }}
        />
      </FormProvider>

      {submitted && (
        <Alert variant="success">
          <div className="flex flex-col gap-r6">
            <strong>Submitted ✓</strong>
            <pre className="overflow-x-auto text-body-3">
              {JSON.stringify(submitted, null, 2)}
            </pre>
          </div>
        </Alert>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

/**
 * Keeps the controlled RangeSlider's state local. A range slider fires
 * onValueChange on every pointer move during a drag, so hoisting this state up
 * into the gallery would re-render the entire page each tick and make the drag
 * stutter. Consumers should keep slider state as close to the slider as
 * possible for the same reason.
 */
function PriceRangeDemo() {
  const [priceRange, setPriceRange] = useState<RangeSliderValue>([25, 70]);
  return (
    <>
      <RangeSlider
        value={priceRange}
        onValueChange={setPriceRange}
        minDistance={5}
        minLabel="Minimum price"
        maxLabel="Maximum price"
      />
      <span className="text-body-3 text-fg-muted">
        ${priceRange[0]} – ${priceRange[1]}
      </span>
    </>
  );
}

/**
 * Keeps the controlled Slider's state local. Like the range slider it fires
 * onValueChange on every pointer move during a drag, so hoisting this state up
 * into the gallery would re-render the entire page each tick and make the drag
 * stutter. Consumers should keep slider state as close to the slider as
 * possible for the same reason.
 */
function VolumeSliderDemo() {
  const [sliderValue, setSliderValue] = useState(40);
  return (
    <>
      <Slider value={sliderValue} onValueChange={setSliderValue} aria-label="Volume" />
      <span className="text-body-3 text-fg-muted">Value: {sliderValue}</span>
    </>
  );
}

export function App() {
  const [viewport, setViewport] = useState<ViewportKey>("full");
  const [tab, setTab] = useState<"gallery" | "forms" | "examples">("gallery");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("a");
  const [switchOn, setSwitchOn] = useState(true);
  const [numberValue, setNumberValue] = useState<number | null>(8);
  const [tags, setTags] = useState<string[]>(["react", "typescript"]);
  const [otp, setOtp] = useState("");
  const [rating, setRating] = useState(3);
  const [halfRating, setHalfRating] = useState(3.5);
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [virtualSelection, setVirtualSelection] = useState<Set<string | number>>(new Set());
  const [drawerSide, setDrawerSide] = useState<"left" | "right" | "top" | "bottom">("right");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [pickerDate, setPickerDate] = useState<Date | null>(new Date(2026, 5, 13));
  const [range, setRange] = useState<DateRange>({
    start: new Date(2026, 5, 8),
    end: new Date(2026, 5, 14),
  });
  const [pickerRange, setPickerRange] = useState<DateRange>({ start: null, end: null });
  const [fruit, setFruit] = useState<string | null>(null);
  const [fruitQuery, setFruitQuery] = useState("");
  const [search, setSearch] = useState("invoices");
  const [skills, setSkills] = useState<string[]>(["react", "typescript"]);
  const [brandColor, setBrandColor] = useState("#3366cc");
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set([2]));
  const [fullPage, setFullPage] = useState(1);
  const [edgesPage, setEdgesPage] = useState(1);
  const [compactPage, setCompactPage] = useState(3);
  const [responsivePage, setResponsivePage] = useState(1);

  const maxWidth = VIEWPORTS[viewport].width;

  // Combobox is filter-agnostic: the consumer filters the item set itself.
  const FRUITS = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry" },
    { value: "dragonfruit", label: "Dragonfruit" },
    { value: "elderberry", label: "Elderberry" },
    { value: "fig", label: "Fig" },
    { value: "grape", label: "Grape" },
  ];
  const filteredFruits = FRUITS.filter((f) =>
    f.label.toLowerCase().includes(fruitQuery.toLowerCase()),
  );

  // A bounded window around "today" for the Calendar min/max example.
  const calMin = new Date(2026, 0, 1);
  const calMax = new Date(2026, 11, 31);
  // Disable weekends — exercises the isDateDisabled matcher.
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  const SAMPLE_CODE = `import { Button } from "@batthewz/response-ui-react-components";

export function App() {
  return <Button variant="primary">Click me</Button>;
}
`;

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
          <div className="flex items-center gap-r6 rounded-md border border-border-default p-r6">
            <Button
              size="sm"
              variant={tab === "gallery" ? "primary" : "ghost"}
              onClick={() => setTab("gallery")}
            >
              Gallery
            </Button>
            <Button
              size="sm"
              variant={tab === "forms" ? "primary" : "ghost"}
              onClick={() => setTab("forms")}
            >
              Forms
            </Button>
            <Button
              size="sm"
              variant={tab === "examples" ? "primary" : "ghost"}
              onClick={() => setTab("examples")}
            >
              Examples
            </Button>
          </div>
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

      {tab === "examples" ? (
        <ExamplesGallery />
      ) : tab === "forms" ? (
        <div className="flex flex-col gap-r2 pb-r2">
          <FormsDemo />
          <WizardFormDemo />
        </div>
      ) : (
        /* Preview area constrained by the chosen viewport width. */
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
            <ButtonExamples.Variants />
          </Tile>
          <Tile label="Button — ghost-inverse">
            <ButtonExamples.GhostOnFillBackground />
          </Tile>
          <Tile label="Button — sizes">
            <ButtonExamples.Sizes />
          </Tile>
          <Tile label="Button — as link">
            <ButtonExamples.AsLink />
          </Tile>
          <Tile label="Button — loading">
            <ButtonExamples.Loading />
          </Tile>
          <Tile label="Button — disabled">
            <Button disabled>Primary</Button>
            <Button variant="secondary" disabled>
              Secondary
            </Button>
          </Tile>

          <Tile label="Tabs — underline">
            <TabsExamples.Minimal />
          </Tile>
          <Tile label="Tabs — controlled">
            <TabsExamples.Controlled />
          </Tile>
          <Tile label="Tabs — enclosed">
            <TabsExamples.Enclosed />
          </Tile>
          <Tile label="Tabs — disabled tab">
            <TabsExamples.DisabledTab />
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
              <ProgressBar value={30} aria-label="Default bar" />
              <ProgressBar value={65} variant="gradient" aria-label="Gradient bar" />
              <ProgressBar value={90} variant="striped" aria-label="Striped bar" />
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

          <Tile label="Calendar">
            <div className="flex flex-wrap items-start gap-r4">
              <div className="flex flex-col gap-r5">
                <Calendar
                  value={calendarDate}
                  onValueChange={setCalendarDate}
                  min={calMin}
                  max={calMax}
                  weekStartsOn={1}
                />
                <span className="text-body-3 text-fg-muted">
                  Selected:{" "}
                  {calendarDate
                    ? calendarDate.toLocaleDateString("en-GB")
                    : "none"}
                </span>
              </div>
              {/* Second locale + week start (fr-FR, Monday) */}
              <Calendar
                defaultMonth={calMin}
                locale="fr-FR"
                weekStartsOn={1}
              />
            </div>
          </Tile>
          <Tile label="Calendar — Today + disabled weekends">
            <Calendar
              defaultMonth={calMin}
              min={calMin}
              max={calMax}
              isDateDisabled={isWeekend}
              weekStartsOn={1}
              showToday
            />
          </Tile>
          <Tile label="RangeCalendar — 2 months" id="tile-rangecalendar">
            <div className="flex flex-col gap-r5">
              <RangeCalendar
                value={range}
                onValueChange={setRange}
                defaultMonth={calMin}
                weekStartsOn={1}
              />
              <span className="text-body-3 text-fg-muted">
                Range:{" "}
                {range.start ? range.start.toLocaleDateString("en-GB") : "—"}
                {" → "}
                {range.end ? range.end.toLocaleDateString("en-GB") : "—"}
              </span>
            </div>
          </Tile>

          <Tile label="CodeBlock">
            <div className="flex w-full max-w-2xl flex-col gap-r4">
              <CodeBlock
                code={SAMPLE_CODE}
                filename="App.tsx"
                language="TypeScript"
                showLineNumbers
              />
              <CodeBlock code={`bun add @batthewz/response-ui-react-components`} language="bash" />
            </div>
          </Tile>

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

          <Tile label="Wizard (drives Stepper)">
            <div className="w-full min-w-80 max-w-xl">
              <Wizard steps={WIZARD_STEPS} />
            </div>
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
          <Tile label="MediaCard — orientations">
            <div className="flex flex-wrap items-start gap-r4">
              {(["portrait", "landscape", "square"] as const).map((o) => (
                <div key={o} className="w-44">
                  <MediaCard orientation={o}>
                    <MediaCard.Image
                      src={`https://picsum.photos/seed/${o}/600/600`}
                      alt={`${o} sample`}
                    />
                    <MediaCard.Overlay />
                    <MediaCard.Content>
                      <span className="text-body-1 font-semibold capitalize">{o}</span>
                      <span className="text-body-3">aspect-ratio token</span>
                    </MediaCard.Content>
                  </MediaCard>
                </div>
              ))}
            </div>
          </Tile>
          <Tile label="Carousel">
            <div className="w-full min-w-0 max-w-2xl">
              <Carousel title="Featured">
                <Carousel.Track>
                  {Array.from({ length: 8 }, (_, i) => (
                    <Carousel.Item key={i} style={{ width: "12rem" }}>
                      <Card className="flex h-32 items-center justify-center">
                        <span className="text-h4">{i + 1}</span>
                      </Card>
                    </Carousel.Item>
                  ))}
                </Carousel.Track>
              </Carousel>
            </div>
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
          <Tile label="SearchInput" id="tile-search">
            <div className="flex w-[18rem] flex-col gap-r4">
              <SearchInput value={search} onChange={setSearch} placeholder="Search…" />
              <SearchInput
                size="sm"
                value={search}
                onChange={setSearch}
                placeholder="Search (sm)…"
              />
            </div>
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

          <Tile label="Combobox">
            <div className="flex w-64 flex-col gap-r4">
              <Combobox
                value={fruit}
                onValueChange={setFruit}
                onInputValueChange={setFruitQuery}
              >
                <Combobox.Input placeholder="Search fruit…" aria-label="Fruit" />
                <Combobox.Content>
                  {filteredFruits.length === 0 ? (
                    <Combobox.Empty>No fruit found</Combobox.Empty>
                  ) : (
                    filteredFruits.map((f, index) => (
                      <Combobox.Item key={f.value} index={index} value={f.value}>
                        {f.label}
                      </Combobox.Item>
                    ))
                  )}
                </Combobox.Content>
              </Combobox>
              <span className="text-body-3 text-fg-muted">
                Selected: {fruit ?? "none"}
              </span>
            </div>
          </Tile>
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
              <VolumeSliderDemo />
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
          <Tile label="DatePicker — clearable, long format">
            <div className="flex w-[18rem] flex-col gap-r4">
              <DatePicker
                value={pickerDate}
                onValueChange={setPickerDate}
                min={calMin}
                max={calMax}
                clearable
                formatOptions={{ year: "numeric", month: "long", day: "numeric" }}
                placeholder="Pick a date"
                aria-label="Appointment date"
              />
              <DatePicker error placeholder="Error state" aria-label="Errored date" />
              <DatePicker disabled placeholder="Disabled" aria-label="Disabled date" />
            </div>
          </Tile>
          <Tile label="DateRangePicker" id="tile-daterangepicker">
            <div className="flex w-[22rem] flex-col gap-r4">
              <DateRangePicker
                value={pickerRange}
                onValueChange={setPickerRange}
                defaultMonth={calMin}
                min={calMin}
                max={calMax}
                startPlaceholder="Start"
                endPlaceholder="End"
              />
              <span className="text-body-3 text-fg-muted">
                {pickerRange.start ? pickerRange.start.toLocaleDateString("en-GB") : "—"}
                {" → "}
                {pickerRange.end ? pickerRange.end.toLocaleDateString("en-GB") : "—"}
              </span>
            </div>
          </Tile>

          <Tile label="MultiSelect">
            <div className="flex w-72 flex-col gap-r4">
              <MultiSelect
                options={SKILL_OPTIONS}
                value={skills}
                onValueChange={setSkills}
                placeholder="Add skills…"
                aria-label="Skills"
              />
              <span className="text-body-3 text-fg-muted">
                Selected: {skills.length ? skills.join(", ") : "none"}
              </span>
              <MultiSelect
                options={SKILL_OPTIONS}
                defaultValue={["css"]}
                searchable={false}
                maxItems={3}
                placeholder="Pick up to 3 (no search)"
                aria-label="Skills capped"
              />
            </div>
          </Tile>

          <Tile label="RangeSlider">
            <div className="flex w-64 flex-col gap-r4">
              <PriceRangeDemo />
              <RangeSlider defaultValue={[30, 80]} disabled minLabel="Min" maxLabel="Max" />
            </div>
          </Tile>

          <Tile label="ColorPicker">
            <div className="flex flex-col gap-r4">
              <ColorPicker
                value={brandColor}
                onValueChange={setBrandColor}
                presets={COLOR_PRESETS}
                aria-label="Brand color"
              />
              <span className="text-body-3 text-fg-muted">Value: {brandColor}</span>
            </div>
          </Tile>

          <Tile label="Repeater (over useFieldArray)">
            <div className="w-[24rem] max-w-full">
              <RepeaterDemo />
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
                icon={<GitCommit />}
                actor="Grace"
                action="pushed to"
                target="main"
                timestamp="1h ago"
              />
              <ActivityFeed.Item
                icon={<UserPlus />}
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

          <div className="w-full">
            <p className="mb-r4 text-body-3 text-fg-muted">
              DataTable — expandable rows (controlled) + selection. Toggle the
              chevrons to reveal a detail panel beneath each row.
            </p>
            <DataTable<Person>
              data={PEOPLE}
              columns={COLUMNS}
              rowKey={(r) => r.id}
              expandedKeys={expandedRows}
              onExpandedChange={setExpandedRows}
              renderExpanded={(r) => (
                <div className="flex flex-col gap-r6 px-r5 py-r5">
                  <span className="text-body-3 font-semibold uppercase tracking-wide text-fg-muted">
                    Details — {r.name}
                  </span>
                  <span className="text-body-2 text-fg-secondary">
                    {r.name} is a {r.role.toLowerCase()} with {r.visits} recorded
                    visits. Expanded content can hold any node — forms, charts,
                    nested tables.
                  </span>
                </div>
              )}
            />
          </div>

          <div className="w-full">
            <p className="mb-r4 text-body-3 text-fg-muted">
              VirtualizedDataTable — 10,000 rows, only a small window in the DOM.
            </p>
            <VirtualizedDataTable<Person>
              data={BIG_PEOPLE}
              columns={COLUMNS}
              rowKey={(r) => r.id}
              defaultSort={{ key: "name", direction: "asc" }}
              rowHeight={44}
              height={480}
              selectable
              selectedKeys={virtualSelection}
              onSelectionChange={setVirtualSelection}
            />
          </div>

          <Tile label="Pagination — standalone">
            <div className="flex flex-col gap-r5">
              <div className="flex flex-col gap-r6">
                <span className="text-body-3 text-fg-muted">
                  Full (controlled) — page {fullPage} of 12. Constant width:
                  clicking next never shifts the layout. No edge chevrons by
                  default (page 1 / 12 are always shown).
                </span>
                <Pagination
                  page={fullPage}
                  totalPages={12}
                  onPageChange={setFullPage}
                />
              </div>

              <div className="flex flex-col gap-r6">
                <span className="text-body-3 text-fg-muted">
                  Full — opt-in first/last chevrons (showEdges), wider sibling
                  window (siblingCount=2).
                </span>
                <Pagination
                  page={edgesPage}
                  totalPages={12}
                  onPageChange={setEdgesPage}
                  showEdges
                  siblingCount={2}
                />
              </div>

              <div className="flex flex-col gap-r6">
                <span className="text-body-3 text-fg-muted">
                  Compact — "Page X of Y" with prev/next and first/last (edges
                  default on here, since there are no numbers to jump to).
                </span>
                <Pagination
                  variant="compact"
                  page={compactPage}
                  totalPages={8}
                  onPageChange={setCompactPage}
                />
              </div>

              <div className="flex flex-col gap-r6">
                <span className="text-body-3 text-fg-muted">
                  Responsive — collapses to compact below 40rem
                  (compactBelow="40rem"). Narrow the window to see it switch.
                </span>
                <Pagination
                  page={responsivePage}
                  totalPages={12}
                  onPageChange={setResponsivePage}
                  compactBelow="40rem"
                />
              </div>
            </div>
          </Tile>

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
      )}
    </div>
  );
}
