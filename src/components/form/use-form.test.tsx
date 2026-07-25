import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Input } from "./Input";
import { Label } from "./Label";
import type { StandardSchemaV1 } from "./standard-schema";
import {
  FormProvider,
  useFieldArray,
  useFieldState,
  useForm,
  useFormState,
} from "./use-form";

type Values = { email: string };

const schema: StandardSchemaV1<unknown, Values> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate(value) {
      const input = value as { email?: unknown };
      if (!input.email) {
        return { issues: [{ message: "Email is required", path: ["email"] }] };
      }
      if (!String(input.email).includes("@")) {
        return { issues: [{ message: "Invalid email", path: ["email"] }] };
      }
      return { value: { email: String(input.email) } };
    },
  },
};

describe("useForm — values + watch", () => {
  it("seeds default values and reads them via watch/getValues", () => {
    const { result } = renderHook(() =>
      useForm<Values>({ defaultValues: { email: "seed@b.c" } }),
    );
    expect(result.current.watch("email")).toBe("seed@b.c");
    expect(result.current.getValues()).toEqual({ email: "seed@b.c" });
  });

  it("updates a value via setValue", () => {
    const { result } = renderHook(() =>
      useForm<Values>({ defaultValues: { email: "" } }),
    );
    act(() => result.current.setValue("email", "a@b.c"));
    expect(result.current.watch("email")).toBe("a@b.c");
  });

  it("field() raw-value onChange updates the value (controlled-component path)", () => {
    const { result } = renderHook(() =>
      useForm<Values>({ defaultValues: { email: "" } }),
    );
    act(() => result.current.field("email").onChange("typed"));
    expect(result.current.watch("email")).toBe("typed");
  });
});

describe("useForm — validation lifecycle", () => {
  it("blocks submit, reports errors, and skips onSubmit when invalid", async () => {
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();
    const { result } = renderHook(() =>
      useForm<Values>({ schema, defaultValues: { email: "" }, onSubmit, onInvalid }),
    );
    await act(async () => {
      await result.current.handleSubmit()();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onInvalid).toHaveBeenCalledWith({ email: ["Email is required"] });
    expect(result.current.formState.isSubmitted).toBe(true);
    expect(result.current.formState.isValid).toBe(false);
  });

  it("calls onSubmit with coerced values when valid", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm<Values>({ schema, defaultValues: { email: "a@b.c" }, onSubmit }),
    );
    await act(async () => {
      await result.current.handleSubmit()();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: "a@b.c" });
    expect(result.current.formState.isSubmitSuccessful).toBe(true);
  });

  it("trigger() runs validation imperatively", async () => {
    const { result } = renderHook(() =>
      useForm<Values>({ schema, defaultValues: { email: "" } }),
    );
    let valid: boolean | undefined;
    await act(async () => {
      valid = await result.current.trigger();
    });
    expect(valid).toBe(false);
  });

  it("supports server errors via setError and clears them", () => {
    const { result } = renderHook(() =>
      useForm<Values>({ defaultValues: { email: "a@b.c" } }),
    );
    act(() => result.current.setError("email", "Already taken"));
    expect(result.current.store.getFieldSnapshot("email").error).toBe("Already taken");
    act(() => result.current.clearErrors("email"));
    expect(result.current.store.getFieldSnapshot("email").error).toBeUndefined();
  });

  it("reset restores defaults and clears state", async () => {
    const { result } = renderHook(() =>
      useForm<Values>({ schema, defaultValues: { email: "" } }),
    );
    act(() => result.current.setValue("email", "x@y.z"));
    await act(async () => {
      await result.current.handleSubmit()();
    });
    act(() => result.current.reset());
    expect(result.current.watch("email")).toBe("");
    expect(result.current.formState.isSubmitted).toBe(false);
  });
});

describe("useForm — Field/FieldError integration", () => {
  function SignupForm({ onValid }: { onValid: (v: Values) => void }) {
    const form = useForm<Values>({
      schema,
      defaultValues: { email: "" },
      onSubmit: onValid,
    });
    return (
      <FormProvider form={form}>
        <form {...form.props}>
          <Field name="email">
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...form.field("email")} />
            <FieldError />
          </Field>
          <button type="submit">Submit</button>
        </form>
      </FormProvider>
    );
  }

  it("renders the schema error in FieldError and marks the input invalid after submit", async () => {
    const user = userEvent.setup();
    render(<SignupForm onValid={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Email is required");
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.getAttribute("id"));
  });

  it("links and clears as the user types a valid value, then submits", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<SignupForm onValid={onValid} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    // After first submit, re-validation runs on change and the error clears.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Submit" }));
    // Only the second submit is valid — the first must not have leaked through.
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid).toHaveBeenCalledWith(
      { email: "person@example.com" },
      expect.anything(),
    );
  });

  it("focuses the first invalid field after a failed submit", async () => {
    const user = userEvent.setup();
    render(<SignupForm onValid={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByLabelText("Email")).toHaveFocus();
  });
});

