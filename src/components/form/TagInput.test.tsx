import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Badge } from "../ui/Badge";

import { Field } from "./Field";
import { TagInput } from "./TagInput";
import { useForm } from "./use-form";

describe("TagInput", () => {
  it("adds a tag on Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TagInput aria-label="Tags" onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "Tags" });
    await user.type(input, "apple{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("rejects duplicate tags", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <TagInput aria-label="Tags" defaultValue={["apple"]} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("textbox", { name: "Tags" });
    await user.type(input, "apple{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("adds a tag when a delimiter char is typed", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TagInput aria-label="Tags" onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "Tags" });
    await user.type(input, "apple,");
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);
  });

  it("pastes 'a, b, c' as three chips", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TagInput aria-label="Tags" onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "Tags" });
    input.focus();
    await user.paste("a, b, c");
    expect(onValueChange).toHaveBeenLastCalledWith(["a", "b", "c"]);
  });

  it("removes the last tag on Backspace with empty input", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <TagInput aria-label="Tags" defaultValue={["a", "b"]} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("textbox", { name: "Tags" });
    input.focus();
    await user.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(["a"]);
  });

  it("enforces maxTags cap", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <TagInput aria-label="Tags" maxTags={2} defaultValue={["a", "b"]} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("textbox", { name: "Tags" });
    await user.type(input, "c{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("remove button has the correct aria-label and removes the tag", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <TagInput aria-label="Tags" defaultValue={["apple", "pear"]} onValueChange={onValueChange} />
    );

    const button = screen.getByRole("button", { name: "Remove apple" });
    await user.click(button);
    expect(onValueChange).toHaveBeenLastCalledWith(["pear"]);
  });

  it("shows a validation message when validateTag returns a string", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <TagInput
        aria-label="Tags"
        validateTag={() => "Too short"}
        onValueChange={onValueChange}
      />
    );

    const input = screen.getByRole("textbox", { name: "Tags" });
    await user.type(input, "x{Enter}");
    expect(screen.getByText("Too short")).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("rejects silently when validateTag returns false", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <TagInput aria-label="Tags" validateTag={() => false} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("textbox", { name: "Tags" });
    await user.type(input, "x{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.queryByText("x")).not.toBeInTheDocument();
  });

  it("disables the input and remove buttons", () => {
    render(<TagInput aria-label="Tags" defaultValue={["a"]} disabled />);
    expect(screen.getByRole("textbox", { name: "Tags" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove a" })).toBeDisabled();
  });

  it("renders the placeholder when empty", () => {
    render(<TagInput aria-label="Tags" placeholder="Add tags..." />);
    expect(screen.getByPlaceholderText("Add tags...")).toBeInTheDocument();
  });

  it("renders a controlled value", () => {
    render(<TagInput aria-label="Tags" value={["x", "y"]} onValueChange={vi.fn()} />);
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(screen.getByText("y")).toBeInTheDocument();
  });

  it("paints the error border and sets aria-invalid from the error prop", () => {
    render(<TagInput aria-label="Tags" error />);
    const input = screen.getByRole("textbox", { name: "Tags" });
    expect(input.parentElement).toHaveClass("border-status-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("inherits the error state from a surrounding Field", () => {
    render(
      <Field error="Required">
        <TagInput aria-label="Tags" />
      </Field>
    );
    const input = screen.getByRole("textbox", { name: "Tags" });
    expect(input.parentElement).toHaveClass("border-status-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("stays neutral when there is no error", () => {
    render(<TagInput aria-label="Tags" />);
    const input = screen.getByRole("textbox", { name: "Tags" });
    expect(input.parentElement).not.toHaveClass("border-status-error");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("forwards ref to the inner input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TagInput ref={ref} aria-label="Tags" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  describe("form.field() binding (#245) and native submission (#246)", () => {
    it("#245 binds via the advertised form.field() spread without crashing", async () => {
      const user = userEvent.setup();
      let values: { tags: string[] } | null = null;
      function Harness() {
        const form = useForm({ defaultValues: { tags: [] as string[] } });
        values = form.getValues();
        return (
          <form {...form.props}>
            <TagInput aria-label="Tags" {...form.field<string[]>("tags")} />
          </form>
        );
      }
      render(<Harness />);
      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.type(input, "react{Enter}");
      // Today: throws `TypeError: tags.map is not a function` on the first keystroke,
      // because `{...props}` (TagInput.tsx:204) overrides `onChange={handleChange}`
      // and the raw DOM ChangeEvent writes the string "r" into the array-typed field.
      expect(screen.getByText("react")).toBeInTheDocument();
      expect(values).toEqual({ tags: ["react"] });
    });
    it("#246 submits the committed tags, not the in-progress draft", async () => {
      const user = userEvent.setup();
      let formEl: HTMLFormElement | null = null;
      render(
        <form
          ref={(node) => {
            formEl = node;
          }}
        >
          <TagInput aria-label="Tags" name="tags" defaultValue={["react", "typescript"]} />
        </form>
      );
      await user.type(screen.getByRole("textbox", { name: "Tags" }), "half-typed");
      // Today: [["tags", "half-typed"]] — `name` lands on the visible draft input
      // (TagInput.tsx:192/204) and there is no hidden input per tag.
      expect([...new FormData(formEl!).entries()]).toEqual([
        ["tags", "react"],
        ["tags", "typescript"],
      ]);
    });
  });

  describe("aria-invalid vs a field() spread (#434)", () => {
    it("keeps its computed aria-invalid when a spread supplies the key as undefined", () => {
      // This is exactly what form.field() delivers: the key is always present,
      // and its value is `undefined` when the field is valid.
      const fieldLike = { "aria-invalid": undefined };
      render(<TagInput aria-label="Tags" error {...fieldLike} />);

      expect(screen.getByRole("textbox", { name: "Tags" })).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });

    it("lets a caller's aria-invalid through when it has no opinion of its own", () => {
      render(<TagInput aria-label="Tags" aria-invalid="true" />);

      expect(screen.getByRole("textbox", { name: "Tags" })).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });
  });

  describe("the draft survives every rejection (#247)", () => {
    it("keeps the typed text when the maxTags cap refuses it", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" maxTags={1} defaultValue={["a"]} />);

      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.type(input, "beta{Enter}");

      expect(input).toHaveValue("beta");
    });

    it("keeps the typed text when it duplicates an existing tag", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["apple"]} />);

      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.type(input, "apple{Enter}");

      expect(input).toHaveValue("apple");
    });

    it("keeps the typed text when validateTag returns false", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" validateTag={() => false} />);

      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.type(input, "nope{Enter}");

      expect(input).toHaveValue("nope");
    });

    it("still clears the draft on a successful commit", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" />);

      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.type(input, "ok{Enter}");

      expect(input).toHaveValue("");
    });
  });

  describe("multi-segment input (#248)", () => {
    it("commits every delimited segment and keeps the trailing one as the draft", () => {
      const onValueChange = vi.fn();
      render(<TagInput aria-label="Tags" onValueChange={onValueChange} />);

      const input = screen.getByRole("textbox", { name: "Tags" });
      // One change event carrying several segments — autofill, IME commit or a
      // programmatic write. Typing char-by-char never produces this shape.
      fireEvent.change(input, { target: { value: "a,b,c" } });

      expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
      expect(input).toHaveValue("c");
    });
  });

  describe("paste (#249)", () => {
    it("keeps the pending draft as the head of the pasted text", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<TagInput aria-label="Tags" onValueChange={onValueChange} />);

      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.type(input, "re");
      await user.paste("act, redux");

      expect(onValueChange).toHaveBeenLastCalledWith(["react", "redux"]);
    });

    it("surfaces a validateTag message from the pasted text", async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          aria-label="Tags"
          validateTag={(tag) => (tag === "bad" ? "Not allowed" : true)}
        />
      );

      const input = screen.getByRole("textbox", { name: "Tags" });
      input.focus();
      await user.paste("good, bad, other");

      expect(screen.getByText("Not allowed")).toBeInTheDocument();
      expect(screen.getByText("good")).toBeInTheDocument();
    });
  });

  describe("a stateful delimiter RegExp (#250)", () => {
    // Declared once, outside render, so the component sees the same object the
    // caller holds — which is exactly the condition `.test()` corrupts.
    const globalDelimiter = /;/g;

    it("commits every entry when the delimiter carries the g flag", () => {
      const onValueChange = vi.fn();
      render(
        <TagInput
          aria-label="Tags"
          delimiter={globalDelimiter}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("textbox", { name: "Tags" });
      fireEvent.change(input, { target: { value: "a;" } });
      fireEvent.change(input, { target: { value: "b;" } });

      expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
      expect(globalDelimiter.lastIndex).toBe(0);
    });

    it("commits with a sticky delimiter", () => {
      const stickyDelimiter = /;/y;
      const onValueChange = vi.fn();
      render(
        <TagInput
          aria-label="Tags"
          delimiter={stickyDelimiter}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("textbox", { name: "Tags" });
      fireEvent.change(input, { target: { value: "a;" } });

      expect(onValueChange).toHaveBeenLastCalledWith(["a"]);
    });
  });

  describe("validation message wiring (#253)", () => {
    it("points aria-describedby at the message element", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" validateTag={() => "Too short"} />);

      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.type(input, "x{Enter}");

      const message = screen.getByText("Too short");
      expect(message.id).not.toBe("");
      expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(message.id);
    });
  });

  describe("duplicate entries in a controlled value (#254)", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    afterEach(() => consoleError.mockClear());

    it("renders both chips without a duplicate-key error", () => {
      render(<TagInput aria-label="Tags" value={["react", "react"]} onValueChange={vi.fn()} />);

      expect(screen.getAllByText("react")).toHaveLength(2);
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  describe("the wrapper is the hit area (#255)", () => {
    it("focuses the text input when its padding is clicked", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["a"]} />);

      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.click(input.parentElement!);

      expect(input).toHaveFocus();
    });
  });

  // NOTE for every test below: jsdom announces nothing. What is asserted here is
  // the DOM precondition for an announcement — a live region with the right
  // carrier attributes, and the text that lands in it. Whether a screen reader
  // reads it, in what order relative to the focus move a removal causes, is not
  // settleable in this environment.
  describe("add/remove announcements and chip list semantics (#252)", () => {
    const region = () => screen.getByRole("status");

    it("mounts exactly one polite, visually-hidden region, empty, before anything happens", () => {
      render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} />);

      const regions = screen.getAllByRole("status");
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveAttribute("aria-live", "polite");
      expect(regions[0]).toHaveClass("sr-only");
      expect(regions[0]).toHaveTextContent("");
    });

    it("announces a tag committed with Enter", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" />);

      await user.type(screen.getByRole("textbox", { name: "Tags" }), "apple{Enter}");

      expect(region()).toHaveTextContent("Added apple. 1 tag.");
    });

    it("announces a tag committed by typing a delimiter", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["a"]} />);

      await user.type(screen.getByRole("textbox", { name: "Tags" }), "pear,");

      expect(region()).toHaveTextContent("Added pear. 2 tags.");
    });

    it("announces a whole pasted batch in one sentence", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" />);

      screen.getByRole("textbox", { name: "Tags" }).focus();
      await user.paste("a, b, c");

      // One region write per commit: three chips are not three announcements.
      expect(region()).toHaveTextContent("Added a, b, c. 3 tags.");
    });

    it("announces the tag Backspace deletes", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} />);

      screen.getByRole("textbox", { name: "Tags" }).focus();
      await user.keyboard("{Backspace}");

      expect(region()).toHaveTextContent("Removed b. 1 tag.");
    });

    it("announces the tag a remove button deletes", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["apple", "pear"]} />);

      await user.click(screen.getByRole("button", { name: "Remove apple" }));

      expect(region()).toHaveTextContent("Removed apple. 1 tag.");
    });

    it("never announces an add for a duplicate — it announces the refusal", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["apple"]} />);

      await user.type(screen.getByRole("textbox", { name: "Tags" }), "apple{Enter}");

      expect(region()).toHaveTextContent("apple is already in the list.");
      expect(region()).not.toHaveTextContent("Added");
    });

    it("announces the maxTags refusal", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" maxTags={1} defaultValue={["a"]} />);

      await user.type(screen.getByRole("textbox", { name: "Tags" }), "beta{Enter}");

      expect(region()).toHaveTextContent("beta was not added. Tag limit reached.");
    });

    it("announces a validateTag=false refusal, which is otherwise silent", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" validateTag={() => false} />);

      await user.type(screen.getByRole("textbox", { name: "Tags" }), "nope{Enter}");

      expect(region()).toHaveTextContent("nope was not added.");
    });

    it("leaves a validateTag message to its own region rather than saying it twice", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" validateTag={() => "Too short"} />);

      await user.type(screen.getByRole("textbox", { name: "Tags" }), "x{Enter}");

      expect(screen.getByText("Too short")).toBeInTheDocument();
      expect(region()).toHaveTextContent("");
    });

    it("says nothing when Enter is pressed on an empty draft", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["a"]} />);

      await user.type(screen.getByRole("textbox", { name: "Tags" }), "{Enter}");

      expect(region()).toHaveTextContent("");
    });

    it("announces the added batch and the refusal that ended it, together", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["b"]} />);

      screen.getByRole("textbox", { name: "Tags" }).focus();
      await user.paste("a, b, c");

      expect(region()).toHaveTextContent("Added a. 2 tags. b is already in the list.");
    });

    it("routes every announcement through a prop, and '' removes it", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <TagInput
          aria-label="Tags"
          defaultValue={["apple"]}
          addAnnouncement={(added, count) => `Ajouté ${added.join(", ")} (${count})`}
          removeAnnouncement={(tag, count) => `Supprimé ${tag} (${count})`}
          rejectAnnouncement={(reason, tag) => `Refusé ${tag} : ${reason}`}
        />
      );

      const input = screen.getByRole("textbox", { name: "Tags" });
      await user.type(input, "pear{Enter}");
      expect(region()).toHaveTextContent("Ajouté pear (2)");

      await user.type(input, "apple{Enter}");
      expect(region()).toHaveTextContent("Refusé apple : duplicate");

      await user.click(screen.getByRole("button", { name: "Remove pear" }));
      expect(region()).toHaveTextContent("Supprimé pear (1)");

      rerender(
        <TagInput
          aria-label="Tags"
          defaultValue={["apple"]}
          addAnnouncement={() => ""}
          removeAnnouncement={() => ""}
          rejectAnnouncement={() => ""}
        />
      );
      await user.type(input, "plum{Enter}");
      expect(region()).toHaveTextContent("");
    });

    it("exposes the chips as a list the text input is not part of", () => {
      render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} />);

      const list = screen.getByRole("list");
      expect(within(list).getAllByRole("listitem")).toHaveLength(2);
      expect(within(list).queryByRole("textbox")).not.toBeInTheDocument();
      // The chips stay flex items of the bordered field: the list wrapper is
      // `display: contents`, so it has no box of its own. jsdom cannot see that
      // — Firefox 146 and Chrome were both measured exposing the role and
      // laying the chips out identically to no wrapper at all.
      expect(list).toHaveClass("contents");
    });

    it("renders no empty list when there are no chips", () => {
      render(<TagInput aria-label="Tags" />);

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("keeps the chip removal keyboard model: tab to a chip's button, press Enter", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <TagInput aria-label="Tags" defaultValue={["a", "b"]} onValueChange={onValueChange} />
      );

      await user.tab();
      expect(screen.getByRole("button", { name: "Remove a" })).toHaveFocus();
      await user.keyboard("{Enter}");

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(["b"]);
    });
  });

  // Same pattern and same successor rule as Repeater's #257 block: the control
  // at the vacated index, else the one before it, else the container-level
  // control that puts entries back — Add there, the text input here.
  describe("focus after removing a chip (#480)", () => {
    it("moves to the chip that took the removed one's place", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["a", "b", "c"]} />);

      await user.click(screen.getByRole("button", { name: "Remove a" }));

      expect(document.activeElement).not.toBe(document.body);
      expect(screen.getByRole("button", { name: "Remove b" })).toHaveFocus();
    });

    it("moves to the previous chip when the last one goes", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["a", "b", "c"]} />);

      await user.click(screen.getByRole("button", { name: "Remove c" }));

      expect(screen.getByRole("button", { name: "Remove b" })).toHaveFocus();
    });

    it("falls back to the text input when the only chip goes", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["a"]} />);

      await user.click(screen.getByRole("button", { name: "Remove a" }));

      expect(screen.getByRole("textbox", { name: "Tags" })).toHaveFocus();
    });

    it("leaves the caret alone when Backspace removes a chip", async () => {
      const user = userEvent.setup();
      render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} />);
      const input = screen.getByRole("textbox", { name: "Tags" });

      input.focus();
      await user.keyboard("{Backspace}");

      // Nothing the keyboard user was pointing at unmounted, so nothing may
      // move: chasing the chip here would throw them out of the field mid-type.
      expect(input).toHaveFocus();
    });

    it("restores focus without committing or clearing the draft (traps §H)", async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          aria-label="Tags"
          defaultValue={["a"]}
          validateTag={() => false}
        />
      );
      const input = screen.getByRole("textbox", { name: "Tags" }) as HTMLInputElement;

      await user.type(input, "xyz");
      await user.click(screen.getByRole("button", { name: "Remove a" }));

      expect(input).toHaveFocus();
      // The blur-commit refused it, so the typing stays; the focus restore adds
      // no second commit path of its own.
      expect(input.value).toBe("xyz");
      expect(screen.queryAllByRole("button", { name: /^Remove/ })).toHaveLength(0);
    });
  });

  describe("chip styling (#50)", () => {
    // Asserted against what Badge actually renders, not a copy of its class
    // string: restyle Badge and this stays true only while the chip follows.
    // The reference is a BARE Badge. It used to pass `className="gap-r6"`,
    // mirroring the gap TagInput added by hand; Badge's own base classes carry
    // that gap now (it is what keeps the status glyph off the label), so the
    // chip must add nothing at all — which is the stronger form of this claim.
    it("renders each chip with exactly Badge's own classes", () => {
      const { unmount } = render(<Badge>apple</Badge>);
      const badgeClass = screen.getByText("apple").className;
      unmount();

      render(<TagInput aria-label="Tags" defaultValue={["apple"]} />);

      expect(screen.getByText("apple").className).toBe(badgeClass);
    });
  });

  describe("classNames slots and badgeProps", () => {
    /**
     * One slot-override test per slot, and each is the falsifier for its own
     * merge: delete that element's `cn()` and exactly this test must go red.
     */
    it("lands classNames.input on the draft field, beside the base classes", () => {
      render(
        <TagInput aria-label="Tags" classNames={{ input: "min-w-full" }} />,
      );
      const input = screen.getByRole("textbox", { name: "Tags" });
      expect(input.className).toContain("bg-transparent");
      expect(input.className).toContain("min-w-full");
    });

    it("lands classNames.tagRemove on every chip's button, beside the base classes", () => {
      render(
        <TagInput
          aria-label="Tags"
          defaultValue={["a", "b"]}
          classNames={{ tagRemove: "size-r3" }}
        />,
      );
      const buttons = screen.getAllByRole("button", { name: /^Remove/ });
      expect(buttons).toHaveLength(2);
      for (const button of buttons) {
        expect(button.className).toContain("inline-flex");
        expect(button.className).toContain("size-r3");
      }
    });

    it("leaves each internal on its base classes alone when no slot is passed", () => {
      render(<TagInput aria-label="Tags" defaultValue={["a"]} />);
      expect(screen.getByRole("textbox", { name: "Tags" }).className).toBe(
        "flex-1 min-w-[6rem] bg-transparent outline-none text-body-2 text-fg-primary placeholder:text-fg-muted disabled:cursor-not-allowed",
      );
      expect(screen.getByRole("button", { name: "Remove a" }).className).toBe(
        "inline-flex items-center justify-center rounded-sm text-fg-muted hover:text-fg-primary disabled:cursor-not-allowed cursor-pointer",
      );
    });

    it("does not put a slot class on the bordered field box", () => {
      const { container } = render(
        <TagInput
          aria-label="Tags"
          defaultValue={["a"]}
          classNames={{ input: "min-w-full", tagRemove: "size-r3" }}
        />,
      );
      const box = container.querySelector(".flex-wrap");
      expect(box).not.toBeNull();
      expect(box?.getAttribute("class")).not.toContain("min-w-full");
      expect(box?.getAttribute("class")).not.toContain("size-r3");
    });

    /**
     * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
     * compile error. It fails if TypeScript ever stops rejecting the key.
     */
    it("rejects an unknown slot key at compile time", () => {
      render(
        // @ts-expect-error — `tag` is not a slot; the chip takes `badgeProps`.
        <TagInput aria-label="Tags" defaultValue={["a"]} classNames={{ tag: "p-r3" }} />,
      );
      expect(screen.getByText("a").className).not.toContain("p-r3");
    });

    it("does not leak classNames or badgeProps onto the DOM", () => {
      const { container } = render(
        <TagInput
          aria-label="Tags"
          defaultValue={["a"]}
          classNames={{ input: "min-w-full" }}
          badgeProps={{ variant: "info" }}
        />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.hasAttribute("classnames")).toBe(false);
      expect(root.hasAttribute("badgeprops")).toBe(false);
      expect(
        screen.getByRole("textbox", { name: "Tags" }).hasAttribute("classnames"),
      ).toBe(false);
    });

    it("merges badgeProps.className onto every chip, after Badge's own classes", () => {
      const { unmount } = render(<Badge variant="info">apple</Badge>);
      const badgeClass = screen.getByText("apple").className;
      unmount();

      render(
        <TagInput
          aria-label="Tags"
          defaultValue={["apple", "pear"]}
          badgeProps={{ className: "rounded-none", variant: "info" }}
        />,
      );

      for (const tag of ["apple", "pear"]) {
        const chip = screen.getByText(tag);
        // The caller's class arrives last, so tailwind-merge lets it *replace*
        // the base's `rounded-sm` rather than stack with it — which is the
        // whole point of merging in that order.
        expect(chip.className).toBe(
          `${badgeClass.replace(" rounded-sm", "")} rounded-none`,
        );
      }
    });

    /**
     * The chips are the `list`'s only legal children, so `role` is set after the
     * spread. Whichever direction is not asserted is the one a "simplification"
     * that reorders the spread will break.
     */
    it("does not let badgeProps take the listitem role off a chip", () => {
      render(
        <TagInput
          aria-label="Tags"
          defaultValue={["apple"]}
          // A caller's bag arriving from untyped JS; the typed form is a role
          // union, so this is the shape that actually threatens the semantics.
          badgeProps={{ role: "presentation" } as { role: string }}
        />,
      );
      expect(screen.getByText("apple")).toHaveAttribute("role", "listitem");
    });
  });
});
