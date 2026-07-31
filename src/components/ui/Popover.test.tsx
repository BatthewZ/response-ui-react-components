import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Popover } from "./Popover";

/**
 * jsdom never matches a media query, so the reduced-motion branch is
 * unreachable unless the global is replaced. Stubbed per test, opt-in — a
 * global stub hides regressions in the guard that reads it.
 */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function renderPopover(props: Record<string, unknown> = {}) {
  return render(
    <Popover {...props}>
      <Popover.Trigger>Toggle popover</Popover.Trigger>
      <Popover.Content>
        <p>Popover body content</p>
      </Popover.Content>
    </Popover>,
  );
}

describe("Popover", () => {
  it("does not show content when closed", () => {
    renderPopover();

    expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();
  });

  it("opens popover when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));

    expect(await screen.findByText("Popover body content")).toBeInTheDocument();
  });

  it("closes popover when trigger is clicked again", async () => {
    const user = userEvent.setup();
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Toggle popover" });

    await user.click(trigger);
    expect(await screen.findByText("Popover body content")).toBeInTheDocument();

    await user.click(trigger);
    await waitFor(() => {
      expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();
    });
  });

  it("closes popover on Escape", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    expect(await screen.findByText("Popover body content")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();
    });
  });

  it("trigger has aria-expanded='false' initially", () => {
    renderPopover();

    expect(screen.getByRole("button", { name: "Toggle popover" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("trigger has aria-expanded='true' when open", async () => {
    const user = userEvent.setup();
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Toggle popover" });
    await user.click(trigger);
    await screen.findByText("Popover body content");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("#469: the trigger's aria-controls resolves to the panel that rendered", async () => {
    const user = userEvent.setup();
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Toggle popover" });
    await user.click(trigger);
    const panel = await screen.findByRole("dialog");

    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    // One source for one id: the panel's `id` comes from the same
    // `context.floatingId` the trigger advertises, rather than a second
    // `useId()` that the floating props then overwrite.
    expect(document.getElementById(controls ?? "")).toBe(panel);
  });

  it("trigger has aria-haspopup='dialog'", () => {
    renderPopover();

    expect(screen.getByRole("button", { name: "Toggle popover" })).toHaveAttribute(
      "aria-haspopup",
      "dialog",
    );
  });

  it("respects controlled open prop", () => {
    const { rerender } = render(
      <Popover open={false} onOpenChange={() => {}}>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );

    expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();

    rerender(
      <Popover open={true} onOpenChange={() => {}}>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );

    expect(screen.getByText("Popover body content")).toBeInTheDocument();
  });

  it("calls onOpenChange in controlled mode", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Popover open={false} onOpenChange={onOpenChange}>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("moves focus to the panel when opened", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));

    // The panel holds no tab stop of its own, so the focus manager gives it
    // tabindex="0" and focuses it — which is why .popover-content must paint a
    // replacement ring under its `outline: none` (ledger #129). The move is queued,
    // hence waitFor rather than a bare assertion.
    const panel = await screen.findByRole("dialog");
    expect(panel).toHaveAttribute("tabindex", "0");
    await waitFor(() => expect(panel).toHaveFocus());
  });

  it("leaves the rest of the page reachable while open", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>Outside the popover</button>
        <Popover>
          <Popover.Trigger>Toggle popover</Popover.Trigger>
          <Popover.Content>
            <p>Popover body content</p>
          </Popover.Content>
        </Popover>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    await screen.findByText("Popover body content");

    // A popover is not a modal dialog. A focus trap marks everything outside the
    // portal aria-hidden + inert, which erases both of these from the accessibility
    // tree — `getByRole` refuses to see an aria-hidden subtree, so it fails then.
    expect(screen.getByRole("button", { name: "Outside the popover" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle popover" })).toBeInTheDocument();
  });

  it("composes an asChild child's own onClick instead of replacing it", async () => {
    const user = userEvent.setup();
    const childClick = vi.fn();

    render(
      <Popover>
        <Popover.Trigger asChild>
          <button onClick={childClick}>Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));

    // Both must happen: the caller's handler AND the component's own behaviour.
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Popover body content")).toBeInTheDocument();
  });
});

/**
 * #128. `useTransitionStyles` writes `transition-duration` inline, so the value
 * is observable here even though no test in this package can read a stylesheet.
 * What is NOT observable: whether the fade actually paints — jsdom performs no
 * layout and computes no animation.
 */
describe("fade timing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty("--MOTION-DURATION-ENTER");
  });

  it("#128: takes its open duration from --MOTION-DURATION-ENTER", async () => {
    document.documentElement.style.setProperty("--MOTION-DURATION-ENTER", "380ms");
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    const panel = await screen.findByRole("dialog");

    await waitFor(() => expect(panel.style.transitionDuration).toBe("380ms"));
  });

  it("#128: falls back to 150ms when no token layer is present", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    const panel = await screen.findByRole("dialog");

    await waitFor(() => expect(panel.style.transitionDuration).toBe("150ms"));
  });

  it("#128: removes the fade under prefers-reduced-motion", async () => {
    document.documentElement.style.setProperty("--MOTION-DURATION-ENTER", "380ms");
    stubReducedMotion(true);
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    const panel = await screen.findByRole("dialog");

    await waitFor(() => expect(panel.style.transitionDuration).toBe("0ms"));
  });
});

