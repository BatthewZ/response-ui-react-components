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

  // NOTE for every test below: jsdom announces nothing. These assert the DOM
  // precondition — one live region with the right carrier attributes, and the
  // text that lands in it. Removing a row also moves focus (#257), and whether a
  // screen reader reads the focused control's name before, after, or instead of
  // a polite region write is not settleable in this environment.
  describe("add/remove announcements (#262)", () => {
    const region = () => screen.getByRole("status");

    it("mounts exactly one polite, visually-hidden region, empty, before anything happens", () => {
      render(<Harness initial={[{ url: "a" }]} />);

      const regions = screen.getAllByRole("status");
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveAttribute("aria-live", "polite");
      expect(regions[0]).toHaveClass("sr-only");
      expect(regions[0]).toHaveTextContent("");
      // The region is not a row.
      expect(within(screen.getByRole("list")).queryByRole("status")).not.toBeInTheDocument();
    });

    it("announces an added row", async () => {
      const user = userEvent.setup();
      render(<Harness initial={[{ url: "a" }]} />);

      await user.click(screen.getByRole("button", { name: "Add link" }));

      expect(region()).toHaveTextContent("Added item 2. 2 items.");
    });

    it("announces a removed row, with the count after the removal", async () => {
      const user = userEvent.setup();
      render(<Harness initial={[{ url: "a" }, { url: "b" }]} />);

      await user.click(screen.getByRole("button", { name: "Remove item 1" }));

      expect(region()).toHaveTextContent("Removed item 1. 1 item.");
    });

    it("announces a removal driven from the render prop's own control", async () => {
      const user = userEvent.setup();
      function Probe() {
        const form = useForm<Values>({
          defaultValues: { links: [{ url: "a" }, { url: "b" }] },
        });
        return (
          <Repeater form={form} name="links" defaultItem={() => ({ url: "" })}>
            {({ index, remove }) => (
              <button type="button" onClick={remove}>
                Drop row {index + 1}
              </button>
            )}
          </Repeater>
        );
      }
      render(<Probe />);

      await user.click(screen.getByRole("button", { name: "Drop row 2" }));

      expect(region()).toHaveTextContent("Removed item 2. 1 item.");
    });

    it("routes both announcements through props, and '' removes them", async () => {
      const user = userEvent.setup();
      function Probe({ silent }: { silent?: boolean }) {
        const form = useForm<Values>({ defaultValues: { links: [{ url: "a" }] } });
        return (
          <Repeater
            form={form}
            name="links"
            defaultItem={() => ({ url: "" })}
            addLabel="Ajouter"
            addAnnouncement={silent ? () => "" : (i, c) => `Ligne ${i + 1} ajoutée (${c})`}
            removeAnnouncement={
              silent ? () => "" : (i, c) => `Ligne ${i + 1} supprimée (${c})`
            }
          >
            {() => null}
          </Repeater>
        );
      }
      const { unmount } = render(<Probe />);

      await user.click(screen.getByRole("button", { name: "Ajouter" }));
      expect(region()).toHaveTextContent("Ligne 2 ajoutée (2)");

      await user.click(screen.getByRole("button", { name: "Remove item 2" }));
      expect(region()).toHaveTextContent("Ligne 2 supprimée (1)");

      unmount();
      render(<Probe silent />);
      await user.click(screen.getByRole("button", { name: "Ajouter" }));
      expect(region()).toHaveTextContent("");
    });
  });
});
