import { describe, expect, it } from "vitest";

import { getPath, setPath } from "./form-path";

describe("getPath", () => {
  it("reads a top-level key", () => {
    expect(getPath({ email: "a@b.c" }, "email")).toBe("a@b.c");
  });

  it("reads a nested path", () => {
    expect(getPath({ user: { name: "Ada" } }, "user.name")).toBe("Ada");
  });

  it("reads an array index path", () => {
    expect(getPath({ items: [{ qty: 2 }] }, "items.0.qty")).toBe(2);
  });

  it("returns undefined for a missing branch instead of throwing", () => {
    expect(getPath({ user: null }, "user.name")).toBeUndefined();
    expect(getPath({}, "a.b.c")).toBeUndefined();
  });

  it("returns the source when name is empty", () => {
    const source = { a: 1 };
    expect(getPath(source, "")).toBe(source);
  });
});

describe("setPath", () => {
  it("writes a top-level key immutably", () => {
    const source = { email: "" };
    const next = setPath(source, "email", "a@b.c");
    expect(next).toEqual({ email: "a@b.c" });
    expect(source.email).toBe("");
    expect(next).not.toBe(source);
  });

  it("writes a nested path and clones only the touched branch", () => {
    const source = { user: { name: "Ada" }, meta: { tag: "x" } };
    const next = setPath(source, "user.name", "Bob");
    expect(next.user.name).toBe("Bob");
    expect(source.user.name).toBe("Ada");
    // Untouched sibling branch keeps its identity.
    expect(next.meta).toBe(source.meta);
  });

  it("preserves arrays when writing an index path", () => {
    const source = { items: [{ qty: 1 }, { qty: 2 }] };
    const next = setPath(source, "items.0.qty", 9);
    expect(Array.isArray(next.items)).toBe(true);
    expect(next.items[0].qty).toBe(9);
    expect(next.items[1]).toBe(source.items[1]);
  });

  it("materialises an array for a numeric segment on a missing branch", () => {
    const next = setPath<{ items?: unknown[] }>({}, "items.0", "first");
    expect(Array.isArray(next.items)).toBe(true);
    expect(next.items?.[0]).toBe("first");
  });

  it("returns the value directly when name is empty", () => {
    expect(setPath({ a: 1 }, "", { b: 2 })).toEqual({ b: 2 });
  });
});
