import { render, screen } from "@testing-library/react";
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
}: {
  initial?: { url: string }[];
  min?: number;
  max?: number;
  reorderable?: boolean;
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
    const removes = screen.getAllByRole("button", { name: "Remove item" });
    await user.click(removes[0]);
    // Row 'a' is gone; 'b' shifts up to index 0.
    expect((screen.getByLabelText("url-0") as HTMLInputElement).value).toBe("b");
    expect(screen.queryByLabelText("url-1")).not.toBeInTheDocument();
  });

  it("blocks removal below min", () => {
    render(<Harness initial={[{ url: "a" }]} min={1} />);
    expect(screen.getByRole("button", { name: "Remove item" })).toBeDisabled();
  });

  it("blocks adding beyond max", () => {
    render(<Harness initial={[{ url: "a" }, { url: "b" }]} max={2} />);
    expect(screen.getByRole("button", { name: "Add link" })).toBeDisabled();
  });

  it("reorders rows with the move controls", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ url: "a" }, { url: "b" }]} reorderable />);
    // Move the second row up.
    const moveUps = screen.getAllByRole("button", { name: "Move up" });
    await user.click(moveUps[1]);
    expect((screen.getByLabelText("url-0") as HTMLInputElement).value).toBe("b");
    expect((screen.getByLabelText("url-1") as HTMLInputElement).value).toBe("a");
  });

  it("disables move-up on the first row and move-down on the last", () => {
    render(<Harness initial={[{ url: "a" }, { url: "b" }]} reorderable />);
    expect(screen.getAllByRole("button", { name: "Move up" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Move down" })[1]).toBeDisabled();
  });
});
