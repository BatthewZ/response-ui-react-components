import { useState } from "react";

import {
  Alert,
  Button,
  ColorPicker,
  Field,
  FieldError,
  type FormApi,
  FormActions,
  FormProvider,
  Input,
  Label,
  MultiSelect,
  RangeSlider,
  type RangeSliderValue,
  Repeater,
  Select,
  type StandardSchemaV1,
  TagInput,
  Wizard,
  type WizardStep,
  useFieldArray,
  useFieldState,
  useForm,
} from "../src";
import { COLOR_PRESETS, SKILL_OPTIONS } from "./sample-data";

/**
 * The "Forms" tab — the headless `useForm` exercised end to end: a sign-up form
 * that binds every controlled input the library ships, and a Wizard whose steps
 * host fields from one form.
 */
export function FormsTab() {
  return (
    <div className="flex flex-col gap-r2 pb-r2">
      <SignUpFormDemo />
      <WizardFormDemo />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sign-up form — exercises the headless useForm                      */
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

function SignUpFormDemo() {
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
/*  Wizard + useForm demo                                              */
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
