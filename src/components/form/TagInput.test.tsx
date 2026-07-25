import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

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
});