describe("useFieldState / useFormState subscriptions", () => {
  it("useFieldState reflects a field's current snapshot", () => {
    const { result: form } = renderHook(() =>
      useForm<Values>({ defaultValues: { email: "" } }),
    );
    const { result: fieldState } = renderHook(() =>
      useFieldState(form.current, "email"),
    );
    expect(fieldState.current.value).toBe("");
    act(() => form.current.setValue("email", "a@b.c"));
    expect(fieldState.current.value).toBe("a@b.c");
  });

  it("useFormState reflects form-level flags", async () => {
    const { result: form } = renderHook(() =>
      useForm<Values>({ schema, defaultValues: { email: "" } }),
    );
    const { result: state } = renderHook(() => useFormState(form.current));
    expect(state.current.isSubmitted).toBe(false);
    await act(async () => {
      await form.current.handleSubmit()();
    });
    expect(state.current.isSubmitted).toBe(true);
  });
});

describe("useFieldArray", () => {
  type ListValues = { tags: string[] };

  it("appends and removes rows with stable keys", () => {
    const { result } = renderHook(() => {
      const form = useForm<ListValues>({ defaultValues: { tags: ["a"] } });
      const array = useFieldArray({ form, name: "tags" });
      return { form, array };
    });

    expect(result.current.array.fields).toHaveLength(1);
    const firstId = result.current.array.fields[0].id;

    act(() => result.current.array.append("b"));
    expect(result.current.form.watch("tags")).toEqual(["a", "b"]);
    // The original row keeps its key.
    expect(result.current.array.fields[0].id).toBe(firstId);

    act(() => result.current.array.remove(0));
    expect(result.current.form.watch("tags")).toEqual(["b"]);
    expect(result.current.array.fields).toHaveLength(1);
  });
});

describe("useFieldArray — errors follow their row", () => {
  type Row = { email: string };
  type RowValues = { people: Row[] };

  const rowSchema: StandardSchemaV1<unknown, RowValues> = {
    "~standard": {
      version: 1,
      vendor: "test",
      validate(value) {
        const input = value as RowValues;
        const issues = (input.people ?? []).flatMap((row, index) =>
          String(row?.email ?? "").includes("@")
            ? []
            : [{ message: "Email is invalid", path: ["people", index, "email"] }],
        );
        return issues.length > 0 ? { issues } : { value: input };
      },
    },
  };

  function PeopleForm() {
    const form = useForm<RowValues>({
      schema: rowSchema,
      defaultValues: {
        people: [{ email: "a@ok.com" }, { email: "bad" }, { email: "c@ok.com" }],
      },
      shouldFocusError: false,
    });
    const array = useFieldArray({ form, name: "people" });
    return (
      <FormProvider form={form}>
        <form {...form.props}>
          {array.fields.map((row, index) => (
            <div key={row.id}>
              <Input {...form.field(`${row.name}.email`)} />
              <button type="button" onClick={() => array.remove(index)}>
                {`Remove ${index}`}
              </button>
            </div>
          ))}
          <button type="submit">Submit</button>
        </form>
      </FormProvider>
    );
  }

  /** `[value, aria-invalid]` per rendered row, in document order. */
  const rows = () =>
    screen
      .getAllByRole("textbox")
      .map((el) => [(el as HTMLInputElement).value, el.getAttribute("aria-invalid")]);

  it("keeps aria-invalid on the invalid row after the middle row is removed", async () => {
    const user = userEvent.setup();
    render(<PeopleForm />);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(rows()).toEqual([
      ["a@ok.com", null],
      ["bad", "true"],
      ["c@ok.com", null],
    ]);

    // Remove the middle row — the invalid one. Nothing should be flagged after.
    await user.click(screen.getByRole("button", { name: "Remove 1" }));
    expect(rows()).toEqual([
      ["a@ok.com", null],
      ["c@ok.com", null],
    ]);
  });

  it("moves aria-invalid down when a valid row above the invalid one is removed", async () => {
    const user = userEvent.setup();
    render(<PeopleForm />);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    // Remove row 0 (valid) — the invalid row slides from index 1 to index 0.
    await user.click(screen.getByRole("button", { name: "Remove 0" }));
    expect(rows()).toEqual([
      ["bad", "true"],
      ["c@ok.com", null],
    ]);
  });
});
