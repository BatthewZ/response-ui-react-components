import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Rating } from "./Rating";

describe("Rating", () => {
  it("renders a radiogroup with `max` radios", () => {
    render(<Rating aria-label="Rate" max={5} />);
    expect(screen.getByRole("radiogroup", { name: "Rate" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("click sets the value and fires onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    await user.click(radios[2]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(3);
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
  });

  it("ArrowRight increases and ArrowLeft decreases the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={2} onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it("ArrowUp increases and ArrowDown decreases the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={2} onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();

    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    // The roving-focus hook is horizontal, so the vertical arrows change the
    // value without moving the tab stop — focus stays where it was.
    expect(radios[0]).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[0]).toHaveFocus();
  });

  it("ArrowUp/ArrowDown step by 0.5 when allowHalf", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Rating aria-label="Rate" allowHalf defaultValue={2} onValueChange={onValueChange} />,
    );
    screen.getAllByRole("radio")[0].focus();

    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(2.5);

    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(2);
  });

  it("ArrowUp at max clamps without re-emitting", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={5} max={5} onValueChange={onValueChange} />);
    screen.getAllByRole("radio")[0].focus();

    await user.keyboard("{ArrowUp}");
    // Clamped back to the value already held — no change, so no emission.
    expect(onValueChange).toHaveBeenCalledTimes(0);
    expect(screen.getAllByRole("radio")[4]).toHaveAttribute("aria-checked", "true");
  });

  it("ArrowDown at zero clamps without re-emitting", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={0} max={5} onValueChange={onValueChange} />);
    screen.getAllByRole("radio")[0].focus();

    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledTimes(0);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveAttribute("aria-checked", "false");
    }
  });

  it("ArrowUp/ArrowDown do nothing while disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Rating aria-label="Rate" disabled defaultValue={2} onValueChange={onValueChange} />,
    );

    await user.keyboard("{ArrowUp}");
    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });

  it("allowHalf: clicking the left half of a star yields x.5", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" allowHalf onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    const target = radios[2];
    target.getBoundingClientRect = () =>
      ({ left: 0, width: 20, top: 0, height: 20, right: 20, bottom: 20, x: 0, y: 0, toJSON() {} }) as DOMRect;
    await user.pointer({ target, coords: { clientX: 4, clientY: 5 } });
    await user.click(target);
    // Only the click commits — the hover preview is local state, never an emission.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(2.5);
  });

  it("readOnly renders role=img with a label and no buttons", () => {
    render(<Rating aria-label="Rate" value={3} readOnly max={5} />);
    expect(screen.getByRole("img", { name: "3 out of 5 stars" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("controlled value stays fixed without onValueChange updating it", async () => {
    const user = userEvent.setup();
    render(<Rating aria-label="Rate" value={2} onValueChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    await user.click(radios[4]);
    // controlled: value stays at 2
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[4]).toHaveAttribute("aria-checked", "false");
  });

  it("disabled radios do not fire onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" disabled onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toBeDisabled();
    await user.click(radios[2]);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
