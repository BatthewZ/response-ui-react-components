import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Field } from "./Field";
import { Input } from "./Input";
import { Repeater } from "./Repeater";
import { useForm } from "./use-form";

type Values = { links: { url: string }[] };
type LinksRepeaterProps = React.ComponentProps<typeof Repeater<Values, "links">>;

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

  // Checked by `tsc --noEmit`, which gates the package: each constant fails to
  // compile if the relation flips, in either direction. No suppression involved.
  // The paths are read off the component's own signature rather than off an
  // exported helper, so this stays true however the types are spelled.
  describe("name and defaultItem are typed against the form's values (#260)", () => {
    type Shape = {
      title: string;
      links: { url: string }[];
      sections: { rows: { label: string }[] }[];
    };
    type Name = Parameters<typeof Repeater<Shape>>[0]["name"];
    type Item = ReturnType<Parameters<typeof Repeater<Shape, "links">>[0]["defaultItem"]>;

    it("accepts an array path and rejects a typo or a non-array one", () => {
      const arrayPathAccepted: "links" extends Name ? true : false = true;
      const nestedArrayPathAccepted: "sections.0.rows" extends Name ? true : false = true;
      // The whole harm the row names: `name="lnks"` used to compile and write a
      // second array into the submitted values.
      const typoRejected: "lnks" extends Name ? false : true = true;
      const nonArrayPathRejected: "title" extends Name ? false : true = true;

      expect([
        arrayPathAccepted,
        nestedArrayPathAccepted,
        typoRejected,
        nonArrayPathRejected,
      ]).toEqual([true, true, true, true]);
    });

    it("derives the row type from the path", () => {
      const itemIsTheRowType: Item extends { url: string } ? true : false = true;
      const itemIsNoLongerUnknown: unknown extends Item ? false : true = true;

      expect([itemIsTheRowType, itemIsNoLongerUnknown]).toEqual([true, true]);
    });
  });

  // The control names are positional, so the moment a row moves every remaining
  // Move/Remove button is renamed. The default sentence names BOTH ends of the
  // move for exactly that reason: it is the bridge between the numbering the
  // user was just reading and the numbering they are about to read.
  describe("reorder announcements (#481)", () => {
    const region = () => screen.getByRole("status");

    it("announces a move up, naming the old and the new position", async () => {
      const user = userEvent.setup();
      render(<Harness initial={[{ url: "a" }, { url: "b" }]} reorderable />);

      await user.click(screen.getByRole("button", { name: "Move item 2 up" }));

      expect(region()).toHaveTextContent("Moved item 2 to position 1 of 2.");
    });

    it("announces a move down", async () => {
      const user = userEvent.setup();
      render(
        <Harness initial={[{ url: "a" }, { url: "b" }, { url: "c" }]} reorderable />,
      );

      await user.click(screen.getByRole("button", { name: "Move item 1 down" }));

      expect(region()).toHaveTextContent("Moved item 1 to position 2 of 3.");
    });

    it("announces a move driven from the render prop's own controls", async () => {
      const user = userEvent.setup();
      function Probe() {
        const form = useForm<Values>({
          defaultValues: { links: [{ url: "a" }, { url: "b" }] },
        });
        return (
          <Repeater form={form} name="links" defaultItem={() => ({ url: "" })}>
            {({ index, moveUp }) => (
              <button type="button" onClick={moveUp}>
                Raise row {index + 1}
              </button>
            )}
          </Repeater>
        );
      }
      render(<Probe />);

      await user.click(screen.getByRole("button", { name: "Raise row 2" }));

      expect(region()).toHaveTextContent("Moved item 2 to position 1 of 2.");
    });

    it("says nothing when the move is a no-op at the end of the list", async () => {
      const user = userEvent.setup();
      function Probe() {
        const form = useForm<Values>({
          defaultValues: { links: [{ url: "a" }, { url: "b" }] },
        });
        return (
          <Repeater form={form} name="links" defaultItem={() => ({ url: "" })}>
            {({ index, moveUp }) => (
              <button type="button" onClick={moveUp}>
                Raise row {index + 1}
              </button>
            )}
          </Repeater>
        );
      }
      render(<Probe />);

      await user.click(screen.getByRole("button", { name: "Raise row 1" }));

      expect(region()).toHaveTextContent("");
    });

    it("routes the sentence through a prop, and '' removes it", async () => {
      const user = userEvent.setup();
      function Probe({ silent }: { silent?: boolean }) {
        const form = useForm<Values>({
          defaultValues: { links: [{ url: "a" }, { url: "b" }] },
        });
        return (
          <Repeater
            form={form}
            name="links"
            defaultItem={() => ({ url: "" })}
            reorderable
            moveAnnouncement={
              silent ? () => "" : (from, to, count) => `${from + 1}→${to + 1} sur ${count}`
            }
          >
            {() => null}
          </Repeater>
        );
      }
      const { unmount } = render(<Probe />);

      await user.click(screen.getByRole("button", { name: "Move item 2 up" }));
      expect(region()).toHaveTextContent("2→1 sur 2");

      unmount();
      render(<Probe silent />);
      await user.click(screen.getByRole("button", { name: "Move item 2 up" }));
      expect(region()).toHaveTextContent("");
    });
  });

  describe("classNames slots", () => {
    function SlotHarness({
      classNames,
      className,
    }: {
      classNames?: LinksRepeaterProps["classNames"];
      className?: string;
    }) {
      const form = useForm<Values>({
        defaultValues: { links: [{ url: "a" }, { url: "b" }] },
      });
      return (
        <Repeater
          form={form}
          name="links"
          defaultItem={() => ({ url: "" })}
          addLabel="Add link"
          className={className}
          classNames={classNames}
        >
          {({ name, index }) => (
            <Field name={`${name}.url`}>
              <Input aria-label={`url-${index}`} {...form.field(`${name}.url`)} />
            </Field>
          )}
        </Repeater>
      );
    }

    const rows = () => screen.getAllByRole("listitem");

    /*
     * One slot-override test per slot, and each is the falsifier for its own
     * merge: delete that element's `cn()` and exactly this test must go red.
     * The three row slots are asserted on *every* row, because the rows are
     * generated from the array field and the keys name all of them.
     */
    it("lands classNames.list on the row container, beside the base classes", () => {
      render(<SlotHarness classNames={{ list: "gap-r6" }} />);
      const list = screen.getByRole("list");
      expect(list.className).toContain("flex-col");
      expect(list.className).toContain("gap-r6");
    });

    it("lands classNames.item on every row, beside the base classes", () => {
      render(<SlotHarness classNames={{ item: "items-center" }} />);
      expect(rows()).toHaveLength(2);
      for (const row of rows()) {
        expect(row.className).toContain("gap-r5");
        expect(row.className).toContain("items-center");
      }
    });

    it("lands classNames.fields on every row's fieldset, beside the base classes", () => {
      const { container } = render(<SlotHarness classNames={{ fields: "pr-r5" }} />);
      const fieldsets = container.querySelectorAll("fieldset");
      expect(fieldsets).toHaveLength(2);
      for (const fieldset of fieldsets) {
        expect(fieldset.getAttribute("class")).toContain("min-w-0");
        expect(fieldset.getAttribute("class")).toContain("pr-r5");
      }
    });

    it("lands classNames.itemActions on every row's control cluster, beside the base classes", () => {
      render(<SlotHarness classNames={{ itemActions: "pt-0" }} />);
      for (const row of rows()) {
        const actions = row.lastElementChild;
        expect(actions?.getAttribute("class")).toContain("items-center");
        expect(actions?.getAttribute("class")).toContain("pt-0");
      }
    });

    it("leaves each internal on its base classes alone when no slot is passed", () => {
      const { container } = render(<SlotHarness />);
      expect(screen.getByRole("list").className).toBe("flex flex-col gap-r4");
      expect(rows()[0].className).toBe("flex items-start gap-r5");
      expect(container.querySelector("fieldset")?.getAttribute("class")).toBe(
        "flex-1 min-w-0",
      );
      expect(rows()[0].lastElementChild?.getAttribute("class")).toBe(
        "flex items-center gap-r6 pt-r6",
      );
    });

    it("does not put a slot class on the outer column", () => {
      const { container } = render(
        <SlotHarness
          className="gap-r3"
          classNames={{
            list: "gap-r6",
            item: "items-center",
            fields: "pr-r5",
            itemActions: "pt-0",
          }}
        />,
      );
      const outer = container.firstElementChild?.getAttribute("class");
      // `className` merged, and no slot leaked onto it.
      expect(outer).toContain("gap-r3");
      for (const leaked of ["gap-r6", "items-center", "pr-r5", "pt-0"]) {
        expect(outer).not.toContain(leaked);
      }
    });

    /**
     * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
     * compile error. It fails if TypeScript ever stops rejecting the key.
     */
    it("rejects an unknown slot key at compile time", () => {
      render(
        // @ts-expect-error — `row` is not a slot; the key is `item`.
        <SlotHarness classNames={{ row: "items-center" }} />,
      );
      expect(rows()[0].className).toBe("flex items-start gap-r5");
    });

    it("does not leak classNames onto the DOM", () => {
      const { container } = render(<SlotHarness classNames={{ item: "items-center" }} />);
      expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
      expect(rows()[0].hasAttribute("classnames")).toBe(false);
    });

    /**
     * The pin on the (a) ruling for the live region: `sr-only` is what keeps the
     * announcements off the screen, and no slot may hand a caller the class that
     * would print every add, removal and reorder into the layout.
     */
    it("leaves the live region on sr-only only", () => {
      const { container } = render(<SlotHarness classNames={{ list: "gap-r6" }} />);
      expect(
        container.querySelector('[role="status"]')?.getAttribute("class"),
      ).toBe("sr-only");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  prop hatches — the buttons are other components, not elements      */
  /*  this one classes, so their route is a bag rather than a slot.      */
  /* ------------------------------------------------------------------ */

  describe("prop hatches", () => {
    function HatchHarness({
      itemActionProps,
      addButtonProps,
    }: {
      itemActionProps?: LinksRepeaterProps["itemActionProps"];
      addButtonProps?: LinksRepeaterProps["addButtonProps"];
    }) {
      const form = useForm<Values>({
        defaultValues: { links: [{ url: "a" }, { url: "b" }] },
      });
      return (
        <Repeater
          form={form}
          name="links"
          defaultItem={() => ({ url: "" })}
          addLabel="Add link"
          reorderable
          itemActionProps={itemActionProps}
          addButtonProps={addButtonProps}
        >
          {({ name, index }) => (
            <Field name={`${name}.url`}>
              <Input aria-label={`url-${index}`} {...form.field(`${name}.url`)} />
            </Field>
          )}
        </Repeater>
      );
    }

    /** Move up, Move down and Remove, for both rows — six controls. */
    const rowActions = () =>
      screen
        .getAllByRole("button")
        .filter((b) => b.textContent === "" && b.getAttribute("aria-label") !== null);

    /*
     * The falsifier for the hatch: delete `{...itemActionProps}` from the three
     * `IconButton`s and exactly this test goes red. There is no `cn()` to delete
     * because Repeater adds no class of its own to them — the spread IS the
     * merge point, and IconButton merges the class with its own base classes.
     */
    it("lands itemActionProps on all three row controls, beside IconButton's base classes", () => {
      render(<HatchHarness itemActionProps={{ className: "sentinel-hatch" }} />);
      const actions = rowActions();
      expect(actions).toHaveLength(6);
      for (const button of actions) {
        expect(button.getAttribute("class")).toContain("sentinel-hatch");
        expect(button.getAttribute("class")).toContain("inline-flex");
      }
    });

    it("leaves the row controls on their base classes when no bag is passed", () => {
      render(<HatchHarness />);
      for (const button of rowActions()) {
        expect(button.getAttribute("class")).not.toContain("sentinel-hatch");
        expect(button.getAttribute("class")).toContain("inline-flex");
      }
    });

    /*
     * The mirror direction, one key per literal because TypeScript reports only
     * the FIRST excess property of an object literal — three directives in one
     * bag leaves two of them unused, and `tsc` says so. Each directive IS the
     * assertion: it fails if TypeScript ever stops rejecting the key. The
     * runtime half matters separately, because `Omit` is compile-time only and
     * attribute order is the whole guarantee against an untyped bag.
     */
    it("keeps its own aria-label over the bag's", () => {
      render(
        // @ts-expect-error — the names are positional and the component's.
        <HatchHarness itemActionProps={{ "aria-label": "hijacked" }} />,
      );
      expect(screen.queryByRole("button", { name: "hijacked" })).toBeNull();
      expect(screen.getByRole("button", { name: "Move item 1 up" })).toBeDisabled();
    });

    it("keeps its own disabled over the bag's", () => {
      // @ts-expect-error — `disabled` carries the first/last and min/max bounds.
      render(<HatchHarness itemActionProps={{ disabled: false }} />);
      expect(screen.getByRole("button", { name: "Move item 1 up" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Move item 2 down" })).toBeDisabled();
    });

    it("keeps its own onClick over the bag's", async () => {
      const user = userEvent.setup();
      // @ts-expect-error — the click is the mutation itself.
      render(<HatchHarness itemActionProps={{ onClick: () => undefined }} />);
      await user.click(screen.getByRole("button", { name: "Remove item 1" }));
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("lands addButtonProps on the Add button, and its variant replaces the default", () => {
      render(<HatchHarness addButtonProps={{ variant: "primary", className: "sentinel-hatch" }} />);
      const add = screen.getByRole("button", { name: "Add link" });
      expect(add.getAttribute("class")).toContain("sentinel-hatch");
      // `variant` sits before the spread, so the bag replaces "secondary".
      expect(add.getAttribute("class")).toContain("bg-primary");
      expect(add.getAttribute("class")).not.toContain("bg-secondary");
    });

    it("keeps the Add button's defaults when no bag is passed", () => {
      render(<HatchHarness />);
      const add = screen.getByRole("button", { name: "Add link" });
      expect(add.getAttribute("class")).toContain("bg-secondary");
    });

    it("keeps the Add button's own onClick over the bag's", async () => {
      const user = userEvent.setup();
      // @ts-expect-error — adding a row is the button's whole job.
      render(<HatchHarness addButtonProps={{ onClick: () => undefined }} />);
      await user.click(screen.getByRole("button", { name: "Add link" }));
      expect(screen.getAllByRole("listitem")).toHaveLength(3);
    });

    it("does not leak the bags onto the DOM", () => {
      const { container } = render(
        <HatchHarness
          itemActionProps={{ className: "sentinel-hatch" }}
          addButtonProps={{ className: "sentinel-hatch" }}
        />,
      );
      expect(container.querySelector("[itemactionprops]")).toBeNull();
      expect(container.querySelector("[addbuttonprops]")).toBeNull();
    });
  });
});
