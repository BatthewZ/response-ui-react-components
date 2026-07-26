import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { DescriptionList } from "./DescriptionList";

describe("DescriptionList", () => {
  it("renders dl/dt/dd with correct semantics", () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionList.Term>Name</DescriptionList.Term>
        <DescriptionList.Detail>Ada Lovelace</DescriptionList.Detail>
      </DescriptionList>
    );

    const dl = container.querySelector("dl");
    expect(dl).toBeInTheDocument();

    const term = screen.getByRole("term");
    expect(term.tagName).toBe("DT");
    expect(term).toHaveTextContent("Name");

    const detail = screen.getByRole("definition");
    expect(detail.tagName).toBe("DD");
    expect(detail).toHaveTextContent("Ada Lovelace");
  });

  it("defaults to horizontal layout and switches with the layout prop", () => {
    const { container, rerender } = render(
      <DescriptionList>
        <DescriptionList.Term>K</DescriptionList.Term>
        <DescriptionList.Detail>V</DescriptionList.Detail>
      </DescriptionList>
    );
    let dl = container.querySelector("dl")!;
    expect(dl.className).toContain("grid");
    expect(dl.className).toContain("grid-cols-[max-content_1fr]");

    rerender(
      <DescriptionList layout="vertical">
        <DescriptionList.Term>K</DescriptionList.Term>
        <DescriptionList.Detail>V</DescriptionList.Detail>
      </DescriptionList>
    );
    dl = container.querySelector("dl")!;
    expect(dl.className).toContain("flex");
    expect(dl.className).toContain("flex-col");
    expect(dl.className).not.toContain("grid-cols-[max-content_1fr]");
  });

  it("supports multiple Detail per Term", () => {
    render(
      <DescriptionList>
        <DescriptionList.Term>Phones</DescriptionList.Term>
        <DescriptionList.Detail>Home</DescriptionList.Detail>
        <DescriptionList.Detail>Work</DescriptionList.Detail>
      </DescriptionList>
    );
    const details = screen.getAllByRole("definition");
    expect(details).toHaveLength(2);
    expect(details[0]).toHaveTextContent("Home");
    expect(details[1]).toHaveTextContent("Work");
    expect(screen.getAllByRole("term")).toHaveLength(1);
  });

  // #7. jsdom runs no layout and vitest stubs the CSS, so what is assertable
  // here is the rule that produces the alignment, not the alignment itself:
  // without a pinned column the grid's auto-flow puts a second <dd> in the
  // label column and shifts every pair after it.
  it("pins terms and details to their own grid column in horizontal", () => {
    const { container, rerender } = render(
      <DescriptionList>
        <DescriptionList.Term>Phones</DescriptionList.Term>
        <DescriptionList.Detail>Home</DescriptionList.Detail>
        <DescriptionList.Detail>Work</DescriptionList.Detail>
      </DescriptionList>
    );

    const dl = () => container.querySelector("dl")!;
    expect(dl().className).toContain("[&>dt]:col-start-1");
    expect(dl().className).toContain("[&>dd]:col-start-2");

    // Vertical is a flex stack — column pinning would be meaningless there.
    rerender(
      <DescriptionList layout="vertical">
        <DescriptionList.Term>Phones</DescriptionList.Term>
        <DescriptionList.Detail>Home</DescriptionList.Detail>
      </DescriptionList>
    );
    expect(dl().className).not.toContain("col-start");
  });

  it("applies token-based classes to Term and Detail", () => {
    render(
      <DescriptionList>
        <DescriptionList.Term>Role</DescriptionList.Term>
        <DescriptionList.Detail>Admin</DescriptionList.Detail>
      </DescriptionList>
    );
    const term = screen.getByRole("term");
    expect(term.className).toContain("text-body-3");
    expect(term.className).toContain("font-semibold");
    expect(term.className).toContain("text-fg-secondary");

    const detail = screen.getByRole("definition");
    expect(detail.className).toContain("text-body-2");
    expect(detail.className).toContain("text-fg-primary");
    expect(detail.className).toContain("m-0");
  });

  it("merges custom className on root, Term and Detail", () => {
    const { container } = render(
      <DescriptionList className="dl-custom">
        <DescriptionList.Term className="dt-custom">K</DescriptionList.Term>
        <DescriptionList.Detail className="dd-custom">V</DescriptionList.Detail>
      </DescriptionList>
    );
    expect(container.querySelector("dl")!.className).toContain("dl-custom");

    const dl = container.querySelector("dl")!;
    const term = within(dl).getByRole("term");
    const detail = within(dl).getByRole("definition");
    expect(term.className).toContain("dt-custom");
    expect(term.className).toContain("text-body-3");
    expect(detail.className).toContain("dd-custom");
    expect(detail.className).toContain("text-body-2");
  });

  it("forwards refs on root, Term and Detail", () => {
    const dlRef = createRef<HTMLDListElement>();
    const dtRef = createRef<HTMLElement>();
    const ddRef = createRef<HTMLElement>();
    render(
      <DescriptionList ref={dlRef}>
        <DescriptionList.Term ref={dtRef}>K</DescriptionList.Term>
        <DescriptionList.Detail ref={ddRef}>V</DescriptionList.Detail>
      </DescriptionList>
    );
    expect(dlRef.current).toBeInstanceOf(HTMLDListElement);
    expect(dtRef.current?.tagName).toBe("DT");
    expect(ddRef.current?.tagName).toBe("DD");
  });
});
