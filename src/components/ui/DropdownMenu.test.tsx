import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DropdownMenu } from "./DropdownMenu";

function renderMenu(
  options: { onSelect?: () => void; disabledOnSelect?: () => void } = {},
) {
  const onSelect = options.onSelect ?? vi.fn();
  const disabledOnSelect = options.disabledOnSelect ?? vi.fn();

  return {
    onSelect,
    disabledOnSelect,
    ...render(
      <DropdownMenu>
        <DropdownMenu.Trigger>Open menu</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.GroupHeader>Actions</DropdownMenu.GroupHeader>
          <DropdownMenu.Item index={0} onSelect={onSelect}>
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item index={1}>Duplicate</DropdownMenu.Item>
          <DropdownMenu.Divider />
          <DropdownMenu.Item index={2} disabled onSelect={disabledOnSelect}>
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    ),
  };
}

describe("DropdownMenu", () => {
  it("does not show content when closed", () => {
    renderMenu();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens menu when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("closes menu on Escape", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("items have role='menuitem'", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("menu");

    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(3);
  });

  it("divider has role='separator'", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("menu");

    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("clicking an item calls onSelect and closes menu", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderMenu();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("menu");

    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("disabled items have aria-disabled and do not fire onSelect", async () => {
    const user = userEvent.setup();
    const { disabledOnSelect } = renderMenu();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("menu");

    const deleteItem = screen.getByRole("menuitem", { name: "Delete" });
    expect(deleteItem).toHaveAttribute("aria-disabled", "true");

    await user.click(deleteItem);

    expect(disabledOnSelect).not.toHaveBeenCalled();
  });

  it("trigger has aria-expanded and aria-haspopup='menu'", async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");

    await user.click(trigger);
    await screen.findByRole("menu");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("#469: the trigger's aria-controls resolves to the panel that rendered", async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);
    const panel = await screen.findByRole("menu");

    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    // One source for one id: the panel's `id` comes from the same
    // `context.floatingId` the trigger advertises, rather than a second
    // `useId()` that the floating props then overwrite.
    expect(document.getElementById(controls ?? "")).toBe(panel);
  });

  it("composes an asChild child's own onClick instead of replacing it", async () => {
    const user = userEvent.setup();
    const childClick = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <button onClick={childClick}>Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item index={0}>Rename</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(childClick).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
  });

  it("closes when Tab moves focus past a mouse-opened menu", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("menu");

    await user.tab();

    // A mouse-opened menu holds no tabbable item, so Tab walks straight past it
    // and would otherwise leave it open with focus somewhere else.
    await waitFor(() =>
      expect(screen.queryByRole("menu", { hidden: true })).not.toBeInTheDocument(),
    );
  });
});

/**
 * #128, the menu half — the same fade wiring `Popover.test.tsx` covers in full,
 * asserted here because a row naming three surfaces needs all three. What no
 * test here can see: whether the fade paints, since jsdom performs no layout.
 */
describe("fade timing", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--MOTION-DURATION-ENTER");
  });

  it("#128: takes its open duration from --MOTION-DURATION-ENTER", async () => {
    document.documentElement.style.setProperty("--MOTION-DURATION-ENTER", "380ms");
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const panel = await screen.findByRole("menu");

    await waitFor(() => expect(panel.style.transitionDuration).toBe("380ms"));
  });
});
