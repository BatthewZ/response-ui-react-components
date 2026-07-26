import { fireEvent, render, screen } from "@testing-library/react";
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

  describe("chip styling (#50)", () => {
    // Asserted against what Badge actually renders, not a copy of its class
    // string: restyle Badge and this stays true only while the chip follows.
    it("renders each chip with exactly Badge's own classes", () => {
      const { unmount } = render(<Badge className="gap-r6">apple</Badge>);
      const badgeClass = screen.getByText("apple").className;
      unmount();

      render(<TagInput aria-label="Tags" defaultValue={["apple"]} />);

      expect(screen.getByText("apple").className).toBe(badgeClass);
    });
  });
});
