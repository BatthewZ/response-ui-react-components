import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Field } from "./Field";
import { Input } from "./Input";
import { Repeater } from "./Repeater";
import { useForm } from "./use-form";

type Values = { links: { url: string }[] };

function Harness({
  initial = [{ url: "a" }],
  min,
  max,
  reorderable,
  disabled,
}: {
  initial?: { url: string }[];
  min?: number;
  max?: number;
  reorderable?: boolean;
  disabled?: boolean;
}) {
  const form = useForm<Values>({ defaultValues: { links: initial } });
  return (
    <Repeater
      form={form}
      name="links"
      defaultItem={() => ({ url: "" })}
      addLabel="Add link"
      min={min}
      max={max}
      reorderable={reorderable}
      disabled={disabled}
    >
      {({ name, index }) => (
        <Field name={`${name}.url`}>
          <Input aria-label={`url-${index}`} {...form.field(`${name}.url`)} />
        </Field>
      )}
    </Repeater>
  );
}

describe("Repeater", () => {
  it("renders one row per array entry", () => {
    render(<Harness initial={[{ url: "a" }, { url: "b" }]} />);
    expect((screen.getByLabelText("url-0") as HTMLInputElement).value).toBe("a");
    expect((screen.getByLabelText("url-1") as HTMLInputElement).value).toBe("b");
  });

  it("appends a new row with the default item", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ url: "a" }]} />);
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(screen.getByLabelText("url-1")).toBeInTheDocument();
    expect((screen.getByLabelText("url-1") as HTMLInputElement).value).toBe("");
  });

  it("removes a row", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ url: "a" }, { url: "b" }]} />);
    await user.click(screen.getByRole("button", { name: "Remove item 1" }));
    // Row 'a' is gone; 'b' shifts up to index 0.
    expect((screen.getByLabelText("url-0") as HTMLInputElement).value).toBe("b");
    expect(screen.queryByLabelText("url-1")).not.toBeInTheDocument();
  });

  it("blocks removal below min", () => {
    render(<Harness initial={[{ url: "a" }]} min={1} />);
    expect(screen.getByRole("button", { name: "Remove item 1" })).toBeDisabled();
  });

  it("blocks adding beyond max", () => {
    render(<Harness initial={[{ url: "a" }, { url: "b" }]} max={2} />);
    expect(screen.getByRole("button", { name: "Add link" })).toBeDisabled();
  });

  it("reorders rows with the move controls", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ url: "a" }, { url: "b" }]} reorderable />);
    // Move the second row up.
    await user.click(screen.getByRole("button", { name: "Move item 2 up" }));
    expect((screen.getByLabelText("url-0") as HTMLInputElement).value).toBe("b");
    expect((screen.getByLabelText("url-1") as HTMLInputElement).value).toBe("a");
  });

  it("disables move-up on the first row and move-down on the last", () => {
    render(<Harness initial={[{ url: "a" }, { url: "b" }]} reorderable />);
    expect(screen.getByRole("button", { name: "Move item 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move item 2 down" })).toBeDisabled();
  });

  describe("focus after removing a row (#257)", () => {
    it("moves to the next row's Remove button", async () => {
      const user = userEvent.setup();
      render(<Harness initial={[{ url: "a" }, { url: "b" }, { url: "c" }]} />);

      await user.click(screen.getByRole("button", { name: "Remove item 1" }));

      expect(document.activeElement).not.toBe(document.body);
      // The row that shifted into position 1 owns the tab stop now.
      expect(screen.getByRole("button", { name: "Remove item 1" })).toHaveFocus();
    });

    it("falls back to Add when the last row goes", async () => {
      const user = userEvent.setup();
      render(<Harness initial={[{ url: "a" }]} />);

      await user.click(screen.getByRole("button", { name: "Remove item 1" }));

      expect(screen.getByRole("button", { name: "Add link" })).toHaveFocus();
    });
  });

  describe("disabled reaches the row fields (#258)", () => {
    it("disables the fields the render prop owns", () => {
      render(<Harness initial={[{ url: "a" }]} disabled />);

      expect(screen.getByLabelText("url-0")).toBeDisabled();
    });

    it("hands `disabled` to the render prop for non-native controls", () => {
      const seen: boolean[] = [];
      function Probe() {
        const form = useForm<Values>({ defaultValues: { links: [{ url: "a" }] } });
        return (
          <Repeater
            form={form}
            name="links"
            defaultItem={() => ({ url: "" })}
            disabled
          >
            {({ disabled }) => {
              seen.push(disabled);
              return null;
            }}
          </Repeater>
        );
      }
      render(<Probe />);

      expect(seen).toContain(true);
    });
  });

  describe("per-row control names (#259)", () => {
    it("names each row's Remove button for its own row", () => {
      render(<Harness initial={[{ url: "a" }, { url: "b" }]} />);

      expect(screen.getByRole("button", { name: "Remove item 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove item 2" })).toBeInTheDocument();
    });

    it("routes the names through props so they can be translated", () => {
      function Probe() {
        const form = useForm<Values>({ defaultValues: { links: [{ url: "a" }] } });
        return (
          <Repeater
            form={form}
            name="links"
            defaultItem={() => ({ url: "" })}
            reorderable
            removeLabel={(i) => `Supprimer la ligne ${i + 1}`}
            moveUpLabel={(i) => `Monter la ligne ${i + 1}`}
            moveDownLabel={(i) => `Descendre la ligne ${i + 1}`}
          >
            {() => null}
          </Repeater>
        );
      }
      render(<Probe />);

      expect(
        screen.getByRole("button", { name: "Supprimer la ligne 1" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Monter la ligne 1" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Descendre la ligne 1" }),
      ).toBeInTheDocument();
    });
  });

  describe("row semantics (#262)", () => {
    it("exposes the rows as a list", () => {
      render(<Harness initial={[{ url: "a" }, { url: "b" }]} />);

      const list = screen.getByRole("list");
      expect(within(list).getAllByRole("listitem")).toHaveLength(2);
      // The Add button is not a row.
      expect(
        within(list).queryByRole("button", { name: "Add link" }),
      ).not.toBeInTheDocument();
    });
  });
});
