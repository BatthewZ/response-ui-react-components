import { describe, expect, it } from "vitest";

import { createFormStore } from "./form-store";
import type { StandardSchemaV1 } from "./standard-schema";

type Values = { email: string; age: number };

/** Hand-rolled Standard Schema validator: required email + numeric coercion for age. */
const schema: StandardSchemaV1<unknown, Values> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate(value) {
      const input = value as { email?: unknown; age?: unknown };
      const issues: { message: string; path: string[] }[] = [];
      if (!input.email) {
        issues.push({ message: "Email is required", path: ["email"] });
      } else if (!String(input.email).includes("@")) {
        issues.push({ message: "Invalid email", path: ["email"] });
      }
      const age = Number(input.age);
      if (Number.isNaN(age)) {
        issues.push({ message: "Age must be a number", path: ["age"] });
      }
      if (issues.length > 0) return { issues };
      return { value: { email: String(input.email), age } };
    },
  },
};

const makeStore = (mode: "onSubmit" | "onChange" = "onSubmit") =>
  createFormStore<Values>({ defaultValues: { email: "", age: 0 }, schema, mode });

describe("FormStore values", () => {
  it("reads default values", () => {
    const store = makeStore();
    expect(store.getValues()).toEqual({ email: "", age: 0 });
    expect(store.getValue("email")).toBe("");
  });

  it("sets a value immutably and notifies subscribers", () => {
    const store = makeStore();
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });
    const before = store.getValues();
    store.setValue("email", "a@b.c");
    expect(store.getValue("email")).toBe("a@b.c");
    expect(store.getValues()).not.toBe(before);
    expect(notified).toBe(1);
  });

  it("bumps the version on every change", () => {
    const store = makeStore();
    const v0 = store.getVersion();
    store.setValue("email", "x");
    expect(store.getVersion()).toBeGreaterThan(v0);
  });
});

describe("FormStore validation + error surfacing", () => {
  it("does not surface schema errors for untouched, pristine fields", async () => {
    const store = makeStore();
    await store.validate();
    expect(store.getFieldSnapshot("email").error).toBeUndefined();
  });

  it("surfaces errors for all fields after submit", async () => {
    const store = makeStore();
    const { valid } = await store.submit();
    expect(valid).toBe(false);
    expect(store.getFieldSnapshot("email").error).toBe("Email is required");
    expect(store.getErrors()).toEqual({ email: ["Email is required"] });
  });

  it("surfaces a field error once the field is dirty (onChange mode)", async () => {
    const store = makeStore("onChange");
    store.setValue("email", "nope");
    await store.validate();
    expect(store.getFieldSnapshot("email").error).toBe("Invalid email");
  });

  it("surfaces a field error once the field is touched", async () => {
    const store = makeStore();
    store.setTouched("email");
    await store.validate();
    expect(store.getFieldSnapshot("email").error).toBe("Email is required");
  });

  it("returns the coerced output on a valid submit", async () => {
    const store = createFormStore<Values>({
      defaultValues: { email: "a@b.c", age: 0 },
      schema,
    });
    store.setValue("age", "42");
    const { valid, output } = await store.submit();
    expect(valid).toBe(true);
    // Age coerced from string to number by the schema.
    expect(output).toEqual({ email: "a@b.c", age: 42 });
  });

  it("tracks isValidating across an async schema", async () => {
    const asyncSchema: StandardSchemaV1<unknown, Values> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async () => ({ value: { email: "a@b.c", age: 1 } }),
      },
    };
    const store = createFormStore<Values>({
      defaultValues: { email: "", age: 0 },
      schema: asyncSchema,
    });
    const pending = store.validate();
    expect(store.getFormState().isValidating).toBe(true);
    await pending;
    expect(store.getFormState().isValidating).toBe(false);
  });
});

describe("FormStore manual errors", () => {
  it("sets and surfaces a manual error immediately", () => {
    const store = makeStore();
    store.setError("email", "Already taken");
    expect(store.getFieldSnapshot("email").error).toBe("Already taken");
    expect(store.getFormState().isValid).toBe(false);
  });

  it("clears a manual error when the field value changes", () => {
    const store = makeStore();
    store.setError("email", "Already taken");
    store.setValue("email", "new@b.c");
    expect(store.getFieldSnapshot("email").error).toBeUndefined();
  });

  it("clears errors by name and globally", () => {
    const store = makeStore();
    store.setError("email", "x");
    store.setError("age", "y");
    store.clearErrors("email");
    expect(store.getFieldSnapshot("email").error).toBeUndefined();
    expect(store.getFieldSnapshot("age").error).toBe("y");
    store.clearErrors();
    expect(store.getFieldSnapshot("age").error).toBeUndefined();
  });
});

