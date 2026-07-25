import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renders with correct text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("bg-status-error");
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);

    await user.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders as disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("does not fire click when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );

    await user.click(screen.getByRole("button", { name: "Disabled" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards className prop", () => {
    render(<Button className="custom-class">Styled</Button>);
    const button = screen.getByRole("button", { name: "Styled" });
    expect(button.className).toContain("custom-class");
  });

  it("applies size classes", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button", { name: "Large" });
    expect(button.className).toContain("text-body-1");
  });

  it.each([
    ["sm", "gap-[var(--BUTTON-GAP-SM)]"],
    ["md", "gap-[var(--BUTTON-GAP-MD)]"],
    ["lg", "gap-[var(--BUTTON-GAP-LG)]"],
  ] as const)("size %s carries its own icon/label gap", (size, expected) => {
    render(<Button size={size}>Label</Button>);
    expect(screen.getByRole("button", { name: "Label" }).className).toContain(expected);
  });

  it("lets a caller override the gap", () => {
    render(<Button className="gap-r5">Label</Button>);
    const className = screen.getByRole("button", { name: "Label" }).className;
    expect(className).toContain("gap-r5");
    expect(className).not.toContain("--BUTTON-GAP-MD");
  });

  it.each([
    ["ghost", "hover:bg-fg-secondary/10"],
    ["ghost-inverse", "hover:bg-fg-on-primary/15"],
  ] as const)("%s derives its hover wash from its own ink token", (variant, expected) => {
    render(<Button variant={variant}>Label</Button>);
    expect(screen.getByRole("button", { name: "Label" }).className).toContain(expected);
  });

  it("does not submit an enclosing form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Button>Cancel</Button>
      </form>
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  it("still allows an explicit submit type", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not put a type on a non-button element", () => {
    render(<Button as="a" href="/x">Link</Button>);
    expect(screen.getByRole("link", { name: "Link" })).not.toHaveAttribute("type");
  });
});