/**
 * The controlled/uncontrolled mode must lock on the first render. A parent that
 * writes `open={o ?? undefined}` otherwise flips the popover uncontrolled
 * mid-life and it starts opening from internal state the parent cannot see.
 */
describe("mode lock", () => {
  let onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange = vi.fn();
  });

  function ControlledPopover({ open }: { open: boolean | undefined }) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>
    );
  }

  it("a controlled popover never adopts internal state when `open` goes undefined", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledPopover open={false} />);

    rerender(<ControlledPopover open={undefined} />);
    await user.click(screen.getByRole("button", { name: "Toggle popover" }));

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();
  });

  it("a controlled popover keeps honouring the parent after the undefined blip", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledPopover open={false} />);

    rerender(<ControlledPopover open={undefined} />);
    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    rerender(<ControlledPopover open={true} />);

    expect(await screen.findByText("Popover body content")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it("an uncontrolled popover is not turned controlled by a later `open`", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledPopover open={undefined} />);

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    expect(await screen.findByText("Popover body content")).toBeInTheDocument();

    rerender(<ControlledPopover open={false} />);

    // `Popover.Content` unmounts on a 150ms transition, so its presence right
    // after the rerender proves nothing. `aria-expanded` follows `open` on the
    // same commit.
    expect(screen.getByRole("button", { name: "Toggle popover" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });
});

/**
 * The arrow, and its one slot. The arrow element exists at all only because
 * `useFloating`'s `arrowRef` option was live, exported and documented while no
 * component in the package rendered anything for it to position.
 */
describe("arrow", () => {
  function openWith(props: Record<string, unknown>) {
    return render(
      <Popover defaultOpen>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content {...props}>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );
  }

  it("renders no arrow unless asked for one", async () => {
    openWith({});

    const panel = await screen.findByRole("dialog");
    expect(panel.querySelector(".popover-arrow")).toBeNull();
  });

  /**
   * The falsifier for the middleware wiring: `left` is present only because
   * `Popover` hands `arrowRef` to `useFloating`, which is what adds floating-ui's
   * `arrow` middleware and fills `middlewareData.arrow`. Drop the `arrowRef` from
   * that call and the element still renders — pinned, but never centred — so
   * this assertion is the one that reddens.
   */
  it("renders the arrow and positions it from the middleware", async () => {
    openWith({ arrow: true });

    const panel = await screen.findByRole("dialog");
    const arrow = panel.querySelector<HTMLElement>(".popover-arrow");
    expect(arrow).not.toBeNull();
    expect(arrow).toHaveAttribute("aria-hidden", "true");
    // Default placement is `bottom`, so the arrow sits on the panel's top edge.
    expect(arrow).toHaveAttribute("data-side", "top");
    expect(arrow?.style.top).toBe("0px");
    expect(arrow?.style.translate).toBe("0 -50%");
    expect(arrow?.style.left).not.toBe("");
  });

  it("pins the arrow to the edge facing the trigger, not to the placement", async () => {
    render(
      <Popover defaultOpen placement="right">
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content arrow>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );

    const panel = await screen.findByRole("dialog");
    const arrow = panel.querySelector<HTMLElement>(".popover-arrow");
    expect(arrow).toHaveAttribute("data-side", "left");
    expect(arrow?.style.left).toBe("0px");
    expect(arrow?.style.translate).toBe("-50% 0");
  });

  it("lands classNames.arrow on the arrow, beside the base class", async () => {
    openWith({ arrow: true, classNames: { arrow: "size-r3" } });

    const panel = await screen.findByRole("dialog");
    const arrow = panel.querySelector(".popover-arrow");
    expect(arrow?.getAttribute("class")).toContain("popover-arrow");
    expect(arrow?.getAttribute("class")).toContain("size-r3");
  });

  it("leaves the arrow on its base class alone when no slot is passed", async () => {
    openWith({ arrow: true });

    const panel = await screen.findByRole("dialog");
    expect(panel.querySelector(".popover-arrow")?.getAttribute("class")).toBe(
      "popover-arrow",
    );
  });

  it("does not put the slot class on the panel itself", async () => {
    openWith({ arrow: true, classNames: { arrow: "size-r3" } });

    const panel = await screen.findByRole("dialog");
    expect(panel.className).not.toContain("size-r3");
  });

  /**
   * The reason for a per-component inline slot union rather than a
   * `Record<string, string>` helper: an unknown key is a *type* error, not a
   * silent no-op. The `@ts-expect-error` is the assertion — it fails if
   * TypeScript ever stops rejecting the key. Do not "clean it up".
   */
  it("rejects an unknown slot key at compile time", async () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        {/* @ts-expect-error — `pointer` is not a slot; only untyped JS gets here. */}
        <Popover.Content arrow classNames={{ pointer: "size-r3" }}>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );

    const panel = await screen.findByRole("dialog");
    expect(panel.querySelector(".popover-arrow")?.getAttribute("class")).toBe(
      "popover-arrow",
    );
  });

  it("does not leak arrow or classNames onto the DOM", async () => {
    openWith({ arrow: true, classNames: { arrow: "size-r3" } });

    const panel = await screen.findByRole("dialog");
    expect(panel.hasAttribute("classnames")).toBe(false);
    expect(panel.hasAttribute("arrow")).toBe(false);
  });
});
