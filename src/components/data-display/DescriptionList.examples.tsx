import { DescriptionList } from "./DescriptionList";

/** Term/detail pairs in a two-column grid — the label column sizes to its widest term. */
export function Minimal() {
  return (
    <DescriptionList>
      <DescriptionList.Term>Name</DescriptionList.Term>
      <DescriptionList.Detail>Ada Lovelace</DescriptionList.Detail>
      <DescriptionList.Term>Role</DescriptionList.Term>
      <DescriptionList.Detail>Principal Engineer</DescriptionList.Detail>
      <DescriptionList.Term>Joined</DescriptionList.Term>
      <DescriptionList.Detail>March 2021</DescriptionList.Detail>
    </DescriptionList>
  );
}

/** `layout="vertical"` stacks each label above its value — the fit for narrow columns. */
export function Vertical() {
  return (
    <DescriptionList layout="vertical">
      <DescriptionList.Term>Shipping address</DescriptionList.Term>
      <DescriptionList.Detail>
        12 Rue de Rivoli, 75001 Paris, France
      </DescriptionList.Detail>
      <DescriptionList.Term>Delivery window</DescriptionList.Term>
      <DescriptionList.Detail>Tue 24 – Thu 26 June</DescriptionList.Detail>
    </DescriptionList>
  );
}

/** One `Term` can own several `Detail`s. Stack them vertically so they don't wrap
 *  under the label column — see Gotchas for why horizontal misaligns them. */
export function MultipleDetails() {
  return (
    <DescriptionList layout="vertical">
      <DescriptionList.Term>Phone numbers</DescriptionList.Term>
      <DescriptionList.Detail>Home — (555) 010 2938</DescriptionList.Detail>
      <DescriptionList.Detail>Work — (555) 771 0043</DescriptionList.Detail>
    </DescriptionList>
  );
}

/** `Detail` is a plain `<dd>` — it renders any node, so drop links or badges straight in. */
export function RichDetail() {
  return (
    <DescriptionList>
      <DescriptionList.Term>Invoice</DescriptionList.Term>
      <DescriptionList.Detail>
        <a href="/invoices/INV-2043" className="text-accent underline">
          INV-2043
        </a>
      </DescriptionList.Detail>
      <DescriptionList.Term>Status</DescriptionList.Term>
      <DescriptionList.Detail>
        <span className="text-status-success">Paid</span>
      </DescriptionList.Detail>
    </DescriptionList>
  );
}