describe("FormStore reset + lifecycle flags", () => {
  it("resets values, errors, touched and submit count", async () => {
    const store = makeStore();
    store.setValue("email", "a@b.c");
    store.setTouched("email");
    await store.submit();
    store.reset();
    expect(store.getValues()).toEqual({ email: "", age: 0 });
    expect(store.getFieldSnapshot("email").touched).toBe(false);
    expect(store.getFormState().submitCount).toBe(0);
    expect(store.getFormState().isSubmitted).toBe(false);
  });

  it("adopts new defaults when reset with values", () => {
    const store = makeStore();
    store.reset({ email: "seed@b.c", age: 7 });
    expect(store.getValues()).toEqual({ email: "seed@b.c", age: 7 });
    store.resetField("email");
    expect(store.getValue("email")).toBe("seed@b.c");
  });

  it("reports isDirty when values diverge from defaults", () => {
    const store = makeStore();
    expect(store.getFormState().isDirty).toBe(false);
    store.setValue("email", "x");
    expect(store.getFormState().isDirty).toBe(true);
  });
});

describe("FormStore field arrays", () => {
  type ArrayValues = { items: string[] };
  const arrayStore = () =>
    createFormStore<ArrayValues>({ defaultValues: { items: ["a", "b"] } });

  it("appends and assigns a fresh stable id", () => {
    const store = arrayStore();
    const idsBefore = store.getArrayIds("items");
    store.arrayAppend("items", "c");
    expect(store.getValue("items")).toEqual(["a", "b", "c"]);
    const idsAfter = store.getArrayIds("items");
    expect(idsAfter.slice(0, 2)).toEqual(idsBefore);
    expect(idsAfter[2]).not.toEqual(idsAfter[0]);
  });

  it("removes an item and its id together", () => {
    const store = arrayStore();
    const [id0, id1] = store.getArrayIds("items");
    store.arrayRemove("items", 0);
    expect(store.getValue("items")).toEqual(["b"]);
    expect(store.getArrayIds("items")).toEqual([id1]);
    expect(id0).not.toBe(id1);
  });

  it("keeps ids attached to their items across a move", () => {
    const store = arrayStore();
    const [id0, id1] = store.getArrayIds("items");
    store.arrayMove("items", 0, 1);
    expect(store.getValue("items")).toEqual(["b", "a"]);
    expect(store.getArrayIds("items")).toEqual([id1, id0]);
  });

  it("swaps items and ids", () => {
    const store = arrayStore();
    const [id0, id1] = store.getArrayIds("items");
    store.arraySwap("items", 0, 1);
    expect(store.getValue("items")).toEqual(["b", "a"]);
    expect(store.getArrayIds("items")).toEqual([id1, id0]);
  });

  it("inserts at an index with a new id", () => {
    const store = arrayStore();
    store.arrayInsert("items", 1, "x");
    expect(store.getValue("items")).toEqual(["a", "x", "b"]);
    expect(store.getArrayIds("items")).toHaveLength(3);
  });

  it("updates an item in place without changing length", () => {
    const store = arrayStore();
    const ids = store.getArrayIds("items");
    store.arrayUpdate("items", 1, "B");
    expect(store.getValue("items")).toEqual(["a", "B"]);
    expect(store.getArrayIds("items")).toEqual(ids);
  });
});

describe("FormStore field arrays — error/touched re-keying", () => {
  type Row = { email: string };
  type RowValues = { people: Row[]; note: string };

  /** Flags every row whose email lacks an `@`, keyed `people.<i>.email`. */
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

  const rowStore = (...emails: string[]) =>
    createFormStore<RowValues>({
      defaultValues: { people: emails.map((email) => ({ email })), note: "" },
      schema: rowSchema,
    });

  const emailsOf = (store: ReturnType<typeof rowStore>) =>
    (store.getValue("people") as Row[]).map((row) => row.email);

  it("carries a later row's error down when the middle row is removed", async () => {
    const store = rowStore("a@ok.com", "b@ok.com", "bad");
    await store.submit();
    expect(store.getFieldSnapshot("people.2.email").error).toBe("Email is invalid");

    store.arrayRemove("people", 1);

    expect(emailsOf(store)).toEqual(["a@ok.com", "bad"]);
    expect(store.getFieldSnapshot("people.0.email").error).toBeUndefined();
    expect(store.getFieldSnapshot("people.1.email").error).toBe("Email is invalid");
    expect(store.getErrors()).toEqual({ "people.1.email": ["Email is invalid"] });
  });

  it("drops the removed row's error instead of stranding it on its successor", async () => {
    const store = rowStore("a@ok.com", "bad", "c@ok.com");
    await store.submit();
    expect(store.getFieldSnapshot("people.1.email").error).toBe("Email is invalid");

    store.arrayRemove("people", 1);

    expect(emailsOf(store)).toEqual(["a@ok.com", "c@ok.com"]);
    expect(store.getFieldSnapshot("people.0.email").error).toBeUndefined();
    expect(store.getFieldSnapshot("people.1.email").error).toBeUndefined();
    expect(store.getErrors()).toEqual({});
  });

  it("follows the middle row's error through a move", async () => {
    const store = rowStore("a@ok.com", "bad", "c@ok.com");
    await store.submit();

    store.arrayMove("people", 1, 2);

    expect(emailsOf(store)).toEqual(["a@ok.com", "c@ok.com", "bad"]);
    expect(store.getFieldSnapshot("people.1.email").error).toBeUndefined();
    expect(store.getFieldSnapshot("people.2.email").error).toBe("Email is invalid");
  });

  it("follows the middle row's error through a swap", async () => {
    const store = rowStore("a@ok.com", "bad", "c@ok.com");
    await store.submit();

    store.arraySwap("people", 1, 2);

    expect(emailsOf(store)).toEqual(["a@ok.com", "c@ok.com", "bad"]);
    expect(store.getFieldSnapshot("people.1.email").error).toBeUndefined();
    expect(store.getFieldSnapshot("people.2.email").error).toBe("Email is invalid");
  });

  it("shifts a manual error up when a row is inserted above it", () => {
    const store = rowStore("a@ok.com", "b@ok.com", "c@ok.com");
    store.setError("people.1.email", "Already taken");

    store.arrayInsert("people", 1, { email: "x@ok.com" });

    expect(emailsOf(store)).toEqual(["a@ok.com", "x@ok.com", "b@ok.com", "c@ok.com"]);
    expect(store.getFieldSnapshot("people.1.email").error).toBeUndefined();
    expect(store.getFieldSnapshot("people.2.email").error).toBe("Already taken");
  });

  it("shifts a manual error up on prepend", () => {
    const store = rowStore("a@ok.com", "b@ok.com", "c@ok.com");
    store.setError("people.2.email", "Already taken");

    store.arrayPrepend("people", { email: "z@ok.com" });

    expect(store.getFieldSnapshot("people.2.email").error).toBeUndefined();
    expect(store.getFieldSnapshot("people.3.email").error).toBe("Already taken");
  });

  it("moves touched with the row, not with the index", () => {
    const store = rowStore("a@ok.com", "b@ok.com", "c@ok.com");
    store.setTouched("people.2.email");

    store.arrayRemove("people", 1);

    expect(store.getFieldSnapshot("people.1.email").touched).toBe(true);
    expect(store.getFieldSnapshot("people.2.email").touched).toBe(false);
  });

  it("clears the array's stale error state on replace", () => {
    const store = rowStore("a@ok.com", "b@ok.com", "c@ok.com");
    store.setError("people.0.email", "Already taken");

    store.arrayReplace("people", [{ email: "z@ok.com" }]);

    expect(store.getFieldSnapshot("people.0.email").error).toBeUndefined();
    expect(store.getErrors()).toEqual({});
  });

  it("leaves append and update alone, and never touches non-array keys", async () => {
    const store = rowStore("bad", "b@ok.com");
    await store.submit();
    store.setError("note", "Server said no");

    store.arrayAppend("people", { email: "c@ok.com" });
    expect(store.getFieldSnapshot("people.0.email").error).toBe("Email is invalid");
    expect(store.getFieldSnapshot("note").error).toBe("Server said no");

    store.arrayUpdate("people", 1, { email: "B@ok.com" });
    expect(store.getFieldSnapshot("people.0.email").error).toBe("Email is invalid");
    expect(store.getFieldSnapshot("note").error).toBe("Server said no");
  });
});

describe("FormStore field arrays — key collisions", () => {
  type ArrayValues = { items: string[] };

  it("lets a moved row win an index a stale out-of-range key already holds", () => {
    const store = createFormStore<ArrayValues>({ defaultValues: { items: ["a", "b"] } });
    store.setError("items.1", "Row error");
    // Out of range for a two-item array — only reachable by an imperative
    // setError, but it must not shadow the row that prepend shifts into index 2.
    store.setError("items.2", "Stale error");

    store.arrayPrepend("items", "z");

    expect(store.getValue("items")).toEqual(["z", "a", "b"]);
    expect(store.getFieldSnapshot("items.2").error).toBe("Row error");
  });
});
